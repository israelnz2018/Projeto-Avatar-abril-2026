import { normalizeCourseName } from '../lib/courseAccess';

const COURSE_NAME_BY_ANALYTICS_MODULE: Record<string, string> = {
  graficos: 'Estatística Aplicada e Ferramentas da Qualidade',
  diversas: 'Estatística Aplicada e Ferramentas da Qualidade',
  inferencial: 'Análise Inferencial - Testes de Hipóteses',
  msa: 'MSA- Análise  do Sistema de Medição',
  preditiva: 'Análise Preditiva - Regressões, Correlações e Séries Temporais',
  cep: 'CEP - Controle Estatístico de Processo',
  capabilidade: 'Capabilidade de Processo Avançado',
};

export function getCourseNameForAnalyticsModule(moduleId: string): string | undefined {
  return COURSE_NAME_BY_ANALYTICS_MODULE[moduleId];
}

export interface CourseOfferDefaults {
  descricao: string;
  moduloEspecifico?: string;
  precoSugerido?: number;
  checkoutSugerido?: string;
  itens: string[];
}

export interface CourseOfferPresentation {
  tituloPacote: string;
  ementa: string[];
  acessosMantidos: string[];
}

/** Conteúdo resumido dos produtos que já possuem checkout Hotmart. */
export function getCourseOfferPresentation(courseName: string): CourseOfferPresentation | undefined {
  const nome = normalizeCourseName(courseName);
  const acessosMantidos = ['Comunidade LBW', 'IA Digital', 'Relatórios e PowerPoint'];

  if (nome.includes('capabilidade de processo')) {
    return {
      tituloPacote: 'Curso completo + módulo Capabilidade de Processo no Software LBW',
      ementa: [
        'Estabilidade e normalidade do processo',
        'Capabilidade para dados contínuos e discretos',
        'Cálculo e interpretação de Cp, Cpk, Pp e Ppk',
        'Transformação matemática e discretização de dados',
        'Interpretação dos gráficos e resultados',
        'Exercícios práticos utilizando o Software LBW',
      ],
      acessosMantidos: [...acessosMantidos, 'Gráficos', 'Análises Diversas'],
    };
  }

  if (nome.includes('estatistica aplicada') && nome.includes('ferramentas da qualidade')) {
    return {
      tituloPacote: 'Curso completo + módulos Gráficos e Análises Diversas no Software LBW',
      ementa: [
        'Estatística descritiva aplicada a negócios',
        'Média, mediana, dispersão e interpretação dos dados',
        'Histogramas, Pareto, boxplot, dispersão e tendência',
        'Teste de normalidade, probabilidade e estabilidade',
        'Ferramentas da qualidade para análise e tomada de decisão',
        'Exercícios práticos utilizando o Software LBW',
      ],
      acessosMantidos,
    };
  }

  if (nome.includes('analise inferencial') || nome.includes('teste de hipotes')) {
    return {
      tituloPacote: 'Curso completo + módulo Análise Inferencial no Software LBW',
      ementa: [
        'Fundamentos dos testes de hipóteses, p-valor e significância',
        'Testes de médias e análise de variância (ANOVA)',
        'Testes de medianas e métodos não paramétricos',
        'Testes de variâncias, proporções e independência',
        'Intervalos de confiança e interpretação dos resultados',
        'Exercícios práticos utilizando o Software LBW',
      ],
      acessosMantidos: [...acessosMantidos, 'Gráficos', 'Análises Diversas'],
    };
  }

  if (nome.includes('sistema de medicao') || /^msa\b/.test(nome)) {
    return {
      tituloPacote: 'Curso completo + módulo MSA no Software LBW',
      ementa: [
        'Fundamentos e fontes de variação do sistema de medição',
        'Gage R&R para dados contínuos',
        'Repetibilidade e reprodutibilidade',
        'Estudos de vício, linearidade e estabilidade',
        'Concordância de atributos para dados discretos',
        'Exercícios práticos utilizando o Software LBW',
      ],
      acessosMantidos: [...acessosMantidos, 'Gráficos', 'Análises Diversas'],
    };
  }

  if (nome.includes('controle estatistico de processo') || /^cep\b/.test(nome)) {
    return {
      tituloPacote: 'Curso completo + módulo Controle Estatístico de Processo no Software LBW',
      ementa: [
        'Estabilidade, variação e causas comuns e especiais',
        'Seleção da carta de controle adequada para cada tipo de dado',
        'Cartas I-MR, X-Barra R e X-Barra S',
        'Cartas P, NP, C e U para dados discretos',
        'Carta EWMA e interpretação dos sinais do processo',
        'Exercícios práticos utilizando o Software LBW',
      ],
      acessosMantidos: [...acessosMantidos, 'Gráficos', 'Análises Diversas'],
    };
  }

  if (nome.includes('analise preditiva') || nome.includes('regresso')) {
    return {
      tituloPacote: 'Curso completo + módulo Análise Preditiva no Software LBW',
      ementa: [
        'Correlação e análise das relações entre variáveis',
        'Regressões linear, quadrática e cúbica',
        'Regressão linear múltipla e seleção do modelo',
        'Regressões logística binária, ordinal e nominal',
        'Árvore de decisão, Random Forest e séries temporais',
        'Exercícios práticos utilizando o Software LBW',
      ],
      acessosMantidos: [...acessosMantidos, 'Gráficos', 'Análises Diversas'],
    };
  }

  return undefined;
}

