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
  /**
   * Em que pé está a transcrição.
   *
   * Ela roda em segundo plano no servidor, e não dentro da requisição do navegador:
   * codificar e transcrever uma aula de uma hora leva mais tempo do que qualquer
   * proxy deixa uma conexão HTTP aberta. Sem este campo o consultor ficava sem
   * saber se estava andando ou se tinha morrido.
   */
  transcricaoStatus?: 'na-fila' | 'processando' | 'pronta' | 'erro';
  /** Quando o servidor começou. Serve para a tela perceber trabalho travado. */
  transcricaoIniciadaEm?: string;
  /** Por que falhou, em português, para o consultor decidir se tenta de novo. */
  transcricaoErro?: string;
  /**
   * Se o tempo palavra por palavra foi guardado (na subcoleção "palavras" do vídeo).
   *
   * É o insumo da legenda em karaokê do Reel falado. Vídeos transcritos antes desta
   * mudança não têm — precisariam ser transcritos de novo, o que custa centavos.
   */
  temPalavras?: boolean;
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
 * Apagar uma fala é marcá-la em `linhasApagadas`, não removê-la: `linhas` guarda o
 * trecho inteiro pra sempre. Assim o consultor apaga demais e desfaz, sem precisar
 * gerar tudo de novo.
 */
export interface Criativo {
  id: string;
  consultorId: string;
  videoId: string;
  /** Ordem em que o trecho aparece no vídeo. */
  ordem: number;
  titulo: string;
  linhas: LinhaCriativo[];
  /**
   * Índices das falas que o consultor apagou. Apagar as primeiras encurta o começo,
   * as últimas encurtam o fim, e uma do meio abre um buraco — ver `temBuraco`.
   */
  linhasApagadas?: number[];
  /** @deprecated Modelo antigo de aparo por faixa. Convertido por normalizar(). */
  corteInicio?: number;
  /** @deprecated Modelo antigo de aparo por faixa. Convertido por normalizar(). */
  corteFim?: number;
  /**
   * Correções de palavra, por índice de linha (a chave é string porque o Firestore
   * não aceita mapa de número). A linha original nunca é sobrescrita: o que o
   * consultor corrigiu fica aqui por cima, e some se ele apagar a correção.
   *
   * ESTE é o texto que vira legenda do vídeo. O `texto` de `linhas` é o que a
   * transcrição ouviu; o daqui é o que o consultor disse que era pra ser.
   */
  edicoes?: Record<string, string>;
  /**
   * As páginas do carrossel escritas a partir da fala.
   *
   * UM roteiro serve os quatro formatos de texto: o renderizador produz o carrossel
   * do feed, o PDF do LinkedIn e o vídeo 9:16 numa execução só, a partir das mesmas
   * páginas. Gerar um por formato custaria quatro vezes mais e deixaria o carrossel
   * dizendo uma coisa e o PDF outra.
   */
  roteiro?: { slides: SlideRoteiro[]; geradoEm: string };
  /**
   * Os textos prontos para publicar, escritos pela IA junto com as páginas.
   *
   * Ficam AQUI, e não em arquivo. Antes a "legenda" era um legenda.md solto dentro
   * de cada pasta do Storage: o consultor não tinha como revisar nem copiar, e o
   * arquivo só ocupava espaço na lista da peça.
   *
   * O artigo serve o LinkedIn (o PDF), a legenda serve o Instagram (o Reel e o
   * carrossel em vídeo) — é o mesmo texto nos dois, porque é o mesmo post.
   */
  textos?: { artigoLinkedin: string; legendaInstagram: string; geradoEm: string };
  /**
   * A arte da capa do Reel, conforme o padrão em
   * squads/lbw-reel-production/pipeline/data/cover-standard.md.
   *
   * A capa é uma arte própria, NUNCA um quadro do vídeo — um quadro do Reel traz
   * o slide, o círculo do rosto e a legenda karaokê juntos, e vira uma miniatura
   * ilegível no feed. Do vídeo sai só o retrato.
   */
  capa?: {
    courseKey?: 'white-belt' | 'yellow-belt' | 'green-belt' | 'black-belt';
    seriesLabel?: string;
    episode?: string;
    /** O gancho, de 3 a 6 palavras, em até 3 linhas. */
    hookLines?: string[];
    topicLabel?: string;
    topicStrong?: string;
  };
  status: StatusCriativo;
  criadoEm: string;
  atualizadoEm?: string;
}

