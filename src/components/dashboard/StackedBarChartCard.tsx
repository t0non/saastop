import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface DailyTrendItem {
  date: string;
  "Meta Ads": number;
  "Google Ads": number;
  "Outras Origens": number;
  "Não Rastreada": number;
}

interface StackedBarChartCardProps {
  trendData: DailyTrendItem[];
}

export default function StackedBarChartCard({ trendData }: StackedBarChartCardProps) {
  const hasData = trendData.some(
    (d) =>
      d["Meta Ads"] > 0 ||
      d["Google Ads"] > 0 ||
      d["Outras Origens"] > 0 ||
      d["Não Rastreada"] > 0
  );

  return (
    <div className="h-64 w-full">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2e8f0" }}
              cursor={{ fill: "#f8fafc" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
            />
            <Bar dataKey="Meta Ads" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Google Ads" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Outras Origens" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Não Rastreada" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
          <span className="text-xs text-slate-400 font-medium">Ainda não há dados suficientes para exibir o gráfico diário no período selecionado.</span>
        </div>
      )}
    </div>
  );
}
