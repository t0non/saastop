import { NextRequest, NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

export async function GET(request: NextRequest) {
  try {
    const orgId = "empresa-1";

    const { data: connection, error } = await supabaseStateless
      .from("whatsapp_connections")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error || !connection) {
      return NextResponse.json({ error: "No connection configured" }, { status: 404 });
    }

    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
    const dummyQr = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADt1UxCAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QgKDBQyNzA7aAAAAD1JREFUOMtjYBgF2gxwEGBgYAziYGBgWMTBwMDwiIOBgfERBwMD4ykOBgYGxmcMDAxMDwQYGBj2MzAwMD8CADWvB1N5T7rRAAAAAElFTkSuQmCC";

    if (isDemoMode || connection.instance_token.startsWith("token-gen-")) {
      setTimeout(async () => {
        try {
          await supabaseStateless
            .from("whatsapp_connections")
            .update({
              status: "connected",
              owner_phone: "5531999999999",
              connected_at: new Date().toISOString()
            })
            .eq("id", connection.id);
        } catch (e) {
          console.error("Error simulating QR pairing:", e);
        }
      }, 7000);

      return NextResponse.json({ qr: dummyQr });
    }

    const qrUrl = `${connection.base_url}/instance/qr?token=${connection.instance_token}`;
    try {
      const res = await fetch(qrUrl);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ qr: data.qr || data.qrcode || dummyQr });
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({ qr: dummyQr });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
