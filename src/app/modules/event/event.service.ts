import httpStatus from "http-status";
import { EventStatus, UserRole, type Prisma } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { calculatePagination, createPaginatedResponse, type IPaginationOptions } from "../../helpers/paginationHelper";
import { eventSearchableFields, eventSelectFields, eventListSelectFields } from "./event.constant";
import type { IEventFilterRequest, ICreateEvent, IUpdateEvent, IEventApproval } from "./event.interface";
import { logger } from "../../../utils/logger";

// Helper to generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

// Helper to ensure unique slug
const ensureUniqueSlug = async (baseSlug: string, excludeId?: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.event.findFirst({
      where: {
        slug,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });

    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// // Create a new event
// const createEvent = async (organizerId: string, payload: ICreateEvent) => {
//   const baseSlug = generateSlug(payload.title)
//   const slug = await ensureUniqueSlug(baseSlug)

//   const event = await prisma.event.create({
//     data: {
//       ...payload,
//       slug,
//       startDate: new Date(payload.startDate),
//       endDate: new Date(payload.endDate),
//       organizerId,
//       tags: payload.tags as Prisma.JsonArray,
//       images: payload.images as Prisma.JsonArray,
//     },
//     select: eventSelectFields,
//   })

//   logger.info(`Event created: ${event.id} by organizer ${organizerId}`)
//   return event
// }

// Create a new event
const createEvent = async (organizerId: string, payload: ICreateEvent) => {
  const baseSlug = generateSlug(payload.title);
  const slug = await ensureUniqueSlug(baseSlug);

  // Extract ticketTypes from payload to handle separately
  const { ticketTypes, ...eventData } = payload;

  const event = await prisma.event.create({
    data: {
      ...eventData,
      slug,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      organizerId,
      tags: payload.tags as Prisma.JsonArray,
      images: payload.images as Prisma.JsonArray,

      // ✅ Use nested create syntax for ticket types
      ticketTypes:
        ticketTypes && ticketTypes.length > 0
          ? {
              create: ticketTypes.map((ticket) => ({
                name: ticket.name,
                description: ticket.description || undefined, // ✅ Convert empty string to undefined
                category: ticket.category,
                price: ticket.price,
                quantity: ticket.quantity,
                // quantitySold: ticket.quantitySold,
                // quantityAvailable: ticket.quantity || ticket.quantity,
                maxPerOrder: ticket.maxPerOrder || 10, // ✅ Add default
                minPerOrder: ticket.minPerOrder || 1, // ✅ Add default
                sortOrder: ticket.sortOrder || 0, // ✅ Add default
              })),
            }
          : undefined,
    },
    select: {
      ...eventSelectFields,
      // Include ticket types in the response
      ticketTypes: {
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          price: true,
          quantity: true,
          // quantityAvailable: true,
          maxPerOrder: true,
          minPerOrder: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  logger.info(`Event created: ${event.id} by organizer ${organizerId}`);
  return event;
};
// Get event by ID
const getEventById = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organizationName: true,
          organizationDesc: true,
          avatar: true,
          website: true,
          socialLinks: true,
        },
      },
      ticketTypes: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          price: true,
          originalPrice: true,
          currency: true,
          quantity: true,
          quantitySold: true,
          maxPerOrder: true,
          minPerOrder: true,
          salesStartDate: true,
          salesEndDate: true,
          hasSeating: true,
        },
      },
      _count: {
        select: {
          tickets: true,
          waitlistEntries: true,
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  return event;
};

// Get event by slug (public)
const getEventBySlug = async (slug: string) => {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organizationName: true,
          organizationDesc: true,
          avatar: true,
          website: true,
          socialLinks: true,
        },
      },
      ticketTypes: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          price: true,
          originalPrice: true,
          currency: true,
          quantity: true,
          quantitySold: true,
          maxPerOrder: true,
          minPerOrder: true,
          salesStartDate: true,
          salesEndDate: true,
          hasSeating: true,
        },
      },
      _count: {
        select: {
          tickets: true,
          waitlistEntries: true,
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  // Only return approved events to public unless they're the organizer
  if (event.status !== EventStatus.APPROVED && event.isPrivate) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  return event;
};

// Update event
const updateEvent = async (eventId: string, organizerId: string, userRole: UserRole, payload: IUpdateEvent) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  // Check ownership or admin
  if (event.organizerId !== organizerId && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update this event");
  }

  // Prevent updating certain fields after approval
  if (event.status === EventStatus.APPROVED) {
    const restrictedFields = ["startDate", "endDate", "venueName", "venueAddress", "capacity"];
    const hasRestrictedChanges = restrictedFields.some((field) => payload[field as keyof IUpdateEvent] !== undefined);

    if (hasRestrictedChanges && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot modify critical event details after approval. Contact support."
      );
    }
  }

  // Update slug if title changed
  let slug = event.slug;
  if (payload.title && payload.title !== event.title) {
    const baseSlug = generateSlug(payload.title);
    slug = await ensureUniqueSlug(baseSlug, eventId);
  }

  // ✅ Extract ticketTypes from payload - don't pass it to event update
  const { ticketTypes, ...updateData } = payload;

  const prismaUpdateData: Prisma.EventUpdateInput = {
    ...updateData,
    slug,
    ...(payload.startDate && { startDate: new Date(payload.startDate) }),
    ...(payload.endDate && { endDate: new Date(payload.endDate) }),
    ...(payload.tags && { tags: payload.tags as Prisma.JsonArray }),
    ...(payload.images && { images: payload.images as Prisma.JsonArray }),
    // ❌ Don't include ticketTypes here - they should be updated separately
  };

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: prismaUpdateData,
    select: eventSelectFields,
  });

  logger.info(`Event updated: ${eventId}`);
  return updatedEvent;
};

