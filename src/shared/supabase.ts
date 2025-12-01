import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { config } from "../config"
import { logger } from "../utils/logger"

// Supabase client singleton
let supabaseClient: SupabaseClient | null = null
let supabaseAdmin: SupabaseClient | null = null

// Create Supabase client for general use (uses anon key)
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!config.supabase.url || !config.supabase.anonKey) {
    logger.warn("Supabase credentials not configured")
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    })
    logger.info("Supabase client initialized")
  }

  return supabaseClient
}

// Create Supabase admin client (uses service role key - bypasses RLS)
export const getSupabaseAdmin = (): SupabaseClient | null => {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    logger.warn("Supabase admin credentials not configured")
    return null
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    logger.info("Supabase admin client initialized")
  }

  return supabaseAdmin
}

// Check Supabase connection health
export const checkSupabaseHealth = async (): Promise<{
  connected: boolean
  error?: string
}> => {
  const client = getSupabaseClient()

  if (!client) {
    return { connected: false, error: "Supabase not configured" }
  }

  try {
    // Simple health check query
    const { error } = await client.from("_health_check").select("*").limit(1).maybeSingle()

    // If table doesn't exist, that's fine - Supabase is still connected
    if (error && !error.message.includes("does not exist")) {
      return { connected: false, error: error.message }
    }

    return { connected: true }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { SupabaseClient }
