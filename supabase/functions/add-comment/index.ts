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

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Supabase configuration is missing' }, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: 'Authentication required' }, 401);

  let body: { postId?: unknown; content?: unknown; parentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (typeof body.postId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.postId)) {
    return json({ error: 'A valid postId is required' }, 400);
  }
  if (typeof body.content !== 'string' || !body.content.trim() || body.content.length > 2000) {
    return json({ error: 'Comment content must be between 1 and 2000 characters' }, 400);
  }

  // Phase 2 — threaded replies: when parentId is provided, the parent must
  // exist and belong to the same post (prevents cross-post replies).
  let parentId: string | null = null;
  if (body.parentId != null) {
    if (typeof body.parentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.parentId)) {
      return json({ error: 'A valid parentId is required' }, 400);
    }
    const { data: parent, error: parentError } = await supabase
      .from('comments')
      .select('id, post_id, parent_id')
      .eq('id', body.parentId)
      .maybeSingle();
    if (parentError) return json({ error: parentError.message }, 400);
    if (!parent) return json({ error: 'Parent comment not found' }, 404);
    if (parent.post_id !== body.postId) {
      return json({ error: 'Parent comment does not belong to this post' }, 400);
    }
    // Replies nest one level deep: replying to a reply targets the root parent.
    parentId = parent.parent_id ?? parent.id;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: body.postId,
      user_id: user.id,
      content: body.content.trim(),
      ...(parentId ? { parent_id: parentId } : {}),
    })
    .select('id, parent_id')
    .single();

  if (error) return json({ error: error.message }, 400);
  return json({ comment: data });
});
