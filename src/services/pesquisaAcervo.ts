/** Correspondência local entre perguntas pesquisadas e o conteúdo do acervo. */
export type MercadoPesquisa = 'BR' | 'EN' | 'ES';

export interface TopicoAulaPesquisa {
  time: string;
  topic: string;
}

export interface AulaPesquisa {
  videoId: string;
  knowledgeBaseId?: string;
  titulo: string;
  curso: string;
  serie: string;
  topicos: TopicoAulaPesquisa[];
  origem: 'curso' | 'meus-videos';
}

export interface TermoPesquisa {
  consulta: string;
  mercado: MercadoPesquisa;
}

export interface AulaRankeada extends Omit<AulaPesquisa, 'topicos'> {
  pontuacao: number;
  correspondencia: 'alta' | 'media';
  termos: TermoPesquisa[];
  motivo: string;
  trecho?: TopicoAulaPesquisa;
  base: 'topicos' | 'titulo' | 'serie';
}

const PALAVRAS_VAZIAS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'del', 'do', 'dos', 'e', 'el',
  'em', 'en', 'for', 'from', 'how', 'in', 'la', 'las', 'lo', 'los', 'na', 'nas', 'no', 'nos',
  'o', 'os', 'para', 'por', 'que', 'the', 'to', 'um', 'uma', 'un', 'una', 'what', 'why',
  'y', 'and', 'of', 'is', 'are', 'se', 'seu', 'sua', 'meu', 'minha', 'mais', 'melhor',
  'hacer', 'fazer', 'using', 'usar', 'use', 'guia', 'guide', 'passo', 'step', 'steps',
]);

const EQUIVALENCIAS: Record<string, string> = {
  continuous: 'continuo', continua: 'continuo', continuo: 'continuo',
  process: 'processo', processes: 'processo', proceso: 'processo', processos: 'processo',
  improvement: 'melhoria', improve: 'melhoria', improvements: 'melhoria',
  mejora: 'melhoria', mejorar: 'melhoria', melhorias: 'melhoria',
  mapping: 'mapear', map: 'mapear', maps: 'mapear', mapeamento: 'mapear',
  mapeo: 'mapear', mapear: 'mapear',
  bottleneck: 'gargalo', bottlenecks: 'gargalo', cuello: 'gargalo',
  gargalos: 'gargalo',
  root: 'raiz', raiz: 'raiz', cause: 'causa', causes: 'causa', causa: 'causa',
  analysis: 'analise', analisis: 'analise', analisar: 'analise', analises: 'analise',
  indicator: 'indicador', indicators: 'indicador', indicadores: 'indicador',
  metric: 'metrica', metrics: 'metrica', metricas: 'metrica',
  quality: 'qualidade', calidad: 'qualidade',
  waste: 'desperdicio', desperdicios: 'desperdicio',
  risk: 'risco', risks: 'risco', riesgo: 'risco', riesgos: 'risco', riscos: 'risco',
  project: 'projeto', projects: 'projeto', proyecto: 'projeto', proyectos: 'projeto', projetos: 'projeto',
  data: 'dados', datos: 'dados', dado: 'dados',
  training: 'treinamento', capacitacion: 'treinamento', treinar: 'treinamento',
  customer: 'cliente', customers: 'cliente', cliente: 'cliente', clientes: 'cliente',
  standard: 'padrao', standardization: 'padrao', estandar: 'padrao', padroes: 'padrao',
  productivity: 'produtividade', productividad: 'produtividade',
};

export function palavrasPesquisa(texto: string): string[] {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p))
    .map((p) => EQUIVALENCIAS[p] || (p.length > 5 && p.endsWith('s') ? p.slice(0, -1) : p))
    .filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p));
}

function conjunto(texto: string): Set<string> {
  return new Set(palavrasPesquisa(texto));
}

function intersecao(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((p) => b.has(p));
}

