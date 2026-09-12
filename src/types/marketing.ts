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
  /**
   * Link principal divulgado nas peças.
   *
   * Nome da empresa e logo NÃO ficam aqui — vêm de "Minha Marca"
   * (Consultor.branding). Crédito da fonte e chamada para ação também não:
   * mudam a cada vídeo/campanha, então saem do campo `curso` do vídeo (etapa 3)
   * e do próprio texto dos slides (etapa 4).
   */
  linkPrincipal?: string;
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
  /**
   * Fase 1: o consultor cola a transcrição que já tem. Fase 2 a plataforma extrai
   * sozinha (o vídeo já está no Bunny, que sabe transcrever — falta só ligar aqui).
   */
  transcricao?: string;
  /** Calculado a partir de `transcricao`, não digitado — evita os dois campos divergirem. */
  temTranscricao: boolean;
  criadoEm: string;
}

/** Uma fala do vídeo, com o tempo em que acontece. */
export interface LinhaCriativo {
  /** Segundo em que a fala começa no vídeo original. */
  inicio: number;
  /** Segundo em que a fala termina. */
  fim: number;
  /** A fala como a transcrição ouviu. O consultor corrige na revisão, em `edicoes`. */
  texto: string;
}

/** Estado de um criativo na esteira de revisão. */
export type StatusCriativo = 'novo' | 'revisar' | 'aprovado';

/**
 * Um trecho do vídeo que vale virar peça. Coleção: marketing_criativos
 *
 * A IA lê a transcrição e escolhe os RECORTES; o texto em si vem da transcrição
 * real, fatiada no servidor — assim nenhuma palavra é inventada, só selecionada.
 *
 * O aparo das pontas é feito por índice, e não apagando linhas: `linhas` guarda o
 * trecho inteiro pra sempre, e corteInicio/corteFim dizem o que está em uso. Assim
 * o consultor corta demais e desfaz, sem precisar gerar tudo de novo.
 */
export interface Criativo {
  id: string;
  consultorId: string;
  videoId: string;
  /** Ordem em que o trecho aparece no vídeo. */
  ordem: number;
  titulo: string;
  linhas: LinhaCriativo[];
  /** Índice da primeira linha em uso. */
  corteInicio: number;
  /** Índice da última linha em uso. */
  corteFim: number;
  /**
   * Correções de palavra, por índice de linha (a chave é string porque o Firestore
   * não aceita mapa de número). A linha original nunca é sobrescrita: o que o
   * consultor corrigiu fica aqui por cima, e some se ele apagar a correção.
   *
   * ESTE é o texto que vira legend do vídeo. O `texto` de `linhas` é o que a
   * transcrição ouviu; o daqui é o que o consultor disse que era pra ser.
   */
  edicoes?: Record<string, string>;
  status: StatusCriativo;
  criadoEm: string;
  atualizadoEm?: string;
}

/** O texto de uma linha, já com a correção do consultor se houver. */
export function textoDaLinha(criativo: Criativo, indice: number): string {
  const corrigido = criativo.edicoes?.[String(indice)];
  return corrigido !== undefined ? corrigido : (criativo.linhas[indice]?.texto ?? '');
}

/** As linhas que sobraram depois do aparo, já com as correções aplicadas. */
export function linhasEmUso(criativo: Criativo): LinhaCriativo[] {
  return criativo.linhas
    .slice(criativo.corteInicio, criativo.corteFim + 1)
    .map((l, i) => ({ ...l, texto: textoDaLinha(criativo, criativo.corteInicio + i) }));
}

/** Quanto tempo o vídeo curto vai ter, depois do aparo. */
export function duracaoCriativo(criativo: Criativo): number {
  const linhas = linhasEmUso(criativo);
  if (!linhas.length) return 0;
  return Math.max(0, Math.round(linhas[linhas.length - 1].fim - linhas[0].inicio));
}

/** O texto corrido do criativo, já aparado. */
export function textoCriativo(criativo: Criativo): string {
  return linhasEmUso(criativo).map((l) => l.texto).join(' ').replace(/\s+/g, ' ').trim();
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
  criativos: 'marketing_criativos',
  campanhas: 'marketing_campanhas',
  pecas: 'marketing_pecas',
  tarefas: 'marketing_tarefas',
} as const;
