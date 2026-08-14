import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Send, ArrowRight, Sparkles, Clock, HelpCircle,
  TrendingUp, BarChart3, Activity, Play, ChevronRight, Compass,
  X, FolderTree, BookOpen, Wand2,
  Footprints, ShieldAlert, Users, LineChart, Mic, Recycle, Trophy, Lock,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '@/src/lib/firebase';
import { AIConfig, DEFAULT_CONFIG, AI_CONFIG_DOC, TreeNode, NavCategory, LinkedVideo, LeafAction } from './AIAssistantConfig';
import { getInitiatives } from '../services/configService';
import type { Initiative } from '../types';
import { getGlobalKnowledge, getTrilhaKnowledge, getAllKnowledge } from '../knowledge/loader';
import { KNOWLEDGE_COLLECTION } from '../services/knowledgeService';
import { useUserAccess } from '../hooks/useUserAccess';
import { LockedToolPopup } from './LockedToolPopup';

const LBW = { navy: '#1E2D6E', blue: '#0033CC', light: '#F0F2FA', ink: '#2A2F3A', white: '#FFFFFF' };

type ProjectType = 'DMAIC' | 'Lean' | 'ADKAR' | 'PMI' | 'QuickWin';
const TYPE_PALETTE: Record<ProjectType, any> = {
  DMAIC:    { label: 'Seis Sigma DMAIC',  tag: 'Estratégico', glow: 'rgba(0,51,204,0.42)',  from: '#1E2D6E', to: '#0033CC', ring: '#0033CC', soft: '#E6EAFB', ink: '#0F1A52' },
  Lean:     { label: 'Lean / Kaizen',     tag: 'Operacional', glow: 'rgba(15,110,86,0.40)', from: '#0F6E56', to: '#1E2D6E', ring: '#0F6E56', soft: '#DDEEE8', ink: '#06453A' },
  ADKAR:    { label: 'Gestão de Mudança', tag: 'Pessoas',     glow: 'rgba(0,51,204,0.40)',  from: '#0033CC', to: '#6699FF', ring: '#0033CC', soft: '#E2EBFF', ink: '#0F1A52' },
  PMI:      { label: 'Gestão de Projeto', tag: 'Estrutura',   glow: 'rgba(30,45,110,0.42)', from: '#1E2D6E', to: '#2A2F3A', ring: '#1E2D6E', soft: '#E6E9F2', ink: '#0F1A52' },
  QuickWin: { label: 'Quick Win',         tag: 'Imediato',    glow: 'rgba(160,120,0,0.40)', from: '#A07800', to: '#0033CC', ring: '#A07800', soft: '#FFF1D8', ink: '#5B3A06' },
};

const CATEGORY_ICONS: Record<string, any> = { projects: TrendingUp, data: BarChart3, stats: Activity };
const CATEGORY_TYPES: Record<string, ProjectType> = { projects: 'DMAIC', data: 'PMI', stats: 'DMAIC' };
const CATEGORY_TAGS: Record<string, string> = { projects: 'Mais usado', data: 'Insights', stats: 'Pontual' };
const CATEGORY_VARIANTS: Record<string, 'light' | 'outlined' | 'dark'> = { projects: 'light', data: 'outlined', stats: 'dark' };
const LANGS = [{ code: 'pt-BR', flag: '🇧🇷', label: 'PT' }, { code: 'en-US', flag: '🇺🇸', label: 'EN' }, { code: 'es-ES', flag: '🇪🇸', label: 'ES' }];

