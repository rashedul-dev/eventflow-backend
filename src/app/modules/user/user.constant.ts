export const userRoles = ["SUPER_ADMIN", "ADMIN", "ORGANIZER", "ATTENDEE"] as const

export const userStatuses = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  DELETED: "deleted",
} as const

export const userSearchableFields = ["email", "firstName", "lastName", "phone", "organizationName"]

export const userFilterableFields = ["searchTerm", "role", "isActive", "isEmailVerified", "isPhoneVerified"]

export const userSelectFields = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  role: true,
  isActive: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  organizationName: true,
  organizationDesc: true,
  website: true,
  socialLinks: true,
  createdAt: true,
  updatedAt: true,
}

export const organizerSelectFields = {
  ...userSelectFields,
  _count: {
    select: {
      organizedEvents: true,
    },
  },
}
