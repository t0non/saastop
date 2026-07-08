import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://esxdbcprsndtdxyomvpj.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeGRiY3Byc25kdGR4eW9tdnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzE3NCwiZXhwIjoyMDk5MDI5MTc0fQ.OUBz0TDQspH7XRDPWsXZqGXVTG0NoVozUjNqT9mwHVk";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const columns = [
  ["connection_name", "TEXT"],
  ["base_url", "TEXT"],
  ["instance_external_id", "TEXT"],
  ["instance_token", "TEXT"],
  ["connected_at", "TIMESTAMP WITH TIME ZONE"],
  ["disconnected_at", "TIMESTAMP WITH TIME ZONE"],
  ["last_health_check_at", "TIMESTAMP WITH TIME ZONE"],
];

async function main() {
  console.log("🔧 Verificando e adicionando colunas em whatsapp_connections...\n");

  // Primeiro: verifica quais colunas já existem
  const { data: existing, error: selErr } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .limit(0);

  if (selErr) {
    console.error("❌ Erro ao conectar:", selErr.message);
    process.exit(1);
  }

  // Tenta inserir uma linha com todas as colunas para forçar o schema cache a atualizar
  // e checar quais colunas existem fazendo um select com as colunas específicas
  for (const [col, type] of columns) {
    const { error } = await supabase
      .from("whatsapp_connections")
      .select(col)
      .limit(0);
    
    if (error && error.message.includes(`column "${col}" does not exist`) || 
        error && error.message.includes(`Could not find the '${col}' column`)) {
      console.log(`❌ Coluna ausente: ${col} (${type}) — precisa de ALTER TABLE`);
    } else if (!error) {
      console.log(`✅ Coluna OK: ${col}`);
    } else {
      console.log(`⚠️  ${col}: ${error.message}`);
    }
  }

  console.log("\n📋 Use o SQL abaixo no Supabase SQL Editor para adicionar as colunas ausentes:");
  console.log("   https://supabase.com/dashboard/project/esxdbcprsndtdxyomvpj/editor\n");
  console.log("ALTER TABLE whatsapp_connections");
  columns.forEach(([col, type], i) => {
    const comma = i < columns.length - 1 ? "," : ";";
    console.log(`  ADD COLUMN IF NOT EXISTS ${col} ${type}${comma}`);
  });
}

main().catch(console.error);
