import { z } from "zod";
import { EventStatus } from "@prisma/client";

export const createEventSchema = z.object({
  body: z
    .object({
      title: z.string().min(3).max(200),
      description: z.string().min(10).max(10000),
      shortDescription: z.string().max(500).optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      timezone: z.string().default("UTC"),
      isVirtual: z.boolean().default(false),
      venueName: z.string().max(200).optional(),
      venueAddress: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      virtualLink: z.string().url().optional(),
      virtualPlatform: z.string().max(100).optional(),
      coverImage: z.string().url().optional(),
      thumbnailImage: z.string().url().optional(),
      images: z.array(z.string().url()).max(10).optional(),
      capacity: z.number().int().min(1).optional(),
      isPrivate: z.boolean().default(false),
      requiresApproval: z.boolean().default(false),
      ageRestriction: z.number().int().min(0).max(100).optional(),
      category: z.string().max(50).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
      metaTitle: z.string().max(100).optional(),
      metaDescription: z.string().max(500).optional(),
      ticketTypes: z
        .array(
          z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
            category: z.enum(["FREE", "PAID", "DONATION"]),
            price: z.number().min(0),
            quantity: z.number().int().min(1),
            minPerOrder: z.number().int().min(1).default(1),
            maxPerOrder: z.number().int().min(1).default(10),
            sortOrder: z.number().int().min(0).default(0),
            // quantityAvailable: z.number(),
          })
        )
        .min(1, "At least one ticket type is required")
        .optional(),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
      message: "End date must be after start date",
      path: ["endDate"],
    })
    .refine(
      (data) => {
        if (data.isVirtual) return true;
        return data.venueName || data.city;
      },
      { message: "Physical events must have venue name or city", path: ["venueName"] }
    ),
});

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(10000).optional(),
    shortDescription: z.string().max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timezone: z.string().optional(),
    isVirtual: z.boolean().optional(),
    venueName: z.string().max(200).optional(),
    venueAddress: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    virtualLink: z.string().url().optional(),
    virtualPlatform: z.string().max(100).optional(),
    coverImage: z.string().url().optional(),
    thumbnailImage: z.string().url().optional(),
    images: z.array(z.string().url()).max(10).optional(),
    capacity: z.number().int().min(1).optional(),
    isPrivate: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    ageRestriction: z.number().int().min(0).max(100).optional(),
    category: z.string().max(50).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    metaTitle: z.string().max(100).optional(),
    metaDescription: z.string().max(500).optional(),
  }),
});

export const eventApprovalSchema = z.object({
  body: z
    .object({
      status: z.enum(["APPROVED", "REJECTED"]),
      rejectionReason: z.string().max(1000).optional(),
    })
    .refine(
      (data) => {
        if (data.status === "REJECTED") return !!data.rejectionReason;
        return true;
      },
      { message: "Rejection reason is required when rejecting an event", path: ["rejectionReason"] }
    ),
});

export const submitForApprovalSchema = z.object({
  body: z.object({}).optional(),
});

export const eventQuerySchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    status: z.nativeEnum(EventStatus).optional(),
    category: z.string().optional(),
    isVirtual: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    isPrivate: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    organizerId: z.string().optional(),
    startDateFrom: z.string().optional(),
    startDateTo: z.string().optional(),
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
});

export const coOrganizerInviteSchema = z.object({
  body: z.object({
    email: z.string().email(),
    permissions: z.array(z.string()).optional(),
  }),
});
