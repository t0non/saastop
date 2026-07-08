import { Company, Lead, TrackingLink, AutomationRule, Conversation, PipelineStageConfig } from '../types';

export const mockCompanies: Company[] = [
  {
    id: 'sono',
    name: 'Instituto do Sono',
    segment: 'Saúde e Exames',
    phone: '(31) 3245-8899',
    whatsapp: '+5531988887777',
    site: 'https://www.institutodosonobh.com.br',
    averageTicket: 850,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    integrations: {
      whatsappConnected: true,
      googleAdsConnected: false,
      metaConnected: false
    },
    sourcesConfig: {
      googleAds: true,
      googleOrganico: true,
      googlePerfil: true,
      instagram: true,
      facebook: false
    }
  },
  {
    id: 'gs-terapias',
    name: 'GS Terapias',
    segment: 'Fisioterapia e Quiropraxia',
    phone: '(11) 4567-8901',
    whatsapp: '+5511977776666',
    site: 'https://www.gsterapias.com.br',
    averageTicket: 250,
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
  },
  {
    id: 'ls-assistencia',
    name: 'LS Assistência Técnica',
    segment: 'Manutenção de Eletrodomésticos',
    phone: '(21) 2233-4455',
    whatsapp: '+5521966665555',
    site: 'https://www.lsassistencia.com.br',
    averageTicket: 450,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    integrations: {
      whatsappConnected: true,
      googleAdsConnected: false,
      metaConnected: false
    },
    sourcesConfig: {
      googleAds: true,
      googleOrganico: true,
      googlePerfil: false,
      instagram: false,
      facebook: true
    }
  }
];

export const defaultStages: PipelineStageConfig[] = [
  { id: 'Novo Lead', name: 'Novo Lead', type: 'initial', color: 'bg-blue-100 text-blue-800 border-blue-200', isConversion: true, conversionType: 'Lead' },
  { id: 'Em Atendimento', name: 'Em Atendimento', type: 'progress', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', isConversion: false },
  { id: 'Interessado', name: 'Interessado', type: 'progress', color: 'bg-amber-100 text-amber-800 border-amber-200', isConversion: false },
  { id: 'Agendado', name: 'Agendado', type: 'conversion_intermediate', color: 'bg-purple-100 text-purple-800 border-purple-200', isConversion: true, conversionType: 'Agendamento' },
  { id: 'Compareceu', name: 'Compareceu', type: 'conversion_intermediate', color: 'bg-pink-100 text-pink-800 border-pink-200', isConversion: true, conversionType: 'Comparecimento' },
  { id: 'Venda', name: 'Venda', type: 'conversion_final', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', isConversion: true, conversionType: 'Venda' },
  { id: 'Perdido', name: 'Perdido', type: 'lost', color: 'bg-rose-100 text-rose-800 border-rose-200', isConversion: false }
];

export const defaultRules: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Agendamento Confirmado',
    event: 'message_sent',
    contains: 'agendamento confirmado',
    action: 'move_lead',
    targetStage: 'Agendado',
    registerConversion: 'Agendamento',
    status: 'active',
    companyId: 'sono'
  },
  {
    id: 'rule-2',
    name: 'Atendimento Realizado',
    event: 'message_sent',
    contains: 'atendimento realizado',
    action: 'move_lead',
    targetStage: 'Compareceu',
    registerConversion: 'Comparecimento',
    status: 'active',
    companyId: 'sono'
  },
  {
    id: 'rule-3',
    name: 'Pagamento Confirmado',
    event: 'message_sent',
    contains: 'pagamento confirmado',
    action: 'move_lead',
    targetStage: 'Venda',
    registerConversion: 'Venda',
    status: 'active',
    companyId: 'sono'
  },
  {
    id: 'rule-4',
    name: 'Lead não tem Interesse',
    event: 'message_received',
    contains: 'não tenho interesse',
    action: 'move_lead',
    targetStage: 'Perdido',
    status: 'active',
    companyId: 'sono'
  }
];

