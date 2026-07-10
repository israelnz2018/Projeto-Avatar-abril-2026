import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// Aceita toolData direto, {toolData:{...}} ou {formData:{...}}.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.formData && typeof input.formData === 'object' && input.formData.generatedProjects) return input.formData;
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

// Lê valor com fallbacks (a IA gera nomes variados de campo).
function pick(obj: any, keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const CARDS_PER_SLIDE = 3;

function drawIdeaSlide(
  pres: any,
  project: Project,
  pageProjects: any[],
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `Ideias de Projeto de Melhoria (${pageIdx + 1}/${totalPages})`
    : 'Ideias de Projeto de Melhoria';
  const slide = createSlide(pres, project, slideTitle, 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  const CARD_GAP = 0.16;
  const cardH = (TH - (CARDS_PER_SLIDE - 1) * CARD_GAP) / CARDS_PER_SLIDE;

  pageProjects.forEach((proj, i) => {
    const cy = TY + i * (cardH + CARD_GAP);

    // Moldura do card
    slide.addShape('rect', {
      x: TX, y: cy, w: TW, h: cardH,
      fill: { color: 'FFFFFF' },
      line: { color: THEME.CHIP_BD, width: 0.8 },
      rectRadius: 0.06,
    });

    // Barra lateral navy
    slide.addShape('rect', {
      x: TX, y: cy, w: 0.08, h: cardH,
      fill: { color: THEME.NAVY }, line: { type: 'none' },
    });

    const title = pick(proj, ['title']) || '(sem título)';
    const nivel = pick(proj, ['nivel_projeto', 'belt_level', 'beltLevel']);
    const priority = (proj && proj.priority_score !== undefined && proj.priority_score !== null)
      ? String(proj.priority_score)
      : '';

    const innerX = TX + 0.22;
    const innerW = TW - 0.44;

    // Título (deixa espaço à direita para os chips)
    slide.addText(title, {
      x: innerX, y: cy + 0.10, w: innerW - 3.60, h: 0.34,
      fontFace: 'Calibri', fontSize: 12, bold: true, color: THEME.NAVY,
      valign: 'middle', shrinkText: true,
    });

    // Chips (direita): nível + priority_score
    let chipX = TX + TW - 0.16;
    if (priority) {
      const w = 1.30;
      chipX -= w;
      slide.addShape('rect', {
        x: chipX, y: cy + 0.12, w, h: 0.28,
        fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.04,
      });
      slide.addText(`Prioridade ${priority}`, {
        x: chipX, y: cy + 0.12, w, h: 0.28,
        fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle',
      });
      chipX -= 0.10;
    }
    if (nivel) {
      const w = 2.10;
      chipX -= w;
      slide.addShape('rect', {
        x: chipX, y: cy + 0.12, w, h: 0.28,
        fill: { color: THEME.CHIP_BG },
        line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
      });
      slide.addText(nivel, {
        x: chipX, y: cy + 0.12, w, h: 0.28,
        fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY,
        align: 'center', valign: 'middle', shrinkText: true,
      });
    }

    // Linhas rótulo → valor
    const problema = pick(proj, ['what', 'problem']);
    const impacto = pick(proj, ['howMuch', 'financial_impact']);
    const justificativa = pick(proj, ['why', 'justification']);
    const indicador = pick(proj, ['y_indicator']);

    const rows: Array<[string, string]> = [];
    if (problema) rows.push(['Problema', problema]);
    if (impacto) rows.push(['Impacto', impacto]);
    if (justificativa) rows.push(['Justificativa', justificativa]);
    if (indicador) rows.push(['Indicador', indicador]);

    const rowsY = cy + 0.50;
    const rowsH = cardH - 0.58;
    const rowCount = Math.max(rows.length, 1);
    const rowH = rowsH / rowCount;
    const LABEL_W = 1.30;

    if (rows.length === 0) {
      slide.addText('(não preenchido)', {
        x: innerX, y: rowsY, w: innerW, h: rowH,
        fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
        valign: 'middle',
      });
    } else {
      rows.forEach(([label, value], r) => {
        const ry = rowsY + r * rowH;
        slide.addText(label.toUpperCase(), {
          x: innerX, y: ry, w: LABEL_W, h: rowH,
          fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.BLUE,
          charSpacing: 1, valign: 'middle',
        });
        slide.addText(value, {
          x: innerX + LABEL_W + 0.08, y: ry, w: innerW - LABEL_W - 0.08, h: rowH,
          fontFace: 'Calibri', fontSize: 9, color: THEME.INK,
          valign: 'middle', shrinkText: true,
        });
      });
    }
  });
}

export async function exportImprovementIdeaSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  let generatedProjects: any[] = Array.isArray(data.generatedProjects)
    ? data.generatedProjects.filter((p: any) => p && String(p.title || '').trim())
    : [];

  // Ordena por priority_score desc quando existir.
  generatedProjects = [...generatedProjects].sort((a, b) => {
    const pa = typeof a?.priority_score === 'number' ? a.priority_score : -Infinity;
    const pb = typeof b?.priority_score === 'number' ? b.priority_score : -Infinity;
    return pb - pa;
  });

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (generatedProjects.length === 0) {
    const slide = createSlide(pres, project, 'Ideias de Projeto de Melhoria', 'Define', aiAnalysis);
    slide.addText('Nenhuma ideia de projeto gerada.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(generatedProjects, CARDS_PER_SLIDE);
    pages.forEach((pageProjects, idx) => {
      drawIdeaSlide(pres, project, pageProjects, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Ideias_Projeto_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
