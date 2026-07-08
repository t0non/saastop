// src/lib/supabase.ts
// Unified browser Supabase access layer
// Re-exports the browser client and environment status.
//
// Usage:
//   Client component:  import { getBrowserClient } from "@/lib/supabase";
//   Server component:  import { getServerClient } from "@/lib/supabaseServer";
//   Check availability: import { isSupabaseConfigured } from "@/lib/supabase";

export { getBrowserClient } from "./supabaseClient";
export { isSupabaseConfigured } from "./env";
