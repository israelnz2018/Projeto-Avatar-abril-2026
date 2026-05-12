import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// ─────────────────────────────────────────────────────────
// Helper defensivo: aceita qualquer formato de toolData e
// retorna sempre o objeto raiz com items/columns
// ─────────────────────────────────────────────────────────
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface Column {
  id: string;
  label: string;
  width?: string;
}

interface Item {
  id: string;
  data: Record<string, string>;
}

function isPriorityCol(col: Column): boolean {
  const id = (col.id || '').toLowerCase();
  const label = (col.label || '').toLowerCase();
  return id.includes('priorid') || label.includes('priorid');
}

function isMSACol(col: Column): boolean {
  const id = (col.id || '').toLowerCase();
  const label = (col.label || '').toLowerCase();
  return id === 'msa' || label === 'msa';
}

function getPriorityChip(value: string): { bg: string; fg: string } {
  const v = (value || '').toLowerCase().trim();
  if (v.includes('alta') || v === 'alto' || v === 'high') return { bg: 'FEE2E2', fg: '991B1B' };
  if (v.includes('média') || v.includes('media') || v === 'medium') return { bg: 'FEF9C3', fg: 'CA8A04' };
  if (v.includes('baixa') || v === 'baixo' || v === 'low') return { bg: 'DBEAFE', fg: '1E3A8A' };
  return { bg: 'F3F4F6', fg: '374151' };
}

function getMSAChip(value: string): { bg: string; fg: string } {
  const v = (value || '').toLowerCase().trim();
  if (v === 'sim' || v === 'yes' || v === 's' || v === 'ok') return { bg: 'DCFCE7', fg: '16A34A' };
  if (v === 'não' || v === 'nao' || v === 'no' || v === 'n') return { bg: 'FEE2E2', fg: 'EF4444' };
  return { bg: 'F3F4F6', fg: '374151' };
}

function getColumnWeight(col: Column): number {
  const id = (col.id || '').toLowerCase();
  const label = (col.label || '').toLowerCase();
  if (id.includes('definicao') || id.includes('operational') || label.includes('definição') || label.includes('definicao')) return 2.6;
  if (id.includes('variable') || id.includes('variav') || label.includes('variável') || label.includes('variavel')) return 1.6;
  if (id.includes('method') || id.includes('metod') || label.includes('método') || label.includes('metodo')) return 1.4;
  if (id.includes('stratif') || id.includes('estratif') || label.includes('estratif')) return 1.4;
  if (id.includes('responsib') || id.includes('respons') || label.includes('respons')) return 1.4;
  if (id.includes('howmany') || id.includes('quanta') || label.includes('quanta')) return 1.2;
  if (id.includes('when') || id.includes('quando') || label.includes('quando')) return 1.2;
  if (isPriorityCol(col)) return 0.9;
  if (isMSACol(col)) return 0.7;
  return 1.2;
}

