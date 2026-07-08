'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, Lead, Conversation, TrackingLink, AutomationRule, ConversionEvent, LeadStatus, Source, Medium, Message, StageHistory, ConversionType } from '../types';
import { defaultStages } from '../utils/mockData';

const defaultCompanies: Company[] = [
  {
    id: 'empresa-1',
    name: 'Minha Empresa',
    segment: 'Geral',
    phone: '',
    whatsapp: '',
    site: '',
    averageTicket: 500,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    integrations: {
      whatsappConnected: false,
      googleAdsConnected: false,
      metaConnected: false
    },
    sourcesConfig: {
      googleAds: true,
      googleOrganico: true,
      googlePerfil: true,
      instagram: true,
      facebook: true
    }
  }
];

interface AppContextProps {
  companies: Company[];
  selectedCompanyId: string;
  selectedPeriod: string; // '7' | '30' | '90' | 'all'
  currentCompany: Company;
  leads: Lead[];
  conversations: Conversation[];
  trackingLinks: TrackingLink[];
  automationRules: AutomationRule[];
  conversions: ConversionEvent[];
  setSelectedCompanyId: (id: string) => void;
  setSelectedPeriod: (period: string) => void;
  createLead: (lead: Lead) => void;
  moveLead: (leadId: string, stage: LeadStatus, source: 'manual' | 'automation' | 'system', reason?: string, ruleName?: string, agentName?: string, revenue?: number) => void;
  sendMessage: (leadId: string, text: string, direction: 'inbound' | 'outbound') => void;
  createTrackingLink: (link: Omit<TrackingLink, 'id' | 'clicks'>) => void;
  simulateTrackingJourney: (params: {
    name: string;
    phone: string;
    source: Source;
    campaign: string;
    term: string;
    landingPage: string;
    initialMessage: string;
    trackingLinkId?: string;
  }) => void;
  updateCompanySettings: (settings: Partial<Company>) => void;
  updateAutomationRuleStatus: (ruleId: string, status: 'active' | 'inactive') => void;
  createAutomationRule: (rule: Omit<AutomationRule, 'id'>) => void;
  sendConversionToAdPlatform: (conversionId: string, platform: 'Google' | 'Meta') => void;
  restoreDemoData: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('empresa-1');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  
  // States loaded from localStorage or initialized with defaults
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [conversions, setConversions] = useState<ConversionEvent[]>([]);

  // Carregar dados iniciais no cliente
  useEffect(() => {
    // Detectar e expurgar dados mock antigos para evitar conflitos
    const localCompanies = localStorage.getItem('top_companies');
    const hasMockData = localCompanies && (localCompanies.includes('sono') || localCompanies.includes('gs-terapias'));
    
    if (hasMockData) {
      localStorage.removeItem('top_companies');
      localStorage.removeItem('top_leads');
      localStorage.removeItem('top_conversations');
      localStorage.removeItem('top_links');
      localStorage.removeItem('top_rules');
      localStorage.removeItem('top_conversions');
    }

    const updatedCompanies = localStorage.getItem('top_companies');
    const localLeads = localStorage.getItem('top_leads');
    const localConversations = localStorage.getItem('top_conversations');
    const localLinks = localStorage.getItem('top_links');
    const localRules = localStorage.getItem('top_rules');
    const localConversions = localStorage.getItem('top_conversions');

    let loadedCompanies = defaultCompanies;
    if (updatedCompanies) {
      try { loadedCompanies = JSON.parse(updatedCompanies); } catch (e) {}
    } else {
      localStorage.setItem('top_companies', JSON.stringify(defaultCompanies));
    }
    setCompanies(loadedCompanies);

    let loadedLeads: Lead[] = [];
    if (localLeads) {
      try { loadedLeads = JSON.parse(localLeads); } catch (e) {}
    } else {
      localStorage.setItem('top_leads', JSON.stringify([]));
    }
    setLeads(loadedLeads);

    let loadedConversations: Conversation[] = [];
    if (localConversations) {
      try { loadedConversations = JSON.parse(localConversations); } catch (e) {}
    } else {
      localStorage.setItem('top_conversations', JSON.stringify([]));
    }
    setConversations(loadedConversations);

    let loadedLinks: TrackingLink[] = [];
    if (localLinks) {
      try { loadedLinks = JSON.parse(localLinks); } catch (e) {}
    } else {
      localStorage.setItem('top_links', JSON.stringify([]));
    }
    setTrackingLinks(loadedLinks);

    let loadedRules: AutomationRule[] = [];
    if (localRules) {
      try { loadedRules = JSON.parse(localRules); } catch (e) {}
    } else {
      localStorage.setItem('top_rules', JSON.stringify([]));
    }
    setAutomationRules(loadedRules);

    let loadedConversions: ConversionEvent[] = [];
    if (localConversions) {
      try { loadedConversions = JSON.parse(localConversions); } catch (e) {}
    } else {
      localStorage.setItem('top_conversions', JSON.stringify([]));
    }
    setConversions(loadedConversions);
  }, []);

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || defaultCompanies[0];

