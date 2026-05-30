/**
 * videoProgressService — rastreamento de vídeos assistidos por aluno.
 *
 * Princípios:
 *   1. Dedup natural por `sourceUrl` (mesmo vídeo em N trilhas conta uma vez só).
 *   2. Cálculo de % por trilha é PURO (não consulta Firestore na hora de renderizar).
 *      Renderizar status de muitos vídeos = 1 leitura (do doc userProgress) + N filtros locais.
 *   3. Flexível: trilhas vêm de `initiatives` em runtime; vídeos vêm de `knowledge_base.course`.
 *      Admin pode adicionar/renomear/remover trilhas e vídeos — o progresso recalcula automaticamente.
 *   4. Sem hardcode de IDs. Thresholds em constantes exportadas — mudar de 70% pra outro valor
 *      é trocar 1 número e a UI/regra inteira segue.
 *
 * Schema Firestore:
 *   userProgress/{uid} = {
 *     uid,
 *     watchedUrls: { [sourceUrl]: { watchedAt, pctWatched?, firstSeenIn? } },
 *     certificadosEmitidos: { [initiativeId]: { issuedAt, pctAtIssue, initiativeNameAtIssue } },
 *     lastUpdated
 *   }
 */

import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import type { Initiative } from '../types';
import type { KnowledgeEntry } from './knowledgeService';

// ===================================================================================
// THRESHOLDS — única fonte de verdade. Trocar aqui muda a regra inteira do sistema.
// ===================================================================================

/** % mínimo de cada vídeo assistido pra considerar "lido" (auto-mark do player). */
export const WATCH_THRESHOLD_PCT = 0.70;

/** % mínimo de vídeos da trilha pro aluno receber o certificado. */
export const CERTIFICATE_THRESHOLD_PCT = 0.70;

export const USER_PROGRESS_COLLECTION = 'userProgress';
/** Coleção PÚBLICA com snapshot mínimo de cada certificado — leitura aberta pra /verificar/{certId}.
 *  NÃO contém dados sensíveis: só nome do aluno, nome da trilha, data e ID. */
export const PUBLIC_CERTIFICATES_COLLECTION = 'certificadosPublicos';

// ===================================================================================
// Tipos
// ===================================================================================

export interface WatchedEntry {
  watchedAt: string;
  /** % do vídeo que foi assistido quando marcou (auto-detect ou manual). */
  pctWatched?: number;
  /** initiativeId da trilha onde o aluno assistiu pela primeira vez (referência informativa). */
  firstSeenIn?: string;
  /** Última posição em segundos — usado pra retomar o vídeo de onde o aluno parou. */
  lastPosition?: number;
}

export interface CertificadoEmitido {
  issuedAt: string;
  pctAtIssue: number;
  /** Nome da trilha NO MOMENTO da emissão — preserva mesmo se trilha for renomeada depois. */
  initiativeNameAtIssue: string;
  /** ID único do certificado — formato LBW-YYYY-XXXXXX. Usado em /verificar/{certId}. */
  certId: string;
  /** Nome do aluno NO MOMENTO da emissão — congela mesmo se o aluno trocar o nome depois. */
  alunoNomeAtIssue: string;
}

export interface UserProgress {
  uid: string;
  watchedUrls: Record<string, WatchedEntry>;
  certificadosEmitidos: Record<string, CertificadoEmitido>;
  lastUpdated: string;
}

export interface TrilhaProgress {
  initiativeId: string;
  initiativeName: string;
  watched: number;
  total: number;
  pct: number;
  /** URLs únicas (já deduplicadas) da trilha. */
  uniqueUrls: string[];
  /** Subset de uniqueUrls que o aluno já assistiu. */
  watchedUrls: string[];
  /** True se cruzou o threshold de certificado. */
  earnedCertificate: boolean;
}

// ===================================================================================
// Default (quando aluno ainda não tem doc)
// ===================================================================================

function emptyProgress(uid: string): UserProgress {
  return {
    uid,
    watchedUrls: {},
    certificadosEmitidos: {},
    lastUpdated: new Date().toISOString(),
  };
}

// ===================================================================================
// Leitura
// ===================================================================================

