import type {
  NotificationEntityType,
  NotificationType,
} from "../../modules/notifications/notification.model.js";

export interface NotificationJobData {
  eventId: string;
  workspaceId: string;
  recipientIds: string[];
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}
