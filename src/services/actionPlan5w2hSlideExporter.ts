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
  title: string;
  type: 'text' | 'status';
  isDefault?: boolean;
}

interface Action {
  id: string;
  [key: string]: any;
}

const ROWS_PER_SLIDE = 5;

const DEFAULT_COLUMNS: Column[] = [
  { id: 'description', title: 'Ação / Variável', type: 'text', isDefault: true },
  { id: 'what', title: 'O que? (What)', type: 'text' },
  { id: 'why', title: 'Por que? (Why)', type: 'text' },
  { id: 'where', title: 'Onde? (Where)', type: 'text' },
  { id: 'when', title: 'Quando? (When)', type: 'text' },
  { id: 'who', title: 'Quem? (Who)', type: 'text' },
  { id: 'how', title: 'Como? (How)', type: 'text' },
  { id: 'howMuch', title: 'Quanto? (How Much)', type: 'text' },
  { id: 'status', title: 'Status', type: 'status', isDefault: true },
];

function getColumnWeight(col: Column): number {
  if (col.id === 'description') return 1.6;
  if (col.id === 'what' || col.id === 'why') return 1.4;
  if (col.id === 'where') return 1.0;
  if (col.id === 'when') return 0.9;
  if (col.id === 'who') return 1.1;
  if (col.id === 'how') return 1.6;
  if (col.id === 'howMuch') return 1.0;
  if (col.type === 'status') return 1.1;
  return 1.2;
}

