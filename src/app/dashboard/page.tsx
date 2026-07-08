// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { getDashboardMetrics } from "@/services/dashboardService";
import InfoBanner from "@/components/dashboard/InfoBanner";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardOverviewCard from "@/components/dashboard/DashboardOverviewCard";
import DashboardOriginCard from "@/components/dashboard/DashboardOriginCard";
import { Calendar, HelpCircle } from "lucide-react";

export default function Dashboard() {
  const { currentCompany, leads, conversations } = useApp();
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState("30");
  const [source, setSource] = useState("Todas as Origens");
  const [loading, setLoading] = useState(true);

  // Avoid Recharts hydration errors
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Simulate loading on period/source change
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [period, source]);

  // Aggregate metrics using service
  const metrics = getDashboardMetrics(
    leads,
    conversations,
    currentCompany.id,
    period,
    source
  );

  // Export report to CSV
  const handleExport = () => {
    try {
      const csvRows = [
        ["Métrica", "Valor"],
        ["Organização", currentCompany.name],
        ["Período (Dias)", period === "all" ? "Todo o Período" : period],
        ["Filtro de Origem", source],
        ["Total de Conversas Novas Ativas", metrics.totalConversas],
        ["Conversas Rastreáveis", `${metrics.conversasRastreadas} (${metrics.conversasRastreadasPct.toFixed(2)}%)`],
        ["Conversas Não Rastreadas", `${metrics.conversasNaoRastreadas} (${metrics.conversasNaoRastreadasPct.toFixed(2)}%)`],
        ["Tempo Médio de 1ª Resposta", metrics.tempoMedioPrimeiraResposta],
        ["Meta Ads Volume", metrics.origens.metaAds],
        ["Google Ads Volume", metrics.origens.googleAds],
        ["Outras Origens Volume", metrics.origens.outras],
        ["Não Rastreada Volume", metrics.origens.naoRastreadas],
      ];

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `dashboard_report_${currentCompany.name.toLowerCase().replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error exporting dashboard CSV report:", e);
      alert("Erro ao gerar arquivo CSV.");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Início → Dashboard</div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Dashboard do Cliente {currentCompany.name}
            </h1>
          </div>
        </div>

        {/* Info Banner */}
        <InfoBanner />

        {/* Filters */}
        <DashboardFilters
          period={period}
          setPeriod={setPeriod}
          source={source}
          setSource={setSource}
          onExport={handleExport}
        />

        {/* Loading / Content Render */}
        {!mounted || loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Overview Skeleton */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="space-y-3 pt-4">
                <div className="h-24 bg-slate-55/40 rounded-xl" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-16 bg-slate-55/40 rounded-xl" />
                  <div className="h-16 bg-slate-55/40 rounded-xl" />
                  <div className="h-16 bg-slate-55/40 rounded-xl" />
                </div>
              </div>
              <div className="h-40 bg-slate-55/40 rounded-xl pt-4" />
            </div>

            {/* Origin Skeleton */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="h-16 bg-slate-55/40 rounded-xl" />
                <div className="h-16 bg-slate-55/40 rounded-xl" />
                <div className="h-16 bg-slate-55/40 rounded-xl" />
                <div className="h-16 bg-slate-55/40 rounded-xl" />
              </div>
              <div className="h-48 bg-slate-55/40 rounded-xl pt-4" />
            </div>

          </div>
        ) : metrics.totalConversas === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
            <HelpCircle className="h-12 w-12 text-slate-350" />
            <h3 className="font-bold text-slate-800 text-base">Nenhum dado encontrado</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Ainda não há dados suficientes para exibir o desempenho do período e origem selecionados.
            </p>
          </div>
        ) : (
          /* Dashboard Content */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Left Card: Overview */}
            <DashboardOverviewCard
              total={metrics.totalConversas}
              tracked={metrics.conversasRastreadas}
              untracked={metrics.conversasNaoRastreadas}
              avgResponseTime={metrics.tempoMedioPrimeiraResposta}
              trackedPct={metrics.conversasRastreadasPct}
              untrackedPct={metrics.conversasNaoRastreadasPct}
            />

            {/* Right Card: Origins */}
            <DashboardOriginCard
              metaAds={metrics.origens.metaAds}
              googleAds={metrics.origens.googleAds}
              outras={metrics.origens.outras}
              naoRastreadas={metrics.origens.naoRastreadas}
              trendData={metrics.trendByDay}
            />

          </div>
        )}

      </div>
    </Layout>
  );
}
