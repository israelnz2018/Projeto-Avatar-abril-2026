/**
 * SequenciasEmail — gestão dos 4 estágios de e-mail por estágio do funil.
 * Plugado dentro da aba Marketing (MarketingView).
 *
 *  - Lead       : sequência pra quem cadastrou e NUNCA acessou
 *  - Grátis     : sequência pra quem já acessou (plano gratuito)
 *  - Pago·7dias : comprou há <7 dias — 3 e-mails anti-reembolso
 *  - Pago       : comprou há >7 dias — 7 e-mails de rotina + newsletter MANUAL
 *
 * Endpoints (server.ts):
 *  GET  /api/marketing/status        → contagem por estágio + última execução do motor
 *  GET  /api/marketing/sequencias    → { gratis:[], pago7:[], pago:[] }
 *  PUT  /api/marketing/sequencias    → salva as sequências
 *  POST /api/marketing/rodar-agora   → dispara o motor na hora (teste)
 *  POST /api/newsletter/enviar       → { assunto, corpo, publico }
 *  GET  /api/newsletter/historico    → envios passados
 */
import React, { useEffect, useRef, useState } from 'react';
import { Mail, Power, Play, Send, Clock, History, CheckCircle2, BarChart3, UserX } from 'lucide-react';
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
type Pacote = 'gratis' | 'pago7' | 'pago';
type Aba = Pacote | 'engajamento' | 'template';

interface TemplateConfig {
  headerCor: string; headerTitulo: string; headerSubtitulo: string;
  botaoCor: string; rodapeTexto: string;
}

interface EngajItem {
  email: string; nome: string; estagio: string; plano: string;
  acessou: boolean; optOut: boolean; optOutEm: string | null; cortesia: boolean;
  criadoEm: string | null; primeiroAcessoEm: string | null; score: number;
}

interface StatusResp {
  contagem: { gratis: number; pago: number };
  ultimaExecucao: null | { rodadoEm: string; enviados: number; falhas: number; dryRun?: boolean };
}
interface VolumeResp {
  limiteDia: number; limiteMes: number; hoje: string;
  enviadosHoje: number; enviadosMes: number;
  hojePorEstagio: { gratis: number; pago7: number; pago: number } | null;
  totalHistorico: number;
  porDia: { dia: string; total: number }[];
}
interface NewsletterItem { id: string; assunto: string; corpo: string; publico: string; total: number; enviados: number; falhas: number; enviadoEm: string; }

const META: Record<Pacote, { nome: string; desc: string; cor: string; corBg: string }> = {
  gratis: { nome: 'Introdutório', desc: 'Plano introdutório (Kit 90 Dias)', cor: '#065F46', corBg: '#D1FAE5' },
  pago7:  { nome: 'Pago · 7 dias', desc: 'Comprou · primeiros 7 dias (anti-reembolso)', cor: '#9A3412', corBg: '#FFEDD5' },
  pago:   { nome: 'Pago',   desc: 'Comprou · rotina (após 7 dias)', cor: '#1E2D6E', corBg: '#DBEAFE' },
};

// Marcações disponíveis. 'insere' é o trecho colado ao clicar.
const MARCACOES = [
  { rotulo: '{nome}', insere: '{nome}', dica: 'primeiro nome da pessoa' },
  { rotulo: '[titulo: ...]', insere: '[titulo: ESCREVA O TÍTULO AQUI]', dica: 'título de destaque' },
  { rotulo: '[botao: ...]', insere: '[botao: TEXTO DO BOTÃO | https://SEU-LINK]', dica: 'botão clicável (quantos quiser)' },
  { rotulo: '[video: ...]', insere: '[video: https://youtube.com/watch?v=SEU-VIDEO]', dica: 'capa do vídeo do YouTube' },
];

/**
 * Caixa de ajuda: cada marcação é um BOTÃO. Ao clicar, o trecho é inserido no
 * último campo de texto que você editou (onde está o cursor). Sem copiar/colar.
 */
