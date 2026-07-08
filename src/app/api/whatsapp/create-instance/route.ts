import { NextRequest, NextResponse } from "next/server";
import { supabaseStateless } from "@/lib/supabaseStateless";

export async function POST(request: NextRequest) {
  try {
    const orgId = "empresa-1";
    const instanceName = `top-instance-${orgId}-${Math.floor(1000 + Math.random() * 9000)}`;
    const adminToken = process.env.UAZAPI_ADMIN_TOKEN;
    const baseUrl = process.env.UAZAPI_BASE_URL || "https://free.uazapi.com";

    let generatedToken = `token-gen-${Math.floor(100000 + Math.random() * 900000)}`;
    
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
        }
      } catch (err) {
        console.warn("Could not reach UAZAPI admin server, running connection auto-simulation:", err);
      }
    }

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
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
