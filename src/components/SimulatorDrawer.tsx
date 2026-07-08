'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Play, Globe, Sparkles, MessageSquare, Phone, User, Link2 } from 'lucide-react';
import { Source } from '@/types';

interface SimulatorDrawerProps {
  open: boolean;
  onClose: () => void;
}

const randomNames = [
  'Gabriel Neves', 'Beatriz Castilho', 'Rafaela Albuquerque', 'Daniel Viana', 
  'Isabela Diniz', 'Thiago Meireles', 'Heloisa Fontes', 'Leandro Barbosa',
  'Juliana Rezende', 'Matheus Faria', 'Larissa Peixoto', 'Andre Lourenço'
];

const randomPhones = [
  '(31) 98765-1122', '(31) 99123-8877', '(11) 98833-4455', '(21) 99182-3344',
  '(31) 97531-2468', '(11) 99444-5566', '(21) 96543-2109', '(31) 98321-0987'
];

export default function SimulatorDrawer({ open, onClose }: SimulatorDrawerProps) {
  const { currentCompany, trackingLinks, simulateTrackingJourney } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<Source>('Google Ads');
  const [campaign, setCampaign] = useState('Polissonografia');
  const [term, setTerm] = useState('clínica do sono bh');
  const [landingPage, setLandingPage] = useState('/polissonografia');
  const [initialMessage, setInitialMessage] = useState('Olá! Gostaria de saber mais sobre os exames.');
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

  // Filtra links da empresa ativa
  const companyLinks = trackingLinks.filter(link => link.companyId === currentCompany.id);

  // Preenche dados iniciais aleatórios ao abrir
  useEffect(() => {
    if (open) {
      const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
      const randomPhone = randomPhones[Math.floor(Math.random() * randomPhones.length)];

      // Defer state updates to avoid synchronous setState within effect
      setTimeout(() => {
        setName(randomName);
        setPhone(randomPhone);
        setSelectedLinkId('');

        // Ajusta valores padrão baseados no segmento da empresa ativa
        if (currentCompany.id === 'sono') {
          setCampaign('Polissonografia');
          setTerm('clínica do sono bh');
          setLandingPage('/polissonografia');
          setInitialMessage('Olá, gostaria de informações sobre o exame de polissonografia.');
        } else if (currentCompany.id === 'gs-terapias') {
          setCampaign('Quiropraxia');
          setTerm('quiropraxia dor lombar sp');
          setLandingPage('/quiropraxia');
          setInitialMessage('Olá, gostaria de agendar uma consulta de quiropraxia.');
        } else {
          setCampaign('Conserto Geladeira');
          setTerm('técnico de geladeira rj');
          setLandingPage('/conserto-geladeira');
          setInitialMessage('Olá, preciso de um orçamento urgente para conserto de geladeira.');
        }
      }, 0);
    }
  }, [open, currentCompany]);

  // Se o usuário seleciona um link rastreável, preenche os campos automaticamente
  const handleLinkChange = (linkId: string) => {
    setSelectedLinkId(linkId);
    if (!linkId) return;

    const link = companyLinks.find(l => l.id === linkId);
    if (link) {
      setInitialMessage(link.initialMessage);
      
      // Tenta mapear destino para LP
      try {
        const url = new URL(link.destinationUrl);
        setLandingPage(url.pathname);
      } catch (e) {
        setLandingPage('/');
      }

      // Preenche outros campos baseando-se no tipo do link
      if (link.name.toLowerCase().includes('google perfil')) {
        setSource('Google Perfil');
        setCampaign('Google Meu Negócio');
        setTerm('');
      } else if (link.name.toLowerCase().includes('instagram')) {
        setSource('Instagram');
        setCampaign('Instagram Bio');
        setTerm('');
      } else if (link.name.toLowerCase().includes('campanha') || link.name.toLowerCase().includes('ads')) {
        setSource('Google Ads');
      } else {
        setSource('Google Orgânico');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Por favor, preencha o nome e telefone do lead fictício.');
      return;
    }

    simulateTrackingJourney({
      name,
      phone,
      source,
      campaign,
      term: source === 'Google Ads' || source === 'Google Orgânico' ? term : '',
      landingPage,
      initialMessage,
      trackingLinkId: selectedLinkId || undefined
    });

    alert(`Simulação Executada! O lead "${name}" clicou no WhatsApp vindo de "${source}" e iniciou conversa.`);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-350 ease-out">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400 fill-current" />
            <div>
              <h2 className="font-bold text-base leading-none block">Simulador de Tráfego e Rastreamento</h2>
              <span className="text-xs text-slate-400 mt-1 block">Simule acessos de marketing para {currentCompany.name}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Dados Pessoais do Lead */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5" />
              1. Lead Fictício (Simulado)
            </h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pedro de Alcântara"
                className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Telefone WhatsApp</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (31) 99999-8888"
                className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Link Rastreável Opcional */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
              <Link2 className="h-3.5 w-3.5" />
              2. Link Rastreável Utilizado (Opcional)
            </label>
            <select
              value={selectedLinkId}
              onChange={(e) => handleLinkChange(e.target.value)}
              className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              <option value="">Acesso Direto ao Site (Sem Link Rastreável)</option>
              {companyLinks.map(link => (
                <option key={link.id} value={link.id}>
                  {link.name} ({link.shortCode})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Nota: O link define a mensagem e LP de destino. A origem real (UTMs) depende da sessão simulada abaixo.
            </p>
          </div>

          {/* Dados de Tráfego / UTMs */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              3. Origem do Tráfego & Rastreamento
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Canal / Origem</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as Source)}
                  className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="Google Ads">Google Ads</option>
                  <option value="Google Orgânico">Google Orgânico</option>
                  <option value="Google Perfil">Google Perfil</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Direto">Direto (Acesso Direto)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Campanha de Marketing</label>
                <input
                  type="text"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder="Ex: Polissonografia"
                  disabled={selectedLinkId !== '' && source !== 'Google Ads'}
                  className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            {(source === 'Google Ads' || source === 'Google Orgânico') && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Termo de Busca (Palavra-chave)</label>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Ex: clinica do sono belo horizonte"
                  className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Landing Page (Página de Entrada)</label>
              <input
                type="text"
                value={landingPage}
                onChange={(e) => setLandingPage(e.target.value)}
                placeholder="Ex: /polissonografia"
                className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Conversa do WhatsApp */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              4. Primeira Mensagem do WhatsApp
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mensagem Inicial Inbound</label>
              <textarea
                rows={3}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Esta mensagem aparecerá na inbox ao criar o lead..."
                className="w-full text-sm border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>

            {source === 'Google Ads' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex items-start gap-2 leading-relaxed">
                <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Nota de Atribuição:</strong> Por vir do Google Ads, simularemos um identificador <strong>GCLID</strong> exclusivo para este lead. As conversões de agendamento ou venda geradas por ele poderão ser enviadas de volta para a campanha do Google Ads de forma simulada.
                </span>
              </div>
            )}
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold text-sm hover:bg-slate-100 active:bg-slate-150 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg font-semibold text-sm hover:bg-emerald-600 active:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-700/10"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Simular Clique & Lead
          </button>
        </div>
      </div>
    </div>
  );
}
