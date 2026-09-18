/**
 * Salvar uma peça aprovada direto nas pastas de ENTREGAS, no computador.
 *
 * O Israel já mantém uma organização à mão em
 * `Israel-Projetos/Empresa de Gestão LBW/ENTREGAS`, uma pasta por formato. O
 * navegador NÃO consegue escolher onde um download cai — ele sempre vai para a
 * pasta de downloads, e página nenhuma pode mover arquivo depois.
 *
 * O que existe é a API de acesso ao sistema de arquivos: o consultor aponta a
 * pasta ENTREGAS UMA VEZ, autoriza, e a partir daí a plataforma escreve dentro
 * das subpastas certas sem perguntar de novo. É melhor do que o pedido original
 * (baixar e arrastar), e é a única forma de o arquivo nascer no lugar certo.
 *
 * Onde a API não existe (Firefox, Safari, celular), cai no plano B: um .zip
 * nomeado com a pasta de destino, para arrastar de uma vez só.
 */
import JSZip from 'jszip';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Peca, TipoPeca } from '../types/marketing';

/**
 * A pasta de destino de cada formato.
 *
 * Os nomes são EXATAMENTE os que já existem em ENTREGAS, acentos e tudo — se
 * divergirem, a API cria uma pasta nova ao lado e a organização se parte em duas.
 */
export const PASTA_DA_PECA: Record<TipoPeca, string> = {
  'carrossel-feed': 'CARROCEL DO FEED',
  'carrossel-video': 'CARROCEL DO REELS',
  'linkedin-pdf': 'CARROCEL DO LINKEDIN',
  'reel': 'VIDEO DO REELS e CAPA',
  'linkedin-imagem': 'IMAGEM ÚNICA DO LINKEDIN',
  'linkedin-texto': 'TEXTO DO LINKEDIN',
};

/**
 * Quais arquivos da peça valem ser salvos.
 *
 * Não é tudo o que está em `arquivos`: a peça do LinkedIn carrega também os PNGs
 * do feed (a tela precisa deles para editar página por página), e salvá-los
 * jogaria o carrossel do feed inteiro dentro da pasta do LinkedIn.
 */
export function arquivosParaSalvar(peca: Peca): string[] {
  const todos = [peca.arquivoUrl, ...(peca.arquivos || [])].filter(Boolean) as string[];
  const unicos = [...new Set(todos)].filter((c) => c.startsWith('marketing/'));

  switch (peca.tipo) {
    case 'linkedin-pdf':
      return unicos.filter((c) => /\.pdf$/i.test(c));
    case 'carrossel-feed':
      return unicos.filter((c) => /slide-\d+\.(png|jpe?g)$/i.test(c));
    case 'carrossel-video':
      return unicos.filter((c) => /\.mp4$/i.test(c));
    // A pasta se chama "VIDEO DO REELS e CAPA": as duas coisas vão juntas.
    case 'reel':
      return unicos.filter((c) => /\.(mp4|jpe?g|png)$/i.test(c));
    case 'linkedin-imagem':
      return unicos.filter((c) => /\.(png|jpe?g)$/i.test(c));
    case 'linkedin-texto':
      return unicos.filter((c) => /\.(png|jpe?g|md|txt)$/i.test(c));
    default:
      return unicos;
  }
}

