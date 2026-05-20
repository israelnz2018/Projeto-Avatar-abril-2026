/**
 * TrailerCanvas — "trailer" animado de cada trilha.
 *
 * Substituto local pro Remotion (que não está instalado no projeto).
 * Cada `motif` é uma animação SVG cinematográfica de loop contínuo,
 * tipicamente 4-6s, montada com Framer Motion.
 *
 * Uso:
 *   <TrailerCanvas motif="rising-line" accent="#3B82F6" />
 *
 * Notas técnicas:
 *   - Tudo é SVG inline — sem dependência externa, sem rasterizado.
 *   - `motion` v12 (Framer Motion) já está no projeto.
 *   - Performance: cada motif tem <30 elementos animados, GPU-friendly.
 *   - Não usa <video>, <canvas> ou Web Audio — puro DOM.
 */

import React from 'react';
import { motion } from 'motion/react';
import type { TrailerMotif } from './trilhas';

interface Props {
  motif: TrailerMotif;
  accent: string;
  /** Densidade/intensidade do efeito (0.5 — 1.5). Default 1. */
  intensity?: number;
  className?: string;
}

export function TrailerCanvas({ motif, accent, intensity = 1, className = '' }: Props) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(0.2px)' }}
      >
        <defs>
          <linearGradient id={`grad-${motif}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id={`glow-${motif}`}>
            <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <filter id={`blur-${motif}`}>
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {motif === 'pulse-grid' && <PulseGrid accent={accent} intensity={intensity} />}
        {motif === 'rising-line' && <RisingLine accent={accent} intensity={intensity} />}
        {motif === 'particle-cone' && <ParticleCone accent={accent} intensity={intensity} />}
        {motif === 'network-pulse' && <NetworkPulse accent={accent} intensity={intensity} />}
        {motif === 'spiral-flow' && <SpiralFlow accent={accent} intensity={intensity} />}
        {motif === 'shield-radar' && <ShieldRadar accent={accent} intensity={intensity} />}
        {motif === 'kanban-flow' && <KanbanFlow accent={accent} intensity={intensity} />}
        {motif === 'orbit-system' && <OrbitSystem accent={accent} intensity={intensity} />}
      </svg>
    </div>
  );
}

// =============================================================================
// MOTIFS
// =============================================================================

interface MotifProps { accent: string; intensity: number }

function PulseGrid({ accent }: MotifProps) {
  const cols = 16;
  const rows = 9;
  const cellW = 800 / cols;
  const cellH = 450 / rows;
  const cells = Array.from({ length: cols * rows }, (_, i) => ({
    x: (i % cols) * cellW,
    y: Math.floor(i / cols) * cellH,
    delay: ((i % cols) + Math.floor(i / cols)) * 0.08,
  }));
  return (
    <g>
      {cells.map((c, i) => (
        <motion.rect
          key={i}
          x={c.x + 2}
          y={c.y + 2}
          width={cellW - 4}
          height={cellH - 4}
          rx={2}
          fill={accent}
          initial={{ opacity: 0.04 }}
          animate={{ opacity: [0.04, 0.35, 0.04] }}
          transition={{
            duration: 3,
            delay: c.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      <motion.circle
        cx={400}
        cy={225}
        r={280}
        fill={`url(#glow-pulse-grid)`}
        animate={{ scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </g>
  );
}

function RisingLine({ accent }: MotifProps) {
  const points: [number, number][] = [
    [0, 380], [80, 360], [160, 340], [240, 310], [320, 300],
    [400, 260], [480, 240], [560, 190], [640, 160], [720, 90], [800, 60],
  ];
  const path = `M ${points.map(p => p.join(',')).join(' L ')}`;
  const area = `${path} L 800,450 L 0,450 Z`;
  return (
    <g>
      {/* Grid de fundo */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={i}
          x1={0} y1={45 + i * 45}
          x2={800} y2={45 + i * 45}
          stroke={accent}
          strokeOpacity={0.06}
          strokeWidth={1}
        />
      ))}
      <motion.path
        d={area}
        fill={`url(#grad-rising-line)`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0.4, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.3, 0.7, 1] }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: [0.65, 0, 0.35, 1], times: [0, 0.4, 0.85, 1] }}
        style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
      />
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p[0]} cy={p[1]}
          r={5}
          fill="white"
          stroke={accent}
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 6, delay: i * 0.25, repeat: Infinity,
            ease: 'easeOut', times: [0, 0.4, 0.85, 1],
          }}
        />
      ))}
    </g>
  );
}

