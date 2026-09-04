/**
 * claudeAiService — geração de dados para preencher campos das ferramentas.
 * Migrado para Anthropic via aiRouter em 2026-05-17.
 *
 * Funções legadas removidas: chatWithMentor, getMentorSuggestions,
 * generateAIToolReport (todas eram código morto na UI).
 */

import { callAIJSON } from './aiRouter';

// ─────────────────────────────────────────────────────────────────────────────
// Enxugar o payload ANTES de virar prompt.
//
// Foto anexada, imagem de gráfico, XML de diagrama e dataset gigante não ajudam a
// IA a preencher campo nenhum — e estouram o limite da API. Uma única foto no
// Entendendo o Problema levou o prompt a 264.065 tokens (o teto é 200.000), e ela
// ainda ia duas vezes: no contexto da ferramenta e dentro de allProjectData.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE_STRING = 1500;      // caracteres por campo de texto
const LIMITE_ITENS = 200;        // itens por lista
const LIMITE_PAYLOAD = 120000;   // caracteres no JSON final (~30k tokens)

/** Texto longo que só tem alfabeto base64 é imagem/binário, não conteúdo. */
const pareceBinario = (s: string) =>
  s.length > 500 && /^[A-Za-z0-9+/=\s]+$/.test(s);

const enxugarValor = (valor: any, profundidade = 0): any => {
  if (valor === null || valor === undefined) return valor;
  if (profundidade > 10) return '[...]';

  if (typeof valor === 'string') {
    if (valor.startsWith('data:') || pareceBinario(valor)) return '[imagem removida]';
    if (valor.trimStart().startsWith('<?xml')) return '[diagrama removido]';
    return valor.length > LIMITE_STRING
      ? `${valor.slice(0, LIMITE_STRING)}…[truncado]`
      : valor;
  }

  if (Array.isArray(valor)) {
    const cortada = valor.slice(0, LIMITE_ITENS).map((v) => enxugarValor(v, profundidade + 1));
    if (valor.length > LIMITE_ITENS) cortada.push(`…[+${valor.length - LIMITE_ITENS} itens]`);
    return cortada;
  }

  if (typeof valor === 'object') {
    const saida: Record<string, any> = {};
    for (const [chave, v] of Object.entries(valor)) saida[chave] = enxugarValor(v, profundidade + 1);
    return saida;
  }

  return valor;
};

/** Serializa já enxuto, com teto final de tamanho. Nunca lança. */
export const enxugarParaPrompt = (dados: any): string => {
  let json: string;
  try {
    json = JSON.stringify(enxugarValor(dados) ?? {}) ?? '{}';
  } catch {
    return '{}';
  }
  return json.length > LIMITE_PAYLOAD ? `${json.slice(0, LIMITE_PAYLOAD)}…[truncado]` : json;
};

export const sanitizeToolData = (toolId: string, data: any): any => {
  if (!data) return {};

  const arrayFields: Record<string, string[]> = {
    stakeholderAdkar: ['stakeholders'],
    measureAdkar: ['stakeholders'],
    sipoc: ['suppliers', 'inputs', 'process', 'outputs', 'customers'],
    brainstorming: ['ideas'],
    measureIshikawa: [],
    gut: ['opportunities'],
    rab: ['opportunities'],
    fiveWhys: ['chains'],
    fmea: ['items'],
    plan5w2h: ['actions'],
    stakeholders: ['stakeholders'],
    dataCollection: ['items'],
    effortImpact: ['actions'],
    measureMatrix: ['outputs', 'causes'],
    directObservation: ['observations'],
    dataNature: ['analyses'],
    sop: ['revisions', 'definitions', 'responsibilities', 'processSteps', 'flowchart', 'controlPoints', 'risks', 'records'],
    charter: ['team', 'stakeholders', 'milestones'],
    projectCharterPMI: ['team', 'stakeholders', 'milestones'],
  };

  const fields = arrayFields[toolId] || [];

  fields.forEach(field => {
    if (!Array.isArray(data[field])) {
      data[field] = data[field] ? [data[field]] : [];
    }
  });

  if (toolId === 'stakeholders' || toolId === 'stakeholderAdkar') {
    if (Array.isArray(data.stakeholders)) {
      data.stakeholders = data.stakeholders.map((s: any) => ({
        ...s,
        area: ''
      }));
    }
  }

  if (toolId === 'charter' || toolId === 'projectCharterPMI') {
    data.area = '';
    data.department = '';
  }

  return data;
};

