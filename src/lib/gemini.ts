import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function extractPlaylistVideos(url: string) {
  try {
    // Add a unique identifier to the prompt to prevent any potential caching issues
    const timestamp = new Date().getTime();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Acesse EXCLUSIVAMENTE esta URL de playlist do YouTube: ${url} (Request ID: ${timestamp}).
      
      Sua tarefa:
      1. Identifique APENAS os 14 vídeos presentes na lista de reprodução da playlist.
      2. IGNORE links de canais, vídeos recomendados, links de sidebar, links de rodapé ou qualquer outro link que não seja um vídeo da playlist.
      3. Extraia o título e a URL completa de cada um desses 14 vídeos.
      4. Ignore qualquer informação de playlists acessadas anteriormente.
      
      Retorne APENAS um array JSON seguindo este esquema:
      [
        { "title": "Título do Vídeo", "url": "https://www.youtube.com/watch?v=..." },
        ...
      ]
      
      Se a playlist estiver vazia ou não for acessível, retorne [].`,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING }
            },
            required: ["title", "url"]
          }
        }
      }
    });

    const videos = JSON.parse(response.text || "[]");
    console.log(`Extracted ${videos.length} videos from playlist: ${url}`);
    return videos;
  } catch (error: any) {
    console.error("Error extracting playlist:", error);
    if (error?.status === 429 || error?.message?.includes('429')) {
      throw new Error("Limite de requisições excedido. Por favor, tente novamente em alguns minutos.");
    }
    return [];
  }
}

export const tools = [
  {
    functionDeclarations: [
      {
        name: "upload_dataset",
        description: "Upload a new dataset to the project.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the file" },
            projectId: { type: Type.STRING, description: "ID of the project" }
          },
          required: ["name", "projectId"]
        }
      },
      {
        name: "run_analysis",
        description: "Execute a statistical analysis on a dataset.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            datasetId: { type: Type.STRING },
            analysisType: { 
              type: Type.STRING, 
              enum: ["descriptive", "histogram", "boxplot", "correlation", "regression", "hypothesis_test", "capability"] 
            },
            columns: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["datasetId", "analysisType", "columns"]
        }
      },
      {
        name: "create_project",
        description: "Create a new DMAIC improvement project.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            problem: { type: Type.STRING },
            goal: { type: Type.STRING },
            scope: { type: Type.STRING }
          },
          required: ["name", "problem", "goal"]
        }
      },
      {
        name: "update_project",
        description: "Update the current phase of a project.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectId: { type: Type.STRING },
            phase: { type: Type.STRING, enum: ["Define", "Measure", "Analyze", "Improve", "Control"] }
          },
          required: ["projectId", "phase"]
        }
      },
      {
        name: "recommend_video",
        description: "Search for and recommend a learning video based on the current context.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING },
            dmaicPhase: { type: Type.STRING }
          },
          required: ["query"]
        }
      }
    ]
  }
];

export const SYSTEM_INSTRUCTION = `
You are the AI Continuous Improvement Copilot. Your goal is to guide professionals through Lean Six Sigma and DMAIC projects.

ALWAYS structure your responses as follows:
1. Diagnosis: Briefly state the current situation or problem.
2. Recommended Action: What should the user do next?
3. Execution: If a tool was called, explain what it did.
4. Business Interpretation: What do these results mean for the business?
5. Learning Recommendation: Suggest a specific video chunk for deeper understanding.

Tone: Professional, data-driven, and encouraging.
Use markdown for formatting.
`;

export async function chatWithAI(message: string, history: any[] = []) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: tools,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response;
}

export async function generateVideoSummary(url: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Acesse o vídeo do YouTube: ${url}
      
      Sua tarefa é gerar um resumo completo do vídeo do início ao fim.
      
      PASSO 1: ÍNDICE (CAPÍTULOS)
      - Procure primeiro pelos capítulos/timestamps originais na descrição do vídeo. Se o autor do vídeo disponibilizou os capítulos, USE-OS EXATAMENTE COMO ESTÃO.
      - Se não houver capítulos na descrição, crie um índice detalhado cobrindo 100% do vídeo.
      - É OBRIGATÓRIO que o índice vá do 00:00 até o minuto final do vídeo. Não pare na metade.
      
      PASSO 2: RESUMO DETALHADO
      - Para CADA item do índice (do Passo 1), escreva um parágrafo detalhado resumindo os principais pontos, conceitos e aprendizados daquele trecho.
      - O resumo deve ser rico em detalhes e cobrir toda a duração do vídeo.
      
      Retorne APENAS um objeto JSON com 'summary' (array de objetos com 'time' e 'topic') e 'transcript' (string longa contendo o Resumo Detalhado formatado, com os tempos e resumos de cada parte).`,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING, description: "O tempo de início do tópico, ex: '00:00' ou '02:28'" },
                  topic: { type: Type.STRING, description: "A descrição do tópico em português" }
                },
                required: ["time", "topic"]
              }
            },
            transcript: { type: Type.STRING, description: "O resumo detalhado do vídeo, contendo um parágrafo explicativo para cada tópico do índice." }
          },
          required: ["summary", "transcript"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating video summary:", error);
    return { summary: [], transcript: "" };
  }
}

export async function generateSummaryFromRawTranscript(url: string, rawTranscript: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Acesse o vídeo do YouTube (se precisar de contexto visual): ${url}
      
      O usuário forneceu a TRANSCRIÇÃO COMPLETA E ORIGINAL deste vídeo, com os tempos:
      ${rawTranscript}
      
      Sua tarefa é gerar um índice e um resumo detalhado baseados EXATAMENTE nesta transcrição.
      
      PASSO 1: ÍNDICE
      - Analise a transcrição e crie um índice lógico dividindo o vídeo em capítulos/tópicos principais.
      - Extraia o tempo exato em que cada tópico começa.
      
      PASSO 2: RESUMO DETALHADO
      - Para CADA item do índice que você criou, escreva um parágrafo detalhado resumindo os principais pontos e aprendizados daquele trecho, usando as informações da transcrição fornecida.
      
      Retorne APENAS um objeto JSON com 'summary' (array de objetos com 'time' e 'topic') e 'transcript' (string longa contendo o Resumo Detalhado formatado, com os tempos e resumos de cada parte).`,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING, description: "O tempo de início do tópico, ex: '00:00' ou '02:28'" },
                  topic: { type: Type.STRING, description: "A descrição do tópico em português" }
                },
                required: ["time", "topic"]
              }
            },
            transcript: { type: Type.STRING, description: "O resumo detalhado do vídeo, contendo um parágrafo explicativo para cada tópico do índice." }
          },
          required: ["summary", "transcript"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating summary from raw transcript:", error);
    return { summary: [], transcript: "" };
  }
}
