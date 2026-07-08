import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { getInstanceStatus, configureWebhook } from "@/integrations/uazapi/client";
import { normalizeUazapiInstanceStatus } from "@/integrations/uazapi/normalizers";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";
    const body = await request.json();
    const { connection_name, base_url, instance_name, instance_token } = body;

    if (!connection_name || !base_url || !instance_name || !instance_token) {
      return NextResponse.json({
        ok: false,
        code: "PROVIDER_ERROR",
        message: "Campos obrigatórios ausentes."
      }, { status: 400 });
    }

    // 2. Validate URL permitida (allowlist)
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

    // 3. Modos de Simulação (Demo Mode / Mock Token)
    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    const envToken = process.env.UAZAPI_INSTANCE_TOKEN;
    const isMockToken = instance_token === envToken;

    if (isDemoMode || isMockToken) {
      const uazapiStatus = "connected";
      const ownerPhone = "5531999999999";

      const { data: existing } = await supabase
        .from("whatsapp_connections")
        .select("id")
        .eq("organization_id", orgId)
        .maybeSingle();

      const connectionPayload = {
        connection_name,
        base_url,
        instance_name,
        instance_token,
        owner_phone: ownerPhone,
        status: uazapiStatus,
        connected_at: new Date().toISOString(),
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase
          .from("whatsapp_connections")
          .update(connectionPayload)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("whatsapp_connections")
          .insert([{
            organization_id: orgId,
            provider: "uazapi",
            ...connectionPayload
          }]);
      }

      return NextResponse.json({
        ok: true,
        instanceName: instance_name,
        status: uazapiStatus,
        phone: ownerPhone
      });
    }

    // 4. Chamada real à UAZAPI (usando o cliente e normalizadores)
    try {
      const raw = await getInstanceStatus(base_url, instance_token);
      const normalized = normalizeUazapiInstanceStatus(raw);

      const isConnected = normalized.connected;
      const statusToSave = isConnected ? "connected" : "disconnected";

      // Configure Webhook dynamically upon connecting
      const webhookUrl = "https://saastop.vercel.app/api/webhooks/uazapi";
      try {
        await configureWebhook(base_url, instance_token, webhookUrl);
        console.log("[UAZAPI_CONNECT_EXISTING] Webhook configurado:", webhookUrl);
      } catch (webhookErr) {
        console.warn("[UAZAPI_CONNECT_EXISTING] Falha ao configurar webhook:", webhookErr instanceof Error ? webhookErr.message : webhookErr);
      }

      const { data: existing } = await supabase
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
        await supabase
          .from("whatsapp_connections")
          .update(connectionPayload)
          .eq("id", existing.id);
      } else {
        await supabase
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
      const errMessage = err instanceof Error ? err.message : String(err);
      
      if (errMessage.includes("timeout") || errMessage.includes("AbortError")) {
        return NextResponse.json({
          ok: false,
          code: "TIMEOUT",
          message: "Tempo limite de conexão excedido."
        }, { status: 400 });
      }

      if (/fetch failed|unreachable|getaddrinfo/i.test(errMessage)) {
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
