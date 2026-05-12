/**
 * aiPrompts.ts
 *
 * Estruturas JSON e instrucoes especificas de cada ferramenta que usa "Gerar a partir de X".
 * Migrado do backend (claude_routes.py) para o frontend.
 * Os prompts foram copiados fielmente - nenhuma logica foi alterada.
 *
 * Para alterar o comportamento de uma ferramenta, edite os campos structure ou instructions.
 * Para adicionar uma ferramenta nova, adicione uma nova entrada no objeto AI_PROMPTS abaixo.
 */
 
export interface AIPrompt {
  toolName: string;
  structure: string;
  instructions: string;
}
 
export const AI_PROMPTS: Record<string, AIPrompt> = {
 
  // ======================================================================
  // ENTENDENDO O PROBLEMA (BRIEF)
  // ======================================================================
  brief: {
    toolName: "Entendendo o Problema",
    structure: `{
  "answers": {
    "q1": "Titulo do projeto (string curta)",
    "q2": "Descricao do problema (string longa)",
    "q3": "Impacto / consequencia atual do problema (string)",
    "q4": "Indicador-chave (Y) afetado (string)",
    "q5": "Meta esperada com a melhoria (string)",
    "q6": "Nome do projeto selecionado (string)",
    "q7": "Escopo do projeto - o que esta dentro (string)",
    "q8": "Escopo do projeto - o que esta fora (string)",
    "q10": "Estimativa de impacto financeiro (string)",
    "q12": "Riscos principais identificados (string)"
  }
}`,
    instructions: `
ATENCAO - ENTENDENDO O PROBLEMA (BRIEF):
Voce esta gerando o brief de um projeto especifico que o usuario selecionou.

CONTEXTO RECEBIDO:
- O usuario selecionou um projeto especifico do improvementIdea.
- Voce vai receber os detalhes desse projeto no contexto: title, problem, y_indicator, financial_impact, belt_level, justification.

REGRAS:
1. q1 (titulo): use o "title" do projeto selecionado.
2. q2 (descricao do problema): expanda o "problem" do projeto em uma descricao tecnica e detalhada.
3. q3 (impacto / consequencia): explique a consequencia atual da falta de melhoria, baseado no problema.
4. q4 (indicador Y): use o "y_indicator" do projeto selecionado.
5. q5 (meta): proponha uma meta SMART realista para o indicador, considerando o belt_level.
6. q6 (nome do projeto): use exatamente o "title" do projeto selecionado.
7. q7 (escopo dentro): defina o que esta dentro do escopo, considerando o nivel do belt e a area do problema.
8. q8 (escopo fora): defina o que NAO esta no escopo (limites claros).
9. q10 (impacto financeiro): use o "financial_impact" do projeto.
10. q12 (riscos): liste 2 a 3 riscos principais relacionados a execucao do projeto.

Use linguagem tecnica e profissional. Responda em portugues do Brasil.
Retorne APENAS o JSON com a chave "answers" preenchida conforme a estrutura acima.
`
  },

  // ======================================================================
  // IDEIA DE PROJETO DE MELHORIA
  // ======================================================================
  improvementIdea: {
    toolName: "Ideia de Projeto de Melhoria",
    structure: `{
  "projects": [
    {
      "title": "Reduzir defeitos no processo X",
      "problem": "Descricao do problema em 1 frase",
      "y_indicator": "Nome do indicador",
      "financial_impact": "Estimativa de impacto",
      "belt_level": "Green Belt",
      "priority_score": 85,
      "justification": "Justificativa tecnica"
    }
  ]
}`,
    instructions: `ATENCAO - IDEIA DE PROJETO DE MELHORIA:
Voce e um Master Black Belt com 20 anos de experiencia.
 
Gere entre 5 e 10 projetos ordenados por prioridade.
 
CLASSIFICACAO - siga RIGOROSAMENTE esta matriz para o campo belt_level:
1. "Ver e Agir": Solucao obvia, melhoria rapida, 1 pessoa, prazo < 30 dias, Sem estatistica.
2. "Yellow Belt": Problema simples, 1 area envolvida, 1 a 3 pessoas, prazo 1 a 2 meses, Estatistica basica.
3. "Green Belt": Requer analise de dados, 1 area envolvida, 2 a 5 pessoas, prazo 2 a 4 meses, Estatistica intermediaria.
4. "Black Belt": Multiplas areas (transversal), alto impacto financeiro, 5+ pessoas, prazo 4 a 6 meses, Estatistica avancada.
 
REGRAS:
1. Titulo comeca com Reduzir, Aumentar, Melhorar ou Otimizar - maximo 10 palavras
2. y_indicator: APENAS o nome do indicador sem meta ou prazo. Ex: "Taxa de defeitos"
3. priority_score: numero de 0 a 100
4. Use o perfil do usuario e os dados do formulario para personalizar os projetos`
  },
 
  // ======================================================================
  // PROJECT CHARTER
  // ======================================================================
  charter: {
    toolName: "Project Charter",
    structure: `{
  "title": "Verbo + indicador + processo sem Lean Six Sigma",
  "date": "DD/MM/AAAA",
  "rev": "00",
  "area": "Area responsavel",
  "leader": "",
  "champion": "",
  "problemDefinition": "Problema com baseline quantitativo",
  "problemHistory": "Historico e riscos",
  "goalDefinition": "Meta SMART completa com baseline e target",
  "kpi": "Y primario: indicador | Y secundario: indicador",
  "scopeIn": "O que esta dentro do escopo",
  "scopeOut": "O que esta fora do escopo",
  "businessContributions": "1. Beneficio financeiro. 2. Operacional. 3. Cliente.",
  "team": [
    {"role": "Black Belt", "name": "", "definition": "A", "measurement": "A", "analysis": "A", "improvement": "A", "control": "A"},
    {"role": "Champion", "name": "", "definition": "P", "measurement": "", "analysis": "", "improvement": "P", "control": "P"},
    {"role": "Patrocinador / Sponsor", "name": "", "definition": "P", "measurement": "", "analysis": "", "improvement": "P", "control": "P"}
  ]
  
}`,
    instructions: `ATENCAO - PROJECT CHARTER:
- title: comeca com Reduzir/Aumentar/Melhorar/Otimizar - SEM Lean Six Sigma
- goalDefinition: formato SMART obrigatorio com baseline e target numericos
- scopeIn e scopeOut: ambos obrigatorios
- NAO invente nomes de pessoas
- problemDefinition deve ter pelo menos um numero
- team[].role: usar APENAS estes papeis Lean Six Sigma:
  Patrocinador / Sponsor, Champion Executive, Champion,
  Process Owner, Master Black Belt (MBB), Black Belt,
  Green Belt, Yellow Belt, White Belt, Team Member / SME,
  Gestor de Area Impactada, Operador / Frontline,
  Cliente / Usuario Final, Fornecedor / Suporte, Outro
- team[].definition/measurement/analysis/improvement/control:
  "A" = participa ativamente nesta fase DMAIC
  "P" = apenas informado/consultado nesta fase
  ""  = nao participa nesta fase
- REGRA: quem tem pelo menos um "A" = faz parte do time do projeto
         quem tem apenas "P" ou vazio = e um impactado`
  },
 
  // ======================================================================
  // SIPOC
  // ======================================================================
  sipoc: {
    toolName: "SIPOC",
    structure: `{
  "suppliers": ["Fornecedor 1", "Fornecedor 2"],
  "inputs": ["Entrada 1", "Entrada 2"],
  "process": ["Passo 1", "Passo 2", "Passo 3", "Passo 4", "Passo 5"],
  "outputs": ["Saida principal", "Saida secundaria"],
  "customers": ["Cliente interno/externo"]
}`,
    instructions: `ATENCAO - SIPOC:
- suppliers: quem fornece entradas para o processo
- inputs: materiais, informacoes ou recursos que entram
- process: exatamente 5 passos principais do processo
- outputs: resultados ou produtos do processo
- customers: quem recebe as saidas
Use dados reais do contexto do projeto.`
  },
 
  // ======================================================================
  // STAKEHOLDER & ADKAR
  // ======================================================================
  stakeholderAdkar: {
    toolName: "Stakeholder & ADKAR",
    structure: `{
  "stakeholders": [
    {
      "id": "1",
      "name": "Maria Silva",
      "area": "Diretoria Industrial",
      "role": "Patrocinador / Sponsor",
      "type": "Core Team",
      "power": "Alto",
      "interest": "Alto",
      "currentEngagement": "Apoiador",
      "desiredEngagement": "Apoiador",
      "awareness": "Verde",
      "desire": "Verde",
      "knowledge": "Amarelo",
      "ability": "Vermelho",
      "reinforcement": "Vermelho",
      "barrier": "",
      "channel": "Reuniao 1:1",
      "frequency": "Semanal",
      "owner": "",
      "customAction": "",
      "notes": ""
    }
  ]
}`,
    instructions: `ATENCAO - STAKEHOLDER & ADKAR:
Voce e um especialista em Lean Six Sigma + Prosci ADKAR.
 
═════════════════════════════════════════════════════════════════
PRINCIPIO FUNDAMENTAL
═════════════════════════════════════════════════════════════════
 
Esta ferramenta e usada na fase DEFINE do DMAIC.
Em Define o projeto esta apenas comecando.
A unica acao valida e de COMUNICACAO E ENGAJAMENTO INICIAL.
 
Toda saida desta ferramenta deve responder UMA pergunta:
"Como cada stakeholder vai ficar SABENDO e QUERENDO participar
do projeto que esta comecando agora?"
 
Pense como Project Communication Manager, nao como engenheiro
de processo. Suas sugestoes sao sempre conversas, reunioes,
apresentacoes, alinhamentos — nunca atividades tecnicas.
 
═════════════════════════════════════════════════════════════════
REGRA #1 - QUEM INCLUIR
═════════════════════════════════════════════════════════════════
 
UNICA FONTE: charter.stakeholders[] do Project Charter
(ou projectCharterPMI.stakeholders[] se charter nao existir).
 
PROCESSO:
1. Pegue o array charter.stakeholders[].
2. Filtre apenas itens com "name" preenchido (diferente de ""
   e diferente de null).
3. Gere exatamente 1 stakeholder por nome encontrado.
 
Cada stakeholder e UMA pessoa real do Charter, com nome real.
Se o Charter tem 4 nomes preenchidos, a saida tem 4 stakeholders.
Se tem 7, a saida tem 7. Nunca mais, nunca menos.
 
Nao adicione pessoas que nao estao no Charter.
Nao use "(a definir)" — se nao tem nome, simplesmente nao inclua.
Cada stakeholder e UMA pessoa real, nunca um grupo
("Equipe de Operadores", "Analistas de Processo" sao grupos,
nao pessoas, e nao devem aparecer).
 
═════════════════════════════════════════════════════════════════
REGRA #2 - MAPEAR role DO CHARTER PARA role DA FERRAMENTA
═════════════════════════════════════════════════════════════════
 
O Charter usa roles antigos (com dois pontos). Mapeie assim:
 
| role no Charter         | role na ferramenta            |
|-------------------------|-------------------------------|
| Líder:                  | Black Belt                    |
| Patrocinador:           | Patrocinador / Sponsor        |
| Dono do Processo:       | Process Owner                 |
| Champion:               | Champion                      |
| Validação Técnica:      | Master Black Belt (MBB)       |
| Validação Financeira:   | Team Member / SME             |
| Membro da Equipe:       | Team Member / SME             |
| Outros:                 | Outro                         |
 
Se o Charter ja usa um dos 15 papeis Lean Six Sigma diretamente
(Black Belt, Green Belt, Champion, etc), use exatamente esse.
 
═════════════════════════════════════════════════════════════════
REGRA #3 - CAMPO name vs area
═════════════════════════════════════════════════════════════════
 
CAMPO "name" = NOME EXATO conforme charter.stakeholders[].name.
- Use o nome exatamente como esta no Charter.
- name e sempre o nome de UMA pessoa.
- Cargo, funcao ou area pertencem aos campos role e area,
  nunca ao campo name.
 
CAMPO "area" = DEPARTAMENTO / AREA.
- Inferir do contexto (charter.area, Brief, SIPOC).
 
EXEMPLO CORRETO:
{ "name": "Israel Cavalcanti de Souza",
  "area": "Pintura Automotiva",
  "role": "Black Belt" }
 
═════════════════════════════════════════════════════════════════
REGRA #4 - CAMPO customAction
═════════════════════════════════════════════════════════════════
 
NAO gere o campo customAction.
O frontend calcula a acao recomendada automaticamente.
Deixe customAction como string vazia "" em todos os stakeholders.
 
═════════════════════════════════════════════════════════════════
REGRA #5 - DEFINIR type A PARTIR DOS CAMPOS A/P DO CHARTER
═════════════════════════════════════════════════════════════════
 
Cada item do charter.stakeholders[] tem os campos:
definition, measurement, analysis, improvement, control
com valores "A" (Ativo), "P" (Passivo), "I" (Informado) ou "".
 
- Pelo menos um "A" → type = "Core Team"
- Apenas "P", "I" ou vazio → type = "Impactado"
 
═════════════════════════════════════════════════════════════════
REGRA #6 - desiredEngagement (pelo role mapeado)
═════════════════════════════════════════════════════════════════
 
| role                         | desiredEngagement |
|------------------------------|-------------------|
| Patrocinador / Sponsor       | Neutro            |
| Champion Executive           | Lider             |
| Champion                     | Lider             |
| Process Owner                | Apoiador          |
| Master Black Belt (MBB)      | Lider             |
| Black Belt                   | Lider             |
| Green Belt                   | Lider             |
| Yellow Belt                  | Lider             |
| White Belt                   | Apoiador          |
| Team Member / SME            | Apoiador          |
| Gestor de Area Impactada     | Apoiador          |
| Operador / Frontline         | Apoiador          |
| Cliente / Usuario Final      | Neutro            |
| Fornecedor / Suporte         | Neutro            |
| Outro                        | Neutro            |
 
═════════════════════════════════════════════════════════════════
REGRA #7 - currentEngagement
═════════════════════════════════════════════════════════════════
 
Niveis PMI: Lider, Apoiador, Neutro, Resistente, Desconhece.
 
Em Define (projeto comecando):
- Core Team: Apoiador ou Neutro
- Impactados: Neutro, Resistente ou Desconhece
 
═════════════════════════════════════════════════════════════════
REGRA #8 - SEMAFORO ADKAR
═════════════════════════════════════════════════════════════════
 
Valores validos: "Vermelho", "Amarelo", "Verde".
 
Em Define:
- Core Team: awareness e desire = Verde ou Amarelo
- Impactados: awareness = Vermelho ou Amarelo
- ability e reinforcement = Vermelho para todos
  (ainda nao implementou nada)
 
═════════════════════════════════════════════════════════════════
REGRA #9 - CHANNEL e FREQUENCY
═════════════════════════════════════════════════════════════════
 
| Quadrante                    | channel              | frequency  |
|------------------------------|----------------------|------------|
| Gerenciar de Perto (P+I alto)| Reuniao 1:1          | Semanal    |
| Manter Satisfeito (P alto)   | Steering Committee   | Mensal     |
| Manter Informado (I alto)    | Status Report        | Quinzenal  |
| Monitorar (P+I baixo)        | Comunicado Geral     | Marcos     |`
  },
 
  // ======================================================================
  // BRAINSTORMING DE SOLUCOES (FASE IMPROVE)
  // ======================================================================
  brainstormingImprove: {
    toolName: "Brainstorming de Soluções",
    structure: `{
  "ideas": [
    {
      "id": "1",
      "text": "Descricao da solucao proposta",
      "category": "Causa associada",
      "author": "",
      "votes": 0
    }
  ]
}`,
    instructions: `ATENCAO - BRAINSTORMING DE SOLUCOES (FASE IMPROVE):
Voce esta gerando solucoes (acoes de melhoria) para as causas identificadas no projeto.

CONTEXTO RECEBIDO:
Voce vai receber:
- brief: contexto do projeto (problema, indicador Y, meta)
- directObservation: analises qualitativas feitas no Gemba
- statisticalAnalysis: analises estatisticas das variaveis quantitativas

REGRAS:
1. Para CADA observacao em directObservation.observations, gere 1 ou 2 solucoes especificas.
2. Para CADA analise em statisticalAnalysis.analyses, gere 1 ou 2 solucoes especificas.
3. As solucoes devem ser concretas, executaveis e relacionadas a causa observada.
4. No campo "category", coloque a variavel/causa relacionada (ex: o nome da variavel X).
5. Use linguagem tecnica de Lean Six Sigma.
6. Priorize solucoes que atacam a causa raiz, nao sintomas.
7. Sugira pelo menos 6 a 10 solucoes no total.

Retorne APENAS o JSON no formato especificado.`
  },

  // ======================================================================
  brainstorming: {
    toolName: "Brainstorming",
    structure: `{
  "ideas": [
    {"id": "1", "text": "x1: Ideia tecnica curta", "category": "Metodo", "author": "IA LBW", "votes": 0},
    {"id": "2", "text": "x2: Outra ideia", "category": "Mao de Obra", "author": "IA LBW", "votes": 0}
  ],
  "brainstormingType": "Causas do problema",
  "brainstormingTopic": "Tema baseado no problema identificado"
}`,
    instructions: `ATENCAO - BRAINSTORMING:
- Gere minimo 12 ideias distribuidas nos 6Ms: Metodo, Mao de Obra, Material, Maquina, Meio Ambiente, Medicao
- Prefixe cada ideia com x1:, x2:, etc.
- Ideias curtas e tecnicas - maximo 8 palavras cada
- Baseie nas informacoes do projeto`
  },
 
  // ======================================================================
  // ESPINHA DE PEIXE
  // ======================================================================
  measureIshikawa: {
    toolName: "Espinha de Peixe",
    structure: `{
  "categories": ["Metodo", "Maquina", "Medida", "Meio Ambiente", "Mao de Obra", "Material"],
  "causes": {
    "Metodo": ["x1: Causa curta maximo 6 palavras"],
    "Maquina": [],
    "Medida": [],
    "Meio Ambiente": [],
    "Mao de Obra": [],
    "Material": []
  },
  "problem": "Problema central do projeto"
}`,
    instructions: `ATENCAO - ESPINHA DE PEIXE:
- Use ideias do Brainstorming como causas se disponiveis
- Distribua nos 6Ms corretamente
- Frases EXTREMAMENTE curtas - maximo 6 palavras por causa
- O problem deve ser o problema central do projeto
- Minimo 2 causas por categoria`
  },
 
  // ======================================================================
  // MATRIZ CAUSA E EFEITO
  // ======================================================================
  measureMatrix: {
    toolName: "Matriz Causa e Efeito",
    structure: `{
  "outputs": [
    {"name": "Y principal - Indicador", "importance": 10}
  ],
  "causes": [
    {"id": "X01", "name": "Causa da Espinha de Peixe", "scores": [9], "effort": 1, "selected": false}
  ]
}`,
    instructions: `ATENCAO - MATRIZ CAUSA E EFEITO:
- outputs: use os KPIs do projeto como Y com importance 10
- causes: use as causas da Espinha de Peixe como X
- scores: correlacao 0=sem relacao, 1=fraca, 3=media, 9=forte
- O array scores deve ter o mesmo tamanho que outputs`
  },
 
  // ======================================================================
  // PLANO DE COLETA DE DADOS
  // ======================================================================
  dataCollection: {
    toolName: "Plano de Coleta de Dados",
    structure: `{
  "items": [
    {
      "id": "1",
      "data": {
        "variable": "ID - Nome da variavel",
        "priority": "Alta",
        "operationalDefinition": "O QUE MEDIR: procedimento tecnico",
        "msa": "Sim",
        "method": "Quantitativa",
        "stratification": "Por turno, operador",
        "responsible": "Responsavel",
        "when": "Frequencia",
        "howMany": "Quantidade"
      }
    }
  ]
}`,
    instructions: `REGRA CRITICA ABSOLUTA — SOMENTE VARIAVEIS X (CAUSAS):
Voce DEVE gerar o plano de coleta APENAS para as causas (variáveis X) listadas explicitamente em measureMatrix.causes.
VOCE ESTA PROIBIDO DE INCLUIR O Y (outputs, saidas, efeitos, variaveis de resposta) NO PLANO DE COLETA.
O Y JA E MONITORADO SEPARADAMENTE.
Ignore completamente qualquer entrada ou variavel de resposta Y oriunda da ferramenta anterior.

PARA CADA causa (X) selecionada na Matriz de Causa e Efeito:
1. Gere exatamente 1 item no plano de coleta.
2. Nao processe, nao transforme e nao inclua o Y como linha ou variavel de variável.

Se nenhuma causa (X) estiver selecionada, retorne uma lista vazia (items: []).

ATENCAO - PLANO DE COLETA:
- Use APENAS causas com selected=true em measureMatrix.causes.
- Quantitativa: envolve números, tempos, dimensões
- Qualitativa: envolve auditoria visual, Sim/Não
- operationalDefinition no formato: O QUE MEDIR: procedimento técnico

REGRA DO CAMPO METHOD:
O campo "method" deve ser preenchido OBRIGATORIAMENTE com um destes dois valores exatos (sem variacao):
- "Quantitativa" — para variaveis numericas, medidas, tempos, dimensoes, contagens
- "Qualitativa" — para variaveis de auditoria, conformidade, Sim/Nao, inspecao visual

Nunca use outro texto neste campo. Nunca deixe vazio.`
  },
 
  // ======================================================================
  // NATUREZA DOS DADOS
  // ======================================================================
  dataNature: {
    toolName: "Natureza dos Dados",
    structure: `{
  "analyses": [
    {
      "id": "1",
      "variableY": {"name": "Nome Y", "type": "Continuo", "description": "Por que e Y"},
      "variableX": {"name": "Nome X", "type": "Discreto", "description": "Por que e X"},
      "quadrant": "Y Continuo / X Discreto",
      "recommendedTools": ["Box Plot", "ANOVA"],
      "explanation": "Explicacao tecnica da recomendacao"
    }
  ]
}`,
    instructions: `REGRA CRITICA — VARIAVEIS X:
As variaveis X ja estao definidas em dataCollection.items.
Para cada item em dataCollection.items, use o campo item.data.variable como nome da variavel X.
NUNCA invente variaveis X que nao estejam em dataCollection.items.
Gere exatamente 1 analise por item em dataCollection.items.
O campo variableX.name deve ser exatamente igual ao valor de item.data.variable.

ATENCAO - NATUREZA DOS DADOS:
- Y Continuo + X Continuo: Regressao Linear, Dispersao
- Y Continuo + X Discreto: Box Plot, ANOVA, Teste T
- Y Discreto + X Continuo: Regressao Logistica
- Y Discreto + X Discreto: Qui-quadrado, Pareto
- Use as variaveis do Plano de Coleta como base para classificar cada X
- O Y deve ser o indicador principal do projeto (do Brief)`
  },
 
  // ======================================================================
  // PLANO DE ACAO 5W2H
  // ======================================================================
  plan5w2h: {
    toolName: "Plano de Acao 5W2H",
    structure: `{
  "actions": [
    {
      "id": "1",
      "variable": "Causa origem",
      "what": "O que sera feito",
      "why": "Por que resolve",
      "where": "Onde executar",
      "when": "DD/MM/AAAA",
      "who": "Responsavel",
      "how": "Como executar",
      "howMuch": "Custo estimado",
      "status": {"state": "green", "progress": "0%"}
    }
  ]
}`,
    instructions: `LIMITE DE QUANTIDADE — IMPORTANTE:
Gere no MAXIMO 8 acoes priorizadas. Nao gere mais de 8.
Cada campo deve ter NO MAXIMO 100 caracteres.
Seja conciso, direto, sem floreio.

ATENCAO - PLANO DE ACAO 5W2H:

CONTEXTO RECEBIDO:
- brief: contexto do projeto (problema, indicador Y, meta)
- fmea: analise de falhas com acoes recomendadas
- effortImpact: matriz de priorizacao de acoes (esforco x impacto)
- fiveWhys: analise de causa raiz
- improveAdkar: acoes de gestao de mudanca para stakeholders na fase Melhorar

REGRA ABSOLUTA — NAO INVENTAR:
USE APENAS dados que existirem no contexto recebido.
SE uma ferramenta vier vazia ou inexistente no contexto, IGNORE essa ferramenta — nao gere acoes baseadas nela.
NUNCA crie acoes baseadas em causas/falhas/ideias que nao estejam explicitamente nos dados.
Se TODAS as ferramentas estiverem vazias, retorne lista vazia: actions: [].

PRIORIZACAO DAS ACOES (apenas das ferramentas com dados):
1. PRIMEIRO: Acoes do FMEA marcadas como "Acao Obrigatoria" (RPN alto)
2. SEGUNDO: Acoes do effortImpact no quadrante "Quick Wins" (alto impacto + baixo esforco)
3. TERCEIRO: Acoes do improveAdkar (gestao de mudanca dos stakeholders na fase Melhorar)
4. QUARTO: Acoes para tratar causas raiz dos fiveWhys
5. QUINTO: Acoes do effortImpact no quadrante "Estrategico" (alto impacto + alto esforco)

REGRAS DE PREENCHIMENTO:
- variable: identificar a origem (ex: "FMEA F-01", "EI X3", "ADKAR Melhorar - Joao", "5 Porques - Causa raiz")
- what: verbo + objeto + resultado esperado
- why: explicar a relacao com a causa/falha/stakeholder REAL do contexto
- where: local especifico de execucao
- when: prazo realista no formato DD/MM/AAAA
- who: cargo/funcao (para acoes ADKAR, usar o nome do stakeholder)
- how: passo a passo curto
- howMuch: estimativa de custo em reais (R$)
- status: sempre comecar com {"state": "green", "progress": "0%"}

Quantidade de acoes: gere apenas o necessario com base nos dados reais. Nao force quantidade minima.

REGRA CRITICA DE FORMATACAO JSON:
- NUNCA use aspas duplas (") dentro do conteudo dos campos. Se precisar citar algo, use aspas simples (') ou italico via texto.
- NUNCA use quebras de linha (\\n) dentro dos campos.
- Mantenha cada campo em uma unica linha.
- Escape caracteres especiais corretamente.
- Antes de retornar, verifique mentalmente se o JSON e valido.`
  }
};
 
