import { Router } from "express";
import { AuthController } from "./auth.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "./auth.validation";

const router = Router();

// Public routes
router.post("/register", validateRequest(registerSchema), AuthController.register);

router.post("/login", validateRequest(loginSchema), AuthController.login);

router.post("/refresh-token", validateRequest(refreshTokenSchema), AuthController.refreshToken);

router.post("/forgot-password", validateRequest(forgotPasswordSchema), AuthController.forgotPassword);

router.post("/reset-password", validateRequest(resetPasswordSchema), AuthController.resetPassword);

router.get("/verify-email", AuthController.verifyEmail);

router.post("/verify-email", validateRequest(verifyEmailSchema), AuthController.verifyEmail);

router.post("/resend-verification", validateRequest(resendVerificationSchema), AuthController.resendVerificationEmail);

// Protected routes (require authentication)
router.post("/logout", auth(), AuthController.logout);

router.post("/logout-all", auth(), AuthController.logoutAll);

router.post("/change-password", auth(), validateRequest(changePasswordSchema), AuthController.changePassword);

router.get("/me", auth(), AuthController.getMe);

export default router;
