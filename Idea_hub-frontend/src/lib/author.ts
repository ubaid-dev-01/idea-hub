import type { AuthorRef, IUser } from '@/types/api';

export function resolveAuthor(ref: AuthorRef): IUser | null {
  if (ref && typeof ref === 'object' && '_id' in ref) {
    return ref as IUser;
  }
  return null;
}
