import type { INotificationDocument } from '../models/Notification.model.js';
import type { IUserDocument } from '../models/User.model.js';
import { userToApi } from './serialize-user.js';

export function notificationToApi(
  n: INotificationDocument,
  sender?: IUserDocument | null
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    _id: String(n._id),
    recipientId: String(n.recipientId),
    type: n.type,
    referenceId: String(n.referenceId),
    referenceType: n.referenceType,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    createdAt:
      n.createdAt instanceof Date
        ? n.createdAt.toISOString()
        : String(n.createdAt),
  };
  if (sender) {
    out.senderId = userToApi(sender);
  }
  return out;
}
