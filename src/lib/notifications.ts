/**
 * COMPATIBILITY SHIM: canonical notifications service is @/infrastructure/notifications.
 * Do not add new callers.
 */
export {
  sendNotification,
  type NotificationType,
  type NotificationPayload,
} from "@/infrastructure/notifications";

