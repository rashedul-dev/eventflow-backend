import type { Request, Response } from "express"
import httpStatus from "http-status"
import type { UserRole } from "@prisma/client"
import catchAsync from "../../shared/catchAsync"
import sendResponse from "../../shared/sendResponse"
import pick from "../../shared/pick"
import { EventAdvancedService } from "./event.advanced.service"
import { paginationFields } from "../../helpers/paginationHelper"

// ============================================================================
// SEATING CHART CONTROLLERS
// ============================================================================

const createSeatingChart = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const organizerId = req.user?.userId as string
  const result = await EventAdvancedService.createSeatingChart(eventId, organizerId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Seating chart created successfully",
    data: result,
  })
})

const getSeatingChart = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const result = await EventAdvancedService.getSeatingChart(eventId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Seating chart retrieved successfully",
    data: result,
  })
})

const updateSeatStatus = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const { seatIds, status } = req.body
  const organizerId = req.user?.userId as string
  const result = await EventAdvancedService.updateSeatStatus(eventId, seatIds, status, organizerId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Seat status updated successfully",
    data: result,
  })
})

const getAvailableSeats = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const { sectionId } = req.query
  const result = await EventAdvancedService.getAvailableSeats(eventId, sectionId as string)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Available seats retrieved successfully",
    data: result,
  })
})

// ============================================================================
// WAITLIST CONTROLLERS
// ============================================================================

const joinWaitlist = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const userId = req.user?.userId || null
  const result = await EventAdvancedService.joinWaitlist(eventId, userId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Successfully joined the waitlist",
    data: result,
  })
})

const getWaitlist = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const organizerId = req.user?.userId as string
  const paginationOptions = pick(req.query, paginationFields)
  const status = req.query.status as string | undefined
  const result = await EventAdvancedService.getWaitlist(eventId, organizerId, paginationOptions, status as any)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Waitlist retrieved successfully",
    meta: result.meta,
    data: result.data,
  })
})

const notifyWaitlistEntries = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const { entryIds, expiryHours } = req.body
  const organizerId = req.user?.userId as string
  const result = await EventAdvancedService.notifyWaitlistEntries(eventId, organizerId, entryIds, expiryHours)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Waitlist entries notified successfully",
    data: result,
  })
})

const removeFromWaitlist = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId, entryId } = req.params
  const userId = req.user?.userId as string
  const userRole = req.user?.role as UserRole
  await EventAdvancedService.removeFromWaitlist(eventId, entryId, userId, userRole)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Removed from waitlist successfully",
    data: null,
  })
})

// ============================================================================
// ANALYTICS CONTROLLER
// ============================================================================

const getEventAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const organizerId = req.user?.userId as string
  const result = await EventAdvancedService.getEventAnalytics(eventId, organizerId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event analytics retrieved successfully",
    data: result,
  })
})

// ============================================================================
// BULK OPERATIONS CONTROLLERS
// ============================================================================

const bulkUpdateStatus = catchAsync(async (req: Request, res: Response) => {
  const { eventIds, status } = req.body
  const adminId = req.user?.userId as string
  const result = await EventAdvancedService.bulkUpdateEventStatus(eventIds, status, adminId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Bulk updated ${result.count} events`,
    data: result,
  })
})

const bulkCancel = catchAsync(async (req: Request, res: Response) => {
  const { eventIds } = req.body
  const organizerId = req.user?.userId as string
  const userRole = req.user?.role as UserRole
  const result = await EventAdvancedService.bulkCancelEvents(eventIds, organizerId, userRole)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Cancelled ${result.count} events`,
    data: result,
  })
})

// ============================================================================
// CLONE CONTROLLER
// ============================================================================

const cloneEvent = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const organizerId = req.user?.userId as string
  const result = await EventAdvancedService.cloneEvent(eventId, organizerId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Event cloned successfully",
    data: result,
  })
})

// ============================================================================
// CAPACITY CONTROLLERS
// ============================================================================

const getCapacityStatus = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const result = await EventAdvancedService.getCapacityStatus(eventId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Capacity status retrieved successfully",
    data: result,
  })
})

const updateCapacity = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params
  const organizerId = req.user?.userId as string
  const result = await EventAdvancedService.updateCapacity(eventId, organizerId, req.body.updates)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Capacity updated successfully",
    data: result,
  })
})

export const EventAdvancedController = {
  // Seating
  createSeatingChart,
  getSeatingChart,
  updateSeatStatus,
  getAvailableSeats,
  // Waitlist
  joinWaitlist,
  getWaitlist,
  notifyWaitlistEntries,
  removeFromWaitlist,
  // Analytics
  getEventAnalytics,
  // Bulk
  bulkUpdateStatus,
  bulkCancel,
  // Clone
  cloneEvent,
  // Capacity
  getCapacityStatus,
  updateCapacity,
}
