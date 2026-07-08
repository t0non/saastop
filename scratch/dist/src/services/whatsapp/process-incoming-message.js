"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processIncomingMessage = processIncomingMessage;
const supabaseStateless_1 = require("../../lib/supabaseStateless");
const contactsRepo = __importStar(require("../../repositories/contactsRepository"));
const conversationsRepo = __importStar(require("../../repositories/conversationsRepository"));
const messagesRepo = __importStar(require("../../repositories/messagesRepository"));
const leadsRepo = __importStar(require("../../repositories/leadsRepository"));
async function processIncomingMessage(message, authToken) {
    const { provider, instanceName, owner, providerMessageId, externalChatId, phone, contactName, direction, messageType, body, sentAt, isGroup, } = message;
    // 1. Authenticate and resolve organization
    const configuredToken = process.env.UAZAPI_INSTANCE_TOKEN;
    if (!configuredToken || authToken !== configuredToken) {
        console.warn(`[Webhook Auth] Rejected invalid token: ${authToken}`);
        return { success: false, reason: "Unauthorized token" };
    }
    // Look up whatsapp connection
    let organizationId = "empresa-1"; // default fallback for pilot
    const { data: connection, error: connError } = await supabaseStateless_1.supabaseStateless
        .from("whatsapp_connections")
        .select("organization_id")
        .eq("instance_name", instanceName)
        .maybeSingle();
    if (connError) {
        console.error("[IncomingMessageService] Error resolving connection:", connError);
    }
    if (connection) {
        organizationId = connection.organization_id;
    }
    else {
        // Connection not registered yet, auto-register for pilot ease of use
        console.log(`[IncomingMessageService] Auto-registering connection for instance: ${instanceName}`);
        const { error: insertError } = await supabaseStateless_1.supabaseStateless
            .from("whatsapp_connections")
            .insert([
            {
                organization_id: "empresa-1",
                provider: "uazapi",
                instance_name: instanceName,
                owner_phone: owner,
                status: "connected",
            },
        ]);
        if (insertError) {
            console.error("[IncomingMessageService] Error registering connection:", insertError);
        }
    }
    // 2. Ignore groups
    if (isGroup) {
        console.log("[IncomingMessageService] ignored_group_message", { providerMessageId, externalChatId });
        return { success: true, reason: "ignored_group_message" };
    }
    // 3. Idempotency (Deduplication)
    const isDuplicate = await messagesRepo.isMessageDuplicate(provider, providerMessageId);
    if (isDuplicate) {
        console.log(`[IncomingMessageService] Duplicate message ignored: ${providerMessageId}`);
        return { success: true, reason: "duplicate_message" };
    }
    // 4. Create or update Contact
    let contact = await contactsRepo.findContactByPhone(organizationId, phone);
    const nowStr = new Date().toISOString();
    if (!contact) {
        console.log(`[IncomingMessageService] Creating new contact for phone: ${phone}`);
        contact = await contactsRepo.createContact({
            organization_id: organizationId,
            phone_normalized: phone,
            name: contactName,
            whatsapp_name: contactName,
            first_interaction_at: nowStr,
            last_interaction_at: nowStr,
        });
    }
    else {
        console.log(`[IncomingMessageService] Updating existing contact: ${contact.id}`);
        contact = await contactsRepo.updateContact(contact.id, {
            whatsapp_name: contactName,
            last_interaction_at: nowStr,
        });
    }
    // 5. Create or update Conversation
    let conversation = await conversationsRepo.findConversationByContact(organizationId, contact.id);
    const preview = body.length > 100 ? body.substring(0, 100) + "..." : body;
    if (!conversation) {
        console.log(`[IncomingMessageService] Creating new conversation for contact: ${contact.id}`);
        conversation = await conversationsRepo.createConversation({
            organization_id: organizationId,
            contact_id: contact.id,
            status: "open",
            mode: "human",
            unread_count: direction === "inbound" ? 1 : 0,
            last_message_at: sentAt.toISOString(),
            last_message_preview: preview,
        });
    }
    else {
        console.log(`[IncomingMessageService] Updating existing conversation: ${conversation.id}`);
        const unreadCountUpdate = direction === "inbound" ? conversation.unread_count + 1 : conversation.unread_count;
        conversation = await conversationsRepo.updateConversation(conversation.id, {
            unread_count: unreadCountUpdate,
            last_message_at: sentAt.toISOString(),
            last_message_preview: preview,
        });
    }
    // 6. Create Message record
    console.log(`[IncomingMessageService] Creating message record: ${providerMessageId}`);
    await messagesRepo.createMessage({
        organization_id: organizationId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        provider,
        provider_message_id: providerMessageId,
        direction,
        message_type: messageType,
        body,
        status: "sent",
        sent_at: sentAt.toISOString(),
    });
    // 7. Auto Lead Creation
    if (direction === "inbound") {
        const openLead = await leadsRepo.findOpenLeadByContact(organizationId, contact.id);
        if (!openLead) {
            console.log(`[IncomingMessageService] Creating automatic lead for contact: ${contact.id}`);
            await leadsRepo.createLead({
                organization_id: organizationId,
                contact_id: contact.id,
                pipeline_stage_id: "Novo Lead",
                status: "open",
                source: "WhatsApp",
                value: 0,
                revenue: 0,
                temperature: "Morno",
            });
        }
    }
    return { success: true };
}
