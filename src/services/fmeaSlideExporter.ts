import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface FMEARow {
  id: string;
  processStep: string;
  failureMode: string;
  failureEffect: string;
  severity: number;
  failureCause: string;
  occurrence: number;
  currentControls: string;
  detection: number;
  recommendedActions: string;
  responsible: string;
  deadline: string;
  status: 'green' | 'yellow' | 'red';
  newSeverity: number;
  newOccurrence: number;
  newDetection: number;
}

interface Thresholds {
  rpn: { green: number; yellow: number };
  severity: { green: number; yellow: number };
  criticality: { green: number; yellow: number };
}

const ROWS_PER_SLIDE = 5;
const DEFAULT_THRESHOLDS: Thresholds = {
  rpn: { green: 100, yellow: 300 },
  severity: { green: 4, yellow: 7 },
  criticality: { green: 30, yellow: 100 },
};

function calcRPN(s: number, o: number, d: number): number {
  return (Number(s) || 0) * (Number(o) || 0) * (Number(d) || 0);
}

function getRPNChipColor(rpn: number, thresholds: Thresholds): { bg: string; fg: string } {
  if (rpn <= thresholds.rpn.green) return { bg: 'DCFCE7', fg: '166534' };
  if (rpn <= thresholds.rpn.yellow) return { bg: 'FEF3C7', fg: '92400E' };
  return { bg: 'FEE2E2', fg: '991B1B' };
}

