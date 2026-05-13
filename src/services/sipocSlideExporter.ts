import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

export async function exportSipocSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');

  const suppliers: string[] = (toolData?.suppliers || []).filter((s: string) => s && s.trim());
  const inputs: string[]    = (toolData?.inputs    || []).filter((s: string) => s && s.trim());
  const process: string[]   = (toolData?.process   || []).filter((s: string) => s && s.trim());
  const outputs: string[]   = (toolData?.outputs   || []).filter((s: string) => s && s.trim());
  const customers: string[] = (toolData?.customers || []).filter((s: string) => s && s.trim());

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'SIPOC — Visão Macro do Processo', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // ── TABELA SIPOC — ocupa a maior parte da área disponível ────
  const MP_SECTION_H = 0.96; // macro processo: label(0.18) + gap(0.06) + blocos(0.72)
  const SIPOC_GAP    = 0.16;
  const TABLE_H = TH - MP_SECTION_H - SIPOC_GAP;
  const COL_W = (TW - 0.08) / 5;
  const COL_GAP = 0.02;

  const COLS = [
    { key: 'S', label: 'S — SUPPLIERS', items: suppliers, highlight: false },
    { key: 'I', label: 'I — INPUTS',    items: inputs,    highlight: false },
    { key: 'P', label: 'P — PROCESS',   items: process,   highlight: true  },
    { key: 'O', label: 'O — OUTPUTS',   items: outputs,   highlight: false },
    { key: 'C', label: 'C — CUSTOMERS', items: customers, highlight: false },
  ];

  const HEADER_H = 0.34;
  const BODY_H   = TABLE_H - HEADER_H;

  COLS.forEach((col, i) => {
    const cx = TX + i * (COL_W + COL_GAP);

    // Header
    slide.addShape('rect', {
      x: cx, y: TY, w: COL_W, h: HEADER_H,
      fill: { color: col.highlight ? THEME.BLUE : THEME.NAVY },
      line: { type: 'none' }, rectRadius: 0.04,
    });
    slide.addText(col.label, {
      x: cx, y: TY, w: COL_W, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 1,
    });

    // Body
    slide.addShape('rect', {
      x: cx, y: TY + HEADER_H, w: COL_W, h: BODY_H,
      fill: { color: col.highlight ? 'EAF1F8' : 'F0F2FA' },
      line: { color: col.highlight ? THEME.BLUE : THEME.CHIP_BD, width: col.highlight ? 0.8 : 0.5 },
      rectRadius: 0.04,
    });

    if (col.items.length > 0) {
      const bullets = col.items.map(item => ({
        text: item,
        options: { bullet: { code: '2022' } },
      }));
      slide.addText(bullets, {
        x: cx + 0.10, y: TY + HEADER_H + 0.10,
        w: COL_W - 0.20, h: BODY_H - 0.20,
        fontFace: 'Calibri', fontSize: 8.5,
        bold: col.highlight,
        color: THEME.NAVY,
        valign: 'top', paraSpaceAfter: 3,
        shrinkText: true,
      });
    } else {
      slide.addText('(não preenchido)', {
        x: cx + 0.10, y: TY + HEADER_H + 0.10,
        w: COL_W - 0.20, h: BODY_H - 0.20,
        fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED,
        italic: true, valign: 'top',
      });
    }
  });

  // ── MACRO PROCESSO ────────────────────────────────────
  const MP_Y = TY + TABLE_H + SIPOC_GAP;
  const MP_LABEL_H = 0.18;
  const MP_H = MP_SECTION_H - MP_LABEL_H - 0.06;

  slide.addText('MACRO PROCESSO', {
    x: TX, y: MP_Y, w: TW, h: MP_LABEL_H,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
    charSpacing: 1,
  });

  const steps = process.length > 0 ? process : ['(etapas não preenchidas)'];
  const n = steps.length;
  const ARROW_W = 0.18;
  const BLOCK_W = (TW - (n - 1) * ARROW_W) / n;

  steps.forEach((step, i) => {
    const bx = TX + i * (BLOCK_W + ARROW_W);
    const by = MP_Y + MP_LABEL_H + 0.06;

    // Bloco
    slide.addShape('rect', {
      x: bx, y: by, w: BLOCK_W, h: MP_H,
      fill: { color: 'EAF1F8' },
      line: { color: THEME.BLUE, width: 0.8 },
      rectRadius: 0.04,
    });

    // Número
    slide.addText(String(i + 1).padStart(2, '0'), {
      x: bx + 0.06, y: by + 0.04, w: 0.40, h: 0.18,
      fontFace: 'Calibri', fontSize: 6, bold: true,
      color: '4D70D6',
    });

    // Texto da etapa
    slide.addText(step, {
      x: bx + 0.08, y: by + 0.18, w: BLOCK_W - 0.16, h: MP_H - 0.24,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY,
      align: 'center', valign: 'middle', shrinkText: true,
    });

    // Seta (exceto no último bloco)
    if (i < n - 1) {
      const ax = bx + BLOCK_W;
      const ay = by + MP_H / 2;
      slide.addShape('line', {
        x: ax, y: ay, w: ARROW_W - 0.06, h: 0,
        line: { color: THEME.NAVY, width: 1.2 },
      });
      // Ponta da seta
      slide.addShape('triangle', {
        x: ax + ARROW_W - 0.14, y: ay - 0.06,
        w: 0.10, h: 0.12,
        fill: { color: THEME.NAVY }, line: { type: 'none' },
        rotate: 90,
      });
    }
  });

  const fileName = `SIPOC_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
