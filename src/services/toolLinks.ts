import { Initiative, InitiativePhaseConfig, ToolLink } from '../types';

// Ligacoes entre ferramentas: qual ferramenta passa os dados dela pra qual.
//
// Quem decide e o CONSULTOR, projeto a projeto, pelo checkbox em "Ordem de Exibicao"
// (ProjectToolsConfig). Nao existe ligacao por padrao: ferramenta so recebe dados de
// outra se o consultor marcou. Antes havia um mapa global hardcoded que ligava as
// ferramentas por conta propria — ele foi removido de proposito.
//
// Uma ferramenta so pode transferir pra ferramenta IMEDIATAMENTE seguinte na sequencia
// do projeto, e a sequencia atravessa fase.

/** Destinos que sabem RECEBER dados por copia direta (handleMigrateData). */
export const MIGRATE_TARGETS = [
  'improvementPlan', 'gut', 'rab', 'effortImpact',
  'measureAdkar', 'analyzeAdkar', 'improveAdkar', 'controlAdkar',
  'directObservation', 'statisticalAnalysis', 'controlPlan',
  // Recebem o esqueleto do fluxo a partir do SIPOC (services/sipocParaProcesso.ts).
  'processMap', 'bpmnProcessMap',
];

/** Destinos que sabem RECEBER dados via IA (prompt proprio em aiPrompts.ts). */
export const AI_TARGETS = [
  'brief', 'charter', 'sipoc', 'stakeholderAdkar', 'stakeholders', 'projectCharterPMI',
  'stakeholderAnalysisPMI', 'brainstorming', 'brainstormingImprove', 'measureIshikawa',
  'measureMatrix', 'dataCollection', 'dataNature', 'plan5w2h',
];

/**
 * Todo toolId que pode RECEBER dados, e como. Ferramenta fora daqui nao tem
 * transformador escrito: oferecer o checkbox criaria um botao que nao faz nada,
 * entao o painel nao oferece.
 */
export const LINKABLE_TARGETS: Record<string, ToolLink['mode']> = {
  ...Object.fromEntries(AI_TARGETS.map((id) => [id, 'ai' as const])),
  ...Object.fromEntries(MIGRATE_TARGETS.map((id) => [id, 'migrate' as const])),
};

/**
 * Sequencia linear das ferramentas DESTE projeto: ordem das fases da iniciativa
 * cruzada com a ordem das ferramentas dentro de cada fase. E a mesma ordem que o
 * aluno percorre na jornada, e ATRAVESSA a fase: a ultima ferramenta de uma fase e
 * seguida pela primeira da fase seguinte. E ela que define quem e a "de baixo" no
 * checkbox de transferencia.
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
 * Mesma ordem da sequencia, mas COM REPETICAO: cada aparicao da ferramenta numa
 * fase e uma posicao propria.
 *
 * `getToolSequence` deduplica, e isso quebra a adjacencia de quem entra duas vezes
 * na trilha: com SIPOC em Definir e de novo em Medir, a segunda aparicao sumia da
 * conta e a "de baixo" do SIPOC continuava sendo a vizinha da PRIMEIRA aparicao.
 * Resultado: o consultor colocava o SIPOC logo acima do BPMN de proposito e o
 * checkbox de transferencia nem aparecia. A vizinhanca precisa ser por POSICAO.
 */
export const getToolPositions = (
  initiative: Initiative | null | undefined,
  configs: InitiativePhaseConfig[] = []
): { toolId: string; phaseId: string }[] => {
  if (!initiative?.phases) return [];
  const posicoes: { toolId: string; phaseId: string }[] = [];
  for (const phase of initiative.phases) {
    const config = configs.find((c) => c.phaseId === phase.id);
    for (const toolId of config?.toolIds || []) posicoes.push({ toolId, phaseId: phase.id });
  }
  return posicoes;
};

/** Existe ALGUMA posicao em que `origem` e seguida imediatamente por `destino`? */
export const saoVizinhas = (
  origem: string | undefined,
  destino: string,
  posicoes: { toolId: string }[]
): boolean =>
  !!origem && posicoes.some((p, i) => p.toolId === origem && posicoes[i + 1]?.toolId === destino);

/**
 * Ligacao efetiva de uma ferramenta neste projeto — so o que o consultor declarou.
 * Sem declaracao, retorna null e a ferramenta nao mostra botao de gerar/migrar.
 * Fonte que saiu do projeto tambem devolve null, em vez de quebrar.
 */
export const resolveToolLink = (
  toolId: string,
  initiative: Initiative | null | undefined,
  configs: InitiativePhaseConfig[] = []
): ToolLink | null => {
  const declared = initiative?.toolLinks?.[toolId];
  if (!declared) return null;

  const seq = getToolSequence(initiative, configs);
  const from = (declared.from || []).filter((id) => seq.includes(id));
  return from.length > 0 ? { ...declared, from } : null;
};
