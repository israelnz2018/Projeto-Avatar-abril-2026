import { GoogleGenAI } from "@google/genai";

export const generateAIToolReport = async (toolName: string, toolData: any, projectName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      Você é um consultor sênior especialista em Melhoria de Processos, Lean Six Sigma e Gestão de Projetos.
      Sua tarefa é analisar os dados técnicos da ferramenta "${toolName}" e gerar um RELATÓRIO EXECUTIVO ESPECÍFICO desta ferramenta.
      
      DADOS DA FERRAMENTA:
      ${JSON.stringify(toolData, null, 2)}
      
      INSTRUÇÕES CRÍTICAS:
      1. FOCO TOTAL: Gere um relatório APENAS sobre a ferramenta "${toolName}".
      2. ESTRUTURA VISUAL OBRIGATÓRIA:
         - Se for BRAINSTORMING: O resultado deve ser EXCLUSIVAMENTE uma TABELA Markdown profissional organizada por categoria (ex: | Categoria | Ideia | Autor |). NÃO adicione introduções, conclusões, listas de tópicos ou análises. Comece diretamente com a tabela. Melhore a redação das ideias para um padrão de consultoria.
         - Se for ISHIKAWA (Espinha de Peixe): Estruture o relatório focando nos 6Ms (Método, Máquina, Medida, Meio Ambiente, Mão de Obra, Material). Use títulos claros para cada "M" e liste as causas. IMPORTANTE: Use frases extremamente curtas e simples para cada causa, mantendo obrigatoriamente os prefixos "x1:", "x2:", etc., se presentes nos dados.
         - Se for PLANO DE AÇÃO: Use obrigatoriamente uma TABELA Markdown.
         - Se for PLANO DE PROJETO DE MELHORIA: Forneça uma análise técnica executiva focada na execução do projeto. Identifique riscos, gargalos e dê recomendações práticas para o gestor. Use uma linguagem profissional e técnica (Lean Six Sigma).
      3. TÍTULO: Use um título profissional como "# Levantamento de Brainstorming".
      4. QUALIDADE: Melhore a redação das ideias, tornando-as técnicas e executivas.
      5. IMPRESSÃO: O conteúdo deve ser formatado para caber em uma página A4, pronto para ser apresentado.
      
      IDIOMA: Português.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || '';
  } catch (error: any) {
    console.error("Erro ao gerar relatório com IA:", error);
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("A cota gratuita da IA foi excedida para este minuto. Por favor, aguarde 60 segundos e tente novamente. Se o erro persistir, verifique sua chave de API nas configurações.");
    }
    throw error;
  }
};

