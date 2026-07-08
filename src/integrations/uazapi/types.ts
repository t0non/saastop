export interface NormalizedChat {
  chatId: string;
  name: string;
  whatsappName: string;
  phone: string;
  avatarUrl: string;
  lastMessagePreview: string;
  lastMessageAt: string; // ISO string
  unreadCount: number;
  isGroup: boolean;
  archived: boolean;
  pinned: boolean;
}

export interface NormalizedMessage {
  id: string;
  chatId: string;
  direction: "inbound" | "outbound";
  type: string;
  text: string;
  timestamp: string; // ISO string
  senderName: string;
  status: string;
  mediaUrl: string;
}

export interface NormalizedContact {
  jid: string;
  phone: string;
  name: string;
  firstName: string;
}

export interface NormalizedInstanceStatus {
  status: "disconnected" | "connecting" | "connected" | "hibernated" | "waiting_qr" | "waiting_pair_code";
  instanceName: string | null;
  phone: string | null;
  qrImageSrc: string | null;
  pairCode: string | null;
  connected: boolean;
}

