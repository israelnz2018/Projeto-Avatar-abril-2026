import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

// Aceita toolData direto ou {toolData:{...}}.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

/**
 * Slide do "Entendendo o Problema".
 *
 * PENSADO PARA SER PROJETADO numa sessão ao vivo, para uma turma:
 *
 *   ┌──────────── TÍTULO DO PROJETO ──────────────────┐
 *   ├──────────── OBJETIVO (largura inteira) ─────────┤
 *   ├────────────────────────┬────────────────────────┤
 *   │ PROCESSO               │ O QUE DÁ ERRADO        │
 *   │ QUEM PARTICIPA         │ GANHOS E PERDAS        │
 *   └────────────────────────┴────────────────────────┘
 *
 * O objetivo ganha a faixa própria porque é o coração do projeto — num cartão
 * igual aos outros ele sumia no meio. E a letra não é fixa: o exportador
 * escolhe a MAIOR que faz todo o conteúdo caber. Antes era 8,5pt em cartões
 * dois terços vazios, ilegível do fundo de uma sala.
 *
 * Não dá para confiar no "encolher texto" do PowerPoint (shrinkText): ele só
 * age quando o arquivo é editado, não ao abrir. Por isso a medida é feita aqui.
 */

// ATENÇÃO: não existem q9 nem q11 no schema.
// q4, q5 e q12 só existem em projeto salvo antes das 5 perguntas atuais
// (ver briefModelo.ts); cartão vazio é descartado.
const ROTULOS: Record<string, string> = {
  q1: 'Processo',
  q2: 'O que dá errado',
  q4: 'O que está dando errado',
  q7: 'Objetivo do projeto',
  q8: 'Ganhos e perdas',
  q3: 'Quem participa',
  q5: 'Riscos',
  q10: 'Próximos passos',
  q12: 'Que tipo de ajuda precisa',
};

// Coluna da esquerda: o contexto. Da direita: o problema e o que ele custa.
const COLUNA_ESQ = ['q1', 'q3', 'q10', 'q5', 'q12'];
const COLUNA_DIR = ['q2', 'q4', 'q8'];

type Cartao = { key: string; label: string; value: string };

// ── Medidas (polegadas) ──
const BANNER_H = 0.56;
const GAP = 0.16;
const PAD_X = 0.16;
const PAD_TOP = 0.08;
const LABEL_H = 0.24;
const PAD_BOTTOM = 0.10;

// Calibri: largura média de um caractere ~0,48 em; altura de linha ~1,2 em.
// Um pouco folgado de propósito — estourar é pior que sobrar.
const larguraCaractere = (pt: number) => (pt * 0.5) / 72;
const alturaLinha = (pt: number) => (pt * 1.22) / 72;

/** Quantas linhas o texto ocupa numa caixa desta largura, com quebra automática. */
function linhas(texto: string, largura: number, pt: number): number {
  const porLinha = Math.max(1, Math.floor(largura / larguraCaractere(pt)));
  return texto.split(/\r?\n/).reduce((soma, l) => soma + Math.max(1, Math.ceil(l.length / porLinha)), 0);
}

/** Altura que um cartão precisa para mostrar todo o texto nesta fonte. */
function alturaNecessaria(texto: string, largura: number, pt: number): number {
  return PAD_TOP + LABEL_H + linhas(texto, largura - 2 * PAD_X, pt) * alturaLinha(pt) + PAD_BOTTOM;
}

