import { z } from "zod";

// Base Chat Schema from OpenAPI
export const UazapiChatSchema = z.object({
  id: z.string().optional().nullable(),
  wa_fastid: z.string().optional().nullable(),
  wa_chatid: z.string(),
  wa_chatlid: z.string().optional().nullable(),
  wa_archived: z.boolean().optional().default(false),
  wa_contactName: z.string().optional().nullable(),
  wa_name: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  imagePreview: z.string().optional().nullable(),
  wa_isBlocked: z.boolean().optional().default(false),
  wa_isGroup: z.boolean().optional().default(false),
  wa_isPinned: z.boolean().optional().default(false),
  wa_lastMessageTextVote: z.string().optional().nullable(),
  wa_lastMessageType: z.string().optional().nullable(),
  wa_lastMsgTimestamp: z.number().optional().default(0),
  owner: z.string().optional().nullable(),
  wa_unreadCount: z.number().optional().default(0),
  phone: z.string().optional().nullable(),
}).passthrough();

// Base Message Schema from OpenAPI
export const UazapiMessageSchema = z.object({
  id: z.string(),
  messageid: z.string().optional().nullable(),
  chatid: z.string(),
  sender: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  isGroup: z.boolean().optional().default(false),
  fromMe: z.boolean(),
  messageType: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  messageTimestamp: z.number(),
  status: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  content: z.string().or(z.record(z.string(), z.unknown())).optional().nullable(),
  wasSentByApi: z.boolean().optional().default(false),
  fileURL: z.string().optional().nullable(),
  sender_pn: z.string().optional().nullable(),
  sender_lid: z.string().optional().nullable(),
}).passthrough();

// Response of POST /chat/find
export const UazapiChatFindResponseSchema = z.object({
  chats: z.array(UazapiChatSchema),
  pagination: z.object({
    totalRecords: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }).optional().nullable(),
}).passthrough();

// Response of POST /message/find
export const UazapiMessageFindResponseSchema = z.object({
  returnedMessages: z.number().optional(),
  messages: z.array(UazapiMessageSchema),
  limit: z.number().optional(),
  offset: z.number().optional(),
  nextOffset: z.number().optional(),
  hasMore: z.boolean().optional(),
}).passthrough();

// Response of POST /send/text
export const UazapiSendTextResponseSchema = UazapiMessageSchema.extend({
  response: z.object({
    status: z.string(),
    message: z.string(),
  }).optional().nullable(),
}).passthrough();

// Base Instance Schema from OpenAPI
export const UazapiInstanceSchema = z.object({
  id: z.string().optional(),
  token: z.string().optional(),
  status: z.enum(["disconnected", "connecting", "connected", "hibernated"]).optional(),
  paircode: z.string().optional().nullable(),
  qrcode: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  profileName: z.string().optional().nullable(),
  profilePicUrl: z.string().optional().nullable(),
  isBusiness: z.boolean().optional().nullable(),
}).passthrough();

// Response of GET /instance/status
export const UazapiInstanceStatusResponseSchema = z.object({
  connected: z.boolean().optional().default(false),
  loggedIn: z.boolean().optional().default(false),
  jid: z.union([
    z.string(),
    z.object({
      user: z.string().optional(),
      server: z.string().optional(),
    }),
    z.null()
  ]).optional().nullable(),
  instance: UazapiInstanceSchema.optional(),
}).passthrough();

// Webhook payload schema (which wraps chat and message)
export const UazapiWebhookSchema = z.object({
  BaseUrl: z.string().optional().nullable(),
  EventType: z.string(),
  chat: UazapiChatSchema,
  instanceName: z.string(),
  message: UazapiMessageSchema,
  owner: z.string(),
  token: z.string().optional().nullable(),
}).passthrough();

export type UazapiChat = z.infer<typeof UazapiChatSchema>;
export type UazapiMessage = z.infer<typeof UazapiMessageSchema>;
export type UazapiChatFindResponse = z.infer<typeof UazapiChatFindResponseSchema>;
export type UazapiMessageFindResponse = z.infer<typeof UazapiMessageFindResponseSchema>;
export type UazapiSendTextResponse = z.infer<typeof UazapiSendTextResponseSchema>;
export type UazapiInstance = z.infer<typeof UazapiInstanceSchema>;
export type UazapiInstanceStatusResponse = z.infer<typeof UazapiInstanceStatusResponseSchema>;
export type UazapiWebhookPayload = z.infer<typeof UazapiWebhookSchema>;
