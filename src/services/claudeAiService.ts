
const RAILWAY_URL = "https://analises-production.up.railway.app";

async function callClaude(systemPrompt: string, userPrompt: string, max_tokens: number = 4096): Promise<string> {
  const response = await fetch(`${RAILWAY_URL}/claude/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toolName: "internal",
      toolData: { system: systemPrompt, user: userPrompt },
      projectName: "internal"
    }),
  });
  if (!response.ok) throw new Error(`Railway error: ${response.statusText}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.report;
}

const MENTOR_SYSTEM_PROMPT = `
Você é o Mentor LBW — um consultor sênior Master Black Belt em Lean Six Sigma 
com 20 anos de experiência em projetos de melhoria de processos.
Seja direto e técnico. Use sempre os dados do projeto do usuário.
Quando sugerir uma próxima ação, seja específico.
Use linguagem de consultoria executiva — profissional mas acessível.
Responda em português do Brasil.
`;

export const sanitizeToolData = (toolId: string, data: any): any => {
  if (!data) return {};

  // Garante arrays onde arrays são esperados
  const arrayFields: Record<string, string[]> = {
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

export const generateAIToolReport = async (
  toolName: string,
  toolData: any,
  projectName: string
): Promise<string> => {
  try {
    const response = await fetch(`${RAILWAY_URL}/claude/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, toolData, projectName }),
    });
    if (!response.ok) throw new Error(`Railway error: ${response.statusText}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.report;
  } catch (error: any) {
    console.error("Erro ao gerar relatório:", error);
    throw new Error("Erro ao gerar relatório. Tente novamente.");
  }
};

export const generateToolData = async (
  toolId: string,
  toolName: string,
  previousToolName: string | null,
  previousToolData: any,
  projectInfo?: { name: string; description?: string },
  allProjectData?: any
): Promise<any> => {
  console.log('🚀 generateToolData chamado - toolId:', toolId);
  console.log('🚀 Chamando Railway:', RAILWAY_URL + '/claude/tool-data');
  try {
    const response = await fetch(`${RAILWAY_URL}/claude/tool-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId,
        toolName,
        previousToolName,
        previousToolData,
        projectInfo,
        allProjectData,
      }),
    });
    console.log('🚀 Railway status:', response.status);
    if (!response.ok) throw new Error(`Railway error: ${response.statusText}`);
    const result = await response.json();
    console.log('🚀 Railway resposta:', JSON.stringify(result).substring(0, 200));
    if (!result.success) throw new Error(result.error);
    return sanitizeToolData(toolId, result.data);
  } catch (error: any) {
    console.error("Erro ao gerar dados com Claude:", error);
    throw new Error("Erro ao gerar dados. Tente novamente.");
  }
};

export const chatWithMentor = async (
  message: string,
  currentPhase: string,
  currentTool: string,
  projectData: any,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> => {
  try {
    const response = await fetch(`${RAILWAY_URL}/claude/mentor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        currentPhase,
        currentTool,
        projectData,
        history,
      }),
    });
    if (!response.ok) throw new Error(`Railway error: ${response.statusText}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.message;
  } catch (error: any) {
    console.error("Erro no Mentor LBW:", error);
    throw new Error("O Mentor LBW está temporariamente indisponível.");
  }
};

export const getMentorSuggestions = async (
  currentPhase: string,
  currentTool: string,
  completedTools: string[],
  projectData: any
): Promise<string[]> => {
  try {
    const systemPrompt = `
Você é o Mentor LBW. Gere exatamente 3 sugestões de perguntas curtas e relevantes
que um profissional faria neste momento do projeto DMAIC.
As sugestões devem ser:
- Específicas para a fase e ferramenta atual
- Baseadas nos dados já preenchidos no projeto
- Máximo 8 palavras cada
Retorne EXCLUSIVAMENTE um array JSON com 3 strings. Sem explicações.
Exemplo: ["Como escrever uma meta SMART?", "Qual o próximo passo?", "Como calcular o impacto?"]
    `;

    const userPrompt = `
Fase atual: ${currentPhase}
Ferramenta atual: ${currentTool}
Ferramentas concluídas: ${completedTools.join(", ")}
Contexto: ${JSON.stringify(projectData, null, 2)}
Gere as 3 sugestões agora.
    `;

    const result = await callClaude(systemPrompt, userPrompt);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const fallbacks: Record<string, string[]> = {
      "PreDefinir": ["Como priorizar os projetos?", "O que é a Matriz GUT?", "Como validar uma ideia?"],
      "Define": ["Como escrever uma meta SMART?", "O que colocar no escopo?", "Como calcular o impacto?"],
      "Measure": ["Como mapear o processo?", "Quais dados coletar?", "O que é MSA?"],
      "Analyze": ["Como identificar a causa raiz?", "Quando usar o 5 Porquês?", "Como usar o Ishikawa?"],
      "Improve": ["Como priorizar as soluções?", "O que é um piloto?", "Como fazer o FMEA?"],
      "Control": ["Como sustentar os ganhos?", "O que é um POP?", "Como monitorar o KPI?"],
    };
    return fallbacks[currentPhase] || ["Qual o próximo passo?", "Como posso melhorar?", "O que é importante aqui?"];
  }
};
