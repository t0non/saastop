"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findContactByPhone = findContactByPhone;
exports.createContact = createContact;
exports.updateContact = updateContact;
const supabaseStateless_1 = require("../lib/supabaseStateless");
async function findContactByPhone(organizationId, phoneNormalized) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("contacts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("phone_normalized", phoneNormalized)
        .maybeSingle();
    if (error) {
        console.error("[ContactsRepository] Error finding contact:", error);
        throw error;
    }
    return data;
}
async function createContact(contact) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("contacts")
        .insert([contact])
        .select()
        .single();
    if (error) {
        console.error("[ContactsRepository] Error creating contact:", error);
        throw error;
    }
    return data;
}
async function updateContact(id, updates) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("contacts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    if (error) {
        console.error("[ContactsRepository] Error updating contact:", error);
        throw error;
    }
    return data;
}
