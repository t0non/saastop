// src/app/settings/journey/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { PipelineStageConfig, LeadStatus } from "@/types";
import { 
  Plus, ArrowUp, ArrowDown, Settings, Edit2, Copy, Trash2, X, 
  Check, Info, HelpCircle, Save, AlertTriangle, ShieldCheck 
} from "lucide-react";
import { getBrowserClient } from "@/lib/supabase";

interface KeywordTrigger {
  id?: string;
  phrase: string;
  direction: "inbound" | "outbound" | "both";
  match_type: "contains" | "equals" | "starts_with";
  ignore_case: boolean;
  ignore_accents: boolean;
  active: boolean;
}

export default function JourneySettingsPage() {
  const { 
    stages, 
    setStages, 
    leads, 
    selectedCompanyId 
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Form State
  const [editingStage, setEditingStage] = useState<PipelineStageConfig | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageType, setStageType] = useState<"first_contact" | "intermediate" | "conversion" | "sale" | "lost" | "custom">("intermediate");
  const [conversionEvent, setConversionEvent] = useState("");
  const [representsSale, setRepresentsSale] = useState(false);
  const [defaultSaleValue, setDefaultSaleValue] = useState(0);
  const [currency, setCurrency] = useState("BRL");
  const [representsFirstContact, setRepresentsFirstContact] = useState(false);
  const [keywords, setKeywords] = useState<KeywordTrigger[]>([]);
  const [newKeywordPhrase, setNewKeywordPhrase] = useState("");
  const [newKeywordDirection, setNewKeywordDirection] = useState<"inbound" | "outbound" | "both">("outbound");
  const [newKeywordMatch, setNewKeywordMatch] = useState<"contains" | "equals" | "starts_with">("contains");

  // Reorder State
  const [tempStages, setTempStages] = useState<PipelineStageConfig[]>([]);

  // Delete State
  const [deletingStageConfig, setDeletingStageConfig] = useState<PipelineStageConfig | null>(null);
  const [replacementStageId, setReplacementStageId] = useState("");
  const [affectedLeadsCount, setAffectedLeadsCount] = useState(0);

  // Sync tempStages when reorder modal opens
  useEffect(() => {
    if (reorderModalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTempStages([...stages]);
    }
  }, [reorderModalOpen, stages]);

  // Load triggers if editing stage
  useEffect(() => {
    if (editingStage) {
      const loadTriggers = async () => {
        const supabase = getBrowserClient();
        const { data, error } = await supabase
          .from("keyword_triggers")
          .select("*")
          .eq("stage_id", editingStage.id);
        
        interface DbKeywordTriggerRow {
          id: string;
          phrase: string;
          direction: "inbound" | "outbound" | "both";
          match_type: "contains" | "equals" | "starts_with";
          ignore_case: boolean;
          ignore_accents: boolean;
          active: boolean;
        }
        if (data && !error) {
          const triggers = data as unknown as DbKeywordTriggerRow[];
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setKeywords(triggers.map(d => ({
            id: d.id,
            phrase: d.phrase,
            direction: d.direction,
            match_type: d.match_type,
            ignore_case: d.ignore_case,
            ignore_accents: d.ignore_accents,
            active: d.active
          })));
        }
      };
      loadTriggers();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKeywords([]);
    }
  }, [editingStage]);

  // Reset form
  const resetForm = () => {
    setEditingStage(null);
    setStageName("");
    setStageType("intermediate");
    setConversionEvent("");
    setRepresentsSale(false);
    setDefaultSaleValue(0);
    setCurrency("BRL");
    setRepresentsFirstContact(false);
    setKeywords([]);
    setNewKeywordPhrase("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (stage: PipelineStageConfig) => {
    setEditingStage(stage);
    setStageName(stage.name);
    
    // Map stage type from UI properties
    let typeMapped: typeof stageType = "intermediate";
    if (stage.type === "initial") typeMapped = "first_contact";
    else if (stage.type === "conversion_intermediate") typeMapped = "conversion";
    else if (stage.type === "conversion_final") typeMapped = "sale";
    else if (stage.type === "lost") typeMapped = "lost";

    setStageType(typeMapped);
    setConversionEvent(stage.conversionType || "");
    setRepresentsSale(stage.type === "conversion_final");
    
    // Load other details
    const loadDetails = async () => {
      const supabase = getBrowserClient();
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("id", stage.id)
        .maybeSingle();

      if (data) {
        setDefaultSaleValue(Number(data.default_sale_value || 0));
        setCurrency(data.currency || "BRL");
        setRepresentsFirstContact(data.represents_first_contact || false);
      }
    };
    loadDetails();

    setModalOpen(true);
  };

  // Add keyword rule to local list
  const handleAddKeyword = () => {
    if (!newKeywordPhrase.trim()) return;
    
    // Check duplication
    if (keywords.some(k => k.phrase.toLowerCase() === newKeywordPhrase.trim().toLowerCase())) {
      alert("Este termo chave já existe nesta etapa.");
      return;
    }

    setKeywords(prev => [...prev, {
      phrase: newKeywordPhrase.trim(),
      direction: newKeywordDirection,
      match_type: newKeywordMatch,
      ignore_case: true,
      ignore_accents: true,
      active: true
    }]);

    setNewKeywordPhrase("");
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(prev => prev.filter((_, idx) => idx !== index));
  };

  // Save / Create Stage Handler
  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) return;

    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const stageId = editingStage ? editingStage.id : `stage-${Math.random().toString(36).substr(2, 9)}`;

      // 1. Verify representsFirstContact uniqueness
      if (representsFirstContact) {
        const { data: firstContactStages } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("organization_id", selectedCompanyId)
          .eq("represents_first_contact", true);

        const firstStages = firstContactStages as { id: string }[] | null;
        const otherFirstContact = firstStages?.find(s => s.id !== stageId);
        if (otherFirstContact) {
          if (confirm("Já existe uma etapa configurada como primeiro contato. Deseja substituí-la?")) {
            await supabase
              .from("pipeline_stages")
              .update({ represents_first_contact: false })
              .eq("organization_id", selectedCompanyId);
          } else {
            setLoading(false);
            return;
          }
        }
      }

      // 2. Prepare payload for DB
      const dbPayload = {
        id: stageId,
        organization_id: selectedCompanyId,
        name: stageName.trim(),
        stage_type: representsSale ? "sale" : stageType,
        conversion_event: conversionEvent || null,
        represents_sale: representsSale,
        default_sale_value: representsSale ? defaultSaleValue : 0,
        currency,
        represents_first_contact: representsFirstContact,
        position: editingStage ? undefined : stages.length + 1,
        active: true,
        updated_at: new Date().toISOString()
      };

      // 3. Upsert stage
      if (editingStage) {
        const { error: errStage } = await supabase
          .from("pipeline_stages")
          .update(dbPayload)
          .eq("id", stageId);
        if (errStage) throw errStage;
      } else {
        const { error: errStage } = await supabase
          .from("pipeline_stages")
          .insert([dbPayload]);
        if (errStage) throw errStage;
      }

      // 4. Update keyword triggers (delete existing and insert current list)
      const { error: errDel } = await supabase
        .from("keyword_triggers")
        .delete()
        .eq("stage_id", stageId);
      if (errDel) throw errDel;

      if (keywords.length > 0) {
        const { error: errIns } = await supabase
          .from("keyword_triggers")
          .insert(keywords.map(k => ({
            stage_id: stageId,
            phrase: k.phrase,
            direction: k.direction,
            match_type: k.match_type,
            ignore_case: k.ignore_case,
            ignore_accents: k.ignore_accents,
            active: k.active
          })));
        if (errIns) throw errIns;
      }

      // 5. Reload AppContext stages list
      const { data: dbStages } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("organization_id", selectedCompanyId)
        .eq("active", true)
        .order("position", { ascending: true });

      interface DbStageItem {
        id: string;
        name: string;
        stage_type: string;
        conversion_event?: string | null;
      }
      if (dbStages) {
        const stagesList = dbStages as unknown as DbStageItem[];
        const mapped: PipelineStageConfig[] = stagesList.map((st) => {
          let type: PipelineStageConfig["type"] = "progress";
          if (st.stage_type === "first_contact") type = "initial";
          else if (st.stage_type === "conversion") type = "conversion_intermediate";
          else if (st.stage_type === "sale") type = "conversion_final";
          else if (st.stage_type === "lost") type = "lost";

          let color = "bg-indigo-100 text-indigo-800 border-indigo-200";
          if (type === "initial") color = "bg-blue-100 text-blue-800 border-blue-200";
          else if (st.stage_type === "conversion") color = "bg-purple-100 text-purple-800 border-purple-200";
          else if (type === "conversion_final") color = "bg-emerald-100 text-emerald-800 border-emerald-200";
          else if (type === "lost") color = "bg-rose-100 text-rose-800 border-rose-200";

          return {
            id: st.id,
            name: st.name,
            type,
            color,
            isConversion: !!st.conversion_event || st.stage_type === "conversion" || st.stage_type === "sale" || st.stage_type === "first_contact",
            conversionType: (st.conversion_event || undefined) as "Lead" | "Agendamento" | "Comparecimento" | "Venda" | undefined,
          };
        });
        setStages(mapped);
      }

      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving stage:", err);
      alert("Ocorreu um erro ao salvar as configurações da etapa.");
    } finally {
      setLoading(false);
    }
  };

  // Reorder Stages Handlers
  const moveTempItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= tempStages.length) return;
    const updated = [...tempStages];
    const [item] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, item);
    setTempStages(updated);
  };

  const handleSaveReorder = async () => {
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      
      // Update positions sequentially
      for (let i = 0; i < tempStages.length; i++) {
        await supabase
          .from("pipeline_stages")
          .update({ position: i + 1, updated_at: new Date().toISOString() })
          .eq("id", tempStages[i].id);
      }

      setStages(tempStages);
      setReorderModalOpen(false);
      alert("Ordem das etapas comercial atualizada com sucesso!");
    } catch (err) {
      console.error("Error saving reordered stages:", err);
      alert("Ocorreu um erro ao atualizar a ordenação das etapas.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Stage Handlers
  const handleOpenDelete = (stage: PipelineStageConfig) => {
    // Count leads on this stage
    const count = leads.filter(l => l.stage === stage.id).length;
    setAffectedLeadsCount(count);
    setDeletingStageConfig(stage);
    
    // Suggest replacement stage
    const fallback = stages.find(s => s.id !== stage.id);
    setReplacementStageId(fallback?.id || "");
    setDeleteModalOpen(true);
  };

  const handleDeleteStage = async () => {
    if (!deletingStageConfig) return;
    
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      
      // 1. Move affected leads
      if (affectedLeadsCount > 0 && replacementStageId) {
        const affectedLeads = leads.filter(l => l.stage === deletingStageConfig.id);
        
        for (const lead of affectedLeads) {
          // Update stage in database
          await supabase
            .from("leads")
            .update({ pipeline_stage_id: replacementStageId, updated_at: new Date().toISOString() })
            .eq("id", lead.id);

          // Insert stage history
          await supabase
            .from("lead_stage_history")
            .insert([{
              lead_id: lead.id,
              from_stage: deletingStageConfig.id,
              to_stage: replacementStageId,
              source: "system",
              reason: `Etapa anterior "${deletingStageConfig.name}" excluída. Leads migrados.`,
            }]);
        }
      }

      // 2. Delete stage from database
      await supabase
        .from("pipeline_stages")
        .delete()
        .eq("id", deletingStageConfig.id);

      // 3. Update local state
      setStages(prev => prev.filter(s => s.id !== deletingStageConfig.id));
      setDeleteModalOpen(false);
      setDeletingStageConfig(null);
      alert("Etapa excluída e leads migrados com sucesso!");
    } catch (err) {
      console.error("Error deleting stage:", err);
      alert("Ocorreu um erro ao excluir a etapa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jornada de Compra</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure as etapas pelas quais seus leads passam, desde o primeiro contato até a venda.
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setReorderModalOpen(true)}
              className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition"
            >
              Ordenar Etapas
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar Etapa
            </button>
          </div>
        </div>

        {/* Stages List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6 w-16">Posição</th>
                  <th className="py-4 px-6">Etapa</th>
                  <th className="py-4 px-6">Tipo</th>
                  <th className="py-4 px-6">Evento Associado</th>
                  <th className="py-4 px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {stages.map((stage, idx) => (
                  <tr key={stage.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${stage.color}`}>
                        {stage.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 capitalize">
                      {stage.type === "initial" ? "Primeiro Contato" : stage.type === "conversion_final" ? "Venda principal" : "Etapa intermediária"}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs">
                      {stage.conversionType || "Nenhum"}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(stage)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition"
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled={stages.length <= 1}
                          onClick={() => handleOpenDelete(stage)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md transition disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 1. CREATE / EDIT STAGE MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col z-10 animate-fade-in border border-slate-100">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="font-bold text-slate-800">{editingStage ? "Editar Etapa da Jornada" : "Adicionar Nova Etapa"}</h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveStage} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* DADOS DA ETAPA */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Dados da Etapa</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome da Etapa da Jornada *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Agendado"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo da Etapa</label>
                      <select
                        value={stageType}
                        onChange={(e) => setStageType(e.target.value as "first_contact" | "intermediate" | "conversion" | "sale" | "lost" | "custom")}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
                      >
                        <option value="first_contact">Primeiro contato</option>
                        <option value="intermediate">Etapa intermediária</option>
                        <option value="conversion">Conversão</option>
                        <option value="sale">Venda</option>
                        <option value="lost">Perdido</option>
                        <option value="custom">Personalizada</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* CONVERSÃO */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Conversão & Valores</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Evento de Conversão Associado</label>
                      <select
                        value={conversionEvent}
                        onChange={(e) => setConversionEvent(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
                      >
                        <option value="">Nenhum evento</option>
                        <optgroup label="Eventos Internos">
                          <option value="Lead">Lead Criado</option>
                          <option value="Primeiro Contato">Primeiro Contato</option>
                          <option value="Agendamento">Agendamento</option>
                          <option value="Comparecimento">Comparecimento</option>
                          <option value="Venda">Venda</option>
                        </optgroup>
                        <optgroup label="Meta Ads / Facebook">
                          <option value="Lead">Lead</option>
                          <option value="Schedule">Schedule</option>
                          <option value="Contact">Contact</option>
                          <option value="Purchase">Purchase</option>
                        </optgroup>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Selecione o evento de conversão associado a esta etapa. Quando o lead entrar nesta etapa, o sistema registrará a conversão para as campanhas.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-bold text-slate-700">Esta etapa representa uma venda?</label>
                          <span className="text-[10px] text-slate-400">Ative se esta etapa representar a conversão de faturamento final.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={representsSale}
                          onChange={(e) => setRepresentsSale(e.target.checked)}
                          className="rounded text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                      </div>
                      {representsSale && (
                        <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-slate-200/50">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Valor Padrão da Venda</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="Ex: 650"
                              value={defaultSaleValue}
                              onChange={(e) => setDefaultSaleValue(Number(e.target.value))}
                              className="w-full text-xs border border-slate-250 rounded px-2.5 py-1.5 mt-1 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Moeda</label>
                            <select
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                              className="w-full text-xs border border-slate-250 rounded px-2.5 py-1.5 mt-1 outline-none cursor-pointer"
                            >
                              <option value="BRL">BRL (R$)</option>
                              <option value="USD">USD ($)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* JORNADA */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Jornada Comercial</h4>
                  <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-200/60 rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Esta etapa representa o primeiro contato?</label>
                      <span className="text-[10px] text-slate-400">Define qual etapa sinaliza a entrada inicial do lead na esteira.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={representsFirstContact}
                      onChange={(e) => setRepresentsFirstContact(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                </div>

                {/* AUTOMAÇÃO */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Gatilhos de Alteração (Palavras-Chave)</h4>
                  
                  {/* Adicionar Palavra Chave */}
                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Frase ou Termo Chave</label>
                        <input
                          type="text"
                          placeholder="Ex: agendamento confirmado"
                          value={newKeywordPhrase}
                          onChange={(e) => setNewKeywordPhrase(e.target.value)}
                          className="w-full text-xs border border-slate-250 rounded px-2 py-1.5 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Direção</label>
                        <select
                          value={newKeywordDirection}
                          onChange={(e) => setNewKeywordDirection(e.target.value as "inbound" | "outbound" | "both")}
                          className="w-full text-xs border border-slate-250 rounded px-2 py-1.5 outline-none bg-white cursor-pointer"
                        >
                          <option value="inbound">Entrada (Mensagem Recebida)</option>
                          <option value="outbound">Saída (Mensagem Enviada)</option>
                          <option value="both">Ambas</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Correspondência:</label>
                        <select
                          value={newKeywordMatch}
                          onChange={(e) => setNewKeywordMatch(e.target.value as "contains" | "equals" | "starts_with")}
                          className="text-xs border border-slate-250 rounded px-2 py-1 outline-none bg-white cursor-pointer font-semibold text-slate-600"
                        >
                          <option value="contains">Contém</option>
                          <option value="equals">Igual a</option>
                          <option value="starts_with">Começa com</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold transition"
                      >
                        Adicionar Regra
                      </button>
                    </div>
                  </div>

                  {/* Listagem de palavras chaves adicionadas */}
                  {keywords.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {keywords.map((kw, idx) => (
                        <div key={idx} className="px-4 py-2 flex items-center justify-between bg-white text-xs">
                          <div>
                            <span className="font-bold text-slate-800">&quot;{kw.phrase}&quot;</span>
                            <span className="text-slate-400 mx-2">|</span>
                            <span className="text-slate-500 capitalize">{kw.direction === "inbound" ? "Mensagem Recebida" : kw.direction === "outbound" ? "Mensagem Enviada" : "Ambas"}</span>
                            <span className="text-slate-400 mx-2">|</span>
                            <span className="text-slate-400 italic">({kw.match_type})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(idx)}
                            className="text-rose-500 hover:text-rose-700 transition"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 text-center py-2">Nenhum termo chave de automação cadastrado para esta etapa.</p>
                  )}
                </div>

              </form>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveStage}
                  disabled={loading || !stageName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Salvando..." : "Salvar Configurações"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 2. REORDER STAGES MODAL */}
        {reorderModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setReorderModalOpen(false)} />
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col z-10 border border-slate-100">
              
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-slate-800">Ordenar Etapas da Jornada</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Defina a ordem cronológica do fluxo comercial</p>
                </div>
                <button onClick={() => setReorderModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[50vh] space-y-2">
                {tempStages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${stage.color}`}>
                        {stage.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveTempItem(idx, idx - 1)}
                        className="p-1 text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === tempStages.length - 1}
                        onClick={() => moveTempItem(idx, idx + 1)}
                        className="p-1 text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setReorderModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveReorder}
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  {loading ? "Salvando..." : "Salvar Ordem"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 3. EXCLUSÃO MODAL DE SEGURANÇA */}
        {deleteModalOpen && deletingStageConfig && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setDeleteModalOpen(false)} />
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full flex flex-col z-10 border border-slate-100 p-6 space-y-4">
              
              <div className="flex items-center space-x-3 text-rose-600">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="font-bold text-slate-800 text-base">Excluir Etapa: {deletingStageConfig.name}</h3>
              </div>

              {affectedLeadsCount > 0 ? (
                <div className="space-y-3.5">
                  <p className="text-xs text-slate-500">
                    Esta etapa possui <strong className="text-slate-800">{affectedLeadsCount} leads</strong> associados. 
                    Escolha uma etapa comercial para migrar os leads antes de prosseguir com a exclusão.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mover leads para:</label>
                    <select
                      value={replacementStageId}
                      onChange={(e) => setReplacementStageId(e.target.value)}
                      className="w-full text-xs border border-slate-250 rounded px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                      {stages.filter(s => s.id !== deletingStageConfig.id).map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Deseja realmente excluir a etapa comercial &quot;{deletingStageConfig.name}&quot;? Esta ação é definitiva.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteStage}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                >
                  {loading ? "Excluindo..." : affectedLeadsCount > 0 ? "Migrar e Excluir" : "Confirmar Exclusão"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
