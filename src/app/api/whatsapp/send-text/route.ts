import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseServer";
import { sendText } from "@/integrations/uazapi/client";
import { normalizeUazapiMessage } from "@/integrations/uazapi/normalizers";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Resolve organization_id dynamically
    const organizationId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";

    // 3. Parse request payload
    const body = await request.json().catch(() => ({}));
    const { chatId, phone, text } = body;
    const recipient = chatId || phone;

    if (!recipient || !text) {
      return NextResponse.json({ error: "Missing recipient (chatId/phone) or text" }, { status: 400 });
    }

    // 4. Get WhatsApp Connection
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (connError) {
      console.error("[SEND_TEXT_ROUTE] Database lookup error:", connError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ error: "WhatsApp connection not configured" }, { status: 400 });
    }

    if (connection.status !== "connected") {
      return NextResponse.json({ error: "WhatsApp is not connected" }, { status: 400 });
    }

    const baseUrl = connection.base_url || "https://free.uazapi.com";
    const instanceToken = connection.instance_token;

    if (!instanceToken) {
      return NextResponse.json({ error: "Connection token missing" }, { status: 400 });
    }

    // 5. Send message via UAZAPI
    try {
      const apiResponse = await sendText(baseUrl, instanceToken, recipient, text);
      
      // 6. Normalize response
      const normalizedMessage = normalizeUazapiMessage(apiResponse);

      // 7. Publish realtime broadcast
      const channel = supabase.channel(`whatsapp:${organizationId}`);
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel.send({
              type: "broadcast",
              event: "new_message",
              payload: normalizedMessage
            }).then(() => {
              supabase.removeChannel(channel);
              resolve();
            }).catch((err) => {
              console.error("[SEND_TEXT_ROUTE] Broadcast send error:", err);
              resolve();
            });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            resolve();
          }
        });
      });

      return NextResponse.json({
        success: true,
        messageId: normalizedMessage.id,
        status: normalizedMessage.status,
        message: normalizedMessage
      });
    } catch (apiErr) {
      console.error("[SEND_TEXT_ROUTE] UAZAPI send failed:", apiErr);
      return NextResponse.json({
        error: "Failed to send message via WhatsApp provider"
      }, { status: 502 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SEND_TEXT_ROUTE] Unhandled error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
