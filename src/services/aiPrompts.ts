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
  "suppliers": ["Area requisitante", "Fornecedor X"],
  "inputs": ["Pedido de compra", "Dados do cliente"],
  "process": ["Receber a solicitacao", "Conferir os dados", "Aprovar", "Emitir", "Arquivar"],
  "outputs": ["Nota fiscal emitida", "Registro no sistema"],
  "customers": ["Cliente X", "Area fiscal"]
}`,
    instructions: `ATENCAO - SIPOC:
- suppliers: quem fornece entradas para o processo
- inputs: materiais, informacoes ou recursos que entram
- process: os passos principais do processo, na ORDEM real de execucao
- outputs: resultados ou produtos do processo
- customers: quem recebe as saidas

O contexto traz "brief" (Entendendo o Problema), preenchido pelo aluno. Derive o
SIPOC DELE, sem inventar um processo diferente:
- brief.answers.q1 = nome do processo -> e ESTE o processo a mapear
- brief.answers.q3 = principais envolvidos (areas/fornecedores) -> use como base
  de suppliers, e para deduzir customers (quem recebe o resultado)
- brief.answers.q2 e q4 = problema e o que da errado -> indicam onde estao os
  passos criticos; os passos devem cobrir o fluxo onde o problema acontece
- brief.answers.q8 = o que vai melhorar -> ajuda a nomear os outputs
- Se o brief estiver vazio, use o contexto do projeto que houver

FORMATO (critico):
- as 5 chaves sao listas de TEXTO SIMPLES: ["Fornecedor", "Area fiscal"]
- NUNCA devolva objeto dentro da lista, tipo [{"name":"..."}]. A tela imprime
  isso como [object Object]
- cada passo de process comeca com verbo no infinitivo (Receber, Conferir,
  Aprovar, Registrar, Entregar...)

NAO INVENTAR (regra dura, vale mais que qualquer quantidade):
- so escreva o que da pra sustentar no contexto recebido
- nome proprio (empresa, sistema, pessoa) que NAO esteja no contexto: use termo
  generico - "Empresa X", "Fornecedor X", "Cliente X", "Sistema X"
- coluna sem informacao no contexto: devolva lista VAZIA []. Vazio e uma
  resposta correta; encher com invencao nao e
- proibido item de enfeite: nada de "Passo 1", "Entrada 1", "Saida secundaria",
  item repetido ou generico so pra alongar a lista