export const defaultTrackingLinks = (companyId: string): TrackingLink[] => {
  if (companyId === 'sono') {
    return [
      {
        id: 'link-1',
        name: 'LP Instituto do Sono | WhatsApp',
        destinationUrl: 'https://www.institutodosonobh.com.br/polissonografia',
        whatsappNumber: '+5531988887777',
        initialMessage: 'Olá, gostaria de informações sobre o exame de polissonografia.',
        usageChannel: 'Landing Page',
        status: 'active',
        companyId: 'sono',
        shortCode: 'r/8FK2A',
        clicks: 142
      },
      {
        id: 'link-2',
        name: 'Google Perfil | Instituto do Sono',
        destinationUrl: 'https://www.institutodosonobh.com.br/',
        whatsappNumber: '+5531988887777',
        initialMessage: 'Olá, encontrei vocês no Google Maps e gostaria de tirar uma dúvida.',
        usageChannel: 'Google Meu Negócio',
        status: 'active',
        companyId: 'sono',
        shortCode: 'r/GMapS',
        clicks: 89
      },
      {
        id: 'link-3',
        name: 'Instagram Bio | Instituto do Sono',
        destinationUrl: 'https://www.institutodosonobh.com.br/links',
        whatsappNumber: '+5531988887777',
        initialMessage: 'Olá! Vim do Instagram e gostaria de saber os horários disponíveis.',
        usageChannel: 'Instagram Bio',
        status: 'active',
        companyId: 'sono',
        shortCode: 'r/InstaBio',
        clicks: 65
      }
    ];
  } else if (companyId === 'gs-terapias') {
    return [
      {
        id: 'link-gs-1',
        name: 'Campanha Quiropraxia | WhatsApp',
        destinationUrl: 'https://www.gsterapias.com.br/quiropraxia',
        whatsappNumber: '+5511977776666',
        initialMessage: 'Olá, gostaria de agendar uma sessão de quiropraxia.',
        usageChannel: 'Google Ads',
        status: 'active',
        companyId: 'gs-terapias',
        shortCode: 'r/QuirpX',
        clicks: 98
      },
      {
        id: 'link-gs-2',
        name: 'Instagram Bio | GS Terapias',
        destinationUrl: 'https://www.gsterapias.com.br/',
        whatsappNumber: '+5511977776666',
        initialMessage: 'Olá, vim do Instagram e gostaria de conhecer as terapias de vocês.',
        usageChannel: 'Instagram Bio',
        status: 'active',
        companyId: 'gs-terapias',
        shortCode: 'r/GSInsta',
        clicks: 43
      }
    ];
  } else {
    return [
      {
        id: 'link-ls-1',
        name: 'Botão WhatsApp | Assistência Técnica',
        destinationUrl: 'https://www.lsassistencia.com.br/conserto-geladeira',
        whatsappNumber: '+5521966665555',
        initialMessage: 'Olá, preciso de um orçamento para conserto de geladeira.',
        usageChannel: 'Landing Page',
        status: 'active',
        companyId: 'ls-assistencia',
        shortCode: 'r/GeladR',
        clicks: 72
      }
    ];
  }
};

