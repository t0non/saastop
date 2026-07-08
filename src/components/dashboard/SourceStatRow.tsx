import React from "react";

interface SourceStat {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}

interface SourceStatRowProps {
  stats: SourceStat[];
}

export default function SourceStatRow({ stats }: SourceStatRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex items-center space-x-3 hover:border-slate-350 transition duration-150"
        >
          <div className={`p-1.5 rounded-lg border bg-white shrink-0 ${stat.colorClass}`}>
            {stat.icon}
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.title}</span>
            <span className="text-base font-extrabold text-slate-800 mt-0.5 block">{stat.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
