import { Initiative, InitiativePhaseConfig, ToolLink } from '../types';

// Ligacoes entre ferramentas: qual ferramenta-fonte alimenta qual ferramenta-destino.
//
// Historico: isso vivia como dois mapas globais dentro do ToolWrapper, uma fonte unica
// por toolId valendo pra TODAS as iniciativas. Como cada projeto habilita um conjunto
// diferente de ferramentas, a fonte global apontava pra ferramenta que nao existe naquele
// projeto e o card de gerar/migrar simplesmente nao aparecia (ex.: SIPOC puxando de
// `charter` no Yellow Belt, que nao tem Charter).
//
// Agora a ligacao pode ser declarada POR PROJETO em `initiative.toolLinks`. Os mapas
// abaixo continuam existindo como FALLBACK: projeto que nao declara nada se comporta
// exatamente como antes.

// sourceToolId = a ferramenta-fonte cujos dados o bloco "Gerar com IA" consome.
// O bloco só deve aparecer quando essa fonte já foi preenchida.
// Fontes compostas usam a fonte PRINCIPAL (a que carrega o dado central).
export const TOOLS_WITH_AI_BLOCK: Record<string, { title: string; description: string; source: string; sourceToolId: string }> = {
  // PRÉ-DEFINIR
  // DEFINIR
  brief: {
    title: "Gerar Entendendo o Problema com IA",
    description: "A IA vai estruturar o problema com base no projeto priorizado nas matrizes anteriores.",
    source: "Matriz GUT e Matriz RAB",
    sourceToolId: "gut" // brief tem fluxo próprio (excluído da condição), mantido por completude
  },
  charter: {
    title: "Gerar Project Charter com IA",
    description: "A IA vai gerar o contrato do projeto com meta SMART, escopo e stakeholders baseados no problema definido.",
    source: "Entendendo o Problema",
    sourceToolId: "brief"
  },
  sipoc: {
    title: "Gerar SIPOC com IA",
    description: "A IA vai mapear fornecedores, entradas, processo, saídas e clientes baseados no Charter.",
    source: "Project Charter",
    sourceToolId: "charter"
  },
  stakeholders: {
    title: "Gerar Stakeholders com IA",
    description: "A IA vai organizar a equipe do projeto com papéis e responsabilidades baseados no Charter.",
    source: "Project Charter",
    sourceToolId: "charter"
  },
  projectCharterPMI: {
    title: "Gerar Project Charter com IA",
    description: "A IA vai gerar o contrato do projeto com meta SMART, escopo e stakeholders baseados no problema definido.",
    source: "Entendendo o Problema",
    sourceToolId: "brief"
  },
  stakeholderAnalysisPMI: {
    title: "Gerar Stakeholders com IA",
    description: "A IA vai organizar a equipe do projeto com papéis e responsabilidades baseados no Charter.",
    source: "Project Charter",
    sourceToolId: "charter"
  },
  stakeholderAdkar: {
    title: "Mapear Stakeholders com IA",
    description: "A IA vai identificar os principais stakeholders e sugerir o nível ADKAR inicial baseado no Charter.",
    source: "Project Charter",
    sourceToolId: "charter"
  },
  // MEDIR
  brainstorming: {
    title: "Gerar Brainstorming com IA",
    description: "A IA vai levantar causas técnicas baseadas no problema, processo e SIPOC do projeto.",
    source: "Entendendo o Problema e SIPOC",
    sourceToolId: "brief"
  },
  brainstormingImprove: {
    title: 'Gerar Brainstorming de Soluções',
    description: 'Obter os dados de Observação Direta e Análise Gráfica e Estatística e gerar Brainstorming de Soluções.',
    source: 'Observação Direta e Análise Gráfica e Estatística',
    sourceToolId: "directObservation"
  },
  measureIshikawa: {
    title: "Gerar Espinha de Peixe com IA",
    description: "A IA vai distribuir automaticamente todas as causas do Brainstorming nos 6Ms.",
    source: "Brainstorming",
    sourceToolId: "brainstorming"
  },
  dataCollection: {
    title: "Gerar Plano de Coleta com IA",
    description: "A IA vai definir o plano de coleta baseado nas causas priorizadas na Matriz Causa e Efeito.",
    source: "Matriz Causa e Efeito",
    sourceToolId: "measureMatrix"
  },
  dataNature: {
    title: 'Gerar Natureza dos Dados',
    description: 'Obter os dados de Plano de Coleta de Dados e gerar a Natureza dos Dados.',
    source: 'Plano de Coleta de Dados',
    sourceToolId: "dataCollection"
  },
  // ANALISAR
  measureMatrix: {
    title: "Gerar Matriz Causa e Efeito com IA",
    description: "A IA vai cruzar as causas da Espinha de Peixe com os KPIs definidos no Project Charter.",
    source: "Espinha de Peixe e Project Charter",
    sourceToolId: "measureIshikawa"
  },
  // MELHORAR
  plan5w2h: {
    title: "Gerar Plano de Ação 5W2H com IA",
    description: "A IA vai criar as ações com responsáveis e prazos baseados nas causas confirmadas e no Charter.",
    source: "FMEA e Project Charter",
    sourceToolId: "fmea"
  },
  // CONTROLAR
};

