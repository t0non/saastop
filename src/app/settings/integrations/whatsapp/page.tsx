// src/app/settings/integrations/whatsapp/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { 
  QrCode, RefreshCw, Key, Shield, Plus, X, CheckCircle, 
  AlertTriangle, Trash2, Power, HelpCircle, AlertCircle 
} from "lucide-react";

interface ConnectionInfo {
  id?: string;
  connection_name: string;
  base_url: string;
  instance_name: string;
  owner_phone: string;
  status: "not_configured" | "creating_instance" | "waiting_qr" | "connecting" | "connected" | "disconnected" | "error";
  connected_at?: string;
  last_health_check_at?: string;
}

export default function WhatsAppIntegrationPage() {
  const [loading, setLoading] = useState(false);
  const [conn, setConn] = useState<ConnectionInfo>({
    connection_name: "",
    base_url: "",
    instance_name: "",
    owner_phone: "",
    status: "not_configured"
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [connectMode, setConnectMode] = useState<"choice" | "existing" | "new">("choice");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrPollingInterval, setQrPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Form states for existing connection
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("https://free.uazapi.com");
  const [formInstance, setFormInstance] = useState("");
  const [formToken, setFormToken] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const fetchConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/connection");
      if (res.ok) {
        const data = await res.json();
        setConn(data);
      }
    } catch (err) {
      console.error("Error loading WhatsApp connection:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load connection on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConnection();
  }, []);

  // Test connection handler
  const handleTestConnection = async () => {
    if (!formName || !formUrl || !formInstance || !formToken) {
      setTestResult({ success: false, msg: "Por favor, preencha todos os campos obrigatórios." });
      return;
    }

    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/connect-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_name: formName,
          base_url: formUrl,
          instance_name: formInstance,
          instance_token: formToken
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ 
          success: true, 
          msg: `Conexão válida. Número conectado: ${data.connection.owner_phone || "Não identificado"}` 
        });
      } else {
        setTestResult({ success: false, msg: data.error || "Não foi possível validar a conexão." });
      }
    } catch (err) {
      setTestResult({ success: false, msg: "Falha na comunicação com o servidor de validação." });
    } finally {
      setLoading(false);
    }
  };

  // Save connection handler
  const handleSaveConnection = async () => {
    if (!testResult || !testResult.success) return;
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/connect-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_name: formName,
          base_url: formUrl,
          instance_name: formInstance,
          instance_token: formToken
        })
      });

      if (res.ok) {
        alert("Instância conectada e salva com sucesso!");
        setModalOpen(false);
        fetchConnection();
        // Force header reload by reloading page or updating context
        window.location.reload();
      }
    } catch (err) {
      alert("Erro ao salvar conexão.");
    } finally {
      setLoading(false);
    }
  };

  // Create new connection workflow (admin token proxy)
  const handleCreateNewConnection = async () => {
    setLoading(true);
    setConnectMode("new");
    try {
      const res = await fetch("/api/whatsapp/create-instance", { method: "POST" });
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Fetch QR Code immediately
        const qrRes = await fetch("/api/whatsapp/qr-code");
        const qrData = await qrRes.json();
        if (qrData.qr) {
          setQrCode(qrData.qr);
        }

        // Start polling connection status
        const interval = setInterval(async () => {
          const checkRes = await fetch("/api/whatsapp/connection");
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.status === "connected") {
              clearInterval(interval);
              setQrPollingInterval(null);
              setModalOpen(false);
              fetchConnection();
              alert("WhatsApp conectado com sucesso!");
              window.location.reload();
            }
          }
        }, 3000);

        setQrPollingInterval(interval);
      } else {
        alert(data.error || "Erro ao criar nova instância.");
        setConnectMode("choice");
      }
    } catch (err) {
      alert("Falha de conexão com a UAZAPI.");
      setConnectMode("choice");
    } finally {
      setLoading(false);
    }
  };

  // Disconnect / Delete connection
  const handleDisconnect = async () => {
    if (!confirm("Deseja realmente desconectar e excluir a configuração de WhatsApp desta organização?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/connection", { method: "DELETE" });
      if (res.ok) {
        setConn({
          connection_name: "",
          base_url: "",
          instance_name: "",
          owner_phone: "",
          status: "not_configured"
        });
        alert("Instância desconectada com sucesso.");
        window.location.reload();
      }
    } catch (err) {
      alert("Erro ao desconectar.");
    } finally {
      setLoading(false);
    }
  };

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollingInterval) clearInterval(qrPollingInterval);
    };
  }, [qrPollingInterval]);

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integração com WhatsApp</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conecte o WhatsApp da sua empresa para receber, acompanhar e responder conversas diretamente pelo sistema.
          </p>
        </div>

        {/* Connection Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-xl">
          <div className="flex items-center space-x-4">
            <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-xl">
              <QrCode className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg">Integração WhatsApp</h3>
              <p className="text-xs text-slate-500 mt-0.5">Conexão via UAZAPI Multi-empresa</p>
            </div>
            
            {/* Status indicator badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold leading-none select-none uppercase ${
              conn.status === "connected" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                : conn.status === "waiting_qr" 
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}>
              {conn.status === "connected" 
                ? "Conectado" 
                : conn.status === "waiting_qr" 
                ? "Aguardando QR Code" 
                : conn.status === "connecting"
                ? "Conectando..."
                : "Desconectado"}
            </span>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6 space-y-4">
            {conn.status === "connected" ? (
              <div className="space-y-4 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Nome da Conexão</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{conn.connection_name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Instância UAZAPI</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{conn.instance_name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Telefone</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">+{conn.owner_phone || "Não identificado"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Última Verificação</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">Agora mesmo</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={fetchConnection}
                    className="px-3.5 py-1.5 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Atualizar Status
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Power className="h-3.5 w-3.5" />
                    Desconectar WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Conecte o número de WhatsApp da sua organização para que as mensagens inbound e outbound de clientes sejam capturadas, permitindo registrar leads comerciais automaticamente.
                </p>
                <button
                  onClick={() => {
                    setConnectMode("choice");
                    setModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition shadow-sm"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Conectar WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MODAL CONECTAR */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col z-10 border border-slate-100">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="font-bold text-slate-800">
                  {connectMode === "choice" ? "Como deseja conectar?" : connectMode === "existing" ? "Conectar Instância Existente" : "Pareamento via QR Code"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                
                {/* 1. Escolha */}
                {connectMode === "choice" && (
                  <div className="grid grid-cols-1 gap-3.5">
                    <button
                      onClick={handleCreateNewConnection}
                      className="p-4 border border-slate-200 rounded-xl hover:border-emerald-500 text-left transition flex items-center space-x-3.5 hover:bg-emerald-50/10 group"
                    >
                      <Plus className="h-6 w-6 text-slate-400 group-hover:text-emerald-500" />
                      <div>
                        <span className="block font-bold text-slate-800 text-sm">Criar Nova Conexão</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">Criar automaticamente uma nova instância WhatsApp no servidor</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setConnectMode("existing")}
                      className="p-4 border border-slate-200 rounded-xl hover:border-emerald-500 text-left transition flex items-center space-x-3.5 hover:bg-emerald-50/10 group"
                    >
                      <Key className="h-6 w-6 text-slate-400 group-hover:text-emerald-500" />
                      <div>
                        <span className="block font-bold text-slate-800 text-sm">Conectar Instância Existente</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">Utilizar credenciais e token de uma instância UAZAPI já ativa</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* 2. Instância Existente */}
                {connectMode === "existing" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Nome da Conexão</label>
                      <input
                        type="text"
                        placeholder="Ex: WhatsApp Comercial"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">URL do Servidor UAZAPI</label>
                      <input
                        type="text"
                        placeholder="Ex: https://free.uazapi.com"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">ID da Instância (Name)</label>
                        <input
                          type="text"
                          placeholder="Ex: minha-clinica"
                          value={formInstance}
                          onChange={(e) => setFormInstance(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Token da Instância</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={formToken}
                          onChange={(e) => setFormToken(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none"
                        />
                      </div>
                    </div>

                    {testResult && (
                      <div className={`p-3 border rounded-xl flex items-start space-x-2 text-xs ${testResult.success ? "bg-emerald-50 text-emerald-800 border-emerald-250" : "bg-rose-50 text-rose-800 border-rose-250"}`}>
                        {testResult.success ? <CheckCircle className="h-4.5 w-4.5 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 shrink-0" />}
                        <span>{testResult.msg}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleTestConnection}
                        disabled={loading}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                      >
                        {loading ? "Testando..." : "Testar Conexão"}
                      </button>
                      {testResult?.success && (
                        <button
                          onClick={handleSaveConnection}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition"
                        >
                          Salvar Conexão
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Nova Conexão (QR Code) */}
                {connectMode === "new" && (
                  <div className="space-y-6 text-center">
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl flex flex-col items-center justify-center min-h-[220px]">
                      {qrCode ? (
                        <>
                          <p className="text-xs text-slate-500 mb-4">Leia o QR Code com o WhatsApp do seu aparelho principal:</p>
                          <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-44 h-44 object-contain" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
                          <span className="text-xs text-slate-500">Preparando conexão...</span>
                        </div>
                      )}
                    </div>

                    <div className="text-left text-xs text-slate-500 bg-slate-50/50 p-4 rounded-xl space-y-2 border border-slate-100">
                      <span className="font-bold text-slate-700 block">Como parear no celular:</span>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>No celular, abra o aplicativo do WhatsApp.</li>
                        <li>Acesse o menu de configurações e clique em <strong>Aparelhos Conectados</strong>.</li>
                        <li>Selecione <strong>Conectar um Aparelho</strong>.</li>
                        <li>Aponte a câmera para ler o QR Code exibido acima.</li>
                      </ol>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer (Choices or disconnect) */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50 rounded-b-2xl">
                {connectMode !== "choice" && (
                  <button
                    onClick={() => setConnectMode("choice")}
                    className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-150 text-slate-700 rounded-lg text-xs font-bold transition"
                  >
                    Voltar
                  </button>
                )}
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-150 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
