import { Router } from "express";
import { UserController } from "./user.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserRole } from "@prisma/client";
import {
  updateProfileSchema,
  updateOrganizerProfileSchema,
  createOrganizerProfileSchema,
  getUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  deleteAccountSchema,
} from "./user.validation";

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Get all organizers (public listing)
router.get("/organizers", UserController.getAllOrganizers);

// Get organizer by ID (public profile)
router.get("/organizers/:id", UserController.getOrganizerById);

// ============================================================================
// PROTECTED ROUTES (require authentication)
// ============================================================================

// Get own profile
router.get("/profile", auth(), UserController.getProfile);

// Update own profile
router.patch("/profile", auth(), validateRequest(updateProfileSchema), UserController.updateProfile);

// Create organizer profile (upgrade to organizer)
router.post(
  "/become-organizer",
  auth(),
  // auth(UserRole.ATTENDEE),
  validateRequest(createOrganizerProfileSchema),
  UserController.createOrganizerProfile
);

// Update organizer profile
router.patch(
  "/organizer-profile",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(updateOrganizerProfileSchema),
  UserController.updateOrganizerProfile
);

// Delete own account
router.delete("/account", auth(), validateRequest(deleteAccountSchema), UserController.deleteAccount);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Get all users
router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(getUsersQuerySchema),
  UserController.getAllUsers
);

// Get user by ID
router.get("/:id", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.getUserById);

// Update user role
router.patch(
  "/:id/role",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(updateUserRoleSchema),
  UserController.updateUserRole
);

// Update user status (activate/deactivate)
router.patch(
  "/:id/status",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(updateUserStatusSchema),
  UserController.updateUserStatus
);

export default router;