export function rankearAcervo(aulas: AulaPesquisa[], termos: TermoPesquisa[], maximo = 10): AulaRankeada[] {
  if (!aulas.length || !termos.length) return [];
  const documentos = aulas.map((aula) => ({
    aula,
    titulo: conjunto(aula.titulo),
    serie: conjunto(aula.serie),
    curso: conjunto(aula.curso),
    topicos: aula.topicos.map((topico) => ({ topico, tokens: conjunto(topico.topic) })),
  }));
  const frequencia = new Map<string, number>();
  for (const doc of documentos) {
    const tokens = new Set([...doc.titulo, ...doc.serie, ...doc.topicos.flatMap((t) => [...t.tokens])]);
    for (const token of tokens) frequencia.set(token, (frequencia.get(token) || 0) + 1);
  }
  const idf = (token: string) => Math.log(1 + (aulas.length + 1) / (1 + (frequencia.get(token) || 0)));

  const ranking = documentos.map((doc): AulaRankeada | null => {
    const combinacoes = termos.map((termo) => {
      const buscados = conjunto(termo.consulta);
      if (!buscados.size) return null;
      const noTitulo = intersecao(buscados, doc.titulo);
      const naSerie = intersecao(buscados, doc.serie);
      const melhoresTopicos = doc.topicos.map((t) => ({ ...t, comuns: intersecao(buscados, t.tokens) }))
        .sort((a, b) => b.comuns.reduce((s, p) => s + idf(p), 0) - a.comuns.reduce((s, p) => s + idf(p), 0));
      const melhorTopico = melhoresTopicos.find((t) => t.comuns.length > 0);
      const distintos = new Set([...noTitulo, ...naSerie, ...(melhorTopico?.comuns || [])]);
      if (!distintos.size) return null;
      const cobertura = distintos.size / buscados.size;
      if (cobertura < 0.45 && distintos.size < 2) return null;
      const pesoTitulo = noTitulo.reduce((s, p) => s + idf(p) * 4, 0);
      const pesoSerie = naSerie.reduce((s, p) => s + idf(p) * 1.6, 0);
      const pesoTopico = (melhorTopico?.comuns || []).reduce((s, p) => s + idf(p) * 2.8, 0);
      const referencia = [...buscados].reduce((s, p) => s + idf(p) * 4, 0);
      const bruto = (pesoTitulo + pesoSerie + pesoTopico) / Math.max(referencia, 1);
      const pontuacao = Math.min(1, bruto) * (termo.mercado === 'BR' ? 1 : 0.65);
      if (pontuacao < 0.18) return null;
      const base: AulaRankeada['base'] = pesoTopico >= pesoTitulo && pesoTopico >= pesoSerie
        ? 'topicos' : pesoTitulo >= pesoSerie ? 'titulo' : 'serie';
      return { termo, pontuacao, base, trecho: melhorTopico?.topico };
    }).filter((v): v is NonNullable<typeof v> => Boolean(v))
      .sort((a, b) => b.pontuacao - a.pontuacao);
    if (!combinacoes.length) return null;
    const principal = combinacoes[0];
    const pontuacao = Math.min(100, Math.round((principal.pontuacao + (combinacoes[1]?.pontuacao || 0) * 0.2) * 100));
    const motivo = principal.base === 'topicos'
      ? `O índice da aula aborda “${principal.termo.consulta}”.`
      : principal.base === 'titulo'
        ? `O título da aula corresponde a “${principal.termo.consulta}”.`
        : `O módulo da aula corresponde a “${principal.termo.consulta}”.`;
    const { topicos: _topicos, ...metadados } = doc.aula;
    return {
      ...metadados,
      pontuacao,
      correspondencia: pontuacao >= 65 ? 'alta' as const : 'media' as const,
      termos: combinacoes.slice(0, 3).map((item) => item.termo),
      motivo,
      ...(principal.trecho ? { trecho: principal.trecho } : {}),
      base: principal.base,
    };
  }).filter((item): item is AulaRankeada => item !== null);
  return ranking.sort((a, b) => b.pontuacao - a.pontuacao || a.titulo.localeCompare(b.titulo, 'pt-BR')).slice(0, maximo);
}