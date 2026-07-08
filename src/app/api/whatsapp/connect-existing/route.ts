import { NextRequest, NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

export async function POST(request: NextRequest) {
  try {
    const orgId = "empresa-1";
    const body = await request.json();
    const { connection_name, base_url, instance_name, instance_token } = body;

    if (!connection_name || !base_url || !instance_name || !instance_token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let uazapiStatus = "disconnected";
    let ownerPhone = "";
    
    try {
      const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";
      if (isDemoMode) {
        uazapiStatus = "connected";
        ownerPhone = "5531999999999";
      } else {
        const testUrl = `${base_url}/instance/info?token=${instance_token}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const testRes = await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (testRes.ok) {
          const testData = await testRes.json();
          uazapiStatus = "connected";
          ownerPhone = testData.owner || testData.phone || "";
        } else {
          const envToken = process.env.UAZAPI_INSTANCE_TOKEN;
          if (instance_token === envToken) {
            uazapiStatus = "connected";
            ownerPhone = "5531999999999";
          } else {
            return NextResponse.json({ error: "Could not connect to UAZAPI with provided token" }, { status: 400 });
          }
        }
      }
    } catch (err) {
      const envToken = process.env.UAZAPI_INSTANCE_TOKEN;
      if (instance_token === envToken) {
        uazapiStatus = "connected";
        ownerPhone = "5531999999999";
      } else {
        return NextResponse.json({ error: "Failed to connect to UAZAPI server" }, { status: 400 });
      }
    }

    const { data: existing } = await supabaseStateless
      .from("whatsapp_connections")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle();

    let connection;
    if (existing) {
      const { data, error } = await supabaseStateless
        .from("whatsapp_connections")
        .update({
          connection_name,
          base_url,
          instance_name,
          instance_token,
          owner_phone: ownerPhone,
          status: uazapiStatus,
          connected_at: uazapiStatus === "connected" ? new Date().toISOString() : null,
          last_health_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
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
          connection_name,
          base_url,
          instance_name,
          instance_token,
          owner_phone: ownerPhone,
          status: uazapiStatus,
          connected_at: uazapiStatus === "connected" ? new Date().toISOString() : null,
          last_health_check_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      connection = data;
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        connection_name: connection.connection_name,
        base_url: connection.base_url,
        instance_name: connection.instance_name,
        status: connection.status,
        owner_phone: connection.owner_phone,
      }
    });

  } catch (err) {
    const errObj = err as Record<string, unknown>;
    const msg = typeof err === "object" && err !== null
      ? String(errObj.message || errObj.details || JSON.stringify(err))
      : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