export async function getUserProgress(uid: string): Promise<UserProgress> {
  if (!uid) return emptyProgress('');
  const ref = doc(db, USER_PROGRESS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return emptyProgress(uid);
  const data = snap.data() as Partial<UserProgress>;
  return {
    uid,
    watchedUrls: data.watchedUrls || {},
    certificadosEmitidos: data.certificadosEmitidos || {},
    lastUpdated: data.lastUpdated || new Date().toISOString(),
  };
}

/** Lê o progresso de TODOS os alunos. Usado no relatório admin (até ~100 alunos). */
export async function getAllUsersProgress(): Promise<UserProgress[]> {
  const snap = await getDocs(collection(db, USER_PROGRESS_COLLECTION));
  return snap.docs.map(d => {
    const data = d.data() as Partial<UserProgress>;
    return {
      uid: d.id,
      watchedUrls: data.watchedUrls || {},
      certificadosEmitidos: data.certificadosEmitidos || {},
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    };
  });
}

// ===================================================================================
// Escrita (marcar vídeo como assistido)
// ===================================================================================

/**
 * Marca um vídeo como assistido. Idempotente — se já marcado, não sobrescreve `watchedAt`
 * pra preservar o registro original.
 *
 * @param uid uid do aluno
 * @param sourceUrl URL do vídeo (chave de dedup)
 * @param pctWatched % do vídeo assistido (0..1)
 * @param firstSeenIn initiativeId da trilha onde está abrindo (informativo)
 */
export async function markVideoWatched(
  uid: string,
  sourceUrl: string,
  pctWatched: number,
  firstSeenIn?: string,
): Promise<void> {
  if (!uid || !sourceUrl) return;
  if (pctWatched < WATCH_THRESHOLD_PCT) return; // não persiste se não atingiu o threshold

  const current = await getUserProgress(uid);
  if (current.watchedUrls[sourceUrl]) {
    // Já marcado — só atualiza pctWatched se o novo for maior (aluno reassistiu mais)
    const existing = current.watchedUrls[sourceUrl];
    if ((existing.pctWatched ?? 1) >= pctWatched) return;
  }

  const updated: UserProgress = {
    ...current,
    watchedUrls: {
      ...current.watchedUrls,
      [sourceUrl]: {
        watchedAt: current.watchedUrls[sourceUrl]?.watchedAt || new Date().toISOString(),
        pctWatched,
        firstSeenIn: current.watchedUrls[sourceUrl]?.firstSeenIn || firstSeenIn,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
  await setDoc(doc(db, USER_PROGRESS_COLLECTION, uid), updated, { merge: false });
}

/**
 * Salva a posição atual do vídeo (em segundos) pra retomar depois.
 * Regra: se já passou de 95% da duração ("concluiu"), grava 0 — assim ao reabrir
 * o vídeo começa do início (modo revisão). Caso contrário, grava a posição exata.
 *
 * Write seletivo (merge) — não toca em outros campos. Chamado a cada ~10s pelo player.
 */
export async function saveVideoPosition(
  uid: string,
  sourceUrl: string,
  currentSeconds: number,
  durationSeconds: number,
): Promise<void> {
  if (!uid || !sourceUrl || durationSeconds <= 0) return;
  const pct = currentSeconds / durationSeconds;
  const position = pct >= 0.95 ? 0 : Math.floor(currentSeconds);

  const current = await getUserProgress(uid);
  const existing = current.watchedUrls[sourceUrl] || { watchedAt: new Date().toISOString() };
  // Não escreve se a posição não mudou meaningfully (evita writes redundantes)
  if (Math.abs((existing.lastPosition || 0) - position) < 5 && position !== 0) return;

  const updated: UserProgress = {
    ...current,
    watchedUrls: {
      ...current.watchedUrls,
      [sourceUrl]: { ...existing, lastPosition: position },
    },
    lastUpdated: new Date().toISOString(),
  };
  await setDoc(doc(db, USER_PROGRESS_COLLECTION, uid), updated, { merge: false });
}

/**
 * Desmarca um vídeo. Útil pra debug/admin ou aluno que quer "esquecer" um vídeo.
 */
export async function unmarkVideoWatched(uid: string, sourceUrl: string): Promise<void> {
  if (!uid || !sourceUrl) return;
  const current = await getUserProgress(uid);
  if (!current.watchedUrls[sourceUrl]) return;
  const { [sourceUrl]: _, ...rest } = current.watchedUrls;
  const updated: UserProgress = {
    ...current,
    watchedUrls: rest,
    lastUpdated: new Date().toISOString(),
  };
  await setDoc(doc(db, USER_PROGRESS_COLLECTION, uid), updated, { merge: false });
}

// ===================================================================================
// Cálculo de progresso por trilha (PURO — não acessa Firestore)
// ===================================================================================

/**
 * Calcula o progresso do aluno numa trilha.
 * É PURO: recebe progresso + initiative + todos os vídeos e devolve as métricas.
 *
 * Match: vídeos da trilha = knowledge_base com `course === initiative.name`.
 * Dedup: sourceUrl único conta uma vez.
 */
export function calculateTrilhaProgress(
  initiative: Initiative,
  allVideos: KnowledgeEntry[],
  watchedUrls: Record<string, WatchedEntry>,
): TrilhaProgress {
  const trilhaVideos = allVideos.filter(v => v.course === initiative.name);
  const uniqueUrls = Array.from(new Set(trilhaVideos.map(v => v.sourceUrl).filter(Boolean)));
  const watchedSet = uniqueUrls.filter(u => watchedUrls[u]);
  const total = uniqueUrls.length;
  const pct = total === 0 ? 0 : watchedSet.length / total;
  return {
    initiativeId: initiative.id,
    initiativeName: initiative.name,
    watched: watchedSet.length,
    total,
    pct,
    uniqueUrls,
    watchedUrls: watchedSet,
    earnedCertificate: pct >= CERTIFICATE_THRESHOLD_PCT && total > 0,
  };
}

/**
 * Calcula progresso em TODAS as trilhas de uma vez. Usado no dashboard do aluno.
 */
export function calculateAllTrilhasProgress(
  initiatives: Initiative[],
  allVideos: KnowledgeEntry[],
  watchedUrls: Record<string, WatchedEntry>,
): TrilhaProgress[] {
  return initiatives.map(i => calculateTrilhaProgress(i, allVideos, watchedUrls));
}

// ===================================================================================
// Certificado — emissão (registro no userProgress)
// ===================================================================================

/**
 * Gera um certId único e legível no formato LBW-YYYY-XXXXXX.
 * 6 chars alfanuméricos com 36^6 ≈ 2.2 bilhões de combinações — colisão é desprezível na escala do app.
 */
function generateCertId(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `LBW-${year}-${suffix}`;
}

/**
 * Verifica se o aluno cruzou o threshold da trilha e, se sim, registra o certificado emitido.
 * Idempotente — não re-emite. Devolve true se emitiu agora, false se já estava emitido.
 *
 * @param alunoNome Nome do aluno no momento da emissão (congelado no doc — preserva mesmo se aluno
 *                  trocar o nome depois). Receba do hook useUserAccess ou do userService.
 *
 * Não bloqueia UI nem invalida cache — chama em background quando aluno marca vídeo.
 */
export async function checkAndIssueCertificate(
  uid: string,
  initiative: Initiative,
  allVideos: KnowledgeEntry[],
  alunoNome: string,
): Promise<boolean> {
  const progress = await getUserProgress(uid);
  if (progress.certificadosEmitidos[initiative.id]) return false; // já emitido

  const trilhaProgress = calculateTrilhaProgress(initiative, allVideos, progress.watchedUrls);
  if (!trilhaProgress.earnedCertificate) return false;

  const certId = generateCertId();
  const issuedAt = new Date().toISOString();
  const nomeNormalizado = alunoNome || 'Aluno LBW';

  const updated: UserProgress = {
    ...progress,
    certificadosEmitidos: {
      ...progress.certificadosEmitidos,
      [initiative.id]: {
        issuedAt,
        pctAtIssue: trilhaProgress.pct,
        initiativeNameAtIssue: initiative.name,
        certId,
        alunoNomeAtIssue: nomeNormalizado,
      },
    },
    lastUpdated: issuedAt,
  };

  // Escrita dupla: o doc completo do aluno + o snapshot público do certificado.
  // O snapshot público tem só o estritamente necessário pra /verificar/{certId} validar.
  await Promise.all([
    setDoc(doc(db, USER_PROGRESS_COLLECTION, uid), updated, { merge: false }),
    setDoc(doc(db, PUBLIC_CERTIFICATES_COLLECTION, certId), {
      certId,
      alunoNome: nomeNormalizado,
      initiativeName: initiative.name,
      issuedAt,
    }),
  ]);
  return true;
}

/** Lê um certificado público pelo certId. Usado na rota /verificar/{certId} (sem auth). */
export interface CertificadoPublico {
  certId: string;
  alunoNome: string;
  initiativeName: string;
  issuedAt: string;
}

export async function getCertificadoPublico(certId: string): Promise<CertificadoPublico | null> {
  if (!certId) return null;
  const snap = await getDoc(doc(db, PUBLIC_CERTIFICATES_COLLECTION, certId));
  if (!snap.exists()) return null;
  return snap.data() as CertificadoPublico;
}

// ===================================================================================
// Listener real-time (opcional — pra UI reativa quando o player marca vídeo)
// ===================================================================================

import { onSnapshot } from 'firebase/firestore';

export function subscribeUserProgress(
  uid: string,
  onChange: (progress: UserProgress) => void,
): () => void {
  if (!uid) return () => {};
  const ref = doc(db, USER_PROGRESS_COLLECTION, uid);
  const unsub = onSnapshot(ref, snap => {
    if (!snap.exists()) {
      onChange(emptyProgress(uid));
      return;
    }
    const data = snap.data() as Partial<UserProgress>;
    onChange({
      uid,
      watchedUrls: data.watchedUrls || {},
      certificadosEmitidos: data.certificadosEmitidos || {},
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    });
  });
  return unsub;
}

// Suprime warning de unused import (serverTimestamp é mantido pra uso futuro de timestamps server-side)
void serverTimestamp;
