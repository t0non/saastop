import { NextRequest, NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

/**
 * POST /api/whatsapp/create-instance
 *
 * Fluxo UAZAPI v2:
 *   1. Se UAZAPI_ADMIN_TOKEN existe → POST /instance/create (cria instância)
 *   2. POST /instance/connect com header `token` e body {} (inicia pareamento QR)
 *   3. Salva/atualiza registro em whatsapp_connections com status "waiting_qr"
 *
 * ERRO ANTERIOR: usava GET /instance/qr?token=... como query param.
 * A UAZAPI v2 espera autenticação via header `token`.
 */
export async function POST(_request: NextRequest) {
  try {
    const orgId = "empresa-1";
    const instanceName = `top-instance-${orgId}-${Math.floor(1000 + Math.random() * 9000)}`;
    const adminToken = process.env.UAZAPI_ADMIN_TOKEN;
    const baseUrl = process.env.UAZAPI_BASE_URL || "https://free.uazapi.com";

    let generatedToken = `token-gen-${Math.floor(100000 + Math.random() * 900000)}`;

    // ── Passo 1: Criar instância (se admin token disponível) ──
    if (adminToken) {
      try {
        const createRes = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            instanceName,
            token: generatedToken
          })
        });

        if (createRes.ok) {
          const createData = await createRes.json();
          if (createData.token) {
            generatedToken = createData.token;
          }
          console.log("[UAZAPI_CREATE] Instância criada:", { instanceName });
        }
      } catch (err) {
        console.warn("[UAZAPI_CREATE] Falha ao criar instância (modo simulado será ativado):", err instanceof Error ? err.message : err);
      }
    }

    // ── Passo 2: Iniciar conexão via POST /instance/connect ──
    // UAZAPI v2: header `token`, body vazio para fluxo QR
    const isSimulated = generatedToken.startsWith("token-gen-");

    if (!isSimulated) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const connectRes = await fetch(`${baseUrl}/instance/connect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": generatedToken,
          },
          body: JSON.stringify({}),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const connectData = await connectRes.json() as Record<string, unknown>;

        // Log diagnóstico sanitizado (sem token)
        console.log("[UAZAPI_CONNECT_RESPONSE]", {
          httpStatus: connectRes.status,
          keys: Object.keys(connectData),
        });
      } catch (err) {
        console.warn("[UAZAPI_CONNECT] Falha ao chamar /instance/connect:", err instanceof Error ? err.message : err);
      }
    }

    // ── Passo 3: Salvar em whatsapp_connections ──
    const { data: existing } = await supabaseStateless
      .from("whatsapp_connections")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle();

    let connection;
    const connectionPayload = {
      connection_name: `WhatsApp - Nova Conexão`,
      base_url: baseUrl,
      instance_name: instanceName,
      instance_token: generatedToken,
      status: "waiting_qr",
      updated_at: new Date().toISOString()
    };

    if (existing) {
      const { data, error } = await supabaseStateless
        .from("whatsapp_connections")
        .update(connectionPayload)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      connection = data;
    } else {
      const { data, error } = await supabaseStateless
        .from("whatsapp_connections")
        .insert([{
          organization_id: orgId,
          provider: "uazapi",
          ...connectionPayload
        }])
        .select()
        .single();

      if (error) throw error;
      connection = data;
    }

    return NextResponse.json({
      success: true,
      instanceName: connection.instance_name,
      status: connection.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[CREATE_INSTANCE] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
