import { NextRequest, NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

interface NormalizedStatus {
  status: "connected" | "connecting" | "disconnected" | "hibernated";
  phone: string | null;
  instanceName: string | null;
}

/**
 * Normaliza a resposta de status da UAZAPI para o formato interno do backend.
 * Garante que o frontend nunca dependa diretamente dos detalhes da API da UAZAPI.
 */
function normalizeUazapiStatusResponse(raw: Record<string, unknown>): NormalizedStatus {
  const getField = (keys: string[]): unknown => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) return raw[key];
    }
    if (raw.data && typeof raw.data === "object") {
      const nested = raw.data as Record<string, unknown>;
      for (const key of keys) {
        if (nested[key] !== undefined && nested[key] !== null) return nested[key];
      }
    }
    return null;
  };

  const rawStatus = String(getField(["status", "state"]) ?? "").toLowerCase();
  let status: "connected" | "connecting" | "disconnected" | "hibernated";

  if (rawStatus === "connected" || rawStatus === "open" || rawStatus === "connected_chat") {
    status = "connected";
  } else if (rawStatus === "connecting" || rawStatus === "waiting_qr" || rawStatus === "qrcode" || rawStatus === "preparing") {
    status = "connecting";
  } else if (rawStatus === "hibernated") {
    status = "hibernated";
  } else {
    status = "disconnected";
  }

  const rawPhone = getField(["phone", "owner", "number", "phone_normalized"]);
  const phone = rawPhone !== null ? String(rawPhone) : null;

  const rawName = getField(["instanceName", "instance_name", "name"]);
  const instanceName = rawName !== null ? String(rawName) : null;

  return { status, phone, instanceName };
}

/**
 * Sanitiza o corpo da resposta para logs de desenvolvimento, removendo tokens
 * e truncando dados longos como base64.
 */
function sanitizeBody(bodyStr: string): string {
  try {
    const parsed = JSON.parse(bodyStr);
    if (typeof parsed === "object" && parsed !== null) {
      const clean = { ...parsed };
      const sensitiveKeys = [
        "token", "instance_token", "admin_token", "admintoken", 
        "password", "secret", "key", "authorization", "bearer"
      ];
      
      const sanitizeObject = (obj: Record<string, unknown>) => {
        for (const k of Object.keys(obj)) {
          const val = obj[k];
          if (sensitiveKeys.includes(k.toLowerCase())) {
            obj[k] = "[REDACTED]";
          } else if (typeof val === "string" && val.length > 100) {
            obj[k] = val.slice(0, 50) + "... [TRUNCATED]";
          } else if (typeof val === "object" && val !== null) {
            sanitizeObject(val as Record<string, unknown>);
          }
        }
      };
      
      sanitizeObject(clean);
      return JSON.stringify(clean);
    }
  } catch {
    // Não é JSON
  }

  let safeStr = bodyStr;
  if (safeStr.length > 500) {
    safeStr = safeStr.slice(0, 300) + "... [TRUNCATED]";
  }
  return safeStr;
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
        code: "PROVIDER_ERROR",
        message: "URL inválida ou não permitida."
      }, { status: 400 });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({
        ok: false,
        code: "PROVIDER_ERROR",
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
        code: "PROVIDER_ERROR",
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

      // Log em modo de desenvolvimento
      if (process.env.NODE_ENV === "development") {
        console.log("[DEV_LOG] UAZAPI Call:", {
          endpoint: testUrl,
          status: httpStatus,
          sanitizedBody: sanitizeBody(responseBody),
          durationMs,
        });
      }

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

      let jsonBody: Record<string, unknown>;
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

      // 4. Salvar ou atualizar a conexão no banco de dados.
      // Se o status retornado da UAZAPI for conectado, salvamos como "connected",
      // caso contrário salvamos como "disconnected" para permitir pareamento posterior.
      const statusToSave = normalized.status === "connected" ? "connected" : "disconnected";

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
        connected_at: normalized.status === "connected" ? new Date().toISOString() : null,
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

      if (process.env.NODE_ENV === "development") {
        console.log("[DEV_LOG] UAZAPI Call Error:", {
          endpoint: testUrl,
          status: "Fetch Error",
          error: errMessage,
          durationMs,
        });
      }

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
          code: "PROVIDER_ERROR",
          message: "Servidor inacessível ou offline."
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
