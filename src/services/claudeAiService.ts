
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt
    }
  });
  return response.text;
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

  // Limpa o campo 'area' de stakeholders conforme solicitado pelo usuário
  if (toolId === 'stakeholders' || toolId === 'stakeholderAdkar') {
    if (Array.isArray(data.stakeholders)) {
      data.stakeholders = data.stakeholders.map((s: any) => ({
        ...s,
        area: '' // Sempre deixa a área em branco por padrão
      }));
    }
  }

  // Limpa o campo 'area' do projeto no Charter conforme solicitado
  if (toolId === 'charter' || toolId === 'projectCharterPMI') {
    data.area = '';
    data.department = ''; // Algumas versões usam department
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

export const generateAIToolReport = async (
  toolName: string,
  toolData: any,
  projectName: string
): Promise<string> => {
  try {
    const systemPrompt = `
Você é o Mentor LBW. Sua tarefa é gerar um relatório técnico e executivo sobre a ferramenta "${toolName}" do projeto "${projectName}".
Use os dados fornecidos para criar uma análise profunda, identificando riscos, oportunidades e próximos passos.
Use formatação Markdown elegante.
`;

    const userPrompt = `
Projeto: ${projectName}
Ferramenta: ${toolName}
Dados: ${JSON.stringify(toolData)}

Gere o relatório agora. Responda em Português do Brasil.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ]
    });

    return response.text;
  } catch (error: any) {
    console.error("Erro detalhado ao gerar relatório com Gemini:", error);
    throw new Error(error.message || "Erro ao gerar relatório. Tente novamente.");
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
  console.log('🚀 generateToolData chamado via Gemini - toolId:', toolId);
  try {
    const systemPrompt = `
Você é o Mentor LBW, um consultor sênior Master Black Belt especializado em Lean Six Sigma e Gestão de Projetos.
Sua tarefa é gerar dados estruturados para a ferramenta "${toolName}" (ID: ${toolId}) de um projeto DMAIC.

${projectInfo ? `Projeto: ${projectInfo.name}\nDescrição: ${projectInfo.description || 'Não informada'}` : ''}

${previousToolName ? `Contexto anterior (${previousToolName}): ${JSON.stringify(previousToolData)}` : ''}

Diretrizes:
1. Gere dados realistas, técnicos e úteis para um projeto de melhoria real.
2. Siga rigorosamente a estrutura esperada para este toolId.
3. Se houver dados de outras ferramentas (allProjectData), use-os para garantir consistência.
4. Responda APENAS com o objeto JSON puro, sem explicações ou blocos de código markdown.
`;

    const userPrompt = `
Gere os dados para a ferramenta ${toolName}.
Dados de todas as ferramentas disponíveis: ${JSON.stringify(allProjectData || {})}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text;
    const resultData = JSON.parse(resultText);
    
    return sanitizeToolData(toolId, resultData);
  } catch (error: any) {
    console.error("Erro detalhado ao gerar dados com Gemini:", error);
    throw new Error(error.message || "Erro ao gerar dados. Tente novamente.");
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
    const systemPrompt = `
${MENTOR_SYSTEM_PROMPT}

Contexto do Projeto Atual:
Fase: ${currentPhase}
Ferramenta: ${currentTool}
Dados do Projeto: ${JSON.stringify(projectData)}

Instruções:
1. Use os dados acima para dar respostas personalizadas.
2. Seja mentor, desafie o usuário a pensar criticamente.
3. Se o usuário perguntar algo fora de contexto Lean Six Sigma, tente trazer de volta para a metodologia.
`;

    // Map history to Gemini format
    const contents = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    return response.text;
  } catch (error: any) {
    console.error("Erro detalhado no Mentor LBW com Gemini:", error);
    throw new Error(error.message || "O Mentor LBW está temporariamente indisponível.");
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

    const result = await callGemini(systemPrompt, userPrompt);
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
