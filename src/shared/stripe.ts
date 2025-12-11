import Stripe from "stripe";
import { config } from "../config";
import { logger } from "../utils/logger";

// Stripe client singleton
let stripeClient: Stripe | null = null;

// Get Stripe client instance
export const getStripeClient = (): Stripe | null => {
  if (!config.stripe.secretKey) {
    logger.warn("Stripe secret key not configured");
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
    logger.info("Stripe client initialized");
  }

  return stripeClient;
};

// Check Stripe connection health
export const checkStripeHealth = async (): Promise<{
  connected: boolean;
  error?: string;
}> => {
  const stripe = getStripeClient();

  if (!stripe) {
    return { connected: false, error: "Stripe not configured" };
  }

  try {
    // Simple API call to verify connection
    await stripe.balance.retrieve();
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Webhook signature verification
export const verifyWebhookSignature = (payload: string | Buffer, signature: string): Stripe.Event | null => {
  const stripe = getStripeClient();

  if (!stripe || !config.stripe.webhookSecret) {
    logger.error("Stripe webhook verification failed: missing configuration");
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  } catch (error) {
    logger.error("Stripe webhook signature verification failed:", error);
    return null;
  }
};

export { Stripe };
