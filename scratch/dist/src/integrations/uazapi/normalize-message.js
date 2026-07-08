"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUazapiMessage = normalizeUazapiMessage;
function normalizeUazapiMessage(payload) {
    const { chat, message, instanceName, owner } = payload;
    const providerMessageId = message.messageid || message.id;
    const externalChatId = message.chatid || chat.wa_chatid;
    // Extract phone number from chatid (e.g. 553188647587@s.whatsapp.net) or fallback to chat.phone
    let phone = "";
    if (externalChatId && externalChatId.includes("@")) {
        phone = externalChatId.split("@")[0];
    }
    else {
        phone = chat.phone || chat.wa_chatid || "";
    }
    // Remove non-digit characters to normalize
    phone = phone.replace(/\D/g, "");
    // Contact name priority
    const contactName = chat.wa_name ||
        chat.wa_contactName ||
        chat.name ||
        phone;
    const direction = message.fromMe ? "outbound" : "inbound";
    const body = message.text || message.content || "";
    // Timestamp in seconds/milliseconds
    // Webhook messageTimestamp might be in milliseconds or seconds.
    // Standard Unix timestamp is in seconds or milliseconds. 1783470328000 is 13 digits (milliseconds).
    // If it is 10 digits (seconds), multiply by 1000.
    const timestamp = message.messageTimestamp;
    const sentAt = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    // Normalize messageType
    let messageType = "unknown";
    const typeLower = (message.type || "").toLowerCase();
    const rawMsgTypeLower = (message.messageType || "").toLowerCase();
    if (typeLower === "text" || typeLower === "conversation" || typeLower === "extended_text" || typeLower === "extendedtext" || rawMsgTypeLower === "conversation") {
        messageType = "text";
    }
    else if (typeLower === "image") {
        messageType = "image";
    }
    else if (typeLower === "audio" || typeLower === "ptt") {
        messageType = "audio";
    }
    else if (typeLower === "video") {
        messageType = "video";
    }
    else if (typeLower === "document") {
        messageType = "document";
    }
    const isGroup = !!(message.isGroup || chat.wa_isGroup);
    const wasSentByApi = !!message.wasSentByApi;
    return {
        provider: "uazapi",
        instanceName,
        owner,
        providerMessageId,
        externalChatId,
        phone,
        contactName,
        direction,
        messageType,
        body,
        sentAt,
        isGroup,
        wasSentByApi,
        rawPayload: payload,
    };
}
