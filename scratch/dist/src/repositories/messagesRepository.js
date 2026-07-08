"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMessageDuplicate = isMessageDuplicate;
exports.createMessage = createMessage;
const supabaseStateless_1 = require("../lib/supabaseStateless");
async function isMessageDuplicate(provider, providerMessageId) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("messages")
        .select("id")
        .eq("provider", provider)
        .eq("provider_message_id", providerMessageId)
        .maybeSingle();
    if (error) {
        console.error("[MessagesRepository] Error checking message duplicate:", error);
        throw error;
    }
    return data !== null;
}
async function createMessage(message) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("messages")
        .insert([message])
        .select()
        .single();
    if (error) {
        console.error("[MessagesRepository] Error creating message:", error);
        throw error;
    }
    return data;
}