/** Uma página do carrossel. Os campos variam conforme o `type`. */
export interface SlideRoteiro {
  /** `foto`: uma cena da biblioteca ocupa a página, com o texto por cima. */
  type: 'capa' | 'padrao' | 'dado' | 'comparacao' | 'camadas' | 'cta' | 'foto';
  title: string;
  body: string;
  /** capa: a pergunta curta embaixo do texto. */
  sub?: string;
  /** dado: o número em destaque e de onde ele veio. */
  numero?: string;
  fonte?: string;
  /** comparacao: os dois lados. */
  negativo?: string;
  positivo?: string;
  /** cta: a palavra que o seguidor comenta. */
  palavra?: string;
  /**
   * Quem aparece na página.
   *
   * O nome de um arquivo da biblioteca de pessoas ("09-ceticismo-homem-50"),
   * `false` para não ter ninguém, ou ausente para o renderizador escolher pelo
   * rodízio. Só capa, padrão, dado e cta mostram pessoa — comparação não tem
   * espaço para ela.
   */
  pessoa?: string | false;
  /**
   * A imagem da biblioteca (marketing_imagens) nesta página.
   *
   * Vale mais que `pessoa`: quando existe, o worker troca pelo endereço da imagem —
   * pessoa ao lado do texto, ou cena de fundo na página `foto`.
   */
  imagemId?: string;
  /**
   * O tamanho do texto desta página, de 0,8 a 1,25.
   *
   * Vai como texto porque é o que o `<select>` devolve, e o renderizador já
   * converte. Ausente é 1 — e a 1 o renderizador nem mexe no CSS.
   */
  escala?: string | number;
}

/**
 * A marca que assina a peça, do jeito que o renderizador espera.
 *
 * Vem de "Minha Marca" (Consultor.branding). Antes o renderizador escrevia
 * "EDUCAÇÃO PELO TRABALHO" fixo no cabeçalho e usava a logo e as cores da LBW,
 * qualquer que fosse o consultor.
 */
export interface MarcaDaPeca {
  nome: string;
  logoUrl?: string;
  cores?: { navy: string; blue: string; light: string; ink?: string; muted?: string };
}

/** Os formatos que saem de um roteiro só. */
export type FormatoPeca = 'carrossel' | 'pdf' | 'video' | 'imagem';

export const FORMATOS: { id: FormatoPeca; nome: string; onde: string }[] = [
  { id: 'carrossel', nome: 'Carrossel', onde: 'Feed do Instagram' },
  { id: 'video', nome: 'Carrossel em vídeo', onde: 'Reels, sem voz' },
  { id: 'pdf', nome: 'Documento PDF', onde: 'LinkedIn' },
  { id: 'imagem', nome: 'Imagem única', onde: 'Feed, post simples' },
];

/**
 * Quais falas estão apagadas, entendendo também os criativos do modelo antigo
 * (corteInicio/corteFim). Sem isso, um criativo gerado antes desta mudança
 * apareceria inteiro, com o aparo que o consultor já tinha feito perdido.
 */
export function linhasApagadasDe(criativo: Criativo): Set<number> {
  if (Array.isArray(criativo.linhasApagadas)) return new Set(criativo.linhasApagadas);
  const apagadas = new Set<number>();
  const ini = criativo.corteInicio ?? 0;
  const fim = criativo.corteFim ?? criativo.linhas.length - 1;
  criativo.linhas.forEach((_, i) => { if (i < ini || i > fim) apagadas.add(i); });
  return apagadas;
}

