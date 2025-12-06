// ============================================================================
// FILE: backend/src/app/modules/notification/notification.controller.ts
// ============================================================================

import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { NotificationService } from "./notification.service";
import { notificationFilterableFields } from "./notification.constant";
import { paginationFields } from "../../helpers/paginationHelper";

const getUserNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const filters = pick(req.query, notificationFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await NotificationService.getUserNotifications(userId, filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications retrieved successfully",
    meta: result.meta,
    data: { notifications: result.data, unreadCount: result.unreadCount },
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId as string;
  const result = await NotificationService.markAsRead(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const { type } = req.body;
  const result = await NotificationService.markAllAsRead(userId, type);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId as string;
  await NotificationService.deleteNotification(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification deleted",
    data: null,
  });
});

const getNotificationPreferences = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await NotificationService.getNotificationPreferences(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences retrieved",
    data: result,
  });
});

const updateNotificationPreferences = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await NotificationService.updateNotificationPreferences(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences updated",
    data: result,
  });
});

export const NotificationController = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
};
