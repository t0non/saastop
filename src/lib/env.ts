// src/lib/env.ts
// Validate environment variables using Zod
// In development, missing vars will log a warning instead of crashing the app
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

function validateEnv() {
  const result = EnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    console.warn(
      "[env] ⚠️  Supabase environment variables are missing or invalid. " +
        "The app will run in mock-data mode. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env to enable Supabase."
    );
    return null;
  }

  return result.data;
}

export const env = validateEnv();

/** Whether Supabase is properly configured and mock mode is not forced */
export const isSupabaseConfigured = env !== null && process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA !== "true";
