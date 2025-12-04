import httpStatus from "http-status"
import { EventStatus, UserRole, WaitlistStatus, SeatStatus, type Prisma } from "@prisma/client"
import prisma from "../../../shared/prisma"
import ApiError from "../../errors/ApiError"
import { calculatePagination, createPaginatedResponse, type IPaginationOptions } from "../../helpers/paginationHelper"
import { logger } from "../../../utils/logger"

// ============================================================================
// SEATING CHART MANAGEMENT
// ============================================================================

interface ICreateSeatingChart {
  name: string
  description?: string
  chartData: object
  width?: number
  height?: number
  sections: Array<{
    name: string
    description?: string
    color?: string
    capacity: number
    priceMultiplier?: number
    positionData?: object
    rows: Array<{
      rowLabel: string
      seats: number
      startNumber?: number
      isAccessible?: boolean
    }>
  }>
}

const createSeatingChart = async (eventId: string, organizerId: string, payload: ICreateSeatingChart) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { seatingChart: true },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage this event")
  }

  if (event.seatingChart) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event already has a seating chart")
  }

  // Calculate total seats
  let totalSeats = 0
  payload.sections.forEach((section) => {
    section.rows.forEach((row) => {
      totalSeats += row.seats
    })
  })

  // Create seating chart with sections and seats in a transaction
  const seatingChart = await prisma.$transaction(async (tx) => {
    const chart = await tx.seatingChart.create({
      data: {
        eventId,
        name: payload.name,
        description: payload.description,
        chartData: payload.chartData as Prisma.JsonObject,
        totalSeats,
        availableSeats: totalSeats,
        width: payload.width,
        height: payload.height,
      },
    })

    // Create sections and seats
    for (let sectionIndex = 0; sectionIndex < payload.sections.length; sectionIndex++) {
      const sectionData = payload.sections[sectionIndex]

      const section = await tx.seatingSection.create({
        data: {
          chartId: chart.id,
          name: sectionData.name,
          description: sectionData.description,
          color: sectionData.color,
          capacity: sectionData.capacity,
          priceMultiplier: sectionData.priceMultiplier || 1,
          positionData: sectionData.positionData as Prisma.JsonObject,
          sortOrder: sectionIndex,
        },
      })

      // Create seats for each row
      const seatCreateData: Prisma.SeatCreateManyInput[] = []

      for (const rowData of sectionData.rows) {
        const startNum = rowData.startNumber || 1

        for (let i = 0; i < rowData.seats; i++) {
          const seatNumber = String(startNum + i)
          seatCreateData.push({
            sectionId: section.id,
            row: rowData.rowLabel,
            number: seatNumber,
            label: `${rowData.rowLabel}${seatNumber}`,
            isAccessible: rowData.isAccessible || false,
          })
        }
      }

      await tx.seat.createMany({ data: seatCreateData })
    }

    return chart
  })

  logger.info(`Seating chart created for event ${eventId}`)
  return seatingChart
}

const getSeatingChart = async (eventId: string) => {
  const seatingChart = await prisma.seatingChart.findUnique({
    where: { eventId },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          seats: {
            orderBy: [{ row: "asc" }, { number: "asc" }],
          },
        },
      },
    },
  })

  if (!seatingChart) {
    throw new ApiError(httpStatus.NOT_FOUND, "Seating chart not found")
  }

  return seatingChart
}

const updateSeatStatus = async (eventId: string, seatIds: string[], status: SeatStatus, organizerId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { seatingChart: true },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage this event")
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update seats
    const updated = await tx.seat.updateMany({
      where: {
        id: { in: seatIds },
        section: {
          chart: { eventId },
        },
      },
      data: { status },
    })

    // Recalculate available seats
    const availableSeats = await tx.seat.count({
      where: {
        section: {
          chart: { eventId },
        },
        status: SeatStatus.AVAILABLE,
      },
    })

    await tx.seatingChart.update({
      where: { eventId },
      data: { availableSeats },
    })

    return updated
  })

  logger.info(`Updated ${result.count} seats for event ${eventId}`)
  return result
}

