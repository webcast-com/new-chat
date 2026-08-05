CREATE TABLE IF NOT EXISTS public.user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  posts_created integer DEFAULT 0,
  likes_received integer DEFAULT 0,
  comments_received integer DEFAULT 0,
  followers_gained integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON public.user_analytics(date);

ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_analytics'
      AND policyname = 'Users can view own analytics'
  ) THEN
    CREATE POLICY "Users can view own analytics"
      ON public.user_analytics FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_analytics'
      AND policyname = 'System can insert analytics'
  ) THEN
    CREATE POLICY "System can insert analytics"
      ON public.user_analytics FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_analytics'
      AND policyname = 'System can update analytics'
  ) THEN
    CREATE POLICY "System can update analytics"
      ON public.user_analytics FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_initial_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_analytics (user_id, date)
  VALUES (NEW.id, CURRENT_DATE)
  ON CONFLICT (user_id, date) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_initial_analytics ON public.profiles;
CREATE TRIGGER trigger_create_initial_analytics
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_initial_analytics();
