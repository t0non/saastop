import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { createInstance, connectInstance, configureWebhook, getInstanceStatus } from "@/integrations/uazapi/client";
import { normalizeUazapiInstanceStatus } from "@/integrations/uazapi/normalizers";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";
    const body = await request.json().catch(() => ({}));
    const { method = "qr", phone, use_existing = false } = body;

    let baseUrl = process.env.UAZAPI_BASE_URL || "https://free.uazapi.com";
    let instanceName = `top-instance-${orgId}-${Math.floor(1000 + Math.random() * 9000)}`;
    let generatedToken = `token-gen-${Math.floor(100000 + Math.random() * 900000)}`;
    let isSimulated = false;

    // ── Passo 1: Obter ou criar credenciais de instância ──
    if (use_existing) {
      const { data: existingConn } = await supabase
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
      if (adminToken && !adminToken.startsWith("token-gen-")) {
        try {
          const createResult = await createInstance(baseUrl, adminToken, instanceName);
          generatedToken = createResult.token;
          console.log("[UAZAPI_CREATE] Instância criada com sucesso:", { instanceName });
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
        // Conectar instância na UAZAPI
        const cleanPhone = phone ? phone.replace(/\D/g, "") : undefined;
        await connectInstance(baseUrl, generatedToken, cleanPhone);

        // Configurar Webhook na UAZAPI
        const webhookUrl = "https://saastop.vercel.app/api/webhooks/uazapi";
        try {
          await configureWebhook(baseUrl, generatedToken, webhookUrl);
          console.log("[UAZAPI_WEBHOOK_CONFIG] Webhook configurado:", webhookUrl);
        } catch (webhookErr) {
          console.warn("[UAZAPI_WEBHOOK_CONFIG] Erro ao configurar webhook:", webhookErr instanceof Error ? webhookErr.message : webhookErr);
        }

        // Consultar status para obter QR/Pair Code
        const statusData = await getInstanceStatus(baseUrl, generatedToken);
        const normalized = normalizeUazapiInstanceStatus(statusData);

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
          qrImageSrc = normalized.qrImageSrc;
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
    const { data: existing } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle();

    const statusToSave = method === "pairing" ? "waiting_pair_code" : "waiting_qr";
    const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

    const connectionPayload: Record<string, string | null> = {
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
      const { error } = await supabase
        .from("whatsapp_connections")
        .update(connectionPayload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
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