- o ideal sao 5 passos em process, mas isso e ALVO, nao obrigacao: se o contexto
  so sustenta 3 passos reais, devolva 3`
  },
 
  // ======================================================================
  // STAKEHOLDER & ADKAR
  // ======================================================================
  stakeholderAdkar: {
    toolName: "ADKAR — Definir (Awareness)",
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
  "brainstormingType": "Identificar melhor solução",
  "brainstormingTopic": "Texto exato de improvementGoal",
  "ideas": [
    {
      "id": "1",
      "text": "Descricao da solucao proposta",
      "category": "Causa associada",
      "author": "IA LBW",
      "votes": 0,
      "topic": "Texto exato de improvementGoal"
    }
  ]
}`,
    instructions: `ATENCAO - BRAINSTORMING DE SOLUCOES (FASE IMPROVE):
Voce esta gerando solucoes (acoes de melhoria) para as causas identificadas no projeto.

CONTEXTO RECEBIDO:
Voce vai receber somente estas fontes quando estiverem preenchidas:
- improvementGoal: o que o aluno declarou que quer melhorar
- brief: problema, indicador Y, meta e escopo
- directObservation: evidencias observadas no Gemba
- fiveWhys e measureIshikawa: causas investigadas
- measureMatrix: causas avaliadas e priorizadas
- statisticalAnalysis e dataNature: evidencias quantitativas e relacoes entre X e Y
- validatedCauses: causas que foram revisadas e confirmadas pelo usuario para uso no Brainstorming

REGRAS:
1. improvementGoal e obrigatorio e delimita o foco. Nao gere nenhuma ideia fora dele.
1.1. Se validatedCauses estiver presente, use SOMENTE essas causas confirmadas como
base das solucoes. Nao use uma causa de outra fonte que nao esteja nessa lista.
2. Use apenas fatos, causas, variaveis e restricoes presentes no contexto recebido.
   Nao invente maquinas, sistemas, departamentos, tecnologias, cargos ou problemas.
3. Cada solucao deve atacar uma causa ou evidencia identificavel no contexto. No campo
   "category", escreva de forma curta essa causa/evidencia. Nunca use categoria generica.
4. Se uma informacao nao estiver comprovada, trate-a como hipotese a validar, nunca como fato.
5. Escreva solucoes concretas no formato acao + objeto + local/condicao quando aplicavel.
   Evite frases vagas como "melhorar processo", "treinar equipe" ou "acompanhar melhor".
6. Nao confunda solucao com sintoma, meta ou analise. Priorize atuar na causa raiz.
7. Varie os mecanismos quando forem sustentados pelo contexto: eliminar etapa, simplificar,
   padronizar, prevenir erro, automatizar, balancear carga, controlar parametro ou criar alerta.
8. Elimine duplicidades e ideias que sejam apenas reformulacoes umas das outras.
9. Gere de 6 a 10 solucoes. Se o contexto nao sustentar seis ideias relevantes, gere menos;
   qualidade e aderencia ao projeto sao mais importantes que quantidade.
10. "brainstormingTopic" deve repetir exatamente improvementGoal e
    "brainstormingType" deve ser exatamente "Identificar melhor solução".

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
      "analysisRole": "principal",
      "sourceCause": "Texto exato do X recebido",
      "projectY": "Texto exato do Y principal recebido",
      "question": "Pergunta simples que esta analise responde",
      "variableY": {"sourceName": "Texto exato do Y recebido", "name": "Grandeza mensuravel do Y", "measurement": "O que registrar e em qual unidade ou categorias", "type": "Contínuo", "description": "Por que esta operacionalizacao e classificacao respondem ao problema"},
      "variableX": {"sourceName": "Texto exato do X recebido", "name": "Grandeza mensuravel do X", "measurement": "O que registrar e em qual unidade ou categorias", "type": "Contínuo", "description": "Por que esta operacionalizacao e classificacao explicam o Y"},
      "quadrant": "Y Contínuo / X Contínuo",
      "recommendedTools": ["Diagrama de Dispersão", "Gráfico de tendência", "Regressão simples", "Regressão múltipla"],
      "recommendations": [
        {"rank": 1, "tool": "Diagrama de Dispersão", "reason": "Por que deve ser usada primeiro neste caso"},
        {"rank": 2, "tool": "Regressão simples", "reason": "Quando e por que usar como segunda opção"}
      ],
      "explanation": "Resumo da sequencia recomendada, em linguagem simples",
      "rootCauseConfirmed": false
    }
  ]
}`,
    instructions: `ATENCAO - NATUREZA DOS DADOS:

PROPOSITO: ajudar o aluno a descobrir QUAL FERRAMENTA GRAFICA OU ESTATISTICA usar
pra investigar a relacao entre UMA causa (X) e o efeito do projeto (Y). O aluno
leva essa recomendacao pra aba de Analise de Dados.

O contexto traz 'variavelX' e 'variavelY'. A variavelX pode ser uma grandeza
simples ou uma causa composta que gruda uma MEDIDA a um FATOR DE AGRUPAMENTO,
como "volume de notas por analista". Decomponha antes de classificar:
- Sempre gere 1 analise PRINCIPAL ligando a medida observavel da causa ao Y do
  projeto.
- Gere tambem 1 analise de ESTRATIFICACAO somente quando o texto ou a definicao
  operacional trouxer claramente uma medida comparada por grupos, categorias,
  pessoas, turnos, maquinas, fornecedores ou equivalentes.
- Portanto, retorne 1 ou no maximo 2 itens em analyses. Nunca mais de 2.
- Quando houver duas, analyses[0] deve ser a principal e analyses[1] a
  estratificacao.
- Nao pergunte nada ao aluno. Entregue a decomposicao pronta para ele apenas
  conferir e, se necessario, corrigir na tela.

CONHECIMENTO OBRIGATORIO DOS VIDEOS "MAPA DE ANALISE ESTATISTICA" PARTES 1 E 2:
1. Primeiro defina a DIRECAO da relacao. Y e a resposta, saida, efeito ou
   consequencia do problema. X e a entrada, causa ou fonte de variacao que pode
   explicar a mudanca em Y.
2. Uma frase de causa nao e automaticamente uma variavel estatistica. Antes de
   classificar, traduza a frase para a GRANDEZA OBSERVAVEL que sera medida ou
   registrada. Preserve a frase original em sourceName e escreva a grandeza
   operacionalizada em name.
3. Classifique pela forma como o dado sera TRATADO/MEDIDO, e nao apenas pelas
   palavras da frase. O mesmo conceito pode ser discreto ou continuo: cafe em
   numero de xicaras e discreto; cafe em quilogramas e continuo.
4. Adjetivos como lento, demorado, alto, baixo ou instavel NAO tornam a variavel
   discreta. Exemplo obrigatorio:
   - Y: "Tempo elevado de emissao de notas fiscais"
   - causa X: "Sistema ERP lento e instavel"
   - variableX.sourceName: "Sistema ERP lento e instavel"
   - variableX.name: "Tempo de resposta/processamento do Sistema ERP"
   - X = Contínuo e Y = Contínuo, pois ambos serao medidos em tempo.
   O "Sistema ERP" so seria X Discreto se a comparacao fosse por categorias,
   como ERP A/B, versao, fornecedor ou estavel/instavel.
5. Se uma frase reunir MEDIDA + AGRUPAMENTO, nao descarte nenhum dos dois:
   - analise principal: X = medida da causa e Y = efeito principal do projeto;
   - analise de estratificacao: X = fator de agrupamento e Y = medida da causa.
   Exemplo: "volume de notas fiscais por analista" gera:
   a) principal: X volume de notas / Y tempo de emissao;
   b) estratificacao: X analista / Y volume de notas.
   Se nao houver fator de agrupamento claro, gere somente a principal.
6. A letra X ou Y indica o PAPEL na relacao, nao a natureza do dado. Tanto X
   quanto Y podem ser continuos ou discretos.
7. Pense sempre na coluna que seria criada numa planilha: qual valor seria
   registrado em cada linha? Esse valor observado, e nao a frase abstrata, e o
   que determina a natureza da variavel.

EXEMPLOS DE RACIOCINIO GERAL (nao sao regras especiais):
- "Treinamento insuficiente" pode virar "horas de treinamento" (Continuo) ou
  "treinamento concluido: sim/nao" (Discreto), conforme a definicao operacional.
- "Falta de padronizacao" pode virar "% de aderencia ao procedimento" (Continuo)
  ou "procedimento padronizado: sim/nao" (Discreto).
- "Experiencia do operador" pode ser medida em meses/anos (Continuo); ja
  "operador A/B/C" e uma categoria (Discreto).
- "Empresa A ou B" e X Discreto e "desempenho em pontos" pode ser Y Continuo.

PREENCHIMENTO:
- sourceCause = exatamente o texto de 'variavelX' em todos os itens.
- projectY = exatamente o texto de 'variavelY' em todos os itens.
- analysisRole = "principal" na ligacao com o Y do projeto e
  "estratificacao" na comparacao entre grupos.
- question = pergunta curta que a analise responde, sem afirmar o resultado.
- Na principal, variableX.sourceName = exatamente o texto de 'variavelX' e
  variableY.sourceName = exatamente o texto de 'variavelY'.
- Na estratificacao, variableX.name = fator de agrupamento e variableY.name =
  medida comparada; os sourceName devem indicar claramente suas origens.
- variableX.name e variableY.name = nomes claros das grandezas que realmente
  serao medidas. Se o texto recebido ja for mensuravel, mantenha-o.
- measurement deve dizer exatamente o que entra em cada linha da planilha e em
  qual unidade ou conjunto de categorias.
- description deve justificar a operacionalizacao, a direcao X -> Y e a
  classificacao. Nao afirme que uma variavel e discreta apenas porque o texto
  original e um atributo escrito em palavras.
- rootCauseConfirmed deve ser sempre false. Somente o aluno pode confirmar.

CLASSIFIQUE CADA GRANDEZA como "Contínuo" ou "Discreto":
- Contínuo: medida numerica analisada como magnitude, como tempo, custo, peso,
  temperatura, percentual e tambem volume/quantidade quando seus valores serao
  usados numericamente para estudar aumento, reducao ou relacao com outra medida.
- Discreto: atributo, categoria ou classificacao, como turno, operador,
  fornecedor, empresa A/B, tipo, sim/nao e aprovado/reprovado. Uma contagem so
  deve ficar como Discreto quando for tratada como ocorrencia ou classe, e nao
  como intensidade numerica da causa.
Se houver definicao operacional ou metodo de coleta, use-os como fonte
prioritaria para decidir como a variavel e tratada.

ANTES DE RESPONDER, FACA ESTA CHECAGEM PARA QUALQUER TEMA OU SETOR:
- X descreve uma entrada/causa e Y descreve a resposta/efeito?
- name e uma grandeza observavel, e nao apenas a repeticao de uma causa abstrata?
- measurement deixa claro o que seria registrado em cada linha da planilha?
- "Contínuo" foi usado para medidas e quantidades analisadas numericamente?
- "Discreto" foi usado para categoria/atributo ou contagem tratada como ocorrencia?
Se faltar definicao operacional, proponha a forma de medicao mais direta para
investigar a relacao X -> Y e deixe essa escolha explicita em measurement.

RECOMENDE APENAS destas listas, conforme o cruzamento. NAO use nenhum outro nome
(nada de "Regressao Linear", "Teste T" ou "Qui-quadrado" fora do que esta aqui):
- Y Contínuo  + X Contínuo -> "Diagrama de Dispersão", "Gráfico de tendência", "Regressão simples", "Regressão múltipla"
- Y Contínuo  + X Discreto -> "Box Plot", "Teste de Hipótese", "ANOVA"
- Y Discreto  + X Contínuo -> "Regressão Logística (Binária/Ordinal/Nominal)"
- Y Discreto  + X Discreto -> "Histograma", "Pareto", "Chi Quadrado"

ORDEM DAS FERRAMENTAS DENTRO DO QUADRANTE:
- Escolha e ordene no maximo DUAS ferramentas, sempre retiradas exclusivamente
  da celula correta da matriz acima. Nao recomende ferramentas de outra celula.
- recommendations[0] e a 1a opcao: a ferramenta que o aluno deve usar primeiro.
- recommendations[1] e a 2a opcao: a proxima ferramenta mais util para confirmar,
  aprofundar ou quantificar o resultado. Se a celula tiver somente uma ferramenta,
  retorne somente a 1a opcao.
- recommendedTools deve conter TODAS as ferramentas da celula correta da matriz.
  Nenhuma ferramenta do quadrante pode ser escondida. Somente recommendations
  deve indicar quais recebem destaque como 1a e 2a opcoes.

CRITERIOS PARA ESCOLHER A ORDEM:
- Y Continuo / X Continuo: "Diagrama de Dispersao" e a primeira exploracao geral.
  Use "Grafico de tendencia" primeiro somente quando X representar tempo, data ou
  ordem cronologica. Use "Regressao simples" para quantificar ou prever depois de
  verificar a relacao. "Regressao multipla" so cabe quando houver varios X medidos;
  nao a priorize para a analise isolada de um unico X.
- Y Continuo / X Discreto: comece por "Box Plot" para enxergar os grupos. Como
  segunda opcao, use "Teste de Hipotese" quando houver dois grupos e "ANOVA"
  quando houver tres ou mais grupos.
- Y Discreto / X Continuo: a unica ferramenta permitida nesta matriz e
  "Regressao Logistica (Binaria/Ordinal/Nominal)". Nao invente segunda opcao.
- Y Discreto / X Discreto: use "Chi Quadrado" primeiro quando a pergunta for se
  existe associacao entre X e Y; use "Pareto" primeiro quando o objetivo for
  priorizar categorias; use "Histograma" quando o foco for a distribuicao de uma
  contagem discreta. Escolha a segunda opcao entre as restantes, se agregar valor.
- Cada reason deve citar o objetivo ou a estrutura dos dados deste par especifico,
  sem repetir apenas definicoes genericas da ferramenta.

quadrant deve ser exatamente "Y <tipo> / X <tipo>".
explanation: 2 a 3 frases, sem jargao, resumindo por que a sequencia destacada
responde a pergunta do aluno.`
  },
 
  // ======================================================================
  // VALIDACAO DAS CAUSAS X -> Y
  // ======================================================================
  causeValidation: {
    toolName: "Validação das Causas — X → Y",
    structure: `{
  "projectIndicatorY": "Indicador Y do projeto",
  "rows": [
    {
      "sourceId": "ID EXATO de uma evidência recebida",
      "aiDecision": "contribui",
      "aiReason": "Justificativa curta baseada somente na evidência",
      "confidence": "media"
    }
  ]
}`,
    instructions: `ATENCAO - VALIDACAO DAS CAUSAS X -> Y:
Voce recebera uma lista fechada de candidatos em 'candidates'. Gere EXATAMENTE
UMA linha para cada candidato recebido, preservando o sourceId exatamente como veio.
Nao crie candidatos, nao altere o texto de X ou Y e nao invente resultados.

Para cada candidato, classifique somente:
- "contribui": a evidência registrada sustenta uma relação relevante de X com Y;
- "nao_contribui": a evidência registrada não sustenta contribuição de X para Y;
- "inconclusivo": há planejamento, evidência insuficiente, resultado neutro ou não
  existe informação suficiente para afirmar contribuição.

REGRAS TECNICAS:
1. Associação estatística não é prova de causalidade. Use linguagem de evidência,
   não afirme causalidade definitiva.
2. Natureza dos Dados, Espinha de Peixe, 5 Porquês e Matriz Causa e Efeito são
   hipóteses ou priorizações; sem resultado medido, prefira "inconclusivo".
3. Uma análise sem interpretação ou sem resultado suficiente deve ser inconclusiva.
4. A decisão deve considerar o indicador Y do projeto e a direção X -> Y.
5. confidence deve ser exatamente "alta", "media" ou "baixa". Evidência qualitativa
   isolada ou planejamento normalmente recebe "baixa" ou "media".
6. A IA sugere; o aluno fará a confirmação humana depois. Nunca preencha campos de
   confirmação humana e nunca marque uso no Brainstorming.
7. Retorne APENAS JSON no formato especificado.`
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
- effortImpact: matriz de priorizacao de acoes (esforco x beneficio)
- fiveWhys: analise de causa raiz
- improveAdkar: acoes de gestao de mudanca para stakeholders na fase Melhorar

REGRA ABSOLUTA — NAO INVENTAR:
USE APENAS dados que existirem no contexto recebido.
SE uma ferramenta vier vazia ou inexistente no contexto, IGNORE essa ferramenta — nao gere acoes baseadas nela.
NUNCA crie acoes baseadas em causas/falhas/ideias que nao estejam explicitamente nos dados.
Se TODAS as ferramentas estiverem vazias, retorne lista vazia: actions: [].

PRIORIZACAO DAS ACOES (apenas das ferramentas com dados):
1. PRIMEIRO: Acoes do FMEA marcadas como "Acao Obrigatoria" (RPN alto)
2. SEGUNDO: Acoes do effortImpact no quadrante "Quick Wins" (alto beneficio + baixo esforco)
3. TERCEIRO: Acoes do improveAdkar (gestao de mudanca dos stakeholders na fase Melhorar)
4. QUARTO: Acoes para tratar causas raiz dos fiveWhys
5. QUINTO: Acoes do effortImpact no quadrante "Estrategico" (alto beneficio + alto esforco)

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
 
