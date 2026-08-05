// Group Broadcast Edge Function (Phase 5)
//
// Posts an announcement to a group as an owner/admin and delivers a web push
// to every non-muted member with an active push subscription.
//
// Env vars on the function:
//   VAPID_SUBJECT      mailto:...
//   VAPID_PUBLIC_KEY   base64url raw 65-byte uncompressed P-256 public key
//   VAPID_PRIVATE_KEY  base64url raw 32-byte P-256 private key
//
// Body: { groupId: string, content: string, title?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPush, type PushMessage } from "./webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return json({ error: "Supabase config missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const caller = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { groupId?: unknown; content?: unknown; title?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (typeof body.groupId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.groupId)) {
    return json({ error: "A valid groupId is required" }, 400);
  }
  if (typeof body.content !== "string" || !body.content.trim() || body.content.length > 2000) {
    return json({ error: "Broadcast content must be between 1 and 2000 characters" }, 400);
  }

  const service = createClient(supabaseUrl, supabaseServiceKey);

  // 1) Verify the caller is an owner/admin of the group
  const { data: membership, error: membershipError } = await service
    .from("chat_group_members")
    .select("role")
    .eq("group_id", body.groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return json({ error: membershipError.message }, 400);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return json({ error: "Only group owners and admins can broadcast" }, 403);
  }

  const { data: group, error: groupError } = await service
    .from("chat_groups")
    .select("name")
    .eq("id", body.groupId)
    .maybeSingle();
  if (groupError) return json({ error: groupError.message }, 400);
  if (!group) return json({ error: "Group not found" }, 404);

  // 2) Insert the broadcast message
  const { data: inserted, error: insertError } = await service
    .from("chat_group_messages")
    .insert({
      group_id: body.groupId,
      sender_id: user.id,
      content: body.content.trim(),
      kind: "broadcast",
      broadcast_by: user.id,
    })
    .select("id")
    .single();
  if (insertError) return json({ error: insertError.message }, 400);

  // 3) Push to non-muted members with active subscriptions
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@scorehub.com";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  let delivered = 0;
  let failed = 0;
  if (vapidPublicKey && vapidPrivateKey) {
    const { data: memberships } = await service
      .from("chat_group_members")
      .select("user_id")
      .eq("group_id", body.groupId)
      .eq("broadcast_muted", false);

    const memberIds = Array.from(new Set((memberships || []).map((m: { user_id: string }) => m.user_id)));

    const message: PushMessage = {
      title: `📢 ${group.name}`,
      body: body.content.trim().slice(0, 140),
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      url: "/#groups",
      data: { url: "/#groups", groupId: body.groupId },
      tag: `group-broadcast-${body.groupId}-${Date.now()}`,
    };

    const removedEndpoints: string[] = [];
    for (const memberId of memberIds) {
      const { data: subs } = await service
        .from("push_subscriptions")
        .select("id, endpoint, p256dh_key, auth_key")
        .eq("user_id", memberId)
        .eq("is_active", true);
      if (!subs) continue;

      for (const sub of subs) {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh_key: sub.p256dh_key, auth_key: sub.auth_key },
          message,
          { subject: vapidSubject, publicKey: vapidPublicKey, privateKey: vapidPrivateKey }
        );
        if (result.ok) {
          delivered++;
          await service.from("push_subscriptions")
            .update({ last_sent_at: new Date().toISOString(), failure_count: 0, last_error: null })
            .eq("id", sub.id);
        } else {
          failed++;
          if (result.removed) removedEndpoints.push(sub.endpoint);
          await service.from("push_subscriptions")
            .update({ failure_count: 1, last_error: result.error || `HTTP ${result.status}` })
            .eq("id", sub.id);
        }
      }
    }

    if (removedEndpoints.length > 0) {
      await service.from("push_subscriptions")
        .update({ is_active: false })
        .in("endpoint", removedEndpoints);
    }
  }

  // 4) Member notifications are handled by the DB trigger
  //    (notify_group_broadcast → notification_events for every member).

  return json({
    ok: true,
    messageId: inserted.id,
    delivered,
    failed,
  });
});
