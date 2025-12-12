import PDFDocument from "pdfkit";
import httpStatus from "http-status";
import { TicketStatus, SeatStatus, UserRole, type Prisma } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { calculatePagination, createPaginatedResponse, type IPaginationOptions } from "../../helpers/paginationHelper";
import { ticketSearchableFields, ticketListSelectFields } from "./ticket.constant";
import type { ITicketFilterRequest, IPurchaseTicket, ITransferTicket, IValidateTicket } from "./ticket.interface";
import {
  generateTicketNumber,
  generateQRCode,
  generateQRCodeId,
  generateBarcode,
  generateICSContent,
  calculateTicketPrice,
} from "./ticket.utils";
import { logger } from "../../../utils/logger";
import { AppError } from "../../../utils/app-error";

// Purchase tickets
const purchaseTickets = async (userId: string, payload: IPurchaseTicket) => {
  const { eventId, ticketTypeId, quantity, attendees, seatIds, promoCode } = payload;

  // Validate event
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        select: { id: true, stripeCustomerId: true },
      },
    },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (event.status !== "APPROVED") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event is not available for ticket purchases");
  }

  if (new Date() > event.endDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event has already ended");
  }

  // Validate ticket type
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType || ticketType.eventId !== eventId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket type not found");
  }

  // Check availability
  const availableQuantity = ticketType.quantity - ticketType.quantitySold;
  if (quantity > availableQuantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Only ${availableQuantity} tickets available`);
  }

  // Check per-order limits
  if (quantity < ticketType.minPerOrder) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum ${ticketType.minPerOrder} tickets per order`);
  }

  if (quantity > ticketType.maxPerOrder) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Maximum ${ticketType.maxPerOrder} tickets per order`);
  }

  // Check sales window
  const now = new Date();
  if (ticketType.salesStartDate && now < ticketType.salesStartDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Ticket sales have not started yet");
  }

  if (ticketType.salesEndDate && now > ticketType.salesEndDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Ticket sales have ended");
  }

  // Validate seats if provided
  if (seatIds && seatIds.length > 0) {
    if (seatIds.length !== quantity) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Number of seats must match ticket quantity");
    }

    const seats = await prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        status: SeatStatus.AVAILABLE,
      },
    });

    if (seats.length !== seatIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Some selected seats are not available");
    }
  }

  // Calculate pricing
  let promoDiscount: { type: "PERCENTAGE" | "FIXED"; value: number; maxDiscount?: number } | undefined;
  let promoCodeRecord: any = null;

  if (promoCode) {
    promoCodeRecord = await prisma.promoCode.findUnique({
      where: { code: promoCode },
    });

    if (promoCodeRecord && promoCodeRecord.isActive) {
      const now = new Date();
      if (now >= promoCodeRecord.validFrom && now <= promoCodeRecord.validUntil) {
        if (!promoCodeRecord.maxUses || promoCodeRecord.usedCount < promoCodeRecord.maxUses) {
          promoDiscount = {
            type: promoCodeRecord.discountType as "PERCENTAGE" | "FIXED",
            value: Number(promoCodeRecord.discountValue),
            maxDiscount: promoCodeRecord.maxDiscount ? Number(promoCodeRecord.maxDiscount) : undefined,
          };
        }
      }
    }
  }

  const pricing = calculateTicketPrice(Number(ticketType.price), quantity, promoDiscount);

  // Create tickets in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create payment record (for paid tickets)
    let payment: any = null;
    if (ticketType.category !== "FREE" && pricing.total > 0) {
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      payment = await tx.payment.create({
        data: {
          userId,
          orderNumber,
          status: "PENDING",
          method: "STRIPE",
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          totalAmount: pricing.total,
          currency: ticketType.currency,
          promoCode: promoCode || null,
          promoDiscount: pricing.discount,
          // Platform commission (example: 5%)
          platformCommissionPct: 5,
          platformCommission: pricing.total * 0.05,
          organizerPayout: pricing.total * 0.95,
        },
      });
    }

    // Create tickets
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = generateTicketNumber();
      const qrCodeId = generateQRCodeId();
      const barcode = generateBarcode();

      const attendeeInfo = (attendees?.[i] as { name?: string; email?: string; phone?: string }) || {};
      const seatId = seatIds?.[i] || null;

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          ticketTypeId,
          eventId,
          userId,
          paymentId: payment?.id || null,
          qrCode: qrCodeId,
          barcode,
          attendeeName: attendeeInfo.name || null,
          attendeeEmail: attendeeInfo.email || null,
          attendeePhone: attendeeInfo.phone || null,
          pricePaid: Number(ticketType.price),
          currency: ticketType.currency,
          seatId,
        },
        include: {
          ticketType: {
            select: { name: true, category: true },
          },
          event: {
            select: { title: true, startDate: true, venueName: true, city: true },
          },
        },
      });

      tickets.push(ticket);

      // Mark seat as sold if applicable
      if (seatId) {
        await tx.seat.update({
          where: { id: seatId },
          data: { status: SeatStatus.SOLD },
        });
      }
    }

    // Update ticket type sold count
    await tx.ticketType.update({
      where: { id: ticketTypeId },
      data: { quantitySold: { increment: quantity } },
    });

    // Update promo code usage
    if (promoCodeRecord && promoDiscount) {
      await tx.promoCode.update({
        where: { id: promoCodeRecord.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return { tickets, payment };
  });

  logger.info(`${quantity} tickets purchased for event ${eventId} by user ${userId}`);
  return result;
};

// Get ticket by ID
const getTicketById = async (ticketId: string, userId: string, userRole: UserRole) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ticketType: true,
      event: {
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              organizationName: true,
              email: true,
            },
          },
        },
      },
      seat: {
        include: {
          section: {
            select: { name: true, color: true },
          },
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  }

  // Check authorization
  const isOwner = ticket.userId === userId;
  const isOrganizer = ticket.event.organizer.id === userId;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

  if (!isOwner && !isOrganizer && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view this ticket");
  }

  // Generate QR code image
  const qrCodeImage = ticket.qrCode ? await generateQRCode(ticket.qrCode) : null;

  return { ...ticket, qrCodeImage };
};

// Validate ticket (for check-in)
const validateTicket = async (payload: IValidateTicket) => {
  const { qrCode, ticketNumber } = payload;

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [...(qrCode ? [{ qrCode }] : []), ...(ticketNumber ? [{ ticketNumber }] : [])],
    },
    include: {
      ticketType: {
        select: { name: true, category: true },
      },
      event: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          venueName: true,
          status: true,
        },
      },
      seat: {
        include: {
          section: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!ticket) {
    return { valid: false, error: "Ticket not found" };
  }

  if (ticket.status !== TicketStatus.ACTIVE) {
    return {
      valid: false,
      error: `Ticket is ${ticket.status.toLowerCase()}`,
      ticket,
    };
  }

  if (ticket.checkedInAt) {
    return {
      valid: false,
      error: "Ticket has already been checked in",
      checkedInAt: ticket.checkedInAt,
      ticket,
    };
  }

  const now = new Date();
  const eventStart = new Date(ticket.event.startDate);
  const eventEnd = new Date(ticket.event.endDate);

  // Allow check-in 2 hours before event starts
  const checkInWindow = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000);

  if (now < checkInWindow) {
    return {
      valid: false,
      error: "Check-in is not yet available",
      checkInOpens: checkInWindow,
      ticket,
    };
  }

  if (now > eventEnd) {
    return {
      valid: false,
      error: "Event has already ended",
      ticket,
    };
  }

  return { valid: true, ticket };
};

// Check in ticket
const checkInTicket = async (
  eventId: string,
  payload: { ticketId?: string; qrCode?: string; ticketNumber?: string },
  staffUserId: string
) => {
  const { ticketId, qrCode, ticketNumber } = payload;

  const ticket = await prisma.ticket.findFirst({
    where: {
      eventId,
      OR: [
        ...(ticketId ? [{ id: ticketId }] : []),
        ...(qrCode ? [{ qrCode }] : []),
        ...(ticketNumber ? [{ ticketNumber }] : []),
      ],
    },
    include: {
      ticketType: {
        select: { name: true },
      },
    },
  });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found for this event");
  }

  if (ticket.status !== TicketStatus.ACTIVE) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Ticket is ${ticket.status.toLowerCase()}`);
  }

  if (ticket.checkedInAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Ticket has already been checked in");
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      checkedInAt: new Date(),
      checkedInBy: staffUserId,
    },
    include: {
      ticketType: {
        select: { name: true },
      },
      seat: {
        include: {
          section: {
            select: { name: true },
          },
        },
      },
    },
  });

  logger.info(`Ticket ${ticket.ticketNumber} checked in for event ${eventId}`);
  return updatedTicket;
};

