// ============================================================================
// FILE: backend/src/app/modules/notification/notification.routes.ts
// ============================================================================

import { Router } from "express";
import { NotificationController } from "./notification.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import {
  markAsReadSchema,
  markAllAsReadSchema,
  notificationPreferencesSchema,
  notificationQuerySchema,
} from "./notification.validation";

const router = Router();

router.get("/", auth(), validateRequest(notificationQuerySchema), NotificationController.getUserNotifications);
router.post("/:id/read", auth(), validateRequest(markAsReadSchema), NotificationController.markAsRead);
router.post("/read-all", auth(), validateRequest(markAllAsReadSchema), NotificationController.markAllAsRead);
router.delete("/:id", auth(), NotificationController.deleteNotification);
router.get("/preferences", auth(), NotificationController.getNotificationPreferences);
router.put(
  "/preferences",
  auth(),
  validateRequest(notificationPreferencesSchema),
  NotificationController.updateNotificationPreferences
);

export default router;


