import { callAI, callAIJSON } from './aiRouter';
import { getAllKnowledge, KnowledgeEntry } from './knowledgeService';

// ============================================================
// Tipos
// ============================================================

export interface MentorContext {
  type: 'tool' | 'analysis' | 'aiAssistant' | 'free';
  id?: string;
  /** Rótulo humano da ferramenta/análise ativa, usado pra dar foco ao mentor IA no nível 3 */
  label?: string;
  // Histórico de conversas anteriores neste projeto (opcional)
  conversationHistory?: { question: string; answer: string }[];
}

export interface VideoSource {
  id: string;
  title: string;
  sourceUrl: string;
}

export interface MentorResponse {
  answer: string;
  level: 1 | 2 | 3;
  confidence: number;
  videoSources: VideoSource[];
  found: boolean;
}

// ============================================================
// Funções de busca
// ============================================================

/**
 * Busca vídeos associados a uma ferramenta específica.
 * Retorna vídeos COM rawTranscript ou transcript preenchido.
 */
function searchByTool(items: KnowledgeEntry[], toolId: string): KnowledgeEntry[] {
  return items.filter(item =>
    item.associatedTools?.includes(toolId) &&
    (item.rawTranscript?.trim() || item.transcript?.trim())
  );
}

/**
 * Busca vídeos associados a uma análise específica.
 */
function searchByAnalysis(items: KnowledgeEntry[], analysisId: string): KnowledgeEntry[] {
  return items.filter(item =>
    item.associatedAnalyses?.includes(analysisId) &&
    (item.rawTranscript?.trim() || item.transcript?.trim())
  );
}

/**
 * Retorna TODOS os vídeos com transcript (qualquer um).
 */
function getAllVideosWithTranscript(items: KnowledgeEntry[]): KnowledgeEntry[] {
  return items.filter(item =>
    item.rawTranscript?.trim() || item.transcript?.trim()
  );
}

/**
 * Pega o melhor conteúdo disponível: prioriza rawTranscript (palavras reais)
 * sobre transcript (resumo do Gemini).
 */
function getVideoContent(video: KnowledgeEntry): string {
  return video.rawTranscript?.trim() || video.transcript?.trim() || '';
}

// ============================================================
// Chamada principal ao Gemini
// ============================================================

async function callGeminiWithContext(
  question: string,
  videos: KnowledgeEntry[],
  conversationHistory?: { question: string; answer: string }[]
): Promise<{ found: boolean; answer: string; confidence: number; usedVideoIds: string[] }> {
  // Monta o contexto dos vídeos
  const videoContextParts = videos.map((v, idx) => {
    const content = getVideoContent(v);
    // Limita cada vídeo a 8000 chars pra não estourar tokens
    const truncated = content.length > 8000 ? content.substring(0, 8000) + '...' : content;
    return `===== VÍDEO ${idx + 1} (id: ${v.id}, título: "${v.title}") =====\n${truncated}`;
  }).join('\n\n');

  // Monta histórico de conversas anteriores (se houver)
  const historyText = conversationHistory && conversationHistory.length > 0
    ? `\n\nHISTÓRICO DESTA CONVERSA (para contexto):\n${conversationHistory.slice(-3).map(h => `Pergunta anterior: ${h.question}\nResposta anterior: ${h.answer}`).join('\n\n')}\n`
    : '';

  const prompt = `Você é o Mentor LBW, consultor sênior em Lean Six Sigma. Você está conversando com um aluno do Israel.

CONTEXTO - Transcripts das aulas do Israel:
${videoContextParts}
${historyText}

REGRAS CRÍTICAS:
1. Responda à pergunta do aluno usando APENAS o conteúdo dos vídeos acima.
2. Use as palavras e o estilo do Israel sempre que possível.
3. Se os vídeos NÃO tiverem informação suficiente para responder, declare found=false.
4. Avalie sua confiança de 0.0 a 1.0:
   - 1.0 = vídeos respondem completamente
   - 0.7 = vídeos respondem parcialmente
   - 0.4 = vídeos tocam no assunto mas não respondem
   - 0.0 = vídeos não têm nada relacionado
5. Liste os IDs dos vídeos que você usou na resposta (usedVideoIds).
6. Resposta em português, tom amigável, 2-4 parágrafos.
7. NÃO invente informação que não está nos vídeos.

PERGUNTA DO ALUNO: ${question}

Retorne APENAS JSON válido no formato:
{
  "found": true|false,
  "answer": "sua resposta aqui",
  "confidence": 0.0-1.0,
  "usedVideoIds": ["id1", "id2"]
}`;

  try {
    const parsed = await callAIJSON<{
      found?: boolean;
      answer?: string;
      confidence?: number;
      usedVideoIds?: string[];
    }>({
      location: 'mentor',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2048,
    });
    return {
      found: parsed.found ?? false,
      answer: parsed.answer ?? '',
      confidence: parsed.confidence ?? 0,
      usedVideoIds: parsed.usedVideoIds ?? []
    };
  } catch (error: any) {
    if (error?.name === 'CreditExhaustedError') throw error; // deixa subir p/ a UI
    console.error('[contextualAI] Erro mentor com contexto:', error);
    return { found: false, answer: '', confidence: 0, usedVideoIds: [] };
  }
}