function getStatusColor(status: string): string {
  if (status === 'green') return '22C55E';
  if (status === 'yellow') return 'F59E0B';
  if (status === 'red') return 'EF4444';
  return '9CA3AF';
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function drawFmeaSlide(
  pres: any,
  project: Project,
  rows: FMEARow[],
  pageRows: FMEARow[],
  pageIdx: number,
  totalPages: number,
  thresholds: Thresholds,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `FMEA — Análise de Modos de Falha (${pageIdx + 1}/${totalPages})`
    : 'FMEA — Análise de Modos de Falha';
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
  slide.addText('ANÁLISE DE MODO E EFEITOS DE FALHA · PRIORIZAÇÃO POR RPN', {
    x: TX + 0.18, y: TY, w: TW - 4.50, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
    charSpacing: 2, valign: 'middle',
  });

  const totalRows = rows.length;
  const maxRPN = Math.max(...rows.map(r => calcRPN(r.severity, r.occurrence, r.detection)), 0);
  const maxNewRPN = Math.max(...rows.map(r => calcRPN(r.newSeverity || r.severity, r.newOccurrence || r.occurrence, r.newDetection || r.detection)), 0);
  const summary = `${totalRows} ${totalRows === 1 ? 'modo' : 'modos'} · RPN máx ${maxRPN} → Novo RPN máx ${maxNewRPN}`;
  slide.addText(summary, {
    x: TX + TW - 4.30, y: TY, w: 4.12, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ── TABELA ──
  // 14 colunas: pesos relativos
  const COL_WEIGHTS = [
    { id: 'step',     w: 0.078 },  // Etapa
    { id: 'mode',     w: 0.097 },  // Modo de Falha
    { id: 'effect',   w: 0.097 },  // Efeito
    { id: 's',        w: 0.028 },  // S
    { id: 'cause',    w: 0.097 },  // Causa
    { id: 'o',        w: 0.028 },  // O
    { id: 'control',  w: 0.090 },  // Controles
    { id: 'd',        w: 0.028 },  // D
    { id: 'rpn',      w: 0.047 },  // RPN
    { id: 'action',   w: 0.140 },  // Ação
    { id: 'resp',     w: 0.078 },  // Responsável
    { id: 'deadline', w: 0.060 },  // Prazo
    { id: 'status',   w: 0.060 },  // Status
    { id: 'newrpn',   w: 0.072 },  // Novo RPN
  ];

  const totalWeight = COL_WEIGHTS.reduce((s, c) => s + c.w, 0);
  const colWidths = COL_WEIGHTS.map(c => (c.w / totalWeight) * TW);
  const colXs: number[] = [];
  let cursor = TX;
  COL_WEIGHTS.forEach((_, i) => {
    colXs.push(cursor);
    cursor += colWidths[i];
  });

  const tblY = TY + BANNER_H + 0.10;
  const HEADER_H = 0.36;

  // HEADER
  slide.addShape('rect', {
    x: TX, y: tblY, w: TW, h: HEADER_H,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
  });

  const headers = [
    'ETAPA DO\nPROCESSO',
    'MODO DE\nFALHA',
    'EFEITO',
    'S',
    'CAUSA',
    'O',
    'CONTROLES\nATUAIS',
    'D',
    'RPN',
    'AÇÃO\nRECOMENDADA',
    'RESPON-\nSÁVEL',
    'PRAZO',
    'STATUS',
    'NOVO\nRPN',
  ];

  COL_WEIGHTS.forEach((col, i) => {
    const cx = colXs[i];
    const cw = colWidths[i];

    if (i > 0) {
      slide.addShape('line', {
        x: cx, y: tblY, w: 0, h: HEADER_H,
        line: { color: 'D1D5DB', width: 0.4 },
      });
    }

    const isCenter = ['s', 'o', 'd', 'rpn', 'status', 'newrpn'].includes(col.id);
    slide.addText(headers[i], {
      x: cx + 0.04, y: tblY, w: cw - 0.08, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 6, bold: true, color: THEME.NAVY,
      align: isCenter ? 'center' : 'left', valign: 'middle', shrinkText: true,
    });
  });

  // LINHAS
  const bodyY = tblY + HEADER_H;
  const TABLE_BOTTOM = TY + TH - 0.20;
  const availableH = TABLE_BOTTOM - bodyY - 0.20; // espaço pra legenda
  const rowH = Math.min(0.50, Math.max(0.36, availableH / Math.max(pageRows.length, 1)));
  const fontSize = rowH < 0.42 ? 6 : 6.5;

  let rowY = bodyY;
  pageRows.forEach((row, idx) => {
    if (rowY + rowH > TABLE_BOTTOM) return;

    const isZebra = idx % 2 === 0;
    if (isZebra) {
      slide.addShape('rect', {
        x: TX, y: rowY, w: TW, h: rowH,
        fill: { color: 'F8F9FC' }, line: { type: 'none' },
      });
    }

    const rpn = calcRPN(row.severity, row.occurrence, row.detection);
    const newRpn = calcRPN(
      row.newSeverity || row.severity,
      row.newOccurrence || row.occurrence,
      row.newDetection || row.detection
    );
    const rpnChip = getRPNChipColor(rpn, thresholds);
    const newRpnChip = getRPNChipColor(newRpn, thresholds);
    const statusColor = getStatusColor(row.status);

    // Coluna 0: Etapa
    slide.addText(row.processStep || '—', {
      x: colXs[0] + 0.04, y: rowY, w: colWidths[0] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, bold: true, color: THEME.NAVY,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 1: Modo de Falha
    slide.addText(row.failureMode || '—', {
      x: colXs[1] + 0.04, y: rowY, w: colWidths[1] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, bold: true, color: THEME.NAVY,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 2: Efeito
    slide.addText(row.failureEffect || '—', {
      x: colXs[2] + 0.04, y: rowY, w: colWidths[2] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, color: THEME.INK,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 3: S
    slide.addText(String(row.severity ?? '-'), {
      x: colXs[3], y: rowY, w: colWidths[3], h: rowH,
      fontFace: 'Calibri', fontSize: fontSize + 2, bold: true, color: THEME.NAVY,
      align: 'center', valign: 'middle',
    });

    // Coluna 4: Causa
    slide.addText(row.failureCause || '—', {
      x: colXs[4] + 0.04, y: rowY, w: colWidths[4] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, color: THEME.INK,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 5: O
    slide.addText(String(row.occurrence ?? '-'), {
      x: colXs[5], y: rowY, w: colWidths[5], h: rowH,
      fontFace: 'Calibri', fontSize: fontSize + 2, bold: true, color: THEME.NAVY,
      align: 'center', valign: 'middle',
    });

    // Coluna 6: Controles
    slide.addText(row.currentControls || '—', {
      x: colXs[6] + 0.04, y: rowY, w: colWidths[6] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, color: THEME.INK,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 7: D
    slide.addText(String(row.detection ?? '-'), {
      x: colXs[7], y: rowY, w: colWidths[7], h: rowH,
      fontFace: 'Calibri', fontSize: fontSize + 2, bold: true, color: THEME.NAVY,
      align: 'center', valign: 'middle',
    });

    // Coluna 8: RPN (chip colorido)
    slide.addShape('rect', {
      x: colXs[8] + 0.04, y: rowY + 0.06, w: colWidths[8] - 0.08, h: rowH - 0.12,
      fill: { color: rpnChip.bg }, line: { type: 'none' }, rectRadius: 0.04,
    });
    slide.addText(String(rpn), {
      x: colXs[8], y: rowY, w: colWidths[8], h: rowH,
      fontFace: 'Calibri', fontSize: fontSize + 1.5, bold: true, color: rpnChip.fg,
      align: 'center', valign: 'middle',
    });

    // Coluna 9: Ação
    slide.addText(row.recommendedActions || '—', {
      x: colXs[9] + 0.04, y: rowY, w: colWidths[9] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, color: THEME.INK,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 10: Responsável
    slide.addText(row.responsible || '—', {
      x: colXs[10] + 0.04, y: rowY, w: colWidths[10] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, bold: true, color: THEME.NAVY,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 11: Prazo
    slide.addText(row.deadline || '—', {
      x: colXs[11] + 0.04, y: rowY, w: colWidths[11] - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize, color: THEME.INK,
      valign: 'middle', shrinkText: true,
    });

    // Coluna 12: Status (bolinha)
    const statusCx = colXs[12] + colWidths[12] / 2;
    const statusCy = rowY + rowH / 2;
    const statusR = Math.min(0.08, rowH * 0.25);
    slide.addShape('ellipse', {
      x: statusCx - statusR, y: statusCy - statusR,
      w: statusR * 2, h: statusR * 2,
      fill: { color: statusColor }, line: { type: 'none' },
    });

    // Coluna 13: Novo RPN (chip)
    slide.addShape('rect', {
      x: colXs[13] + 0.04, y: rowY + 0.06, w: colWidths[13] - 0.08, h: rowH - 0.12,
      fill: { color: newRpnChip.bg }, line: { type: 'none' }, rectRadius: 0.04,
    });
    slide.addText(String(newRpn), {
      x: colXs[13], y: rowY, w: colWidths[13], h: rowH,
      fontFace: 'Calibri', fontSize: fontSize + 1.5, bold: true, color: newRpnChip.fg,
      align: 'center', valign: 'middle',
    });

    // Linha divisória horizontal
    slide.addShape('line', {
      x: TX, y: rowY + rowH, w: TW, h: 0,
      line: { color: 'E8ECF4', width: 0.4 },
    });

    rowY += rowH;
  });

  // ── LEGENDA ──
  const LEG_Y = TY + TH - 0.18;
  slide.addText('RPN:', {
    x: TX, y: LEG_Y, w: 0.40, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
    valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 0.40, y: LEG_Y + 0.03, w: 0.16, h: 0.10, fill: { color: 'DCFCE7' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText(`Aceitável (≤${thresholds.rpn.green})`, {
    x: TX + 0.58, y: LEG_Y, w: 1.20, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '166534', bold: true, valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 1.78, y: LEG_Y + 0.03, w: 0.16, h: 0.10, fill: { color: 'FEF3C7' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText(`Atenção (${thresholds.rpn.green + 1}-${thresholds.rpn.yellow})`, {
    x: TX + 1.96, y: LEG_Y, w: 1.30, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '92400E', bold: true, valign: 'middle',
  });
  slide.addShape('rect', { x: TX + 3.30, y: LEG_Y + 0.03, w: 0.16, h: 0.10, fill: { color: 'FEE2E2' }, line: { type: 'none' }, rectRadius: 0.02 });
  slide.addText(`Crítico (>${thresholds.rpn.yellow})`, {
    x: TX + 3.48, y: LEG_Y, w: 1.10, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '991B1B', bold: true, valign: 'middle',
  });

  slide.addText('STATUS:', {
    x: TX + 4.70, y: LEG_Y, w: 0.60, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
    valign: 'middle',
  });
  slide.addShape('ellipse', { x: TX + 5.34, y: LEG_Y + 0.03, w: 0.10, h: 0.10, fill: { color: '22C55E' }, line: { type: 'none' } });
  slide.addText('No prazo', {
    x: TX + 5.46, y: LEG_Y, w: 0.70, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '166534', bold: true, valign: 'middle',
  });
  slide.addShape('ellipse', { x: TX + 6.20, y: LEG_Y + 0.03, w: 0.10, h: 0.10, fill: { color: 'F59E0B' }, line: { type: 'none' } });
  slide.addText('Em risco', {
    x: TX + 6.32, y: LEG_Y, w: 0.70, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '92400E', bold: true, valign: 'middle',
  });
  slide.addShape('ellipse', { x: TX + 7.06, y: LEG_Y + 0.03, w: 0.10, h: 0.10, fill: { color: 'EF4444' }, line: { type: 'none' } });
  slide.addText('Atrasado', {
    x: TX + 7.18, y: LEG_Y, w: 0.70, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '991B1B', bold: true, valign: 'middle',
  });

  slide.addText('RPN = S × O × D · escala 1-10 cada', {
    x: TX + 9.50, y: LEG_Y, w: 3.20, h: 0.14,
    fontFace: 'Calibri', fontSize: 5.5, color: THEME.MUTED, italic: true,
    align: 'right', valign: 'middle',
  });
}

export async function exportFmeaSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const allRows: FMEARow[] = Array.isArray(data.rows) ? data.rows : [];
  const rows = allRows.filter(r => r && (r.processStep || r.failureMode || '').toString().trim());

  const thresholds: Thresholds = data.thresholds || DEFAULT_THRESHOLDS;

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (rows.length === 0) {
    const slide = createSlide(pres, project, 'FMEA — Análise de Modos de Falha', 'Improve', aiAnalysis);
    slide.addText('Nenhum modo de falha registrado nesta ferramenta.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(rows, ROWS_PER_SLIDE);
    pages.forEach((pageRows, idx) => {
      drawFmeaSlide(pres, project, rows, pageRows, idx, pages.length, thresholds, aiAnalysis);
    });
  }

  const fileName = `FMEA_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
