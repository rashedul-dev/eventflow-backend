import httpStatus from "http-status"
import bcrypt from "bcryptjs"
import { UserRole, type Prisma } from "@prisma/client"
import prisma from "../../../shared/prisma"
import ApiError from "../../errors/ApiError"
import { calculatePagination, createPaginatedResponse, type IPaginationOptions } from "../../helpers/paginationHelper"
import { userSearchableFields, userSelectFields, organizerSelectFields } from "./user.constant"
import type {
  IUserFilterRequest,
  IUpdateUserProfile,
  IUpdateOrganizerProfile,
  ICreateOrganizerProfile,
} from "./user.interface"
import { logger } from "../../../utils/logger"

// Get user profile by ID
const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelectFields,
      _count: {
        select: {
          organizedEvents: true,
          tickets: true,
        },
      },
    },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  return user
}

// Update user profile
const updateProfile = async (userId: string, payload: IUpdateUserProfile) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: userSelectFields,
  })

  logger.info(`User profile updated: ${userId}`)
  return updatedUser
}

// Create organizer profile (upgrade from attendee)
const createOrganizerProfile = async (userId: string, payload: ICreateOrganizerProfile) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  if (user.role === UserRole.ORGANIZER || user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User is already an organizer or admin")
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      role: UserRole.ORGANIZER,
      organizationName: payload.organizationName,
      organizationDesc: payload.organizationDesc,
      website: payload.website,
      socialLinks: payload.socialLinks as Prisma.JsonObject,
    },
    select: organizerSelectFields,
  })

  logger.info(`User upgraded to organizer: ${userId}`)
  return updatedUser
}

// Update organizer profile
const updateOrganizerProfile = async (userId: string, payload: IUpdateOrganizerProfile) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  if (user.role !== UserRole.ORGANIZER && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only organizers can update organizer profiles")
  }

  const updateData: Prisma.UserUpdateInput = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    avatar: payload.avatar,
    organizationName: payload.organizationName,
    organizationDesc: payload.organizationDesc,
    website: payload.website,
  }

  if (payload.socialLinks) {
    updateData.socialLinks = payload.socialLinks as Prisma.JsonObject
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: organizerSelectFields,
  })

  logger.info(`Organizer profile updated: ${userId}`)
  return updatedUser
}

// Delete account (soft delete or hard delete based on config)
const deleteAccount = async (userId: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, email: true },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid password")
  }

  // Soft delete - deactivate account
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    }),
    // Revoke all refresh tokens
    prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    }),
  ])

  logger.info(`Account deleted (soft): ${user.email}`)
}

// Get all users (admin only)
const getAllUsers = async (filters: IUserFilterRequest, paginationOptions: IPaginationOptions) => {
  const { searchTerm, ...filterData } = filters
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions)

  const whereConditions: Prisma.UserWhereInput[] = []

  // Search term across searchable fields
  if (searchTerm) {
    whereConditions.push({
      OR: userSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as Prisma.QueryMode,
        },
      })),
    })
  }

  // Apply filters
  if (Object.keys(filterData).length > 0) {
    whereConditions.push({
      AND: Object.entries(filterData).map(([key, value]) => ({
        [key]: value,
      })),
    })
  }

  const whereInput: Prisma.UserWhereInput = whereConditions.length > 0 ? { AND: whereConditions } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        ...userSelectFields,
        _count: {
          select: {
            organizedEvents: true,
            tickets: true,
          },
        },
      },
    }),
    prisma.user.count({ where: whereInput }),
  ])

  return createPaginatedResponse(users, total, { page, limit, skip, sortBy, sortOrder })
}

// Get user by ID (admin only)
const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelectFields,
      lastLoginAt: true,
      _count: {
        select: {
          organizedEvents: true,
          tickets: true,
          payments: true,
        },
      },
    },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  return user
}

// Update user role (admin only)
const updateUserRole = async (userId: string, role: UserRole) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  // Prevent changing super admin role
  if (user.role === UserRole.SUPER_ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, "Cannot change super admin role")
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: userSelectFields,
  })

  logger.info(`User role updated: ${userId} -> ${role}`)
  return updatedUser
}

// Update user status (admin only)
const updateUserStatus = async (userId: string, isActive: boolean) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found")
  }

  // Prevent deactivating super admin
  if (user.role === UserRole.SUPER_ADMIN && !isActive) {
    throw new ApiError(httpStatus.FORBIDDEN, "Cannot deactivate super admin")
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: userSelectFields,
  })

  // If deactivating, revoke all refresh tokens
  if (!isActive) {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    })
  }

  logger.info(`User status updated: ${userId} -> ${isActive ? "active" : "inactive"}`)
  return updatedUser
}

// Get all organizers (public)
const getAllOrganizers = async (paginationOptions: IPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions)

  const whereInput: Prisma.UserWhereInput = {
    role: UserRole.ORGANIZER,
    isActive: true,
  }

  const [organizers, total] = await Promise.all([
    prisma.user.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        organizationName: true,
        organizationDesc: true,
        website: true,
        socialLinks: true,
        _count: {
          select: {
            organizedEvents: {
              where: { status: "APPROVED" },
            },
          },
        },
      },
    }),
    prisma.user.count({ where: whereInput }),
  ])

  return createPaginatedResponse(organizers, total, { page, limit, skip, sortBy, sortOrder })
}

// Get organizer by ID (public)
const getOrganizerById = async (organizerId: string) => {
  const organizer = await prisma.user.findFirst({
    where: {
      id: organizerId,
      role: UserRole.ORGANIZER,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      organizationName: true,
      organizationDesc: true,
      website: true,
      socialLinks: true,
      createdAt: true,
      _count: {
        select: {
          organizedEvents: {
            where: { status: "APPROVED" },
          },
        },
      },
      organizedEvents: {
        where: { status: "APPROVED" },
        take: 6,
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          startDate: true,
          city: true,
          isVirtual: true,
        },
      },
    },
  })

  if (!organizer) {
    throw new ApiError(httpStatus.NOT_FOUND, "Organizer not found")
  }

  return organizer
}

export const UserService = {
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
