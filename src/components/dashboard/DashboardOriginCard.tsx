import React from "react";
import SourceStatRow from "./SourceStatRow";
import StackedBarChartCard from "./StackedBarChartCard";
import { MessageSquare, Globe, AlertTriangle, Target } from "lucide-react";

interface DailyTrendItem {
  date: string;
  "Meta Ads": number;
  "Google Ads": number;
  "Outras Origens": number;
  "Não Rastreada": number;
}

interface DashboardOriginCardProps {
  metaAds: number;
  googleAds: number;
  outras: number;
  naoRastreadas: number;
  trendData: DailyTrendItem[];
}

export default function DashboardOriginCard({
  metaAds,
  googleAds,
  outras,
  naoRastreadas,
  trendData,
}: DashboardOriginCardProps) {
  const stats = [
    {
      title: "Meta Ads",
      value: metaAds,
      icon: <MessageSquare className="h-4.5 w-4.5" />,
      colorClass: "text-indigo-600 border-indigo-100",
    },
    {
      title: "Google Ads",
      value: googleAds,
      icon: <Target className="h-4.5 w-4.5" />,
      colorClass: "text-emerald-600 border-emerald-100",
    },
    {
      title: "Outras Origens",
      value: outras,
      icon: <Globe className="h-4.5 w-4.5" />,
      colorClass: "text-purple-600 border-purple-100",
    },
    {
      title: "Não Rastreada",
      value: naoRastreadas,
      icon: <AlertTriangle className="h-4.5 w-4.5" />,
      colorClass: "text-amber-600 border-amber-100",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
      
      {/* Header */}
      <div>
        <h3 className="font-bold text-slate-800 text-base">Origem das Conversas</h3>
        <p className="text-xs text-slate-400 mt-0.5">Distribuição e evolução diária de canais de marketing e conversões.</p>
      </div>

      {/* Mini KPIs */}
      <SourceStatRow stats={stats} />

      {/* Stacked Bar Chart */}
      <div className="border-t border-slate-100 pt-4 flex-1">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução Diária por Origem</h4>
        <StackedBarChartCard trendData={trendData} />
      </div>

    </div>
  );
}
