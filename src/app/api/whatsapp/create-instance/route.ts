import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const orgId = "empresa-1";
    const body = await request.json().catch(() => ({}));
    const { method = "qr", phone, use_existing = false } = body;

    let baseUrl = process.env.UAZAPI_BASE_URL || "https://free.uazapi.com";
    let instanceName = `top-instance-${orgId}-${Math.floor(1000 + Math.random() * 9000)}`;
    let generatedToken = `token-gen-${Math.floor(100000 + Math.random() * 900000)}`;
    let isSimulated = false;

    // ── Passo 1: Obter ou criar credenciais de instância ──
    if (use_existing) {
      const { data: existingConn } = await supabaseStateless
        .from("whatsapp_connections")
        .select("base_url, instance_name, instance_token")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!existingConn || !existingConn.instance_token) {
        return NextResponse.json({
          status: "error",
          code: "PROVIDER_ERROR",
          message: "Nenhuma conexão existente configurada para parear."
        }, { status: 400 });
      }

      baseUrl = existingConn.base_url || baseUrl;
      instanceName = existingConn.instance_name || instanceName;
      generatedToken = existingConn.instance_token;
    } else {
      const adminToken = process.env.UAZAPI_ADMIN_TOKEN;
      if (adminToken) {
        try {
          const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "admintoken": adminToken
            },
            body: JSON.stringify({
              name: instanceName
            })
          });

          if (createRes.ok) {
            const createData = await createRes.json();
            const returnedToken = createData.token ?? createData.instance?.token ?? createData.instance_token;
            if (returnedToken) {
              generatedToken = returnedToken;
            }
            console.log("[UAZAPI_CREATE] Instância criada com sucesso:", { instanceName });
          } else {
            console.warn("[UAZAPI_CREATE] Instância não criada:", createRes.status);
          }
        } catch (err) {
          console.warn("[UAZAPI_CREATE] Falha ao criar instância (modo simulado será ativado):", err instanceof Error ? err.message : err);
        }
      }
    }

    isSimulated = generatedToken.startsWith("token-gen-") || process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";

    // ── Passo 2: Iniciar conexão via POST /instance/connect ──
    let qrImageSrc: string | null = null;
    let pairCode: string | null = null;

    if (isSimulated) {
      if (method === "pairing") {
        pairCode = "WXYZ-1234";
      } else {
        qrImageSrc =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAA" +
          "M1BMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjN" +
          "pMkAAAAQdFJOUwAQIDBAUGBwgI+fr7/P3+8PE0k2AAAAuElEQVR42u3BMQEAAAABIKf/pzUF" +
          "0AoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgHQAAAO" +
          "ABAQAAAAAAAAAAAAAAAAAAAAAAAB4AAADgAQEAAAAAAAAAAAAAAAAAAAAAAAAeAAAA4AEBAAAA" +
          "AAAAAAAAAAAAAAAAAAB4AAAAPAAAAOANOwAEGAAB6xIVmgAAAABJRU5ErkJggg==";
      }
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const connectPayload: Record<string, string> = {};
        if (method === "pairing" && phone) {
          connectPayload.phone = phone.replace(/\D/g, "");
        }

        const connectRes = await fetch(`${baseUrl}/instance/connect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": generatedToken,
          },
          body: JSON.stringify(connectPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!connectRes.ok) {
          return NextResponse.json({
            status: "error",
            code: "PROVIDER_ERROR",
            message: `Erro ao conectar UAZAPI: HTTP ${connectRes.status}`
          }, { status: 400 });
        }

        // Depois consultar: GET {baseUrl}/instance/status para obter QR/Pair Code
        const statusController = new AbortController();
        const statusTimeoutId = setTimeout(() => statusController.abort(), 8000);

        const statusRes = await fetch(`${baseUrl}/instance/status`, {
          method: "GET",
          headers: {
            "token": generatedToken,
          },
          signal: statusController.signal,
        });
        clearTimeout(statusTimeoutId);

        if (!statusRes.ok) {
          return NextResponse.json({
            status: "error",
            code: "PROVIDER_ERROR",
            message: `Erro ao consultar status da instância: HTTP ${statusRes.status}`
          }, { status: 400 });
        }

        const statusData = await statusRes.json();
        const normalized = normalizeUazapiStatusResponse(statusData);

        // Log seguro no backend
        console.log("[UAZAPI_CONNECT_STATUS_LOG]", {
          endpoint: `${baseUrl}/instance/status`,
          httpStatus: statusRes.status,
          instanceStatus: normalized.status,
          connected: normalized.connected,
          loggedIn: normalized.loggedIn,
          possuiQrCode: !!normalized.qrCode,
          qrCodeLength: normalized.qrCode ? normalized.qrCode.length : 0,
          possuiPairCode: !!normalized.pairCode,
        });

        if (method === "pairing") {
          pairCode = normalized.pairCode;
          if (!pairCode) {
            return NextResponse.json({
              status: "error",
              code: "PROVIDER_ERROR",
              message: "Código de pareamento não retornado pela UAZAPI."
            }, { status: 400 });
          }
        } else {
          qrImageSrc = formatQrCode(normalized.qrCode);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[UAZAPI_CONNECT] Falha ao conectar:", msg);
        return NextResponse.json({
          status: "error",
          code: "PROVIDER_ERROR",
          message: `Falha na chamada de pareamento: ${msg}`
        }, { status: 500 });
      }
    }

    // ── Passo 3: Salvar ou atualizar no banco de dados ──
    const { data: existing } = await supabaseStateless
      .from("whatsapp_connections")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle();

    const statusToSave = method === "pairing" ? "waiting_pair_code" : "waiting_qr";
    const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

    const connectionPayload: Record<string, unknown> = {
      base_url: baseUrl,
      instance_name: instanceName,
      instance_token: generatedToken,
      owner_phone: method === "pairing" ? cleanPhone : "",
      status: statusToSave,
      updated_at: new Date().toISOString()
    };

    if (!use_existing) {
      connectionPayload.connection_name = "WhatsApp - Nova Conexão";
    }

    if (existing) {
      const { error } = await supabaseStateless
        .from("whatsapp_connections")
        .update(connectionPayload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseStateless
        .from("whatsapp_connections")
        .insert([{
          organization_id: orgId,
          provider: "uazapi",
          ...connectionPayload
        }]);

      if (error) throw error;
    }

    if (method === "pairing") {
      return NextResponse.json({
        status: "waiting_pair_code",
        pairCode: pairCode || ""
      });
    } else {
      return NextResponse.json({
        status: "waiting_qr",
        qrImageSrc: qrImageSrc || ""
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[CREATE_INSTANCE] Erro:", msg);
    return NextResponse.json({
      status: "error",
      code: "PROVIDER_ERROR",
      message: msg
    }, { status: 500 });
  }
}
