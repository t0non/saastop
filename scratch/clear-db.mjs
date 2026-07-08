import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://esxdbcprsndtdxyomvpj.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeGRiY3Byc25kdGR4eW9tdnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzE3NCwiZXhwIjoyMDk5MDI5MTc0fQ.OUBz0TDQspH7XRDPWsXZqGXVTG0NoVozUjNqT9mwHVk";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const orgId = "empresa-1";
  console.log("🧹 Iniciando limpeza do banco de dados...");

  try {
    // 1. Deletar mensagens
    console.log("Deletando mensagens...");
    const { error: msgErr } = await supabase
      .from("messages")
      .delete()
      .eq("organization_id", orgId);
    if (msgErr) console.warn("Aviso ao deletar mensagens:", msgErr.message);

    // 2. Deletar conversas
    console.log("Deletando conversas...");
    const { error: convErr } = await supabase
      .from("conversations")
      .delete()
      .eq("organization_id", orgId);
    if (convErr) console.warn("Aviso ao deletar conversas:", convErr.message);

    // 3. Deletar leads
    console.log("Deletando leads...");
    const { error: leadErr } = await supabase
      .from("leads")
      .delete()
      .eq("organization_id", orgId);
    if (leadErr) console.warn("Aviso ao deletar leads:", leadErr.message);

    // 4. Deletar contatos
    console.log("Deletando contatos...");
    const { error: contactErr } = await supabase
      .from("contacts")
      .delete()
      .eq("organization_id", orgId);
    if (contactErr) console.warn("Aviso ao deletar contatos:", contactErr.message);

    // 5. Deletar conexões de whatsapp
    console.log("Deletando conexões de whatsapp...");
    const { error: connErr } = await supabase
      .from("whatsapp_connections")
      .delete()
      .eq("organization_id", orgId);
    if (connErr) console.warn("Aviso ao deletar conexões:", connErr.message);

    console.log("✅ Banco de dados limpo com sucesso!");
  } catch (err) {
    console.error("Erro durante a limpeza do banco:", err);
  }
}

run();
