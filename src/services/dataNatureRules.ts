export type DataNatureType = 'Contínuo' | 'Discreto';

export type DataNatureRecommendation = {
  rank: number;
  tool: string;
  reason: string;
};

export type DataNatureAnalysisRole = 'principal' | 'estratificacao';

export const DATA_NATURE_TOOL_MATRIX: Record<string, string[]> = {
  'Contínuo-Contínuo': [
    'Diagrama de Dispersão',
    'Gráfico de tendência',
    'Regressão simples',
    'Regressão múltipla',
  ],
  'Contínuo-Discreto': ['Box Plot', 'Teste de Hipótese', 'ANOVA'],
  'Discreto-Contínuo': ['Regressão Logística (Binária/Ordinal/Nominal)'],
  'Discreto-Discreto': ['Histograma', 'Pareto', 'Chi Quadrado'],
};

type DataNatureContext = {
  variavelX?: string;
  variavelY?: string;
  contexto?: string;
};

const semAcentos = (valor: unknown) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export const normalizeDataNatureType = (valor: unknown): DataNatureType => {
  const normalizado = semAcentos(valor);
  return normalizado.startsWith('cont') ? 'Contínuo' : 'Discreto';
};

const normalizarVariavel = (variavel: any, origem: string) => {
  const base = variavel && typeof variavel === 'object' ? variavel : {};
  const sourceName = String(origem || base.sourceName || base.name || '').trim();
  const name = String(base.name || sourceName).trim();
  const type = normalizeDataNatureType(base.type);
  const originalType = base.originalType
    ? normalizeDataNatureType(base.originalType)
    : type;

  return {
    ...base,
    sourceName,
    name,
    type,
    originalType,
    measurement: String(base.measurement || '').trim(),
    description: String(base.description || '').trim(),
  };
};

const normalizarNomeFerramenta = (valor: unknown, permitidas: string[]) => {
  const alvo = semAcentos(valor);
  return permitidas.find((ferramenta) => semAcentos(ferramenta) === alvo) || '';
};

const normalizarRecomendacoes = (analysis: any, permitidas: string[]) => {
  const estruturadas = Array.isArray(analysis?.recommendations) ? analysis.recommendations : [];
  // Dados antigos só possuem recommendedTools na ordem fixa da matriz. Isso não
  // representa uma priorização feita pela IA, portanto não inventamos destaques.
  if (estruturadas.length === 0) return [];

  const listaLegada = Array.isArray(analysis?.recommendedTools) ? analysis.recommendedTools : [];
  const vistas = new Set<string>();
  const recommendations: DataNatureRecommendation[] = [];

  const adicionar = (toolValue: unknown, reasonValue: unknown) => {
    const tool = normalizarNomeFerramenta(toolValue, permitidas);
    // Uma recomendacao so. Oferecer 2ª e 3ª opcao devolve a decisao pro aluno,
    // que e justamente o que ele veio aqui resolver. As demais ferramentas do
    // quadrante seguem visiveis na matriz, sem destaque.
    if (!tool || vistas.has(tool) || recommendations.length >= 1) return;
    vistas.add(tool);
    recommendations.push({
      rank: recommendations.length + 1,
      tool,
      reason: String(reasonValue || '').trim(),
    });
  };

  estruturadas
    .slice()
    .sort((a: any, b: any) => Number(a?.rank || 99) - Number(b?.rank || 99))
    .forEach((item: any) => adicionar(item?.tool, item?.reason));
  listaLegada.forEach((tool: unknown) => adicionar(tool, ''));
  permitidas.forEach((tool) => adicionar(tool, ''));

  return recommendations;
};

const normalizarPapelDaAnalise = (valor: unknown): DataNatureAnalysisRole => {
  const normalizado = semAcentos(valor);
  return normalizado.includes('estrat') || normalizado.includes('complement')
    ? 'estratificacao'
    : 'principal';
};

/**
 * Valida apenas o contrato da resposta da IA. A interpretação semântica de
 * cada X e Y permanece geral e orientada pelas transcrições no prompt; não há
 * regras especiais para palavras, setores ou exemplos determinados.
 */
export const normalizeDataNatureData = (data: any, context: DataNatureContext = {}) => {
  const normalized = data && typeof data === 'object' ? { ...data } : {};
  const analyses = Array.isArray(normalized.analyses) ? normalized.analyses : [];

  normalized.analyses = analyses.map((analysis: any, index: number) => {
    // A análise principal usa o Y do projeto. Uma análise complementar pode ter
    // um Y local derivado da própria causa (ex.: volume por analista), por isso a
    // resposta da IA vence e o contexto entra somente como fallback.
    const rawY = String(analysis?.variableY?.sourceName || context.variavelY || analysis?.variableY?.name || '').trim();
    const rawX = String(analysis?.variableX?.sourceName || context.variavelX || analysis?.variableX?.name || '').trim();
    const variableY = normalizarVariavel(analysis?.variableY, rawY);
    const variableX = normalizarVariavel(analysis?.variableX, rawX);
    const key = `${variableY.type}-${variableX.type}`;
    const permitidas = DATA_NATURE_TOOL_MATRIX[key] || [];
    const recommendations = normalizarRecomendacoes(analysis, permitidas);
    const analysisRole = normalizarPapelDaAnalise(analysis?.analysisRole);

    return {
      ...analysis,
      id: String(analysis?.id || index + 1),
      analysisRole,
      sourceCause: String(analysis?.sourceCause || context.variavelX || variableX.sourceName || '').trim(),
      projectY: String(analysis?.projectY || context.variavelY || '').trim(),
      question: String(analysis?.question || '').trim(),
      // O que representa UMA linha da planilha. X e Y precisam ser medidos
      // nessa mesma granularidade, senao a correlacao encontrada e falsa.
      observationUnit: String(analysis?.observationUnit || '').trim(),
      rootCauseConfirmed: analysis?.rootCauseConfirmed === true,
      variableY,
      variableX,
      quadrant: `Y ${variableY.type} / X ${variableX.type}`,
      // A matriz inteira do quadrante permanece visível; recommendations apenas
      // define quais ferramentas recebem destaque como 1ª e 2ª opções.
      recommendedTools: [...permitidas],
      recommendations,
      explanation: String(analysis?.explanation || '').trim(),
    };
  });

  return normalized;
};
