// ============================================================================
// FILE: backend/src/app/modules/notification/notification.service.ts
// ============================================================================

import httpStatus from "http-status";
import { NotificationStatus, type Prisma } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { calculatePagination, createPaginatedResponse, type IPaginationOptions } from "../../helpers/paginationHelper";
import { logger } from "../../../utils/logger";
import { sendEmail } from "./email.service";
import type { ICreateNotification, INotificationPreferences, INotificationFilter } from "./notification.interface";

/**
 * Create notification
 */
const createNotification = async (payload: ICreateNotification) => {
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      eventId: payload.eventId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      channel: payload.channel || "in_app",
      data: payload.data as Prisma.JsonObject,
      scheduledFor: payload.scheduledFor,
      status: payload.scheduledFor ? NotificationStatus.PENDING : NotificationStatus.SENT,
    },
  });

  logger.info(`Notification created: ${notification.id} for user ${payload.userId}`);
  return notification;
};

/**
 * Send ticket confirmation email
 */
const sendTicketConfirmation = async (userId: string, ticketIds: string[]) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds } },
    include: {
      event: true,
      ticketType: true,
    },
  });

  if (tickets.length === 0) return;

  const event = tickets[0].event;

  // Send email
  await sendEmail({
    to: user.email,
    subject: `Your tickets for ${event.title}`,
    template: "ticket_confirmation",
    data: {
      userName: user.firstName || "Guest",
      eventTitle: event.title,
      eventDate: event.startDate,
      tickets: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        type: t.ticketType.name,
        qrCode: t.qrCode,
      })),
    },
  });

  // Create in-app notification
  await createNotification({
    userId,
    eventId: event.id,
    type: "EMAIL",
    title: "Tickets Confirmed",
    message: `Your ${tickets.length} ticket(s) for ${event.title} have been confirmed`,
    data: { ticketIds },
  });
};

/**
 * Schedule event reminders
 */
const scheduleEventReminders = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      tickets: {
        where: { status: "ACTIVE" },
        include: { user: true },
      },
    },
  });

  if (!event) return;

  const eventStart = new Date(event.startDate);
  const oneDayBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(eventStart.getTime() - 60 * 60 * 1000);

  // Schedule reminders for each ticket holder
  for (const ticket of event.tickets) {
    // 24 hour reminder
    await createNotification({
      userId: ticket.userId,
      eventId: event.id,
      type: "EMAIL",
      title: `Reminder: ${event.title} tomorrow`,
      message: `Your event "${event.title}" starts tomorrow at ${eventStart.toLocaleString()}`,
      scheduledFor: oneDayBefore,
      data: { ticketId: ticket.id },
    });

    // 1 hour reminder
    await createNotification({
      userId: ticket.userId,
      eventId: event.id,
      type: "EMAIL",
      title: `Reminder: ${event.title} in 1 hour`,
      message: `Your event "${event.title}" starts in 1 hour!`,
      scheduledFor: oneHourBefore,
      data: { ticketId: ticket.id },
    });
  }

  logger.info(`Event reminders scheduled for ${event.tickets.length} attendees of event ${eventId}`);
};

/**
 * Send event cancellation notification
 */
const sendEventCancellationNotification = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      tickets: {
        where: { status: "ACTIVE" },
        include: { user: true },
      },
    },
  });

  if (!event) return;

  for (const ticket of event.tickets) {
    await sendEmail({
      to: ticket.user.email,
      subject: `Event Cancelled: ${event.title}`,
      template: "event_cancelled",
      data: {
        userName: ticket.user.firstName,
        eventTitle: event.title,
        eventDate: event.startDate,
      },
    });

    await createNotification({
      userId: ticket.userId,
      eventId: event.id,
      type: "EMAIL",
      title: "Event Cancelled",
      message: `The event "${event.title}" has been cancelled. Refunds will be processed automatically.`,
      channel: "email",
      data: { ticketId: ticket.id },
    });
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (
  userId: string,
  filters: INotificationFilter,
  paginationOptions: IPaginationOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereInput: Prisma.NotificationWhereInput = {
    userId,
    ...(filters.type && { type: filters.type }),
    ...(filters.status && { status: filters.status }),
    ...(filters.read !== undefined && { readAt: filters.read ? { not: null } : null }),
    ...(filters.dateFrom && { createdAt: { gte: new Date(filters.dateFrom) } }),
    ...(filters.dateTo && { createdAt: { lte: new Date(filters.dateTo) } }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    }),
    prisma.notification.count({ where: whereInput }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  return {
    ...createPaginatedResponse(notifications, total, { page, limit, skip, sortBy, sortOrder }),
    unreadCount,
  };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId: string, type?: string) => {
  const whereInput: Prisma.NotificationWhereInput = {
    userId,
    readAt: null,
    ...(type && { type: type as any }),
  };

  const result = await prisma.notification.updateMany({
    where: whereInput,
    data: { readAt: new Date() },
  });

  return result;
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized");
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });
};

/**
 * Get notification preferences
 */
const getNotificationPreferences = async (_userId: string) => {
  // In a real app, you'd store these in a separate table
  // For now, return defaults
  return {
    emailNotifications: {
      ticketPurchase: true,
      eventReminders: true,
      eventUpdates: true,
      paymentUpdates: true,
      marketing: false,
    },
    inAppNotifications: {
      ticketPurchase: true,
      eventReminders: true,
      eventUpdates: true,
      paymentUpdates: true,
    },
    smsNotifications: {
      eventReminders: false,
      urgentUpdates: false,
    },
    reminderTiming: {
      oneDayBefore: true,
      oneHourBefore: true,
      atEventTime: false,
    },
  };
};

/**
 * Update notification preferences
 */
const updateNotificationPreferences = async (userId: string, preferences: Partial<INotificationPreferences>) => {
  // In production, store in database
  logger.info(`Notification preferences updated for user ${userId}`);
  return preferences;
};

export const NotificationService = {
  createNotification,
  sendTicketConfirmation,
  scheduleEventReminders,
  sendEventCancellationNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
};
