'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { defaultStages } from '@/utils/mockData';
import { Lead, LeadStatus, PipelineStageConfig } from '@/types';
import { 
  Plus, Users, MessageSquare, Calendar, CheckSquare, ShieldCheck, 
  Trash2, ArrowLeft, ArrowRight, UserPlus, DollarSign, Clock, Play
} from 'lucide-react';
import Link from 'next/link';

export default function Pipeline() {
  const { currentCompany, leads, moveLead } = useApp();
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  // Filtrar leads da empresa ativa
  const companyLeads = leads.filter(l => l.companyId === currentCompany.id);

  // Formatar tempo decorrido desde a última mudança
  const getTimeElapsed = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (days > 0) return `${days}d atrás`;
    if (hrs > 0) return `${hrs}h atrás`;
    if (mins > 0) return `${mins}m atrás`;
    return 'Agora mesmo';
  };

  // Cores de borda por etapa
  const getStageBorderColor = (stageId: LeadStatus) => {
    switch (stageId) {
      case 'Novo Lead': return 'border-l-4 border-l-blue-500';
      case 'Em Atendimento': return 'border-l-4 border-l-indigo-500';
      case 'Interessado': return 'border-l-4 border-l-amber-500';
      case 'Agendado': return 'border-l-4 border-l-purple-500';
      case 'Compareceu': return 'border-l-4 border-l-pink-500';
      case 'Venda': return 'border-l-4 border-l-emerald-500';
      case 'Perdido': return 'border-l-4 border-l-rose-500';
      default: return 'border-l-4 border-l-slate-300';
    }
  };

  // Cores de fundo das etapas
  const getStageHeaderColor = (stageId: LeadStatus) => {
    switch (stageId) {
      case 'Novo Lead': return 'bg-blue-50 text-blue-800';
      case 'Em Atendimento': return 'bg-indigo-50 text-indigo-800';
      case 'Interessado': return 'bg-amber-50 text-amber-800';
      case 'Agendado': return 'bg-purple-50 text-purple-800';
      case 'Compareceu': return 'bg-pink-50 text-pink-800';
      case 'Venda': return 'bg-emerald-50 text-emerald-800';
      case 'Perdido': return 'bg-rose-50 text-rose-800';
      default: return 'bg-slate-50 text-slate-800';
    }
  };

  // Handlers para Drag and Drop Nativo
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggingLeadId(leadId);
  };

  const handleDragEnd = () => {
    setDraggingLeadId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    triggerMove(leadId, targetStage);
  };

  const triggerMove = (leadId: string, targetStage: LeadStatus) => {
    const lead = companyLeads.find(l => l.id === leadId);
    if (!lead) return;

    if (lead.stage === targetStage) return;

    let revenueInput = undefined;
    if (targetStage === 'Venda') {
      const valStr = prompt('Digite o valor da venda (R$):', lead.value?.toString() || currentCompany.averageTicket.toString());
      if (valStr !== null) {
        const parsed = parseFloat(valStr.replace(',', '.'));
        if (!isNaN(parsed)) {
          revenueInput = parsed;
        }
      } else {
        return; // Cancelado
      }
    }

    moveLead(leadId, targetStage, 'manual', 'Movimentado no Kanban', undefined, 'Operador', revenueInput);
  };

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        
        {/* Header */}
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Funil Comercial (Kanban)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Arraste os cards para mover os leads pelas etapas do processo comercial.
          </p>
        </div>

        {/* Board Container */}
        <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin select-none">
          <div className="flex gap-4 min-w-[1280px] h-[calc(100vh-220px)] items-start">
            
            {defaultStages.map((stage) => {
              const stageLeads = companyLeads.filter(l => l.stage === stage.id);
              const columnRevenue = stage.id === 'Venda' 
                ? stageLeads.reduce((sum, l) => sum + (l.revenue || 0), 0)
                : stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);

              return (
                <div 
                  key={stage.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className="w-80 bg-slate-100 rounded-2xl flex flex-col max-h-full border border-slate-200"
                >
                  
                  {/* Column Header */}
                  <div className={`p-4 rounded-t-2xl flex items-center justify-between shrink-0 ${getStageHeaderColor(stage.id)}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm uppercase tracking-wider">{stage.name}</span>
                      <span className="bg-white/60 text-slate-800 text-xs px-2 py-0.5 rounded-full font-bold">
                        {stageLeads.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold">
                      {stage.id === 'Venda' ? 'Faturamento:' : 'Potencial:'} R$ {columnRevenue}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin max-h-full min-h-[150px]">
                    {stageLeads.length > 0 ? (
                      stageLeads.map((lead) => {
                        const lastActivity = lead.history[lead.history.length - 1];
                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 cursor-grab hover:shadow-md active:cursor-grabbing hover:border-slate-300 transition-all ${getStageBorderColor(stage.id)} ${
                              draggingLeadId === lead.id ? 'opacity-40' : ''
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight leading-snug">
                                {lead.name}
                              </span>
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${
                                lead.temperature === 'Quente' ? 'bg-rose-500' : (lead.temperature === 'Morno' ? 'bg-amber-400' : 'bg-blue-400')
                              }`} title={`Temperatura: ${lead.temperature}`} />
                            </div>

                            {/* Telefone e Origem */}
                            <div className="text-[10px] text-slate-400 font-medium mt-1">
                              {lead.phone}
                            </div>

                            {/* Interesse / Mensagem / Campanha */}
                            <div className="mt-2.5 bg-slate-50 rounded-lg p-2 text-[10px] text-slate-500 line-clamp-2 border border-slate-150">
                              {lead.trackingSession ? (
                                <span className="font-bold text-slate-700 block mb-0.5">
                                  {lead.trackingSession.source} | {lead.trackingSession.campaign}
                                </span>
                              ) : null}
                              &quot;{lead.initialMessage || 'Olá, gostaria de informações.'}&quot;
                            </div>

                            {/* Card Footer */}
                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeElapsed(lastActivity.movedAt)}
                              </span>
                              <span className="font-bold text-slate-800">
                                R$ {stage.id === 'Venda' ? lead.revenue : lead.value}
                              </span>
                            </div>

                            {/* Fallback navigation buttons (Quick Move) */}
                            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between gap-1">
                              <Link
                                href={`/inbox?leadId=${lead.id}`}
                                className="text-[9px] font-bold text-slate-655 bg-slate-100 hover:bg-slate-150 px-2 py-1 rounded transition-colors text-center flex-1"
                              >
                                Chat
                              </Link>
                              
                              {/* Quick Move dropdown */}
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    triggerMove(lead.id, e.target.value as LeadStatus);
                                    e.target.value = ''; // Reset select
                                  }
                                }}
                                className="text-[9px] font-bold text-slate-655 bg-slate-100 hover:bg-slate-150 px-2 py-1 rounded transition-colors cursor-pointer outline-none border-none max-w-[80px]"
                              >
                                <option value="">Mover...</option>
                                {defaultStages.filter(s => s.id !== stage.id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>

                          </div>
                        );
                      })
                    ) : (
                      <div className="h-24 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs italic text-center p-4">
                        Arraste leads para cá
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

          </div>
        </div>

      </div>
    </Layout>
  );
}
