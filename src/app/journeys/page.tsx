'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { Lead, Source, LeadStatus } from '@/types';
import { Route, Search, Calendar, Compass, ArrowRight, User, Link, MessageSquare, Zap, Clock, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Journeys() {
  const { currentCompany, leads, selectedPeriod } = useApp();
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // Filtragem de Leads
  const companyLeads = leads.filter(l => l.companyId === currentCompany.id);
  
  const getFilteredLeads = () => {
    let result = companyLeads;

    if (selectedPeriod !== 'all') {
      const days = parseInt(selectedPeriod);
      if (!isNaN(days)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        result = result.filter(lead => new Date(lead.createdAt) >= cutoff);
      }
    }

    if (selectedSource !== 'all') {
      result = result.filter(lead => lead.trackingSession?.source === selectedSource);
    }

    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(lead => lead.name.toLowerCase().includes(q));
    }

    return result;
  };

  const filteredLeads = getFilteredLeads();
  const uniqueSources = Array.from(new Set(companyLeads.map(l => l.trackingSession?.source).filter(Boolean)));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jornada de Contatos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualização cronológica e atribuição de multi-toque para cada lead.
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar jornada pelo nome do lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-slate-250 rounded-lg pl-10 pr-4 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-lg px-3 py-2 outline-none cursor-pointer text-slate-700 font-semibold"
          >
            <option value="all">Todas as Origens</option>
            {uniqueSources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>

        {/* Journeys List */}
        <div className="space-y-6">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => {
              const session = lead.trackingSession;
              
              // Lógica de Atribuição e Toques
              // 1. Primeiro Toque: Se veio de Google Ads ou Orgânico por busca, podemos deduzir.
              // Simulamos que para leads pagos, o primeiro toque pode ter sido orgânico se tivéssemos um histórico,
              // mas como o protótipo foca em touchpoints de sessões:
              // - Se for Google Ads: Primeiro Toque = Google Orgânico (simulando descoberta prévia) ou Google Ads diretamente.
              // Vamos colocar:
              // - Primeiro toque: Para 'Google Ads', o primeiro toque é inferido como 'Google Orgânico' (simulando busca inicial).
              // - Último toque: 'Google Ads'
              // - Conversão atribuída: 'Google Ads' (Last Touch pago predomina)
              // - Confiança: 'Confirmada' se tiver gclid.
              const isPaid = session?.source === 'Google Ads';
              const primeiroToque = isPaid ? 'Google Orgânico' : (session?.source || 'Direto');
              const ultimoToque = session?.source || 'Direto';
              const conversaoAtribuida = session?.source || 'Direto';
              const confianca = session?.gclid ? 'Confirmada' : (session ? 'Inferida' : 'Desconhecida');

              return (
                <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                  
                  {/* Lead Summary Bar */}
                  <div className="bg-slate-50 border-b border-slate-150 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0 border border-slate-350">
                        {lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">{lead.name}</h3>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">{lead.phone}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200 uppercase">
                        Fase: {lead.stage}
                      </span>
                      {lead.stage === 'Venda' && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-emerald-100 uppercase">
                          Receita: R$ {lead.revenue}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attribution Details Grid */}
                  <div className="px-6 py-4 border-b border-slate-150 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/20">
                    <div className="text-xs">
                      <span className="text-slate-400 block mb-0.5 font-medium">Primeiro Toque</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Compass className="h-3.5 w-3.5 text-slate-400" />
                        {primeiroToque}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 block mb-0.5 font-medium">Último Toque</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Route className="h-3.5 w-3.5 text-slate-400" />
                        {ultimoToque}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 block mb-0.5 font-medium">Conversão Atribuída</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        {conversaoAtribuida}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 block mb-0.5 font-medium">Confiança de Rastreio</span>
                      <span className={`font-bold inline-flex items-center gap-1 ${
                        confianca === 'Confirmada' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {confianca === 'Confirmada' ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        {confianca}
                      </span>
                    </div>
                  </div>

                  {/* Journey Timeline */}
                  <div className="p-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Linha do Tempo da Jornada</h4>
                    
                    <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
                      
                      {/* Touchpoint 1: Site Entry (Tracking session) */}
                      {session && (
                        <div className="relative">
                          {/* Node Icon wrapper */}
                          <span className="absolute -left-[35px] top-0 bg-blue-500 text-white rounded-full h-7 w-7 flex items-center justify-center border-2 border-white ring-4 ring-blue-50 shadow-xs">
                            <Clock className="h-3.5 w-3.5" />
                          </span>
                          
                          <div className="text-xs">
                            <span className="text-[10px] text-slate-400 font-bold block">{formatDate(session.timestamp)}</span>
                            <span className="font-bold text-slate-800 text-sm block mt-0.5">Sessão Iniciada via {session.source}</span>
                            <p className="text-slate-500 mt-1">
                              Página de destino acessada: <code className="bg-slate-55 px-1 rounded text-slate-700">{session.landingPage}</code>
                            </p>
                            {session.term && (
                              <p className="text-slate-500 mt-0.5">
                                Termo pesquisado: <strong className="text-slate-700">&quot;{session.term}&quot;</strong>
                              </p>
                            )}
                            {session.gclid && (
                              <p className="text-[10px] text-amber-800 font-mono mt-1 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block">
                                GCLID: {session.gclid}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Touchpoint 2: WhatsApp Click */}
                      {session && (
                        <div className="relative">
                          <span className="absolute -left-[35px] top-0 bg-emerald-500 text-white rounded-full h-7 w-7 flex items-center justify-center border-2 border-white ring-4 ring-emerald-50 shadow-xs">
                            <Link className="h-3.5 w-3.5" />
                          </span>
                          <div className="text-xs">
                            {/* Simulamos clique 3 minutos após o acesso */}
                            <span className="text-[10px] text-slate-400 font-bold block">
                              {formatDate(new Date(new Date(session.timestamp).getTime() + 3 * 60 * 1000).toISOString())}
                            </span>
                            <span className="font-bold text-slate-800 text-sm block mt-0.5">Clicou no botão do WhatsApp</span>
                            <p className="text-slate-500 mt-0.5">
                              Interação com link rastreável na página {session.landingPage}.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Touchpoint 3: Lead Creation & First Inbound Message */}
                      <div className="relative">
                        <span className="absolute -left-[35px] top-0 bg-indigo-500 text-white rounded-full h-7 w-7 flex items-center justify-center border-2 border-white ring-4 ring-indigo-50 shadow-xs">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <div className="text-xs">
                          <span className="text-[10px] text-slate-400 font-bold block">{formatDate(lead.createdAt)}</span>
                          <span className="font-bold text-slate-800 text-sm block mt-0.5">Iniciou conversa (Lead Criado)</span>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1.5 italic text-slate-655 max-w-lg">
                            &quot;{lead.initialMessage || 'Olá, gostaria de tirar uma dúvida.'}&quot;
                          </div>
                        </div>
                      </div>

                      {/* Touchpoint 4: Commercial Events (History movements) */}
                      {lead.history.filter(h => h.stageName !== 'Novo Lead').map((hist) => {
                        let iconBg = 'bg-slate-500';
                        let labelText = '';
                        
                        if (hist.stageName === 'Agendado') {
                          iconBg = 'bg-purple-500';
                          labelText = 'Agendamento Confirmado';
                        } else if (hist.stageName === 'Compareceu') {
                          iconBg = 'bg-pink-500';
                          labelText = 'Comparecimento Registrado';
                        } else if (hist.stageName === 'Venda') {
                          iconBg = 'bg-emerald-500';
                          labelText = `Venda Registrada - R$ ${lead.revenue}`;
                        } else if (hist.stageName === 'Perdido') {
                          iconBg = 'bg-rose-500';
                          labelText = 'Lead Perdido';
                        } else {
                          iconBg = 'bg-indigo-400';
                          labelText = `Avançou para ${hist.stageName}`;
                        }

                        const isAuto = hist.source === 'automation';

                        return (
                          <div key={hist.id} className="relative">
                            <span className={`absolute -left-[35px] top-0 text-white rounded-full h-7 w-7 flex items-center justify-center border-2 border-white ring-4 ring-slate-100 shadow-xs ${iconBg}`}>
                              {hist.stageName === 'Venda' ? <TrendingUp className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                            </span>
                            <div className="text-xs">
                              <span className="text-[10px] text-slate-400 font-bold block">{formatDate(hist.movedAt)}</span>
                              <span className="font-bold text-slate-850 text-sm block mt-0.5">{labelText}</span>
                              <p className="text-slate-500 mt-1">{hist.reason}</p>
                              
                              {isAuto && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mt-1">
                                  Automação: {hist.ruleName}
                                </span>
                              )}
                              {hist.agentName && (
                                <span className="text-[10px] text-slate-400 block mt-1">
                                  Operador: {hist.agentName}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-450">
              Nenhuma jornada encontrada para os filtros aplicados.
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
