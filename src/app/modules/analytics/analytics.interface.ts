// ============================================================================
// FILE: backend/src/app/modules/analytics/analytics.interface.ts
// ============================================================================

export interface IAnalyticsQuery {
  period?: "today" | "week" | "month" | "quarter" | "year" | "custom";
  dateFrom?: string;
  dateTo?: string;
  eventId?: string;
}

export interface ICommissionReportQuery {
  organizerId?: string;
  month?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}