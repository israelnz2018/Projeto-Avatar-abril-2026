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
  /** Metodo de coleta (Quantitativa/Qualitativa), quando vem do Plano de Coleta. */
  metodo?: string;
  /** Confirmação humana feita na ferramenta que investigou esta variável. */
  causaRaiz?: boolean;
}

/**
 * O Y — o EFEITO que o projeto quer mudar.
 *
 * Viaja junto dos X pela cadeia, mas em lista SEPARADA de proposito: se o Y
 * entrasse no mesmo dropdown, o aluno acabaria investigando o efeito como se
 * fosse causa. Aqui ele e contexto, nao item de trabalho.
 *
 * Cada ferramenta guarda o Y em um lugar diferente:
 *   Espinha de Peixe        -> `problem`, a cabeca do peixe (sempre 1)
 *   Matriz Causa e Efeito   -> `outputs[]`, com peso de importancia (varios)
 */
export interface VariavelY {
  variable: string;
  /** Peso do Y na Matriz Causa e Efeito. Ausente na Espinha de Peixe. */
  importancia?: number;
  origem: string;
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

/**
 * Causas da Matriz Causa e Efeito ja em maos: SO as marcadas com o checkbox
 * "selected" — e o proprio texto da ferramenta que diz o que ele significa:
 * "Selecione os itens que serao levados para a etapa de Analise de Causa Raiz".
 * Nao filtrar aqui seria levar adiante causa que o aluno decidiu NAO priorizar.
 */
export const causasDaMatriz = (matriz: any): VariavelDoProjeto[] => {
  const dados = matriz?.toolData || matriz;
  const causas = Array.isArray(dados?.causes) ? dados.causes : [];
  return causas
    .filter((c: any) => c?.selected === true)
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
 * TODAS as variaveis do Plano de Coleta, com definicao operacional e metodo.
 *
 * Diferente de `qualitativasDoPlano`, que filtra so as qualitativas pra
 * Observacao Direta: quando o Plano e um ELO da cadeia, ele repassa tudo.
 */
export const variaveisDoPlanoDeColeta = (plano: any): VariavelDoProjeto[] => {
  const dados = plano?.toolData || plano;
  const itens = Array.isArray(dados?.items) ? dados.items : [];
  return itens
    .map((item: any) => ({
      variable: String(item?.data?.variable || '').trim(),
      definition: String(item?.data?.operationalDefinition || ''),
      origem: 'Plano de Coleta',
      metodo: String(item?.data?.method || ''),
    }))
    .filter((v: VariavelDoProjeto) => v.variable);
};

/**
 * Le a lista de Y de QUALQUER ferramenta de origem — o efeito que o projeto
 * quer mudar. Anda junto dos X pela cadeia, pelo mesmo mecanismo: o que a
 * ferramenta RECEBEU (`variaveisY`) mais o que ela mesma define.
 *
 * Sem isso, a Natureza dos Dados teria que adivinhar o Y do Brief a cada
 * analise — e como o Brief e texto corrido, sairia uma variacao diferente do Y
 * toda vez. Vindo da origem, o Y e o mesmo na cadeia inteira.
 */
export const variaveisYDaOrigem = (origem: any): VariavelY[] => {
  const dados = origem?.toolData || origem;
  if (!dados) return [];

  const recebidos: VariavelY[] = (Array.isArray(dados.variaveisY) ? dados.variaveisY : [])
    .map((y: any) => ({
      variable: String(y?.variable ?? '').trim(),
      importancia: typeof y?.importancia === 'number' ? y.importancia : undefined,
      origem: String(y?.origem ?? ''),
    }));

  // Espinha de Peixe: a cabeca do peixe e o Y, e e sempre um so.
  const cabecaDoPeixe: VariavelY[] = String(dados.problem ?? '').trim()
    ? [{ variable: String(dados.problem).trim(), origem: 'Espinha de Peixe' }]
    : [];

  // Matriz Causa e Efeito: varios Y, cada um com seu peso de importancia.
  const saidasDaMatriz: VariavelY[] = (Array.isArray(dados.outputs) ? dados.outputs : [])
    .map((o: any) => ({
      variable: String(o?.name ?? '').trim(),
      importancia: typeof o?.importance === 'number' ? o.importance : undefined,
      origem: 'Matriz Causa e Efeito',
    }));

  const tudo = [...recebidos, ...cabecaDoPeixe, ...saidasDaMatriz].filter((y) => y.variable);
  const vistos = new Set<string>();
  return tudo.filter((y) => {
    if (vistos.has(y.variable)) return false;
    vistos.add(y.variable);
    return true;
  });
};

/**
 * Le a lista de X de QUALQUER ferramenta de origem, sem exigir ordem nenhuma.
 *
 * A regra da adjacencia continua valendo: quem decide qual ferramenta alimenta
 * qual e o consultor, e so a vizinha imediata transfere. O que esta funcao faz e
 * garantir que a lista NAO MORRA no caminho — cada ferramenta repassa adiante o
 * que RECEBEU (`variaveisDisponiveis`) mais o que estiver preenchido nela.
 *
 * ATENCAO ao conceito: quem LEVANTA X sao as ferramentas de causa (Espinha de
 * Peixe, Matriz Causa e Efeito). Observacao Direta, Natureza dos Dados e 5
 * Porques nao geram X — elas INVESTIGAM o X que receberam. Por isso a ordem de
 * leitura abaixo poe `recebidas` primeiro: o X mantem a origem de quem o
 * levantou, e o que essas tres acrescentam so entra quando o aluno digitou uma
 * variavel nova a mao (todas as tres permitem, como a Espinha de Peixe permite).
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
      causaRaiz: o?.identifiedCause === true,
    }));

  const dosPorques: VariavelDoProjeto[] = (Array.isArray(dados.chains) ? dados.chains : [])
    .map((c: any) => ({ variable: String(c?.problem ?? '').trim(), definition: '', origem: '5 Porques' }));

  const dasAnalises: VariavelDoProjeto[] = (Array.isArray(dados.analyses) ? dados.analyses : [])
    .map((a: any) => ({
      variable: String(a?.variableX?.name ?? a?.variable ?? '').trim(),
      definition: String(a?.variableX?.measurement ?? ''),
      origem: 'Natureza dos Dados',
      causaRaiz: a?.rootCauseConfirmed === true,
    }));

  const tudo = [
    ...recebidas,
    ...causasDoIshikawa(dados),
    ...causasDaMatriz(dados),
    // Plano de Coleta como ELO DA CADEIA repassa TODAS as variaveis, nao so as
    // qualitativas: se ele vem depois da Matriz, e dele que sai a lista pras
    // proximas, e ele ainda acrescenta a definicao operacional e o metodo de
    // cada uma — que e o que ajuda a classificar Continuo/Discreto la na frente.
    ...variaveisDoPlanoDeColeta(dados),
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
      causaRaiz: o?.identifiedCause === true,
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
