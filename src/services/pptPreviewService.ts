/**
 * pptPreviewService — gera uma PRÉVIA (PNG) do primeiro slide de um .pptx,
 * inteiramente no navegador, a partir do File que o consultor acabou de escolher.
 *
 * Por que assim: as duas alternativas óbvias falham na prática —
 *  - visualizador do Office Online exige que a URL do arquivo seja alcançável
 *    publicamente pela internet (a nossa é autenticada/temporária);
 *  - ler o .pptx de volta do Storage esbarra em CORS.
 * Como aqui o File já está na memória do navegador, nada disso se aplica.
 *
 * Estratégia (nesta ordem):
 *  1. miniatura embutida (docProps/thumbnail.*) — é o que o PowerPoint grava;
 *     é o mais fiel, ainda que em baixa resolução.
 *  2. desenho aproximado do slide 1 (fundo, imagens, formas e textos) no canvas.
 *     Não fica perfeito — é uma prévia pra conferir o design, não um render fiel.
 */
import JSZip from 'jszip';

/** 914400 EMU por polegada ÷ 96 px por polegada. */
const EMU_POR_PX = 9525;
const LARGURA_RENDER = 1600;

type Tema = Record<string, string>;

function resolverCaminho(base: string, alvo: string): string {
  if (alvo.startsWith('/')) return alvo.slice(1);
  const partes = base ? base.split('/') : [];
  for (const seg of alvo.split('/')) {
    if (seg === '..') partes.pop();
    else if (seg && seg !== '.') partes.push(seg);
  }
  return partes.join('/');
}

async function lerXml(zip: JSZip, caminho: string): Promise<Document | null> {
  const arquivo = zip.file(caminho);
  if (!arquivo) return null;
  try {
    return new DOMParser().parseFromString(await arquivo.async('string'), 'application/xml');
  } catch {
    return null;
  }
}

/** Relacionamentos de uma parte: Id -> caminho resolvido, e Type -> caminho. */
async function lerRels(zip: JSZip, parte: string) {
  const corte = parte.lastIndexOf('/');
  const dir = corte >= 0 ? parte.slice(0, corte) : '';
  const nome = corte >= 0 ? parte.slice(corte + 1) : parte;
  const doc = await lerXml(zip, `${dir}/_rels/${nome}.rels`);
  const porId = new Map<string, string>();
  const porTipo = new Map<string, string>();
  if (!doc) return { porId, porTipo };
  for (const rel of Array.from(doc.getElementsByTagName('Relationship'))) {
    const id = rel.getAttribute('Id');
    const alvo = rel.getAttribute('Target');
    const tipo = rel.getAttribute('Type') || '';
    if (!alvo || rel.getAttribute('TargetMode') === 'External') continue;
    const caminho = resolverCaminho(dir, alvo);
    if (id) porId.set(id, caminho);
    const sufixo = tipo.split('/').pop() || '';
    if (sufixo && !porTipo.has(sufixo)) porTipo.set(sufixo, caminho);
  }
  return { porId, porTipo };
}

async function lerTema(zip: JSZip): Promise<Tema> {
  const tema: Tema = {};
  const doc = await lerXml(zip, 'ppt/theme/theme1.xml');
  const esquema = doc?.getElementsByTagName('a:clrScheme')[0];
  if (!esquema) return tema;
  for (const item of Array.from(esquema.children)) {
    const nome = item.tagName.replace(/^a:/, '');
    const srgb = item.getElementsByTagName('a:srgbClr')[0]?.getAttribute('val');
    const sys = item.getElementsByTagName('a:sysClr')[0]?.getAttribute('lastClr');
    const val = srgb || sys;
    if (val) tema[nome] = `#${val}`;
  }
  // Apelidos usados nos slides (bg1/tx1 apontam pro par claro/escuro do tema).
  tema.bg1 = tema.bg1 || tema.lt1 || '#FFFFFF';
  tema.tx1 = tema.tx1 || tema.dk1 || '#000000';
  tema.bg2 = tema.bg2 || tema.lt2 || '#FFFFFF';
  tema.tx2 = tema.tx2 || tema.dk2 || '#000000';
  return tema;
}

/** Cor de um nó de preenchimento (a:solidFill ou similar). */
function corDe(no: Element | null | undefined, tema: Tema): string | null {
  if (!no) return null;
  const srgb = no.getElementsByTagName('a:srgbClr')[0]?.getAttribute('val');
  if (srgb) return `#${srgb}`;
  const esquema = no.getElementsByTagName('a:schemeClr')[0]?.getAttribute('val');
  if (esquema) return tema[esquema] || tema[esquema === 'bg1' ? 'lt1' : 'dk1'] || null;
  return null;
}

