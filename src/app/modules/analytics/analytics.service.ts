// ============================================================================
// FILE: backend/src/app/modules/analytics/analytics.service.ts
// ============================================================================

import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiError";
import type { IAnalyticsQuery } from "./analytics.interface";
import { Prisma } from "@prisma/client";

/**
 * Get admin analytics (platform-wide)
 */
const getAdminAnalytics = async (query: IAnalyticsQuery) => {
  const { dateFrom, dateTo } = getDateRange(query.period, query.dateFrom, query.dateTo);

  const whereCondition: any = {
    status: "COMPLETED",
  };

  if (dateFrom || dateTo) {
    whereCondition.createdAt = {};
    if (dateFrom) whereCondition.createdAt.gte = dateFrom;
    if (dateTo) whereCondition.createdAt.lte = dateTo;
  }

  // Get overview stats
  const [paymentsAggregate, totalTickets, activeEvents, totalUsers] = await Promise.all([
    prisma.payment.aggregate({
      where: whereCondition,
      _sum: {
        totalAmount: true,
        platformCommission: true,
      },
    }),
    prisma.ticket.count({
      where: {
        payment: whereCondition,
      },
    }),
    prisma.event.count({
      where: {
        status: "APPROVED",
        endDate: { gte: new Date() },
      },
    }),
    prisma.user.count(),
  ]);

  // Get revenue data by day for charts
  const revenueData = await prisma.$queryRaw<Array<{ date: Date; revenue: number }>>(
    Prisma.sql`
      SELECT 
        DATE(created_at) as date,
        CAST(COALESCE(SUM(total_amount), 0) AS DECIMAL) as revenue
      FROM payments
      WHERE status = 'COMPLETED'
        ${dateFrom ? Prisma.sql`AND created_at >= ${dateFrom}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND created_at <= ${dateTo}` : Prisma.empty}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT 90
    `
  );

  // Get top events
  const topEvents = await prisma.$queryRaw<Array<any>>(
    Prisma.sql`
      SELECT 
        e.id,
        e.title,
        CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as revenue,
        CAST(COUNT(DISTINCT t.id) AS INTEGER) as "ticketsSold"
      FROM events e
      LEFT JOIN tickets t ON t.event_id = e.id
      LEFT JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
      ${dateFrom || dateTo ? Prisma.sql`WHERE` : Prisma.empty}
      ${dateFrom ? Prisma.sql`p.created_at >= ${dateFrom}` : Prisma.empty}
      ${dateFrom && dateTo ? Prisma.sql`AND` : Prisma.empty}
      ${dateTo ? Prisma.sql`p.created_at <= ${dateTo}` : Prisma.empty}
      GROUP BY e.id, e.title
      ORDER BY revenue DESC
      LIMIT 10
    `
  );

  return {
    totalRevenue: Number(paymentsAggregate._sum.totalAmount || 0),
    ticketsSold: totalTickets,
    activeEvents,
    totalUsers,
    platformCommission: Number(paymentsAggregate._sum.platformCommission || 0),
    revenueData: revenueData.map((d) => ({
      date: new Date(d.date).toISOString().split("T")[0],
      revenue: Number(d.revenue),
    })),
    topEvents: topEvents.map((e) => ({
      id: e.id,
      title: e.title,
      revenue: Number(e.revenue),
      ticketsSold: Number(e.ticketsSold),
    })),
  };
};

/**
 * Get organizer analytics
 */