// Transfer ticket
const transferTicket = async (ticketId: string, userId: string, payload: ITransferTicket) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ticketType: true,
      event: true,
    },
  });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  }

  if (ticket.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to transfer this ticket");
  }

  if (ticket.status !== TicketStatus.ACTIVE) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Only active tickets can be transferred");
  }

  if (!ticket.ticketType.isTransferable) {
    throw new ApiError(httpStatus.BAD_REQUEST, "This ticket type is not transferable");
  }

  if (ticket.checkedInAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Checked-in tickets cannot be transferred");
  }

  // Find or note recipient
  const recipient = await prisma.user.findUnique({
    where: { email: payload.recipientEmail.toLowerCase() },
  });

  // Generate new QR code for transferred ticket
  const newQRCodeId = generateQRCodeId();

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      userId: recipient?.id || ticket.userId, // Keep original if recipient not found
      originalUserId: ticket.originalUserId || userId,
      attendeeName: payload.recipientName || ticket.attendeeName,
      attendeeEmail: payload.recipientEmail.toLowerCase(),
      status: recipient ? TicketStatus.ACTIVE : TicketStatus.TRANSFERRED,
      transferredAt: new Date(),
      qrCode: newQRCodeId,
    },
  });

  // TODO: Send email notifications to both parties

  logger.info(`Ticket ${ticketId} transferred from ${userId} to ${payload.recipientEmail}`);
  return updatedTicket;
};

