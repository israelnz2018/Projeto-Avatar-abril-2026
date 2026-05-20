/**
 * Mantido só por compatibilidade — geração de índice/resumo da transcrição.
 * Internamente usa Anthropic via aiRouter (location: 'kb-idx').
 *
 * Funções legadas removidas em 2026-05-17:
 *   - extractPlaylistVideos (importação de playlist desativada)
 *   - chatWithAI (código morto)
 *   - generateVideoSummary (código morto)
 */

import { callAIJSON } from "../services/aiRouter";

export async function generateSummaryFromRawTranscript(url: string, rawTranscript: string) {
  try {
    const parsed = await callAIJSON<{ summary?: any[]; transcript?: string }>({
      location: "kb-idx",
      system:
        "Você gera índices clicáveis e resumos detalhados a partir de transcrições de vídeos do YouTube. Sempre responde com JSON puro.",
      messages: [
        {
          role: "user",
          content: `Vídeo: ${url}\n\nTRANSCRIÇÃO COMPLETA (com tempos):\n${rawTranscript}\n\nSua tarefa:\n\nPASSO 1 — ÍNDICE: divida o vídeo em capítulos/tópicos principais. Extraia o tempo exato em que cada tópico começa (formato MM:SS).\n\nPASSO 2 — RESUMO DETALHADO: para CADA item do índice, escreva um parágrafo detalhado dos principais aprendizados daquele trecho, usando apenas a transcrição fornecida.\n\nRetorne APENAS um objeto JSON neste formato exato:\n{\n  "summary": [{"time": "MM:SS", "topic": "descrição"}, ...],\n  "transcript": "texto longo do resumo detalhado, com tempos e parágrafos"\n}`,
        },
      ],
      maxTokens: 8192,
    });
    return {
      summary: Array.isArray(parsed.summary) ? parsed.summary : [],
      transcript: parsed.transcript || "",
    };
  } catch (error: any) {
    console.error("[generateSummaryFromRawTranscript] erro:", error);
    if (error?.message?.includes("Anthropic API key não configurada")) {
      throw error;
    }
    throw new Error(
      error.message ||
        "Erro ao gerar índice. Verifique a configuração da Anthropic em /api-settings."
    );
  }
}
