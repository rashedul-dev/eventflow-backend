import { z } from "zod"
import { UserRole } from "@prisma/client"

const socialLinksSchema = z
  .object({
    facebook: z.string().url().optional(),
    twitter: z.string().url().optional(),
    instagram: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    youtube: z.string().url().optional(),
  })
  .optional()

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().min(10).max(20).optional(),
    avatar: z.string().url().optional(),
  }),
})

export const updateOrganizerProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().min(10).max(20).optional(),
    avatar: z.string().url().optional(),
    organizationName: z.string().min(1).max(200).optional(),
    organizationDesc: z.string().max(2000).optional(),
    website: z.string().url().optional(),
    socialLinks: socialLinksSchema,
  }),
})

export const createOrganizerProfileSchema = z.object({
  body: z.object({
    organizationName: z.string().min(1).max(200),
    organizationDesc: z.string().max(2000).optional(),
    website: z.string().url().optional(),
    socialLinks: socialLinksSchema,
  }),
})

export const getUsersQuerySchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    isEmailVerified: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    page: z
      .string()
      .transform((val) => Number.parseInt(val, 10))
      .optional(),
    limit: z
      .string()
      .transform((val) => Number.parseInt(val, 10))
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
})

export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(UserRole),
  }),
})

export const updateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
})

export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, "Password is required to delete account"),
    confirmation: z.literal("DELETE MY ACCOUNT"),
  }),
})