  // Helper para salvar estado no localStorage
  function saveState<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  const createLead = (newLead: Lead) => {
    const updated = [newLead, ...leads];
    setLeads(updated);
    saveState('top_leads', updated);
  };

  // Movimentar lead no funil
  const moveLead = (
    leadId: string,
    targetStage: LeadStatus,
    source: 'manual' | 'automation' | 'system',
    reason?: string,
    ruleName?: string,
    agentName?: string,
    revenue?: number
  ) => {
    const now = new Date().toISOString();
    let computedRevenue = revenue;
    
    const updatedLeads = leads.map(lead => {
      if (lead.id === leadId) {
        const prevStage = lead.stage;
        if (prevStage === targetStage) return lead; // Sem alteração

        // Histórico
        const newHist: StageHistory = {
          id: `hist-${Math.random().toString(36).substr(2, 9)}`,
          stageName: targetStage,
          movedAt: now,
          reason: reason || `Mapeado de ${prevStage} para ${targetStage}`,
          source,
          ruleName,
          agentName: agentName || (source === 'manual' ? 'Operador' : undefined)
        };

        if (targetStage === 'Venda') {
          // Se for venda, aplica o valor de receita informado ou o valor de estimativa
          computedRevenue = revenue !== undefined ? revenue : (lead.value || currentCompany.averageTicket);
        }

        return {
          ...lead,
          stage: targetStage,
          revenue: targetStage === 'Venda' ? (computedRevenue || lead.revenue || currentCompany.averageTicket) : lead.revenue,
          value: targetStage === 'Venda' ? (computedRevenue || lead.value || currentCompany.averageTicket) : lead.value,
          history: [...lead.history, newHist],
          temperature: targetStage === 'Venda' ? 'Quente' as const : (targetStage === 'Perdido' ? 'Frio' as const : lead.temperature)
        };
      }
      return lead;
    });

    setLeads(updatedLeads);
    saveState('top_leads', updatedLeads);

    // Gerar evento de conversão se a etapa de destino for marcada como conversão
    const stageConfig = defaultStages.find(s => s.id === targetStage);
    if (stageConfig && stageConfig.isConversion && stageConfig.conversionType) {
      const type = stageConfig.conversionType;
      const targetLead = updatedLeads.find(l => l.id === leadId);
      
      if (targetLead) {
        // Criar novo evento de conversão
        const isVenda = type === 'Venda';
        const isAgendamento = type === 'Agendamento';
        const val = isVenda ? (targetLead.revenue || currentCompany.averageTicket) : (isAgendamento ? 150 : 0);

        const newConversion: ConversionEvent = {
          id: `conv-${leadId}-${type}-${Math.random().toString(36).substr(2, 4)}`,
          leadId,
          leadName: targetLead.name,
          type,
          timestamp: now,
          source: targetLead.trackingSession?.source || 'Direto',
          campaign: targetLead.trackingSession?.campaign || 'Sem Campanha',
          term: targetLead.trackingSession?.term,
          value: val,
          gclid: targetLead.trackingSession?.gclid,
          status: 'Pendente'
        };

        const updatedConversions = [newConversion, ...conversions];
        setConversions(updatedConversions);
        saveState('top_conversions', updatedConversions);
      }
    }
  };

  // Enviar ou receber mensagens no chat
  const sendMessage = (leadId: string, text: string, direction: 'inbound' | 'outbound') => {
    const now = new Date().toISOString();
    const newMessage: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      text,
      direction,
      timestamp: now
    };