const getAvailableSeats = async (eventId: string, sectionId?: string) => {
  const whereCondition: Prisma.SeatWhereInput = {
    section: {
      chart: { eventId },
      ...(sectionId && { id: sectionId }),
    },
    status: SeatStatus.AVAILABLE,
  }

  const seats = await prisma.seat.findMany({
    where: whereCondition,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          color: true,
          priceMultiplier: true,
        },
      },
    },
    orderBy: [{ section: { sortOrder: "asc" } }, { row: "asc" }, { number: "asc" }],
  })

  return seats
}

// ============================================================================
// WAITLIST FUNCTIONALITY
// ============================================================================

interface IJoinWaitlist {
  email: string
  name?: string
  phone?: string
  ticketTypeId?: string
  quantity?: number
  notes?: string
}

const joinWaitlist = async (eventId: string, userId: string | null, payload: IJoinWaitlist) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  // Check if already on waitlist
  const existingEntry = await prisma.waitlistEntry.findUnique({
    where: {
      eventId_email: {
        eventId,
        email: payload.email.toLowerCase(),
      },
    },
  })

  if (existingEntry) {
    throw new ApiError(httpStatus.CONFLICT, "Already on the waitlist for this event")
  }

  // Get current position
  const lastPosition = await prisma.waitlistEntry.findFirst({
    where: { eventId },
    orderBy: { position: "desc" },
    select: { position: true },
  })

  const entry = await prisma.waitlistEntry.create({
    data: {
      eventId,
      userId,
      email: payload.email.toLowerCase(),
      name: payload.name,
      phone: payload.phone,
      ticketTypeId: payload.ticketTypeId,
      quantity: payload.quantity || 1,
      notes: payload.notes,
      position: (lastPosition?.position || 0) + 1,
    },
  })

  logger.info(`Waitlist entry created for event ${eventId}: ${payload.email}`)
  return entry
}

const getWaitlist = async (
  eventId: string,
  organizerId: string,
  paginationOptions: IPaginationOptions,
  status?: WaitlistStatus,
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view waitlist")
  }

  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions)

  const whereInput: Prisma.WaitlistEntryWhereInput = {
    eventId,
    ...(status && { status }),
  }

  const [entries, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { position: "asc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.waitlistEntry.count({ where: whereInput }),
  ])

  return createPaginatedResponse(entries, total, { page, limit, skip, sortBy, sortOrder })
}

const notifyWaitlistEntries = async (eventId: string, organizerId: string, entryIds: string[], expiryHours = 24) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage waitlist")
  }

  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

  const result = await prisma.waitlistEntry.updateMany({
    where: {
      id: { in: entryIds },
      eventId,
      status: WaitlistStatus.WAITING,
    },
    data: {
      status: WaitlistStatus.NOTIFIED,
      notifiedAt: new Date(),
      expiresAt,
    },
  })

  // TODO: Send notification emails to the entries

  logger.info(`Notified ${result.count} waitlist entries for event ${eventId}`)
  return result
}

const removeFromWaitlist = async (eventId: string, entryId: string, userId: string, userRole: UserRole) => {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: { event: true },
  })

  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Waitlist entry not found")
  }

  // Check authorization
  const isOwner = entry.userId === userId
  const isOrganizer = entry.event.organizerId === userId
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN

  if (!isOwner && !isOrganizer && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to remove this entry")
  }

  await prisma.waitlistEntry.delete({
    where: { id: entryId },
  })

  logger.info(`Waitlist entry ${entryId} removed from event ${eventId}`)
}

// ============================================================================
// EVENT ANALYTICS
// ============================================================================

