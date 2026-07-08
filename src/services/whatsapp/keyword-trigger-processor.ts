import { supabaseStateless } from "../../lib/supabaseStateless";

export async function processKeywordTriggersForMessage(
  organizationId: string,
  contactId: string,
  messageText: string,
  direction: "inbound" | "outbound"
): Promise<void> {
  try {
    const { data: stages, error: stagesErr } = await supabaseStateless
      .from("pipeline_stages")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("active", true);

    if (stagesErr || !stages || stages.length === 0) return;

    const stageIds = stages.map((s) => s.id);
    const { data: triggers, error: triggersErr } = await supabaseStateless
      .from("keyword_triggers")
      .select("*")
      .in("stage_id", stageIds)
      .eq("active", true);

    if (triggersErr || !triggers || triggers.length === 0) return;

    const { data: lead, error: leadErr } = await supabaseStateless
      .from("leads")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("contact_id", contactId)
      .eq("status", "open")
      .maybeSingle();

    if (leadErr || !lead) return;

    const currentStageId = lead.pipeline_stage_id;

    const normalizeString = (str: string, ignoreAccents: boolean) => {
      let res = str.toLowerCase().trim();
      if (ignoreAccents) {
        res = res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
      return res;
    };

    for (const trigger of triggers) {
      const dirMatch = trigger.direction === "both" || trigger.direction === direction;
      if (!dirMatch) continue;

      const cleanMsg = normalizeString(messageText, trigger.ignore_accents);
      const cleanPhrase = normalizeString(trigger.phrase, trigger.ignore_accents);

      let isMatched = false;
      if (trigger.match_type === "equals") {
        isMatched = cleanMsg === cleanPhrase;
      } else if (trigger.match_type === "starts_with") {
        isMatched = cleanMsg.startsWith(cleanPhrase);
      } else {
        isMatched = cleanMsg.includes(cleanPhrase);
      }

      if (isMatched) {
        const targetStageId = trigger.stage_id;

        if (targetStageId !== currentStageId) {
          const targetStage = stages.find((s) => s.id === targetStageId);
          console.log(`[KeywordTrigger] Match found! Moving lead ${lead.id} from ${currentStageId} to ${targetStageId}. Trigger phrase: "${trigger.phrase}"`);

          const updates: Record<string, string | number | boolean> = {
            pipeline_stage_id: targetStageId,
            updated_at: new Date().toISOString()
          };

          if (targetStage?.represents_sale) {
            updates.status = "won";
            if (!lead.revenue || lead.revenue <= 0) {
              updates.revenue = Number(targetStage.default_sale_value || 0);
            }
          } else if (targetStage?.stage_type === "lost") {
            updates.status = "lost";
          }

          const { error: updateErr } = await supabaseStateless
            .from("leads")
            .update(updates)
            .eq("id", lead.id);

          if (updateErr) {
            console.error("[KeywordTrigger] Error moving lead stage:", updateErr);
            return;
          }

          const { error: histErr } = await supabaseStateless
            .from("lead_stage_history")
            .insert([{
              lead_id: lead.id,
              from_stage: currentStageId,
              to_stage: targetStageId,
              source: "automation",
              rule_name: trigger.phrase,
              reason: `Mover automaticamente via palavra-chave: "${trigger.phrase}"`,
            }]);

          if (histErr) {
            console.error("[KeywordTrigger] Error saving stage history:", histErr);
          }

          break;
        }
      }
    }
  } catch (error) {
    console.error("[KeywordTriggerProcessor] Unexpected error:", error);
  }
}
