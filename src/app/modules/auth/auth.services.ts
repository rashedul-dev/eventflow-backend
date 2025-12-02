import bcrypt from "bcryptjs";
import crypto from "crypto";
import httpStatus from "http-status";
import { UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { config } from "../../../config";
import ApiError from "../../errors/ApiError";
import { generateAuthTokens, verifyToken, createToken } from "../../helpers/jwtHelper";

import type { IRegisterUser, ILoginUser, IAuthResponse, IAuthTokens } from "./auth.interface";
import { logger } from "../../../utils/logger";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "./emailSender";

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 6;

// Helper to hash password
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// Helper to compare passwords
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Helper to generate a secure random token
const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};
console.log(generateSecureToken);

// Register a new user
const register = async (payload: IRegisterUser): Promise<IAuthResponse> => {
  const { email, password, firstName, lastName, phone, role } = payload;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, "User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || UserRole.ATTENDEE,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isEmailVerified: true,
    },
  });

  // Generate verification token
  const verificationToken = createToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    `${VERIFICATION_TOKEN_EXPIRY_HOURS}h`
  );

  // Send verification email
  await sendVerificationEmail(user.email, verificationToken, user.firstName || undefined);

  // Generate auth tokens
  const tokens = generateAuthTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  logger.info(`User registered successfully: ${user.email}`);

  return {
    user,
    tokens,
  };
};

// Login user
const login = async (payload: ILoginUser): Promise<IAuthResponse> => {
  const { email, password } = payload;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      role: true,
      isEmailVerified: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(httpStatus.FORBIDDEN, "Account is deactivated. Please contact support.");
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate auth tokens
  const tokens = generateAuthTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  logger.info(`User logged in: ${user.email}`);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens,
  };
};

// Refresh access token
const refreshTokens = async (refreshToken: string): Promise<IAuthTokens> => {
  // Verify refresh token
  const decoded = verifyToken(refreshToken);

  if (!decoded) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
  }

  // Find token in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken || storedToken.isRevoked) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token has been revoked");
  }

  if (new Date() > storedToken.expiresAt) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token has expired");
  }

  // Revoke old refresh token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  // Generate new tokens
  const tokens = generateAuthTokens({
    userId: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
  });

  // Store new refresh token
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: storedToken.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  logger.info(`Tokens refreshed for user: ${storedToken.user.email}`);

  return tokens;
};

// Logout user
const logout = async (refreshToken: string, userId: string): Promise<void> => {
  // Revoke refresh token
  await prisma.refreshToken.updateMany({
    where: {
      token: refreshToken,
      userId,
    },
    data: { isRevoked: true },
  });

  logger.info(`User logged out: ${userId}`);
};

// Logout from all devices
const logoutAll = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });

  logger.info(`User logged out from all devices: ${userId}`);
};

// Forgot password - send reset email
const forgotPassword = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, firstName: true },
  });

  if (!user) {
    // Don't reveal if user exists
    logger.info(`Password reset requested for non-existent email: ${email}`);
    return;
  }

  // Generate reset token
  const resetToken = createToken(
    { userId: user.id, email: user.email, role: "RESET" },
    config.jwt.secret,
    `${RESET_TOKEN_EXPIRY_HOURS}h`
  );

  // Send password reset email
  await sendPasswordResetEmail(user.email, resetToken, user.firstName || undefined);

  logger.info(`Password reset email sent to: ${user.email}`);
};

// Reset password with token
const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  // Verify token
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== "RESET") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired reset token");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and revoke all refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    }),
  ]);

  logger.info(`Password reset successful for: ${user.email}`);
};

// Change password (for logged in users)
const changePassword = async (userId: string, oldPassword: string, newPassword: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, password: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Verify old password
  const isOldPasswordValid = await comparePassword(oldPassword, user.password);

  if (!isOldPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Current password is incorrect");
  }

  // Check if new password is same as old
  const isSamePassword = await comparePassword(newPassword, user.password);

  if (isSamePassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "New password must be different from current password");
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    },
  });

  logger.info(`Password changed for: ${user.email}`);
};

// Verify email
const verifyEmail = async (token: string): Promise<void> => {
  // Verify token
  const decoded = verifyToken(token);

  if (!decoded) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired verification token");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, firstName: true, isEmailVerified: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true },
  });

  // Send welcome email
  await sendWelcomeEmail(user.email, user.firstName || undefined);

  logger.info(`Email verified for: ${user.email}`);
};

// Resend verification email
const resendVerificationEmail = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, firstName: true, role: true, isEmailVerified: true },
  });

  if (!user) {
    // Don't reveal if user exists
    return;
  }

  if (user.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  // Generate new verification token
  const verificationToken = createToken(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    `${VERIFICATION_TOKEN_EXPIRY_HOURS}h`
  );

  // Send verification email
  await sendVerificationEmail(user.email, verificationToken, user.firstName || undefined);

  logger.info(`Verification email resent to: ${user.email}`);
};

// Get current user profile
const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      organizationName: true,
      organizationDesc: true,
      website: true,
      socialLinks: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

export const AuthService = {
  register,
  login,
  refreshTokens,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  getMe,
};
