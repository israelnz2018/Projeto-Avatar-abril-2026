/**
 * Dados das trilhas da página principal (formato Netflix).
 *
 * Cada trilha tem:
 *   - identidade visual (cor de gradiente cinematográfica + ícone)
 *   - "trailer" sintético (motif visual usado pelo TrailerCanvas)
 *   - "carta do Israel" em tom de consultor sênior (1ª pessoa)
 *   - episódios/capítulos (estilo Netflix)
 *   - ferramentas relacionadas — links pras outras abas técnicas
 *
 * Princípio editorial: NADA é técnico aqui. As palavras DMAIC, SIPOC, ADKAR
 * aparecem só como tooltip discreto. O título grande sempre vende DOR/RESULTADO.
 *
 * Paleta: a nova página principal usa fundo escuro tipo Netflix (#080a14),
 * mas os accents seguem a paleta LBW do CLAUDE.md (NAVY/BLUE/LIGHT).
 */

import type { ElementType } from 'react';
import {
  Wrench,
  BarChart3,
  Target,
  Mic,
  Users,
  UserCog,
  Award,
  Trophy,
  ShieldAlert,
  Recycle,
  RotateCw,
  Globe2,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export interface Episodio {
  numero: number;
  titulo: string;
  duracao: string;
  resumo: string;
}

export interface FerramentaLink {
  label: string;
  rota: string;
  descricao?: string;
}

export type TrailerMotif =
  | 'pulse-grid'        // grade que pulsa (dados/análise)
  | 'rising-line'       // linha que sobe (performance/carreira)
  | 'particle-cone'     // partículas convergentes (foco/recomendação)
  | 'network-pulse'     // nós conectados pulsando (pessoas/stakeholders)
  | 'spiral-flow'       // fluxo espiral (processos)
  | 'shield-radar'      // radar com pulsos (risco)
  | 'kanban-flow'       // cards deslizando (projetos)
  | 'orbit-system';     // sistema orbital (avançado)

export interface Trilha {
  id: string;
  numero: string;
  titulo: string;
  subtitulo: string;
  /** Frase curta de DOR — máximo 80 chars */
  dor: string;
  /** Para quem é — uma linha */
  paraQuem: string;
  icone: ElementType;
  /** Gradient cinematográfico (Tailwind classes from-X via-Y to-Z) */
  gradient: string;
  /** Cor de glow em rgba — pra shadow do card */
  glow: string;
  /** Cor primária do hex pra acentos no modal/trailer */
  accent: string;
  motif: TrailerMotif;
  duracao: string;
  nivel: 'Iniciante' | 'Intermediário' | 'Avançado';
  /** Total de episódios (não precisa bater com array de episodios) */
  totalEpisodios: number;
  /** Selo Netflix-like opcional: "Novo", "Top 10", "Em alta", "Formação" (a trilha-âncora) */
  selo?: 'NOVO' | 'TOP 10' | 'EM ALTA' | 'IMPERDÍVEL' | 'FORMAÇÃO LBW' | 'COMECE AQUI';
  /** Carta do Israel — 1ª pessoa, 3 a 4 parágrafos */
  cartaIsrael: string;
  oQueVoceLeva: string[];
  episodios: Episodio[];
  ferramentas: FerramentaLink[];
  ctaPrimario: { label: string; rota: string };
  /** Tag invisível pra filtrar em rows ("destaque", "iniciante", "lideranca", etc) */
  tags: string[];
}

export interface Categoria {
  id: string;
  titulo: string;
  subtitulo?: string;
  /** IDs das trilhas que aparecem nesta row */
  trilhaIds: string[];
}

// =============================================================================
// TRILHAS
// =============================================================================

export const TRILHAS: Trilha[] = [
  {
    id: 'ferramentas-dia-a-dia',
    numero: '01',
    titulo: 'Como Dar Os Primeiros Passos para se Destacar no Trabalho',
    subtitulo: 'Sua primeira semana sem se sentir perdido',
    dor: 'Pra você não passar vergonha e mostrar valor desde o primeiro dia',
    paraQuem: 'Quem está chegando agora — ou mudou de área e precisa se posicionar rápido',
    icone: Wrench,
    gradient: 'from-blue-500 via-blue-700 to-indigo-900',
    glow: 'rgba(59, 130, 246, 0.45)',
    accent: '#3B82F6',
    motif: 'spiral-flow',
    duracao: '1 semana',
    nivel: 'Iniciante',
    totalEpisodios: 5,
    selo: 'COMECE AQUI',
    cartaIsrael: `Olha, eu não vou te explicar o nome bonito das ferramentas — Wikipedia faz isso melhor. O que vou te ensinar é QUANDO usar cada uma.

Em 27 anos, aprendi que as ferramentas mais simples (um SIPOC, um 5W2H, um Brainstorming bem feito) resolvem 80% dos problemas. Os 20% que sobram precisam de coisa mais avançada — e a gente chega lá.

Comece simples. Use HOJE. Aplique no que você está fazendo essa semana mesmo, mesmo que pareça pequeno. O segredo não é saber 50 ferramentas — é saber escolher as 3 certas pro problema que está na sua frente.`,
    oQueVoceLeva: [
      'Saber escolher a ferramenta certa pro problema certo (sem chutar)',
      'Mapear qualquer processo em 5 minutos com SIPOC',
      'Estruturar um plano de ação que seu chefe não vai rejeitar',
      'Fazer uma sessão de brainstorming que gera ideias úteis (não papo furado)',
    ],
    episodios: [
      { numero: 1, titulo: 'O critério das 3 ferramentas certas', duracao: '12 min', resumo: 'Como evitar a paralisia do "qual ferramenta uso"' },
      { numero: 2, titulo: 'SIPOC em 5 minutos', duracao: '18 min', resumo: 'Mapeie qualquer processo num post-it' },
      { numero: 3, titulo: 'Plano de ação que chefe não rejeita', duracao: '15 min', resumo: 'O 5W2H que sobrevive à primeira reunião' },
      { numero: 4, titulo: 'Brainstorming sem papo furado', duracao: '20 min', resumo: 'Estrutura pra reuniões que geram ideias úteis' },
    ],
    ferramentas: [
      { label: 'Abrir meu primeiro projeto', rota: '/projects', descricao: 'Charter + SIPOC + 5W2H aplicados num caso real seu' },
      { label: 'Perguntar ao Mentor IA', rota: '/chat', descricao: 'Tire dúvidas pontuais sobre qual ferramenta usar' },
    ],
    ctaPrimario: { label: 'Começar agora', rota: '/projects' },
    tags: ['destaque', 'iniciante', 'execucao'],
  },

  {
    id: 'dados-do-dia-a-dia',
    numero: '03',
    titulo: 'Como Recomendar Melhorias com Base em Análise de Dados',
    subtitulo: 'Da análise ao "sim" do chefe',
    dor: 'Pra parar de chutar e começar a propor com base em fato',
    paraQuem: 'Quem tem boa intuição mas precisa virar argumento defensável',
    icone: BarChart3,
    gradient: 'from-cyan-400 via-blue-600 to-blue-900',
    glow: 'rgba(34, 211, 238, 0.45)',
    accent: '#22D3EE',
    motif: 'pulse-grid',
    duracao: '2 semanas',
    nivel: 'Intermediário',
    totalEpisodios: 6,
    selo: 'EM ALTA',
    cartaIsrael: `Você sabe Excel? Sabe puxar um VLOOKUP? Ótimo, é tudo que precisa pra começar.

Aos 28, numa multinacional alemã, me deram uma planilha com 50 mil linhas e me pediram pra "achar o problema". Eu travei. Hoje sei que a culpa não era minha — ninguém tinha me mostrado COMO olhar pros dados.

Aqui você vai aprender a fazer Pareto, Histograma, Boxplot e algumas análises mais avançadas — mas o segredo não é o gráfico, é a PERGUNTA que você faz antes. "Onde está o desperdício?" é diferente de "qual o desvio padrão?" — uma te leva ao problema, a outra te leva ao Excel da vergonha.`,
    oQueVoceLeva: [
      'Olhar pra uma planilha de 50k linhas e saber por onde começar',
      'Fazer um Pareto que aponta o que atacar primeiro (e convence chefe)',
      'Identificar padrões e outliers sem precisar de cientista de dados',
      'Apresentar dados de um jeito que ninguém te pergunta "e daí?"',
    ],
    episodios: [
      { numero: 1, titulo: 'A pergunta antes do gráfico', duracao: '10 min', resumo: 'Por que 80% das análises começam errado' },
      { numero: 2, titulo: 'Pareto que convence', duracao: '18 min', resumo: 'Os 20% que resolvem 80% do problema' },
      { numero: 3, titulo: 'Histograma sem mistério', duracao: '15 min', resumo: 'Quando seus dados estão te enganando' },
      { numero: 4, titulo: 'Boxplot pra achar outlier', duracao: '14 min', resumo: 'O que esse "ponto fora" está te dizendo' },
      { numero: 5, titulo: 'Dispersão e correlação', duracao: '16 min', resumo: 'Quando 2 coisas andam juntas (e quando não)' },
      { numero: 6, titulo: 'Como apresentar dado sem cara de Excel', duracao: '12 min', resumo: 'A história que o número conta' },
    ],
    ferramentas: [
      { label: 'Análises (sem programação)', rota: '/analysis', descricao: 'Pareto, Histograma, Boxplot, Dispersão e mais — clique e veja' },
      { label: 'Perguntar ao Mentor IA', rota: '/chat', descricao: 'Dúvidas sobre qual análise rodar pra que pergunta' },
    ],
    ctaPrimario: { label: 'Ir pras análises', rota: '/analysis' },
    tags: ['destaque', 'iniciante', 'dados'],
  },

  {
    id: 'melhorar-minha-area',
    numero: '02',
    titulo: 'Como Investigar Problemas e Melhorar a Sua Área',
    subtitulo: 'Do "todo mundo reclama" ao "olha o que mudou"',
    dor: 'Pra você sair da queixa e entregar resultado real',
    paraQuem: 'Quem vê desperdício todo dia e quer atacar de forma estruturada',
    icone: Target,
    gradient: 'from-emerald-400 via-teal-600 to-cyan-900',
    glow: 'rgba(16, 185, 129, 0.45)',
    accent: '#10B981',
    motif: 'rising-line',
    duracao: '6 semanas',
    nivel: 'Iniciante',
    totalEpisodios: 8,
    selo: 'TOP 10',
    cartaIsrael: `Aos 26, meu chefe me chamou e disse: "Resolve esse problema, Israel." Eu tinha 8 meses na empresa. Não sabia nem o nome dos processos direito.

O que descobri foi: chefe não quer que você seja PhD em Lean Six Sigma. Quer que você ENTREGUE. E pra entregar, você precisa de UM método — não 50.

Aqui você vai aprender o ciclo de melhoria do começo ao fim: definir o problema (de verdade, não o sintoma), medir, achar a causa, propor a solução, implementar e ter certeza que não volta. É o que multinacionais chamam de DMAIC, mas eu chamo de "como resolver problema sem virar refém da própria solução".`,
    oQueVoceLeva: [
      'Definir o problema certo (a maioria das pessoas erra aqui)',
      'Investigar causa-raiz sem culpar pessoa errada',
      'Construir um plano que sobrevive ao "isso não vai funcionar"',
      'Implementar mudanças que não voltam pra trás no mês seguinte',
    ],
    episodios: [
      { numero: 1, titulo: 'Definir o problema certo', duracao: '20 min', resumo: 'Por que 70% dos projetos resolvem o sintoma' },
      { numero: 2, titulo: 'Medir sem virar burocrata', duracao: '18 min', resumo: 'O mínimo de dado pra decidir' },
      { numero: 3, titulo: 'Achar causa-raiz sem caça-bruxa', duracao: '22 min', resumo: 'Ishikawa, 5 Porquês — quando cada um funciona' },
      { numero: 4, titulo: 'Propor solução que cola', duracao: '20 min', resumo: 'Esforço x Impacto na prática' },
      { numero: 5, titulo: 'Implementar sem virar polícia', duracao: '18 min', resumo: 'Plano que o time abraça' },
      { numero: 6, titulo: 'Sustentar o ganho', duracao: '15 min', resumo: 'Os 90 dias críticos pós-mudança' },
      { numero: 7, titulo: 'Quando o projeto trava', duracao: '14 min', resumo: 'Os 3 sinais de que você precisa pivotar' },
      { numero: 8, titulo: 'Fechar e celebrar (sério)', duracao: '12 min', resumo: 'Como apresentar resultado pra subir junto' },
    ],
    ferramentas: [
      { label: 'Abrir um projeto novo (DMAIC completo)', rota: '/projects', descricao: 'Da fase Definir até Controlar' },
      { label: 'Tirar dúvidas com o Mentor', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Começar meu projeto', rota: '/projects' },
    tags: ['destaque', 'execucao'],
  },

  {
    id: 'apresentar-recomendacao',
    numero: '07',
    titulo: 'Como Criar Apresentações que Convencem',
    subtitulo: 'Sem travar, sem cara de quem está mentindo',
    dor: 'Pra parar de congelar quando a diretoria pergunta',
    paraQuem: 'Quem tem boa análise mas comunica mal — e perde a venda',
    icone: Mic,
    gradient: 'from-orange-400 via-red-500 to-rose-800',
    glow: 'rgba(249, 115, 22, 0.45)',
    accent: '#F97316',
    motif: 'particle-cone',
    duracao: '1 semana',
    nivel: 'Avançado',
    totalEpisodios: 4,
    selo: 'NOVO',
    cartaIsrael: `Minha primeira apresentação pra VP foi um desastre. Eu tinha 25 anos, slide perfeito, números corretos. Em 4 minutos me destruíram. Eu não tinha resposta pras 3 perguntas óbvias que ele fez.

Aqui está o que ninguém te conta: a apresentação NÃO é o slide. É a HISTÓRIA que sustenta o slide. Se você sabe a história, o slide pode ser feio que funciona. Se você só decora o slide, qualquer pergunta te derruba.

Te ensino a estrutura que uso em qualquer reunião com C-level: situação, complicação, pergunta, resposta. Quatro pedaços. Funciona em 3 minutos, em 30 minutos. E a plataforma já gera o PPT pra você não perder tempo com pixel — você gasta tempo treinando a HISTÓRIA.`,
    oQueVoceLeva: [
      'Estruturar qualquer apresentação em 4 blocos (storytelling executivo)',
      'Antecipar as 3 perguntas que SEMPRE vão te fazer',
      'Responder o "e daí?" sem gaguejar',
      'Gerar slides bonitos automaticamente pra focar no conteúdo',
    ],
    episodios: [
      { numero: 1, titulo: 'A estrutura SCQA (Situação-Complicação-Pergunta-Resposta)', duracao: '18 min', resumo: 'O frame que o McKinsey usa há 40 anos' },
      { numero: 2, titulo: 'Antecipar as 3 perguntas óbvias', duracao: '15 min', resumo: 'Por que a diretoria sempre pergunta a mesma coisa' },
      { numero: 3, titulo: 'Gerar PPT executivo em 1 clique', duracao: '10 min', resumo: 'Use o app pra economizar 4 horas por apresentação' },
    ],
    ferramentas: [
      { label: 'Exportar slides do projeto', rota: '/projects', descricao: 'Botão laranja "PPT" gera apresentação executiva pronta' },
      { label: 'Treinar a história com o Mentor', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Treinar agora', rota: '/projects' },
    tags: ['destaque', 'iniciante', 'comunicacao'],
  },

  {
    id: 'mudanca-com-menos-resistencia',
    numero: '05',
    titulo: 'Como Conduzir Mudanças com Menos Resistência',
    subtitulo: 'Quando você fala e o time finalmente escuta',
    dor: 'Pra mudar processos sem virar inimigo do seu time',
    paraQuem: 'Quem propôs algo bom e foi vetado sem chance',
    icone: Users,
    gradient: 'from-amber-400 via-orange-600 to-red-900',
    glow: 'rgba(245, 158, 11, 0.45)',
    accent: '#F59E0B',
    motif: 'network-pulse',
    duracao: '3 semanas',
    nivel: 'Intermediário',
    totalEpisodios: 5,
    cartaIsrael: `Na multinacional X, propus uma mudança que ia poupar 2 milhões por ano. Tecnicamente impecável. O time inteiro vetou. Não pelo método — pela maneira que eu cheguei.

Aprendi do jeito mais doloroso: mudança não é sobre ter razão, é sobre fazer as pessoas ANDAREM com você. Tem um método pra isso, chamado ADKAR. Não é mágica — é uma sequência: Consciência, Desejo, Conhecimento, Habilidade, Reforço. Pula um passo, você perde o time.

A diferença entre quem sobe rápido e quem fica parado não é técnica. É a capacidade de fazer o outro QUERER mudar. E isso se aprende.`,
    oQueVoceLeva: [
      'Mapear quem é a favor, quem é contra e quem está em cima do muro',
      'Construir a "consciência da dor" antes de propor solução',
      'Apresentar mudança de um jeito que o time abraça',
      'Sustentar a mudança nos 90 dias críticos pós-implementação',
    ],
    episodios: [
      { numero: 1, titulo: 'Mapa de stakeholders honesto', duracao: '15 min', resumo: 'Quem te apoia, quem te enfrenta, quem está em cima do muro' },
      { numero: 2, titulo: 'A jornada ADKAR sem buzzword', duracao: '20 min', resumo: 'Consciência → Desejo → Conhecimento → Habilidade → Reforço' },
      { numero: 3, titulo: 'Construir consciência da dor', duracao: '18 min', resumo: 'Por que mostrar dado não convence (e o que convence)' },
      { numero: 4, titulo: 'Conversa difícil com quem resiste', duracao: '22 min', resumo: 'Os 4 scripts que sempre funcionam' },
      { numero: 5, titulo: 'Os 90 dias críticos pós-mudança', duracao: '15 min', resumo: 'Como evitar o retorno ao "como era antes"' },
    ],
    ferramentas: [
      { label: 'Mapear stakeholders + ADKAR', rota: '/projects', descricao: 'Ferramentas Stakeholder e ADKAR dentro do projeto' },
      { label: 'Pedir conselho ao Mentor', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Mapear meu time', rota: '/projects' },
    tags: ['destaque', 'lideranca'],
  },

  {
    id: 'gerenciar-pessoas-projeto',
    numero: '06',
    titulo: 'Gerencie pessoas num projeto',
    subtitulo: 'Liderar sem autoridade formal',
    dor: 'Pra coordenar gente mais experiente sem virar piada',
    paraQuem: 'Recém-promovido a líder de projeto, sem autoridade direta',
    icone: UserCog,
    gradient: 'from-violet-400 via-purple-700 to-indigo-900',
    glow: 'rgba(139, 92, 246, 0.45)',
    accent: '#8B5CF6',
    motif: 'network-pulse',
    duracao: '4 semanas',
    nivel: 'Intermediário',
    totalEpisodios: 6,
    cartaIsrael: `Liderei um projeto com 12 pessoas, vários muito mais velhos e experientes que eu. Os 3 primeiros meses foram um inferno. Eu pedia, ninguém entregava. Eu cobrava, todo mundo se ofendia.

O que mudou? Aprendi que líder de projeto não é chefe — é alguém que coordena. E coordenar é três coisas: clareza de papel (RACI), cadência de reuniões (semanal, curta, focada) e celebração de vitórias pequenas (sério, isso muda tudo).

Te ensino o esqueleto de como rodar um projeto de 12 a 18 meses sem perder o time pelo caminho — incluindo o que fazer quando alguém claramente não está entregando e você precisa "ter aquela conversa".`,
    oQueVoceLeva: [
      'Atribuir papéis claros (quem decide, quem executa, quem é consultado)',
      'Rodar reunião semanal de 30min que TODO MUNDO quer participar',
      'Detectar e tratar problemas de motivação antes de virarem demissão',
      'Construir cronograma que se ajusta sem virar caos',
    ],
    episodios: [
      { numero: 1, titulo: 'RACI sem academicismo', duracao: '14 min', resumo: 'Como dividir papel num post-it' },
      { numero: 2, titulo: 'A reunião semanal de 30 min', duracao: '16 min', resumo: 'Pauta, ritmo, fechamento' },
      { numero: 3, titulo: '"Ter aquela conversa"', duracao: '20 min', resumo: 'Quando alguém não está entregando' },
      { numero: 4, titulo: 'Celebrar vitória pequena (sério)', duracao: '12 min', resumo: 'Por que isso muda tudo' },
      { numero: 5, titulo: 'Cronograma que respira', duracao: '18 min', resumo: 'Replanejar sem virar caos' },
      { numero: 6, titulo: 'Encerrar e reconhecer', duracao: '10 min', resumo: 'O ritual que faz o time querer o próximo' },
    ],
    ferramentas: [
      { label: 'Cronograma + ADKAR do time', rota: '/projects' },
      { label: 'Pedir feedback ao Mentor sobre seu caso', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Estruturar meu time', rota: '/projects' },
    tags: ['lideranca'],
  },

  {
    id: 'perfil-gestor-lean',
    numero: '09',
    titulo: 'Como Se Tornar um Gestor LEAN',
    subtitulo: 'O que separa quem sobe de quem fica parado',
    dor: 'Pra ser visto como gestor antes de ser promovido a gestor',
    paraQuem: 'Quem quer próxima promoção (sem MBA caro)',
    icone: Award,
    gradient: 'from-pink-400 via-fuchsia-600 to-purple-900',
    glow: 'rgba(217, 70, 239, 0.45)',
    accent: '#D946EF',
    motif: 'rising-line',
    duracao: '8 semanas',
    nivel: 'Avançado',
    totalEpisodios: 10,
    selo: 'TOP 10',
    cartaIsrael: `Em 5 multinacionais, vi um padrão claro: quem é promovido a gestor não é necessariamente o mais técnico. É o que LIDA com pessoas, processos e resultado de um jeito específico.

Tem 7 hábitos que eu observo em todo gestor lean que sobe: andar pelo gemba (ir onde o trabalho acontece), perguntar antes de ordenar, ler números antes de reagir, dar feedback em tempo real, eliminar reuniões inúteis, defender o time pra cima e ser exigente pra dentro.

Essa trilha é mais um JEITO DE SER do que um conjunto de ferramentas. Vou te mostrar como pareceu na prática nos meus 27 anos — e como você pode aplicar essa semana ainda, mesmo sem cargo.`,
    oQueVoceLeva: [
      'Os 7 hábitos do gestor lean (com exemplos reais)',
      'Como "atuar como gestor antes de ser promovido"',
      'Construir um portfolio de pequenas vitórias visíveis',
      'Falar a língua da diretoria (números, prioridades, riscos)',
    ],
    episodios: [
      { numero: 1, titulo: 'Andar pelo gemba (mesmo no remoto)', duracao: '14 min', resumo: 'Ir onde o trabalho acontece' },
      { numero: 2, titulo: 'Perguntar antes de ordenar', duracao: '12 min', resumo: 'A pergunta que muda a conversa' },
      { numero: 3, titulo: 'Ler número antes de reagir', duracao: '15 min', resumo: 'Evitar o "achismo de gestor" ' },
      { numero: 4, titulo: 'Feedback em tempo real', duracao: '16 min', resumo: 'Sem esperar a avaliação anual' },
      { numero: 5, titulo: 'Eliminar reunião inútil', duracao: '12 min', resumo: 'Como dizer "isso podia ser um email"' },
      { numero: 6, titulo: 'Defender o time pra cima', duracao: '14 min', resumo: 'Sua moeda mais valiosa' },
      { numero: 7, titulo: 'Ser exigente pra dentro', duracao: '15 min', resumo: 'Sem virar tirano' },
      { numero: 8, titulo: 'Portfolio de pequenas vitórias', duracao: '18 min', resumo: 'O que mostrar quando a vaga abrir' },
      { numero: 9, titulo: 'Falar a língua da diretoria', duracao: '20 min', resumo: 'Números, prioridades, riscos' },
      { numero: 10, titulo: 'A conversa de carreira que você precisa ter', duracao: '14 min', resumo: 'Com seu chefe — e quando' },
    ],
    ferramentas: [
      { label: 'Ver suas iniciativas e formações', rota: '/education' },
      { label: 'Pedir mentoria de carreira ao Mentor', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Conversar com o Mentor', rota: '/chat' },
    tags: ['destaque', 'carreira'],
  },

  {
    id: 'especialista-projetos-complexos',
    numero: '08',
    titulo: 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria',
    subtitulo: 'A formação completa pra liderar projetos estratégicos',
    dor: 'Pra você passar de "faz pequenos" pra "lidera os complexos"',
    paraQuem: 'Gestor que quer dar o salto pra diretor ou gerente sênior',
    icone: Trophy,
    gradient: 'from-[#1E2D6E] via-[#0033CC] to-[#0a0f33]',
    glow: 'rgba(0, 51, 204, 0.55)',
    accent: '#0033CC',
    motif: 'orbit-system',
    duracao: '12 semanas',
    nivel: 'Avançado',
    totalEpisodios: 12,
    selo: 'FORMAÇÃO LBW',
    cartaIsrael: `Liderar 50 projetos pequenos é DIFERENTE de liderar 1 grande. Em 27 anos aprendi: projeto complexo tem 5 forças simultâneas pra gerenciar — escopo, prazo, custo, qualidade, risco — e mais 3 invisíveis: política interna, capacidade do time, dependências externas.

Aqui você vai aprender o framework PMI completo, mas adaptado pro mundo real (porque PMBOK puro é teoria). Risk register que funciona, gerenciamento de stakeholders pra projetos que envolvem 5+ áreas, e como NÃO virar babá de cronograma.

Essa trilha não é pra todo mundo. É pra quem já lidera e quer dar o salto pra diretor/gerente sênior. Demanda 12 semanas de dedicação, mas o ROI no salário é absurdo.`,
    oQueVoceLeva: [
      'Estruturar projeto de 18 meses sem perder o controle',
      'Gerenciar riscos de um jeito que não vira teatro',
      'Negociar prazo/escopo/orçamento sem virar inimigo do patrocinador',
      'Construir relatório executivo que diretoria realmente lê',
    ],
    episodios: [
      { numero: 1, titulo: 'As 8 forças do projeto complexo', duracao: '18 min', resumo: '5 visíveis + 3 invisíveis' },
      { numero: 2, titulo: 'Charter PMI vs Charter prático', duracao: '20 min', resumo: 'O que importa de verdade' },
      { numero: 3, titulo: 'WBS sem virar academia', duracao: '22 min', resumo: 'Quebra de escopo que aguenta o real' },
      { numero: 4, titulo: 'Cronograma de 18 meses', duracao: '24 min', resumo: 'Marcos, dependências, folga' },
      { numero: 5, titulo: 'Orçamento e curva-S', duracao: '20 min', resumo: 'Acompanhar sem virar contador' },
      { numero: 6, titulo: 'Risk register que funciona', duracao: '22 min', resumo: 'Não o que você preenche e esquece' },
      { numero: 7, titulo: 'Stakeholders em 5+ áreas', duracao: '20 min', resumo: 'A política interna do projeto grande' },
      { numero: 8, titulo: 'Comitê de patrocínio mensal', duracao: '16 min', resumo: 'A reunião que segura o projeto' },
      { numero: 9, titulo: 'Quando replanejar (e como vender)', duracao: '18 min', resumo: 'Sem perder credibilidade' },
      { numero: 10, titulo: 'Relatório executivo de 1 página', duracao: '14 min', resumo: 'O que diretoria realmente lê' },
      { numero: 11, titulo: 'Encerrar projeto grande', duracao: '16 min', resumo: 'Lições aprendidas que servem' },
      { numero: 12, titulo: 'O que vem depois da entrega', duracao: '12 min', resumo: 'Sustentação e próximo ciclo' },
    ],
    ferramentas: [
      { label: 'Charter PMI completo no app', rota: '/projects' },
      { label: 'Apresentar caso ao Mentor sênior', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Estruturar meu próximo projeto', rota: '/projects' },
    tags: ['avancado', 'carreira'],
  },

  {
    id: 'analise-risco-mudanca',
    numero: '04',
    titulo: 'Como Antecipar Riscos Antes que Virem Problemas',
    subtitulo: 'Antes de apertar o botão, leia o radar',
    dor: 'Pra você não ser lembrado como quem quebrou o processo',
    paraQuem: 'Quem vai liderar uma mudança grande nos próximos 90 dias',
    icone: ShieldAlert,
    gradient: 'from-red-500 via-rose-700 to-slate-900',
    glow: 'rgba(239, 68, 68, 0.45)',
    accent: '#EF4444',
    motif: 'shield-radar',
    duracao: '2 semanas',
    nivel: 'Intermediário',
    totalEpisodios: 5,
    selo: 'NOVO',
    cartaIsrael: `Numa multinacional alemã, vi um colega brilhante implementar uma mudança "perfeita" num sábado de manhã. Segunda-feira a produção parou por 9 horas. Custo: 1.2 milhão de euros. Ele tinha pensado em TUDO — menos no que ninguém pensa.

Aqui está a verdade: o problema não são os riscos que você ENXERGA. São os que você não enxergou. Análise de risco não é preencher uma planilha vermelha-amarelo-verde — é uma DISCIPLINA de pensar adverso, perguntar "e se?", e ter um plano B antes de precisar dele.

Te ensino o framework que uso em toda mudança que envolve mais de R$ 100k em risco: FMEA prático, plano de contingência em 1 página, e o ritual de revisão pré-go-live que NUNCA falhou comigo.`,
    oQueVoceLeva: [
      'Identificar riscos invisíveis (os que você normalmente não vê)',
      'Aplicar FMEA sem virar burocracia',
      'Construir plano B em 1 página antes do go-live',
      'Saber o momento exato de adiar ou seguir em frente',
    ],
    episodios: [
      { numero: 1, titulo: 'Os riscos que você não enxerga', duracao: '16 min', resumo: 'Por que sempre vem do lugar que você não olhou' },
      { numero: 2, titulo: 'FMEA prático em 1 hora', duracao: '22 min', resumo: 'Severidade, ocorrência, detecção — sem academicismo' },
      { numero: 3, titulo: 'Plano B em 1 página', duracao: '15 min', resumo: 'O documento que salva a sua noite' },
      { numero: 4, titulo: 'Ritual pré-go-live', duracao: '18 min', resumo: 'A checklist de 11 perguntas que NUNCA falhou' },
      { numero: 5, titulo: 'Adiar ou seguir? O critério', duracao: '14 min', resumo: 'Decisão que separa amador de sênior' },
    ],
    ferramentas: [
      { label: 'Plano de ação + matriz Esforço x Impacto', rota: '/projects' },
      { label: 'Validar seu plano com o Mentor', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Avaliar minha próxima mudança', rota: '/projects' },
    tags: ['destaque', 'execucao'],
  },

  {
    id: 'identificar-desperdicio',
    numero: '10',
    titulo: 'Identifique o desperdício escondido',
    subtitulo: 'Onde está o dinheiro que ninguém vê',
    dor: 'Pra parar de andar passando por R$ 200k jogados fora',
    paraQuem: 'Quem está na operação e quer mostrar valor rápido',
    icone: Recycle,
    gradient: 'from-lime-400 via-emerald-600 to-teal-900',
    glow: 'rgba(132, 204, 22, 0.45)',
    accent: '#84CC16',
    motif: 'pulse-grid',
    duracao: '2 semanas',
    nivel: 'Iniciante',
    totalEpisodios: 5,
    cartaIsrael: `Numa fábrica que visitei em 2019, o supervisor me garantiu: "Aqui não tem desperdício, somos enxutos." Em 4 horas de gemba, mapeei R$ 380 mil por ano em desperdício invisível. Ele não enxergava porque era O QUE ELE FAZIA TODO DIA.

A boa notícia: desperdício tem um catálogo. Os 7+1 desperdícios do Lean. Quando você conhece o catálogo, você começa a ver o invisível. É como aprender o nome dos pássaros — antes, era só "passarinho"; depois, é "bem-te-vi, sabiá, pomba".

Aqui você vai aprender a fazer um diagnóstico rápido de qualquer área em 1 dia. Quantificar em R$. E ter munição pra propor a primeira melhoria com ROI claro. Isso é o que faz você sair do "achismo" pro "olha o dado".`,
    oQueVoceLeva: [
      'Reconhecer os 8 tipos de desperdício na sua área',
      'Fazer um diagnóstico de gemba em 1 dia',
      'Quantificar desperdício em R$ (e o que isso significa pro chefe)',
      'Construir o pitch da primeira melhoria com ROI',
    ],
    episodios: [
      { numero: 1, titulo: 'O catálogo dos 8 desperdícios', duracao: '18 min', resumo: 'TIMWOODS pra você nunca mais esquecer' },
      { numero: 2, titulo: 'O gemba walk de 1 dia', duracao: '20 min', resumo: 'Roteiro pra qualquer área' },
      { numero: 3, titulo: 'Quantificar em R$ sem chutar', duracao: '16 min', resumo: 'Cálculo simples que diretoria entende' },
      { numero: 4, titulo: 'O mapa do dinheiro escondido', duracao: '15 min', resumo: 'Como mostrar visualmente' },
      { numero: 5, titulo: 'Pitch da primeira melhoria', duracao: '14 min', resumo: 'O slide de 1 página que abre porta' },
    ],
    ferramentas: [
      { label: 'Observação direta + Charter', rota: '/projects' },
      { label: 'Pareto da área', rota: '/analysis' },
    ],
    ctaPrimario: { label: 'Diagnóstico da minha área', rota: '/projects' },
    tags: ['execucao', 'iniciante'],
  },

  {
    id: 'problema-cronico',
    numero: '06',
    titulo: 'Como Fazer Análises Estatísticas Aplicadas a Negócios',
    subtitulo: 'Estatística que vira decisão, não relatório',
    dor: 'Pra usar dado de verdade — não "sentimentômetro" disfarçado',
    paraQuem: 'Quem quer dominar correlação, regressão e teste de hipótese sem virar acadêmico',
    icone: RotateCw,
    gradient: 'from-purple-400 via-violet-600 to-indigo-900',
    glow: 'rgba(168, 85, 247, 0.45)',
    accent: '#A855F7',
    motif: 'pulse-grid',
    duracao: '5 semanas',
    nivel: 'Avançado',
    totalEpisodios: 8,
    selo: 'NOVO',
    cartaIsrael: `Numa consultoria que fiz em 2021, o cliente me disse: "Israel, esse defeito volta toda semana há 4 anos. Já tentamos de TUDO." Em 3 reuniões, descobrimos a causa real — era um detalhe num documento que ninguém lia há 6 anos. Resolvido em 2 semanas.

Problema crônico tem uma característica: a "solução óbvia" já foi tentada e falhou. Por isso ele é crônico. Se a solução óbvia funcionasse, ele já estaria resolvido. Quem chega chutando solução está repetindo o que já foi feito.

A chave é o método: voltar até a causa-raiz REAL (não a primeira que aparece), e atacar com solução que NÃO depende de "as pessoas lembrarem" — porque pessoa esquece. Mecanismo lembra. Te ensino a estruturar essa investigação sem virar drama.`,
    oQueVoceLeva: [
      'Diferenciar problema crônico de problema esporádico',
      'Investigar causa-raiz REAL (não a primeira que aparece)',
      'Construir solução que NÃO depende de "lembrar de fazer"',
      'Provar que o problema saiu — com dado, não com fé',
    ],
    episodios: [
      { numero: 1, titulo: 'Crônico vs. esporádico', duracao: '12 min', resumo: 'Por que estratégias diferentes' },
      { numero: 2, titulo: 'Cartas do histórico', duracao: '18 min', resumo: 'O que os 4 anos te dizem' },
      { numero: 3, titulo: 'Causa-raiz REAL (não a primeira)', duracao: '22 min', resumo: 'Ishikawa + 5 Porquês profundo' },
      { numero: 4, titulo: 'Solução à prova de esquecimento', duracao: '20 min', resumo: 'Poka-yoke prático' },
      { numero: 5, titulo: 'Plano de verificação', duracao: '15 min', resumo: 'Como saber se acabou de verdade' },
      { numero: 6, titulo: 'Fechar o ciclo (sem deixar voltar)', duracao: '14 min', resumo: 'Os 90 dias de observação' },
    ],
    ferramentas: [
      { label: 'Ishikawa + Plano de Controle', rota: '/projects' },
      { label: 'Análise de tendência dos dados', rota: '/analysis' },
    ],
    ctaPrimario: { label: 'Atacar meu crônico', rota: '/projects' },
    tags: ['execucao'],
  },

  {
    id: 'projetos-remotos',
    numero: '12',
    titulo: 'Coordenar projetos remotos',
    subtitulo: 'Quando o time está em 4 fusos diferentes',
    dor: 'Pra liderar sem ver as caras todo dia (e não perder o time)',
    paraQuem: 'Quem virou líder no mundo híbrido/remoto',
    icone: Globe2,
    gradient: 'from-indigo-400 via-violet-600 to-slate-900',
    glow: 'rgba(99, 102, 241, 0.45)',
    accent: '#6366F1',
    motif: 'orbit-system',
    duracao: '3 semanas',
    nivel: 'Intermediário',
    totalEpisodios: 5,
    selo: 'EM ALTA',
    cartaIsrael: `Coordeno projetos com time em Brasil, Nova Zelândia e Europa há 8 anos. No início foi caótico. Hoje rodo 3 projetos paralelos com gente em 4 fusos sem sentir.

O segredo do remoto não é ferramenta (Teams, Slack, Notion — não importa). O segredo é RITMO e ASSINCRONIA. Rituais síncronos curtos pra alinhar; trabalho assíncrono pra entregar. Quem mistura os dois entra em colapso.

Te ensino o operating system que uso: cadência semanal, status assíncrono, decisões documentadas, e como detectar quando alguém está "sumindo" pra agir antes de virar problema. Funciona em projeto de 6 ou 60 pessoas.`,
    oQueVoceLeva: [
      'Construir cadência semanal que respeita fuso e energia',
      'Separar o que precisa de reunião do que pode ser assíncrono',
      'Documentar decisão sem virar burocracia',
      'Detectar desengajamento antes da pessoa "sumir"',
    ],
    episodios: [
      { numero: 1, titulo: 'Ritmo síncrono x assíncrono', duracao: '15 min', resumo: 'A separação que salva o projeto' },
      { numero: 2, titulo: 'Cadência semanal que respeita o fuso', duracao: '18 min', resumo: 'Modelo que funciona em qualquer time' },
      { numero: 3, titulo: 'Decisão documentada em 5 linhas', duracao: '14 min', resumo: 'Pra ninguém perguntar de novo' },
      { numero: 4, titulo: '"Onde está fulano?" — detectar antes', duracao: '16 min', resumo: 'Sinais de desengajamento remoto' },
      { numero: 5, titulo: 'Encontro presencial que valeu o voo', duracao: '12 min', resumo: 'Quando juntar todos vale a pena' },
    ],
    ferramentas: [
      { label: 'Cronograma + Plano de Comunicação', rota: '/projects' },
      { label: 'Conversar sobre seu caso com o Mentor', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Estruturar meu time remoto', rota: '/projects' },
    tags: ['lideranca'],
  },
];

// =============================================================================
// CATEGORIAS (rows do Netflix)
// =============================================================================

export const CATEGORIAS: Categoria[] = [
  {
    id: 'destaques',
    titulo: 'Em destaque pra você',
    subtitulo: 'O que mais transforma carreira em 30 dias',
    trilhaIds: [
      'ferramentas-dia-a-dia',
      'apresentar-recomendacao',
      'analise-risco-mudanca',
      'mudanca-com-menos-resistencia',
      'perfil-gestor-lean',
      'dados-do-dia-a-dia',
    ],
  },
  {
    id: 'comece-aqui',
    titulo: 'Comece por aqui',
    subtitulo: 'Pra quem está chegando agora',
    trilhaIds: [
      'ferramentas-dia-a-dia',
      'dados-do-dia-a-dia',
      'apresentar-recomendacao',
      'identificar-desperdicio',
    ],
  },
  {
    id: 'faca-acontecer',
    titulo: 'Faça acontecer na sua área',
    subtitulo: 'Execução: do problema ao resultado',
    trilhaIds: [
      'melhorar-minha-area',
      'analise-risco-mudanca',
      'identificar-desperdicio',
      'problema-cronico',
    ],
  },
  {
    id: 'lideranca',
    titulo: 'Liderança e pessoas',
    subtitulo: 'A parte que ninguém te ensinou na faculdade',
    trilhaIds: [
      'mudanca-com-menos-resistencia',
      'gerenciar-pessoas-projeto',
      'projetos-remotos',
    ],
  },
  {
    id: 'carreira',
    titulo: 'Próximo passo na carreira',
    subtitulo: 'Como subir sem MBA caro',
    trilhaIds: [
      'perfil-gestor-lean',
      'especialista-projetos-complexos',
      'apresentar-recomendacao',
    ],
  },
];

// =============================================================================
// HELPERS
// =============================================================================

export function getTrilha(id: string): Trilha | undefined {
  return TRILHAS.find(t => t.id === id);
}

export function getTrilhasByCategoria(categoriaId: string): Trilha[] {
  const cat = CATEGORIAS.find(c => c.id === categoriaId);
  if (!cat) return [];
  return cat.trilhaIds
    .map(id => TRILHAS.find(t => t.id === id))
    .filter((t): t is Trilha => t !== undefined);
}

/** Trilha "Continue assistindo" — heurística simples: a primeira de destaques */
export function getTrilhaContinuar(): Trilha {
  return TRILHAS[0];
}
