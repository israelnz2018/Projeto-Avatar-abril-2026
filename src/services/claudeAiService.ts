import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const GEMINI_MODEL = "gemini-3-flash-preview";

async function callAI(systemPrompt: string, userPrompt: string, responseMimeType?: string): Promise<string> {
  console.log('🤖 Chamando Claude API...');
  console.log('ANTHROPIC_API_KEY existe:', !!import.meta.env.VITE_ANTHROPIC_API_KEY);
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: responseMimeType || "text/plain",
      },
    });

    return response.text || "";
  } catch (error: any) {
    console.error("AI API error:", error);
    throw new Error(`AI API error: ${error.message || "Unknown error"}`);
  }
}

const MENTOR_SYSTEM_PROMPT = `
Você é o Mentor LBW — um consultor sênior Master Black Belt em Lean Six Sigma 
com 20 anos de experiência em projetos de melhoria de processos.
Seja direto e técnico. Use sempre os dados do projeto do usuário.
Quando sugerir uma próxima ação, seja específico.
Use linguagem de consultoria executiva — profissional mas acessível.
Responda em português do Brasil.
`;

export const generateAIToolReport = async (
  toolName: string,
  toolData: any,
  projectName: string
): Promise<string> => {
  try {
    const systemPrompt = `
Você é um consultor sênior Master Black Belt em Lean Six Sigma especializado 
em geração de relatórios executivos profissionais.
Analise os dados de uma ferramenta de qualidade e gere um RELATÓRIO EXECUTIVO 
em Markdown com design de consultoria de alto nível.
REGRAS:
1. Use APENAS os dados fornecidos.
2. Melhore a redação para padrão executivo.
3. Seja conciso — cabe em uma página A4.
4. Use tabelas, negrito, títulos hierárquicos.
5. Termine com "Próximos Passos Recomendados" com 2 a 3 ações concretas.
6. Responda APENAS com o relatório, sem explicações.
7. Idioma: Português do Brasil.
    `;

    const toolSpecificInstructions: Record<string, string> = {
      "Brainstorming": "Gere EXCLUSIVAMENTE uma tabela Markdown: | Nº | Categoria | Ideia | Prioridade |. Adicione top 3 ideias mais impactantes.",
      "Espinha de Peixe": "Estruture pelos 6Ms. Destaque as 3 causas mais críticas. Inclua tabela de priorização.",
      "Plano de Ação 5W2H": "Gere tabela completa: | O Quê | Por Quê | Onde | Quando | Quem | Como | Quanto |. Adicione status Verde/Amarelo/Vermelho.",
      "Project Charter": "Formate como documento executivo. Inclua: Problema, Meta SMART, Escopo, Equipe, Cronograma, Benefícios.",
      "SIPOC": "Gere tabela SIPOC completa. Adicione análise dos pontos críticos do fluxo.",
      "FMEA": "Gere tabela FMEA ordenada por RPN decrescente. Destaque RPN acima de 100. Inclua ações prioritárias.",
    };

    const specificInstruction = toolSpecificInstructions[toolName] || 
      `Estruture o relatório executivo para "${toolName}". Use tabelas quando dados forem tabulares. Inclua análise qualitativa e implicações para o projeto.`;

    const userPrompt = `
PROJETO: ${projectName}
FERRAMENTA: ${toolName}
DADOS: ${JSON.stringify(toolData, null, 2)}
INSTRUÇÃO ESPECÍFICA: ${specificInstruction}
Gere o relatório executivo agora.
    `;

    return await callAI(systemPrompt, userPrompt);
  } catch (error: any) {
    console.error("Erro ao gerar relatório com IA:", error);
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
  try {
    const projectContext = previousToolData && Object.keys(previousToolData).length > 0
      ? `DADOS DA(S) FERRAMENTA(S) ANTERIOR(ES):
${JSON.stringify(previousToolData, null, 2)}`
      : allProjectData
      ? `CONTEXTO COMPLETO DO PROJETO "${projectInfo?.name}":
${Object.entries(allProjectData)
  .filter(([, value]) => value && typeof value === "object")
  .map(([key, value]) => `### ${key}:\n${JSON.stringify(value, null, 2)}`)
  .join("\n")}`
      : "";

    const systemPrompt = `
Você é um consultor sênior Master Black Belt em Lean Six Sigma.
Use os dados já preenchidos nas ferramentas anteriores para pré-preencher 
a próxima ferramenta de forma inteligente e consistente.
REGRAS CRÍTICAS:
1. Use APENAS informações do contexto fornecido — nunca invente dados.
2. Mantenha consistência absoluta com fases anteriores.
3. Retorne EXCLUSIVAMENTE um objeto JSON válido sem explicações e sem markdown.
4. Se um campo não puder ser inferido, use string vazia "".
5. Qualidade de consultoria sênior.
    `;

    const toolStructures: Record<string, string> = {
      improvementPlan: `{"phases":[{"id":"define","name":"Definir","isOpen":true,"weight":20,"activities":[{"id":"uuid","text":"Atividade específica da fase Definir","status":"Not Started","plannedStart":"DD/MM/AAAA extraída do Cronograma Macro","plannedFinish":"DD/MM/AAAA extraída do Cronograma Macro","weight":5,"owner":"Nome do líder extraído do Charter","notes":""}]},{"id":"measure","name":"Medir","isOpen":false,"weight":20,"activities":[]},{"id":"analyze","name":"Analisar","isOpen":false,"weight":20,"activities":[]},{"id":"improve","name":"Melhorar","isOpen":false,"weight":20,"activities":[]},{"id":"control","name":"Controlar","isOpen":false,"weight":20,"activities":[]}]}`,
      brief: `{"answers":{"q1":"Nome do processo","q2":"Problema com dados quantitativos","q3":"Pessoas envolvidas","q4":"O que está errado","q5":"Riscos","q6":"O que melhorar","q7":"Meta SMART","q8":"Benefícios esperados","q10":"Próximos passos","q12":"Recursos necessários"}}`,
      charter: `{"title":"Título sem Lean Six Sigma","date":"DD/MM/AAAA","rev":"00","area":"Área responsável","leader":"Líder do Projeto","champion":"Patrocinador","problemDefinition":"Problema com baseline","problemHistory":"Histórico com dados","goalDefinition":"Meta SMART completa","kpi":"KPIs primários e secundários","scope":"Escopo e o que está fora","businessContributions":"Ganhos esperados","stakeholders":[{"role":"Líder:","name":"","definition":"R","measurement":"A","analysis":"R","improvement":"R","control":"R"}]}`,
      sipoc: `{"suppliers":["Fornecedor 1"],"inputs":["Entrada 1"],"process":["Passo 1","Passo 2","Passo 3","Passo 4","Passo 5"],"outputs":["Saída principal"],"customers":["Cliente"]}`,
      gut: `{"columns":[{"id":"description","label":"Problema / Oportunidade","isScore":false},{"id":"gravidade","label":"Gravidade","isScore":true},{"id":"urgencia","label":"Urgência","isScore":true},{"id":"tendencia","label":"Tendência","isScore":true}],"opportunities":[{"id":"1","description":"Título do projeto","gravidade":5,"urgencia":3,"tendencia":5}]}`,
      rab: `{"columns":[{"id":"description","label":"Problema / Oportunidade","isScore":false},{"id":"rapidez","label":"Rapidez","isScore":true},{"id":"autonomia","label":"Autonomia","isScore":true},{"id":"beneficio","label":"Benefício","isScore":true}],"opportunities":[{"id":"1","description":"Título do projeto","rapidez":5,"autonomia":3,"beneficio":5}]}`,
      brainstorming: `{"ideas":[{"id":"1","text":"x1: Ideia técnica curta","category":"Método","author":"IA LBW","votes":0}],"brainstormingType":"Causas do problema","brainstormingTopic":"Tema do problema"}`,
      measureIshikawa: `{"categories":["Método","Máquina","Medida","Meio Ambiente","Mão de Obra","Material"],"causes":{"Método":["x1: Causa curta"],"Máquina":[],"Medida":[],"Meio Ambiente":[],"Mão de Obra":[],"Material":[]},"problem":"Problema central"}`,
      measureMatrix: `{"outputs":[{"name":"Y principal","importance":10}],"causes":[{"id":"X01","name":"Causa","scores":[9],"effort":1,"selected":false}]}`,
      dataCollection: `{"items":[{"id":"uuid","data":{"variable":"ID - Nome da variável","priority":"Alta","operationalDefinition":"O QUE MEDIR: procedimento técnico","msa":"Sim","method":"Quantitativa","stratification":"Por turno/operador","responsible":"Responsável","when":"Frequência","howMany":"Quantidade"}}]}`,
      fiveWhys: `{"chains":[{"id":"1","problem":"Problema central","whys":["Por que 1","Por que 2","Por que 3","Por que 4","Por que 5"],"rootCause":"Causa raiz identificada"}]}`,
      fmea: `{"items":[{"id":"1","processStep":"Etapa","failureMode":"Como falha","failureEffect":"Impacto","severity":7,"causes":"Causas","occurrence":5,"controls":"Controles atuais","detection":4,"actions":"Ações recomendadas"}]}`,
      plan5w2h: `{"actions":[{"id":"uuid","variable":"Causa origem","what":"Ação específica","why":"Por que resolve","where":"Onde executar","when":"DD/MM/AAAA","who":"Responsável","how":"Como executar","howMuch":"Custo estimado","status":{"state":"green","progress":"0%"}}]}`,
      sop: `{"title":"Título do POP","objective":"Objetivo","scope":"Abrangência","responsibilities":"Responsáveis","steps":[{"id":"1","title":"Título do passo","description":"Descrição detalhada","warning":""}],"frequency":"Frequência de revisão","kpis":"Indicadores associados"}`,
      effortImpact: `{"actions":[{"id":"1","label":"X1","description":"Ação do brainstorming","effort":3,"impact":5}]}`,
      directObservation: `{"observations":[{"id":"1","variable":"Variável qualitativa","operationalDefinition":"Definição operacional","identifiedCause":false,"observationDescription":"","images":[],"aiSuggestions":{"trueHypothesis":"Situação que CONFIRMA a causa raiz","falseHypothesis":"Situação onde nenhum desvio foi encontrado"}}]}`,
      dataNature: `{"analyses":[{"id":"uuid","variableY":{"name":"Nome Y","type":"Contínuo","description":"Por que é Y"},"variableX":{"name":"Nome X","type":"Discreto","description":"Por que é X"},"quadrant":"Y Contínuo / X Discreto","recommendedTools":["Box Plot","ANOVA"],"explanation":"Explicação técnica"}]}`,
    };

    const specificInstructions: Record<string, string> = {
      brief: `
ATENÇÃO — ENTENDENDO O PROBLEMA:
Você recebeu dados de três fontes de projetos:
1. generatedProjects — projetos gerados na Ideia de Projetos de Melhoria
2. gutOpportunities — projetos priorizados na Matriz GUT
3. rabOpportunities — projetos priorizados na Matriz RAB

O usuário selecionou o projeto: "${previousToolData?.selectedProject || previousToolData?.title || ''}"

USE ESTE PROJETO SELECIONADO como foco central de toda a análise.

INSTRUÇÕES:
1. Use o título do projeto selecionado para preencher q1 e q6
2. Baseie q2 no problema implícito no título do projeto
3. Use os dados da GUT (gravidade, urgência, tendência) para enriquecer q5
4. Use os dados da RAB (rapidez, autonomia, benefício) para enriquecer q8
5. Todos os campos devem ser consistentes com o projeto selecionado
6. Use linguagem técnica e executiva
7. Meta em q7 deve ser SMART — com indicador, baseline estimado e target
`,
      improvementPlan: `
ATENÇÃO — PLANO DO PROJETO DE MELHORIA:
- Use as datas de início e fim de cada fase do Cronograma Macro (timeline)
- Use o nome do líder do Project Charter como owner padrão
- Use o título do projeto do Charter para contextualizar as atividades
- Gere 3 a 5 atividades específicas e técnicas por fase DMAIC
- As datas devem ser extraídas do Cronograma Macro — não invente datas
- Se não houver Cronograma Macro preenchido, use datas em branco
- Atividades devem ser ações concretas e executáveis por fase
`,
      brainstorming: "Use EXCLUSIVAMENTE dados do Brief, SIPOC e Mapeamento. Prefixe cada ideia com x1:, x2:, etc. Mínimo 12 ideias nos 6Ms.",
      measureIshikawa: "Mapeie TODOS os itens do Brainstorming para os 6Ms. Mantenha prefixos x1:, x2:. Frases máximo 6 palavras.",
      measureMatrix: "Use causas da Espinha de Peixe como X's. KPIs do Charter como Y's. Scores: 0, 1, 3 ou 9.",
      dataCollection: "Use APENAS causas com selected:true da Matriz. Quantitativa=números. Qualitativa=visual/Sim/Não.",
      directObservation: "Use APENAS variáveis QUALITATIVAS do Plano de Coleta. observationDescription sempre vazio.",
      dataNature: "Y Contínuo+X Contínuo→Regressão. Y Contínuo+X Discreto→ANOVA. Y Discreto+X Contínuo→Regressão Logística. Y Discreto+X Discreto→Qui-quadrado.",
      gut: "Use títulos da Ideia de Projeto como oportunidades. Pontuações APENAS 1, 3 ou 5.",
      rab: "Use títulos da Ideia de Projeto como oportunidades. Pontuações APENAS 1, 3 ou 5.",
      charter: "Meta SMART obrigatória. NÃO inclua Lean Six Sigma no título. Use dados quantitativos do Brief.",
      fmea: "Baseie modos de falha nas causas da Espinha de Peixe. RPN = Severity × Occurrence × Detection.",
      plan5w2h: "Baseie ações nas causas confirmadas. Cada ação: verbo + objeto + resultado. Datas realistas.",
    };

    const structure = toolStructures[toolId] || `{}`;
    const specificInstruction = specificInstructions[toolId] || "";

    const userPrompt = `
Projeto: "${projectInfo?.name || "Projeto de Melhoria"}"
${projectInfo?.description ? `Descrição: ${projectInfo.description}` : ""}

${projectContext}

FERRAMENTA A PREENCHER: "${toolName}" (ID: ${toolId})
${specificInstruction ? `\nINSTRUÇÕES ESPECÍFICAS:\n${specificInstruction}` : ""}

ESTRUTURA JSON ESPERADA:
${structure}

Retorne EXCLUSIVAMENTE o JSON preenchido, sem explicações, sem markdown, sem \`\`\`.
    `;

    const result = await callAI(systemPrompt, userPrompt, "application/json");
    const cleanedResult = result
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleanedResult);
  } catch (error: any) {
    console.error("Erro ao gerar dados com IA:", error);
    if (error instanceof SyntaxError) {
      throw new Error("A IA retornou formato inválido. Tente novamente.");
    }
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
    const phaseContext: Record<string, string> = {
      "PreDefinir": "O usuário está na fase Pré-Definir, identificando e priorizando oportunidades de melhoria.",
      "Define": "O usuário está na fase Definir, estruturando o escopo, problema e objetivos do projeto.",
      "Measure": "O usuário está na fase Medir, mapeando o processo e coletando dados da situação atual.",
      "Analyze": "O usuário está na fase Analisar, identificando causas raiz do problema com dados.",
      "Improve": "O usuário está na fase Melhorar, desenvolvendo e implementando soluções.",
      "Control": "O usuário está na fase Controlar, sustentando os ganhos e padronizando melhorias.",
    };

    const systemPrompt = `
${MENTOR_SYSTEM_PROMPT}

CONTEXTO ATUAL DO PROJETO:
${phaseContext[currentPhase] || ""}
Ferramenta ativa: ${currentTool}

DADOS DO PROJETO:
${JSON.stringify(projectData, null, 2)}

Use estes dados para personalizar cada resposta.
Nunca dê respostas genéricas — sempre conecte ao projeto específico do usuário.
    `;

    const messages = history.map(h => ({
      role: h.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: h.content }]
    }));

    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: systemPrompt,
      },
      history: messages,
    });

    const response = await chat.sendMessage({ message });
    return response.text || "";
  } catch (error: any) {
    console.error("Erro no chat do Mentor LBW:", error);
    throw new Error("O Mentor LBW está temporariamente indisponível. Tente novamente.");
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

    const result = await callAI(systemPrompt, userPrompt, "application/json");
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
