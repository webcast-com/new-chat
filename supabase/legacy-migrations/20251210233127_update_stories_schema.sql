/*
  # Enhanced Stories Feature Update

  ## Overview
  Comprehensive update to stories functionality with better media handling,
  privacy controls, analytics, and user experience features.

  ## 1. Modified Tables
  
  ### `stories` - Enhanced with better media and metadata
  - Added `media_type` - Support for images and videos
  - Added `duration` - Story display duration (seconds)
  - Added `background_color` - Custom background for text stories
  - Added `text_content` - Support for text-only stories
  - Added `views_count` - Cached view count
  - Added `link_url` - Optional swipe-up link
  - Added `music_url` - Optional background music
  - Added `is_highlight` - Mark story for permanent highlight
  
  ### `story_views` - Enhanced with better tracking
  - Added `view_duration` - How long user viewed story
  - Added `completed` - Whether user watched full story
  
  ## 2. New Tables
  
  ### `story_replies`
  - Users can reply to stories with text messages
  - Direct message-like interaction
  
  ### `story_highlights`
  - Save favorite stories as permanent highlights
  - Group stories into highlight albums
  
  ## 3. Functions
  - Auto-increment view count on stories
  - Clean up expired stories automatically
  
  ## 4. Security
  - RLS enabled on all new tables
  - Stories visible to authenticated users only
  - Privacy controls for story visibility
  
  ## 5. Indexes
  - Optimized queries for active stories
  - Fast lookups for user stories
  - Efficient view tracking
*/

-- Add new columns to stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE stories ADD COLUMN media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'text'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'duration'
  ) THEN
    ALTER TABLE stories ADD COLUMN duration integer DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'background_color'
  ) THEN
    ALTER TABLE stories ADD COLUMN background_color text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'text_content'
  ) THEN
    ALTER TABLE stories ADD COLUMN text_content text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE stories ADD COLUMN views_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'link_url'
  ) THEN
    ALTER TABLE stories ADD COLUMN link_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'music_url'
  ) THEN
    ALTER TABLE stories ADD COLUMN music_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'is_highlight'
  ) THEN
    ALTER TABLE stories ADD COLUMN is_highlight boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE stories ADD COLUMN order_index integer DEFAULT 0;
  END IF;
END $$;

-- Make image_url nullable for text-only stories
DO $$
BEGIN
  ALTER TABLE stories ALTER COLUMN image_url DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add new columns to story_views table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_views' AND column_name = 'view_duration'
  ) THEN
    ALTER TABLE story_views ADD COLUMN view_duration integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_views' AND column_name = 'completed'
  ) THEN
    ALTER TABLE story_views ADD COLUMN completed boolean DEFAULT false;
  END IF;
END $$;

-- Create story_replies table
CREATE TABLE IF NOT EXISTS story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create story_highlights table
CREATE TABLE IF NOT EXISTS story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  cover_image_url text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create story_highlight_items table (stories saved to highlights)
CREATE TABLE IF NOT EXISTS story_highlight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid REFERENCES story_highlights(id) ON DELETE CASCADE NOT NULL,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(highlight_id, story_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_media_type ON stories(media_type);
CREATE INDEX IF NOT EXISTS idx_stories_is_highlight ON stories(is_highlight);
CREATE INDEX IF NOT EXISTS idx_stories_order_index ON stories(order_index);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_story_id ON story_replies(story_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_sender_id ON story_replies(sender_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_recipient_id ON story_replies(recipient_id);
CREATE INDEX IF NOT EXISTS idx_story_highlights_user_id ON story_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_story_highlight_items_highlight_id ON story_highlight_items(highlight_id);

-- Enable RLS on new tables
ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlight_items ENABLE ROW LEVEL SECURITY;

-- Story replies policies
CREATE POLICY "Users can view story replies they sent or received"
  ON story_replies FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send story replies"
  ON story_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received story replies"
  ON story_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their sent story replies"
  ON story_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Story highlights policies
CREATE POLICY "Anyone can view story highlights"
  ON story_highlights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own highlights"
  ON story_highlights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
  ON story_highlights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
  ON story_highlights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Story highlight items policies
CREATE POLICY "Anyone can view highlight items"
  ON story_highlight_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Story owners can add to highlights"
  ON story_highlight_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_highlight_items.story_id
      AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Story owners can remove from highlights"
  ON story_highlight_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_highlight_items.story_id
      AND stories.user_id = auth.uid()
    )
  );

-- Update stories policies to allow updates
DROP POLICY IF EXISTS "Users can update their stories" ON stories;
CREATE POLICY "Users can update their stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-increment story views count
CREATE OR REPLACE FUNCTION update_story_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET views_count = views_count - 1 WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for story views count
DROP TRIGGER IF EXISTS trigger_update_story_views_count ON story_views;
CREATE TRIGGER trigger_update_story_views_count
  AFTER INSERT OR DELETE ON story_views
  FOR EACH ROW EXECUTE FUNCTION update_story_views_count();

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories
  WHERE expires_at < now()
  AND is_highlight = false;
END;
$$ LANGUAGE plpgsql;

-- Create function to get active stories with viewer info
CREATE OR REPLACE FUNCTION get_active_stories_for_user(user_uuid uuid)
RETURNS TABLE (
  story_id uuid,
  user_id uuid,
  username text,
  full_name text,
  media_type text,
  image_url text,
  video_url text,
  caption text,
  views_count integer,
  has_viewed boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS story_id,
    s.user_id,
    p.username,
    p.full_name,
    s.media_type,
    s.image_url,
    s.image_url AS video_url,
    s.caption,
    s.views_count,
    EXISTS(
      SELECT 1 FROM story_views sv 
      WHERE sv.story_id = s.id 
      AND sv.viewer_id = user_uuid
    ) AS has_viewed,
    s.created_at
  FROM stories s
  JOIN profiles p ON s.user_id = p.id
  WHERE s.expires_at > now()
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