export async function exportBriefSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);
  const answers = (data.answers && typeof data.answers === 'object') ? data.answers : {};

  const projectTitle: string = (answers.q6 || '').toString().trim();
  // O aluno pode anexar até 2 fotos direto na ferramenta (independente das respostas).
  const images: string[] = Array.isArray(data.images)
    ? data.images.filter((img: any) => typeof img === 'string' && img.length > 100)
    : [];

  const cartao = (key: string): Cartao | null => {
    const value = (answers[key] || '').toString().trim();
    return value ? { key, label: ROTULOS[key], value } : null;
  };
  const objetivo = cartao('q7');
  let esq = COLUNA_ESQ.map(cartao).filter(Boolean) as Cartao[];
  let dir = COLUNA_DIR.map(cartao).filter(Boolean) as Cartao[];
  // Nenhuma coluna fica vazia enquanto a outra tem dois ou mais.
  if (!esq.length && dir.length > 1) esq = [dir.shift()!];
  if (!dir.length && esq.length > 1) dir = [esq.pop()!];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const slide = createSlide(pres, project, 'Entendendo o Problema', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;
  const fileName = `Entendendo_o_Problema_${today.replace(/\//g, '')}.pptx`;

  // Vazio de verdade = sem respostas E sem foto.
  if (!projectTitle && !objetivo && !esq.length && !dir.length && !images.length) {
    slide.addText('(não preenchido)', {
      x: TX, y: TY + TH / 2 - 0.20, w: TW, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
    if (!options.pres) await pres.writeFile({ fileName });
    return;
  }

  // ── TÍTULO ──
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('TÍTULO DO PROJETO', {
    x: TX + 0.20, y: TY + 0.05, w: TW - 0.40, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: '8AA0E5', charSpacing: 1.5, valign: 'middle',
  });
  const ptTitulo = projectTitle.length > 140 ? 11 : projectTitle.length > 100 ? 12.5 : 15;
  slide.addText(projectTitle || '(sem título)', {
    x: TX + 0.20, y: TY + 0.20, w: TW - 0.40, h: BANNER_H - 0.24,
    fontFace: 'Calibri', fontSize: ptTitulo, bold: true, color: 'FFFFFF', valign: 'middle',
  });

  const topo = TY + BANNER_H + GAP;
  const fim = TY + TH; // abaixo disso é a faixa da ANÁLISE EXECUTIVA, que não se toca
  const comFoto = images.length > 0;
  const COL_W = (TW - GAP) / 2;

  // Com foto, todos os cartões vão para a esquerda e a direita fica com as imagens.
  const colunas: Cartao[][] = comFoto ? [[...esq, ...dir]] : [esq, dir].filter((c) => c.length);
  const larguraColuna = colunas.length === 1 && !comFoto ? TW : COL_W;

  // ── A MAIOR LETRA QUE CABE ──
  const altObjetivo = (pt: number) => (objetivo ? alturaNecessaria(objetivo.value, TW, pt + 1) : 0);
  const altColuna = (col: Cartao[], pt: number) =>
    col.reduce((s, c) => s + alturaNecessaria(c.value, larguraColuna, pt), 0) + Math.max(0, col.length - 1) * GAP;
  const cabe = (pt: number) => {
    const obj = altObjetivo(pt);
    const disponivel = fim - topo - (obj ? obj + GAP : 0);
    return colunas.every((col) => altColuna(col, pt) <= disponivel);
  };
  const pt = [14, 13, 12, 11, 10, 9].find(cabe) ?? 9;

  // ── OBJETIVO (faixa de largura inteira) ──
  let y = topo;
  if (objetivo) {
    const h = altObjetivo(pt);
    slide.addShape('rect', {
      x: TX, y, w: TW, h,
      fill: { color: 'E6ECFC' }, line: { color: '9DB2F0', width: 0.75 }, rectRadius: 0.04,
    });
    slide.addShape('rect', { x: TX, y, w: 0.07, h, fill: { color: THEME.BLUE }, line: { type: 'none' } });
    slide.addText(objetivo.label.toUpperCase(), {
      x: TX + PAD_X, y: y + PAD_TOP, w: TW - 2 * PAD_X, h: LABEL_H,
      fontFace: 'Calibri', fontSize: 8.5, bold: true, color: THEME.BLUE, charSpacing: 0.5, valign: 'middle',
    });
    slide.addText(objetivo.value, {
      x: TX + PAD_X, y: y + PAD_TOP + LABEL_H, w: TW - 2 * PAD_X, h: h - PAD_TOP - LABEL_H - PAD_BOTTOM + 0.04,
      fontFace: 'Calibri', fontSize: pt + 1, bold: true, color: THEME.NAVY, valign: 'top',
    });
    y += h + GAP;
  }

  // ── CARTÕES ──
  const desenharCartao = (c: Cartao, cx: number, cy: number, w: number, h: number) => {
    slide.addShape('rect', {
      x: cx, y: cy, w, h,
      fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });
    slide.addText(c.label.toUpperCase(), {
      x: cx + PAD_X, y: cy + PAD_TOP, w: w - 2 * PAD_X, h: LABEL_H,
      fontFace: 'Calibri', fontSize: 8.5, bold: true, color: THEME.NAVY, charSpacing: 0.5, valign: 'middle',
    });
    slide.addText(c.value, {
      x: cx + PAD_X, y: cy + PAD_TOP + LABEL_H, w: w - 2 * PAD_X, h: h - PAD_TOP - LABEL_H - PAD_BOTTOM + 0.04,
      fontFace: 'Calibri', fontSize: pt, color: THEME.INK, valign: 'top',
    });
  };

  // Cada coluna ocupa a altura toda; a sobra é dividida igualmente entre os
  // cartões, para as duas colunas terminarem alinhadas e sem buraco.
  const disponivel = fim - y;
  colunas.forEach((col, i) => {
    if (!col.length) return;
    const cx = TX + i * (COL_W + GAP);
    const alturas = col.map((c) => alturaNecessaria(c.value, larguraColuna, pt));
    const sobra = Math.max(0, disponivel - altColuna(col, pt));
    let cy = y;
    col.forEach((c, k) => {
      const h = alturas[k] + sobra / col.length;
      desenharCartao(c, cx, cy, larguraColuna, h);
      cy += h + GAP;
    });
  });

  // ── IMAGENS (coluna da direita, altura toda) ──
  if (comFoto) {
    const ix0 = TX + COL_W + GAP;
    const ih = fim - y;
    const usadas = images.slice(0, 2);
    const igap = 0.14;
    const iw = (COL_W - (usadas.length - 1) * igap) / usadas.length;
    usadas.forEach((img, idx) => {
      const ix = ix0 + idx * (iw + igap);
      try {
        // Garante o prefixo data:image/png;base64, (sem ele o PPT quebra).
        const imgData = img.startsWith('data:') ? img : `data:image/png;base64,${img}`;
        slide.addImage({ data: imgData, x: ix, y, w: iw, h: ih, sizing: { type: 'contain', w: iw, h: ih } });
      } catch (err) {
        console.error('[briefSlideExporter] erro ao adicionar imagem:', err);
        slide.addShape('rect', {
          x: ix, y, w: iw, h: ih,
          fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
        });
        slide.addText('(erro ao carregar imagem)', {
          x: ix, y, w: iw, h: ih,
          fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED, italic: true, align: 'center', valign: 'middle',
        });
      }
    });
  }

  if (!options.pres) await pres.writeFile({ fileName });
}
