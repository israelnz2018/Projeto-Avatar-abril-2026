import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Search,
  Filter,
  Bookmark,
  Share2,
  Clock,
  ArrowRight,
  GraduationCap,
  Star,
  ChevronRight,
  PlayCircle,
  BookOpen,
  Layout,
  Layers,
  X,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  ListVideo,
  Lock,
  Check,
  Award,
} from 'lucide-react';
import { cn, youtubeThumb } from '@/src/lib/utils';
import { getAllKnowledge, KnowledgeEntry } from '../services/knowledgeService';
import { logVideoPlayed } from '../services/eventLogger';
import { useUserAccess } from '../hooks/useUserAccess';
import { getInitiatives } from '../services/configService';
import { LockedToolPopup } from './LockedToolPopup';
import { auth } from '../lib/firebase';
import {
  subscribeUserProgress,
  markVideoWatched,
  checkAndIssueCertificate,
  saveVideoPosition,
  WATCH_THRESHOLD_PCT,
  CERTIFICATE_THRESHOLD_PCT,
  type WatchedEntry,
} from '../services/videoProgressService';
import { useYouTubeWatchTracker } from '../hooks/useYouTubeWatchTracker';
import { getUserData } from '../services/userService';
import type { Initiative } from '../types';

export default function LearningView() {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activePlaylist, setActivePlaylist] = useState('Todas');
  const [selectedVideo, setSelectedVideo] = useState<KnowledgeEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [seekTime, setSeekTime] = useState(0);
  const [freeCourseNames, setFreeCourseNames] = useState<Set<string>>(new Set());
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false);
  const [allInitiatives, setAllInitiatives] = useState<Initiative[]>([]);
  const [watchedUrls, setWatchedUrls] = useState<Record<string, WatchedEntry>>({});
  const [justCompletedCertId, setJustCompletedCertId] = useState<string | null>(null);
  const [alunoNome, setAlunoNome] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Carrega nome do aluno do Firestore (congela no certificado quando emitir).
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getUserData(uid).then(u => {
      const nome = u?.nome
        || auth.currentUser?.displayName
        || (auth.currentUser?.email?.split('@')[0] || 'Aluno LBW');
      setAlunoNome(nome);
    }).catch(() => {
      setAlunoNome(auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Aluno LBW');
    });
  }, []);

  const { plano, isAdmin, isCoordenador } = useUserAccess();
  // Starter = qualquer aluno gratuito (sem completo, sem admin, sem coordenador)
  const isStarter = !isAdmin && !isCoordenador && plano !== 'completo';

  // Carrega initiatives (todas) — guardamos pra calcular progresso por trilha + free check.
  // Vínculo com knowledge_base é via `course` que deve bater com `initiative.name`.
  useEffect(() => {
    getInitiatives()
      .then(inits => {
        setAllInitiatives(inits);
        const nomes = new Set(inits.filter(i => i.isFree === true).map(i => i.name));
        setFreeCourseNames(nomes);
      })
      .catch(() => setFreeCourseNames(new Set()));
  }, []);

  // Assina o progresso do aluno em tempo real. Atualização do doc Firestore reflete na UI
  // imediatamente (ex: quando o tracker marca um vídeo como assistido).
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = subscribeUserProgress(uid, p => setWatchedUrls(p.watchedUrls));
    return () => unsub();
  }, []);

  const isCourseLocked = (course: string) => isStarter && !freeCourseNames.has(course);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    setSeekTime(0);
  }, [selectedVideo?.id]);

  // Throttle refs pra salvar posição no máximo a cada 10s (evita writes em rajada)
  const lastPositionSaveAt = useRef(0);

  // Watch tracker: quando o aluno está com vídeo aberto, conta segundos em PLAYING state.
  // Quando passa 70% (WATCH_THRESHOLD_PCT), marca como assistido + checa certificado da trilha.
  // Também persiste a posição atual a cada ~10s pra retomar do mesmo ponto na próxima abertura.
  useYouTubeWatchTracker({
    iframeRef,
    videoId: selectedVideo ? (selectedVideo.sourceUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)?.[1] || null) : null,
    threshold: WATCH_THRESHOLD_PCT,
    onThresholdReached: async (pct) => {
      const uid = auth.currentUser?.uid;
      if (!uid || !selectedVideo) return;
      try {
        const initiative = allInitiatives.find(i => i.name === selectedVideo.course);
        await markVideoWatched(uid, selectedVideo.sourceUrl, pct, initiative?.id);
        if (initiative) {
          const justIssued = await checkAndIssueCertificate(uid, initiative, items, alunoNome);
          if (justIssued) setJustCompletedCertId(initiative.id);
        }
      } catch (err) {
        console.error('[LearningView] erro ao marcar vídeo assistido:', err);
      }
    },
    onTick: (cur, dur) => {
      const uid = auth.currentUser?.uid;
      if (!uid || !selectedVideo || dur <= 0) return;
      const now = Date.now();
      if (now - lastPositionSaveAt.current < 10_000) return; // throttle 10s
      lastPositionSaveAt.current = now;
      saveVideoPosition(uid, selectedVideo.sourceUrl, cur, dur).catch(err =>
        console.error('[LearningView] erro ao salvar posição:', err),
      );
    },
  });

  // Quando troca de vídeo, se já tem lastPosition salvo (> 0), pula pro ponto onde parou.
  // A regra do service garante: se chegou a 95%+ do vídeo, lastPosition foi salvo como 0
  // (modo revisão — começa do início).
  useEffect(() => {
    if (!selectedVideo) return;
    const entry = watchedUrls[selectedVideo.sourceUrl];
    const resumeAt = entry?.lastPosition || 0;
    if (resumeAt > 0) {
      // Pequeno delay pra dar tempo do iframe carregar antes do seek
      const t = setTimeout(() => setSeekTime(resumeAt), 1500);
      return () => clearTimeout(t);
    }
  // Intencionalmente NÃO depende de watchedUrls — não queremos re-seek quando o tracker
  // atualiza watchedUrls em background; só quando o aluno seleciona um vídeo novo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.id]);

  useEffect(() => {
    if (seekTime > 0 && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime, true] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  }, [seekTime]);

  const parseTimeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const fetchItems = async () => {
    setLoading(true);
    const data = await getAllKnowledge();
    setItems(data);
    setLoading(false);
  };

  // Ordena cursos pelo prefixo numérico ("1- ...", "2- ...", "9- ..."), "Todos" fica primeiro.
  const sortedCourses = Array.from(new Set(items.map(item => item.course)))
    .sort((a, b) => {
      const na = parseInt(a);
      const nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      if (!isNaN(na)) return -1;
      if (!isNaN(nb)) return 1;
      return a.localeCompare(b);
    });
  const categories = ['Todos', ...sortedCourses];

  // Paleta de gradientes (1 por trilha, ciclada se passar de 10)
  const CARD_GRADIENTS = [
    'from-blue-500 via-blue-700 to-indigo-900',
    'from-emerald-400 via-teal-600 to-cyan-900',
    'from-cyan-400 via-blue-600 to-blue-900',
    'from-red-500 via-rose-700 to-slate-900',
    'from-amber-400 via-orange-600 to-red-900',
    'from-violet-400 via-purple-700 to-indigo-900',
    'from-orange-400 via-red-500 to-rose-800',
    'from-emerald-400 via-teal-600 to-emerald-900',
    'from-[#1E2D6E] via-[#0033CC] to-[#0a0f33]',
    'from-lime-400 via-emerald-600 to-teal-900',
    'from-purple-400 via-violet-600 to-indigo-900',
    'from-indigo-400 via-violet-600 to-slate-900',
  ];

  // "Todos" conta vídeos DISTINTOS (por sourceUrl) — o mesmo vídeo aparece em
  // várias trilhas/playlists (modelo multi-placement: cada ocorrência é um doc
  // Firestore separado vinculado por sourceUrl). Sem dedup, o total inflava.
  // Cada trilha individual continua contando suas próprias ocorrências.
  const countByCategory = (cat: string) => {
    if (cat !== 'Todos') return items.filter(i => i.course === cat).length;
    // Dedup por sourceUrl; vídeos sem sourceUrl contam individualmente (cada doc = 1)
    const distintos = new Set<string>();
    let semUrl = 0;
    items.forEach(i => {
      if (i.sourceUrl) distintos.add(i.sourceUrl);
      else semUrl++;
    });
    return distintos.size + semUrl;
  };
  
  const playlists = activeCategory === 'Todos' 
    ? [] 
    : ['Todas', ...Array.from(new Set(items.filter(item => item.course === activeCategory).map(item => item.playlist)))
        .sort((a, b) => {
          const orderA = items.find(i => i.course === activeCategory && i.playlist === a)?.playlistOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = items.find(i => i.course === activeCategory && i.playlist === b)?.playlistOrder ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return a.localeCompare(b);
        })
      ];

  const filteredItems = items.filter(item => {
    const categoryMatch = activeCategory === 'Todos' || item.course === activeCategory;
    const playlistMatch = activePlaylist === 'Todas' || item.playlist === activePlaylist;
    const searchMatch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       item.content.toLowerCase().includes(searchTerm.toLowerCase());
    return categoryMatch && playlistMatch && searchMatch;
  });

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar discreto — só busca + grid/list, sem título */}
      <div className="flex items-center justify-end gap-3">
        <div className="flex items-center bg-white p-1 rounded-lg border border-[#e5e7eb]">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 rounded-md border-none cursor-pointer transition-all",
              viewMode === 'grid' ? "bg-[#1f2937] text-white" : "text-gray-400 hover:text-gray-700"
            )}
            title="Visualização em Grade"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded-md border-none cursor-pointer transition-all",
              viewMode === 'list' ? "bg-[#1f2937] text-white" : "text-gray-400 hover:text-gray-700"
            )}
            title="Visualização em Lista"
          >
            <List size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Buscar lições…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-[#e5e7eb] rounded-lg w-72 focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 text-[13px]"
          />
        </div>
      </div>

      {/* Grid de cards de trilhas — estilo Sua Jornada */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {categories.map((cat, idx) => {
          const isActive = activeCategory === cat;
          const isTodos = cat === 'Todos';
          const trilhaLocked = !isTodos && isCourseLocked(cat);
          // "Todos" tem visual especial (LBW navy/blue), demais ciclam pela paleta.
          const gradient = isTodos
            ? 'from-[#1E2D6E] via-[#0033CC] to-[#0a0f33]'
            : CARD_GRADIENTS[(idx - 1) % CARD_GRADIENTS.length];
          const total = countByCategory(cat);
          // Extrai número do prefixo (ex: "9- COMO..." → "9")
          const match = cat.match(/^(\d+)/);
          const numero = match ? match[1].padStart(2, '0') : null;
          const titulo = isTodos
            ? 'Todos'
            : (match ? cat.replace(/^\d+\s*[-—]\s*/, '') : cat);

          return (
            <motion.button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setActivePlaylist('Todas');
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className={cn(
                "relative h-20 rounded-xl overflow-hidden text-left px-3 py-2 group cursor-pointer transition-all duration-200 focus:outline-none",
                isActive ? "scale-[1.02]" : "hover:scale-[1.03]"
              )}
              style={{
                border: isActive ? '3px solid #FFFFFF' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isActive
                  ? '0 0 0 2px #0033CC, 0 12px 32px -8px rgba(0,51,204,0.6)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
                background: 'transparent',
              }}
            >
              {/* Gradient base */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
              {/* Overlay escuro pra contraste do texto */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              {/* Brilho de hover */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />

              {/* Badge de trilha bloqueada (canto superior direito) */}
              {trilhaLocked && (
                <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <Lock size={10} className="text-white" />
                </div>
              )}

              {/* Conteúdo: título em cima, lições + número embaixo */}
              <div className="relative z-10 h-full flex flex-col justify-between text-white">
                <p
                  className="font-black text-[11px] leading-tight m-0 line-clamp-2"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}
                >
                  {titulo}
                </p>
                <div className="flex items-end justify-between">
                  <span className="text-[9px] font-black tracking-widest text-white/80 uppercase">
                    {total} {total === 1 ? 'lição' : 'lições'}
                  </span>
                  {numero && (
                    <span className="text-[13px] font-black text-white/90 leading-none">
                      {numero}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Sub-filtro de playlists (só quando uma trilha está selecionada) */}
      {activeCategory !== 'Todos' && playlists.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {playlists.map((play) => (
            <button
              key={play}
              onClick={() => setActivePlaylist(play)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap border",
                activePlaylist === play
                  ? "bg-[#1f2937] text-white border-[#1f2937]"
                  : "bg-white text-[#666] border-[#e5e7eb] hover:border-[#1f2937] hover:text-[#1f2937]"
              )}
            >
              {play}
            </button>
          ))}
        </motion.div>
      )}

      {/* Barra de progresso da trilha — só quando uma trilha específica está selecionada.
          Dedup por sourceUrl: se o mesmo vídeo aparece em N playlists, conta uma vez. */}
      {activeCategory !== 'Todos' && (() => {
        const videosDaTrilha = items.filter(v => v.course === activeCategory);
        const urlsUnicas = Array.from(new Set(videosDaTrilha.map(v => v.sourceUrl).filter(Boolean)));
        const assistidos = urlsUnicas.filter(u => watchedUrls[u]).length;
        const total = urlsUnicas.length;
        const pct = total === 0 ? 0 : assistidos / total;
        const pctRound = Math.round(pct * 100);
        const earnedCert = pct >= CERTIFICATE_THRESHOLD_PCT && total > 0;
        return (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#e5e7eb] rounded-[8px] p-4 flex items-center gap-4"
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              earnedCert ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            )}>
              {earnedCert ? <Award size={20} /> : <GraduationCap size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[12px] font-black uppercase tracking-wider text-[#1f2937] m-0">
                  Seu progresso nesta trilha
                </p>
                <span className="text-[12px] font-bold text-[#374151]">
                  {assistidos} / {total} vídeos · {pctRound}%
                </span>
              </div>
              <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctRound}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    earnedCert ? "bg-emerald-500" : "bg-blue-600"
                  )}
                />
                {/* Marca do threshold do certificado */}
                <div
                  className="absolute top-[-4px] bottom-[-4px] w-px bg-amber-500"
                  style={{ left: `${CERTIFICATE_THRESHOLD_PCT * 100}%` }}
                  title={`Certificado liberado em ${CERTIFICATE_THRESHOLD_PCT * 100}%`}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 m-0">
                {earnedCert
                  ? <span className="text-emerald-700 font-bold">🎓 Certificado liberado</span>
                  : `Liberação do certificado em ${Math.round(CERTIFICATE_THRESHOLD_PCT * 100)}% — falta ${Math.max(0, Math.ceil(total * CERTIFICATE_THRESHOLD_PCT) - assistidos)} ${(Math.ceil(total * CERTIFICATE_THRESHOLD_PCT) - assistidos) === 1 ? 'vídeo' : 'vídeos'}`
                }
              </p>
            </div>
          </motion.div>
        );
      })()}

      {/* Toast de certificado recém-emitido */}
      {justCompletedCertId && (() => {
        const init = allInitiatives.find(i => i.id === justCompletedCertId);
        if (!init) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fixed top-20 right-6 z-50 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-2xl p-4 max-w-sm border border-emerald-300"
          >
            <div className="flex items-start gap-3">
              <Award size={28} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-black text-sm m-0 mb-1">🎓 Certificado liberado!</p>
                <p className="text-xs opacity-90 m-0 mb-3">Você completou {Math.round(CERTIFICATE_THRESHOLD_PCT * 100)}% da trilha <strong>{init.name}</strong>.</p>
                <a
                  href={`/certificado/${init.id}`}
                  className="inline-flex items-center gap-1.5 bg-white text-emerald-700 hover:bg-emerald-50 text-[11px] font-black tracking-wider uppercase px-3 py-1.5 rounded-md transition-colors no-underline"
                >
                  Ver meu certificado →
                </a>
              </div>
              <button onClick={() => setJustCompletedCertId(null)}
                className="text-white/70 hover:text-white border-0 bg-transparent cursor-pointer p-0">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        );
      })()}

      {loading ? (
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[4px] border border-[#ccc] h-64 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#ccc] rounded-[4px]">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold">Nenhum curso disponível.</p>
          <p className="text-gray-400 text-sm">Adicione vídeos na Base de Conhecimento para vê-los aqui.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {filteredItems.map((item, i) => {
            const videoId = getYoutubeId(item.sourceUrl);
            const isSelected = selectedVideo?.id === item.id;
            const videoLocked = isCourseLocked(item.course);
            const isWatched = !!watchedUrls[item.sourceUrl];

            return (
              <React.Fragment key={item.id || i}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "bg-white rounded-[4px] border overflow-hidden group transition-all cursor-pointer flex",
                    viewMode === 'grid' ? "flex-col" : "flex-row h-32",
                    isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-[#ccc]",
                    videoLocked ? "hover:shadow-lg" : "hover:shadow-md"
                  )}
                  onClick={() => {
                    if (videoLocked) {
                      setLockedPopupOpen(true);
                      return;
                    }
                    if (!isSelected && item.id) logVideoPlayed(item.id, item.title, item.course);
                    setSelectedVideo(isSelected ? null : item);
                  }}
                >
                  <div className={cn(
                    "relative overflow-hidden",
                    viewMode === 'grid' ? "aspect-video" : "w-56 h-full"
                  )}>
                    <img
                      src={youtubeThumb(videoId, 'hqdefault')}
                      alt={item.title}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-500",
                        videoLocked ? "grayscale-[40%] brightness-75" : "group-hover:scale-105"
                      )}
                      referrerPolicy="no-referrer"
                    />
                    {/* Badge de "Assistido" — canto superior esquerdo, sempre visível */}
                    {isWatched && !videoLocked && (
                      <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white"
                        title="Você já assistiu este vídeo">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                    {videoLocked ? (
                      <>
                        {/* Overlay escuro fixo nos vídeos bloqueados */}
                        <div className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/55" />
                        {/* Badge grande de cadeado no centro */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/40 shadow-xl group-hover:scale-110 transition-transform">
                            <Lock size={22} className="text-white" />
                          </div>
                        </div>
                        {/* Faixa "PACOTE COMPLETO" no canto */}
                        <div className="absolute top-2 right-2 bg-[#0033CC] text-white text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full shadow-lg">
                          Pacote Completo
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-transform duration-300">
                          <PlayCircle size={24} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className={cn(
                        "font-bold leading-tight group-hover:text-[#3b82f6] transition-colors m-0 mb-2",
                        viewMode === 'grid' ? "text-[14px]" : "text-[16px]"
                      )}>
                        {item.title}
                      </h3>
                      {viewMode === 'list' && (
                        <p className="text-gray-500 text-xs line-clamp-2 mb-2">{item.content}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Layers size={12} />
                          {item.playlist}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {item.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                      {isSelected ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </motion.div>

                {/* Inline Player */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "overflow-hidden bg-gray-50 border-x border-b border-[#ccc] rounded-b-[4px] -mt-6 mb-4",
                        viewMode === 'grid' ? "col-span-1 md:col-span-2 lg:col-span-3" : ""
                      )}
                    >
                      <div className="p-6 flex flex-col lg:flex-row gap-6">
                        {/* Sumário à esquerda */}
                        <div className="w-full lg:w-80 flex flex-col order-1">
                          <div className="bg-white border border-[#ccc] rounded-[4px] flex-1 flex flex-col overflow-hidden">
                            <div className="bg-gray-100 p-3 border-b border-[#ccc] flex items-center justify-between">
                              <h4 className="text-xs font-bold m-0 flex items-center gap-2">
                                <ListVideo size={14} className="text-blue-600" />
                                Sumário do Vídeo
                              </h4>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                              {item.summary && item.summary.length > 0 ? (
                                item.summary.map((point, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSeekTime(parseTimeToSeconds(point.time))}
                                    className="w-full flex gap-3 text-left p-1.5 -mx-1.5 rounded hover:bg-blue-50 transition-colors group/point border-none bg-transparent cursor-pointer"
                                  >
                                    <span className="text-blue-600 font-mono text-xs font-bold bg-blue-50 group-hover/point:bg-blue-100 px-2 py-0.5 rounded h-fit transition-colors flex-shrink-0">
                                      {point.time}
                                    </span>
                                    <p className="text-xs text-gray-700 m-0 leading-relaxed group-hover/point:text-blue-600 transition-colors">
                                      {point.topic}
                                    </p>
                                  </button>
                                ))
                              ) : (
                                <p className="text-xs text-gray-400 italic text-center py-8">Nenhum sumário disponível para este vídeo.</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Vídeo à direita */}
                        <div className="flex-1 aspect-video bg-black rounded-[4px] overflow-hidden shadow-lg order-2">
                          <iframe
                            ref={iframeRef}
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`}
                            title={item.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <LockedToolPopup isOpen={lockedPopupOpen} onClose={() => setLockedPopupOpen(false)} />
    </div>
  );
}
