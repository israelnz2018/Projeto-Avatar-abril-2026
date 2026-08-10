/**
 * DashboardAlunoGratuito — dashboard motivacional pro plano Start.
 *
 * Mostra:
 *   - Saudação + barra de progresso na trilha atual do usuário
 *   - Stats: ferramentas usadas, vídeos do escopo, crédito IA, projetos
 *   - CTA de upgrade ("X trilhas bloqueadas")
 *
 * 100% resiliente: tudo lido dos hooks da Fase 0 (useUserContentScope /
 * useUserUsageStats). Se você mudar as trilhas, vídeos ou ferramentas amanhã,
 * este componente reflete sozinho — não há nada chumbado.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Wrench, Video, Sparkles, FolderKanban, Lock, ArrowRight } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useUserContentScope, useUserUsageStats } from '../../hooks/useDashboardData';
import { useUserAccess } from '../../hooks/useUserAccess';
import { HOTMART_CHECKOUT_URL } from '../../lib/constants';
import {
  DashboardShell,
  DashboardLoading,
  DashboardError,
  SectionLabel,
  StatCard,
  ProgressBar,
  LBW_GRADIENTS,
  Pill,
} from './_shared';
import VideoProgressSection from './VideoProgressSection';

interface Props {
  nome?: string | null;
}

export default function DashboardAlunoGratuito({ nome }: Props) {
  const uid = auth.currentUser?.uid || null;
  const { plano } = useUserAccess();
  const scope = useUserContentScope(uid);
  const stats = useUserUsageStats(uid);

  if (scope.loading || stats.loading) return <DashboardLoading />;
  if (scope.error) return <DashboardError message={scope.error.message} />;
  if (stats.error) return <DashboardError message={stats.error.message} />;
  if (!scope.data || !stats.data) return <DashboardError message="Dados indisponíveis." />;

  const trilhaAtual = scope.data.initiatives[0]; // primeira trilha acessível = trilha principal
  const totalAcessiveis = scope.data.initiatives.length;
  const totalGeral = scope.data.totalInitiatives;
  const bloqueadas = scope.data.initiativesBloqueadas;

  const ferramentasFeitas = stats.data.ferramentas.completadas;
  const ferramentasTotais = stats.data.ferramentas.disponiveis;
  const ferramentasLegado = stats.data.ferramentas.legadas;

  const videosTotais = stats.data.videos.disponiveis;
  const projetosTotal = stats.data.projetos.total;
  const ia = stats.data.creditoIA;

  const nomeAmigavel = (nome || '').split(' ')[0] || 'aluno';

  return (
    <DashboardShell>
      {/* ====== HEADER: saudação + progresso da trilha atual ====== */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <SectionLabel live rightSlot={<>Plano · {plano === 'gratuito' ? 'introdutório' : plano}</>}>
          Seu Dashboard
        </SectionLabel>

        <h1 className="text-[2rem] md:text-[2.5rem] font-black text-white leading-tight tracking-tight m-0 mb-2">
          Olá, {nomeAmigavel}.
        </h1>
        <p className="text-white/55 text-sm md:text-base max-w-2xl m-0 mb-6">
          {trilhaAtual ? (
            <>Você está no curso <span className="text-white font-bold">{trilhaAtual.name}</span>. Bora avançar?</>
          ) : (
            <>Você ainda não tem um curso ativo.</>
          )}
        </p>

        {trilhaAtual && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-white/50 m-0">
                Progresso no curso
              </p>
              <p className="text-[11px] font-bold text-white/70 m-0">
                {ferramentasFeitas} de {ferramentasTotais} ferramentas
              </p>
            </div>
            <ProgressBar value={ferramentasFeitas} max={Math.max(ferramentasTotais, 1)} gradient="navy" height={8} />
            {ferramentasLegado > 0 && (
              <p className="text-[10px] text-white/35 mt-2 m-0">
                + {ferramentasLegado} ferramenta{ferramentasLegado > 1 ? 's' : ''} legada{ferramentasLegado > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </motion.header>

      {/* ====== STATS GRID ====== */}
      <div className="mb-10">
        <SectionLabel>Visão geral</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Ferramentas"
            value={`${ferramentasFeitas}/${ferramentasTotais}`}
            sublabel={ferramentasFeitas === 0 ? 'comece sua primeira' : 'no seu plano'}
            icon={<Wrench size={16} />}
            gradient="navy"
            delay={0.05}
          />
          <StatCard
            label="Vídeos disponíveis"
            value={videosTotais}
            sublabel="no seu plano hoje"
            icon={<Video size={16} />}
            gradient="violet"
            delay={0.1}
          />
          <StatCard
            label="Crédito IA"
            value={`${ia.usado}/${ia.limite}`}
            sublabel={ia.diasParaReset > 0 ? `reseta em ${ia.diasParaReset}d` : 'renovação próxima'}
            icon={<Sparkles size={16} />}
            gradient="amber"
            delay={0.15}
          />
          <StatCard
            label="Projetos"
            value={projetosTotal}
            sublabel={projetosTotal === 0 ? 'crie o primeiro' : projetosTotal === 1 ? 'em andamento' : 'em andamento'}
            icon={<FolderKanban size={16} />}
            gradient="emerald"
            delay={0.2}
          />
        </div>
      </div>

      {/* ====== TRILHA ATUAL — destaque visual ====== */}
      {trilhaAtual && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mb-10"
        >
          <SectionLabel>Seu curso agora</SectionLabel>
          <div
            className="relative rounded-2xl overflow-hidden p-6 md:p-8"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: 180,
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${LBW_GRADIENTS.navy} opacity-20`} />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Pill tone="info">curso {totalAcessiveis > 1 ? `1 de ${totalAcessiveis}` : 'ativo'}</Pill>
                  {trilhaAtual.description && (
                    <span className="text-[10px] text-white/45 font-bold tracking-wider uppercase">{trilhaAtual.description.slice(0, 40)}</span>
                  )}
                </div>
                <h2 className="text-[1.4rem] md:text-[1.7rem] font-black text-white m-0 leading-tight">
                  {trilhaAtual.name}
                </h2>
                <p className="text-white/55 text-sm mt-2 m-0">
                  {ferramentasTotais} ferramenta{ferramentasTotais !== 1 ? 's' : ''} · {videosTotais} vídeo{videosTotais !== 1 ? 's' : ''} no escopo
                </p>
              </div>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-[#0033CC] text-[12px] font-black uppercase tracking-widest hover:bg-white/90 transition-all"
                style={{ cursor: 'pointer' }}
              >
                Ver na Jornada
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====== CTA DE UPGRADE ====== */}
      {bloqueadas > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-6"
        >
          <SectionLabel>Quer mais?</SectionLabel>
          <div
            className="relative rounded-2xl overflow-hidden p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, #1E2D6E 0%, #0033CC 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 12px 32px -8px rgba(0,51,204,0.4)',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Lock size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80 m-0 mb-1">
                    Plano Completo
                  </p>
                  <h3 className="text-white font-black text-[1.2rem] md:text-[1.4rem] m-0 leading-tight">
                    Desbloqueie {bloqueadas} {bloqueadas === 1 ? 'curso' : 'cursos'} a mais
                  </h3>
                  <p className="text-white/70 text-sm mt-1.5 m-0">
                    Você está em {totalAcessiveis} de {totalGeral} cursos. A próxima camada técnica espera.
                  </p>
                </div>
              </div>
              <a
                href={HOTMART_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-[#0033CC] text-[12px] font-black uppercase tracking-widest hover:bg-white/90 transition-all whitespace-nowrap"
                style={{ cursor: 'pointer' }}
              >
                Quero liberar tudo
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====== Progresso de vídeos por curso (apenas cursos acessíveis ao Starter) ====== */}
      <VideoProgressSection accessibleInitiatives={scope.data.initiatives} />
    </DashboardShell>
  );
}
