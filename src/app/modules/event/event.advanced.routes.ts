import { Router } from "express"
import { EventAdvancedController } from "./event.advanced.controller"
import auth from "../../middlewares/auth"
import validateRequest from "../../middlewares/validateRequest"
import { UserRole } from "@prisma/client"
import {
  createSeatingChartSchema,
  updateSeatStatusSchema,
  joinWaitlistSchema,
  notifyWaitlistSchema,
  bulkUpdateStatusSchema,
  bulkCancelSchema,
  cloneEventSchema,
  updateCapacitySchema,
  waitlistQuerySchema,
} from "./event.advanced.validation"

const router = Router()

// ============================================================================
// SEATING CHART ROUTES
// ============================================================================

// Create seating chart for event
router.post(
  "/:id/seating-chart",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(createSeatingChartSchema),
  EventAdvancedController.createSeatingChart,
)

// Get seating chart (public)
router.get("/:id/seating-chart", EventAdvancedController.getSeatingChart)

// Update seat status (block/unblock seats)
router.patch(
  "/:id/seating-chart/seats",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(updateSeatStatusSchema),
  EventAdvancedController.updateSeatStatus,
)

// Get available seats (public)
router.get("/:id/seats/available", EventAdvancedController.getAvailableSeats)

// ============================================================================
// WAITLIST ROUTES
// ============================================================================

// Join waitlist (public/authenticated)
router.post("/:id/waitlist", validateRequest(joinWaitlistSchema), EventAdvancedController.joinWaitlist)

// Get waitlist (organizer only)
router.get(
  "/:id/waitlist",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(waitlistQuerySchema),
  EventAdvancedController.getWaitlist,
)

// Notify waitlist entries (organizer only)
router.post(
  "/:id/waitlist/notify",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(notifyWaitlistSchema),
  EventAdvancedController.notifyWaitlistEntries,
)

// Remove from waitlist
router.delete("/:id/waitlist/:entryId", auth(), EventAdvancedController.removeFromWaitlist)

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

router.get(
  "/:id/analytics",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  EventAdvancedController.getEventAnalytics,
)

// ============================================================================
// BULK OPERATIONS (Admin only)
// ============================================================================

router.post(
  "/bulk/status",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(bulkUpdateStatusSchema),
  EventAdvancedController.bulkUpdateStatus,
)

router.post(
  "/bulk/cancel",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(bulkCancelSchema),
  EventAdvancedController.bulkCancel,
)

// ============================================================================
// CLONE EVENT
// ============================================================================

router.post(
  "/:id/clone",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(cloneEventSchema),
  EventAdvancedController.cloneEvent,
)

// ============================================================================
// CAPACITY MANAGEMENT
// ============================================================================

router.get(
  "/:id/capacity",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  EventAdvancedController.getCapacityStatus,
)

router.patch(
  "/:id/capacity",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(updateCapacitySchema),
  EventAdvancedController.updateCapacity,
)

export default router
