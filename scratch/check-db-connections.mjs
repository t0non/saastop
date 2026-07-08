import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://esxdbcprsndtdxyomvpj.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeGRiY3Byc25kdGR4eW9tdnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzE3NCwiZXhwIjoyMDk5MDI5MTc0fQ.OUBz0TDQspH7XRDPWsXZqGXVTG0NoVozUjNqT9mwHVk";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data, error } = await supabase
    .from("whatsapp_connections")
    .select("*");
  
  if (error) {
    console.error("Database query error:", error);
  } else {
    console.log("Connections currently in database:", JSON.stringify(data, null, 2));
  }
}

run();
