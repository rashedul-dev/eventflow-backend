// ============================================================================
// FILE: backend/src/app/modules/analytics/analytics.validation.ts
// ============================================================================

import { z } from "zod";

export const analyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(["today", "week", "month", "quarter", "year", "custom"]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    eventId: z.string().optional(),
  }),
});