// ============================================================================
// FILE: backend/src/app/modules/admin/admin.service.ts
// ============================================================================

import httpStatus from "http-status";
import { EventStatus, Prisma, UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { calculatePagination, createPaginatedResponse, type IPaginationOptions } from "../../helpers/paginationHelper";
import { adminSearchableFields } from "./admin.constant";
import type {
  IEventVerification,
  IUserManagement,
  IAnalyticsQuery,
  ICommissionReport,
  IPlatformAnalytics,
  ICommissionReportData,
} from "./admin.interface";
import { logger } from "../../../utils/logger";

// ============================================================================
// EVENT VERIFICATION
// ============================================================================

/**
 * Get all pending events for verification
 */
const getPendingEvents = async (paginationOptions: IPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereInput: Prisma.EventWhereInput = {
    status: EventStatus.PENDING_APPROVAL,
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        organizer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            organizationName: true,
          },
        },
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            quantitySold: true,
          },
        },
        _count: {
          select: {
            tickets: true,
            waitlistEntries: true,
          },
        },
      },
    }),
    prisma.event.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(events, total, { page, limit, skip, sortBy, sortOrder });
};

/**
 * Verify/Reject event
 */
const verifyEvent = async (eventId: string, adminId: string, payload: IEventVerification) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        select: { id: true, email: true, firstName: true },
      },
    },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (event.status !== EventStatus.PENDING_APPROVAL) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event is not pending approval");
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: payload.status as EventStatus,
      rejectionReason: payload.rejectionReason,
      approvedAt: payload.status === "APPROVED" ? new Date() : null,
      approvedBy: payload.status === "APPROVED" ? adminId : null,
      publishedAt: payload.status === "APPROVED" ? new Date() : null,
    },
  });

  // Log audit trail
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: payload.status === "APPROVED" ? "APPROVE_EVENT" : "REJECT_EVENT",
      entity: "Event",
      entityId: eventId,
      oldValues: { status: event.status },
      newValues: { status: payload.status, rejectionReason: payload.rejectionReason },
    },
  });

  logger.info(`Event ${payload.status.toLowerCase()}: ${eventId} by admin ${adminId}`);

  // TODO: Send notification to organizer
  // await sendEventVerificationEmail(event.organizer.email, event, payload.status)

  return updatedEvent;
};

/**
 * Get event verification statistics
 */
const getEventVerificationStats = async () => {
  const [pending, approved, rejected, total] = await Promise.all([
    prisma.event.count({ where: { status: EventStatus.PENDING_APPROVAL } }),
    prisma.event.count({ where: { status: EventStatus.APPROVED } }),
    prisma.event.count({ where: { status: EventStatus.REJECTED } }),
    prisma.event.count(),
  ]);

  // Recent verifications (last 30 days)
  const recentVerifications = await prisma.event.findMany({
    where: {
      approvedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      approvedAt: true,
      approvedBy: true,
    },
    orderBy: { approvedAt: "desc" },
    take: 10,
  });

  return {
    counts: {
      pending,
      approved,
      rejected,
      total,
    },
    percentages: {
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
    },
    recentVerifications,
  };
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get all users with filters
 */
const getAllUsers = async (filters: any, paginationOptions: IPaginationOptions) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereConditions: Prisma.UserWhereInput[] = [];

  if (searchTerm) {
    whereConditions.push({
      OR: adminSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as Prisma.QueryMode,
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    whereConditions.push(filterData as Prisma.UserWhereInput);
  }

  const whereInput: Prisma.UserWhereInput = whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        organizationName: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            organizedEvents: true,
            tickets: true,
            payments: true,
          },
        },
      },
    }),
    prisma.user.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(users, total, { page, limit, skip, sortBy, sortOrder });
};

/**
 * Manage user (suspend, activate, verify, etc.)
 */
