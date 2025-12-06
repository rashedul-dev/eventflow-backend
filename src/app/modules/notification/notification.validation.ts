// ============================================================================
// FILE: backend/src/app/modules/notification/notification.validation.ts
// ============================================================================

import { z } from "zod";
import { NotificationType, NotificationStatus } from "@prisma/client";

export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const markAllAsReadSchema = z.object({
  body: z.object({
    type: z.nativeEnum(NotificationType).optional(),
  }),
});

export const notificationPreferencesSchema = z.object({
  body: z.object({
    emailNotifications: z
      .object({
        ticketPurchase: z.boolean(),
        eventReminders: z.boolean(),
        eventUpdates: z.boolean(),
        paymentUpdates: z.boolean(),
        marketing: z.boolean(),
      })
      .optional(),
    inAppNotifications: z
      .object({
        ticketPurchase: z.boolean(),
        eventReminders: z.boolean(),
        eventUpdates: z.boolean(),
        paymentUpdates: z.boolean(),
      })
      .optional(),
    smsNotifications: z
      .object({
        eventReminders: z.boolean(),
        urgentUpdates: z.boolean(),
      })
      .optional(),
    reminderTiming: z
      .object({
        oneDayBefore: z.boolean(),
        oneHourBefore: z.boolean(),
        atEventTime: z.boolean(),
      })
      .optional(),
  }),
});

export const notificationQuerySchema = z.object({
  query: z.object({
    type: z.nativeEnum(NotificationType).optional(),
    status: z.nativeEnum(NotificationStatus).optional(),
    read: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});
