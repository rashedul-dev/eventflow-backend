// ============================================================================
// FILE: backend/src/app/modules/admin/admin.constant.ts
// ============================================================================

export const ADMIN_PERMISSIONS = {
  // Event Management
  APPROVE_EVENTS: "approve_events",
  REJECT_EVENTS: "reject_events",
  DELETE_EVENTS: "delete_events",
  FEATURE_EVENTS: "feature_events",

  // User Management
  SUSPEND_USERS: "suspend_users",
  VERIFY_USERS: "verify_users",
  DELETE_USERS: "delete_users",
  UPDATE_USER_ROLES: "update_user_roles",

  // Financial
  VIEW_FINANCIALS: "view_financials",
  PROCESS_REFUNDS: "process_refunds",
  VIEW_COMMISSION_REPORTS: "view_commission_reports",
  ADJUST_COMMISSIONS: "adjust_commissions",

  // Platform
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_AUDIT_LOGS: "view_audit_logs",
} as const;

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(ADMIN_PERMISSIONS),
  ADMIN: [
    ADMIN_PERMISSIONS.APPROVE_EVENTS,
    ADMIN_PERMISSIONS.REJECT_EVENTS,
    ADMIN_PERMISSIONS.SUSPEND_USERS,
    ADMIN_PERMISSIONS.VERIFY_USERS,
    ADMIN_PERMISSIONS.VIEW_FINANCIALS,
    ADMIN_PERMISSIONS.VIEW_ANALYTICS,
    ADMIN_PERMISSIONS.VIEW_COMMISSION_REPORTS,
  ],
  ORGANIZER: [],
  ATTENDEE: [],
} as const;

export const EVENT_VERIFICATION_STATUSES = {
  PENDING: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const USER_ACTIONS = {
  SUSPEND: "suspend",
  ACTIVATE: "activate",
  VERIFY_EMAIL: "verify_email",
  VERIFY_PHONE: "verify_phone",
  UPDATE_ROLE: "update_role",
} as const;

export const ANALYTICS_PERIODS = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  CUSTOM: "custom",
} as const;

export const adminSearchableFields = ["email", "firstName", "lastName", "organizationName"];

export const adminFilterableFields = [
  "searchTerm",
  "role",
  "status",
  "isActive",
  "isEmailVerified",
  "dateFrom",
  "dateTo",
];
