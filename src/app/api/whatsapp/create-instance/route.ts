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

    const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { method = "qr", phone, use_existing = false } = body;

    // Normalize method: "pairing" → "pair_code" internally
    const connectMethod: "qr" | "pair_code" = method === "pairing" ? "pair_code" : "qr";

    // --- LOGS DIAGNÓSTICO ---
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      console.log("[CONNECT_METHOD]", { method: connectMethod });
      console.log("[CONNECT_REQUEST]", { hasPhone: !!phone, orgId });
    }

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
    // QR e Pair Code são fluxos SEPARADOS.
    // Em AMBOS os casos: NÃO falhar se QR/pairCode não vier na primeira resposta.
    // O frontend vai fazer polling via GET /instance/status.

    let qrImageSrc: string | null = null;
    let pairCode: string | null = null;

    if (isSimulated) {
      // Modo simulado: devolver dados fixos para teste de UI
      if (connectMethod === "pair_code") {
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
        // Normalizar telefone para pair_code: apenas dígitos, 10-15 chars
        const cleanPhone = connectMethod === "pair_code" && phone
          ? phone.replace(/\D/g, "")
          : undefined;

        // ── QR CODE: body vazio (sem phone) ──
        // ── PAIR CODE: body com phone normalizado ──
        const connectBody: Record<string, string> = {};
        if (connectMethod === "pair_code" && cleanPhone) {
          connectBody.phone = cleanPhone;
        }

        if (isDev) {
          console.log("[CONNECT_REQUEST]", {
            endpoint: `${baseUrl}/instance/connect`,
            method: "POST",
            hasPhone: !!cleanPhone,
            connectMethod
          });
        }

        const connectRaw = await connectInstance(baseUrl, generatedToken, connectMethod === "pair_code" ? cleanPhone : undefined);

        if (isDev) {
          const normalized = normalizeUazapiInstanceStatus(connectRaw || {});
          console.log("[CONNECT_RESPONSE]", {
            httpStatus: 200,
            instanceStatus: normalized.status,
            hasQrCode: !!normalized.qrImageSrc,
            hasPairCode: !!normalized.pairCode,
          });
        }

        // Tentar extrair QR/pairCode da resposta imediata do /instance/connect
        // (pode já vir, ou pode precisar de polling — AMBOS são válidos)
        const immediateNormalized = normalizeUazapiInstanceStatus(connectRaw || {});
        if (connectMethod === "pair_code") {
          pairCode = immediateNormalized.pairCode;
          // Se não veio imediatamente, NÃO é erro — frontend vai fazer polling
        } else {
          qrImageSrc = immediateNormalized.qrImageSrc;
          // Se não veio imediatamente, NÃO é erro — frontend vai fazer polling
        }

        // Se não veio na resposta do connect, tentar uma vez o GET /instance/status
        if (connectMethod === "pair_code" && !pairCode) {
          try {
            const statusData = await getInstanceStatus(baseUrl, generatedToken);
            const statusNorm = normalizeUazapiInstanceStatus(statusData);
            pairCode = statusNorm.pairCode;
            if (isDev) {
              console.log("[CONNECT_RESPONSE] status poll após connect:", {
                instanceStatus: statusNorm.status,
                hasPairCode: !!pairCode,
              });
            }
          } catch {
            // Ignorar erro do status — frontend vai fazer polling
          }
        }

        if (connectMethod === "qr" && !qrImageSrc) {
          try {
            const statusData = await getInstanceStatus(baseUrl, generatedToken);
            const statusNorm = normalizeUazapiInstanceStatus(statusData);
            qrImageSrc = statusNorm.qrImageSrc;
          } catch {
            // Ignorar — frontend vai fazer polling
          }
        }

        // Configurar webhook (não-bloqueante)
        const webhookUrl = process.env.UAZAPI_WEBHOOK_URL || "https://saastop.vercel.app/api/webhooks/uazapi";
        configureWebhook(baseUrl, generatedToken, webhookUrl).catch((webhookErr) => {
          console.warn("[UAZAPI_WEBHOOK_CONFIG] Erro ao configurar webhook:", webhookErr instanceof Error ? webhookErr.message : webhookErr);
        });

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

    const statusToSave = connectMethod === "pair_code" ? "waiting_pair_code" : "waiting_qr";
    const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

    const connectionPayload: Record<string, string | null> = {
      base_url: baseUrl,
      instance_name: instanceName,
      instance_token: generatedToken,
      owner_phone: connectMethod === "pair_code" ? cleanPhone : "",
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

    // Retornar: mesmo que QR/pairCode sejam null, o frontend faz polling
    return NextResponse.json({
      status: statusToSave,
      // Pode ser null — frontend vai aguardar via polling GET /api/whatsapp/status
      qrImageSrc: qrImageSrc || null,
      pairCode: pairCode || null,
    });

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
