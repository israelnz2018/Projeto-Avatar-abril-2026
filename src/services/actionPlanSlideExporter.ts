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

interface Column {
  id: string;
  title: string;
  type: 'text' | 'status';
  isDefault?: boolean;
}

// Estilo do badge por estado (paleta sólida, mesmo padrão do raciSlideExporter).
const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  green: { bg: 'D1FAE5', fg: '047857', label: 'Concluído' },
  blue: { bg: 'DBEAFE', fg: '1D4ED8', label: 'Em andamento' },
  yellow: { bg: 'FEF3C7', fg: '92400E', label: 'Atrasado' },
  red: { bg: 'FEE2E2', fg: 'B91C1C', label: 'Cancelado' },
};

const ROWS_PER_SLIDE = 8;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function drawActionPlanSlide(
  pres: any,
  project: Project,
  columns: Column[],
  allActions: any[],
  pageActions: any[],
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
): void {
  const slideTitle = totalPages > 1
    ? `Plano de Ação (${pageIdx + 1}/${totalPages})`
    : 'Plano de Ação';
  const slide = createSlide(pres, project, slideTitle, 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  const colCount = Math.max(columns.length, 1);
  const colW = TW / colCount;

  const HEADER_H = 0.44;

  // Cabeçalho NAVY
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: HEADER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.03,
  });
  columns.forEach((col, i) => {
    const cx = TX + i * colW;
    if (i > 0) {
      slide.addShape('line', {
        x: cx, y: TY, w: 0, h: HEADER_H,
        line: { color: '3A4A8E', width: 0.4 },
      });
    }
    slide.addText((col.title || '—').toUpperCase(), {
      x: cx + 0.08, y: TY, w: colW - 0.16, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 7.5, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 0.5, shrinkText: true,
    });
  });

  // Linhas
  const bodyY = TY + HEADER_H;
  const availableH = TH - HEADER_H;
  const rowH = Math.min(0.56, Math.max(0.34, availableH / Math.max(pageActions.length, 1)));
  const fontSize = rowH < 0.42 ? 8 : 9;

  let rowY = bodyY;
  pageActions.forEach((action, idx) => {
    if (rowY + rowH > TY + TH) return;

    // Zebra
    if (idx % 2 === 0) {
      slide.addShape('rect', {
        x: TX, y: rowY, w: TW, h: rowH,
        fill: { color: 'F8F9FC' }, line: { type: 'none' },
      });
    }

    columns.forEach((col, ci) => {
      const cx = TX + ci * colW;
      const value = action?.[col.id];

      if (col.type === 'status') {
        const state = (value && typeof value === 'object' ? value.state : '')
          ?.toString().toLowerCase().trim();
        const style = STATUS_STYLE[state];
        if (style) {
          const progress = (value && typeof value === 'object' && value.progress != null)
            ? value.progress.toString().trim()
            : '';
          const badgeW = Math.min(colW - 0.20, 1.60);
          const badgeH = Math.min(rowH - 0.12, 0.30);
          const bx = cx + (colW - badgeW) / 2;
          const by = rowY + (rowH - badgeH) / 2;
          slide.addShape('rect', {
            x: bx, y: by, w: badgeW, h: badgeH,
            fill: { color: style.bg }, line: { type: 'none' }, rectRadius: 0.04,
          });
          const label = progress ? `${style.label} · ${progress}` : style.label;
          slide.addText(label, {
            x: bx, y: by, w: badgeW, h: badgeH,
            fontFace: 'Calibri', fontSize: 7.5, bold: true, color: style.fg,
            align: 'center', valign: 'middle', shrinkText: true,
          });
        }
      } else {
        const text = value != null ? value.toString().trim() : '';
        slide.addText(text || '—', {
          x: cx + 0.08, y: rowY, w: colW - 0.16, h: rowH,
          fontFace: 'Calibri', fontSize, color: THEME.INK,
          align: 'center', valign: 'middle', shrinkText: true,
        });
      }

      // Divisória vertical entre colunas
      if (ci > 0) {
        slide.addShape('line', {
          x: cx, y: rowY, w: 0, h: rowH,
          line: { color: 'E8ECF4', width: 0.4 },
        });
      }
    });

    slide.addShape('line', {
      x: TX, y: rowY + rowH, w: TW, h: 0,
      line: { color: 'E8ECF4', width: 0.4 },
    });
    rowY += rowH;
  });
}

export async function exportActionPlanSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const columns: Column[] = Array.isArray(data?.columns)
    ? data.columns.filter((c: any) => c && c.id).map((c: any) => ({
        id: c.id,
        title: (c.title || '').toString(),
        type: c.type === 'status' ? 'status' : 'text',
        isDefault: c.isDefault,
      }))
    : [];

  const actions: any[] = Array.isArray(data?.actions)
    ? data.actions.filter((a: any) => a && typeof a === 'object')
    : [];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (columns.length === 0 || actions.length === 0) {
    const slide = createSlide(pres, project, 'Plano de Ação', 'Define', aiAnalysis);
    slide.addText('(não preenchido)', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(actions, ROWS_PER_SLIDE);
    pages.forEach((pageActions, idx) => {
      drawActionPlanSlide(pres, project, columns, actions, pageActions, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Plano_de_Acao_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
