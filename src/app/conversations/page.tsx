// src/app/conversations/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { mapConversationsToItems, ConversationListItem } from "../../utils/conversationsMapper";
import { LeadStatus, Lead, Source } from "../../types";
import { defaultStages } from "../../utils/mockData";
import { 
  MessageSquare, Eye, Search, Filter, Download, LayoutGrid, List, 
  ChevronDown, User, Clock, X, Check, ShieldAlert, Award, Globe, 
  Settings, ChevronRight, Phone, MessageCircle, AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function ConversationsPage() {
  const { 
    conversations, 
    leads, 
    moveLead,
    selectedCompanyId 
  } = useApp();

  // 1. UI View State
  const [viewMode, setViewMode] = useState<"list" | "columns">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All");
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);
  const [bulkStageTarget, setBulkStageTarget] = useState<LeadStatus | "">("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // 2. Map raw data to operational items
  const allItems = useMemo(() => {
    return mapConversationsToItems(conversations, leads);
  }, [conversations, leads]);

  // Recalcular métricas do cabeçalho baseadas na lista completa
  const metrics = useMemo(() => {
    const total = allItems.length;
    let metaAds = 0;
    let googleAds = 0;
    let otherSources = 0;
    let notTracked = 0;

    allItems.forEach((item) => {
      const src = item.source.toLowerCase();
      if (src.includes("meta") || src.includes("facebook") || src.includes("instagram")) {
        metaAds++;
      } else if (src.includes("google ads") || src.includes("cpc") || src.includes("googleads")) {
        googleAds++;
      } else if (src.includes("não rastreada") || src.includes("desconhecido") || src === "" || src.includes("unknown")) {
        notTracked++;
      } else {
        otherSources++;
      }
    });

    return { total, metaAds, googleAds, otherSources, notTracked };
  }, [allItems]);

  // 3. Aplicar Filtros
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Filtro de Busca (Telefone ou Nome)
      const matchesSearch = 
        item.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.replace(/\D/g, "").includes(searchQuery.replace(/\D/g, "")) ||
        item.phone.includes(searchQuery);

      // Filtro de Origem
      let matchesSource = true;
      if (selectedSource !== "All") {
        if (selectedSource === "Não rastreada") {
          matchesSource = 
            item.source.toLowerCase().includes("não rastreada") || 
            item.source.toLowerCase().includes("unknown") || 
            item.source === "";
        } else {
          matchesSource = item.source.toLowerCase().includes(selectedSource.toLowerCase());
        }
      }

      // Filtro de Etapa
      const matchesStage = selectedStage === "All" || item.stage === selectedStage;

      // Filtro de Aguardando Resposta
      const matchesWaiting = !onlyWaiting || item.waitingFirstResponse;

      return matchesSearch && matchesSource && matchesStage && matchesWaiting;
    });
  }, [allItems, searchQuery, selectedSource, selectedStage, onlyWaiting]);

  // Ordenar: mais recente primeiro por padrão
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [filteredItems]);

  // Paginação
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedItems, currentPage]);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  // Limpar seleção em lote ao mudar filtros ou busca
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedLeadIds([]);
  }, [searchQuery, selectedSource, selectedStage, onlyWaiting]);

  // Resetar página quando mudar filtros
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchQuery, selectedSource, selectedStage, onlyWaiting]);

  // Ações em lote
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(paginatedItems.map((item) => item.leadId));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds((prev) => [...prev, leadId]);
    } else {
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleBulkStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const target = e.target.value as LeadStatus;
    if (!target || selectedLeadIds.length === 0) return;

    if (confirm(`Deseja alterar a etapa comercial de ${selectedLeadIds.length} leads selecionados para "${target}"?`)) {
      selectedLeadIds.forEach((leadId) => {
        moveLead(
          leadId,
          target,
          "manual",
          "Atualização em lote via painel de Conversas"
        );
      });
      alert("Etapas comerciais atualizadas com sucesso!");
      setSelectedLeadIds([]);
      setBulkStageTarget("");
    }
  };

  // Exportar dados em formato CSV simples
  const handleExport = () => {
    const headers = "ID,Contato,Telefone,Origem,Etapa,Primeira Mensagem,Última Mensagem\n";
    const rows = sortedItems.map((item) => (
      `"${item.leadId}","${item.contactName}","${item.phone}","${item.source}","${item.stage}","${item.firstMessageAt}","${item.lastMessageAt}"`
    )).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `conversas_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obter detalhes de atribuição formatados para o Drawer
  const getAttributionIcon = (sourceName: string) => {
    const src = sourceName.toLowerCase();
    if (src.includes("google ads") || src.includes("cpc")) {
      return <Award className="h-5 w-5 text-amber-500 shrink-0" />;
    } else if (src.includes("google")) {
      return <Globe className="h-5 w-5 text-blue-500 shrink-0" />;
    } else if (src.includes("instagram") || src.includes("meta") || src.includes("facebook")) {
      return <MessageSquare className="h-5 w-5 text-pink-500 shrink-0" />;
    }
    return <AlertCircle className="h-5 w-5 text-slate-400 shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      
      {/* 1. CABEÇALHO DE MÉTRICAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-100">
          <div className="p-4 flex items-center space-x-3">
            <div className="bg-slate-100 p-2.5 rounded-lg text-slate-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-bold text-slate-900">{metrics.total}</span>
            </div>
          </div>
          <div className="p-4 flex items-center space-x-3">
            <div className="bg-pink-50 p-2.5 rounded-lg text-pink-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Meta Ads</span>
              <span className="text-2xl font-bold text-slate-900">{metrics.metaAds}</span>
            </div>
          </div>
          <div className="p-4 flex items-center space-x-3">
            <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Google Ads</span>
              <span className="text-2xl font-bold text-slate-900">{metrics.googleAds}</span>
            </div>
          </div>
          <div className="p-4 flex items-center space-x-3">
            <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Outras</span>
              <span className="text-2xl font-bold text-slate-900">{metrics.otherSources}</span>
            </div>
          </div>
          <div className="p-4 flex items-center space-x-3 col-span-2 md:col-span-1">
            <div className="bg-slate-50 p-2.5 rounded-lg text-slate-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Não rastreadas</span>
              <span className="text-2xl font-bold text-slate-900">{metrics.notTracked}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FERRAMENTAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Lado Esquerdo */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          {/* Alternar Visualização */}
          <div className="flex bg-slate-100 rounded-lg p-1 shrink-0 self-start">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("columns")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${viewMode === "columns" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Colunas
            </button>
          </div>

          {/* Campo de Pesquisa */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por telefone ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Filtro de Origem */}
          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white appearance-none transition"
            >
              <option value="All">Todas as Origens</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="Google Orgânico">Google Orgânico</option>
              <option value="Google Perfil">Google Perfil da Empresa</option>
              <option value="Instagram">Instagram</option>
              <option value="Direto">Direto</option>
              <option value="Não rastreada">Não Rastreada</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Lado Direito */}
        <div className="flex flex-wrap gap-2 items-center lg:justify-end">
          
          {/* Filtros Salvos */}
          <div className="relative">
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val === "google_ads") {
                  setSelectedSource("Google Ads");
                  setOnlyWaiting(false);
                } else if (val === "waiting") {
                  setOnlyWaiting(true);
                  setSelectedSource("All");
                } else if (val === "no_tracking") {
                  setSelectedSource("Não rastreada");
                  setOnlyWaiting(false);
                } else if (val === "all") {
                  setSelectedSource("All");
                  setOnlyWaiting(false);
                }
              }}
              className="pl-3 pr-8 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-transparent rounded-lg focus:outline-none appearance-none transition"
            >
              <option value="all">Filtros Salvos</option>
              <option value="google_ads">Leads Google Ads</option>
              <option value="waiting">Aguardando Resposta</option>
              <option value="no_tracking">Não Rastreados</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Exportar */}
          <button
            onClick={handleExport}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Exportar Filtrados"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Ação em lote */}
          {selectedLeadIds.length > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold animate-fade-in">
              <span>{selectedLeadIds.length} selecionados</span>
              <div className="relative">
                <select
                  value={bulkStageTarget}
                  onChange={handleBulkStageChange}
                  className="pl-2 pr-6 py-1 text-xs bg-white border border-emerald-300 rounded text-emerald-800 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Alterar Etapa...</option>
                  {defaultStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1.5 h-3 w-3 text-emerald-600 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. FILTRO RÁPIDO */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOnlyWaiting(!onlyWaiting)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-semibold transition ${onlyWaiting ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}
        >
          <MessageCircle className="h-4 w-4" />
          Conversas aguardando primeira resposta
          {onlyWaiting ? "" : ` (${allItems.filter(i => i.waitingFirstResponse).length})`}
        </button>
      </div>

      {/* 4. VISÃO LISTA (TABELA) */}
      {viewMode === "list" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Tabela Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6 w-12">
                    <input
                      type="checkbox"
                      checked={paginatedItems.length > 0 && selectedLeadIds.length === paginatedItems.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6">Contato</th>
                  <th className="py-4 px-6">Origem</th>
                  <th className="py-4 px-6">Etapa da Jornada</th>
                  <th className="py-4 px-6">Primeira Mensagem</th>
                  <th className="py-4 px-6">Última Mensagem ↓</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => (
                    <tr key={item.leadId} className={`hover:bg-slate-50/50 transition ${item.unreadCount > 0 ? "bg-emerald-50/10 font-medium" : ""}`}>
                      
                      {/* Seleção */}
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(item.leadId)}
                          onChange={(e) => handleSelectLead(item.leadId, e.target.checked)}
                          className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Contato */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm text-xs">
                            {item.contactName[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 block leading-tight">{item.phone}</span>
                              {item.waitingFirstResponse && (
                                <span className="inline-flex h-2 w-2 rounded-full bg-red-500" title="Aguardando resposta" />
                              )}
                              {item.unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white leading-none">
                                  {item.unreadCount}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 block">{item.contactName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Origem */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {getAttributionIcon(item.source)}
                          {item.source}
                        </span>
                      </td>

                      {/* Etapa */}
                      <td className="py-4 px-6">
                        <div className="relative inline-block w-40">
                          <select
                            value={item.stage}
                            onChange={(e) => moveLead(item.leadId, e.target.value as LeadStatus, "manual", "Alteração de etapa na central de conversas")}
                            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none appearance-none cursor-pointer hover:bg-slate-100 transition"
                          >
                            {defaultStages.map((st) => (
                              <option key={st.id} value={st.id}>{st.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                        </div>
                      </td>

                      {/* Primeira Mensagem */}
                      <td className="py-4 px-6">
                        <span className="block text-slate-700 leading-tight">{new Date(item.firstMessageAt).toLocaleDateString()}</span>
                        <span className="text-xs text-slate-400 block">{new Date(item.firstMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </td>

                      {/* Última Mensagem */}
                      <td className="py-4 px-6">
                        <span className="block text-slate-900 font-bold leading-tight">{new Date(item.lastMessageAt).toLocaleDateString()}</span>
                        <span className="text-xs text-slate-500 block">{new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const ld = leads.find((l) => l.id === item.leadId);
                              if (ld) setSelectedLeadForDetails(ld);
                            }}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Ver Detalhes do Lead"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/inbox?leadId=${item.leadId}`}
                            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                            title="Abrir Conversa"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="h-8 w-8 text-slate-300" />
                        <span className="font-semibold text-slate-500">Nenhum registro encontrado</span>
                        <span className="text-xs">As conversas aparecerão aqui quando seus contatos iniciarem atendimento pelo WhatsApp.</span>
                        {searchQuery || selectedSource !== "All" || selectedStage !== "All" || onlyWaiting ? (
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedSource("All");
                              setSelectedStage("All");
                              setOnlyWaiting(false);
                            }}
                            className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Limpar filtros
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tabela Mobile (Cartões) */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <div key={item.leadId} className={`p-4 space-y-3 ${item.unreadCount > 0 ? "bg-emerald-50/10" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                        {item.contactName[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-900 text-sm leading-none">{item.phone}</span>
                          {item.unreadCount > 0 && (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white font-bold">
                              {item.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{item.contactName}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(item.lastMessageAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {getAttributionIcon(item.source)}
                      {item.source}
                    </span>
                    <span className="font-semibold text-slate-500">{item.stage}</span>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        const ld = leads.find((l) => l.id === item.leadId);
                        if (ld) setSelectedLeadForDetails(ld);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 font-medium text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detalhes
                    </button>
                    <Link
                      href={`/inbox?leadId=${item.leadId}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 text-white font-medium text-xs shadow-sm"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">Nenhuma conversa encontrada.</div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
              <span className="text-xs text-slate-500">Mostrando {paginatedItems.length} de {sortedItems.length} conversas</span>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                >
                  Anterior
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. VISÃO COLUNAS (KANBAN) */}
      {viewMode === "columns" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {defaultStages.slice(0, 4).map((stage) => {
            const stageItems = sortedItems.filter((i) => i.stage === stage.id);
            return (
              <div key={stage.id} className="bg-slate-100 rounded-xl p-3 flex flex-col min-w-[280px] h-[550px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">{stage.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{stageItems.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-none">
                  {stageItems.length > 0 ? (
                    stageItems.map((item) => (
                      <div key={item.leadId} className="bg-white rounded-lg border border-slate-200 shadow-sm p-3.5 space-y-3 hover:border-slate-300 transition duration-200">
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight text-sm">{item.phone}</span>
                          <span className="text-xs text-slate-500 block mt-0.5">{item.contactName}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            {getAttributionIcon(item.source)}
                            {item.source}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              const ld = leads.find((l) => l.id === item.leadId);
                              if (ld) setSelectedLeadForDetails(ld);
                            }}
                            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Ver Detalhes"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            href={`/inbox?leadId=${item.leadId}`}
                            className="p-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm"
                            title="Abrir Chat"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs py-8">
                      Nenhum lead nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. SLIDE-OVER LEAD DETAILS DRAWER */}
      {selectedLeadForDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLeadForDetails(null)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 h-full">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Detalhes do Lead</h3>
                  <p className="text-xs text-slate-500">Histórico e atribuição operacional</p>
                </div>
                <button
                  onClick={() => setSelectedLeadForDetails(null)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Informações Principais */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {selectedLeadForDetails.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{selectedLeadForDetails.name}</h4>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedLeadForDetails.phone}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa</span>
                      <span className="text-sm font-bold text-slate-700 mt-0.5 block">{selectedLeadForDetails.stage}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temperatura</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mt-1 ${selectedLeadForDetails.temperature === 'Quente' ? 'bg-red-50 text-red-700' : selectedLeadForDetails.temperature === 'Morno' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {selectedLeadForDetails.temperature}
                      </span>
                    </div>
                    <div className="mt-3 col-span-2 border-t border-slate-200/80 pt-3">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Estimado</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {selectedLeadForDetails.revenue > 0 
                          ? `R$ ${selectedLeadForDetails.revenue.toLocaleString()}` 
                          : `R$ ${selectedLeadForDetails.value.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Atribuição & Rastreamento */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atribuição & Tracking</h5>
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3.5">
                    <div className="flex items-start space-x-3">
                      {getAttributionIcon(selectedLeadForDetails.trackingSession?.source || "Não rastreada")}
                      <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">Origem de Entrada</span>
                        <span className="text-sm font-bold text-slate-900 mt-1 block">
                          {selectedLeadForDetails.trackingSession?.source || "Não rastreada"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-3.5 grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">Campanha</span>
                        <span className="text-xs font-medium text-slate-700 truncate block mt-0.5">
                          {selectedLeadForDetails.trackingSession?.campaign || "Sem Campanha"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">Termo chave</span>
                        <span className="text-xs font-medium text-slate-700 truncate block mt-0.5">
                          {selectedLeadForDetails.trackingSession?.term || "Não identificado"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Histórico da Jornada */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico de Passagem</h5>
                  <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-5">
                    {selectedLeadForDetails.history && selectedLeadForDetails.history.map((hist, index) => (
                      <div key={hist.id} className="relative">
                        <div className="absolute -left-[23px] top-1 bg-white border-2 border-slate-300 rounded-full h-3 w-3 flex items-center justify-center" />
                        <div>
                          <span className="text-xs font-bold text-slate-900">{hist.stageName}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{new Date(hist.movedAt).toLocaleString()}</span>
                          {hist.reason && (
                            <span className="block text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 border border-slate-100 rounded-md">
                              &quot;{hist.reason}&quot;
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                <Link
                  href={`/inbox?leadId=${selectedLeadForDetails.id}`}
                  onClick={() => setSelectedLeadForDetails(null)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-lg shadow transition"
                >
                  <MessageSquare className="h-4.5 w-4.5" />
                  Ir para Atendimento
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
