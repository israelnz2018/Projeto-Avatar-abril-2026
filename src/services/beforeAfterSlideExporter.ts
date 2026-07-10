import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.formData && typeof input.formData === 'object') return input.formData;
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface Side {
  quant: string[];
  subj: string[];
}

function cleanList(arr: any): string[] {
  return Array.isArray(arr)
    ? arr.filter((s: any) => s != null && s.toString().trim()).map((s: any) => s.toString())
    : [];
}

// Desenha uma sub-seção (label + bullets) e retorna o próximo Y.
function drawSubSection(
  slide: any,
  label: string,
  items: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string
): void {
  slide.addText(label, {
    x: x + 0.10, y, w: w - 0.20, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: accent, charSpacing: 1,
  });

  const bodyY = y + 0.20;
  const bodyH = h - 0.20;

  if (items.length > 0) {
    const bullets = items.map(item => ({
      text: item,
      options: { bullet: { code: '2022' } },
    }));
    slide.addText(bullets, {
      x: x + 0.14, y: bodyY, w: w - 0.28, h: bodyH,
      fontFace: 'Calibri', fontSize: 9, color: THEME.INK,
      valign: 'top', paraSpaceAfter: 3, shrinkText: true,
    });
  } else {
    slide.addText('(não preenchido)', {
      x: x + 0.14, y: bodyY, w: w - 0.28, h: bodyH,
      fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED,
      italic: true, valign: 'top',
    });
  }
}

export async function exportBeforeAfterSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const before: Side = {
    quant: cleanList(data?.before?.quant),
    subj: cleanList(data?.before?.subj),
  };
  const after: Side = {
    quant: cleanList(data?.after?.quant),
    subj: cleanList(data?.after?.subj),
  };

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const slide = createSlide(pres, project, 'Antes × Depois', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // Coluna vermelho suave (ANTES) / verde (DEPOIS), seta central.
  const ARROW_W = 0.60;
  const COL_W = (TW - ARROW_W) / 2;
  const LEFT_X = TX;
  const RIGHT_X = TX + COL_W + ARROW_W;

  const HEADER_H = 0.34;

  const columns = [
    { x: LEFT_X, label: 'ANTES', headerBg: 'B91C1C', panelBg: 'FEE2E2', accent: 'B91C1C', side: before },
    { x: RIGHT_X, label: 'DEPOIS', headerBg: '047857', panelBg: 'D1FAE5', accent: '047857', side: after },
  ];

  columns.forEach(col => {
    // Cabeçalho
    slide.addShape('rect', {
      x: col.x, y: TY, w: COL_W, h: HEADER_H,
      fill: { color: col.headerBg }, line: { type: 'none' }, rectRadius: 0.04,
    });
    slide.addText(col.label, {
      x: col.x, y: TY, w: COL_W, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 9, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 2,
    });

    // Painel
    const panelY = TY + HEADER_H;
    const panelH = TH - HEADER_H;
    slide.addShape('rect', {
      x: col.x, y: panelY, w: COL_W, h: panelH,
      fill: { color: col.panelBg }, line: { color: THEME.CHIP_BD, width: 0.5 },
      rectRadius: 0.04,
    });

    // Duas sub-seções: DADOS QUANTITATIVOS (metade superior) e PERCEPÇÕES (inferior)
    const innerPad = 0.14;
    const usableH = panelH - innerPad * 2;
    const subH = usableH / 2;
    const s1Y = panelY + innerPad;
    const s2Y = s1Y + subH;

    drawSubSection(slide, 'DADOS QUANTITATIVOS', col.side.quant, col.x, s1Y, COL_W, subH, col.accent);

    // Divisor entre as sub-seções
    slide.addShape('line', {
      x: col.x + innerPad, y: s2Y - 0.02, w: COL_W - innerPad * 2, h: 0,
      line: { color: THEME.CHIP_BD, width: 0.5 },
    });

    drawSubSection(slide, 'PERCEPÇÕES', col.side.subj, col.x, s2Y + 0.04, COL_W, subH - 0.04, col.accent);
  });

  // Seta central →
  const arrowCX = TX + COL_W;
  const arrowCY = TY + TH / 2;
  slide.addText('→', {
    x: arrowCX, y: arrowCY - 0.30, w: ARROW_W, h: 0.60,
    fontFace: 'Calibri', fontSize: 28, bold: true, color: THEME.BLUE,
    align: 'center', valign: 'middle',
  });

  const fileName = `Antes_Depois_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
