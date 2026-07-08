'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Share2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Se o Supabase não estiver configurado, simula um login e redireciona (modo mock)
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh(); // força reload para o middleware não bugar
      }, 800);
      return;
    }

    try {
      const supabase = getBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh(); // Importante para o middleware pegar os cookies
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-500/20 p-3 rounded-xl mb-4 border border-emerald-500/30">
              <Share2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Top<span className="text-emerald-400">Attribution</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 text-center">
              Faça login para acessar o painel de rastreamento de leads.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-500 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Modo Mock Ativado.</strong> O Supabase não está configurado. O login será simulado e você será redirecionado automaticamente sem validação de credenciais.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-500 text-sm font-medium">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl py-3 px-4 transition-colors flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar no Painel
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
        </div>
        
        <p className="text-center text-slate-500 text-xs mt-6">
          Desenvolvido com padrão Proto-SaaS.
        </p>
      </div>
    </div>
  );
}
