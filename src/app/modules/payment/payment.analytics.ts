// ============================================================================
// FILE: backend/src/app/modules/payment/payment.analytics.ts
// ============================================================================

import { Prisma } from "@prisma/client";
import prisma from "../../../shared/prisma";

/**
 * Get payment analytics for platform admin
 */
export const getPlatformPaymentAnalytics = async (dateFrom?: Date, dateTo?: Date) => {
  const whereCondition: any = {
    status: "COMPLETED",
  };

  if (dateFrom || dateTo) {
    whereCondition.createdAt = {};
    if (dateFrom) whereCondition.createdAt.gte = dateFrom;
    if (dateTo) whereCondition.createdAt.lte = dateTo;
  }

  const [totalStats, dailyStats, statusBreakdown, topEvents] = await Promise.all([
    // Total statistics
    prisma.payment.aggregate({
      where: whereCondition,
      _sum: {
        totalAmount: true,
        platformCommission: true,
        organizerPayout: true,
      },
      _count: true,
    }),

    // Daily statistics (last 30 days)
    prisma.$queryRaw<Array<{ date: Date; payment_count: number; total_revenue: number; platform_commission: number }>>(
      Prisma.sql`
        SELECT 
          DATE(created_at) as date,
          CAST(COUNT(*) AS INTEGER) as payment_count,
          CAST(COALESCE(SUM(total_amount), 0) AS DECIMAL) as total_revenue,
          CAST(COALESCE(SUM(platform_commission), 0) AS DECIMAL) as platform_commission
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND status = 'COMPLETED'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `
    ),

    // Payment status breakdown
    prisma.payment.groupBy({
      by: ["status"],
      _count: true,
      _sum: {
        totalAmount: true,
      },
    }),

    // Top events by revenue
    prisma.$queryRaw<
      Array<{ id: string; title: string; payment_count: number; total_revenue: number; platform_commission: number }>
    >(
      Prisma.sql`
        SELECT 
          e.id,
          e.title,
          CAST(COUNT(DISTINCT p.id) AS INTEGER) as payment_count,
          CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as total_revenue,
          CAST(COALESCE(SUM(p.platform_commission), 0) AS DECIMAL) as platform_commission
        FROM payments p
        INNER JOIN tickets t ON t.payment_id = p.id
        INNER JOIN events e ON t.event_id = e.id
        WHERE p.status = 'COMPLETED'
        GROUP BY e.id, e.title
        ORDER BY total_revenue DESC
        LIMIT 10
      `
    ),
  ]);

  return {
    overview: {
      totalRevenue: Number(totalStats._sum.totalAmount || 0),
      platformCommission: Number(totalStats._sum.platformCommission || 0),
      organizerPayout: Number(totalStats._sum.organizerPayout || 0),
      paymentCount: totalStats._count,
    },
    dailyStats,
    statusBreakdown,
    topEvents,
  };
};

/**
 * Get payment analytics for event organizer
 */
export const getOrganizerPaymentAnalytics = async (organizerId: string, eventId?: string) => {
  const whereCondition: any = {
    status: "COMPLETED",
    tickets: {
      some: {
        event: {
          organizerId,
          ...(eventId && { id: eventId }),
        },
      },
    },
  };

  const [totalStats, paymentsByEvent, recentPayments] = await Promise.all([
    // Total statistics
    prisma.payment.aggregate({
      where: whereCondition,
      _sum: {
        totalAmount: true,
        platformCommission: true,
        organizerPayout: true,
      },
      _count: true,
    }),

    // Payments grouped by event
    prisma.$queryRaw<
      Array<{ id: string; title: string; payment_count: number; total_revenue: number; organizer_payout: number }>
    >(
      Prisma.sql`
        SELECT 
          e.id,
          e.title,
          CAST(COUNT(DISTINCT p.id) AS INTEGER) as payment_count,
          CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as total_revenue,
          CAST(COALESCE(SUM(p.organizer_payout), 0) AS DECIMAL) as organizer_payout
        FROM payments p
        INNER JOIN tickets t ON t.payment_id = p.id
        INNER JOIN events e ON t.event_id = e.id
        WHERE e.organizer_id = ${organizerId}
          AND p.status = 'COMPLETED'
          ${eventId ? Prisma.sql`AND e.id = ${eventId}` : Prisma.empty}
        GROUP BY e.id, e.title
        ORDER BY total_revenue DESC
      `
    ),

    // Recent payments
    prisma.payment.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        organizerPayout: true,
        status: true,
        payoutStatus: true,
        createdAt: true,
        tickets: {
          select: {
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          take: 1,
        },
      },
    }),
  ]);

  return {
    overview: {
      totalRevenue: Number(totalStats._sum.totalAmount || 0),
      platformCommission: Number(totalStats._sum.platformCommission || 0),
      yourPayout: Number(totalStats._sum.organizerPayout || 0),
      paymentCount: totalStats._count,
    },
    paymentsByEvent,
    recentPayments,
  };
};
