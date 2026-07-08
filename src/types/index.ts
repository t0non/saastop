export type Source = 'Google Ads' | 'Google Orgânico' | 'Google Perfil' | 'Instagram' | 'Direto';
export type Medium = 'cpc' | 'organico' | 'perfil' | 'social' | 'direto';
export type Channel = 'Google Ads' | 'Google Search' | 'Google Maps' | 'Instagram Bio' | 'Direct Access';
export type ConversionType = 'Lead' | 'Agendamento' | 'Comparecimento' | 'Venda';
export type AttributionConfidence = 'Confirmada' | 'Confirmada pela plataforma' | 'Inferida' | 'Desconhecida';
export type MessageDirection = 'inbound' | 'outbound';
export type LeadStatus = 'Novo Lead' | 'Em Atendimento' | 'Interessado' | 'Agendado' | 'Compareceu' | 'Venda' | 'Perdido';

export interface CompanyIntegrations {
  whatsappConnected: boolean;
  googleAdsConnected: boolean;
  metaConnected: boolean;
}

export interface Company {
  id: string;
  name: string;
  segment: string;
  phone: string;
  whatsapp: string;
  site: string;
  averageTicket: number;
  currency: string;
  timezone: string;
  integrations: CompanyIntegrations;
  sourcesConfig: {
    googleAds: boolean;
    googleOrganico: boolean;
    googlePerfil: boolean;
    instagram: boolean;
    facebook: boolean;
  };
}

export interface TrackingSession {
  id: string;
  source: Source;
  medium: Medium;
  campaign: string;
  term?: string;
  landingPage: string;
  gclid?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  timestamp: string;
}

export interface StageHistory {
  id: string;
  stageName: LeadStatus;
  movedAt: string;
  reason: string;
  source: 'automation' | 'manual' | 'system';
  ruleName?: string;
  agentName?: string;
}

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  initialMessage?: string;
  createdAt: string;
  stage: LeadStatus;
  currentAssignedTo: string;
  revenue: number;
  value: number; // potencial
  trackingSession?: TrackingSession;
  history: StageHistory[];
  temperature: 'Frio' | 'Morno' | 'Quente';
}

export interface Message {
  id: string;
  text: string;
  direction: MessageDirection;
  timestamp: string;
}

export interface Conversation {
  leadId: string;
  messages: Message[];
  unreadCount: number;
}

export interface TrackingLink {
  id: string;
  name: string;
  destinationUrl: string;
  whatsappNumber: string;
  initialMessage: string;
  usageChannel: string;
  status: 'active' | 'inactive';
  companyId: string;
  shortCode: string;
  // Métricas agregadas do link
  clicks: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  event: 'message_received' | 'message_sent';
  contains: string; // frase-gatilho em minúsculas
  action: 'move_lead';
  targetStage: LeadStatus;
  registerConversion?: ConversionType;
  conversionValue?: number;
  status: 'active' | 'inactive';
  companyId: string;
}

export interface ConversionEvent {
  id: string;
  leadId: string;
  leadName: string;
  type: ConversionType;
  timestamp: string;
  source: Source;
  campaign: string;
  term?: string;
  value: number;
  gclid?: string;
  status: 'Pendente' | 'Enviado';
}

export interface PipelineStageConfig {
  id: LeadStatus;
  name: string;
  type: 'initial' | 'progress' | 'conversion_intermediate' | 'conversion_final' | 'lost';
  color: string;
  isConversion: boolean;
  conversionType?: ConversionType;
}
