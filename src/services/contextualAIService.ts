import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { getAllKnowledge, KnowledgeEntry } from './knowledgeService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ============================================================
// Tipos
// ============================================================

export interface MentorContext {
  type: 'tool' | 'analysis' | 'aiAssistant' | 'free';
  id?: string;
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            answer: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            usedVideoIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["found", "answer", "confidence", "usedVideoIds"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      found: parsed.found ?? false,
      answer: parsed.answer ?? '',
      confidence: parsed.confidence ?? 0,
      usedVideoIds: parsed.usedVideoIds ?? []
    };
  } catch (error) {
    console.error('[contextualAI] Erro Gemini com contexto:', error);
    return { found: false, answer: '', confidence: 0, usedVideoIds: [] };
  }
}

/**
 * Chama o Gemini SEM contexto (Nível 3 - resposta geral).
 */
async function callGeminiWithoutContext(
  question: string,
  conversationHistory?: { question: string; answer: string }[]
): Promise<string> {
  const historyText = conversationHistory && conversationHistory.length > 0
    ? `\n\nHISTÓRICO DESTA CONVERSA:\n${conversationHistory.slice(-3).map(h => `Pergunta: ${h.question}\nResposta: ${h.answer}`).join('\n\n')}\n`
    : '';

  const prompt = `Você é o Mentor LBW, consultor sênior em Lean Six Sigma e Melhoria Contínua.

⚠️ IMPORTANTE: O assunto desta pergunta NÃO foi encontrado nas aulas do Israel.
Você vai responder com conhecimento geral, mas seja transparente sobre isso.

${historyText}

Responda à pergunta do aluno em português, tom amigável, 2-3 parágrafos.
Use seu conhecimento sólido de Lean Six Sigma. Comece a resposta com algo como:
"Não encontrei esse assunto específico nas aulas do Israel, mas posso te dar uma visão geral..."

PERGUNTA: ${question}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text || 'Desculpe, não consegui gerar uma resposta neste momento.';
  } catch (error) {
    console.error('[contextualAI] Erro Gemini sem contexto:', error);
    return 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em instantes.';
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

  // ----- NÍVEL 3: sem contexto -----
  const answer = await callGeminiWithoutContext(question, context.conversationHistory);
  return {
    answer,
    level: 3,
    confidence: 0,
    videoSources: [],
    found: false
  };
}
