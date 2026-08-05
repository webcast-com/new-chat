# Chat Platform — Roadmap & Upgrade Plan

> **Repo:** webcast-com/new-chat (hyperlink / Santa Zoza Nation platform)
> **Date:** 2026-08-05
> **Status:** Audit complete — roadmap below is the agreed upgrade sequence.
> **Legend:** ✅ works today · 🟡 partial / needs upgrade · ❌ missing

---

## 1. Current-state audit (what exists today)

| # | Feature | Status | Where (code) | Notes |
|---|---------|--------|--------------|-------|
| 1 | Media upload (images) | ✅ | `src/lib/postMedia.ts`, `src/components/CreatePost.tsx` | JPEG/PNG/GIF/WebP, ≤5 MB, Supabase storage bucket `post-images` |
| 2 | Video upload (posts) | ✅ | `src/lib/postMedia.ts`, `CreatePost.tsx` | MP4/WebM/MOV/OGG, ≤50 MB, single-file upload |
| 3 | Posting | ✅ | `CreatePost.tsx`, `src/components/Feed.tsx` | Caption, @mentions, visibility: public / county / constituency |
| 4 | Commenting | ✅ | `src/components/CommentSection.tsx` + edge fn `add-comment` | Comment likes, mention rendering |
| 5 | Replying to comments | 🟡 | `CommentSection.tsx` | Flat replies stored as `@username …` text prefix — **not a real thread tree** (no `parent_id`), no nested expand/collapse, no reply pagination |
| 6 | Sharing posts | 🟡 | `src/components/ShareButton.tsx` | Web Share API, copy link, Facebook / X / WhatsApp; records into `shares` table — **no in-app share to feed/DM/group, no visible share count** |
| 7 | Video frame (thumbnail/poster) | ❌ | `src/components/PostCard.tsx` | `<video>` has **no `poster`**; feed shows blank/black until the player loads; no frame capture on upload |
| 8 | Stories (image/video) | ✅ | `src/components/Stories.tsx` | Uses same upload lib; 10 MB image cap |
| 9 | Creating groups | 🟡 | `src/components/FutureEnhancements.tsx` (Community tab) | Prototype: `chat_groups` + `chat_group_members` + `chat_group_messages`, realtime messages. **No invite/member UI, no roles, hidden inside a "coming soon" tab** |
| 10 | Group admins & members | ❌ | — | Only `owner_id` exists. No roles, member list, join/leave, invite links, or member counts |
| 11 | Location functionality | 🟡 | `src/data/kenyaLocations.ts`, `UserProfile.tsx`, `CreatePost.tsx` | Manual county/constituency pick (47 counties + constituencies), post visibility scoping. **No GPS auto-detect, no map, no "near me"** |
| 12 | Discover by location | 🟡 | `src/components/PeopleDiscovery.tsx` | Scope chips: All / My county / My constituency + location search. No gender/age/work filters |
| 13 | Discover by gender | ❌ | `PeopleDiscovery.tsx` | `gender` is collected on profile (`src/lib/supabase.ts`) but **never used as a filter** |
| 14 | Game invite (Snakes & Ladders) | 🟡 | `src/games/snakes-ladders/` (`App.tsx`, `OnlineModal.tsx`) | Works: `?invite=CODE` deep link + 6-char room codes + PeerJS. **Invite is only a copyable link — not shareable through the chat platform** |
| 15 | Game profile = chat login username | ❌ | `src/games/snakes-ladders/utils/storage.ts` | Game keeps its own local profiles (`snakes_ladders_users_memory_v1`, default `"Player 1"`). **Not linked to the platform login** — different name in game vs chat |
| 16 | Group broadcast | ❌ | — | No broadcast concept anywhere |
| 17 | 1:1 messaging | ✅ | `src/components/Messages.tsx` | DMs, attachments, emoji reactions, read state, realtime |
| 18 | Video call | ✅ | `src/components/VideoCall.tsx` | PeerJS P2P |

