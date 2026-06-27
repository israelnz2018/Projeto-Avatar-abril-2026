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
  isScore: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'description', label: 'Problema / Oportunidade', isScore: false },
  { id: 'gravidade', label: 'Gravidade', isScore: true },
  { id: 'urgencia', label: 'Urgência', isScore: true },
  { id: 'tendencia', label: 'Tendência', isScore: true },
  { id: 'resultado', label: 'Resultado (G x U x T)', isScore: false },
];

const ROWS_PER_SLIDE = 8;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Resultado = produto das colunas de score (1/3/5). Espelha getRowTotal do componente.
function rowTotal(row: any, scoreCols: Column[]): number {
  return scoreCols.reduce((prod, c) => prod * (Number(row[c.id]) || 1), 1);
}

function drawGutSlide(
  pres: any,
  project: Project,
  rows: any[],
  pageRows: any[],
  columns: Column[],
  scoreCols: Column[],
  maxScore: number,
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `Matriz de Priorização GUT (${pageIdx + 1}/${totalPages})`
    : 'Matriz de Priorização GUT';
  const slide = createSlide(pres, project, slideTitle, 'Define', aiAnalysis);

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
  slide.addText('PRIORIZAÇÃO · GRAVIDADE × URGÊNCIA × TENDÊNCIA', {
    x: TX + 0.18, y: TY, w: TW - 3.50, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
    charSpacing: 1.5, valign: 'middle',
  });
  slide.addText(`${rows.length} ${rows.length === 1 ? 'item priorizado' : 'itens priorizados'}`, {
    x: TX + TW - 3.30, y: TY, w: 3.12, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ── LARGURAS DE COLUNA ──
  // Descrição larga; colunas de score estreitas; resultado médio.
  const weightOf = (c: Column) => {
    if (c.id === 'description') return 3.4;
    if (c.id === 'resultado') return 1.3;
    return 1.0; // colunas de score
  };
  const totalWeight = columns.reduce((s, c) => s + weightOf(c), 0);
  const colWidths = columns.map(c => (weightOf(c) / totalWeight) * TW);
  const colXs: number[] = [];
  let cursor = TX;
  columns.forEach((_, i) => { colXs.push(cursor); cursor += colWidths[i]; });

  // ── CABEÇALHO DA TABELA ──
  const tblY = TY + BANNER_H + 0.12;
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
    const isFirst = col.id === 'description';
    slide.addText((col.label || '').toUpperCase(), {
      x: cx + 0.06, y: tblY, w: cw - 0.12, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 7, bold: true,
      color: col.id === 'resultado' ? THEME.BLUE : THEME.NAVY,
      align: isFirst ? 'left' : 'center', valign: 'middle', shrinkText: true,
    });
  });

  // ── LINHAS ──
  const bodyY = tblY + HEADER_H;
  const TABLE_BOTTOM = TY + TH - 0.04;
  const availableH = TABLE_BOTTOM - bodyY;
  const rowH = Math.min(0.50, Math.max(0.34, availableH / Math.max(pageRows.length, 1)));
  const fontSize = rowH < 0.40 ? 8 : 9;

  let rowY = bodyY;
  pageRows.forEach((row, idx) => {
    if (rowY + rowH > TABLE_BOTTOM) return;
    const total = rowTotal(row, scoreCols);
    const isWinner = total === maxScore && maxScore > 0;

    // Fundo da linha: vencedor verde-claro, demais zebra
    if (isWinner) {
      slide.addShape('rect', {
        x: TX, y: rowY, w: TW, h: rowH,
        fill: { color: 'DCFCE7' }, line: { type: 'none' },
      });
      // Barra verde à esquerda (destaque do vencedor)
      slide.addShape('rect', {
        x: TX, y: rowY, w: 0.06, h: rowH,
        fill: { color: '16A34A' }, line: { type: 'none' },
      });
    } else if (idx % 2 === 0) {
      slide.addShape('rect', {
        x: TX, y: rowY, w: TW, h: rowH,
        fill: { color: 'F8F9FC' }, line: { type: 'none' },
      });
    }

    columns.forEach((col, i) => {
      const cx = colXs[i];
      const cw = colWidths[i];

      if (col.id === 'description') {
        slide.addText(row.description || '—', {
          x: cx + 0.08, y: rowY, w: cw - 0.16, h: rowH,
          fontFace: 'Calibri', fontSize, bold: true,
          color: isWinner ? '166534' : THEME.NAVY,
          valign: 'middle', shrinkText: true,
        });
      } else if (col.id === 'resultado') {
        slide.addText(String(total), {
          x: cx, y: rowY, w: cw, h: rowH,
          fontFace: 'Calibri', fontSize: fontSize + 3, bold: true,
          color: isWinner ? '16A34A' : '6D28D9',
          align: 'center', valign: 'middle',
        });
      } else {
        // Coluna de score: mostra a nota como pílula colorida (1=baixo, 3=médio, 5=alto)
        const val = Number(row[col.id]) || 0;
        if (val > 0) {
          const chip = val >= 5
            ? { bg: 'FEE2E2', fg: '991B1B' }
            : val >= 3
              ? { bg: 'FEF3C7', fg: '92400E' }
              : { bg: 'EAF1F8', fg: THEME.NAVY };
          const pillW = Math.min(0.46, cw - 0.20);
          const pillH = Math.min(0.26, rowH - 0.12);
          slide.addShape('rect', {
            x: cx + (cw - pillW) / 2, y: rowY + (rowH - pillH) / 2, w: pillW, h: pillH,
            fill: { color: chip.bg }, line: { type: 'none' }, rectRadius: pillH / 2,
          });
          slide.addText(String(val), {
            x: cx, y: rowY, w: cw, h: rowH,
            fontFace: 'Calibri', fontSize, bold: true, color: chip.fg,
            align: 'center', valign: 'middle',
          });
        }
      }
    });

    slide.addShape('line', {
      x: TX, y: rowY + rowH, w: TW, h: 0,
      line: { color: 'E8ECF4', width: 0.4 },
    });
    rowY += rowH;
  });
}

export async function exportGutSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const allRows: any[] = Array.isArray(data.opportunities) ? data.opportunities : [];
  const rows = allRows.filter(r => r && (r.description || '').toString().trim());

  const columns: Column[] = Array.isArray(data.columns) && data.columns.length > 0
    ? data.columns.filter((c: Column) => c && c.id)
    : DEFAULT_COLUMNS;
  const scoreCols = columns.filter(c => c.isScore);

  // Ordena por resultado decrescente (prioridade) e calcula o máximo.
  const sorted = [...rows].sort((a, b) => rowTotal(b, scoreCols) - rowTotal(a, scoreCols));
  const maxScore = sorted.length > 0 ? rowTotal(sorted[0], scoreCols) : 0;

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (sorted.length === 0) {
    const slide = createSlide(pres, project, 'Matriz de Priorização GUT', 'Define', aiAnalysis);
    slide.addText('Nenhum item registrado na Matriz GUT.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(sorted, ROWS_PER_SLIDE);
    pages.forEach((pageRows, idx) => {
      drawGutSlide(pres, project, sorted, pageRows, columns, scoreCols, maxScore, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Matriz_GUT_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