// Cancel ticket
const cancelTicket = async (ticketId: string, userId: string, userRole: UserRole, _reason?: string) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: true,
      ticketType: true,
      seat: true,
    },
  });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  }

  // Check authorization
  const isOwner = ticket.userId === userId;
  const isOrganizer = ticket.event.organizerId === userId;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

  if (!isOwner && !isOrganizer && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to cancel this ticket");
  }

  if (ticket.status !== TicketStatus.ACTIVE) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Ticket is already ${ticket.status.toLowerCase()}`);
  }

  if (ticket.checkedInAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Checked-in tickets cannot be cancelled");
  }

  await prisma.$transaction(async (tx) => {
    // Cancel the ticket
    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CANCELLED },
    });

    // Release the seat if applicable
    if (ticket.seatId) {
      await tx.seat.update({
        where: { id: ticket.seatId },
        data: { status: SeatStatus.AVAILABLE },
      });
    }

    // Update ticket type sold count
    await tx.ticketType.update({
      where: { id: ticket.ticketTypeId },
      data: { quantitySold: { decrement: 1 } },
    });
  });

  // TODO: Process refund if applicable

  logger.info(`Ticket ${ticketId} cancelled`);
};

// Get user's tickets
const getUserTickets = async (
  userId: string,
  paginationOptions: IPaginationOptions,
  filters?: ITicketFilterRequest
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereInput: Prisma.TicketWhereInput = {
    userId,
    ...(filters?.status && { status: filters.status }),
    ...(filters?.eventId && { eventId: filters.eventId }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: ticketListSelectFields,
    }),
    prisma.ticket.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(tickets, total, { page, limit, skip, sortBy, sortOrder });
};

// Get event tickets (for organizer)
const getEventTickets = async (
  eventId: string,
  organizerId: string,
  paginationOptions: IPaginationOptions,
  filters?: ITicketFilterRequest
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view tickets for this event");
  }

  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);
  const { searchTerm, checkedIn, ...filterData } = filters || {};

  const whereConditions: Prisma.TicketWhereInput[] = [{ eventId }];

  if (searchTerm) {
    whereConditions.push({
      OR: ticketSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as Prisma.QueryMode,
        },
      })),
    });
  }

  if (checkedIn !== undefined) {
    whereConditions.push({
      checkedInAt: checkedIn ? { not: null } : null,
    });
  }

  if (Object.keys(filterData).length > 0) {
    whereConditions.push(filterData as Prisma.TicketWhereInput);
  }

  const whereInput: Prisma.TicketWhereInput = { AND: whereConditions };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        ...ticketListSelectFields,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.ticket.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(tickets, total, { page, limit, skip, sortBy, sortOrder });
};

// Generate calendar file
const generateCalendarFile = async (ticketId: string, userId: string) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        include: {
          organizer: {
            select: {
              firstName: true,
              lastName: true,
              organizationName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket not found");
  }

  if (ticket.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized");
  }

  const event = ticket.event;
  const organizerName = event.organizer.organizationName || `${event.organizer.firstName} ${event.organizer.lastName}`;

  const location = event.isVirtual
    ? event.virtualLink || "Virtual Event"
    : [event.venueName, event.venueAddress, event.city, event.state, event.country].filter(Boolean).join(", ");

  const icsContent = generateICSContent({
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location,
    virtualLink: event.virtualLink || undefined,
    organizerName,
    organizerEmail: event.organizer.email,
  });

  return {
    filename: `${event.slug}-ticket.ics`,
    content: icsContent,
    contentType: "text/calendar",
  };
};

// Bulk check-in
const bulkCheckIn = async (eventId: string, ticketIds: string[], staffUserId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  const result = await prisma.ticket.updateMany({
    where: {
      id: { in: ticketIds },
      eventId,
      status: TicketStatus.ACTIVE,
      checkedInAt: null,
    },
    data: {
      checkedInAt: new Date(),
      checkedInBy: staffUserId,
    },
  });

  logger.info(`Bulk check-in: ${result.count} tickets for event ${eventId}`);
  return { checkedIn: result.count };
};

// const generateTicketPdf = async (ticketId: string, requesterId: string): Promise<Buffer> => {
//   // 1.  Fetch ticket with event & owner
//   const ticket = await prisma.ticket.findUnique({
//     where: { id: ticketId },
//     include: {
//       event: true,
//       user: true,
//       ticketType: true,
//     },
//   });

//   if (!ticket) throw new AppError("Ticket not found", httpStatus.NOT_FOUND);
//   if (ticket.userId !== requesterId) throw new AppError("You are not the owner of this ticket", httpStatus.FORBIDDEN);

//   // 2.  Build PDF in memory
//   const doc = new PDFDocument({ margin: 50 });
//   const chunks: Buffer[] = [];

//   doc.on("data", (chunk) => chunks.push(chunk));
//   doc.on("end", () => {}); // we await the finish event below

//   // Header
//   doc.fontSize(20).text("EventFlow Ticket", 0, 50, { align: "center" }).moveDown();

//   // Event info
//   doc.fontSize(14).text(`Event: ${ticket.event.title}`);
//   doc.text(`Date   : ${ticket.event.startDate.toDateString()}`);
//   doc.text(`Venue  : ${ticket.event.venueAddress}`);
//   doc.moveDown();

//   // Ticket info
//   doc.fontSize(12);
//   doc.text(`Ticket # : ${ticket.ticketNumber}`);
//   doc.text(`Type     : ${ticket.ticketType.name}`);
//   doc.text(`Owner    : ${ticket.user.firstName} (${ticket.user.email})`);

