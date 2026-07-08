import React from "react";
import { HelpCircle, X } from "lucide-react";

export default function InfoBanner() {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center space-x-3 text-slate-600">
        <HelpCircle className="h-5 w-5 text-indigo-500 shrink-0" />
        <div className="text-xs sm:text-sm">
          <span className="font-semibold text-slate-800">Dúvidas sobre o Dashboard?</span>{" "}
          Acompanhe o desempenho de novos contatos e saiba como interpretar a rastreabilidade e as origens de tráfego.
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-slate-400 hover:text-slate-600 transition shrink-0 p-0.5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
