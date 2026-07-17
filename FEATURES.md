# Social Hub - Facebook-like Features

## Core Features Implemented

### Authentication
- User registration with unique username
- Secure email/password login
- Session management with Supabase Auth

### Posts & Content
- Create, edit, and delete posts
- Image uploads with preview
- Post engagement tracking
- Real-time comment threads
- Nested comment system
- Community feed search by post content, username, or full name
- Trending feed ranked by engagement and recency, with 24-hour, weekly, and all-time filters
- 24-hour image stories with upload, grouped viewing, and automatic progression

### Reactions (Facebook-like)
- 6 reaction types: Like 👍, Love ❤️, Haha 😂, Wow 😮, Sad 😢, Angry 😠
- Reaction emoji picker with hover menu
- Total reaction count display with emoji preview
- Switch between reaction types or remove reactions

### Sharing & Reposts
- Share posts to your own feed
- Add caption to shares
- Track share counts
- Delete shared posts

### User Profiles
- User profile pages with bio and full name
- Edit profile information
- Profile statistics (posts, friends)
- Avatar with user initial
- User discovery
- Searchable following and follower lists with name sorting

### Friend System
- Send friend requests to other users
- View pending friend requests
- Accept/decline friend requests
- Friend suggestions
- Friend count tracking

### People Discovery
- Browse all users on the platform
- Discover new people to connect with
- Send friend requests directly
- View user bios and full names
- Friend request status indicators

### Navigation
- Sticky header with app branding
- Desktop sidebar navigation
- Mobile bottom navigation bar
- Community feed search
- Quick-create post modal
- Sign out functionality

### UI/UX
- Responsive design for mobile and desktop
- Gradient buttons and accents
- Smooth transitions and hover states
- Loading states for async operations
- Error handling and user feedback
- Dashboard controls for notification and privacy preferences
- Clean, modern design with Tailwind CSS

### Direct Messaging
- Conversation inbox with recent-message previews and unread counts
- Conversation search by username or full name
- Send, receive, read, and delete messages
- Live conversation and thread updates through Supabase Realtime
- Responsive split-view chat layout with message timestamps and auto-scroll
- Start conversations from People Discovery and Contacts

## Database Schema

### Tables
- `profiles` - User information and bio
- `posts` - User posts with engagement metrics
- `reactions` - Post reactions (6 types)
- `shares` - Post shares and reposts
- `comments` - Post comments
- `friendships` - Friend requests and connections
- `likes` - Legacy like system (kept for compatibility)
- `notifications` - User notifications
- `messages` - Direct messaging (infrastructure ready)
- `stories` - Story feature (infrastructure ready)
- `story_views` - Story view tracking

### Security
- Row Level Security (RLS) enabled on all tables
- User-specific access policies
- Authenticated user checks
- Ownership verification for modifications

### Indexes
- Optimized queries with strategic indexes
- Fast lookups for reactions, shares, friendships
- Efficient notification retrieval

## Technical Stack
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for images)
- **Icons**: Lucide React
- **Build**: Vite

## Future Enhancement Opportunities
- Persistent notification center and delivery for likes, comments, and friend requests
- User mentions in posts and comments
- Group chats
- Video uploads
- Post scheduling
- Activity timeline
- Server-enforced privacy settings
- Content moderation tools
