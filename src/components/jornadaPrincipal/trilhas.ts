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
  BarChart3,
  Mic,
  Users,
  Trophy,
  ShieldAlert,
  Recycle,
  RotateCw,
  Compass,
  Network,
  Search,
  MessageSquare,
  Eye,
  Crosshair,
  GitBranch,
  Megaphone,
  Shield,
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

/**
 * Situação — usado APENAS pela Trilha 1.
 *
 * A Trilha 1 não é uma sequência linear de episódios. É um KIT DE ADAPTAÇÃO
 * organizado por situação real que o profissional enfrenta nos primeiros
 * meses de uma área nova. O aluno consome QUANDO trava em algo — não em ordem.
 *
 * Por isso o modal renderiza as situações como CÍRCULOS (não como lista
 * numerada de episódios). Cada círculo abre uma carta-vídeo + ferramenta +
 * prompt do Mentor IA.
 *
 * Cada situação separa explicitamente PARTE TÉCNICA (método, ferramenta)
 * de PARTE COMPORTAMENTAL (régua de decisão, frame de comunicação). Israel
 * é técnico — comportamento só entra como critério objetivo, nunca como
 * "como você se sente".
 */
export interface Situacao {
  id: string;
  /** Frase em 1ª pessoa: "Cheguei e não entendi como minha área se encaixa no todo" */
  titulo: string;
  /** Quando esse problema dói (gatilho) */
  quandoDoi: string;
  /** Tópicos da parte técnica (método, ferramenta) */
  parteTecnica: string[];
  /** Tópicos da parte comportamental — sempre régua/critério, nunca emoção */
  parteComportamental: string[];
  /** Artefato concreto que fica salvo na conta do aluno */
  artefato: string;
  /** Vídeo do Israel — duração curta + resumo do caso real que ele conta */
  videoIsrael: { duracao: string; resumo: string };
  /** Prompt pré-moldado pro Mentor IA — aluno só completa os colchetes */
  promptMentor: string;
  /** Trilha paga que aprofunda esse tema (gateway) */
  conexaoPaga?: string;
  /** Ícone lucide */
  icone: ElementType;
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
  selo?: 'NOVO' | 'TOP 10' | 'EM ALTA' | 'IMPERDÍVEL' | 'FORMAÇÃO LBW' | 'COMECE AQUI' | 'CULTURA';
  /** Carta do Israel — 1ª pessoa, 3 a 4 parágrafos */
  cartaIsrael: string;
  oQueVoceLeva: string[];
  episodios: Episodio[];
  /**
   * Situações — opcional. Quando presente, o modal renderiza um GRID DE CÍRCULOS
   * em vez da lista linear de episódios. Hoje só a Trilha 1 usa isso.
   */
  situacoes?: Situacao[];
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
    titulo: 'Kit 90 Dias: Sobreviva e Se Destaque em Uma Nova Área',
    subtitulo: '5 fases — do "entender a área" ao "comunicar com profissionalismo"',
    dor: 'Pra você sair do "perdido" e chegar no "olha o que mudou" antes do fim do primeiro ano',
    paraQuem: 'Quem chegou agora (1 semana a 6 meses) numa empresa nova, área nova ou função nova — e quer mostrar valor antes de virar "mais um" do time',
    icone: Compass,
    gradient: 'from-blue-500 via-blue-700 to-indigo-900',
    glow: 'rgba(59, 130, 246, 0.45)',
    accent: '#3B82F6',
    motif: 'spiral-flow',
    duracao: '1 semana',
    nivel: 'Iniciante',
    totalEpisodios: 5,
    selo: 'COMECE AQUI',
    cartaIsrael: `Olha, passei por 5 multinacionais em 2 países. Toda vez que cheguei numa empresa nova ou mudei de área, vivi a mesma coisa: os primeiros 6 meses são uma corrida entre se adaptar E entregar algo que mostre que valeu a contratação.

A maioria foca SÓ na adaptação e perde a janela. Quem tenta entregar antes de entender a área queima carreira logo de cara. O caminho certo é uma sequência — e é exatamente isso que esta trilha te dá: **5 fases**, na ordem.

**Fase 1 — Entenda como sua área funciona** (SIPOC, RACI, Organograma, Indicadores). **Fase 2 — Encontre os problemas que merecem atenção** (Ideia de Projeto, GUT, RAB, Entendendo o Problema). **Fase 3 — Descubra a causa antes de agir** (Mapa de Processo, Brainstorming, Espinha de Peixe, Análise Gráfica). **Fase 4 — Escolha e implemente a melhor solução** (Esforço × Impacto, Plano de Ação, Antes × Depois). **Fase 5 — Comunique-se com profissionalismo** (postura, vestimenta, telefone, Teams e Outlook).

Cada fase tem parte técnica (a ferramenta) e parte comportamental (a régua de decisão e a postura). Abra a fase que você está vivendo agora. Sem coach. É o que eu faria se fosse você chegando hoje.

Quando quiser ir mais fundo (FMEA, estatística aplicada, gestão de mudança), as outras trilhas estão lá.`,
    oQueVoceLeva: [
      'Fase 1 — Entender sua área em 2 dias: SIPOC, RACI, Organograma e Indicadores',
      'Fase 2 — Achar os problemas certos: Ideia de Projeto, Matriz GUT, Matriz RAB e Entendendo o Problema',
      'Fase 3 — Chegar na causa raiz real: Mapa de Processo, Brainstorming, Espinha de Peixe e Análise Gráfica',
      'Fase 4 — Implementar a melhor solução: Esforço × Impacto, Plano de Ação e Antes × Depois',
      'Fase 5 — Comunicar com profissionalismo: postura, vestimenta, telefone, Teams e Outlook',
    ],
    episodios: [
      // Mantido vazio porque a Trilha 1 usa "situacoes" em vez de "episodios".
      // O modal detecta `situacoes` e renderiza círculos automaticamente.
    ],
    situacoes: [
      {
        id: 'fase-1-entender-area',
        titulo: 'Fase 1 — Entenda Como Sua Área Funciona',
        quandoDoi: 'Primeiras semanas. Você sabe o título do cargo, mas não consegue explicar em 3 frases o que sua área entrega, pra quem, e como ela se conecta com o resto da empresa.',
        parteTecnica: [
          'SIPOC — fornecedores, entradas, processo, saídas e clientes da sua área',
          'Matriz RACI — quem é Responsável, Aprovador, Consultado e Informado em cada entrega',
          'Organograma — chefe, chefe do chefe e as áreas vizinhas que afetam você',
          'Indicadores — quais números medem o sucesso da sua área (estratégico, tático, operacional)',
        ],
        parteComportamental: [
          'Nunca confie só na descrição do cargo. Valide com 3 fontes: seu chefe, um par direto e alguém que já saiu da área',
          'Critério: se em 2 semanas você não explica sua área em 3 frases pra um leigo, ainda está incompleto — volte às fontes',
          'Observe sem julgar. Nas primeiras semanas, entenda o "porquê" de cada processo antes de questionar',
        ],
        artefato: 'SIPOC + RACI + Organograma + Indicadores da sua área (mapa completo de "como minha área funciona")',
        videoIsrael: {
          duracao: '6 min',
          resumo: 'Em Braskem aos 26, levei 2 semanas mapeando minha área pelas pessoas erradas. Te mostro como fazer em 2 dias com SIPOC, RACI e organograma — e 3 conversas certas.',
        },
        promptMentor: 'Cheguei numa área nova: [sua área]. Me ajude a montar o SIPOC, o RACI e a entender o organograma pra explicar minha área em 3 frases.',
        conexaoPaga: 'Trilha 8 — Cultura Lean (fluxo de valor extendido)',
        icone: Compass,
      },
      {
        id: 'fase-2-encontrar-problemas',
        titulo: 'Fase 2 — Encontre Problemas que Merecem Atenção',
        quandoDoi: 'Você já entende a área, mas tem várias dores e oportunidades soltas — e não sabe qual atacar primeiro nem como transformar isso num projeto.',
        parteTecnica: [
          'Ideia de Projeto de Melhoria — transforma incômodos do dia a dia em projetos candidatos',
          'Matriz GUT — prioriza por Gravidade, Urgência e Tendência',
          'Matriz RAB — prioriza por Retorno, Alcance e Baixo esforço',
          'Entendendo o Problema — fecha o escopo do problema escolhido (o que está dentro, o que está fora, qual a meta)',
        ],
        parteComportamental: [
          'Regra: não ataque o primeiro problema que aparece. Liste vários e priorize com critério (GUT/RAB), não por impulso',
          'O problema certo é o que tem dono, dado e dor — se falta um dos três, repense',
          'Frase pronta: "Antes de aceitar prazo, posso confirmar qual seria o sinal de que o problema foi resolvido?"',
        ],
        artefato: 'Carteira de projetos priorizada (GUT + RAB) + 1 problema bem definido (escopo + meta)',
        videoIsrael: {
          duracao: '7 min',
          resumo: 'Vi muita gente trabalhar duro no problema errado. Te ensino a usar GUT e RAB pra escolher o que realmente move o ponteiro — e fechar o escopo antes de prometer prazo.',
        },
        promptMentor: 'Tenho essas dores na minha área: [liste]. Me ajude a priorizar com GUT e RAB e a fechar o escopo do problema mais importante.',
        conexaoPaga: 'Trilha 4 — Antecipar Riscos / Trilha 9 — Especialista em Gestão de Projetos',
        icone: Search,
      },
      {
        id: 'fase-3-descobrir-causa',
        titulo: 'Fase 3 — Descubra a Causa de um Problema Antes de Agir',
        quandoDoi: 'Você tem o problema definido, mas a primeira causa parece "óbvia demais". Você sente que se atacar só ela, o problema volta.',
        parteTecnica: [
          'Mapeamento de Processo — desenha o fluxo real (não o idealizado) pra ver onde trava',
          'Brainstorming — levanta todas as causas possíveis, sem filtrar de cara',
          'Espinha de Peixe (Ishikawa) — organiza as causas nos 6M: Método, Máquina, Material, Mão-de-obra, Medida, Meio-ambiente',
          'Análise Gráfica e Estatística — confirma com dado qual causa pesa de verdade',
        ],
        parteComportamental: [
          'Regra: nunca pare na primeira causa. Cave pelo menos 3 níveis de "por quê?" — antes disso ainda é sintoma',
          'Causa raiz aponta pra SISTEMA (processo, regra, decisão), nunca pra uma pessoa. "Falha do operador" não é causa, é desistência',
          'Sinal de alerta: se todo mundo concorda fácil na primeira hipótese, desconfie. Investigação séria gera fricção',
        ],
        artefato: 'Mapa de processo + Espinha de Peixe preenchida + análise gráfica que confirma a causa principal',
        videoIsrael: {
          duracao: '8 min',
          resumo: 'Numa fábrica todo mundo dizia "falha do operador". Em 4 horas, com mapa de processo e Ishikawa, descobri um detalhe num documento que ninguém lia há 6 anos. Resolvido em 2 semanas.',
        },
        promptMentor: 'Tô investigando esse problema: [descrição]. Me ajude a mapear o processo e montar a Espinha de Peixe pra achar a causa raiz real, não a óbvia.',
        conexaoPaga: 'Trilha 6 — Análises Estatísticas (causa-raiz com dado) / Trilha 4 — FMEA',
        icone: GitBranch,
      },
      {
        id: 'fase-4-implementar-solucao',
        titulo: 'Fase 4 — Escolha e Implemente a Melhor Solução',
        quandoDoi: 'Você sabe a causa. Tem ideias de solução. Mas não sabe qual priorizar, como executar sem virar bagunça, nem como provar que funcionou.',
        parteTecnica: [
          'Esforço × Impacto — prioriza a solução do quadrante "alto impacto, baixo esforço" (não a mais ambiciosa)',
          'Plano de Ação (5W2H) — concretiza a solução: O quê, Por quê, Quem, Quando, Onde, Como, Quanto',
          'Antes × Depois — mede o resultado real comparando a linha de base com o pós-implementação',
        ],
        parteComportamental: [
          'Regra: comece pela ação de maior impacto e menor esforço — gera resultado rápido e cria momentum',
          'Toda solução precisa de dono e prazo. Sem 5W2H, "vamos melhorar" vira conversa que não acontece',
          'Antes de apresentar em grupo, valide 1:1 com 2-3 pessoas-chave — você chega na reunião com vozes já a favor',
        ],
        artefato: 'Matriz Esforço × Impacto + Plano de Ação 5W2H + comparativo Antes × Depois',
        videoIsrael: {
          duracao: '7 min',
          resumo: 'Em 2018 propus uma mudança que mexia com 40 pessoas. Priorizei com Esforço × Impacto, montei o 5W2H e provei com Antes × Depois. Aprovou na primeira reunião.',
        },
        promptMentor: 'Tenho essas soluções possíveis: [liste]. Me ajude a priorizar com Esforço × Impacto e montar o Plano de Ação 5W2H da escolhida.',
        conexaoPaga: 'Trilha 5 — Conduzir Mudanças (ADKAR) / Trilha 7 — Apresentações que Convencem',
        icone: Crosshair,
      },
      {
        id: 'fase-5-profissionalismo',
        titulo: 'Fase 5 — Comunique-se com Profissionalismo',
        quandoDoi: 'Você domina a parte técnica, mas trava no "como se portar": que roupa usar, como falar numa reunião, o que fazer com o celular, como se comportar no Teams e como organizar o Outlook. Detalhes que ninguém ensina e que decidem como você é percebido.',
        parteTecnica: [
          '📣 POSTURA / COMPORTAMENTO: fale em frases curtas e diretas; vá ao ponto antes do detalhe ("a conclusão é X, e o porquê é..."); escute mais do que fala nas primeiras semanas; nunca interrompa um sênior — anote e devolva no momento certo.',
          '👔 VESTIMENTA: na dúvida, vista-se um nível ACIMA do ambiente nos primeiros dias e calibre observando os seniores; limpo e bem ajustado vence caro e amassado; em call com câmera, a regra de roupa é a mesma da presencial.',
          '📱 TELEFONE / CELULAR: celular fora da mesa e no silencioso em reunião; nada de olhar a tela enquanto alguém fala; ligação de trabalho — atenda dizendo seu nome e retorne no mesmo dia; mensagem de trabalho não é WhatsApp pessoal (sem áudio longo).',
          '💻 TEAMS / REUNIÕES ONLINE: entre 1-2 min antes; câmera ligada por padrão (mostra presença), microfone no mudo quando não fala; teste áudio/vídeo antes de reunião importante; ao compartilhar tela, feche abas e notificações pessoais.',
          '📧 OUTLOOK: TO = quem precisa agir, CC = quem só precisa saber, BCC = raro e nunca pra "espionar"; assunto com prefixo claro ("Ação:", "FYI:", "Aprovação:"); corpo em 3 linhas (contexto → o que peço → prazo); use o Calendário com pauta.',
        ],
        parteComportamental: [
          'Regra de ouro da postura: nas primeiras 6 semanas, sua imagem é construída mais pelo COMO você se porta do que pelo QUE você entrega. Observe os seniores e copie o padrão.',
          'Vestimenta: erre pra mais formal no começo — é fácil relaxar depois, difícil recuperar a impressão de "desleixado".',
          'Telefone: o pior sinal numa reunião é olhar o celular. Comunica "isso aqui não é prioridade". Deixe longe da vista.',
          'Teams: câmera desligada o tempo todo passa "ausente/desengajado" — ligue, principalmente com chefe e clientes internos.',
          'Outlook: email não é chat. Se passar de 2 idas e voltas, troque por uma call. CC no chefe em TODO email queima sua autonomia percebida.',
        ],
        artefato: 'Checklist de profissionalismo (postura, vestimenta, telefone, Teams, Outlook) + matriz TO/CC/BCC + 3 templates de email',
        videoIsrael: {
          duracao: '8 min',
          resumo: 'Vi muita gente brilhante tecnicamente travar a carreira por detalhe de postura — câmera desligada, roupa errada, celular na mão, CC mal usado. Te dou a régua de cada ponto.',
        },
        promptMentor: 'Tenho [reunião / call no Teams / email importante / primeiro dia] com [pessoas e seus papéis]. Me ajude com postura, o que vestir, como usar o Teams e como escrever no Outlook pra passar profissionalismo.',
        conexaoPaga: 'Trilha 5 — Conduzir Mudanças (comunicação como vetor de change management)',
        icone: Megaphone,
      },
    ],
    ferramentas: [
      { label: 'Abrir meu primeiro projeto', rota: '/projects', descricao: 'As ferramentas das 5 fases: SIPOC, RACI, Organograma, Indicadores, Ideia de Projeto, GUT, RAB, Mapa de Processo, Brainstorming, Espinha de Peixe, Esforço × Impacto, Plano de Ação, Antes × Depois' },
      { label: 'Perguntar ao Mentor IA', rota: '/chat', descricao: 'Tire dúvidas sobre qual fase começar' },
    ],
    ctaPrimario: { label: 'Começar a trilha', rota: '/projects' },
    tags: ['destaque', 'iniciante', 'execucao'],
  },

  {
    id: 'dados-do-dia-a-dia',
    numero: '02',
    titulo: 'Como Recomendar Melhorias com Base em Análise de Dados',
    subtitulo: 'Da análise ao "sim" do chefe',
    dor: 'Pra parar de chutar e começar a propor com base em fato',
    paraQuem: 'Quem tem boa intuição mas precisa virar argumento defensável',
    icone: BarChart3,
    gradient: 'from-cyan-400 via-blue-600 to-blue-900',
    glow: 'rgba(34, 211, 238, 0.45)',
    accent: '#22D3EE',
    motif: 'pulse-grid',
    duracao: '3 semanas',
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

  // NOTA: a antiga Trilha 2 ("Como Investigar Problemas e Melhorar a Sua Área")
  // foi fundida com a Trilha 1 em jun/2026. O conteúdo dos 8 episódios virou
  // 4 situações (definir-problema, causa-raiz, vender-solucao, sustentar-ganho)
  // dentro do kit da Trilha 1. Esse vácuo no numero '02' é intencional —
  // a Trilha 7 (Apresentações) virou Trilha 2 na ordem visual.

  {
    id: 'apresentar-recomendacao',
    numero: '04',
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
    nivel: 'Intermediário',
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
    numero: '03',
    titulo: 'Como Conduzir Mudanças com Menos Resistência',
    subtitulo: 'Quando você fala e o time finalmente escuta',
    dor: 'Pra mudar processos sem virar inimigo do seu time',
    paraQuem: 'Quem propôs algo bom e foi vetado sem chance',
    icone: Users,
    gradient: 'from-amber-400 via-orange-600 to-red-900',
    glow: 'rgba(245, 158, 11, 0.45)',
    accent: '#F59E0B',
    motif: 'network-pulse',
    duracao: '1 semana',
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
    id: 'perfil-gestor-lean',
    numero: '06',
    titulo: 'Cultura Lean na Prática',
    subtitulo: 'Pensar Lean antes de aplicar Lean',
    dor: 'Pra você ver o desperdício que está na cara da sua área (e ninguém percebe)',
    paraQuem: 'Quem trabalha em processos e quer enxergar antes de executar',
    icone: Recycle,
    gradient: 'from-emerald-400 via-teal-600 to-emerald-900',
    glow: 'rgba(16, 185, 129, 0.45)',
    accent: '#10B981',
    motif: 'spiral-flow',
    duracao: '1 semana',
    nivel: 'Avançado',
    totalEpisodios: 10,
    selo: 'CULTURA',
    cartaIsrael: `Passei por linha de produção da Ford, projetos de US$ 20MM/ano na Braskem, hospital, banco, escritório. E aprendi a mesma lição em todo lugar: as ferramentas Lean (5S, kanban, kaizen, A3) só funcionam quando o OLHAR vem antes.

Tem gente que monta um quadro kanban bonito e nada muda. Tem gente que faz 5S na bancada e em 30 dias volta a bagunça. Por quê? Aplicou técnica sem ter cultura.

Cultura Lean é um JEITO de ver: ver o desperdício antes da ferramenta, ver o fluxo antes do indicador, ver o cliente antes do processo. Sem isso, qualquer Lean vira teatro.

Aqui te mostro como eu treinei esse olhar — com casos reais — e como você pode treinar o seu na próxima semana. Sem mudar de cargo, sem certificado, sem MBA. Só com prática.`,
    oQueVoceLeva: [
      'Os 5 princípios Lean explicados sem academia',
      'Os 8 desperdícios na sua rotina semanal (com exemplos da sua área)',
      'O ritual diário do olhar Lean (15 min)',
      'Como propor melhoria sem desafiar quem manda',
    ],
    episodios: [
      { numero: 1, titulo: 'Os 5 princípios Lean (valor, fluxo, puxar, perfeição)', duracao: '14 min', resumo: 'A base que ninguém ensina direito' },
      { numero: 2, titulo: 'Os 8 desperdícios — onde estão na sua semana', duracao: '16 min', resumo: 'Muda no detalhe' },
      { numero: 3, titulo: 'Andar pelo gemba (mesmo no remoto)', duracao: '12 min', resumo: 'Ir onde o trabalho acontece' },
      { numero: 4, titulo: 'Ver o fluxo: do pedido à entrega', duracao: '18 min', resumo: 'O mapa que muda a conversa' },
      { numero: 5, titulo: '5 porquês — perguntar antes de resolver', duracao: '14 min', resumo: 'Causa raiz sem chute' },
      { numero: 6, titulo: 'Cultura kaizen: pequena melhoria todo dia', duracao: '12 min', resumo: 'O hábito que multiplica' },
      { numero: 7, titulo: '5S não é arrumar a mesa', duracao: '13 min', resumo: 'O que ele de fato é' },
      { numero: 8, titulo: 'Quando otimizar e quando NÃO otimizar', duracao: '15 min', resumo: 'Nem tudo merece esforço' },
      { numero: 9, titulo: 'Propor melhoria sem desafiar o chefe', duracao: '16 min', resumo: 'A política da mudança' },
      { numero: 10, titulo: 'O ritual da semana Lean (15 min/dia)', duracao: '14 min', resumo: 'Como manter o olhar treinado' },
    ],
    ferramentas: [
      { label: 'Ver suas iniciativas e formações', rota: '/education' },
      { label: 'Conversar sobre Lean com o Mentor', rota: '/chat' },
    ],
    ctaPrimario: { label: 'Conversar com o Mentor', rota: '/chat' },
    tags: ['destaque', 'cultura'],
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
    cartaIsrael: `Liderar 50 projetos pequenos é DIFERENTE de liderar 1 grande. Aprendi na prática: projeto complexo tem 5 forças simultâneas pra gerenciar — escopo, prazo, custo, qualidade, risco — e mais 3 invisíveis: política interna, capacidade do time, dependências externas.

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
    numero: '05',
    titulo: 'Como Antecipar Riscos Antes que Virem Problemas',
    subtitulo: 'Antes de apertar o botão, leia o radar',
    dor: 'Pra você não ser lembrado como quem quebrou o processo',
    paraQuem: 'Quem vai liderar uma mudança grande nos próximos 90 dias',
    icone: ShieldAlert,
    gradient: 'from-red-500 via-rose-700 to-slate-900',
    glow: 'rgba(239, 68, 68, 0.45)',
    accent: '#EF4444',
    motif: 'shield-radar',
    duracao: '1 semana',
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
    id: 'problema-cronico',
    numero: '07',
    titulo: 'Como Fazer Análises Estatísticas Aplicadas a Negócios',
    subtitulo: 'Estatística que vira decisão, não relatório',
    dor: 'Pra usar dado de verdade — não "sentimentômetro" disfarçado',
    paraQuem: 'Quem quer dominar correlação, regressão e teste de hipótese sem virar acadêmico',
    icone: RotateCw,
    gradient: 'from-purple-400 via-violet-600 to-indigo-900',
    glow: 'rgba(168, 85, 247, 0.45)',
    accent: '#A855F7',
    motif: 'pulse-grid',
    duracao: '4 semanas',
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

];

// =============================================================================
// CATEGORIAS (rows do Netflix)
// =============================================================================

// CATEGORIAS (rows) — a Jornada hoje tem 1 única row de trilhas ("Comece por
// aqui", todas as 8 na ordem 1-8). As rows temáticas antigas (resolver-problema,
// aprofundamento, do-basico-ao-avancado) foram removidas em jun/2026; o
// aprofundamento técnico virou a seção informativa "Arsenal de ferramentas"
// dentro de JornadaPrincipal.tsx.
export const CATEGORIAS: Categoria[] = [
  {
    id: 'comece-aqui',
    titulo: 'Todas as trilhas',
    subtitulo: 'Do kit de adaptação ao nível especialista — você escolhe por onde começar',
    trilhaIds: [
      'ferramentas-dia-a-dia',          // 1
      'dados-do-dia-a-dia',             // 2
      'mudanca-com-menos-resistencia',  // 3
      'apresentar-recomendacao',        // 4
      'analise-risco-mudanca',          // 5
      'perfil-gestor-lean',             // 6
      'problema-cronico',               // 7
      'especialista-projetos-complexos',// 8 — âncora
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
