// scratch/test-crm-flow.ts
import { processIncomingMessage } from "../src/services/whatsapp/process-incoming-message";
import { supabaseStateless } from "../src/lib/supabaseStateless";
import { normalizeUazapiMessage } from "../src/integrations/uazapi/normalizers";

async function runTest() {
  console.log("=== STARTING CRM INTEGRATION TEST ===");

  const orgId = "empresa-1";
  const testPhone = "553197922538";
  const JID = `${testPhone}@s.whatsapp.net`;
  const instanceToken = "d14056f5-787b-4c6b-922f-607b671718a8";

  // 1. Ensure the organization exists (default empresa-1 is created in migrations)
  // 2. Ensure connection exists for 'teste' with the token
  const { data: conn, error: connErr } = await supabaseStateless
    .from("whatsapp_connections")
    .upsert({
      organization_id: orgId,
      provider: "uazapi",
      instance_name: "teste",
      instance_token: instanceToken,
      owner_phone: "553199384130",
      status: "connected",
      updated_at: new Date().toISOString()
    }, { onConflict: "instance_name" })
    .select()
    .single();

  if (connErr) {
    console.error("Failed to setup test connection:", connErr);
    return;
  }
  console.log("Test connection setup complete:", conn.instance_name);

  // Clean up any existing test records for this phone number to ensure clean test
  const { data: existingContact } = await supabaseStateless
    .from("contacts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("phone_normalized", testPhone)
    .maybeSingle();

  if (existingContact) {
    console.log("Cleaning up existing test contact:", existingContact.id);
    await supabaseStateless.from("leads").delete().eq("contact_id", existingContact.id);
    await supabaseStateless.from("conversations").delete().eq("contact_id", existingContact.id);
    await supabaseStateless.from("contacts").delete().eq("id", existingContact.id);
  }

  // --- payload 1: TESTE CRM REAL 001 ---
  console.log("\n--- TRIGGERING PAYLOAD 001: TESTE CRM REAL 001 ---");
  const rawMsg1 = {
    chatid: JID,
    fromMe: false,
    messageid: "TEST-MSG-ID-001-" + Date.now(),
    messageTimestamp: Math.floor(Date.now() / 1000),
    text: "TESTE CRM REAL 001",
    type: "text",
    wasSentByApi: false
  };

  const normalized1 = normalizeUazapiMessage(rawMsg1 as any);
  const result1 = await processIncomingMessage(normalized1, orgId, "https://example.com/avatar1.png");
  console.log("Payload 001 processing result:", result1);

  // Inspect database after payload 1
  const contact1 = await supabaseStateless
    .from("contacts")
    .select("*")
    .eq("organization_id", orgId)
    .eq("phone_normalized", testPhone)
    .single();

  console.log("Database Contact state:", {
    id: contact1.data?.id,
    name: contact1.data?.name,
    whatsapp_name: contact1.data?.whatsapp_name,
    phone_normalized: contact1.data?.phone_normalized,
    avatar_url: contact1.data?.avatar_url
  });

  const lead1 = await supabaseStateless
    .from("leads")
    .select("*")
    .eq("organization_id", orgId)
    .eq("contact_id", contact1.data.id)
    .single();

  console.log("Database Lead state:", {
    id: lead1.data?.id,
    pipeline_stage_id: lead1.data?.pipeline_stage_id,
    status: lead1.data?.status
  });

  const history1 = await supabaseStateless
    .from("lead_stage_history")
    .select("*")
    .eq("lead_id", lead1.data.id);

  console.log("Database Lead Stage History entries count:", history1.data?.length);
  if (history1.data && history1.data.length > 0) {
    console.log("First history entry:", {
      from_stage: history1.data[0].from_stage,
      to_stage: history1.data[0].to_stage,
      source: history1.data[0].source,
      reason: history1.data[0].reason
    });
  }

  // Sincronidade de mensagens
  const messagesCount = await supabaseStateless
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", contact1.data.id);

  console.log("Database Raw Messages count for contact (expected 0):", messagesCount.count);

  // --- payload 2: TESTE CRM REAL 002 ---
  console.log("\n--- TRIGGERING PAYLOAD 002: TESTE CRM REAL 002 ---");
  const rawMsg2 = {
    chatid: JID,
    fromMe: false,
    messageid: "TEST-MSG-ID-002-" + Date.now(),
    messageTimestamp: Math.floor(Date.now() / 1000),
    text: "TESTE CRM REAL 002",
    type: "text",
    wasSentByApi: false
  };

  const normalized2 = normalizeUazapiMessage(rawMsg2 as any);
  const result2 = await processIncomingMessage(normalized2, orgId, "https://example.com/avatar2.png");
  console.log("Payload 002 processing result:", result2);

  // Inspect database after payload 2
  const contact2 = await supabaseStateless
    .from("contacts")
    .select("*")
    .eq("id", contact1.data.id)
    .single();

  console.log("Database Contact state after 002 (last_interaction should update, name remains):", {
    id: contact2.data?.id,
    name: contact2.data?.name,
    last_interaction_at: contact2.data?.last_interaction_at,
    avatar_url: contact2.data?.avatar_url
  });

  const leadsList = await supabaseStateless
    .from("leads")
    .select("*")
    .eq("organization_id", orgId)
    .eq("contact_id", contact1.data.id);

  console.log("Leads count (expected 1, no duplicate lead should be created):", leadsList.data?.length);

  const history2 = await supabaseStateless
    .from("lead_stage_history")
    .select("*")
    .eq("lead_id", lead1.data.id);

  console.log("Stage history entries count (expected 1, no new history created):", history2.data?.length);

  const finalMessagesCount = await supabaseStateless
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", contact1.data.id);

  console.log("Database Raw Messages count (expected 0):", finalMessagesCount.count);

  console.log("\n=== CRM INTEGRATION TEST COMPLETE ===");
}

runTest().catch(console.error);
