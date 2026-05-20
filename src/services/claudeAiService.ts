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
