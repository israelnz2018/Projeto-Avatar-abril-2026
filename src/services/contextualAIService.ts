import { callAI, callAIJSON } from './aiRouter';
import { getAllKnowledge, KnowledgeEntry } from './knowledgeService';
import { getCourses, getInitiativeConfigs } from './configService';
import { getMentorNome } from './consultorService';

// Toolid da ferramenta "Mapa dos 90 Dias" — caso especial: o mentor dela varre
// os vídeos de TODAS as ferramentas da Trilha 1 (a initiative com isFree=true).
const MAPA90_TOOL_ID = 'mapa90dias';

// Retorna os toolIds de todas as fases da Trilha 1 (initiative isFree). Dinâmico:
// se a associação de ferramentas da Trilha 1 mudar no Firestore, isto acompanha.
async function toolIdsDaTrilha1(): Promise<string[]> {
  try {
    const inits = await getCourses();
    const trilha1 = inits.find((i) => i.isFree === true);
    if (!trilha1?.id) return [];
    const configs = await getInitiativeConfigs(trilha1.id);
    const ids = new Set<string>();
    configs.forEach((c) => (c.toolIds || []).forEach((t) => ids.add(t)));
    return Array.from(ids);
  } catch {
    return [];
  }
}

// Vídeos associados a QUALQUER um dos toolIds dados (com transcript).
function searchByTools(items: KnowledgeEntry[], toolIds: string[]): KnowledgeEntry[] {
  const set = new Set(toolIds);
  return items.filter((item) =>
    (item.associatedTools || []).some((t) => set.has(t)) &&
    (item.rawTranscript?.trim() || item.transcript?.trim())
  );
}

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
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
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

// Palavras irrelevantes pra busca (não ajudam a achar o vídeo certo).
const STOPWORDS = new Set(['para','pela','pelo','como','qual','quais','sobre','uma','uns','umas','que','com','dos','das','por','mais','você','voce','meu','minha','isso','esse','essa','tem','são','ser','the','and','de','da','do','em','no','na','os','as','um','ao','se','ou','e','a','o']);

/** Extrai termos relevantes (>=3 letras, sem stopwords) de um texto. */
function termos(texto: string): string[] {
  return (texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .match(/[a-z0-9]{3,}/g) || [])
    .filter(t => !STOPWORDS.has(t));
}

/**
 * Ordena os vídeos por RELEVÂNCIA à pergunta (título pesa mais que transcript),
 * pra os mais pertinentes entrarem no contexto antes do corte de 15.
 * Sem isso, o corte era cego e vídeos relevantes ficavam de fora.
 */
