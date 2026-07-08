'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useApp } from '@/context/AppContext';
import { defaultStages } from '@/utils/mockData';
import { AutomationRule, LeadStatus, ConversionType } from '@/types';
import { Zap, Plus, ToggleLeft, ToggleRight, Trash2, HelpCircle, X } from 'lucide-react';

export default function Automations() {
  const { currentCompany, automationRules, updateAutomationRuleStatus, createAutomationRule, restoreDemoData } = useApp();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [direction, setDirection] = useState<'message_received' | 'message_sent'>('message_sent');
  const [phrase, setPhrase] = useState('');
  const [targetStage, setTargetStage] = useState<LeadStatus>('Agendado');
  const [registerConversion, setRegisterConversion] = useState<boolean>(false);
  const [conversionType, setConversionType] = useState<ConversionType>('Agendamento');
  const [convValue, setConvValue] = useState<number>(150);

  // Filtra regras da empresa selecionada (ou regras gerais mockadas)
  // Nota: no nosso context, algumas regras iniciais são compartilhadas ou salvas por empresa
  const companyRules = automationRules.filter(r => r.companyId === currentCompany.id);

  const handleToggleStatus = (rule: AutomationRule) => {
    const nextStatus = rule.status === 'active' ? 'inactive' : 'active';
    updateAutomationRuleStatus(rule.id, nextStatus);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !phrase) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    createAutomationRule({
      name: ruleName,
      event: direction,
      contains: phrase.toLowerCase().trim(),
      action: 'move_lead',
      targetStage,
      registerConversion: registerConversion ? conversionType : undefined,
      conversionValue: registerConversion ? convValue : undefined,
      status: 'active',
      companyId: currentCompany.id
    });

    // Reset Form
    setRuleName('');
    setPhrase('');
    setDirection('message_sent');
    setTargetStage('Agendado');
    setRegisterConversion(false);
    setModalOpen(false);

    alert('Regra de automação cadastrada e ativa com sucesso!');
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Regras de Automação</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gatilhos de texto que analisam conversas do WhatsApp em tempo real e atualizam o funil comercial.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 self-start sm:self-center"
          >
            <Plus className="h-4.5 w-4.5" />
            Criar Nova Regra
          </button>
        </div>

        {/* Explain alert */}
        <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 text-xs text-emerald-800 flex items-start gap-2.5 leading-relaxed">
          <HelpCircle className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <strong>Como testar a automação?</strong> Vá na <strong>Inbox (Chat)</strong>, selecione um lead em atendimento e envie uma mensagem de operador que contenha uma das frases-gatilho configuradas (ex: <i>&quot;agendamento confirmado&quot;</i>). O sistema processará a mensagem e moverá o lead de estágio imediatamente, recalculando os dashboards.
          </div>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companyRules.length > 0 ? (
            companyRules.map((rule) => {
              const directionLabel = rule.event === 'message_sent' 
                ? 'Outbound (Operador envia)' 
                : 'Inbound (Cliente responde)';

              return (
                <div 
                  key={rule.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                    rule.status === 'inactive' ? 'border-slate-200 opacity-65' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          rule.status === 'inactive' ? 'bg-slate-100 text-slate-455' : 'bg-emerald-55 text-emerald-600'
                        }`}>
                          <Zap className="h-4 w-4" />
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">{rule.name}</h3>
                      </div>
                      
                      {/* Toggle status switch */}
                      <button 
                        onClick={() => handleToggleStatus(rule)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {rule.status === 'active' ? (
                          <ToggleRight className="h-7 w-7 text-emerald-500 fill-current" />
                        ) : (
                          <ToggleLeft className="h-7 w-7 text-slate-350" />
                        )}
                      </button>
                    </div>

                    {/* Condition details */}
                    <div className="mt-4 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Evento de Gatilho</span>
                        <span className="font-bold text-slate-700 block mt-0.5">{directionLabel}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Condição (Frase contém)</span>
                        <span className="font-bold text-slate-800 block mt-0.5 bg-slate-100 px-2 py-1 rounded w-fit font-mono">
                          {rule.contains}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Ação Executada</span>
                        <span className="font-bold text-slate-700 block mt-0.5">
                          Mover lead para: <strong className="text-indigo-600 font-semibold">{rule.targetStage}</strong>
                        </span>
                      </div>
                      {rule.registerConversion && (
                        <div>
                          <span className="text-slate-400 block font-medium">Conversão Registrada</span>
                          <span className="font-bold text-emerald-600 block mt-0.5 bg-emerald-55 border border-emerald-100 px-1.5 py-0.5 rounded w-fit">
                            {rule.registerConversion} {rule.conversionValue ? `(R$ ${rule.conversionValue})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px]">
                    <span className={`font-semibold uppercase tracking-wider ${
                      rule.status === 'active' ? 'text-emerald-600' : 'text-slate-455'
                    }`}>
                      {rule.status === 'active' ? 'Ativo e Monitorando' : 'Desativado'}
                    </span>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              Nenhuma regra de automação personalizada ativa para esta empresa.
            </div>
          )}
        </div>

      </div>

      {/* Modal Criar Regra */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="font-extrabold text-base">Nova Regra de Automação</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Nome da Regra</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Confirmação de Consulta"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Direção da Mensagem</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as 'message_received' | 'message_sent')}
                  className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500 bg-white"
                >
                  <option value="message_sent">Outbound (Mensagem enviada pelo Atendente)</option>
                  <option value="message_received">Inbound (Mensagem recebida do Cliente)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Frase-Gatilho (Contém termo)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: agendamento confirmado"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500"
                />
                <p className="text-[9px] text-slate-400 mt-1">A correspondência ignora maiúsculas/minúsculas.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Mover para Estágio</label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value as LeadStatus)}
                    className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-55 focus:border-emerald-500 bg-white"
                  >
                    {defaultStages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-655">
                    <input
                      type="checkbox"
                      checked={registerConversion}
                      onChange={(e) => setRegisterConversion(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-400 h-4 w-4"
                    />
                    Registrar Conversão?
                  </label>
                </div>
              </div>

              {registerConversion && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-slate-550 font-bold uppercase tracking-wider mb-1">Tipo de Conversão</label>
                    <select
                      value={conversionType}
                      onChange={(e) => setConversionType(e.target.value as ConversionType)}
                      className="w-full text-xs border border-slate-250 rounded-lg px-2 py-1.5 outline-none bg-white"
                    >
                      <option value="Lead">Lead (Abertura)</option>
                      <option value="Agendamento">Agendamento</option>
                      <option value="Comparecimento">Comparecimento</option>
                      <option value="Venda">Venda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-550 font-bold uppercase tracking-wider mb-1">Valor Atribuído (R$)</label>
                    <input
                      type="number"
                      value={convValue}
                      onChange={(e) => setConvValue(parseInt(e.target.value) || 0)}
                      className="w-full text-xs border border-slate-250 rounded-lg px-2 py-1.5 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-350 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-md transition-all animate-pulse"
                >
                  Ativar Regra
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
