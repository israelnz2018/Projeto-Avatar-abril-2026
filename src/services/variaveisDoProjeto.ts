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

/** Causas da Matriz Causa e Efeito ja em maos: cada linha da matriz e um X. */
export const causasDaMatriz = (matriz: any): VariavelDoProjeto[] => {
  const dados = matriz?.toolData || matriz;
  const causas = Array.isArray(dados?.causes) ? dados.causes : [];
  return causas
    .map((c: any) => ({
      variable: String(c?.name || '').trim(),
      definition: '',
      origem: 'Matriz Causa e Efeito',
    }))
    .filter((v: VariavelDoProjeto) => v.variable);
};

/** Qualitativas de um Plano de Coleta ja em maos. */
export const qualitativasDoPlano = (plano: any): VariavelDoProjeto[] => {
  const dados = plano?.toolData || plano;
  const itens = Array.isArray(dados?.items) ? dados.items : [];
  return itens
    .filter((item: any) => String(item?.data?.method || '').toLowerCase().includes('qualitativa'))
    .map((item: any) => ({
      variable: String(item?.data?.variable || '').trim(),
      definition: String(item?.data?.operationalDefinition || ''),
      origem: 'Plano de Coleta',
    }))
    .filter((v: VariavelDoProjeto) => v.variable);
};

/**
 * Le a lista de X de QUALQUER ferramenta de origem, sem exigir ordem nenhuma.
 *
 * A regra da adjacencia continua valendo: quem decide qual ferramenta alimenta
 * qual e o consultor, e so a vizinha imediata transfere. O que esta funcao faz e
 * garantir que a lista NAO MORRA no caminho — cada ferramenta repassa adiante o
 * que RECEBEU (`variaveisDisponiveis`) somado ao que ela mesma PRODUZIU.
 *
 * Assim a mesma lista de X atravessa a cadeia, um passo de cada vez:
 *   Espinha de Peixe -> Observacao Direta -> Natureza dos Dados -> 5 Porques
 * sem pular ferramenta e sem sequencia fixa no codigo.
 */
export const variaveisDaOrigem = (origem: any): VariavelDoProjeto[] => {
  const dados = origem?.toolData || origem;
  if (!dados) return [];

  const recebidas: VariavelDoProjeto[] = (Array.isArray(dados.variaveisDisponiveis) ? dados.variaveisDisponiveis : [])
    .map((v: any) => ({
      variable: String(v?.variable ?? '').trim(),
      definition: String(v?.definition ?? ''),
      origem: String(v?.origem ?? ''),
    }));

  const observadas: VariavelDoProjeto[] = (Array.isArray(dados.observations) ? dados.observations : [])
    .map((o: any) => ({
      variable: String(o?.variable ?? '').trim(),
      definition: String(o?.operationalDefinition ?? ''),
      origem: 'Observacao Direta',
      observada: true,
      evidencia: String(o?.observationDescription ?? '').trim(),
    }));

  const dosPorques: VariavelDoProjeto[] = (Array.isArray(dados.chains) ? dados.chains : [])
    .map((c: any) => ({ variable: String(c?.problem ?? '').trim(), definition: '', origem: '5 Porques' }));

  const dasAnalises: VariavelDoProjeto[] = (Array.isArray(dados.analyses) ? dados.analyses : [])
    .map((a: any) => ({
      variable: String(a?.variableX?.name ?? a?.variable ?? '').trim(),
      definition: '',
      origem: 'Natureza dos Dados',
    }));

  const tudo = [
    ...recebidas,
    ...causasDoIshikawa(dados),
    ...causasDaMatriz(dados),
    ...qualitativasDoPlano(dados),
    ...observadas,
    ...dosPorques,
    ...dasAnalises,
  ].filter((v) => v.variable);

  // Sem repetir: a primeira aparicao vence, entao o que veio recebido mantem a
  // origem original em vez de virar "Observacao Direta" no meio do caminho.
  const vistas = new Set<string>();
  return tudo.filter((v) => {
    if (vistas.has(v.variable)) return false;
    vistas.add(v.variable);
    return true;
  });
};

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
