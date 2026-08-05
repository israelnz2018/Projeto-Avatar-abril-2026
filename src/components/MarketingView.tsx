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
import SequenciasEmail from './SequenciasEmail';
import LeadsCorporativos from './LeadsCorporativos';
import CampanhaCortesia from './CampanhaCortesia';

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

  // Reativação (criar contas dos convidados)
  const [criando, setCriando] = useState(false);
  const [reativacao, setReativacao] = useState<{ total: number; criados: number; atualizados: number; falhas: number; credenciais: { email: string; senha: string; status: string }[] } | null>(null);
  const [reativErro, setReativErro] = useState('');

  // Conceder acesso cortesia — lista de pessoas (nome + email) — item 3
  const [cortPessoas, setCortPessoas] = useState<{ nome: string; email: string }[]>([{ nome: '', email: '' }]);
  const [cortLoading, setCortLoading] = useState(false);
  const [cortResults, setCortResults] = useState<{ email: string; status: string; emailEnviado: boolean; ok: boolean; senha?: string }[]>([]);
  const [cortErro, setCortErro] = useState('');

  // Blindar atuais (Fase 0 da Trilha 1 paga) — marca cadastrados como cortesia introdutória
  const [blindLoading, setBlindLoading] = useState(false);
  const [blindResult, setBlindResult] = useState<{ dryRun?: boolean; totalAlvos: number; marcados?: number; falhas?: number; totalPulados: number; alvos?: { email: string }[]; pulados?: { email: string; motivo: string }[] } | null>(null);
  const [blindErro, setBlindErro] = useState('');

  const blindarAtuais = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm('Marcar TODOS os alunos introdutórios atuais como cortesia da Trilha 1?\n\nEles mantêm o acesso que já têm (só a Trilha 1) e não recebem e-mails de "parabéns pela compra". Admin, coordenador e completos NÃO são afetados.\n\nRodar de novo é seguro (não duplica).')) return;
    setBlindErro(''); setBlindResult(null); setBlindLoading(true);
    try {
      const r = await authedFetch('/api/trilha1/blindar-atuais', { method: 'POST', body: JSON.stringify({ dryRun }) });
      const b = await r.json().catch(() => ({}));
      if (r.ok) setBlindResult(b);
      else setBlindErro(b?.error || `Falha (HTTP ${r.status}).`);
    } catch (e: any) {
      setBlindErro(e?.message || 'Erro ao blindar os atuais.');
    } finally {
      setBlindLoading(false);
    }
  };

  const setPessoa = (i: number, campo: 'nome' | 'email', valor: string) =>
    setCortPessoas((arr) => arr.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  const addPessoa = () => setCortPessoas((arr) => [...arr, { nome: '', email: '' }]);
  const removePessoa = (i: number) => setCortPessoas((arr) => arr.filter((_, j) => j !== i));

  const concederCortesia = async () => {
    setCortErro(''); setCortResults([]);
    const validas = cortPessoas.filter((p) => p.email.trim() && p.email.indexOf('@') > 0);
    if (validas.length === 0) { setCortErro('Informe ao menos um e-mail válido.'); return; }
    setCortLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const results: { email: string; status: string; emailEnviado: boolean; ok: boolean }[] = [];
      for (const p of validas) {
        try {
          const r = await fetch('/api/reativacao/criar-um', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ nome: p.nome.trim(), email: p.email.trim() }),
          });
          const b = await r.json();
          results.push({ email: p.email.trim(), status: r.ok ? b.status : (b?.error || 'falha'), emailEnviado: !!b.emailEnviado, ok: r.ok });
        } catch (e: any) {
          results.push({ email: p.email.trim(), status: e?.message || 'erro de rede', emailEnviado: false, ok: false });
        }
      }
      setCortResults(results);
      if (results.every((r) => r.ok)) setCortPessoas([{ nome: '', email: '' }]); // limpa se todos deram certo
    } catch (e: any) {
      setCortErro(e?.message || 'Erro ao conceder acesso.');
    } finally {
      setCortLoading(false);
    }
  };

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

  const criarContasConvidados = async () => {
    if (!window.confirm('Criar contas de acesso COMPLETO (grátis até 31/12/2026) para todos os contatos do Reach?\n\nCada pessoa receberá uma senha temporária única e será obrigada a trocá-la no 1º acesso.')) return;
    setCriando(true); setReativacao(null); setReativErro('');
    try {
      const r = await authedFetch('/api/reativacao/criar-contas', { method: 'POST' });
      const b = await r.json().catch(() => ({}));
      if (r.ok) setReativacao(b);
      else setReativErro(b?.error || `Falha (HTTP ${r.status}).`);
    } catch (e: any) {
      setReativErro(e?.message || 'Erro ao criar contas.');
    } finally { setCriando(false); }
  };

  const baixarCredenciais = () => {
    if (!reativacao?.credenciais) return;
    const linhas = ['email,senha,status', ...reativacao.credenciais.map((c) => `${c.email},${c.senha},${c.status}`)];
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'credenciais-convidados.csv'; a.click();
    URL.revokeObjectURL(url);
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

      {/* Conceder acesso cortesia individual (LinkedIn etc.) */}
      <div className="hidden bg-white rounded-2xl border border-gray-200 p-6 mt-5">
        <h2 className="font-semibold text-gray-900 mb-1">3. Conceder acesso completo grátis (até 31/12/2026)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Dê <b>acesso completo grátis</b> (válido até 31 de dezembro de 2026) para <b>uma pessoa</b> —
          ideal para quem te procura pelo LinkedIn. Funciona tanto para quem <b>já tem cadastro</b> quanto
          para quem <b>nunca deu os dados</b>: o sistema cria no Firebase se não existir, ou atualiza se já
          existir. A pessoa recebe o e-mail com uma senha provisória única e troca no primeiro acesso.
        </p>
        <div className="space-y-2">
          {cortPessoas.map((p, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input value={p.nome} onChange={(e) => setPessoa(i, 'nome', e.target.value)} placeholder="Nome completo"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <input value={p.email} onChange={(e) => setPessoa(i, 'email', e.target.value)} type="email" placeholder="email@exemplo.com"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              {cortPessoas.length > 1 && (
                <button onClick={() => removePessoa(i)} className="px-3 py-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 text-sm shrink-0" title="Remover">✕</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button onClick={addPessoa} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ adicionar mais uma pessoa</button>
          <button
            onClick={concederCortesia}
            disabled={cortLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap ml-auto"
          >
            <Users className={`w-4 h-4 ${cortLoading ? 'animate-pulse' : ''}`} />
            {cortLoading ? 'Concedendo…' : `Conceder acesso${cortPessoas.filter(p => p.email.trim()).length > 1 ? ' a todos' : ''}`}
          </button>
        </div>

        {cortResults.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {cortResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm rounded-lg px-4 py-2.5 border ${r.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                <span>{r.ok ? '✓' : '✗'}</span>
                <span>
                  <b>{r.email}</b> — {r.ok
                    ? <>
                        {r.status === 'atualizado'
                          ? <>já tinha cadastro — <b>acesso atualizado</b> para completo</>
                          : <>novo cadastro criado — <b>acesso completo</b></>}
                        {' '}(até 31/12/2026, senha provisória única). {r.emailEnviado ? 'E-mail enviado.' : <>⚠️ E-mail não saiu — senha provisória: <b>{r.senha || 'não retornada'}</b>.</>}
                      </>
                    : <>{r.status}</>}
                </span>
              </div>
            ))}
          </div>
        )}
        {cortErro && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {cortErro}
          </div>
        )}

        {/* Opção secundária: criar em massa (todos do Reach) */}
        <details className="mt-5">
          <summary className="text-sm font-semibold text-gray-600 cursor-pointer">Criar acessos em massa (todos os contatos do Reach)</summary>
          <div className="mt-3">
            <p className="text-sm text-gray-500 mb-3">Cria/atualiza acesso completo até 31/12/2026 para <b>todos</b> os contatos do Reach de uma vez. Rodar de novo é seguro (não duplica).</p>
            <button
              onClick={criarContasConvidados}
              disabled={criando}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              <Users className={`w-4 h-4 ${criando ? 'animate-pulse' : ''}`} />
              {criando ? 'Criando contas… (pode levar 1-2 min)' : 'Criar acessos em massa'}
            </button>
          </div>
        </details>

        {reativacao && (
          <>
            <div className="mt-5 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <span className="text-sm text-indigo-900">Cada convidado recebeu uma senha provisória única. Baixe o CSV para conferir/enviar manualmente se necessário.</span>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {[
                ['Total', reativacao.total, 'text-gray-900'],
                ['Criados', reativacao.criados, 'text-emerald-600'],
                ['Atualizados', reativacao.atualizados, 'text-blue-600'],
                ['Falhas', reativacao.falhas, reativacao.falhas > 0 ? 'text-red-600' : 'text-gray-400'],
              ].map(([label, val, color]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                  <div className={`text-2xl font-bold ${color}`}>{val as number}</div>
                  <div className="text-xs text-gray-500 mt-1">{label as string}</div>
                </div>
              ))}
            </div>
            <button onClick={baixarCredenciais} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800">
              ⬇ Baixar lista email → senha (CSV)
            </button>
          </>
        )}
        {reativErro && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {reativErro}
          </div>
        )}
      </div>

      {/* Blindar atuais — Fase 0 da Trilha 1 paga */}
      <div className="hidden bg-white rounded-2xl border border-amber-200 p-6 mt-5">
        <h2 className="font-semibold text-gray-900 mb-1">Blindar alunos atuais (Trilha 1 vira paga)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Antes de tornar a Trilha 1 paga (R$67), marque quem já se cadastrou como
          <b> cortesia da Trilha 1</b>. Eles mantêm o acesso que já têm (só a Trilha 1) e
          não recebem e-mails de "parabéns pela compra". <b>Admin, coordenador e completos não são tocados.</b>
          <br />Sempre rode primeiro em <b>simulação</b> pra conferir os números.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => blindarAtuais(true)}
            disabled={blindLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 disabled:opacity-60 border border-gray-300"
          >
            {blindLoading ? 'Verificando…' : '1. Simular (não altera nada)'}
          </button>
          <button
            onClick={() => blindarAtuais(false)}
            disabled={blindLoading || !blindResult?.dryRun}
            title={!blindResult?.dryRun ? 'Rode a simulação primeiro' : ''}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-40"
          >
            {blindLoading ? 'Aplicando…' : '2. Aplicar de verdade'}
          </button>
        </div>

        {blindResult && (
          <div className="mt-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                [blindResult.dryRun ? 'Serão marcados' : 'Marcados', blindResult.dryRun ? blindResult.totalAlvos : (blindResult.marcados ?? 0), 'text-emerald-600'],
                ['Pulados (admin/coord/completo)', blindResult.totalPulados, 'text-gray-500'],
                ['Falhas', blindResult.falhas ?? 0, (blindResult.falhas ?? 0) > 0 ? 'text-red-600' : 'text-gray-400'],
              ].map(([label, val, color]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                  <div className={`text-2xl font-bold ${color}`}>{val as number}</div>
                  <div className="text-xs text-gray-500 mt-1">{label as string}</div>
                </div>
              ))}
            </div>
            {blindResult.dryRun && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                Simulação. Nada foi alterado. Se o número bater, clique em <b>2. Aplicar de verdade</b>.
              </div>
            )}
            {!blindResult.dryRun && (
              <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                ✓ Blindagem aplicada. Os atuais estão protegidos.
              </div>
            )}
          </div>
        )}
        {blindErro && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {blindErro}
          </div>
        )}
      </div>

      {/* Enviar campanha (Resend) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-5">
        <h2 className="font-semibold text-gray-900 mb-1">4. Enviar campanha / newsletter</h2>
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

      {/* Sequências de e-mail por estágio (Lead / Grátis / Pago) */}
      <SequenciasEmail />

      {/* Campanha de cortesia (acesso grátis até 31/12) — com envio de teste */}
      <CampanhaCortesia />

      {/* Leads do formulário de Pacotes Corporativos */}
      <LeadsCorporativos />

      <p className="text-xs text-gray-400 mt-6 leading-relaxed">
        Os contatos também são espelhados no Hostinger Reach (sincronização acima).
        As campanhas saem pelo Resend, com o domínio learningbyworking.com verificado.
      </p>
    </div>
  );
}
