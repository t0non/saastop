import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://esxdbcprsndtdxyomvpj.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeGRiY3Byc25kdGR4eW9tdnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzE3NCwiZXhwIjoyMDk5MDI5MTc0fQ.OUBz0TDQspH7XRDPWsXZqGXVTG0NoVozUjNqT9mwHVk";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("🧪 Testando operação completa de conexão WhatsApp...\n");

  // Simula exatamente o que o /api/whatsapp/connect-existing faz
  const orgId = "empresa-1";
  
  // 1. Busca conexão existente
  const { data: existing, error: findErr } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (findErr) {
    console.error("❌ Erro ao buscar conexão:", findErr);
    return;
  }
  console.log("→ Busca por org existente:", existing ? `ID: ${existing.id}` : "nenhuma");

  // 2. Testa UPSERT com todos os campos usados no código
  const payload = {
    connection_name: "Teste Integração",
    base_url: "https://free.uazapi.com",
    instance_name: `test-instance-${Date.now()}`,
    instance_token: `token-gen-${Date.now()}`,
    owner_phone: "5531999999999",
    status: "connected",
    connected_at: new Date().toISOString(),
    last_health_check_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from("whatsapp_connections")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("❌ Erro no UPDATE:", error); return; }
    result = data;
    console.log("→ UPDATE executado com sucesso ✅");
  } else {
    const { data, error } = await supabase
      .from("whatsapp_connections")
      .insert([{ organization_id: orgId, provider: "uazapi", ...payload }])
      .select()
      .single();
    if (error) { console.error("❌ Erro no INSERT:", error); return; }
    result = data;
    console.log("→ INSERT executado com sucesso ✅");
  }

  console.log("\n✅ Resultado final:");
  console.log({
    id: result.id,
    connection_name: result.connection_name,
    base_url: result.base_url,
    instance_name: result.instance_name,
    status: result.status,
    owner_phone: result.owner_phone,
    connected_at: result.connected_at,
    last_health_check_at: result.last_health_check_at,
  });
  console.log("\n🎉 Integração WhatsApp funcionando corretamente!");
}

main().catch(console.error);
