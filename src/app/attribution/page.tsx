'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { Lead, Source } from '@/types';
import { 
  Share2, ShieldCheck, AlertCircle, Compass, Target, HelpCircle, 
  Search, ArrowRight, Info, CheckCircle2, Link2, ExternalLink
} from 'lucide-react';

export default function Attribution() {
  const { currentCompany, leads, selectedPeriod } = useApp();
  const [search, setSearch] = useState('');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('all');

  // Filtrar leads por empresa e período
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

    // Filtro por Confiança
    if (selectedConfidence !== 'all') {
      result = result.filter(lead => {
        const isPaid = lead.trackingSession?.source === 'Google Ads';
        const hasSession = !!lead.trackingSession;
        const confidence = lead.trackingSession?.gclid ? 'Confirmada' : (hasSession ? 'Inferida' : 'Desconhecida');
        return confidence === selectedConfidence;
      });
    }

    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(lead => lead.name.toLowerCase().includes(q));
    }

    return result;
  };

  const filteredLeads = getFilteredLeads();

  // Helper para explicar a regra de atribuição visualmente
  const getAttributionExplanation = (lead: Lead) => {
    const session = lead.trackingSession;
    if (!session) {
      return {
        rule: 'Tráfego Direto / Desconhecido',
        desc: 'O lead entrou diretamente digitando a URL ou o histórico de navegação foi bloqueado / limpo pelo navegador.',
        confidence: 'Desconhecida',
        confidenceColor: 'text-slate-400 bg-slate-100 border-slate-200'
      };
    }

    if (session.gclid) {
      return {
        rule: 'Google Ads (Mídia Paga)',
        desc: `Atribuído ao Google Ads devido à detecção do identificador de clique exclusivo (GCLID) na URL da Landing Page: "${session.gclid}".`,
        confidence: 'Confirmada',
        confidenceColor: 'text-emerald-700 bg-emerald-50 border-emerald-100'
      };
    }

    if (session.source === 'Google Orgânico') {
      return {
        rule: 'Google Orgânico (Busca)',
        desc: `Atribuído ao canal Orgânico. O referrer HTTP contém "google" (${session.referrer}) e nenhum parâmetro pago de URL (GCLID) foi detectado.`,
        confidence: 'Inferida',
        confidenceColor: 'text-blue-700 bg-blue-50 border-blue-100'
      };
    }

    if (session.source === 'Google Perfil') {
      return {
        rule: 'Google Perfil (Meu Negócio)',
        desc: `Atribuído ao Google Perfil da Empresa (Maps). O referrer HTTP contém "maps.google.com" ou o lead utilizou o link curto exclusivo mapeado de mapas.`,
        confidence: 'Confirmada pela plataforma',
        confidenceColor: 'text-purple-700 bg-purple-50 border-purple-100'
      };
    }

    if (session.source === 'Instagram') {
      return {
        rule: 'Instagram (Rede Social)',
        desc: `Atribuído ao Instagram. O referrer HTTP contém "l.instagram.com" ou o lead utilizou o link da bio rastreável da página de links.`,
        confidence: 'Confirmada',
        confidenceColor: 'text-pink-700 bg-pink-50 border-pink-100'
      };
    }

    return {
      rule: `${session.source} (${session.medium})`,
      desc: `Identificado pelo referrer HTTP "${session.referrer}" ou parâmetros UTM explícitos (Source: ${session.utmSource || 'não definido'}, Medium: ${session.utmMedium || 'não definido'}).`,
      confidence: 'Inferida',
      confidenceColor: 'text-amber-700 bg-amber-50 border-amber-100'
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Regras de Atribuição e Origens</h1>
          <p className="text-sm text-slate-500 mt-1">
            Entenda como cada lead foi mapeado e qual o modelo e nível de confiança do rastreio de clique.
          </p>
        </div>

        {/* Explain info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-2.5 leading-relaxed">
          <HelpCircle className="h-4.5 w-4.5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <strong>Modelos de Atribuição Multi-toque:</strong>
            <ul className="list-disc pl-4 mt-1.5 space-y-1">
              <li><strong>Primeiro Toque (First Touch)</strong>: Credita o canal que trouxe o cliente ao site pela primeira vez (Descoberta).</li>
              <li><strong>Criação do Lead (Lead Touch)</strong>: Credita o canal do clique que gerou o início da conversa no WhatsApp.</li>
              <li><strong>Último Toque (Last Touch)</strong>: Credita o clique mais recente antes da conversão comercial (Venda).</li>
              <li><strong>Atribuição do Sistema (MTR)</strong>: Credita canais pagos (PPC) com maior relevância de fechamento se ocorridos na janela de conversão.</li>
            </ul>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar leads para analisar atribuição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-slate-250 rounded-lg pl-10 pr-4 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>
          
          <select
            value={selectedConfidence}
            onChange={(e) => setSelectedConfidence(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-lg px-3 py-2 outline-none cursor-pointer text-slate-700 font-semibold"
          >
            <option value="all">Todas as Confianças</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Confirmada pela plataforma">Confirmada pela Plataforma</option>
            <option value="Inferida">Inferida</option>
            <option value="Desconhecida">Desconhecida</option>
          </select>
        </div>

        {/* Attribution Cards List */}
        <div className="space-y-4">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => {
              const session = lead.trackingSession;
              const isPaid = session?.source === 'Google Ads';
              
              // Multi-touch model mapping
              const firstTouch = isPaid ? 'Google Orgânico' : (session?.source || 'Direto');
              const leadTouch = session?.source || 'Direto';
              const lastTouch = session?.source || 'Direto';
              const conversionTouch = lead.stage === 'Venda' ? (session?.source || 'Direto') : '--';

              const details = getAttributionExplanation(lead);

              return (
                <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4 transition-all hover:shadow-md">
                  
                  {/* Lead Info Line */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-slate-800 text-sm sm:text-base">{lead.name}</span>
                      <span className="text-xs text-slate-400 font-medium">({lead.phone})</span>
                    </div>
                    
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${details.confidenceColor}`}>
                      Confiança: {details.confidence}
                    </span>
                  </div>

                  {/* Multi-touch attribution steps comparison */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                    
                    {/* First Touch */}
                    <div className="text-xs space-y-1">
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">1. Primeiro Toque</span>
                      <span className="font-bold text-slate-800 block text-sm">{firstTouch}</span>
                      <span className="text-[10px] text-slate-400 block">Primeiro acesso detectado</span>
                    </div>

                    {/* Lead Creation */}
                    <div className="text-xs space-y-1 border-l border-slate-200 pl-4">
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">2. Criação do Lead</span>
                      <span className="font-bold text-slate-800 block text-sm">{leadTouch}</span>
                      <span className="text-[10px] text-slate-400 block">Conversa iniciada</span>
                    </div>

                    {/* Last Touch */}
                    <div className="text-xs space-y-1 border-l border-slate-200 pl-4">
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">3. Último Toque</span>
                      <span className="font-bold text-slate-800 block text-sm">{lastTouch}</span>
                      <span className="text-[10px] text-slate-400 block">Último clique registrado</span>
                    </div>

                    {/* Conversion Touch */}
                    <div className="text-xs space-y-1 border-l border-slate-200 pl-4">
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">4. Conversão (Venda)</span>
                      <span className={`font-bold block text-sm ${lead.stage === 'Venda' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {conversionTouch}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {lead.stage === 'Venda' ? `Receita de R$ ${lead.revenue}` : 'Ainda não converteu'}
                      </span>
                    </div>

                  </div>

                  {/* Why this attribution (visual logic explanation) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-xs leading-relaxed">
                    <Info className="h-4.5 w-4.5 text-slate-450 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 block mb-0.5">Explicação Lógica da Origem</span>
                      <span className="text-slate-500 block mb-1.5">{details.desc}</span>
                      
                      {session && (
                        <div className="flex flex-wrap gap-2.5 mt-2.5 pt-2.5 border-t border-slate-100 text-[10px] font-semibold text-slate-500">
                          <span>Referrer: <code className="bg-slate-100 px-1 rounded font-normal text-slate-700">{session.referrer || 'direto'}</code></span>
                          <span>Landing Page: <code className="bg-slate-100 px-1 rounded font-normal text-slate-700">{session.landingPage}</code></span>
                          {session.utmCampaign && (
                            <span>Campaign: <code className="bg-slate-100 px-1 rounded font-normal text-slate-700">{session.utmCampaign}</code></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              Nenhum lead com os critérios de atribuição selecionados.
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
