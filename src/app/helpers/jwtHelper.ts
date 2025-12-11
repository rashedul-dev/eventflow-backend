import jwt, { type Secret, type JwtPayload, type SignOptions } from "jsonwebtoken";
import { config } from "../../config";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Creates a JWT access token
 */
export const createToken = (
  payload: TokenPayload,
  secret: Secret = config.jwt.secret,
  expiresIn: SignOptions["expiresIn"] = config.jwt.expiresIn as SignOptions["expiresIn"]
): string => {
  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: "HS256",
  });
};

/**
 * Creates a JWT refresh token with longer expiry
 */
export const createRefreshToken = (
  payload: TokenPayload,
  secret: Secret = config.jwt.secret,
  expiresIn: SignOptions["expiresIn"] = config.jwt.refreshExpiresIn as SignOptions["expiresIn"]
): string => {
  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: "HS256",
  });
};

/**
 * Verifies and decodes a JWT token
 */
export const verifyToken = (token: string, secret: Secret = config.jwt.secret): DecodedToken | null => {
  try {
    const decoded = jwt.verify(token, secret) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Decodes a token without verification (useful for expired tokens)
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Generates both access and refresh tokens
 */
export const generateAuthTokens = (payload: TokenPayload): { accessToken: string; refreshToken: string } => {
  const accessToken = createToken(payload);
  const refreshToken = createRefreshToken(payload);

  return { accessToken, refreshToken };
};
