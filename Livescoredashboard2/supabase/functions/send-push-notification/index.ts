// Send Push Notification Edge Function
// Phase 5.3 completion: deliver background web pushes via stored push subscriptions.
//
// Requires env vars on the function:
//   VAPID_SUBJECT      mailto:...
//   VAPID_PUBLIC_KEY   base64url raw 65-byte uncompressed P-256 public key
//   VAPID_PRIVATE_KEY  base64url raw 32-byte P-256 private key
//
// Body (all optional except action):
//   { action: 'test' | 'favorites' | 'all', title?, body?, team?, url? }
//   - test      → send to the caller's own subscriptions
//   - favorites → send to all users who have <team> (or any) in favorites
//   - all       → send to every active subscription (admin only)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPush, type PushMessage } from "./webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@scorehub.com";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({ error: "Supabase config missing" }, 500, corsHeaders);
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      return json({ error: "VAPID keys not configured on this function" }, 500, corsHeaders);
    }

    // Identify caller
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const service = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, title, body: bodyText, team, url } = body as {
      action: string;
      title?: string;
      body?: string;
      team?: string;
      url?: string;
    };

    // Resolve target user ids
    let targetUserIds: string[] = [];
    if (action === "test") {
      targetUserIds = [user.id];
    } else if (action === "favorites") {
      const favQuery = service.from("favorites").select("user_id");
      if (team) favQuery.ilike("team_name", `%${team}%`);
      const { data } = await favQuery.limit(500);
      targetUserIds = Array.from(new Set((data || []).map((f: { user_id: string }) => f.user_id)));
    } else if (action === "all") {
      const { data: profile } = await service.from("user_profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
      if (profile?.is_admin !== true) {
        return json({ error: "Forbidden: admin only" }, 403, corsHeaders);
      }
      const { data } = await service.from("push_subscriptions").select("user_id").eq("is_active", true).limit(1000);
      targetUserIds = Array.from(new Set((data || []).map((s: { user_id: string }) => s.user_id)));
    } else {
      return json({ error: `Unknown action: ${action}` }, 400, corsHeaders);
    }

    const message: PushMessage = {
      title: title || "ScoreHub",
      body: bodyText || "You have a new ScoreHub update!",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      url: url || "/",
      data: { url: url || "/" },
      tag: `scorehub-${Date.now()}`,
    };

    let delivered = 0;
    let failed = 0;
    const removedEndpoints: string[] = [];

    for (const userId of targetUserIds) {
      const { data: subs, error } = await service
        .from("push_subscriptions")
        .select("id, endpoint, p256dh_key, auth_key")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error || !subs) continue;

      for (const sub of subs) {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh_key: sub.p256dh_key, auth_key: sub.auth_key },
          message,
          { subject: vapidSubject, publicKey: vapidPublicKey, privateKey: vapidPrivateKey }
        );

        if (result.ok) {
          delivered++;
          await service.from("push_subscriptions").update({
            last_sent_at: new Date().toISOString(),
            failure_count: 0,
            last_error: null,
          }).eq("id", sub.id);
        } else {
          failed++;
          if (result.removed) removedEndpoints.push(sub.endpoint);
          await service.from("push_subscriptions").update({
            failure_count: 1,
            last_error: result.error || `HTTP ${result.status}`,
          }).eq("id", sub.id);
        }
      }
    }

    if (removedEndpoints.length > 0) {
      await service.from("push_subscriptions")
        .update({ is_active: false })
        .in("endpoint", removedEndpoints);
    }

    // Track
    await service.from("user_activity").insert({
      user_id: user.id,
      action: `push_sent_${action}`,
      metadata: { delivered, failed, team: team || null },
    }).then(() => {});

    return json({ ok: true, action, delivered, failed, removed: removedEndpoints.length }, 200, corsHeaders);
  } catch (err) {
    console.error("send-push-notification error", err);
    return json({ error: "Internal error" }, 500, corsHeaders);
  }
});

function json(payload: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
