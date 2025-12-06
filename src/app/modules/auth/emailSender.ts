import nodemailer from "nodemailer"
import { config } from "../../../config"
import { logger } from "../../../utils/logger"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Create transporter
const createTransporter = () => {
  if (!config.email.host || !config.email.user || !config.email.password) {
    logger.warn("Email configuration incomplete - emails will be logged only")
    return null
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port || 587,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  })
}

const transporter = createTransporter()

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    if (!transporter) {
      // Log email in development when SMTP is not configured
      logger.info(`[DEV EMAIL] To: ${options.to}, Subject: ${options.subject}`)
      logger.debug(`[DEV EMAIL] Content: ${options.text || options.html}`)
      return true
    }

    await transporter.sendMail({
      from: config.email.from || `"EventFlow" <noreply@eventflow.com>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    logger.info(`Email sent successfully to ${options.to}`)
    return true
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error)
    return false
  }
}

// Email Templates
export const sendVerificationEmail = async (email: string, token: string, firstName?: string): Promise<boolean> => {
  const verificationUrl = `${config.apiBaseUrl}/api/v1/auth/verify-email?token=${token}`
  const name = firstName || "there"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">EventFlow</h1>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for signing up for EventFlow! Please verify your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #4F46E5; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} EventFlow. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Hi ${name},
    
    Thank you for signing up for EventFlow! Please verify your email address by clicking the link below:
    
    ${verificationUrl}
    
    This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    
    Best regards,
    The EventFlow Team
  `

  return sendEmail({
    to: email,
    subject: "Verify Your Email - EventFlow",
    html,
    text,
  })
}

export const sendPasswordResetEmail = async (email: string, token: string, firstName?: string): Promise<boolean> => {
  const resetUrl = `${config.apiBaseUrl}/reset-password?token=${token}`
  const name = firstName || "there"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">EventFlow</h1>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #4F46E5; font-size: 14px; word-break: break-all;">
            ${resetUrl}
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} EventFlow. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Hi ${name},
    
    We received a request to reset your password. Click the link below to create a new password:
    
    ${resetUrl}
    
    This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
    
    Best regards,
    The EventFlow Team
  `

  return sendEmail({
    to: email,
    subject: "Reset Your Password - EventFlow",
    html,
    text,
  })
}

export const sendWelcomeEmail = async (email: string, firstName?: string): Promise<boolean> => {
  const name = firstName || "there"
  const loginUrl = `${config.apiBaseUrl}/login`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to EventFlow</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Welcome to EventFlow!</h1>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Your email has been verified and your account is now active. You're all set to start discovering and creating amazing events!
          </p>
          
          <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What you can do with EventFlow:</h3>
            <ul style="color: #666; font-size: 14px; line-height: 1.8;">
              <li>Browse and discover events near you</li>
              <li>Purchase tickets securely</li>
              <li>Create and manage your own events</li>
              <li>Track your event history</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Get Started
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} EventFlow. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Hi ${name},
    
    Your email has been verified and your account is now active. You're all set to start discovering and creating amazing events!
    
    What you can do with EventFlow:
    - Browse and discover events near you
    - Purchase tickets securely
    - Create and manage your own events
    - Track your event history
    
    Get started at: ${loginUrl}
    
    Best regards,
    The EventFlow Team
  `

  return sendEmail({
    to: email,
    subject: "Welcome to EventFlow!",
    html,
    text,
  })
}
