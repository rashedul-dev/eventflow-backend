// ============================================================================
// FILE: backend/src/app/modules/notification/notification.interface.ts
// ============================================================================

import type { NotificationType, NotificationStatus } from "@prisma/client";

export interface ICreateNotification {
  userId: string;
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  channel?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  data?: any;
  scheduledFor?: Date;
}

export interface ISendEmail {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export interface INotificationPreferences {
  emailNotifications: {
    ticketPurchase: boolean;
    eventReminders: boolean;
    eventUpdates: boolean;
    paymentUpdates: boolean;
    marketing: boolean;
  };
  inAppNotifications: {
    ticketPurchase: boolean;
    eventReminders: boolean;
    eventUpdates: boolean;
    paymentUpdates: boolean;
  };
  smsNotifications: {
    eventReminders: boolean;
    urgentUpdates: boolean;
  };
  reminderTiming: {
    oneDayBefore: boolean;
    oneHourBefore: boolean;
    atEventTime: boolean;
  };
}

export interface INotificationFilter {
  type?: NotificationType;
  status?: NotificationStatus;
  read?: boolean;
  dateFrom?: string;
  dateTo?: string;
}