const getOrganizerAnalytics = async (organizerId: string, query: IAnalyticsQuery) => {
  const { dateFrom, dateTo } = getDateRange(query.period, query.dateFrom, query.dateTo);

  // Include both COMPLETED and PENDING payments
  const validPaymentStatuses = ["COMPLETED", "PENDING"]; // or whatever statuses you want

  const paymentWhereCondition: any = {
    tickets: {
      some: {
        event: {
          organizerId,
          ...(query.eventId && { id: query.eventId }),
        },
      },
    },
    status: { in: validPaymentStatuses }, // Changed from "COMPLETED" to multiple statuses
  };

  if (dateFrom || dateTo) {
    paymentWhereCondition.createdAt = {};
    if (dateFrom) paymentWhereCondition.createdAt.gte = dateFrom;
    if (dateTo) paymentWhereCondition.createdAt.lte = dateTo;
  }

  const ticketWhereCondition: any = {
    event: {
      organizerId,
      ...(query.eventId && { id: query.eventId }),
    },
    payment: {
      is: {
        status: { in: validPaymentStatuses }, // Changed here too
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
              },
            }
          : {}),
      },
    },
  };

  const [paymentsAggregate, totalTickets, activeEvents] = await Promise.all([
    prisma.payment.aggregate({
      where: paymentWhereCondition,
      _sum: {
        totalAmount: true,
        platformCommission: true,
      },
    }),
    prisma.ticket.count({
      where: ticketWhereCondition,
    }),
    prisma.event.count({
      where: {
        organizerId,
        status: "APPROVED",
        endDate: { gte: new Date() },
      },
    }),
  ]);

  const revenueData = await prisma.$queryRaw<Array<{ date: Date; revenue: number }>>(
    Prisma.sql`
      SELECT 
        DATE(p.created_at) as date,
        CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as revenue
      FROM payments p
      INNER JOIN tickets t ON t.payment_id = p.id
      INNER JOIN events e ON t.event_id = e.id
      WHERE e.organizer_id = ${organizerId}
        AND p.status IN ('COMPLETED', 'PENDING')
        ${dateFrom ? Prisma.sql`AND p.created_at >= ${dateFrom}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND p.created_at <= ${dateTo}` : Prisma.empty}
        ${query.eventId ? Prisma.sql`AND e.id = ${query.eventId}` : Prisma.empty}
      GROUP BY DATE(p.created_at)
      ORDER BY date ASC
      LIMIT 90
    `
  );

  const topEvents = await prisma.$queryRaw<Array<any>>(
    Prisma.sql`
      SELECT 
        e.id,
        e.title,
        CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as revenue,
        CAST(COUNT(t.id) AS INTEGER) as "ticketsSold"
      FROM events e
      INNER JOIN tickets t ON t.event_id = e.id
      INNER JOIN payments p ON p.id = t.payment_id AND p.status IN ('COMPLETED', 'PENDING')
      WHERE e.organizer_id = ${organizerId}
        ${dateFrom ? Prisma.sql`AND p.created_at >= ${dateFrom}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND p.created_at <= ${dateTo}` : Prisma.empty}
        ${query.eventId ? Prisma.sql`AND e.id = ${query.eventId}` : Prisma.empty}
      GROUP BY e.id, e.title
      HAVING COALESCE(SUM(p.total_amount), 0) > 0
      ORDER BY revenue DESC
      LIMIT 10
    `
  );

  const totalRevenue = Number(paymentsAggregate._sum.totalAmount || 0);
  const commissionOwed = Number(paymentsAggregate._sum.platformCommission || 0);

  return {
    totalRevenue,
    ticketsSold: totalTickets,
    activeEvents,
    commissionOwed,
    revenueData: revenueData.map((d) => ({
      date: new Date(d.date).toISOString().split("T")[0],
      revenue: Number(d.revenue),
    })),
    topEvents: topEvents.map((e) => ({
      id: e.id,
      title: e.title,
      revenue: Number(e.revenue),
      ticketsSold: Number(e.ticketsSold),
    })),
  };
};
/**
 * Get event-specific analytics
 */
