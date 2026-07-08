// src/app/settings/integrations/whatsapp/page.tsx
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { 
  QrCode, RefreshCw, Key, Shield, Plus, X, CheckCircle, 
  AlertTriangle, Trash2, Power, HelpCircle, AlertCircle, Phone, Copy
} from "lucide-react";

interface ConnectionInfo {
  id?: string;
  connection_name: string;
  base_url: string;
  instance_name: string;
  owner_phone: string;
  status: "not_configured" | "creating_instance" | "waiting_qr" | "waiting_pair_code" | "connecting" | "connected" | "disconnected" | "error";
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
  const [flowStatus, setFlowStatus] = useState<"idle" | "creating_instance" | "waiting_method" | "waiting_qr" | "waiting_pair_code" | "connecting" | "connected" | "error">("idle");
  const [pairingSubStep, setPairingSubStep] = useState<"none" | "phone_input">("none");
  const [isExistingPairing, setIsExistingPairing] = useState(false);

  const [qrImageSrc, setQrImageSrc] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrPollingInterval, setQrPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Form states for phone pairing
  const [dddVal, setDddVal] = useState("");
  const [phoneVal, setPhoneVal] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states for existing connection
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("https://free.uazapi.com");
  const [formInstance, setFormInstance] = useState("");
  const [formToken, setFormToken] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; status?: string; msg: string } | null>(null);

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
    fetchConnection();
  }, []);

  // Test connection handler for existing instances
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
      if (res.ok && data.ok) {
        if (data.status === "connected") {
          setTestResult({ 
            success: true, 
            status: "connected",
            msg: `Conexão válida e ativa. Número conectado: ${data.phone ? `+${data.phone}` : "Não identificado"}` 
          });
        } else {
          setTestResult({ 
            success: true, 
            status: "disconnected",
            msg: `Instância configurada e salva, mas está desconectada no servidor UAZAPI.` 
          });
        }
      } else {
        setTestResult({ success: false, msg: data.message || data.error || "Não foi possível validar a conexão." });
      }
    } catch (err) {
      setTestResult({ success: false, msg: "Falha na comunicação com o servidor de validação." });
    } finally {
      setLoading(false);
    }
  };

  // Save connection handler for existing instances (already validated & connected)
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

      const data = await res.json();
      if (res.ok && data.ok) {
        alert("Instância conectada e salva com sucesso!");
        setModalOpen(false);
        fetchConnection();
        window.location.reload();
      } else {
        alert(data.message || data.error || "Erro ao salvar conexão.");
      }
    } catch (err) {
      alert("Erro ao salvar conexão.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger pairing for existing connection that is disconnected
  const handlePairExisting = async (method: "qr" | "pairing") => {
    setLoading(true);
    try {
      const saveRes = await fetch("/api/whatsapp/connect-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_name: formName,
          base_url: formUrl,
          instance_name: formInstance,
          instance_token: formToken
        })
      });
      const data = await saveRes.json();
      if (!saveRes.ok || !data.ok) {
        alert(data.message || data.error || "Erro ao salvar conexão temporária.");
        return;
      }
    } catch {
      alert("Erro ao salvar conexão temporária.");
      return;
    } finally {
      setLoading(false);
    }

    setConnectMode("new");
    setIsExistingPairing(true);

    if (method === "qr") {
      setFlowStatus("creating_instance");
      setQrImageSrc(null);
      setQrError(null);
      try {
        const res = await fetch("/api/whatsapp/create-instance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "qr", use_existing: true })
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          await fetchStatus();
          startStatusPolling();
        } else {
          setFlowStatus("error");
          setQrError(resData.error || "Erro ao gerar QR Code.");
        }
      } catch {
        setFlowStatus("error");
        setQrError("Erro de comunicação com o servidor.");
      }
    } else {
      setFlowStatus("waiting_method");
      setPairingSubStep("phone_input");
    }
  };

  // Consulta nosso endpoint interno GET /api/whatsapp/status
  const fetchStatus = async (): Promise<string> => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();

      if (data.status === "connected") {
        setFlowStatus("connected");
        setQrImageSrc(null);
        return "connected";
      }

      if (data.status === "waiting_qr" && data.qrImageSrc) {
        setFlowStatus("waiting_qr");
        setQrImageSrc(data.qrImageSrc);
        setQrError(null);
        return "waiting_qr";
      }

      if (data.status === "waiting_pair_code") {
        setFlowStatus("waiting_pair_code");
        setQrImageSrc(null);
        setQrError(null);
        return "waiting_pair_code";
      }

      if (data.status === "connecting") {
        setFlowStatus("connecting");
        setQrImageSrc(null);
        setQrError(null);
        return "connecting";
      }

      setFlowStatus("error");
      setQrError(data.message || "Não foi possível sincronizar o status da instância.");
      setQrImageSrc(null);
      return "error";
    } catch {
      setFlowStatus("error");
      setQrError("Falha na comunicação com o servidor.");
      setQrImageSrc(null);
      return "error";
    }
  };

  // Polling a cada 3s, timeout de 2 minutos
  const startStatusPolling = () => {
    if (qrPollingInterval) clearInterval(qrPollingInterval);
    const startTime = Date.now();
    const TIMEOUT_MS = 2 * 60 * 1000;

    const interval = setInterval(async () => {
      if (Date.now() - startTime > TIMEOUT_MS) {
        clearInterval(interval);
        setQrPollingInterval(null);
        setFlowStatus("error");
        setQrError("Tempo limite de pareamento excedido. Tente novamente.");
        return;
      }

      const result = await fetchStatus();

      if (result === "connected") {
        clearInterval(interval);
        setQrPollingInterval(null);
        setTimeout(() => {
          setModalOpen(false);
          fetchConnection();
          window.location.reload();
        }, 2000);
      } else if (result === "error") {
        clearInterval(interval);
        setQrPollingInterval(null);
      }
    }, 3000);

    setQrPollingInterval(interval);
  };

  // Nova conexão: chama POST /api/whatsapp/create-instance
  const handleConnectNew = async (method: "qr" | "pairing", phoneStr?: string) => {
    setLoading(true);
    setFlowStatus("creating_instance");
    setQrImageSrc(null);
    setQrError(null);
    try {
      const res = await fetch("/api/whatsapp/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          phone: phoneStr,
          use_existing: isExistingPairing
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (method === "pairing") {
          setPairCode(data.pairCode || null);
          setFlowStatus("waiting_pair_code");
          startStatusPolling();
        } else {
          await fetchStatus();
          startStatusPolling();
        }
      } else {
        setFlowStatus("error");
        setQrError(data.error || "Erro ao iniciar pareamento.");
      }
    } catch {
      setFlowStatus("error");
      setQrError("Falha de conexão com a UAZAPI.");
    } finally {
      setLoading(false);
    }
  };

  // Submit phone pairing form
  const handleSubmitPhonePairing = () => {
    setPhoneError(null);
    const cleanDdd = dddVal.replace(/\D/g, "");
    const cleanPhone = phoneVal.replace(/\D/g, "");

    if (cleanDdd.length !== 2) {
      setPhoneError("DDD deve conter exatamente 2 dígitos.");
      return;
    }
    if (cleanPhone.length < 8 || cleanPhone.length > 9) {
      setPhoneError("Telefone inválido (deve ter 8 ou 9 dígitos).");
      return;
    }

    const fullPhone = "55" + cleanDdd + cleanPhone;
    handleConnectNew("pairing", fullPhone);
  };

  // Retry logic
  const handleRetryConnection = () => {
    if (pairingSubStep === "phone_input" || flowStatus === "waiting_pair_code") {
      const cleanDdd = dddVal.replace(/\D/g, "");
      const cleanPhone = phoneVal.replace(/\D/g, "");
      const fullPhone = "55" + cleanDdd + cleanPhone;
      handleConnectNew("pairing", fullPhone);
    } else {
      handleConnectNew("qr");
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

  // Copy pairing code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollingInterval) clearInterval(qrPollingInterval);
    };
  }, [qrPollingInterval]);

  // Clean up states when modal closes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!modalOpen) {
      if (qrPollingInterval) clearInterval(qrPollingInterval);
      setQrPollingInterval(null);
      setFlowStatus("idle");
      setPairingSubStep("none");
      setIsExistingPairing(false);
      setPairCode(null);
      setQrImageSrc(null);
      setDddVal("");
      setPhoneVal("");
      setPhoneError(null);
      setTestResult(null);
    }
  }, [modalOpen, qrPollingInterval]);

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
                : (conn.status === "waiting_qr" || conn.status === "waiting_pair_code")
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : conn.status === "connecting"
                ? "bg-blue-50 text-blue-700 border border-blue-100"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}>
              {conn.status === "connected" 
                ? "Conectado" 
                : conn.status === "waiting_qr" 
                ? "Aguardando QR Code" 
                : conn.status === "waiting_pair_code"
                ? "Aguardando Código"
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
                    <span className="font-semibold text-slate-800 mt-0.5 block">{conn.owner_phone ? `+${conn.owner_phone}` : "Não identificado"}</span>
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
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition shadow-sm animate-pulse"
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
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col z-10 border border-slate-100 overflow-hidden max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">
                  {connectMode === "choice" 
                    ? "Conectar WhatsApp" 
                    : connectMode === "existing" 
                    ? "Conectar Instância Existente" 
                    : flowStatus === "waiting_qr"
                    ? "Pareamento via QR Code"
                    : flowStatus === "waiting_pair_code"
                    ? "Código de Pareamento"
                    : "Conectando WhatsApp"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                
                {/* 1. Tela de Escolha Inicial */}
                {connectMode === "choice" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">Escolha como deseja conectar o WhatsApp da sua empresa.</p>
                    <div className="grid grid-cols-1 gap-3.5">
                      <button
                        onClick={() => {
                          setConnectMode("new");
                          setFlowStatus("waiting_method");
                        }}
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
                  </div>
                )}

                {/* 2. Instância Existente Form */}
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
                      <div className="mt-2">
                        {testResult.success ? (
                          testResult.status === "connected" ? (
                            <div className="p-3 border rounded-xl flex items-start space-x-2 text-xs bg-emerald-50 text-emerald-800 border-emerald-250">
                              <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
                              <span>{testResult.msg}</span>
                            </div>
                          ) : (
                            <div className="p-3 border rounded-xl flex flex-col space-y-3 text-xs bg-amber-50 text-amber-800 border-amber-250">
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                                <span>{testResult.msg}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handlePairExisting("qr")}
                                  className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition"
                                >
                                  Gerar QR Code
                                </button>
                                <button
                                  onClick={() => handlePairExisting("pairing")}
                                  className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition"
                                >
                                  Gerar Código de Pareamento
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="p-3 border rounded-xl flex items-start space-x-2 text-xs bg-rose-50 text-rose-800 border-rose-250">
                            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
                            <span>{testResult.msg}</span>
                          </div>
                        )}
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
                      {testResult?.success && testResult.status === "connected" && (
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

                {/* 3. Fluxo de Pareamento de Nova Instância (Novo ou Existente) */}
                {connectMode === "new" && (
                  <div className="space-y-6">

                    {/* SELEÇÃO DO MÉTODO DE CONEXÃO */}
                    {flowStatus === "waiting_method" && pairingSubStep === "none" && (
                      <div className="space-y-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Como você deseja conectar?</span>
                        <div className="grid grid-cols-1 gap-3.5">
                          
                          {/* QR Code */}
                          <div className="p-5 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 bg-slate-50/50">
                            <div>
                              <span className="block font-bold text-slate-800 text-base">QR Code</span>
                              <span className="text-xs text-slate-500 block mt-1">Leia um QR Code pelo aplicativo do WhatsApp para conectar o aparelho.</span>
                            </div>
                            <button
                              onClick={() => handleConnectNew("qr")}
                              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition"
                            >
                              Conectar com QR Code
                            </button>
                          </div>

                          {/* Código de Pareamento */}
                          <div className="p-5 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 bg-slate-50/50">
                            <div>
                              <span className="block font-bold text-slate-800 text-base">Código de Pareamento</span>
                              <span className="text-xs text-slate-500 block mt-1">Informe o número do WhatsApp e conecte usando um código de pareamento.</span>
                            </div>
                            <button
                              onClick={() => setPairingSubStep("phone_input")}
                              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition"
                            >
                              Usar Código de Pareamento
                            </button>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* FORMULÁRIO DE TELEFONE (CÓDIGO DE PAREAMENTO) */}
                    {flowStatus === "waiting_method" && pairingSubStep === "phone_input" && (
                      <div className="space-y-4 text-left">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Informe o Número do WhatsApp</span>
                        <p className="text-xs text-slate-500">Digite o DDD e o número do celular comercial que deseja conectar.</p>
                        
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="w-1/3">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">País</label>
                              <input
                                type="text"
                                readOnly
                                value="Brasil +55"
                                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-500 outline-none"
                              />
                            </div>
                            <div className="w-1/4">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">DDD</label>
                              <input
                                type="text"
                                placeholder="31"
                                value={dddVal}
                                onChange={(e) => setDddVal(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none text-center font-semibold"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Telefone</label>
                              <input
                                type="text"
                                placeholder="99999-9999"
                                value={phoneVal}
                                onChange={(e) => setPhoneVal(e.target.value.replace(/\D/g, "").slice(0, 9))}
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none font-semibold"
                              />
                            </div>
                          </div>

                          {/* Visual format help */}
                          {dddVal && phoneVal && (
                            <p className="text-[10px] text-emerald-600 font-semibold text-right">
                              Formatado: +55 ({dddVal}) {phoneVal.length > 5 ? `${phoneVal.slice(0, 5)}-${phoneVal.slice(5)}` : phoneVal}
                            </p>
                          )}

                          {phoneError && (
                            <div className="p-2 bg-rose-50 text-rose-800 border border-rose-250 rounded-lg text-xs flex items-center space-x-1.5">
                              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                              <span>{phoneError}</span>
                            </div>
                          )}

                          <button
                            onClick={handleSubmitPhonePairing}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition mt-2 shadow-sm"
                          >
                            Gerar Código de Pareamento
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LOADER: Criando Instância */}
                    {flowStatus === "creating_instance" && (
                      <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[220px] space-y-4">
                        <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-700">Preparando conexão...</p>
                          <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos.</p>
                        </div>
                      </div>
                    )}

                    {/* LOADER: Finalizando Conexão */}
                    {flowStatus === "connecting" && (
                      <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[220px] space-y-4">
                        <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-700">QR Code lido!</p>
                          <p className="text-xs text-slate-400 mt-1">Finalizando conexão e registrando no sistema...</p>
                        </div>
                      </div>
                    )}

                    {/* TELA QR CODE */}
                    {flowStatus === "waiting_qr" && qrImageSrc && (
                      <div className="space-y-5 text-center">
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[260px]">
                          <p className="text-xs text-slate-500 mb-4 font-medium">Leia o QR Code com o aplicativo WhatsApp do seu celular comercial:</p>
                          <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-sm">
                            <img
                              src={qrImageSrc}
                              alt="QR Code para conectar WhatsApp"
                              width={220}
                              height={220}
                              className="object-contain"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1 justify-center">
                            <RefreshCw className="h-3 w-3 animate-spin text-slate-300" />
                            O QR Code será renovado automaticamente.
                          </p>
                        </div>

                        {/* Instruções */}
                        <div className="text-left text-xs text-slate-500 bg-slate-50/50 p-4 rounded-xl space-y-2 border border-slate-100">
                          <span className="font-bold text-slate-700 block">Como parear no celular:</span>
                          <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                            <li>Abra o aplicativo do WhatsApp no celular.</li>
                            <li>Acesse <strong>Aparelhos Conectados</strong> nas configurações.</li>
                            <li>Toque em <strong>Conectar Aparelho</strong>.</li>
                            <li>Aponte a câmera para ler o QR Code exibido.</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* TELA CÓDIGO DE PAREAMENTO (PAIR CODE) */}
                    {flowStatus === "waiting_pair_code" && pairCode && (
                      <div className="space-y-5 text-center animate-fade-in">
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Código de Pareamento</span>
                          
                          {/* Code Display Box */}
                          <div className="my-6 bg-slate-900 text-emerald-400 text-3xl font-mono tracking-widest px-8 py-4 rounded-xl border border-slate-800 shadow-inner select-all">
                            {pairCode}
                          </div>

                          <button
                            onClick={() => handleCopyCode(pairCode)}
                            className="px-4 py-2 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-2"
                          >
                            {copied ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 animate-scale-up" />
                                <span className="text-emerald-600">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Código</span>
                              </>
                            )}
                          </button>

                          {dddVal && phoneVal && (
                            <p className="text-xs text-slate-500 mt-4">
                              Enviado para o número: <strong className="text-slate-700">+55 ({dddVal}) {phoneVal}</strong>
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 justify-center">
                            <RefreshCw className="h-3 w-3 animate-spin text-slate-300" />
                            Aguardando vinculação do aparelho...
                          </p>
                        </div>

                        {/* Instruções */}
                        <div className="text-left text-xs text-slate-500 bg-slate-50/50 p-4 rounded-xl space-y-2 border border-slate-100">
                          <span className="font-bold text-slate-700 block">Como conectar usando o código:</span>
                          <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
                            <li>No celular, abra o WhatsApp.</li>
                            <li>Acesse <strong>Aparelhos Conectados</strong> nas configurações.</li>
                            <li>Toque em <strong>Conectar Aparelho</strong>.</li>
                            <li>Abaixo do leitor de QR, toque em <strong>Conectar com número de telefone</strong> (Link with phone number instead).</li>
                            <li>Digite o código de 8 caracteres exibido acima no seu celular.</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* ESTADO CONECTADO */}
                    {flowStatus === "connected" && (
                      <div className="bg-emerald-50 border border-emerald-250 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[220px] space-y-3">
                        <div className="bg-emerald-500/10 p-4 rounded-full">
                          <CheckCircle className="h-12 w-12 text-emerald-600 animate-bounce" />
                        </div>
                        <p className="text-base font-bold text-emerald-800">WhatsApp conectado com sucesso!</p>
                        <p className="text-xs text-emerald-600">Finalizando e atualizando o painel...</p>
                      </div>
                    )}

                    {/* ESTADO ERRO */}
                    {flowStatus === "error" && (
                      <div className="bg-rose-50 border border-rose-250 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[220px] space-y-4">
                        <div className="bg-rose-500/10 p-3.5 rounded-full">
                          <AlertCircle className="h-10 w-10 text-rose-500" />
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-bold text-rose-800">Falha na conexão</p>
                          {qrError && <p className="text-xs text-rose-600 max-w-xs">{qrError}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRetryConnection}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Tentar novamente
                          </button>
                          <button
                            onClick={() => {
                              setFlowStatus("waiting_method");
                              setPairingSubStep("none");
                            }}
                            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition"
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50">
                {connectMode !== "choice" && flowStatus === "waiting_method" && (
                  <button
                    onClick={() => {
                      if (pairingSubStep === "phone_input") {
                        setPairingSubStep("none");
                        setPhoneError(null);
                      } else {
                        setConnectMode("choice");
                      }
                    }}
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
