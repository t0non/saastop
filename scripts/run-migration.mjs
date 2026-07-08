const supabaseUrl = "https://esxdbcprsndtdxyomvpj.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeGRiY3Byc25kdGR4eW9tdnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzE3NCwiZXhwIjoyMDk5MDI5MTc0fQ.OUBz0TDQspH7XRDPWsXZqGXVTG0NoVozUjNqT9mwHVk";

const projectRef = "esxdbcprsndtdxyomvpj";

const statements = [
  "ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS connection_name TEXT",
  "ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS base_url TEXT",
  "ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS instance_external_id TEXT",
  "ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS instance_token TEXT",
  "ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE",
  "ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE",
  "ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMP WITH TIME ZONE",
  "ALTER TABLE whatsapp_connections DISABLE ROW LEVEL SECURITY"
];

async function runSQL(sql) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ sql }),
  });
  return { status: res.status, body: await res.text() };
}

// Alternativa: usa a Management API do Supabase
async function runViaManagementAPI(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, body: await res.text() };
}

// Tenta via supabase-js usando rpc customizado
async function main() {
  console.log("🔧 Aplicando migração incremental em whatsapp_connections...\n");

  for (const stmt of statements) {
    console.log(`→ ${stmt}`);
    
    // Método 1: Management API
    const r = await runViaManagementAPI(stmt + ";");
    if (r.status === 200 || r.status === 204) {
      console.log(`  ✅ OK\n`);
    } else {
      console.log(`  Status: ${r.status} | Resposta: ${r.body}\n`);
    }
  }

  console.log("\n✅ Script finalizado. Verifique os logs acima para confirmar o sucesso.");
}

main().catch(console.error);
