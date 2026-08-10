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
  createdAt: string;
  consultorId?: string; // Multi-tenant: dono do conteúdo (default 'israel' na Fase 0)
  /** Número de exibição (ordem + cor/ícone da trilha) — INDEPENDENTE do nome.
   * Renomear o curso nunca deve afetar ordem/visual; por isso isso não vem mais
   * de parsear o começo de `name`. */
  ordem?: number;
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
  /** Se false, a prova abre direto, sem solicitar depoimento/opinião antes. */
  depoimentoPreProvaAtivo?: boolean;
  vitrine?: ConsultorVitrine;
  plano?: string;        // faixa SaaS (monetização)
  ativo: boolean;
  criadoEm: string;
  /** Checklist "Comece por Aqui" — cada item marcado manualmente pelo consultor. */
  onboarding?: Record<string, boolean>;
  /** Texto de boas-vindas mostrado no topo da Comunidade dos Meus Clientes. */
  comunidadeBoasVindas?: string;
}

export interface InitiativePhaseConfig {
  initiativeId: string;
  phaseId: string; // e.g., 'Define', 'Measure', etc.
  toolIds: string[]; // List of tool IDs assigned to this phase in this initiative
  consultorId?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  defaultPhase: string;
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
