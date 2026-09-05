/**
 * A lista de X's do projeto, compartilhada pela cadeia:
 *
 *   Espinha de Peixe  ->  Observacao Direta  ->  Natureza dos Dados
 *
 * As tres ferramentas trabalham sobre a MESMA lista de variaveis (as causas
 * levantadas no Ishikawa). Antes cada uma lia de um lugar diferente: a Observacao
 * Direta so enxergava o Plano de Coleta e a Natureza dos Dados so enxergava o que
 * ja tinha sido observado. Resultado: a lista morria no primeiro passo.
 *
 * Aqui a leitura fica num lugar so, entao a mesma lista percorre as tres.
 */

export interface VariavelDoProjeto {
  /** Texto da variavel — e o que identifica: nao repetimos a mesma duas vezes. */
  variable: string;
  /** Definicao operacional, quando a ferramenta de origem tiver. */
  definition: string;
  /** De onde veio: categoria do 6M, "Plano de Coleta" ou "Observacao Direta". */
  origem: string;
  /** Ja foi observada na Observacao Direta? Usado pra marcar na lista. */
  observada?: boolean;
  /** Evidencia registrada na Observacao Direta, quando houver. */
  evidencia?: string;
}

/**
 * Acha o dado de uma ferramenta sem saber em que fase ela esta.
 *
 * A chave pode ser `toolId` puro ou `${fase}_${toolId}` (dado antigo). Quando
 * existe nos dois lugares, vence o mais recente — o mesmo criterio que o resto
 * do app usa, via `__metadata`.
 */
export const acharDadoDaFerramenta = (allProjectData: any, toolId: string): any => {
  const chave = Object.keys(allProjectData || {})
    .filter((k) => k === toolId || k.endsWith(`_${toolId}`))
    .sort((a, b) => {
      const meta = allProjectData?.__metadata || {};
      return (meta[b] || 0) - (meta[a] || 0);
    })[0];
  if (!chave) return null;
  const bruto = allProjectData[chave];
  return bruto?.toolData || bruto;
};

/**
 * Causas de UM dado de Espinha de Peixe ja em maos: cada causa de cada categoria
 * (6M) vira um X. Existe separada porque quem migra ja recebeu o dado da origem
 * e nao tem o projeto inteiro pra procurar por chave.
 */
export const causasDoIshikawa = (ishikawa: any): VariavelDoProjeto[] => {
  const dados = ishikawa?.toolData || ishikawa;
  const causas = dados?.causes || {};
  const lista: VariavelDoProjeto[] = [];
  for (const [categoria, arr] of Object.entries(causas)) {
    for (const causa of Array.isArray(arr) ? arr : []) {
      const texto = String(causa ?? '').trim();
      if (texto) lista.push({ variable: texto, definition: '', origem: String(categoria) });
    }
  }
  return lista;
};

/** Causas da Espinha de Peixe do projeto, achando a ferramenta pela chave. */
export const variaveisDaEspinhaDePeixe = (allProjectData: any): VariavelDoProjeto[] =>
  causasDoIshikawa(acharDadoDaFerramenta(allProjectData, 'measureIshikawa'));

/** Variaveis marcadas como Qualitativa no Plano de Coleta. */
export const variaveisQualitativasDoPlano = (allProjectData: any): VariavelDoProjeto[] => {
  const plano = acharDadoDaFerramenta(allProjectData, 'dataCollection');
  const itens = Array.isArray(plano?.items) ? plano.items : [];
  return itens
    .filter((item: any) => String(item?.data?.method || '').toLowerCase() === 'qualitativa')
    .map((item: any) => ({
      variable: String(item?.data?.variable || '').trim(),
      definition: String(item?.data?.operationalDefinition || ''),
      origem: 'Plano de Coleta',
    }))
    .filter((v: VariavelDoProjeto) => v.variable);
};

/** O que ja foi registrado na Observacao Direta, com a evidencia de cada um. */
export const variaveisObservadas = (allProjectData: any): VariavelDoProjeto[] => {
  const obs = acharDadoDaFerramenta(allProjectData, 'directObservation');
  const lista = Array.isArray(obs?.observations) ? obs.observations : [];
  return lista
    .map((o: any) => ({
      variable: String(o?.variable || '').trim(),
      definition: String(o?.operationalDefinition || ''),
      origem: 'Observacao Direta',
      observada: true,
      evidencia: String(o?.observationDescription || '').trim(),
    }))
    .filter((v: VariavelDoProjeto) => v.variable);
};

/**
 * A lista completa de X's do projeto, sem repetir.
 *
 * Ordem de preferencia quando a mesma variavel aparece em mais de uma fonte: o
 * registro da Observacao Direta vence, porque so ele carrega a evidencia.
 */
export const todasAsVariaveis = (allProjectData: any): VariavelDoProjeto[] => {
  const observadas = variaveisObservadas(allProjectData);
  const jaVistas = new Map<string, VariavelDoProjeto>();

  for (const v of observadas) jaVistas.set(v.variable, v);

  for (const v of [...variaveisDaEspinhaDePeixe(allProjectData), ...variaveisQualitativasDoPlano(allProjectData)]) {
    const existente = jaVistas.get(v.variable);
    if (!existente) {
      jaVistas.set(v.variable, v);
    } else if (existente.origem === 'Observacao Direta' && v.origem !== 'Observacao Direta') {
      // Mantem a evidencia, mas guarda a origem real (a categoria do 6M).
      jaVistas.set(v.variable, { ...existente, origem: v.origem });
    }
  }

  return [...jaVistas.values()];
};