const getEventAnalytics = async (eventId: string, organizerId: string) => {
  // Verify ownership
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found or unauthorized");
  }

  const whereCondition = {
    tickets: {
      some: {
        eventId,
      },
    },
    status: "COMPLETED" as const,
  };

  const [paymentsAggregate, totalTickets, checkedInTickets] = await Promise.all([
    prisma.payment.aggregate({
      where: whereCondition,
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.ticket.count({
      where: {
        eventId,
        payment: { status: "COMPLETED" },
      },
    }),
    prisma.ticket.count({
      where: {
        eventId,
        // status: "CHECKED_IN",
      },
    }),
  ]);

  // Revenue by day
  const revenueData = await prisma.$queryRaw<Array<{ date: Date; revenue: number; tickets: number }>>(
    Prisma.sql`
      SELECT 
        DATE(p.created_at) as date,
        CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as revenue,
        CAST(COUNT(DISTINCT t.id) AS INTEGER) as tickets
      FROM payments p
      INNER JOIN tickets t ON t.payment_id = p.id
      WHERE t.event_id = ${eventId}
        AND p.status = 'COMPLETED'
      GROUP BY DATE(p.created_at)
      ORDER BY date ASC
    `
  );

  // Ticket type breakdown
  const ticketTypeBreakdown = await prisma.$queryRaw<Array<any>>(
    Prisma.sql`
      SELECT 
        tt.name,
        CAST(COUNT(t.id) AS INTEGER) as sold,
        CAST(COALESCE(SUM(t.price_paid), 0) AS DECIMAL) as revenue
      FROM ticket_types tt
      LEFT JOIN tickets t ON t.ticket_type_id = tt.id 
      LEFT JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
      WHERE tt.event_id = ${eventId}
      GROUP BY tt.name
      ORDER BY revenue DESC
    `
  );

  return {
    totalRevenue: Number(paymentsAggregate._sum.totalAmount || 0),
    ticketsSold: totalTickets,
    checkedInTickets,
    attendanceRate: totalTickets > 0 ? (checkedInTickets / totalTickets) * 100 : 0,
    revenueData: revenueData.map((d) => ({
      date: new Date(d.date).toISOString().split("T")[0],
      revenue: Number(d.revenue),
      tickets: Number(d.tickets),
    })),
    ticketTypeBreakdown: ticketTypeBreakdown.map((t) => ({
      name: t.name,
      sold: Number(t.sold),
      revenue: Number(t.revenue),
    })),
  };
};

/**
 * Get commission reports
 */
const getCommissionReports = async (params: {
  organizerId?: string;
  month?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { organizerId, dateFrom, dateTo } = params;

  const whereCondition: any = {
    status: "COMPLETED",
  };

  if (dateFrom || dateTo) {
    whereCondition.createdAt = {};
    if (dateFrom) whereCondition.createdAt.gte = new Date(dateFrom);
    if (dateTo) whereCondition.createdAt.lte = new Date(dateTo);
  }

  // Get summary
  const summary = await prisma.payment.aggregate({
    where: whereCondition,
    _sum: {
      platformCommission: true,
    },
  });

  // Get organizer breakdown
  const reports = await prisma.$queryRaw<Array<any>>(
    Prisma.sql`
      SELECT 
        u.id as "organizerId",
        COALESCE(u.organization_name, CONCAT(u.first_name, ' ', u.last_name)) as "organizerName",
        CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as "totalSales",
        CAST(COALESCE(SUM(p.platform_commission), 0) AS DECIMAL) as "commissionOwed",
        CAST(COUNT(DISTINCT e.id) AS INTEGER) as "eventCount"
      FROM users u
      INNER JOIN events e ON e.organizer_id = u.id
      INNER JOIN tickets t ON t.event_id = e.id
      INNER JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
      WHERE u.role IN ('ORGANIZER', 'ADMIN', 'SUPER_ADMIN')
        ${organizerId ? Prisma.sql`AND u.id = ${organizerId}` : Prisma.empty}
        ${dateFrom ? Prisma.sql`AND p.created_at >= ${new Date(dateFrom)}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND p.created_at <= ${new Date(dateTo)}` : Prisma.empty}
      GROUP BY u.id, u.organization_name, u.first_name, u.last_name
      ORDER BY "commissionOwed" DESC
    `
  );

  // Get events for each organizer
  const reportsWithEvents = await Promise.all(
    reports.map(async (report) => {
      const events = await prisma.$queryRaw<Array<any>>(
        Prisma.sql`
          SELECT 
            e.id as "eventId",
            e.title as "eventTitle",
            CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as "eventRevenue",
            CAST(COALESCE(SUM(p.platform_commission), 0) AS DECIMAL) as commission,
            CAST(COUNT(DISTINCT t.id) AS INTEGER) as "ticketsSold"
          FROM events e
          LEFT JOIN tickets t ON t.event_id = e.id
          LEFT JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
          WHERE e.organizer_id = ${report.organizerId}
            ${dateFrom ? Prisma.sql`AND p.created_at >= ${new Date(dateFrom)}` : Prisma.empty}
            ${dateTo ? Prisma.sql`AND p.created_at <= ${new Date(dateTo)}` : Prisma.empty}
          GROUP BY e.id, e.title
          ORDER BY commission DESC
        `
      );

      return {
        ...report,
        totalSales: Number(report.totalSales),
        commissionOwed: Number(report.commissionOwed),
        eventCount: Number(report.eventCount),
        events: events.map((e) => ({
          eventId: e.eventId,
          eventTitle: e.eventTitle,
          eventRevenue: Number(e.eventRevenue),
          commission: Number(e.commission),
          ticketsSold: Number(e.ticketsSold),
        })),
      };
    })
  );

  // Monthly breakdown
  const monthlyBreakdown = await prisma.$queryRaw<Array<{ month: Date; commission: number }>>(
    Prisma.sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        CAST(COALESCE(SUM(platform_commission), 0) AS DECIMAL) as commission
      FROM payments
      WHERE status = 'COMPLETED'
        ${dateFrom ? Prisma.sql`AND created_at >= ${new Date(dateFrom)}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND created_at <= ${new Date(dateTo)}` : Prisma.empty}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `
  );

  return {
    summary: {
      totalCommission: Number(summary._sum.platformCommission || 0),
      totalPaid: 0, // TODO: Implement payout tracking
      totalUnpaid: Number(summary._sum.platformCommission || 0),
      totalOrganizers: reports.length,
    },
    reports: reportsWithEvents,
    monthlyBreakdown: monthlyBreakdown.map((m) => ({
      month: new Date(m.month).toISOString().slice(0, 7), // YYYY-MM format
      commission: Number(m.commission),
    })),
  };
};

/**
 * Helper: Get date range
 */
const getDateRange = (period?: string, dateFrom?: string, dateTo?: string): { dateFrom?: Date; dateTo?: Date } => {
  if (period === "custom") {
    return {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };
  }

  const now = new Date();
  let from: Date | undefined;

  switch (period) {
    case "today":
      from = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      from = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      from = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "quarter":
      from = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "year":
      from = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
  }

  return { dateFrom: from, dateTo: new Date() };
};

export const AnalyticsService = {
  getAdminAnalytics,
  getOrganizerAnalytics,
  getEventAnalytics,
  getCommissionReports,
};
