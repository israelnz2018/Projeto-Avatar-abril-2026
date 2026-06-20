/**
 * Passos dos tours de cada aba. Enxutos — só os itens principais.
 * Cada selector aponta pra um `data-tour-id="..."` no componente da aba.
 * Passos cujo alvo não existe são pulados automaticamente pelo GuidedTour.
 */
import type { TourStep } from './GuidedTour';

export const PROJECTS_TOUR: TourStep[] = [
  {
    id: 'trilhas',
    selector: '[data-tour-id="proj-trilhas"]',
    title: 'Escolha uma trilha',
    description: 'Cada trilha resolve um tipo de problema. Clique na que combina com o que você quer melhorar e crie seu projeto.',
    position: 'right',
  },
  {
    id: 'projetos-ativos',
    selector: '[data-tour-id="proj-lista"]',
    title: 'Seus projetos',
    description: 'Aqui ficam seus projetos. Clique pra abrir, trocar entre eles ou criar um novo.',
    position: 'bottom',
  },
  {
    id: 'mentor',
    selector: '[data-tour-id="proj-mentor"]',
    title: 'O Mentor Israel',
    description: 'Dentro de um projeto, o Israel te orienta sobre cada ferramenta — com respostas baseadas nos vídeos dele.',
    position: 'left',
  },
];

// Tour SUPERFICIAL do Data Analysis (visão geral). O tour DETALHADO de 10 passos
// fica no botão "Iniciar tour" da própria aba (DataAnalysisTour).
export const DATA_OVERVIEW_TOUR: TourStep[] = [
  {
    id: 'upload',
    selector: '[data-tour-id="upload"]',
    title: 'Análise de dados sem programar',
    description: 'Aqui você sobe uma planilha e o Mentor IA gera análises e gráficos prontos. Comece subindo seu arquivo por aqui.',
    position: 'bottom',
  },
  {
    id: 'tour-detalhado',
    selector: '[data-tour-id="tour-detalhado"]',
    title: 'Tem um tour completo aqui',
    description: 'Esta aba tem um passo a passo detalhado. Quando quiser, clique em "Iniciar tour" aqui pra ver tudo em detalhe.',
    position: 'bottom',
  },
];

export const EDUCACAO_TOUR: TourStep[] = [
  {
    id: 'trilhas',
    selector: '[data-tour-id="learning-trails-grid"]',
    title: 'As trilhas de aprendizado',
    description: 'Cada trilha reúne vídeos e materiais organizados por tema. Escolha por onde começar.',
    position: 'bottom',
  },
  {
    id: 'conteudo',
    selector: '[data-tour-id="learning-videos-grid"]',
    title: 'O conteúdo',
    description: 'Ao abrir uma trilha, os vídeos e aulas aparecem aqui pra você assistir na ordem.',
    position: 'top',
  },
];

export const COMUNIDADE_TOUR: TourStep[] = [
  {
    id: 'publicar',
    selector: '[data-tour-id="com-publicar"]',
    title: 'Participe',
    description: 'Compartilhe uma dúvida ou um resultado. Quanto mais você participa, mais aprende.',
    position: 'bottom',
  },
  {
    id: 'feed',
    selector: '[data-tour-id="com-feed"]',
    title: 'A comunidade LBW',
    description: 'Aqui você troca experiências com outros alunos — dúvidas, conquistas e aprendizados.',
    position: 'bottom',
  },
];

export const DASHBOARD_TOUR: TourStep[] = [
  {
    id: 'resumo',
    selector: '[data-tour-id="dashboard-header"]',
    title: 'Seu painel',
    description: 'Uma visão geral do seu progresso na plataforma — o que você já fez e o que vem a seguir.',
    position: 'bottom',
  },
];
