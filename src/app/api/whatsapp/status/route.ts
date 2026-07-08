import { NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

interface NormalizedStatus {
  instanceName: string | null;
  status: string | null;
  qrCode: string | null;
  pairCode: string | null;
  connected: boolean;
  loggedIn: boolean;
  phone: string | null;
}

/**
 * Normaliza a resposta de status da UAZAPI conforme a especificação OpenAPI v2.1.1.
 */
function normalizeUazapiStatusResponse(raw: unknown): NormalizedStatus {
  if (!raw) {
    return {
      instanceName: null,
      status: "disconnected",
      qrCode: null,
      pairCode: null,
      connected: false,
      loggedIn: false,
      phone: null
    };
  }

  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const instance = (data.instance && typeof data.instance === "object" ? data.instance : {}) as Record<string, unknown>;
  const status = (data.status && typeof data.status === "object" ? data.status : {}) as Record<string, unknown>;
  const jid = (status.jid && typeof status.jid === "object" ? status.jid : {}) as Record<string, unknown>;

  return {
    instanceName: typeof instance.name === "string" ? instance.name : null,
    status: typeof instance.status === "string" ? instance.status : "disconnected",
    qrCode: typeof instance.qrcode === "string" ? instance.qrcode : null,
    pairCode: typeof instance.paircode === "string" ? instance.paircode : null,
    connected: typeof status.connected === "boolean" ? status.connected : false,
    loggedIn: typeof status.loggedIn === "boolean" ? status.loggedIn : false,
    phone: typeof jid.user === "string" ? jid.user : null
  };
}

/**
 * Normaliza a imagem do QR Code para incluir o prefixo base64 se necessário.
 */
function formatQrCode(qrRaw: string | null | undefined): string | null {
  if (!qrRaw) return null;
  const q = qrRaw.trim();
  if (q.startsWith("data:image/")) {
    return q;
  }
  return `data:image/png;base64,${q}`;
}

export async function GET() {
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
        code: "INSTANCE_NOT_FOUND",
        message: "Nenhuma conexão configurada para a organização."
      }, { status: 404 });
    }

    // ── Já conectado no banco ──
    if (connection.status === "connected") {
      return NextResponse.json({
        status: "connected",
        phone: ""
      });
    }

    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    const isSimulated =
      !connection.instance_token ||
      connection.instance_token.startsWith("token-gen-");

    // ── Modo simulado (demo) ──
    if (isDemoMode || isSimulated) {
      // Agenda transição automática para conectado após 10 segundos
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

      if (connection.status === "waiting_pair_code") {
        return NextResponse.json({
          status: "waiting_pair_code",
          pairCode: "WXYZ-1234"
        });
      } else {
        const demoQr =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAA" +
          "M1BMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjN" +
          "pMkAAAAQdFJOUwAQIDBAUGBwgI+fr7/P3+8PE0k2AAAAuElEQVR42u3BMQEAAAABIKf/pzUF" +
          "0AoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgHQAAAO" +
          "ABAQAAAAAAAAAAAAAAAAAAAAAAAB4AAADgAQEAAAAAAAAAAAAAAAAAAAAAAAAeAAAA4AEBAAAA" +
          "AAAAAAAAAAAAAAAAAAB4AAAAPAAAAOANOwAEGAAB6xIVmgAAAABJRU5ErkJggg==";

        return NextResponse.json({
          status: "waiting_qr",
          qrImageSrc: demoQr
        });
      }
    }

    // ── Consulta real: GET {baseUrl}/instance/status ──
    if (!connection.base_url || !connection.instance_token) {
      return NextResponse.json({
        status: "error",
        code: "PROVIDER_ERROR",
        message: "Configuração incompleta: base_url ou token ausentes."
      }, { status: 400 });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${connection.base_url}/instance/status`, {
        method: "GET",
        headers: {
          "token": connection.instance_token,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let code = "PROVIDER_ERROR";
        if (res.status === 401 || res.status === 403) code = "INVALID_TOKEN";
        else if (res.status === 404) code = "INSTANCE_NOT_FOUND";

        return NextResponse.json({
          status: "error",
          code,
          message: `UAZAPI retornou HTTP ${res.status}.`
        }, { status: 400 });
      }

      const raw = await res.json();
      const normalized = normalizeUazapiStatusResponse(raw);

      // Log seguro no backend
      console.log("[UAZAPI_POLLING_STATUS_LOG]", {
        endpoint: `${connection.base_url}/instance/status`,
        httpStatus: res.status,
        instanceStatus: normalized.status,
        connected: normalized.connected,
        loggedIn: normalized.loggedIn,
        possuiQrCode: !!normalized.qrCode,
        qrCodeLength: normalized.qrCode ? normalized.qrCode.length : 0,
        possuiPairCode: !!normalized.pairCode,
      });

      const isConnected = normalized.connected || normalized.loggedIn || normalized.status === "connected";

      if (isConnected) {
        const cleanPhone = normalized.phone ? normalized.phone.split("@")[0].replace(/\D/g, "") : "";
        
        await supabaseStateless
          .from("whatsapp_connections")
          .update({
            status: "connected",
            owner_phone: cleanPhone,
            connected_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        return NextResponse.json({
          status: "connected",
          phone: cleanPhone
        });
      }

      // Se o fluxo ativo no banco for Código de Pareamento
      if (connection.status === "waiting_pair_code") {
        return NextResponse.json({
          status: "waiting_pair_code",
          pairCode: normalized.pairCode || ""
        });
      }

      // Se o fluxo ativo for QR Code
      const formattedQr = formatQrCode(normalized.qrCode);
      if (formattedQr) {
        return NextResponse.json({
          status: "waiting_qr",
          qrImageSrc: formattedQr
        });
      }

      return NextResponse.json({
        status: "connecting"
      });

    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("[UAZAPI_STATUS] Erro na chamada:", msg);
      return NextResponse.json({
        status: "error",
        code: "PROVIDER_ERROR",
        message: "Falha ao comunicar com a UAZAPI."
      }, { status: 502 });
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[STATUS_ROUTE] Erro interno:", msg);
    return NextResponse.json({
      status: "error",
      code: "PROVIDER_ERROR",
      message: "Erro interno ao verificar status."
    }, { status: 500 });
  }
}
