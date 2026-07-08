import React from "react";

interface StatTileProps {
  title: string;
  value: string | number;
  pct?: number;
  icon: React.ReactNode;
}

export default function StatTile({ title, value, pct, icon }: StatTileProps) {
  return (
    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex items-center space-x-3 flex-1 min-w-[130px]">
      <div className="text-indigo-500 shrink-0 p-1.5 bg-white rounded-lg border border-slate-100">
        {icon}
      </div>
      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="flex items-baseline space-x-1.5 mt-0.5">
          <span className="text-base font-extrabold text-slate-800 tracking-tight">{value}</span>
          {pct !== undefined && (
            <span className="text-[10px] font-semibold text-slate-400">
              {pct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
