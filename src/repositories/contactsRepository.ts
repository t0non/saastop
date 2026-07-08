import { supabaseStateless } from "../lib/supabaseStateless";

export interface Contact {
  id: string;
  organization_id: string;
  phone_normalized: string;
  name: string;
  whatsapp_name?: string | null;
  avatar_url?: string | null;
  first_interaction_at: string;
  last_interaction_at: string;
  created_at?: string;
  updated_at?: string;
}

export async function findContactByPhone(organizationId: string, phoneNormalized: string): Promise<Contact | null> {
  const { data, error } = await supabaseStateless
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

export async function createContact(contact: Omit<Contact, "id" | "created_at" | "updated_at">): Promise<Contact> {
  const { data, error } = await supabaseStateless
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

export async function updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
  const { data, error } = await supabaseStateless
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