function filhoDireto(pai: Element, tag: string): Element | null {
  for (const filho of Array.from(pai.children)) if (filho.tagName === tag) return filho;
  return null;
}

async function carregarImagem(zip: JSZip, caminho: string): Promise<HTMLImageElement | null> {
  const arquivo = zip.file(caminho);
  if (!arquivo) return null;
  // EMF/WMF não são decodificáveis pelo navegador — ignoramos.
  if (/\.(emf|wmf)$/i.test(caminho)) return null;
  try {
    const url = URL.createObjectURL(await arquivo.async('blob'));
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    URL.revokeObjectURL(url);
    return img;
  } catch {
    return null;
  }
}

/** Desenha o fundo (cor sólida ou imagem) de uma parte (slide/layout/master). */
async function desenharFundo(
  ctx: CanvasRenderingContext2D,
  doc: Document,
  zip: JSZip,
  rels: Map<string, string>,
  tema: Tema,
  largura: number,
  altura: number,
) {
  const bg = doc.getElementsByTagName('p:bg')[0];
  if (!bg) return;
  const cor = corDe(bg.getElementsByTagName('a:solidFill')[0], tema);
  if (cor) {
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, largura, altura);
    return;
  }
  const embed = bg.getElementsByTagName('a:blip')[0]?.getAttribute('r:embed');
  const caminho = embed ? rels.get(embed) : null;
  if (caminho) {
    const img = await carregarImagem(zip, caminho);
    if (img) ctx.drawImage(img, 0, 0, largura, altura);
  }
}

/** Quebra o texto em linhas que cabem na largura da forma. */
function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Desenha as formas de um contêiner (spTree ou grpSp): imagens, preenchimentos e textos.
 *
 * `ehSlide` distingue o slide das camadas de layout/master: nessas, as formas de
 * PLACEHOLDER (p:ph) carregam texto de exemplo ("Clique para editar o título") que o
 * PowerPoint não mostra no slide real — desenhar isso sujaria a prévia.
 */
async function desenharFormas(
  ctx: CanvasRenderingContext2D,
  conteiner: Element,
  zip: JSZip,
  rels: Map<string, string>,
  tema: Tema,
  escala: number,
  ehSlide: boolean,
  desloc = { dx: 0, dy: 0, sx: 1, sy: 1 },
) {
  for (const forma of Array.from(conteiner.children)) {
    const tag = forma.tagName;
    if (tag !== 'p:sp' && tag !== 'p:pic' && tag !== 'p:grpSp') continue;

    const xfrm = forma.getElementsByTagName('a:xfrm')[0];
    const off = xfrm ? filhoDireto(xfrm, 'a:off') : null;
    const ext = xfrm ? filhoDireto(xfrm, 'a:ext') : null;
    if (!off || !ext) continue;
    const x = ((Number(off.getAttribute('x')) / EMU_POR_PX) * desloc.sx + desloc.dx) * escala;
    const y = ((Number(off.getAttribute('y')) / EMU_POR_PX) * desloc.sy + desloc.dy) * escala;
    const w = (Number(ext.getAttribute('cx')) / EMU_POR_PX) * desloc.sx * escala;
    const h = (Number(ext.getAttribute('cy')) / EMU_POR_PX) * desloc.sy * escala;
    if (!isFinite(x) || !isFinite(y) || !(w > 0) || !(h > 0)) continue;

    if (tag === 'p:grpSp') {
      // Grupo: mapeia o espaço interno (chOff/chExt) pro externo (off/ext).
      const chOff = filhoDireto(xfrm, 'a:chOff');
      const chExt = filhoDireto(xfrm, 'a:chExt');
      const cw = Number(chExt?.getAttribute('cx'));
      const ch = Number(chExt?.getAttribute('cy'));
      const filho = cw > 0 && ch > 0
        ? {
            sx: (Number(ext.getAttribute('cx')) / cw) * desloc.sx,
            sy: (Number(ext.getAttribute('cy')) / ch) * desloc.sy,
            dx: x / escala - (Number(chOff?.getAttribute('x')) || 0) / EMU_POR_PX * ((Number(ext.getAttribute('cx')) / cw) * desloc.sx),
            dy: y / escala - (Number(chOff?.getAttribute('y')) || 0) / EMU_POR_PX * ((Number(ext.getAttribute('cy')) / ch) * desloc.sy),
          }
        : desloc;
      await desenharFormas(ctx, forma, zip, rels, tema, escala, ehSlide, filho);
      continue;
    }

    if (tag === 'p:pic') {
      const embed = forma.getElementsByTagName('a:blip')[0]?.getAttribute('r:embed');
      const caminho = embed ? rels.get(embed) : null;
      if (caminho) {
        const img = await carregarImagem(zip, caminho);
        if (img) ctx.drawImage(img, x, y, w, h);
      }
      continue;
    }

    // Fora do slide, ignora placeholders (texto de exemplo do layout/master).
    const ehPlaceholder = !!forma.getElementsByTagName('p:ph')[0];
    if (!ehSlide && ehPlaceholder) continue;

    // Formas: preenchimento sólido (quando houver) + texto.
    const spPr = filhoDireto(forma, 'p:spPr');
    const preenchimento = spPr ? filhoDireto(spPr, 'a:solidFill') : null;
    const cor = corDe(preenchimento, tema);
    if (cor) {
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, w, h);
    }

    const corpo = filhoDireto(forma, 'p:txBody');
    if (!corpo) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip(); // texto nunca escorre pra fora da forma
    ctx.textBaseline = 'top';
    let deslocY = 0;
    for (const paragrafo of Array.from(corpo.getElementsByTagName('a:p'))) {
      const texto = Array.from(paragrafo.getElementsByTagName('a:t'))
        .map((t) => t.textContent || '')
        .join('')
        .trim();
      if (!texto) continue;
      const rPr = paragrafo.getElementsByTagName('a:rPr')[0];
      // sz vem em centésimos de ponto; 1pt = 96/72 px.
      const sz = Number(rPr?.getAttribute('sz'));
      const tamanho = (isFinite(sz) && sz > 0 ? (sz / 100) * (96 / 72) : 18) * escala;
      const negrito = rPr?.getAttribute('b') === '1';
      ctx.fillStyle = corDe(rPr?.getElementsByTagName('a:solidFill')[0], tema) || '#2A2F3A';
      ctx.font = `${negrito ? 'bold ' : ''}${Math.max(8, tamanho)}px Arial, sans-serif`;
      const alturaLinha = tamanho * 1.25;
      for (const linha of quebrarLinhas(ctx, texto, w)) {
        if (deslocY > h) break;
        ctx.fillText(linha, x, y + deslocY);
        deslocY += alturaLinha;
      }
    }
    ctx.restore();
  }
}