/** O texto de uma linha, já com a correção do consultor se houver. */
export function textoDaLinha(criativo: Criativo, indice: number): string {
  const corrigido = criativo.edicoes?.[String(indice)];
  return corrigido !== undefined ? corrigido : (criativo.linhas[indice]?.texto ?? '');
}

/** As falas que sobraram, já com as correções aplicadas. */
export function linhasEmUso(criativo: Criativo): LinhaCriativo[] {
  const apagadas = linhasApagadasDe(criativo);
  return criativo.linhas
    .map((l, i) => ({ ...l, indice: i, texto: textoDaLinha(criativo, i) }))
    .filter((l) => !apagadas.has(l.indice))
    .map(({ indice, ...l }) => l);
}

/** Em que segundo do vídeo original o trecho começa, já contando o que foi apagado. */
export function inicioNoVideo(criativo: Criativo): number {
  return linhasEmUso(criativo)[0]?.inicio ?? 0;
}

/** Em que segundo do vídeo original o trecho termina, já contando o que foi apagado. */
export function fimNoVideo(criativo: Criativo): number {
  const linhas = linhasEmUso(criativo);
  return linhas[linhas.length - 1]?.fim ?? 0;
}

/**
 * Os pedaços contínuos de vídeo que sobraram.
 *
 * Apagar só do começo ou só do fim devolve UM pedaço, que é o que o renderizador
 * sabe cortar hoje. Apagar uma fala do meio parte o trecho em dois, e aí seriam
 * dois cortes emendados — capacidade que ainda não existe.
 */
export function pedacosDeVideo(criativo: Criativo): { inicio: number; fim: number }[] {
  const apagadas = linhasApagadasDe(criativo);
  const pedacos: { inicio: number; fim: number }[] = [];
  let atual: { inicio: number; fim: number } | null = null;
  criativo.linhas.forEach((linha, i) => {
    if (apagadas.has(i)) { atual = null; return; }
    if (atual) atual.fim = linha.fim;
    else { atual = { inicio: linha.inicio, fim: linha.fim }; pedacos.push(atual); }
  });
  return pedacos;
}

/** Verdadeiro quando há fala apagada no MEIO, partindo o trecho em dois ou mais. */
export function temBuraco(criativo: Criativo): boolean {
  return pedacosDeVideo(criativo).length > 1;
}

/** Quanto tempo o vídeo curto vai ter: a soma dos pedaços que sobraram. */
export function duracaoCriativo(criativo: Criativo): number {
  return Math.max(0, Math.round(
    pedacosDeVideo(criativo).reduce((total, p) => total + (p.fim - p.inicio), 0),
  ));
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
  /**
   * O ritmo escolhido para o vídeo desta campanha, guardado para a tela lembrar.
   * `velocidade` é do Reel falado (0,8x a 1,5x); `segundosPorSlide` é do carrossel
   * em vídeo.
   */
  velocidade?: number;
  segundosPorSlide?: number;
  /**
   * O texto que GEROU as imagens desta campanha.
   *
   * Fica aqui, e não só no criativo, porque a tela mostra a imagem e o texto lado
   * a lado: se o texto vier do criativo e as imagens forem de uma versão anterior,
   * o consultor corrige um texto que não é o da figura que está vendo. Guardado
   * junto com a campanha, os dois são sempre o mesmo par.
   */
  roteiro?: SlideRoteiro[];
  roteiroGeradoEm?: string;
  /**
   * Qual imagem da biblioteca apareceu em cada página, na última produção.
   * É o que deixa a tela dizer QUEM o automático escolheu.
   */
  imagensPorPagina?: (string | null)[];
  /** `enviada`: campanha avulsa, criada para receber um criativo pronto do consultor. */
  origem?: 'enviada';
  /**
   * O trabalho da capa do Reel, SEPARADO do `status` do Reel.
   * Refazer a capa não trava o Reel na tela, e refazer o Reel não mexe na capa.
   */
  capaStatus?: 'processando' | 'pronta' | 'erro';
  capaErro?: string | null;
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
  /** A aprovação da capa, independente da aprovação do Reel. */
  capaStatus?: 'revisar' | 'aprovado';
  /** Texto da publicação. */
  legenda?: string;
  /** Pedido de melhoria escrito pelo consultor, que gerou esta versão. */
  pedidoMelhoria?: string;
  /** Mensagem de erro, quando status = erro. */
  erro?: string;
  /**
   * Quando esta peça vai ao ar, marcado no calendário da etapa 5.
   *
   * Guardados como data e hora LOCAIS ("2026-09-15" e "19:00"), não como
   * timestamp: o consultor mora na Nova Zelândia e publica para o Brasil, e
   * qualquer conversão de fuso aqui erraria o dia para um dos dois. A hora é a
   * que ele escolheu, sem tradução.
   */
  agendadoEm?: string;
  agendadoHora?: string;
  /**
   * `enviada`: o consultor subiu a peça pronta, feita fora da plataforma.
   * Não tem Refazer — não há texto nem render de onde refazer.
   */
  origem?: 'gerada' | 'enviada';
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
  tipo: 'gerar-campanha' | 'regerar-peca' | 'gerar-reel' | 'gerar-capa' | 'preparar-imagem';
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
  imagens: 'marketing_imagens',
} as const;

