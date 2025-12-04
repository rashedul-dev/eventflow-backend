import { Router } from "express"
import { EventController } from "./event.controller"
import auth from "../../middlewares/auth"
import validateRequest from "../../middlewares/validateRequest"
import { UserRole } from "@prisma/client"
import {
  createEventSchema,
  updateEventSchema,
  eventApprovalSchema,
  submitForApprovalSchema,
  eventQuerySchema,
} from "./event.validation"
import advancedRoutes from "./event.advanced.routes"

const router = Router()

// ============================================================================
// MOUNT ADVANCED ROUTES
// ============================================================================
router.use("/", advancedRoutes)

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Get all events (public listing with filters)
router.get("/", validateRequest(eventQuerySchema), EventController.getAllEvents)

// Get event by slug (public)
router.get("/slug/:slug", EventController.getEventBySlug)

// ============================================================================
// ORGANIZER ROUTES
// ============================================================================

// Get my events (organizer)
router.get("/my-events", auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN), EventController.getMyEvents)

// Create event
router.post(
  "/",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(createEventSchema),
  EventController.createEvent,
)

// Update event
router.patch(
  "/:id",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(updateEventSchema),
  EventController.updateEvent,
)

// Delete event
router.delete("/:id", auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN), EventController.deleteEvent)

// Submit event for approval
router.post(
  "/:id/submit",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(submitForApprovalSchema),
  EventController.submitForApproval,
)

// Cancel event
router.post("/:id/cancel", auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN), EventController.cancelEvent)

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Get pending events for review
router.get("/admin/pending", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), EventController.getPendingEvents)

// Review event (approve/reject)
router.post(
  "/:id/review",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(eventApprovalSchema),
  EventController.reviewEvent,
)

// ============================================================================
// MUST BE LAST - Get event by ID (authenticated - shows all statuses for organizer)
// ============================================================================

router.get("/:id", EventController.getEventById)

export default router
