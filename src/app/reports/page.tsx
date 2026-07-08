'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { defaultStages } from '@/utils/mockData';
import { Lead, Source, LeadStatus } from '@/types';
import { BarChart3, Globe, ShieldAlert, Award, TrendingUp, Users, ArrowDown } from 'lucide-react';

type TabType = 'origens' | 'campanhas' | 'termos' | 'funil' | 'atendimento';

export default function Reports() {
  const { currentCompany, leads, selectedPeriod } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('origens');

  // 1. Filtrar leads por empresa e período
  const companyLeads = leads.filter(lead => lead.companyId === currentCompany.id);
  
  const getFilteredLeads = () => {
    if (selectedPeriod === 'all') return companyLeads;
    
    const days = parseInt(selectedPeriod);
    if (isNaN(days)) return companyLeads;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return companyLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= cutoff;
    });
  };

  const filteredLeads = getFilteredLeads();

  // Helpers de formatação
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatPct = (val: number) => {
    return `${val.toFixed(1)}%`;
  };

  // --- 1. RELATÓRIO DE ORIGENS ---
  const getOrigensReport = () => {
    const data: Record<string, { leads: number; agendados: number; comparecidos: number; vendas: number; receita: number }> = {
      'Google Ads': { leads: 0, agendados: 0, comparecidos: 0, vendas: 0, receita: 0 },
      'Google Orgânico': { leads: 0, agendados: 0, comparecidos: 0, vendas: 0, receita: 0 },
      'Google Perfil': { leads: 0, agendados: 0, comparecidos: 0, vendas: 0, receita: 0 },
      'Instagram': { leads: 0, agendados: 0, comparecidos: 0, vendas: 0, receita: 0 },
      'Direto': { leads: 0, agendados: 0, comparecidos: 0, vendas: 0, receita: 0 }
    };

    filteredLeads.forEach(lead => {
      const src = lead.trackingSession?.source || 'Direto';
      const target = data[src] || data['Direto'];

      target.leads += 1;
      
      const stages = lead.history.map(h => h.stageName);
      if (stages.some(s => ['Agendado', 'Compareceu', 'Venda'].includes(s))) {
        target.agendados += 1;
      }
      if (stages.some(s => ['Compareceu', 'Venda'].includes(s))) {
        target.comparecidos += 1;
      }
      if (stages.some(s => s === 'Venda')) {
        target.vendas += 1;
        target.receita += lead.revenue || 0;
      }
    });

    return Object.entries(data).map(([origin, val]) => ({
      origin,
      ...val,
      conversion: val.leads > 0 ? (val.vendas / val.leads) * 100 : 0
    })).sort((a, b) => b.receita - a.receita);
  };

  // --- 2. RELATÓRIO DE CAMPANHAS ---
  const getCampanhasReport = () => {
    const data: Record<string, { leads: number; agendados: number; vendas: number; receita: number }> = {};

    filteredLeads.forEach(lead => {
      const camp = lead.trackingSession?.campaign || 'Sem Campanha';
      if (!data[camp]) {
        data[camp] = { leads: 0, agendados: 0, vendas: 0, receita: 0 };
      }

      const target = data[camp];
      target.leads += 1;

      const stages = lead.history.map(h => h.stageName);
      if (stages.some(s => ['Agendado', 'Compareceu', 'Venda'].includes(s))) {
        target.agendados += 1;
      }
      if (stages.some(s => s === 'Venda')) {
        target.vendas += 1;
        target.receita += lead.revenue || 0;
      }
    });

    return Object.entries(data).map(([campaign, val]) => ({
      campaign,
      ...val,
      ticketMedio: val.vendas > 0 ? val.receita / val.vendas : 0
    })).sort((a, b) => b.receita - a.receita);
  };

  // --- 3. RELATÓRIO DE TERMOS DE BUSCA ---
  const getTermosReport = () => {
    const data: Record<string, { leads: number; agendados: number; vendas: number; receita: number }> = {};

    filteredLeads.forEach(lead => {
      const term = lead.trackingSession?.term;
      if (!term) return; // ignora sem palavra-chave (direct / social / perfil)

      if (!data[term]) {
        data[term] = { leads: 0, agendados: 0, vendas: 0, receita: 0 };
      }

      const target = data[term];
      target.leads += 1;

      const stages = lead.history.map(h => h.stageName);
      if (stages.some(s => ['Agendado', 'Compareceu', 'Venda'].includes(s))) {
        target.agendados += 1;
      }
      if (stages.some(s => s === 'Venda')) {
        target.vendas += 1;
        target.receita += lead.revenue || 0;
      }
    });

    return Object.entries(data).map(([term, val]) => ({
      term,
      ...val
    })).sort((a, b) => b.receita - a.receita);
  };

  // --- 4. RELATÓRIO DE FUNIL ---
  const getFunnelReport = () => {
    // Conta leads que passaram por cada estágio na história
    const leadsCount = filteredLeads.length;

    const conversasCount = filteredLeads.filter(lead => 
      lead.history.some(h => ['Em Atendimento', 'Interessado', 'Agendado', 'Compareceu', 'Venda'].includes(h.stageName))
    ).length;

    const agendadosCount = filteredLeads.filter(lead => 
      lead.history.some(h => ['Agendado', 'Compareceu', 'Venda'].includes(h.stageName))
    ).length;

    const comparecidosCount = filteredLeads.filter(lead => 
      lead.history.some(h => ['Compareceu', 'Venda'].includes(h.stageName))
    ).length;

    const vendasCount = filteredLeads.filter(lead => 
      lead.history.some(h => h.stageName === 'Venda')
    ).length;

    const funnelSteps = [
      { step: '1. Leads Cadastrados', count: leadsCount, prevRate: 100, totalRate: 100 },
      { step: '2. Conversas Iniciadas', count: conversasCount, prevRate: leadsCount > 0 ? (conversasCount / leadsCount) * 100 : 0, totalRate: leadsCount > 0 ? (conversasCount / leadsCount) * 100 : 0 },
      { step: '3. Agendados', count: agendadosCount, prevRate: conversasCount > 0 ? (agendadosCount / conversasCount) * 100 : 0, totalRate: leadsCount > 0 ? (agendadosCount / leadsCount) * 100 : 0 },
      { step: '4. Compareceram', count: comparecidosCount, prevRate: agendadosCount > 0 ? (comparecidosCount / agendadosCount) * 100 : 0, totalRate: leadsCount > 0 ? (comparecidosCount / leadsCount) * 100 : 0 },
      { step: '5. Vendas Concluídas', count: vendasCount, prevRate: comparecidosCount > 0 ? (vendasCount / comparecidosCount) * 100 : 0, totalRate: leadsCount > 0 ? (vendasCount / leadsCount) * 100 : 0 }
    ];

    return funnelSteps;
  };

  // --- 5. PERFORMANCE DE ATENDIMENTO (VENDEDORES) ---
  const getAtendimentoReport = () => {
    const data: Record<string, { leads: number; agendados: number; vendas: number; receita: number; tempo: string }> = {
      'Rodrigo Medeiros': { leads: 0, agendados: 0, vendas: 0, receita: 0, tempo: '14 min' },
      'Aline Souza': { leads: 0, agendados: 0, vendas: 0, receita: 0, tempo: '8 min' },
      'Juliana Castro': { leads: 0, agendados: 0, vendas: 0, receita: 0, tempo: '11 min' },
      'Mauricio Silva': { leads: 0, agendados: 0, vendas: 0, receita: 0, tempo: '5 min' },
      'Sem Atendente': { leads: 0, agendados: 0, vendas: 0, receita: 0, tempo: '--' }
    };

    filteredLeads.forEach(lead => {
      const rep = lead.currentAssignedTo || 'Sem Atendente';
      const target = data[rep] || data['Sem Atendente'];

      target.leads += 1;
      
      const stages = lead.history.map(h => h.stageName);
      if (stages.some(s => ['Agendado', 'Compareceu', 'Venda'].includes(s))) {
        target.agendados += 1;
      }
      if (stages.some(s => s === 'Venda')) {
        target.vendas += 1;
        target.receita += lead.revenue || 0;
      }
    });

    return Object.entries(data)
      .map(([agent, val]) => ({
        agent,
        ...val,
        conversion: val.leads > 0 ? (val.vendas / val.leads) * 100 : 0
      }))
      .filter(a => a.leads > 0) // exibe apenas operadores com leads atribuídos
      .sort((a, b) => b.receita - a.receita);
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-sm text-slate-500 mt-1">
            Análises tabulares de aquisição de tráfego, eficiência de conversão e produtividade comercial.
          </p>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 overflow-x-auto shrink-0 select-none bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-sm shadow-slate-100/50">
          <button
            onClick={() => setActiveTab('origens')}
            className={`px-4 py-3 text-xs font-bold border-b-2 tracking-wider transition-colors shrink-0 ${
              activeTab === 'origens'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Origens de Tráfego
          </button>
          <button
            onClick={() => setActiveTab('campanhas')}
            className={`px-4 py-3 text-xs font-bold border-b-2 tracking-wider transition-colors shrink-0 ${
              activeTab === 'campanhas'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Campanhas
          </button>
          <button
            onClick={() => setActiveTab('termos')}
            className={`px-4 py-3 text-xs font-bold border-b-2 tracking-wider transition-colors shrink-0 ${
              activeTab === 'termos'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Termos (Search)
          </button>
          <button
            onClick={() => setActiveTab('funil')}
            className={`px-4 py-3 text-xs font-bold border-b-2 tracking-wider transition-colors shrink-0 ${
              activeTab === 'funil'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Funil Comercial
          </button>
          <button
            onClick={() => setActiveTab('atendimento')}
            className={`px-4 py-3 text-xs font-bold border-b-2 tracking-wider transition-colors shrink-0 ${
              activeTab === 'atendimento'
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Atendimento &amp; Operadores
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-xs p-5">
          
          {/* TAB: ORIGENS */}
          {activeTab === 'origens' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Distribuição por Canal de Origem</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Atribuição First/Last-Touch</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Canal / Origem</th>
                      <th className="py-2.5 px-4 text-center">Leads Gerados</th>
                      <th className="py-2.5 px-4 text-center">Agendados</th>
                      <th className="py-2.5 px-4 text-center">Comparecidos</th>
                      <th className="py-2.5 px-4 text-center">Vendas Fechadas</th>
                      <th className="py-2.5 px-4 text-right">Faturamento Atribuído</th>
                      <th className="py-2.5 px-4 text-center">Tx Conversão Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {getOrigensReport().map((row) => (
                      <tr key={row.origin} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{row.origin}</td>
                        <td className="py-3 px-4 text-center">{row.leads}</td>
                        <td className="py-3 px-4 text-center">{row.agendados}</td>
                        <td className="py-3 px-4 text-center">{row.comparecidos}</td>
                        <td className="py-3 px-4 text-center">{row.vendas}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(row.receita)}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">{formatPct(row.conversion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CAMPANHAS */}
          {activeTab === 'campanhas' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Desempenho de Campanhas UTM</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Otimização UTM Campaign</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Campanha</th>
                      <th className="py-2.5 px-4 text-center">Leads</th>
                      <th className="py-2.5 px-4 text-center">Agendados</th>
                      <th className="py-2.5 px-4 text-center">Vendas</th>
                      <th className="py-2.5 px-4 text-right">Faturamento</th>
                      <th className="py-2.5 px-4 text-right">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {getCampanhasReport().length > 0 ? (
                      getCampanhasReport().map((row) => (
                        <tr key={row.campaign} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{row.campaign}</td>
                          <td className="py-3 px-4 text-center">{row.leads}</td>
                          <td className="py-3 px-4 text-center">{row.agendados}</td>
                          <td className="py-3 px-4 text-center">{row.vendas}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-605">{formatCurrency(row.receita)}</td>
                          <td className="py-3 px-4 text-right text-slate-655 font-bold">{formatCurrency(row.ticketMedio)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">Nenhum lead com campanha ativa no período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TERMOS */}
          {activeTab === 'termos' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Palavras-chave Pesquisadas no Google</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Otimização Search Keyword (SEO/PPC)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Termo / Palavra-chave</th>
                      <th className="py-2.5 px-4 text-center">Leads</th>
                      <th className="py-2.5 px-4 text-center">Agendados</th>
                      <th className="py-2.5 px-4 text-center">Vendas</th>
                      <th className="py-2.5 px-4 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {getTermosReport().length > 0 ? (
                      getTermosReport().map((row) => (
                        <tr key={row.term} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-850">{row.term}</td>
                          <td className="py-3 px-4 text-center">{row.leads}</td>
                          <td className="py-3 px-4 text-center">{row.agendados}</td>
                          <td className="py-3 px-4 text-center">{row.vendas}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(row.receita)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">Nenhum termo de busca detectado no período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: FUNIL */}
          {activeTab === 'funil' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Métricas de Conversão do Funil</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Eficiência Comercial por Fase</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Etapa do Funil</th>
                      <th className="py-2.5 px-4 text-center">Passagens (Volume)</th>
                      <th className="py-2.5 px-4 text-center">Conversão para Próxima Etapa</th>
                      <th className="py-2.5 px-4 text-center">Taxa de Conversão do Funil (Acumulado)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {getFunnelReport().map((row, idx) => (
                      <tr key={row.step} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{row.step}</td>
                        <td className="py-3 px-4 text-center text-sm font-black text-slate-805">{row.count} leads</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-600">
                          {idx === 0 ? '--' : formatPct(row.prevRate)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {formatPct(row.totalRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ATENDIMENTO */}
          {activeTab === 'atendimento' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Produtividade dos Operadores</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Métricas de Performance da Inbox</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Responsável (Atendente)</th>
                      <th className="py-2.5 px-4 text-center">Leads Atendidos</th>
                      <th className="py-2.5 px-4 text-center">Agendamentos</th>
                      <th className="py-2.5 px-4 text-center">Vendas Fechadas</th>
                      <th className="py-2.5 px-4 text-right">Faturamento Gerado</th>
                      <th className="py-2.5 px-4 text-center">Tempo Médio Resposta</th>
                      <th className="py-2.5 px-4 text-center">Taxa Conversão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {getAtendimentoReport().map((row) => (
                      <tr key={row.agent} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{row.agent}</td>
                        <td className="py-3 px-4 text-center">{row.leads}</td>
                        <td className="py-3 px-4 text-center">{row.agendados}</td>
                        <td className="py-3 px-4 text-center">{row.vendas}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(row.receita)}</td>
                        <td className="py-3 px-4 text-center font-mono text-amber-700">{row.tempo}</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-600">{formatPct(row.conversion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </Layout>
  );
}
