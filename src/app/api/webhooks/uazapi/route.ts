import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    provider: "uazapi",
  });
}

export async function POST(request: NextRequest) {
  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      console.error("[UAZAPI Webhook] Invalid JSON payload received");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
      console.warn("[UAZAPI Webhook] Empty payload received");
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    // Log the payload in an organized format to the server console
    console.log("=========================================");
    console.log(`[UAZAPI Webhook] Event Received at: ${new Date().toISOString()}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("=========================================");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[UAZAPI Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