---

## 2. Implementation progress

| Phase | Status | Notes |
|-------|--------|-------|
| **0 — Unified identity** | ✅ **Implemented (2026-08-05)** | `storage.ts: syncWithPlatformProfile` binds the game profile to the signed-in chat profile (same username, avatar image, same profile id); XP/stats/match history preserved; pristine "Player 1" adopted instead of duplicated; `PlayerAvatar` renders the real avatar across game UI (header, turn, participants, winner, profile/online/leaderboard modals); online play carries `avatarUrl` through invites/lobbies; local "+ New Player" is guest-only; "Linked to chat profile" badge shown. Verified: 13/13 unit tests + 5/5 browser checks. |
| **7 — Discover gender/age filters** | ✅ **Implemented (2026-08-05)** | `PeopleDiscovery.tsx`: Gender chips (Any/Women/Men/Non-binary) + Age range chips (Any/18–24/25–34/35–44/45+), combined with location scope & search; gender/age badges on discovery cards; empty state hints at filters. |
| **1 — Media & video frame** | ✅ **Implemented (2026-08-05)** | `postMedia.ts`: `compressImage` (canvas downscale ≤1600px + quality loop, target ≤1.5 MB; GIFs/tiny files untouched), `captureVideoPoster` (hidden `<video>` seek ~1s + `loadeddata` wait → JPEG frame), `uploadVideoPoster` (poster → storage), XHR upload with real `onProgress` (storage SDK has none); `CreatePost`/`Stories` show progress bar + stage text ("Optimizing photo… / Uploading… / Capturing video frame…"), compress before upload, save `poster_url` with graceful `42703` fallback if the migration isn't applied, and clean up media + poster on failure; new `VideoPlayer` component (poster + play overlay + native controls once playing) used in `PostCard`; story strip/viewer videos show posters; migration `20260805000000_phase1_media_upgrade.sql` adds `posts.poster_url` + `stories.poster_url`. Verified: 9/9 browser tests (compression 2.89 MB→0.05 MB, poster pixel-accurate red frame, GIF/small untouched, validation intact) + full regression 30/30. |
| **2 — Comments threads** | ✅ **Implemented (2026-08-05)** | Migration `20260805000100_phase2_comment_threads.sql` adds `comments.parent_id` (self-FK, cascade) + index + `count_comment_replies()`; `add-comment` edge fn accepts `parentId` (validates same-post, collapses reply-to-reply onto the root); new pure `lib/commentThreads.ts` (`buildCommentTree` — one-level nesting, orphan fallback, newest-first, cycle-guarded); `CommentSection` rewritten: nested indented threads, "View N more replies" expander (2 shown), edit/delete own comments (inline editor + menu), copy comment link, `#comment-<id>` deep-link scroll + highlight, "Load more comments" pagination; `PostCard` loads comments in pages of 25 and auto-opens the section when the deep-link comment belongs to the post. Verified: 8/8 tree unit tests + 3/3 browser checks + game regression 5/5. |
| **3 — Sharing in-app** | ✅ **Implemented (2026-08-05)** | Migration `20260805000200_phase3_inapp_sharing.sql` adds `posts.shared_post_id`, `messages.shared_post_id`, `chat_group_messages.shared_post_id` (each FK → posts, cascade, indexed) and `shares.target_type` ('feed'/'dm'/'group'/'external') + `shares.target_id`; `ShareButton` rewritten: in-app menu with **Repost to feed** (inline caption composer → new post row with `shared_post_id`), **Send in a chat** (contact picker modal → DM message with shared-post card), **Send to a group** (my-groups picker modal → group message with card), plus existing copy/external links; every flow records a `shares` row with `target_type` (upsert, ignore dupes); new `SharedPostCard` component (quote card with author, content, thumbnail; self-fetches by id for realtime payloads) rendered in `PostCard` reposts ("Reposted from @user" header), DM bubbles, and group messages; feed loads `shared_post:shared_post_id(*, profiles(*))`; share count shown on the Share button (`posts.shares_count` + existing trigger). Verified: 8/8 browser checks + full regression 42/42. |
| **4 — Groups first-class** | ✅ **Implemented (2026-08-05)** | Migration `20260805000300_phase4_groups.sql`: `chat_group_members.role` ('owner'/'admin'/'member', creator auto-set owner + guaranteed membership row), `chat_groups.invite_code` (unique, backfilled) + `avatar_url`, RLS rewritten (owners+admins manage membership, creators join as owner, members can leave, owners+admins update groups), `join_group_with_invite(code)` RPC (security definer, idempotent, invalid codes raise), realtime added for members/groups. New **`Groups.tsx`** first-class view (nav item "Groups" in desktop + mobile, lazy-loaded): group list w/ member counts + my role badge, create group (auto-owner, invite code generated), chat w/ realtime + shared-post cards, member list strip (promote to admin / demote / remove for owners+admins, leave for members, delete group for owner), invite-by-username search (owner/admin adds member), shareable `#join-CODE` invite link + copy + regenerate, edit name/description (owner/admin), join via `#join-CODE` hash on mount (RPC → auto-select group). Old prototype removed from `FutureEnhancements` ("Community" tab). Verified: 8/8 browser checks + full regression 50/50 (game 5, media 9, comments 3, share 8, livescore 25). |
| **5 — Group broadcast** | ✅ **Implemented (2026-08-05)** | Migration `20260805000400_phase5_group_broadcast.sql`: `chat_group_messages.kind` ('message'/'broadcast') + `broadcast_by` (FK), `chat_group_members.broadcast_muted` (default false), index on (group_id, kind, created_at), RLS rewritten so broadcasts are insertable **only by owners/admins** (regular messages unchanged). New edge function **`group-broadcast`** (`supabase/functions/group-broadcast/`): validates caller is owner/admin → inserts the broadcast row → web-pushes **non-muted** members via `push_subscriptions` + VAPID (`sendWebPush`, copied helper; VAPID optional — degrades to chat-only if unset) → tracks a notification event; returns `{ delivered, failed }`. `Groups.tsx`: 🛎️ Megaphone broadcast composer in the header (owner/admin only, "Broadcast to N members", result line with push count, **falls back to a direct insert if the edge fn isn't deployed**), broadcasts render as full-width amber announcement cards (distinct from chat bubbles), per-member **mute broadcasts** bell toggle (self + owner/admin for others) persisted to `broadcast_muted`, realtime delivers broadcasts live. Verified: 13/13 browser/unit checks + full regression 71/71 (game 5, media 9, comments 3, share 8, groups 8, livescore 25). |
| **6 — GPS / map / near-me** | ✅ **Implemented (2026-08-05)** | Migration `20260805000500_phase6_gps_location.sql`: `profiles.lat`/`lng`/`location_updated_at` (opt-in, indexed), `posts.near_me` + `post_lat`/`post_lng` (indexed). New `lib/geo.ts`: Kenya county centroids (47), haversine `distanceKm`, `formatDistanceKm`, `detectCountyFromCoords` (nearest centroid ≤150 km), `suggestConstituency`, `isValidKenyaPoint`, `reverseGeocode` (Nominatim, no key). `UserProfile`: **"Detect my location"** button (browser geolocation → county/constituency pre-fill + notice; permission-denied handled; coordinates saved with the profile, cleared on manual change). `PeopleDiscovery`: **"Near me (25 km)"** scope chip (users with GPS within 25 km, sorted by distance) + per-user **distance badges** ("400 m away"). `CreatePost`: **"Around me (25 km)"** audience option (stores `near_me` + GPS at publish). Verified: 12/12 geo tests (Nairobi→Mombasa 440 km, same-point 0, county detection, bounds, formatting) + full regression 83/83 (game 5, media 9, comments 3, share 8, groups 8, broadcast 13, livescore 25). |
| **8 — Hardening** | ✅ **Implemented (2026-08-05)** | Migration `20260805000600_phase8_hardening.sql`: indexes (`messages(sender_id, created_at)`, `messages(recipient_id, created_at)`, `shares(post_id, created_at)`, `shares(user_id, created_at)`, `comments(parent_id)`); **notification triggers** (security definer): reply-to-comment → notify parent author (deduped vs post-owner notification), group broadcast → notify every non-sender member (`group_broadcast`), member added to group → notify the added user (`group_invite`); **safety fix**: "Members can leave groups" delete policy now excludes owners (prevents orphaning a group). **NotificationBell** upgraded to include group broadcasts/invites (from `notification_events`) + latest incoming DMs, with icons for each kind. **PostCard report button now real** — inserts into `moderation_reports` (was a no-op `setIsReported`). **Dark mode**: full `dark:` variant pass on `Groups.tsx` (40 classes: panels, inputs, bubbles, members, invite/broadcast surfaces). **group-broadcast edge fn deduped** — member notifications moved to the DB trigger. Verified: 11/11 hardening checks + full regression **94/94** (game 5, media 9, comments 3, share 8, groups 8, broadcast 13, geo 12, livescore 25) + tsc + build clean. |

---

## 7. All phases complete ✅

Phases 0–8 are implemented. Remaining optional ideas for the future: transfer-owner flow, group avatars upload UI, maps (Leaflet) on profiles, comment editing moderation, admin moderation dashboard UI, PWA push for groups (already wired via `group-broadcast` + existing `send-push-notification`).
| 2 — Comments threads | ⬜ Pending | |
| 3 — Sharing in-app | ⬜ Pending | |
| 4 — Groups first-class | ⬜ Pending | |
| 5 — Group broadcast | ⬜ Pending | |
| 6 — GPS/map/near-me | ⬜ Pending | |
| 8 — RLS/indexes/hardening | ⬜ Pending | |

---

## 3. Roadmap phases (build order)

### Phase 0 — Unified identity (prerequisite for everything)
**Goal:** one username/avatar everywhere — chat, posts, game.

- Game profile bootstrap reads the platform auth (`useAuth()` → `profile.username`, `avatar_url`, `id`) instead of `"Player 1"`.
- `src/games/snakes-ladders/utils/storage.ts`: add `syncWithPlatformProfile(platformProfile)` — upserts a game profile keyed by `profile.id`, preserves game points/XP/stats, only updates `username`/`avatar`.
- Online lobby (`OnlineModal.tsx`) and invite join send the platform username; local "Create New Slitherer" becomes "only when signed out" (guest fallback).
- Acceptance: signed-in user opens Play → name = chat username; wins recorded against the same profile id.

### Phase 1 — Media & video upgrade
**Goal:** robust uploads with feedback + video frames.

- **Upload progress bar** in `CreatePost`/`Stories` (Supabase upload supports `XMLHttpRequest`/`onUploadProgress` — wrap `uploadPostMedia`).
- **Client-side compression**: images via canvas (`createImageBitmap` + `toBlob`, cap ~1.5 MB); videos keep raw but warn >25 MB.
- **Video frame capture (poster)**: on upload, load the file into a hidden `<video>`, seek to ~1 s, draw to canvas, upload as `<poster>`; store in `posts.poster_url`.
- **Player upgrade** in `PostCard`: show poster + play button overlay, native controls, `preload="metadata"`, lazy-load.
- **Cleanup on failure** already handled (`removePostMedia`).
- Acceptance: every video post shows a frame in the feed without downloading the video.

### Phase 2 — Comments v2 (real threads)
**Goal:** true nested replies + moderation basics.

- **Schema:** `comments.parent_id uuid null` (self-FK) — migration in §4.
- `CommentSection.tsx`: reply targets `parent_id`; render thread tree (2 levels visible, "View N more replies"); keep `@username` prefix for context.
- **Pagination**: load 25 per page + "Load more" (currently unbounded `max-h-[30rem]` scroll).
- **Edit/delete own comments** (new edge fn `manage-comment`), comment share link (`/post/:id#comment-:id`).
- Acceptance: reply nests under parent with indent; counts per thread; deep-linkable.

### Phase 3 — Sharing v2 (in-app)
**Goal:** share anywhere inside the platform, not just outbound links.

- `ShareButton`: add "Share to feed (re-share)", "Share to a chat", "Share to a group".
- New `shares` rows carry `target_type: 'feed' | 'dm' | 'group' | 'external'`; re-shared posts appear in feed as quote cards (`PostCard` shared variant).
- Show `shares_count` on posts (column exists), "Reposted by X" line.
- Acceptance: share → pick DM/group → recipient sees card; count increments.

### Phase 4 — Groups (first-class)
**Goal:** move the Community-tab prototype into the real product.

- **Move UI** out of `FutureEnhancements.tsx` into Messages + a Groups section (sidebar entry "Groups").
- **Invite flows:** invite by username search, shareable invite link/code (`/groups/join/:code`), QR later.
- **Roles & permissions:** `chat_group_members.role ∈ ('owner' | 'admin' | 'member')`; owner = creator (transferable), admin = manage members/remove/mute, member = post/read.
- **Member management:** member list panel, invite, remove, promote/demote, leave group, group avatar/name/description edit (owner/admin).
- **Group posts + group feed** (optional v2): posts scoped to `group_id`.
- Acceptance: create → invite friend → friend joins via link → admin promotes → member list reflects roles.

### Phase 5 — Group broadcast
**Goal:** one-to-many announcements inside groups.

- `chat_group_messages.kind ∈ ('message' | 'broadcast')`, `broadcast_by uuid`.
- Owner/admin-only "Broadcast" composer; broadcast renders full-width, pinned style, distinct color; delivered via realtime + web push (`send-push-notification` edge fn exists) to members with push on.
- Member opt-out per group (`chat_group_members.broadcast_muted bool`).
- Acceptance: admin broadcasts → all members see instantly; non-admins see no broadcast button.

### Phase 6 — Location v2 (GPS + map)
**Goal:** real location, not just dropdowns.

- **Auto-detect:** browser Geolocation → reverse geocode (free Nominatim or Kenya-specific dataset) → suggest county/constituency in `UserProfile` edit; user confirms before saving (privacy).
- **"Near me"** in `PeopleDiscovery`: distance sort using haversine on `profiles.lat`, `profiles.lng` (new nullable columns, opt-in).
- **Post scope by GPS**: "Around me (25 km)" visibility option.
- Map preview of a county (Leaflet + OSM tiles) on profile/discover later.
- Acceptance: user enables location → county auto-filled; discover can sort by distance.

### Phase 7 — Discover v2 (gender/age filters)
**Goal:** the requested discovery filters.

- `PeopleDiscovery.tsx`: add filter chips/dropdowns — Gender (Any/F/M), Age range (sliders), plus existing location scope; combine with search query.
- Show gender/age badges on discovery cards (respecting profile completeness).
- Optional: "Suggested for you" (same county + similar age, not already connected).
- Acceptance: filter Female + Nairobi City → only matching profiles; URL retains filters.

### Phase 8 — Polish, scale & safety (cross-cutting)
- **RLS policies** for all new tables (§4) — groups, members, messages, poster storage.
- Indexes: `comments(post_id, parent_id)`, `shares(post_id)`, `chat_group_messages(group_id, created_at)`, `profiles(county)`.
- Notifications center (existing `notification_events` table) wired to comments/replies/group invites/broadcasts.
- Moderation: report button, admin mute/remove from groups (ties into existing admin dashboard).
- Analytics events for new features; empty/error states; dark mode parity.

---

## 4. Priority & effort

| Priority | Phase | Effort | Why this order |
|----------|-------|--------|----------------|
| P0 | 0 — Unified identity | S | Unblocks game-name requirement & invites |
| P0 | 4 — Groups first-class | L | Biggest ask; prototype exists to build on |
| P0 | 5 — Group broadcast | M | Depends on groups |
| P1 | 1 — Media & video frame | M | Direct ask (upload, video, frames) |
| P1 | 2 — Comments threads | M | Direct ask (replying/comments) |
| P1 | 3 — Sharing in-app | M | Direct ask (sharing) |
| P1 | 7 — Discover gender/location filters | S–M | Small UI + query change |
| P2 | 6 — GPS/map/near-me | M | Needs opt-in + reverse geocoding |
| P2 | 8 — RLS/indexes/moderation/notifications | M | Cross-cutting hardening |

*S = < 1 day · M = 1–3 days · L = 3–5 days*

---

## 5. Schema changes (SQL migration sketch)

```sql
-- Phase 2: threaded comments
alter table public.comments
  add column parent_id uuid null references public.comments(id) on delete cascade;
create index idx_comments_post_parent on public.comments (post_id, parent_id);

-- Phase 1: video poster frames
alter table public.posts
  add column poster_url text null;

-- Phase 4: group roles + invites
alter table public.chat_group_members
  add column role text not null default 'member'
    check (role in ('owner', 'admin', 'member'));
alter table public.chat_groups
  add column invite_code text unique,
  add column avatar_url text null;

-- Phase 5: broadcast messages
alter table public.chat_group_messages
  add column kind text not null default 'message'
    check (kind in ('message', 'broadcast')),
  add column broadcast_by uuid null references public.profiles(id);
alter table public.chat_group_members
  add column broadcast_muted boolean not null default false;

-- Phase 6: GPS (opt-in)
alter table public.profiles
  add column lat double precision null,
  add column lng double precision null,
  add column location_updated_at timestamptz null;

-- Phase 3: share targets
alter table public.shares
  add column target_type text not null default 'external'
    check (target_type in ('feed', 'dm', 'group', 'external')),
  add column target_id uuid null;
```

---

## 6. Acceptance checklist (per request)

- [ ] **Upload** — images ≤5 MB, videos ≤50 MB, progress bar, failure cleanup, compression for photos
- [ ] **Posting** — caption + media + visibility (public/county/constituency) + mentions
- [ ] **Commenting** — add, like, mention-render, paginated
- [ ] **Replying** — true nested threads (`parent_id`), indent + "view more", edit/delete own
- [ ] **Sharing** — external (Web Share/WhatsApp/X/FB) + in-app (feed re-share, DM, group), share count shown
- [ ] **Video upload + video frame** — poster captured at ~1 s, feed shows frame + play overlay
- [ ] **Creating groups** — first-class UI, invite by username + link/code
- [ ] **Group admins & members** — roles (owner/admin/member), member list, promote/demote, remove, leave
- [ ] **Location** — county/constituency profile + post scope + optional GPS auto-detect + near-me
- [ ] **Discover location & gender** — county/constituency scope + gender filter + age range + location search
- [ ] **Game invite** — invite link shareable via chat (DM/group), room code join, guest fallback
- [ ] **Game profile = login username** — signed-in users play as their chat username/avatar; stats persist to same profile id
- [ ] **Group broadcast** — owner/admin compose broadcast → all members realtime + push, per-member mute

---

## 7. Suggested execution

1. **Sprint 1:** Phase 0 (unified identity) + Phase 4 (groups first-class) — unlocks invites, admins/members, and the game-name requirement.
2. **Sprint 2:** Phase 5 (broadcast) + Phase 3 (sharing v2).
3. **Sprint 3:** Phase 1 (media/video frames) + Phase 2 (comment threads).
4. **Sprint 4:** Phase 7 (discover filters) + Phase 6 (GPS) + Phase 8 (hardening).
