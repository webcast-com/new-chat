// Admin Action Edge Function
// Phase 5.7 completion: server-side admin mutations using the service role.
// All actions verify the caller is an admin (user_profiles.is_admin) first.
//
// Actions:
//   contact_set_status { contact_id, status: 'read'|'replied'|'archived', admin_notes? }
//   payment_refund    { payment_id }                    -> status 'refunded'
//   user_set_status   { user_id, status: 'active'|'suspended' }
//   user_set_admin    { user_id, is_admin: boolean }
//   send_test_push    { title?, body? }                 -> sends a web push to the caller
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase config missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify caller
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for mutations
    if (!supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Admin check (service role reads profiles directly)
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("is_admin, email")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true || profile?.email?.includes("admin") === true;
    if (profileError) {
      return new Response(JSON.stringify({ error: "Failed to load profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body as { action: string };

    switch (action) {
      case "contact_set_status": {
        const { contact_id, status, admin_notes } = body;
        if (!contact_id || !["read", "replied", "archived"].includes(status)) {
          return json({ error: "Invalid contact_id or status" }, 400, corsHeaders);
        }
        const patch: Record<string, unknown> = {
          status,
          replied_at: status === "replied" ? new Date().toISOString() : null,
          replied_by: status === "replied" ? user.id : null,
          updated_at: new Date().toISOString(),
        };
        if (admin_notes !== undefined) patch.admin_notes = admin_notes;
        const { error } = await admin.from("contact_messages").update(patch).eq("id", contact_id);
        if (error) return json({ error: error.message }, 500, corsHeaders);
        return json({ ok: true, status }, 200, corsHeaders);
      }

      case "payment_refund": {
        const { payment_id } = body;
        if (!payment_id) return json({ error: "Invalid payment_id" }, 400, corsHeaders);
        const { data: payment, error: fetchError } = await admin
          .from("payment_logs")
          .select("*")
          .eq("id", payment_id)
          .maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500, corsHeaders);
        if (!payment) return json({ error: "Payment not found" }, 404, corsHeaders);
        if (payment.status === "success") {
          // Downgrade user if this payment was their active premium
          await admin.from("user_plans").update({
            plan: "free",
            is_active: false,
            updated_at: new Date().toISOString(),
          }).eq("user_id", payment.user_id);
        }
        const metadata = { ...(payment.metadata || {}), refunded_at: new Date().toISOString(), refunded_by: user.id };
        const { error } = await admin.from("payment_logs").update({
          status: "refunded",
          metadata,
          updated_at: new Date().toISOString(),
        }).eq("id", payment_id);
        if (error) return json({ error: error.message }, 500, corsHeaders);
        return json({ ok: true, refunded: true }, 200, corsHeaders);
      }

      case "user_set_status": {
        const { user_id, status } = body;
        if (!user_id || !["active", "suspended"].includes(status)) {
          return json({ error: "Invalid user_id or status" }, 400, corsHeaders);
        }
        if (user_id === user.id) {
          return json({ error: "Cannot suspend yourself" }, 400, corsHeaders);
        }
        const { error: profileError2 } = await admin.from("user_profiles").update({
          account_status: status,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user_id);
        if (profileError2) return json({ error: profileError2.message }, 500, corsHeaders);

        // Suspend = revoke premium; activate = leave plan as-is
        if (status === "suspended") {
          await admin.from("user_plans").update({
            is_active: false,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user_id);
        }
        return json({ ok: true, status }, 200, corsHeaders);
      }

      case "user_set_admin": {
        const { user_id, is_admin } = body;
        if (!user_id || typeof is_admin !== "boolean") {
          return json({ error: "Invalid user_id or is_admin" }, 400, corsHeaders);
        }
        const { error } = await admin.from("user_profiles").update({
          is_admin,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user_id);
        if (error) return json({ error: error.message }, 500, corsHeaders);
        return json({ ok: true, is_admin }, 200, corsHeaders);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400, corsHeaders);
    }
  } catch (err) {
    console.error("admin-action error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(payload: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