function rankearPorRelevancia(videos: KnowledgeEntry[], pergunta: string): KnowledgeEntry[] {
  const termosPergunta = Array.from(new Set(termos(pergunta)));
  if (termosPergunta.length === 0) return videos;
  const scored = videos.map(v => {
    const titulo = (v.title || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const corpo = getVideoContent(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let score = 0;
    for (const t of termosPergunta) {
      if (titulo.includes(t)) score += 10;          // título vale muito
      if (corpo.includes(t)) score += 1;            // menção no transcript
    }
    return { v, score };
  });
  // relevantes primeiro; empate mantém a ordem original
  return scored.sort((a, b) => b.score - a.score).map(s => s.v);
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
  conversationHistory?: { question: string; answer: string }[],
  contextoForte = false // true no Nível 1 (ferramenta selecionada): vídeos são do tema
): Promise<{ found: boolean; answer: string; confidence: number; usedVideoIds: string[] }> {
  // Monta o contexto dos vídeos. Com poucos vídeos, dá mais espaço a cada um.
  const limitePorVideo = videos.length <= 4 ? 16000 : 8000;
  const videoContextParts = videos.map((v, idx) => {
    const content = getVideoContent(v);
    const truncated = content.length > limitePorVideo ? content.substring(0, limitePorVideo) + '...' : content;
    return `===== VÍDEO ${idx + 1} (id: ${v.id}, título: "${v.title}") =====\n${truncated}`;
  }).join('\n\n');

  // Monta histórico de conversas anteriores (se houver)
  const historyText = conversationHistory && conversationHistory.length > 0
    ? `\n\nHISTÓRICO DESTA CONVERSA (para contexto):\n${conversationHistory.slice(-3).map(h => `Pergunta anterior: ${h.question}\nResposta anterior: ${h.answer}`).join('\n\n')}\n`
    : '';

  const mentor = getMentorNome();
  const prompt = `Você é o Mentor LBW, consultor sênior em Lean Six Sigma. Você está conversando com um aluno do ${mentor}.

CONTEXTO - Transcripts das aulas do ${mentor}:
${videoContextParts}
${historyText}

REGRAS CRÍTICAS:
1. Baseie a resposta no que o ${mentor} ensina nos vídeos acima. ${contextoForte
    ? `Estes vídeos são JUSTAMENTE sobre o tema que o aluno perguntou (ele está com essa ferramenta aberta). Mesmo que a pergunta tenha um recorte específico (ex: uma área ou setor), aplique o método/conceito que o ${mentor} ensina ao caso do aluno. NÃO responda found=false só porque o vídeo não cita aquele setor pelo nome — o método é o mesmo. Só use found=false se os vídeos realmente não tiverem NADA a ver com a pergunta.`
    : 'Se os vídeos não tiverem relação com a pergunta, declare found=false.'}
2. COMECE a resposta citando o vídeo em que ela mais se baseia, exatamente neste formato:
   "De acordo com o vídeo '<título do vídeo>':" e então continue a resposta.
   Use o título EXATO de um dos vídeos acima (o mais relevante pra pergunta).
3. Fale como o ${mentor}: DIRETO, prático, sem enrolação. Vá direto ao ponto.
4. Seja CURTO: no máximo 2 parágrafos curtos. Nada de "dica de ouro", nada de listas
   decorativas com negrito em cada termo, nada de introdução longa. Responda e pare.
   Se der pra responder em 3 frases, responda em 3 frases.
5. Avalie sua confiança de 0.0 a 1.0 (1.0 = responde bem; 0.4 = toca no assunto; 0.0 = nada a ver).
6. Liste os IDs dos vídeos que você usou (usedVideoIds).
7. Português do Brasil. Não invente dado técnico que não está nos vídeos.

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

  const mentor = getMentorNome();
  const system = `Você é o Mentor LBW, no estilo do ${mentor}: consultor sênior em Lean Six Sigma e Melhoria Contínua, conversando com um aluno do ${mentor}.
Esta pergunta não está coberta pelas aulas atuais — responda com seu conhecimento geral de DMAIC, Lean, Six Sigma e PMI.
COMECE a resposta EXATAMENTE com esta frase, e então continue: "Como não encontramos um vídeo sobre esse assunto, segue a resposta da nossa IA:"
ESTILO OBRIGATÓRIO:
- DIRETO e prático, como o ${mentor} fala. Sem enrolação.
- CURTO: no máximo 2 parágrafos curtos. Se der pra responder em 3-4 frases, responda assim.
- NADA de "dica de ouro", nada de listas com negrito em cada termo, nada de encher linguiça.
- Responda a pergunta e pare. Português do Brasil.`;

  try {
    const { text } = await callAI({
      location: 'mentor',
      system,
      messages: [{ role: 'user', content: `${focus}\n${historyText}\n\nPERGUNTA: ${question}` }],
      maxTokens: 600,
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

    if (context.type === 'tool' && context.id === MAPA90_TOOL_ID) {
      // CASO ESPECIAL (só o Mapa dos 90 Dias): varre os vídeos de TODAS as
      // ferramentas da Trilha 1, não só os do próprio toolId (que não tem vídeos).
      const toolIds = await toolIdsDaTrilha1();
      level1Videos = searchByTools(allItems, toolIds);
    } else if (context.type === 'tool') {
      level1Videos = searchByTool(allItems, context.id);
    } else if (context.type === 'analysis') {
      level1Videos = searchByAnalysis(allItems, context.id);
    }
    // aiAssistant é tratado separadamente porque os vídeos ficam no nó da árvore
    // (esse caso entrará via context.type='free' com vídeos pré-fornecidos no futuro)

    if (level1Videos.length > 0) {
      // Se forem muitos vídeos (caso do Mapa dos 90 Dias: várias ferramentas),
      // rankeia por relevância e usa os 15 melhores pra não estourar o contexto.
      if (level1Videos.length > 15) {
        level1Videos = rankearPorRelevancia(level1Videos, question).slice(0, 15);
      }
      // Contexto forte: a ferramenta está selecionada, os vídeos SÃO do tema.
      const result = await callGeminiWithContext(question, level1Videos, context.conversationHistory, true);
      // Threshold mais baixo no Nível 1 — confiamos que o vídeo da ferramenta é pertinente.
      if (result.found && result.confidence >= 0.4) {
        const usedVideos = level1Videos
          .filter(v => result.usedVideoIds.includes(v.id!))
          .map(v => ({
            id: v.id!, title: v.title, sourceUrl: v.sourceUrl,
            bunnyVideoId: v.bunnyVideoId, bunnyLibraryId: v.bunnyLibraryId,
          }));

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
    // Rankeia por relevância à pergunta ANTES de cortar — assim os vídeos mais
    // pertinentes (ex: "indicadores de desempenho") entram no contexto, em vez de
    // um corte cego pelos 15 primeiros da lista.
    const ranqueados = rankearPorRelevancia(allVideosWithTranscript, question);
    const videosToSearch = ranqueados.slice(0, 18);
    const result = await callGeminiWithContext(question, videosToSearch, context.conversationHistory);
    if (result.found && result.confidence >= CONFIDENCE_THRESHOLD) {
      const usedVideos = videosToSearch
        .filter(v => result.usedVideoIds.includes(v.id!))
        .map(v => ({
          id: v.id!, title: v.title, sourceUrl: v.sourceUrl,
          bunnyVideoId: v.bunnyVideoId, bunnyLibraryId: v.bunnyLibraryId,
        }));

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
