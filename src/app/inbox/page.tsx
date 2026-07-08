// src/app/inbox/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { UserResponse, PostgrestSingleResponse } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import { NormalizedChat, NormalizedMessage } from "@/integrations/uazapi/types";
import { 
  X, Send, RefreshCw, AlertCircle, Phone, User, MessageSquare, 
  Search, ShieldAlert, CheckCheck, HelpCircle, Loader2
} from "lucide-react";

export default function InboxPage() {
  const supabase = getBrowserClient();

  // Active user/organization state
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  // UI state
  const [chats, setChats] = useState<NormalizedChat[]>([]);
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newText, setNewText] = useState("");

  // Loading states
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Pagination states
  const [chatOffset, setChatOffset] = useState(0);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  // Deduplication cache
  const displayedMessageIdsRef = useRef<Set<string>>(new Set());

  // Ref to chat window scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store connection status for the page
  const [whatsappStatus, setWhatsappStatus] = useState<string>("unknown");

  useEffect(() => {
    supabase.auth.getUser().then((res: UserResponse) => {
      const user = res.data?.user;
      if (user) {
        const orgId = user.user_metadata?.organization_id || user.app_metadata?.organization_id || "empresa-1";
        setActiveOrgId(orgId);
      }
    });
  }, [supabase]);

  // 2. Fetch list of chats from backend endpoint
  const loadChats = async (append = false) => {
    if (append) {
      setLoadingMoreChats(true);
    } else {
      setLoadingChats(true);
      setChatOffset(0);
    }
    const currentOffset = append ? chatOffset : 0;
    try {
      console.log(`[BOOT_05_INBOX_RENDER] Fetching chats offset=${currentOffset}`);
      const res = await fetch(`/api/whatsapp/chats?limit=50&offset=${currentOffset}`);
      const data = await res.json();
      if (res.ok && data.status === "success") {
        const newChats = data.chats || [];
        if (append) {
          setChats(prev => [...prev, ...newChats]);
        } else {
          setChats(newChats);
        }
        setHasMoreChats(newChats.length === 50);
        setChatOffset(currentOffset + newChats.length);

        // Also fetch connection state from status endpoint
        if (!append) {
          const statusRes = await fetch("/api/whatsapp/status");
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setWhatsappStatus(statusData.status || "disconnected");
          }
        }
      } else {
        if (data.code === "PROVIDER_OFFLINE") {
          setWhatsappStatus("disconnected");
        }
        if (!append) setChats([]);
        setHasMoreChats(false);
      }
    } catch (err) {
      console.error("Error loading chats:", err);
      if (!append) setWhatsappStatus("error");
    } finally {
      setLoadingChats(false);
      setLoadingMoreChats(false);
    }
  };

  useEffect(() => {
    if (activeOrgId) {
      const t = setTimeout(() => {
        loadChats();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [activeOrgId]);

  // 3. Handle query parameters (e.g. ?leadId=xyz) to auto-select chat
  useEffect(() => {
    if (!activeOrgId) return;

    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("leadId") || params.get("id");

    if (leadId) {
      // Resolve phone from Lead
      supabase
        .from("leads")
        .select(`
          id,
          contact:contacts (
            phone_normalized,
            name
          )
        `)
        .eq("id", leadId)
        .maybeSingle()
        .then((res: PostgrestSingleResponse<unknown>) => {
          const lead = res.data as Record<string, unknown> | null;
          const error = res.error;
          if (error || !lead || !lead.contact) return;
          const contact = lead.contact as { phone_normalized: string | null; name: string | null } | null;
          if (!contact) return;
          const phone = contact.phone_normalized;
          if (phone) {
            const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
            setSelectedChatId(jid);

            // Add virtual chat to list if not present
            setChats(prev => {
              if (prev.some(c => c.chatId === jid)) return prev;
              const newChat: NormalizedChat = {
                chatId: jid,
                name: contact.name || phone,
                whatsappName: "",
                phone: phone,
                avatarUrl: "",
                lastMessagePreview: "Nova conversa iniciada pelo CRM",
                lastMessageAt: new Date().toISOString(),
                unreadCount: 0,
                isGroup: false,
                archived: false,
                pinned: false
              };
              return [newChat, ...prev];
            });
          }
        });
    }
  }, [activeOrgId, supabase]);

  // 4. Fetch message history for selected chat
  const loadMessages = async (chatId: string) => {
    setLoadingMessages(true);
    setHasMoreMessages(true);
    displayedMessageIdsRef.current.clear();
    try {
      const res = await fetch(`/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages?limit=50&offset=0`);
      const data = await res.json();
      if (res.ok && data.status === "success") {
        const rawMsgs: NormalizedMessage[] = data.messages || [];
        // Revert messages to chronological order (oldest first)
        const chronMsgs = [...rawMsgs].reverse();
        
        // Cache IDs
        chronMsgs.forEach(m => displayedMessageIdsRef.current.add(m.id));

        setMessages(chronMsgs);
        setHasMoreMessages(data.hasMore);
        
        // Mark chat as read locally
        setChats(prev => prev.map(c => c.chatId === chatId ? { ...c, unreadCount: 0 } : c));
        
        // Scroll to bottom
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 100);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedChatId) {
      const t = setTimeout(() => {
        loadMessages(selectedChatId);
      }, 0);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setMessages([]);
      }, 0);
      displayedMessageIdsRef.current.clear();
      return () => clearTimeout(t);
    }
  }, [selectedChatId]);

  // 5. Scroll-up dynamic pagination
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (!selectedChatId || loadingMoreMessages || !hasMoreMessages) return;

    const container = e.currentTarget;
    if (container.scrollTop === 0) {
      setLoadingMoreMessages(true);
      const prevScrollHeight = container.scrollHeight;

      // Filter out optimistic temporary messages from the offset count
      const dbMessagesCount = messages.filter(m => !m.id.startsWith("temp-")).length;

      try {
        const res = await fetch(
          `/api/whatsapp/chats/${encodeURIComponent(selectedChatId)}/messages?limit=50&offset=${dbMessagesCount}`
        );
        const data = await res.json();

        if (res.ok && data.status === "success") {
          const rawMsgs: NormalizedMessage[] = data.messages || [];
          const newChronMsgs = [...rawMsgs].reverse();

          // Filter out duplicates
          const filtered = newChronMsgs.filter(m => !displayedMessageIdsRef.current.has(m.id));
          filtered.forEach(m => displayedMessageIdsRef.current.add(m.id));

          if (filtered.length > 0) {
            setMessages(prev => [...filtered, ...prev]);
          }
          setHasMoreMessages(data.hasMore);

          // Restore scroll position so user experience is smooth
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          });
        }
      } catch (err) {
        console.error("Error loading older messages:", err);
      } finally {
        setLoadingMoreMessages(false);
      }
    }
  };

  // 6. Realtime incoming messages (Broadcast subscription)
  useEffect(() => {
    if (!activeOrgId) return;

    const channel = supabase.channel(`whatsapp:${activeOrgId}`);
    
    channel
      .on("broadcast", { event: "new_message" }, ({ payload }: { payload: NormalizedMessage & { avatarUrl?: string } }) => {
        if (!payload) return;

        // 1. Deduplicate
        if (displayedMessageIdsRef.current.has(payload.id)) {
          return;
        }

        // 2. Add to messages list if chat is currently open
        const isCurrent = payload.chatId === selectedChatId;
        if (isCurrent) {
          displayedMessageIdsRef.current.add(payload.id);
          setMessages(prev => {
            // Extra safety check
            if (prev.some(m => m.id === payload.id)) return prev;
            return [...prev, payload];
          });

          // Scroll to bottom
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
          }, 100);
        }

        // 3. Update chat preview/order in sidebar
        setChats(prevChats => {
          const chatIdx = prevChats.findIndex(c => c.chatId === payload.chatId);
          const shouldIncrementUnread = payload.direction === "inbound" && !isCurrent;

          if (chatIdx !== -1) {
            const existing = prevChats[chatIdx];
            const updated: NormalizedChat = {
              ...existing,
              lastMessagePreview: payload.text || `[Mensagem]`,
              lastMessageAt: payload.timestamp,
              unreadCount: shouldIncrementUnread ? existing.unreadCount + 1 : existing.unreadCount
            };
            return [updated, ...prevChats.filter(c => c.chatId !== payload.chatId)];
          } else {
            const newChat: NormalizedChat = {
              chatId: payload.chatId,
              name: payload.senderName || payload.chatId.split("@")[0],
              whatsappName: payload.senderName || "",
              phone: payload.chatId.split("@")[0].replace(/\D/g, ""),
              avatarUrl: payload.avatarUrl || "",
              lastMessagePreview: payload.text || `[Mensagem]`,
              lastMessageAt: payload.timestamp,
              unreadCount: shouldIncrementUnread ? 1 : 0,
              isGroup: false,
              archived: false,
              pinned: false
            };
            return [newChat, ...prevChats];
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrgId, selectedChatId, supabase]);

  // 7. Sending manual message (Optimistic update + API call)
  const handleSend = async () => {
    if (!selectedChatId || !newText.trim() || sending) return;
    const textToSend = newText.trim();
    setNewText("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: NormalizedMessage = {
      id: tempId,
      chatId: selectedChatId,
      direction: "outbound",
      type: "text",
      text: textToSend,
      timestamp: new Date().toISOString(),
      senderName: "Você",
      status: "sending",
      mediaUrl: ""
    };

    // Optimistic insert into state
    displayedMessageIdsRef.current.add(tempId);
    setMessages(prev => [...prev, optimisticMsg]);

    // Move open chat to top in sidebar
    setChats(prevChats => {
      const idx = prevChats.findIndex(c => c.chatId === selectedChatId);
      if (idx !== -1) {
        const existing = prevChats[idx];
        const updated: NormalizedChat = {
          ...existing,
          lastMessagePreview: textToSend,
          lastMessageAt: optimisticMsg.timestamp
        };
        return [updated, ...prevChats.filter(c => c.chatId !== selectedChatId)];
      }
      return prevChats;
    });

    // Scroll to bottom
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 50);

    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChatId, text: textToSend })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Swap tempId with final provider messageId
        const finalId = data.messageId;
        displayedMessageIdsRef.current.delete(tempId);
        displayedMessageIdsRef.current.add(finalId);

        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, id: finalId, status: "sent" } : m)
        );
      } else {
        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m)
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m)
      );
    } finally {
      setSending(false);
    }
  };

  // Filtered chats based on search
  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const selectedChat = chats.find(c => c.chatId === selectedChatId);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in font-sans">
        
        {/* SIDEBAR: Chats List */}
        <aside className="w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Inbox</h2>
              <button 
                onClick={() => loadChats()} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                title="Sincronizar conversas"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-slate-200 rounded-lg outline-none transition"
              />
            </div>

            {/* Connection badge */}
            <div className="flex items-center justify-between text-[10px] pt-1">
              <span className="font-semibold text-slate-400 uppercase tracking-wide">Status Conexão</span>
              <span className={`inline-flex items-center gap-1 font-bold ${
                whatsappStatus === "connected" ? "text-emerald-600" : "text-rose-500 animate-pulse"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${whatsappStatus === "connected" ? "bg-emerald-500" : "bg-rose-500"}`} />
                {whatsappStatus === "connected" ? "Online" : "Desconectado"}
              </span>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-150/60 scrollbar-thin">
            {loadingChats ? (
              <div className="p-6 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                <span className="text-xs">Sincronizando chats...</span>
              </div>
            ) : filteredChats.length > 0 ? (
              filteredChats.map((chat) => {
                const isSelected = chat.chatId === selectedChatId;
                const hasUnread = chat.unreadCount > 0;
                return (
                  <div
                    key={chat.chatId}
                    onClick={() => setSelectedChatId(chat.chatId)}
                    className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition relative ${
                      isSelected ? "bg-slate-100/90 border-l-4 border-emerald-500" : ""
                    } ${hasUnread ? "bg-emerald-50/10" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {chat.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={chat.avatarUrl} 
                          alt={chat.name} 
                          className="w-10 h-10 rounded-full object-cover border border-slate-250"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                          {chat.name[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Chat details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-sm truncate">{chat.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {chat.lastMessageAt 
                            ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""
                          }
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 truncate block mt-0.5">{chat.phone ? `+${chat.phone}` : ""}</span>
                      <p className={`text-xs mt-1 truncate ${hasUnread ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                        {chat.lastMessagePreview || "Nova conversa"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : whatsappStatus !== "connected" ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">Conecte um WhatsApp</p>
                <p className="text-[10px] leading-relaxed">Para visualizar suas conversas, conecte um número na página de Integrações.</p>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <AlertCircle className="h-6 w-6 text-slate-350 mx-auto" />
                <p className="text-xs font-semibold">Nenhum chat encontrado</p>
                <p className="text-[10px]">Nenhuma conversa foi encontrada na conta conectada.</p>
              </div>
            )}

            {/* Load more chats button */}
            {hasMoreChats && !loadingChats && filteredChats.length > 0 && (
              <div className="p-3 border-t border-slate-200">
                <button
                  onClick={() => loadChats(true)}
                  disabled={loadingMoreChats}
                  className="w-full text-xs text-emerald-600 hover:text-emerald-700 font-semibold py-2 px-3 rounded-lg hover:bg-emerald-50 transition disabled:opacity-50"
                >
                  {loadingMoreChats ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                    </span>
                  ) : (
                    "Carregar mais conversas"
                  )}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* CHAT CONTAINER: Messages History */}
        <section className="flex-1 flex flex-col bg-slate-50 relative">
          {selectedChatId && selectedChat ? (
            <>
              {/* Chat Header */}
              <header className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm shadow-slate-100/50">
                <div className="flex items-center gap-3">
                  {selectedChat.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedChat.avatarUrl} 
                      alt={selectedChat.name} 
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {selectedChat.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{selectedChat.name}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Phone className="h-3 w-3" />
                      <span>{selectedChat.phone ? `+${selectedChat.phone}` : ""}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedChatId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  title="Fechar conversa"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              {/* Messages Container */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin"
              >
                {/* Loader when scrolling up */}
                {loadingMoreMessages && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                  </div>
                )}

                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    <span className="text-xs">Carregando histórico...</span>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === "outbound";
                    const isTemp = msg.id.startsWith("temp-");
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-md px-4 py-2.5 rounded-2xl shadow-sm text-sm relative border ${
                          isOutbound 
                            ? "bg-emerald-600 border-emerald-600 text-white rounded-tr-none" 
                            : "bg-white border-slate-200 text-slate-800 rounded-tl-none"
                        }`}>
                          {!isOutbound && msg.senderName && (
                            <span className="block text-[10px] font-bold text-slate-400 mb-1">
                              {msg.senderName}
                            </span>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 opacity-70 text-[9px]">
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isOutbound && (
                              isTemp ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : msg.status === "failed" ? (
                                <span className="text-rose-200 font-bold">Falhou</span>
                              ) : (
                                <CheckCheck className="h-3 w-3 text-emerald-200" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                    <MessageSquare className="h-8 w-8 text-slate-300" />
                    <p className="text-xs font-semibold">Nenhuma mensagem nesta conversa</p>
                    <p className="text-[10px]">Envie uma mensagem abaixo para iniciar.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Footer */}
              <footer className="px-6 py-4 border-t border-slate-200 bg-white flex items-center gap-3 shrink-0 shadow-lg shadow-slate-100/50">
                <input
                  type="text"
                  placeholder="Digite sua mensagem aqui..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  disabled={whatsappStatus !== "connected" || loadingMessages}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 text-xs border border-slate-200 hover:border-slate-350 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition disabled:bg-slate-50 disabled:border-slate-150"
                />
                <button
                  onClick={handleSend}
                  disabled={!newText.trim() || whatsappStatus !== "connected" || loadingMessages}
                  className="p-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition shadow-md shadow-emerald-500/10 shrink-0"
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-4 w-4" />
                </button>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 text-slate-400 p-6 text-center space-y-3">
              <div className="p-4 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                <MessageSquare className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Selecione uma conversa</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Selecione qualquer contato na lista lateral para carregar o histórico de mensagens e responder em tempo real.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
