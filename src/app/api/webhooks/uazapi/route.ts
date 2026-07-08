import { NextRequest, NextResponse } from "next/server";
import { UazapiWebhookSchema } from "@/integrations/uazapi/schemas";
import { sanitizeUazapiPayload } from "@/integrations/uazapi/sanitize-payload";
import { normalizeUazapiMessage } from "@/integrations/uazapi/normalizers";
import { processIncomingMessage } from "@/services/whatsapp/process-incoming-message";
import { supabaseStateless } from "@/lib/supabaseStateless";

export async function GET() {
  return NextResponse.json({
    status: "online",
    provider: "uazapi",
  });
}

export async function POST(request: NextRequest) {
  try {
    let rawPayload: Record<string, unknown>;
    try {
      rawPayload = await request.json() as Record<string, unknown>;
    } catch {
      console.error("[UAZAPI Webhook] Invalid JSON payload received");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 1. Process messages event only
    if (rawPayload.EventType !== "messages") {
      return NextResponse.json({ ok: true, ignored: true, reason: "non_message_event" });
    }

    // 2. Ignore group chats
    const isGroupMessage =
      (rawPayload.message as Record<string, unknown> | undefined)?.isGroup === true ||
      (rawPayload.chat as Record<string, unknown> | undefined)?.wa_isGroup === true;

    if (isGroupMessage) {
      console.log("[UAZAPI Webhook] Group message ignored.");
      return NextResponse.json({ ok: true, ignored: true, reason: "group_message_ignored" });
    }

    // 3. Log checkpoint CRM_01
    const sanitized = sanitizeUazapiPayload(rawPayload) as {
      EventType: string;
      instanceName: string;
      owner?: string;
      message?: { messageid?: string; id?: string };
    };
    console.log("[CRM_01_WEBHOOK_RECEIVED]", {
      eventType: sanitized.EventType,
      instanceName: sanitized.instanceName,
      owner: sanitized.owner ? `${sanitized.owner.slice(0, 4)}***` : "null",
      messageId: sanitized.message?.messageid || sanitized.message?.id
    });

    // 4. Validate payload schema
    const parseResult = UazapiWebhookSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.warn("[UAZAPI Webhook] Payload validation failed:", parseResult.error.format());
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const payload = parseResult.data;

    // 5. Resolve connection dynamically
    const { data: connection, error: connError } = await supabaseStateless
      .from("whatsapp_connections")
      .select("*")
      .eq("provider", "uazapi")
      .eq("instance_name", payload.instanceName)
      .maybeSingle();

    if (connError) {
      console.error("[CRM_PROCESSING_ERROR] Connection lookup failed:", connError);
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    if (!connection) {
      console.warn(`[CRM_CONNECTION_NOT_FOUND] instanceName=${payload.instanceName} owner=${payload.owner}`);
      return NextResponse.json({ error: "Connection not registered" }, { status: 404 });
    }

    // Validate connection owner phone if available
    if (payload.owner && connection.owner_phone) {
      const cleanDbOwner = connection.owner_phone.replace(/\D/g, "");
      const cleanPayloadOwner = payload.owner.replace(/\D/g, "");
      if (cleanDbOwner !== cleanPayloadOwner) {
        console.warn(`[CRM_CONNECTION_OWNER_MISMATCH] DB owner=${cleanDbOwner} payload owner=${cleanPayloadOwner}`);
        return NextResponse.json({ error: "Connection owner mismatch" }, { status: 400 });
      }
    }

    const organizationId = connection.organization_id;
    console.log(`[CRM_02_ORGANIZATION_RESOLVED] organizationId=${organizationId}`);

    // 6. Normalize message
    const normalized = normalizeUazapiMessage(payload.message);
    const avatarUrl = payload.chat.imagePreview || payload.chat.image || "";

    // 7. Process CRM Updates (Contacts, Conversations, Leads, Stage History, Triggers)
    const crmResult = await processIncomingMessage(normalized, organizationId, avatarUrl);
    if (!crmResult.success) {
      console.error("[CRM_PROCESSING_ERROR]", {
        step: "CRM_PROCESS_INCOMING",
        errorCode: crmResult.reason || "CRM_FAILED",
        errorMessage: `Failed processing incoming message: ${crmResult.reason}`
      });
      return NextResponse.json({ error: crmResult.reason }, { status: 400 });
    }

    // 8. Publish Realtime Broadcast to the Inbox channel
    const broadcastPayload = {
      id: normalized.id,
      chatId: normalized.chatId,
      direction: normalized.direction,
      type: normalized.type,
      text: normalized.text,
      timestamp: normalized.timestamp,
      senderName: normalized.senderName,
      avatarUrl
    };

    const channel = supabaseStateless.channel(`whatsapp:${organizationId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "new_message",
            payload: broadcastPayload
          }).then(() => {
            supabaseStateless.removeChannel(channel);
            resolve();
          }).catch((err) => {
            console.error("[UAZAPI Webhook] Broadcast error:", err);
            resolve();
          });
        } else {
          resolve();
        }
      });
    });

    console.log(`[CRM_08_BROADCAST_SENT] Realtime broadcast emitted on channel whatsapp:${organizationId}`);
    console.log(`[CRM_09_COMPLETE] Webhook process finished successfully.`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal Server Error";
    const errCode = typeof error === "object" && error !== null && "code" in error
      ? String((error as Record<string, unknown>).code)
      : "UNKNOWN";

    console.error("[CRM_PROCESSING_ERROR]", {
      step: "WEBHOOK_HANDLER_CATCH",
      errorCode: errCode,
      errorMessage: errMsg
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
