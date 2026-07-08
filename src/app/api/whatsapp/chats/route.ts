import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { findChats } from "@/integrations/uazapi/client";
import { normalizeUazapiChat } from "@/integrations/uazapi/normalizers";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Resolve organization_id dynamically
    const organizationId = user.user_metadata?.organization_id || user.app_metadata?.organization_id;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // 3. Get WhatsApp Connection
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (connError) {
      console.error("[CHATS_ROUTE] Database connection lookup error:", connError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ status: "not_configured", chats: [] });
    }

    console.log(`[BOOT_01_CONNECTION_RESOLVED] org=${organizationId} instance=${connection.instance_name} status=${connection.status}`);

    // If connection status is disconnected, we return provider offline / disconnected
    if (connection.status !== "connected") {
      return NextResponse.json({ status: "disconnected", chats: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 4. Fetch chats from UAZAPI
    const baseUrl = connection.base_url || "https://free.uazapi.com";
    const instanceToken = connection.instance_token;

    if (!instanceToken) {
      return NextResponse.json({ error: "Missing connection token" }, { status: 400 });
    }

    try {
      console.log(`[BOOT_02_CHAT_FIND_REQUEST] limit=${limit} offset=${offset}`);
      const data = await findChats(baseUrl, instanceToken, limit, offset);
      console.log(`[BOOT_03_CHAT_FIND_SUCCESS] rawChatsCount=${(data.chats || []).length}`);
      const normalizedChats = (data.chats || []).map(normalizeUazapiChat);
      console.log(`[BOOT_04_CHATS_NORMALIZED] normalizedCount=${normalizedChats.length}`);

      return NextResponse.json({
        status: "success",
        chats: normalizedChats,
        hasMore: normalizedChats.length === limit
      });
    } catch (apiErr) {
      console.error("[CHATS_ROUTE] UAZAPI fetch failed:", apiErr);
      return NextResponse.json({
        status: "error",
        code: "PROVIDER_OFFLINE",
        message: "Falha ao conectar com o servidor da UAZAPI."
      }, { status: 502 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CHATS_ROUTE] Unhandled error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
