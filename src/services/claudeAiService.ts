/**
 * claudeAiService — geração de dados para preencher campos das ferramentas.
 * Migrado para Anthropic via aiRouter em 2026-05-17.
 *
 * Funções legadas removidas: chatWithMentor, getMentorSuggestions,
 * generateAIToolReport (todas eram código morto na UI).
 */

import { callAIJSON } from './aiRouter';

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

${previousToolName ? `Contexto anterior (${previousToolName}): ${JSON.stringify(previousToolData)}` : ''}

Diretrizes:
1. Gere dados realistas, técnicos e úteis para um projeto de melhoria real.
2. Siga rigorosamente a estrutura esperada para este toolId.
3. Se houver dados de outras ferramentas (allProjectData), use-os para garantir consistência.
4. Responda APENAS com o objeto JSON puro, sem explicações ou blocos de código markdown.`;

  const userPrompt = `Gere os dados para a ferramenta ${toolName}.
Dados de todas as ferramentas disponíveis: ${JSON.stringify(allProjectData || {})}`;

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