const getEventAnalytics = async (eventId: string, organizerId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view analytics")
  }

  const [ticketStats, revenueStats, ticketTypeBreakdown, dailySales, waitlistCount, checkinStats] = await Promise.all([
    // Ticket statistics
    prisma.ticket.groupBy({
      by: ["status"],
      where: { eventId },
      _count: true,
    }),

    // Revenue statistics
    prisma.payment.aggregate({
      where: {
        tickets: { some: { eventId } },
        status: "COMPLETED",
      },
      _sum: {
        totalAmount: true,
        platformCommission: true,
        organizerPayout: true,
      },
      _count: true,
    }),

    // Ticket type breakdown
    prisma.ticketType.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        quantity: true,
        quantitySold: true,
        _count: {
          select: { tickets: true },
        },
      },
    }),

    // Daily sales (last 30 days)
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as tickets_sold,
        SUM(price_paid) as revenue
      FROM tickets
      WHERE event_id = ${eventId}
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,

    // Waitlist count
    prisma.waitlistEntry.count({
      where: { eventId, status: WaitlistStatus.WAITING },
    }),

    // Check-in statistics
    prisma.ticket.aggregate({
      where: {
        eventId,
        status: "ACTIVE",
      },
      _count: {
        checkedInAt: true,
        _all: true,
      },
    }),
  ])

  return {
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      startDate: event.startDate,
      capacity: event.capacity,
    },
    tickets: {
      byStatus: ticketStats,
      total: ticketStats.reduce((sum, s) => sum + s._count, 0),
    },
    revenue: {
      totalRevenue: revenueStats._sum.totalAmount || 0,
      platformCommission: revenueStats._sum.platformCommission || 0,
      organizerPayout: revenueStats._sum.organizerPayout || 0,
      orderCount: revenueStats._count,
    },
    ticketTypes: ticketTypeBreakdown.map((tt) => ({
      ...tt,
      soldPercentage: tt.quantity > 0 ? Math.round((tt.quantitySold / tt.quantity) * 100) : 0,
    })),
    dailySales,
    waitlist: {
      waiting: waitlistCount,
    },
    checkins: {
      checkedIn: checkinStats._count.checkedInAt,
      total: checkinStats._count._all,
      percentage:
        checkinStats._count._all > 0
          ? Math.round((checkinStats._count.checkedInAt / checkinStats._count._all) * 100)
          : 0,
    },
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

const bulkUpdateEventStatus = async (eventIds: string[], status: EventStatus, adminId: string) => {
  const result = await prisma.event.updateMany({
    where: {
      id: { in: eventIds },
      status: { not: EventStatus.CANCELLED },
    },
    data: {
      status,
      ...(status === EventStatus.APPROVED && {
        approvedAt: new Date(),
        approvedBy: adminId,
        publishedAt: new Date(),
      }),
    },
  })

  logger.info(`Bulk updated ${result.count} events to status ${status}`)
  return result
}

const bulkCancelEvents = async (eventIds: string[], organizerId: string, userRole: UserRole) => {
  // Verify ownership for non-admins
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, organizerId: true },
    })

    const unauthorized = events.filter((e) => e.organizerId !== organizerId)
    if (unauthorized.length > 0) {
      throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to cancel some events")
    }
  }

  const result = await prisma.event.updateMany({
    where: {
      id: { in: eventIds },
      status: { not: EventStatus.CANCELLED },
    },
    data: { status: EventStatus.CANCELLED },
  })

  // TODO: Trigger refund process for all tickets

  logger.info(`Bulk cancelled ${result.count} events`)
  return result
}

// ============================================================================
// EVENT CLONING
// ============================================================================