function getStatusInfo(state: string): { bg: string; fg: string; label: string } {
  const s = (state || 'green').toLowerCase();
  if (s === 'green') return { bg: 'DCFCE7', fg: '166534', label: 'NO PRAZO' };
  if (s === 'yellow') return { bg: 'FEF3C7', fg: '92400E', label: 'ATRASADO' };
  if (s === 'red') return { bg: 'FEE2E2', fg: '991B1B', label: 'RISCO' };
  return { bg: 'F3F4F6', fg: '6B7280', label: '—' };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function drawActionPlanSlide(
  pres: any,
  project: Project,
  actions: Action[],
  pageActions: Action[],
  columns: Column[],
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `Plano de Ação 5W2H (${pageIdx + 1}/${totalPages})`
    : 'Plano de Ação 5W2H';
  const slide = createSlide(pres, project, slideTitle, 'Improve', aiAnalysis);

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
  slide.addText('EXECUÇÃO ESTRUTURADA — O QUÊ · POR QUÊ · ONDE · QUANDO · QUEM · COMO · QUANTO', {
    x: TX + 0.18, y: TY, w: TW - 4.50, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
    charSpacing: 1.5, valign: 'middle',
  });

  const greenCount = actions.filter(a => (a.status?.state || 'green') === 'green').length;
  const yellowCount = actions.filter(a => a.status?.state === 'yellow').length;
  const redCount = actions.filter(a => a.status?.state === 'red').length;
  const summary = `${actions.length} ${actions.length === 1 ? 'ação' : 'ações'} · ${greenCount} no prazo · ${yellowCount} atrasadas · ${redCount} em risco`;
  slide.addText(summary, {
    x: TX + TW - 4.30, y: TY, w: 4.12, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 7.5, color: 'D1D5DB',
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
  const HEADER_H = 0.32;

  // HEADER
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

    // Tenta separar título PT do parêntese inglês para 2 linhas
    const title = col.title || '';
    const parenMatch = title.match(/^(.*?)\s*\((.+)\)\s*$/);
    if (parenMatch) {
      const ptTitle = parenMatch[1].toUpperCase();
      const enLabel = parenMatch[2];
      slide.addText(ptTitle, {
        x: cx + 0.04, y: tblY + 0.02, w: cw - 0.08, h: 0.16,
        fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
        valign: 'middle', shrinkText: true,
      });
      slide.addText(enLabel, {
        x: cx + 0.04, y: tblY + 0.16, w: cw - 0.08, h: 0.14,
        fontFace: 'Calibri', fontSize: 5.5, color: '9CA3AF', italic: true,
        valign: 'middle', shrinkText: true,
      });
    } else {
      slide.addText(title.toUpperCase(), {
        x: cx + 0.04, y: tblY, w: cw - 0.08, h: HEADER_H,
        fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
        align: col.type === 'status' ? 'center' : 'left',
        valign: 'middle', shrinkText: true,
      });
    }
  });

  // LINHAS
  const bodyY = tblY + HEADER_H;
  const TABLE_BOTTOM = TY + TH - 0.20;
  const availableH = TABLE_BOTTOM - bodyY - 0.20;
  const rowH = Math.min(0.50, Math.max(0.36, availableH / Math.max(pageActions.length, 1)));
  const fontSize = rowH < 0.42 ? 6 : 6.5;

  let rowY = bodyY;
  pageActions.forEach((action, idx) => {
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

      if (col.id === 'description') {
        // Coluna especial: ID (A1, A2...) em cima, descrição embaixo
        const globalIdx = (pageIdx * ROWS_PER_SLIDE) + idx + 1;
        const actionId = `A${globalIdx}`;
        slide.addText(actionId, {
          x: cx + 0.06, y: rowY + 0.02, w: cw - 0.12, h: 0.14,
          fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.BLUE,
          valign: 'top',
        });
        const desc = action[col.id] || action.description || '—';
        slide.addText(desc, {
          x: cx + 0.06, y: rowY + 0.16, w: cw - 0.12, h: rowH - 0.20,
          fontFace: 'Calibri', fontSize, bold: true, color: THEME.NAVY,
          valign: 'top', shrinkText: true,
        });
      } else if (col.type === 'status') {
        const state = action[col.id]?.state || 'green';
        const info = getStatusInfo(state);
        slide.addShape('rect', {
          x: cx + 0.10, y: rowY + 0.10, w: cw - 0.20, h: rowH - 0.20,
          fill: { color: info.bg }, line: { type: 'none' }, rectRadius: 0.04,
        });
        slide.addText(info.label, {
          x: cx + 0.10, y: rowY, w: cw - 0.20, h: rowH,
          fontFace: 'Calibri', fontSize: 6.5, bold: true, color: info.fg,
          align: 'center', valign: 'middle',
        });
      } else {
        const value = action[col.id] || '—';
        slide.addText(typeof value === 'string' ? value : String(value), {
          x: cx + 0.06, y: rowY, w: cw - 0.12, h: rowH,
          fontFace: 'Calibri', fontSize, color: THEME.INK,
          valign: 'middle', shrinkText: true,
        });
      }
    });

    // Linha divisória
    slide.addShape('line', {
      x: TX, y: rowY + rowH, w: TW, h: 0,
      line: { color: 'E8ECF4', width: 0.4 },
    });

    rowY += rowH;
  });

  // ── LEGENDA ──
  const LEG_Y = TY + TH - 0.18;
  slide.addText('STATUS:', {
    x: TX, y: LEG_Y, w: 0.50, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
    valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 0.55, y: LEG_Y + 0.02, w: 0.16, h: 0.10, fill: { color: 'DCFCE7' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText('No prazo', {
    x: TX + 0.74, y: LEG_Y, w: 0.80, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '166534', bold: true, valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 1.60, y: LEG_Y + 0.02, w: 0.16, h: 0.10, fill: { color: 'FEF3C7' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText('Atrasado', {
    x: TX + 1.79, y: LEG_Y, w: 0.80, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '92400E', bold: true, valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 2.65, y: LEG_Y + 0.02, w: 0.16, h: 0.10, fill: { color: 'FEE2E2' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText('Risco', {
    x: TX + 2.84, y: LEG_Y, w: 0.80, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '991B1B', bold: true, valign: 'middle',
  });
}

export async function exportActionPlan5w2hSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = ''
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const allActions: Action[] = Array.isArray(data.actions) ? data.actions : [];
  const actions = allActions.filter(a => {
    if (!a) return false;
    return Boolean((a.description || '').toString().trim() || (a.what || '').toString().trim());
  });

  const columns: Column[] = Array.isArray(data.columns) && data.columns.length > 0
    ? data.columns.filter((c: Column) => c && c.id)
    : DEFAULT_COLUMNS;

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';

  if (actions.length === 0) {
    const slide = createSlide(pres, project, 'Plano de Ação 5W2H', 'Improve', aiAnalysis);
    slide.addText('Nenhuma ação registrada nesta ferramenta.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(actions, ROWS_PER_SLIDE);
    pages.forEach((pageActions, idx) => {
      drawActionPlanSlide(pres, project, actions, pageActions, columns, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Plano_de_Acao_5W2H_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  await pres.writeFile({ fileName });
}
