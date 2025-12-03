import type { Request, Response } from "express"
import httpStatus from "http-status"
import catchAsync from "../../shared/catchAsync"
import sendResponse from "../../shared/sendResponse"
import pick from "../../shared/pick"
import { UserService } from "./user.service"
import { userFilterableFields } from "./user.constant"
import { paginationFields } from "../../helpers/paginationHelper"

// Get own profile
const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string
  const result = await UserService.getProfile(userId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  })
})

// Update own profile
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string
  const result = await UserService.updateProfile(userId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  })
})

// Create organizer profile (upgrade to organizer)
const createOrganizerProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string
  const result = await UserService.createOrganizerProfile(userId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Organizer profile created successfully",
    data: result,
  })
})

// Update organizer profile
const updateOrganizerProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string
  const result = await UserService.updateOrganizerProfile(userId, req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organizer profile updated successfully",
    data: result,
  })
})

// Delete own account
const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string
  const { password } = req.body

  await UserService.deleteAccount(userId, password)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account deleted successfully",
    data: null,
  })
})

// Get all users (admin only)
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields)
  const paginationOptions = pick(req.query, paginationFields)
  const result = await UserService.getAllUsers(filters, paginationOptions)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  })
})

// Get user by ID (admin only)
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await UserService.getUserById(id)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieved successfully",
    data: result,
  })
})

// Update user role (admin only)
const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { role } = req.body
  const result = await UserService.updateUserRole(id, role)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User role updated successfully",
    data: result,
  })
})

// Update user status (admin only)
const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { isActive } = req.body
  const result = await UserService.updateUserStatus(id, isActive)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User status updated successfully",
    data: result,
  })
})

// Get all organizers (public)
const getAllOrganizers = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields)
  const result = await UserService.getAllOrganizers(paginationOptions)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organizers retrieved successfully",
    meta: result.meta,
    data: result.data,
  })
})

// Get organizer by ID (public)
const getOrganizerById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await UserService.getOrganizerById(id)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organizer retrieved successfully",
    data: result,
  })
})

export const UserController = {
  getProfile,
  updateProfile,
  createOrganizerProfile,
  updateOrganizerProfile,
  deleteAccount,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  getAllOrganizers,
  getOrganizerById,
}
