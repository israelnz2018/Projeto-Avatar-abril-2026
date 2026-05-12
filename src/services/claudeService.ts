/**
 * claudeService.ts
 *
 * Servico que chama a Claude API via backend Railway (/claude/generate).
 * Usado APENAS pelas ferramentas listadas em AI_PROMPTS (aiPrompts.ts).
 * Para todas as outras ferramentas, o sistema continua usando Gemini via aiService.ts.
 *
 * Este arquivo NAO substitui o aiService.ts/claudeAiService.ts (que usam Gemini).
 * Os dois convivem: a escolha de qual usar e feita no ToolWrapper.tsx.
 */
 
import { buildPrompt, AI_PROMPTS } from './aiPrompts';
 
const API_URL = process.env.RAILWAY_API_URL || 'https://analises-production.up.railway.app';
 
/**
 * Sanitiza os dados retornados pela IA, garantindo arrays e estruturas esperadas.
 * Replicado de claudeAiService.ts para manter consistencia entre Claude e Gemini.
 */
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
    improvementIdea: ['projects'],
  };
 
  const fields = arrayFields[toolId] || [];
  fields.forEach(field => {
    if (!Array.isArray(data[field])) {
      data[field] = data[field] ? [data[field]] : [];
    }
  });
 
  // Limpa o campo area de stakeholders
  if (toolId === 'stakeholders' || toolId === 'stakeholderAdkar') {
    if (Array.isArray(data.stakeholders)) {
      data.stakeholders = data.stakeholders.map((s: any) => ({
        ...s,
        area: ''
      }));
    }
  }
 
  // Limpa o campo area do projeto no Charter
  if (toolId === 'charter' || toolId === 'projectCharterPMI') {
    data.area = '';
    data.department = '';
  }
 
  // Garante estrutura do SOP
  if (toolId === 'sop') {
    if (!data.header) {
      data.header = {
        title: '', code: '', version: '1.0', issueDate: '', revisionDate: '', author: '', approver: '', department: ''
      };
    }
  }
 
  // Garante estrutura do Charter
  if (toolId === 'charter' || toolId === 'projectCharterPMI') {
    if (!data.scope) data.scope = { in: '', out: '' };
    if (!data.impacts) data.impacts = { quality: '', financial: '', customer: '' };
  }
 
  // Garante estrutura da Espinha de Peixe
  if (toolId === 'measureIshikawa') {
    if (!data.categories) data.categories = ['Método', 'Máquina', 'Medida', 'Meio Ambiente', 'Mão de Obra', 'Material'];
    if (!data.causes) data.causes = {};
    data.categories.forEach((cat: string) => {
      if (!Array.isArray(data.causes[cat])) {
        data.causes[cat] = [];
      }
    });
    if (!data.problem) data.problem = '';
  }
 
  // Garante estrutura do Brainstorming
  if (toolId === 'brainstorming') {
    data.ideas = (data.ideas || []).map((idea: any, idx: number) => ({
      id: idea.id || String(idx + 1),
      text: idea.text || idea.description || '',
      category: idea.category || 'Método',
      author: idea.author || 'IA LBW',
      votes: idea.votes || 0,
    }));
  }
 
  // Garante estrutura do 5 Porquês
  if (toolId === 'fiveWhys') {
    data.chains = (data.chains || []).map((chain: any) => ({
      ...chain,
      whys: Array.isArray(chain.whys) ? chain.whys : [],
    }));
  }
 
  // Garante estrutura da Matriz GUT e RAB
  if (toolId === 'gut' || toolId === 'rab') {
    data.opportunities = (data.opportunities || []).map((opp: any, idx: number) => ({
      id: opp.id || String(idx + 1),
      description: opp.description || opp.title || '',
      ...opp,
    }));
  }
 
  return data;
};
 
/**
 * Gera dados de uma ferramenta usando a Claude API via backend Railway.
 * 
 * @param toolId - ID da ferramenta (precisa estar em AI_PROMPTS)
 * @param contextData - Dados do contexto (geralmente allProjectData ou previousToolData)
 * @param projectName - Nome do projeto
 * @returns Dados gerados e ja sanitizados
 * @throws Error se a ferramenta nao estiver configurada em AI_PROMPTS ou se a API falhar
 */
export const generateWithClaude = async (
  toolId: string,
  contextData: any,
  projectName: string = 'Projeto de Melhoria'
): Promise<any> => {
  console.log('🚀 generateWithClaude chamado - toolId:', toolId);
 
  if (!AI_PROMPTS[toolId]) {
    throw new Error(`Ferramenta "${toolId}" nao tem prompt configurado em aiPrompts.ts. Adicione o prompt ou use o Gemini (aiService.ts).`);
  }
 
  try {
    const { system, user } = buildPrompt(toolId, contextData, projectName);
 
    const response = await fetch(`${API_URL}/claude/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system,
        user,
        max_tokens: 4096
      }),
    });
 
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }
 
    console.log('📡 Status Railway:', response.status, response.statusText);
    const result = await response.json();
    console.log('📡 Resposta Railway:', JSON.stringify(result).substring(0, 500));
 
    if (!result.success) {
      throw new Error(result.error || 'Erro desconhecido da API Claude');
    }
 
    // Sanitiza os dados antes de retornar
    return sanitizeToolData(toolId, result.data);
 
  } catch (error: any) {
    console.error('❌ Erro completo generateWithClaude:', JSON.stringify(error), error?.message, error?.stack);
    throw new Error(error.message || 'Erro ao gerar dados com Claude. Tente novamente.');
  }
};
 
/**
 * Helper: verifica se uma ferramenta deve usar Claude (esta em AI_PROMPTS)
 * ou se deve continuar usando Gemini (nao esta em AI_PROMPTS).
 */
export const shouldUseClaude = (toolId: string): boolean => {
  return !!AI_PROMPTS[toolId];
};
 
