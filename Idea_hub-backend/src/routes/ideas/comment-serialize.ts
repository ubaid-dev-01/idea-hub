import { deletedAuthorPlaceholder } from './author-utils.js';
import type { LeanComment } from './comment-types.js';

export function leanCommentToApi(
  c: LeanComment,
  authors: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const aid = String(c.authorId);
  return {
    _id: String(c._id),
    ideaId: String(c.ideaId),
    authorId: authors.get(aid) ?? deletedAuthorPlaceholder(aid),
    parentCommentId: c.parentCommentId ? String(c.parentCommentId) : null,
    content: c.content,
    likeCount: c.likeCount ?? 0,
    status: c.status ?? 'visible',
    createdAt:
      c.createdAt instanceof Date
        ? c.createdAt.toISOString()
        : String(c.createdAt),
    updatedAt:
      c.updatedAt instanceof Date
        ? c.updatedAt.toISOString()
        : String(c.updatedAt),
  };
}
