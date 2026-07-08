import { NextRequest, NextResponse } from "next/server";
import { UazapiWebhookSchema } from "../../../../integrations/uazapi/schemas";
import { sanitizeUazapiPayload } from "../../../../integrations/uazapi/sanitize-payload";
import { normalizeUazapiMessage } from "../../../../integrations/uazapi/normalize-message";
import { processIncomingMessage } from "../../../../services/whatsapp/process-incoming-message";

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

    // 1. Sanitize payload for logging
    const sanitized = sanitizeUazapiPayload(rawPayload);
    console.log("[UAZAPI_WEBHOOK_PAYLOAD]", JSON.stringify(sanitized, null, 2));

    // 2. Validate payload schema
    const parseResult = UazapiWebhookSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.warn("[UAZAPI Webhook] Payload validation failed:", parseResult.error.format());
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const payload = parseResult.data;

    // 3. Extract specific diagnostic logs if present (for extra logging safety)
    const keysToCheck = ["event", "type", "chatid", "sender", "phone", "messageid", "text", "fromMe", "timestamp"];
    const extracted: Record<string, unknown> = {};
    const dataVal = rawPayload["data"];

    for (const key of keysToCheck) {
      if (rawPayload[key] !== undefined) {
        extracted[key] = rawPayload[key];
      } else if (
        dataVal &&
        typeof dataVal === "object" &&
        (dataVal as Record<string, unknown>)[key] !== undefined
      ) {
        extracted[key] = (dataVal as Record<string, unknown>)[key];
      }
    }

    if (Object.keys(extracted).length > 0) {
      console.log("[UAZAPI_WEBHOOK_FIELDS]", JSON.stringify(extracted, null, 2));
    }

    // 4. Normalize message
    const normalized = normalizeUazapiMessage(payload);

    // 5. Process incoming message (auth, deduplicate, save contact/conv/msg/lead)
    const result = await processIncomingMessage(normalized, payload.token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.reason }, 
        { status: result.reason === "Unauthorized token" ? 401 : 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[UAZAPI Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
