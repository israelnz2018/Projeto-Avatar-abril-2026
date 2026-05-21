/**
 * eventLogger — log de eventos comportamentais (fire-and-forget).
 *
 * Coleção Firestore: `eventos/{auto-id}`
 *   {
 *     userId: string,
 *     type: 'tool_opened' | 'video_played' | 'ia_question' | 'analysis_run',
 *     payload: { ... },          // específico de cada tipo
 *     ts: serverTimestamp,
 *     userTipo?: string,         // snapshot pra agregação rápida do admin
 *     userPlano?: string,
 *   }
 *
 * Regras invioláveis:
 *   - NUNCA bloqueia a UI: tudo fire-and-forget (sem await na callsite).
 *   - NUNCA propaga erro: try/catch silencioso. Se Firestore estiver fora,
 *     o app continua funcionando 100% — só perdemos telemetria daquele evento.
 *   - NUNCA loga PII sensível: perguntas IA são truncadas em 500 chars,
 *     nada de senhas, tokens ou e-mails alheios.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const EVENTOS_COLLECTION = 'eventos';
const MAX_QUESTION_LEN = 500;

type EventType = 'tool_opened' | 'video_played' | 'ia_question' | 'analysis_run';

interface EventoPayload {
  toolId?: string;
  toolName?: string;
  projectId?: string;
  videoId?: string;
  videoTitle?: string;
  course?: string;
  question?: string;        // trunca em MAX_QUESTION_LEN
  location?: string;        // ex: 'chat-ai', 'mentor', 'fill-tool'
  analysisType?: string;
  [key: string]: any;
}

/**
 * Função base. Não chamada diretamente pelos componentes — use as funções
 * específicas abaixo (`logToolOpened`, `logVideoPlayed`, ...).
 */
function logEvent(type: EventType, payload: EventoPayload): void {
  // Fire-and-forget. NÃO retorna Promise — callsite não pode (nem deve) esperar.
  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return; // Sem usuário logado = sem log. Não é erro.

      await addDoc(collection(db, EVENTOS_COLLECTION), {
        userId: user.uid,
        userEmail: user.email || null,
        type,
        payload: sanitizePayload(payload),
        ts: serverTimestamp(),
      });
    } catch (err) {
      // Falha silenciosa. Pode ser regra do Firestore, offline, quota, etc.
      // App NUNCA deve quebrar por causa de telemetria.
      if (import.meta.env.DEV) {
        console.warn('[eventLogger] falha ao logar evento (ignorada):', err);
      }
    }
  })();
}

function sanitizePayload(payload: EventoPayload): EventoPayload {
  const clean: EventoPayload = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') {
      // Trunca strings longas (perguntas IA podem ser enormes)
      clean[k] = k === 'question' ? v.slice(0, MAX_QUESTION_LEN) : v;
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// ---------- API pública ----------

/** Disparado quando uma ferramenta de projeto é montada/aberta. */
export function logToolOpened(toolId: string, projectId?: string, toolName?: string): void {
  if (!toolId) return;
  logEvent('tool_opened', { toolId, projectId, toolName });
}

/** Disparado quando o usuário clica em um vídeo (qualquer aba que renderiza vídeo). */
export function logVideoPlayed(videoId: string, videoTitle?: string, course?: string): void {
  if (!videoId) return;
  logEvent('video_played', { videoId, videoTitle, course });
}

/**
 * Disparado quando uma chamada de IA é feita.
 * `messages` deve ser o array do aiRouter — pega o último user message como "question".
 */
export function logIaQuestion(
  location: string,
  messages?: Array<{ role: string; content: string }>,
): void {
  let question = '';
  if (Array.isArray(messages)) {
    // Último user message é a pergunta efetiva
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user' && typeof messages[i].content === 'string') {
        question = messages[i].content;
        break;
      }
    }
  }
  logEvent('ia_question', { location, question });
}

/** Disparado quando uma análise estatística é executada. */
export function logAnalysisRun(analysisType: string, projectId?: string): void {
  if (!analysisType) return;
  logEvent('analysis_run', { analysisType, projectId });
}
