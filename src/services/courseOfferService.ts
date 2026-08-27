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
  recebeAMais?: string[];
  ementa: string[];
  continuaraAcessando?: string;
  acessosMantidos: string[];
}

/** Conteúdo resumido dos produtos que já possuem checkout Hotmart. */
export function getCourseOfferPresentation(courseName: string): CourseOfferPresentation | undefined {
  const nome = normalizeCourseName(courseName);
  const acessosMantidos = ['Comunidade LBW', 'IA Digital', 'Relatórios e PowerPoint'];

  if (nome.includes('como resolver problemas no trabalho') || nome.includes('kit 90 dias')) {
    return {
      tituloPacote: 'Curso completo + jornada prática dos primeiros 90 dias',
      ementa: [
        'Como entender rapidamente uma nova área de trabalho',
        'Identificação e priorização dos problemas mais relevantes',
        'Estruturação da primeira oportunidade de melhoria',
        'Aplicação prática de SIPOC, RACI e ferramentas de gestão',
        'Plano de ação para gerar resultados e ganhar visibilidade',
        'Checklist com atividades para acompanhar sua evolução',
      ],
      acessosMantidos: ['Comunidade LBW', 'IA Digital', 'Dashboard de progresso'],
    };
  }

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
      recebeAMais: [
        'Curso online completo de Testes de Hipóteses',
        'Exercícios práticos e materiais de apoio',
        'Avaliação e certificação de conclusão',
        'Módulo de Análise Inferencial no Software LBW',
        'Gráficos, Análises Diversas, relatórios e PowerPoint',
      ],
      ementa: [
        'Hipóteses, p-valor e significância',
        'Testes de médias, medianas, variâncias e proporções',
        'ANOVA e testes não paramétricos',
        'Intervalos de confiança e interpretação dos resultados',
      ],
      continuaraAcessando: 'Comunidade LBW, IA Digital e recursos já liberados.',
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

  // Os cinco cursos abaixo NÃO liberam módulo nenhum de Data Analysis (ver
  // analyticsComprado no /api/acesso/liberar). O tituloPacote não pode prometer
  // Software LBW, e acessosMantidos fica só com o que a compra realmente dá.
  const semSoftware = ['Comunidade LBW', 'IA Digital'];

  if (nome.includes('recomendar melhorias') || nome.includes('gate')) {
    return {
      tituloPacote: 'Curso completo, com avaliação e certificado de conclusão',
      ementa: [
        'Introdução e entendimento do problema',
        'Análise exploratória dos dados',
        'Estatística aplicada ao negócio',
        'Testes de hipóteses',
        'Análise preditiva',
        'Softwares LBW e Minitab na prática',
      ],
      acessosMantidos: semSoftware,
    };
  }

  if (nome.includes('conduzir mudancas') || nome.includes('menos resistencia')) {
    return {
      tituloPacote: 'Curso completo, com avaliação e certificado de conclusão',
      ementa: [
        'Definição e mapeamento das partes interessadas',
        'Coleta de informações junto aos stakeholders',
        'Engajamento dos stakeholders na implementação',
        'Análise dos resultados com os envolvidos',
        'Manutenção do comprometimento ao longo do tempo',
        'Método ADKAR: consciência, desejo, conhecimento, habilidade e reforço',
      ],
      acessosMantidos: semSoftware,
    };
  }

  if (nome.includes('antecipar riscos') || nome.includes('virem problemas')) {
    return {
      tituloPacote: 'Curso completo, com avaliação e certificado de conclusão',
      ementa: [
        'Fundamentos da análise de riscos',
        'FMEA: modos de falha, efeitos e criticidade',
        'Gestão de riscos pelo método PMI',
        'Quando usar FMEA e quando usar PMI',
      ],
      acessosMantidos: semSoftware,
    };
  }

  if (nome.includes('cultura lean')) {
    return {
      tituloPacote: 'Curso completo, com avaliação e certificado de conclusão',
      recebeAMais: [
        'Curso online completo de Cultura Lean',
        'Exercícios práticos e materiais de apoio',
        'Avaliação e certificação de conclusão',
      ],
      ementa: [
        'Toyota Way, TPS e os 14 Princípios',
        'Filosofia de longo prazo e processos eficientes',
        'Desenvolvimento de pessoas e parceiros',
        'Aprendizado contínuo e eliminação de desperdícios',
      ],
      continuaraAcessando: 'Comunidade LBW, IA Digital e recursos já liberados.',
      acessosMantidos: semSoftware,
    };
  }

  if (nome.includes('apresentacoes que convencem')) {
    return {
      tituloPacote: 'Curso completo, com avaliação e certificado de conclusão',
      ementa: [
        'Antes da apresentação: estrutura, dados e mensagem',
        'Durante a apresentação: condução e resposta a objeções',
        'Depois da apresentação: follow-up e decisões',
      ],
      acessosMantidos: semSoftware,
    };
  }

  if (nome.includes('analise preditiva') || nome.includes('regresso')) {
    return {
      tituloPacote: 'Curso completo + módulo Análise Preditiva no Software LBW',
      recebeAMais: [
        'Curso online completo de Análise Preditiva',
        'Exercícios práticos e materiais de apoio',
        'Avaliação e certificação de conclusão',
        'Módulo de Análise Preditiva no Software LBW',
        'Gráficos, Análises Diversas, relatórios e PowerPoint',
      ],
      ementa: [
        'Correlação e análise das relações entre variáveis',
        'Regressões linear, quadrática e cúbica',
        'Regressão linear múltipla e seleção do modelo',
        'Regressões logística binária, ordinal e nominal',
        'Árvore de decisão, Random Forest e séries temporais',
      ],
      continuaraAcessando: 'Comunidade LBW, IA Digital e recursos já liberados.',
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

  if (nome.includes('como resolver problemas no trabalho') || nome.includes('kit 90 dias')) {
    precoSugerido = 97;
    checkoutSugerido = 'https://pay.hotmart.com/J107328495S';
    descricao = 'Aprenda a entender sua área, escolher o problema certo e entregar sua primeira melhoria nos primeiros 90 dias.';
  } else if (nome.includes('capabilidade de processo')) {
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
    precoSugerido = 147;
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
  } else if (nome.includes('recomendar melhorias') || nome.includes('gate')) {
    precoSugerido = 497;
    checkoutSugerido = 'https://pay.hotmart.com/H98698949A';
    descricao = 'Aprenda a sustentar uma recomendação de melhoria com dados, da exploração inicial até a análise preditiva.';
  } else if (nome.includes('conduzir mudancas') || nome.includes('menos resistencia')) {
    precoSugerido = 297;
    checkoutSugerido = 'https://pay.hotmart.com/X98537560I';
    descricao = 'Aprenda a conduzir mudanças usando o método ADKAR, engajando as partes interessadas do início ao fim.';
  } else if (nome.includes('antecipar riscos') || nome.includes('virem problemas')) {
    precoSugerido = 147;
    checkoutSugerido = 'https://pay.hotmart.com/S107333641G';
    descricao = 'Aprenda a identificar e priorizar riscos com FMEA e com o método PMI antes que eles virem problemas.';
  } else if (nome.includes('cultura lean')) {
    precoSugerido = 147;
    checkoutSugerido = 'https://pay.hotmart.com/F107333658F';
    descricao = 'Aprenda os princípios do pensamento enxuto e a identificar desperdícios no seu próprio processo.';
  } else if (nome.includes('apresentacoes que convencem')) {
    precoSugerido = 147;
    checkoutSugerido = 'https://pay.hotmart.com/Y107333712I';
    descricao = 'Aprenda a preparar, conduzir e encaminhar uma apresentação que leva a decisão.';
  }

  // Só os 6 cursos de estatística liberam módulo de Data Analysis na compra
  // avulsa (ver analyticsComprado no /api/acesso/liberar). Kit 90 e os cinco
  // cursos de método não liberam nenhum — prometer Software LBW aqui seria
  // vender o que a compra não entrega.
  const liberaModulos = Boolean(moduloEspecifico)
    || (nome.includes('estatistica aplicada') && nome.includes('ferramentas da qualidade'));
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
      ...(liberaModulos ? [modulosSoftware, 'Relatórios e apresentações PowerPoint gerados a partir das análises'] : []),
      'IA digital para explicar o uso das ferramentas e interpretar os resultados',
      'Participação na comunidade LBW',
      'Avaliação e certificado após cumprir os critérios do curso',
    ],
  };
}
