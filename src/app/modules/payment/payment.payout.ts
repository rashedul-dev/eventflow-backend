// ============================================================================
// FILE: backend/src/app/modules/payment/payment.payout.ts
// ============================================================================

import { getStripeClient } from "../../../shared/stripe";
import prisma from "../../../shared/prisma";
import { logger } from "../../../utils/logger";
import { PAYOUT_SCHEDULE } from "./payment.constant";
import { calculatePayoutDate } from "./payment.utils";

const stripe = getStripeClient();

if (!stripe) {
  throw new Error("Stripe is not configured");
}

/**
 * Schedule payout for an event after completion
 */
export const scheduleEventPayout = async (eventId: string): Promise<void> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        select: {
          id: true,
          email: true,
          stripeCustomerId: true,
        },
      },
    },
  });

  if (!event) {
    logger.error(`Event not found: ${eventId}`);
    return;
  }

  // Check if event has ended
  if (new Date() < event.endDate) {
    logger.info(`Event ${eventId} has not ended yet`);
    return;
  }

  // Calculate total payout amount for this event
  const payments = await prisma.payment.findMany({
    where: {
      tickets: {
        some: { eventId },
      },
      status: "COMPLETED",
    },
  });

  const totalPayout = payments.reduce((sum, payment) => sum + Number(payment.organizerPayout), 0);

  if (totalPayout < PAYOUT_SCHEDULE.MINIMUM_AMOUNT) {
    logger.info(`Payout amount ${totalPayout} below minimum for event ${eventId}`);
    return;
  }

  // Calculate payout date
  const payoutDate = calculatePayoutDate(event.endDate, PAYOUT_SCHEDULE.DAYS_AFTER_EVENT);

  // Create Stripe Connect transfer (if using Stripe Connect)
  // For now, we'll log the payout details
  logger.info(`Payout scheduled for event ${eventId}:`, {
    organizerId: event.organizer.id,
    amount: totalPayout,
    currency: "USD",
    scheduledDate: payoutDate,
    paymentCount: payments.length,
  });

  // Update payment records with payout status
  await prisma.payment.updateMany({
    where: {
      tickets: {
        some: { eventId },
      },
      status: "COMPLETED",
      payoutStatus: null,
    },
    data: {
      payoutStatus: "SCHEDULED",
      payoutDate,
    },
  });
};

/**
 * Process scheduled payouts (run as cron job)
 */
export const processScheduledPayouts = async (): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find payments scheduled for payout today
  const paymentsForPayout = await prisma.payment.findMany({
    where: {
      payoutStatus: "SCHEDULED",
      payoutDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      tickets: {
        include: {
          event: {
            include: {
              organizer: true,
            },
          },
        },
      },
    },
  });

  logger.info(`Processing ${paymentsForPayout.length} scheduled payouts`);

  // Group by organizer and event
  const payoutsByOrganizer = new Map<
    string,
    { organizer: any; events: Map<string, { event: any; amount: number; paymentIds: string[] }> }
  >();

  for (const payment of paymentsForPayout) {
    const event = payment.tickets[0]?.event;
    if (!event) continue;

    const organizerId = event.organizer.id;

    if (!payoutsByOrganizer.has(organizerId)) {
      payoutsByOrganizer.set(organizerId, {
        organizer: event.organizer,
        events: new Map(),
      });
    }

    const organizerData = payoutsByOrganizer.get(organizerId)!;

    if (!organizerData.events.has(event.id)) {
      organizerData.events.set(event.id, {
        event,
        amount: 0,
        paymentIds: [],
      });
    }

    const eventData = organizerData.events.get(event.id)!;
    eventData.amount += Number(payment.organizerPayout);
    eventData.paymentIds.push(payment.id);
  }

  // Process each organizer's payouts
  for (const [organizerId, data] of payoutsByOrganizer) {
    try {
      await processOrganizerPayout(organizerId, data);
    } catch (error) {
      logger.error(`Failed to process payout for organizer ${organizerId}:`, error);
    }
  }
};

/**
 * Process payout for a specific organizer
 */
const processOrganizerPayout = async (
  organizerId: string,
  data: { organizer: any; events: Map<string, { event: any; amount: number; paymentIds: string[] }> }
): Promise<void> => {
  const { events } = data;

  // Calculate total payout across all events
  let totalAmount = 0;
  const allPaymentIds: string[] = [];

  for (const [, eventData] of events) {
    totalAmount += eventData.amount;
    allPaymentIds.push(...eventData.paymentIds);
  }

  logger.info(`Processing payout for organizer ${organizerId}: ${totalAmount}`);

  // Here you would integrate with Stripe Connect to transfer funds
  // For now, we'll update the payment records

  try {
    await prisma.payment.updateMany({
      where: {
        id: { in: allPaymentIds },
      },
      data: {
        payoutStatus: "PAID",
        // You would set stripePayoutId here from actual transfer
      },
    });

    logger.info(`Payout completed for organizer ${organizerId}`);
  } catch (error) {
    // Mark as failed
    await prisma.payment.updateMany({
      where: {
        id: { in: allPaymentIds },
      },
      data: {
        payoutStatus: "FAILED",
      },
    });

    throw error;
  }
};

/**
 * Get payout summary for organizer
 */
export const getOrganizerPayoutSummary = async (organizerId: string) => {
  // Completed but not yet paid out
  const pendingPayouts = await prisma.payment.aggregate({
    where: {
      tickets: {
        some: {
          event: {
            organizerId,
          },
        },
      },
      status: "COMPLETED",
      payoutStatus: {
        in: ["SCHEDULED"],
      },
      OR: [
        {
          payoutStatus: null,
        },
      ],
    },
    _sum: {
      organizerPayout: true,
    },
    _count: true,
  });

  // Already paid out
  const paidPayouts = await prisma.payment.aggregate({
    where: {
      tickets: {
        some: {
          event: {
            organizerId,
          },
        },
      },
      status: "COMPLETED",
      payoutStatus: "PAID",
    },
    _sum: {
      organizerPayout: true,
    },
    _count: true,
  });

  // In transit
  const inTransitPayouts = await prisma.payment.aggregate({
    where: {
      tickets: {
        some: {
          event: {
            organizerId,
          },
        },
      },
      status: "COMPLETED",
      payoutStatus: "IN_TRANSIT",
    },
    _sum: {
      organizerPayout: true,
    },
    _count: true,
  });

  return {
    pending: {
      amount: Number(pendingPayouts._sum.organizerPayout || 0),
      count: pendingPayouts._count,
    },
    inTransit: {
      amount: Number(inTransitPayouts._sum.organizerPayout || 0),
      count: inTransitPayouts._count,
    },
    paid: {
      amount: Number(paidPayouts._sum.organizerPayout || 0),
      count: paidPayouts._count,
    },
    total: {
      amount:
        Number(pendingPayouts._sum.organizerPayout || 0) +
        Number(inTransitPayouts._sum.organizerPayout || 0) +
        Number(paidPayouts._sum.organizerPayout || 0),
    },
  };
};