export const TOOLS_WITH_MIGRATE_BLOCK: Record<string, { source: string; sourceToolId: string }> = {
  improvementPlan: { source: "Cronograma Macro", sourceToolId: "timeline" },
  gut: { source: "Ideia de Projeto", sourceToolId: "improvementIdea" },
  rab: { source: "Ideia de Projeto", sourceToolId: "improvementIdea" },
  effortImpact: { source: "Brainstorming de Soluções", sourceToolId: "brainstormingImprove" },
  measureAdkar: { source: "ADKAR Definir", sourceToolId: "stakeholderAdkar" },
  analyzeAdkar: { source: "ADKAR Medir", sourceToolId: "measureAdkar" },
  improveAdkar: { source: "ADKAR Analisar", sourceToolId: "analyzeAdkar" },
  controlAdkar: { source: "ADKAR Melhorar", sourceToolId: "improveAdkar" },
  directObservation: { source: "Plano de Coleta de Dados", sourceToolId: "dataCollection" },
  statisticalAnalysis: { source: "Natureza dos Dados", sourceToolId: "dataNature" },
  controlPlan: { source: "Plano de Ação 5W2H", sourceToolId: "plan5w2h" },
};

// Destinos que possuem transformador escrito. Ligar uma ferramenta FORA dessas listas
// so criaria um botao que nao faz nada, entao o editor nao as oferece como destino.
//   migrate -> handleMigrateData (copia direta dos campos, sem IA)
//   ai      -> aiPrompts.ts (prompt por ferramenta)
export const MIGRATE_TARGETS = Object.keys(TOOLS_WITH_MIGRATE_BLOCK);
export const AI_TARGETS = [
  'brief', 'charter', 'sipoc', 'stakeholderAdkar', 'stakeholders', 'projectCharterPMI',
  'stakeholderAnalysisPMI', 'brainstorming', 'brainstormingImprove', 'measureIshikawa',
  'measureMatrix', 'dataCollection', 'dataNature', 'plan5w2h',
];

/** Todo toolId que pode ser DESTINO de uma ligacao, com o modo suportado. */
export const LINKABLE_TARGETS: Record<string, ToolLink['mode']> = {
  ...Object.fromEntries(AI_TARGETS.map((id) => [id, 'ai' as const])),
  // migrate vence quando a ferramenta tem os dois (ex.: nenhum hoje, mas o mapa manda)
  ...Object.fromEntries(MIGRATE_TARGETS.map((id) => [id, 'migrate' as const])),
};

/**
 * Sequencia linear das ferramentas DESTE projeto: ordem das fases da iniciativa
 * cruzada com a ordem das ferramentas dentro de cada fase. E a mesma ordem que o
 * aluno percorre na jornada, entao e ela que define o que e "anterior".
 */
export const getToolSequence = (
  initiative: Initiative | null | undefined,
  configs: InitiativePhaseConfig[] = []
): string[] => {
  if (!initiative?.phases) return [];
  const seq: string[] = [];
  for (const phase of initiative.phases) {
    const config = configs.find((c) => c.phaseId === phase.id);
    for (const toolId of config?.toolIds || []) {
      if (!seq.includes(toolId)) seq.push(toolId);
    }
  }
  return seq;
};

/**
 * Fontes que o editor pode oferecer para um destino: so ferramentas habilitadas
 * NESTE projeto e que vem ANTES do destino na sequencia. Isso torna impossivel,
 * por construcao, apontar pra ferramenta inexistente, pra frente ou pra si mesma
 * (e portanto impossivel criar ciclo).
 */
export const getEligibleSources = (
  targetToolId: string,
  initiative: Initiative | null | undefined,
  configs: InitiativePhaseConfig[] = []
): string[] => {
  const seq = getToolSequence(initiative, configs);
  const idx = seq.indexOf(targetToolId);
  return idx <= 0 ? [] : seq.slice(0, idx);
};

/**
 * Ligacao efetiva de uma ferramenta neste projeto.
 * Ordem: o que o projeto declara vence; sem declaracao, cai no mapa global de sempre.
 * Retorna null quando a ligacao declarada aponta pra fonte que nao esta mais no
 * projeto — nesse caso o card simplesmente nao aparece, em vez de quebrar.
 */
export const resolveToolLink = (
  toolId: string,
  initiative: Initiative | null | undefined,
  configs: InitiativePhaseConfig[] = []
): ToolLink | null => {
  const declared = initiative?.toolLinks?.[toolId];
  if (declared) {
    const seq = getToolSequence(initiative, configs);
    const from = (declared.from || []).filter((id) => seq.includes(id));
    return from.length > 0 ? { ...declared, from } : null;
  }

  const migrate = TOOLS_WITH_MIGRATE_BLOCK[toolId];
  if (migrate) return { from: [migrate.sourceToolId], mode: 'migrate' };

  const ai = TOOLS_WITH_AI_BLOCK[toolId];
  if (ai) return { from: [ai.sourceToolId], mode: 'ai' };

  return null;
};

/**
 * Fontes declaradas que nao existem mais no projeto — o editor mostra em vermelho
 * pro consultor corrigir. Nao e erro de runtime: `resolveToolLink` ja as ignora.
 */
export const getOrphanSources = (
  toolId: string,
  initiative: Initiative | null | undefined,
  configs: InitiativePhaseConfig[] = []
): string[] => {
  const declared = initiative?.toolLinks?.[toolId];
  if (!declared) return [];
  const seq = getToolSequence(initiative, configs);
  return (declared.from || []).filter((id) => !seq.includes(id));
};
