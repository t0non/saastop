import { supabaseStateless } from "../lib/supabaseStateless";

export interface Conversation {
  id: string;
  organization_id: string;
  contact_id: string;
  status: string;
  mode: string;
  unread_count: number;
  last_message_at: string;
  last_message_preview?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function findConversationByContact(organizationId: string, contactId: string): Promise<Conversation | null> {
  const { data, error } = await supabaseStateless
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

export async function createConversation(conversation: Omit<Conversation, "id" | "created_at" | "updated_at">): Promise<Conversation> {
  const { data, error } = await supabaseStateless
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

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
  const { data, error } = await supabaseStateless
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

export async function incrementUnreadCount(id: string): Promise<void> {
  const { data: conv, error: getError } = await supabaseStateless
    .from("conversations")
    .select("unread_count")
    .eq("id", id)
    .single();

  if (getError || !conv) {
    console.error("[ConversationsRepository] Error getting unread_count:", getError);
    return;
  }

  const { error: updateError } = await supabaseStateless
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
