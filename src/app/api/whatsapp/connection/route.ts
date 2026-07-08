import { NextRequest, NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

export async function GET(request: NextRequest) {
  try {
    const orgId = "empresa-1"; // Pilot organization fallback

    // Query active connection
    const { data: connection, error } = await supabaseStateless
      .from("whatsapp_connections")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ status: "not_configured" });
    }

    // Mask sensitive token
    const maskedConnection = {
      id: connection.id,
      connection_name: connection.connection_name || connection.instance_name || "WhatsApp Principal",
      base_url: connection.base_url || "https://free.uazapi.com",
      instance_name: connection.instance_name,
      owner_phone: connection.owner_phone || "",
      status: connection.status,
      connected_at: connection.connected_at,
      last_health_check_at: connection.last_health_check_at,
    };

    return NextResponse.json(maskedConnection);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const orgId = "empresa-1";

    const { error } = await supabaseStateless
      .from("whatsapp_connections")
      .delete()
      .eq("organization_id", orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
