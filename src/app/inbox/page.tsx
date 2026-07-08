// src/app/inbox/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Message, Lead, Conversation } from "../../types";
import { X, Send } from "lucide-react";

/**
 * Inbox page – central de conversas WhatsApp simulada.
 * Mostra a lista de leads com mensagens e permite enviar mensagens que
 * disparam automações configuradas no contexto.
 */
export default function InboxPage() {
  const {
    leads,
    conversations,
    sendMessage,
    selectedCompanyId,
    automationRules,
    companies,
    currentCompany,
  } = useApp();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedLeadId, conversations]);

  const selectedConversation = selectedLeadId
    ? conversations.find((c) => c.leadId === selectedLeadId)
    : undefined;
  const leadInfo = selectedLeadId ? leads.find((l) => l.id === selectedLeadId) : undefined;

  const handleSend = () => {
    if (!selectedLeadId || !newText.trim()) return;
    sendMessage(selectedLeadId, newText.trim(), "outbound");
    setNewText("");
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar de conversas */}
      <aside className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Inbox</h2>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {conversations.map((conv) => {
            const lead = leads.find((l) => l.id === conv.leadId);
            const unread = conv.unreadCount > 0;
            return (
              <li
                key={conv.leadId}
                className={`cursor-pointer px-4 py-3 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedLeadId === conv.leadId ? "bg-gray-200 dark:bg-gray-700" : ""}`}
                onClick={() => setSelectedLeadId(conv.leadId)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {lead?.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{lead?.name ?? "Lead desconhecido"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{lead?.phone}</p>
                </div>
                {unread && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{conv.unreadCount}</span>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Chat area */}
      <section className="flex-1 flex flex-col">
        {selectedConversation && leadInfo ? (
          <>
            <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-white dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {leadInfo.name?.[0] ?? "?"}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{leadInfo.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{leadInfo.phone}</p>
                </div>
              </div>
              <button
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setSelectedLeadId(null)}
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
              {selectedConversation.messages.map((msg: Message) => (
                <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.direction === "outbound" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <span className="block text-xs text-right opacity-75 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Digite sua mensagem…"
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={!newText.trim()}
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
            Selecione uma conversa à esquerda para iniciar o chat.
          </div>
        )}
      </section>
    </div>
  );
}
