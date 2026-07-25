import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
