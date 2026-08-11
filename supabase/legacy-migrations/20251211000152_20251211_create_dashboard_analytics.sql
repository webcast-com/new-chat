/*
  # Dashboard Analytics & Notifications System

  ## Overview
  Create comprehensive analytics tracking and notification tables for user dashboards,
  enabling detailed insights into user engagement, activity history, and social interactions.

  ## 1. New Tables

  ### `user_analytics`
  - Stores daily aggregated analytics for each user
  - Tracks posts, likes received, followers gained, engagement metrics
  - Enables historical trend analysis and insights
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles)
  - `date` (date) - Day of analytics
  - `posts_created` (integer) - Posts created that day
  - `likes_received` (integer) - Total likes on all posts
  - `comments_received` (integer) - Total comments received
  - `followers_gained` (integer) - New followers that day
  - `engagement_rate` (numeric) - Engagement percentage
  - `created_at` (timestamptz)

  ### `user_notifications`
  - Real-time notification system for user interactions
  - Tracks likes, comments, follows, messages, and story interactions
  - Enables notification panel and badges
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - Notification recipient
  - `actor_id` (uuid, FK to profiles) - User who triggered notification
  - `type` (text) - Notification type (like, comment, follow, message, story_view, etc)
  - `reference_id` (uuid) - ID of related object (post, story, etc)
  - `content` (text) - Notification message
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz)

  ### `activity_logs`
  - Comprehensive activity audit log for each user
  - Tracks all significant actions (posts, likes, follows, etc)
  - Used for activity timeline and insights
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - User who performed action
  - `action_type` (text) - Type of action (post_created, like, follow, etc)
  - `description` (text) - Human-readable description
  - `reference_id` (uuid) - Related object ID
  - `metadata` (jsonb) - Additional data
  - `created_at` (timestamptz)

  ## 2. Security
  - RLS enabled on all tables
  - Users can only view their own analytics, notifications, and activity logs
  - Policies restrict data visibility to authenticated users
  - Proper foreign key constraints

  ## 3. Indexes
  - user_analytics: user_id, date for fast date range queries
  - user_notifications: user_id, is_read for inbox queries
  - activity_logs: user_id, created_at for timeline queries
*/

-- Create user_analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  posts_created integer DEFAULT 0,
  likes_received integer DEFAULT 0,
  comments_received integer DEFAULT 0,
  followers_gained integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'message', 'story_view', 'story_reply', 'connection_request')),
  reference_id uuid,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('post_created', 'like', 'comment', 'follow', 'story_created', 'story_viewed', 'friend_request')),
  description text NOT NULL,
  reference_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(date);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

-- Enable RLS on all new tables
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_analytics
CREATE POLICY "Users can view own analytics"
  ON user_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics"
  ON user_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update analytics"
  ON user_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_notifications
CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = actor_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON user_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to create initial analytics record for new user
CREATE OR REPLACE FUNCTION create_initial_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_analytics (user_id, date)
  VALUES (NEW.id, CURRENT_DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create analytics on profile creation
DROP TRIGGER IF EXISTS trigger_create_initial_analytics ON profiles;
CREATE TRIGGER trigger_create_initial_analytics
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_initial_analytics();