const manageUser = async (userId: string, adminId: string, payload: IUserManagement) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, "Cannot manage super admin users");
  }

  let updateData: Record<string, any> = {};

  switch (payload.action) {
    case "suspend":
      updateData = { isActive: false };
      // Revoke all refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
      break;

    case "activate":
      updateData = { isActive: true };
      break;

    case "verify_email":
      updateData = { isEmailVerified: true };
      break;

    case "verify_phone":
      updateData = { isPhoneVerified: true };
      break;

    case "update_role":
      if (!payload.newRole) {
        throw new ApiError(httpStatus.BAD_REQUEST, "New role is required");
      }
      updateData = { role: payload.newRole };
      break;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData as Prisma.UserUpdateInput,
  });

  // Log audit trail
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: payload.action.toUpperCase(),
      entity: "User",
      entityId: userId,
      oldValues: { isActive: user.isActive, role: user.role },
      newValues: updateData as any,
    },
  });

  logger.info(`User ${payload.action}: ${userId} by admin ${adminId}`);

  return updatedUser;
};

/**
 * Get user statistics
 */

const getUserStatistics = async () => {
  const [total, active, verified, byRole, recentSignups] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: true,
    }),
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // User growth (last 30 days)
  const userGrowth = await prisma.$queryRaw<Array<{ date: Date; count: number }>>(
    Prisma.sql`
      SELECT 
        DATE(created_at) as date, 
        CAST(COUNT(*) AS INTEGER) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `
  );

  return {
    overview: {
      total,
      active,
      verified,
      inactive: total - active,
      unverified: total - verified,
    },
    byRole: byRole.map((item) => ({
      role: item.role,
      count: item._count,
    })),
    recentSignups,
    userGrowth,
  };
};

// ============================================================================
// PLATFORM ANALYTICS
// ============================================================================

/**
 * Get comprehensive platform analytics
 */
const getPlatformAnalytics = async (query: IAnalyticsQuery): Promise<IPlatformAnalytics> => {
  const { dateFrom, dateTo } = getDateRange(query.period, query.dateFrom, query.dateTo);

  const whereCondition: any = {};
  if (dateFrom || dateTo) {
    whereCondition.createdAt = {};
    if (dateFrom) whereCondition.createdAt.gte = dateFrom;
    if (dateTo) whereCondition.createdAt.lte = dateTo;
  }

  const [totalUsers, totalEvents, activeEvents, pendingEvents, revenueStats, topEvents, topOrganizers, userGrowth] =
    await Promise.all([
      // Total users
      prisma.user.count(),

      // Total events
      prisma.event.count(),

      // Active events
      prisma.event.count({
        where: {
          status: EventStatus.APPROVED,
          endDate: { gte: new Date() },
        },
      }),

      // Pending events
      prisma.event.count({
        where: { status: EventStatus.PENDING_APPROVAL },
      }),

      // Revenue statistics
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          ...whereCondition,
        },
        _sum: {
          totalAmount: true,
          platformCommission: true,
        },
        _count: true,
      }),

      // Top events by revenue
      prisma.$queryRaw<Array<any>>(
        Prisma.sql`
    SELECT 
      e.id as "eventId",
      e.title as "eventTitle",
      CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as revenue,
      CAST(COUNT(DISTINCT t.id) AS INTEGER) as "ticketsSold"
    FROM events e
    LEFT JOIN tickets t ON t.event_id = e.id
    LEFT JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
    GROUP BY e.id, e.title
    ORDER BY revenue DESC
    LIMIT 10
  `
      ),

      // Top organizers
      prisma.$queryRaw<Array<any>>(
        Prisma.sql`
    SELECT 
      u.id as "organizerId",
      COALESCE(u.organization_name, CONCAT(u.first_name, ' ', u.last_name)) as "organizerName",
      CAST(COALESCE(SUM(p.total_amount), 0) AS DECIMAL) as "totalRevenue",
      CAST(COUNT(DISTINCT e.id) AS INTEGER) as "eventCount"
    FROM users u
    INNER JOIN events e ON e.organizer_id = u.id
    LEFT JOIN tickets t ON t.event_id = e.id
    LEFT JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
    WHERE u.role IN ('ORGANIZER', 'ADMIN', 'SUPER_ADMIN')
    GROUP BY u.id, u.organization_name, u.first_name, u.last_name
    ORDER BY "totalRevenue" DESC
    LIMIT 10
  `
      ),

      // User growth
      prisma.$queryRaw<Array<any>>(
        Prisma.sql`
    SELECT 
      DATE(created_at) as date,
      CAST(COUNT(*) AS INTEGER) as "newUsers",
      CAST(SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) AS INTEGER) as "totalUsers"
    FROM users
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `
      ),
    ]);

  return {
    overview: {
      totalUsers,
      totalEvents,
      totalRevenue: Number(revenueStats._sum.totalAmount || 0),
      totalCommission: Number(revenueStats._sum.platformCommission || 0),
      activeEvents,
      pendingEvents,
    },
    userGrowth: userGrowth as any,
    revenueByPeriod: [], // TODO: Implement based on period
    topEvents: topEvents as any,
    topOrganizers: topOrganizers as any,
  };
};