// Delete event
const deleteEvent = async (eventId: string, organizerId: string, userRole: UserRole) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: {
        select: {
          tickets: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  // Check ownership or admin
  if (event.organizerId !== organizerId && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to delete this event");
  }

  // Prevent deletion if there are active tickets
  if (event._count.tickets > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete event with active tickets. Cancel the event instead.");
  }

  await prisma.event.delete({
    where: { id: eventId },
  });

  logger.info(`Event deleted: ${eventId}`);
};

// Submit event for approval
const submitForApproval = async (eventId: string, organizerId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to submit this event");
  }

  if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.REJECTED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Only draft or rejected events can be submitted for approval");
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: EventStatus.PENDING_APPROVAL,
      rejectionReason: null,
    },
    select: eventSelectFields,
  });

  logger.info(`Event submitted for approval: ${eventId}`);
  return updatedEvent;
};

// Approve or reject event (admin only)
const reviewEvent = async (eventId: string, adminId: string, payload: IEventApproval) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (event.status !== EventStatus.PENDING_APPROVAL) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event is not pending approval");
  }

  const updateData: Prisma.EventUpdateInput = {
    status: payload.status as EventStatus,
    ...(payload.status === "APPROVED" && {
      approvedAt: new Date(),
      approvedBy: adminId,
      publishedAt: new Date(),
    }),
    ...(payload.status === "REJECTED" && {
      rejectionReason: payload.rejectionReason,
    }),
  };

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
    select: eventSelectFields,
  });

  logger.info(`Event ${payload.status.toLowerCase()}: ${eventId} by admin ${adminId}`);
  return updatedEvent;
};

// Cancel event
const cancelEvent = async (eventId: string, organizerId: string, userRole: UserRole) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  // Check ownership or admin
  if (event.organizerId !== organizerId && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to cancel this event");
  }

  if (event.status === EventStatus.CANCELLED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event is already cancelled");
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: { status: EventStatus.CANCELLED },
    select: eventSelectFields,
  });

  // TODO: Trigger refund process and notification to ticket holders

  logger.info(`Event cancelled: ${eventId}`);
  return updatedEvent;
};

// Get all events (with filters)
const getAllEvents = async (filters: IEventFilterRequest, paginationOptions: IPaginationOptions) => {
  const { searchTerm, startDateFrom, startDateTo, minPrice, maxPrice, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereConditions: Prisma.EventWhereInput[] = [];

  // Default to only approved events for public
  if (!filterData.status) {
    whereConditions.push({ status: EventStatus.APPROVED });
  }

  // Search term
  if (searchTerm) {
    whereConditions.push({
      OR: eventSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as Prisma.QueryMode,
        },
      })),
    });
  }

  // Date range filters
  if (startDateFrom || startDateTo) {
    whereConditions.push({
      startDate: {
        ...(startDateFrom && { gte: new Date(startDateFrom) }),
        ...(startDateTo && { lte: new Date(startDateTo) }),
      },
    });
  }

  // Price filter (based on ticket types)
  if (minPrice !== undefined || maxPrice !== undefined) {
    whereConditions.push({
      ticketTypes: {
        some: {
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        },
      },
    });
  }

  // Apply other filters
  if (Object.keys(filterData).length > 0) {
    whereConditions.push({
      AND: Object.entries(filterData).map(([key, value]) => ({
        [key]: value,
      })),
    });
  }

  const whereInput: Prisma.EventWhereInput = whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: eventListSelectFields,
    }),
    prisma.event.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(events, total, { page, limit, skip, sortBy, sortOrder });
};

// Get organizer's events
const getOrganizerEvents = async (organizerId: string, paginationOptions: IPaginationOptions, status?: EventStatus) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereInput: Prisma.EventWhereInput = {
    organizerId,
    ...(status && { status }),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        ...eventListSelectFields,
        status: true,
        rejectionReason: true,
        approvedAt: true,
      },
    }),
    prisma.event.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(events, total, { page, limit, skip, sortBy, sortOrder });
};

// Get events pending approval (admin only)
const getPendingEvents = async (paginationOptions: IPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereInput: Prisma.EventWhereInput = {
    status: EventStatus.PENDING_APPROVAL,
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        ...eventListSelectFields,
        createdAt: true,
      },
    }),
    prisma.event.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(events, total, { page, limit, skip, sortBy, sortOrder });
};

export const EventService = {
  createEvent,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  submitForApproval,
  reviewEvent,
  cancelEvent,
  getAllEvents,
  getOrganizerEvents,
  getPendingEvents,
};
