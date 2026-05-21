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

import React from 'react';
import { motion } from 'motion/react';
import {
  Users, FolderKanban, Sparkles, AlertTriangle,
  CheckCircle2, Clock, Mail, ArrowRight,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useUserAccess } from '../../hooks/useUserAccess';
import {
  useResumoEquipe,
  useUserUsageStats,
  useProjetosComDetalhes,
} from '../../hooks/useDashboardData';
import {
  DashboardShell, DashboardLoading, DashboardError,
  SectionLabel, StatCard, Pill, LBW_GRADIENTS, GradientKey,
} from './_shared';

interface Props {
  nome?: string | null;
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

export default function DashboardCoordenador({ nome }: Props) {
  const uid = auth.currentUser?.uid || null;
  const { empresaId, empresaNome } = useUserAccess();

  const equipe = useResumoEquipe(empresaId, uid);
  const meusStats = useUserUsageStats(uid);
  const meusProjetos = useProjetosComDetalhes(uid);

  if (equipe.loading || meusStats.loading || meusProjetos.loading) {
    return <DashboardLoading />;
  }
  if (equipe.error) return <DashboardError message={equipe.error.message} />;
  if (!equipe.data || !meusStats.data || !meusProjetos.data) {
    return <DashboardError message="Dados indisponíveis." />;
  }

  const nomeAmigavel = (nome || '').split(' ')[0] || 'coordenador';
  const time = equipe.data;
  const alunosTotal = time.length;
  const alunosTravados = time.filter(a => a.travado).length;
  const alunosSemProjeto = time.filter(a => !a.projetoAtual).length;
  const iaTimeTotal = time.reduce((s, a) => s + (a.iaUsado || 0), 0);
  const projetosTimeAtivos = time.filter(a => a.projetoAtual).length;

  // Coordenador sem empresaId → estado vazio elegante
  if (!empresaId) {
    return (
      <DashboardShell>
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
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
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
      </motion.header>

      {/* ====== STATS DO TIME ====== */}
      <div className="mb-10">
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
      </div>

      {/* ====== TABELA DO TIME ====== */}
      <div className="mb-10">
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
                      <p className="text-white font-bold text-sm m-0 truncate">
                        {a.user.nome || a.user.email.split('@')[0]}
                      </p>
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
                        <p className="text-white font-bold text-sm m-0 truncate">
                          {a.user.nome || a.user.email.split('@')[0]}
                        </p>
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
      </div>

      {/* ====== MEUS PROJETOS (condensado) ====== */}
      {meusProjetos.data.length > 0 && (
        <div className="mb-6">
          <SectionLabel rightSlot={<a href="/projects" className="hover:text-white">Ver todos →</a>}>
            Meus projetos
          </SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meusProjetos.data.slice(0, 3).map((p, i) => {
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
    </DashboardShell>
  );
}
