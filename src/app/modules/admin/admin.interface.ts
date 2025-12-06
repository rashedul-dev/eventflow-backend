// ============================================================================
// FILE: backend/src/app/modules/admin/admin.interface.ts
// ============================================================================

import type { EventStatus, UserRole } from "@prisma/client";

export interface IEventVerification {
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface IUserManagement {
  action: "suspend" | "activate" | "verify_email" | "verify_phone" | "update_role";
  reason?: string;
  newRole?: UserRole;
}

export interface IAnalyticsQuery {
  period?: "today" | "week" | "month" | "quarter" | "year" | "custom";
  dateFrom?: string;
  dateTo?: string;
}

export interface ICommissionReport {
  dateFrom?: string;
  dateTo?: string;
  organizerId?: string;
  eventId?: string;
}

export interface IPlatformAnalytics {
  overview: {
    totalUsers: number;
    totalEvents: number;
    totalRevenue: number;
    totalCommission: number;
    activeEvents: number;
    pendingEvents: number;
  };
  userGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    commission: number;
  }>;
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    revenue: number;
    ticketsSold: number;
  }>;
  topOrganizers: Array<{
    organizerId: string;
    organizerName: string;
    totalRevenue: number;
    eventCount: number;
  }>;
}

export interface ICommissionReportData {
  summary: {
    totalRevenue: number;
    totalCommission: number;
    totalPayout: number;
    transactionCount: number;
  };
  byEvent: Array<{
    eventId: string;
    eventTitle: string;
    organizerName: string;
    revenue: number;
    commission: number;
    payout: number;
    transactionCount: number;
  }>;
  byOrganizer: Array<{
    organizerId: string;
    organizerName: string;
    totalRevenue: number;
    totalCommission: number;
    totalPayout: number;
    eventCount: number;
  }>;
}
