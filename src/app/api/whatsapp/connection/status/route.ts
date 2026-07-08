import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { getInstanceStatus } from "@/integrations/uazapi/client";
import { normalizeUazapiInstanceStatus } from "@/integrations/uazapi/normalizers";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";

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

    console.log(`[WA_STATUS_CONNECTION_FOUND]`, {
      connectionId: connection.id,
      organizationId: orgId,
      baseUrl: connection.base_url,
      instanceName: connection.instance_name,
      localStatus: connection.status
    });

    const isMockToken = connection.instance_token?.startsWith("token-gen-") || process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    if (isMockToken) {
      const isConnectedSim = connection.status === "connected";
      return NextResponse.json({
        status: connection.status || "waiting_qr",
        connected: isConnectedSim,
        instanceName: connection.instance_name || "WhatsApp Simulador",
        phone: connection.owner_phone || "5531999999999",
        hasQrCode: connection.status === "waiting_qr",
        hasPairCode: connection.status === "waiting_pair_code",
        qrImageSrc: connection.status === "waiting_qr" ? "data:image/png;base64,iVBORw0KGgoAAA..." : null,
        pairCode: connection.status === "waiting_pair_code" ? "WXYZ-1234" : null
      });
    }

    const baseUrl = connection.base_url || "https://free.uazapi.com";
    const instanceToken = connection.instance_token;

    if (!instanceToken) {
      return NextResponse.json({ error: "Connection token missing" }, { status: 400 });
    }

    console.log(`[WA_STATUS_REQUEST]`, { url: `${baseUrl}/instance/status` });

    try {
      const raw = await getInstanceStatus(baseUrl, instanceToken);
      const normalized = normalizeUazapiInstanceStatus(raw);

      console.log(`[WA_STATUS_RESPONSE]`, {
        instanceName: normalized.instanceName,
        status: normalized.status,
        connected: normalized.connected,
        phone: normalized.phone
      });

      if (normalized.instanceName && connection.instance_name) {
        if (normalized.instanceName !== connection.instance_name) {
           console.warn(`[WA_INSTANCE_MISMATCH]`, {
              saved: connection.instance_name,
              received: normalized.instanceName
           });
        }
      }

      const isConnected = normalized.connected;
      let statusToSave = normalized.status;

      if (isConnected) {
        statusToSave = "connected";
      } else if (statusToSave === "disconnected" || statusToSave === "hibernated" || statusToSave === "connecting") {
         // status from normalized
      } else {
        if (connection.status === "waiting_qr" || connection.status === "waiting_pair_code") {
          statusToSave = connection.status;
        } else {
           statusToSave = "disconnected";
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

      console.log(`[WA_STATUS_SYNCED]`, {
        connectionId: connection.id,
        savedStatus: statusToSave
      });

      console.log(`[WA_STATUS_FRONTEND_UPDATED]`, {
         status: statusToSave,
         connected: isConnected,
         instanceName: normalized.instanceName || connection.instance_name,
         phone: normalized.phone || connection.owner_phone,
         hasQrCode: !!normalized.qrImageSrc,
         hasPairCode: !!normalized.pairCode
      });

      return NextResponse.json({
        status: statusToSave,
        connected: isConnected,
        instanceName: normalized.instanceName || connection.instance_name,
        phone: normalized.phone || connection.owner_phone,
        hasQrCode: !!normalized.qrImageSrc,
        hasPairCode: !!normalized.pairCode,
        qrImageSrc: normalized.qrImageSrc,
        pairCode: normalized.pairCode,
        connection_name: connection.connection_name || connection.instance_name || "WhatsApp Principal",
        base_url: connection.base_url || "https://free.uazapi.com",
        connected_at: connection.connected_at,
        last_health_check_at: updates.last_health_check_at,
      });
    } catch (apiErr) {
      console.warn("[STATUS_ROUTE] Provider status lookup failed:", apiErr);
      return NextResponse.json({
        status: connection.status,
        connected: connection.status === "connected",
        instanceName: connection.instance_name,
        phone: connection.owner_phone,
        hasQrCode: false,
        hasPairCode: false,
        providerError: true,
        connection_name: connection.connection_name || connection.instance_name || "WhatsApp Principal",
        base_url: connection.base_url || "https://free.uazapi.com",
        connected_at: connection.connected_at,
        last_health_check_at: connection.last_health_check_at,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STATUS_ROUTE] Unhandled error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