// ============================================================================
// COMMISSION REPORTS
// ============================================================================

/**
 * Generate commission report
 */
const getCommissionReport = async (query: ICommissionReport): Promise<ICommissionReportData> => {
  const whereCondition: any = {
    status: "COMPLETED",
  };

  if (query.dateFrom || query.dateTo) {
    whereCondition.createdAt = {};
    if (query.dateFrom) whereCondition.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) whereCondition.createdAt.lte = new Date(query.dateTo);
  }

  // Summary
  const summary = await prisma.payment.aggregate({
    where: whereCondition,
    _sum: {
      totalAmount: true,
      platformCommission: true,
      organizerPayout: true,
    },
    _count: true,
  });

  // By Event
  const byEvent = await prisma.$queryRaw<Array<any>>(
    Prisma.sql`
    SELECT 
      e.id as "eventId",
      e.title as "eventTitle",
      COALESCE(u.organization_name, CONCAT(u.first_name, ' ', u.last_name)) as "organizerName",
      COALESCE(SUM(p.total_amount), 0) as revenue,
      COALESCE(SUM(p.platform_commission), 0) as commission,
      COALESCE(SUM(p.organizer_payout), 0) as payout,
      COUNT(p.id) as "transactionCount"
    FROM events e
    INNER JOIN users u ON u.id = e.organizer_id
    LEFT JOIN tickets t ON t.event_id = e.id
    LEFT JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
    ${query.eventId ? Prisma.sql`WHERE e.id = ${query.eventId}` : Prisma.empty}
    GROUP BY e.id, e.title, u.organization_name, u.first_name, u.last_name
    ORDER BY revenue DESC
  `
  );

  // By Organizer

  const byOrganizer = await prisma.$queryRaw<Array<any>>(
    Prisma.sql`
    SELECT 
      u.id as "organizerId",
      COALESCE(u.organization_name, CONCAT(u.first_name, ' ', u.last_name)) as "organizerName",
      COALESCE(SUM(p.total_amount), 0) as "totalRevenue",
      COALESCE(SUM(p.platform_commission), 0) as "totalCommission",
      COALESCE(SUM(p.organizer_payout), 0) as "totalPayout",
      COUNT(DISTINCT e.id) as "eventCount"
    FROM users u
    INNER JOIN events e ON e.organizer_id = u.id
    LEFT JOIN tickets t ON t.event_id = e.id
    LEFT JOIN payments p ON p.id = t.payment_id AND p.status = 'COMPLETED'
    ${query.organizerId ? Prisma.sql`WHERE u.id = ${query.organizerId}` : Prisma.empty}
    GROUP BY u.id, u.organization_name, u.first_name, u.last_name
    ORDER BY "totalRevenue" DESC
  `
  );

  return {
    summary: {
      totalRevenue: Number(summary._sum.totalAmount || 0),
      totalCommission: Number(summary._sum.platformCommission || 0),
      totalPayout: Number(summary._sum.organizerPayout || 0),
      transactionCount: summary._count,
    },
    byEvent: byEvent.map((e) => ({
      ...e,
      revenue: Number(e.revenue),
      commission: Number(e.commission),
      payout: Number(e.payout),
      transactionCount: Number(e.transactionCount),
    })),
    byOrganizer: byOrganizer.map((o) => ({
      ...o,
      totalRevenue: Number(o.totalRevenue),
      totalCommission: Number(o.totalCommission),
      totalPayout: Number(o.totalPayout),
      eventCount: Number(o.eventCount),
    })),
  };
};

/**
 * Helper: Get date range based on period
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

export const AdminService = {
  // Event Verification
  getPendingEvents,
  verifyEvent,
  getEventVerificationStats,

  // User Management
  getAllUsers,
  manageUser,
  getUserStatistics,

  // Analytics
  getPlatformAnalytics,

  // Commission Reports
  getCommissionReport,
};
