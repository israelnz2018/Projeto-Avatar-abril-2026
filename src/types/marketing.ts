/**
 * Tipos do módulo Marketing para Consultores.
 *
 * Modelo multi-tenant desde o início: tudo indexado por consultorId, nada cravado
 * para um usuário só. Ver MARKETING-PARA-NOVOS-CONSULTORES.md.
 *
 * O Firestore guarda apenas informação, estado e referência.
 * Vídeo e imagem ficam no Bunny e no Storage — nunca dentro do documento.
 */

/** Objetivo declarado da campanha. Orienta a escolha dos trechos e o tom da copy. */
export type ObjetivoCampanha =
  | 'seguidores'
  | 'comentarios'
  | 'autoridade'
  | 'divulgar-curso';

export const OBJETIVOS: { id: ObjetivoCampanha; nome: string; descricao: string }[] = [
  { id: 'seguidores', nome: 'Conseguir seguidores', descricao: 'Prioriza gancho forte e tema de entrada.' },
  { id: 'comentarios', nome: 'Gerar comentários', descricao: 'Termina em pergunta concreta sobre a rotina de quem lê.' },
  { id: 'autoridade', nome: 'Demonstrar autoridade', descricao: 'Prioriza dado, método e experiência em primeira pessoa.' },
  { id: 'divulgar-curso', nome: 'Divulgar curso ou serviço', descricao: 'Mantém o crédito da fonte visível e fecha com convite.' },
];

/** Cada peça derivada de uma campanha. */
export type TipoPeca =
  | 'reel'
  | 'carrossel-feed'
  | 'carrossel-video'
  | 'linkedin-pdf';

export const TIPOS_PECA: { id: TipoPeca; nome: string; destino: string }[] = [
  { id: 'reel', nome: 'Reel', destino: 'Instagram Reels' },
  { id: 'carrossel-feed', nome: 'Carrossel de feed', destino: 'Instagram feed' },
  { id: 'carrossel-video', nome: 'Carrossel em vídeo', destino: 'Instagram Reels' },
  { id: 'linkedin-pdf', nome: 'Documento PDF', destino: 'LinkedIn' },
];

/** Estado de uma peça. O consultor age em `revisar`. */
export type StatusPeca =
  | 'na-fila'
  | 'gerando'
  | 'revisar'
  | 'aprovado'
  | 'publicado'
  | 'erro';

/** Estado de uma campanha inteira. */
export type StatusCampanha =
  | 'rascunho'
  | 'processando'
  | 'revisar'
  | 'aprovada'
  | 'publicada'
  | 'erro';

/** Termo protegido na correção da transcrição e das legendas. */
export interface TermoTecnico {
  /** Como costuma sair errado. Ex.: "lean sigma", "dimaico". */
  errado: string;
  /** Grafia correta. Ex.: "Lean Six Sigma", "DMAIC". */
  correto: string;
}

/**
 * Conexão com uma rede social.
 * O token NUNCA vem para o frontend — aqui fica só o estado, para a tela saber
 * se está conectado e quando vence. O token vive no servidor.
 */
export interface ConexaoRede {
  conectado: boolean;
  /** @ do Instagram ou nome do perfil no LinkedIn. */
  conta?: string;
  /** Instagram exige conta profissional (Business ou Creator). */
  tipoConta?: string;
  /** Quando a autorização expira. Instagram e LinkedIn vencem em ~60 dias. */
  expiraEm?: string;
  conectadoEm?: string;
}

/** Configuração de marketing do consultor. Documento: marketing_config/{consultorId} */
export interface MarketingConfig {
  consultorId: string;
  /** Etapa 2 — estado das conexões. */
  instagram?: ConexaoRede;
  linkedin?: ConexaoRede;
  /** Quem é o público. Usado para calibrar linguagem. */
  publico?: string;
  /** Área de atuação. Ex.: "melhoria de processos", "cardiologia". */
  area?: string;
  /** Dicionário técnico do consultor — protege termos que a legenda automática erra. */
  termos: TermoTecnico[];
  /** Link principal divulgado nas peças. */
  linkPrincipal?: string;
  /** Preferências de chamada para ação. */
  ctaPadrao?: string;
  /** Crédito exibido no rodapé das peças. Ex.: "curso White Belt". */
  creditoFonte?: string;
  atualizadoEm?: string;
}

/** Vídeo longo enviado pelo consultor. Coleção: marketing_videos */
export interface VideoFonte {
  id: string;
  consultorId: string;
  titulo: string;
  curso?: string;
  serie?: string;
  /** Referência no Bunny — a biblioteca é por consultor. */
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
  /** Origem alternativa, quando o vídeo já está no YouTube. */
  sourceUrl?: string;
  duracaoSegundos?: number;
  /** Fase 1: o consultor já tem a transcrição. Fase 2 a plataforma resolve. */
  temTranscricao: boolean;
  criadoEm: string;
}

/** Uma campanha orgânica: um assunto, várias peças. Coleção: marketing_campanhas */
export interface Campanha {
  id: string;
  consultorId: string;
  videoId: string;
  titulo: string;
  objetivo: ObjetivoCampanha;
  status: StatusCampanha;
  /** Trecho do vídeo que originou a campanha. */
  corteInicio?: string;
  corteFim?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

/** Peça gerada, com histórico de versões. Coleção: marketing_pecas */
export interface Peca {
  id: string;
  consultorId: string;
  campanhaId: string;
  tipo: TipoPeca;
  status: StatusPeca;
  /** Versão corrente. Começa em 1 e sobe a cada melhoria pedida. */
  versao: number;
  /**
   * Caminho no Storage do arquivo que representa a peça (imagem, vídeo ou PDF).
   * É o que vira a prévia na tela de revisão.
   */
  arquivoUrl?: string;
  /** Todos os arquivos desta versão, incluindo legenda e demais slides. */
  arquivos?: string[];
  /** Capa, quando houver. */
  capaUrl?: string;
  /** Texto da publicação. */
  legenda?: string;
  /** Pedido de melhoria escrito pelo consultor, que gerou esta versão. */
  pedidoMelhoria?: string;
  /** Mensagem de erro, quando status = erro. */
  erro?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

/** Tarefa na fila. O worker privado consome daqui. Coleção: marketing_tarefas */
export interface Tarefa {
  id: string;
  consultorId: string;
  campanhaId: string;
  /** Quando preenchido, regenera só esta peça em vez da campanha inteira. */
  pecaId?: string;
  tipo: 'gerar-campanha' | 'regerar-peca';
  status: 'pendente' | 'executando' | 'concluida' | 'erro';
  /** Texto do pedido de melhoria, quando for regeração. */
  instrucao?: string;
  tentativas: number;
  erro?: string;
  criadoEm: string;
  iniciadoEm?: string;
  concluidoEm?: string;
}

export const COLECOES = {
  config: 'marketing_config',
  videos: 'marketing_videos',
  campanhas: 'marketing_campanhas',
  pecas: 'marketing_pecas',
  tarefas: 'marketing_tarefas',
} as const;