function ParticleCone({ accent }: MotifProps) {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    angle: (i / 28) * Math.PI * 2,
    delay: (i * 0.08) % 2.5,
  }));
  return (
    <g>
      <motion.circle
        cx={400} cy={225} r={140}
        fill={`url(#glow-particle-cone)`}
        animate={{ scale: [0.7, 1, 0.7], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {particles.map(p => {
        const startR = 300;
        const endR = 30;
        const x1 = 400 + Math.cos(p.angle) * startR;
        const y1 = 225 + Math.sin(p.angle) * startR;
        const x2 = 400 + Math.cos(p.angle) * endR;
        const y2 = 225 + Math.sin(p.angle) * endR;
        return (
          <motion.line
            key={p.id}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={accent}
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0, 0.8, 0], pathLength: [0, 1, 1] }}
            transition={{
              duration: 2.5, delay: p.delay, repeat: Infinity,
              ease: 'easeOut', times: [0, 0.4, 1],
            }}
          />
        );
      })}
      <motion.circle
        cx={400} cy={225} r={18}
        fill={accent}
        animate={{ scale: [0.8, 1.4, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 15px ${accent})` }}
      />
    </g>
  );
}

function NetworkPulse({ accent }: MotifProps) {
  const nodes = [
    { id: 0, x: 400, y: 225, r: 22, label: true },
    { id: 1, x: 200, y: 120, r: 14 },
    { id: 2, x: 620, y: 110, r: 14 },
    { id: 3, x: 120, y: 290, r: 12 },
    { id: 4, x: 680, y: 320, r: 14 },
    { id: 5, x: 280, y: 380, r: 12 },
    { id: 6, x: 540, y: 380, r: 14 },
    { id: 7, x: 380, y: 60, r: 11 },
  ];
  return (
    <g>
      {/* Conexões */}
      {nodes.slice(1).map((n, i) => (
        <motion.line
          key={`l-${n.id}`}
          x1={400} y1={225} x2={n.x} y2={n.y}
          stroke={accent}
          strokeWidth={1.5}
          strokeOpacity={0.4}
          strokeDasharray="4 6"
          animate={{
            strokeDashoffset: [0, -20],
            strokeOpacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            strokeDashoffset: { duration: 2.5, repeat: Infinity, ease: 'linear' },
            strokeOpacity: { duration: 3, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={n.id}>
          <motion.circle
            cx={n.x} cy={n.y} r={n.r + 10}
            fill={accent}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.25, 0], scale: [0.6, 1.6, 0.6] }}
            transition={{ duration: 2.5, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.circle
            cx={n.x} cy={n.y} r={n.r}
            fill={n.label ? 'white' : accent}
            stroke={accent}
            strokeWidth={n.label ? 3 : 0}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>
      ))}
    </g>
  );
}

function SpiralFlow({ accent }: MotifProps) {
  const turns = 4;
  const points = Array.from({ length: 120 }, (_, i) => {
    const t = i / 119;
    const angle = t * Math.PI * 2 * turns;
    const r = 30 + t * 200;
    return [400 + Math.cos(angle) * r, 225 + Math.sin(angle) * r * 0.6];
  });
  const path = `M ${points.map(p => p.join(',')).join(' L ')}`;
  return (
    <g>
      <motion.path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeOpacity={0.7}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 0.85, 1] }}
        style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
      />
      {[0, 0.25, 0.5, 0.75].map((offset, i) => (
        <motion.circle
          key={i}
          r={4}
          fill="white"
          stroke={accent}
          strokeWidth={2}
          animate={{
            cx: points.map(p => p[0]),
            cy: points.map(p => p[1]),
          }}
          transition={{
            duration: 5,
            delay: offset * 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      <motion.circle
        cx={400} cy={225} r={20}
        fill={accent}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 0 12px ${accent})` }}
      />
    </g>
  );
}

