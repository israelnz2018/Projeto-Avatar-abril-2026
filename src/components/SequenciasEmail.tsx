/**
 * SequenciasEmail — gestão dos 3 pacotes de e-mail por estágio do funil.
 * Plugado dentro da aba Marketing (MarketingView).
 *
 *  - Lead  : sequência automática pra quem cadastrou e NUNCA acessou
 *  - Grátis: sequência automática pra quem já acessou (plano gratuito)
 *  - Pago  : newsletter MANUAL + histórico de envios (reabrir/reenviar)
 *
 * Endpoints (server.ts):
 *  GET  /api/marketing/status        → contagem por estágio + última execução do motor
 *  GET  /api/marketing/sequencias    → { lead:[], gratis:[] }
 *  PUT  /api/marketing/sequencias    → salva as sequências
 *  POST /api/marketing/rodar-agora   → dispara o motor na hora (teste)
 *  POST /api/newsletter/enviar       → { assunto, corpo, publico }
 *  GET  /api/newsletter/historico    → envios passados
 */
import React, { useEffect, useState } from 'react';
import { Mail, Power, Play, Send, Clock, History, CheckCircle2, BarChart3, MousePointerClick, Eye } from 'lucide-react';
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

interface SeqEmail { dia: number; assunto: string; corpo: string; ativo: boolean; }
type Pacote = 'lead' | 'gratis' | 'pago';
type Aba = Pacote | 'engajamento';

interface EngajItem { email: string; nome: string; estagio: string; cliques: number; aberturas: number; voltouAoApp: boolean; ultimoEvento: string | null; }

interface StatusResp {
  contagem: { lead: number; gratis: number; pago: number };
  ultimaExecucao: null | { rodadoEm: string; enviados: number; falhas: number; dryRun?: boolean };
}
interface NewsletterItem { id: string; assunto: string; corpo: string; publico: string; total: number; enviados: number; falhas: number; enviadoEm: string; }

const META: Record<Pacote, { nome: string; desc: string; cor: string; corBg: string }> = {
  lead:   { nome: 'Lead',   desc: 'Cadastrou mas nunca acessou', cor: '#92400E', corBg: '#FEF3C7' },
  gratis: { nome: 'Grátis', desc: 'Já acessou · plano gratuito', cor: '#065F46', corBg: '#D1FAE5' },
  pago:   { nome: 'Pago',   desc: 'Newsletter semanal · manual', cor: '#1E2D6E', corBg: '#DBEAFE' },
};

