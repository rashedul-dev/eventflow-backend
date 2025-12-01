import type { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import ApiError from "../errors/ApiError";
import { verifyToken } from "../helpers/jwtHelper";
import { prisma } from "../../shared/prisma";

export type UserRole = "USER" | "ORGANIZER" | "ADMIN" | "SUPER_ADMIN";

const auth = (...requiredRoles: UserRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Missing authorization header");
      }

      // ✔ Accept both:
      //    - "Bearer <token>"
      //    - "<token>"
      let token = authHeader;

      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1]; // extract after Bearer
      }

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Token not provided");
      }

      // Verify token
      const decoded = verifyToken(token);

      if (!decoded) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired token");
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
      }

      // Check role permissions
      if (requiredRoles.length && !requiredRoles.includes(user.role as UserRole)) {
        throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
      }

      // Attach user info
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