export async function exportDataCollectionPlanSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = ''
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);
  const columns: Column[] = Array.isArray(data.columns) ? data.columns.filter((c: any) => c && c.id) : [];
  const items: Item[] = Array.isArray(data.items) ? data.items.filter((i: any) => i && i.data) : [];

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'Plano de Coleta de Dados', 'Measure', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // ── BANNER ─────────────────────────────────────────────
  const BANNER_H = 0.30;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(`PLANO DE MEDIÇÃO — ${items.length} ${items.length === 1 ? 'VARIÁVEL MAPEADA' : 'VARIÁVEIS MAPEADAS'}`, {
    x: TX + 0.18, y: TY, w: TW - 4.00, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 9, bold: true, color: 'FFFFFF',
    charSpacing: 2, valign: 'middle',
  });
  slide.addText(`${columns.length} ${columns.length === 1 ? 'dimensão' : 'dimensões'} por variável`, {
    x: TX + TW - 3.60, y: TY, w: 3.42, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ── ÁREA DA TABELA + ANÁLISE ──────────────────────────
  const TABLE_Y = TY + BANNER_H + 0.10;
  const TABLE_H = TH - BANNER_H - 0.10;

  if (columns.length === 0 || items.length === 0) {
    slide.addText(items.length === 0 ? 'Nenhuma variável cadastrada no Plano de Coleta.' : 'Nenhuma coluna configurada.', {
      x: TX, y: TABLE_Y + TABLE_H / 2 - 0.15, w: TW, h: 0.30,
      fontFace: 'Calibri', fontSize: 10, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const totalWeight = columns.reduce((sum, c) => sum + getColumnWeight(c), 0);
    const colWidths = columns.map(c => (getColumnWeight(c) / totalWeight) * TW);
    const colXs: number[] = [];
    let cursor = TX;
    columns.forEach((_, i) => {
      colXs.push(cursor);
      cursor += colWidths[i];
    });

    // HEADER
    const HEADER_H = 0.30;
    slide.addShape('rect', {
      x: TX, y: TABLE_Y, w: TW, h: HEADER_H,
      fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
    });

    columns.forEach((col, i) => {
      const cx = colXs[i];
      const cw = colWidths[i];
      if (i > 0) {
        slide.addShape('line', {
          x: cx, y: TABLE_Y, w: 0, h: HEADER_H,
          line: { color: 'D1D5DB', width: 0.4 },
        });
      }
      slide.addText((col.label || '').toUpperCase(), {
        x: cx + 0.06, y: TABLE_Y, w: cw - 0.12, h: HEADER_H,
        fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY,
        valign: 'middle', shrinkText: true,
      });
    });

    // LINHAS
    const bodyY = TABLE_Y + HEADER_H;
    const bodyAvailable = TABLE_H - HEADER_H;
    const rowH = Math.min(0.50, Math.max(0.30, bodyAvailable / Math.max(items.length, 1)));
    const fontSize = rowH < 0.36 ? 6.5 : 7;

    let rowY = bodyY;
    let renderedCount = 0;

    items.forEach((item, idx) => {
      if (rowY + rowH > bodyY + bodyAvailable) return;

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
        const value = (item.data?.[col.id] || '').trim();

        if (isPriorityCol(col) && value) {
          const chip = getPriorityChip(value);
          slide.addShape('rect', {
            x: cx + 0.10, y: rowY + 0.10, w: cw - 0.20, h: rowH - 0.20,
            fill: { color: chip.bg }, line: { type: 'none' }, rectRadius: 0.03,
          });
          slide.addText(value, {
            x: cx + 0.10, y: rowY, w: cw - 0.20, h: rowH,
            fontFace: 'Calibri', fontSize: fontSize - 0.5, bold: true,
            color: chip.fg, align: 'center', valign: 'middle', shrinkText: true,
          });
        } else if (isMSACol(col) && value) {
          const chip = getMSAChip(value);
          slide.addShape('rect', {
            x: cx + 0.08, y: rowY + 0.10, w: cw - 0.16, h: rowH - 0.20,
            fill: { color: chip.bg }, line: { type: 'none' }, rectRadius: 0.03,
          });
          slide.addText(value, {
            x: cx + 0.08, y: rowY, w: cw - 0.16, h: rowH,
            fontFace: 'Calibri', fontSize: fontSize - 0.5, bold: true,
            color: chip.fg, align: 'center', valign: 'middle', shrinkText: true,
          });
        } else {
          const colId = (col.id || '').toLowerCase();
          const isHighlight = colId.includes('variable') || colId.includes('variav')
                           || colId.includes('responsib') || colId.includes('respons');
          slide.addText(value || '—', {
            x: cx + 0.06, y: rowY, w: cw - 0.12, h: rowH,
            fontFace: 'Calibri', fontSize, bold: isHighlight,
            color: value ? (isHighlight ? THEME.NAVY : THEME.INK) : THEME.MUTED,
            valign: 'middle', shrinkText: true,
          });
        }
      });

      slide.addShape('line', {
        x: TX, y: rowY + rowH, w: TW, h: 0,
        line: { color: 'E8ECF4', width: 0.4 },
      });

      rowY += rowH;
      renderedCount++;
    });

    if (renderedCount < items.length) {
      slide.addText(`+ ${items.length - renderedCount} variáveis adicionais disponíveis na ferramenta.`, {
        x: TX, y: rowY + 0.04, w: TW, h: 0.16,
        fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, italic: true,
        align: 'center',
      });
    }
  }



  const fileName = `Plano_de_Coleta_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  await pres.writeFile({ fileName });
}
