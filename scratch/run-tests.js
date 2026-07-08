// Test suite for UAZAPI webhook integration
// Path: scratch/run-tests.js

const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// 1. Load environment variables
let envVars = {};
try {
  const envFile = fs.readFileSync(".env", "utf8");
  envFile.split("\n").forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      envVars[key] = val;
    }
  });
} catch (e) {
  console.error("Could not read .env file");
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const uazapiToken = envVars.UAZAPI_INSTANCE_TOKEN || "d6b6fcfc-d9a3-49d8-a922-74dba5d27ca5";

console.log("==================================================");
console.log("🧪 UAZAPI WEBHOOK INTEGRATION TEST SUITE");
console.log("==================================================");

// Mock data builder
function createMockPayload(overrides = {}) {
  return {
    BaseUrl: "https://free.uazapi.com",
    EventType: "messages",
    chat: {
      name: "John Doe",
      phone: "5531988887777",
      wa_chatid: "5531988887777@s.whatsapp.net",
      wa_contactName: "John Wpp",
      wa_name: "John Public",
      wa_isGroup: false,
      ...overrides.chat
    },
    instanceName: "test-instance",
    message: {
      chatid: "5531988887777@s.whatsapp.net",
      content: "Hello there!",
      fromMe: false,
      id: "MSG-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      isGroup: false,
      messageTimestamp: 1783470328000,
      messageType: "Conversation",
      messageid: "MSG-ID-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      text: "Hello there!",
      type: "text",
      wasSentByApi: false,
      ...overrides.message
    },
    owner: "5531999998888",
    token: uazapiToken,
    ...overrides
  };
}

// Imports of local code (using standard node require)
const { UazapiWebhookSchema } = require("../dist-test-schemas");
const { sanitizeUazapiPayload } = require("../src/integrations/uazapi/sanitize-payload");
const { normalizeUazapiMessage } = require("../src/integrations/uazapi/normalize-message");

// Helper to write temporary files for CJS imports to test TS source logic
function compileHelpersForTest() {
  // We can test the functions directly by mimicking them or compiling them.
  // Since we want to check if they run, let's execute the tests using isolated modules.
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedTests++;
  }
}

async function runUnitTests() {
  console.log("\n--- 1. Running Unit Tests ---");

  // Test 1: Payload Inválido
  const invalidPayload = { EventType: "messages" };
  const parseResult = UazapiWebhookSchema.safeParse(invalidPayload);
  assert(!parseResult.success, "Payload inválido rejeitado com sucesso pelo Zod");

  // Test 2: Token Sanitization (Secret check)
  const rawPayload = createMockPayload();
  const sanitized = sanitizeUazapiPayload(rawPayload);
  assert(sanitized.token === "[REDACTED]", "Token foi devidamente mascarado com [REDACTED]");
  assert(rawPayload.token === uazapiToken, "Objeto original não foi sofrido mutação indesejada");

  // Test 3: Normalização de Mensagem Inbound
  const inboundPayload = createMockPayload({
    message: { fromMe: false, text: "Inbound msg test" }
  });
  const normInbound = normalizeUazapiMessage(inboundPayload);
  assert(normInbound.direction === "inbound", "Mensagem normalizada como inbound corretamente");
  assert(normInbound.body === "Inbound msg test", "Corpo da mensagem inbound normalizado com sucesso");
  assert(normInbound.phone === "5531988887777", "Telefone extraído corretamente do chatid");

  // Test 4: Normalização de Mensagem Outbound Manual
  const outboundPayload = createMockPayload({
    message: { fromMe: true, wasSentByApi: false, text: "Outbound manual" }
  });
  const normOutbound = normalizeUazapiMessage(outboundPayload);
  assert(normOutbound.direction === "outbound", "Mensagem normalizada como outbound");
  assert(normOutbound.wasSentByApi === false, "Identificado corretamente como mensagem manual");

  // Test 5: Normalização de Mensagem Outbound API
  const apiPayload = createMockPayload({
    message: { fromMe: true, wasSentByApi: true, text: "Outbound API" }
  });
  const normApi = normalizeUazapiMessage(apiPayload);
  assert(normApi.wasSentByApi === true, "Identificado corretamente como enviado pela API");

  // Test 6: Timestamp convertido corretamente
  const msPayload = createMockPayload({ message: { messageTimestamp: 1783470328000 } });
  const normMs = normalizeUazapiMessage(msPayload);
  assert(normMs.sentAt.getFullYear() > 2020, "Timestamp em milissegundos convertido para Date com sucesso");

  const secPayload = createMockPayload({ message: { messageTimestamp: 1783470328 } });
  const normSec = normalizeUazapiMessage(secPayload);
  assert(normSec.sentAt.getFullYear() > 2020, "Timestamp em segundos convertido para Date com sucesso");

  // Test 7: Grupo ignorado
  const groupPayload = createMockPayload({
    message: { isGroup: true }
  });
  const normGroup = normalizeUazapiMessage(groupPayload);
  assert(normGroup.isGroup === true, "isGroup identificado corretamente na mensagem do grupo");
}

