import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Supabase configuration is missing' }, 500);

  let body: { email?: unknown; password?: unknown; username?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (typeof body.email !== 'string' || !body.email.trim()) {
    return json({ error: 'Email is required' }, 400);
  }
  if (typeof body.password !== 'string' || body.password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, 400);
  }
  if (typeof body.username !== 'string' || !body.username.trim() || body.username.trim().length > 50) {
    return json({ error: 'Username must be between 1 and 50 characters' }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signUp({
    email: body.email.trim(),
    password: body.password,
    options: { data: { username: body.username.trim() } },
  });

  if (error) return json({ error: error.message }, 400);
  return json({ user: data.user, session: data.session });
});