//   // QR placeholder (you can swap with real data-url later)
//   doc.moveDown().text("QR-CODE Placeholder", { align: "center" });

//   doc.end();

//   // 3.  Return buffer
//   return new Promise<Buffer>((resolve, reject) => {
//     doc.on("end", () => resolve(Buffer.concat(chunks)));
//     doc.on("error", reject);
//   });
// };

import QRCode from "qrcode";

export const generateTicketPdf = async (ticketId: string, requesterId: string): Promise<Buffer> => {
  /* ---------- 1. fetch ticket ---------- */
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: true,
      user: true,
      ticketType: true,
    },
  });

  if (!ticket) throw new AppError("Ticket not found", httpStatus.NOT_FOUND);
  if (ticket.userId !== requesterId) throw new AppError("Forbidden – not your ticket", httpStatus.FORBIDDEN);

  /* ---------- 2. generate QR ---------- */
  const qrData = `${process.env.API_BASE_URL}/api/v1/tickets/validate/${ticket.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  /* ---------- 3. create PDF ---------- */
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];

  doc.on("data", (c) => chunks.push(c));

  /* ---------- Design System Colors ---------- */
  const colors = {
    primary: "#08CB00",
    secondary: "#253900",
    background: "#000000",
    text: "#EEEEEE",
    white: "#FFFFFF",
    darkGray: "#1A1A1A",
    mediumGray: "#666666",
  };

  /* ---------- Page Background ---------- */
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.background);

  /* ---------- Header Section ---------- */
  // Top accent stripe
  doc.rect(0, 0, doc.page.width, 8).fill(colors.primary);

  // Header background with gradient effect
  doc.rect(0, 8, doc.page.width, 100).fill(colors.darkGray);

  // EventFlow branding
  doc.fillColor(colors.primary).fontSize(32).font("Helvetica-Bold").text("EVENTFLOW", 50, 35);

  doc.fillColor(colors.text).fontSize(11).font("Helvetica").text("ELECTRONIC TICKET", 50, 72);

  // Ticket number in header (right side)
  doc
    .fillColor(colors.mediumGray)
    .fontSize(9)
    .text("TICKET #", doc.page.width - 180, 40, { width: 130, align: "right" });

  doc
    .fillColor(colors.primary)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(ticket.ticketNumber.toUpperCase(), doc.page.width - 180, 55, { width: 130, align: "right" });

  /* ---------- Main Content Container ---------- */
  const contentStartY = 130;
  const leftColumn = 50;
  const rightColumn = doc.page.width - 250;

  /* ---------- Event Name (Prominent) ---------- */
  doc
    .fillColor(colors.white)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(ticket.event.title.toUpperCase(), leftColumn, contentStartY, {
      width: doc.page.width - 320,
      lineGap: 4,
    });

  /* ---------- Date & Time Section ---------- */
  let currentY = doc.y + 30;

  doc.fillColor(colors.primary).fontSize(10).font("Helvetica-Bold").text("DATE & TIME", leftColumn, currentY);

  doc
    .fillColor(colors.text)
    .fontSize(11)
    .font("Helvetica")
    .text(
      ticket.event.startDate.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      leftColumn,
      currentY + 18
    );

  doc.text(
    ticket.event.startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    leftColumn,
    currentY + 35
  );

  /* ---------- Venue Section ---------- */
  currentY += 75;

  doc.fillColor(colors.primary).fontSize(10).font("Helvetica-Bold").text("VENUE", leftColumn, currentY);

  doc
    .fillColor(colors.text)
    .fontSize(11)
    .font("Helvetica")
    .text(ticket.event.venueAddress ?? "To be announced", leftColumn, currentY + 18, {
      width: doc.page.width - 320,
    });

  /* ---------- Ticket Type ---------- */
  currentY += 70;

  doc.fillColor(colors.primary).fontSize(10).font("Helvetica-Bold").text("TICKET TYPE", leftColumn, currentY);

  doc
    .fillColor(colors.text)
    .fontSize(11)
    .font("Helvetica")
    .text(ticket.ticketType.name, leftColumn, currentY + 18);

  /* ---------- Ticket Holder ---------- */
  currentY += 60;

  doc.fillColor(colors.primary).fontSize(10).font("Helvetica-Bold").text("TICKET HOLDER", leftColumn, currentY);

  const holderName = `${ticket.user.firstName ?? ""} ${ticket.user.lastName ?? ""}`.trim() || "Guest";
  doc
    .fillColor(colors.text)
    .fontSize(11)
    .font("Helvetica")
    .text(holderName, leftColumn, currentY + 18);

  doc
    .fillColor(colors.mediumGray)
    .fontSize(9)
    .text(ticket.user.email, leftColumn, currentY + 36);

  /* ---------- QR Code Section (Right Side) ---------- */
  const qrContainerY = contentStartY;
  const qrSize = 200;
  const qrX = rightColumn;

  // QR background container
  doc.rect(qrX - 15, qrContainerY - 15, qrSize + 30, qrSize + 60).fill(colors.white);

  // QR code
  doc.image(qrDataUrl, qrX, qrContainerY, { width: qrSize });

  // QR instruction
  doc
    .fillColor(colors.mediumGray)
    .fontSize(8)
    .font("Helvetica")
    .text("SCAN AT ENTRANCE", qrX, qrContainerY + qrSize + 15, {
      width: qrSize,
      align: "center",
    });

  /* ---------- Barcode Section ---------- */
  const barcodeY = doc.page.height - 180;

  // Barcode background strip
  doc.rect(0, barcodeY - 20, doc.page.width, 100).fill(colors.darkGray);

  // Visual barcode representation
  doc.fillColor(colors.white).fontSize(9).text("BARCODE", 0, barcodeY, { width: doc.page.width, align: "center" });

  doc
    .font("Courier-Bold")
    .fontSize(16)
    .fillColor(colors.primary)
    .text(`|||  ${ticket.barcode}  |||`, 0, barcodeY + 20, {
      width: doc.page.width,
      align: "center",
      characterSpacing: 3,
    });

  /* ---------- Footer ---------- */
  const footerY = doc.page.height - 60;

  doc
    .fillColor(colors.mediumGray)
    .fontSize(8)
    .font("Helvetica")
    .text("This ticket is valid for single entry only. Duplication or resale is prohibited.", 50, footerY, {
      width: doc.page.width - 100,
      align: "center",
      lineGap: 2,
    });

  doc.fontSize(7).text(`Ticket ID: ${ticket.id}`, 50, footerY + 25, {
    width: doc.page.width - 100,
    align: "center",
  });

  // Bottom accent stripe
  doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(colors.primary);

  doc.end();

  /* ---------- 4. return buffer ---------- */
  return new Promise<Buffer>((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });
};
export const TicketService = {
  purchaseTickets,
  getTicketById,
  validateTicket,
  checkInTicket,
  transferTicket,
  cancelTicket,
  getUserTickets,
  getEventTickets,
  generateCalendarFile,
  bulkCheckIn,
  generateTicketPdf,
};