export const defaultLeads = (): Lead[] => {
  // Vamos criar 22 leads realistas para Instituto do Sono (sono)
  // E mais 5 para GS Terapias (gs-terapias)
  // E mais 4 para LS Assistência Técnica (ls-assistencia)
  
  const now = new Date();
  
  const leads: Lead[] = [
    // 1. MARIA SILVA (Agendada, Google Ads)
    {
      id: 'lead-sono-1',
      companyId: 'sono',
      name: 'Maria Silva',
      phone: '(31) 98877-6655',
      initialMessage: 'Gostaria de informações sobre o exame de polissonografia',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
      stage: 'Agendado',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 0,
      value: 650,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-1',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Polissonografia',
        term: 'clínica do sono bh',
        landingPage: '/polissonografia',
        gclid: 'GCLID-MOCK-928237198',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-1-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via rastreamento de clique no WhatsApp', source: 'system' },
        { id: 'hist-1-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(), reason: 'Início de conversa com atendente', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-1-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' }
      ]
    },
    // 2. CARLOS MENDES (Em Atendimento, Google Orgânico)
    {
      id: 'lead-sono-2',
      companyId: 'sono',
      name: 'Carlos Mendes',
      phone: '(31) 99122-3344',
      initialMessage: 'Olá, preciso tirar uma dúvida sobre exames respiratórios de sono.',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
      stage: 'Em Atendimento',
      currentAssignedTo: 'Aline Souza',
      revenue: 0,
      value: 0,
      temperature: 'Morno',
      trackingSession: {
        id: 'sess-sono-2',
        source: 'Google Orgânico',
        medium: 'organico',
        campaign: 'Sem Campanha',
        landingPage: '/polissonografia',
        referrer: 'https://www.google.com/',
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-2-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via clique no WhatsApp', source: 'system' },
        { id: 'hist-2-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(), reason: 'Atendente respondeu ao contato', source: 'manual', agentName: 'Aline Souza' }
      ]
    },
    // 3. FERNANDA LIMA (Venda, Google Perfil)
    {
      id: 'lead-sono-3',
      companyId: 'sono',
      name: 'Fernanda Lima',
      phone: '(31) 97544-2211',
      initialMessage: 'Gostaria de agendar consulta com médico do sono.',
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 dias atrás
      stage: 'Venda',
      currentAssignedTo: 'Aline Souza',
      revenue: 650,
      value: 650,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-3',
        source: 'Google Perfil',
        medium: 'perfil',
        campaign: 'Google Meu Negócio',
        landingPage: '/',
        referrer: 'https://maps.google.com/',
        timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 - 8 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-3-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Origem Google Meu Negócio', source: 'system' },
        { id: 'hist-3-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(), reason: 'Atendimento iniciado', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-3-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-3-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Comparecimento confirmado no sistema', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-3-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 4. JOÃO HENRIQUE (Compareceu, Google Ads)
    {
      id: 'lead-sono-4',
      companyId: 'sono',
      name: 'João Henrique',
      phone: '(31) 98822-1133',
      initialMessage: 'Olá, tenho encaminhamento para exame de ronco e apneia.',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias atrás
      stage: 'Compareceu',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 0,
      value: 850,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-4',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Apneia do Sono',
        term: 'exame do sono',
        landingPage: '/apneia',
        gclid: 'GCLID-MOCK-394810293',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Apneia do Sono',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-4-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via clique Ads', source: 'system' },
        { id: 'hist-4-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Operador iniciou atendimento', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-4-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-4-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' }
      ]
    },
    // 5. ANA PAULA (Perdido, Direto)
    {
      id: 'lead-sono-5',
      companyId: 'sono',
      name: 'Ana Paula',
      phone: '(31) 97111-9988',
      initialMessage: 'Queria saber se aceitam plano de saúde Bradesco.',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Perdido',
      currentAssignedTo: 'Aline Souza',
      revenue: 0,
      value: 0,
      temperature: 'Frio',
      trackingSession: {
        id: 'sess-sono-5',
        source: 'Direto',
        medium: 'direto',
        campaign: 'Sem Campanha',
        landingPage: '/',
        timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 - 2 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-5-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Acesso direto', source: 'system' },
        { id: 'hist-5-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(), reason: 'Atendimento iniciado', source: 'manual' },
        { id: 'hist-5-3', stageName: 'Perdido', movedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), reason: 'Cliente avisou que não tem interesse pois não atendemos o convênio', source: 'automation', ruleName: 'Lead não tem Interesse' }
      ]
    },
    // 6. MARCOS SANTOS (Venda, Google Ads, R$ 1.200)
    {
      id: 'lead-sono-6',
      companyId: 'sono',
      name: 'Marcos Santos',
      phone: '(31) 98123-4567',
      initialMessage: 'Olá, gostaria de saber o preço do exame EEG completo.',
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 1200,
      value: 1200,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-6',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'EEG',
        term: 'eeg exame preço bh',
        landingPage: '/eeg',
        gclid: 'GCLID-MOCK-665123984',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'EEG',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-6-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Campanha EEG Ads', source: 'system' },
        { id: 'hist-6-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Iniciado atendimento', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-6-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-6-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-6-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 7. BRUNO SOUZA (Novo Lead, Instagram)
    {
      id: 'lead-sono-7',
      companyId: 'sono',
      name: 'Bruno Souza',
      phone: '(31) 98765-4321',
      initialMessage: 'Olá, vi o post sobre apneia no insta e queria agendar com especialista.',
      createdAt: new Date(now.getTime() - 1 * 12 * 60 * 60 * 1000).toISOString(), // 12 horas atrás
      stage: 'Novo Lead',
      currentAssignedTo: 'Sem Atendente',
      revenue: 0,
      value: 300,
      temperature: 'Morno',
      trackingSession: {
        id: 'sess-sono-7',
        source: 'Instagram',
        medium: 'social',
        campaign: 'Post Apneia',
        landingPage: '/links',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'Post Apneia',
        referrer: 'https://l.instagram.com/',
        timestamp: new Date(now.getTime() - 1 * 12 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-7-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 1 * 12 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Instagram Bio', source: 'system' }
      ]
    },
    // 8. AMANDA COSTA (Interessado, Google Ads)
    {
      id: 'lead-sono-8',
      companyId: 'sono',
      name: 'Amanda Costa',
      phone: '(31) 99444-5566',
      initialMessage: 'Olá, preciso de um orçamento de polissonografia domiciliar.',
      createdAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Interessado',
      currentAssignedTo: 'Aline Souza',
      revenue: 0,
      value: 1200,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-8',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Polissonografia',
        term: 'polissonografia domiciliar bh',
        landingPage: '/polissonografia',
        gclid: 'GCLID-MOCK-774928103',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-8-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Polissonografia residencial', source: 'system' },
        { id: 'hist-8-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Atendimento iniciado', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-8-3', stageName: 'Interessado', movedAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), reason: 'Marcou interesse, aguardando orçamento de data', source: 'manual', agentName: 'Aline Souza' }
      ]
    },
    // 9. LETICIA RIBEIRO (Agendada, Google Ads)
    {
      id: 'lead-sono-9',
      companyId: 'sono',
      name: 'Leticia Ribeiro',
      phone: '(31) 98321-0987',
      initialMessage: 'Olá, gostaria de agendar um exame de apneia infantil.',
      createdAt: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Agendado',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 0,
      value: 750,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-9',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Apneia do Sono',
        term: 'exame de apneia infantil',
        landingPage: '/apneia',
        gclid: 'GCLID-MOCK-554109283',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Apneia do Sono',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000 - 20 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-9-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Ads Apneia', source: 'system' },
        { id: 'hist-9-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento iniciado', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-9-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' }
      ]
    },
    // 10. RICARDO OLIVEIRA (Interessado, Google Orgânico)
    {
      id: 'lead-sono-10',
      companyId: 'sono',
      name: 'Ricardo Oliveira',
      phone: '(31) 99322-8844',
      initialMessage: 'Tenho interesse em fazer a polissonografia particular.',
      createdAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Interessado',
      currentAssignedTo: 'Aline Souza',
      revenue: 0,
      value: 650,
      temperature: 'Morno',
      trackingSession: {
        id: 'sess-sono-10',
        source: 'Google Orgânico',
        medium: 'organico',
        campaign: 'Sem Campanha',
        landingPage: '/polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-10-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Acesso Google Orgânico', source: 'system' },
        { id: 'hist-10-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Atendente iniciou conversa', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-10-3', stageName: 'Interessado', movedAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(), reason: 'Operador marcou como interessado nas formas de pagamento', source: 'manual', agentName: 'Aline Souza' }
      ]
    },
    // 11. FELIPE CASTRO (Venda, Google Ads, R$ 650)
    {
      id: 'lead-sono-11',
      companyId: 'sono',
      name: 'Felipe Castro',
      phone: '(31) 98711-2233',
      initialMessage: 'Olá, preciso agendar uma polissonografia tipo 3.',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 650,
      value: 650,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-11',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Polissonografia',
        term: 'polissonografia tipo 3 preço',
        landingPage: '/polissonografia',
        gclid: 'GCLID-MOCK-112349845',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-11-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Ads Polissonografia', source: 'system' },
        { id: 'hist-11-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000).toISOString(), reason: 'Atendimento inicial', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-11-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-11-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-11-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 12. CAMILA PINTO (Venda, Google Perfil, R$ 750)
    {
      id: 'lead-sono-12',
      companyId: 'sono',
      name: 'Camila Pinto',
      phone: '(31) 97222-3344',
      initialMessage: 'Olá, qual o endereço de vocês? Gostaria de marcar consulta.',
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Aline Souza',
      revenue: 750,
      value: 750,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-12',
        source: 'Google Perfil',
        medium: 'perfil',
        campaign: 'Google Meu Negócio',
        landingPage: '/',
        referrer: 'https://www.google.com/maps',
        timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-12-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Origem Google Maps', source: 'system' },
        { id: 'hist-12-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento inicial', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-12-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-12-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-12-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 13. DANIEL LIMA (Compareceu, Google Orgânico)
    {
      id: 'lead-sono-13',
      companyId: 'sono',
      name: 'Daniel Lima',
      phone: '(31) 99182-3344',
      initialMessage: 'Olá, preciso de informações sobre tratamento para ronco e apneia.',
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Compareceu',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 0,
      value: 800,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-13',
        source: 'Google Orgânico',
        medium: 'organico',
        campaign: 'Sem Campanha',
        landingPage: '/apneia',
        referrer: 'https://www.google.com.br',
        timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 - 12 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-13-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Acesso Orgânico', source: 'system' },
        { id: 'hist-13-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-13-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-13-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Comparecimento confirmado no balcão', source: 'manual', agentName: 'Rodrigo Medeiros' }
      ]
    },
    // 14. BEATRIZ MARTINS (Venda, Google Ads, R$ 850)
    {
      id: 'lead-sono-14',
      companyId: 'sono',
      name: 'Beatriz Martins',
      phone: '(31) 98888-0011',
      initialMessage: 'Olá, gostaria de tirar dúvidas sobre o exame de polissonografia particular.',
      createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Aline Souza',
      revenue: 850,
      value: 850,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-14',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Polissonografia',
        term: 'exame de sono preço bh',
        landingPage: '/polissonografia',
        gclid: 'GCLID-MOCK-998822334',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-14-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Ads Polissonografia', source: 'system' },
        { id: 'hist-14-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Iniciado atendimento', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-14-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-14-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-14-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 15. GUSTAVO CARDOSO (Venda, Google Ads, R$ 1.100)
    {
      id: 'lead-sono-15',
      companyId: 'sono',
      name: 'Gustavo Cardoso',
      phone: '(31) 98455-6677',
      initialMessage: 'Gostaria de agendar o exame EEG com urgência.',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 1100,
      value: 1100,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-15',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'EEG',
        term: 'onde fazer eeg em bh',
        landingPage: '/eeg',
        gclid: 'GCLID-MOCK-443322119',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'EEG',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-15-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Campanha EEG Ads', source: 'system' },
        { id: 'hist-15-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-15-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-15-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-15-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 16. JULIA MORAIS (Agendada, Instagram)
    {
      id: 'lead-sono-16',
      companyId: 'sono',
      name: 'Julia Morais',
      phone: '(31) 98666-5544',
      initialMessage: 'Olá, gostaria de saber os horários do Dr. Roberto, clínico do sono.',
      createdAt: new Date(now.getTime() - 2.2 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Agendado',
      currentAssignedTo: 'Aline Souza',
      revenue: 0,
      value: 300,
      temperature: 'Morno',
      trackingSession: {
        id: 'sess-sono-16',
        source: 'Instagram',
        medium: 'social',
        campaign: 'Perfil Geral',
        landingPage: '/',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'Perfil Geral',
        referrer: 'https://l.instagram.com',
        timestamp: new Date(now.getTime() - 2.2 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-16-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 2.2 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Instagram Bio Link', source: 'system' },
        { id: 'hist-16-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 2.2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Iniciado atendimento', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-16-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 2.2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' }
      ]
    },
    // 17. PATRICIA ALVES (Venda, Direto, R$ 850)
    {
      id: 'lead-sono-17',
      companyId: 'sono',
      name: 'Patricia Alves',
      phone: '(31) 99123-9988',
      initialMessage: 'Olá, preciso agendar exame de polissonografia para meu marido.',
      createdAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Aline Souza',
      revenue: 850,
      value: 850,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-17',
        source: 'Direto',
        medium: 'direto',
        campaign: 'Sem Campanha',
        landingPage: '/polissonografia',
        referrer: '',
        timestamp: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-17-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Acesso Direto', source: 'system' },
        { id: 'hist-17-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-17-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-17-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-17-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 18. LUCAS BARROS (Venda, Google Ads, R$ 650)
    {
      id: 'lead-sono-18',
      companyId: 'sono',
      name: 'Lucas Barros',
      phone: '(31) 98222-7766',
      initialMessage: 'Gostaria de agendar exame de polissonografia tipo 4.',
      createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 650,
      value: 650,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-18',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Polissonografia',
        term: 'polissonografia respiratória barata',
        landingPage: '/polissonografia',
        gclid: 'GCLID-MOCK-882736199',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000 - 8 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-18-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Ads Polissonografia', source: 'system' },
        { id: 'hist-18-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-18-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-18-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-18-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 19. RENATA ROCHA (Perdido, Instagram)
    {
      id: 'lead-sono-19',
      companyId: 'sono',
      name: 'Renata Rocha',
      phone: '(31) 97333-4455',
      initialMessage: 'Olá, vi o anuncio e queria tirar duvidas.',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Perdido',
      currentAssignedTo: 'Aline Souza',
      revenue: 0,
      value: 0,
      temperature: 'Frio',
      trackingSession: {
        id: 'sess-sono-19',
        source: 'Instagram',
        medium: 'social',
        campaign: 'Perfil Geral',
        landingPage: '/',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'Perfil Geral',
        referrer: 'https://l.instagram.com',
        timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-19-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Instagram Link', source: 'system' },
        { id: 'hist-19-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-19-3', stageName: 'Perdido', movedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Não tem interesse no momento', source: 'automation', ruleName: 'Lead não tem Interesse' }
      ]
    },
    // 20. THIAGO MOREIRA (Novo Lead, Google Orgânico)
    {
      id: 'lead-sono-20',
      companyId: 'sono',
      name: 'Thiago Moreira',
      phone: '(31) 98833-2211',
      initialMessage: 'Exame de polissonografia precisa de pedido médico?',
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hora atrás
      stage: 'Novo Lead',
      currentAssignedTo: 'Sem Atendente',
      revenue: 0,
      value: 0,
      temperature: 'Morno',
      trackingSession: {
        id: 'sess-sono-20',
        source: 'Google Orgânico',
        medium: 'organico',
        campaign: 'Sem Campanha',
        landingPage: '/polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-20-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), reason: 'Acesso Orgânico', source: 'system' }
      ]
    },
    // 21. CRISTIANO NEVES (Venda, Google Ads, R$ 1.350)
    {
      id: 'lead-sono-21',
      companyId: 'sono',
      name: 'Cristiano Neves',
      phone: '(31) 99122-8811',
      initialMessage: 'Queria saber se realizam polissonografia com CPAP acoplado.',
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Rodrigo Medeiros',
      revenue: 1350,
      value: 1350,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-sono-21',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Polissonografia',
        term: 'polissonografia com cpap bh',
        landingPage: '/polissonografia',
        gclid: 'GCLID-MOCK-551029384',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-21-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Ads', source: 'system' },
        { id: 'hist-21-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Rodrigo Medeiros' },
        { id: 'hist-21-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' },
        { id: 'hist-21-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento realizado pelo operador', source: 'automation', ruleName: 'Atendimento Realizado' },
        { id: 'hist-21-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Pagamento confirmado do exame', source: 'automation', ruleName: 'Pagamento Confirmado' }
      ]
    },
    // 22. ALINE CARDOSO (Agendada, Google Orgânico)
    {
      id: 'lead-sono-22',
      companyId: 'sono',
      name: 'Aline Cardoso',
      phone: '(31) 98777-1234',
      initialMessage: 'Olá, gostaria de saber se atendem Unimed para polissonografia.',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Agendado',
      currentAssignedTo: 'Aline Souza',
      revenue: 0,
      value: 650,
      temperature: 'Morno',
      trackingSession: {
        id: 'sess-sono-22',
        source: 'Google Orgânico',
        medium: 'organico',
        campaign: 'Sem Campanha',
        landingPage: '/polissonografia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-22-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Acesso Orgânico', source: 'system' },
        { id: 'hist-22-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Aline Souza' },
        { id: 'hist-22-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), reason: 'Agendamento confirmado via mensagem do operador', source: 'automation', ruleName: 'Agendamento Confirmado' }
      ]
    },

    // LEADS GS TERAPIAS
    {
      id: 'lead-gs-1',
      companyId: 'gs-terapias',
      name: 'Roberto Diniz',
      phone: '(11) 98711-2233',
      initialMessage: 'Gostaria de marcar uma sessão de quiropraxia para dor lombar.',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Juliana Castro',
      revenue: 250,
      value: 250,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-gs-1',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Quiropraxia',
        term: 'quiropraxia dor lombar sp',
        landingPage: '/quiropraxia',
        gclid: 'GCLID-MOCK-GS112233',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Quiropraxia',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-gs1-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Ads Quiropraxia', source: 'system' },
        { id: 'hist-gs1-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Atendimento', source: 'manual', agentName: 'Juliana Castro' },
        { id: 'hist-gs1-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Agendado pelo operador', source: 'manual', agentName: 'Juliana Castro' },
        { id: 'hist-gs1-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Compareceu na clínica', source: 'manual', agentName: 'Juliana Castro' },
        { id: 'hist-gs1-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Venda registrada', source: 'manual', agentName: 'Juliana Castro' }
      ]
    },
    {
      id: 'lead-gs-2',
      companyId: 'gs-terapias',
      name: 'Sofia Albuquerque',
      phone: '(11) 97655-4433',
      initialMessage: 'Olá, gostaria de saber os valores da sessão de fisioterapia.',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Em Atendimento',
      currentAssignedTo: 'Juliana Castro',
      revenue: 0,
      value: 0,
      temperature: 'Morno',
      trackingSession: {
        id: 'sess-gs-2',
        source: 'Instagram',
        medium: 'social',
        campaign: 'Instagram Bio',
        landingPage: '/',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'Instagram Bio',
        referrer: 'https://l.instagram.com',
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-gs2-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Link na bio', source: 'system' },
        { id: 'hist-gs2-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), reason: 'Atendimento iniciado', source: 'manual', agentName: 'Juliana Castro' }
      ]
    },

    // LEADS LS ASSISTÊNCIA TÉCNICA
    {
      id: 'lead-ls-1',
      companyId: 'ls-assistencia',
      name: 'Carlos Antunes',
      phone: '(21) 98833-4455',
      initialMessage: 'Minha geladeira parou de refrigerar. Preciso de um técnico hoje.',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'Venda',
      currentAssignedTo: 'Mauricio Silva',
      revenue: 450,
      value: 450,
      temperature: 'Quente',
      trackingSession: {
        id: 'sess-ls-1',
        source: 'Google Ads',
        medium: 'cpc',
        campaign: 'Conserto Geladeira',
        term: 'conserto de geladeira rj urgente',
        landingPage: '/conserto-geladeira',
        gclid: 'GCLID-MOCK-LS9922',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'Conserto Geladeira',
        referrer: 'https://www.google.com',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString()
      },
      history: [
        { id: 'hist-ls1-1', stageName: 'Novo Lead', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Criado via Ads Conserto', source: 'system' },
        { id: 'hist-ls1-2', stageName: 'Em Atendimento', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(), reason: 'Atendimento iniciado', source: 'manual', agentName: 'Mauricio Silva' },
        { id: 'hist-ls1-3', stageName: 'Agendado', movedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), reason: 'Visita técnica agendada', source: 'manual', agentName: 'Mauricio Silva' },
        { id: 'hist-ls1-4', stageName: 'Compareceu', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Técnico realizou a visita', source: 'manual', agentName: 'Mauricio Silva' },
        { id: 'hist-ls1-5', stageName: 'Venda', movedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), reason: 'Serviço concluído e pago', source: 'manual', agentName: 'Mauricio Silva' }
      ]
    }
  ];
  
  return leads;
};

export const defaultConversations = (): Conversation[] => {
  // Vamos mockar diálogos para as conversas que já começaram
  const now = new Date();
  
  return [
    {
      leadId: 'lead-sono-1',
      unreadCount: 0,
      messages: [
        { id: 'm1-1', direction: 'inbound', text: 'Gostaria de informações sobre o exame de polissonografia', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'm1-2', direction: 'outbound', text: 'Olá! Sou o Rodrigo, do Instituto do Sono. Claro! A polissonografia é o exame do sono. Você tem indicação médica ou gostaria de fazer particular?', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString() },
        { id: 'm1-3', direction: 'inbound', text: 'Tenho pedido médico sim, do meu neurologista. Gostaria de ver o preço e cobertura.', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString() },
        { id: 'm1-4', direction: 'outbound', text: 'Perfeito! Atendemos diversos convênios e também particular com desconto. Vou conferir para você. Poderia me confirmar se seu agendamento está confirmado para sexta-feira às 20h?', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString() },
        { id: 'm1-5', direction: 'inbound', text: 'Sim, agendamento confirmado para sexta!', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000).toISOString() }
      ]
    },
    {
      leadId: 'lead-sono-2',
      unreadCount: 2,
      messages: [
        { id: 'm2-1', direction: 'inbound', text: 'Olá, preciso tirar uma dúvida sobre exames respiratórios de sono.', timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'm2-2', direction: 'outbound', text: 'Olá Carlos! Sou a Aline. Qual seria a sua dúvida? Temos exames de polissonografia e também exames domiciliares.', timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString() },
        { id: 'm2-3', direction: 'inbound', text: 'Precisa dormir na clínica mesmo?', timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() },
        { id: 'm2-4', direction: 'inbound', text: 'E qual o valor do exame em casa?', timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 32 * 60 * 1000).toISOString() }
      ]
    },
    {
      leadId: 'lead-sono-3',
      unreadCount: 0,
      messages: [
        { id: 'm3-1', direction: 'inbound', text: 'Gostaria de agendar consulta com médico do sono.', timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'm3-2', direction: 'outbound', text: 'Olá Fernanda! Claro, temos horários para esta semana. Qual seria o melhor período?', timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString() },
        { id: 'm3-3', direction: 'inbound', text: 'Quarta à tarde seria ideal.', timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() },
        { id: 'm3-4', direction: 'outbound', text: 'Ótimo, agendamento confirmado para quarta às 15h. Esperamos você!', timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString() },
        { id: 'm3-5', direction: 'inbound', text: 'Obrigada!', timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 62 * 60 * 1000).toISOString() },
        { id: 'm3-6', direction: 'outbound', text: 'Seu atendimento realizado foi um sucesso! Podemos fechar o pacote de exames?', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'm3-7', direction: 'inbound', text: 'Sim, farei o pagamento hoje.', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString() },
        { id: 'm3-8', direction: 'outbound', text: 'Opa, ótimo! Já recebemos e seu pagamento confirmado foi registrado.', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() }
      ]
    },
    {
      leadId: 'lead-sono-4',
      unreadCount: 0,
      messages: [
        { id: 'm4-1', direction: 'inbound', text: 'Olá, tenho encaminhamento para exame de ronco e apneia.', timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'm4-2', direction: 'outbound', text: 'Olá João! Sou o Rodrigo. Vamos marcar. Qual o seu convênio?', timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() },
        { id: 'm4-3', direction: 'inbound', text: 'É Bradesco Saúde.', timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000).toISOString() },
        { id: 'm4-4', direction: 'outbound', text: 'Maravilha, atendemos sim! Deixei agendamento confirmado para quinta às 21h.', timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString() },
        { id: 'm4-5', direction: 'outbound', text: 'Confirmando que seu atendimento realizado foi concluído.', timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() }
      ]
    },
    {
      leadId: 'lead-sono-5',
      unreadCount: 0,
      messages: [
        { id: 'm5-1', direction: 'inbound', text: 'Queria saber se aceitam plano de saúde Bradesco.', timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'm5-2', direction: 'outbound', text: 'Olá Ana! No momento não atendemos Bradesco para consultas, apenas exames. Você tem interesse no particular?', timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString() },
        { id: 'm5-3', direction: 'inbound', text: 'Ah, entendi. No momento não tenho interesse no particular, obrigada.', timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString() }
      ]
    }
  ];
};
