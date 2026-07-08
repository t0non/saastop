'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { TrackingLink, Source } from '@/types';
import { 
  Link2, Plus, Search, ExternalLink, Copy, Check, BarChart3, 
  Users, Calendar, ShieldCheck, DollarSign, X, HelpCircle 
} from 'lucide-react';

export default function TrackingLinks() {
  const { currentCompany, trackingLinks, createTrackingLink, leads } = useApp();
  
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form de criação
  const [newName, setNewName] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [newChannel, setNewChannel] = useState('Landing Page');
  
  // Drawer de Detalhes
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Filtrar links da empresa ativa
  const companyLinks = trackingLinks.filter(l => l.companyId === currentCompany.id);
  const companyLeads = leads.filter(l => l.companyId === currentCompany.id);

  // Helper para calcular métricas por link baseando-se na mensagem inicial
  const getLinkStats = (link: TrackingLink) => {
    const matchedLeads = companyLeads.filter(lead => {
      if (!lead.initialMessage) return false;
      const msg = lead.initialMessage.toLowerCase();
      const linkMsg = link.initialMessage.toLowerCase();
      
      // Regras de correspondência flexíveis por mensagem e ID
      const linkMsgNormalized = linkMsg.replace('olá, ', '').replace('olá!', '').trim();
      
      return msg.includes(linkMsgNormalized) || 
             linkMsgNormalized.includes(msg) ||
             (link.id === 'link-1' && msg.includes('polissonografia')) ||
             (link.id === 'link-2' && (msg.includes('endereço') || msg.includes('dúvida') || msg.includes('maps'))) ||
             (link.id === 'link-3' && (msg.includes('instagram') || msg.includes('insta') || msg.includes('horários')));
    });

    const leadsCount = matchedLeads.length;
    const agendamentosCount = matchedLeads.filter(l => l.history.some(h => ['Agendado', 'Compareceu', 'Venda'].includes(h.stageName))).length;
    const vendasCount = matchedLeads.filter(l => l.stage === 'Venda').length;
    const revenue = matchedLeads.filter(l => l.stage === 'Venda').reduce((sum, l) => sum + (l.revenue || 0), 0);
    const clickToLeadRate = link.clicks > 0 ? (leadsCount / link.clicks) * 100 : 0;

    return {
      leadsCount,
      agendamentosCount,
      vendasCount,
      revenue,
      clickToLeadRate,
      leadsList: matchedLeads
    };
  };

  const filteredLinks = companyLinks.filter(link => 
    link.name.toLowerCase().includes(search.toLowerCase()) || 
    link.usageChannel.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(`https://go.topcrm.app/${code}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDest || !newWhatsapp || !newMsg) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const shortCode = `r/${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    createTrackingLink({
      name: newName,
      destinationUrl: newDest,
      whatsappNumber: newWhatsapp,
      initialMessage: newMsg,
      usageChannel: newChannel,
      status: 'active',
      companyId: currentCompany.id,
      shortCode
    });

    // Reset form
    setNewName('');
    setNewDest('');
    setNewWhatsapp(currentCompany.whatsapp);
    setNewMsg('');
    setNewChannel('Landing Page');
    setModalOpen(false);
    
    alert('Link Rastreável criado com sucesso!');
  };

  const selectedLink = companyLinks.find(l => l.id === selectedLinkId);
  const selectedLinkStats = selectedLink ? getLinkStats(selectedLink) : null;

  // Distribuição por Origem no detalhe do Link
  const getOriginDistribution = () => {
    if (!selectedLinkStats) return [];
    
    const dist: Record<Source, number> = {
      'Google Ads': 0,
      'Google Orgânico': 0,
      'Google Perfil': 0,
      'Instagram': 0,
      'Direto': 0
    };

    selectedLinkStats.leadsList.forEach(lead => {
      const src = lead.trackingSession?.source || 'Direto';
      if (dist[src] !== undefined) {
        dist[src] += 1;
      } else {
        dist['Direto'] += 1;
      }
    });

    return Object.entries(dist).map(([name, value]) => ({
      name: name as Source,
      value
    })).filter(d => d.value > 0);
  };

  const originDist = getOriginDistribution();

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Title / Action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Links Rastreáveis</h1>
            <p className="text-sm text-slate-500 mt-1">
              Links com parâmetros inteligentes para direcionamento e contabilização automática de cliques e conversões.
            </p>
          </div>
          <button
            onClick={() => {
              setNewWhatsapp(currentCompany.whatsapp);
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 self-start sm:self-center"
          >
            <Plus className="h-4.5 w-4.5" />
            Novo Link Rastreável
          </button>
        </div>

        {/* Info alert about link mechanism */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-2.5 leading-relaxed">
          <HelpCircle className="h-4.5 w-4.5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <strong>Como funciona o rastreamento?</strong> O link rastreável é agnóstico à origem de tráfego. Ele apenas redireciona o cliente para o WhatsApp com uma mensagem predefinida. A atribuição final (se é Google Ads, Google Orgânico, etc.) é determinada pelos dados da sessão da landing page (UTMs, identificadores de clique como GCLID) detectados quando o lead acessa o site.
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar link pelo nome ou canal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-slate-250 rounded-lg pl-10 pr-4 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Links Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-450 uppercase tracking-wider">
                  <th className="py-3 px-5">Nome do Link</th>
                  <th className="py-3 px-4">Canal / Uso</th>
                  <th className="py-3 px-4">URL Rastreável</th>
                  <th className="py-3 px-4 text-center">Cliques</th>
                  <th className="py-3 px-4 text-center">Leads</th>
                  <th className="py-3 px-4 text-center">Agendados</th>
                  <th className="py-3 px-4 text-center">Vendas</th>
                  <th className="py-3 px-4 text-right">Receita</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 text-xs">
                {filteredLinks.length > 0 ? (
                  filteredLinks.map((link) => {
                    const stats = getLinkStats(link);
                    return (
                      <tr 
                        key={link.id}
                        onClick={() => setSelectedLinkId(link.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-slate-800 leading-tight">{link.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{link.destinationUrl}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-655">
                          {link.usageChannel}
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-fit group">
                            <span>https://go.topcrm.app/{link.shortCode}</span>
                            <button
                              onClick={() => handleCopy(link.shortCode, link.id)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {copiedId === link.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3 group-hover:scale-105" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-800">
                          {link.clicks}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{stats.leadsCount}</span>
                            <span className="text-[9px] text-slate-400">Rate: {stats.clickToLeadRate.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-semibold text-slate-700">
                          {stats.agendamentosCount}
                        </td>
                        <td className="py-4 px-4 text-center font-semibold text-slate-700">
                          {stats.vendasCount}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-emerald-600">
                          R$ {stats.revenue}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block h-2 w-2 rounded-full ${
                            link.status === 'active' ? 'bg-emerald-500' : 'bg-slate-350'
                          }`} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Nenhum link rastreável cadastrado nesta empresa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal - Criar Novo Link */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="font-extrabold text-base">Novo Link Rastreável</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome Identificador</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campanha Facebook | Quiropraxia"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Destino do Botão (LP/Site)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: https://site.com/polissonografia"
                    value={newDest}
                    onChange={(e) => setNewDest(e.target.value)}
                    className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">WhatsApp Recebedor</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: +5531988887777"
                    value={newWhatsapp}
                    onChange={(e) => setNewWhatsapp(e.target.value)}
                    className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Canal de Uso</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500 bg-white"
                >
                  <option value="Landing Page">Landing Page / Botão Flutuante</option>
                  <option value="Instagram Bio">Instagram Bio</option>
                  <option value="Google Meu Negócio">Google Meu Negócio</option>
                  <option value="Facebook Ads">Facebook Ads</option>
                  <option value="E-mail Marketing">E-mail Marketing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mensagem Inicial do WhatsApp (Inbound)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mensagem padrão enviada pelo lead ao abrir o chat..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 text-[11px] text-slate-500 leading-normal">
                <strong>Simulador de Link Curto:</strong> Ao salvar, o sistema gerará uma URL curta correspondente a <code>https://go.topcrm.app/r/XXXXX</code> para simular a captação de acessos.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-350 rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-md transition-all"
                >
                  Salvar Link Rastreável
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer - Detalhes do Link */}
      {selectedLink && selectedLinkStats && (
        <div className="fixed inset-0 z-45 flex justify-end overflow-hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedLinkId(null)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col z-50 animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Link2 className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="font-extrabold text-slate-850 text-sm sm:text-base leading-tight">{selectedLink.name}</h2>
                  <span className="text-[10px] text-slate-450 block mt-1 font-mono">https://go.topcrm.app/{selectedLink.shortCode}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLinkId(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-655"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Grid de Cards de Estatísticas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Cliques Únicos</span>
                  <span className="text-xl font-black text-slate-800 mt-1 block">{selectedLink.clicks}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Leads Criados</span>
                  <span className="text-xl font-black text-slate-850 mt-1 block">{selectedLinkStats.leadsCount}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">({selectedLinkStats.clickToLeadRate.toFixed(1)}% conv.)</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Agendamentos</span>
                  <span className="text-xl font-black text-slate-850 mt-1 block">{selectedLinkStats.agendamentosCount}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center bg-emerald-50/50 border-emerald-150">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">Vendas Concluídas</span>
                  <span className="text-xl font-black text-emerald-850 mt-1 block">{selectedLinkStats.vendasCount}</span>
                  <span className="text-[9px] text-emerald-600 block mt-0.5">R$ {selectedLinkStats.revenue}</span>
                </div>
              </div>

              {/* Canal e Mensagem */}
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">WhatsApp de Destino</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedLink.whatsappNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">URL de Destino Original</span>
                  <span className="font-semibold text-slate-700 block mt-0.5 select-all truncate bg-slate-50 p-2 rounded border border-slate-200">{selectedLink.destinationUrl}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mensagem Inicial do Lead</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 italic text-slate-655 mt-1">
                    &quot;{selectedLink.initialMessage}&quot;
                  </div>
                </div>
              </div>

              {/* Distribuição por Origem Real */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Distribuição por Origem Real</h4>
                  <span className="text-[10px] text-slate-400 italic">via sessões UTM</span>
                </div>
                
                {originDist.length > 0 ? (
                  <div className="space-y-2.5">
                    {originDist.map((item) => {
                      const total = selectedLinkStats.leadsCount;
                      const pct = total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <div key={item.name} className="space-y-1 text-xs">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-700">{item.name}</span>
                            <span className="text-slate-800 font-bold">{item.value} leads ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhum lead associado a este link para exibir a distribuição de origens.</p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLinkId(null)}
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
