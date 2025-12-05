import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { UserRole } from "@prisma/client";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { TicketService } from "./ticket.service";
import { ticketFilterableFields } from "./ticket.constant";
import { paginationFields } from "../../helpers/paginationHelper";

// Purchase tickets
const purchaseTickets = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await TicketService.purchaseTickets(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Tickets purchased successfully",
    data: result,
  });
});

// Get ticket by ID
const getTicketById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId as string;
  const userRole = req.user?.role as UserRole;
  const result = await TicketService.getTicketById(id, userId, userRole);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ticket retrieved successfully",
    data: result,
  });
});

// Validate ticket
const validateTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await TicketService.validateTicket(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.valid ? "Ticket is valid" : result.error,
    data: result,
  });
});

// Check in ticket
const checkInTicket = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const staffUserId = req.user?.userId as string;
  const result = await TicketService.checkInTicket(eventId, req.body, staffUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ticket checked in successfully",
    data: result,
  });
});

// Transfer ticket
const transferTicket = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId as string;
  const result = await TicketService.transferTicket(id, userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ticket transferred successfully",
    data: result,
  });
});

// Cancel ticket
const cancelTicket = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId as string;
  const userRole = req.user?.role as UserRole;
  await TicketService.cancelTicket(id, userId, userRole, req.body?.reason);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ticket cancelled successfully",
    data: null,
  });
});

// Get my tickets
const getMyTickets = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const paginationOptions = pick(req.query, paginationFields);
  const filters = pick(req.query, ticketFilterableFields);
  const result = await TicketService.getUserTickets(userId, paginationOptions, filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tickets retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Get event tickets (organizer)
const getEventTickets = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const organizerId = req.user?.userId as string;
  const paginationOptions = pick(req.query, paginationFields);
  const filters = pick(req.query, ticketFilterableFields);
  const result = await TicketService.getEventTickets(eventId, organizerId, paginationOptions, filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event tickets retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Download calendar file
const downloadCalendar = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId as string;
  const result = await TicketService.generateCalendarFile(id, userId);

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  res.send(result.content);
});

// Bulk check-in
const bulkCheckIn = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { ticketIds } = req.body;
  const staffUserId = req.user?.userId as string;
  const result = await TicketService.bulkCheckIn(eventId, ticketIds, staffUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.checkedIn} tickets checked in successfully`,
    data: result,
  });
});
const downloadTicket = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const requesterId = req.user!.userId; // string
  const buffer = await TicketService.generateTicketPdf(req.params.id, requesterId);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="ticket-${req.params.id}.pdf"`,
  });
  res.send(buffer);
});

export const TicketController = {
  purchaseTickets,
  getTicketById,
  validateTicket,
  checkInTicket,
  transferTicket,
  cancelTicket,
  getMyTickets,
  getEventTickets,
  downloadCalendar,
  bulkCheckIn,
  downloadTicket,
};
