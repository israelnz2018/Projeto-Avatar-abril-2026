import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// Aceita toolData direto, {toolData:{...}} ou {formData:{...}}.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.formData && typeof input.formData === 'object' && input.formData.analyses) return input.formData;
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const CARDS_PER_SLIDE = 3;

function drawAnalysisSlide(
  pres: any,
  project: Project,
  pageAnalyses: any[],
  pageIdx: number,
  totalPages: number,
  aiAnalysis: string
) {
  const slideTitle = totalPages > 1
    ? `Análise Gráfica e Estatística (${pageIdx + 1}/${totalPages})`
    : 'Análise Gráfica e Estatística';
  const slide = createSlide(pres, project, slideTitle, 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  const CARD_GAP = 0.16;
  const cardH = (TH - (CARDS_PER_SLIDE - 1) * CARD_GAP) / CARDS_PER_SLIDE;

  pageAnalyses.forEach((an, i) => {
    const cy = TY + i * (cardH + CARD_GAP);

    // Moldura do card
    slide.addShape('rect', {
      x: TX, y: cy, w: TW, h: cardH,
      fill: { color: 'FFFFFF' },
      line: { color: THEME.CHIP_BD, width: 0.8 },
      rectRadius: 0.06,
    });
    slide.addShape('rect', {
      x: TX, y: cy, w: 0.08, h: cardH,
      fill: { color: THEME.NAVY }, line: { type: 'none' },
    });

    const variable = String(an?.variable || '').trim() || '(variável não definida)';
    const analysisType = String(an?.analysisType || '').trim();
    const interpretation = String(an?.interpretation || '').trim();
    const graphImage = String(an?.graphImage || '');

    const innerX = TX + 0.22;

    // Título (variável) + chip do tipo de análise
    slide.addText(variable, {
      x: innerX, y: cy + 0.10, w: TW - 0.44 - 2.40, h: 0.30,
      fontFace: 'Calibri', fontSize: 12, bold: true, color: THEME.NAVY,
      valign: 'middle', shrinkText: true,
    });
    if (analysisType) {
      const w = 2.20;
      const chipX = TX + TW - 0.16 - w;
      slide.addShape('rect', {
        x: chipX, y: cy + 0.12, w, h: 0.28,
        fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.04,
      });
      slide.addText(analysisType, {
        x: chipX, y: cy + 0.12, w, h: 0.28,
        fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle', shrinkText: true,
      });
    }

    // Área do conteúdo: gráfico (esquerda) + interpretação (direita)
    const contentY = cy + 0.50;
    const contentH = cardH - 0.58;
    const GRAPH_W = 2.10;

    // Quadro do gráfico
    const isImage = graphImage.startsWith('data:image');
    slide.addShape('rect', {
      x: innerX, y: contentY, w: GRAPH_W, h: contentH,
      fill: { color: THEME.LIGHT },
      line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });

    let imageOk = false;
    if (isImage) {
      try {
        slide.addImage({
          data: graphImage,
          x: innerX + 0.05, y: contentY + 0.05,
          w: GRAPH_W - 0.10, h: contentH - 0.10,
          sizing: { type: 'contain', w: GRAPH_W - 0.10, h: contentH - 0.10 },
        });
        imageOk = true;
      } catch {
        imageOk = false;
      }
    }
    if (!imageOk) {
      slide.addText('Gráfico gerado na aba de análise', {
        x: innerX + 0.05, y: contentY, w: GRAPH_W - 0.10, h: contentH,
        fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED, italic: true,
        align: 'center', valign: 'middle', shrinkText: true,
      });
    }

    // Interpretação
    const interpX = innerX + GRAPH_W + 0.16;
    const interpW = TX + TW - 0.22 - interpX;
    slide.addText(interpretation || '(sem interpretação)', {
      x: interpX, y: contentY, w: interpW, h: contentH,
      fontFace: 'Calibri', fontSize: 9,
      color: interpretation ? THEME.INK : THEME.MUTED,
      italic: !interpretation, valign: 'top', shrinkText: true,
    });
  });
}

export async function exportStatisticalAnalysisV2Slide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const analyses: any[] = Array.isArray(data.analyses)
    ? data.analyses.filter((a: any) => a && typeof a === 'object')
    : [];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (analyses.length === 0) {
    const slide = createSlide(pres, project, 'Análise Gráfica e Estatística', 'Define', aiAnalysis);
    slide.addText('Nenhuma análise gráfica registrada.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const pages = chunk(analyses, CARDS_PER_SLIDE);
    pages.forEach((pageAnalyses, idx) => {
      drawAnalysisSlide(pres, project, pageAnalyses, idx, pages.length, aiAnalysis);
    });
  }

  const fileName = `Analise_Estatistica_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