// Nível 3: pergunta NÃO encontrada nas aulas. A IA responde mesmo assim,
// usando conhecimento geral de Lean Six Sigma / Melhoria Contínua, e SINALIZA
// claramente que está respondendo sem citar aulas específicas.
async function answerWithoutVideoContext(
  question: string,
  contextLabel?: string,
  conversationHistory?: { question: string; answer: string }[]
): Promise<string> {
  const historyText = conversationHistory && conversationHistory.length > 0
    ? `\n\nHISTÓRICO DESTA CONVERSA:\n${conversationHistory.slice(-3).map(h => `Aluno: ${h.question}\nMentor: ${h.answer}`).join('\n\n')}`
    : '';

  const focus = contextLabel
    ? `O aluno está com a ferramenta "${contextLabel}" selecionada na tela. Considere esse contexto na resposta.`
    : 'Não há ferramenta específica selecionada.';

  const system = `Você é o Mentor LBW, consultor sênior em Lean Six Sigma e Melhoria Contínua, conversando com um aluno do Israel.
Esta pergunta não está coberta pelas aulas atuais do Israel — responda com seu conhecimento geral de DMAIC, Lean, Six Sigma e PMI.
Comece a resposta com uma frase curta sinalizando que o conteúdo vem do seu conhecimento geral (algo como "Esse assunto ainda não tem aula no curso, mas posso te explicar:").
Tom: amigável, técnico, em português do Brasil. 2 a 4 parágrafos.`;

  try {
    const { text } = await callAI({
      location: 'mentor',
      system,
      messages: [{ role: 'user', content: `${focus}\n${historyText}\n\nPERGUNTA: ${question}` }],
      maxTokens: 1024,
    });
    return text || 'Não consegui gerar uma resposta agora. Tente novamente em alguns instantes.';
  } catch (err: any) {
    if (err?.name === 'CreditExhaustedError') throw err; // deixa subir p/ a UI
    console.error('[contextualAI] erro no nível 3:', err);
    return 'Não consegui acessar o mentor IA neste momento. Tente novamente em instantes ou use a aba **AI Assistant** no menu lateral.';
  }
}

// ============================================================
// Orquestrador principal — fluxo de 3 níveis
// ============================================================

export async function askMentor(
  question: string,
  context: MentorContext
): Promise<MentorResponse> {
  if (!question.trim()) {
    return {
      answer: 'Por favor, digite sua pergunta.',
      level: 3,
      confidence: 0,
      videoSources: [],
      found: false
    };
  }

  // Carrega todos os vídeos uma vez
  const allItems = await getAllKnowledge();
  const CONFIDENCE_THRESHOLD = 0.6;

  // ----- NÍVEL 1: vídeos associados ao contexto específico -----
  if (context.type !== 'free' && context.id) {
    let level1Videos: KnowledgeEntry[] = [];

    if (context.type === 'tool') {
      level1Videos = searchByTool(allItems, context.id);
    } else if (context.type === 'analysis') {
      level1Videos = searchByAnalysis(allItems, context.id);
    }
    // aiAssistant é tratado separadamente porque os vídeos ficam no nó da árvore
    // (esse caso entrará via context.type='free' com vídeos pré-fornecidos no futuro)

    if (level1Videos.length > 0) {
      const result = await callGeminiWithContext(question, level1Videos, context.conversationHistory);
      if (result.found && result.confidence >= CONFIDENCE_THRESHOLD) {
        const usedVideos = level1Videos
          .filter(v => result.usedVideoIds.includes(v.id!))
          .map(v => ({ id: v.id!, title: v.title, sourceUrl: v.sourceUrl }));

        return {
          answer: result.answer,
          level: 1,
          confidence: result.confidence,
          videoSources: usedVideos,
          found: true
        };
      }
    }
  }

  // ----- NÍVEL 2: TODOS os vídeos -----
  const allVideosWithTranscript = getAllVideosWithTranscript(allItems);
  if (allVideosWithTranscript.length > 0) {
    // Limita a 15 vídeos pra não estourar contexto
    const videosToSearch = allVideosWithTranscript.slice(0, 15);
    const result = await callGeminiWithContext(question, videosToSearch, context.conversationHistory);
    if (result.found && result.confidence >= CONFIDENCE_THRESHOLD) {
      const usedVideos = videosToSearch
        .filter(v => result.usedVideoIds.includes(v.id!))
        .map(v => ({ id: v.id!, title: v.title, sourceUrl: v.sourceUrl }));

      return {
        answer: result.answer,
        level: 2,
        confidence: result.confidence,
        videoSources: usedVideos,
        found: true
      };
    }
  }

  // ----- NÍVEL 3: sem vídeo relevante — IA responde com conhecimento geral -----
  const answer = await answerWithoutVideoContext(question, context.label, context.conversationHistory);
  return {
    answer,
    level: 3,
    confidence: 0,
    videoSources: [],
    found: false
  };
}
