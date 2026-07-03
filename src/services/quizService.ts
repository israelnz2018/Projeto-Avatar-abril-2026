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
 *   Firestore `quizzes/{trilhaNum}` = QuizConfig. Se não existir no Firestore,
 *   o app usa o SEED embutido (DEFAULT_QUIZZES). O admin edita e salva no Firestore,
 *   que passa a ter prioridade. Assim funciona "out of the box" e é editável.
 *
 * Regras de conteúdo (montadas no seed):
 *   - Trilhas 1..7: 15 questões cada, SEM repetir questões entre elas.
 *   - Trilha 8: 25 questões amostradas das trilhas 2..7 (idênticas às originais).
 */

import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { DEFAULT_QUIZZES } from './quizSeed';

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
  correctIndex: number;
}

export interface QuizConfig {
  /** Número da trilha (1..8). */
  trilha: number;
  /** Título formal exibido (bate com o certificado). */
  titulo: string;
  /** % de acerto para aprovar (0..1). */
  passPct: number;
  /** % de vídeos assistidos para liberar a prova (0..1). */
  watchGatePct: number;
  questions: QuizQuestion[];
  updatedAt?: string;
}

/**
 * Lê a config da prova de uma trilha. Firestore tem prioridade; cai no seed embutido.
 */
export async function getQuiz(trilha: number): Promise<QuizConfig> {
  try {
    const snap = await getDoc(doc(db, QUIZZES_COLLECTION, String(trilha)));
    if (snap.exists()) {
      const data = snap.data() as Partial<QuizConfig>;
      // Merge defensivo com o seed (garante campos e evita quebrar se doc antigo)
      const seed = DEFAULT_QUIZZES[trilha];
      return {
        trilha,
        titulo: data.titulo || seed?.titulo || `Trilha ${trilha}`,
        passPct: typeof data.passPct === 'number' ? data.passPct : DEFAULT_PASS_PCT,
        watchGatePct: typeof data.watchGatePct === 'number' ? data.watchGatePct : DEFAULT_WATCH_GATE_PCT,
        questions: Array.isArray(data.questions) && data.questions.length > 0 ? data.questions : (seed?.questions || []),
        updatedAt: data.updatedAt,
      };
    }
  } catch (e) {
    console.error('[quizService] getQuiz erro, usando seed:', e);
  }
  return DEFAULT_QUIZZES[trilha] || {
    trilha, titulo: `Trilha ${trilha}`, passPct: DEFAULT_PASS_PCT, watchGatePct: DEFAULT_WATCH_GATE_PCT, questions: [],
  };
}

/** Lê todas as 8 provas de uma vez (aluno vê a lista de blocos). */
export async function getAllQuizzes(): Promise<QuizConfig[]> {
  const out: QuizConfig[] = [];
  // Firestore primeiro (1 leitura por trilha, mas em paralelo)
  const results = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7, 8].map(async (t) => {
      try { return await getQuiz(t); } catch { return DEFAULT_QUIZZES[t]; }
    })
  );
  for (const q of results) if (q) out.push(q);
  return out.sort((a, b) => a.trilha - b.trilha);
}

/** Salva/edita a prova de uma trilha (admin). */
export async function saveQuiz(config: QuizConfig): Promise<void> {
  const payload: QuizConfig = { ...config, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, QUIZZES_COLLECTION, String(config.trilha)), payload, { merge: false });
}

/** Corrige uma tentativa: recebe respostas do aluno (índice por questionId) e devolve nota. */
export interface QuizResult {
  total: number;
  correct: number;
  pct: number;
  passed: boolean;
  /** Por questão: se acertou. */
  perQuestion: { id: string; correct: boolean; chosen: number; correctIndex: number }[];
}

export function gradeQuiz(config: QuizConfig, answers: Record<string, number>): QuizResult {
  const perQuestion = config.questions.map((q) => {
    const chosen = answers[q.id];
    const correct = chosen === q.correctIndex;
    return { id: q.id, correct, chosen: chosen ?? -1, correctIndex: q.correctIndex };
  });
  const correct = perQuestion.filter((p) => p.correct).length;
  const total = config.questions.length;
  const pct = total === 0 ? 0 : correct / total;
  return { total, correct, pct, passed: pct >= (config.passPct ?? DEFAULT_PASS_PCT), perQuestion };
}

/** Embaralha alternativas mantendo o rastreio da correta (Fisher-Yates determinístico por seed simples). */
export function shuffleOptions(q: QuizQuestion, seed: number): { options: string[]; correctIndex: number } {
  const idx = q.options.map((_, i) => i);
  // shuffle determinístico por seed (não usa Math.random pra ser estável na sessão)
  let s = seed + q.id.length;
  for (let i = idx.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const options = idx.map((i) => q.options[i]);
  const correctIndex = idx.indexOf(q.correctIndex);
  return { options, correctIndex };
}
