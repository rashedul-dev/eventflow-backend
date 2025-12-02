import type { UserRole } from "@prisma/client"

export interface IRegisterUser {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: UserRole
}

export interface ILoginUser {
  email: string
  password: string
}

export interface IAuthTokens {
  accessToken: string
  refreshToken: string
}

export interface IAuthResponse {
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    role: UserRole
    isEmailVerified: boolean
  }
  tokens: IAuthTokens
}

export interface IRefreshTokenPayload {
  refreshToken: string
}

export interface IForgotPasswordPayload {
  email: string
}

export interface IResetPasswordPayload {
  token: string
  password: string
}

export interface IChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

export interface IVerifyEmailPayload {
  token: string
}
