-- Add shares tracking for better trending algorithm
CREATE TABLE IF NOT EXISTS shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  share_type text DEFAULT 'share',
  created_at timestamptz DEFAULT now()
);

-- Add shares_count to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0;

-- Create index for shares
CREATE INDEX IF NOT EXISTS idx_shares_post_id ON shares(post_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);

-- Enable RLS on shares
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Shares policies
CREATE POLICY "Shares are viewable by everyone"
  ON shares FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create shares"
  ON shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update shares_count
CREATE OR REPLACE FUNCTION update_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET shares_count = shares_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shares_count ON shares;
CREATE TRIGGER trigger_update_shares_count
  AFTER INSERT OR DELETE ON shares
  FOR EACH ROW EXECUTE FUNCTION update_post_shares_count();

-- Trending score function
-- Uses a time-decay weighted algorithm:
-- Score = (likes_weight * likes) + (comments_weight * comments) + (shares_weight * shares)
--          * time_decay_factor
-- Where time_decay_factor = 1 / (1 + hours_since_post ^ decay_power)
CREATE OR REPLACE FUNCTION get_trending_posts(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  image_url text,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  created_at timestamptz,
  trending_score double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.likes_count,
    p.comments_count,
    COALESCE(p.shares_count, 0) as shares_count,
    p.created_at,
    (
      -- Weighted engagement: comments worth 3x, shares worth 5x
      (p.likes_count * 1.0) +
      (p.comments_count * 3.0) +
      (COALESCE(p.shares_count, 0) * 5.0)
    ) * 
    -- Time decay: 1 / (1 + hours^1.5), posts lose ~50% score every ~3 hours
    (
      CASE 
        WHEN EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0 < 1 THEN 1.0
        ELSE 1.0 / (1.0 + POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0, 1.5))
      END
    ) as trending_score
  FROM posts p
  WHERE p.created_at > now() - interval '7 days' -- Only consider posts from last 7 days
  ORDER BY trending_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add last_engagement_at for real-time trending
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_engagement_at timestamptz DEFAULT now();

-- Update last_engagement_at when likes occur
CREATE OR REPLACE FUNCTION update_post_last_engagement_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET last_engagement_at = now() WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_engagement_likes ON likes;
CREATE TRIGGER trigger_update_last_engagement_likes
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION update_post_last_engagement_likes();

-- Update last_engagement_at when comments occur
CREATE OR REPLACE FUNCTION update_post_last_engagement_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET last_engagement_at = now() WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_engagement_comments ON comments;
CREATE TRIGGER trigger_update_last_engagement_comments
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_last_engagement_comments();

-- Update last_engagement_at when shares occur
CREATE OR REPLACE FUNCTION update_post_last_engagement_shares()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET last_engagement_at = now() WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_engagement_shares ON shares;
CREATE TRIGGER trigger_update_last_engagement_shares
  AFTER INSERT ON shares
  FOR EACH ROW EXECUTE FUNCTION update_post_last_engagement_shares();

-- Hot trending function (last 24 hours)
CREATE OR REPLACE FUNCTION get_hot_posts(limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  image_url text,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  created_at timestamptz,
  trending_score double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.likes_count,
    p.comments_count,
    COALESCE(p.shares_count, 0) as shares_count,
    p.created_at,
    (
      (p.likes_count * 1.0) +
      (p.comments_count * 3.0) +
      (COALESCE(p.shares_count, 0) * 5.0)
    ) * 
    (
      CASE 
        WHEN EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0 < 1 THEN 1.0
        ELSE 1.0 / (1.0 + POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0, 1.2))
      END
    ) as trending_score
  FROM posts p
  WHERE p.created_at > now() - interval '24 hours'
  ORDER BY trending_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;