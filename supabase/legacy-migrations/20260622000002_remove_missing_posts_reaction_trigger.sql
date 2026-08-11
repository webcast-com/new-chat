DO $$
BEGIN
  IF to_regclass('public.reactions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trigger_update_reaction_count ON public.reactions;
  END IF;
END $$;
