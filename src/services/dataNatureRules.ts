export type DataNatureType = 'Contínuo' | 'Discreto';

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

/**
 * Valida apenas o contrato da resposta da IA. A interpretação semântica de
 * cada X e Y permanece geral e orientada pelas transcrições no prompt; não há
 * regras especiais para palavras, setores ou exemplos determinados.
 */
export const normalizeDataNatureData = (data: any, context: DataNatureContext = {}) => {
  const normalized = data && typeof data === 'object' ? { ...data } : {};
  const analyses = Array.isArray(normalized.analyses) ? normalized.analyses : [];

  normalized.analyses = analyses.map((analysis: any, index: number) => {
    const rawY = String(context.variavelY || analysis?.variableY?.sourceName || analysis?.variableY?.name || '').trim();
    const rawX = String(context.variavelX || analysis?.variableX?.sourceName || analysis?.variableX?.name || '').trim();
    const variableY = normalizarVariavel(analysis?.variableY, rawY);
    const variableX = normalizarVariavel(analysis?.variableX, rawX);
    const key = `${variableY.type}-${variableX.type}`;

    return {
      ...analysis,
      id: String(analysis?.id || index + 1),
      variableY,
      variableX,
      quadrant: `Y ${variableY.type} / X ${variableX.type}`,
      recommendedTools: [...(DATA_NATURE_TOOL_MATRIX[key] || [])],
      explanation: String(analysis?.explanation || '').trim(),
    };
  });

  return normalized;
};