/* ====================== Biblioteca de imagens ====================== */

/** `pessoa` fica ao lado do texto, sem fundo. `cena` ocupa a página, com fundo. */
export type TipoImagem = 'pessoa' | 'cena';

/** `elenco`: as 12 da casa. `gerada`: pela IA. `enviada`: pelo consultor. */
export type OrigemImagem = 'elenco' | 'gerada' | 'enviada';

/**
 * Onde a imagem está na esteira.
 *
 * `candidata` é a que acabou de ficar pronta e espera o consultor olhar a página
 * montada. Só `aprovada` entra na biblioteca de verdade; `descartada` some da tela.
 */
export type StatusImagem = 'processando' | 'candidata' | 'aprovada' | 'descartada' | 'erro';

/**
 * Uma imagem da biblioteca. Coleção: marketing_imagens
 *
 * O arquivo fica no Storage; aqui ficam o caminho, as etiquetas e o uso. As
 * etiquetas vêm de listas fechadas (ETIQUETAS_PESSOA, ETIQUETAS_CENA) — é por elas
 * que a busca acha "já tenho algo parecido" antes de gastar gerando outra.
 */
export interface ImagemBiblioteca {
  id: string;
  tipo: TipoImagem;
  origem: OrigemImagem;
  status: StatusImagem;
  /** Entra na biblioteca de todos os consultores. Foto enviada nunca é pública. */
  publica: boolean;
  /** Pode ser escolhida pelo automático, para quem não escolheu ninguém. */
  automatica?: boolean;
  /** Quem criou. As da casa são de `lbw`. */
  consultorId: string;
  titulo: string;
  etiquetas: Record<string, string>;
  temas?: string[];
  /** Caminho no Storage da imagem pronta — a pessoa já sem fundo. */
  arquivo?: string;
  /** O que chegou, antes do recorte. */
  original?: string;
  /** A página do carrossel montada com esta imagem, para aprovar. */
  previa?: string | null;
  /** O que foi pedido ao gerador, quando gerada. Serve para entender e repetir. */
  prompt?: string;
  detalhe?: string;
  /** De onde nasceu: o criativo e a página. É assim que a candidata aparece no lugar certo. */
  criativoId?: string;
  pagina?: number;
  vezesUsada?: number;
  erro?: string | null;
  criadoEm: string;
  atualizadoEm?: string;
}

/** Uma opção de etiqueta: o nome que o consultor lê e o trecho que vai ao gerador. */
export interface OpcaoEtiqueta { id: string; nome: string; prompt: string }

