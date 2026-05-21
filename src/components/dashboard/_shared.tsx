/**
 * _shared — visual tokens + componentes pequenos reaproveitados pelos 4 dashboards.
 *
 * Linguagem visual herdada de JornadaPrincipal.tsx (aba "Sua Jornada"):
 *   - fundo #080a14 (dark navy/black)
 *   - branco com opacidades (text-white, text-white/60, text-white/40)
 *   - bordas rgba(255,255,255,0.12) light / 0.25 ativo
 *   - tipografia font-black tracking-widest uppercase pra labels
 *   - gradientes diagonais, glow boxShadow
 *   - motion enter animations
 *
 * Tokens em CSS/Tailwind pra eu não duplicar. Se você mudar o BG aqui,
 * todos os dashboards mudam juntos.
 */

import React from 'react';
import { motion } from 'motion/react';

// =============================================================================
// TOKENS
// =============================================================================

export const DASHBOARD_BG = '#080a14';

export const LBW_GRADIENTS = {
  navy:    'from-[#1E2D6E] to-[#0033CC]',
  emerald: 'from-emerald-700 to-emerald-500',
  amber:   'from-amber-700 to-amber-500',
  rose:    'from-rose-700 to-rose-500',
  violet:  'from-violet-700 to-violet-500',
  sky:     'from-sky-700 to-sky-500',
} as const;

export type GradientKey = keyof typeof LBW_GRADIENTS;

// =============================================================================
// SHELL — wrapper escuro padrão (replica o -m-8 da Jornada pra estourar o Layout)
// =============================================================================

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-8 min-h-screen" style={{ background: DASHBOARD_BG, color: 'white' }}>
      {/* Noise texture decorativa — mesma da Jornada */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10 px-6 md:px-12 lg:px-16 py-10">
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// SECTION LABEL — micro-label estilo "TRILHAS EM DESTAQUE · 1 de 9"
// =============================================================================

interface SectionLabelProps {
  children: React.ReactNode;
  live?: boolean;
  rightSlot?: React.ReactNode;
}

export function SectionLabel({ children, live, rightSlot }: SectionLabelProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5 text-[10px] md:text-[11px] font-black tracking-[0.3em] text-white/85 uppercase">
        {live && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        {children}
      </div>
      {rightSlot && <div className="text-[10px] md:text-[11px] text-white/50 font-bold tracking-wider uppercase">{rightSlot}</div>}
    </div>
  );
}

// =============================================================================
// STAT CARD — card escuro com gradient sutil + número grande
// =============================================================================

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  icon?: React.ReactNode;
  gradient?: GradientKey;
  delay?: number;
}

export function StatCard({ label, value, sublabel, icon, gradient = 'navy', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative rounded-xl overflow-hidden p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Gradient overlay sutil no canto superior direito */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${LBW_GRADIENTS[gradient]} opacity-20 blur-2xl`} />

      <div className="relative z-10 flex items-start justify-between mb-3">
        <p className="text-[10px] font-black tracking-[0.25em] text-white/50 uppercase m-0">
          {label}
        </p>
        {icon && <div className="text-white/40">{icon}</div>}
      </div>
      <div className="relative z-10">
        <p className="text-[2rem] font-black text-white leading-none m-0">{value}</p>
        {sublabel && <p className="text-[11px] text-white/45 font-bold mt-2 m-0">{sublabel}</p>}
      </div>
    </motion.div>
  );
}

// =============================================================================
// PROGRESS BAR — barra horizontal estilo Netflix (linear)
// =============================================================================

interface ProgressBarProps {
  value: number;     // 0-100
  max?: number;      // default 100 — se você passar `max`, value é absoluto
  gradient?: GradientKey;
  height?: number;
}

export function ProgressBar({ value, max = 100, gradient = 'navy', height = 6 }: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className="relative w-full rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.08)', height }}
    >
      <motion.div
        className={`h-full bg-gradient-to-r ${LBW_GRADIENTS[gradient]}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// =============================================================================
// EMPTY / LOADING / ERROR — estados padronizados
// =============================================================================

export function DashboardLoading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <DashboardShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[11px] font-black tracking-[0.3em] text-white/40 uppercase animate-pulse">
          {label}
        </div>
      </div>
    </DashboardShell>
  );
}

export function DashboardError({ message }: { message: string }) {
  return (
    <DashboardShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-rose-400 font-black uppercase tracking-widest text-xs">Erro ao carregar</p>
        <p className="text-white/50 text-sm max-w-md text-center">{message}</p>
      </div>
    </DashboardShell>
  );
}

// =============================================================================
// PILL — chips/tags pequenos (status, badges)
// =============================================================================

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'bg-white/10 text-white/70 border-white/15',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger:  'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info:    'bg-sky-500/15 text-sky-300 border-sky-500/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black tracking-widest uppercase ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
