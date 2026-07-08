import { NormalizedMessage } from "../../integrations/uazapi/types";
import { processKeywordTriggersForMessage } from "./keyword-trigger-processor";
import { supabaseStateless } from "../../lib/supabaseStateless";
import * as contactsRepo from "../../repositories/contactsRepository";
import * as conversationsRepo from "../../repositories/conversationsRepository";
import * as leadsRepo from "../../repositories/leadsRepository";

export async function processIncomingMessage(
  message: NormalizedMessage,
  organizationId: string,
  avatarUrl: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    const phone = message.chatId.split("@")[0].replace(/\D/g, "");
    const contactName = message.senderName || phone;
    const direction = message.direction;
    const body = message.text;
    const nowStr = new Date().toISOString();

    // 1. Contact (Upsert)
    let contact;
    try {
      contact = await contactsRepo.findContactByPhone(organizationId, phone);
      if (!contact) {
        console.log(`[CRM] Contact not found, creating a new contact for phone: ${phone}`);
        contact = await contactsRepo.createContact({
          organization_id: organizationId,
          phone_normalized: phone,
          name: contactName,
          whatsapp_name: contactName,
          avatar_url: avatarUrl || null,
          first_interaction_at: nowStr,
          last_interaction_at: nowStr,
        });
      } else {
        console.log(`[CRM] Contact found: ${contact.id}. Updating interaction details.`);
        contact = await contactsRepo.updateContact(contact.id, {
          whatsapp_name: contactName,
          avatar_url: avatarUrl || contact.avatar_url,
          last_interaction_at: nowStr,
        });
      }
    } catch (err) {
      console.error("[CRM] Contact upsert failed:", err);
      throw new Error("CONTACT_UPSERT_FAILED");
    }

    console.log(`[CRM_03_CONTACT_UPSERTED] Contact upserted. contactId=${contact.id}`);

    // 2. Resumo Operacional da Conversa (Upsert)
    try {
      let conversation = await conversationsRepo.findConversationByContact(organizationId, contact.id);
      const preview = body.length > 100 ? body.substring(0, 100) + "..." : body;

      if (!conversation) {
        console.log(`[CRM] Conversation summary not found. Creating a new one.`);
        conversation = await conversationsRepo.createConversation({
          organization_id: organizationId,
          contact_id: contact.id,
          status: "open",
          mode: "human",
          unread_count: direction === "inbound" ? 1 : 0,
          last_message_at: nowStr,
          last_message_preview: preview,
        });
      } else {
        console.log(`[CRM] Conversation summary found: ${conversation.id}. Updating last message info.`);
        const unreadCountUpdate = direction === "inbound" ? conversation.unread_count + 1 : conversation.unread_count;
        conversation = await conversationsRepo.updateConversation(conversation.id, {
          unread_count: unreadCountUpdate,
          last_message_at: nowStr,
          last_message_preview: preview,
        });
      }
    } catch (err) {
      console.error("[CRM] Conversation upsert failed:", err);
      // We don't want to block lead flow for conversations summary, but we log the warning
    }

    // 3. Lead Creation (Inbound only)
    if (direction === "inbound") {
      let openLead;
      try {
        openLead = await leadsRepo.findOpenLeadByContact(organizationId, contact.id);
      } catch (err) {
        console.error("[CRM] Lead check failed:", err);
        throw new Error("LEAD_LOOKUP_FAILED");
      }

      console.log(`[CRM_04_LEAD_CHECKED] Checked lead status. contactId=${contact.id}`);

      if (openLead) {
        console.log(`[CRM_05_EXISTING_LEAD_FOUND] Open lead already exists: ${openLead.id}`);
      } else {
        console.log(`[CRM] No open lead found. Querying first active stage.`);
        
        // Fetch first active stage ordered by position
        const { data: firstStage, error: stageError } = await supabaseStateless
          .from("pipeline_stages")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (stageError) {
          console.error("[CRM] Error finding first active stage:", stageError);
          throw new Error("STAGE_LOOKUP_FAILED");
        }
        if (!firstStage) {
          console.error("[CRM] No active stages found for organization:", organizationId);
          throw new Error("STAGE_LOOKUP_FAILED");
        }

        const stageId = firstStage.id;

        // Create new Lead
        let newLead;
        try {
          newLead = await leadsRepo.createLead({
            organization_id: organizationId,
            contact_id: contact.id,
            pipeline_stage_id: stageId,
            status: "open",
            source: "unknown",
            value: 0,
            revenue: 0,
            temperature: "Morno",
          });
        } catch (err) {
          console.error("[CRM] Lead creation failed:", err);
          throw new Error("LEAD_CREATE_FAILED");
        }

        console.log(`[CRM_05_LEAD_CREATED] Automatic lead created: ${newLead.id}`);

        // Create Stage History record
        const { error: histError } = await supabaseStateless
          .from("lead_stage_history")
          .insert([{
            lead_id: newLead.id,
            from_stage: null,
            to_stage: stageId,
            source: "system",
            reason: "Lead criado automaticamente após primeiro contato inbound no WhatsApp"
          }]);

        if (histError) {
          console.error("[CRM] Stage history creation failed:", histError);
          throw new Error("STAGE_HISTORY_CREATE_FAILED");
        }

        console.log(`[CRM_06_STAGE_HISTORY_CREATED] Registered stage history in database. stageId=${stageId}`);
      }
    }

    // 4. Process keyword trigger automations
    try {
      await processKeywordTriggersForMessage(organizationId, contact.id, body, direction);
      console.log(`[CRM_07_AUTOMATIONS_PROCESSED] Triggers processed.`);
    } catch (err) {
      console.error("[CRM] Automation triggers execution failed:", err);
    }

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return { 
      success: false, 
      reason: errMsg 
    };
  }
}
