import { normalizeCourseName } from '../lib/courseAccess';

export interface CourseOfferDefaults {
  descricao: string;
  moduloEspecifico?: string;
  precoSugerido?: number;
  checkoutSugerido?: string;
  itens: string[];
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
