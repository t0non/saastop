import React from "react";
import { Download, Calendar, Filter } from "lucide-react";

interface DashboardFiltersProps {
  period: string;
  setPeriod: (period: string) => void;
  source: string;
  setSource: (source: string) => void;
  onExport: () => void;
}

export default function DashboardFilters({
  period,
  setPeriod,
  source,
  setSource,
  onExport,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
      <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
        
        {/* Period filter */}
        <div className="relative flex-1 sm:max-w-[200px]">
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer font-medium"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todo o período</option>
          </select>
        </div>

        {/* Source filter */}
        <div className="relative flex-1 sm:max-w-[240px]">
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer font-medium"
          >
            <option value="Todas as Origens">Todas as Origens</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Meta Ads">Meta Ads</option>
            <option value="Google Orgânico">Google Orgânico</option>
            <option value="Google Perfil da Empresa">Google Perfil da Empresa</option>
            <option value="Direto">Direto</option>
            <option value="Outras Origens">Outras Origens</option>
            <option value="Não Rastreada">Não Rastreada</option>
          </select>
        </div>

      </div>

      {/* Export button */}
      <button
        onClick={onExport}
        className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        Baixar Relatório
      </button>

    </div>
  );
}
