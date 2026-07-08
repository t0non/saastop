// src/app/contacts/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { UserResponse } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import { NormalizedContact } from "@/integrations/uazapi/types";
import { 
  Search, User, Phone, MessageSquare, AlertCircle, 
  Loader2, RefreshCw, ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function ContactsPage() {
  const supabase = getBrowserClient();

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<NormalizedContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contactOffset, setContactOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<string>("unknown");
  const [totalDeviceContacts, setTotalDeviceContacts] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then((res: UserResponse) => {
      const user = res.data?.user;
      if (user) {
        const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id;
        setActiveOrgId(orgId || null);
      }
    });
  }, [supabase]);

  const loadContacts = async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setContactOffset(0);
    }
    const currentOffset = append ? contactOffset : 0;

    try {
      console.log(`[CONTACTS_04_RENDER] Fetching contacts offset=${currentOffset}`);
      const res = await fetch(`/api/whatsapp/contacts?limit=100&offset=${currentOffset}&scope=all`);
      const data = await res.json();

      if (res.ok && data.status === "success") {
        const newContacts: NormalizedContact[] = data.contacts || [];
        if (append) {
          setContacts(prev => [...prev, ...newContacts]);
        } else {
          setContacts(newContacts);
          setWhatsappStatus("connected");
        }
        setHasMore(newContacts.length === 100);
        setContactOffset(currentOffset + newContacts.length);
        if (data.totalDeviceContacts != null) {
          setTotalDeviceContacts(data.totalDeviceContacts);
        }
      } else {
        if (data.status === "disconnected" || data.status === "not_configured") {
          setWhatsappStatus(data.status);
        }
        if (!append) {
          setContacts([]);
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Error loading contacts:", err);
      if (!append) setWhatsappStatus("error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (activeOrgId) {
      loadContacts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q.replace(/\D/g, ""))
    );
  }, [contacts, searchQuery]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-6 px-4 animate-fade-in font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Contatos</h1>
            <p className="text-sm text-slate-500 mt-1">
              {whatsappStatus === "connected"
                ? `${contacts.length} contatos carregados${totalDeviceContacts != null ? ` de ${totalDeviceContacts} no dispositivo` : ""}`
                : "Contatos do WhatsApp conectado"
              }
            </p>
          </div>
          <button
            onClick={() => loadContacts()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-10 pr-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl outline-none transition shadow-sm"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="text-sm">Carregando contatos...</span>
          </div>
        ) : whatsappStatus !== "connected" ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <AlertCircle className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Conecte um WhatsApp</p>
            <p className="text-xs text-slate-500 text-center max-w-sm">
              Para visualizar seus contatos, conecte um número WhatsApp na página de Integrações.
            </p>
            <Link
              href="/settings/integrations/whatsapp"
              className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition shadow-sm"
            >
              Ir para Integrações
            </Link>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
            <User className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              {searchQuery ? "Nenhum contato encontrado" : "Nenhum contato disponível"}
            </p>
            <p className="text-xs text-slate-500">
              {searchQuery ? "Tente buscar por outro nome ou telefone." : "Seus contatos aparecerão aqui após a sincronização."}
            </p>
          </div>
        ) : (
          <>
            {/* Contacts List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredContacts.map((contact) => {
                const chatJid = contact.jid;
                return (
                  <div
                    key={contact.jid}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {contact.name[0]?.toUpperCase() || "?"}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-slate-800 block truncate">
                          {contact.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-500 truncate">
                            {contact.phone ? `+${contact.phone}` : contact.jid}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <Link
                      href={`/inbox?chatId=${encodeURIComponent(chatJid)}`}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium opacity-0 group-hover:opacity-100 transition shrink-0"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Conversar
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && !searchQuery && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => loadContacts(true)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                    </span>
                  ) : (
                    "Carregar mais contatos"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
