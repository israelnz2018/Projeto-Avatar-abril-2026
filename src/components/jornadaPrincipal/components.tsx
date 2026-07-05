/**
 * Componentes Netflix-style da página principal.
 *
 *   TrailerHero    — banner cinematográfico do topo (estilo "destaque do dia")
 *   TrilhaRow      — linha horizontal scrollável com cards
 *   TrilhaCard     — card individual (16:9, hover Netflix)
 *   TrilhaModal    — modal "Mais informações" tipo Netflix com episódios
 *   MentorBanner   — bloco "Conheça seu mentor" entre rows
 *
 * Princípios de design:
 *   - Fundo escuro #080a14 (mais escuro que Netflix pra contrastar com paleta LBW)
 *   - Tipografia Black em títulos, tracking apertado
 *   - Hover: scale 1.5x, sobe da row vizinha, glow colorido pelo accent da trilha
 *   - Acentos: paleta LBW (NAVY/BLUE/LIGHT) em CTAs principais
 *   - Tudo respira motion (motion v12) — nada estático
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Plus, Info, ChevronRight, ChevronLeft, X, Clock, BookOpen,
  ArrowRight, Sparkles, Quote, CheckCircle2, ExternalLink, Volume2, VolumeX,
  Wrench, Compass, Lightbulb, Copy,
} from 'lucide-react';
import type { Trilha } from './trilhas';
import { TrailerCanvas } from './TrailerCanvas';

// =============================================================================
// CONSTANTES
// =============================================================================

const BG = '#080a14';
const LBW = {
  navy: '#1E2D6E',
  blue: '#0033CC',
  light: '#F0F2FA',
  ink: '#2A2F3A',
  muted: '#9CA3AF',
};

/**
 * Música ambiente instrumental do Hero — tocada baixinho em loop quando o
 * usuário clica no botão de volume (mute/unmute). Começa MUDA por default
 * porque navegadores bloqueiam autoplay de áudio sem interação do usuário.
 *
 * Pra trocar a música, basta substituir a URL abaixo por outro MP3 público.
 * Deixar a string vazia ('') desabilita o áudio completamente.
 */
const HERO_MUSIC_URL = 'https://cdn.pixabay.com/audio/2022/03/15/audio_1718e49b51.mp3';
const HERO_MUSIC_VOLUME = 0.15; // 0.0 a 1.0 — baixinho, ambiente

// =============================================================================
// TRAILER HERO — banner cinematográfico
// =============================================================================

interface TrailerHeroProps {
  trilha: Trilha;
  onPlay: (trilha: Trilha) => void;
  onMoreInfo: (trilha: Trilha) => void;
}

