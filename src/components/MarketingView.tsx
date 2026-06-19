/**
 * MarketingView — aba "Marketing" (só admin).
 * Gerencia a sincronização dos contatos (leads do Firestore) com o
 * Hostinger Reach (email marketing). Sem planilhas — fonte é o Firestore.
 *
 * Endpoints (server.ts):
 *  - GET  /api/reach/groups      → lista grupos do Reach (confirma token ok)
 *  - POST /api/reach/sync-all    → empurra todos os leads do Firestore pro Reach
 */
import React, { useState } from 'react';
import { Megaphone, RefreshCw, CheckCircle2, AlertTriangle, Users, Send } from 'lucide-react';
import { auth } from '../lib/firebase';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado.');
  const token = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(url, { ...init, headers });
}

interface SyncResult { total: number; enviados: number; jaExistiam: number; falhas: number; erros?: any[]; }

export default function MarketingView() {
  const [checking, setChecking] = useState(false);
  const [tokenOk, setTokenOk] = useState<boolean | null>(null);
  const [tokenMsg, setTokenMsg] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  // Campanha (Resend)
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');
  const [enviandoCamp, setEnviandoCamp] = useState(false);
  const [campResult, setCampResult] = useState<{ total: number; enviados: number; falhas: number } | null>(null);
  const [campError, setCampError] = useState('');

  const checarConexao = async () => {
    setChecking(true); setTokenOk(null); setTokenMsg('');
    try {
      const r = await authedFetch('/api/reach/groups');
      const b = await r.json().catch(() => ({}));
      if (r.ok) { setTokenOk(true); setTokenMsg('Conectado ao Hostinger Reach com sucesso.' + (typeof b?.totalNaPrimeiraPagina === 'number' ? ` (${b.totalNaPrimeiraPagina} contatos na 1ª página)` : '')); }
      else {
        setTokenOk(false);
        let diag = '';
        if (b?.diagnostico) {
          const d = b.diagnostico;
          diag = ` | Diagnóstico — reach:${d.reach?.status} profiles:${d.profiles?.status} domains:${d.domains?.status} billing:${d.billing?.status}`;
        }
        const partes = [b?.error, b?.dica].filter(Boolean);
        setTokenMsg((partes.join('  ·  ') || `Falha (HTTP ${r.status}).`) + diag);
      }
    } catch (e: any) {
      setTokenOk(false); setTokenMsg(e?.message || 'Erro de conexão.');
    } finally { setChecking(false); }
  };

  const sincronizarTodos = async () => {
    if (!window.confirm('Enviar TODOS os contatos do banco de dados para o Hostinger Reach?\n\nIsso roda em lote e pode levar alguns minutos se a lista for grande.')) return;
    setSyncing(true); setResult(null); setError('');
    try {
      const r = await authedFetch('/api/reach/sync-all', { method: 'POST' });
      const b = await r.json().catch(() => ({}));
      if (r.ok) setResult(b);
      else setError(b?.error || `Falha (HTTP ${r.status}).`);
    } catch (e: any) {
      setError(e?.message || 'Erro ao sincronizar.');
    } finally { setSyncing(false); }
  };

  const enviarCampanha = async () => {
    if (!assunto.trim() || !corpo.trim()) { setCampError('Preencha o assunto e o texto.'); return; }
    if (!window.confirm(`Enviar esta campanha para TODOS os contatos cadastrados?\n\nAssunto: ${assunto}`)) return;
    setEnviandoCamp(true); setCampResult(null); setCampError('');
    try {
      const r = await authedFetch('/api/campanha/enviar', {
        method: 'POST',
        body: JSON.stringify({ assunto: assunto.trim(), corpo: corpo.trim() }),
      });
      const b = await r.json().catch(() => ({}));
      if (r.ok) { setCampResult(b); setAssunto(''); setCorpo(''); }
      else setCampError(b?.error || `Falha (HTTP ${r.status}).`);
    } catch (e: any) {
      setCampError(e?.message || 'Erro ao enviar.');
    } finally { setEnviandoCamp(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-sm text-gray-500">E-mail marketing dos seus leads via Hostinger Reach.</p>
        </div>
      </div>

      {/* Conexão */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
        <h2 className="font-semibold text-gray-900 mb-1">1. Conexão com o Hostinger Reach</h2>
        <p className="text-sm text-gray-500 mb-4">Confirma que o token (variável <code className="px-1 bg-gray-100 rounded">HOSTINGER_API_TOKEN</code> no Railway) está válido.</p>
        <button
          onClick={checarConexao}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Verificando…' : 'Testar conexão'}
        </button>
        {tokenOk === true && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {tokenMsg}
          </div>
        )}
        {tokenOk === false && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {tokenMsg}
          </div>
        )}
      </div>

      {/* Sincronizar contatos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-5">
        <h2 className="font-semibold text-gray-900 mb-1">2. Sincronizar contatos</h2>
        <p className="text-sm text-gray-500 mb-4">
          Envia todos os leads cadastrados (banco de dados) para a sua lista do Reach.
          Contatos que já existem são ignorados — pode rodar quantas vezes quiser.
        </p>
        <button
          onClick={sincronizarTodos}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          <Users className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
          {syncing ? 'Sincronizando… (não feche esta aba)' : 'Sincronizar todos os contatos'}
        </button>

        {result && (
          <div className="mt-5 grid grid-cols-4 gap-3">
            {[
              ['Total', result.total, 'text-gray-900'],
              ['Adicionados', result.enviados, 'text-emerald-600'],
              ['Já existiam', result.jaExistiam, 'text-blue-600'],
              ['Falhas', result.falhas, result.falhas > 0 ? 'text-red-600' : 'text-gray-400'],
            ].map(([label, val, color]) => (
              <div key={label as string} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <div className={`text-2xl font-bold ${color}`}>{val as number}</div>
                <div className="text-xs text-gray-500 mt-1">{label as string}</div>
              </div>
            ))}
          </div>
        )}
        {result && result.erros && result.erros.length > 0 && (
          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer">Ver primeiras falhas ({result.erros.length})</summary>
            <pre className="mt-2 bg-gray-50 p-3 rounded-lg overflow-auto max-h-48">{JSON.stringify(result.erros, null, 2)}</pre>
          </details>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Enviar campanha (Resend) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-5">
        <h2 className="font-semibold text-gray-900 mb-1">3. Enviar campanha / newsletter</h2>
        <p className="text-sm text-gray-500 mb-4">
          Escreva e dispare um e-mail para todos os contatos cadastrados. Sai de
          <b> contact@learningbyworking.com</b> com o layout da LBW.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
        <input
          type="text"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          placeholder="Ex: Novidade na plataforma LBW"
          className="w-full px-3 py-2.5 mb-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Texto do e-mail</label>
        <textarea
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          rows={8}
          placeholder={'Escreva aqui o texto.\n\nDeixe uma linha em branco entre os parágrafos — eu cuido do resto.'}
          className="w-full px-3 py-2.5 mb-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
        />

        <button
          onClick={enviarCampanha}
          disabled={enviandoCamp}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          <Send className={`w-4 h-4 ${enviandoCamp ? 'animate-pulse' : ''}`} />
          {enviandoCamp ? 'Enviando… (não feche esta aba)' : 'Enviar para todos os contatos'}
        </button>

        {campResult && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['Total', campResult.total, 'text-gray-900'],
              ['Enviados', campResult.enviados, 'text-emerald-600'],
              ['Falhas', campResult.falhas, campResult.falhas > 0 ? 'text-red-600' : 'text-gray-400'],
            ].map(([label, val, color]) => (
              <div key={label as string} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <div className={`text-2xl font-bold ${color}`}>{val as number}</div>
                <div className="text-xs text-gray-500 mt-1">{label as string}</div>
              </div>
            ))}
          </div>
        )}
        {campError && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {campError}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6 leading-relaxed">
        Os contatos também são espelhados no Hostinger Reach (sincronização acima).
        As campanhas saem pelo Resend, com o domínio learningbyworking.com verificado.
      </p>
    </div>
  );
}
