import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";

// ──────────────────────────────────────────────────────────
// Tipos de resposta padronizada para o frontend
// ──────────────────────────────────────────────────────────
type QrStatus = "waiting_qr" | "connected" | "error";

interface QrResponse {
  status: QrStatus;
  qrImageSrc: string | null;
  error?: string;
}


// ──────────────────────────────────────────────────────────
// Normalizador de QR Code
// ──────────────────────────────────────────────────────────
function normalizeQrImageSource(value: unknown): string | "QR_CODE_INVALID_FORMAT" {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return "QR_CODE_INVALID_FORMAT";
  }

  const v = value.trim();

  // CASO A: já é data URI completa
  if (v.startsWith("data:image/")) {
    return v;
  }

  // CASO C: é URL HTTPS
  if (v.startsWith("https://") || v.startsWith("http://")) {
    return v;
  }

  // CASO B: é base64 puro (sem prefixo data URI)
  // Base64 válido: caracteres A-Z, a-z, 0-9, +, /, = e comprimento mínimo razoável
  if (v.length > 100 && /^[A-Za-z0-9+/=]+$/.test(v.slice(0, 100))) {
    return `data:image/png;base64,${v}`;
  }

  // CASO D: formato desconhecido (pode ser texto de QR, não imagem)
  return "QR_CODE_INVALID_FORMAT";
}

// ──────────────────────────────────────────────────────────
// Extrai o valor do QR de qualquer estrutura de resposta
// Verifica os campos mais comuns da UAZAPI e similares
// ──────────────────────────────────────────────────────────
function extractQrValue(data: Record<string, unknown>): unknown {
  // Acesso direto nos campos mais comuns
  return (
    data?.qrcode ??
    data?.qr_code ??
    data?.qr ??
    data?.base64 ??
    data?.image ??
    data?.imgBase64 ??
    // Aninhado em data
    (data?.data && typeof data.data === "object"
      ? (data.data as Record<string, unknown>)?.qrcode ??
        (data.data as Record<string, unknown>)?.qr_code ??
        (data.data as Record<string, unknown>)?.qr ??
        (data.data as Record<string, unknown>)?.base64 ??
        (data.data as Record<string, unknown>)?.image ??
        (data.data as Record<string, unknown>)?.imgBase64
      : undefined)
  );
}

// ──────────────────────────────────────────────────────────
// Log diagnóstico sanitizado (sem base64 completo, sem token)
// ──────────────────────────────────────────────────────────
function logQrShape(label: string, data: Record<string, unknown>) {
  const topKeys = Object.keys(data ?? {});

  const dataKeys =
    data?.data && typeof data.data === "object"
      ? Object.keys(data.data as object)
      : [];

  const candidate = extractQrValue(data);
  const candidateInfo =
    candidate && typeof candidate === "string"
      ? {
          field: "detected",
          type: "string",
          length: candidate.length,
          prefix: candidate.slice(0, 40),
        }
      : { field: "none", type: typeof candidate };

  console.log(`[UAZAPI_QR_RESPONSE_SHAPE] ${label}`, {
    topKeys,
    dataKeys,
    candidate: candidateInfo,
  });
}

// ──────────────────────────────────────────────────────────
// Handler principal
// ──────────────────────────────────────────────────────────
export async function GET(_request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const resp: QrResponse = {
        status: "error",
        qrImageSrc: null,
        error: "Não autorizado."
      };
      return NextResponse.json(resp, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";

    const { data: connection, error } = await supabase
      .from("whatsapp_connections")
      .select("id, status, base_url, instance_name, instance_token")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error || !connection) {
      const resp: QrResponse = {
        status: "error",
        qrImageSrc: null,
        error: "Nenhuma conexão configurada para esta organização.",
      };
      return NextResponse.json(resp, { status: 404 });
    }

    // ── Conexão já está conectada ──
    if (connection.status === "connected") {
      const resp: QrResponse = { status: "connected", qrImageSrc: null };
      return NextResponse.json(resp);
    }

    // ── Modo demo ou instância simulada ──
    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    const isSimulated =
      !connection.instance_token ||
      connection.instance_token.startsWith("token-gen-");

    if (isDemoMode || isSimulated) {
      // Agenda transição automática para "connected" após 7s
      setTimeout(async () => {
        try {
          await supabase
            .from("whatsapp_connections")
            .update({
              status: "connected",
              owner_phone: "5531999999999",
              connected_at: new Date().toISOString(),
            })
            .eq("id", connection.id);
        } catch (e) {
          console.error("[QR_SIM] Erro ao simular pareamento:", e);
        }
      }, 7000);

      // QR de demonstração válido (imagem real de QR Code)
      const demoQr =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIBAMAAAB" +
        "fbs1HAAAAG1BMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoDP4vAAAACXRSTlMAA" +
        "ADTq6tVVbcCz6oAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NC" +
        "AAAAHklEQVR42mNgGAWjYBSMAkIAAP//AwBHgAX/dSLa5QAAAABJRU5ErkJggg==";

      const resp: QrResponse = { status: "waiting_qr", qrImageSrc: demoQr };
      return NextResponse.json(resp);
    }

    // ── Busca QR real da UAZAPI ──
    if (!connection.base_url || !connection.instance_token) {
      const resp: QrResponse = {
        status: "error",
        qrImageSrc: null,
        error: "Configuração incompleta: base_url ou token ausentes.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    // A UAZAPI costuma expor o QR em /instance/qr ou /instance/connect
    const endpoints = [
      `${connection.base_url}/instance/qr?token=${connection.instance_token}`,
      `${connection.base_url}/instance/connect?token=${connection.instance_token}`,
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;

        const raw = await res.json() as Record<string, unknown>;

        // Log diagnóstico (sem token, sem base64 completo)
        logQrShape(`endpoint: ${url.split("?")[0]}`, raw);

        const candidate = extractQrValue(raw);
        const normalized = normalizeQrImageSource(candidate);

        if (normalized !== "QR_CODE_INVALID_FORMAT") {
          const resp: QrResponse = {
            status: "waiting_qr",
            qrImageSrc: normalized,
          };
          return NextResponse.json(resp);
        }

        // A UAZAPI pode retornar texto bruto do QR (não imagem)
        console.log("[UAZAPI_QR] Formato não reconhecido como imagem — possível texto de QR bruto.", {
          candidateType: typeof candidate,
          candidateLength: typeof candidate === "string" ? candidate.length : 0,
        });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn(`[UAZAPI_QR] Falha ao chamar ${url.split("?")[0]}:`, msg);
      }
    }

    // ── Nenhum endpoint retornou QR válido ──
    const resp: QrResponse = {
      status: "error",
      qrImageSrc: null,
      error: "Não foi possível obter o QR Code da UAZAPI. Verifique se a instância está ativa.",
    };
    return NextResponse.json(resp, { status: 502 });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[QR_ROUTE] Erro interno:", msg);
    const resp: QrResponse = {
      status: "error",
      qrImageSrc: null,
      error: "Erro interno ao obter QR Code.",
    };
    return NextResponse.json(resp, { status: 500 });
  }
}