// 8 trilhas — labels + cores espelhando trilhas.ts (mesma identidade visual da aba Jornada).
// Quando clica, a IA puxa esse contexto e faz 2-3 follow-ups pra confirmar a trilha exata.
// Nota: antiga T2 "Investigar Problemas" foi fundida na T1 em jun/2026.
// Ordem segue o funil de venda (Opção A — pesquisa-baseada):
//   01 (gateway) → 02 Dados (hard skill complementar) →
//   03 Mudanças + 04 Apresentações (soft skills mais demandadas no BR) →
//   05 Riscos + 06 Lean (refinamento) → 07 Estatística (profundidade) →
//   08 Especialista (âncora — Master Black Belt + PMP)
const TRILHA_HERO_CARDS = [
  { id: 'ferramentas-dia-a-dia',           num: '01', icon: Footprints,  label: 'Como Chegar em uma Área Nova e Entregar Resultado Rapidamente',           gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 55%, #312E81 100%)', glow: 'rgba(59, 130, 246, 0.45)'  },
  { id: 'dados-do-dia-a-dia',              num: '02', icon: BarChart3,   label: 'Como Recomendar Melhorias com Base em Análise de Dados',                  gradient: 'linear-gradient(135deg, #22D3EE 0%, #2563EB 55%, #1E3A8A 100%)', glow: 'rgba(34, 211, 238, 0.45)'  },
  { id: 'mudanca-com-menos-resistencia',   num: '03', icon: Users,       label: 'Como Conduzir Mudanças com Menos Resistência',                            gradient: 'linear-gradient(135deg, #FBBF24 0%, #EA580C 55%, #7F1D1D 100%)', glow: 'rgba(245, 158, 11, 0.45)'  },
  { id: 'apresentar-recomendacao',         num: '04', icon: Mic,         label: 'Como Criar Apresentações que Convencem',                                  gradient: 'linear-gradient(135deg, #FB923C 0%, #EF4444 55%, #9F1239 100%)', glow: 'rgba(249, 115, 22, 0.45)'  },
  { id: 'analise-risco-mudanca',           num: '05', icon: ShieldAlert, label: 'Como Antecipar Riscos Antes que Virem Problemas',                         gradient: 'linear-gradient(135deg, #EF4444 0%, #BE123C 55%, #0F172A 100%)', glow: 'rgba(239, 68, 68, 0.45)'   },
  { id: 'perfil-gestor-lean',              num: '06', icon: Recycle,     label: 'Cultura Lean na Prática',                                                 gradient: 'linear-gradient(135deg, #34D399 0%, #0D9488 55%, #064E3B 100%)', glow: 'rgba(16, 185, 129, 0.45)'  },
  { id: 'problema-cronico',                num: '07', icon: LineChart,   label: 'Como Fazer Análises Estatísticas Aplicadas a Negócios',                   gradient: 'linear-gradient(135deg, #C084FC 0%, #7C3AED 55%, #312E81 100%)', glow: 'rgba(168, 85, 247, 0.45)'  },
  { id: 'especialista-projetos-complexos', num: '08', icon: Trophy,      label: 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria',        gradient: 'linear-gradient(135deg, #1E2D6E 0%, #0033CC 55%, #0A0F33 100%)', glow: 'rgba(0, 51, 204, 0.55)'    },
] as const;

type TrilhaHeroCard = typeof TRILHA_HERO_CARDS[number];

const ISRAEL_PHOTO = '/avatar-israel.png';

interface ClassificationData { type: ProjectType; duration: string; justification: string; question: string; }
interface ChatMessage { id: string; role: 'user' | 'ai'; text?: string; classification?: ClassificationData; }

function normalizeNode(n: any): TreeNode {
  return {
    id: n?.id || '',
    title: n?.title || '',
    fields: Array.isArray(n?.fields) ? n.fields : [],
    videos: Array.isArray(n?.videos) ? n.videos : [],
    children: Array.isArray(n?.children) ? n.children.map(normalizeNode) : [],
    actionType: n?.actionType,
  };
}

function normalizeConfig(data: any): AIConfig {
  return {
    mentorRules: data?.mentorRules || DEFAULT_CONFIG.mentorRules,
    categories: (Array.isArray(data?.categories) ? data.categories : DEFAULT_CONFIG.categories).map((c: any) => ({
      id: c?.id || '', title: c?.title || '', subtitle: c?.subtitle || '', colorIndex: c?.colorIndex,
      items: (() => {
        if (Array.isArray(c?.items)) return c.items.map(normalizeNode);
        if (Array.isArray(c?.subcategories)) {
          return c.subcategories.map((sub: any) => ({
            id: sub?.id || '', title: sub?.title || '',
            fields: Array.isArray(sub?.fields) ? sub.fields : [],
            videos: Array.isArray(sub?.videos) ? sub.videos : [],
            children: Array.isArray(sub?.children) ? sub.children.map(normalizeNode) : [],
            actionType: sub?.actionType,
          }));
        }
        return [];
      })(),
    })),
  };
}

async function enrichConfigWithBunny(config: AIConfig): Promise<AIConfig> {
  const ids = new Set<string>();
  const collect = (nodes: TreeNode[]) => nodes.forEach(node => {
    node.videos.forEach(video => ids.add(video.id));
    collect(node.children || []);
  });
  config.categories.forEach(category => collect(category.items));
  const values = await Promise.all([...ids].map(async id => {
    const snap = await getDoc(doc(db, KNOWLEDGE_COLLECTION, id));
    return snap.exists() ? [id, snap.data()] as const : null;
  }));
  const byId = new Map(values.filter(Boolean) as Array<readonly [string, any]>);
  const enrich = (nodes: TreeNode[]): TreeNode[] => nodes.map(node => ({
    ...node,
    videos: node.videos.map(video => {
      const entry = byId.get(video.id);
      return {
        ...video,
        bunnyVideoId: entry?.bunnyVideoId || video.bunnyVideoId,
        bunnyLibraryId: entry?.bunnyLibraryId || video.bunnyLibraryId,
      };
    }),
    children: enrich(node.children || []),
  }));
  return { ...config, categories: config.categories.map(category => ({ ...category, items: enrich(category.items) })) };
}

function MentorOrb({ size = 56, showHalo = true, isSpeaking = false, online = true, crop = 'head' }: {
  size?: number; showHalo?: boolean; isSpeaking?: boolean; online?: boolean; crop?: 'head' | 'bust';
}) {
  const reduce = useReducedMotion();
  const halo = size * 1.55;
  const ringW = Math.max(2, size * 0.06);
  const dot = Math.max(8, size * 0.22);
  const isBust = crop === 'bust';
  const imgScale = isBust ? 1.15 : 1.85;
  const imgTopShift = isBust ? '-50%' : '-54%';
  const showFaceFx = !reduce && size >= 44 && isSpeaking && !isBust;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {showHalo && (
        <motion.div aria-hidden className="absolute rounded-full"
          style={{
            width: halo, height: halo, top: (size - halo)/2, left: (size - halo)/2,
            background: `radial-gradient(closest-side, ${LBW.blue}55, ${LBW.navy}22 50%, transparent 72%)`,
            filter: 'blur(8px)',
          }}
          animate={reduce ? {} : {
            scale: isSpeaking ? [1, 1.22, 1] : [1, 1.10, 1],
            opacity: isSpeaking ? [0.7, 1, 0.7] : [0.55, 0.85, 0.55],
          }}
          transition={{ duration: isSpeaking ? 1.1 : 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <motion.div aria-hidden className="absolute rounded-full"
        style={{
          inset: -ringW,
          background: `conic-gradient(from 0deg, ${LBW.blue}, ${LBW.navy}, #6699FF, ${LBW.blue})`,
          filter: isSpeaking ? 'saturate(1.25) brightness(1.18)' : 'none',
        }}
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: isSpeaking ? 3.2 : 9, repeat: Infinity, ease: 'linear' }}
      />
      <div aria-hidden className="absolute rounded-full" style={{ inset: 0, background: LBW.white }} />
      <motion.div className="absolute rounded-full overflow-hidden"
        style={{
          inset: 1.5,
          boxShadow: isSpeaking
            ? `0 0 0 ${ringW*0.5}px ${LBW.white}, 0 10px 28px -8px ${LBW.blue}99`
            : `0 0 0 ${ringW*0.5}px ${LBW.white}, 0 6px 20px -10px ${LBW.navy}66`,
          background: `linear-gradient(180deg, ${LBW.light}, ${LBW.white})`,
        }}
        animate={reduce ? {} : (isSpeaking ? { rotate: [-1.2, 1.2, -1.2] } : { rotate: 0 })}
        transition={{ duration: 0.9, repeat: isSpeaking ? Infinity : 0, ease: 'easeInOut' }}
      >
        <img src={ISRAEL_PHOTO} alt="Israel · Mentor LBW" draggable={false} className="absolute object-cover"
          style={{
            width: `${imgScale*100}%`, height: `${imgScale*100}%`,
            left: '50%', top: '50%', transform: `translate(-50%, ${imgTopShift})`,
          }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.background = `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})`;
            img.removeAttribute('src');
          }}
        />
        {showFaceFx && (
          <>
            <motion.div aria-hidden className="absolute"
              style={{ left: '50%', top: '66%', width: size * 0.17, height: 2, translate: '-50% -50%', background: '#3A1410', borderRadius: size * 0.04, mixBlendMode: 'multiply' }}
              animate={{ height: [2, size*0.075, 2, size*0.05, 2] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div aria-hidden className="absolute"
              style={{ left: '22%', right: '22%', top: '44%', height: Math.max(3, size * 0.045), background: '#E4B59B', borderRadius: 4, opacity: 0 }}
              animate={{ opacity: [0, 0, 0.9, 0, 0] }}
              transition={{ duration: 4, times: [0, 0.45, 0.5, 0.55, 1], repeat: Infinity }}
            />
          </>
        )}
      </motion.div>
      {online && size >= 28 && (
        <span aria-hidden className="absolute rounded-full ring-2 ring-white"
          style={{ width: dot, height: dot, right: -dot*0.1, bottom: -dot*0.1, background: '#22C55E', boxShadow: '0 0 0 2px rgba(34,197,94,0.20)' }}
        />
      )}
    </div>
  );
}

function MeshBackground() {
  const reduce = useReducedMotion();
  const blobs = useMemo(() => ([
    { c: '#C7D2FF', x: '8%',  y: '14%', s: 520 },
    { c: '#A8B6FF', x: '78%', y: '8%',  s: 480 },
    { c: '#D4DCFF', x: '62%', y: '78%', s: 540 },
    { c: '#E2E8FF', x: '12%', y: '82%', s: 460 },
  ]), []);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {blobs.map((b, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ left: b.x, top: b.y, width: b.s, height: b.s, background: `radial-gradient(closest-side, ${b.c}, transparent 70%)`, filter: 'blur(60px)', opacity: 0.55 }}
          animate={reduce ? {} : { x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
          transition={{ duration: 20 + i*3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${LBW.light}33, ${LBW.light}99)` }} />
    </div>
  );
}

function HeroCard({ cat, type, tag, variant, icon: Icon, i, onClick }: {
  cat: NavCategory; type: ProjectType; tag: string; variant: 'light' | 'outlined' | 'dark';
  icon: any; i: number; onClick: () => void;
}) {
  const pal = TYPE_PALETTE[type];
  const isDark = variant === 'dark';
  const isOutlined = variant === 'outlined';
  const cardBg = isDark ? LBW.navy : (isOutlined ? LBW.white : LBW.light);
  const cardBorder = isDark ? 'transparent' : (isOutlined ? LBW.blue : 'rgba(30,45,110,0.08)');
  const titleColor = isDark ? LBW.white : (isOutlined ? LBW.ink : LBW.navy);
  const subColor = isDark ? 'rgba(255,255,255,0.72)' : '#52596B';
  const tagColor = isDark ? '#9EB6FF' : LBW.blue;
  const iconBg = isDark ? 'rgba(255,255,255,0.12)' : (isOutlined ? `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})` : `linear-gradient(135deg, ${LBW.blue}, ${LBW.navy})`);
  const arrowBg = isDark ? LBW.white : LBW.blue;
  const arrowColor = isDark ? LBW.navy : LBW.white;
  return (
    <motion.button
      initial={{ opacity: 0, y: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.18 + i*0.07, type: 'spring', stiffness: 220, damping: 18 }}
      whileHover="hover" whileTap={{ scale: 0.98 }} onClick={onClick}
      className="group relative text-left rounded-[24px] p-6 overflow-hidden flex flex-col gap-5 cursor-pointer min-h-[260px]"
      style={{
        background: cardBg, border: `1px solid ${cardBorder}`,
        boxShadow: isDark ? `0 18px 50px -22px ${LBW.navy}90` : (isOutlined ? `0 0 0 1px ${LBW.blue}22 inset, 0 12px 36px -20px ${LBW.navy}30` : `0 1px 0 rgba(255,255,255,0.7) inset, 0 14px 40px -16px ${LBW.navy}33`),
      }}
    >
      <motion.div aria-hidden className="absolute -inset-[40%] rounded-full pointer-events-none"
        style={{ background: isDark ? `radial-gradient(closest-side, #6699FF55, transparent 70%)` : `radial-gradient(closest-side, ${LBW.blue}26, transparent 70%)`, top: '-30%', right: '-30%', left: 'auto', width: 420, height: 420 }}
        variants={{ hover: { scale: 1.15, opacity: 1 } }} initial={{ opacity: 0.85 }}
      />
      <motion.div className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: iconBg, color: LBW.white, boxShadow: isDark ? `0 8px 22px -8px ${LBW.blue}` : `0 10px 24px -8px ${pal.glow}`, border: isDark ? '1px solid rgba(255,255,255,0.18)' : 'none' }}
        variants={{ hover: { y: -2, scale: 1.06, rotate: -3 } }}
      >
        <Icon size={24} strokeWidth={2.2} />
      </motion.div>
      <div className="relative flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: tagColor }}>{tag}</span>
        </div>
        <h3 className="text-[22px] font-semibold leading-[1.1] tracking-tight mb-2" style={{ color: titleColor }}>{cat.title}</h3>
        <p className="text-[14px] leading-relaxed" style={{ color: subColor }}>{cat.subtitle}</p>
      </div>
      <div className="relative flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#6B7180' }}>Começar</span>
        <motion.div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: arrowBg, color: arrowColor }} variants={{ hover: { x: 4 } }}>
          <ArrowRight size={15} />
        </motion.div>
      </div>
    </motion.button>
  );
}

// NineCard — card do grid 3×3 do hero. Texto grande, centralizado, sem número/ícone.
// Usa o gradiente da trilha correspondente, suavizado com camada branca pra ficar menos agressivo.
function NineCard({ card, i, onClick, compact = false, locked = false }: {
  card: TrilhaHeroCard; i: number; onClick: () => void; compact?: boolean; locked?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.12 + i * 0.035, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -2, scale: locked ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer text-white px-4"
      style={{
        // Stack: camada branca sobre o gradiente original = mesma identidade, tom mais claro.
        background: `linear-gradient(135deg, rgba(255,255,255,0.42), rgba(255,255,255,0.20)), ${card.gradient}`,
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: `0 12px 28px -18px ${card.glow}, 0 4px 14px -10px rgba(0,0,0,0.18)`,
        height: compact ? 76 : 96,
        opacity: locked ? 0.6 : 1,
      }}
      title={locked ? 'Conteúdo não liberado' : undefined}
    >
      {/* Glow decorativo (mais sutil agora) */}
      <div aria-hidden className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.35), transparent 70%)' }}
      />
      {/* Cadeado no canto quando bloqueado */}
      {locked && (
        <div className="absolute top-2 right-2 bg-black/35 rounded-full p-1.5 z-10">
          <Lock size={13} className="text-white" />
        </div>
      )}
      {/* Número da trilha + nome real, centralizados */}
      <div className="relative flex items-center gap-2.5 px-1">
        <span aria-hidden className="font-bold leading-none flex-shrink-0"
          style={{
            fontFamily: "'Space Grotesk', 'Geist', sans-serif",
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            fontSize: compact ? '22px' : '28px',
          }}>
          {card.num}
        </span>
        <p className="font-semibold tracking-tight m-0 text-left"
          style={{
            color: 'rgba(255,255,255,1)',
            textShadow: '0 1px 3px rgba(0,0,0,0.35), 0 0 1px rgba(0,0,0,0.25)',
            fontSize: compact ? '12px' : '13.5px',
            lineHeight: 1.15,
          }}>
          {card.label}
        </p>
      </div>
    </motion.button>
  );
}

function TreeCard({ item, type, i, onClick }: { item: TreeNode; type: ProjectType; i: number; onClick: () => void }) {
  const pal = TYPE_PALETTE[type];
  const hasChildren = (item.children || []).length > 0;
  return (
    <motion.button
      initial={{ opacity: 0, y: 14, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.05 + i*0.06, type: 'spring', stiffness: 240, damping: 20 }}
      whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className="group relative text-left rounded-[20px] p-5 bg-white/85 backdrop-blur border border-black/[0.06] overflow-hidden cursor-pointer"
      style={{ boxShadow: '0 6px 24px -14px rgba(40,30,80,0.22)' }}
    >
      <motion.div aria-hidden className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-70"
        style={{ background: `radial-gradient(closest-side, ${pal.from}33, transparent 70%)` }} whileHover={{ scale: 1.2 }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
          style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}>
          <FolderTree size={16} />
        </div>
        {hasChildren && (
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full"
            style={{ background: pal.soft, color: pal.ink }}>{item.children.length} opções</span>
        )}
      </div>
      <h4 className="relative text-[16px] font-semibold text-stone-900 leading-snug tracking-tight mb-1.5">{item.title}</h4>
      <div className="relative flex items-center gap-1.5 text-[12px] font-medium mt-3" style={{ color: pal.ring }}>
        {hasChildren ? 'Explorar' : 'Continuar'} <ChevronRight size={14} />
      </div>
    </motion.button>
  );
}

function Breadcrumbs({ crumbs, onBack, color }: { crumbs: string[]; onBack: () => void; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <motion.button onClick={onBack} whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }}
        className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase" style={{ color }}>
        ← Voltar
      </motion.button>
      <span className="text-stone-300">·</span>
      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-stone-500 flex-wrap">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={11} className="text-stone-400" />}{c}
          </span>
        ))}
      </div>
    </div>
  );
}