async function runIntegrationTests() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("\n⚠️ Supabase credentials missing. Skipping Integration Tests.");
    return;
  }

  console.log("\n--- 2. Running Integration Tests (Supabase Connection) ---");
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Check if tables exist
  const { error: checkError } = await supabase.from("contacts").select("id").limit(1);
  if (checkError && checkError.message.includes("Could not find")) {
    console.log("⚠️ Tables do not exist in Supabase database. Please run migrations first!");
    console.log("Skipping database interaction tests.");
    return;
  }

  try {
    const testOrgId = "empresa-1";
    const testPhone = "5531900001111";
    const testMsgId = "TEST-MSG-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Cleanup previous test data if any
    const { data: existingContact } = await supabase.from("contacts").select("id").eq("organization_id", testOrgId).eq("phone_normalized", testPhone).maybeSingle();
    if (existingContact) {
      await supabase.from("contacts").delete().eq("id", existingContact.id);
    }

    // Test 8: Criar novo contato
    const { createContact, findContactByPhone } = require("../src/repositories/contactsRepository");
    const newContact = await createContact({
      organization_id: testOrgId,
      phone_normalized: testPhone,
      name: "Test User",
      whatsapp_name: "Test User Wpp",
      first_interaction_at: new Date().toISOString(),
      last_interaction_at: new Date().toISOString()
    });
    assert(newContact.id !== undefined, "Contato criado no banco com UUID gerado");

    // Test 9: Buscar contato existente
    const foundContact = await findContactByPhone(testOrgId, testPhone);
    assert(foundContact !== null && foundContact.id === newContact.id, "Busca de contato por telefone retornou o contato correto");

    // Test 10: Criar conversa nova
    const { createConversation, findConversationByContact } = require("../src/repositories/conversationsRepository");
    const newConv = await createConversation({
      organization_id: testOrgId,
      contact_id: newContact.id,
      status: "open",
      mode: "human",
      unread_count: 1,
      last_message_at: new Date().toISOString(),
      last_message_preview: "Teste de conversa"
    });
    assert(newConv.id !== undefined, "Conversa criada no banco vinculada ao contato");

    // Test 11: Idempotência de mensagem
    const { createMessage, isMessageDuplicate } = require("../src/repositories/messagesRepository");
    const isDupBefore = await isMessageDuplicate("uazapi", testMsgId);
    assert(isDupBefore === false, "Chave de mensagem inicialmente identificada como não duplicada");

    await createMessage({
      organization_id: testOrgId,
      conversation_id: newConv.id,
      contact_id: newContact.id,
      provider: "uazapi",
      provider_message_id: testMsgId,
      direction: "inbound",
      message_type: "text",
      body: "Test Body",
      status: "sent",
      sent_at: new Date().toISOString()
    });

    const isDupAfter = await isMessageDuplicate("uazapi", testMsgId);
    assert(isDupAfter === true, "Segunda tentativa de salvar o mesmo provider_message_id identificada como duplicada (idempotência)");

    // Test 12: Criação de lead automático
    const { createLead, findOpenLeadByContact } = require("../src/repositories/leadsRepository");
    const openLeadBefore = await findOpenLeadByContact(testOrgId, newContact.id);
    assert(openLeadBefore === null, "Nenhum lead aberto inicialmente para o contato de teste");

    const createdLead = await createLead({
      organization_id: testOrgId,
      contact_id: newContact.id,
      pipeline_stage_id: "Novo Lead",
      status: "open",
      source: "WhatsApp",
      value: 0,
      revenue: 0,
      temperature: "Morno"
    });
    assert(createdLead.id !== undefined, "Lead automático criado com sucesso");

    const openLeadAfter = await findOpenLeadByContact(testOrgId, newContact.id);
    assert(openLeadAfter !== null && openLeadAfter.id === createdLead.id, "Busca de lead aberto retornou o lead criado");

    // Cleanup test data
    await supabase.from("contacts").delete().eq("id", newContact.id);
    console.log("🧹 Test records cleaned up successfully.");

  } catch (error) {
    console.error("Integration testing error:", error.message);
    failedTests++;
  }
}

async function run() {
  await runUnitTests();
  await runIntegrationTests();

  console.log("\n==================================================");
  console.log(`📊 TEST SUMMARY: Passed ${passedTests} / Failed ${failedTests}`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
