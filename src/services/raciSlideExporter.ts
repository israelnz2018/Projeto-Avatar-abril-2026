import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// O RaciTool persiste em formData/toolData ou direto — aceitar os três.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.formData && typeof input.formData === 'object') return input.formData;
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface Stakeholder { id: string; nome: string; }
interface Atividade { id: string; nome: string; raci: Record<string, string>; }

// Cores por letra RACI (mesma semântica do componente).
const RACI_STYLE: Record<string, { bg: string; fg: string }> = {
  R: { bg: 'DBEAFE', fg: '1D4ED8' }, // azul
  A: { bg: 'D1FAE5', fg: '047857' }, // verde
  C: { bg: 'FEF3C7', fg: '92400E' }, // âmbar
  I: { bg: 'EDE9FE', fg: '6D28D9' }, // violeta
};

const ROWS_PER_SLIDE = 10;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function drawRaciSlide(
  pres: any,
  project: Project,
  processoNome: string,
  stakeholders: Stakeholder[],
  allAtividades: Atividade[],
  pageAtividades: Atividade[],
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `Matriz RACI (${pageIdx + 1}/${totalPages})`
    : 'Matriz RACI';
  const slide = createSlide(pres, project, slideTitle, 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // ── BANNER (nome do processo) ──
  const BANNER_H = 0.30;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(`PROCESSO · ${(processoNome || 'Não definido').toUpperCase()}`, {
    x: TX + 0.18, y: TY, w: TW - 3.50, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
    charSpacing: 1.5, valign: 'middle', shrinkText: true,
  });
  slide.addText(`${allAtividades.length} ${allAtividades.length === 1 ? 'atividade' : 'atividades'}`, {
    x: TX + TW - 3.30, y: TY, w: 3.12, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ── GRADE: 1ª coluna = atividade (larga); demais = um stakeholder cada ──
  const tblY = TY + BANNER_H + 0.12;
  const LEGEND_H = 0.26;
  const tableBottom = TY + TH - LEGEND_H - 0.10;
  const HEADER_H = 0.50;

  const ACT_W = Math.min(4.20, TW * 0.34);
  const stakeCount = Math.max(stakeholders.length, 1);
  const stakeW = (TW - ACT_W) / stakeCount;

  // Cabeçalho
  slide.addShape('rect', {
    x: TX, y: tblY, w: TW, h: HEADER_H,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
  });
  slide.addText('ATIVIDADE', {
    x: TX + 0.10, y: tblY, w: ACT_W - 0.16, h: HEADER_H,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
    valign: 'middle',
  });
  stakeholders.forEach((s, i) => {
    const cx = TX + ACT_W + i * stakeW;
    slide.addShape('line', {
      x: cx, y: tblY, w: 0, h: HEADER_H,
      line: { color: 'D1D5DB', width: 0.4 },
    });
    slide.addText(s.nome || `Stakeholder ${i + 1}`, {
      x: cx + 0.04, y: tblY, w: stakeW - 0.08, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
      align: 'center', valign: 'middle', shrinkText: true,
    });
  });

  // Linhas
  const bodyY = tblY + HEADER_H;
  const availableH = tableBottom - bodyY;
  const rowH = Math.min(0.46, Math.max(0.30, availableH / Math.max(pageAtividades.length, 1)));
  const fontSize = rowH < 0.36 ? 8 : 9;

  let rowY = bodyY;
  pageAtividades.forEach((act, idx) => {
    if (rowY + rowH > tableBottom) return;
    if (idx % 2 === 0) {
      slide.addShape('rect', {
        x: TX, y: rowY, w: TW, h: rowH,
        fill: { color: 'F8F9FC' }, line: { type: 'none' },
      });
    }

    // nome da atividade
    slide.addText(act.nome || '—', {
      x: TX + 0.10, y: rowY, w: ACT_W - 0.16, h: rowH,
      fontFace: 'Calibri', fontSize, bold: true, color: THEME.NAVY,
      valign: 'middle', shrinkText: true,
    });

    // células RACI
    stakeholders.forEach((s, i) => {
      const cx = TX + ACT_W + i * stakeW;
      const raw = (act.raci?.[s.id] || '').toString().toUpperCase().trim();
      if (!raw) return;
      // suporta "R/A" (duplo papel)
      const letters = raw.split('/').map(l => l.trim()).filter(l => RACI_STYLE[l]);
      if (letters.length === 0) return;
      const primary = letters[0];
      const style = RACI_STYLE[primary];
      const badgeW = Math.min(0.46, stakeW - 0.18);
      const badgeH = Math.min(0.28, rowH - 0.10);
      slide.addShape('rect', {
        x: cx + (stakeW - badgeW) / 2, y: rowY + (rowH - badgeH) / 2, w: badgeW, h: badgeH,
        fill: { color: style.bg }, line: { type: 'none' }, rectRadius: 0.04,
      });
      slide.addText(letters.join('/'), {
        x: cx, y: rowY, w: stakeW, h: rowH,
        fontFace: 'Calibri', fontSize, bold: true, color: style.fg,
        align: 'center', valign: 'middle',
      });
    });

    slide.addShape('line', {
      x: TX, y: rowY + rowH, w: TW, h: 0,
      line: { color: 'E8ECF4', width: 0.4 },
    });
    rowY += rowH;
  });

  // ── LEGENDA R A C I ──
  const legY = TY + TH - LEGEND_H + 0.02;
  const legend: Array<[string, string]> = [
    ['R', 'Responsável'], ['A', 'Aprovador'], ['C', 'Consultado'], ['I', 'Informado'],
  ];
  let lx = TX;
  legend.forEach(([letter, label]) => {
    const style = RACI_STYLE[letter];
    slide.addShape('rect', {
      x: lx, y: legY, w: 0.22, h: 0.18,
      fill: { color: style.bg }, line: { type: 'none' }, rectRadius: 0.03,
    });
    slide.addText(letter, {
      x: lx, y: legY, w: 0.22, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, bold: true, color: style.fg,
      align: 'center', valign: 'middle',
    });
    slide.addText(label, {
      x: lx + 0.28, y: legY, w: 1.30, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, color: THEME.INK, valign: 'middle',
    });
    lx += 1.70;
  });
}

export async function exportRaciSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const processoNome: string = data.processoNome || '';
  const stakeholders: Stakeholder[] = Array.isArray(data.stakeholders)
    ? data.stakeholders.filter((s: any) => s && s.id)
    : [];
  const allAtividades: Atividade[] = Array.isArray(data.atividades)
    ? data.atividades.filter((a: any) => a && (a.nome || '').toString().trim())
    : [];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (allAtividades.length === 0 || stakeholders.length === 0) {
    const slide = createSlide(pres, project, 'Matriz RACI', 'Define', aiAnalysis);
    slide.addText('Nenhuma atividade/responsável registrado na Matriz RACI.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(allAtividades, ROWS_PER_SLIDE);
    pages.forEach((pageAtividades, idx) => {
      drawRaciSlide(pres, project, processoNome, stakeholders, allAtividades, pageAtividades, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Matriz_RACI_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
