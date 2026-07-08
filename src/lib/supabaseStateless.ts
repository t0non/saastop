import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Try loading from .env file directly for standalone script runners or local server
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    envFile.split("\n").forEach(line => {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        if (key === "NEXT_PUBLIC_SUPABASE_URL") {
          supabaseUrl = val;
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          process.env.SUPABASE_SERVICE_ROLE_KEY = val;
          supabaseKey = val;
        }
        if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && !supabaseKey) {
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = val;
          supabaseKey = val;
        }
        if (key === "UAZAPI_INSTANCE_TOKEN") {
          process.env.UAZAPI_INSTANCE_TOKEN = val;
        }
      }
    });
  }
} catch {
  // Ignore loading errors
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Service role client bypasses RLS on the server safely
export const supabaseStateless = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
