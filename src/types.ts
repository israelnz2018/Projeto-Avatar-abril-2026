export type DMAICPhase = 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control';

export interface Project {
  id: string;
  name: string;
  description?: string;
  problem?: string;
  goal?: string;
  scope?: string;
  currentPhase: string;
  initiativeId?: string; // New field to link project to an initiative
  ownerUid?: string;
  ownerEmail?: string;
  createdAt?: any;
  updatedAt?: string;
  completedTools?: string[];
  completedPhases?: string[];
}

export interface Initiative {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  phases?: { id: string, name: string }[];
  isFree?: boolean;
  // Curso "só conteúdo": quando false, o curso (initiative.name) existe em Educação
  // mas NÃO aparece como tipo de projeto na aba Projetos. Ausente/true = tem projeto
  // (comportamento atual preservado). Editável em Meus Cursos.
  temProjeto?: boolean;
  /** Curso que libera este tipo de projeto para o aluno. Tipos antigos usam o próprio id. */
  cursoAssociadoId?: string;
  /** Registro usado apenas como tipo de projeto; não aparece como curso em Educação. */
  somenteProjeto?: boolean;
  /** Nomes que esta iniciativa já teve. Mantém válido tudo que foi gravado por nome
   *  antes da renomeação — ver lib/courseRegistry.ts. */
  nomesAnteriores?: string[];
  createdAt: string;
  consultorId?: string; // Multi-tenant: dono do conteúdo (default 'israel' na Fase 0)
  /** Número de exibição (ordem + cor/ícone da trilha) — INDEPENDENTE do nome.
   * Renomear o curso nunca deve afetar ordem/visual; por isso isso não vem mais
   * de parsear o começo de `name`. */
  ordem?: number;
  /** Ícone escolhido pelo consultor (id do catálogo em services/initiativeVisual.tsx).
   * Ausente = cai no visual automático (ordem/nome). */
  iconId?: string;
  /** Cor escolhida pelo consultor (id do catálogo). Só usada junto de iconId. */
  corId?: string;
  /** Ícone próprio, enviado pelo consultor (PNG/SVG) — tem prioridade sobre iconId. */
  iconUrl?: string;
  /** Configuração comercial exibida ao aluno quando ele clica no curso bloqueado. */
  vendaAtiva?: boolean;
  /** Preço à vista apresentado no modal de compra, em reais. */
  precoVenda?: number;
  /** URL pública do checkout correspondente na Hotmart. */
  hotmartCheckoutUrl?: string;
  /** Texto curto de apresentação usado na mini landing page do curso. */
  descricaoVenda?: string;
  /** Lista do que está incluído no pacote comercial. */
  itensInclusos?: string[];
  /** Ligacoes entre ferramentas DESTE projeto (destino toolId -> fontes).
   * Ausente = usa o mapa global de fallback em services/toolLinks.ts. */
  toolLinks?: Record<string, ToolLink>;
}

// ===== Multi-tenant (white-label) =====
// Um Consultor é um tenant: tem o próprio subdomínio, marca e cursos.
// Israel = consultor #0 ('israel'). Ver PLANO-WHITELABEL.md.
export interface ConsultorBranding {
  nome: string;   // nome/marca exibida
  sigla?: string; // marca curta (até 7 chars) que aparece no cabeçalho dos PPTs
  slogan?: string; // texto curto exibido junto/abaixo da logo no menu lateral
  fotoUrl?: string; // foto do consultor (aparece no avatar no lugar das iniciais)
  logoUrl: string;
  cores: {
    navy: string;
    blue: string;
    light: string;
    ink: string;
    muted: string;
  };
  // Modelo de PPT do consultor:
  //  'padrao' → usa o template LBW e as 3 cores escolhidas (navy/blue/light)
  //  'proprio' → o consultor sobe as próprias imagens de capa + página interna
  pptModo?: 'padrao' | 'proprio';
  pptCapaUrl?: string;    // imagem de fundo da capa (modo 'proprio')
  pptInternaUrl?: string; // imagem de fundo das páginas internas (modo 'proprio')
  // Prévia PNG do 1º slide, gerada no navegador na hora do upload do .pptx.
  // Existe só pra mostrar na tela Minha Marca — não entra na exportação.
  pptCapaPreviaUrl?: string;
  pptInternaPreviaUrl?: string;
}

