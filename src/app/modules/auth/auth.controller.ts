import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.services";

// Register new user
const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Registration successful. Please check your email to verify your account.",
    data: result,
  });
});

// Login user
const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful",
    data: result,
  });
});

// Refresh tokens
const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await AuthService.refreshTokens(refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tokens refreshed successfully",
    data: result,
  });
});

// Logout user
const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const userId = req.user?.userId;

  if (userId && refreshToken) {
    await AuthService.logout(refreshToken, userId);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logout successful",
    data: null,
  });
});

// Logout from all devices
const logoutAll = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (userId) {
    await AuthService.logoutAll(userId);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out from all devices successfully",
    data: null,
  });
});

// Forgot password
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AuthService.forgotPassword(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "If an account with that email exists, we have sent a password reset link.",
    data: null,
  });
});

// Reset password
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  await AuthService.resetPassword(token, password);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successful. You can now login with your new password.",
    data: null,
  });
});

// Change password
const changePassword = catchAsync(async (req: Request, res: Response) => {
  console.log(req.user);
  const userId = req.user?.userId as string;
  const { oldPassword, newPassword } = req.body;

  if (!userId) {
    throw new Error("User ID is missing");
  }

  await AuthService.changePassword(userId, oldPassword, newPassword);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
    data: null,
  });
});

// Verify email
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.body.token;
  await AuthService.verifyEmail(token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email verified successfully. Welcome to EventFlow!",
    data: null,
  });
});

// Resend verification email
const resendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AuthService.resendVerificationEmail(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "If your email is registered and not verified, we have sent a new verification link.",
    data: null,
  });
});

// Get current user profile
const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await AuthService.getMe(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

export const AuthController = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  getMe,
};
