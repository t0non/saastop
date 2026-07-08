import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { listContacts } from "@/integrations/uazapi/client";
import { normalizeUazapiContact } from "@/integrations/uazapi/normalizers";

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

    console.log(`[CONTACTS_01_REQUEST] org=${organizationId}`);

    // 3. Get WhatsApp Connection
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (connError) {
      console.error("[CONTACTS_ROUTE] Database connection lookup error:", connError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ status: "not_configured", contacts: [] });
    }

    if (connection.status !== "connected") {
      return NextResponse.json({ status: "disconnected", contacts: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const scope = searchParams.get("scope") || "all";

    // 4. Fetch contacts from UAZAPI
    const baseUrl = connection.base_url || "https://free.uazapi.com";
    const instanceToken = connection.instance_token;

    if (!instanceToken) {
      return NextResponse.json({ error: "Missing connection token" }, { status: 400 });
    }

    try {
      console.log(`[CONTACTS_02_PROVIDER_REQUEST] limit=${limit} offset=${offset} scope=${scope}`);
      const data = await listContacts(baseUrl, instanceToken, limit, offset, scope);
      const normalizedContacts = (data.contacts || []).map(normalizeUazapiContact);

      console.log(`[CONTACTS_03_NORMALIZED] count=${normalizedContacts.length} totalDevice=${data.totalDeviceContacts || "N/A"}`);

      return NextResponse.json({
        status: "success",
        contacts: normalizedContacts,
        totalDeviceContacts: data.totalDeviceContacts,
        pagination: data.pagination || null,
        hasMore: normalizedContacts.length === limit
      });
    } catch (apiErr) {
      console.error("[CONTACTS_ROUTE] UAZAPI fetch failed:", apiErr);
      return NextResponse.json({
        status: "error",
        code: "PROVIDER_OFFLINE",
        message: "Falha ao conectar com o servidor da UAZAPI."
      }, { status: 502 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CONTACTS_ROUTE] Unhandled error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