export interface ConsultorCertificateConfig {
  modo: 'padrao' | 'proprio';
  /** Fundo A4 paisagem exportado do PowerPoint/Canva como PNG ou JPG. */
  fundoUrl?: string;
  assinaturaUrl?: string;
  instituicao?: string;
  emissorNome?: string;
  emissorCargo?: string;
  textoRodape?: string;
  titulo?: string;
  textoCertificamos?: string;
  textoConclusao?: string;
  textoAprovacao?: string;
  corPrincipal?: string;
  corDestaque?: string;
  corTexto?: string;
  fonte?: 'moderna' | 'arial' | 'times' | 'georgia' | 'verdana' | 'classica' | 'serifada';
  mostrarLogo?: boolean;
  mostrarAssinatura?: boolean;
  mostrarQrCode?: boolean;
  /** Regras editáveis por curso. Os dados variáveis do aluno/emissão não ficam aqui. */
  cursos?: Record<string, {
    cursoNome?: string;
    cargaHoraria?: number;
  }>;
  /** Incrementada a cada salvamento para identificar a arte usada na emissão. */
  versao?: number;
  atualizadoEm?: string;
}

// Vitrine — a "prateleira" pública do consultor (marketing + negociação).
// Vive no doc do consultor (que é público). Nunca guarda dado sensível.
export interface ConsultorVitrine {
  publicada?: boolean;      // aparece na vitrine pública?
  descricao?: string;       // o que ele oferece / bio curta
  especialidade?: string;   // área de atuação (ex.: "Lean na indústria")
  contatoEmail?: string;
  contatoWhatsapp?: string;
  site?: string;
  cursosVisiveis?: string[]; // nomes dos cursos que o consultor escolheu mostrar na vitrine
}

export interface Consultor {
  id: string;            // = subdomínio (ex.: 'israel' → israel.educacaopelotrabalho.com)
  nome: string;
  subdominio: string;
  email?: string;        // e-mail do consultor (dono do tenant) — definido pelo admin
  mentorNome?: string;   // nome do mentor de IA ("Israel Souza" → "Fulano") por consultor
  capAlunos?: number;    // teto total de alunos da base do consultor (admin define). 0/ausente = sem limite
  branding: ConsultorBranding;
  certificado?: ConsultorCertificateConfig;
  /** Legado: mantido para compatibilidade com configurações antigas. */
  depoimentoPreProvaAtivo?: boolean;
  /** Se false, o certificado pode ser emitido sem solicitar depoimento após a aprovação. */
  depoimentoPosProvaAtivo?: boolean;
  vitrine?: ConsultorVitrine;
  plano?: string;        // faixa SaaS (monetização)
  ativo: boolean;
  criadoEm: string;
  /** Checklist "Comece por Aqui" — cada item marcado manualmente pelo consultor. */
  onboarding?: Record<string, boolean>;
  /** Texto de boas-vindas mostrado no topo da Comunidade dos Meus Clientes. */
  comunidadeBoasVindas?: string;
}

/** Como o destino consome a fonte: copia direta dos campos ou geracao por IA. */
export type ToolLinkMode = 'migrate' | 'ai';

/** Ligacao declarada por PROJETO: de quais ferramentas este destino se alimenta. */
export interface ToolLink {
  /** toolIds de origem. Devem vir ANTES do destino na sequencia do projeto. */
  from: string[];
  mode: ToolLinkMode;
}

export interface InitiativePhaseConfig {
  initiativeId: string;
  phaseId: string; // e.g., 'Define', 'Measure', etc.
  toolIds: string[]; // List of tool IDs assigned to this phase in this initiative
  consultorId?: string;
}

/** Ferramenta do catálogo. Sem fase: em que fase ela entra é decisão do consultor. */
export interface ToolDefinition {
  id: string;
  name: string;
}

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  columns: string[];
  createdAt: string;
}

export interface AnalysisRun {
  id: string;
  datasetId: string;
  type: string;
  parameters: any;
  results: any;
  createdAt: string;
}

export interface VideoChunk {
  id: string;
  videoId: string;
  title: string;
  url: string;
  topic: string;
  dmaicPhase: DMAICPhase;
  text: string;
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
  createdAt: string;
}