    const updatedConversations = conversations.map(conv => {
      if (conv.leadId === leadId) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          unreadCount: direction === 'inbound' ? conv.unreadCount + 1 : 0
        };
      }
      return conv;
    });

    // Se a conversa não existir para o lead, cria ela
    const exists = conversations.some(c => c.leadId === leadId);
    let finalConversations = updatedConversations;
    if (!exists) {
      const newConv: Conversation = {
        leadId,
        messages: [newMessage],
        unreadCount: direction === 'inbound' ? 1 : 0
      };
      finalConversations = [newConv, ...conversations];
    }

    setConversations(finalConversations);
    saveState('top_conversations', finalConversations);

    // Processar regras de automação
    // Buscamos apenas as regras ativas associadas à empresa selecionada
    const activeRules = automationRules.filter(
      r => r.status === 'active' && r.companyId === selectedCompanyId
    );

    const textLower = text.toLowerCase();
    const eventType = direction === 'inbound' ? 'message_received' : 'message_sent';

    const matchingRule = activeRules.find(
      rule => rule.event === eventType && textLower.includes(rule.contains.toLowerCase())
    );

    if (matchingRule) {
      // Achou uma regra correspondente! Dispara a movimentação de etapa comercial
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead && targetLead.stage !== matchingRule.targetStage) {
        // Mover lead por automação
        setTimeout(() => {
          moveLead(
            leadId,
            matchingRule.targetStage,
            'automation',
            `Automação acionada pela frase "${matchingRule.contains}"`,
            matchingRule.name,
            undefined,
            matchingRule.conversionValue
          );
        }, 100);
      }
    }
  };

  const createTrackingLink = (linkData: Omit<TrackingLink, 'id' | 'clicks'>) => {
    const newLink: TrackingLink = {
      ...linkData,
      id: `link-${Math.random().toString(36).substr(2, 9)}`,
      clicks: 0
    };
    const updated = [...trackingLinks, newLink];
    setTrackingLinks(updated);
    saveState('top_links', updated);
  };

  // Simular clique no WhatsApp e geração de lead
  const simulateTrackingJourney = (params: {
    name: string;
    phone: string;
    source: Source;
    campaign: string;
    term: string;
    landingPage: string;
    initialMessage: string;
    trackingLinkId?: string;
  }) => {
    const now = new Date().toISOString();
    const leadId = `lead-${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `sess-${Math.random().toString(36).substr(2, 9)}`;

    // Determinar gclid
    let gclid = undefined;
    if (params.source === 'Google Ads') {
      gclid = `GCLID-SIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    // Mapeamento de medium
    let medium: Medium = 'direto';
    if (params.source === 'Google Ads') medium = 'cpc';
    else if (params.source === 'Google Orgânico') medium = 'organico';
    else if (params.source === 'Google Perfil') medium = 'perfil';
    else if (params.source === 'Instagram') medium = 'social';

    // 1. Criar sessão de tracking
    const trackingSession = {
      id: sessionId,
      source: params.source,
      medium,
      campaign: params.campaign || 'Sem Campanha',
      term: params.term || undefined,
      landingPage: params.landingPage || '/',
      gclid,
      referrer: params.source === 'Direto' ? '' : `https://www.${params.source.toLowerCase().replace(' ', '')}.com`,
      utmSource: medium === 'cpc' ? 'google' : (medium === 'social' ? 'instagram' : undefined),
      utmMedium: medium,
      utmCampaign: params.campaign || undefined,
      timestamp: now
    };

    // 2. Criar Lead
    const newLead: Lead = {
      id: leadId,
      companyId: selectedCompanyId,
      name: params.name,
      phone: params.phone,
      initialMessage: params.initialMessage,
      createdAt: now,
      stage: 'Novo Lead',
      currentAssignedTo: 'Sem Atendente',
      revenue: 0,
      value: currentCompany.averageTicket, // Valor estimado inicial
      temperature: 'Morno',
      trackingSession,
      history: [
        {
          id: `hist-${Math.random().toString(36).substr(2, 9)}`,
          stageName: 'Novo Lead',
          movedAt: now,
          reason: `Criado via simulador de rastreamento (${params.source})`,
          source: 'system'
        }
      ]
    };

    // 3. Atualizar links se selecionado
    if (params.trackingLinkId) {
      const updatedLinks = trackingLinks.map(link => {
        if (link.id === params.trackingLinkId) {
          return { ...link, clicks: link.clicks + 1 };
        }
        return link;
      });
      setTrackingLinks(updatedLinks);
      saveState('top_links', updatedLinks);
    }

    // 4. Adicionar lead ao estado
    const updatedLeads = [newLead, ...leads];
    setLeads(updatedLeads);
    saveState('top_leads', updatedLeads);

    // 5. Adicionar conversa correspondente com a mensagem inicial
    const newConv: Conversation = {
      leadId,
      messages: [
        {
          id: `msg-${Math.random().toString(36).substr(2, 9)}`,
          text: params.initialMessage,
          direction: 'inbound',
          timestamp: now
        }
      ],
      unreadCount: 1
    };
    const updatedConversations = [newConv, ...conversations];
    setConversations(updatedConversations);
    saveState('top_conversations', updatedConversations);

    // 6. Criar evento de conversão inicial (Lead)
    const newConversion: ConversionEvent = {
      id: `conv-${leadId}-Lead-${Math.random().toString(36).substr(2, 4)}`,
      leadId,
      leadName: params.name,
      type: 'Lead',
      timestamp: now,
      source: params.source,
      campaign: params.campaign || 'Sem Campanha',
      term: params.term || undefined,
      value: 0,
      gclid,
      status: 'Pendente'
    };
    const updatedConversions = [newConversion, ...conversions];
    setConversions(updatedConversions);
    saveState('top_conversions', updatedConversions);
  };

  const updateCompanySettings = (settings: Partial<Company>) => {
    const updatedCompanies = companies.map(comp => {
      if (comp.id === selectedCompanyId) {
        return { ...comp, ...settings };
      }
      return comp;
    });
    setCompanies(updatedCompanies);
    saveState('top_companies', updatedCompanies);
  };

  const updateAutomationRuleStatus = (ruleId: string, status: 'active' | 'inactive') => {
    const updated = automationRules.map(rule => {
      if (rule.id === ruleId) return { ...rule, status };
      return rule;
    });
    setAutomationRules(updated);
    saveState('top_rules', updated);
  };

  const createAutomationRule = (ruleData: Omit<AutomationRule, 'id'>) => {
    const newRule: AutomationRule = {
      ...ruleData,
      id: `rule-${Math.random().toString(36).substr(2, 9)}`
    };
    const updated = [...automationRules, newRule];
    setAutomationRules(updated);
    saveState('top_rules', updated);
  };

  const sendConversionToAdPlatform = (conversionId: string, platform: 'Google' | 'Meta') => {
    const updated = conversions.map(conv => {
      if (conv.id === conversionId) {
        return { ...conv, status: 'Enviado' as const };
      }
      return conv;
    });
    setConversions(updated);
    saveState('top_conversions', updated);
  };

  // Restaurar dados padrão de simulação
  const restoreDemoData = () => {
    localStorage.removeItem('top_companies');
    localStorage.removeItem('top_leads');
    localStorage.removeItem('top_conversations');
    localStorage.removeItem('top_links');
    localStorage.removeItem('top_rules');
    localStorage.removeItem('top_conversions');

    setCompanies(defaultCompanies);
    setLeads([]);
    setConversations([]);
    setTrackingLinks([]);
    setAutomationRules([]);
    setConversions([]);

    // Save to localstorage
    saveState('top_companies', defaultCompanies);
    saveState('top_leads', []);
    saveState('top_conversations', []);
    saveState('top_links', []);
    saveState('top_rules', []);
    saveState('top_conversions', []);
  };

  return (
    <AppContext.Provider value={{
      companies,
      selectedCompanyId,
      selectedPeriod,
      currentCompany,
      leads,
      conversations,
      trackingLinks,
      automationRules,
      conversions,
      setSelectedCompanyId,
      setSelectedPeriod,
      createLead,
      moveLead,
      sendMessage,
      createTrackingLink,
      simulateTrackingJourney,
      updateCompanySettings,
      updateAutomationRuleStatus,
      createAutomationRule,
      sendConversionToAdPlatform,
      restoreDemoData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