function AjudaMarcacoes({ onInserir }: { onInserir: (txt: string) => void }) {
  return (
    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
      <div className="font-bold text-blue-900 mb-2">👆 Clique pra inserir no texto (tudo opcional):</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {MARCACOES.map((m) => (
          <button key={m.rotulo} type="button" onClick={() => onInserir(m.insere)} title={`Inserir — ${m.dica}`}
            className="inline-flex items-center gap-1 bg-white border border-blue-300 hover:bg-blue-100 hover:border-blue-400 px-2 py-1 rounded font-mono text-blue-800 transition">
            <span className="text-blue-400">＋</span> {m.rotulo}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-gray-500">
        Ex: <code className="bg-white border border-blue-100 px-1 rounded">[botao: Começar agora | https://app.educacaopelotrabalho.com]</code> —
        o que vem antes do <b>|</b> é o texto do botão, depois é o link. Edite os trechos em MAIÚSCULA após inserir.
      </div>
    </div>
  );
}

export default function SequenciasEmail() {
  const [aba, setAba] = useState<Aba>('gratis');
  const [engaj, setEngaj] = useState<EngajItem[]>([]);
  // filtros da aba engajamento
  const [fEstagio, setFEstagio] = useState<'todos' | 'gratis' | 'pago7' | 'pago'>('todos');
  const [fAcesso, setFAcesso] = useState<'todos' | 'acessou' | 'naoAcessou'>('todos');
  const [fExtra, setFExtra] = useState<'todos' | 'optout' | 'cortesia' | 'ativos'>('todos');
  const [fBusca, setFBusca] = useState('');
  const [fDe, setFDe] = useState('');   // data cadastro de (YYYY-MM-DD)
  const [fAte, setFAte] = useState(''); // data cadastro até
  const [tpl, setTpl] = useState<TemplateConfig | null>(null);
  const [tplSalvando, setTplSalvando] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Último textarea de corpo que recebeu foco — alvo da inserção de marcações.
  const corpoAtivoRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Insere `trecho` na posição do cursor do último campo de corpo focado e
   * dispara o onChange (via setter nativo) pra o React atualizar o estado.
   */
  const inserirNoCorpo = (trecho: string) => {
    const ta = corpoAtivoRef.current;
    if (!ta) { setMsg('Clique primeiro no texto do e-mail onde quer inserir.'); return; }
    const ini = ta.selectionStart ?? ta.value.length;
    const fim = ta.selectionEnd ?? ta.value.length;
    const novo = ta.value.slice(0, ini) + trecho + ta.value.slice(fim);
    // seta o valor pelo setter nativo pra o React "ver" a mudança e chamar onChange
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(ta, novo);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    // reposiciona o cursor logo após o trecho inserido
    const pos = ini + trecho.length;
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
  };
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [volume, setVolume] = useState<VolumeResp | null>(null);
  const [volLoading, setVolLoading] = useState(false);
  const [seqs, setSeqs] = useState<{ gratis: SeqEmail[]; pago7: SeqEmail[]; pago: SeqEmail[] } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [msg, setMsg] = useState('');

  // newsletter (pago)
  const [nlAssunto, setNlAssunto] = useState('');
  const [nlCorpo, setNlCorpo] = useState('');
  const [nlPublico, setNlPublico] = useState<'pago' | 'gratis' | 'todos'>('pago');
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
      setSeqs({ gratis: q.gratis || [], pago7: q.pago7 || [], pago: q.pago || [] });
    } catch (e: any) { setMsg(e?.message || 'Erro ao carregar.'); }
  };
  const carregarVolume = async () => {
    setVolLoading(true);
    try {
      const v = await authedFetch('/api/marketing/volume').then((r) => r.json());
      if (!v?.error) setVolume(v);
    } catch { /* silencioso — volume é secundário */ }
    finally { setVolLoading(false); }
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

  const carregarTemplate = async () => {
    try {
      const t = await authedFetch('/api/marketing/template').then((r) => r.json());
      setTpl(t);
    } catch { /* silencioso */ }
  };
  const atualizarPreview = async (t: TemplateConfig) => {
    try {
      const r = await authedFetch('/api/marketing/template/preview', {
        method: 'POST',
        body: JSON.stringify({ ...t, corpoExemplo: '[titulo: Bem-vindo à plataforma!]\n\nOi {nome},\n\nEste é um exemplo de como seu e-mail vai chegar. Você pode incluir um vídeo:\n\n[video: https://www.youtube.com/watch?v=dQw4w9WgXcQ]\n\nE quantos botões quiser:\n\n[botao: Acessar a plataforma | https://app.educacaopelotrabalho.com]\n\nIsrael' }),
      });
      const b = await r.json();
      setPreviewHtml(b?.html || '');
    } catch { /* silencioso */ }
  };
  const salvarTemplate = async () => {
    if (!tpl) return;
    setTplSalvando(true); setMsg('');
    try {
      const r = await authedFetch('/api/marketing/template', { method: 'PUT', body: JSON.stringify(tpl) });
      setMsg(r.ok ? 'Template salvo.' : 'Erro ao salvar template.');
    } catch (e: any) { setMsg(e?.message || 'Erro ao salvar.'); }
    finally { setTplSalvando(false); }
  };
  const setTplField = (patch: Partial<TemplateConfig>) => setTpl((p) => (p ? { ...p, ...patch } : p));

  useEffect(() => { carregar(); carregarHistorico(); carregarVolume(); }, []);
  useEffect(() => { if (aba === 'engajamento') carregarEngajamento(); }, [aba]);
  useEffect(() => { if (aba === 'template' && !tpl) carregarTemplate(); }, [aba]);
  // atualiza preview sempre que o template muda (na aba template)
  useEffect(() => { if (aba === 'template' && tpl) atualizarPreview(tpl); }, [tpl, aba]);

  const setEmail = (pac: 'gratis' | 'pago7' | 'pago', idx: number, patch: Partial<SeqEmail>) => {
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
    setNlPublico(['pago', 'gratis', 'todos'].includes(n.publico) ? (n.publico as any) : 'pago');
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

      {/* faixa de VOLUME — controle da cota do Resend (100/dia, 3000/mês) */}
      {volume && (() => {
        const pctDia = Math.min(100, Math.round((volume.enviadosHoje / volume.limiteDia) * 100));
        const pctMes = Math.min(100, Math.round((volume.enviadosMes / volume.limiteMes) * 100));
        const corDia = pctDia >= 90 ? '#DC2626' : pctDia >= 70 ? '#EA580C' : '#10B981';
        const corMes = pctMes >= 90 ? '#DC2626' : pctMes >= 70 ? '#EA580C' : '#10B981';
        const he = volume.hojePorEstagio;
        return (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-gray-900">Volume de e-mails (cota Resend)</h3>
              </div>
              <button onClick={carregarVolume} disabled={volLoading}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50">
                {volLoading ? 'Atualizando…' : 'Atualizar'}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* hoje */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600">Hoje</span>
                  <span className="text-xs font-bold" style={{ color: corDia }}>{volume.enviadosHoje} / {volume.limiteDia}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctDia}%`, background: corDia }} />
                </div>
                {he && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span>Introdutório: <b className="text-gray-700">{he.gratis || 0}</b></span>
                    <span>Pago·7d: <b className="text-gray-700">{he.pago7 || 0}</b></span>
                    <span>Pago: <b className="text-gray-700">{he.pago || 0}</b></span>
                    <span className="text-gray-400">(só automáticos)</span>
                  </div>
                )}
                {!he && <div className="mt-2 text-[11px] text-gray-400">O motor não rodou hoje ainda — detalhe por estágio aparece após rodar.</div>}
              </div>
              {/* mês */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600">Este mês</span>
                  <span className="text-xs font-bold" style={{ color: corMes }}>{volume.enviadosMes} / {volume.limiteMes}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctMes}%`, background: corMes }} />
                </div>
                <div className="mt-2 text-[11px] text-gray-400">Total já enviado (histórico Resend): {volume.totalHistorico}</div>
              </div>
            </div>
            {(pctDia >= 90 || pctMes >= 90) && (
              <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ Você está perto do limite. Considere aumentar o plano do Resend (ou trocar de provedor) antes de estourar, senão os próximos e-mails falham.
              </div>
            )}
          </div>
        );
      })()}

      {/* abas */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['gratis', 'pago7', 'pago'] as Pacote[]).map((p) => (
          <button key={p} onClick={() => setAba(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${aba === p ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            style={aba === p ? { background: p === 'gratis' ? '#10B981' : p === 'pago7' ? '#EA580C' : '#0033CC' } : {}}>
            {META[p].nome} {status && (p === 'gratis' || p === 'pago') ? `(${status.contagem[p]})` : ''}
          </button>
        ))}
        <button onClick={() => setAba('engajamento')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition ${aba === 'engajamento' ? 'border-transparent bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <BarChart3 className="w-4 h-4" /> Engajamento
        </button>
        <button onClick={() => setAba('template')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition ${aba === 'template' ? 'border-transparent bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Mail className="w-4 h-4" /> Template
        </button>
      </div>

      {msg && <div className="mb-4 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">{msg}</div>}

      {/* sequência automática (gratis/pago7/pago) */}
      {(aba === 'gratis' || aba === 'pago7' || aba === 'pago') && seqs && (
        <div className={aba === 'pago' ? 'mb-8' : ''}>
          {aba === 'pago' && (
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-gray-900">Sequência automática (rotina pós-compra)</h3>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">
            {aba === 'pago7'
              ? 'Comprou há menos de 7 dias. Objetivo ÚNICO: evitar reembolso, fazer a pessoa usar e sentir o valor. 3 e-mails (dias 0, 3 e 6, contados da compra). No 7º dia a pessoa passa pro estágio "Pago".'
              : aba === 'pago'
              ? 'Comprou há mais de 7 dias. E-mails de rotina (início do ritmo semanal). O dia é contado a partir da compra. Desligue um e-mail sem apagá-lo pelo botão à direita.'
              : `${META['gratis'].desc}. O dia é contado a partir do primeiro acesso. Desligue um e-mail sem apagá-lo pelo botão à direita.`}
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
                    {aba === 'pago' || aba === 'pago7' ? 'dias após compra' : aba === 'gratis' ? 'dias após 1º acesso' : 'dias após cadastro'}
                  </label>
                  <button onClick={() => setEmail(aba, idx, { ativo: !e.ativo })}
                    className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${e.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                    <Power className="w-3.5 h-3.5" /> {e.ativo ? 'Ativo' : 'Desligado'}
                  </button>
                </div>
                <input type="text" value={e.assunto} onChange={(ev) => setEmail(aba, idx, { assunto: ev.target.value })}
                  placeholder="Assunto" className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg text-sm" />
                <textarea value={e.corpo} onChange={(ev) => setEmail(aba, idx, { corpo: ev.target.value })} rows={5}
                  onFocus={(ev) => { corpoAtivoRef.current = ev.target; }}
                  placeholder={'Texto do e-mail. Uma linha em branco entre parágrafos.'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm leading-relaxed" />
                <AjudaMarcacoes onInserir={inserirNoCorpo} />
              </div>
            ))}
          </div>
          <button onClick={salvarSeqs} disabled={salvando}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            <CheckCircle2 className="w-4 h-4" /> {salvando ? 'Salvando…' : 'Salvar sequência'}
          </button>
        </div>
      )}

      {/* newsletter manual (broadcast avulso) */}
      {aba === 'pago' && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-bold text-gray-900">Newsletter manual (envio avulso)</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Independente da sequência acima. Escreva e dispare pra qualquer público quando quiser. Cada envio fica no histórico pra reenviar.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-gray-700">Enviar para:</label>
            <select value={nlPublico} onChange={(e) => setNlPublico(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="pago">Pagos (completo)</option>
              <option value="gratis">Introdutório (Kit 90 Dias)</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <input type="text" value={nlAssunto} onChange={(e) => setNlAssunto(e.target.value)}
            placeholder="Assunto" className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg text-sm" />
          <textarea value={nlCorpo} onChange={(e) => setNlCorpo(e.target.value)} rows={7}
            onFocus={(e) => { corpoAtivoRef.current = e.target; }}
            placeholder={'Texto da newsletter. Uma linha em branco entre parágrafos.'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm leading-relaxed" />
          <div className="mb-3"><AjudaMarcacoes onInserir={inserirNoCorpo} /></div>
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

      {/* engajamento / gestão de pessoas (por pessoa, com filtros) */}
      {aba === 'engajamento' && (() => {
        const corEstagio = (est: string) =>
          est === 'gratis' ? { background: '#D1FAE5', color: '#065F46' }
          : est === 'pago7' ? { background: '#FFEDD5', color: '#9A3412' }
          : { background: '#DBEAFE', color: '#1E2D6E' };
        const nomeEstagio = (est: string) =>
          est === 'pago7' ? 'pago · 7 dias' : est;
        const fmtData = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
        // aplica os filtros
        const filtrados = engaj.filter((u) => {
          if (fEstagio !== 'todos' && u.estagio !== fEstagio) return false;
          if (fAcesso === 'acessou' && !u.acessou) return false;
          if (fAcesso === 'naoAcessou' && u.acessou) return false;
          if (fExtra === 'optout' && !u.optOut) return false;
          if (fExtra === 'cortesia' && !u.cortesia) return false;
          if (fExtra === 'ativos' && u.optOut) return false;
          if (fBusca.trim()) {
            const q = fBusca.trim().toLowerCase();
            if (!(`${u.nome} ${u.email}`.toLowerCase().includes(q))) return false;
          }
          const dia = String(u.criadoEm || '').slice(0, 10);
          if (fDe && dia && dia < fDe) return false;
          if (fAte && dia && dia > fAte) return false;
          return true;
        });
        const limparFiltros = () => { setFEstagio('todos'); setFAcesso('todos'); setFExtra('todos'); setFBusca(''); setFDe(''); setFAte(''); };
        const temFiltro = fEstagio !== 'todos' || fAcesso !== 'todos' || fExtra !== 'todos' || !!fBusca || !!fDe || !!fAte;
        // resumos (sobre o conjunto FILTRADO)
        const scoreMedio = filtrados.length ? Math.round(filtrados.reduce((s, u) => s + (u.score || 0), 0) / filtrados.length) : 0;
        const nDescadastrados = filtrados.filter((u) => u.optOut).length;
        const nAcessaram = filtrados.filter((u) => u.acessou).length;
        const corScore = (s: number) => s >= 70 ? '#10B981' : s >= 40 ? '#EA580C' : '#DC2626';
        const fmtDataHora = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
        return (
          <div>
            {/* barra de filtros */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Estágio</label>
                  <select value={fEstagio} onChange={(e) => setFEstagio(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm">
                    <option value="todos">Todos</option>
                    <option value="gratis">Introdutório</option>
                    <option value="pago7">Pago · 7 dias</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Acesso</label>
                  <select value={fAcesso} onChange={(e) => setFAcesso(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm">
                    <option value="todos">Todos</option>
                    <option value="acessou">Já acessou</option>
                    <option value="naoAcessou">Nunca acessou</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Situação</label>
                  <select value={fExtra} onChange={(e) => setFExtra(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm">
                    <option value="todos">Todas</option>
                    <option value="ativos">Recebem e-mail</option>
                    <option value="optout">Descadastrados</option>
                    <option value="cortesia">Cortesia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Cadastro de</label>
                  <input type="date" value={fDe} onChange={(e) => setFDe(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">até</label>
                  <input type="date" value={fAte} onChange={(e) => setFAte(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Buscar nome/e-mail</label>
                  <input type="text" value={fBusca} onChange={(e) => setFBusca(e.target.value)} placeholder="digite…"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
                {temFiltro && (
                  <button onClick={limparFiltros} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                    Limpar
                  </button>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Mostrando <b className="text-gray-800">{filtrados.length}</b> de {engaj.length} pessoas
              </div>
            </div>

            {/* cards de resumo (sobre o filtro atual) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-gray-500 mb-1">Engajamento médio</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" style={{ color: corScore(scoreMedio) }}>{scoreMedio}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${scoreMedio}%`, background: corScore(scoreMedio) }} />
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-gray-500 mb-1">Já acessaram</div>
                <div className="text-2xl font-bold text-emerald-600">{nAcessaram}</div>
                <div className="text-[11px] text-gray-400">{filtrados.length ? Math.round((nAcessaram / filtrados.length) * 100) : 0}% do filtro</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1"><UserX className="w-3 h-3" /> Descadastrados</div>
                <div className="text-2xl font-bold text-red-600">{nDescadastrados}</div>
                <div className="text-[11px] text-gray-400">{filtrados.length ? Math.round((nDescadastrados / filtrados.length) * 100) : 0}% do filtro</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-gray-500 mb-1">Total no filtro</div>
                <div className="text-2xl font-bold text-gray-800">{filtrados.length}</div>
                <div className="text-[11px] text-gray-400">de {engaj.length} no funil</div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
              <b>Engajamento (0-100):</b> baseado em sinais confiáveis, não em aberturas (que são imprecisas).
              Acessou a plataforma (+40), comprou (+45), continua inscrito (+10), quem entrou há pouco ganha bônus de recência.
              Quem descadastrou fica em 0. Verde ≥70 · laranja 40-69 · vermelho &lt;40.
            </p>

            {engaj.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma pessoa no funil ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3">Pessoa</th>
                      <th className="py-2 px-3">Estágio</th>
                      <th className="py-2 px-3">Engajamento</th>
                      <th className="py-2 px-3 text-center">Cadastro</th>
                      <th className="py-2 px-3 text-center">Já acessou</th>
                      <th className="py-2 px-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((u) => (
                      <tr key={u.email} className="border-b border-gray-100">
                        <td className="py-2 pr-3">
                          <div className="font-medium text-gray-800">{u.nome || '—'}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap" style={corEstagio(u.estagio)}>
                            {nomeEstagio(u.estagio)}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${u.score}%`, background: corScore(u.score) }} />
                            </div>
                            <span className="text-xs font-bold w-6 text-right" style={{ color: corScore(u.score) }}>{u.score}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600 whitespace-nowrap">{fmtData(u.criadoEm)}</td>
                        <td className="py-2 px-3 text-center">{u.acessou ? '✅' : '—'}</td>
                        <td className="py-2 px-3 text-center">
                          {u.optOut
                            ? <span className="text-xs font-semibold text-red-600 whitespace-nowrap" title={u.optOutEm ? `Saiu em ${fmtDataHora(u.optOutEm)}` : ''}>descadastrou{u.optOutEm ? ` · ${fmtDataHora(u.optOutEm)}` : ''}</span>
                            : u.cortesia
                            ? <span className="text-xs font-semibold text-amber-600">cortesia</span>
                            : <span className="text-xs text-emerald-600">recebe</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* template (desenho global do e-mail) */}
      {aba === 'template' && tpl && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* coluna de edição */}
          <div>
            <p className="text-xs text-gray-500 mb-3">
              Desenho aplicado a <b>todos</b> os e-mails. Título e botões você decide por e-mail,
              escrevendo no corpo: <code className="bg-gray-100 px-1 rounded">[titulo: ...]</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">[botao: Texto | link]</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">[video: link-youtube]</code>.
            </p>

            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cabeçalho — cor de fundo</label>
            <div className="flex items-center gap-2 mb-3">
              <input type="color" value={tpl.headerCor} onChange={(e) => setTplField({ headerCor: e.target.value })}
                className="w-10 h-9 rounded border border-gray-300 p-0.5" />
              <input type="text" value={tpl.headerCor} onChange={(e) => setTplField({ headerCor: e.target.value })}
                className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono" />
            </div>

            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cabeçalho — título</label>
            <input type="text" value={tpl.headerTitulo} onChange={(e) => setTplField({ headerTitulo: e.target.value })}
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg text-sm" />

            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cabeçalho — subtítulo</label>
            <input type="text" value={tpl.headerSubtitulo} onChange={(e) => setTplField({ headerSubtitulo: e.target.value })}
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg text-sm" />

            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cor padrão dos botões</label>
            <div className="flex items-center gap-2 mb-3">
              <input type="color" value={tpl.botaoCor} onChange={(e) => setTplField({ botaoCor: e.target.value })}
                className="w-10 h-9 rounded border border-gray-300 p-0.5" />
              <input type="text" value={tpl.botaoCor} onChange={(e) => setTplField({ botaoCor: e.target.value })}
                className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono" />
            </div>

            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Rodapé</label>
            <textarea value={tpl.rodapeTexto} onChange={(e) => setTplField({ rodapeTexto: e.target.value })} rows={3}
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg text-sm leading-relaxed" />

            <button onClick={salvarTemplate} disabled={tplSalvando}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              <CheckCircle2 className="w-4 h-4" /> {tplSalvando ? 'Salvando…' : 'Salvar template'}
            </button>
          </div>

          {/* coluna de preview */}
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase mb-2">Pré-visualização</div>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100 p-3">
              {previewHtml
                ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                : <p className="text-xs text-gray-400 p-4">Gerando preview…</p>}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Exemplo com título, vídeo e botão. No envio real, {'{nome}'} vira o nome da pessoa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
