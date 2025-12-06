// ============================================================================
// FILE: backend/src/app/modules/admin/admin.validation.ts
// ============================================================================

import { z } from "zod";
import { EventStatus, UserRole } from "@prisma/client";

export const eventVerificationSchema = z.object({
  body: z
    .object({
      status: z.enum(["APPROVED", "REJECTED"]),
      rejectionReason: z.string().min(10).max(1000).optional(),
    })
    .refine(
      (data) => {
        if (data.status === "REJECTED") return !!data.rejectionReason;
        return true;
      },
      {
        message: "Rejection reason is required when rejecting an event",
        path: ["rejectionReason"],
      }
    ),
});

export const userManagementSchema = z.object({
  body: z
    .object({
      action: z.enum(["suspend", "activate", "verify_email", "verify_phone", "update_role"]),
      reason: z.string().min(10).max(500).optional(),
      newRole: z.nativeEnum(UserRole).optional(),
    })
    .refine(
      (data) => {
        if (data.action === "suspend") return !!data.reason;
        if (data.action === "update_role") return !!data.newRole;
        return true;
      },
      {
        message: "Reason required for suspend, newRole required for update_role",
      }
    ),
});

export const analyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(["today", "week", "month", "quarter", "year", "custom"]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export const commissionReportSchema = z.object({
  query: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    organizerId: z.string().optional(),
    eventId: z.string().optional(),
  }),
});

export const adminQuerySchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(EventStatus).optional(),
    isActive: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    isEmailVerified: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
  }),
});

export const bulkActionSchema = z.object({
  body: z.object({
    ids: z.array(z.string()).min(1).max(100),
    action: z.string(),
    reason: z.string().optional(),
  }),
});
