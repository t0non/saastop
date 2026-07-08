import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    envVars[key] = val;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const commonTables = ["members", "memberships", "organization_memberships", "user_organizations", "profiles", "users"];
  for (const table of commonTables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        console.log(`Table ${table} exists? No: ${error.message}`);
      } else {
        console.log(`Table ${table} exists? Yes!`);
      }
    } catch (e) {
      console.log(`Table ${table} check threw: ${e.message}`);
    }
  }
}

run();
