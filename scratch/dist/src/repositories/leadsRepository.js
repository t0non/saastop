"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOpenLeadByContact = findOpenLeadByContact;
exports.createLead = createLead;
const supabaseStateless_1 = require("../lib/supabaseStateless");
async function findOpenLeadByContact(organizationId, contactId) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("leads")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("contact_id", contactId)
        .eq("status", "open")
        .maybeSingle();
    if (error) {
        console.error("[LeadsRepository] Error finding open lead:", error);
        throw error;
    }
    return data;
}
async function createLead(lead) {
    const { data, error } = await supabaseStateless_1.supabaseStateless
        .from("leads")
        .insert([lead])
        .select()
        .single();
    if (error) {
        console.error("[LeadsRepository] Error creating lead:", error);
        throw error;
    }
    return data;
}
