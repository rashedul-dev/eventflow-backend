// ============================================================================
// FILE: backend/src/app/modules/admin/admin.routes.ts
// ============================================================================

import { Router } from "express";
import { AdminController } from "./admin.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserRole } from "@prisma/client";
import {
  eventVerificationSchema,
  userManagementSchema,
  analyticsQuerySchema,
  commissionReportSchema,
  adminQuerySchema,
} from "./admin.validation";

const router = Router();

// All admin routes require ADMIN or SUPER_ADMIN role
const adminAuth = () => auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// ============================================================================
// EVENT VERIFICATION ROUTES
// ============================================================================

// Get pending events for verification
router.get("/events/pending", adminAuth(), AdminController.getPendingEvents);

// Verify/Reject event
router.post("/events/:id/verify", adminAuth(), validateRequest(eventVerificationSchema), AdminController.verifyEvent);

// Get event verification statistics
router.get("/events/verification-stats", adminAuth(), AdminController.getEventVerificationStats);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

// Get all users with filters
router.get("/users", adminAuth(), validateRequest(adminQuerySchema), AdminController.getAllUsers);

// Manage user (suspend, activate, verify, etc.)
router.post("/users/:id/manage", adminAuth(), validateRequest(userManagementSchema), AdminController.manageUser);

// Get user statistics
router.get("/users/statistics", adminAuth(), AdminController.getUserStatistics);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

// Get platform analytics
router.get("/analytics", adminAuth(), validateRequest(analyticsQuerySchema), AdminController.getPlatformAnalytics);

// ============================================================================
// COMMISSION REPORT ROUTES
// ============================================================================

// Get commission reports
router.get(
  "/reports/commission",
  adminAuth(),
  validateRequest(commissionReportSchema),
  AdminController.getCommissionReport
);

export default router;
