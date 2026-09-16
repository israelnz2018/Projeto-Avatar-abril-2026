/**
 * Encaixa o desenho de QUALQUER ferramenta no slide do consultor.
 *
 * Os 40 exportadores desenham em polegadas, para o slide da casa (13,33 × 7,5).
 * O consultor, porém, envia o PRÓPRIO modelo: PowerPoint costuma ser 13,33 × 7,5,
 * o que sai do Google Slides é 10 × 5,625, e um modelo antigo pode ser 10 × 7,5.
 * Desenhar medida fixa num slide menor joga conteúdo para fora — foi o que
 * aconteceu na primeira apresentação gerada num modelo próprio.
 *
 * Em vez de acertar ferramenta por ferramenta (e torcer para a próxima nascer
 * certa), o slide inteiro é envolvido aqui: toda posição, tamanho e corpo de letra
 * passa por uma conta só antes de chegar ao PowerPoint. Ferramenta nova entra
 * encaixada sem saber que isto existe.
 *
 * A escala é UNIFORME — a mesma na largura e na altura. Esticar um lado só
 * entortaria círculos, ícones e a proporção do texto.
 */

/** Onde o desenho da casa cabe dentro do modelo do consultor. */
export interface EncaixeNoModelo {
  fator: number;
  deslocX: number;
  deslocY: number;
}

/**
 * Calcula o encaixe: leva o retângulo `de` (o espaço da casa) para dentro do
 * retângulo `para` (o espaço livre do modelo), sem distorcer e centralizado.
 */
export function calcularEncaixe(
  de: { x: number; y: number; w: number; h: number },
  para: { x: number; y: number; w: number; h: number },
): EncaixeNoModelo {
  const fator = Math.min(para.w / de.w, para.h / de.h);
  // Centraliza a sobra do lado que ficou com folga.
  const sobraX = para.w - de.w * fator;
  const sobraY = para.h - de.h * fator;
  return {
    fator,
    deslocX: para.x + sobraX / 2 - de.x * fator,
    deslocY: para.y + sobraY / 2 - de.y * fator,
  };
}

const ehNumero = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

/** Aplica o encaixe nas medidas de um objeto de opções do pptxgenjs. */
function ajustarOpcoes(opcoes: any, encaixe: EncaixeNoModelo): any {
  if (!opcoes || typeof opcoes !== 'object') return opcoes;
  const { fator, deslocX, deslocY } = encaixe;
  const o: any = { ...opcoes };

  if (ehNumero(o.x)) o.x = o.x * fator + deslocX;
  if (ehNumero(o.y)) o.y = o.y * fator + deslocY;
  if (ehNumero(o.w)) o.w = o.w * fator;
  if (ehNumero(o.h)) o.h = o.h * fator;
  // Corpo de letra em pontos: encolhe junto, senão o texto estoura a caixa.
  if (ehNumero(o.fontSize)) o.fontSize = Math.max(1, Number((o.fontSize * fator).toFixed(1)));
  if (ehNumero(o.rectRadius)) o.rectRadius = o.rectRadius * fator;
  if (ehNumero(o.charSpacing)) o.charSpacing = o.charSpacing * fator;
  if (ehNumero(o.margin)) o.margin = o.margin * fator;
  if (o.line && typeof o.line === 'object' && ehNumero(o.line.width)) {
    o.line = { ...o.line, width: Math.max(0.25, o.line.width * fator) };
  }
  // Tabelas: largura de coluna e altura de linha também são polegadas.
  if (Array.isArray(o.colW)) o.colW = o.colW.map((v: any) => (ehNumero(v) ? v * fator : v));
  if (ehNumero(o.colW)) o.colW = o.colW * fator;
  if (Array.isArray(o.rowH)) o.rowH = o.rowH.map((v: any) => (ehNumero(v) ? v * fator : v));
  if (ehNumero(o.rowH)) o.rowH = o.rowH * fator;
  return o;
}

/** O texto em partes (`[{ text, options }]`) também carrega corpo de letra. */
function ajustarTexto(conteudo: any, encaixe: EncaixeNoModelo): any {
  if (Array.isArray(conteudo)) {
    return conteudo.map((parte: any) => (
      parte && typeof parte === 'object' && parte.options
        ? { ...parte, options: ajustarOpcoes(parte.options, encaixe) }
        : parte
    ));
  }
  return conteudo;
}

/**
 * Devolve o slide vestido com o encaixe: quem desenha continua falando em
 * polegadas da casa e não precisa saber o tamanho do modelo.
 */
export function slideEncaixado(slide: any, encaixe: EncaixeNoModelo): any {
  const original = slide;
  return {
    // `background` e demais propriedades continuam valendo no slide de verdade.
    get background() { return original.background; },
    set background(valor: any) { original.background = valor; },
    addText: (conteudo: any, opcoes: any) =>
      original.addText(ajustarTexto(conteudo, encaixe), ajustarOpcoes(opcoes, encaixe)),
    addShape: (tipo: any, opcoes: any) => original.addShape(tipo, ajustarOpcoes(opcoes, encaixe)),
    addImage: (opcoes: any) => original.addImage(ajustarOpcoes(opcoes, encaixe)),
    addTable: (linhas: any, opcoes: any) => original.addTable(linhas, ajustarOpcoes(opcoes, encaixe)),
    addChart: (tipo: any, dados: any, opcoes: any) => original.addChart(tipo, dados, ajustarOpcoes(opcoes, encaixe)),
    addNotes: (texto: any) => original.addNotes?.(texto),
  };
}
