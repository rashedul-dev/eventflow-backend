import type { UserRole } from "@prisma/client"

export interface IUserFilterRequest {
  searchTerm?: string
  role?: UserRole
  isActive?: boolean
  isEmailVerified?: boolean
  isPhoneVerified?: boolean
}

export interface IUpdateUserProfile {
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
}

export interface IUpdateOrganizerProfile extends IUpdateUserProfile {
  organizationName?: string
  organizationDesc?: string
  website?: string
  socialLinks?: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
    youtube?: string
  }
}

export interface ICreateOrganizerProfile {
  organizationName: string
  organizationDesc?: string
  website?: string
  socialLinks?: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
    youtube?: string
  }
}

export interface IUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatar: string | null
  role: UserRole
  isActive: boolean
  isEmailVerified: boolean
  isPhoneVerified: boolean
  organizationName: string | null
  organizationDesc: string | null
  website: string | null
  socialLinks: Record<string, string> | null
  createdAt: Date
  updatedAt: Date
}

export interface IUserWithStats extends IUser {
  _count?: {
    organizedEvents?: number
    tickets?: number
  }
}
