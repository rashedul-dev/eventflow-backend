// ============================================================================
// FILE: backend/src/app/modules/notification/notification.constant.ts
// ============================================================================

export const NOTIFICATION_TYPES = {
  TICKET_PURCHASE: "ticket_purchase",
  EVENT_REMINDER: "event_reminder",
  EVENT_CANCELLED: "event_cancelled",
  EVENT_UPDATED: "event_updated",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  REFUND_PROCESSED: "refund_processed",
  EVENT_APPROVED: "event_approved",
  EVENT_REJECTED: "event_rejected",
  TICKET_TRANSFER: "ticket_transfer",
  WAITLIST_AVAILABLE: "waitlist_available",
} as const;

export const NOTIFICATION_CHANNELS = {
  EMAIL: "email",
  IN_APP: "in_app",
  SMS: "sms",
  PUSH: "push",
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const EMAIL_TEMPLATES = {
  TICKET_CONFIRMATION: "ticket_confirmation",
  EVENT_REMINDER_24H: "event_reminder_24h",
  EVENT_REMINDER_1H: "event_reminder_1h",
  EVENT_CANCELLED: "event_cancelled",
  REFUND_CONFIRMATION: "refund_confirmation",
  EVENT_VERIFICATION: "event_verification",
  WELCOME: "welcome",
} as const;

export const notificationSearchableFields = ["title", "message"];

export const notificationFilterableFields = ["type", "status", "channel", "read", "dateFrom", "dateTo"];
