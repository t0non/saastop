import { processIncomingMessage } from "./dist/src/services/whatsapp/process-incoming-message.js";
import { normalizeUazapiMessage } from "./dist/src/integrations/uazapi/normalize-message.js";

const payload = {
  "BaseUrl": "https://free.uazapi.com",
  "EventType": "messages",
  "chat": {
    "wa_chatid": "553197922538@s.whatsapp.net",
    "name": "Top Marketing BH",
    "owner": "553199384130",
    "phone": "+55 31 9792-2538",
    "wa_contactName": "Top Marketing BH",
    "wa_isGroup": false,
    "wa_name": "TOP MARKETING"
  },
  "instanceName": "teste",
  "message": {
    "chatid": "553197922538@s.whatsapp.net",
    "content": "Uuu",
    "fromMe": false,
    "id": "553199384130:A5250074652A0A7B048DDC451E4AFCAE",
    "isGroup": false,
    "messageTimestamp": 1783483501000,
    "messageType": "Conversation",
    "messageid": "A5250074652A0A7B048DDC451E4AFCAE",
    "owner": "553199384130",
    "text": "Uuu",
    "type": "text",
    "wasSentByApi": false
  },
  "owner": "553199384130",
  "token": "d14056f5-787b-4c6b-922f-607b671718a8"
};

async function run() {
  try {
    console.log("Normalizing message...");
    const normalized = normalizeUazapiMessage(payload);
    console.log("Normalized message:", JSON.stringify(normalized, null, 2));

    console.log("Processing incoming message...");
    const result = await processIncomingMessage(normalized, payload.token);
    console.log("Result:", result);
  } catch (err) {
    console.error("Error processing:", err);
  }
}

run();
