import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DonutChartCardProps {
  tracked: number;
  untracked: number;
  total: number;
}

const COLORS = ["#10b981", "#f59e0b"]; // Tracked (Emerald), Untracked (Amber)

export default function DonutChartCard({ tracked, untracked, total }: DonutChartCardProps) {
  const data = [
    { name: "Rastreadas", value: tracked },
    { name: "Não Rastreadas", value: untracked },
  ].filter((d) => d.value > 0);

  const trackedPct = total > 0 ? (tracked / total) * 100 : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
      {/* Chart container */}
      <div className="h-40 w-40 relative shrink-0">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === "Rastreadas" ? COLORS[0] : COLORS[1]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2e8f0" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value} conversas`, "Quantidade"]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full border-4 border-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
            Sem dados
          </div>
        )}
        
        {/* Center Text overlay */}
        {total > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-slate-800 leading-none">{trackedPct.toFixed(0)}%</span>
            <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 tracking-wider">Rastreadas</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5 text-xs">
        <div className="flex items-center space-x-2.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[0] }} />
          <div>
            <span className="font-semibold text-slate-700 block leading-none">Rastreadas</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{tracked} conversas ({trackedPct.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[1] }} />
          <div>
            <span className="font-semibold text-slate-700 block leading-none">Não Rastreadas</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{untracked} conversas ({(total > 0 ? (untracked / total) * 100 : 0).toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