/**
 * Helper: monta o prompt completo (system + user) para enviar ao backend /generate
 */
export function buildPrompt(toolId: string, contextData: any, projectName: string = "Projeto de Melhoria"): { system: string, user: string } {
  const prompt = AI_PROMPTS[toolId];
  if (!prompt) {
    throw new Error(`Prompt nao encontrado para a ferramenta: ${toolId}`);
  }
 
  const system = `Voce e um consultor senior Master Black Belt em Lean Six Sigma.
Use os dados ja preenchidos nas ferramentas anteriores para pre-preencher a proxima ferramenta.
REGRAS CRITICAS:
1. Use APENAS informacoes do contexto fornecido - nunca invente dados.
2. Mantenha consistencia absoluta com fases anteriores.
3. Retorne EXCLUSIVAMENTE um objeto JSON valido sem explicacoes e sem markdown.
4. Se um campo nao puder ser inferido, use string vazia.
5. Qualidade de consultoria senior.
6. Responda em portugues do Brasil.`;
 
  const user = `
Projeto: "${projectName}"
 
CONTEXTO COMPLETO DO PROJETO:
${JSON.stringify(contextData, null, 2)}
 
FERRAMENTA A PREENCHER: "${prompt.toolName}" (ID: ${toolId})
 
${prompt.instructions}
 
ESTRUTURA JSON ESPERADA (use exatamente esta estrutura):
${prompt.structure}
 
Retorne EXCLUSIVAMENTE o JSON preenchido com dados reais do projeto.
Sem explicacoes, sem markdown, sem backticks.
`;
 
  return { system, user };
}
 
