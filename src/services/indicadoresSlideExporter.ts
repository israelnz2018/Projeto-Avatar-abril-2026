import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// Aceita toolData direto, {toolData:{...}} ou {formData:{...}}.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.formData && typeof input.formData === 'object') return input.formData;
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

type Nivel = 'estrategico' | 'tatico' | 'operacional';

interface Trio {
  id: string;
  tema: string;
  estrategico: string;
  tatico: string;
  operacional: string;
  meuNivel: Nivel | null;
}

const ROWS_PER_SLIDE = 8;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function drawIndicadoresSlide(
  pres: any,
  project: Project,
  pageTrios: Trio[],
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `Indicadores por Nível (${pageIdx + 1}/${totalPages})`
    : 'Indicadores por Nível';
  const slide = createSlide(pres, project, slideTitle, 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // Colunas: TEMA | ESTRATÉGICO | TÁTICO | OPERACIONAL
  const TEMA_W = Math.min(2.80, TW * 0.22);
  const NIVEL_W = (TW - TEMA_W) / 3;

  const NIVEIS: Array<{ key: Nivel; label: string }> = [
    { key: 'estrategico', label: 'ESTRATÉGICO' },
    { key: 'tatico', label: 'TÁTICO' },
    { key: 'operacional', label: 'OPERACIONAL' },
  ];

  const HEADER_H = 0.36;

  // ── Cabeçalho NAVY ──
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: HEADER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.03,
  });
  slide.addText('TEMA', {
    x: TX + 0.12, y: TY, w: TEMA_W - 0.16, h: HEADER_H,
    fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
    valign: 'middle', charSpacing: 1,
  });
  NIVEIS.forEach((niv, i) => {
    const cx = TX + TEMA_W + i * NIVEL_W;
    slide.addShape('line', {
      x: cx, y: TY, w: 0, h: HEADER_H,
      line: { color: '4D70D6', width: 0.4 },
    });
    slide.addText(niv.label, {
      x: cx, y: TY, w: NIVEL_W, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 1,
    });
  });

  // ── Linhas ──
  const bodyY = TY + HEADER_H;
  const availH = TH - HEADER_H;
  const rowH = Math.min(0.92, Math.max(0.44, availH / Math.max(pageTrios.length, 1)));

  let rowY = bodyY;
  pageTrios.forEach((trio, idx) => {
    if (rowY + rowH > TY + TH + 0.01) return;

    // Zebra
    if (idx % 2 === 1) {
      slide.addShape('rect', {
        x: TX, y: rowY, w: TW, h: rowH,
        fill: { color: 'F8F9FC' }, line: { type: 'none' },
      });
    }

    // Tema
    slide.addText(trio.tema || '—', {
      x: TX + 0.12, y: rowY, w: TEMA_W - 0.18, h: rowH,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY,
      valign: 'middle', shrinkText: true,
    });

    NIVEIS.forEach((niv, i) => {
      const cx = TX + TEMA_W + i * NIVEL_W;
      const isMeu = trio.meuNivel === niv.key;
      const valor = (trio[niv.key] || '').toString();

      if (isMeu) {
        // Destaque: fundo EAF1F8 + borda BLUE
        slide.addShape('rect', {
          x: cx + 0.04, y: rowY + 0.04, w: NIVEL_W - 0.08, h: rowH - 0.08,
          fill: { color: THEME.CHIP_BG },
          line: { color: THEME.BLUE, width: 1.0 },
          rectRadius: 0.04,
        });
        // Rótulo "MEU NÍVEL"
        slide.addText('MEU NÍVEL', {
          x: cx + 0.08, y: rowY + 0.06, w: NIVEL_W - 0.16, h: 0.14,
          fontFace: 'Calibri', fontSize: 5.5, bold: true, color: THEME.BLUE,
          align: 'center', valign: 'middle', charSpacing: 1,
        });
        slide.addText(valor || '—', {
          x: cx + 0.10, y: rowY + 0.20, w: NIVEL_W - 0.20, h: rowH - 0.26,
          fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
          align: 'center', valign: 'middle', shrinkText: true,
        });
      } else {
        slide.addText(valor || '—', {
          x: cx + 0.10, y: rowY, w: NIVEL_W - 0.20, h: rowH,
          fontFace: 'Calibri', fontSize: 7.5, color: THEME.INK,
          align: 'center', valign: 'middle', shrinkText: true,
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

export async function exportIndicadoresSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const trios: Trio[] = Array.isArray(data.trios)
    ? [...(data.trios || [])].filter(
        (t: any) => t && typeof t === 'object' &&
          ((t.tema || '').toString().trim() ||
           (t.estrategico || '').toString().trim() ||
           (t.tatico || '').toString().trim() ||
           (t.operacional || '').toString().trim())
      )
    : [];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (trios.length === 0) {
    const slide = createSlide(pres, project, 'Indicadores por Nível', 'Define', aiAnalysis);
    slide.addText('(não preenchido)', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 12, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(trios, ROWS_PER_SLIDE);
    pages.forEach((pageTrios, idx) => {
      drawIndicadoresSlide(pres, project, pageTrios, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Indicadores_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