export default function SequenciasEmail() {
  const [aba, setAba] = useState<Aba>('gratis');
  const [engaj, setEngaj] = useState<EngajItem[]>([]);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [seqs, setSeqs] = useState<{ lead: SeqEmail[]; gratis: SeqEmail[] } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [msg, setMsg] = useState('');

  // newsletter (pago)
  const [nlAssunto, setNlAssunto] = useState('');
  const [nlCorpo, setNlCorpo] = useState('');
  const [nlPublico, setNlPublico] = useState<'pago' | 'gratis' | 'lead' | 'todos'>('pago');
  const [nlEnviando, setNlEnviando] = useState(false);
  const [nlResult, setNlResult] = useState<{ total: number; enviados: number; falhas: number } | null>(null);
  const [historico, setHistorico] = useState<NewsletterItem[]>([]);

  const carregar = async () => {
    try {
      const [s, q] = await Promise.all([
        authedFetch('/api/marketing/status').then((r) => r.json()),
        authedFetch('/api/marketing/sequencias').then((r) => r.json()),
      ]);
      setStatus(s);
      setSeqs({ lead: q.lead || [], gratis: q.gratis || [] });
    } catch (e: any) { setMsg(e?.message || 'Erro ao carregar.'); }
  };
  const carregarHistorico = async () => {
    try {
      const h = await authedFetch('/api/newsletter/historico').then((r) => r.json());
      setHistorico(Array.isArray(h?.historico) ? h.historico : []);
    } catch { /* silencioso */ }
  };
  const carregarEngajamento = async () => {
    try {
      const e = await authedFetch('/api/marketing/engajamento').then((r) => r.json());
      setEngaj(Array.isArray(e?.usuarios) ? e.usuarios : []);
    } catch { /* silencioso */ }
  };

  useEffect(() => { carregar(); carregarHistorico(); }, []);
  useEffect(() => { if (aba === 'engajamento') carregarEngajamento(); }, [aba]);

  const setEmail = (pac: 'lead' | 'gratis', idx: number, patch: Partial<SeqEmail>) => {
    setSeqs((prev) => {
      if (!prev) return prev;
      const arr = [...prev[pac]];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [pac]: arr };
    });
  };

  const salvarSeqs = async () => {
    if (!seqs) return;
    setSalvando(true); setMsg('');
    try {
      const r = await authedFetch('/api/marketing/sequencias', { method: 'PUT', body: JSON.stringify(seqs) });
      if (r.ok) setMsg('Sequências salvas.');
      else setMsg('Erro ao salvar.');
    } catch (e: any) { setMsg(e?.message || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const rodarAgora = async (dry: boolean) => {
    if (!dry && !window.confirm('Disparar o motor AGORA de verdade? Os e-mails que estiverem devidos hoje serão enviados.')) return;
    setRodando(true); setMsg('');
    try {
      const r = await authedFetch(`/api/marketing/rodar-agora${dry ? '?dry=1' : ''}`, { method: 'POST' });
      const b = await r.json();
      if (r.ok) { setMsg(`${dry ? 'Simulação' : 'Envio'}: ${b.enviados} e-mail(s), ${b.falhas} falha(s), ${b.pulados} pulado(s).`); carregar(); }
      else setMsg(b?.error || 'Erro ao rodar.');
    } catch (e: any) { setMsg(e?.message || 'Erro ao rodar.'); }
    finally { setRodando(false); }
  };

  const enviarNewsletter = async () => {
    if (!nlAssunto.trim() || !nlCorpo.trim()) { setMsg('Preencha assunto e texto da newsletter.'); return; }
    const labelPub = nlPublico === 'todos' ? 'TODOS os contatos' : `público "${nlPublico}"`;
    if (!window.confirm(`Enviar esta newsletter para ${labelPub}?`)) return;
    setNlEnviando(true); setNlResult(null); setMsg('');
    try {
      const r = await authedFetch('/api/newsletter/enviar', { method: 'POST', body: JSON.stringify({ assunto: nlAssunto.trim(), corpo: nlCorpo.trim(), publico: nlPublico }) });
      const b = await r.json();
      if (r.ok) { setNlResult(b); carregarHistorico(); }
      else setMsg(b?.error || 'Erro ao enviar.');
    } catch (e: any) { setMsg(e?.message || 'Erro ao enviar.'); }
    finally { setNlEnviando(false); }
  };

  const reabrir = (n: NewsletterItem) => {
    setNlAssunto(n.assunto); setNlCorpo(n.corpo);
    setNlPublico(['pago', 'gratis', 'lead', 'todos'].includes(n.publico) ? (n.publico as any) : 'pago');
    setNlResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMsg('Newsletter carregada acima — revise e clique em Enviar pra reenviar.');
  };

  const ultima = status?.ultimaExecucao;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-5">
      <div className="flex items-center gap-3 mb-1">
        <Mail className="w-5 h-5 text-blue-700" />
        <h2 className="font-semibold text-gray-900">5. Sequências de e-mail por estágio</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        E-mails automáticos por estágio do funil (via Resend). O motor roda 1x/dia e decide
        sozinho quem recebe o quê pelo estado atual — para sozinho quando a pessoa avança de estágio.
      </p>

      {/* faixa de status do motor */}
      <div className="flex flex-wrap items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold text-gray-800">Motor ativo</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {ultima ? (
            <span>Última execução: {new Date(ultima.rodadoEm).toLocaleString('pt-BR')} · {ultima.enviados} enviados · {ultima.falhas} falhas{ultima.dryRun ? ' (simulação)' : ''}</span>
          ) : <span>Ainda não rodou.</span>}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => rodarAgora(true)} disabled={rodando} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60">
            <Play className="w-3.5 h-3.5" /> Simular agora
          </button>
          <button onClick={() => rodarAgora(false)} disabled={rodando} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60">
            <Send className="w-3.5 h-3.5" /> {rodando ? 'Rodando…' : 'Rodar de verdade'}
          </button>
        </div>
      </div>

      {/* abas */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['lead', 'gratis', 'pago'] as Pacote[]).map((p) => (
          <button key={p} onClick={() => setAba(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${aba === p ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            style={aba === p ? { background: p === 'lead' ? '#F59E0B' : p === 'gratis' ? '#10B981' : '#0033CC' } : {}}>
            {META[p].nome} {status ? `(${status.contagem[p]})` : ''}
          </button>
        ))}
        <button onClick={() => setAba('engajamento')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition ${aba === 'engajamento' ? 'border-transparent bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <BarChart3 className="w-4 h-4" /> Engajamento
        </button>
      </div>

      {msg && <div className="mb-4 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">{msg}</div>}

      {/* sequência (lead/gratis) */}
      {(aba === 'lead' || aba === 'gratis') && seqs && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            {META[aba].desc}. O dia é contado a partir do cadastro. Desligue um e-mail sem apagá-lo pelo botão à direita.
          </p>
          <div className="space-y-3">
            {seqs[aba].map((e, idx) => (
              <div key={idx} className={`border rounded-xl p-4 ${e.ativo ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-gray-100 opacity-70'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-blue-800 bg-blue-100 rounded-md px-2 py-1">E-mail {idx + 1}</span>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    enviar
                    <input type="number" min={0} value={e.dia} onChange={(ev) => setEmail(aba, idx, { dia: Math.max(0, parseInt(ev.target.value, 10) || 0) })}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center" />
                    dias após cadastro
                  </label>
                  <button onClick={() => setEmail(aba, idx, { ativo: !e.ativo })}
                    className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${e.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                    <Power className="w-3.5 h-3.5" /> {e.ativo ? 'Ativo' : 'Desligado'}
                  </button>
                </div>
                <input type="text" value={e.assunto} onChange={(ev) => setEmail(aba, idx, { assunto: ev.target.value })}
                  placeholder="Assunto" className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg text-sm" />
                <textarea value={e.corpo} onChange={(ev) => setEmail(aba, idx, { corpo: ev.target.value })} rows={4}
                  placeholder={'Texto do e-mail. Use {nome} pro primeiro nome.\nUma linha em branco entre parágrafos.'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm leading-relaxed" />
              </div>
            ))}
          </div>
          <button onClick={salvarSeqs} disabled={salvando}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            <CheckCircle2 className="w-4 h-4" /> {salvando ? 'Salvando…' : 'Salvar sequência'}
          </button>
        </div>
      )}

      {/* newsletter (pago) */}
      {aba === 'pago' && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            Newsletter manual. Escreva e dispare quando quiser. Cada envio fica no histórico pra reenviar.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-gray-700">Enviar para:</label>
            <select value={nlPublico} onChange={(e) => setNlPublico(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="pago">Pagos (completo)</option>
              <option value="gratis">Grátis (já acessaram)</option>
              <option value="lead">Leads (não acessaram)</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <input type="text" value={nlAssunto} onChange={(e) => setNlAssunto(e.target.value)}
            placeholder="Assunto" className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg text-sm" />
          <textarea value={nlCorpo} onChange={(e) => setNlCorpo(e.target.value)} rows={7}
            placeholder={'Texto da newsletter. Uma linha em branco entre parágrafos.'}
            className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg text-sm leading-relaxed" />
          <button onClick={enviarNewsletter} disabled={nlEnviando}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            <Send className={`w-4 h-4 ${nlEnviando ? 'animate-pulse' : ''}`} /> {nlEnviando ? 'Enviando…' : 'Enviar newsletter'}
          </button>

          {nlResult && (
            <div className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
              Enviado: {nlResult.enviados}/{nlResult.total} · {nlResult.falhas} falhas.
            </div>
          )}

          {/* histórico */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-800">Histórico de envios</h3>
            </div>
            {historico.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma newsletter enviada ainda.</p>
            ) : (
              <div className="space-y-2">
                {historico.map((n) => (
                  <div key={n.id} className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">{n.assunto}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(n.enviadoEm).toLocaleString('pt-BR')} · {n.publico} · {n.enviados}/{n.total} enviados
                      </div>
                    </div>
                    <button onClick={() => reabrir(n)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap">
                      Reabrir / reenviar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* engajamento (por pessoa) */}
      {aba === 'engajamento' && (
        <div>
          <div className="flex items-start gap-2 mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <b>Cliques</b> são confiáveis (a pessoa clicou de verdade). <b>Aberturas são uma estimativa imprecisa</b> —
              iPhone/Apple Mail infla (conta como aberto sem abrir) e Gmail/Outlook escondem (lê sem contar).
              Para achar quem está engajado, confie em <b>cliques</b> e em <b>voltou ao app</b>.
            </span>
          </div>
          {engaj.length === 0 ? (
            <p className="text-xs text-gray-400">Sem dados de engajamento ainda. Eles aparecem conforme os e-mails são abertos/clicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-3">Pessoa</th>
                    <th className="py-2 px-3">Estágio</th>
                    <th className="py-2 px-3 text-center"><MousePointerClick className="w-3.5 h-3.5 inline" /> Cliques</th>
                    <th className="py-2 px-3 text-center"><Eye className="w-3.5 h-3.5 inline" /> Aberturas*</th>
                    <th className="py-2 px-3 text-center">Voltou ao app</th>
                  </tr>
                </thead>
                <tbody>
                  {engaj.map((u) => (
                    <tr key={u.email} className="border-b border-gray-100">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-gray-800">{u.nome || '—'}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: u.estagio === 'lead' ? '#FEF3C7' : u.estagio === 'gratis' ? '#D1FAE5' : '#DBEAFE', color: u.estagio === 'lead' ? '#92400E' : u.estagio === 'gratis' ? '#065F46' : '#1E2D6E' }}>
                          {u.estagio}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-gray-900">{u.cliques}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{u.aberturas}</td>
                      <td className="py-2 px-3 text-center">{u.voltouAoApp ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
