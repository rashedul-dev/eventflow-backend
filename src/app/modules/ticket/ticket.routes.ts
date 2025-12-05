import { Router } from "express";
import { TicketController } from "./ticket.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserRole } from "@prisma/client";
import {
  purchaseTicketSchema,
  transferTicketSchema,
  validateTicketSchema,
  checkInTicketSchema,
  ticketQuerySchema,
  cancelTicketSchema,
  bulkCheckInSchema,
} from "./ticket.validation";

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Validate ticket (for scanning at check-in)
router.post("/validate", validateRequest(validateTicketSchema), TicketController.validateTicket);

// ============================================================================
// AUTHENTICATED USER ROUTES
// ============================================================================

// Get my tickets
router.get("/my-tickets", auth(), validateRequest(ticketQuerySchema), TicketController.getMyTickets);

// Purchase tickets
router.post("/purchase", auth(), validateRequest(purchaseTicketSchema), TicketController.purchaseTickets);

// Get ticket by ID
router.get("/:id", auth(), TicketController.getTicketById);

// Transfer ticket
router.post("/:id/transfer", auth(), validateRequest(transferTicketSchema), TicketController.transferTicket);

// Cancel ticket
router.post("/:id/cancel", auth(), validateRequest(cancelTicketSchema), TicketController.cancelTicket);

// Download calendar file (.ics)
router.get("/:id/calendar", auth(), TicketController.downloadCalendar);

// Download ticket PDF
router.get("/:id/download", auth(), TicketController.downloadTicket);

// ============================================================================
// ORGANIZER ROUTES
// ============================================================================

// Get all tickets for an event
router.get(
  "/event/:eventId",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(ticketQuerySchema),
  TicketController.getEventTickets
);

// Check in ticket for event
router.post(
  "/event/:eventId/check-in",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(checkInTicketSchema),
  TicketController.checkInTicket
);

// Bulk check-in
router.post(
  "/event/:eventId/bulk-check-in",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(bulkCheckInSchema),
  TicketController.bulkCheckIn
);

export default router;