/**
 * O vocabulário das pessoas.
 *
 * FECHADO de propósito. Com o texto livre a IA cai no clichê e cada imagem sai de
 * um jeito; com listas, o estilo fica fixo no código e só o que muda de página para
 * página é escolhido — e escolhido do mesmo jeito que a busca procura depois.
 *
 * Os ids batem com o que worker/semear-biblioteca.mjs grava nas 12 pessoas da casa.
 */
export const ETIQUETAS_PESSOA: Record<'papel' | 'ambiente' | 'emocao' | 'genero' | 'idade', { nome: string; opcoes: OpcaoEtiqueta[] }> = {
  papel: {
    nome: 'Quem é',
    opcoes: [
      { id: 'analista', nome: 'Analista', prompt: 'business analyst wearing a navy blazer over a white shirt' },
      { id: 'gestor', nome: 'Gestor de operações', prompt: 'operations manager wearing a dark polo shirt' },
      { id: 'engenheiro', nome: 'Engenheiro(a)', prompt: 'industrial engineer wearing a work shirt' },
      { id: 'lider', nome: 'Líder de equipe', prompt: 'team leader wearing a blue blazer' },
      { id: 'diretor', nome: 'Diretor(a)', prompt: 'senior director wearing a crisp white shirt' },
      { id: 'operador', nome: 'Operador(a)', prompt: 'production operator wearing a work uniform' },
      { id: 'consultor', nome: 'Consultor(a)', prompt: 'process improvement consultant wearing a light blue shirt' },
      { id: 'saude', nome: 'Profissional de saúde', prompt: 'healthcare professional wearing hospital scrubs' },
    ],
  },
  ambiente: {
    nome: 'Ambiente',
    opcoes: [
      { id: 'escritorio', nome: 'Escritório', prompt: '' },
      { id: 'fabrica', nome: 'Fábrica, com EPI', prompt: 'wearing a high-visibility safety vest and a white hard hat' },
      { id: 'hospital', nome: 'Hospital', prompt: 'with a stethoscope around the neck' },
    ],
  },
  emocao: {
    nome: 'Gesto e expressão',
    opcoes: [
      { id: 'explicando', nome: 'Explicando', prompt: 'open palms gesturing while explaining, engaged expression' },
      { id: 'decisao', nome: 'Confiante, braços cruzados', prompt: 'arms crossed, confident determined expression' },
      { id: 'confianca', nome: 'Sorriso tranquilo', prompt: 'relaxed stance, calm friendly smile looking at the camera' },
      { id: 'lideranca', nome: 'Apresentando', prompt: 'presenting gesture toward the side, warm confident smile' },
      { id: 'apontando', nome: 'Apontando', prompt: 'pointing decisively to the side with one arm extended, focused expression' },
      { id: 'insight', nome: 'Tendo uma ideia', prompt: 'index finger raised, eureka moment, bright expression' },
      { id: 'foco', nome: 'Medindo, com prancheta', prompt: 'holding a clipboard and writing, concentrated expression' },
      { id: 'duvida', nome: 'Em dúvida', prompt: 'hand on chin, thoughtful doubtful expression' },
      { id: 'comemorando', nome: 'Comemorando', prompt: 'fist raised in celebration, happy expression' },
      { id: 'frustracao', nome: 'Frustrado(a)', prompt: 'hands on head, frustrated stressed expression' },
      { id: 'sobrecarga', nome: 'Sobrecarregado(a)', prompt: 'holding a tall stack of folders, overwhelmed expression' },
      { id: 'confusao', nome: 'Confuso(a)', prompt: 'shoulders raised and palms up, confused expression' },
      { id: 'ceticismo', nome: 'Cético(a)', prompt: 'arms crossed, skeptical raised eyebrow' },
    ],
  },
  genero: {
    nome: 'Gênero',
    opcoes: [
      { id: 'mulher', nome: 'Mulher', prompt: 'woman' },
      { id: 'homem', nome: 'Homem', prompt: 'man' },
    ],
  },
  idade: {
    nome: 'Idade',
    opcoes: [
      { id: '20', nome: '20 e poucos', prompt: 'twenties' },
      { id: '30', nome: '30 e poucos', prompt: 'thirties' },
      { id: '40', nome: '40 e poucos', prompt: 'forties' },
      { id: '50', nome: '50 e poucos', prompt: 'fifties' },
      { id: '60', nome: '60 e poucos', prompt: 'sixties' },
    ],
  },
};

