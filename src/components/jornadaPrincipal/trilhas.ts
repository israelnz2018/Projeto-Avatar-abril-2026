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
  AtSign,
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
    titulo: 'Como Chegar em uma Área Nova e Já Entregar Resultado',
    subtitulo: 'Kit de 10 situações pros primeiros 6 meses',
    dor: 'Pra você sair do "perdido" e chegar no "olha o que mudou" antes do fim do primeiro ano',
    paraQuem: 'Quem chegou agora (1 semana a 6 meses) numa empresa nova, área nova ou função nova — e quer mostrar valor antes de virar "mais um" do time',
    icone: Compass,
    gradient: 'from-blue-500 via-blue-700 to-indigo-900',
    glow: 'rgba(59, 130, 246, 0.45)',
    accent: '#3B82F6',
    motif: 'spiral-flow',
    duracao: 'Use quando travar',
    nivel: 'Iniciante',
    totalEpisodios: 10,
    selo: 'COMECE AQUI',
    cartaIsrael: `Olha, em 27 anos passei por 5 multinacionais em 2 países. Toda vez que cheguei numa empresa nova ou mudei de área, vivi a mesma coisa: os primeiros 6 meses são uma corrida entre se adaptar E entregar algo que mostre que valeu a contratação.

A maioria foca SÓ na adaptação e perde a janela. Quando se dá conta, já é "mais um" do time — e ninguém mais espera entrega especial. Por outro lado, quem tenta entregar antes de entender a área queima carreira logo de cara.

Esse kit cobre os 2 lados. **Primeira metade (6 situações):** se adaptar sem travar — mapear a área, escalar com critério, destravar análises, propor sem parecer arrogante, enxergar desperdício, dominar etiqueta de email. **Segunda metade (4 situações):** entregar a primeira mudança real — definir problema certo, achar causa-raiz, vender solução, sustentar o ganho.

Não é curso linear. Você abre o círculo da situação que tá te travando ESSA semana. Cada uma vem com parte técnica (a ferramenta) e parte comportamental (a régua de decisão). Sem coach. É o que eu faria se fosse você chegando hoje.

Quando quiser ir mais fundo em alguma das ferramentas (FMEA, estatística aplicada, gestão de mudança), as outras 7 trilhas estão lá.`,
    oQueVoceLeva: [
      'Mapear sua nova área em 2 dias (não em 2 semanas)',
      'Régua objetiva pra decidir QUANDO escalar e quando resolver sozinho',
      'Frame pra destravar análise antes de tocar no Excel',
      'Estrutura pra propor ideia sem parecer arrogante',
      'Olhar treinado pra enxergar desperdício no escritório (não só na fábrica)',
      'Etiqueta de email corporativo — TO, CC, BCC, tom — sem queimar carreira',
      'Mini-Charter pra transformar pedido vago em problema bem definido',
      'Ishikawa + 5 Porquês pra achar causa-raiz real (não a óbvia)',
      'Mapa de stakeholders pra vender solução sem virar inimigo do time',
      'Plano de controle pra mudança não voltar atrás em 60 dias',
    ],
    episodios: [
      // Mantido vazio porque a Trilha 1 usa "situacoes" em vez de "episodios".
      // O modal detecta `situacoes` e renderiza círculos automaticamente.
    ],
    situacoes: [
      {
        id: 'mapear-area',
        titulo: 'Cheguei e não entendi como minha área se encaixa no todo',
        quandoDoi: 'Primeiras 2-3 semanas. Você sabe o título do cargo mas não consegue explicar em 3 frases o que sua área entrega, pra quem, e como conecta com as outras.',
        parteTecnica: [
          'SIPOC do papel (não da empresa) — input → o que EU faço → output → cliente interno',
          'Leitura prática de organograma: chefe, chefe do chefe, áreas vizinhas que afetam você',
          'Fluxo de valor simplificado da área em 5 caixas',
        ],
        parteComportamental: [
          'Nunca confie só na job description. Valide com 3 fontes: seu chefe, um par direto, alguém que JÁ SAIU da área',
          'Critério: se em 2 semanas você não explica sua área em 3 frases pra um leigo, está incompleto — volta nas fontes',
        ],
        artefato: 'SIPOC do papel + 1-pager "minha área em 5 linhas"',
        videoIsrael: {
          duracao: '6 min',
          resumo: 'Em Braskem aos 26, levei 2 semanas mapeando minha área pelas pessoas erradas. Te mostro como fazer em 2 dias com 3 conversas.',
        },
        promptMentor: 'Me ajude a montar o SIPOC do meu papel. Eu trabalho em [sua área], minha entrada é [...], minha saída é [...], reporto pra [...].',
        conexaoPaga: 'Trilha 8 — Cultura Lean (fluxo de valor extendido)',
        icone: Compass,
      },
      {
        id: 'escalar-decisao',
        titulo: 'Não sei a quem responder primeiro nem quando escalar',
        quandoDoi: '3-4 pessoas pedindo coisas com prazos conflitantes. Dúvida constante: chamo meu chefe ou resolvo sozinho?',
        parteTecnica: [
          'RACI simplificado do dia a dia — pra cada demanda: quem é Responsável, Accountable, Consultado, Informado',
          'Matriz urgência × importância básica pra triagem das demandas da semana',
        ],
        parteComportamental: [
          'Régua de escalação em 3 perguntas: (1) é decisão acima do meu cargo? (2) custo de errar é maior que custo de pedir? (3) já tentei 1 opção e bati num bloqueio?',
          'Se 2 das 3 forem SIM, escala. Se não, resolve. Sem culpa',
          'Frase pronta pra escalar sem parecer fraco: "Tentei X e bati em Y. Antes de tentar Z, queria seu OK porque envolve [implicações]."',
        ],
        artefato: 'RACI semanal + tabela do critério de escalação',
        videoIsrael: {
          duracao: '6 min',
          resumo: 'Meu chefe alemão em Braskem tinha uma regra: não escala se você ainda tem 1 opção que não tentou. Te ensino a calibrar isso sem virar dependente.',
        },
        promptMentor: 'Tenho essas tarefas hoje: [tarefa A, B, C, D]. Me ajude a aplicar o critério de escalação e definir o que faço primeiro?',
        conexaoPaga: 'Trilha 6 — Gerenciar pessoas num projeto (RACI completo)',
        icone: Network,
      },
      {
        id: 'destravar-analise',
        titulo: 'Me pediram análise ou relatório e travei',
        quandoDoi: 'Planilha gigante na tela, comando vago do chefe ("dá uma olhada nesses números"), você não sabe nem começar.',
        parteTecnica: [
          'A pergunta antes do gráfico — escrever em 1 linha O QUE você está respondendo',
          'Brainstorming sozinho com o Mentor IA pra listar 5 hipóteses (15 min)',
          'Ishikawa rápido pra estruturar hipóteses em 4-6 grupos',
        ],
        parteComportamental: [
          'Regra de ouro: se em 30 min você não sabe o que está procurando, NÃO toca em Excel. Volta pra quem pediu',
          'Frase pronta sem parecer despreparado: "Pra entregar a análise certa, posso confirmar: você vai usar isso pra decidir X ou pra justificar Y? Faz diferença no recorte."',
          'O que NÃO falar: "Não entendi o que você quer" (queima)',
        ],
        artefato: '1-pager "minha pergunta + 5 hipóteses" antes de tocar no Excel',
        videoIsrael: {
          duracao: '7 min',
          resumo: 'Aos 28 numa multinacional alemã, me deram 50 mil linhas e travei o dia inteiro. Em 27 anos NUNCA mais toquei no Excel sem ter a pergunta escrita.',
        },
        promptMentor: 'Recebi essa demanda do meu chefe: [colar texto ou descrever]. Me ajude a transformar em uma pergunta clara antes de eu abrir o Excel.',
        conexaoPaga: 'Trilha 3 — Recomendar com Dados / Trilha 6 — Análises Estatísticas',
        icone: Search,
      },
      {
        id: 'propor-ideia',
        titulo: 'Tenho uma ideia, mas não sei propor sem parecer arrogante',
        quandoDoi: '3-6 meses de empresa. Você vê uma melhoria possível mas tem medo de soar "o novato que veio ensinar".',
        parteTecnica: [
          'Frame da proposta em 4 blocos: Problema (com dado) → Opções (3, não 1) → Recomendação (com critério) → Pedido (decisão específica)',
          '5W2H pra dar concretude operacional',
          'Esforço × Impacto pra mostrar que você pensou no custo',
        ],
        parteComportamental: [
          'Regra do pedido claro: toda proposta termina com 1 pergunta específica ("quero seu OK pra rodar piloto de 2 semanas com 1 time") — NUNCA "o que você acha?"',
          'Posicionamento de envio: segunda de manhã > sexta à tarde. Email > Slack. 1:1 antes do email se for proposta grande',
          'Frame de humildade técnica (não de submissão): "Vi um padrão, posso estar errado, mas se eu pudesse testar 2 semanas..."',
          'CC do primeiro email da proposta: ninguém além do seu chefe direto. Se ele aprovar, ele adiciona os outros',
        ],
        artefato: '1-pager da proposta (problema → opções → recomendação → pedido)',
        videoIsrael: {
          duracao: '7 min',
          resumo: 'Em Fisher & Paykel propus mudança que poupou US$ 200k. Não falei "tenho ideia incrível". Falei: "vi um padrão, posso estar errado, posso testar 2 semanas?". Frase exata.',
        },
        promptMentor: 'Tenho essa ideia: [descrever sua ideia]. Me ajude a montar o 1-pager com problema, 3 opções, recomendação e pedido específico.',
        conexaoPaga: 'Trilha 5 — Conduzir Mudanças / Trilha 7 — Apresentações',
        icone: MessageSquare,
      },
      {
        id: 'observar-desperdicio',
        titulo: 'Ando pela empresa mas não sei o que observar',
        quandoDoi: 'Passa pelos processos da empresa todo dia, sente que tem oportunidade escondida, mas seu reflexo é "tá tudo normal".',
        parteTecnica: [
          'Os 8 desperdícios (TIMWOODS) com exemplos de escritório — retrabalho de relatório, espera por aprovação, email desnecessário, reunião sem decisão',
          'Gemba walk básico em 1 dia — roteiro de observação prático',
          'Diário de observação (template)',
        ],
        parteComportamental: [
          'Regra: observe sem julgar. Nas primeiras 6 semanas, anota e cala. Valide 3 vezes antes de levar pra fora',
          'Frame que NÃO ofende: "Tô tentando entender por que fazemos assim — me ajuda?". Nunca "Por que VOCÊS fazem assim?" (acusa)',
          'Nunca aponte desperdício do trabalho do colega de mesa. Aponte desperdício do PROCESSO. Diferença sutil que salva carreira',
        ],
        artefato: 'Diário de 5 dias com 8 desperdícios observados (sem ainda propor solução)',
        videoIsrael: {
          duracao: '6 min',
          resumo: 'Numa fábrica em Camaçari mapeei R$ 380k de desperdício em 4 horas. Não cheguei dizendo "tá errado". Cheguei dizendo "me ensina por que faz assim".',
        },
        promptMentor: 'Observei isso na minha área: [descrição]. É qual dos 8 desperdícios e por quê?',
        conexaoPaga: 'Trilha 8 — Cultura Lean / ferramenta Observação Direta',
        icone: Eye,
      },
      {
        id: 'etiqueta-email',
        titulo: 'Não domino etiqueta de email — quando uso TO, CC, BCC',
        quandoDoi: 'Vai escrever pra 5+ pessoas e congela. Ou recebe email em grupo e não sabe se responde só pro remetente ou pra todos.',
        parteTecnica: [
          'TO = quem PRECISA agir. Se não vai fazer nada, não está no TO',
          'CC = quem precisa SABER mas não agir. Sinaliza visibilidade na hierarquia',
          'BCC = uso raro: listas grandes sem expor destinatários, ou comunicação interna sensível',
          'Reply vs Reply All: critério "essa informação muda algo pra essa pessoa específica?"',
          'Assunto com prefixo padrão: "Ação requerida:" / "FYI:" / "Aprovação:" / "Pergunta:"',
          'Corpo em 3 blocos: contexto (1 linha) → o que peço (1 linha) → quando preciso (1 linha)',
        ],
        parteComportamental: [
          'CC no seu chefe: só se ele já participou do contexto OU se você está formalmente escalando. CC no chefe todo email passa sensação de "tasselando" e queima sua autonomia percebida',
          'BCC NÃO é arma política. Usar BCC pra "ficar de olho" sem destinatário saber queima reputação INSTANTÂNEA se descobrirem',
          'Reply All: pergunta de freio — "vale ocupar a atenção de 12 pessoas?". Default = NÃO',
          'Tom da primeira mensagem pra um sênior: padrão neutro corporativo ("Olá [primeiro nome], …"). Nem "Oi!" nem "Prezado Sr."',
          'Resposta tardia (3+ dias): não invente desculpa, não se humilhe. "Voltando à sua mensagem — resposta abaixo." Ponto',
          'Quando NÃO usar email: se a conversa exigir mais de 2 idas e voltas, troca pra 1:1 ou call. Email não é chat',
        ],
        artefato: 'Matriz pessoal TO/CC/BCC + 3 templates prontos (pedido, escalação formal, FYI)',
        videoIsrael: {
          duracao: '7 min',
          resumo: 'Em 27 anos de multinacional vi mais carreira queimar por CC mal usado do que por erro técnico. Vou te contar o caso real de 2012 que me ensinou isso.',
        },
        promptMentor: 'Preciso escrever email sobre [assunto] pra [pessoas e seus papéis]. Me ajude a definir TO/CC/BCC, o assunto e os 3 blocos do corpo.',
        conexaoPaga: 'Trilha 5 — Conduzir Mudanças (comunicação como vetor de change management)',
        icone: AtSign,
      },
      // ───────────── SEGUNDA METADE: ENTREGAR PRIMEIRA MUDANÇA REAL ─────────────
      // As 4 situações abaixo cobrem o arco "definir problema → causa-raiz →
      // vender solução → sustentar ganho". É o que separa quem só se adaptou
      // de quem efetivamente entregou valor no primeiro ano.
      {
        id: 'definir-problema',
        titulo: 'Te pediram pra resolver um problema e você não sabe nem por onde começar',
        quandoDoi: '3-9 meses na empresa. Chefe te chama: "Resolve isso." Você nem sabe se é problema técnico, de processo, de gente, ou um sintoma de outra coisa.',
        parteTecnica: [
          'Diferença prática entre SINTOMA (o que se vê) e PROBLEMA (o que causa) — 70% dos juniors confunde os dois',
          'Mini-Charter em 1 página: problema (em 2 frases), escopo (o que está dentro/fora), critério de sucesso (como saberemos que resolveu)',
          'Métrica mínima viável — 1 número que mede o problema, medido HOJE (linha de base) — sem isso você não sabe se melhorou',
        ],
        parteComportamental: [
          'Regra: nunca aceite "resolve isso" sem 1 pergunta de clarificação ANTES de aceitar prazo. Sempre.',
          'Frase pronta: "Pra eu te entregar a coisa certa, posso confirmar: qual é o sintoma que você está vendo, e qual seria pra você o sinal de que resolveu?"',
          'Cuidado com a armadilha do herói: aceitar prazo sem definir escopo é receita pra entregar a coisa errada no prazo correto',
        ],
        artefato: 'Mini-Charter (1 página: problema, escopo, critério de sucesso, linha de base)',
        videoIsrael: {
          duracao: '7 min',
          resumo: 'Aos 26 me chamaram pra "resolver as paradas de produção". Em 2 semanas descobri que o problema real era a programação, não a parada. Te conto como aprendi a perguntar antes de aceitar.',
        },
        promptMentor: 'Meu chefe me pediu pra resolver: [descrição do pedido]. Me ajude a transformar isso num Mini-Charter — problema, escopo, critério de sucesso — ANTES de eu aceitar prazo.',
        conexaoPaga: 'Trilha 4 — Antecipar Riscos / Trilha 9 — Especialista em Gestão de Projetos',
        icone: Crosshair,
      },
      {
        id: 'causa-raiz',
        titulo: 'Achei a causa óbvia, mas suspeito que tem mais coisa',
        quandoDoi: 'Está investigando um problema. A primeira causa que aparece é "óbvia demais". Você sente que se atacar só ela, vai voltar.',
        parteTecnica: [
          'Ishikawa (Espinha de Peixe) — 6 categorias pra mapear causas em paralelo: Método, Máquina, Material, Mão-de-obra, Medida, Meio-ambiente',
          '5 Porquês — pergunta "por quê?" 5 vezes seguidas, sempre cavando mais fundo na resposta anterior',
          'Critério de quando usar cada um: Ishikawa quando NÃO sabe por onde começar; 5 Porquês quando JÁ tem uma hipótese e quer cavar',
        ],
        parteComportamental: [
          'Regra: nunca pare no PRIMEIRO porquê. Vá pelo menos até o 3º — antes disso ainda é sintoma',
          'Os 5 Porquês têm que apontar pra SISTEMA (processo, regra, decisão), nunca pra pessoa específica. "Falha do operador" não é causa raiz — é desistência',
          'Sinal de alerta: quando todo mundo concorda na primeira hipótese, DESCONFIE. Investigação séria gera fricção. Concordância fácil = ainda no sintoma',
        ],
        artefato: 'Ishikawa preenchido (1 página) + cadeia de 5 Porquês documentada com pelo menos 5 níveis',
        videoIsrael: {
          duracao: '8 min',
          resumo: 'Numa fábrica todo mundo dizia "falha do operador". Em 4 horas de 5 Porquês descobri que era um detalhe num documento que ninguém lia há 6 anos. Resolvido em 2 semanas, sem culpar ninguém.',
        },
        promptMentor: 'Tô investigando esse problema: [descrição]. A causa óbvia que apareceu é [X]. Me ajude a aplicar 5 Porquês pra verificar se é mesmo a raiz, ou tem coisa por trás.',
        conexaoPaga: 'Trilha 6 — Análises Estatísticas (causa-raiz com dado) / Trilha 4 — FMEA',
        icone: GitBranch,
      },
      {
        id: 'vender-solucao',
        titulo: 'Vou propor uma solução, mas tenho medo do time virar a cara',
        quandoDoi: 'Sua solução tá pronta. Você sabe que é boa. Mas sente que vai bater em resistência ("sempre fizemos assim", "isso não vai dar certo", "fácil falar de fora").',
        parteTecnica: [
          'Plano de Ação 5W2H — concretiza a proposta nos 7 campos: O quê, Por quê, Quem, Quando, Onde, Como, Quanto',
          'Esforço × Impacto — prioriza a 1ª ação (a do quadrante "alto impacto, baixo esforço") — não a mais ambiciosa',
          'Mapa de stakeholders simplificado em 3 colunas: APOIA / RESISTE / EM CIMA DO MURO',
        ],
        parteComportamental: [
          'Regra: comece pelo APOIADOR, nunca pelo resistente. Apoiador valida + cria momentum + vira aliado em reunião',
          'Nunca apresente solução nova em grupo grande primeiro. Faça 2-3 conversas 1:1 com stakeholders-chave ANTES da reunião — chega na reunião com 3-4 vozes já preparadas',
          'Frame pra abrir o 1:1: "Quero validar uma ideia com você antes de levar pra reunião — você pode me dar feedback honesto?" — quase ninguém recusa',
        ],
        artefato: '5W2H da solução + mapa de stakeholders (3 colunas) + roteiro do 1:1 de validação',
        videoIsrael: {
          duracao: '7 min',
          resumo: 'Em 2018 propus mudança de turno que ia mexer com 40 pessoas. Antes da reunião conversei 1:1 com 4 pessoas estratégicas. Quando apresentei, 4 vozes já defendiam por mim. Aprovou na primeira reunião.',
        },
        promptMentor: 'Vou propor essa solução: [descrição]. Me ajude a montar o 5W2H + identificar 3 stakeholders pra validar 1:1 ANTES da reunião de apresentação.',
        conexaoPaga: 'Trilha 5 — Conduzir Mudanças (ADKAR) / Trilha 7 — Apresentações que Convencem',
        icone: Megaphone,
      },
      {
        id: 'sustentar-ganho',
        titulo: 'Implementei a mudança e em 2 meses voltou tudo ao que era',
        quandoDoi: 'A mudança pegou. Time aderiu. Em 1-2 meses, devagar, todo mundo volta aos velhos hábitos. Você sente que perdeu tudo.',
        parteTecnica: [
          'Plano de Controle simplificado em 1 página: quem monitora, com que frequência, qual é a métrica, o que faz se voltar atrás',
          'POP (Procedimento Operacional Padrão) enxuto — 1 página com os 5 passos críticos da nova rotina (sem capa, sem rodapé, sem ISO)',
          '1 indicador único monitorado SEMANALMENTE nos primeiros 90 dias — se cair, você é o primeiro a saber',
        ],
        parteComportamental: [
          'Regra: mudança não termina na implementação. Termina quando vira ROTINA — e isso leva 90 dias de acompanhamento ativo',
          'Não delegue o monitoramento pro time nas primeiras 4 semanas. Você acompanha pessoalmente. Sinaliza que importa',
          'Quando algo voltar atrás, NÃO acuse o time. Pergunta: "o que dificultou hoje?" — em 9 de 10 vezes vai aparecer um obstáculo invisível que você não previu',
        ],
        artefato: 'Plano de Controle (1 página) + POP enxuto (5 passos) + calendário de check-ins semanais de 90 dias',
        videoIsrael: {
          duracao: '6 min',
          resumo: 'Em 2015 implementei uma mudança que parecia perfeita. Em 6 semanas tudo voltou. Quando voltei pra entender, descobri 3 obstáculos invisíveis que ninguém me contou. Hoje eu nunca implemento sem plano de controle.',
        },
        promptMentor: 'Implementei essa mudança na minha área: [descrição]. Me ajude a montar um plano de controle pra ela sustentar nos próximos 90 dias.',
        conexaoPaga: 'Trilha 8 — Cultura Lean (kaizen contínuo) / Trilha 5 — Conduzir Mudanças (reinforcement do ADKAR)',
        icone: Shield,
      },
    ],
    ferramentas: [
      { label: 'Abrir meu primeiro projeto', rota: '/projects', descricao: 'SIPOC, 5W2H, Brainstorming, Ishikawa, 5 Porquês, Esforço × Impacto, Observação Direta, Plano de Controle, POP' },
      { label: 'Perguntar ao Mentor IA', rota: '/chat', descricao: 'Tire dúvidas sobre qual situação atacar primeiro' },
    ],
    ctaPrimario: { label: 'Abrir o kit', rota: '/projects' },
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
    duracao: '6 semanas',
    nivel: 'Intermediário',
    totalEpisodios: 10,
    selo: 'CULTURA',
    cartaIsrael: `Em 27 anos passei por linha de produção da Ford, projetos $20MM/ano na Braskem, hospital, banco, escritório. E aprendi a mesma lição em todo lugar: as ferramentas Lean (5S, kanban, kaizen, A3) só funcionam quando o OLHAR vem antes.

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
