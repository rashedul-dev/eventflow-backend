// ============================================================================
// FILE: backend/src/app/modules/payment/payment.validation.ts
// ============================================================================

import { z } from "zod";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export const createPaymentIntentSchema = z.object({
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
        })
      )
      .optional(),
    seatIds: z.array(z.string()).optional(),
    promoCode: z.string().max(50).optional(),
    billingEmail: z.string().email(),
    billingName: z.string().max(200).optional(),
    savePaymentMethod: z.boolean().optional(),
  }),
});

// export const createPaymentIntentSchema = z.object({
//   eventId: z.string(),
//   ticketTypeId: z.string(),
//   quantity: z.number().int().min(1).max(10),
//   attendees: z
//     .array(
//       z.object({
//         name: z.string().min(1).max(100),
//         email: z.string().email(),
//         phone: z.string().max(20).optional(),
//       })
//     )
//     .optional(),
//   seatIds: z.array(z.string()).optional(),
//   promoCode: z.string().max(50).optional(),
//   billingEmail: z.string().email(),
//   billingName: z.string().max(200).optional(),
//   savePaymentMethod: z.boolean().optional(),
// });

export const confirmPaymentSchema = z.object({
  body: z.object({
    paymentIntentId: z.string(),
    paymentMethodId: z.string().optional(),
  }),
});

export const refundPaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    reason: z.string().min(10).max(500),
  }),
});

export const paymentQuerySchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
    userId: z.string().optional(),
    eventId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    minAmount: z
      .string()
      .transform((val) => parseFloat(val))
      .optional(),
    maxAmount: z
      .string()
      .transform((val) => parseFloat(val))
      .optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const createPayoutSchema = z.object({
  body: z.object({
    eventId: z.string(),
    amount: z.number().positive().optional(),
  }),
});

export const retryPaymentSchema = z.object({
  body: z.object({
    paymentMethodId: z.string().optional(),
  }),
});