export function TrailerHero({ trilha, onPlay, onMoreInfo }: TrailerHeroProps) {
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const Icon = trilha.icone;

  // Sincroniza o estado `muted` com o elemento <audio>.
  // Quando o usuário clica unmute, o áudio começa a tocar (atende a regra do
  // browser de "play após interação"). Quando muta de novo, pausa.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !HERO_MUSIC_URL) return;
    audio.volume = HERO_MUSIC_VOLUME;
    audio.muted = muted;
    if (muted) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Falha silenciosa: navegador bloqueou ou URL inválida.
        // Não polui console nem quebra UI.
      });
    }
  }, [muted]);

  return (
    <section className="relative w-full h-[88vh] min-h-[640px] overflow-hidden">
      {/* Música ambiente — renderizada apenas se HERO_MUSIC_URL estiver definido */}
      {HERO_MUSIC_URL && (
        <audio
          ref={audioRef}
          src={HERO_MUSIC_URL}
          loop
          preload="none"
          muted
        />
      )}
      {/* Trailer animado em fullscreen */}
      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${trilha.gradient}`}
          style={{ opacity: 0.85 }}
        />
        <TrailerCanvas motif={trilha.motif} accent={trilha.accent} intensity={1.2} />

        {/* Gradient overlays — Netflix-style fade */}
        <div className="absolute inset-0"
             style={{
               background: `linear-gradient(180deg, transparent 0%, transparent 50%, ${BG} 100%)`,
             }} />
        <div className="absolute inset-0"
             style={{
               background: `linear-gradient(90deg, ${BG}EE 0%, ${BG}88 35%, transparent 70%)`,
             }} />
      </div>

      {/* Conteúdo */}
      <div className="relative h-full flex items-end px-6 md:px-16 lg:px-24 pb-40 md:pb-44 pt-32">
        <div className="max-w-3xl text-white">
          {/* Marca "SEU CONSULTOR" — assinatura editorial Israel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 mb-5"
          >
            <div className="w-1 h-10 bg-white" />
            <div>
              <div className="text-[10px] font-black tracking-[0.4em] text-white/80">SEU CONSULTOR:</div>
              <div className="text-base font-black tracking-wider">ISRAEL SOUZA</div>
            </div>
          </motion.div>

          {/* Subtítulo / categoria */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center gap-3 mb-5 text-xs font-bold uppercase tracking-widest text-white/70"
          >
            <span className="px-2.5 py-1 bg-white/15 backdrop-blur-md rounded">Trilha {trilha.numero}</span>
            <span>·</span>
            <span>{trilha.nivel}</span>
            <span>·</span>
            <span>{trilha.duracao}</span>
            {trilha.selo && (
              <>
                <span>·</span>
                <span className="px-2.5 py-1 bg-red-600 text-white rounded">{trilha.selo}</span>
              </>
            )}
          </motion.div>

          {/* Título (tamanho reduzido — antes era text-8xl que escondia subtítulos) */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-3xl md:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tight m-0 mb-4 max-w-3xl"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
          >
            {trilha.titulo}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base md:text-xl text-white/90 leading-snug mb-2 max-w-2xl font-light m-0"
          >
            {trilha.subtitulo}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm md:text-base text-white/75 leading-relaxed mb-6 max-w-xl m-0"
          >
            {trilha.dor}
          </motion.p>

          {/* CTAs Netflix-style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => onPlay(trilha)}
              className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-md bg-white text-black font-black text-base hover:bg-white/90 transition-all"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              <Play size={22} fill="black" className="ml-[-4px]" />
              Começar trilha
            </button>
            <button
              onClick={() => onMoreInfo(trilha)}
              className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-md bg-white/25 backdrop-blur-md text-white font-black text-base hover:bg-white/35 transition-all"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              <Info size={20} />
              Mais informações
            </button>
          </motion.div>
        </div>

        {/* Ícone gigante no canto (decorativo) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 0.15, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="hidden xl:block absolute right-32 top-1/2 -translate-y-1/2"
        >
          <Icon size={320} className="text-white" strokeWidth={1} />
        </motion.div>

        {/* Botão de música ambiente — começa mudo (autoplay bloqueado pelos browsers),
            usuário clica pra ativar. Volume baixinho (HERO_MUSIC_VOLUME). */}
        <button
          onClick={() => setMuted(!muted)}
          className="absolute bottom-32 right-6 md:right-16 w-12 h-12 rounded-full border border-white/40 bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-all flex items-center justify-center"
          style={{ cursor: 'pointer' }}
          title={muted ? 'Ativar música ambiente' : 'Pausar música ambiente'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </section>
  );
}

// =============================================================================
// TRILHA ROW — linha horizontal scrollável
// =============================================================================

interface TrilhaRowProps {
  titulo: string;
  subtitulo?: string;
  trilhas: Trilha[];
  onSelect: (trilha: Trilha) => void;
  /** Se true, usa cards grandes "ranqueados" (estilo Top 10 da Netflix) */
  ranked?: boolean;
}

export function TrilhaRow({ titulo, subtitulo, trilhas, onSelect, ranked = false }: TrilhaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [trilhas.length]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = el.clientWidth * 0.85 * (dir === 'left' ? -1 : 1);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section className="relative mb-14 group/row">
      <div className="px-6 md:px-16 lg:px-24 mb-4">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tight m-0 leading-tight">
          {titulo}
        </h2>
        {subtitulo && (
          <p className="text-sm md:text-base text-white/50 mt-1 m-0 font-medium">
            {subtitulo}
          </p>
        )}
      </div>

      {/* Setas de navegação */}
      <button
        onClick={() => scroll('left')}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 md:w-20 h-[calc(100%-3rem)] bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-3 opacity-0 group-hover/row:opacity-100 transition-opacity ${!canScrollLeft && 'pointer-events-none'}`}
        style={{ cursor: 'pointer', border: 'none' }}
        aria-label="Anterior"
      >
        <div className={`w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white transition-all ${canScrollLeft ? 'opacity-100' : 'opacity-30'}`}>
          <ChevronLeft size={26} />
        </div>
      </button>
      <button
        onClick={() => scroll('right')}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 md:w-20 h-[calc(100%-3rem)] bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-3 opacity-0 group-hover/row:opacity-100 transition-opacity ${!canScrollRight && 'pointer-events-none'}`}
        style={{ cursor: 'pointer', border: 'none' }}
        aria-label="Próximo"
      >
        <div className={`w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white transition-all ${canScrollRight ? 'opacity-100' : 'opacity-30'}`}>
          <ChevronRight size={26} />
        </div>
      </button>

      {/* Track */}
      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto px-6 md:px-16 lg:px-24 pb-8 pt-2 scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .row-track::-webkit-scrollbar { display: none; }
        `}</style>
        {trilhas.map((trilha, idx) => (
          <TrilhaCard
            key={trilha.id}
            trilha={trilha}
            rank={ranked ? idx + 1 : undefined}
            onClick={() => onSelect(trilha)}
          />
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// TRILHA CARD — card individual com hover Netflix
// =============================================================================

interface TrilhaCardProps {
  trilha: Trilha;
  onClick: () => void;
  rank?: number;
}

export function TrilhaCard({ trilha, onClick, rank }: TrilhaCardProps) {
  const Icon = trilha.icone;

  return (
    <motion.div
      whileHover={{ scale: 1.08, y: -8, zIndex: 30 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="relative shrink-0 cursor-pointer group/card"
      style={{ width: 'clamp(260px, 22vw, 340px)' }}
      onClick={onClick}
    >
      {/* Rank gigante (Top 10) */}
      {rank !== undefined && (
        <div
          className="absolute -left-4 bottom-0 text-[140px] md:text-[180px] font-black leading-none pointer-events-none select-none"
          style={{
            color: 'transparent',
            WebkitTextStroke: '4px rgba(255,255,255,0.2)',
            fontFamily: 'Arial Black, sans-serif',
          }}
        >
          {rank}
        </div>
      )}

      {/* Card */}
      <div
        className="relative rounded-md overflow-hidden aspect-video group-hover/card:shadow-2xl transition-shadow"
        style={{
          boxShadow: `0 10px 30px -10px ${trilha.glow}`,
        }}
      >
        {/* Background gradient + trailer */}
        <div className={`absolute inset-0 bg-gradient-to-br ${trilha.gradient}`} />
        <TrailerCanvas motif={trilha.motif} accent={trilha.accent} intensity={0.7} />
        {/* Vinheta inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Selo */}
        {trilha.selo && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black tracking-widest">
            {trilha.selo}
          </div>
        )}

        {/* Número + ícone */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Icon size={20} className="text-white/85" />
          <div className="text-white/85 text-[11px] font-black tracking-widest">{trilha.numero}</div>
        </div>

        {/* Título sempre visível na base */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-black text-base md:text-lg leading-tight m-0 line-clamp-2"
             style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            {trilha.titulo}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-white/70">
            <span>{trilha.nivel}</span>
            <span>·</span>
            <span>{trilha.duracao}</span>
            <span>·</span>
            <span>{trilha.totalEpisodios} {trilha.situacoes && trilha.situacoes.length > 0 ? 'fases' : 'ep'}</span>
          </div>
        </div>
      </div>

      {/* Painel inferior que aparece no hover (Netflix-style) */}
      <div className="absolute top-full left-0 right-0 mt-1 bg-[#181a2a] rounded-md p-3 opacity-0 group-hover/card:opacity-100 group-hover/card:translate-y-0 translate-y-2 transition-all duration-200 pointer-events-none group-hover/card:pointer-events-auto shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
            style={{ border: 'none', cursor: 'pointer' }}
            title="Começar"
          >
            <Play size={14} fill="black" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="w-9 h-9 rounded-full border-2 border-white/50 text-white flex items-center justify-center hover:border-white transition"
            style={{ background: 'transparent', cursor: 'pointer' }}
            title="Adicionar à lista"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="ml-auto w-9 h-9 rounded-full border-2 border-white/50 text-white flex items-center justify-center hover:border-white transition"
            style={{ background: 'transparent', cursor: 'pointer' }}
            title="Mais informações"
          >
            <Info size={14} />
          </button>
        </div>
        <p className="text-white/90 text-xs leading-snug m-0 line-clamp-2 font-medium">
          {trilha.dor}
        </p>
        {/* Tags internas (destaque/iniciante/execucao) NÃO são exibidas — são só
            marcadores de filtro no código, não copy pro usuário. */}
      </div>
    </motion.div>
  );
}

// =============================================================================
// TRILHA MODAL — "Mais informações" Netflix
// =============================================================================

interface TrilhaModalProps {
  trilha: Trilha | null;
  onClose: () => void;
}

export function TrilhaModal({ trilha, onClose }: TrilhaModalProps) {
  const navigate = useNavigate();
  // Situação expandida — só usado pela Trilha 1 (que tem `situacoes`).
  // Reseta sempre que a trilha aberta muda.
  const [situacaoAberta, setSituacaoAberta] = useState<string | null>(null);
  useEffect(() => { setSituacaoAberta(null); }, [trilha?.id]);

  // Lock scroll
  useEffect(() => {
    if (trilha) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [trilha]);

  // ESC fecha
  useEffect(() => {
    if (!trilha) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trilha, onClose]);

  return (
    <AnimatePresence>
      {trilha && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm overflow-y-auto py-10 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-4xl mx-auto bg-[#0f1124] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: `0 30px 80px -20px ${trilha.glow}` }}
          >
            {/* Botão fechar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/70 backdrop-blur hover:bg-black text-white flex items-center justify-center transition"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Trailer hero do modal */}
            <div className="relative h-[42vh] min-h-[340px] overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${trilha.gradient}`} />
              <TrailerCanvas motif={trilha.motif} accent={trilha.accent} intensity={1} />
              <div className="absolute inset-0"
                   style={{ background: 'linear-gradient(180deg, transparent 0%, transparent 50%, #0f1124 100%)' }} />

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-black tracking-[0.3em] text-white/80">
                  <span className="px-2 py-0.5 bg-white/15 rounded">TRILHA {trilha.numero}</span>
                  {trilha.selo && <span className="px-2 py-0.5 bg-red-600 text-white rounded">{trilha.selo}</span>}
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight m-0 leading-tight"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                  {trilha.titulo}
                </h2>
                <p className="text-base md:text-lg text-white/80 mt-2 m-0">{trilha.subtitulo}</p>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <button
                    onClick={() => { navigate(trilha.ctaPrimario.rota); onClose(); }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white text-black font-black text-sm hover:bg-white/90 transition"
                    style={{ border: 'none', cursor: 'pointer' }}
                  >
                    <Play size={18} fill="black" /> {trilha.ctaPrimario.label}
                  </button>
                  <button
                    onClick={() => navigate('/chat')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-white/20 backdrop-blur text-white font-bold text-sm hover:bg-white/30 transition"
                    style={{ border: 'none', cursor: 'pointer' }}
                  >
                    <Sparkles size={16} /> Falar com o Mentor
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo do modal */}
            <div className="p-6 md:p-10 text-white">
              {/* Meta info */}
              <div className="grid md:grid-cols-[2fr_1fr] gap-8 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-4 text-xs font-bold text-white/60 uppercase tracking-wider">
                    <span style={{ color: trilha.accent }}>● {trilha.nivel}</span>
                    <span>·</span>
                    <span><Clock size={12} className="inline mr-1" />{trilha.duracao}</span>
                    <span>·</span>
                    <span><BookOpen size={12} className="inline mr-1" />{trilha.totalEpisodios} {trilha.situacoes && trilha.situacoes.length > 0 ? 'fases' : 'episódios'}</span>
                  </div>
                  <p className="text-base md:text-lg text-white/80 leading-relaxed m-0">
                    {trilha.dor}
                  </p>
                </div>
                <div className="text-sm text-white/60">
                  <p className="m-0 mb-1"><span className="text-white/40 uppercase text-[10px] font-black tracking-widest">Para quem é</span></p>
                  <p className="m-0 text-white/90">{trilha.paraQuem}</p>
                </div>
              </div>

              {/* Carta do Israel */}
              <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 rounded-2xl p-6 md:p-8 mb-10">
                <Quote size={40} className="absolute top-4 left-4 text-white/15" />
                <div className="pl-12">
                  <div className="text-xs font-black tracking-[0.3em] text-white/60 uppercase mb-3">
                    Carta do Israel
                  </div>
                  <div className="space-y-4 text-base md:text-lg text-white/85 leading-relaxed">
                    {trilha.cartaIsrael.split('\n\n').map((p, i) => (
                      <p key={i} className="m-0">{p}</p>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white"
                         style={{ background: `linear-gradient(135deg, ${trilha.accent}, ${LBW.navy})` }}>
                      IS
                    </div>
                    <div>
                      <p className="text-white font-black text-sm m-0">Israel Souza</p>
                      <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider m-0">Consultor Sênior em Melhoria de Processos</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* O que você leva */}
              <div className="mb-10">
                <h3 className="text-xl md:text-2xl font-black text-white m-0 mb-4">
                  O que você leva dessa trilha
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {trilha.oQueVoceLeva.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: trilha.accent }} />
                      <span className="text-sm text-white/90 leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Situações (Trilha 1 — kit circular) OU Episódios (demais trilhas — lista linear).
                  Decisão pelo campo `situacoes`: presente = render círculos. Ausente = render lista. */}
              {trilha.situacoes && trilha.situacoes.length > 0 ? (
                <div className="mb-10">
                  <h3 className="text-xl md:text-2xl font-black text-white m-0 mb-2">
                    As 5 fases da trilha
                  </h3>
                  <p className="text-sm text-white/60 mb-5 m-0">
                    Siga na ordem (Fase 1 → 5) ou abra a fase que você está vivendo agora.
                  </p>

                  {/* Grid de círculos — 2 cols em mobile, 3 em desktop */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {trilha.situacoes.map(sit => {
                      const Icone = sit.icone;
                      const aberta = situacaoAberta === sit.id;
                      return (
                        <button
                          key={sit.id}
                          onClick={() => setSituacaoAberta(aberta ? null : sit.id)}
                          className="group relative flex flex-col items-center text-center gap-3 focus:outline-none"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.97 }}
                            animate={aberta ? { scale: 1.08 } : { scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                            className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center"
                            style={{
                              background: aberta
                                ? `radial-gradient(circle at 30% 30%, ${trilha.accent}, ${LBW.navy})`
                                : `radial-gradient(circle at 30% 30%, ${trilha.accent}66, ${LBW.navy}55)`,
                              border: aberta ? `2px solid ${trilha.accent}` : '2px solid rgba(255,255,255,0.18)',
                              boxShadow: aberta
                                ? `0 14px 40px -10px ${trilha.glow}, 0 0 0 6px ${trilha.accent}22`
                                : `0 10px 28px -14px ${trilha.glow}`,
                            }}
                          >
                            <Icone size={36} className="text-white" strokeWidth={1.8} />
                          </motion.div>
                          <p className="text-xs md:text-sm font-bold text-white/90 leading-tight px-1 max-w-[16ch] m-0">
                            {sit.titulo}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Painel expandido — aparece abaixo do grid quando uma situação é clicada */}
                  <AnimatePresence mode="wait">
                    {situacaoAberta && (() => {
                      const sit = trilha.situacoes!.find(s => s.id === situacaoAberta);
                      if (!sit) return null;
                      const Icone = sit.icone;
                      return (
                        <motion.div
                          key={sit.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.25 }}
                          className="mt-8 rounded-2xl border border-white/10 overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          {/* Cabeçalho da situação */}
                          <div className="p-5 md:p-7 flex items-start gap-4"
                               style={{ background: `linear-gradient(135deg, ${trilha.accent}22, transparent)` }}>
                            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                                 style={{ background: `radial-gradient(circle at 30% 30%, ${trilha.accent}, ${LBW.navy})` }}>
                              <Icone size={26} className="text-white" strokeWidth={1.8} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black tracking-[0.25em] text-white/50 uppercase m-0 mb-1">
                                O que você faz nesta fase
                              </p>
                              <p className="text-base md:text-lg font-bold text-white m-0 mb-2 leading-tight">
                                {sit.titulo}
                              </p>
                              <p className="text-sm text-white/70 m-0 leading-snug">
                                {sit.quandoDoi}
                              </p>
                            </div>
                            <button
                              onClick={() => setSituacaoAberta(null)}
                              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition shrink-0"
                              style={{ border: 'none', cursor: 'pointer' }}
                              aria-label="Fechar situação"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Conteúdo da situação — 2 colunas (técnico / comportamental) */}
                          <div className="p-5 md:p-7 grid md:grid-cols-2 gap-5">
                            <div className="rounded-xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Wrench size={14} style={{ color: trilha.accent }} />
                                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/60">
                                  Parte técnica
                                </span>
                              </div>
                              <ul className="space-y-2 m-0 p-0 list-none">
                                {sit.parteTecnica.map((t, i) => (
                                  <li key={i} className="text-sm text-white/85 leading-snug flex gap-2">
                                    <span style={{ color: trilha.accent }}>•</span>
                                    <span>{t}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Compass size={14} style={{ color: trilha.accent }} />
                                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/60">
                                  Parte comportamental
                                </span>
                              </div>
                              <ul className="space-y-2 m-0 p-0 list-none">
                                {sit.parteComportamental.map((t, i) => (
                                  <li key={i} className="text-sm text-white/85 leading-snug flex gap-2">
                                    <span style={{ color: trilha.accent }}>•</span>
                                    <span>{t}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Artefato + vídeo Israel + prompt do Mentor */}
                          <div className="px-5 md:px-7 pb-5 md:pb-7 space-y-4">
                            {/* Artefato */}
                            <div className="rounded-xl p-4 flex items-start gap-3"
                                 style={{ background: `${trilha.accent}18`, border: `1px solid ${trilha.accent}44` }}>
                              <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: trilha.accent }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black tracking-[0.2em] uppercase m-0 mb-1" style={{ color: trilha.accent }}>
                                  Artefato salvo na sua conta
                                </p>
                                <p className="text-sm text-white m-0 leading-snug">{sit.artefato}</p>
                              </div>
                            </div>

                            {/* Vídeo do Israel */}
                            <div className="rounded-xl p-4 border border-white/10 flex items-start gap-3"
                                 style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black text-white"
                                   style={{ background: `linear-gradient(135deg, ${trilha.accent}, ${LBW.navy})` }}>
                                IS
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/60 m-0 mb-1">
                                  Vídeo do Israel · {sit.videoIsrael.duracao}
                                </p>
                                <p className="text-sm text-white/85 italic m-0 leading-snug">
                                  "{sit.videoIsrael.resumo}"
                                </p>
                              </div>
                              <button
                                onClick={() => { navigate(trilha.ctaPrimario.rota); onClose(); }}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white hover:bg-white/20 transition"
                                style={{ background: 'rgba(255,255,255,0.10)', border: 'none', cursor: 'pointer' }}
                              >
                                <Play size={12} fill="white" /> Assistir
                              </button>
                            </div>

                            {/* Prompt pré-moldado pro Mentor */}
                            <div className="rounded-xl p-4 border border-white/10"
                                 style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles size={14} style={{ color: trilha.accent }} />
                                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/60">
                                    Use no Mentor IA
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    try {
                                      navigator.clipboard?.writeText(sit.promptMentor);
                                    } catch { /* clipboard pode falhar em http — ignora */ }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-white/80 hover:text-white hover:bg-white/10 transition"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
                                >
                                  <Copy size={11} /> Copiar
                                </button>
                              </div>
                              <p className="text-sm text-white/85 m-0 leading-snug font-mono"
                                 style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                {sit.promptMentor}
                              </p>
                              <button
                                onClick={() => { navigate('/chat'); onClose(); }}
                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition"
                                style={{ background: trilha.accent, border: 'none', cursor: 'pointer' }}
                              >
                                <Sparkles size={13} /> Abrir Mentor com esse prompt
                              </button>
                            </div>

                            {/* Conexão com trilha paga (gateway) */}
                            {sit.conexaoPaga && (
                              <div className="flex items-start gap-2 px-1">
                                <Lightbulb size={14} className="text-white/40 mt-0.5 shrink-0" />
                                <p className="text-xs text-white/55 m-0 leading-snug">
                                  Quer mais profundidade? Esse tema é coberto em <span className="text-white/80 font-bold">{sit.conexaoPaga}</span>.
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="mb-10">
                  <h3 className="text-xl md:text-2xl font-black text-white m-0 mb-4">
                    Episódios
                    <span className="ml-3 text-sm font-bold text-white/40">({trilha.episodios.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {trilha.episodios.map(ep => (
                      <div key={ep.numero}
                           className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition group">
                        <div className="text-3xl font-black text-white/30 w-10 text-center shrink-0">
                          {ep.numero}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white text-sm md:text-base m-0">{ep.titulo}</p>
                          <p className="text-white/60 text-xs md:text-sm m-0 mt-0.5">{ep.resumo}</p>
                        </div>
                        <div className="text-xs font-bold text-white/50 shrink-0">{ep.duracao}</div>
                        <Play size={18} className="text-white/30 group-hover:text-white transition shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ferramentas relacionadas — direcionando pras outras abas */}
              <div>
                <h3 className="text-xl md:text-2xl font-black text-white m-0 mb-2">
                  Onde colocar em prática
                </h3>
                <p className="text-sm text-white/60 mb-4 m-0">
                  As ferramentas técnicas estão nas outras abas — clique pra ir direto.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {trilha.ferramentas.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => { navigate(f.rota); onClose(); }}
                      className="text-left flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition group"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                           style={{ background: `${trilha.accent}22`, color: trilha.accent }}>
                        <ExternalLink size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm m-0 group-hover:text-white">
                          {f.label}
                        </p>
                        {f.descricao && (
                          <p className="text-white/60 text-xs m-0 mt-0.5 leading-snug">{f.descricao}</p>
                        )}
                      </div>
                      <ArrowRight size={16} className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition shrink-0 mt-3" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// MENTOR BANNER — bloco entre rows pra reforçar a presença do Israel
// =============================================================================

export function MentorBanner({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="relative mx-6 md:mx-16 lg:mx-24 my-14 overflow-hidden rounded-2xl">
      <div className="absolute inset-0"
           style={{
             background: `linear-gradient(120deg, ${LBW.navy} 0%, ${LBW.blue} 60%, #1a1b3a 100%)`,
           }} />
      <div className="absolute inset-0"
           style={{
             background: `radial-gradient(circle at 80% 50%, rgba(255,255,255,0.15), transparent 60%)`,
           }} />
      {/* Decorativo */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-400 opacity-20 blur-3xl" />

      <div className="relative px-8 md:px-14 py-12 md:py-16 grid md:grid-cols-[1fr_auto] gap-10 items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 mb-5">
            <Sparkles size={13} className="text-yellow-300" />
            <span className="text-[10px] font-black tracking-[0.3em]">SEU MENTOR DENTRO DO APP</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black leading-[0.95] tracking-tight m-0 mb-4">
            Travou em alguma trilha?<br/>
            <span style={{
              background: 'linear-gradient(90deg, #FFD27A, #FFFFFF, #94B5FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Me chama no chat.
            </span>
          </h2>
          <p className="text-base md:text-lg text-white/85 leading-relaxed max-w-2xl m-0 mb-6">
            Toda a experiência de quem já resolveu problema de verdade em multinacional,
            destilada num assistente que conhece seu projeto, suas trilhas e o contexto da
            sua área. Pergunta o que quiser — eu respondo como se a gente
            estivesse num café.
          </p>
          <button
            onClick={onCTA}
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-md bg-white text-[#1E2D6E] font-black text-sm hover:bg-white/90 transition"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <Sparkles size={16} /> Conversar com o Mentor
          </button>
        </div>

        <div className="hidden md:flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 blur-2xl opacity-60" />
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-white to-blue-100 flex items-center justify-center text-[#1E2D6E] font-black text-6xl shadow-2xl border-4 border-white/30">
              IS
            </div>
          </div>
          <div className="mt-3 text-center text-white">
            <p className="font-black text-base m-0">Israel Souza</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 m-0 mt-1">Consultor Sênior</p>
          </div>
        </div>
      </div>
    </section>
  );
}
