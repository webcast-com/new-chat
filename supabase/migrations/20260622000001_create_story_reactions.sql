CREATE TABLE IF NOT EXISTS story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user_id ON story_reactions(user_id);

ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view story reactions"
  ON story_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add their story reactions"
  ON story_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their story reactions"
  ON story_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their story reactions"
  ON story_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
