import { Lead, Conversation, Source, Message } from "@/types";

export interface DashboardMetrics {
  totalConversas: number;
  conversasRastreadas: number;
  conversasRastreadasPct: number;
  conversasNaoRastreadas: number;
  conversasNaoRastreadasPct: number;
  tempoMedioPrimeiraResposta: string;
  origens: {
    metaAds: number;
    googleAds: number;
    outras: number;
    naoRastreadas: number;
  };
  trendByDay: Array<{
    date: string;
    "Meta Ads": number;
    "Google Ads": number;
    "Outras Origens": number;
    "Não Rastreada": number;
  }>;
}

export function getDashboardMetrics(
  leads: Lead[],
  conversations: Conversation[],
  companyId: string,
  period: string,
  selectedSource: string
): DashboardMetrics {
  // 1. Filter leads by organization
  let filtered = leads.filter((lead) => lead.companyId === companyId);

  // 2. Filter leads by period
  const now = new Date();
  let daysLimit = 30; // default to 30 days

  if (period !== "all") {
    const parsed = parseInt(period, 10);
    if (!isNaN(parsed)) {
      daysLimit = parsed;
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - daysLimit);
      filtered = filtered.filter((lead) => new Date(lead.createdAt) >= cutoff);
    }
  }

  // 3. Filter leads by selected source category (from UI selector)
  if (selectedSource !== "Todas as Origens") {
    filtered = filtered.filter((lead) => {
      const src = lead.trackingSession?.source as string | undefined;
      if (selectedSource === "Não Rastreada") {
        return !lead.trackingSession;
      }
      if (selectedSource === "Meta Ads") {
        return src === "Meta Ads" || src === "Instagram" || src === "Facebook";
      }
      if (selectedSource === "Google Perfil da Empresa") {
        return src === "Google Perfil" || src === "Google Perfil da Empresa";
      }
      if (selectedSource === "Outras Origens") {
        return (
          lead.trackingSession &&
          src !== "Google Ads" &&
          src !== "Meta Ads" &&
          src !== "Instagram" &&
          src !== "Facebook" &&
          src !== "Google Orgânico" &&
          src !== "Google Search" &&
          src !== "Google Perfil" &&
          src !== "Google Perfil da Empresa" &&
          src !== "Direto"
        );
      }
      return src === selectedSource;
    });
  }

  // 4. Calculate Tracked vs. Untracked
  let conversasRastreadas = 0;
  let conversasNaoRastreadas = 0;

  filtered.forEach((lead) => {
    if (lead.trackingSession) {
      conversasRastreadas++;
    } else {
      conversasNaoRastreadas++;
    }
  });

  const totalConversas = filtered.length;
  const conversasRastreadasPct = totalConversas > 0 ? (conversasRastreadas / totalConversas) * 100 : 0;
  const conversasNaoRastreadasPct = totalConversas > 0 ? (conversasNaoRastreadas / totalConversas) * 100 : 0;

  // 5. Calculate Average Response Time
  let totalResponseTimeMs = 0;
  let responseCount = 0;

  filtered.forEach((lead) => {
    const conv = conversations.find((c) => c.leadId === lead.id);
    if (!conv || !conv.messages || conv.messages.length === 0) return;

    // Find first inbound message
    const firstInbound = conv.messages.find((m) => m.direction === "inbound");
    if (!firstInbound) return;

    const inboundTime = new Date(firstInbound.timestamp).getTime();

    // Find first outbound message sent AFTER the first inbound
    const firstOutboundAfter = conv.messages.find(
      (m) => m.direction === "outbound" && new Date(m.timestamp).getTime() > inboundTime
    );

    if (firstOutboundAfter) {
      const outboundTime = new Date(firstOutboundAfter.timestamp).getTime();
      totalResponseTimeMs += outboundTime - inboundTime;
      responseCount++;
    }
  });

  let tempoMedioPrimeiraResposta = "Sem respostas";
  if (responseCount > 0) {
    const avgMs = totalResponseTimeMs / responseCount;
    const avgMinutes = Math.round(avgMs / 60000);
    if (avgMinutes < 60) {
      tempoMedioPrimeiraResposta = `${avgMinutes} min`;
    } else {
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      tempoMedioPrimeiraResposta = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  }

  // 6. Aggregate counts by origin categories
  let metaAdsCount = 0;
  let googleAdsCount = 0;
  let outrasCount = 0;
  let naoRastreadasCount = 0;

  filtered.forEach((lead) => {
    if (!lead.trackingSession) {
      naoRastreadasCount++;
      return;
    }

    const src = lead.trackingSession.source as string;
    if (src === "Google Ads") {
      googleAdsCount++;
    } else if (src === "Meta Ads" || src === "Instagram" || src === "Facebook") {
      metaAdsCount++;
    } else {
      outrasCount++;
    }
  });

  // 7. Calculate daily trend
  const trendMap: Record<
    string,
    {
      "Meta Ads": number;
      "Google Ads": number;
      "Outras Origens": number;
      "Não Rastreada": number;
    }
  > = {};

  // Build daily slots for selected period
  const trendDays = period === "all" ? 15 : daysLimit;
  
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    trendMap[dateStr] = {
      "Meta Ads": 0,
      "Google Ads": 0,
      "Outras Origens": 0,
      "Não Rastreada": 0,
    };
  }

  // Populate daily slots with actual leads/conversations
  filtered.forEach((lead) => {
    const dateObj = new Date(lead.createdAt);
    const dateStr = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    if (trendMap[dateStr]) {
      if (!lead.trackingSession) {
        trendMap[dateStr]["Não Rastreada"]++;
        return;
      }

      const src = lead.trackingSession.source as string;
      if (src === "Google Ads") {
        trendMap[dateStr]["Google Ads"]++;
      } else if (src === "Meta Ads" || src === "Instagram" || src === "Facebook") {
        trendMap[dateStr]["Meta Ads"]++;
      } else {
        trendMap[dateStr]["Outras Origens"]++;
      }
    }
  });

  const trendByDay = Object.entries(trendMap).map(([date, val]) => ({
    date,
    ...val,
  }));

  return {
    totalConversas,
    conversasRastreadas,
    conversasRastreadasPct,
    conversasNaoRastreadas,
    conversasNaoRastreadasPct,
    tempoMedioPrimeiraResposta,
    origens: {
      metaAds: metaAdsCount,
      googleAds: googleAdsCount,
      outras: outrasCount,
      naoRastreadas: naoRastreadasCount,
    },
    trendByDay,
  };
}
