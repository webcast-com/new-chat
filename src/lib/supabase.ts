import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL) as string | undefined;
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

// In Next.js, env is inlined at build time. To avoid build failures in CI/preview without keys,
// we create a placeholder client and only throw at runtime when actually needed.
const _url = supabaseUrl || 'https://placeholder.supabase.co';
const _key = supabaseAnonKey || 'placeholder-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
}

export const supabase = createClient(_url, _key);

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  location?: string | null;
  county?: string | null;
  constituency?: string | null;
  age?: number | null;
  work?: string | null;
  education?: string | null;
  gender?: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  media_type?: 'image' | 'video';
  visibility?: 'public' | 'county' | 'constituency';
  county?: string | null;
  constituency?: string | null;
  likes_count: number;
  comments_count: number;
  shares_count?: number;
  created_at: string;
  last_engagement_at?: string;
  profiles?: Profile;
};

export type Connection = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type Like = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
};