/** O vocabulário das cenas de fundo. */
export const ETIQUETAS_CENA: Record<'cenario' | 'momento' | 'gente', { nome: string; opcoes: OpcaoEtiqueta[] }> = {
  cenario: {
    nome: 'Cenário',
    opcoes: [
      { id: 'chao-de-fabrica', nome: 'Chão de fábrica', prompt: 'a manufacturing shop floor with production machines' },
      { id: 'linha-de-montagem', nome: 'Linha de montagem', prompt: 'an industrial assembly line' },
      { id: 'armazem', nome: 'Armazém', prompt: 'a warehouse with tall shelving and pallets' },
      { id: 'escritorio', nome: 'Escritório', prompt: 'an open-plan corporate office' },
      { id: 'reuniao', nome: 'Reunião de melhoria', prompt: 'a small improvement meeting around a table covered with sticky notes and printed charts' },
      { id: 'quadro-kanban', nome: 'Quadro kanban', prompt: 'a large kanban board full of colorful sticky notes on a wall' },
      { id: 'painel-indicadores', nome: 'Painel de indicadores', prompt: 'a performance dashboard with charts on a large wall screen in an operations room' },
      { id: 'hospital', nome: 'Hospital', prompt: 'a hospital corridor with medical carts' },
      { id: 'laboratorio', nome: 'Laboratório de qualidade', prompt: 'a quality control laboratory with measuring instruments' },
    ],
  },
  momento: {
    nome: 'O que a cena mostra',
    opcoes: [
      { id: 'problema', nome: 'O problema — bagunça, gargalo, retrabalho', prompt: 'cluttered and disorganized, visible waste, bottlenecks and piles of rework' },
      { id: 'analise', nome: 'A análise — investigando, medindo', prompt: 'people investigating the process and taking measurements, focused analysis' },
      { id: 'solucao', nome: 'A solução — organizado, fluindo', prompt: 'clean, organized and flowing smoothly, clear visual management, 5S' },
    ],
  },
  gente: {
    nome: 'Pessoas na cena',
    opcoes: [
      { id: 'ao-fundo', nome: 'Poucas, ao fundo e desfocadas', prompt: 'a few people in the background, faces not visible, slightly out of focus' },
      { id: 'sem-pessoas', nome: 'Nenhuma', prompt: 'no people' },
      { id: 'equipe', nome: 'Uma equipe trabalhando', prompt: 'a small diverse team working together, natural candid moment, faces partially turned away' },
    ],
  },
};

/** As expressões que não entram no automático: só aparecem quando alguém pede. */
export const EMOCOES_SO_SOB_PEDIDO = ['frustracao', 'sobrecarga', 'confusao', 'ceticismo'];

/** O vocabulário do tipo. */
export function vocabulario(tipo: TipoImagem) {
  return (tipo === 'cena' ? ETIQUETAS_CENA : ETIQUETAS_PESSOA) as Record<string, { nome: string; opcoes: OpcaoEtiqueta[] }>;
}

/**
 * As etiquetas limpas: só o que existe na lista, e a primeira opção onde faltar.
 *
 * O servidor passa por aqui o que veio da tela e o que veio da IA. Uma etiqueta
 * inventada ("empolgado") não pode virar prompt, nem ficha que a busca não acha.
 */
export function etiquetasValidas(tipo: TipoImagem, pedidas: Record<string, unknown> = {}): Record<string, string> {
  const vocab = vocabulario(tipo);
  return Object.fromEntries(Object.entries(vocab).map(([grupo, { opcoes }]) => {
    const pedida = String(pedidas?.[grupo] ?? '');
    return [grupo, opcoes.some((o) => o.id === pedida) ? pedida : opcoes[0].id];
  }));
}

