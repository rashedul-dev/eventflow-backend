import type { Request, Response } from "express"
import httpStatus from "http-status"
import type { UserRole } from "@prisma/client"
import catchAsync from "../../shared/catchAsync"
import sendResponse from "../../shared/sendResponse"
import pick from "../../shared/pick"
import { EventService } from "./event.service"
import { eventFilterableFields } from "./event.constant"
import { paginationFields } from "../../helpers/paginationHelper"

// Create event
const createEvent = catchAsync(async (req: Request, res: Response) => {
  const organizerId = req.user?.userId as string
  const result = await EventService.createEvent(organizerId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Event created successfully",
    data: result,
  })
})

// Get event by ID
const getEventById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await EventService.getEventById(id)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event retrieved successfully",
    data: result,
  })
})

// Get event by slug (public)
const getEventBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params
  const result = await EventService.getEventBySlug(slug)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event retrieved successfully",
    data: result,
  })
})

// Update event
const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const organizerId = req.user?.userId as string
  const userRole = req.user?.role as UserRole
  const result = await EventService.updateEvent(id, organizerId, userRole, req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event updated successfully",
    data: result,
  })
})

// Delete event
const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const organizerId = req.user?.userId as string
  const userRole = req.user?.role as UserRole
  await EventService.deleteEvent(id, organizerId, userRole)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event deleted successfully",
    data: null,
  })
})

// Submit event for approval
const submitForApproval = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const organizerId = req.user?.userId as string
  const result = await EventService.submitForApproval(id, organizerId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event submitted for approval",
    data: result,
  })
})

// Review event (approve/reject)
const reviewEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const adminId = req.user?.userId as string
  const result = await EventService.reviewEvent(id, adminId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Event ${req.body.status.toLowerCase()} successfully`,
    data: result,
  })
})

// Cancel event
const cancelEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const organizerId = req.user?.userId as string
  const userRole = req.user?.role as UserRole
  const result = await EventService.cancelEvent(id, organizerId, userRole)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event cancelled successfully",
    data: result,
  })
})

// Get all events (public with filters)
const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, eventFilterableFields)
  const paginationOptions = pick(req.query, paginationFields)
  const result = await EventService.getAllEvents(filters, paginationOptions)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events retrieved successfully",
    meta: result.meta,
    data: result.data,
  })
})

// Get organizer's events
const getMyEvents = catchAsync(async (req: Request, res: Response) => {
  const organizerId = req.user?.userId as string
  const paginationOptions = pick(req.query, paginationFields)
  const status = req.query.status as string | undefined
  const result = await EventService.getOrganizerEvents(organizerId, paginationOptions, status as any)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events retrieved successfully",
    meta: result.meta,
    data: result.data,
  })
})

// Get pending events (admin only)
const getPendingEvents = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields)
  const result = await EventService.getPendingEvents(paginationOptions)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pending events retrieved successfully",
    meta: result.meta,
    data: result.data,
  })
})

export const EventController = {
  createEvent,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  submitForApproval,
  reviewEvent,
  cancelEvent,
  getAllEvents,
  getMyEvents,
  getPendingEvents,
}
