import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { findMessages } from "@/integrations/uazapi/client";
import { normalizeUazapiMessage } from "@/integrations/uazapi/normalizers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // 1. Resolve dynamic params (params is a promise in Next.js 15+)
    const { chatId } = await params;
    const decodedChatId = decodeURIComponent(chatId);

    if (!decodedChatId) {
      return NextResponse.json({ error: "Missing chatId parameter" }, { status: 400 });
    }

    // 2. Authenticate user
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Resolve organization_id dynamically
    const organizationId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";

    // 4. Get WhatsApp Connection
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (connError) {
      console.error("[MESSAGES_ROUTE] Database connection lookup error:", connError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ status: "not_configured", messages: [] });
    }

    if (connection.status !== "connected") {
      return NextResponse.json({ status: "disconnected", messages: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 5. Fetch messages from UAZAPI
    const baseUrl = connection.base_url || "https://free.uazapi.com";
    const instanceToken = connection.instance_token;

    if (!instanceToken) {
      return NextResponse.json({ error: "Missing connection token" }, { status: 400 });
    }

    try {
      const data = await findMessages(baseUrl, instanceToken, decodedChatId, limit, offset);
      const normalizedMessages = (data.messages || []).map(normalizeUazapiMessage);

      return NextResponse.json({
        status: "success",
        messages: normalizedMessages,
        hasMore: data.hasMore ?? (normalizedMessages.length === limit)
      });
    } catch (apiErr) {
      console.error("[MESSAGES_ROUTE] UAZAPI fetch failed:", apiErr);
      return NextResponse.json({
        status: "error",
        code: "PROVIDER_OFFLINE",
        message: "Falha ao carregar histórico de mensagens da UAZAPI."
      }, { status: 502 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[MESSAGES_ROUTE] Unhandled error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
