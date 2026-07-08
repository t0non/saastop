import { getServerClient } from "@/lib/supabaseServer";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface StatusItem {
  label: string;
  value: string;
  ok: boolean;
}

export default async function SupabaseStatusPage() {
  const checks: StatusItem[] = [];

  // 1. Check env vars
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_URL",
    value: url ? url.replace(/^(https?:\/\/[^/]+).*$/, "$1/...") : "❌ Não definida",
    ok: !!url,
  });

  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    value: key ? `${key.substring(0, 12)}...${key.substring(key.length - 4)}` : "❌ Não definida",
    ok: !!key,
  });

  checks.push({
    label: "isSupabaseConfigured",
    value: isSupabaseConfigured ? "✅ Sim" : "❌ Não",
    ok: isSupabaseConfigured,
  });

  // 2. Test actual connection (only if configured)
  let connectionOk = false;
  let sessionInfo = "Não verificada";
  let connectionError = "";

  if (isSupabaseConfigured) {
    try {
      const supabase = await getServerClient();

      // Test connection by fetching the user (returns null if not logged in, but won't error if Supabase is reachable)
      const { data, error } = await supabase.auth.getUser();

      if (error && error.message !== "Auth session missing!") {
        connectionError = error.message;
      } else {
        connectionOk = true;
      }

      if (data?.user) {
        sessionInfo = `✅ Logado como ${data.user.email} (${data.user.id.substring(0, 8)}...)`;
      } else {
        sessionInfo = "Nenhum usuário autenticado (esperado nesta fase)";
      }
    } catch (err) {
      connectionError = err instanceof Error ? err.message : String(err);
    }
  }

  checks.push({
    label: "Conexão com Supabase",
    value: connectionOk ? "✅ Conectado" : connectionError ? `❌ ${connectionError}` : "⏭️ Ignorada (não configurado)",
    ok: connectionOk,
  });

  checks.push({
    label: "Sessão de Usuário",
    value: sessionInfo,
    ok: connectionOk,
  });

  const allOk = checks.every((c) => c.ok);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "monospace", padding: "2rem" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem", color: "#f8fafc" }}>
          🔧 Supabase Status (Dev)
        </h1>
        <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "2rem" }}>
          Página temporária de diagnóstico — remover antes de produção.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {checks.map((check) => (
            <div
              key={check.label}
              style={{
                background: check.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${check.ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                {check.label}
              </div>
              <div style={{ fontSize: "0.85rem", color: check.ok ? "#34d399" : "#f87171", wordBreak: "break-all" }}>
                {check.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            borderRadius: "0.5rem",
            textAlign: "center",
            fontSize: "0.9rem",
            fontWeight: "bold",
            background: allOk ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.15)",
            border: `1px solid ${allOk ? "rgba(16,185,129,0.35)" : "rgba(251,191,36,0.35)"}`,
            color: allOk ? "#34d399" : "#fbbf24",
          }}
        >
          {allOk
            ? "✅ Supabase está conectado e operacional!"
            : isSupabaseConfigured
              ? "⚠️ Supabase está configurado, mas houve erro de conexão."
              : "⏳ Supabase ainda não está configurado. Configure as variáveis de ambiente no .env"}
        </div>

        <p style={{ marginTop: "1.5rem", fontSize: "0.65rem", color: "#475569", textAlign: "center" }}>
          Next.js {process.env.__NEXT_VERSION || "16"} | @supabase/ssr | Renderizado em: {new Date().toISOString()}
        </p>
      </div>
    </div>
  );
}
