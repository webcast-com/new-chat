import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../livescore-supabase/info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);
