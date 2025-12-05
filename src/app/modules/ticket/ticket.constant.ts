export const ticketStatuses = ["ACTIVE", "USED", "CANCELLED", "EXPIRED", "TRANSFERRED"] as const

export const ticketTypeCategories = ["FREE", "PAID", "DONATION"] as const

export const ticketSearchableFields = ["ticketNumber", "attendeeName", "attendeeEmail"]

export const ticketFilterableFields = ["searchTerm", "status", "eventId", "ticketTypeId", "userId", "checkedIn"]

export const ticketSelectFields = {
  id: true,
  ticketNumber: true,
  status: true,
  qrCode: true,
  attendeeName: true,
  attendeeEmail: true,
  attendeePhone: true,
  pricePaid: true,
  currency: true,
  checkedInAt: true,
  checkedInBy: true,
  transferredAt: true,
  createdAt: true,
  updatedAt: true,
}

export const ticketListSelectFields = {
  ...ticketSelectFields,
  ticketType: {
    select: {
      id: true,
      name: true,
      category: true,
    },
  },
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      startDate: true,
      venueName: true,
      city: true,
      isVirtual: true,
    },
  },
}
