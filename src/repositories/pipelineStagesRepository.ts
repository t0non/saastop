import { supabaseStateless } from "../lib/supabaseStateless";

export interface PipelineStageRow {
  id: string;
  organization_id: string;
  name: string;
  position: number;
  stage_type: string;
  conversion_event?: string | null;
  represents_sale: boolean;
  default_sale_value: number;
  currency: string;
  represents_first_contact: boolean;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KeywordTriggerRow {
  id: string;
  stage_id: string;
  phrase: string;
  direction: string;
  match_type: string;
  ignore_case: boolean;
  ignore_accents: boolean;
  active: boolean;
}

export async function getStages(organizationId: string): Promise<PipelineStageRow[]> {
  const { data, error } = await supabaseStateless
    .from("pipeline_stages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("position", { ascending: true });

  if (error) {
    console.error("[PipelineStagesRepository] Error getting stages:", error);
    throw error;
  }
  return data || [];
}

export async function createStage(stage: Omit<PipelineStageRow, "created_at" | "updated_at">): Promise<PipelineStageRow> {
  const { data, error } = await supabaseStateless
    .from("pipeline_stages")
    .insert([stage])
    .select()
    .single();

  if (error) {
    console.error("[PipelineStagesRepository] Error creating stage:", error);
    throw error;
  }
  return data;
}

export async function updateStage(id: string, updates: Partial<PipelineStageRow>): Promise<PipelineStageRow> {
  const { data, error } = await supabaseStateless
    .from("pipeline_stages")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[PipelineStagesRepository] Error updating stage:", error);
    throw error;
  }
  return data;
}

export async function deleteStage(id: string): Promise<void> {
  const { error } = await supabaseStateless
    .from("pipeline_stages")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[PipelineStagesRepository] Error deleting stage:", error);
    throw error;
  }
}

// Keyword Triggers
export async function getKeywordTriggers(stageId: string): Promise<KeywordTriggerRow[]> {
  const { data, error } = await supabaseStateless
    .from("keyword_triggers")
    .select("*")
    .eq("stage_id", stageId)
    .eq("active", true);

  if (error) {
    console.error("[PipelineStagesRepository] Error getting keyword triggers:", error);
    throw error;
  }
  return data || [];
}

export async function createKeywordTrigger(trigger: Omit<KeywordTriggerRow, "id">): Promise<KeywordTriggerRow> {
  const { data, error } = await supabaseStateless
    .from("keyword_triggers")
    .insert([trigger])
    .select()
    .single();

  if (error) {
    console.error("[PipelineStagesRepository] Error creating keyword trigger:", error);
    throw error;
  }
  return data;
}

export async function deleteKeywordTriggersForStage(stageId: string): Promise<void> {
  const { error } = await supabaseStateless
    .from("keyword_triggers")
    .delete()
    .eq("stage_id", stageId);

  if (error) {
    console.error("[PipelineStagesRepository] Error deleting triggers for stage:", error);
    throw error;
  }
}