function DetectionCard({ d }: { d: ClassificationData }) {
  const pal = TYPE_PALETTE[d.type] || TYPE_PALETTE.DMAIC;
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative rounded-[20px] p-5 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${pal.soft}, white)`, border: `1px solid ${pal.ring}33`, boxShadow: `0 20px 50px -25px ${pal.glow}` }}
    >
      <div aria-hidden className="absolute -top-20 -right-20 w-60 h-60 rounded-full"
        style={{ background: `radial-gradient(closest-side, ${pal.ring}33, transparent 70%)` }} />
      <div className="relative flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}>
            <Sparkles size={14} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: pal.ring }}>Projeto detectado</span>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
          style={{ background: pal.ring + '22', color: pal.ink }}>{pal.tag}</span>
      </div>
      <h3 className="text-[28px] font-semibold tracking-tight leading-tight mb-2" style={{ color: pal.ink }}>{pal.label}</h3>
      <div className="flex items-center gap-2 mb-4" style={{ color: pal.ring }}>
        <Clock size={13} />
        <span className="text-[13px] font-medium">Duração estimada: {d.duration}</span>
      </div>
      <div className="border-t pt-4 mb-3" style={{ borderColor: pal.ring + '22' }}>
        <p className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color: pal.ring }}>Por que esse caminho</p>
        <p className="text-[14px] leading-relaxed m-0" style={{ color: pal.ink }}>{d.justification}</p>
      </div>
      <div className="rounded-xl p-3 flex items-start gap-2.5"
        style={{ background: pal.ring + '11', border: `1px solid ${pal.ring}22` }}>
        <HelpCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: pal.ring }} />
        <p className="text-[14px] font-semibold leading-relaxed m-0" style={{ color: pal.ink }}>{d.question}</p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <MentorOrb size={30} showHalo={false} online={false} />
      <div className="bg-white rounded-[18px] rounded-bl-[6px] border border-stone-200/60 px-4 py-3 flex items-center gap-1.5">
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ background: LBW.blue }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i*0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatAssistant() {
  const navigate = useNavigate();
  const userName = (localStorage.getItem('usuarioEmail')?.split('@')[0] || 'aluno').split('.')[0];
  const userInitial = userName.charAt(0).toUpperCase();

  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [navPath, setNavPath] = useState<string[]>([]);
  const [view, setView] = useState<'hero' | 'tree' | 'leaf' | 'chat'>('hero');
  const [dir, setDir] = useState<1 | -1>(1);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  // Limite de crédito de IA atingido → mostra aviso + botão de solicitar mais.
  const [creditoEsgotado, setCreditoEsgotado] = useState(false);
  const [solicitouCredito, setSolicitouCredito] = useState(false);
  const [showAiTyping, setShowAiTyping] = useState(false);
  const [lang, setLang] = useState('pt-BR');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Quando o usuário clica em um dos 9 cards de trilha, os outros somem e a IA inicia follow-up
  // INLINE no mesmo hero (sem trocar de view — tudo cabe em 1 dobra).
  const [pickedCard, setPickedCard] = useState<TrilhaHeroCard | null>(null);
  const heroChatScrollRef = useRef<HTMLDivElement>(null);

  // Bloqueio por plano: o aluno gratuito só usa a trilha free; as outras 7 ficam
  // com cadeado e abrem o paywall ao clicar (igual ao resto do app).
  const { canUseInitiative } = useUserAccess();
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false);
  // Um card é bloqueado se: não é admin, plano não é completo, e a iniciativa
  // correspondente (casada pelo número no nome) NÃO é free no Firestore.
  const isCardLocked = (card: TrilhaHeroCard): boolean => {
    const num = parseInt(card.num, 10);
    const init = allInitiatives.find(i => i.ordem === num);
    if (!init) return card.id !== 'ferramentas-dia-a-dia'; // fallback: só a trilha 1 livre
    return !canUseInitiative(init.id, allInitiatives);
  };
  // Lista REAL de trilhas (do Firestore) — injetada no system prompt pra IA não inventar nome de trilha
  // que não existe. Carrega 1× ao montar; admin pode adicionar/renomear/remover e basta o aluno
  // recarregar a página pra IA enxergar.
  const [allInitiatives, setAllInitiatives] = useState<Initiative[]>([]);
  useEffect(() => {
    getInitiatives().then(setAllInitiatives).catch(err => console.error('[ChatAssistant] erro ao carregar trilhas:', err));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, AI_CONFIG_DOC.collection, AI_CONFIG_DOC.id);
        const snap = await getDoc(ref);
        if (snap.exists()) setConfig(await enrichConfigWithBunny(normalizeConfig(snap.data())));
      } catch (e) { console.error('[ChatAssistant]', e); }
      finally { setConfigLoaded(true); }
    };
    load();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (heroChatScrollRef.current) heroChatScrollRef.current.scrollTop = heroChatScrollRef.current.scrollHeight;
  }, [chat, showAiTyping, view, pickedCard]);

  useEffect(() => {
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
  }, []);

  const currentCategoryIdx = navPath.length > 0 ? config.categories.findIndex(c => c.id === navPath[0]) : -1;
  const currentCategory: NavCategory | null = currentCategoryIdx >= 0 ? config.categories[currentCategoryIdx] : null;
  const currentType: ProjectType = currentCategory ? (CATEGORY_TYPES[currentCategory.id] || 'DMAIC') : 'DMAIC';

  let currentItems: TreeNode[] = currentCategory?.items || [];
  let currentNode: TreeNode | null = null;
  const breadcrumbs: string[] = [];
  if (currentCategory) {
    breadcrumbs.push(currentCategory.title);
    let cursor: TreeNode | null = null;
    for (let i = 1; i < navPath.length; i++) {
      const id = navPath[i];
      const list = cursor ? (cursor.children || []) : currentItems;
      const found = list.find(n => n.id === id) || null;
      if (!found) break;
      cursor = found;
      breadcrumbs.push(found.title);
    }
    if (cursor) { currentNode = cursor; currentItems = cursor.children || []; }
  }

  const go = (next: 'hero' | 'tree' | 'leaf' | 'chat', direction: 1 | -1 = 1) => { setDir(direction); setView(next); };

  const callGemini = async (prompt: string, json = false) => {
    const { callAI, callAIJSON } = await import('../services/aiRouter');
    if (json) {
      const obj = await callAIJSON({
        location: 'chat-ai',
        messages: [{ role: 'user', content: prompt + '\n\nResponda APENAS com JSON válido, sem texto antes ou depois.' }],
        maxTokens: 4096,
      });
      return JSON.stringify(obj);
    }
    const { text } = await callAI({
      location: 'chat-ai',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4096,
    });
    return text;
  };

  const handleCategoryClick = (catId: string) => {
    const cat = config.categories.find(c => c.id === catId);
    if (!cat) return;
    setNavPath([catId]);
    if ((cat.items || []).length > 0) go('tree', 1);
    else go('chat', 1);
  };

  // Bloco de contexto injetado no system prompt — lista as trilhas REAIS da plataforma.
  // Sem isso, a IA pode inventar nome de trilha que não existe.
  const buildTrilhasContexto = (): string => {
    if (allInitiatives.length === 0) return '';
    const linhas = allInitiatives.map(i => {
      const desc = i.description ? ` — ${i.description.slice(0, 100)}` : '';
      return `- "${i.name}"${desc}`;
    }).join('\n');
    return (
      `CURSOS REAIS DA PLATAFORMA LBW (use SEMPRE o nome exato da lista abaixo, NUNCA invente nome novo):\n` +
      `${linhas}\n\n` +
      `Ao recomendar, escreva entre aspas o nome EXATO do curso tal como aparece acima.`
    );
  };

  // Clique num dos cards de trilha → a IA abre com uma saudação simples
  // perguntando como pode ajudar. Resposta fixa e instantânea (sem chamar a IA):
  // determinística, sem custo de token, sem risco de pergunta desconexa.
  // Quando o aluno responder, sendChat() assume e orienta a trilha usando o
  // knowledge específico da trilha picked.
  const handleTrilhaPickClick = (card: TrilhaHeroCard) => {
    setPickedCard(card);
    const saudacao = lang === 'en-US'
      ? 'Hey! How can I help you?'
      : lang === 'es-ES'
        ? '¡Hola! ¿Cómo puedo ayudarte?'
        : 'Olá! Como posso te ajudar?';
    setChat([{ id: String(Date.now()), role: 'ai', text: saudacao }]);
    setChatInput('');
  };

  // Volta pro grid de 9 cards (limpa o picked + histórico do chat).
  const resetHeroPick = () => {
    setPickedCard(null);
    setChat([]);
    setChatInput('');
  };

  const handleNodeClick = (node: TreeNode) => {
    const newPath = [...navPath, node.id];
    setNavPath(newPath);
    if ((node.children || []).length > 0) go('tree', 1);
    else {
      setActiveVideoId((node.videos || [])[0]?.id || null);
      go('leaf', 1);
    }
  };

  const handleFinalAction = () => {
    const action: LeafAction = currentNode?.actionType || 'home';
    if (action === 'projects') navigate('/projects');
    else if (action === 'data') navigate('/analysis');
    else resetToHero();
  };

  const finalActionLabel = (() => {
    const a = currentNode?.actionType || 'home';
    if (a === 'projects') return 'Ir para os Projetos';
    if (a === 'data') return 'Ir para Análise de Dados';
    return 'Voltar para a tela inicial';
  })();

  const goBack = () => {
    if (navPath.length <= 1) { resetToHero(); return; }
    setNavPath(navPath.slice(0, -1));
    setActiveVideoId(null);
    go('tree', -1);
  };

  const resetToHero = () => {
    setView('hero'); setNavPath([]); setActiveVideoId(null); setChat([]);
    setPickedCard(null); setChatInput('');
  };

  const speakMessage = (m: ChatMessage) => {
    try {
      if (!window.speechSynthesis) return;
      if (speakingId === m.id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
      window.speechSynthesis.cancel();
      const txt = m.text || (m.classification ? `Projeto detectado: ${TYPE_PALETTE[m.classification.type].label}. ${m.classification.justification} ${m.classification.question}` : '');
      if (!txt) return;
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = lang; u.rate = 1.0; u.pitch = 1.0;
      u.onend = () => setSpeakingId(cur => cur === m.id ? null : cur);
      u.onerror = () => setSpeakingId(cur => cur === m.id ? null : cur);
      setSpeakingId(m.id);
      window.speechSynthesis.speak(u);
    } catch { setSpeakingId(null); }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const txt = chatInput.trim();
    setChat(c => [...c, { id: String(Date.now()), role: 'user', text: txt }]);
    setChatInput('');
    setShowAiTyping(true);
    try {
      const trilhasCtx = buildTrilhasContexto();
      // Knowledge injection: se há trilha já picked, usa só a dela (mais focado); senão, todas
      const knowledgeBlock = pickedCard
        ? [getGlobalKnowledge(), getTrilhaKnowledge(pickedCard.id)].filter(Boolean).join('\n\n---\n\n')
        : getAllKnowledge();
      const reply = await callGemini(
        (knowledgeBlock ? `=== CONHECIMENTO DA PLATAFORMA (use isso pra responder, NÃO invente) ===\n${knowledgeBlock}\n\n=== FIM DO CONHECIMENTO ===\n\n` : '') +
        `${config.mentorRules}\n\n` +
        (trilhasCtx ? `${trilhasCtx}\n\n` : '') +
        `O aluno disse: "${txt}"\n\n` +
        `FECHAMENTO OBRIGATÓRIO: depois de responder, NÃO termine empurrando "próxima ação", ` +
        `"me conte em uma frase", "qual cenário é o seu" nem peça mais detalhes pra continuar interrogando. ` +
        `Encerre de forma leve perguntando só se ficou claro e se ele tem outra dúvida ` +
        `(ex: "Ficou claro? Qualquer outra dúvida, é só falar.").\n\n` +
        `Responda agora em ${lang === 'en-US' ? 'inglês' : lang === 'es-ES' ? 'espanhol' : 'português'}.`
      );
      setChat(c => [...c, { id: String(Date.now()+1), role: 'ai', text: reply }]);
    } catch (err: any) {
      const limite = err?.name === 'CreditExhaustedError';
      if (limite) {
        setCreditoEsgotado(true);
        setChat(c => [...c, { id: String(Date.now()+1), role: 'ai', text:
          'Seu limite mensal de conversa com a IA chegou ao fim. Ele se renova automaticamente no próximo mês. Você continua usando todas as ferramentas normalmente. Se realmente precisar de mais créditos agora, use o botão abaixo.' }]);
      } else {
        setChat(c => [...c, { id: String(Date.now()+1), role: 'ai', text: 'Erro ao conectar.' }]);
      }
    } finally { setShowAiTyping(false); }
  };

  const handleSolicitarCredito = async () => {
    const { solicitarMaisCredito } = await import('../services/tokenCreditService');
    await solicitarMaisCredito();
    setSolicitouCredito(true);
  };

  if (!configLoaded) return (
    <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-stone-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  const activeVideo: LinkedVideo | null = currentNode
    ? (currentNode.videos.find(v => v.id === activeVideoId) || currentNode.videos[0] || null)
    : null;

  return (
    <div className="relative h-[calc(100vh-10rem)] w-full overflow-hidden antialiased lbw-chat-scope"
      style={{ fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif", background: LBW.light, color: LBW.ink }}>
      <style>{`
        .lbw-chat-scope ::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .lbw-chat-scope * { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      <MeshBackground />

      <div className="absolute top-6 right-6 z-30 flex items-center gap-3 bg-white/90 backdrop-blur-md border border-black/[0.06] rounded-2xl pl-2 pr-4 py-2"
        style={{ boxShadow: `0 14px 36px -14px ${LBW.navy}55` }}>
        <MentorOrb size={56} showHalo={true} isSpeaking={!!speakingId} crop="bust" />
        <div className="flex flex-col leading-tight">
          <span className="text-[12px] font-semibold tracking-tight" style={{ color: LBW.ink }}>Israel</span>
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#6B7180' }}>Mentor LBW · <span style={{ color: '#16A34A' }}>ativo</span></span>
        </div>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        {view === 'hero' && (
          <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }} className="absolute inset-0 overflow-hidden"
          >
            <div className="h-full flex flex-col px-6 md:px-10 py-5 md:py-6">
              <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col min-h-0">

                {!pickedCard && (
                  <>
                    {/* GRID MODE — 9 cards + composer livre */}
                    <div className="mb-3">
                      <motion.h1
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                        className="text-[24px] md:text-[30px] leading-[1.05] tracking-[-0.025em] font-semibold text-stone-900 m-0"
                      >
                        Olá,{' '}
                        <span className="italic font-normal pr-1"
                          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: LBW.blue }}>
                          {userName}
                        </span>.
                      </motion.h1>
                      <motion.h2
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
                        className="text-[15px] md:text-[18px] leading-[1.1] tracking-[-0.02em] font-light text-stone-700 m-0 mt-0.5"
                      >
                        Por onde quer <span style={{ background: `linear-gradient(135deg, ${LBW.blue}, ${LBW.navy})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}>começar</span>?
                      </motion.h2>
                    </div>

                    {/* Grid 3×3 — cabe tudo na 1ª dobra */}
                    <div className="grid grid-cols-3 gap-2.5 mb-4">
                      {TRILHA_HERO_CARDS.map((card, i) => {
                        const locked = isCardLocked(card);
                        return (
                        <NineCard key={card.id} card={card} i={i} locked={locked}
                          onClick={() => { if (locked) { setLockedPopupOpen(true); } else { handleTrilhaPickClick(card); } }} />
                        );
                      })}
                    </div>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-center text-[12px] text-stone-500 mt-1 mb-2 max-w-3xl mx-auto w-full">
                      Escolha um curso acima para começar a conversar com o Israel.
                    </motion.p>
                  </>
                )}

                {pickedCard && (
                  <>
                    {/* PICKED MODE — só o card escolhido + chat IA inline */}
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                      className="flex items-center justify-between mb-2"
                    >
                      <button onClick={resetHeroPick}
                        className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase text-stone-500 hover:text-stone-900 transition-colors bg-transparent border-0 cursor-pointer p-0"
                      >
                        ← Ver outras opções
                      </button>
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-400">
                        Israel está te ajudando a escolher
                      </span>
                    </motion.div>

                    {/* Card escolhido — em largura total mas compacto */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                      className="relative rounded-2xl overflow-hidden text-white p-4 mb-3"
                      style={{
                        background: `linear-gradient(135deg, rgba(255,255,255,0.42), rgba(255,255,255,0.20)), ${pickedCard.gradient}`,
                        boxShadow: `0 16px 40px -22px ${pickedCard.glow}, 0 6px 18px -12px rgba(0,0,0,0.22)`,
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      <div aria-hidden className="absolute -top-16 -right-16 w-48 h-48 rounded-full"
                        style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.22), transparent 70%)' }}
                      />
                      <div className="relative flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                          {(() => { const Icon = pickedCard.icon; return <Icon size={20} strokeWidth={2.2} />; })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold tracking-[0.18em] m-0 mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            TRILHA {pickedCard.num}
                          </p>
                          <p className="text-[14px] md:text-[15px] font-semibold leading-snug m-0"
                            style={{ color: 'rgba(255,255,255,0.97)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                            {pickedCard.label}
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Chat thread + input — flex-1 ocupa o restante sem scroll global */}
                    <div className="flex-1 flex flex-col rounded-2xl bg-white/85 backdrop-blur-xl border border-black/[0.06] overflow-hidden min-h-0"
                      style={{ boxShadow: `0 18px 50px -28px ${LBW.navy}55` }}>
                      <div ref={heroChatScrollRef}
                        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
                        style={{ background: `linear-gradient(180deg, ${LBW.light}60, ${LBW.light}30)` }}
                      >
                        <AnimatePresence initial={false}>
                          {chat.map((m) => (
                            <motion.div key={m.id}
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                              className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                              {m.role === 'ai' ? (
                                <MentorOrb size={26} showHalo={false} online={false} isSpeaking={speakingId === m.id} />
                              ) : (
                                <div className="w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.ink})` }}>
                                  {userInitial}
                                </div>
                              )}
                              {m.text && (
                                <div className="max-w-[78%] px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap"
                                  style={
                                    m.role === 'user'
                                      ? { background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})`, color: 'white', borderRadius: '16px 16px 4px 16px', boxShadow: `0 6px 16px -8px ${LBW.blue}99` }
                                      : { background: 'white', color: LBW.ink, border: '1px solid rgba(30,45,110,0.10)', borderRadius: '16px 16px 16px 4px', boxShadow: `0 3px 10px -6px ${LBW.navy}33` }
                                  }
                                >
                                  {m.text}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {showAiTyping && (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                            <TypingIndicator />
                          </motion.div>
                        )}
                      </div>

                      {creditoEsgotado && (
                        <div className="px-3 pt-2.5 flex-shrink-0">
                          {solicitouCredito ? (
                            <div className="rounded-xl px-4 py-3 text-[12.5px] leading-relaxed"
                              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.35)', color: '#065f46' }}>
                              ✅ Enviamos sua solicitação ao Israel. Ele vai avaliar em até <strong>2 dias úteis</strong> e, se fizer sentido, aumenta o seu limite.
                            </div>
                          ) : (
                            <button onClick={handleSolicitarCredito}
                              className="w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white cursor-pointer"
                              style={{ background: `linear-gradient(135deg, ${LBW.blue}, ${LBW.navy})`, boxShadow: `0 8px 20px -10px ${LBW.blue}88` }}>
                              Preciso de mais créditos →
                            </button>
                          )}
                        </div>
                      )}

                      <div className="px-3 py-2.5 border-t border-stone-200/60 bg-white/70 flex-shrink-0">
                        <div className="flex items-end gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
                          <textarea value={chatInput} rows={1}
                            placeholder="Responda ao Israel…"
                            onChange={(e) => {
                              setChatInput(e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                            className="flex-1 bg-transparent outline-none resize-none text-[13px] leading-relaxed max-h-[90px] py-1"
                            style={{ color: LBW.ink }}
                          />
                          <motion.button
                            whileHover={chatInput.trim() ? { scale: 1.05 } : {}}
                            whileTap={chatInput.trim() ? { scale: 0.95 } : {}}
                            onClick={sendChat} disabled={!chatInput.trim()}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: `linear-gradient(135deg, ${LBW.blue}, ${LBW.navy})`, boxShadow: `0 6px 14px -6px ${LBW.blue}77` }}
                          >
                            <Send size={13} />
                          </motion.button>
                        </div>
                        <p className="text-[11px] text-stone-500 leading-snug mt-2 px-1">
                          Use este campo para <strong>perguntas gerais sobre este curso</strong>. Para dúvidas específicas
                          (por exemplo, sobre uma ferramenta), use o <strong>Agente Israel Digital</strong> dentro do seu projeto — a resposta será mais precisa.
                        </p>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          </motion.div>
        )}

        {view === 'tree' && currentCategory && (
          <motion.div key={`tree-${navPath.join('-')}`} custom={dir}
            initial={{ opacity: 0, x: dir === 1 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 1 ? -60 : 60 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute inset-0 overflow-y-auto"
          >
            <div className="min-h-full px-6 md:px-10 py-12">
              <div className="max-w-5xl mx-auto w-full">
                <Breadcrumbs crumbs={breadcrumbs} onBack={goBack} color={TYPE_PALETTE[currentType].ring} />
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="text-[36px] md:text-[44px] font-semibold tracking-[-0.025em] text-stone-900 leading-[1.05] mb-2"
                >
                  {currentNode ? currentNode.title : 'Como você quer começar?'}
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="text-[16px] text-stone-600 mb-10 max-w-2xl"
                >
                  Escolha uma opção abaixo para continuar.
                </motion.p>
                <div className={`grid gap-4 ${
                  currentItems.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                  currentItems.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {currentItems.map((it, i) => (
                    <TreeCard key={it.id} item={it} type={currentType} i={i} onClick={() => handleNodeClick(it)} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'leaf' && currentNode && (
          <motion.div key={`leaf-${navPath.join('-')}`} custom={dir}
            initial={{ opacity: 0, x: dir === 1 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 1 ? -60 : 60 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute inset-0 overflow-y-auto"
          >
            <div className="min-h-full px-6 md:px-10 py-12">
              <div className="max-w-6xl mx-auto w-full">
                <Breadcrumbs crumbs={breadcrumbs} onBack={goBack} color={TYPE_PALETTE[currentType].ring} />
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }} className="mb-8 flex items-end gap-4 flex-wrap">
                  <h2 className="text-[44px] md:text-[52px] font-semibold tracking-[-0.025em] text-stone-900 leading-[1] m-0">
                    {currentNode.title}
                  </h2>
                  {currentNode.fields.length > 0 && (
                    <span className="text-[12px] font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full mb-2"
                      style={{ background: TYPE_PALETTE[currentType].soft, color: TYPE_PALETTE[currentType].ink }}>
                      <BookOpen size={11} className="inline-block mr-1 -mt-0.5" /> Conteúdo de aprendizado
                    </span>
                  )}
                </motion.div>
                <div className={`grid grid-cols-1 ${currentNode.videos.length > 0 ? 'lg:grid-cols-[1fr_400px]' : ''} gap-6 mb-8`}>
                  <div className="flex flex-col gap-4">
                    {currentNode.fields.map((f, i) => (
                      <motion.div key={f.id}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.07 }}
                        className="relative rounded-[20px] bg-white/90 backdrop-blur border border-black/[0.06] p-6 overflow-hidden"
                        style={{ boxShadow: '0 8px 28px -18px rgba(40,30,80,0.18)' }}
                      >
                        <div aria-hidden className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ background: `linear-gradient(180deg, ${TYPE_PALETTE[currentType].from}, ${TYPE_PALETTE[currentType].to})` }} />
                        <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: TYPE_PALETTE[currentType].ring }}>
                          {f.label}
                        </p>
                        <p className="text-[15px] leading-[1.65] text-stone-700 whitespace-pre-wrap m-0">{f.content}</p>
                      </motion.div>
                    ))}

                    {currentNode.fields.length === 0 && currentNode.videos.length === 0 && (
                      <div className="rounded-[20px] bg-white/90 p-6 text-center text-stone-400 text-[14px]">
                        Conteúdo desta opção ainda não foi configurado.
                      </div>
                    )}

                    {currentNode.actionType !== 'none' && (
                      <motion.button
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.99 }}
                        onClick={handleFinalAction}
                        className="group relative mt-2 rounded-[18px] py-5 px-6 text-white font-semibold text-[15px] flex items-center justify-between overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${TYPE_PALETTE[currentType].from}, ${TYPE_PALETTE[currentType].to})`,
                          boxShadow: `0 18px 38px -16px ${TYPE_PALETTE[currentType].glow}`,
                        }}
                      >
                        <motion.span aria-hidden className="absolute inset-0"
                          style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)', backgroundSize: '200% 100%' }}
                          animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
                          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                        />
                        <span className="relative flex items-center gap-2.5">
                          <Wand2 size={17} />
                          {finalActionLabel}
                        </span>
                        <span className="relative"><ArrowRight size={18} /></span>
                      </motion.button>
                    )}
                  </div>

                  {currentNode.videos.length > 0 && activeVideo && (
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.22 }} className="flex flex-col gap-4">
                      <div className="relative rounded-[20px] overflow-hidden bg-stone-900 border border-black/[0.08]"
                        style={{ boxShadow: `0 24px 60px -28px ${TYPE_PALETTE[currentType].glow}` }}>
                        <div className="relative" style={{ paddingBottom: '56.25%' }}>
                          {activeVideo.bunnyVideoId && activeVideo.bunnyLibraryId ? (
                            <iframe
                              src={`https://iframe.mediadelivery.net/embed/${activeVideo.bunnyLibraryId}/${activeVideo.bunnyVideoId}?autoplay=false&preload=true&captions=pt`}
                              title={activeVideo.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: 'none' }}
                            />
                          ) : (<div className="absolute inset-0 bg-stone-800" />)}
                        </div>
                      </div>
                      <div className="rounded-[18px] bg-white/85 backdrop-blur border border-black/[0.06] overflow-hidden"
                        style={{ boxShadow: '0 6px 24px -16px rgba(40,30,80,0.18)' }}>
                        <div className="px-4 py-3 flex items-center justify-between border-b border-stone-100">
                          <p className="text-[11px] font-bold tracking-wider uppercase text-stone-600 m-0">Vídeos relacionados</p>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                            style={{ background: TYPE_PALETTE[currentType].soft, color: TYPE_PALETTE[currentType].ink }}>
                            {currentNode.videos.length} aulas
                          </span>
                        </div>
                        <div className="flex flex-col max-h-[400px] overflow-y-auto">
                          {currentNode.videos.map((v) => {
                            const active = v.id === activeVideo.id;
                            return (
                              <button key={v.id} onClick={() => setActiveVideoId(v.id)}
                                className="flex items-center gap-3 px-3 py-2.5 border-b border-stone-100 last:border-b-0 text-left transition-colors"
                                style={active ? { background: TYPE_PALETTE[currentType].soft } : { background: 'transparent' }}
                              >
                                <div className="relative flex-shrink-0">
                                  <div className="w-[88px] h-[50px] bg-stone-200 rounded-md flex items-center justify-center">
                                    <Play size={18} className="text-stone-500" />
                                  </div>
                                  {active && (
                                    <div className="absolute inset-0 rounded-md flex items-center justify-center"
                                      style={{ background: `${TYPE_PALETTE[currentType].from}66` }}>
                                      <Play size={14} className="text-white" fill="white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[12.5px] leading-tight m-0 line-clamp-2 ${active ? 'font-semibold' : 'font-medium'}`}
                                    style={{ color: active ? TYPE_PALETTE[currentType].ink : '#3F3A35' }}>
                                    {v.title}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35 }} className="absolute inset-0 flex flex-col px-6 md:px-10 py-8"
          >
            <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col rounded-[28px] bg-white/85 backdrop-blur-xl border border-black/[0.06] overflow-hidden min-h-0"
              style={{ boxShadow: `0 30px 80px -40px ${LBW.navy}55` }}>
              <div className="relative flex items-center gap-3 px-5 py-4 border-b border-stone-200/60 bg-white/60 flex-shrink-0">
                <MentorOrb size={64} isSpeaking={!!speakingId} crop="bust" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold leading-tight m-0" style={{ color: LBW.ink }}>
                    Israel · <span style={{ color: LBW.blue }}>Mentor LBW</span>
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: '#6B7180' }}>Lean Six Sigma Expert · Online</p>
                </div>
                <div className="flex items-center gap-0.5 bg-stone-100/80 rounded-full p-0.5 border border-stone-200/70">
                  {LANGS.map(l => {
                    const active = l.code === lang;
                    return (
                      <button key={l.code} onClick={() => setLang(l.code)}
                        className="relative px-2 py-1 rounded-full text-[11px] font-semibold transition-colors"
                        style={{ color: active ? LBW.white : '#52596B' }}
                      >
                        {active && (
                          <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-full"
                            style={{ background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})` }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative flex items-center gap-1">
                          <span style={{ fontSize: 11 }}>{l.flag}</span>{l.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={resetToHero}
                  className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5 min-h-0"
                style={{ background: `linear-gradient(180deg, ${LBW.light}80, ${LBW.light}40)` }}>
                <AnimatePresence initial={false}>
                  {chat.map((m) => (
                    <motion.div key={m.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                      className={`flex items-end gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {m.role === 'ai' ? (
                        <MentorOrb size={30} showHalo={false} online={false} isSpeaking={speakingId === m.id} />
                      ) : (
                        <div className="w-8 h-8 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.ink})` }}>
                          {userInitial}
                        </div>
                      )}
                      <div className={`max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                        {m.classification && <DetectionCard d={m.classification} />}
                        {m.text && (
                          <div className="group/bubble relative">
                            <div className="px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap"
                              style={
                                m.role === 'user'
                                  ? { background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})`, color: 'white', borderRadius: '20px 20px 6px 20px', boxShadow: `0 8px 20px -10px ${LBW.blue}99` }
                                  : { background: 'white', color: LBW.ink, border: '1px solid rgba(30,45,110,0.10)', borderRadius: '20px 20px 20px 6px', boxShadow: `0 4px 14px -10px ${LBW.navy}33` }
                              }
                            >
                              {m.text}
                            </div>
                            {m.role === 'ai' && (
                              <button onClick={() => speakMessage(m)} title="Ouvir mensagem"
                                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center transition-all opacity-70 hover:opacity-100"
                                style={{
                                  background: speakingId === m.id ? `linear-gradient(135deg, ${LBW.blue}, ${LBW.navy})` : 'white',
                                  color: speakingId === m.id ? LBW.white : LBW.blue,
                                  boxShadow: speakingId === m.id
                                    ? `0 0 0 4px ${LBW.blue}22, 0 6px 14px -6px ${LBW.blue}88`
                                    : `0 2px 8px -4px ${LBW.navy}33`,
                                }}
                              >
                                {speakingId === m.id ? <span style={{ fontSize: 11 }}>⏸</span> : <span style={{ fontSize: 12 }}>🔊</span>}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {showAiTyping && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-stone-200/60 bg-white/70 flex-shrink-0">
                <div className="flex items-end gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-2.5">
                  <textarea value={chatInput} rows={1}
                    placeholder="Responda ao Mentor…"
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    className="flex-1 bg-transparent outline-none resize-none text-[14px] leading-relaxed max-h-[120px] py-1"
                    style={{ color: LBW.ink }}
                  />
                  <motion.button
                    whileHover={chatInput.trim() ? { scale: 1.05 } : {}}
                    whileTap={chatInput.trim() ? { scale: 0.95 } : {}}
                    onClick={sendChat} disabled={!chatInput.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${LBW.blue}, ${LBW.navy})`, boxShadow: `0 8px 18px -6px ${LBW.blue}77` }}
                  >
                    <Send size={14} />
                  </motion.button>
                </div>
                <p className="text-[10.5px] text-stone-400 mt-2 text-center">Enter envia · Shift+Enter quebra linha</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paywall — trilha bloqueada pro aluno gratuito */}
      <LockedToolPopup isOpen={lockedPopupOpen} onClose={() => setLockedPopupOpen(false)} />
    </div>
  );
}
