// ============================================================================
// FILE: backend/src/app/modules/notification/email.service.ts
// ============================================================================

import nodemailer from "nodemailer";
import { config } from "../../../config";
import { logger } from "../../../utils/logger";
import type { ISendEmail } from "./notification.interface";

const transporter = config.email.host
  ? nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    })
  : null;

/**
 * Send email
 */
export const sendEmail = async (payload: ISendEmail): Promise<boolean> => {
  if (!transporter) {
    logger.warn(`[DEV] Email would be sent to ${payload.to}: ${payload.subject}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: config.email.from || "EventFlow <noreply@eventflow.com>",
      to: payload.to,
      subject: payload.subject,
      html: generateEmailHTML(payload.template, payload.data),
    });

    logger.info(`Email sent to ${payload.to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email:`, error);
    return false;
  }
};

/**
 * Generate email HTML from template
 */
const generateEmailHTML = (template: string, data: any): string => {
  // In production, use a proper template engine
  switch (template) {
    case "ticket_confirmation":
      return `
        <h1>Your Tickets for ${data.eventTitle}</h1>
        <p>Hi ${data.userName},</p>
        <p>Your tickets have been confirmed!</p>
        <h2>Event Details</h2>
        <p>Date: ${new Date(data.eventDate).toLocaleString()}</p>
        <h2>Your Tickets</h2>
        ${data.tickets.map((t: any) => `<p>${t.type}: ${t.ticketNumber}</p>`).join("")}
      `;
    case "event_cancelled":
      return `
        <h1>Event Cancelled</h1>
        <p>Hi ${data.userName},</p>
        <p>We regret to inform you that "${data.eventTitle}" has been cancelled.</p>
        <p>Your refund will be processed within 5-7 business days.</p>
      `;
    default:
      return "<p>Notification from EventFlow</p>";
  }
};
