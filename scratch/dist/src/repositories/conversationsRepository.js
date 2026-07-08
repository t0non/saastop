"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findConversationByContact = findConversationByContact;
exports.createConversation = createConversation;
exports.updateConversation = updateConversation;
exports.incrementUnreadCount = incrementUnreadCount;
const supabaseStateless_1 = require("../lib/supabaseStateless");
async function findConversationByContact(organizationId, contactId) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("conversations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("contact_id", contactId)
        .maybeSingle();
    if (error) {
        console.error("[ConversationsRepository] Error finding conversation:", error);
        throw error;
    }
    return data;
}
async function createConversation(conversation) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("conversations")
        .insert([conversation])
        .select()
        .single();
    if (error) {
        console.error("[ConversationsRepository] Error creating conversation:", error);
        throw error;
    }
    return data;
}
async function updateConversation(id, updates) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("conversations")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    if (error) {
        console.error("[ConversationsRepository] Error updating conversation:", error);
        throw error;
    }
    return data;
}
async function incrementUnreadCount(id) {
    const { data: conv, error: getError } = await supabaseStateless_1.supabaseStateless
        .from("conversations")
        .select("unread_count")
        .eq("id", id)
        .single();
    if (getError || !conv) {
        console.error("[ConversationsRepository] Error getting unread_count:", getError);
        return;
    }
    const { error: updateError } = await supabaseStateless_1.supabaseStateless
        .from("conversations")
        .update({
        unread_count: conv.unread_count + 1,
        updated_at: new Date().toISOString()
    })
        .eq("id", id);
    if (updateError) {
        console.error("[ConversationsRepository] Error incrementing unread_count:", updateError);
    }
}