function ShieldRadar({ accent }: MotifProps) {
  return (
    <g>
      {/* Anéis de radar */}
      {[80, 140, 200, 260].map((r, i) => (
        <motion.circle
          key={i}
          cx={400} cy={225} r={r}
          fill="none"
          stroke={accent}
          strokeOpacity={0.3}
          strokeWidth={1.5}
          strokeDasharray="3 6"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      {/* Setor varrendo */}
      <motion.g
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '400px 225px' }}
      >
        <path
          d="M 400 225 L 660 225 A 260 260 0 0 0 530 0 Z"
          fill={accent}
          opacity={0.18}
        />
        <line x1={400} y1={225} x2={660} y2={225}
              stroke={accent} strokeWidth={2} opacity={0.8} />
      </motion.g>
      {/* Alvos / pontos de risco */}
      {[
        { x: 540, y: 160, delay: 0 },
        { x: 280, y: 280, delay: 1.2 },
        { x: 480, y: 350, delay: 2.4 },
        { x: 320, y: 140, delay: 3.6 },
      ].map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r={6}
          fill={accent}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1, 0] }}
          transition={{
            duration: 5, delay: p.delay, repeat: Infinity,
            ease: 'easeOut', times: [0, 0.2, 0.7, 1],
          }}
        />
      ))}
      {/* Centro */}
      <circle cx={400} cy={225} r={6} fill={accent}
              style={{ filter: `drop-shadow(0 0 10px ${accent})` }} />
    </g>
  );
}

function KanbanFlow({ accent }: MotifProps) {
  const lanes = [120, 290, 460, 630];
  const cards = [
    { lane: 0, delay: 0 },
    { lane: 0, delay: 1 },
    { lane: 1, delay: 0.5 },
    { lane: 2, delay: 1.5 },
    { lane: 3, delay: 2 },
  ];
  return (
    <g>
      {lanes.map((x, i) => (
        <g key={i}>
          <rect x={x - 60} y={50} width={120} height={350} rx={8}
                fill={accent} fillOpacity={0.05}
                stroke={accent} strokeOpacity={0.2} />
          <rect x={x - 60} y={50} width={120} height={28} rx={8}
                fill={accent} fillOpacity={0.15} />
        </g>
      ))}
      {cards.map((c, i) => (
        <motion.rect
          key={i}
          width={100} height={44} rx={6}
          fill="white" opacity={0.9}
          initial={{ x: lanes[0] - 50, y: 100 + (i * 60) % 250 }}
          animate={{
            x: [lanes[0] - 50, lanes[1] - 50, lanes[2] - 50, lanes[3] - 50, lanes[0] - 50],
          }}
          transition={{
            duration: 8, delay: c.delay, repeat: Infinity, ease: 'easeInOut',
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        />
      ))}
    </g>
  );
}

function OrbitSystem({ accent }: MotifProps) {
  const orbits = [
    { r: 80, count: 1, duration: 6, size: 8 },
    { r: 140, count: 2, duration: 10, size: 7 },
    { r: 200, count: 3, duration: 14, size: 6 },
  ];
  return (
    <g>
      {/* Centro */}
      <motion.circle
        cx={400} cy={225} r={28}
        fill={accent}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 0 20px ${accent})` }}
      />
      {orbits.map((o, oi) => (
        <g key={oi}>
          <ellipse cx={400} cy={225} rx={o.r} ry={o.r * 0.5}
                   fill="none" stroke={accent} strokeOpacity={0.25}
                   strokeWidth={1} strokeDasharray="2 4" />
          {Array.from({ length: o.count }).map((_, ci) => {
            const phase = (ci / o.count);
            return (
              <motion.g
                key={ci}
                animate={{ rotate: [phase * 360, phase * 360 + 360] }}
                transition={{ duration: o.duration, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '400px 225px' }}
              >
                <circle cx={400 + o.r} cy={225} r={o.size}
                        fill="white" stroke={accent} strokeWidth={2} />
              </motion.g>
            );
          })}
        </g>
      ))}
    </g>
  );
}
