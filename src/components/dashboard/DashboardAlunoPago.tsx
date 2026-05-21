/**
 * DashboardAlunoPago — dashboard de trabalho pro plano Completo.
 *
 * Tudo o que o Gratuito tem + lista de projetos próprios + progresso em TODAS
 * as trilhas (cebola). Lê tudo dos hooks da Fase 0/3 — zero hardcoded.
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Wrench, Video, Sparkles, FolderKanban, ArrowRight,
  Clock, AlertTriangle, CheckCircle2, Plus, Lock,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  useUserContentScope,
  useUserUsageStats,
  useProgressoPorTrilha,
  useProjetosComDetalhes,
} from '../../hooks/useDashboardData';
import {
  DashboardShell, DashboardLoading, DashboardError,
  SectionLabel, StatCard, ProgressBar, Pill, LBW_GRADIENTS, GradientKey,
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
  if (!ms) return 'sem atividade';
  const diff = Date.now() - ms;
  const dias = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `${dias} dias atrás`;
  if (dias < 30) return `${Math.floor(dias / 7)} sem atrás`;
  return `${Math.floor(dias / 30)} mês(es) atrás`;
}

export default function DashboardAlunoPago({ nome }: Props) {
  const uid = auth.currentUser?.uid || null;
  const scope = useUserContentScope(uid);
  const stats = useUserUsageStats(uid);
  const trilhas = useProgressoPorTrilha(uid);
  const projetos = useProjetosComDetalhes(uid);

  if (scope.loading || stats.loading || trilhas.loading || projetos.loading) {
    return <DashboardLoading />;
  }
  if (scope.error) return <DashboardError message={scope.error.message} />;
  if (!scope.data || !stats.data || !trilhas.data || !projetos.data) {
    return <DashboardError message="Dados indisponíveis." />;
  }

  const nomeAmigavel = (nome || '').split(' ')[0] || 'aluno';
  const projetosAtivos = projetos.data.length;
  const projetosTravados = projetos.data.filter(p => p.travado).length;
  const ferramentasFeitas = stats.data.ferramentas.completadas;
  const ferramentasTotais = stats.data.ferramentas.disponiveis;
  const ia = stats.data.creditoIA;

  // Trilha "agora": a do projeto mais recente com initiativeId
  const trilhaAgora = projetos.data.find(p => p.initiativeId)?.initiativeName
    || trilhas.data.find(t => !t.bloqueada)?.initiative.name
    || null;

  return (
    <DashboardShell>
      {/* ====== HEADER ====== */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <SectionLabel live rightSlot={<>Plano Completo</>}>
          Seu Dashboard
        </SectionLabel>
        <h1 className="text-[2rem] md:text-[2.5rem] font-black text-white leading-tight tracking-tight m-0 mb-2">
          Olá, {nomeAmigavel}.
        </h1>
        <p className="text-white/55 text-sm md:text-base max-w-2xl m-0">
          {projetosAtivos > 0
            ? <>Você tem <span className="text-white font-bold">{projetosAtivos} projeto{projetosAtivos > 1 ? 's' : ''}</span> em andamento{trilhaAgora ? <> · trilha atual <span className="text-white font-bold">{trilhaAgora}</span></> : null}.</>
            : <>Pronto pra começar seu primeiro projeto?</>
          }
        </p>
      </motion.header>

      {/* ====== STATS GRID ====== */}
      <div className="mb-10">
        <SectionLabel>Visão geral</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Projetos ativos"
            value={projetosAtivos}
            sublabel={projetosTravados > 0 ? <span className="text-rose-300">{projetosTravados} travado{projetosTravados > 1 ? 's' : ''}</span> : 'todos em ritmo'}
            icon={<FolderKanban size={16} />}
            gradient="emerald"
            delay={0.05}
          />
          <StatCard
            label="Ferramentas"
            value={`${ferramentasFeitas}/${ferramentasTotais}`}
            sublabel="completadas no total"
            icon={<Wrench size={16} />}
            gradient="navy"
            delay={0.1}
          />
          <StatCard
            label="Vídeos disponíveis"
            value={scope.data.videoIds.size}
            sublabel="em todas as trilhas"
            icon={<Video size={16} />}
            gradient="violet"
            delay={0.15}
          />
          <StatCard
            label="Crédito IA"
            value={`${ia.usado}/${ia.limite}`}
            sublabel={ia.diasParaReset > 0 ? `reseta em ${ia.diasParaReset}d` : 'renovação próxima'}
            icon={<Sparkles size={16} />}
            gradient="amber"
            delay={0.2}
          />
        </div>
      </div>

      {/* ====== MEUS PROJETOS ====== */}
      <div className="mb-10">
        <SectionLabel rightSlot={<a href="/projects" className="hover:text-white">Ver todos →</a>}>
          Meus projetos
        </SectionLabel>
        {projetos.data.length === 0 ? (
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
              <Plus size={22} className="text-white/40" />
            </div>
            <p className="text-white/65 font-bold text-sm m-0 mb-2">Nenhum projeto ainda</p>
            <p className="text-white/45 text-xs m-0 mb-5 max-w-md mx-auto">
              Crie seu primeiro projeto e comece a rodar as ferramentas pela trilha.
            </p>
            <a
              href="/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#0033CC] text-[11px] font-black uppercase tracking-widest hover:bg-white/90 transition-all"
              style={{ cursor: 'pointer' }}
            >
              Criar projeto
              <ArrowRight size={13} />
            </a>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projetos.data.slice(0, 6).map((p, i) => {
              const tone: GradientKey = FASE_TONE[p.currentPhase] || 'navy';
              const pctTools = p.totalToolsNaIniciativa > 0
                ? (p.completedTools.length / p.totalToolsNaIniciativa) * 100
                : 0;
              return (
                <motion.a
                  key={p.id}
                  href={`/projects?open=${p.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4 }}
                  className="relative rounded-xl overflow-hidden p-5 group hover:translate-y-[-2px] transition-transform"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${LBW_GRADIENTS[tone]} opacity-15 blur-2xl`} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Pill tone={p.travado ? 'danger' : 'info'}>{p.currentPhase}</Pill>
                      {p.travado && <span className="text-[10px] font-bold text-rose-300 flex items-center gap-1"><AlertTriangle size={10} /> travado</span>}
                    </div>
                    <h3 className="text-white font-black text-[15px] leading-tight m-0 mb-1 line-clamp-2">
                      {p.name}
                    </h3>
                    {p.initiativeName && (
                      <p className="text-white/45 text-[11px] m-0 mb-3 line-clamp-1">
                        {p.initiativeName}
                      </p>
                    )}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black tracking-widest uppercase text-white/40">
                          Ferramentas
                        </span>
                        <span className="text-[10px] font-bold text-white/60">
                          {p.completedTools.length}{p.totalToolsNaIniciativa > 0 ? `/${p.totalToolsNaIniciativa}` : ''}
                        </span>
                      </div>
                      <ProgressBar value={pctTools} gradient={tone} height={4} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-[10px] text-white/40">
                      <Clock size={10} />
                      <span>{formatRelativeTime(p.ultimoUpdate)}</span>
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== PROGRESSO POR TRILHA (cebola) ====== */}
      <div className="mb-10">
        <SectionLabel rightSlot={<>{trilhas.data.filter(t => !t.bloqueada).length} de {trilhas.data.length} disponíveis</>}>
          Progresso nas trilhas
        </SectionLabel>
        <div className="space-y-3">
          {trilhas.data.map((t, i) => {
            const pct = t.ferramentasTotais > 0
              ? (t.ferramentasFeitas / t.ferramentasTotais) * 100
              : 0;
            const completa = pct >= 100;
            return (
              <motion.div
                key={t.initiative.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i, duration: 0.3 }}
                className="relative rounded-xl p-4 md:p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  opacity: t.bloqueada ? 0.55 : 1,
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.bloqueada && <Lock size={12} className="text-white/40 flex-shrink-0" />}
                    {completa && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
                    <h4 className="text-white font-black text-sm m-0 truncate">
                      {t.initiative.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-white/45">
                      {t.ferramentasFeitas}/{t.ferramentasTotais} ferr · {t.videosTotais} vídeo{t.videosTotais !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[11px] font-black text-white/80 min-w-[36px] text-right">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
                <ProgressBar
                  value={pct}
                  gradient={completa ? 'emerald' : t.bloqueada ? 'navy' : 'navy'}
                  height={5}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ====== Ferramentas legadas (se houver) ====== */}
      {stats.data.ferramentas.legadas > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}
        >
          <div className="text-white/40 text-xs">
            <span className="font-black text-white/65">{stats.data.ferramentas.legadas}</span> ferramenta{stats.data.ferramentas.legadas > 1 ? 's' : ''} legada{stats.data.ferramentas.legadas > 1 ? 's' : ''} — já completadas mas removidas das trilhas atuais. Histórico preservado.
          </div>
        </motion.div>
      )}
    </DashboardShell>
  );
}
