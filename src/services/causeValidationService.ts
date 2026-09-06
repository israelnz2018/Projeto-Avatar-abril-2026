/**
 * Evidências que podem ser usadas na validação X -> Y.
 *
 * Esta camada é deliberadamente somente de leitura: ela não altera o formato
 * de nenhuma ferramenta existente. A matriz de validação salva apenas uma
 * cópia derivada, com a decisão humana e a indicação de uso no brainstorming.
 */

export type CauseDecision = 'contribui' | 'nao_contribui' | 'inconclusivo' | null;

export interface CauseEvidenceCandidate {
  sourceId: string;
  sourceLabel: string;
  x: string;
  y: string;
  analysis: string;
  evidence: string;
  origin: 'Data Analysis' | 'Projetos';
}

export interface CauseValidationRow extends CauseEvidenceCandidate {
  aiDecision?: Exclude<CauseDecision, null>;
  aiReason?: string;
  confidence?: 'alta' | 'media' | 'baixa';
  humanDecision?: CauseDecision;
  confirmed?: boolean;
  includeInBrainstorming?: boolean;
}

const unwrap = (value: any): any => value?.toolData || value || {};

const cleanText = (value: any): string => String(value ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const valueText = (value: any): string => {
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return cleanText(value.name || value.label || value.variable || value.text);
  return cleanText(value);
};

const getField = (obj: any, names: string[]): string => {
  for (const name of names) {
    const value = valueText(obj?.[name]);
    if (value) return value;
  }
  return '';
};

const sourceData = (allData: any, toolKey: string): any => {
  if (!allData) return null;
  const keys = Object.keys(allData).filter((key) => key === toolKey || key.endsWith(`_${toolKey}`));
  if (!keys.length) return null;
  const metadata = allData.__metadata || {};
  const chosen = keys.reduce((best, key) =>
    (metadata[key] || 0) > (metadata[best] || 0) ? key : best, keys[0]);
  return unwrap(allData[chosen]);
};

const projectY = (allData: any): string => {
  const brief = sourceData(allData, 'brief');
  return getField(brief, ['y_indicator', 'indicatorY', 'indicadorY', 'y', 'problemIndicator'])
    || getField(brief?.answers, ['q7', 'q8', 'q2'])
    || 'Indicador Y do projeto';
};

const makeId = (source: string, id: any): string => {
  const base = `${source}-${String(id ?? 'item')}`;
  return base.toLowerCase().replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

const pushCandidate = (
  rows: CauseEvidenceCandidate[],
  item: Omit<CauseEvidenceCandidate, 'sourceId'> & { id: string }
) => {
  const x = cleanText(item.x);
  if (!x) return;
  rows.push({
    sourceId: item.id,
    sourceLabel: item.sourceLabel,
    x,
    y: cleanText(item.y),
    analysis: cleanText(item.analysis) || 'Análise registrada',
    evidence: cleanText(item.evidence) || 'Sem interpretação escrita.',
    origin: item.origin,
  });
};

const extractAnalysisColumn = (params: any, names: string[]): string => getField(params, names);

/** Retorna todas as evidências registradas no projeto, sem alterar sua origem. */
export const buildCauseEvidenceCandidates = (allData: any): CauseEvidenceCandidate[] => {
  const rows: CauseEvidenceCandidate[] = [];
  const yProjeto = projectY(allData);

  // 1) Análises feitas na aba Data Analysis.
  const dataAnalysis = sourceData(allData, 'dataAnalysis');
  const analises = Array.isArray(dataAnalysis?.analises) ? dataAnalysis.analises : [];
  analises.forEach((analysis: any, index: number) => {
    const params = analysis?.toolParams || {};
    const x = extractAnalysisColumn(params, ['coluna_x', 'lista_x', 'x', 'X', 'variavelX', 'variableX']);
    const y = extractAnalysisColumn(params, ['coluna_y', 'lista_y', 'y', 'Y', 'variavelY', 'variableY']) || yProjeto;
    pushCandidate(rows, {
      id: makeId('data-analysis', analysis?.id || index),
      sourceLabel: 'Data Analysis',
      origin: 'Data Analysis',
      x: x || y,
      y,
      analysis: analysis?.tool || 'Análise estatística',
      evidence: analysis?.interpretacao || analysis?.analise || 'Resultado salvo, sem interpretação escrita.',
    });
  });

  // 2) Análises estatísticas geradas dentro de Projetos.
  const statistical = sourceData(allData, 'statisticalAnalysis');
  const statisticalRows = Array.isArray(statistical?.analyses) ? statistical.analyses : [];
  statisticalRows.forEach((analysis: any, index: number) => {
    pushCandidate(rows, {
      id: makeId('project-analysis', analysis?.id || index),
      sourceLabel: 'Análise Gráfica e Estatística',
      origin: 'Projetos',
      x: analysis?.variable || analysis?.x || '',
      y: analysis?.y || yProjeto,
      analysis: analysis?.analysisType || 'Análise estatística',
      evidence: analysis?.interpretation || 'Análise sem interpretação escrita.',
    });
  });

  // 3) Natureza dos Dados: entra como planejamento/recomendação, nunca como
  // prova estatística. A IA deve marcar como inconclusivo se não houver evidência.
  const nature = sourceData(allData, 'dataNature');
  const natureRows = Array.isArray(nature?.analyses) ? nature.analyses : [];

  // Quantas analises cada causa gerou. Duas viram x3.1 e x3.2 — a MESMA
  // numeracao usada na Natureza dos Dados, pra variavel traduzida nao aparecer
  // aqui como se tivesse surgido do nada.
  const causaDaAnalise = (a: any) => String(a?.sourceCause || a?.variableX?.sourceName || '').trim();
  const totalPorCausa = new Map<string, number>();
  natureRows.forEach((a: any) => {
    const causa = causaDaAnalise(a);
    totalPorCausa.set(causa, (totalPorCausa.get(causa) || 0) + 1);
  });
  const jaVistas = new Map<string, number>();

  natureRows.forEach((analysis: any, index: number) => {
    const x = analysis?.variableX?.name || analysis?.variableX?.sourceName || '';
    const y = analysis?.variableY?.name || analysis?.variableY?.sourceName || yProjeto;
    const tools = (analysis?.recommendations || analysis?.recommendedTools || [])
      .map((tool: any) => typeof tool === 'string' ? tool : tool?.tool)
      .filter(Boolean)
      .join(', ');
    // A Natureza dos Dados TRADUZ a causa numa grandeza mensuravel: "x3: Equipe
    // sem treinamento" vira "Carga horaria de treinamento em ERP". Sem mostrar a
    // causa de origem, essas linhas aparecem aqui soltas, sem o x3, e o aluno nao
    // liga uma coisa na outra.
    const causaOriginal = causaDaAnalise(analysis);
    const ehEstratificacao = analysis?.analysisRole === 'estratificacao';

    const numero = causaOriginal.match(/x\s*(\d+)/i)?.[1] || '';
    const posicao = (jaVistas.get(causaOriginal) || 0) + 1;
    jaVistas.set(causaOriginal, posicao);
    const rotulo = numero
      ? ((totalPorCausa.get(causaOriginal) || 1) > 1 ? `x${numero}.${posicao}` : `x${numero}`)
      : '';
    const xRotulado = rotulo && !x.toLowerCase().startsWith(rotulo.toLowerCase())
      ? `${rotulo}: ${x}`
      : x;

    pushCandidate(rows, {
      id: makeId('data-nature', analysis?.id || `${x}-${y}-${index}`),
      sourceLabel: causaOriginal && causaOriginal !== x
        ? `Natureza dos Dados — vem de ${causaOriginal}`
        : 'Natureza dos Dados',
      origin: 'Projetos',
      x: xRotulado,
      y,
      analysis: ehEstratificacao ? 'Estratificação planejada' : 'Análise planejada',
      evidence: `Ferramenta indicada: ${tools || 'não informada'}. Análise ainda não feita.`,
    });
  });

  // 4) Evidências qualitativas que ajudam a interpretar o resultado estatístico.
  const observation = sourceData(allData, 'directObservation');
  (observation?.observations || []).forEach((item: any, index: number) => {
    pushCandidate(rows, {
      id: makeId('observation', item?.id || index),
      sourceLabel: 'Observação Direta (Gemba)',
      origin: 'Projetos',
      x: item?.variable || item?.variavel || '',
      y: item?.variableY || yProjeto,
      analysis: 'Evidência observada no processo',
      evidence: item?.observationDescription || item?.observation || item?.evidence || '',
    });
  });

  const whys = sourceData(allData, 'fiveWhys');
  (whys?.chains || []).forEach((item: any, index: number) => {
    pushCandidate(rows, {
      id: makeId('five-whys', item?.id || index),
      sourceLabel: '5 Porquês',
      origin: 'Projetos',
      x: item?.rootCause || item?.cause || '',
      y: item?.problem || yProjeto,
      analysis: 'Investigação de causa raiz',
      evidence: Array.isArray(item?.whys) ? item.whys.filter(Boolean).join(' → ') : item?.rootCause || '',
    });
  });

  const ishikawa = sourceData(allData, 'measureIshikawa');
  Object.entries(ishikawa?.causes || {}).forEach(([category, causes]: [string, any]) => {
    (Array.isArray(causes) ? causes : []).forEach((cause: any, index: number) => {
      const text = typeof cause === 'string' ? cause : cause?.text || cause?.name || cause?.description;
      pushCandidate(rows, {
        id: makeId('fishbone', `${category}-${index}-${text}`),
        sourceLabel: `Espinha de Peixe — ${category}`,
        origin: 'Projetos',
        x: text || '',
        y: ishikawa?.problem || yProjeto,
        analysis: 'Causa potencial',
        evidence: 'Ainda sem análise.',
      });
    });
  });

  const matrix = sourceData(allData, 'measureMatrix');
  (matrix?.causes || []).forEach((cause: any, index: number) => {
    pushCandidate(rows, {
      id: makeId('cause-effect', cause?.id || index),
      sourceLabel: 'Matriz Causa e Efeito',
      origin: 'Projetos',
      x: cause?.name || cause?.description || '',
      y: (matrix?.outputs || []).map((output: any) => output?.name).filter(Boolean).join(', ') || yProjeto,
      analysis: 'Priorização causa e efeito',
      evidence: `Pontuações: ${Array.isArray(cause?.scores) ? cause.scores.join(', ') : 'não informadas'}.`,
    });
  });

  // Duplicatas exatas não ajudam o aluno; mantemos a origem mais específica e
  // deixamos todas as fontes no texto quando o mesmo X aparece em mais de uma.
  const unique = new Map<string, CauseEvidenceCandidate>();
  rows.forEach((row) => {
    const key = `${row.x.toLocaleLowerCase('pt-BR')}|${row.y.toLocaleLowerCase('pt-BR')}|${row.analysis.toLocaleLowerCase('pt-BR')}`;
    const previous = unique.get(key);
    if (!previous) unique.set(key, row);
    else if (!previous.evidence.includes(row.sourceLabel)) {
      previous.evidence = `${previous.evidence} Fonte adicional: ${row.sourceLabel}.`;
    }
  });
  return Array.from(unique.values());
};

export const getConfirmedCauseRows = (data: any): CauseValidationRow[] => {
  const rows = unwrap(data)?.rows;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row: CauseValidationRow) =>
    row.humanDecision === 'contribui' && row.confirmed === true && row.includeInBrainstorming === true
  );
};
