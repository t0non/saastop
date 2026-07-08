import { z } from "zod";

export const UazapiChatSchema = z.object({
  phone: z.string().optional().nullable(),
  wa_chatid: z.string(),
  wa_contactName: z.string().optional().nullable(),
  wa_name: z.string().optional().nullable(),
  wa_isGroup: z.boolean().optional().default(false),
  name: z.string().optional().nullable(),
});

export const UazapiMessageSchema = z.object({
  chatid: z.string(),
  content: z.string().optional().nullable(),
  fromMe: z.boolean(),
  id: z.string(),
  isGroup: z.boolean().optional().default(false),
  messageTimestamp: z.number(),
  messageType: z.string(),
  messageid: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  type: z.string(),
  wasSentByApi: z.boolean().optional().default(false),
});

export const UazapiWebhookSchema = z.object({
  BaseUrl: z.string().optional().nullable(),
  EventType: z.string(),
  chat: UazapiChatSchema,
  instanceName: z.string(),
  message: UazapiMessageSchema,
  owner: z.string(),
  token: z.string(),
}).passthrough();

export type UazapiWebhookPayload = z.infer<typeof UazapiWebhookSchema>;
