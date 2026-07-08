import { UazapiChat, UazapiMessage, UazapiInstanceStatusResponse } from "./schemas";
import { NormalizedChat, NormalizedMessage, NormalizedInstanceStatus } from "./types";

export function normalizeUazapiChat(chat: UazapiChat): NormalizedChat {
  const chatId = chat.wa_chatid;
  
  // Extract phone number from chatid (e.g. 553197922538@s.whatsapp.net) or use chat.phone
  let phone = chat.phone || "";
  if (!phone && chatId && chatId.includes("@")) {
    phone = chatId.split("@")[0];
  }
  // Sanitize phone
  phone = phone.replace(/\D/g, "");

  const name = chat.name || chat.wa_contactName || chat.wa_name || phone || "Contato Sem Nome";
  const whatsappName = chat.wa_name || "";
  const avatarUrl = chat.imagePreview || chat.image || "";
  const lastMessagePreview = chat.wa_lastMessageTextVote || "";
  
  // Timestamp conversions (detect milliseconds vs seconds)
  const timestamp = chat.wa_lastMsgTimestamp || 0;
  const lastMessageAt = timestamp > 0 
    ? new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000).toISOString()
    : new Date().toISOString();

  const unreadCount = chat.wa_unreadCount || 0;
  const isGroup = !!chat.wa_isGroup;

  return {
    chatId,
    name,
    whatsappName,
    phone,
    avatarUrl,
    lastMessagePreview,
    lastMessageAt,
    unreadCount,
    isGroup,
  };
}

export function normalizeUazapiMessage(msg: UazapiMessage): NormalizedMessage {
  const id = msg.messageid || msg.id;
  const chatId = msg.chatid;
  const direction = msg.fromMe ? "outbound" : "inbound";
  const type = String(msg.messageType || (msg as Record<string, unknown>).type || "text");
  
  let text = msg.text || "";
  if (!text && msg.content) {
    if (typeof msg.content === "string") {
      text = msg.content;
    } else if (typeof msg.content === "object" && msg.content !== null) {
      const contentObj = msg.content as Record<string, unknown>;
      text = String(contentObj.text || contentObj.conversation || "");
    }
  }

  // Timestamp conversions
  const timestampNum = msg.messageTimestamp;
  const timestamp = new Date(timestampNum > 9999999999 ? timestampNum : timestampNum * 1000).toISOString();

  const senderName = msg.senderName || "";
  const status = msg.status || "sent";
  const mediaUrl = msg.fileURL || "";

  return {
    id,
    chatId,
    direction,
    type,
    text,
    timestamp,
    senderName,
    status,
    mediaUrl,
  };
}

export function normalizeUazapiInstanceStatus(raw: UazapiInstanceStatusResponse): NormalizedInstanceStatus {
  if (!raw) {
    return {
      status: "disconnected",
      instanceName: null,
      phone: null,
      qrImageSrc: null,
      pairCode: null,
      connected: false,
    };
  }

  const isConnected = !!(raw.connected || raw.loggedIn);
  
  // Resolve status string
  let status: NormalizedInstanceStatus["status"] = "disconnected";
  if (isConnected) {
    status = "connected";
  } else if (raw.instance?.status) {
    status = raw.instance.status as NormalizedInstanceStatus["status"];
  }

  // Extract phone owner
  let phone: string | null = null;
  if (raw.jid) {
    if (typeof raw.jid === "string") {
      phone = raw.jid.split(":")[0].split("@")[0];
    } else if (typeof raw.jid === "object") {
      phone = raw.jid.user || null;
    }
  }
  if (!phone && raw.instance?.owner) {
    phone = raw.instance.owner;
  }
  if (phone) {
    phone = phone.replace(/\D/g, "");
  }

  // Formatting QR code image
  let qrImageSrc: string | null = null;
  if (raw.instance?.qrcode) {
    const q = raw.instance.qrcode.trim();
    qrImageSrc = q.startsWith("data:image/") ? q : `data:image/png;base64,${q}`;
  }

  const pairCode = raw.instance?.paircode || null;
  const instanceName = raw.instance?.name || null;

  return {
    status,
    instanceName,
    phone,
    qrImageSrc,
    pairCode,
    connected: isConnected,
  };
}
