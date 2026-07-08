import { NextRequest, NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

/**
 * GET /api/whatsapp/status
 *
 * Endpoint INTERNO que o frontend consulta via polling.
 * Chama GET {baseUrl}/instance/status com header `token` (UAZAPI v2).
 *
 * Resposta padronizada para o frontend:
 *   { status, qrImageSrc, phone?, message? }
 *
 * O frontend NUNCA chama a UAZAPI diretamente.
 *
 * ERRO ANTERIOR: usava GET /instance/qr?token=... como query param,
 * e tentava adivinhar campos genéricos (qr, qrcode, base64, etc.)
 * sem verificar a resposta real da UAZAPI.
 */

type StatusResponse = {
  status: "waiting_qr" | "connecting" | "connected" | "error";
  qrImageSrc: string | null;
  phone?: string;
  message?: string;
};

/**
 * Normaliza o valor do QR para uso em <img src>.
 * Não adivinha — trata apenas os formatos confirmados.
 */
function normalizeQrSrc(value: unknown): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const v = value.trim();

  // CASO 1: já é data URI completa
  if (v.startsWith("data:image/")) {
    return v;
  }

  // CASO 4: URL HTTPS válida
  if (v.startsWith("https://") || v.startsWith("http://")) {
    return v;
  }

  // CASO 2: base64 puro (sem prefixo) — mínimo 200 chars para ser imagem real
  if (v.length > 200 && /^[A-Za-z0-9+/=\r\n]+$/.test(v.slice(0, 100))) {
    return `data:image/png;base64,${v}`;
  }

  // CASO 3: conteúdo textual para gerar QR (não é imagem)
  // Retorna null — será tratado no frontend se necessário
  return null;
}

/**
 * Log diagnóstico sanitizado da resposta da UAZAPI.
 * Não loga token, admin token, secrets, nem base64 completo.
 */
function logStatusShape(data: Record<string, unknown>) {
  const topKeys = Object.keys(data ?? {});

  // Encontra o campo que parece conter o QR
  const qrCandidates: Record<string, { type: string; length?: number; prefix?: string }> = {};
  for (const key of topKeys) {
    const val = data[key];
    if (typeof val === "string" && val.length > 50) {
      qrCandidates[key] = {
        type: "string",
        length: val.length,
        prefix: val.slice(0, 30),
      };
    }
  }

  console.log("[UAZAPI_STATUS_SHAPE]", {
    keys: topKeys,
    status: data.status ?? data.state ?? "N/A",
    qrCandidates,
  });
}

