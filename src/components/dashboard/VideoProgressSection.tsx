/**
 * VideoProgressSection — bloco reutilizável "Meu progresso de aprendizado".
 *
 * Usado nos dashboards do aluno (Pago e Gratuito). Aditivo — não substitui o
 * progresso de FERRAMENTAS (useProgressoPorTrilha), é específico de VÍDEOS.
 *
 * - Lê userProgress + initiatives + knowledge_base em runtime → flexível
 *   (admin pode mudar trilhas/vídeos a qualquer hora)
 * - Mostra só trilhas ACESSÍVEIS pro aluno (recebe a lista via prop)
 * - Bloco compacto: stats no topo + lista de barras por trilha
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Award, GraduationCap, PlayCircle } from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  subscribeUserProgress,
  calculateAllTrilhasProgress,
  CERTIFICATE_THRESHOLD_PCT,
  type WatchedEntry,
  type TrilhaProgress,
} from '../../services/videoProgressService';
import { getAllKnowledge, type KnowledgeEntry } from '../../services/knowledgeService';
import type { Initiative } from '../../types';
import { SectionLabel } from './_shared';

interface Props {
  /** Initiatives acessíveis pro aluno (já filtradas por plano antes). */
  accessibleInitiatives: Initiative[];
}

export default function VideoProgressSection({ accessibleInitiatives }: Props) {
  const [watchedUrls, setWatchedUrls] = useState<Record<string, WatchedEntry>>({});
  const [certificadosCount, setCertificadosCount] = useState(0);
  const [videos, setVideos] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega vídeos uma vez (estável durante a sessão)
  useEffect(() => {
    getAllKnowledge()
      .then(setVideos)
      .finally(() => setLoading(false));
  }, []);

  // Subscreve progresso em tempo real
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = subscribeUserProgress(uid, p => {
      setWatchedUrls(p.watchedUrls);
      setCertificadosCount(Object.keys(p.certificadosEmitidos).length);
    });
    return () => unsub();
  }, []);

  if (loading || accessibleInitiatives.length === 0) return null;

  const progressos: TrilhaProgress[] = calculateAllTrilhasProgress(
    accessibleInitiatives,
    videos,
    watchedUrls,
  );

  const totalVideosUnicos = Array.from(
    new Set(
      accessibleInitiatives.flatMap(i =>
        videos.filter(v => v.course === i.name).map(v => v.sourceUrl).filter(Boolean),
      ),
    ),
  );
  const totalAssistidos = totalVideosUnicos.filter(u => watchedUrls[u]).length;
  const pctGeral = totalVideosUnicos.length === 0 ? 0 : totalAssistidos / totalVideosUnicos.length;

  return (
    <div className="mt-8">
      <SectionLabel>Meu progresso de aprendizado</SectionLabel>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <MiniStat
          icon={<PlayCircle size={14} />}
          label="Vídeos assistidos"
          value={`${totalAssistidos} / ${totalVideosUnicos.length}`}
          sublabel={`${Math.round(pctGeral * 100)}% do total acessível`}
        />
        <MiniStat
          icon={<Award size={14} />}
          label="Certificados liberados"
          value={String(certificadosCount)}
          sublabel={`${Math.round(CERTIFICATE_THRESHOLD_PCT * 100)}% por trilha`}
          accent={certificadosCount > 0 ? '#34D399' : undefined}
        />
        <MiniStat
          icon={<GraduationCap size={14} />}
          label="Trilhas em andamento"
          value={String(progressos.filter(p => p.watched > 0 && !p.earnedCertificate).length)}
          sublabel={`de ${accessibleInitiatives.length} acessíveis`}
        />
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="divide-y divide-white/[0.06]">
          {progressos.map((p, idx) => (
            <TrilhaProgressRow key={p.initiativeId} progress={p} delay={idx * 0.04} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon, label, value, sublabel, accent,
}: { icon: React.ReactNode; label: string; value: string; sublabel?: string; accent?: string }) {
  return (
    <div className="rounded-xl px-4 py-3 border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase mb-1.5" style={{ color: accent || 'rgba(255,255,255,0.55)' }}>
        {icon} {label}
      </div>
      <div className="text-[20px] font-black text-white leading-none mb-1">{value}</div>
      {sublabel && <div className="text-[10px] text-white/45">{sublabel}</div>}
    </div>
  );
}

function TrilhaProgressRow({ progress, delay }: { progress: TrilhaProgress; delay: number }) {
  const pctRound = Math.round(progress.pct * 100);
  const earned = progress.earnedCertificate;
  const semVideos = progress.total === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="px-4 py-3 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-[13px] font-bold text-white m-0 truncate flex-1" title={progress.initiativeName}>
            {progress.initiativeName}
          </p>
          {earned && (
            <Link
              to={`/certificado/${progress.initiativeId}`}
              className="text-[10px] font-black tracking-wider uppercase text-emerald-400 hover:text-emerald-300 flex items-center gap-1 flex-shrink-0 transition-colors no-underline"
              title="Abrir certificado"
            >
              <Award size={11} /> Certificado →
            </Link>
          )}
        </div>
        <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          {!semVideos && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pctRound}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: earned ? '#34D399' : 'linear-gradient(90deg, #0033CC, #6699FF)' }}
            />
          )}
          {/* Marca do threshold do certificado */}
          {!semVideos && (
            <div
              className="absolute top-[-3px] bottom-[-3px] w-px bg-amber-400/70"
              style={{ left: `${CERTIFICATE_THRESHOLD_PCT * 100}%` }}
              title={`Certificado em ${CERTIFICATE_THRESHOLD_PCT * 100}%`}
            />
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 w-20">
        {semVideos ? (
          <span className="text-[10px] text-white/35">sem vídeos</span>
        ) : (
          <>
            <div className="text-[12px] font-black text-white leading-none">{pctRound}%</div>
            <div className="text-[10px] text-white/45 mt-0.5">{progress.watched}/{progress.total}</div>
          </>
        )}
      </div>
    </motion.div>
  );
}