/**
 * Gera a prévia PNG do primeiro slide. Devolve null se não for possível
 * (arquivo inválido, ou sem nada renderizável) — o chamador decide o fallback.
 */
export async function gerarPreviaPptx(arquivo: File | Blob): Promise<Blob | null> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arquivo);
  } catch {
    return null;
  }

  // 1) Miniatura embutida — é o que o PowerPoint grava, e é fiel ao original.
  const miniatura = Object.values(zip.files).find((f) => /(^|\/)thumbnail\.(jpe?g|png)$/i.test(f.name));
  if (miniatura) {
    try {
      return await miniatura.async('blob');
    } catch {
      // segue pro desenho aproximado
    }
  }

  // 2) Desenho aproximado do slide 1.
  const apresentacao = await lerXml(zip, 'ppt/presentation.xml');
  const tamanho = apresentacao?.getElementsByTagName('p:sldSz')[0];
  const cx = Number(tamanho?.getAttribute('cx')) || 12192000; // 16:9 padrão
  const cy = Number(tamanho?.getAttribute('cy')) || 6858000;

  const slide = await lerXml(zip, 'ppt/slides/slide1.xml');
  if (!slide) return null;

  const largura = LARGURA_RENDER;
  const altura = Math.round((cy / cx) * LARGURA_RENDER);
  const escala = largura / (cx / EMU_POR_PX);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, largura, altura);

  const tema = await lerTema(zip);

  // Ordem de pintura: master → layout → slide (é assim que o PowerPoint compõe).
  const relsSlide = await lerRels(zip, 'ppt/slides/slide1.xml');
  const caminhoLayout = relsSlide.porTipo.get('slideLayout');
  const layout = caminhoLayout ? await lerXml(zip, caminhoLayout) : null;
  const relsLayout = caminhoLayout ? await lerRels(zip, caminhoLayout) : null;
  const caminhoMaster = relsLayout?.porTipo.get('slideMaster');
  const master = caminhoMaster ? await lerXml(zip, caminhoMaster) : null;
  const relsMaster = caminhoMaster ? await lerRels(zip, caminhoMaster) : null;

  for (const camada of [
    { doc: master, rels: relsMaster?.porId, ehSlide: false },
    { doc: layout, rels: relsLayout?.porId, ehSlide: false },
    { doc: slide, rels: relsSlide.porId, ehSlide: true },
  ]) {
    if (!camada.doc) continue;
    const rels = camada.rels || new Map<string, string>();
    await desenharFundo(ctx, camada.doc, zip, rels, tema, largura, altura);
    const arvore = camada.doc.getElementsByTagName('p:spTree')[0];
    if (arvore) await desenharFormas(ctx, arvore, zip, rels, tema, escala, camada.ehSlide);
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png', 0.92);
  });
}
