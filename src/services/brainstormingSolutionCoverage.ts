export interface ValidatedCauseForSolution {
  sourceId: string;
  x: string;
}

const normalizar = (value: any) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('pt-BR');

const codigoX = (value: any) => normalizar(value).match(/^x\s*(\d+(?:\.\d+)?)(?=\s*:|\s|$)/)?.[1] || '';

/**
 * Faz a categoria gerada pela IA apontar para o texto EXATO do X confirmado.
 * A tela filtra por esse texto; sem a normalização, "x6" e
 * "X6: Dados fiscais..." eram tratados como causas diferentes.
 */
export const alinharIdeiasAsCausas = (ideas: any[], causes: ValidatedCauseForSolution[]): any[] => {
  const porId = new Map(causes.map((cause) => [String(cause.sourceId), cause]));
  const porTexto = new Map(causes.map((cause) => [normalizar(cause.x), cause]));
  const porCodigo = new Map<string, ValidatedCauseForSolution>();
  causes.forEach((cause) => {
    const code = codigoX(cause.x);
    if (code) porCodigo.set(code, cause);
  });

  return (Array.isArray(ideas) ? ideas : []).map((idea) => {
    const id = String(idea?.causeSourceId || '');
    const category = normalizar(idea?.category);
    const code = codigoX(idea?.category);
    const cause = porId.get(id) || porTexto.get(category) || (code ? porCodigo.get(code) : undefined);
    return cause ? { ...idea, causeSourceId: cause.sourceId, category: cause.x } : idea;
  });
};

export const causasSemIdeia = (
  ideas: any[],
  causes: ValidatedCauseForSolution[],
): ValidatedCauseForSolution[] => {
  const aligned = alinharIdeiasAsCausas(ideas, causes);
  const covered = new Set(aligned.map((idea) => String(idea?.causeSourceId || '')));
  return causes.filter((cause) => !covered.has(String(cause.sourceId)));
};
