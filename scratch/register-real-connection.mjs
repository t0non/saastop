import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://esxdbcprsndtdxyomvpj.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeGRiY3Byc25kdGR4eW9tdnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzE3NCwiZXhwIjoyMDk5MDI5MTc0fQ.OUBz0TDQspH7XRDPWsXZqGXVTG0NoVozUjNqT9mwHVk";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const orgId = "empresa-1";

  // Clean up any existing connection for pilot simplicity
  await supabase
    .from("whatsapp_connections")
    .delete()
    .eq("organization_id", orgId);

  const payload = {
    organization_id: orgId,
    provider: "uazapi",
    connection_name: "WhatsApp Principal",
    base_url: "https://free.uazapi.com",
    instance_name: "teste",
    instance_token: "d14056f5-787b-4c6b-922f-607b671718a8",
    owner_phone: "553199384130",
    status: "connected",
    connected_at: new Date().toISOString(),
    last_health_check_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("whatsapp_connections")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error registering real connection:", error);
  } else {
    console.log("Successfully registered real connection in DB:", JSON.stringify(data, null, 2));
  }
}

run();