const trecho = (tipo: TipoImagem, grupo: string, id: string) =>
  vocabulario(tipo)[grupo]?.opcoes.find((o) => o.id === id)?.prompt || '';

/**
 * O pedido ao gerador, montado das etiquetas.
 *
 * O estilo é FIXO aqui, e é isso que faz uma imagem gerada hoje combinar com as da
 * casa. Pessoa: da cintura para cima, fundo cinza liso de estúdio — é o fundo que
 * deixa o recorte limpo. Cena: vertical, com a parte de baixo calma, onde o texto
 * da página vai ficar.
 *
 * `detalhe` é o que o consultor escreveu a mais. Entra, mas no meio: não substitui o
 * estilo nem as restrições do fim.
 */
export function montarPromptImagem(tipo: TipoImagem, etiquetas: Record<string, string>, detalhe = ''): string {
  const e = etiquetasValidas(tipo, etiquetas);
  const extra = String(detalhe || '').replace(/\s+/g, ' ').trim().slice(0, 240);

  if (tipo === 'cena') {
    return [
      `Photograph of ${trecho(tipo, 'cenario', e.cenario)}`,
      trecho(tipo, 'momento', e.momento),
      trecho(tipo, 'gente', e.gente),
      extra,
      'editorial documentary photograph, photorealistic, natural light, shallow depth of field, '
      + 'cool blue and neutral color grading, vertical composition with a calm uncluttered lower third, '
      + 'no text, no letters, no numbers on screens, no logo, no watermark, no signage',
    ].filter(Boolean).join('. ');
  }

  const pronome = e.genero === 'mulher' ? 'her' : 'his';
  const ambiente = trecho(tipo, 'ambiente', e.ambiente);
  return [
    `A Brazilian ${trecho(tipo, 'genero', e.genero)} in ${pronome} ${trecho(tipo, 'idade', e.idade)}, `
    + `${trecho(tipo, 'papel', e.papel)}${ambiente ? `, ${ambiente}` : ''}`,
    trecho(tipo, 'emocao', e.emocao),
    extra,
    'candid documentary-style photograph, waist-up framing, photorealistic, natural skin texture, '
    + 'sharp focus, high detail, soft even studio lighting, plain solid light grey seamless studio backdrop, '
    + 'no text, no logo, no watermark',
  ].filter(Boolean).join('. ');
}

/** Um nome curto para a ficha, a partir das etiquetas: "Gestor de operações — explicando". */
export function tituloDasEtiquetas(tipo: TipoImagem, etiquetas: Record<string, string>): string {
  const e = etiquetasValidas(tipo, etiquetas);
  const nome = (grupo: string) => vocabulario(tipo)[grupo]?.opcoes.find((o) => o.id === e[grupo])?.nome || '';
  if (tipo === 'cena') return `${nome('cenario')} — ${nome('momento').split(' — ')[0].toLowerCase()}`;
  return `${nome('papel')} — ${nome('emocao').toLowerCase()}`;
}

/**
 * Quanto uma imagem se parece com o que se procura: etiquetas iguais, com peso.
 *
 * O gesto e o cenário pesam mais porque são o que muda o sentido da página; gênero
 * e idade só desempatam.
 */
export function semelhanca(imagem: Pick<ImagemBiblioteca, 'tipo' | 'etiquetas'>, tipo: TipoImagem, etiquetas: Record<string, string>): number {
  if (imagem.tipo !== tipo) return 0;
  const pesos: Record<string, number> = tipo === 'cena'
    ? { cenario: 3, momento: 2, gente: 1 }
    : { emocao: 3, papel: 2, ambiente: 2, genero: 1, idade: 1 };
  return Object.entries(pesos).reduce(
    (total, [grupo, peso]) => total + (imagem.etiquetas?.[grupo] && imagem.etiquetas[grupo] === etiquetas[grupo] ? peso : 0),
    0,
  );
}
