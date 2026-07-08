'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { defaultStages } from '@/utils/mockData';
import { Lead, LeadStatus, Source } from '@/types';
import { 
  Search, Filter, Calendar, Share2, Award, User, DollarSign, 
  ArrowRight, Phone, MessageSquare, Compass, Route, ExternalLink, X, Zap
} from 'lucide-react';
import Link from 'next/link';

export default function Leads() {
  const { currentCompany, leads, moveLead, selectedPeriod } = useApp();
  
  // States para filtros e busca
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterSaleStatus, setFilterSaleStatus] = useState<'all' | 'sold' | 'unsold'>('all');
  
  // Drawer de Detalhes
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // 1. Filtrar leads por empresa e período
  const companyLeads = leads.filter(lead => lead.companyId === currentCompany.id);
  
  const getFilteredLeads = () => {
    let result = companyLeads;

    // Filtro por Período
    if (selectedPeriod !== 'all') {
      const days = parseInt(selectedPeriod);
      if (!isNaN(days)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        result = result.filter(lead => new Date(lead.createdAt) >= cutoff);
      }
    }

    // Filtro por Origem
    if (filterSource !== 'all') {
      result = result.filter(lead => lead.trackingSession?.source === filterSource);
    }

    // Filtro por Etapa
    if (filterStage !== 'all') {
      result = result.filter(lead => lead.stage === filterStage);
    }

    // Filtro por Atendente
    if (filterAgent !== 'all') {
      result = result.filter(lead => lead.currentAssignedTo === filterAgent);
    }

    // Filtro por Status de Venda
    if (filterSaleStatus === 'sold') {
      result = result.filter(lead => lead.stage === 'Venda');
    } else if (filterSaleStatus === 'unsold') {
      result = result.filter(lead => lead.stage !== 'Venda');
    }

    // Busca Textual
    if (search.trim() !== '') {
      const query = search.toLowerCase();
      result = result.filter(lead => 
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.initialMessage && lead.initialMessage.toLowerCase().includes(query))
      );
    }

    return result;
  };

  const filteredLeads = getFilteredLeads();

  // Lista de origens e atendentes únicos para popular os filtros
  const uniqueSources = Array.from(new Set(companyLeads.map(l => l.trackingSession?.source).filter(Boolean)));
  const uniqueAgents = Array.from(new Set(companyLeads.map(l => l.currentAssignedTo).filter(Boolean)));

  // Formatar data
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cores das Etapas
  const getStageBadge = (stage: LeadStatus) => {
    const config = defaultStages.find(s => s.id === stage);
    const colorClass = config?.color || 'bg-slate-100 text-slate-800';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
        {stage}
      </span>
    );
  };

  const getTemperatureBadge = (temp: 'Frio' | 'Morno' | 'Quente') => {
    if (temp === 'Quente') return <span className="bg-red-50 text-red-700 border border-red-150 px-1.5 py-0.5 rounded text-[10px] font-bold">Quente</span>;
    if (temp === 'Morno') return <span className="bg-amber-50 text-amber-700 border border-amber-150 px-1.5 py-0.5 rounded text-[10px] font-bold">Morno</span>;
    return <span className="bg-blue-50 text-blue-700 border border-blue-150 px-1.5 py-0.5 rounded text-[10px] font-bold">Frio</span>;
  };

  const handleStageChangeInDrawer = (newStage: LeadStatus) => {
    if (!selectedLeadId) return;
    
    let revenueInput = undefined;
    if (newStage === 'Venda') {
      const valStr = prompt('Digite o valor da venda (R$):', selectedLead?.value?.toString() || currentCompany.averageTicket.toString());
      if (valStr !== null) {
        const parsed = parseFloat(valStr.replace(',', '.'));
        if (!isNaN(parsed)) {
          revenueInput = parsed;
        }
      } else {
        return; // cancelou
      }
    }
    
    moveLead(selectedLeadId, newStage, 'manual', `Etapa comercial alterada manualmente na tela de leads`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Page title and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Base de Leads</h1>
            <p className="text-sm text-slate-500 mt-1">
              Todos os contatos gerados via WhatsApp e suas respectivas fontes de tráfego.
            </p>
          </div>
        </div>

        {/* Search and filter toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou mensagem inicial..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border border-slate-250 rounded-lg pl-10 pr-4 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
            </div>
            
            {/* Filters toggle/group */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              {/* Filter Source */}
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-lg px-2 py-2 outline-none cursor-pointer"
              >
                <option value="all">Todas as Origens</option>
                {uniqueSources.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>

              {/* Filter Stage */}
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-lg px-2 py-2 outline-none cursor-pointer"
              >
                <option value="all">Todas as Etapas</option>
                {defaultStages.map(stg => (
                  <option key={stg.id} value={stg.id}>{stg.name}</option>
                ))}
              </select>

              {/* Filter Agent */}
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-lg px-2 py-2 outline-none cursor-pointer"
              >
                <option value="all">Todos Operadores</option>
                {uniqueAgents.map(ag => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>

              {/* Filter Sale Status */}
              <select
                value={filterSaleStatus}
                onChange={(e) => setFilterSaleStatus(e.target.value as 'all' | 'sold' | 'unsold')}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-lg px-2 py-2 outline-none cursor-pointer"
              >
                <option value="all">Faturamento (Todos)</option>
                <option value="sold">Venda Concluída</option>
                <option value="unsold">Não Vendidos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Contato</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Campanha</th>
                  <th className="py-3 px-4">Primeira Mensagem</th>
                  <th className="py-3 px-4">Entrada</th>
                  <th className="py-3 px-4">Etapa</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-right">Valor / Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 text-xs">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-5 font-semibold text-slate-800">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-slate-800 leading-tight">{lead.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{lead.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                          {lead.trackingSession?.source || 'Direto'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {lead.trackingSession?.campaign || 'Sem Campanha'}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">
                        {lead.initialMessage || lead.phone}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-medium">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStageBadge(lead.stage)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-500">
                        {lead.currentAssignedTo}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        {lead.stage === 'Venda' ? (
                          <span className="text-emerald-600">R$ {lead.revenue}</span>
                        ) : (
                          <span className="text-slate-400">R$ {lead.value || 0}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum lead encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Slide-over Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-45 flex justify-end overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-300"
            onClick={() => setSelectedLeadId(null)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-50 animate-in slide-in-from-right duration-300 ease-out">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-slate-200 text-slate-655 font-bold h-10 w-10 rounded-full flex items-center justify-center text-sm border border-slate-300">
                  {selectedLead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-850 leading-tight">{selectedLead.name}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-slate-400">{selectedLead.phone}</span>
                    <span className="h-1 w-1 bg-slate-300 rounded-full" />
                    {getTemperatureBadge(selectedLead.temperature)}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLeadId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Ações Rápidas */}
              <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">Fase Comercial</span>
                  <span className="text-xs text-slate-600 mt-1 block">Altere o estágio comercial ou clique para conversar no Inbox.</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedLead.stage}
                    onChange={(e) => handleStageChangeInDrawer(e.target.value as LeadStatus)}
                    className="bg-white text-slate-700 text-xs font-semibold border border-slate-250 rounded-lg px-2.5 py-1.5 outline-none w-full sm:w-auto cursor-pointer"
                  >
                    {defaultStages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Link
                    href={`/inbox?leadId=${selectedLead.id}`}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold flex items-center justify-center gap-1 text-center shrink-0 w-full sm:w-auto transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Inbox
                  </Link>
                </div>
              </div>

              {/* DADOS DO CONTATO */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Dados de Contato
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Nome</span>
                    <span className="font-bold text-slate-800">{selectedLead.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Telefone</span>
                    <span className="font-bold text-slate-800">{selectedLead.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Primeira Mensagem</span>
                    <span className="font-medium text-slate-700 block italic">&quot;{selectedLead.initialMessage || 'Nenhuma'}&quot;</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Responsável Atual</span>
                    <span className="font-bold text-slate-700">{selectedLead.currentAssignedTo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Criado Em</span>
                    <span className="font-medium text-slate-700">{formatDate(selectedLead.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Faturamento Concluído</span>
                    <span className="font-bold text-emerald-600">R$ {selectedLead.revenue}</span>
                  </div>
                </div>
              </div>

              {/* ATRIBUIÇÃO */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                  <Compass className="h-3.5 w-3.5 text-slate-400" />
                  Dados de Atribuição de Marketing
                </h3>
                {selectedLead.trackingSession ? (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Origem (UTM Source)</span>
                      <span className="font-bold text-slate-800">{selectedLead.trackingSession.source}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Mídia (UTM Medium)</span>
                      <span className="font-bold text-slate-800">{selectedLead.trackingSession.medium}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Campanha (UTM Campaign)</span>
                      <span className="font-bold text-slate-800">{selectedLead.trackingSession.campaign}</span>
                    </div>
                    {selectedLead.trackingSession.term && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Termo (Keyword)</span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{selectedLead.trackingSession.term}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block mb-0.5">Página de Entrada</span>
                      <span className="font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{selectedLead.trackingSession.landingPage}</span>
                    </div>
                    {selectedLead.trackingSession.referrer && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Referrer (Origem HTTP)</span>
                        <span className="font-medium text-slate-655 truncate block max-w-[200px]" title={selectedLead.trackingSession.referrer}>{selectedLead.trackingSession.referrer}</span>
                      </div>
                    )}
                    {selectedLead.trackingSession.gclid && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block mb-0.5">Google Click Identifier (GCLID)</span>
                        <span className="font-mono text-[10px] text-amber-800 bg-amber-50 border border-amber-150 px-2 py-1 rounded block select-all">
                          {selectedLead.trackingSession.gclid}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-slate-400 block mb-0.5">Canal e Confiança</span>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">
                          {selectedLead.trackingSession.source === 'Google Ads' ? 'Mídia Paga (PPC)' : 'Tráfego Orgânico'}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px] border border-emerald-100">
                          Confiança: {selectedLead.trackingSession.gclid ? 'Confirmada' : 'Inferida'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhum dado de rastreamento associado. Entrada direta.</p>
                )}
              </div>

              {/* TIMELINE DE JORNADA COMERCIAL */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                  <Route className="h-3.5 w-3.5 text-slate-400" />
                  Jornada Comercial (Histórico)
                </h3>
                
                <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                  {/* Visita Inicial */}
                  {selectedLead.trackingSession && (
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1 bg-blue-500 rounded-full h-3.5 w-3.5 border-2 border-white ring-2 ring-blue-100" />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Sessão Iniciada no Site</span>
                        <span className="text-slate-500 block mt-0.5">
                          Origem: {selectedLead.trackingSession.source} | Campanha: {selectedLead.trackingSession.campaign}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">
                          {formatDate(selectedLead.trackingSession.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Histórico comercial */}
                  {selectedLead.history.map((hist, idx) => {
                    const isSystem = hist.source === 'system';
                    const isAuto = hist.source === 'automation';
                    
                    let nodeColor = 'bg-slate-400';
                    if (hist.stageName === 'Novo Lead') nodeColor = 'bg-blue-400';
                    else if (hist.stageName === 'Em Atendimento') nodeColor = 'bg-indigo-400';
                    else if (hist.stageName === 'Agendado') nodeColor = 'bg-purple-400';
                    else if (hist.stageName === 'Compareceu') nodeColor = 'bg-pink-400';
                    else if (hist.stageName === 'Venda') nodeColor = 'bg-emerald-450';
                    else if (hist.stageName === 'Perdido') nodeColor = 'bg-rose-400';

                    return (
                      <div key={hist.id} className="relative">
                        <span className={`absolute -left-[21px] top-1 rounded-full h-3.5 w-3.5 border-2 border-white ring-2 ${nodeColor.replace('bg-', 'ring-')}/20 ${nodeColor}`} />
                        <div className="text-xs">
                          <span className="font-bold text-slate-800 block">
                            Mudança de Fase: {hist.stageName}
                          </span>
                          <span className="text-slate-500 block mt-0.5">{hist.reason}</span>
                          
                          {isAuto && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-55 px-1.5 py-0.5 rounded mt-1 border border-emerald-100">
                              <Zap className="h-2.5 w-2.5 fill-current" />
                              Automação: {hist.ruleName}
                            </span>
                          )}
                          
                          {hist.agentName && (
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Operador: {hist.agentName}
                            </span>
                          )}
                          
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">
                            {formatDate(hist.movedAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 shrink-0 justify-end">
              <button
                onClick={() => setSelectedLeadId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
