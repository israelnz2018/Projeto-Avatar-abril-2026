import {
  doc,
  collection,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const API_USAGE_COLLECTION = 'api_usage';

export interface UsageDoc {
  date: string;
  // Gemini
  geminiCalls: number;
  geminiPromptTokens: number;
  geminiCandidatesTokens: number;
  geminiTotalTokens: number;
  geminiFailures: number;
  // Anthropic
  anthropicCalls: number;
  anthropicInputTokens: number;
  anthropicOutputTokens: number;
  anthropicTotalTokens: number;
  anthropicFailures: number;
  lastUpdatedAt?: any;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function trackGeminiUsage(opts: {
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  failed?: boolean;
}): Promise<void> {
  try {
    const key = todayKey();
    const refDoc = doc(db, API_USAGE_COLLECTION, key);
    await setDoc(refDoc, {
      date: key,
      geminiCalls: increment(1),
      geminiPromptTokens: increment(opts.promptTokens || 0),
      geminiCandidatesTokens: increment(opts.candidatesTokens || 0),
      geminiTotalTokens: increment(opts.totalTokens || 0),
      geminiFailures: increment(opts.failed ? 1 : 0),
      lastUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[apiUsage] trackGeminiUsage falhou:', err);
  }
}

export async function trackAnthropicUsage(opts: {
  inputTokens?: number;
  outputTokens?: number;
  failed?: boolean;
}): Promise<void> {
  try {
    const key = todayKey();
    const refDoc = doc(db, API_USAGE_COLLECTION, key);
    const total = (opts.inputTokens || 0) + (opts.outputTokens || 0);
    await setDoc(refDoc, {
      date: key,
      anthropicCalls: increment(1),
      anthropicInputTokens: increment(opts.inputTokens || 0),
      anthropicOutputTokens: increment(opts.outputTokens || 0),
      anthropicTotalTokens: increment(total),
      anthropicFailures: increment(opts.failed ? 1 : 0),
      lastUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[apiUsage] trackAnthropicUsage falhou:', err);
  }
}

export async function getUsageLastNDays(days: number = 30): Promise<UsageDoc[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const col = collection(db, API_USAGE_COLLECTION);
  const q = query(col, where('date', '>=', cutoffKey), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      date: data.date || d.id,
      geminiCalls: data.geminiCalls || 0,
      geminiPromptTokens: data.geminiPromptTokens || 0,
      geminiCandidatesTokens: data.geminiCandidatesTokens || 0,
      geminiTotalTokens: data.geminiTotalTokens || 0,
      geminiFailures: data.geminiFailures || 0,
      anthropicCalls: data.anthropicCalls || 0,
      anthropicInputTokens: data.anthropicInputTokens || 0,
      anthropicOutputTokens: data.anthropicOutputTokens || 0,
      anthropicTotalTokens: data.anthropicTotalTokens || 0,
      anthropicFailures: data.anthropicFailures || 0,
      lastUpdatedAt: data.lastUpdatedAt,
    };
  });
}
