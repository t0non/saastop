'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { 
  Users, MessageSquare, Calendar, CheckSquare, ShieldCheck, 
  DollarSign, TrendingUp, Percent, ArrowDown, TrendingDown, ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';

interface DailyData {
  date: string;
  leads: number;
  vendas: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];

export default function Dashboard() {
  const { currentCompany, leads, selectedPeriod } = useApp();
  const [mounted, setMounted] = useState(false);

  // Evita erros de hidratação do Recharts
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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

  // 2. Calcular métricas derivadas baseadas no histórico
  // Leads totais no período
  const totalLeads = filteredLeads.length;

  // Conversas iniciadas (leads que atingiram Em Atendimento ou posterior, ou com histórico de mensagens)
  const totalConversas = filteredLeads.filter(lead => 
    lead.history.some(h => ['Em Atendimento', 'Interessado', 'Agendado', 'Compareceu', 'Venda'].includes(h.stageName))
  ).length;

  // Agendamentos (leads que já estiveram no estágio Agendado)
  const totalAgendamentos = filteredLeads.filter(lead => 
    lead.history.some(h => ['Agendado', 'Compareceu', 'Venda'].includes(h.stageName))
  ).length;

  // Comparecimentos (leads que já estiveram no estágio Compareceu)
  const totalComparecimentos = filteredLeads.filter(lead => 
    lead.history.some(h => ['Compareceu', 'Venda'].includes(h.stageName))
  ).length;

  // Vendas (leads no estágio Venda ou que já estiveram lá)
  const totalVendas = filteredLeads.filter(lead => 
    lead.history.some(h => h.stageName === 'Venda')
  ).length;

  // Receita atribuída (soma da receita de leads em Venda no período)
  const totalReceita = filteredLeads
    .filter(lead => lead.stage === 'Venda')
    .reduce((sum, lead) => sum + (lead.revenue || 0), 0);

  // Taxa de conversão Lead -> Venda
  const taxaConversao = totalLeads > 0 ? (totalVendas / totalLeads) * 100 : 0;

  // Ticket Médio
  const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : currentCompany.averageTicket;

  // 3. Agrupamento por Origem de Receita e Leads
  const origensMap: Record<string, { leads: number; vendas: number; receita: number }> = {
    'Google Ads': { leads: 0, vendas: 0, receita: 0 },
    'Google Orgânico': { leads: 0, vendas: 0, receita: 0 },
    'Google Perfil': { leads: 0, vendas: 0, receita: 0 },
    'Instagram': { leads: 0, vendas: 0, receita: 0 },
    'Direto': { leads: 0, vendas: 0, receita: 0 }
  };

  filteredLeads.forEach(lead => {
    const src = lead.trackingSession?.source || 'Direto';
    const hasSale = lead.stage === 'Venda';
    
    if (origensMap[src]) {
      origensMap[src].leads += 1;
      if (hasSale) {
        origensMap[src].vendas += 1;
        origensMap[src].receita += lead.revenue || 0;
      }
    } else {
      // Origem genérica
      origensMap['Direto'].leads += 1;
      if (hasSale) {
        origensMap['Direto'].vendas += 1;
        origensMap['Direto'].receita += lead.revenue || 0;
      }
    }
  });

  const origensData = Object.entries(origensMap).map(([name, val]) => ({
    name,
    leads: val.leads,
    vendas: val.vendas,
    receita: val.receita
  })).sort((a, b) => b.receita - a.receita);

  // 4. Preparar dados diários para Leads x Vendas (últimos 15 dias)
  const getDailyChartData = (): DailyData[] => {
    const daysData: Record<string, { leads: number; vendas: number }> = {};
    const now = new Date();
    
    // Gerar chaves para os últimos 15 dias
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      daysData[dateStr] = { leads: 0, vendas: 0 };
    }

    // Preencher dados
    companyLeads.forEach(lead => {
      const dateObj = new Date(lead.createdAt);
      const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (daysData[dateStr]) {
        daysData[dateStr].leads += 1;
        if (lead.stage === 'Venda') {
          daysData[dateStr].vendas += 1;
        }
      }
    });

    return Object.entries(daysData).map(([date, val]) => ({
      date,
      leads: val.leads,
      vendas: val.vendas
    }));
  };

  const dailyChartData = getDailyChartData();

  // Formatar Moeda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Top welcome section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Painel de Atribuição</h1>
            <p className="text-sm text-slate-500 mt-1">
              Desempenho de canais de marketing e jornada comercial para <strong>{currentCompany.name}</strong>.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3 text-xs shadow-xs shrink-0 self-start sm:self-center">
            <TrendingUp className="text-emerald-500 h-4 w-4 shrink-0" />
            <span className="text-slate-600">
              Taxa de Conversão Geral: <strong className="text-slate-900 font-semibold">{taxaConversao.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Leads</span>
              <div className="bg-blue-55 px-2 py-2 rounded-lg text-blue-600 bg-blue-50">
                <Users className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">{totalLeads}</span>
              <span className="text-[10px] text-slate-400 font-medium">cadastrados</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Conversas</span>
              <div className="bg-indigo-55 px-2 py-2 rounded-lg text-indigo-600 bg-indigo-50">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">{totalConversas}</span>
              <span className="text-[10px] text-slate-400 font-medium">no WhatsApp</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Agendamentos</span>
              <div className="bg-purple-55 px-2 py-2 rounded-lg text-purple-600 bg-purple-50">
                <Calendar className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">{totalAgendamentos}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {totalConversas > 0 ? `${((totalAgendamentos / totalConversas) * 100).toFixed(0)}% de conv.` : ''}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Comparecimentos</span>
              <div className="bg-pink-55 px-2 py-2 rounded-lg text-pink-600 bg-pink-50">
                <CheckSquare className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">{totalComparecimentos}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {totalAgendamentos > 0 ? `${((totalComparecimentos / totalAgendamentos) * 100).toFixed(0)}% show-rate` : ''}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Vendas</span>
              <div className="bg-emerald-55 px-2 py-2 rounded-lg text-emerald-600 bg-emerald-50">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">{totalVendas}</span>
              <span className="text-[10px] text-slate-400 font-medium">concluídas</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Receita Atribuída</span>
              <div className="bg-green-55 px-2 py-2 rounded-lg text-green-600 bg-emerald-50">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1 overflow-hidden text-ellipsis">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-850 tracking-tight">
                {formatCurrency(totalReceita)}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Conversão Funil</span>
              <div className="bg-amber-55 px-2 py-2 rounded-lg text-amber-600 bg-amber-50">
                <Percent className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">
                {taxaConversao.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Lead → Venda</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-250 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
              <div className="bg-slate-55 px-2 py-2 rounded-lg text-slate-655 bg-slate-100">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-850 tracking-tight">
                {formatCurrency(ticketMedio)}
              </span>
            </div>
          </div>

        </div>

        {/* Charts & Funnel */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Chart Leads x Vendas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 xl:col-span-2 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1">Leads x Vendas (Últimos 15 Dias)</h3>
            <p className="text-xs text-slate-400 mb-4">Volume diário de novos contatos vs. fechamentos.</p>
            <div className="h-72 w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Area type="monotone" name="Leads Criados" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                    <Area type="monotone" name="Vendas" dataKey="vendas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVendas)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 text-xs">
                  Carregando gráfico...
                </div>
              )}
            </div>
          </div>

          {/* Revenue By Origin */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1">Receita por Origem</h3>
            <p className="text-xs text-slate-400 mb-4">Divisão de faturamento atribuído por canal.</p>
            
            <div className="flex-1 flex flex-col justify-center gap-4">
              <div className="h-44 w-full relative">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={origensData.filter(d => d.receita > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="receita"
                      >
                        {origensData.filter(d => d.receita > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => formatCurrency(Number(value) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 text-xs">
                    Carregando dados...
                  </div>
                )}
                {totalReceita > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total</span>
                    <span className="text-base font-extrabold text-slate-800">{formatCurrency(totalReceita)}</span>
                  </div>
                )}
              </div>

              {/* Table list format for origins */}
              <div className="space-y-2.5">
                {origensData.map((orig, index) => {
                  const pct = totalReceita > 0 ? (orig.receita / totalReceita) * 100 : 0;
                  return (
                    <div key={orig.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-slate-700">{orig.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{orig.leads} leads</span>
                          <span className="text-slate-800 font-bold">{formatCurrency(orig.receita)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${pct}%`, 
                            backgroundColor: COLORS[index % COLORS.length] 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

        {/* Funnel Conversions summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1">Taxas de Conversão do Funil</h3>
          <p className="text-xs text-slate-400 mb-6">Visualização do fluxo comercial de leads ativos no período.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            
            {/* 1. Lead */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative group">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">1. Leads</span>
              <span className="text-2xl font-black text-slate-850 mt-2">{totalLeads}</span>
              <span className="text-[10px] text-slate-400 mt-1 block">100% (Topo do funil)</span>
            </div>

            {/* Arrow/Bridge */}
            <div className="hidden md:flex items-center justify-center text-slate-300 pointer-events-none self-center">
              <div className="flex flex-col items-center gap-0.5">
                <ArrowRight className="h-5 w-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-655">
                  {totalLeads > 0 ? `${((totalConversas / totalLeads) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 2. Conversa */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">2. Conversas</span>
              <span className="text-2xl font-black text-slate-850 mt-2">{totalConversas}</span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {totalLeads > 0 ? `${((totalConversas / totalLeads) * 100).toFixed(1)}% do total` : '0%'}
              </span>
            </div>

            {/* Arrow/Bridge */}
            <div className="hidden md:flex items-center justify-center text-slate-300 pointer-events-none self-center">
              <div className="flex flex-col items-center gap-0.5">
                <ArrowRight className="h-5 w-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-655">
                  {totalConversas > 0 ? `${((totalAgendamentos / totalConversas) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 3. Agendamento */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">3. Agendamentos</span>
              <span className="text-2xl font-black text-slate-850 mt-2">{totalAgendamentos}</span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {totalLeads > 0 ? `${((totalAgendamentos / totalLeads) * 100).toFixed(1)}% do total` : '0%'}
              </span>
            </div>

            {/* Arrow/Bridge */}
            <div className="hidden md:flex items-center justify-center text-slate-300 pointer-events-none self-center">
              <div className="flex flex-col items-center gap-0.5">
                <ArrowRight className="h-5 w-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-655">
                  {totalAgendamentos > 0 ? `${((totalComparecimentos / totalAgendamentos) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 4. Comparecimento */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">4. Compareceu</span>
              <span className="text-2xl font-black text-slate-850 mt-2">{totalComparecimentos}</span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {totalLeads > 0 ? `${((totalComparecimentos / totalLeads) * 100).toFixed(1)}% do total` : '0%'}
              </span>
            </div>

            {/* Arrow/Bridge */}
            <div className="hidden md:flex items-center justify-center text-slate-300 pointer-events-none self-center">
              <div className="flex flex-col items-center gap-0.5">
                <ArrowRight className="h-5 w-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-655">
                  {totalComparecimentos > 0 ? `${((totalVendas / totalComparecimentos) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 5. Vendas */}
            <div className="bg-emerald-50 border border-emerald-250 rounded-xl p-4 flex flex-col items-center justify-center text-center relative">
              <span className="text-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                5. Vendas
              </span>
              <span className="text-2xl font-black text-emerald-800 mt-2">{totalVendas}</span>
              <span className="text-[10px] text-emerald-600 mt-1 block font-semibold">
                {totalLeads > 0 ? `${taxaConversao.toFixed(1)}% total (ROI)` : '0%'}
              </span>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