export const generateToolData = async (
  toolId: string,
  toolName: string,
  previousToolName: string | null,
  previousToolData: any,
  projectInfo?: { name: string; description?: string },
  allProjectData?: any
): Promise<any> => {
  const systemPrompt = `Você é o Mentor LBW, um consultor sênior Master Black Belt especializado em Lean Six Sigma e Gestão de Projetos.
Sua tarefa é gerar dados estruturados para a ferramenta "${toolName}" (ID: ${toolId}) de um projeto DMAIC.

${projectInfo ? `Projeto: ${projectInfo.name}\nDescrição: ${projectInfo.description || 'Não informada'}` : ''}

${previousToolName ? `Contexto anterior (${previousToolName}): ${enxugarParaPrompt(previousToolData)}` : ''}

Diretrizes:
1. Gere dados realistas, técnicos e úteis para um projeto de melhoria real.
2. Siga rigorosamente a estrutura esperada para este toolId.
3. Se houver dados de outras ferramentas (allProjectData), use-os para garantir consistência.
4. Responda APENAS com o objeto JSON puro, sem explicações ou blocos de código markdown.`;

  const userPrompt = `Gere os dados para a ferramenta ${toolName}.
Dados de todas as ferramentas disponíveis: ${enxugarParaPrompt(allProjectData || {})}`;

  try {
    const result = await callAIJSON({
      location: 'fill-tool',
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
    });
    return sanitizeToolData(toolId, result);
  } catch (error: any) {
    console.error('[generateToolData] erro:', error);
    throw new Error(error.message || 'Erro ao gerar dados com IA. Tente novamente.');
  }
};

/**
 * generateBriefData — versão ENXUTA e dedicada do "Entendendo o Problema".
 *
 * Por que existe separada do generateToolData genérico (jun/2026): o genérico
 * injetava JSON.stringify(allProjectData) inteiro no prompt — todos os dados de
 * todas as ferramentas — o que deixava a chamada lenta (mais de 1 min). Aqui
 * mandamos SÓ o projeto escolhido + nome do projeto, e pedimos uma saída curta
 * (maxTokens baixo). Resultado: bem mais rápido, sem perder qualidade pro Brief.
 *
 * Retorna { answers: { q1..q12 } } no formato que o ProjectBrief consome.
 */
export const generateBriefData = async (
  selectedProject: { title?: string; problem?: string; y_indicator?: string; financial_impact?: string; justification?: string },
  projectInfo?: { name?: string; description?: string }
): Promise<{ answers: Record<string, string> }> => {
  const systemPrompt = `Você é um consultor sênior de melhoria contínua. Estruture o problema de um projeto preenchendo um formulário curto e objetivo.
Responda em português do Brasil, tom prático e direto. Sem jargão técnico.
Responda APENAS com um objeto JSON puro (sem markdown, sem explicação) com a chave "answers".`;

  const userPrompt = `Projeto selecionado:
- Título: ${selectedProject.title || ''}
- Problema: ${selectedProject.problem || ''}
- Indicador (Y): ${selectedProject.y_indicator || ''}
- Impacto financeiro: ${selectedProject.financial_impact || ''}
- Justificativa: ${selectedProject.justification || ''}
${projectInfo?.name ? `\nContexto do projeto: ${projectInfo.name}${projectInfo.description ? ' — ' + projectInfo.description : ''}` : ''}

Preencha cada campo abaixo em 1-2 frases curtas, coerentes com o projeto acima:
{
  "answers": {
    "q6": "Título do projeto (curto)",
    "q1": "Nome do processo que será melhorado",
    "q2": "Principal problema hoje (1-2 frases)",
    "q3": "Principais envolvidos (áreas ou fornecedores)",
    "q4": "O que está dando errado na prática (atraso, retrabalho, erro...)",
    "q5": "Algum risco? (financeiro, cliente, compliance...)",
    "q7": "Existe meta clara? (tempo, qualidade, custo, volume...)",
    "q8": "O que melhora se der certo (menos custo, mais rapidez...)",
    "q10": "Próximos passos já em mente",
    "q12": "Que tipo de ajuda é necessária"
  }
}`;

  const result = await callAIJSON<{ answers?: Record<string, string> }>({
    location: 'fill-tool',
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 1200,
  });

  return { answers: result.answers || (result as any) };
};

