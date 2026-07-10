import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// Aceita toolData direto ou {toolData:{...}}.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface Responsibility { id?: string; role?: string; responsibility?: string; }
interface ProcessStep { id?: string; description?: string; }
interface ControlPoint { id?: string; step?: string; criteria?: string; }

function drawSectionHeader(
  slide: any,
  label: string,
  x: number,
  y: number,
  w: number
): number {
  const H = 0.18;
  slide.addText(label.toUpperCase(), {
    x, y, w, h: H,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
    charSpacing: 1, valign: 'middle',
  });
  return y + H + 0.03;
}

export async function exportSopSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const header = (data.header && typeof data.header === 'object') ? data.header : {};
  const objective: string = (data.objective || '').toString().trim();
  const scope: string = (data.scope || '').toString().trim();
  const responsibilities: Responsibility[] = Array.isArray(data.responsibilities)
    ? data.responsibilities.filter((r: any) => r && ((r.role || '').toString().trim() || (r.responsibility || '').toString().trim()))
    : [];
  const processSteps: ProcessStep[] = Array.isArray(data.processSteps)
    ? data.processSteps.filter((s: any) => s && (s.description || '').toString().trim())
    : [];
  const controlPoints: ControlPoint[] = Array.isArray(data.controlPoints)
    ? data.controlPoints.filter((c: any) => c && ((c.step || '').toString().trim() || (c.criteria || '').toString().trim()))
    : [];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const slide = createSlide(pres, project, 'POP — Procedimento Operacional Padrão', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  const isEmpty =
    !objective && !scope &&
    responsibilities.length === 0 &&
    processSteps.length === 0 &&
    controlPoints.length === 0 &&
    !(header.title || '').toString().trim();

  if (isEmpty) {
    slide.addText('(não preenchido)', {
      x: TX, y: TY + TH / 2 - 0.20, w: TW, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
    const fileName = `POP_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
    if (!options.pres) await pres.writeFile({ fileName });
    return;
  }

  // ── BANNER (header) ──
  const BANNER_H = 0.44;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  const bTitle = (header.title || 'Procedimento sem título').toString();
  slide.addText(bTitle.toUpperCase(), {
    x: TX + 0.18, y: TY + 0.04, w: TW - 3.60, h: BANNER_H - 0.08,
    fontFace: 'Calibri', fontSize: 11, bold: true, color: 'FFFFFF',
    valign: 'middle', shrinkText: true,
  });
  const metaParts: string[] = [];
  if ((header.code || '').toString().trim()) metaParts.push(`Cód: ${header.code}`);
  if ((header.version || '').toString().trim()) metaParts.push(`Rev: ${header.version}`);
  if ((header.department || '').toString().trim()) metaParts.push(`${header.department}`);
  slide.addText(metaParts.join('   ·   ') || '—', {
    x: TX + TW - 3.42, y: TY + 0.04, w: 3.24, h: BANNER_H - 0.08,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle', shrinkText: true,
  });

  // ── DUAS COLUNAS ──
  const bodyY = TY + BANNER_H + 0.14;
  const bodyH = TH - BANNER_H - 0.14;
  const COL_GAP = 0.24;
  const COL_W = (TW - COL_GAP) / 2;
  const LX = TX;
  const RX = TX + COL_W + COL_GAP;

  // ─── COLUNA ESQUERDA ───
  let ly = bodyY;

  // OBJETIVO
  if (objective) {
    ly = drawSectionHeader(slide, 'Objetivo', LX, ly, COL_W);
    const oh = 0.60;
    slide.addShape('rect', {
      x: LX, y: ly, w: COL_W, h: oh,
      fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });
    slide.addText(objective, {
      x: LX + 0.10, y: ly + 0.06, w: COL_W - 0.20, h: oh - 0.12,
      fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK, valign: 'top', shrinkText: true,
    });
    ly += oh + 0.14;
  }

  // ESCOPO
  if (scope) {
    ly = drawSectionHeader(slide, 'Escopo', LX, ly, COL_W);
    const sh = 0.60;
    slide.addShape('rect', {
      x: LX, y: ly, w: COL_W, h: sh,
      fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });
    slide.addText(scope, {
      x: LX + 0.10, y: ly + 0.06, w: COL_W - 0.20, h: sh - 0.12,
      fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK, valign: 'top', shrinkText: true,
    });
    ly += sh + 0.14;
  }

  // RESPONSABILIDADES
  if (responsibilities.length > 0) {
    ly = drawSectionHeader(slide, 'Responsabilidades', LX, ly, COL_W);
    const rh = Math.max(0.30, bodyY + bodyH - ly);
    slide.addShape('rect', {
      x: LX, y: ly, w: COL_W, h: rh,
      fill: { color: 'EAF1F8' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });
    const rows = responsibilities.map((r) => ([
      { text: `${(r.role || '—').toString()}: `, options: { bold: true, color: THEME.NAVY } },
      { text: (r.responsibility || '—').toString(), options: { bold: false, color: THEME.INK } },
    ]));
    const flat: any[] = [];
    rows.forEach((row, i) => {
      row.forEach((seg, j) => {
        flat.push({
          text: seg.text,
          options: {
            ...seg.options,
            ...(j === 0 ? { bullet: { code: '2022' } } : {}),
            ...(j === row.length - 1 && i < rows.length - 1 ? { breakLine: true } : {}),
          },
        });
      });
    });
    slide.addText(flat, {
      x: LX + 0.12, y: ly + 0.08, w: COL_W - 0.22, h: rh - 0.16,
      fontFace: 'Calibri', fontSize: 8, valign: 'top', paraSpaceAfter: 2, shrinkText: true,
    });
  }

  // ─── COLUNA DIREITA ───
  let ry = bodyY;

  // ETAPAS DO PROCESSO
  if (processSteps.length > 0) {
    ry = drawSectionHeader(slide, 'Etapas do Processo', RX, ry, COL_W);
    // altura proporcional: se houver control points, dividir espaço
    const remaining = bodyY + bodyH - ry;
    const eh = controlPoints.length > 0 ? remaining * 0.58 : remaining;
    slide.addShape('rect', {
      x: RX, y: ry, w: COL_W, h: eh,
      fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });
    const steps = processSteps.map((s, i) => ({
      text: `${i + 1}. ${(s.description || '—').toString()}`,
      options: { breakLine: true },
    }));
    slide.addText(steps, {
      x: RX + 0.12, y: ry + 0.08, w: COL_W - 0.22, h: eh - 0.16,
      fontFace: 'Calibri', fontSize: 8, color: THEME.INK, valign: 'top', paraSpaceAfter: 2, shrinkText: true,
    });
    ry += eh + 0.14;
  }

  // PONTOS DE CONTROLE
  if (controlPoints.length > 0) {
    ry = drawSectionHeader(slide, 'Pontos de Controle', RX, ry, COL_W);
    const ch = Math.max(0.30, bodyY + bodyH - ry);
    slide.addShape('rect', {
      x: RX, y: ry, w: COL_W, h: ch,
      fill: { color: 'EAF1F8' }, line: { color: THEME.BLUE, width: 0.8 }, rectRadius: 0.04,
    });
    const cps: any[] = [];
    controlPoints.forEach((c, i) => {
      cps.push({
        text: `${(c.step || '—').toString()}: `,
        options: { bold: true, color: THEME.NAVY, bullet: { code: '2022' } },
      });
      cps.push({
        text: (c.criteria || '—').toString(),
        options: { bold: false, color: THEME.INK, ...(i < controlPoints.length - 1 ? { breakLine: true } : {}) },
      });
    });
    slide.addText(cps, {
      x: RX + 0.12, y: ry + 0.08, w: COL_W - 0.22, h: ch - 0.16,
      fontFace: 'Calibri', fontSize: 8, valign: 'top', paraSpaceAfter: 2, shrinkText: true,
    });
  }

  const fileName = `POP_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
