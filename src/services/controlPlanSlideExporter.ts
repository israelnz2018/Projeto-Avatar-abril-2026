import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface Column {
  id: string;
  label: string;
  width?: string;
  type?: 'text' | 'checkbox' | 'select';
  options?: string[];
}

interface Item {
  id: string;
  data: Record<string, string>;
}

const ROWS_PER_SLIDE = 5;

const DEFAULT_COLUMNS: Column[] = [
  { id: 'process', label: 'Variável do projeto', type: 'text' },
  { id: 'processStep', label: 'Etapa do processo', type: 'text' },
  { id: 'isOutput', label: 'Saídas', type: 'checkbox' },
  { id: 'isInput', label: 'Entradas', type: 'checkbox' },
  { id: 'specifications', label: 'Especificações do processo', type: 'text' },
  { id: 'measurementTechnique', label: 'Técnica de medição', type: 'text' },
  { id: 'msaResult', label: 'Resultado MSA', type: 'text' },
  { id: 'sampleSize', label: 'Tamanho da amostra', type: 'text' },
  { id: 'sampleFrequency', label: 'Frequência da amostra', type: 'text' },
  { id: 'controlMethod', label: 'Método de controle', type: 'select' },
  { id: 'responsible', label: 'Responsável', type: 'text' },
  { id: 'reactionPlan', label: 'Plano de reação', type: 'text' },
];

function getColumnWeight(col: Column): number {
  if (col.id === 'process' || col.id === 'processStep') return 1.3;
  if (col.id === 'isOutput' || col.id === 'isInput') return 0.5;
  if (col.id === 'specifications' || col.id === 'reactionPlan') return 1.4;
  if (col.id === 'measurementTechnique') return 1.2;
  if (col.id === 'msaResult' || col.id === 'sampleSize' || col.id === 'sampleFrequency') return 0.9;
  if (col.id === 'controlMethod') return 0.95;
  if (col.id === 'responsible') return 0.95;
  return 1.0;
}

