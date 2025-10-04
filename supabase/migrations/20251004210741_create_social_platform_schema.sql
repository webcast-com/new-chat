/*
  # Social Connection Platform Schema

  ## Overview
  Complete database schema for a social networking platform with user profiles, posts, connections, and interactions.

  ## 1. New Tables

  ### `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key) - References auth.users
  - `username` (text, unique) - User's display name
  - `full_name` (text) - User's full name
  - `bio` (text) - User biography
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### `posts`
  User-generated content posts
  - `id` (uuid, primary key) - Unique post identifier
  - `user_id` (uuid, foreign key) - Post author
  - `content` (text) - Post text content
  - `image_url` (text) - Optional post image
  - `likes_count` (integer) - Cached like count
  - `comments_count` (integer) - Cached comment count
  - `created_at` (timestamptz) - Post creation time

  ### `connections`
  User-to-user connection relationships
  - `id` (uuid, primary key) - Unique connection identifier
  - `follower_id` (uuid, foreign key) - User initiating connection
  - `following_id` (uuid, foreign key) - User being followed
  - `created_at` (timestamptz) - Connection creation time
  - Unique constraint on (follower_id, following_id)

  ### `likes`
  Post like interactions
  - `id` (uuid, primary key) - Unique like identifier
  - `user_id` (uuid, foreign key) - User who liked
  - `post_id` (uuid, foreign key) - Liked post
  - `created_at` (timestamptz) - Like timestamp
  - Unique constraint on (user_id, post_id)

  ### `comments`
  Post comments
  - `id` (uuid, primary key) - Unique comment identifier
  - `user_id` (uuid, foreign key) - Comment author
  - `post_id` (uuid, foreign key) - Parent post
  - `content` (text) - Comment text
  - `created_at` (timestamptz) - Comment creation time

  ## 2. Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:
  
  #### Profiles
  - Users can view all profiles (public information)
  - Users can only insert their own profile
  - Users can only update their own profile
  - Users cannot delete profiles

  #### Posts
  - Users can view all posts
  - Authenticated users can create posts
  - Users can only update their own posts
  - Users can only delete their own posts

  #### Connections
  - Users can view all connections
  - Authenticated users can create connections
  - Users can only delete their own connections

  #### Likes
  - Users can view all likes
  - Authenticated users can create likes
  - Users can only delete their own likes

  #### Comments
  - Users can view all comments
  - Authenticated users can create comments
  - Users can only update their own comments
  - Users can only delete their own comments

  ## 3. Indexes
  - Profile username lookup
  - Post user and creation time queries
  - Connection follower/following lookups
  - Like post and user queries
  - Comment post queries

  ## 4. Important Notes
  - All timestamps use `timestamptz` for timezone awareness
  - Foreign keys ensure referential integrity
  - Unique constraints prevent duplicate relationships
  - Cached counts on posts improve query performance
  - RLS policies ensure users can only modify their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  image_url text DEFAULT '',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create connections table (follower/following relationships)
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connections_follower ON connections(follower_id);
CREATE INDEX IF NOT EXISTS idx_connections_following ON connections(following_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Connections policies
CREATE POLICY "Connections are viewable by everyone"
  ON connections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own connections"
  ON connections FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update likes_count on posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update comments_count on posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_likes_count ON likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments;
CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();