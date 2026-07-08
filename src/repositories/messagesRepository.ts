import { supabaseStateless } from "../lib/supabaseStateless";

export interface MessageRow {
  id: string;
  organization_id: string;
  conversation_id: string;
  contact_id: string;
  provider: string;
  provider_message_id: string;
  direction: "inbound" | "outbound";
  message_type: "text" | "image" | "audio" | "video" | "document" | "unknown";
  body: string;
  status: string;
  sent_at: string;
  created_at?: string;
}

export async function isMessageDuplicate(provider: string, providerMessageId: string): Promise<boolean> {
  const { data, error } = await supabaseStateless
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

export async function createMessage(message: Omit<MessageRow, "id" | "created_at">): Promise<MessageRow> {
  const { data, error } = await supabaseStateless
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
