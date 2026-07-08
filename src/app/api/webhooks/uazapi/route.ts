import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    provider: "uazapi",
  });
}

export async function POST(request: NextRequest) {
  try {
    let payload: Record<string, unknown>;
    try {
      payload = await request.json() as Record<string, unknown>;
    } catch {
      console.error("[UAZAPI Webhook] Invalid JSON payload received");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
      console.warn("[UAZAPI Webhook] Empty payload received");
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    // Log the full payload with the searchable prefix
    console.log("[UAZAPI_WEBHOOK_PAYLOAD]", JSON.stringify(payload, null, 2));

    // Extract and log specific fields if they exist at root or nested under 'data'
    const keysToCheck = ["event", "type", "chatid", "sender", "phone", "messageid", "text", "fromMe", "timestamp"];
    const extracted: Record<string, unknown> = {};
    const dataVal = payload["data"];

    for (const key of keysToCheck) {
      if (payload[key] !== undefined) {
        extracted[key] = payload[key];
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[UAZAPI Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
