import { UazapiChat, UazapiMessage, UazapiInstanceStatusResponse, UazapiContact } from "./schemas";
import { NormalizedChat, NormalizedMessage, NormalizedInstanceStatus, NormalizedContact } from "./types";

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
  const archived = !!chat.wa_archived;
  const pinned = !!chat.wa_isPinned;

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
    archived,
    pinned,
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

export function normalizeUazapiInstanceStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: UazapiInstanceStatusResponse | Record<string, any> | null | undefined
): NormalizedInstanceStatus {
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

  // Per spec: connected = status.connected === true OR instance.status === "connected"
  const statusConnected = (raw as Record<string, unknown>).status as Record<string, unknown> | undefined;
  const isConnectedViaStatus = statusConnected?.connected === true || statusConnected?.loggedIn === true;
  const isConnectedViaInstance = raw.instance?.status === "connected";
  const isConnectedLegacy = !!(raw.connected || raw.loggedIn);
  const isConnected = isConnectedViaStatus || isConnectedViaInstance || isConnectedLegacy;

  // Resolve status string
  let status: NormalizedInstanceStatus["status"] = "disconnected";
  if (isConnected) {
    status = "connected";
  } else if (raw.instance?.status) {
    const s = raw.instance.status as string;
    if (s === "connecting" || s === "waiting_qr" || s === "waiting_pair_code" || s === "error") {
      status = s as NormalizedInstanceStatus["status"];
    } else {
      status = "disconnected";
    }
  }

  // Extract phone owner — per spec: status.jid.user
  let phone: string | null = null;
  const jidField = statusConnected?.jid ?? raw.jid;
  if (jidField) {
    if (typeof jidField === "string") {
      phone = jidField.split(":")[0].split("@")[0];
    } else if (typeof jidField === "object" && jidField !== null) {
      phone = (jidField as Record<string, string>).user || null;
    }
  }
  if (!phone && raw.instance?.owner) {
    phone = raw.instance.owner;
  }
  if (phone) {
    phone = phone.replace(/\D/g, "");
  }

  // Per spec: QR code is at response.instance.qrcode (NOT response.qrCode or response.qr)
  let qrImageSrc: string | null = null;
  if (raw.instance?.qrcode) {
    const q = String(raw.instance.qrcode).trim();
    qrImageSrc = q.startsWith("data:image/") ? q : `data:image/png;base64,${q}`;
  }

  // Per spec: pair code is at response.instance.paircode (NOT response.pairCode or response.code)
  const pairCode: string | null = raw.instance?.paircode
    ? String(raw.instance.paircode)
    : null;

  const instanceName: string | null = raw.instance?.name || null;

  return {
    status,
    instanceName,
    phone,
    qrImageSrc,
    pairCode,
    connected: isConnected,
  };
}

export function normalizeUazapiContact(raw: UazapiContact): NormalizedContact {
  const jid = raw.jid || "";
  // Extract phone from jid (e.g. 5511999999999@s.whatsapp.net)
  let phone = "";
  if (jid.includes("@")) {
    phone = jid.split("@")[0].replace(/\D/g, "");
  }

  const name = raw.contact_name || raw.contact_FirstName || phone || "Sem Nome";
  const firstName = raw.contact_FirstName || name.split(" ")[0] || "";

  return {
    jid,
    phone,
    name,
    firstName,
  };
}
