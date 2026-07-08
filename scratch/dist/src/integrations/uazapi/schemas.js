"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UazapiWebhookSchema = exports.UazapiMessageSchema = exports.UazapiChatSchema = void 0;
const zod_1 = require("zod");
exports.UazapiChatSchema = zod_1.z.object({
    phone: zod_1.z.string().optional().nullable(),
    wa_chatid: zod_1.z.string(),
    wa_contactName: zod_1.z.string().optional().nullable(),
    wa_name: zod_1.z.string().optional().nullable(),
    wa_isGroup: zod_1.z.boolean().optional().default(false),
    name: zod_1.z.string().optional().nullable(),
});
exports.UazapiMessageSchema = zod_1.z.object({
    chatid: zod_1.z.string(),
    content: zod_1.z.string().optional().nullable(),
    fromMe: zod_1.z.boolean(),
    id: zod_1.z.string(),
    isGroup: zod_1.z.boolean().optional().default(false),
    messageTimestamp: zod_1.z.number(),
    messageType: zod_1.z.string(),
    messageid: zod_1.z.string().optional().nullable(),
    text: zod_1.z.string().optional().nullable(),
    type: zod_1.z.string(),
    wasSentByApi: zod_1.z.boolean().optional().default(false),
});
exports.UazapiWebhookSchema = zod_1.z.object({
    BaseUrl: zod_1.z.string().optional().nullable(),
    EventType: zod_1.z.string(),
    chat: exports.UazapiChatSchema,
    instanceName: zod_1.z.string(),
    message: exports.UazapiMessageSchema,
    owner: zod_1.z.string(),
    token: zod_1.z.string(),
}).passthrough();
