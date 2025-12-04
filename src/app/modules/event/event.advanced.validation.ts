import { z } from "zod"
import { EventStatus, SeatStatus, WaitlistStatus } from "@prisma/client"

export const createSeatingChartSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    chartData: z.object({}).passthrough(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    sections: z
      .array(
        z.object({
          name: z.string().min(1).max(50),
          description: z.string().max(200).optional(),
          color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .optional(),
          capacity: z.number().int().positive(),
          priceMultiplier: z.number().min(0).max(10).optional(),
          positionData: z.object({}).passthrough().optional(),
          rows: z
            .array(
              z.object({
                rowLabel: z.string().min(1).max(10),
                seats: z.number().int().min(1).max(100),
                startNumber: z.number().int().min(1).optional(),
                isAccessible: z.boolean().optional(),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  }),
})

export const updateSeatStatusSchema = z.object({
  body: z.object({
    seatIds: z.array(z.string()).min(1),
    status: z.nativeEnum(SeatStatus),
  }),
})

export const joinWaitlistSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    ticketTypeId: z.string().optional(),
    quantity: z.number().int().min(1).max(10).optional(),
    notes: z.string().max(500).optional(),
  }),
})

export const notifyWaitlistSchema = z.object({
  body: z.object({
    entryIds: z.array(z.string()).min(1),
    expiryHours: z.number().int().min(1).max(168).optional(), // max 7 days
  }),
})

export const bulkUpdateStatusSchema = z.object({
  body: z.object({
    eventIds: z.array(z.string()).min(1).max(50),
    status: z.nativeEnum(EventStatus),
  }),
})

export const bulkCancelSchema = z.object({
  body: z.object({
    eventIds: z.array(z.string()).min(1).max(50),
  }),
})

export const cloneEventSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
})

export const updateCapacitySchema = z.object({
  body: z.object({
    updates: z
      .array(
        z.object({
          ticketTypeId: z.string(),
          quantity: z.number().int().min(0),
        }),
      )
      .min(1),
  }),
})

export const waitlistQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(WaitlistStatus).optional(),
    page: z
      .string()
      .transform((val) => Number.parseInt(val, 10))
      .optional(),
    limit: z
      .string()
      .transform((val) => Number.parseInt(val, 10))
      .optional(),
  }),
})