export async function GET(_request: NextRequest) {
  try {
    const orgId = "empresa-1";

    const { data: connection, error } = await supabaseStateless
      .from("whatsapp_connections")
      .select("id, status, base_url, instance_name, instance_token")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error || !connection) {
      return NextResponse.json({
        status: "error",
        qrImageSrc: null,
        message: "Nenhuma conexão configurada.",
      } satisfies StatusResponse, { status: 404 });
    }

    // ── Já conectado no banco ──
    if (connection.status === "connected") {
      return NextResponse.json({
        status: "connected",
        qrImageSrc: null,
      } satisfies StatusResponse);
    }

    // ── Modo simulado (token gerado localmente) ──
    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    const isSimulated =
      !connection.instance_token ||
      connection.instance_token.startsWith("token-gen-");

    if (isDemoMode || isSimulated) {
      // Agenda transição automática para "connected" após 10s
      setTimeout(async () => {
        try {
          await supabaseStateless
            .from("whatsapp_connections")
            .update({
              status: "connected",
              owner_phone: "5531999999999",
              connected_at: new Date().toISOString(),
            })
            .eq("id", connection.id);
        } catch (e) {
          console.error("[STATUS_SIM] Erro ao simular pareamento:", e);
        }
      }, 10000);

      // QR de demonstração — imagem PNG válida e renderizável
      const demoQr =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAA" +
        "M1BMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjN" +
        "pMkAAAAQdFJOUwAQIDBAUGBwgI+fr7/P3+8PE0k2AAAAuElEQVR42u3BMQEAAAABIKf/pzUF" +
        "0AoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgHQAAAO" +
        "ABAQAAAAAAAAAAAAAAAAAAAAAAAB4AAADgAQEAAAAAAAAAAAAAAAAAAAAAAAAeAAAA4AEBAAAA" +
        "AAAAAAAAAAAAAAAAAAB4AAAAPAAAAOANOwAEGAAB6xIVmgAAAABJRU5ErkJggg==";

      return NextResponse.json({
        status: "waiting_qr",
        qrImageSrc: demoQr,
      } satisfies StatusResponse);
    }

    // ── Consulta real: GET {baseUrl}/instance/status ──
    if (!connection.base_url || !connection.instance_token) {
      return NextResponse.json({
        status: "error",
        qrImageSrc: null,
        message: "Configuração incompleta: base_url ou token ausentes.",
      } satisfies StatusResponse, { status: 400 });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // UAZAPI v2: autenticação via header `token`
      const res = await fetch(`${connection.base_url}/instance/status`, {
        method: "GET",
        headers: {
          "token": connection.instance_token,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn("[UAZAPI_STATUS] HTTP", res.status, await res.text().catch(() => ""));
        return NextResponse.json({
          status: "error",
          qrImageSrc: null,
          message: `UAZAPI retornou HTTP ${res.status}.`,
        } satisfies StatusResponse, { status: 502 });
      }

      const raw = await res.json() as Record<string, unknown>;

      // Log diagnóstico temporário (sem token, sem base64 completo)
      logStatusShape(raw);

      // ── Detectar status da UAZAPI ──
      const uazapiStatus = String(raw.status ?? raw.state ?? "").toLowerCase();

      if (uazapiStatus === "connected" || uazapiStatus === "open") {
        // Atualizar banco
        await supabaseStateless
          .from("whatsapp_connections")
          .update({
            status: "connected",
            owner_phone: String(raw.phone ?? raw.owner ?? raw.number ?? ""),
            connected_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        return NextResponse.json({
          status: "connected",
          qrImageSrc: null,
          phone: String(raw.phone ?? raw.owner ?? raw.number ?? ""),
        } satisfies StatusResponse);
      }

      // ── Extrair QR da resposta real ──
      // Tenta todos os campos conhecidos da UAZAPI v2 — O CAMPO REAL será
      // registrado pelo logStatusShape acima para diagnóstico
      const qrRaw =
        raw.qrcode ??
        raw.qr ??
        raw.qr_code ??
        raw.base64 ??
        raw.urlcode ??
        raw.pairingCode ??
        // Aninhado em data
        (raw.data && typeof raw.data === "object"
          ? (raw.data as Record<string, unknown>).qrcode ??
            (raw.data as Record<string, unknown>).qr ??
            (raw.data as Record<string, unknown>).base64
          : undefined);

      const qrImageSrc = normalizeQrSrc(qrRaw);

      if (qrImageSrc) {
        return NextResponse.json({
          status: "waiting_qr",
          qrImageSrc,
        } satisfies StatusResponse);
      }

      // QR não disponível ainda (instância iniciando)
      return NextResponse.json({
        status: "connecting",
        qrImageSrc: null,
        message: "Aguardando geração do QR Code pela UAZAPI...",
      } satisfies StatusResponse);

    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("[UAZAPI_STATUS] Erro na chamada:", msg);
      return NextResponse.json({
        status: "error",
        qrImageSrc: null,
        message: "Falha ao comunicar com a UAZAPI.",
      } satisfies StatusResponse, { status: 502 });
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[STATUS_ROUTE] Erro interno:", msg);
    return NextResponse.json({
      status: "error",
      qrImageSrc: null,
      message: "Erro interno ao verificar status.",
    } satisfies StatusResponse, { status: 500 });
  }
}
