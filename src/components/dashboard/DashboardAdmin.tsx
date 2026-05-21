/**
 * DashboardAdmin — painel completo do admin, 4 abas:
 *   1. Negócio   — usuários, planos, crescimento, projetos, conteúdo
 *   2. Uso       — agregados sobre `eventos` (top tools, vídeos, perguntas IA, heatmap)
 *   3. Saúde     — gasto IA (Gemini vs Anthropic), feedbacks
 *   4. Usuários  — atalho pra rota /users (gestão já existente)
 *
 * Resiliente: zero IDs chumbados. Tudo lido dos hooks de dashboard.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, TrendingUp, Wrench, Video, Sparkles,
  AlertTriangle, MessageSquare, ExternalLink, BarChart2,
  Mail, Clock, Crown,
} from 'lucide-react';
import {
  useAdminGlobalStats, useAdminEventStats,
  useApiUsageRecente, useFeedbacksRecentes,
} from '../../hooks/useDashboardData';
import {
  DashboardShell, DashboardLoading, SectionLabel,
  StatCard, Pill, LBW_GRADIENTS, GradientKey,
} from './_shared';

type Aba = 'negocio' | 'uso' | 'saude' | 'usuarios';

const ABAS: Array<{ id: Aba; label: string; icon: React.ReactNode }> = [
  { id: 'negocio', label: 'Negócio', icon: <TrendingUp size={13} /> },
  { id: 'uso', label: 'Uso', icon: <BarChart2 size={13} /> },
  { id: 'saude', label: 'Saúde', icon: <Activity size={13} /> },
  { id: 'usuarios', label: 'Usuários', icon: <Crown size={13} /> },
];

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function formatRelative(ms: number): string {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return 'agora';
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function DashboardAdmin({ nome }: { nome?: string | null }) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('negocio');
  const nomeAmigavel = (nome || '').split(' ')[0] || 'Israel';

  return (
    <DashboardShell>
      {/* ====== HEADER ====== */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <SectionLabel live rightSlot={<>Admin</>}>
          Painel do Sistema
        </SectionLabel>
        <h1 className="text-[2rem] md:text-[2.5rem] font-black text-white tracking-tight m-0 mb-2">
          Olá, {nomeAmigavel}.
        </h1>
        <p className="text-white/55 text-sm md:text-base max-w-2xl m-0">
          Visão geral da plataforma. Escolha uma aba pra mergulhar.
        </p>
      </motion.header>

      {/* ====== TAB NAV ====== */}
      <div
        className="flex items-center gap-1 mb-8 p-1 rounded-xl w-fit"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAbaAtiva(a.id)}
            className="relative px-4 py-2 rounded-lg text-[11px] font-black tracking-widest uppercase transition-all flex items-center gap-2"
            style={{
              background: abaAtiva === a.id ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: abaAtiva === a.id ? 'white' : 'rgba(255,255,255,0.45)',
              border: '1px solid',
              borderColor: abaAtiva === a.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      {/* ====== ABA CONTENT ====== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={abaAtiva}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {abaAtiva === 'negocio' && <AbaNegocio />}
          {abaAtiva === 'uso' && <AbaUso />}
          {abaAtiva === 'saude' && <AbaSaude />}
          {abaAtiva === 'usuarios' && <AbaUsuarios />}
        </motion.div>
      </AnimatePresence>
    </DashboardShell>
  );
}

// =============================================================================
// ABA NEGÓCIO
// =============================================================================

function AbaNegocio() {
  const { data, loading } = useAdminGlobalStats();
  if (loading) return <SkeletonStats />;
  if (!data) return <p className="text-white/50">Sem dados.</p>;

  return (
    <>
      <SectionLabel>Visão geral</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Usuários"
          value={data.usuarios.total}
          sublabel={`+${data.usuarios.novosNoMes} no mês`}
          gradient="navy"
          delay={0.05}
        />
        <StatCard
          label="Projetos"
          value={data.projetos.total}
          sublabel="ativos no sistema"
          gradient="emerald"
          delay={0.1}
        />
        <StatCard
          label="IA consumida"
          value={data.iaCredito.totalUsadoMes}
          sublabel="créditos (todos usuários)"
          gradient="amber"
          delay={0.15}
        />
        <StatCard
          label="Conteúdo"
          value={data.conteudo.totalVideos}
          sublabel={`${data.conteudo.totalCursos} cursos · ${data.conteudo.totalInitiatives} trilhas`}
          gradient="violet"
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Breakdown por plano */}
        <BreakdownCard
          titulo="Por plano"
          itens={Object.entries(data.usuarios.porPlano)}
          totalRef={data.usuarios.total}
          gradient="navy"
        />
        {/* Breakdown por tipo */}
        <BreakdownCard
          titulo="Por tipo de usuário"
          itens={Object.entries(data.usuarios.porTipo)}
          totalRef={data.usuarios.total}
          gradient="emerald"
        />
      </div>

      {/* Breakdown de projetos por fase */}
      <BreakdownCard
        titulo="Projetos por fase"
        itens={Object.entries(data.projetos.porFase)}
        totalRef={data.projetos.total}
        gradient="sky"
      />

      {/* Top consumidores IA */}
      {data.iaCredito.topConsumidores.length > 0 && (
        <div className="mt-8">
          <SectionLabel>Top 10 — consumo de IA</SectionLabel>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {data.iaCredito.topConsumidores.map((u, i) => {
              const pct = u.limite > 0 ? (u.usado / u.limite) * 100 : 0;
              return (
                <div
                  key={u.uid}
                  className="grid grid-cols-[40px_2fr_1fr_120px] gap-3 px-5 py-3 items-center border-b border-white/5 last:border-0"
                >
                  <span className="text-white/40 font-black text-xs">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold m-0 truncate">{u.nome}</p>
                    <p className="text-white/40 text-[11px] m-0 truncate">{u.email}</p>
                  </div>
                  <p className="text-white text-sm font-bold m-0">
                    {u.usado}<span className="text-white/40 text-[11px]">/{u.limite}</span>
                  </p>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${LBW_GRADIENTS.amber}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// ABA USO
// =============================================================================

function AbaUso() {
  const [dias, setDias] = useState<number>(30);
  const { data, loading } = useAdminEventStats(dias);

  const periodos = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
  ];

  if (loading) return (
    <>
      <PeriodoSwitch dias={dias} setDias={setDias} periodos={periodos} />
      <SkeletonStats />
    </>
  );
  if (!data) return <p className="text-white/50">Sem dados.</p>;

  if (data.totalEventos === 0) {
    return (
      <>
        <PeriodoSwitch dias={dias} setDias={setDias} periodos={periodos} />
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.15)',
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <BarChart2 size={22} className="text-white/40" />
          </div>
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40 m-0 mb-2">
            Sem eventos no período
          </p>
          <p className="text-white/55 text-sm m-0 max-w-md mx-auto">
            A coleção <code className="text-white/75">eventos</code> ainda não tem registros nos últimos {dias} dias. Conforme os usuários abrirem ferramentas, virem vídeos, perguntarem pra IA ou rodarem análises, as métricas aparecem aqui.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PeriodoSwitch dias={dias} setDias={setDias} periodos={periodos} />
      <SectionLabel rightSlot={<>{data.totalEventos} eventos · {data.diasPeriodo}d</>}>
        Comportamento dos usuários
      </SectionLabel>

      {/* Top 4 categorias em grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <TopList titulo="Top ferramentas" itens={data.topFerramentas} icone={<Wrench size={13} />} gradient="navy" />
        <TopList titulo="Top vídeos" itens={data.topVideos} icone={<Video size={13} />} gradient="violet" />
        <TopList titulo="Top análises" itens={data.topAnalises} icone={<BarChart2 size={13} />} gradient="emerald" />
        <TopList titulo="IA por contexto" itens={data.topIaLocations} icone={<Sparkles size={13} />} gradient="amber" />
      </div>

      {/* Heatmap */}
      <div className="mb-8">
        <SectionLabel>Heatmap de atividade (dia × hora)</SectionLabel>
        <Heatmap matriz={data.heatmap} />
      </div>

      {/* Últimas perguntas IA */}
      {data.ultimasPerguntas.length > 0 && (
        <div>
          <SectionLabel rightSlot={<>{data.ultimasPerguntas.length} recentes</>}>
            Últimas perguntas pra IA
          </SectionLabel>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {data.ultimasPerguntas.slice(0, 12).map((q, i) => (
              <div key={i} className="px-5 py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Pill tone="info">{q.location}</Pill>
                  <span className="text-white/40 text-[10px] flex items-center gap-1">
                    <Mail size={9} />
                    {q.userEmail}
                  </span>
                  <span className="text-white/30 text-[10px] flex items-center gap-1 ml-auto">
                    <Clock size={9} />
                    {formatRelative(q.ts)}
                  </span>
                </div>
                <p className="text-white/75 text-[12px] m-0 line-clamp-2">{q.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// ABA SAÚDE
// =============================================================================

function AbaSaude() {
  const apiUsage = useApiUsageRecente(14);
  const feedbacks = useFeedbacksRecentes(15);

  if (apiUsage.loading) return <SkeletonStats />;
  const dados = apiUsage.data || [];
  const totalGemini = dados.reduce((s, d) => s + d.geminiCalls, 0);
  const totalAnthropic = dados.reduce((s, d) => s + d.anthropicCalls, 0);
  const totalTokensGemini = dados.reduce((s, d) => s + d.geminiTokens, 0);
  const totalTokensAnthropic = dados.reduce((s, d) => s + d.anthropicTokens, 0);
  const totalFalhas = dados.reduce((s, d) => s + d.falhas, 0);
  const totalCalls = totalGemini + totalAnthropic;
  const taxaErro = totalCalls > 0 ? (totalFalhas / totalCalls) * 100 : 0;

  return (
    <>
      <SectionLabel rightSlot={<>{dados.length} dias</>}>
        Gasto de IA (últimas 2 semanas)
      </SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Chamadas Anthropic"
          value={totalAnthropic.toLocaleString('pt-BR')}
          sublabel={`${(totalTokensAnthropic / 1000).toFixed(0)}k tokens`}
          gradient="navy"
          delay={0.05}
        />
        <StatCard
          label="Chamadas Gemini"
          value={totalGemini.toLocaleString('pt-BR')}
          sublabel={`${(totalTokensGemini / 1000).toFixed(0)}k tokens`}
          gradient="emerald"
          delay={0.1}
        />
        <StatCard
          label="Falhas totais"
          value={totalFalhas}
          sublabel={`${taxaErro.toFixed(2)}% erro`}
          gradient={taxaErro > 5 ? 'rose' : 'amber'}
          delay={0.15}
        />
        <StatCard
          label="Total chamadas"
          value={totalCalls.toLocaleString('pt-BR')}
          sublabel={dados.length > 0 ? `~${Math.round(totalCalls / dados.length)}/dia` : '—'}
          gradient="violet"
          delay={0.2}
        />
      </div>

      {/* Mini gráfico de barras diário */}
      {dados.length > 0 && (
        <div className="mb-8">
          <SectionLabel>Volume por dia</SectionLabel>
          <DailyBars dados={dados} />
        </div>
      )}

      {/* Feedbacks */}
      <SectionLabel rightSlot={<>{feedbacks.data?.length || 0} recentes</>}>
        Feedbacks
      </SectionLabel>
      {feedbacks.loading ? (
        <SkeletonRow />
      ) : !feedbacks.data || feedbacks.data.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center text-white/45 text-sm"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.10)',
          }}
        >
          Nenhum feedback registrado.
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {feedbacks.data.map(f => (
            <div key={f.id} className="px-5 py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <Pill tone={f.tipo === 'bug' ? 'danger' : f.tipo === 'sugestao' ? 'info' : 'neutral'}>{f.tipo}</Pill>
                <Pill tone={f.status === 'aberto' ? 'warning' : 'success'}>{f.status}</Pill>
                <span className="text-white/40 text-[10px] flex items-center gap-1 ml-auto">
                  <Clock size={9} />
                  {formatRelative(f.criadoEm)}
                </span>
              </div>
              <p className="text-white/75 text-[12px] m-0 line-clamp-2">{f.mensagem}</p>
              <p className="text-white/35 text-[10px] mt-1 m-0 flex items-center gap-1">
                <Mail size={9} />
                {f.userEmail}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// =============================================================================
// ABA USUÁRIOS — atalho pra /users (gestão já existente)
// =============================================================================

function AbaUsuarios() {
  return (
    <div
      className="rounded-2xl overflow-hidden p-8 md:p-12"
      style={{
        background: 'linear-gradient(135deg, #1E2D6E 0%, #0033CC 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/75 m-0 mb-2">
            Gestão de usuários
          </p>
          <h2 className="text-[1.5rem] md:text-[1.8rem] font-black text-white m-0 leading-tight">
            Painel completo está em /users
          </h2>
          <p className="text-white/70 text-sm mt-2 m-0 max-w-md">
            Listagem read-only com badges de consumo + edição de equipe de coordenador. Sem duplicar interface aqui.
          </p>
        </div>
        <a
          href="/users"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-[#0033CC] text-[12px] font-black uppercase tracking-widest hover:bg-white/90 transition-all whitespace-nowrap"
          style={{ cursor: 'pointer' }}
        >
          Abrir /users
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// PEÇAS COMPARTILHADAS
// =============================================================================

function PeriodoSwitch({
  dias,
  setDias,
  periodos,
}: {
  dias: number;
  setDias: (d: number) => void;
  periodos: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="flex items-center justify-end mb-4">
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {periodos.map(p => (
          <button
            key={p.value}
            onClick={() => setDias(p.value)}
            className="px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase transition-all"
            style={{
              background: dias === p.value ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: dias === p.value ? 'white' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({
  titulo,
  itens,
  totalRef,
  gradient,
}: {
  titulo: string;
  itens: [string, number][];
  totalRef: number;
  gradient: GradientKey;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/50 m-0 mb-4">
        {titulo}
      </p>
      <div className="space-y-2.5">
        {itens.sort((a, b) => b[1] - a[1]).map(([k, v]) => {
          const pct = totalRef > 0 ? (v / totalRef) * 100 : 0;
          return (
            <div key={k}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/85 text-[12px] font-bold capitalize">{k}</span>
                <span className="text-white/55 text-[11px]">
                  {v} <span className="text-white/30">· {pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${LBW_GRADIENTS[gradient]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopList({
  titulo,
  itens,
  icone,
  gradient,
}: {
  titulo: string;
  itens: Array<{ key: string; label?: string; count: number; uniqueUsers: number }>;
  icone: React.ReactNode;
  gradient: GradientKey;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${LBW_GRADIENTS[gradient]} opacity-30 flex items-center justify-center`}>
          {icone}
        </div>
        <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/65 m-0">
          {titulo}
        </p>
      </div>
      {itens.length === 0 ? (
        <p className="text-white/30 text-[11px] italic m-0">Sem dados ainda.</p>
      ) : (
        <div className="space-y-2">
          {itens.slice(0, 5).map((it, i) => {
            const maxCount = itens[0]?.count || 1;
            const pct = (it.count / maxCount) * 100;
            return (
              <div key={it.key}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white/35 font-black text-[10px] w-4 flex-shrink-0">{i + 1}</span>
                    <span className="text-white/85 text-[12px] truncate">{it.label || it.key}</span>
                  </div>
                  <span className="text-white/55 text-[11px] flex-shrink-0">
                    {it.count}<span className="text-white/30"> · {it.uniqueUsers}u</span>
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${LBW_GRADIENTS[gradient]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Heatmap({ matriz }: { matriz: number[][] }) {
  // Encontra o máximo pra normalizar a intensidade
  let max = 0;
  matriz.forEach(linha => linha.forEach(v => { if (v > max) max = v; }));

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Scroll horizontal no mobile pra não esmagar 24 colunas */}
      <div className="overflow-x-auto -mx-1 pb-1">
        <div style={{ minWidth: 520 }}>
          <div className="flex gap-1.5 mb-2">
            <div className="w-8 flex-shrink-0" />
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="flex-1 text-center text-white/30 text-[8px] font-bold">
                {h % 4 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {matriz.map((linha, d) => (
            <div key={d} className="flex gap-1.5 items-center mb-1">
              <div className="w-8 flex-shrink-0 text-white/40 text-[9px] font-black tracking-widest">{DIAS_SEMANA[d]}</div>
              {linha.map((v, h) => {
                const intensity = max > 0 ? v / max : 0;
                return (
                  <div
                    key={h}
                    className="flex-1 aspect-square rounded-sm transition-colors"
                    style={{
                      background: intensity > 0
                        ? `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`
                        : 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                    title={`${DIAS_SEMANA[d]} ${h}h — ${v} eventos`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-white/40">
        <span>menos</span>
        {[0.15, 0.4, 0.7, 1].map(i => (
          <div key={i} className="w-4 h-4 rounded-sm" style={{ background: `rgba(99, 102, 241, ${i})` }} />
        ))}
        <span>mais</span>
      </div>
    </div>
  );
}

function DailyBars({ dados }: { dados: Array<{ data: string; geminiCalls: number; anthropicCalls: number }> }) {
  const maxValor = Math.max(...dados.map(d => d.geminiCalls + d.anthropicCalls), 1);
  // ~28px por barra mantém legível mesmo com 14+ dias
  const minWidth = Math.max(dados.length * 28, 280);
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="overflow-x-auto -mx-1 pb-1">
        <div className="flex items-end gap-2 h-32" style={{ minWidth }}>
        {dados.map(d => {
          const totalAlturaPct = ((d.geminiCalls + d.anthropicCalls) / maxValor) * 100;
          const anthropicPct = d.anthropicCalls > 0 ? (d.anthropicCalls / (d.geminiCalls + d.anthropicCalls)) * 100 : 0;
          return (
            <div key={d.data} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex flex-col-reverse" style={{ height: `${totalAlturaPct}%` }}>
                <div
                  className={`bg-gradient-to-t ${LBW_GRADIENTS.navy} rounded-t-sm`}
                  style={{ height: `${anthropicPct}%`, minHeight: anthropicPct > 0 ? 2 : 0 }}
                  title={`Anthropic: ${d.anthropicCalls}`}
                />
                <div
                  className={`bg-gradient-to-t ${LBW_GRADIENTS.emerald} ${anthropicPct === 0 ? 'rounded-t-sm' : ''}`}
                  style={{ height: `${100 - anthropicPct}%`, minHeight: d.geminiCalls > 0 ? 2 : 0 }}
                  title={`Gemini: ${d.geminiCalls}`}
                />
              </div>
              <div className="text-white/30 text-[8px] font-bold">
                {d.data.slice(5).replace('-', '/')}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-white/55">
        <span className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm bg-gradient-to-br ${LBW_GRADIENTS.navy}`} />
          Anthropic
        </span>
        <span className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm bg-gradient-to-br ${LBW_GRADIENTS.emerald}`} />
          Gemini
        </span>
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-xl p-5 animate-pulse"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            height: 120,
          }}
        />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="rounded-xl h-32 animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    />
  );
}