export function getCourseOfferDefaults(courseName: string, videoCount = 0): CourseOfferDefaults {
  const nome = normalizeCourseName(courseName);
  let moduloEspecifico: string | undefined;
  let precoSugerido: number | undefined;
  let checkoutSugerido: string | undefined;
  let descricao = 'Aprenda na prática com aulas completas, exercícios e os recursos integrados da plataforma LBW.';

  if (nome.includes('capabilidade de processo')) {
    moduloEspecifico = 'Capabilidade';
    precoSugerido = 147;
    checkoutSugerido = 'https://pay.hotmart.com/A98677506M';
    descricao = 'Aprenda a gerar e interpretar estudos de capabilidade para avaliar se o processo consegue atender às especificações.';
  } else if (nome.includes('estatistica aplicada') && nome.includes('ferramentas da qualidade')) {
    precoSugerido = 97;
    checkoutSugerido = 'https://pay.hotmart.com/T98914582E';
    descricao = 'Aprenda estatística aplicada e ferramentas da qualidade para transformar dados em decisões práticas.';
  } else if (nome.includes('analise inferencial') || nome.includes('teste de hipotes')) {
    moduloEspecifico = 'Análise Inferencial';
    precoSugerido = 147;
    checkoutSugerido = 'https://pay.hotmart.com/S98917902U';
    descricao = 'Aprenda a selecionar, executar e interpretar testes de hipóteses para tomar decisões com evidências.';
  } else if (nome.includes('sistema de medicao') || /^msa\b/.test(nome)) {
    moduloEspecifico = 'MSA';
    checkoutSugerido = 'https://pay.hotmart.com/P107328090D';
    descricao = 'Aprenda a avaliar a confiabilidade e a variação dos sistemas de medição para tomar decisões com dados confiáveis.';
  } else if (nome.includes('controle estatistico de processo') || /^cep\b/.test(nome)) {
    moduloEspecifico = 'Controle de Processo';
    precoSugerido = 147;
    checkoutSugerido = 'https://pay.hotmart.com/X98692438N';
    descricao = 'Aprenda a monitorar a estabilidade do processo e interpretar cartas de controle para agir no momento correto.';
  } else if (nome.includes('analise preditiva') || nome.includes('regresso')) {
    moduloEspecifico = 'Análise Preditiva';
    precoSugerido = 197;
    checkoutSugerido = 'https://pay.hotmart.com/A98916105N';
    descricao = 'Aprenda a usar regressões, correlações e séries temporais para explicar relações e apoiar previsões.';
  }

  const modulosSoftware = moduloEspecifico
    ? `Software LBW com Gráficos, Análises Diversas e o módulo ${moduloEspecifico}`
    : 'Software LBW com os módulos Gráficos e Análises Diversas';

  return {
    descricao,
    moduloEspecifico,
    precoSugerido,
    checkoutSugerido,
    itens: [
      videoCount > 0 ? `Curso online completo com ${videoCount} videoaulas` : 'Curso online completo com videoaulas',
      'Exercícios práticos para aplicar o conteúdo',
      modulosSoftware,
      'IA digital para explicar o uso das ferramentas e interpretar os resultados',
      'Relatórios e apresentações PowerPoint gerados a partir das análises',
      'Participação na comunidade LBW',
      'Avaliação e certificado após cumprir os critérios do curso',
    ],
  };
}
