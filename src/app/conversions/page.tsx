'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { ConversionEvent } from '@/types';
import { 
  RefreshCw, CheckCircle2, AlertCircle, Clock, Search, 
  X, Compass, DollarSign, Send, ArrowUpRight, HelpCircle 
} from 'lucide-react';

export default function Conversiones() {
  const { currentCompany, conversions, sendConversionToAdPlatform } = useApp();
  
  const [search, setSearch] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  
  // Fake loading para sincronização
  const [syncingPlatform, setSyncingPlatform] = useState<'Google' | 'Meta' | null>(null);

  // Filtrar conversões dos leads da empresa ativa
  // Nota: o ID de conversão é gerado com leadId associado
  const companyConversions = conversions.filter(conv => 
    conv.id.includes(conv.leadId) // ou simplesmente mostra todas, pois no context o ID contêm o leadId, e na simulação o leadId foi associado à empresa
  );

  // Filtrar por busca e empresa ativa
  const filteredConversions = companyConversions.filter(conv => {
    const termMatches = conv.leadName.toLowerCase().includes(search.toLowerCase()) || 
                       conv.campaign.toLowerCase().includes(search.toLowerCase()) ||
                       conv.type.toLowerCase().includes(search.toLowerCase());
    return termMatches;
  });

  const selectedConv = companyConversions.find(c => c.id === selectedConvId);

  const getStatusBadge = (status: 'Pendente' | 'Enviado') => {
    if (status === 'Enviado') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-bold">
          <CheckCircle2 className="h-3 w-3" />
          Enviado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-[10px] font-bold">
        <Clock className="h-3 w-3" />
        Pendente (Offline)
      </span>
    );
  };

  const handleSync = (platform: 'Google' | 'Meta') => {
    if (!selectedConvId) return;
    
    setSyncingPlatform(platform);
    
    // Simula tempo de envio de API externa
    setTimeout(() => {
      sendConversionToAdPlatform(selectedConvId, platform);
      setSyncingPlatform(null);
      alert(`Conversão sincronizada com sucesso no ${platform === 'Google' ? 'Google Ads Conversões Offline' : 'Meta Conversions API'}!`);
    }, 1500);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Painel de Conversões</h1>
          <p className="text-sm text-slate-500 mt-1">
            Eventos enviados às plataformas de anúncio (Google Ads & Meta) para otimização de campanhas (Smart Bidding).
          </p>
        </div>

        {/* Explain alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-2.5 leading-relaxed">
          <HelpCircle className="h-4.5 w-4.5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <strong>Otimização de ROI:</strong> Quando um lead avança para &quot;Agendado&quot;, &quot;Compareceu&quot; ou &quot;Venda&quot;, o sistema cria um evento de conversão offline. Você pode simular o envio dos identificadores de clique (GCLID) para que as plataformas de anúncios saibam exatamente qual campanha gerou a receita.
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conversões pelo lead, campanha ou tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-slate-250 rounded-lg pl-10 pr-4 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Conversions Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Lead / Contato</th>
                  <th className="py-3 px-4">Tipo Conversão</th>
                  <th className="py-3 px-4">Data Ocorrência</th>
                  <th className="py-3 px-4">Origem UTM</th>
                  <th className="py-3 px-4">Campanha</th>
                  <th className="py-3 px-4">Identificador de Clique</th>
                  <th className="py-3 px-4 text-right">Valor Atribuído</th>
                  <th className="py-3 px-4 text-center">Status Envio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 text-xs">
                {filteredConversions.length > 0 ? (
                  filteredConversions.map((conv) => (
                    <tr 
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-5 font-bold text-slate-800">
                        {conv.leadName}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                          conv.type === 'Venda' ? 'bg-emerald-100 text-emerald-800' : (conv.type === 'Agendamento' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700')
                        }`}>
                          {conv.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-450 font-medium">
                        {formatDate(conv.timestamp)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {conv.source}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {conv.campaign}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                        {conv.gclid ? conv.gclid.substring(0, 15) + '...' : 'Sem GCLID (Orgânico)'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        R$ {conv.value || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(conv.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum evento de conversão registrado. Mova leads no funil para gerá-los.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Drawer Detalhes da Conversão */}
      {selectedConv && (
        <div className="fixed inset-0 z-45 flex justify-end overflow-hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedConvId(null)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col z-50 animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="font-extrabold text-slate-850 text-sm sm:text-base leading-tight">Conversão: {selectedConv.type}</h2>
                  <span className="text-[10px] text-slate-400 block mt-1">ID: {selectedConv.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedConvId(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-655"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Informações Gerais */}
              <div className="space-y-3 text-xs">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Dados do Evento</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Contato do Lead</span>
                    <span className="font-bold text-slate-800 block">{selectedConv.leadName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Tipo do Evento</span>
                    <span className="font-bold text-slate-800 block uppercase">{selectedConv.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Data Registrada</span>
                    <span className="font-medium text-slate-700 block">{formatDate(selectedConv.timestamp)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Valor Atribuído</span>
                    <span className="font-bold text-emerald-600 block">R$ {selectedConv.value || 0}</span>
                  </div>
                </div>
              </div>

              {/* Rastreamento do Clique */}
              <div className="space-y-3 text-xs">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Atribuição de Tráfego</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Origem (Source)</span>
                    <span className="font-bold text-slate-800 block">{selectedConv.source}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Campanha (Campaign)</span>
                    <span className="font-bold text-slate-850 block">{selectedConv.campaign}</span>
                  </div>
                  {selectedConv.term && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block mb-0.5">Termo pesquisado (Keyword)</span>
                      <span className="font-bold text-slate-800 block bg-slate-50 border border-slate-200 px-2 py-1 rounded w-fit">{selectedConv.term}</span>
                    </div>
                  )}
                  {selectedConv.gclid && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block mb-0.5">Identificador Google Click (GCLID)</span>
                      <span className="font-mono text-[10px] text-amber-800 bg-amber-50 border border-amber-150 px-2.5 py-1.5 rounded block select-all">
                        {selectedConv.gclid}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload e Sincronização offline */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sincronização Offline API</h3>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Status de Integração:</span>
                    <span className="font-bold text-slate-700">
                      {selectedConv.status === 'Enviado' ? 'Integrado & Sincronizado' : 'Pendente de Upload'}
                    </span>
                  </div>

                  {selectedConv.status === 'Pendente' ? (
                    <div className="space-y-2">
                      {selectedConv.source === 'Google Ads' && (
                        <button
                          type="button"
                          disabled={syncingPlatform !== null}
                          onClick={() => handleSync('Google')}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {syncingPlatform === 'Google' ? 'Sincronizando com Google...' : 'Enviar para Google Ads (Offline)'}
                        </button>
                      )}
                      
                      <button
                        type="button"
                        disabled={syncingPlatform !== null}
                        onClick={() => handleSync('Meta')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {syncingPlatform === 'Meta' ? 'Sincronizando com Meta...' : 'Enviar para Meta CAPI (Offline)'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-lg text-emerald-800 text-xs flex gap-2 items-start leading-relaxed">
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-655" />
                      <span>
                        Este evento foi enviado com sucesso via API Offline às plataformas de anúncios e não precisa de re-envio.
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedConvId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-100"
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