export const generateToolData = async (toolId: string, toolName: string, previousToolName: string | null, previousToolData: any, projectInfo?: { name: string, description?: string }) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let prompt = `
      Você é um consultor sênior especialista em Melhoria de Processos e Lean Six Sigma.
      Sua tarefa é preencher a ferramenta "${toolName}" para o projeto "${projectInfo?.name || 'Projeto de Melhoria'}".
      ${projectInfo?.description ? `Descrição do Projeto: ${projectInfo.description}` : ''}
      
      ${previousToolData ? `
      DADOS DA FERRAMENTA ANTERIOR ("${previousToolName}"):
      ${JSON.stringify(previousToolData, null, 2)}
      
      INSTRUÇÕES:
      1. Analise os dados da ferramenta anterior e use-os como base.
      2. Gere dados técnicos, realistas e específicos para a ferramenta "${toolName}".
      3. Mantenha a consistência com o que foi definido na fase anterior.
      ` : `
      INSTRUÇÕES:
      1. Gere dados técnicos, realistas e específicos para a ferramenta "${toolName}" baseando-se no contexto do projeto.
      2. Use seu conhecimento especializado para propor um preenchimento inicial de alta qualidade.
      `}
      
      4. Retorne EXCLUSIVAMENTE um objeto JSON que siga a estrutura de dados da ferramenta "${toolName}".
    `;

    // Add tool-specific structure hints
    if (toolId === 'brainstorming') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "ideas": [
            { "id": "1", "text": "Ideia 1", "category": "Mão de Obra", "author": "IA Specialist", "votes": 0 },
            ...
          ],
          "brainstormingType": "Problema pra resolver",
          "brainstormingTopic": "Tópico baseado nas fontes fornecidas"
        }
        Categorias permitidas: 'Mão de Obra', 'Método', 'Material', 'Máquina', 'Meio Ambiente', 'Medição'.
        
        INSTRUÇÕES CRÍTICAS PARA BRAINSTORMING:
        1. FONTES EXCLUSIVAS: Você deve basear as ideias EXCLUSIVAMENTE nas informações contidas nos dados das seguintes ferramentas:
           - "Entendendo o Problema" (brief)
           - "SIPOC" (sipoc)
           - "Mapeamento de Processo" (processMap)
        2. RESTRIÇÃO ABSOLUTA: NÃO utilize conhecimentos externos, informações de internet ou de seu banco de dados geral. Se a informação não estiver nas fontes acima, foque no que está disponível nelas.
        3. FOCO: Gere ideias técnicas e realistas para resolver o problema descrito no "brief" e que façam sentido dentro do fluxo mapeado no "SIPOC" e "Mapa do Processo".
        4. RASTREABILIDADE: Utilize prefixos como "x1:", "x2:", "x3:" no início do texto de cada ideia.
      `;
    } else if (toolId === 'measureIshikawa') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "categories": ["Método", "Máquina", "Medida", "Meio Ambiente", "Mão de Obra", "Material"],
          "causes": {
            "Método": ["x1: Frase curta", "x2: Frase curta"],
            "Máquina": [],
            ...
          },
          "problem": "O problema central identificado na ferramenta anterior"
        }

        INSTRUÇÕES ESPECÍFICAS PARA ISHIKAWA:
        1. Se houver dados de BRAINSTORMING, você deve mapear TODOS os itens da lista de ideias para as categorias correspondentes (6Ms):
           - Método
           - Máquina
           - Medida
           - Meio Ambiente
           - Mão de Obra
           - Material
        2. Para cada item, você deve manter obrigatoriamente o prefixo original (ex: "x1:", "x2:", "x3:") se ele existir no texto da ideia.
        3. RESUMO CRÍTICO: Reduza o texto de cada ideia para uma frase extremamente simples e curta. Não escreva parágrafos ou explicações longas.
        4. NÃO OMITA NENHUM ITEM: Todos os itens do brainstorming devem aparecer na Espinha de Peixe, distribuídos entre as categorias.
      `;
    } else if (toolId === 'actionPlan' || toolId === 'plan5w2h') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "actions": [
            { "id": "uuid", "variable": "Causa/Variável", "what": "Ação a ser tomada", "when": "", "who": "", "status": { "state": "green", "progress": "0%" } },
            ...
          ]
        }
      `;
    } else if (toolId === 'sipoc') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "suppliers": ["Fornecedor 1"],
          "inputs": ["Entrada 1"],
          "process": ["Passo 1", "Passo 2", "Passo 3", "Passo 4", "Passo 5"],
          "outputs": ["Saída 1"],
          "customers": ["Cliente 1"]
        }
      `;
    } else if (toolId === 'dataNature') {
      const collectionItems = previousToolData?.dataCollection?.items || [];
      const quantitativeItems = collectionItems.filter((item: any) => 
        item.data?.method?.toUpperCase() === 'QUANTITATIVA'
      ).map((item: any) => item.data?.variable).filter(Boolean);

      prompt += `
        Com base no Plano de Coleta de Dados do projeto "${projectInfo.name}", identifiquei as seguintes variáveis quantitativas: ${quantitativeItems.join(', ') || 'Nenhuma variável quantitativa explícita no plano de coleta'}.

        Sua tarefa é analisar estas variáveis e, para CADA RELACIONAMENTO entre o Y principal do projeto e os X encontrados, siga estas regras:
        1. Identifique qual delas é a Variável Resposta principal (Y) e quais são as Fontes de Variação/Causa (Xs).
        2. Para cada variável, determine se ela é "Contínua" ou "Discreta".
        3. Para cada par (Y, X), recomende as ferramentas estatísticas ideais baseadas no quadrante resultante.
        4. No fim, adicione uma explicação clara do porquê dessas escolhas no campo "explanation".
        
        Use a seguinte matriz de decisão para os quadrantes:
        - Y Contínuo / X Contínuo: Diagrama de Dispersão, Gráfico de tendência, Regressão simples, Regressão múltipla.
        - Y Contínuo / X Discreto: Box Plot, Teste de Hipótese, ANOVA.
        - Y Discreto / X Contínuo: Regressão Logística (Binária/Ordinal/Nominal).
        - Y Discreto / X Discreto: Histograma, Pareto, Chi Quadrado.

        ESTRUTURA ESPERADA (JSON):
        {
          "analyses": [
            {
              "id": "uuid",
              "variableY": {
                "name": "Nome da Variável Y",
                "type": "Contínuo",
                "description": "Explicação curta do porquê é Y"
              },
              "variableX": {
                "name": "Nome da Variável X",
                "type": "Discreto",
                "description": "Explicação curta do porquê é X"
              },
              "quadrant": "Y Contínuo / X Discreto",
              "recommendedTools": ["Box Plot", "ANOVA"],
              "explanation": "Explicação técnica detalhada..."
            }
          ]
        }
      `;
    } else if (toolId === 'fmea') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "items": [
            { "id": "1", "processStep": "Passo do Processo", "failureMode": "Modo de Falha", "failureEffect": "Efeito da Falha", "severity": 5, "causes": "Causas", "occurrence": 3, "controls": "Controles Atuais", "detection": 4, "actions": "Ações Recomendadas" },
            ...
          ]
        }
      `;
    } else if (toolId === 'brief') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "answers": {
            "q1": "Nome do processo",
            "q2": "Principal problema",
            "q3": "Envolvidos",
            "q4": "O que está dando errado",
            "q5": "Riscos",
            "q6": "O que quer melhorar",
            "q7": "Metas",
            "q8": "Benefícios",
            "q10": "Próximos passos",
            "q12": "Ajuda necessária"
          }
        }

        INSTRUÇÕES ESPECÍFICAS PARA ENTENDENDO O PROBLEMA:
        1. Se houver um projeto específico selecionado (passado em previousToolData), foque TOTALMENTE nele.
        2. Use uma linguagem técnica, executiva e baseada em fatos e dados.
        3. Para projetos Lean Six Sigma, certifique-se de que o problema e o objetivo sejam quantificáveis sempre que possível.
      `;
    } else if (toolId === 'charter') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "title": "Título do Projeto",
          "date": "DD/MM/AAAA",
          "rev": "00",
          "area": "Área do Projeto",
          "leader": "Nome do Líder",
          "champion": "Nome do Champion",
          "problemDefinition": "Definição técnica do problema",
          "problemHistory": "Histórico e dados do problema",
          "goalDefinition": "Meta SMART",
          "kpi": "Indicadores",
          "scope": "O que está no escopo e o que está fora",
          "businessContributions": "Ganhos para o negócio",
          "stakeholders": [
            { "role": "Líder:", "name": "Nome", "definition": "A", "measurement": "A", "analysis": "A", "improvement": "A", "control": "A" },
            ...
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA PROJECT CHARTER:
        1. Use os dados da ferramenta "Entendendo o Problema" (brief) como base principal.
        2. A meta deve ser SMART (Específica, Mensurável, Atingível, Relevante e com Prazo).
        3. Defina os stakeholders de forma realista para um projeto Lean Six Sigma.
        4. O título do projeto deve ser direto e objetivo, NÃO inclua "Lean Six Sigma" no título.
      `;
    } else if (toolId === 'rab') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "columns": [
            { "id": "description", "label": "Problema / Oportunidade", "isScore": false },
            { "id": "rapidez", "label": "Rapidez", "isScore": true },
            { "id": "autonomia", "label": "Autonomia", "isScore": true },
            { "id": "beneficio", "label": "Benefício", "isScore": true }
          ],
          "opportunities": [
            { "id": "1", "description": "Título do Projeto", "rapidez": 5, "autonomia": 3, "beneficio": 5 },
            ...
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA RAB:
        1. Se houver dados da ferramenta "Ideia de Projeto de Melhoria" (previousToolData.generatedProjects), você DEVE usar os títulos desses projetos como as "opportunities".
        2. Para cada projeto, atribua pontuações técnicas (obrigatoriamente 1, 3 ou 5) para Rapidez, Autonomia e Benefício.
        3. Rapidez: 5 (Imediato/1 mês), 3 (Curto/1-3 meses), 1 (Longo/+3 meses).
        4. Autonomia: 5 (Total/Sozinho), 3 (Apoio de outras áreas), 1 (Depende de terceiros).
        5. Benefício: 5 (Impacto Estratégico), 3 (Impacto na Área), 1 (Impacto no Processo).
        6. Seja criterioso e técnico na atribuição dos pontos baseando-se na descrição do problema de cada projeto.
      `;
    } else if (toolId === 'measureMatrix') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "outputs": [
            { "name": "Indicador de Qualidade (Y)", "importance": 10 },
            ...
          ],
          "causes": [
            { "id": "X01", "name": "Causa/Variável", "scores": [9, 3, ...], "effort": 1, "selected": false },
            ...
          ]
        }
        IMPORTANTE: O array "scores" em cada causa deve ter o mesmo tamanho do array "outputs".

        INSTRUÇÕES ESPECÍFICAS PARA MATRIZ DE CAUSA E EFEITO:
        1. FONTES EXCLUSIVAS: Use os dados da ferramenta "Espinha de Peixe" (measureIshikawa) como base para as causas (X's).
        2. MAPEAMENTO: Cada causa listada no Ishikawa deve se tornar uma linha na matriz.
        3. SCORE DE CORRELAÇÃO: Atribua notas de 0 a 10 para a correlação entre a Causa (X) e o Indicador (Y).
        4. INDICADORES (Y): Identifique indicadores de saída baseando-se no Problema e metas descritos no "brief".
      `;
    } else if (toolId === 'dataCollection') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "items": [
            { 
              "id": "uuid", 
              "data": {
                "variable": "ID - Nome Exato da Variável",
                "priority": "Alta/Média/Baixa",
                "operationalDefinition": "O QUE MEDIR: Definição clara para validar se a variável é causa raiz.",
                "msa": "Sim ou Não",
                "method": "Qualitativa ou Quantitativa",
                "stratification": "Descrição da estratificação",
                "responsible": "Responsável",
                "when": "Frequência",
                "howMany": "Quantidade"
              }
            }
          ]
        }

        INSTRUÇÕES CRÍTICAS PARA PLANO DE COLETA DE DADOS:
        1. SELEÇÃO RÍGIDA: Crie linhas EXCLUSIVAMENTE para as causas com "selected": true na Matriz Causa e Efeito.
        2. MÉTODO DE MEDIÇÃO (LÓGICA ESTRITA):
           - Escolha "Quantitativa" se a Definição Operacional envolver medir números, tempos, dimensões, volumes ou frequências estatísticas.
           - Escolha "Qualitativa" se a Definição Operacional envolver auditoria visual, verificação de existência (Sim/Não), conferência de documentos ou observação de comportamento/padrão sem métrica numérica contínua.
        3. DEFINIÇÃO OPERACIONAL: Deve ser o guia mestre. Use o formato: "O QUE MEDIR/VERIFICAR: [Descreva o procedimento técnico para confirmar se é causa raiz]".
        4. ESTRUTURA: Remova o campo "record" da saída final.
      `;
    } else if (toolId === 'directObservation') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "observations": [
            { 
              "id": "1", 
              "variable": "Nome da Variável", 
              "operationalDefinition": "Definição do Plano de Coleta",
              "identifiedCause": false, 
              "observationDescription": "", 
              "images": [],
              "aiSuggestions": {
                "trueHypothesis": "Hipótese Verdadeira: Descreva uma situação realística onde se observa a falha e confirma-se a causa...",
                "falseHypothesis": "Hipótese Falsa: Descreva uma situação onde a variável foi verificada mas nenhum desvio foi encontrado..."
              }
            }
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA OBSERVAÇÃO DIRETA:
        1. FONTES: Use os dados da ferramenta "Plano de Coleta de Dados" (dataCollection).
        2. FILTRO: Use apenas as variáveis QUALITATIVAS.
        3. HIPÓTESES:
           - "trueHypothesis": Deve ser um texto técnico simulando uma observação que CONFIRMA que a variável é uma causa raiz do problema.
           - "falseHypothesis": Deve ser um texto técnico simulando uma observação que DESCARTA a variável como causa raiz (nenhuma anomalia vista).
        4. O campo "observationDescription" deve ser retornado como string vazia, pois o usuário que irá escolher entre as hipóteses.
      `;
    } else if (toolId === 'gut') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "columns": [
            { "id": "description", "label": "Problema / Oportunidade", "isScore": false },
            { "id": "gravidade", "label": "Gravidade", "isScore": true },
            { "id": "urgencia", "label": "Urgência", "isScore": true },
            { "id": "tendencia", "label": "Tendência", "isScore": true }
          ],
          "opportunities": [
            { "id": "1", "description": "Título do Projeto", "gravidade": 5, "urgencia": 3, "tendencia": 5 },
            ...
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA MATRIZ GUT:
        1. Se houver dados da ferramenta "Ideia de Projeto de Melhoria" (previousToolData.generatedProjects), você DEVE usar os títulos desses projetos como as "opportunities".
        2. Para cada projeto, atribua pontuações técnicas (obrigatoriamente 1, 3 ou 5) para Gravidade, Urgência e Tendência.
        3. Gravidade: 5 (Extremamente Grave), 3 (Grave), 1 (Leve).
        4. Urgência: 5 (Imediata), 3 (O mais rápido possível), 1 (Pode esperar).
        5. Tendência: 5 (Piorar rapidamente), 3 (Irá piorar), 1 (Não irá piorar).
        6. Seja criterioso e técnico na atribuição dos pontos baseando-se na descrição do problema de cada projeto.
      `;
    } else if (toolId === 'statisticalAnalysis') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "analyses": [
            { 
              "id": "1", 
              "variable": "Nome da Variável", 
              "analysisType": "Histograma / Boxplot / Pareto / etc.",
              "graphImage": "",
              "interpretation": ""
            }
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA ANÁLISE GRÁFICA E ESTATÍSTICA:
        1. FONTES: Use os dados da ferramenta "Plano de Coleta de Dados" (dataCollection).
        2. FILTRO: Use APENAS as variáveis que possuem o método de medição "Quantitativa".
        3. PARA CADA VARIÁVEL QUANTITATIVA:
           - "variable": Use o nome exato da variável do plano de coleta.
           - "analysisType": Sugira o tipo de análise mais adequado para aquela variável (ex: Histograma para dados contínuos, Boxplot para comparar grupos, Gráfico de Série Temporal para dados cronológicos).
           - "interpretation": Deixe como string vazia.
           - "graphImage": Deixe como string vazia.
      `;
    } else if (toolId === 'fiveWhys') {
      const problemFromContext = 
        previousToolData?.measureIshikawa?.toolData?.problem || 
        previousToolData?.brief?.toolData?.answers?.q2 || 
        previousToolData?.problem || 
        projectInfo?.description || 
        "";
      
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "chains": [
            { 
              "id": "1", 
              "problem": "${problemFromContext}", 
              "whys": ["R1", "R2", "R3", "R4", "R5"], 
              "rootCause": "Causa Raiz Sugerida" 
            }
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA 5 PORQUÊS:
        1. PROBLEMA CENTRAL: Use como ponto de partida o problema "${problemFromContext}".
        2. PROFUNDIDADE REALISTA: Realize a análise técnica dos 5 porquês. Não é obrigatório preencher sempre os 5 níveis se a causa raiz for encontrada antes, mas busque uma investigação profunda e realista.
        3. QUALIDADE: As respostas devem ser técnicas, curtas e baseadas em lógica de causa e efeito.
        4. O aluno poderá editar livremente todas as sugestões geradas.
      `;
    } else if (toolId === 'fta' || toolId === 'faultTreeAnalysis') {
      const problemFromContext = 
        previousToolData?.measureIshikawa?.toolData?.problem || 
        previousToolData?.brief?.toolData?.answers?.q2 || 
        previousToolData?.problem || 
        projectInfo?.description || 
        "";

      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "nodes": [
            { "id": "root", "parentId": null, "name": "Problema: ${problemFromContext}", "description": "Evento topo da análise", "gateType": "OR", "status": "Concluído" },
            { "id": "uuid1", "parentId": "root", "name": "Causa Nível 1", "description": "...", "gateType": "OR", "status": "Em análise" },
            { "id": "uuid2", "parentId": "uuid1", "name": "Causa Nível 2", "description": "...", "gateType": "NONE", "status": "Não iniciado" }
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA FTA (FAULT TREE ANALYSIS):
        1. PROBLEMA CENTRAL: O evento topo (id: "root") deve ser: "${problemFromContext}".
        2. DESDOBRAMENTO TÉCNICO: Analise o problema e desdobre-o em causas e subcausas lógicas.
        3. PORTAS LÓGICAS: Use "OR" se qualquer uma das causas filhas puder causar o evento pai. Use "AND" se todas as causas filhas precisarem ocorrer simultaneamente. Use "NONE" para causas raiz (folhas da árvore).
        4. STATUS: Sugira status realistas para as investigações.
        5. CONTEXTO: Utilize as informações do Brief, Process Map ou Ishikawa para identificar possíveis causas e caminhos de falha.
        6. FOCO: Seja profundo e busque identificar pelo menos 2 ou 3 níveis de causas.
      `;
    } else if (toolId === 'effortImpact') {
      prompt += `
        ESTRUTURA ESPERADA (JSON):
        {
          "actions": [
            { "id": "1", "label": "X1", "description": "Descrição da Ação/Projeto", "effort": 3, "impact": 5 },
            ...
          ]
        }

        INSTRUÇÕES ESPECÍFICAS PARA MATRIZ ESFORÇO X IMPACTO:
        1. FONTES: Use obrigatoriamente as ideias listadas na ferramenta "Brainstorming" fornecida no contexto.
        2. MAPEAMENTO: O campo "idea" de cada item do brainstorming deve ser mapeado para o campo "description" da ação na matriz.
        3. PONTUAÇÃO (1-5): Atribua notas técnicas de 1 (Baixo), 3 (Médio) ou 5 (Alto) para Esforço e Impacto.
        4. ESFORÇO: Avalie o quão complexo ou custoso é implementar cada ideia.
        5. IMPACTO: Avalie o quanto essa ideia contribui para resolver o problema ou atingir o objetivo do projeto.
        6. RE-LABEL: Mantenha os labels como X1, X2, X3 seguindo a ordem das ideias.
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    console.error("Erro ao gerar dados da ferramenta com IA:", error);
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("A cota gratuita da IA foi excedida para este minuto. Por favor, aguarde 60 segundos e tente novamente. Se o erro persistir, verifique sua chave de API nas configurações.");
    }
    throw error;
  }
};