const cloneEvent = async (
  eventId: string,
  organizerId: string,
  overrides?: Partial<{
    title: string
    startDate: string
    endDate: string
  }>,
) => {
  const sourceEvent = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTypes: true,
      seatingChart: {
        include: {
          sections: {
            include: { seats: true },
          },
        },
      },
    },
  })

  if (!sourceEvent) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  if (sourceEvent.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to clone this event")
  }

  // Generate new slug
  const baseTitle = overrides?.title || `${sourceEvent.title} (Copy)`
  const baseSlug = baseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

  let slug = baseSlug
  let counter = 1
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Clone event with ticket types
  const clonedEvent = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        title: baseTitle,
        slug,
        description: sourceEvent.description,
        shortDescription: sourceEvent.shortDescription,
        startDate: overrides?.startDate ? new Date(overrides.startDate) : sourceEvent.startDate,
        endDate: overrides?.endDate ? new Date(overrides.endDate) : sourceEvent.endDate,
        timezone: sourceEvent.timezone,
        isVirtual: sourceEvent.isVirtual,
        venueName: sourceEvent.venueName,
        venueAddress: sourceEvent.venueAddress,
        city: sourceEvent.city,
        state: sourceEvent.state,
        country: sourceEvent.country,
        postalCode: sourceEvent.postalCode,
        latitude: sourceEvent.latitude,
        longitude: sourceEvent.longitude,
        virtualLink: sourceEvent.virtualLink,
        virtualPlatform: sourceEvent.virtualPlatform,
        coverImage: sourceEvent.coverImage,
        thumbnailImage: sourceEvent.thumbnailImage,
        images: sourceEvent.images as Prisma.JsonArray,
        capacity: sourceEvent.capacity,
        isPrivate: sourceEvent.isPrivate,
        requiresApproval: sourceEvent.requiresApproval,
        ageRestriction: sourceEvent.ageRestriction,
        status: EventStatus.DRAFT,
        category: sourceEvent.category,
        tags: sourceEvent.tags as Prisma.JsonArray,
        metaTitle: sourceEvent.metaTitle,
        metaDescription: sourceEvent.metaDescription,
        organizerId,
      },
    })

    // Clone ticket types
    if (sourceEvent.ticketTypes.length > 0) {
      await tx.ticketType.createMany({
        data: sourceEvent.ticketTypes.map((tt) => ({
          eventId: newEvent.id,
          name: tt.name,
          description: tt.description,
          category: tt.category,
          price: tt.price,
          originalPrice: tt.originalPrice,
          currency: tt.currency,
          quantity: tt.quantity,
          quantitySold: 0,
          maxPerOrder: tt.maxPerOrder,
          minPerOrder: tt.minPerOrder,
          salesStartDate: tt.salesStartDate,
          salesEndDate: tt.salesEndDate,
          isVisible: tt.isVisible,
          isTransferable: tt.isTransferable,
          hasSeating: tt.hasSeating,
          sortOrder: tt.sortOrder,
        })),
      })
    }

    return newEvent
  })

  logger.info(`Event cloned: ${eventId} -> ${clonedEvent.id}`)
  return clonedEvent
}

// ============================================================================
// CAPACITY MANAGEMENT
// ============================================================================

const getCapacityStatus = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTypes: {
        select: {
          id: true,
          name: true,
          quantity: true,
          quantitySold: true,
        },
      },
      _count: {
        select: {
          tickets: {
            where: { status: "ACTIVE" },
          },
          waitlistEntries: {
            where: { status: WaitlistStatus.WAITING },
          },
        },
      },
    },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  const totalTicketCapacity = event.ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0)
  const totalSold = event.ticketTypes.reduce((sum, tt) => sum + tt.quantitySold, 0)

  return {
    event: {
      id: event.id,
      title: event.title,
      capacity: event.capacity,
    },
    tickets: {
      totalCapacity: totalTicketCapacity,
      sold: totalSold,
      available: totalTicketCapacity - totalSold,
      utilizationPercentage: totalTicketCapacity > 0 ? Math.round((totalSold / totalTicketCapacity) * 100) : 0,
    },
    activeTickets: event._count.tickets,
    waitlistCount: event._count.waitlistEntries,
    ticketTypeBreakdown: event.ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      capacity: tt.quantity,
      sold: tt.quantitySold,
      available: tt.quantity - tt.quantitySold,
      utilizationPercentage: tt.quantity > 0 ? Math.round((tt.quantitySold / tt.quantity) * 100) : 0,
    })),
  }
}

const updateCapacity = async (
  eventId: string,
  organizerId: string,
  updates: Array<{ ticketTypeId: string; quantity: number }>,
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: true },
  })

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found")
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to update capacity")
  }

  // Validate updates
  for (const update of updates) {
    const ticketType = event.ticketTypes.find((tt) => tt.id === update.ticketTypeId)
    if (!ticketType) {
      throw new ApiError(httpStatus.NOT_FOUND, `Ticket type ${update.ticketTypeId} not found`)
    }
    if (update.quantity < ticketType.quantitySold) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Cannot reduce capacity below sold quantity for ${ticketType.name}`)
    }
  }

  // Update capacities
  await prisma.$transaction(
    updates.map((update) =>
      prisma.ticketType.update({
        where: { id: update.ticketTypeId },
        data: { quantity: update.quantity },
      }),
    ),
  )

  logger.info(`Capacity updated for event ${eventId}`)
  return getCapacityStatus(eventId)
}

export const EventAdvancedService = {
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
  // Bulk operations
  bulkUpdateEventStatus,
  bulkCancelEvents,
  // Cloning
  cloneEvent,
  // Capacity
  getCapacityStatus,
  updateCapacity,
}
