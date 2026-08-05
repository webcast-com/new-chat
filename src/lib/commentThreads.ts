import type { Comment } from './supabase';

/**
 * Phase 2 — comment thread helpers (pure, unit-testable).
 */

export interface CommentNode {
  comment: Comment;
  replies: CommentNode[];
}

/**
 * Group a flat comment list into a reply tree.
 * - Top-level comments are `parent_id`-null.
 * - Replies are nested one level under their root parent (matches the
 *   add-comment edge function, which collapses replies-to-replies onto the
 *   root parent).
 * - Orphaned replies (parent missing from the loaded page) are shown as
 *   top-level so nothing disappears.
 */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const byId = new Map<string, Comment>();
  for (const comment of comments) byId.set(comment.id, comment);

  // Find the top-level ancestor of a comment by walking the parent chain.
  // Replies are always rendered one level deep under a root (matches the
  // add-comment edge function, which collapses reply-to-reply onto the root).
  const rootOf = (comment: Comment, seen = new Set<string>()): Comment | null => {
    if (!comment.parent_id) return comment;
    if (seen.has(comment.id)) return null; // cycle guard
    seen.add(comment.id);
    const parent = byId.get(comment.parent_id);
    if (!parent) return null; // orphan — treated as top-level
    return rootOf(parent, seen);
  };

  const roots: CommentNode[] = [];
  const childrenOf = new Map<string, CommentNode[]>();
  const nodeById = new Map<string, CommentNode>();

  for (const comment of comments) {
    const node: CommentNode = { comment, replies: [] };
    nodeById.set(comment.id, node);
    const root = rootOf(comment);
    if (root && root.id !== comment.id) {
      const list = childrenOf.get(root.id) ?? [];
      list.push(node);
      childrenOf.set(root.id, list);
    } else {
      roots.push(node);
    }
  }

  for (const node of roots) {
    node.replies = childrenOf.get(node.comment.id) ?? [];
    // Old flat "replies" (pre-thread data) were stored as "@username …"
    // prefixed comments — they appear here as top-level, which is fine.
  }

  // Newest first within each level for readability.
  const byNewest = (a: CommentNode, b: CommentNode) =>
    new Date(b.comment.created_at).getTime() - new Date(a.comment.created_at).getTime();
  roots.sort(byNewest);
  for (const node of roots) node.replies.sort(byNewest);

  return roots;
}

/** Total number of replies across the loaded tree. */
export function countReplies(nodes: CommentNode[]): number {
  let count = 0;
  for (const node of nodes) count += node.replies.length;
  return count;
}
