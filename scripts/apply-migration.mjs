/**
 * Script para aplicar a migração incremental no Supabase via API
 * Uso: node scripts/apply-migration.mjs <SERVICE_ROLE_KEY>
 *
 * A service_role key está disponível no Supabase Dashboard em:
 * Settings → API → Project API keys → service_role (secret)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esxdbcprsndtdxyomvpj.supabase.co";
const serviceRoleKey = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("❌ Informe a service_role key como argumento ou variável SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Uso: node scripts/apply-migration.mjs <sua-service-role-key>");
  console.error("   Onde encontrar: Supabase Dashboard → Settings → API → service_role (secret)");
  process.exit(1);
}

const sql = `
ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS connection_name TEXT,
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  ADD COLUMN IF NOT EXISTS instance_external_id TEXT,
  ADD COLUMN IF NOT EXISTS instance_token TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE whatsapp_connections DISABLE ROW LEVEL SECURITY;
`;

async function applyMigration() {
  console.log("🔧 Aplicando migração incremental em whatsapp_connections...\n");

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  // Tenta via endpoint de SQL direto
  const sqlEndpoint = `${supabaseUrl}/pg/query`;
  const res2 = await fetch(sqlEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res2.ok) {
    const data = await res2.json();
    console.log("✅ Migração aplicada com sucesso!\n", data);
  } else {
    // Fallback: tenta via supabase-js
    const text = await res2.text();
    console.log("ℹ️  Resposta da API:", text);
    console.log("\n📋 SQL para aplicar manualmente no Supabase Dashboard SQL Editor:");
    console.log("   https://supabase.com/dashboard/project/esxdbcprsndtdxyomvpj/editor\n");
    console.log(sql);
  }
}

applyMigration().catch(console.error);
