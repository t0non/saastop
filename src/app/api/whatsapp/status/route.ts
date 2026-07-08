import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { getInstanceStatus } from "@/integrations/uazapi/client";
import { normalizeUazapiInstanceStatus } from "@/integrations/uazapi/normalizers";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";

    // 2. Query active connection from DB
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (connError) {
      console.error("[STATUS_ROUTE] Database lookup error:", connError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ status: "not_configured" });
    }

    // 3. Fallback for simulations / mock token
    const isMockToken = connection.instance_token?.startsWith("token-gen-") || process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    if (isMockToken) {
      const isConnectedSim = connection.status === "connected";
      return NextResponse.json({
        status: connection.status || "waiting_qr",
        instanceName: connection.instance_name || "WhatsApp Simulador",
        phone: connection.owner_phone || "5531999999999",
        qrImageSrc: connection.status === "waiting_qr" ? "data:image/png;base64,iVBORw0KGgoAAA..." : null,
        pairCode: connection.status === "waiting_pair_code" ? "WXYZ-1234" : null,
        connected: isConnectedSim,
      });
    }

    const baseUrl = connection.base_url || "https://free.uazapi.com";
    const instanceToken = connection.instance_token;

    if (!instanceToken) {
      return NextResponse.json({ error: "Connection token missing" }, { status: 400 });
    }

    // 4. Fetch status from UAZAPI and normalize
    try {
      const raw = await getInstanceStatus(baseUrl, instanceToken);
      const normalized = normalizeUazapiInstanceStatus(raw);

      // 5. Update connection status in DB if needed
      const isConnected = normalized.connected;
      let statusToSave = normalized.status;
      
      // If UAZAPI says connected, update DB to connected and connected_at
      // Otherwise maintain the state waiting_qr or waiting_pair_code unless UAZAPI explicitly shows disconnected/connecting
      if (isConnected) {
        statusToSave = "connected";
      } else if (normalized.status === "disconnected") {
        // If UAZAPI is disconnected but database is in waiting QR state, we can keep it as waiting_qr/waiting_pair_code
        // unless it's a hard disconnect
        if (connection.status === "waiting_qr" || connection.status === "waiting_pair_code") {
          statusToSave = connection.status;
        }
      }

      const updates: Record<string, string | null> = {
        status: statusToSave,
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isConnected && !connection.connected_at) {
        updates.connected_at = new Date().toISOString();
      }
      if (normalized.phone && normalized.phone !== connection.owner_phone) {
        updates.owner_phone = normalized.phone;
      }

      await supabase
        .from("whatsapp_connections")
        .update(updates)
        .eq("id", connection.id);

      return NextResponse.json({
        status: statusToSave,
        instanceName: normalized.instanceName || connection.instance_name,
        phone: normalized.phone || connection.owner_phone,
        qrImageSrc: normalized.qrImageSrc,
        pairCode: normalized.pairCode,
        connected: isConnected,
      });
    } catch (apiErr) {
      console.warn("[STATUS_ROUTE] Provider status lookup failed:", apiErr);
      // Return local connection status as fallback
      return NextResponse.json({
        status: connection.status,
        instanceName: connection.instance_name,
        phone: connection.owner_phone,
        qrImageSrc: null,
        pairCode: null,
        connected: connection.status === "connected",
        providerError: true
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STATUS_ROUTE] Unhandled error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
