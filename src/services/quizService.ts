/**
 * quizService — avaliações (provas) por trilha + regras de aprovação.
 *
 * Modelo:
 *   - Cada trilha (número 1..8) tem UMA prova (QuizConfig) com N questões.
 *   - Cada questão tem 4 alternativas e o índice da correta.
 *   - Critério de aprovação por trilha: nota mínima (%) — default 70%.
 *   - Pré-requisito de acesso à prova: % de vídeos assistidos da trilha (usa videoProgressService).
 *
 * Persistência:
 *   Firestore `quizzes/{trilhaNum}` = QuizConfig. O aluno carrega a versão pública
 *   pelo servidor, sem gabarito. O seed/gabarito padrão fica apenas no servidor.
 *
 * Regras de conteúdo (montadas no seed):
 *   - Trilhas 1..7: 15 questões cada, SEM repetir questões entre elas.
 *   - Trilha 8: 25 questões amostradas das trilhas 2..7 (idênticas às originais).
 */

import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const QUIZZES_COLLECTION = 'quizzes';

/** % mínimo de vídeos assistidos da trilha para LIBERAR a prova. */
export const DEFAULT_WATCH_GATE_PCT = 0.70;
/** % mínimo de acerto na prova para APROVAR e emitir certificado. */
export const DEFAULT_PASS_PCT = 0.70;

export interface QuizQuestion {
  id: string;
  /** Enunciado da pergunta. */
  text: string;
  /** Exatamente 4 alternativas. */
  options: string[];
  /** Índice (0..3) da alternativa correta. */
  correctIndex?: number;
}

export interface QuizConfig {
  /** Número da trilha (1..8). */
  trilha: number;
  /** ID estável do curso. Evita depender de números escritos no nome. */
  initiativeId?: string;
  /** Título formal exibido (bate com o certificado). */
  titulo: string;
  /** % de acerto para aprovar (0..1). */
  passPct: number;
  /** % de vídeos assistidos para liberar a prova (0..1). */
  watchGatePct: number;
  questions: QuizQuestion[];
  /** Dono da prova (multi-tenant). Default 'israel' (consultor #0). */
  consultorId?: string;
  updatedAt?: string;
}

// Doc escopado por consultor: `${consultorId}__${trilha}`. Israel (consultor #0)
// também herda os docs ANTIGOS sem escopo (`quizzes/{trilha}`) como fallback.
const scopedId = (consultorId: string, trilha: number) => `${consultorId}__${trilha}`;

/**
 * Lê a prova de uma trilha, ESCOPADA por consultor.
 * Ordem: doc do consultor (`{consultorId}__{trilha}`) → (só Israel) doc legado
 * (`quizzes/{trilha}`) → seed embutido. Assim cada consultor tem a prova dele e
 * o Israel não perde as provas que já criou.
 */
export async function getQuiz(trilha: number, consultorId: string = 'israel'): Promise<QuizConfig> {
  const build = (data: Partial<QuizConfig>): QuizConfig => ({
    trilha,
    initiativeId: data.initiativeId,
    titulo: data.titulo || `Trilha ${trilha}`,
    passPct: typeof data.passPct === 'number' ? data.passPct : DEFAULT_PASS_PCT,
    watchGatePct: typeof data.watchGatePct === 'number' ? data.watchGatePct : DEFAULT_WATCH_GATE_PCT,
    questions: Array.isArray(data.questions) ? data.questions : [],
    consultorId,
    updatedAt: data.updatedAt,
  });
  try {
    const scoped = await getDoc(doc(db, QUIZZES_COLLECTION, scopedId(consultorId, trilha)));
    if (scoped.exists()) return build(scoped.data() as Partial<QuizConfig>);
    // Legado: só o Israel herda os quizzes antigos sem escopo.
    if (consultorId === 'israel') {
      const legacy = await getDoc(doc(db, QUIZZES_COLLECTION, String(trilha)));
      if (legacy.exists()) return build(legacy.data() as Partial<QuizConfig>);
    }
  } catch (e) {
    console.error('[quizService] getQuiz erro:', e);
  }
  return { trilha, titulo: `Trilha ${trilha}`, passPct: DEFAULT_PASS_PCT, watchGatePct: DEFAULT_WATCH_GATE_PCT, questions: [], consultorId };
}

/** Lê todas as 8 provas do consultor (aluno vê a lista de blocos). */
export async function getAllQuizzes(consultorId: string = 'israel'): Promise<QuizConfig[]> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (token) {
    const r = await fetch(`/api/quizzes/list?consultorId=${encodeURIComponent(consultorId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await r.json().catch(() => ({} as any));
    if (r.ok && Array.isArray(body?.quizzes)) return body.quizzes as QuizConfig[];
  }
  const out: QuizConfig[] = [];
  const results = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7, 8].map(async (t) => {
      try { return await getQuiz(t, consultorId); } catch { return null; }
    })
  );
  for (const q of results) if (q) out.push(q);
  return out.sort((a, b) => a.trilha - b.trilha);
}

/** Salva/edita a prova de uma trilha do consultor. */
export async function saveQuiz(config: QuizConfig, consultorId: string = 'israel'): Promise<void> {
  const payload: QuizConfig = { ...config, consultorId, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, QUIZZES_COLLECTION, scopedId(consultorId, config.trilha)), payload, { merge: false });
}

/** Embaralha alternativas sem expor gabarito no cliente (Fisher-Yates determinístico por seed simples). */
export function shuffleOptions(q: QuizQuestion, seed: number): { options: string[] } {
  const idx = q.options.map((_, i) => i);
  // shuffle determinístico por seed (não usa Math.random pra ser estável na sessão)
  let s = seed + q.id.length;
  for (let i = idx.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const options = idx.map((i) => q.options[i]);
  return { options };
}