/** O navegador sabe escrever em pasta escolhida pelo usuário? */
export function suportaPastas(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/* ============ Onde a pasta escolhida fica guardada ============ */

/**
 * O "handle" da pasta só sobrevive no IndexedDB.
 *
 * localStorage guarda texto, e um handle de diretório não vira texto — passa por
 * clone estruturado. Sem isto o consultor teria que apontar a pasta a cada peça.
 */
const BANCO = 'lbw_pastas';
const LOJA = 'handles';
const CHAVE_ENTREGAS = 'entregas';

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(LOJA)) pedido.result.createObjectStore(LOJA);
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function guardar(chave: string, valor: unknown): Promise<void> {
  const banco = await abrirBanco();
  await new Promise<void>((resolve, reject) => {
    const t = banco.transaction(LOJA, 'readwrite');
    t.objectStore(LOJA).put(valor, chave);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  banco.close();
}

async function ler<T>(chave: string): Promise<T | null> {
  const banco = await abrirBanco();
  const valor = await new Promise<T | null>((resolve, reject) => {
    const t = banco.transaction(LOJA, 'readonly');
    const p = t.objectStore(LOJA).get(chave);
    p.onsuccess = () => resolve((p.result as T) ?? null);
    p.onerror = () => reject(p.error);
  });
  banco.close();
  return valor;
}

/* ============ A pasta ENTREGAS ============ */

type PastaHandle = any; // FileSystemDirectoryHandle — tipo ainda não está no lib do TS

async function temPermissao(handle: PastaHandle, pedir: boolean): Promise<boolean> {
  const opcoes = { mode: 'readwrite' as const };
  if ((await handle.queryPermission?.(opcoes)) === 'granted') return true;
  if (!pedir) return false;
  return (await handle.requestPermission?.(opcoes)) === 'granted';
}

/**
 * A pasta ENTREGAS já autorizada, ou null.
 *
 * `pedir: false` na conferência silenciosa de propósito: pedir permissão fora de
 * um clique faz o navegador recusar, e a tela mostraria "sem pasta" sem motivo.
 */
export async function pastaJaEscolhida(): Promise<PastaHandle | null> {
  if (!suportaPastas()) return null;
  try {
    const handle = await ler<PastaHandle>(CHAVE_ENTREGAS);
    if (!handle) return null;
    return (await temPermissao(handle, false)) ? handle : null;
  } catch {
    return null;
  }
}

/**
 * Pergunta ao consultor onde fica a pasta ENTREGAS e guarda a escolha.
 * PRECISA ser chamada de dentro de um clique — o navegador exige o gesto.
 */
export async function escolherPastaEntregas(): Promise<PastaHandle> {
  const handle = await (window as any).showDirectoryPicker({
    id: 'lbw-entregas',
    mode: 'readwrite',
    startIn: 'documents',
  });
  await guardar(CHAVE_ENTREGAS, handle);
  return handle;
}

/** A pasta autorizada, perguntando se ainda não houver. */
export async function garantirPasta(): Promise<PastaHandle> {
  const guardada = await ler<PastaHandle>(CHAVE_ENTREGAS);
  if (guardada && await temPermissao(guardada, true)) return guardada;
  return escolherPastaEntregas();
}

/* ============ Salvar ============ */

function nomeDoArquivo(caminho: string): string {
  return caminho.split('/').pop() || 'arquivo';
}

async function baixarBytes(caminho: string): Promise<Blob> {
  const url = await getDownloadURL(storageRef(storage, caminho));
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Não consegui baixar ${nomeDoArquivo(caminho)} (${resposta.status}).`);
  return resposta.blob();
}

/**
 * Nome curto e reconhecível para o arquivo no disco.
 *
 * O nome do Storage é `slide-01.png` para toda campanha — cinco peças de
 * assuntos diferentes viram cinco `slide-01.png` brigando na mesma pasta. O
 * assunto na frente resolve, e continua ordenando por slide dentro do assunto.
 */
export function nomeNoDisco(caminho: string, assunto: string): string {
  const limpo = assunto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
    .slice(0, 60);
  return limpo ? `${limpo}__${nomeDoArquivo(caminho)}` : nomeDoArquivo(caminho);
}

/**
 * Manda o navegador baixar um blob com um nome.
 *
 * Escrito à mão em vez de usar file-saver: a biblioteca é CommonJS e o import
 * nomeado dela quebra fora do empacotador, o que derrubava os testes deste
 * arquivo inteiro por causa de três linhas.
 */
function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Soltar na hora cancelaria o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export interface ResultadoSalvamento {
  /** Como foi parar no computador. */
  via: 'pasta' | 'zip';
  /** Para onde foi, em texto que o consultor reconhece. */
  destino: string;
  quantos: number;
}

/**
 * Escreve os arquivos da peça dentro de ENTREGAS/<pasta do formato>.
 * Cria a subpasta se ela não existir.
 */
export async function salvarNaPasta(peca: Peca, assunto: string): Promise<ResultadoSalvamento> {
  const arquivos = arquivosParaSalvar(peca);
  if (!arquivos.length) throw new Error('Esta peça não tem arquivo salvo na plataforma.');

  const entregas = await garantirPasta();
  const nomePasta = PASTA_DA_PECA[peca.tipo];
  const destino = await entregas.getDirectoryHandle(nomePasta, { create: true });

  for (const caminho of arquivos) {
    const blob = await baixarBytes(caminho);
    const arquivo = await destino.getFileHandle(nomeNoDisco(caminho, assunto), { create: true });
    const escrita = await arquivo.createWritable();
    await escrita.write(blob);
    await escrita.close();
  }

  return { via: 'pasta', destino: `ENTREGAS/${nomePasta}`, quantos: arquivos.length };
}

/**
 * Plano B: um .zip na pasta de downloads, nomeado com a pasta de destino.
 *
 * Usado quando o navegador não tem a API de pastas. O nome do arquivo já diz
 * para onde ele vai, o que reduz o trabalho manual a um arrastar.
 */
export async function baixarComoZip(peca: Peca, assunto: string): Promise<ResultadoSalvamento> {
  const arquivos = arquivosParaSalvar(peca);
  if (!arquivos.length) throw new Error('Esta peça não tem arquivo salvo na plataforma.');

  const zip = new JSZip();
  for (const caminho of arquivos) {
    zip.file(nomeDoArquivo(caminho), await baixarBytes(caminho));
  }

  const nomePasta = PASTA_DA_PECA[peca.tipo];
  const conteudo = await zip.generateAsync({ type: 'blob' });
  baixarBlob(conteudo, `${nomePasta} - ${assunto || peca.tipo}.zip`);

  return { via: 'zip', destino: 'a sua pasta de downloads', quantos: arquivos.length };
}

/** Salva do melhor jeito que este navegador permitir. */
export async function salvarPeca(peca: Peca, assunto: string): Promise<ResultadoSalvamento> {
  return suportaPastas() ? salvarNaPasta(peca, assunto) : baixarComoZip(peca, assunto);
}
