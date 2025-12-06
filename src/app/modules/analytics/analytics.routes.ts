// ============================================================================
// FILE: backend/src/app/modules/analytics/analytics.routes.ts
// ============================================================================

import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserRole } from "@prisma/client";
import { analyticsQuerySchema } from "./analytics.validation";

const router = Router();

// Admin analytics - MATCHES FRONTEND: GET /analytics/admin/overview
router.get(
  "/admin/overview",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(analyticsQuerySchema),
  AnalyticsController.getAdminOverview
);

// Organizer analytics - MATCHES FRONTEND: GET /analytics/organizer/overview
router.get(
  "/organizer/overview",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(analyticsQuerySchema),
  AnalyticsController.getOrganizerOverview
);

// Event-specific analytics - MATCHES FRONTEND: GET /analytics/organizer/events/:eventId
router.get(
  "/organizer/events/:eventId",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AnalyticsController.getEventAnalytics
);

// Commission reports - MATCHES FRONTEND: GET /analytics/commission-reports
router.get(
  "/commission-reports",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AnalyticsController.getCommissionReports
);

export default router;