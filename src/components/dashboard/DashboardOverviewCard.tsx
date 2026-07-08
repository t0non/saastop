import React from "react";
import StatTile from "./StatTile";
import DonutChartCard from "./DonutChartCard";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface DashboardOverviewCardProps {
  total: number;
  tracked: number;
  untracked: number;
  avgResponseTime: string;
  trackedPct: number;
  untrackedPct: number;
}

export default function DashboardOverviewCard({
  total,
  tracked,
  untracked,
  avgResponseTime,
  trackedPct,
  untrackedPct,
}: DashboardOverviewCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
      
      {/* Header and KPI */}
      <div>
        <h3 className="font-bold text-slate-800 text-base">Visão Geral das Conversas</h3>
        <p className="text-xs text-slate-400 mt-0.5">Indicadores gerais de contatos e rastreabilidade no período.</p>
        
        <div className="mt-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total de Conversas Novas Ativas</span>
          <span className="text-4xl sm:text-5xl font-black text-slate-850 tracking-tight mt-1 block">
            {total}
          </span>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="flex flex-wrap gap-3">
        <StatTile
          title="Conversas Rastreáveis"
          value={tracked}
          pct={trackedPct}
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
        />
        <StatTile
          title="Conversas Não Rastreadas"
          value={untracked}
          pct={untrackedPct}
          icon={<AlertCircle className="h-4.5 w-4.5" />}
        />
        <StatTile
          title="Média 1ª Resposta"
          value={avgResponseTime}
          icon={<Clock className="h-4.5 w-4.5" />}
        />
      </div>

      {/* Donut Chart */}
      <div className="border-t border-slate-100 pt-4">
        <DonutChartCard
          tracked={tracked}
          untracked={untracked}
          total={total}
        />
      </div>

    </div>
  );
}
