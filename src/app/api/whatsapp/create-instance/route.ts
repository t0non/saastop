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
/**
 * Normaliza o código de pareamento retornado pela UAZAPI.
 * Faz uma busca recursiva para encontrar qualquer padrão de 8 caracteres alfanuméricos.
 */
function normalizeUazapiPairCodeResponse(raw: unknown): string | null {
  if (!raw) return null;

  const commonKeys = ["code", "pairingCode", "pairCode", "pairing_code"];
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    for (const key of commonKeys) {
      if (typeof obj[key] === "string") {
        const val = obj[key] as string;
        const clean = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (clean.length === 8) {
          return `${clean.slice(0, 4)}-${clean.slice(4)}`;
        }
      }
    }
  }

  let foundCode: string | null = null;
  const search = (node: unknown) => {
    if (foundCode) return;
    if (typeof node === "string") {
      const clean = node.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (clean.length === 8) {
        foundCode = `${clean.slice(0, 4)}-${clean.slice(4)}`;
      }
    } else if (typeof node === "object" && node !== null) {
      for (const val of Object.values(node)) {
        search(val);
      }
    }
  };

  search(raw);
  return foundCode;
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
        return NextResponse.json({ error: "Nenhuma conexão existente configurada para parear." }, { status: 400 });
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
    }

    isSimulated = generatedToken.startsWith("token-gen-") || process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";

    // ── Passo 2: Iniciar conexão via POST /instance/connect ──
    let pairCode: string | null = null;

    if (isSimulated) {
      if (method === "pairing") {
        pairCode = "WXYZ-1234";
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

        const connectData = await connectRes.json() as Record<string, unknown>;

        // Log diagnóstico sanitizado (sem tokens/secrets)
        console.log("[UAZAPI_CONNECT_RESPONSE]", {
          httpStatus: connectRes.status,
          keys: Object.keys(connectData),
        });

        if (!connectRes.ok) {
          return NextResponse.json({
            error: `Erro ao conectar UAZAPI: HTTP ${connectRes.status}`
          }, { status: 400 });
        }

        if (method === "pairing") {
          pairCode = normalizeUazapiPairCodeResponse(connectData);
          if (!pairCode) {
            return NextResponse.json({
              error: "Código de pareamento não retornado pela UAZAPI."
            }, { status: 400 });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[UAZAPI_CONNECT] Falha ao chamar /instance/connect:", msg);
        return NextResponse.json({
          error: `Falha na chamada de pareamento: ${msg}`
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

    let connection;
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
      pairCode: pairCode || undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[CREATE_INSTANCE] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
