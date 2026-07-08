'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, Users, Route, Link2, Kanban, RefreshCw, BarChart3, 
  Share2, Zap, MessageSquare, Settings, Menu, X, Bell, User, CheckCircle2,
  RefreshCcw, AlertCircle, Building2, Play, LogOut, QrCode
} from 'lucide-react';
import SimulatorDrawer from './SimulatorDrawer';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    companies, selectedCompanyId, selectedPeriod, setSelectedCompanyId, 
    setSelectedPeriod, restoreDemoData, currentCompany 
  } = useApp();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<string>("not_configured");

  useEffect(() => {
    async function checkWhatsApp() {
      try {
        const res = await fetch("/api/whatsapp/connection");
        if (res.ok) {
          const data = await res.json();
          setWhatsappStatus(data.status || "not_configured");
        }
      } catch (e) {
        console.warn("Could not check WhatsApp status:", e);
      }
    }
    checkWhatsApp();
  }, [selectedCompanyId]);

  const menuItems = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Jornada', href: '/journeys', icon: Route },
    { name: 'Links Rastreáveis', href: '/tracking-links', icon: Link2 },
    { name: 'Funil Comercial', href: '/pipeline', icon: Kanban },
    { name: 'Conversões', href: '/conversions', icon: RefreshCw },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
    { name: 'Origens (Atribuição)', href: '/attribution', icon: Share2 },
    { name: 'Automações', href: '/automations', icon: Zap },
    { name: 'Conversas', href: '/conversations', icon: MessageSquare },
  ];

  const settingsItems = [
    { name: 'Jornada de Compra', href: '/settings/journey', icon: Route },
    { name: 'Integração WhatsApp', href: '/settings/integrations/whatsapp', icon: QrCode },
    { name: 'Empresa & Integrações', href: '/settings/company', icon: Settings },
  ];

  const handleReset = () => {
    if (confirm('Deseja limpar todos os dados cadastrados? Isso apagará todos os leads, conversas, links e automações.')) {
      restoreDemoData();
      alert('Todos os dados foram limpos com sucesso!');
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      const supabase = getBrowserClient();
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800">
          <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg leading-none block tracking-wide text-white">
              Top<span className="text-emerald-400">Attribution</span>
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">PROTO-SAAS v1.0</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin">
          <div className="space-y-1">
            <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Navegação
            </span>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-slate-800 text-emerald-400 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {item.name}
                  {isActive && (
                    <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="space-y-1 pt-4 border-t border-slate-850">
            <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Configurações
            </span>
            {settingsItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-slate-800 text-emerald-400 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 group-hover:scale-110 transition-transform ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col gap-2">
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-900/10 transition-all duration-150 hover:-translate-y-0.5"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Simular Nova Jornada
          </button>
          
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium transition-all"
          >
            <RefreshCcw className="h-3 w-3" />
            Limpar Todos os Dados
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-800/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20 rounded-lg text-xs font-medium transition-all"
          >
            <LogOut className="h-3 w-3" />
            Sair (Logout)
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-30 shadow-sm shadow-slate-100/40">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Company Selector */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400 hidden sm:block" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 border-none outline-none focus:ring-0 cursor-pointer pr-8 text-sm sm:text-base"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id} className="text-slate-850 font-normal">
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs font-medium text-slate-700">
              <span className="hidden md:inline mr-1 text-slate-400">Período:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer text-slate-700 font-semibold"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="all">Todo o período</option>
              </select>
            </div>

            {/* WhatsApp Connection Status Indicator */}
            {whatsappStatus === "connected" ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-100 select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">WhatsApp</span> Conectado
              </div>
            ) : whatsappStatus === "waiting_qr" || whatsappStatus === "connecting" ? (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-100 select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Aguardando QR
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-100 select-none">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                WhatsApp Desconectado
              </div>
            )}

            {/* Notifications Panel Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg transition-colors relative ${
                  showNotifications ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-white" />
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-800">Notificações</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-medium">1 pendente</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 border-b border-slate-105">
                        <div className="bg-emerald-100 text-emerald-800 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Regras de automação ativas</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">O gatilho &quot;agendamento confirmado&quot; está ativo para {currentCompany?.name}.</p>
                          <span className="text-[10px] text-slate-400 block mt-1">Agora mesmo</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3">
                        <div className="bg-blue-100 text-blue-800 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Modo de demonstração ativo</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Todas as chamadas de API do Facebook Ads e Google Ads são simuladas neste protótipo.</p>
                          <span className="text-[10px] text-slate-400 block mt-1">1 hora atrás</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 cursor-pointer overflow-hidden hover:opacity-85 transition-opacity">
              <User className="h-4.5 w-4.5" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] relative z-10">
          {children}
        </main>
      </div>

      {/* Sidebar - Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative flex flex-col w-72 max-w-xs bg-slate-900 text-white animate-in slide-in-from-left duration-300">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold tracking-wide text-white">
                  Top<span className="text-emerald-400">Attribution</span>
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              <div className="space-y-1">
                <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Navegação
                </span>
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-slate-800 text-emerald-400' 
                          : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-800">
                <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Configurações
                </span>
                {settingsItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-slate-800 text-emerald-400' 
                          : 'text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col gap-2 shrink-0">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSimulatorOpen(true);
                }}
                className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Simular Nova Jornada
              </button>
              
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium transition-all"
              >
                <RefreshCcw className="h-3 w-3" />
                Limpar Todos os Dados
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-850 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg text-xs font-medium transition-all mt-1"
              >
                <LogOut className="h-3 w-3" />
                Sair (Logout)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Drawer overlay */}
      <SimulatorDrawer open={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
    </div>
  );
}
