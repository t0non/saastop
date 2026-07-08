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

export async function POST(request: NextRequest) {
  try {
    const orgId = "empresa-1";
    const body = await request.json();
    const { connection_name, base_url, instance_name, instance_token } = body;

    if (!connection_name || !base_url || !instance_name || !instance_token) {
      return NextResponse.json({
        ok: false,
        code: "PROVIDER_ERROR",
        message: "Campos obrigatórios ausentes."
      }, { status: 400 });
    }

    // 1. Validar URL permitida (allowlist)
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(base_url);
    } catch {
      return NextResponse.json({
        ok: false,
        code: "INVALID_URL",
        message: "URL inválida ou não permitida."
      }, { status: 400 });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({
        ok: false,
        code: "INVALID_URL",
        message: "URL inválida ou não permitida."
      }, { status: 400 });
    }

    const allowedHostsStr = process.env.UAZAPI_ALLOWED_HOSTS || "";
    const allowedHosts = allowedHostsStr
      ? allowedHostsStr.split(",").map(h => h.trim().toLowerCase())
      : [];

    // Adiciona o host default de UAZAPI_BASE_URL à lista de permitidos
    const defaultBaseUrl = process.env.UAZAPI_BASE_URL || "https://free.uazapi.com";
    try {
      const defaultHost = new URL(defaultBaseUrl).hostname.toLowerCase();
      if (!allowedHosts.includes(defaultHost)) {
        allowedHosts.push(defaultHost);
      }
    } catch {
      // Ignorar erros
    }

    if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
      return NextResponse.json({
        ok: false,
        code: "INVALID_URL",
        message: "URL inválida ou não permitida."
      }, { status: 400 });
    }

    // 2. Modos de Simulação (Demo Mode / Mock Token)
    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    const envToken = process.env.UAZAPI_INSTANCE_TOKEN;
    const isMockToken = instance_token === envToken;

    if (isDemoMode || isMockToken) {
      const uazapiStatus = "connected";
      const ownerPhone = "5531999999999";

      // Salva conexão no banco (pois o status é connected)
      const { data: existing } = await supabaseStateless
        .from("whatsapp_connections")
        .select("id")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (existing) {
        await supabaseStateless
          .from("whatsapp_connections")
          .update({
            connection_name,
            base_url,
            instance_name,
            instance_token,
            owner_phone: ownerPhone,
            status: uazapiStatus,
            connected_at: new Date().toISOString(),
            last_health_check_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseStateless
          .from("whatsapp_connections")
          .insert([{
            organization_id: orgId,
            provider: "uazapi",
            connection_name,
            base_url,
            instance_name,
            instance_token,
            owner_phone: ownerPhone,
            status: uazapiStatus,
            connected_at: new Date().toISOString(),
            last_health_check_at: new Date().toISOString(),
          }]);
      }

      return NextResponse.json({
        ok: true,
        instanceName: instance_name,
        status: uazapiStatus,
        phone: ownerPhone
      });
    }

    // 3. Chamada real à UAZAPI (timeout de 8s, header `token`, sem admin token)
    const testUrl = `${base_url}/instance/status`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const startTime = Date.now();
    let durationMs = 0;
    let responseBody = "";
    let httpStatus = 0;

    try {
      const testRes = await fetch(testUrl, {
        method: "GET",
        headers: {
          "token": instance_token,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      durationMs = Date.now() - startTime;
      httpStatus = testRes.status;

      responseBody = await testRes.text();

      if (!testRes.ok) {
        if (httpStatus === 401 || httpStatus === 403) {
          return NextResponse.json({
            ok: false,
            code: "INVALID_TOKEN",
            message: "Token inválido ou não autorizado."
          }, { status: 400 });
        }
        if (httpStatus === 404) {
          return NextResponse.json({
            ok: false,
            code: "INSTANCE_NOT_FOUND",
            message: "Instância não encontrada no servidor."
          }, { status: 400 });
        }

        const lowerBody = responseBody.toLowerCase();
        if (lowerBody.includes("expired") || lowerBody.includes("expirada") || lowerBody.includes("expirado")) {
          return NextResponse.json({
            ok: false,
            code: "PROVIDER_ERROR",
            message: "Instância expirada."
          }, { status: 400 });
        }

        return NextResponse.json({
          ok: false,
          code: "PROVIDER_ERROR",
          message: `Resposta inesperada do servidor: HTTP ${httpStatus}.`
        }, { status: 400 });
      }

      let jsonBody: unknown;
      try {
        jsonBody = JSON.parse(responseBody);
      } catch {
        return NextResponse.json({
          ok: false,
          code: "PROVIDER_ERROR",
          message: "Resposta inesperada do servidor (JSON inválido)."
        }, { status: 400 });
      }

      const normalized = normalizeUazapiStatusResponse(jsonBody);

      // Log seguro no backend
      console.log("[UAZAPI_STATUS_LOG]", {
        endpoint: testUrl,
        httpStatus,
        instanceStatus: normalized.status,
        connected: normalized.connected,
        loggedIn: normalized.loggedIn,
        possuiQrCode: !!normalized.qrCode,
        qrCodeLength: normalized.qrCode ? normalized.qrCode.length : 0,
        possuiPairCode: !!normalized.pairCode,
        durationMs
      });

      // 4. Salvar ou atualizar a conexão no banco de dados.
      const isConnected = normalized.connected || normalized.loggedIn || normalized.status === "connected";
      const statusToSave = isConnected ? "connected" : "disconnected";

      const { data: existing } = await supabaseStateless
        .from("whatsapp_connections")
        .select("id")
        .eq("organization_id", orgId)
        .maybeSingle();

      const connectionPayload = {
        connection_name,
        base_url,
        instance_name,
        instance_token,
        owner_phone: normalized.phone || "",
        status: statusToSave,
        connected_at: isConnected ? new Date().toISOString() : null,
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabaseStateless
          .from("whatsapp_connections")
          .update(connectionPayload)
          .eq("id", existing.id);
      } else {
        await supabaseStateless
          .from("whatsapp_connections")
          .insert([{
            organization_id: orgId,
            provider: "uazapi",
            ...connectionPayload
          }]);
      }

      return NextResponse.json({
        ok: true,
        instanceName: normalized.instanceName || instance_name,
        status: statusToSave,
        phone: normalized.phone,
      });

    } catch (err) {
      clearTimeout(timeoutId);
      durationMs = Date.now() - startTime;

      const errObject = err as Record<string, unknown>;
      const errName = typeof errObject?.name === "string" ? errObject.name : "";
      const errMessage = typeof errObject?.message === "string" ? errObject.message : String(err);
      const errCode = typeof errObject?.code === "string" ? errObject.code : "";

      if (errName === "AbortError" || errMessage.includes("timeout")) {
        return NextResponse.json({
          ok: false,
          code: "TIMEOUT",
          message: "Tempo limite de conexão excedido."
        }, { status: 400 });
      }

      const isUnreachable = errCode === "ENOTFOUND" || errCode === "ECONNREFUSED" || 
                            /fetch failed|unreachable|getaddrinfo/i.test(errMessage);
      if (isUnreachable) {
        return NextResponse.json({
          ok: false,
          code: "INVALID_URL",
          message: "Servidor inacessível, offline ou URL inválida."
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: false,
        code: "PROVIDER_ERROR",
        message: `Erro ao conectar: ${errMessage}`
      }, { status: 400 });
    }

  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      code: "PROVIDER_ERROR",
      message: errMessage
    }, { status: 500 });
  }
}
