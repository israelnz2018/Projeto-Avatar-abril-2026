/**
 * DashboardCoordenador — painel de gestão pro coordenador.
 *
 * Mostra:
 *   - Stats do time (alunos ativos, projetos, IA consumida, travados)
 *   - Tabela do time com 1 linha por aluno + alerta visual de travado
 *   - Seção "Meus projetos" (mesma do Aluno Pago, condensada)
 *
 * Pré-requisito Firebase (já feito):
 *   - Regra firestore.rules permitindo coordenador ler users/projects do mesmo empresaId
 *   - Campo lastLogin gravado no doc do user a cada login (ensureUserDocument)
 *
 * Sem empresaId no coordenador → mostra estado "Você ainda não tem time".
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Users, FolderKanban, Sparkles, AlertTriangle,
  CheckCircle2, Clock, Mail, ArrowRight, TrendingUp, Award, PlayCircle, UserPlus, X,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useUserAccess } from '../../hooks/useUserAccess';
import { deletarConvite, listarConvitesPorEmpresa, PendingInvite, updateUserSiglaPpt } from '../../services/userService';
import { getProjetosComDetalhes, ProjetoComDetalhes } from '../../services/dashboardDataService';
import {
  useResumoEquipe,
  useProjetosComDetalhes,
  useResultadosEquipe,
} from '../../hooks/useDashboardData';
import {
  DashboardShell, DashboardLoading, DashboardError,
  SectionLabel, StatCard, Pill, LBW_GRADIENTS, GradientKey,
} from './_shared';

interface Props {
  nome?: string | null;
  modo?: 'gestao' | 'report';
}

const FASE_TONE: Record<string, GradientKey> = {
  PreDefinir: 'navy',
  Define: 'sky',
  Measure: 'emerald',
  Analyze: 'amber',
  Improve: 'rose',
  Control: 'violet',
};

function formatRelativeTime(ms: number): string {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const dias = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `${dias}d atrás`;
  if (dias < 30) return `${Math.floor(dias / 7)}sem atrás`;
  return `${Math.floor(dias / 30)}m atrás`;
}

function formatISORelative(iso?: string): string {
  if (!iso) return '—';
  return formatRelativeTime(new Date(iso).getTime());
}

const fmtBRL = (n: number) => `R$ ${Math.round(n).toLocaleString('pt-BR')}`;

interface CursoConvite {
  curso: string;
  vencimento: string | null;
  valor?: number;
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(url, { ...init, headers });
}

function CoordenadorShell({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  if (!light) return <DashboardShell>{children}</DashboardShell>;
  return (
    <div className="coord-light -m-8 min-h-screen bg-white text-gray-900">
      <style>{`
        .coord-light [class*="text-white"] { color: #111827 !important; }
        .coord-light [class*="text-white/"] { color: #4b5563 !important; }
        .coord-light [class*="border-white"] { border-color: #e5e7eb !important; }
        .coord-light [class*="bg-white/"] { background-color: #f9fafb !important; }
        .coord-light [style*="rgba(255,255,255"] {
          background: #ffffff !important;
          border-color: #e5e7eb !important;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06) !important;
        }
        .coord-light [style*="#0f1626"] { background: #ffffff !important; }
      `}</style>
      <div className="relative z-10 px-6 md:px-12 lg:px-16 py-10">
        {children}
      </div>
    </div>
  );
}

export default function DashboardCoordenador({ nome, modo = 'gestao' }: Props) {
  const isReport = modo === 'report';
  const uid = auth.currentUser?.uid || null;
  const { empresaId, empresaNome, siglaPpt, cursosLiberados, cursosAcesso } = useUserAccess();

  const equipe = useResumoEquipe(empresaId, uid);
  const meusProjetos = useProjetosComDetalhes(null);
  const resultados = useResultadosEquipe(isReport ? empresaId : null, uid);

  // Convites pendentes do time (auto-serviço do coordenador).
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [cursosConvite, setCursosConvite] = useState<CursoConvite[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const carregarInvites = useCallback(async () => {
    if (!empresaId) { setInvites([]); return; }
    try { setInvites(await listarConvitesPorEmpresa(empresaId)); } catch { /* ignora */ }
  }, [empresaId]);
  useEffect(() => { carregarInvites(); }, [carregarInvites]);

  // Drill-down: ao clicar num membro, carrega os projetos dele (só leitura).
  const [drillMember, setDrillMember] = useState<{ uid: string; nome: string } | null>(null);
  const [drillProjetos, setDrillProjetos] = useState<ProjetoComDetalhes[] | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  useEffect(() => {
    if (!drillMember) { setDrillProjetos(null); return; }
    let cancel = false;
    setDrillLoading(true);
    getProjetosComDetalhes(drillMember.uid)
      .then((p) => { if (!cancel) setDrillProjetos(p); })
      .catch(() => { if (!cancel) setDrillProjetos([]); })
      .finally(() => { if (!cancel) setDrillLoading(false); });
    return () => { cancel = true; };
  }, [drillMember]);

  if (equipe.loading) {
    return <DashboardLoading />;
  }
  if (equipe.error) return <DashboardError message={equipe.error.message} />;
  if (!equipe.data) {
    return <DashboardError message="Dados indisponíveis." />;
  }

  const nomeAmigavel = (nome || '').split(' ')[0] || 'coordenador';
  const time = equipe.data;
  const alunosTotal = time.length;
  const alunosTravados = time.filter(a => a.travado).length;
  const alunosSemProjeto = time.filter(a => !a.projetoAtual).length;
  const iaTimeTotal = time.reduce((s, a) => s + (a.iaUsado || 0), 0);
  const projetosTimeAtivos = time.filter(a => a.projetoAtual).length;

  const resMap = new Map((resultados.data || []).map(r => [r.uid, r]));
  const ganhoTimeReal = (resultados.data || []).reduce((s, r) => s + r.ganhoReal, 0);
  const ganhoTimeTeo = (resultados.data || []).reduce((s, r) => s + r.ganhoTeo, 0);
  const certTimeTotal = (resultados.data || []).reduce((s, r) => s + r.certificados, 0);
  const videosTimeTotal = (resultados.data || []).reduce((s, r) => s + r.videosAssistidos, 0);

  // Coordenador sem empresaId → estado vazio elegante
  if (!empresaId) {
    return (
      <CoordenadorShell light={!isReport}>
        <SectionLabel live rightSlot={<>Coordenador</>}>
          Painel do Coordenador
        </SectionLabel>
        <h1 className="text-[2rem] md:text-[2.5rem] font-black text-white tracking-tight m-0 mb-3">
          Olá, {nomeAmigavel}.
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.15)',
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Users size={22} className="text-white/40" />
          </div>
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40 m-0 mb-2">
            Sem empresa vinculada
          </p>
          <p className="text-white/55 text-sm m-0 max-w-md mx-auto">
            Você é coordenador, mas o seu doc não tem <code className="text-white/75">empresaId</code> definido. Peça pro admin vincular sua conta a uma empresa pra começar a montar o time.
          </p>
        </motion.div>
      </CoordenadorShell>
    );
  }

  const emailConviteValido = novoEmail.trim().includes('@');
  const nomeConviteValido = novoNome.trim().length >= 2;
  const cadastroConviteValido = emailConviteValido && nomeConviteValido && cursosConvite.length > 0 && cursosConvite.every((c) => !!c.vencimento);
  const usoPorCurso = new Map<string, number>();
  time.forEach((a) => {
    const lista = Array.isArray((a.user as any).cursosAcesso) ? (a.user as any).cursosAcesso : [];
    lista.forEach((c: any) => {
      const curso = String(c?.curso || '').trim();
      if (curso) usoPorCurso.set(curso, (usoPorCurso.get(curso) || 0) + 1);
    });
  });
  const totalAcessosCursos = cursosAcesso.reduce((s, c) => s + (Number((c as any).quantidade) || 0), 0);
  const totalUsadoCursos = cursosAcesso.reduce((s, c) => s + (usoPorCurso.get(c.curso) || 0), 0);
  const totalRestanteCursos = Math.max(0, totalAcessosCursos - totalUsadoCursos);

  const toggleCursoConvite = (curso: string) => {
    const cursoBase = cursosAcesso.find((c) => c.curso === curso);
    const limiteCurso = Number((cursoBase as any)?.quantidade) || 0;
    const usadoCurso = usoPorCurso.get(curso) || 0;
    setCursosConvite((current) => current.some((c) => c.curso === curso)
      ? current.filter((c) => c.curso !== curso)
      : limiteCurso <= 0 || usadoCurso >= limiteCurso
      ? current
      : [...current, { curso, vencimento: cursoBase?.vencimento || null, valor: cursoBase?.valor || 0 }]);
  };

  const adicionarMembro = async () => {
    const email = novoEmail.trim().toLowerCase();
    if (!empresaId) return;
    if (!nomeConviteValido) { setErrMsg('Informe o nome do aluno.'); return; }
    if (!email.includes('@')) { setErrMsg('Informe um e-mail valido.'); return; }
    if (cursosConvite.length === 0) { setErrMsg('Escolha ao menos um curso para o aluno.'); return; }
    if (cursosConvite.some((c) => !c.vencimento)) { setErrMsg('Informe a data de expiracao de todos os cursos.'); return; }
    setAddingMember(true); setErrMsg(null); setOkMsg(null);
    try {
      const r = await authedFetch('/api/aluno/convidar', {
        method: 'POST',
        body: JSON.stringify({ nome: novoNome.trim(), email, cursosAcesso: cursosConvite }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || 'Falha ao convidar.');
      setNovoNome('');
      setNovoEmail('');
      setCursosConvite([]);
      setOkMsg(`Aluno ${j.status === 'criado' ? 'cadastrado' : 'atualizado'} com sucesso. ${j.emailEnviado ? 'Convite enviado por e-mail.' : 'Cadastro salvo, mas o e-mail nao foi enviado.'}`);
      await carregarInvites();
      equipe.refetch();
    } catch (e: any) { setErrMsg(e?.message || 'Falha ao convidar.'); }
    finally { setAddingMember(false); }
  };
  const removerInvite = async (email: string) => {
    try { await deletarConvite(email); await carregarInvites(); } catch { /* ignora */ }
  };
  const removerMembro = async (memberUid: string) => {
    const aluno = time.find((item) => item.user.uid === memberUid)?.user;
    const nomeAluno = aluno?.nome || aluno?.email || 'este aluno';
    if (!window.confirm(
      `Tem certeza que deseja remover ${nomeAluno} do seu time?\n\n` +
      'Atenção: ao remover, o aluno perderá o acesso aos cursos deste time. ' +
      'O histórico, progresso e projetos vinculados podem ser perdidos ou deixar de aparecer para o time.\n\n' +
      'Essa ação não deve ser feita sem certeza.'
    )) return;
    setRemovingUid(memberUid); setErrMsg(null);
    try {
      const r = await authedFetch(`/api/aluno/${encodeURIComponent(memberUid)}`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || 'Falha ao remover aluno.');
      equipe.refetch();
    } catch (e: any) { setErrMsg(e?.message || 'Falha ao remover aluno.'); }
    finally { setRemovingUid(null); }
  };

  return (
    <CoordenadorShell light={!isReport}>
      {/* ====== HEADER ====== */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <SectionLabel live rightSlot={<>Coordenador {empresaNome ? `· ${empresaNome}` : ''}</>}>
          Painel do Coordenador
        </SectionLabel>
        <h1 className="text-[2rem] md:text-[2.5rem] font-black text-white leading-tight tracking-tight m-0 mb-2">
          Olá, {nomeAmigavel}.
        </h1>
        <p className="text-white/55 text-sm md:text-base max-w-2xl m-0">
          {alunosTotal === 0
            ? <>Você ainda não tem alunos vinculados ao seu time.</>
            : <>Você acompanha <span className="text-white font-bold">{alunosTotal} aluno{alunosTotal > 1 ? 's' : ''}</span>{alunosTravados > 0 ? <> · <span className="text-rose-300 font-bold">{alunosTravados} precisa{alunosTravados === 1 ? '' : 'm'} de atenção</span></> : null}.</>
          }
        </p>
        {false && uid && (
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <label className="text-white/55 text-xs font-bold uppercase tracking-wide">Sua sigla nos PPTs:</label>
            <input
              key={`sig-${siglaPpt}`}
              defaultValue={siglaPpt}
              onBlur={(e) => updateUserSiglaPpt(uid, e.target.value.toUpperCase().slice(0, 7))}
              maxLength={7}
              placeholder="ex.: ABC"
              className="w-28 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white uppercase tracking-widest placeholder-white/30 focus:outline-none focus:border-white/50"
            />
            <span className="text-white/30 text-[11px]">até 7 letras · salva ao sair do campo (recarregue pra ver no PPT)</span>
          </div>
        )}
      </motion.header>

      {/* ====== STATS DO TIME ====== */}
      {isReport && <div className="mb-10">
        <SectionLabel>Visão do time</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Alunos no time"
            value={alunosTotal}
            sublabel={alunosSemProjeto > 0 ? `${alunosSemProjeto} sem projeto` : 'todos com projeto'}
            icon={<Users size={16} />}
            gradient="navy"
            delay={0.05}
          />
          <StatCard
            label="Projetos do time"
            value={projetosTimeAtivos}
            sublabel="em andamento"
            icon={<FolderKanban size={16} />}
            gradient="emerald"
            delay={0.1}
          />
          <StatCard
            label="Precisam de atenção"
            value={alunosTravados}
            sublabel={alunosTravados === 0 ? 'tudo em ritmo' : 'sem update há +7 dias'}
            icon={<AlertTriangle size={16} />}
            gradient={alunosTravados > 0 ? 'rose' : 'emerald'}
            delay={0.15}
          />
          <StatCard
            label="IA do time"
            value={iaTimeTotal}
            sublabel="créditos consumidos"
            icon={<Sparkles size={16} />}
            gradient="amber"
            delay={0.2}
          />
        </div>
      </div>}

      {/* ====== CONVIDAR / GERENCIAR MEMBROS ====== */}
      {!isReport && <div className="mb-10">
        <SectionLabel rightSlot={`${totalRestanteCursos} / ${totalAcessosCursos} acessos restantes`}>
          Convidar membros
        </SectionLabel>
        <div className="rounded-2xl p-4 md:p-5 bg-gray-50 border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-600 mb-2 mt-0">Dados do aluno convidado</p>
          <div className="grid md:grid-cols-2 gap-2 mb-4">
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome completo"
              className="rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') adicionarMembro(); }}
              placeholder="email@empresa.com"
              className="rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mb-4">
            <p className="text-xs font-bold text-gray-600 mb-2 mt-0">Cursos que este aluno vai acessar</p>
            {cursosLiberados.length === 0 ? (
              <p className="text-red-600 text-xs mt-0 mb-0">O consultor ainda nao liberou cursos para este coordenador e o time dele.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCursosConvite(cursosLiberados.map((curso) => {
                      const base = cursosAcesso.find((c) => c.curso === curso);
                      const limiteCurso = Number((base as any)?.quantidade) || 0;
                      const usadoCurso = usoPorCurso.get(curso) || 0;
                      return limiteCurso <= 0 || usadoCurso >= limiteCurso ? null : { curso, vencimento: base?.vencimento || null, valor: base?.valor || 0 };
                    }).filter(Boolean) as CursoConvite[])}
                    className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1"
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setCursosConvite([])}
                    className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1"
                  >
                    Limpar seleção
                  </button>
                </div>
                {cursosLiberados.map((curso) => {
                  const item = cursosConvite.find((c) => c.curso === curso);
                  const cursoBase = cursosAcesso.find((c) => c.curso === curso);
                  const selecionado = !!item;
                  const vencimento = cursoBase?.vencimento || item?.vencimento || null;
                  const limiteCurso = Number((cursoBase as any)?.quantidade) || 0;
                  const usadoCurso = usoPorCurso.get(curso) || 0;
                  const restante = Math.max(0, limiteCurso - usadoCurso);
                  const semConfiguracao = limiteCurso <= 0;
                  const semSaldo = (semConfiguracao || restante <= 0) && !selecionado;
                  return (
                    <div key={curso} className={`rounded-xl border px-3 py-2 ${semSaldo ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                        <input type="checkbox" checked={selecionado} disabled={semSaldo} onChange={() => toggleCursoConvite(curso)} className="h-4 w-4" />
                        <span className="flex-1">{curso}</span>
                        <span className="text-[11px] font-black text-blue-700 bg-blue-50 rounded px-2 py-1">
                          {semConfiguracao ? 'sem acessos configurados' : `${restante}/${limiteCurso} restantes`}
                        </span>
                        <span className="text-[11px] font-bold text-gray-500">
                          Expira em {vencimento ? new Date(vencimento).toLocaleDateString('pt-BR') : 'sem data'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={adicionarMembro} disabled={addingMember || !cadastroConviteValido}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors bg-blue-600 border-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:border-gray-200 disabled:cursor-not-allowed"
              style={{ color: (addingMember || !cadastroConviteValido) ? '#9ca3af' : '#ffffff' }}>
              <UserPlus size={14} /> {addingMember ? 'Convidando…' : 'Convidar'}
            </button>
          </div>
          {okMsg && <p className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm font-bold mt-3 mb-0">{okMsg}</p>}
          <p className="text-gray-500 text-xs mt-2 mb-0">O saldo é controlado por curso, conforme a quantidade liberada pelo consultor.</p>
          {errMsg && <p className="text-rose-300 text-xs mt-2 mb-0">{errMsg}</p>}

          {invites.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/40 m-0">Convites pendentes ({invites.length})</p>
              {invites.map((inv) => (
                <div key={inv.email} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white/75 text-sm truncate flex items-center gap-2"><Mail size={12} className="text-white/30" />{inv.email}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">pendente</span>
                    <button onClick={() => removerInvite(inv.email)} title="Cancelar convite" className="text-white/30 hover:text-rose-400 border-none bg-transparent cursor-pointer p-1"><X size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-white/35 text-[11px] mt-3 mb-0">O convidado entra no seu time ao criar a conta com esse e-mail.</p>
        </div>
      </div>}

      {!isReport && (
        <div className="mb-10">
          <SectionLabel rightSlot={`${alunosTotal} membro${alunosTotal === 1 ? '' : 's'}`}>
            Alunos cadastrados / convidados
          </SectionLabel>
          {alunosTotal === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)' }}>
              <p className="text-white/65 font-bold text-sm m-0 mb-2">Time vazio</p>
              <p className="text-white/45 text-xs m-0">Use o campo de convite acima para adicionar os primeiros alunos ao seu time.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {time.map((a) => (
                <div key={a.user.uid} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm m-0 truncate">{a.user.nome || a.user.email.split('@')[0]}</p>
                    <p className="text-white/40 text-[11px] m-0 truncate">{a.user.email}</p>
                    <p className="text-white/40 text-[11px] m-0 truncate">
                      Incluido em {new Date(a.user.incluidoNoTimeEm || a.user.criadoEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => removerMembro(a.user.uid)}
                    disabled={removingUid === a.user.uid}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-red-600 shadow-sm transition-colors hover:bg-red-50 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Remover aluno do time"
                  >
                    <X size={14} />
                    {removingUid === a.user.uid ? 'Removendo...' : 'Remover'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== RESULTADOS & ENGAJAMENTO ====== */}
      {isReport && <div className="mb-10">
        <SectionLabel rightSlot={resultados.loading ? 'calculando…' : 'ao vivo'}>
          Resultados &amp; engajamento do time
        </SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Ganho real do time" value={resultados.loading ? '…' : fmtBRL(ganhoTimeReal)} sublabel="acumulado nos projetos" icon={<TrendingUp size={16} />} gradient="emerald" delay={0.05} />
          <StatCard label="Ganho teórico" value={resultados.loading ? '…' : fmtBRL(ganhoTimeTeo)} sublabel="a preço congelado" icon={<TrendingUp size={16} />} gradient="navy" delay={0.1} />
          <StatCard label="Vídeos assistidos" value={resultados.loading ? '…' : videosTimeTotal} sublabel="pelo time" icon={<PlayCircle size={16} />} gradient="sky" delay={0.15} />
          <StatCard label="Certificados" value={resultados.loading ? '…' : certTimeTotal} sublabel="trilhas concluídas" icon={<Award size={16} />} gradient="violet" delay={0.2} />
        </div>

        {alunosTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="hidden md:grid grid-cols-[2fr_1fr_1.4fr_0.7fr_0.7fr] gap-3 px-5 py-3 border-b border-white/8 bg-white/[0.02]">
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40">Aluno</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40 text-right">Ganho real (R$)</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40">Projetos c/ ganho</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40 text-right">Vídeos</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40 text-right">Certif.</div>
            </div>
            {time.map((a) => {
              const r = resMap.get(a.user.uid);
              const ganho = r?.ganhoReal || 0;
              const nomeAluno = a.user.nome || a.user.email.split('@')[0];
              return (
                <div key={a.user.uid} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  {/* desktop */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1.4fr_0.7fr_0.7fr] gap-3 px-5 py-3.5 items-center">
                    <div className="min-w-0"><p className="text-white font-bold text-sm m-0 truncate">{nomeAluno}</p></div>
                    <div className="text-right"><span className={`font-black text-sm ${ganho > 0 ? 'text-emerald-300' : 'text-white/35'}`}>{resultados.loading ? '…' : fmtBRL(ganho)}</span></div>
                    <div className="min-w-0 text-[11px] text-white/60 truncate">{r && r.projetosComGanho.length ? r.projetosComGanho.map(p => p.name).join(', ') : <span className="text-white/25 italic">nenhum</span>}</div>
                    <div className="text-right text-white/70 text-[12px] font-bold">{resultados.loading ? '…' : (r?.videosAssistidos ?? 0)}</div>
                    <div className="text-right text-white/70 text-[12px] font-bold">{resultados.loading ? '…' : (r?.certificados ?? 0)}</div>
                  </div>
                  {/* mobile */}
                  <div className="md:hidden px-4 py-3.5">
                    <p className="text-white font-bold text-sm m-0 truncate mb-2">{nomeAluno}</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div><p className="text-white/35 font-black tracking-widest uppercase m-0 mb-0.5">Ganho R$</p><p className={`m-0 font-bold ${ganho > 0 ? 'text-emerald-300' : 'text-white/50'}`}>{resultados.loading ? '…' : fmtBRL(ganho)}</p></div>
                      <div><p className="text-white/35 font-black tracking-widest uppercase m-0 mb-0.5">Vídeos</p><p className="m-0 font-bold text-white/70">{resultados.loading ? '…' : (r?.videosAssistidos ?? 0)}</p></div>
                      <div><p className="text-white/35 font-black tracking-widest uppercase m-0 mb-0.5">Certif.</p><p className="m-0 font-bold text-white/70">{resultados.loading ? '…' : (r?.certificados ?? 0)}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>}

      {/* ====== TABELA DO TIME ====== */}
      {isReport && <div className="mb-10">
        <SectionLabel rightSlot={alunosTravados > 0 ? <span className="text-rose-300">{alunosTravados} travado{alunosTravados > 1 ? 's' : ''}</span> : 'todos ativos'}>
          Meu time
        </SectionLabel>
        {alunosTotal === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.15)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Users size={22} className="text-white/40" />
            </div>
            <p className="text-white/65 font-bold text-sm m-0 mb-2">Time vazio</p>
            <p className="text-white/45 text-xs m-0 max-w-md mx-auto">
              Peça pro admin vincular alunos com <code className="text-white/65">empresaId = {empresaId}</code> pra eles aparecerem aqui.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Header da tabela — só desktop */}
            <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_0.8fr] gap-3 px-5 py-3 border-b border-white/8 bg-white/[0.02]">
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40">Aluno</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40">Projeto / Fase</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40">Última atividade</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40">Último login</div>
              <div className="text-[9px] font-black tracking-[0.25em] uppercase text-white/40 text-right">IA</div>
            </div>

            {/* Linhas */}
            {time.map((a, i) => {
              const fase = a.projetoAtual ? (a.projetoAtual as any).currentPhase || 'Sem fase' : null;
              const iaPct = a.iaLimite > 0 ? (a.iaUsado / a.iaLimite) * 100 : 0;

              return (
                <motion.div
                  key={a.user.uid}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.3 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  style={{
                    borderLeft: a.travado ? '3px solid rgba(244, 63, 94, 0.6)' : '3px solid transparent',
                  }}
                >
                  {/* ==== DESKTOP: linha em grid ==== */}
                  <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_0.8fr] gap-3 px-5 py-3.5 items-center">
                    <div className="min-w-0">
                      <button onClick={() => setDrillMember({ uid: a.user.uid, nome: a.user.nome || a.user.email.split('@')[0] })}
                        className="text-white font-bold text-sm m-0 truncate bg-transparent border-none p-0 cursor-pointer text-left hover:text-blue-300 transition-colors block max-w-full" title="Ver projetos deste aluno">
                        {a.user.nome || a.user.email.split('@')[0]}
                      </button>
                      <p className="text-white/40 text-[11px] m-0 truncate flex items-center gap-1">
                        <Mail size={9} />
                        {a.user.email}
                      </p>
                    </div>

                    <div className="min-w-0">
                      {a.projetoAtual ? (
                        <>
                          <p className="text-white/85 text-[12px] m-0 truncate">
                            {(a.projetoAtual as any).name || '—'}
                          </p>
                          <div className="mt-1">
                            <Pill tone={a.travado ? 'danger' : 'info'}>{fase}</Pill>
                          </div>
                        </>
                      ) : (
                        <span className="text-white/30 text-[11px] italic">sem projeto</span>
                      )}
                    </div>

                    <div className="text-[11px]">
                      {a.travado ? (
                        <span className="text-rose-300 font-bold flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {formatRelativeTime(a.ultimoUpdate)}
                        </span>
                      ) : (
                        <span className="text-white/55 flex items-center gap-1">
                          <Clock size={10} />
                          {formatRelativeTime(a.ultimoUpdate)}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-white/55">
                      {formatISORelative(a.user.lastLogin)}
                    </div>

                    <div className="text-right">
                      <p className="text-white font-bold text-[12px] m-0">
                        {a.iaUsado}<span className="text-white/40 text-[10px]">/{a.iaLimite}</span>
                      </p>
                      <div className="h-1 rounded-full bg-white/8 mt-1 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${LBW_GRADIENTS.amber}`}
                          style={{ width: `${Math.min(100, iaPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ==== MOBILE: card empilhado ==== */}
                  <div className="md:hidden px-4 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setDrillMember({ uid: a.user.uid, nome: a.user.nome || a.user.email.split('@')[0] })}
                          className="text-white font-bold text-sm m-0 truncate bg-transparent border-none p-0 cursor-pointer text-left hover:text-blue-300 block max-w-full">
                          {a.user.nome || a.user.email.split('@')[0]}
                        </button>
                        <p className="text-white/40 text-[11px] m-0 truncate">
                          {a.user.email}
                        </p>
                      </div>
                      {a.travado && (
                        <Pill tone="danger">
                          <AlertTriangle size={9} /> travado
                        </Pill>
                      )}
                    </div>

                    {a.projetoAtual ? (
                      <div className="mb-3">
                        <p className="text-white/75 text-[12px] m-0 truncate mb-1">
                          {(a.projetoAtual as any).name || '—'}
                        </p>
                        <Pill tone="info">{fase}</Pill>
                      </div>
                    ) : (
                      <p className="text-white/30 text-[11px] italic mb-3 m-0">sem projeto</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <p className="text-white/35 font-black tracking-widest uppercase m-0 mb-0.5">Atividade</p>
                        <p className={`m-0 font-bold ${a.travado ? 'text-rose-300' : 'text-white/70'}`}>
                          {formatRelativeTime(a.ultimoUpdate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/35 font-black tracking-widest uppercase m-0 mb-0.5">Login</p>
                        <p className="m-0 font-bold text-white/70">
                          {formatISORelative(a.user.lastLogin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/35 font-black tracking-widest uppercase m-0 mb-0.5">IA</p>
                        <p className="m-0 font-bold text-white/85">
                          {a.iaUsado}<span className="text-white/35">/{a.iaLimite}</span>
                        </p>
                        <div className="h-1 rounded-full bg-white/8 mt-0.5 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${LBW_GRADIENTS.amber}`}
                            style={{ width: `${Math.min(100, iaPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>}

      {/* ====== MEUS PROJETOS (condensado) ====== */}
      {false && (meusProjetos.data || []).length > 0 && (
        <div className="mb-6">
          <SectionLabel rightSlot={<a href="/projects" className="hover:text-white">Ver todos →</a>}>
            Meus projetos
          </SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(meusProjetos.data || []).slice(0, 3).map((p, i) => {
              const tone: GradientKey = FASE_TONE[p.currentPhase] || 'navy';
              return (
                <motion.a
                  key={p.id}
                  href={`/projects?open=${p.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  className="relative rounded-xl overflow-hidden p-4 hover:translate-y-[-2px] transition-transform"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br ${LBW_GRADIENTS[tone]} opacity-15 blur-2xl`} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill tone={p.travado ? 'danger' : 'info'}>{p.currentPhase}</Pill>
                    </div>
                    <h4 className="text-white font-black text-sm m-0 line-clamp-1">{p.name}</h4>
                    {p.initiativeName && (
                      <p className="text-white/45 text-[11px] m-0 mt-1 line-clamp-1">{p.initiativeName}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-white/40 flex items-center gap-1">
                        <Clock size={10} />
                        {formatRelativeTime(p.ultimoUpdate)}
                      </span>
                      <ArrowRight size={12} className="text-white/40" />
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      )}
      {/* ====== DRILL-DOWN: projetos do membro ====== */}
      {drillMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setDrillMember(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl" style={{ background: '#0f1626', border: '1px solid rgba(255,255,255,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0" style={{ background: '#0f1626' }}>
              <div>
                <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/40 m-0">Projetos de</p>
                <p className="text-white font-bold text-base m-0">{drillMember.nome}</p>
              </div>
              <button onClick={() => setDrillMember(null)} className="text-white/40 hover:text-white border-none bg-transparent cursor-pointer p-1"><X size={18} /></button>
            </div>
            <div className="p-5">
              {drillLoading ? (
                <p className="text-white/50 text-sm text-center py-8 m-0">Carregando projetos…</p>
              ) : !drillProjetos || drillProjetos.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8 m-0">Este membro ainda não tem projetos.</p>
              ) : (
                <div className="space-y-2">
                  {drillProjetos.map((p) => {
                    const prog = p.totalToolsNaIniciativa > 0 ? Math.round((p.completedTools.length / p.totalToolsNaIniciativa) * 100) : 0;
                    return (
                      <div key={p.id} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm m-0 truncate">{p.name}</p>
                            {p.initiativeName && <p className="text-white/40 text-[11px] m-0 truncate">{p.initiativeName}</p>}
                          </div>
                          <Pill tone={p.travado ? 'danger' : 'info'}>{p.currentPhase}</Pill>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                            <div className="h-full" style={{ width: `${prog}%`, background: 'linear-gradient(90deg,#1E2D6E,#0033CC)' }} />
                          </div>
                          <span className="text-white/50 text-[11px] font-bold whitespace-nowrap">{p.completedTools.length}/{p.totalToolsNaIniciativa} · {prog}%</span>
                          <span className="text-white/35 text-[11px] flex items-center gap-1 whitespace-nowrap"><Clock size={10} />{formatRelativeTime(p.ultimoUpdate)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </CoordenadorShell>
  );
}
