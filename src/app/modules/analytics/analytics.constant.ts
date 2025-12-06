// ============================================================================
// FILE: backend/src/app/modules/analytics/analytics.constant.ts
// ============================================================================

export const ANALYTICS_PERIODS = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  ALL_TIME: "all_time",
  CUSTOM: "custom",
} as const;

export const EXPORT_FORMATS = {
  CSV: "csv",
  JSON: "json",
  PDF: "pdf",
} as const;

export const METRICS = {
  REVENUE: "revenue",
  TICKETS_SOLD: "tickets_sold",
  ATTENDANCE: "attendance",
  CONVERSION_RATE: "conversion_rate",
  AVERAGE_ORDER_VALUE: "average_order_value",
} as const;