/**
 * generateBrainstormingCausas — gera causas potenciais a partir das ETAPAS do
 * Mapa de Processo. Ex: etapa "Fazer inspeção" → "Inspeção inadequada",
 * "Inspeção insuficiente", "Critério de inspeção não definido"...
 *
 * Enxuta de propósito (jun/2026): manda pra IA SÓ as etapas do mapa (não o
 * projeto inteiro), então é rápida. NÃO classifica nos 6M — as causas entram
 * como ideias soltas; a categoria fica pro aluno definir depois.
 *
 * Retorna { ideas: [{ text }] }.
 */
export const generateBrainstormingCausas = async (
  etapas: string[],
  topico?: string
): Promise<{ ideas: Array<{ text: string }> }> => {
  const systemPrompt = `Você é um facilitador de melhoria contínua conduzindo um brainstorming de CAUSAS POTENCIAIS.
A partir das etapas de um processo, levante o que pode dar errado em cada etapa (causas/falhas potenciais), de forma concreta.
Responda em português do Brasil, objetivo. Responda APENAS com um objeto JSON puro (sem markdown), com a chave "ideas".`;

  const userPrompt = `${topico ? `Foco do brainstorming: ${topico}\n\n` : ''}Etapas do Mapa de Processo:
${etapas.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Para CADA etapa, gere 2 a 4 causas potenciais concretas (o que pode dar errado naquela etapa).
Exemplo: etapa "Fazer inspeção" → "Inspeção inadequada", "Inspeção insuficiente", "Critério de inspeção não padronizado".

Formato:
{
  "ideas": [
    { "text": "Inspeção inadequada" }
  ]
}`;

  const result = await callAIJSON<{ ideas?: Array<{ text?: string }> }>({
    location: 'fill-tool',
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 2000,
  });

  return {
    ideas: (result.ideas || [])
      .map((i) => ({ text: (i.text || '').trim() }))
      .filter((i) => i.text),
  };
};

/**
 * distribuirCausasNos6M — recebe causas (textos) do Brainstorming e distribui
 * cada uma na categoria 6M correta da Espinha de Peixe.
 *
 * Enxuta (jun/2026): manda pra IA só os textos das causas + os nomes EXATOS das
 * categorias que o componente usa (pra não trocar "Medida"/"Medição" etc.).
 *
 * Retorna { causes: Record<categoria, string[]> } — pronto pra mesclar no estado.
 */
export const distribuirCausasNos6M = async (
  causas: string[],
  categorias: string[]
): Promise<{ causes: Record<string, string[]> }> => {
  const systemPrompt = `Você é um especialista em qualidade montando um Diagrama de Ishikawa (Espinha de Peixe, 6M).
Sua tarefa: pegar uma lista de causas e colocar CADA uma na categoria correta.
Use EXATAMENTE estes nomes de categoria (não invente, não traduza, não mude a grafia): ${categorias.join(', ')}.
Responda em português do Brasil. Responda APENAS com um objeto JSON puro (sem markdown), com a chave "causes".`;

  const userPrompt = `Causas a classificar:
${causas.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Distribua TODAS as causas entre as categorias. Cada causa entra em UMA categoria só, na que melhor se encaixa.
As chaves do objeto "causes" devem ser EXATAMENTE: ${categorias.join(', ')}.

Formato:
{
  "causes": {
${categorias.map(c => `    "${c}": []`).join(',\n')}
  }
}`;

  const result = await callAIJSON<{ causes?: Record<string, string[]> }>({
    location: 'fill-tool',
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 2000,
  });

  // Normaliza: garante todas as categorias presentes e arrays de strings limpas.
  const out: Record<string, string[]> = {};
  categorias.forEach(cat => {
    const arr = result.causes?.[cat];
    out[cat] = Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : [];
  });
  return { causes: out };
};
