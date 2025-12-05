import { z } from "zod"
import { TicketStatus } from "@prisma/client"

export const purchaseTicketSchema = z.object({
  body: z.object({
    eventId: z.string(),
    ticketTypeId: z.string(),
    quantity: z.number().int().min(1).max(10),
    attendees: z
      .array(
        z.object({
          name: z.string().min(1).max(100),
          email: z.string().email(),
          phone: z.string().max(20).optional(),
        }),
      )
      .optional(),
    seatIds: z.array(z.string()).optional(),
    promoCode: z.string().max(50).optional(),
  }),
})

export const transferTicketSchema = z.object({
  body: z.object({
    recipientEmail: z.string().email(),
    recipientName: z.string().max(100).optional(),
  }),
})

export const validateTicketSchema = z.object({
  body: z
    .object({
      qrCode: z.string().optional(),
      ticketNumber: z.string().optional(),
    })
    .refine((data) => data.qrCode || data.ticketNumber, { message: "Either qrCode or ticketNumber is required" }),
})

export const checkInTicketSchema = z.object({
  body: z
    .object({
      ticketId: z.string().optional(),
      qrCode: z.string().optional(),
      ticketNumber: z.string().optional(),
    })
    .refine((data) => data.ticketId || data.qrCode || data.ticketNumber, {
      message: "ticketId, qrCode, or ticketNumber is required",
    }),
})

export const ticketQuerySchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    eventId: z.string().optional(),
    ticketTypeId: z.string().optional(),
    checkedIn: z
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

export const cancelTicketSchema = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
})

export const bulkCheckInSchema = z.object({
  body: z.object({
    ticketIds: z.array(z.string()).min(1).max(100),
  }),
})
