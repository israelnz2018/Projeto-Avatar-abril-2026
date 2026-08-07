/**
 * Geração de índice/resumo da transcrição de vídeos da plataforma.
 *
 * Provider: **Gemini 2.5 Flash** (escolhido por custo-benefício).
 * - Input ~$0,075/M tokens · Output ~$0,30/M tokens
 * - ~10× mais barato que Claude Haiku
 * - Suporta `responseMimeType: application/json` (saída estruturada)
 *
 * Para mudar de provider, ajustar aqui (callGeminiJSON ↔ callAIJSON).
 */

import { callGeminiJSON } from "./geminiClient";

export async function generateSummaryFromRawTranscript(url: string, rawTranscript: string) {
  try {
    const parsed = await callGeminiJSON<{ summary?: any[]; transcript?: string }>({
      system:
        "Você gera índices clicáveis e resumos detalhados a partir de transcrições de vídeos de uma plataforma de cursos. Sempre responde com JSON puro.",
      userPrompt: `Vídeo: ${url}\n\nTRANSCRIÇÃO COMPLETA (com tempos):\n${rawTranscript}\n\nSua tarefa:\n\nPASSO 1 — ÍNDICE: divida o vídeo em capítulos/tópicos principais. Extraia o tempo exato em que cada tópico começa (formato MM:SS).\n\nPASSO 2 — RESUMO DETALHADO: para CADA item do índice, escreva um parágrafo detalhado dos principais aprendizados daquele trecho, usando apenas a transcrição fornecida.\n\nRetorne APENAS um objeto JSON neste formato exato:\n{\n  "summary": [{"time": "MM:SS", "topic": "descrição"}, ...],\n  "transcript": "texto longo do resumo detalhado, com tempos e parágrafos"\n}`,
      maxTokens: 8192,
      temperature: 0.4,
    });
    return {
      summary: Array.isArray(parsed.summary) ? parsed.summary : [],
      transcript: parsed.transcript || "",
    };
  } catch (error: any) {
    console.error("[generateSummaryFromRawTranscript] erro:", error);
    if (error?.message?.includes("Gemini API key não configurada")) {
      throw new Error("Serviço de IA não configurado. Fale com o administrador da plataforma.");
    }
    throw new Error("Erro ao gerar índice. Tente novamente em instantes.");
  }
}
