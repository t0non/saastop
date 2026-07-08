import { supabaseStateless } from "../lib/supabaseStateless";

export interface LeadRow {
  id: string;
  organization_id: string;
  contact_id: string;
  pipeline_stage_id: string;
  status: string; // 'open' | 'won' | 'lost'
  source: string;
  value: number;
  revenue: number;
  temperature: string; // 'Frio' | 'Morno' | 'Quente'
  created_at?: string;
  updated_at?: string;
}

export async function findOpenLeadByContact(organizationId: string, contactId: string): Promise<LeadRow | null> {
  const { data, error } = await supabaseStateless
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

export async function createLead(lead: Omit<LeadRow, "id" | "created_at" | "updated_at">): Promise<LeadRow> {
  const { data, error } = await supabaseStateless
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
