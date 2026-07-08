import { Lead, Conversation } from "../types";

export interface ConversationListItem {
  conversationId: string;
  contactId: string;
  leadId: string;
  phone: string;
  contactName: string;
  source: string;
  campaign: string;
  stage: string;
  firstMessageAt: string;
  lastMessageAt: string;
  unreadCount: number;
  waitingFirstResponse: boolean;
  attributionConfidence: string;
}

export function mapConversationsToItems(
  conversations: Conversation[],
  leads: Lead[]
): ConversationListItem[] {
  return conversations.map((conv) => {
    const lead = leads.find((l) => l.id === conv.leadId);
    
    const sortedMessages = [...conv.messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstMessageAt = sortedMessages.length > 0 ? sortedMessages[0].timestamp : new Date().toISOString();
    const lastMessageAt = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1].timestamp : new Date().toISOString();

    // Check waitingFirstResponse logic:
    // - has at least one inbound message
    // - last message is inbound (meaning no outbound response has been sent yet)
    const hasInbound = sortedMessages.some((m) => m.direction === "inbound");
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const isLastMessageInbound = lastMessage ? lastMessage.direction === "inbound" : false;
    const waitingFirstResponse = hasInbound && isLastMessageInbound;

    return {
      conversationId: conv.leadId,
      contactId: lead?.id || conv.leadId,
      leadId: conv.leadId,
      phone: lead?.phone || "Sem Telefone",
      contactName: lead?.name || "Contato Desconhecido",
      source: lead?.trackingSession?.source || "Não rastreada",
      campaign: lead?.trackingSession?.campaign || "Sem Campanha",
      stage: lead?.stage || "Novo Lead",
      firstMessageAt,
      lastMessageAt,
      unreadCount: conv.unreadCount || 0,
      waitingFirstResponse,
      attributionConfidence: lead?.trackingSession ? "Inferida" : "Desconhecida",
    };
  });
}