function getMethodChip(method: string): { bg: string; fg: string; label: string } {
  const m = (method || '').toLowerCase();
  if (m.includes('prevenir')) return { bg: 'DCFCE7', fg: '166534', label: 'Prevenir Causa' };
  if (m.includes('detectar causa')) return { bg: 'DBEAFE', fg: '1E40AF', label: 'Detectar Causa' };
  if (m.includes('detectar defeito') || m.includes('defeito')) return { bg: 'FEE2E2', fg: '991B1B', label: 'Detectar Defeito' };
  return { bg: 'F3F4F6', fg: '6B7280', label: method || '—' };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function drawControlPlanSlide(
  pres: any,
  project: Project,
  items: Item[],
  pageItems: Item[],
  columns: Column[],
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `Plano de Controle (${pageIdx + 1}/${totalPages})`
    : 'Plano de Controle';
  const slide = createSlide(pres, project, slideTitle, 'Control', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // ── BANNER ──
  const BANNER_H = 0.30;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('SUSTENTAÇÃO DA MELHORIA · CONTROLES, FREQUÊNCIA, PLANOS DE REAÇÃO', {
    x: TX + 0.18, y: TY, w: TW - 3.50, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
    charSpacing: 1.5, valign: 'middle',
  });
  slide.addText(`${items.length} ${items.length === 1 ? 'controle mapeado' : 'controles mapeados'}`, {
    x: TX + TW - 3.30, y: TY, w: 3.12, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ── TABELA ──
  const totalWeight = columns.reduce((s, c) => s + getColumnWeight(c), 0);
  const colWidths = columns.map(c => (getColumnWeight(c) / totalWeight) * TW);
  const colXs: number[] = [];
  let cursor = TX;
  columns.forEach((_, i) => {
    colXs.push(cursor);
    cursor += colWidths[i];
  });

  const tblY = TY + BANNER_H + 0.10;
  const HEADER_H = 0.34;

  slide.addShape('rect', {
    x: TX, y: tblY, w: TW, h: HEADER_H,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
  });

  columns.forEach((col, i) => {
    const cx = colXs[i];
    const cw = colWidths[i];

    if (i > 0) {
      slide.addShape('line', {
        x: cx, y: tblY, w: 0, h: HEADER_H,
        line: { color: 'D1D5DB', width: 0.4 },
      });
    }

    const isCenter = col.type === 'checkbox' || col.type === 'select';
    slide.addText((col.label || '').toUpperCase(), {
      x: cx + 0.04, y: tblY, w: cw - 0.08, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
      align: isCenter ? 'center' : 'left',
      valign: 'middle', shrinkText: true,
    });
  });

  // LINHAS
  const bodyY = tblY + HEADER_H;
  const TABLE_BOTTOM = TY + TH - 0.20;
  const availableH = TABLE_BOTTOM - bodyY - 0.20;
  const rowH = Math.min(0.55, Math.max(0.40, availableH / Math.max(pageItems.length, 1)));
  const fontSize = rowH < 0.46 ? 6 : 6.5;

  let rowY = bodyY;
  pageItems.forEach((item, idx) => {
    if (rowY + rowH > TABLE_BOTTOM) return;

    const isZebra = idx % 2 === 0;
    if (isZebra) {
      slide.addShape('rect', {
        x: TX, y: rowY, w: TW, h: rowH,
        fill: { color: 'F8F9FC' }, line: { type: 'none' },
      });
    }

    columns.forEach((col, i) => {
      const cx = colXs[i];
      const cw = colWidths[i];
      const value = item.data?.[col.id] || '';

      if (col.type === 'checkbox') {
        if (value === 'X' || value === 'x' || value === 'true') {
          // Bolinha azul com check
          const checkR = Math.min(0.10, rowH * 0.20);
          const checkCx = cx + cw / 2;
          const checkCy = rowY + rowH / 2;
          slide.addShape('ellipse', {
            x: checkCx - checkR, y: checkCy - checkR,
            w: checkR * 2, h: checkR * 2,
            fill: { color: THEME.BLUE }, line: { type: 'none' },
          });
          slide.addText('✓', {
            x: cx, y: rowY, w: cw, h: rowH,
            fontFace: 'Calibri', fontSize: fontSize + 3, bold: true, color: 'FFFFFF',
            align: 'center', valign: 'middle',
          });
        }
      } else if (col.id === 'controlMethod') {
        if (value && value.trim()) {
          const chip = getMethodChip(value);
          slide.addShape('rect', {
            x: cx + 0.06, y: rowY + 0.08, w: cw - 0.12, h: rowH - 0.16,
            fill: { color: chip.bg }, line: { type: 'none' }, rectRadius: 0.04,
          });
          slide.addText(chip.label, {
            x: cx + 0.06, y: rowY, w: cw - 0.12, h: rowH,
            fontFace: 'Calibri', fontSize: fontSize - 0.5, bold: true, color: chip.fg,
            align: 'center', valign: 'middle', shrinkText: true,
          });
        }
      } else {
        const isFirstCol = i === 0;
        slide.addText(value || '—', {
          x: cx + 0.06, y: rowY, w: cw - 0.12, h: rowH,
          fontFace: 'Calibri', fontSize, bold: isFirstCol, color: isFirstCol ? THEME.NAVY : THEME.INK,
          valign: 'middle', shrinkText: true,
        });
      }
    });

    slide.addShape('line', {
      x: TX, y: rowY + rowH, w: TW, h: 0,
      line: { color: 'E8ECF4', width: 0.4 },
    });

    rowY += rowH;
  });

  // ── LEGENDA MÉTODO DE CONTROLE ──
  const LEG_Y = TY + TH - 0.18;
  slide.addText('MÉTODO DE CONTROLE:', {
    x: TX, y: LEG_Y, w: 1.50, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
    valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 1.55, y: LEG_Y + 0.02, w: 0.16, h: 0.10, fill: { color: 'DCFCE7' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText('Prevenir Causa', {
    x: TX + 1.74, y: LEG_Y, w: 1.10, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '166534', bold: true, valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 2.86, y: LEG_Y + 0.02, w: 0.16, h: 0.10, fill: { color: 'DBEAFE' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText('Detectar Causa', {
    x: TX + 3.05, y: LEG_Y, w: 1.10, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '1E40AF', bold: true, valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 4.17, y: LEG_Y + 0.02, w: 0.16, h: 0.10, fill: { color: 'FEE2E2' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText('Detectar Defeito', {
    x: TX + 4.36, y: LEG_Y, w: 1.20, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '991B1B', bold: true, valign: 'middle',
  });
}

export async function exportControlPlanSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const allItems: Item[] = Array.isArray(data.items) ? data.items : [];
  const items = allItems.filter(it => {
    if (!it || !it.data) return false;
    const hasContent = Object.values(it.data).some(v => (v || '').toString().trim());
    return hasContent;
  });

  const columns: Column[] = Array.isArray(data.columns) && data.columns.length > 0
    ? data.columns.filter((c: Column) => c && c.id)
    : DEFAULT_COLUMNS;

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (items.length === 0) {
    const slide = createSlide(pres, project, 'Plano de Controle', 'Control', aiAnalysis);
    slide.addText('Nenhum controle registrado nesta ferramenta.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(items, ROWS_PER_SLIDE);
    pages.forEach((pageItems, idx) => {
      drawControlPlanSlide(pres, project, items, pageItems, columns, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Plano_de_Controle_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
