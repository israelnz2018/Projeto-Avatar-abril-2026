import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';
import { exportStatisticalAnalysisV2Slide } from './statisticalAnalysisSlideExporterV2';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface AnaliseSalva {
  id: string;
  tool: string;
  toolParams: Record<string, any>;
  selectedSheet: string;
  analise?: string;
  grafico_base64?: string;
  grafico_isolado_base64?: string | string[];
  graficoPptBase64?: string;
  interpretacao?: string;
  qa: { question: string; answer: string }[];
  timestamp: number;
}

function ensureBase64Prefix(b64: string): string {
  if (!b64) return '';
  if (b64.startsWith('data:image')) return b64;
  return `data:image/png;base64,${b64}`;
}

function getLegacyIsolatedGraphics(item: AnaliseSalva): string[] {
  const raw = item.grafico_isolado_base64;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter(g => typeof g === 'string' && g.length > 50);
}

/**
 * O gráfico Plotly capturado na tela é a fonte principal. Os campos antigos
 * continuam como fallback para projetos salvos antes desta migração.
 */
function getPreferredGraphics(item: AnaliseSalva): string[] {
  if (item.graficoPptBase64 && item.graficoPptBase64.length > 50) {
    return [item.graficoPptBase64];
  }
  // Compatibilidade: análises textuais antigas usavam grafico_base64 no quadro
  // ao lado do texto, mesmo quando também existia uma imagem isolada.
  if (item.analise?.trim() && item.grafico_base64 && item.grafico_base64.length > 50) {
    return [item.grafico_base64];
  }
  const isolated = getLegacyIsolatedGraphics(item);
  if (isolated.length > 0) return isolated;
  if (item.grafico_base64 && item.grafico_base64.length > 50) return [item.grafico_base64];
  return [];
}

// Classifica cada análise pelo conteúdo
type ItemKind = 'text_with_chart' | 'text_only' | 'graphics_only' | 'skip';

function classifyItem(item: AnaliseSalva): ItemKind {
  const hasText = !!(item.analise && item.analise.trim());
  const graphics = getPreferredGraphics(item);

  if (hasText && graphics.length > 0) return 'text_with_chart';
  if (hasText && graphics.length === 0) return 'text_only';
  if (!hasText && graphics.length > 0) return 'graphics_only';
  // sem texto e sem gráfico (ex: só Q&A) -> ignorar
  return 'skip';
}

// Limpa marcadores e símbolos para PowerPoint (que não suporta HTML)
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '');
}

function drawHeader(slide: any, banner: string, summary: string) {
  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const BANNER_H = 0.30;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(banner, {
    x: TX + 0.18, y: TY, w: TW - 3.50, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
    charSpacing: 1.5, valign: 'middle', shrinkText: true,
  });
  if (summary) {
    slide.addText(summary, {
      x: TX + TW - 3.30, y: TY, w: 3.12, h: BANNER_H,
      fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
      align: 'right', valign: 'middle',
    });
  }
}

// Cenário 1: texto + gráfico (esquerda + direita)
function drawTextWithChart(pres: any, project: Project, item: AnaliseSalva, idx: number, total: number, aiAnalysis: string) {
  const slide = createSlide(pres, project, `Análise — ${item.tool || 'Estatística'}`, 'Analyze', aiAnalysis);
  drawHeader(slide, `${(item.tool || 'ANÁLISE').toUpperCase()} · COM GRÁFICO`, `Análise ${idx + 1} de ${total}`);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;
  const BANNER_H = 0.30;
  const MAIN_Y = TY + BANNER_H + 0.12;
  const MAIN_H = TH - BANNER_H - 0.12;
  const LEFT_W = TW * 0.48;
  const RIGHT_X = TX + LEFT_W + 0.20;
  const RIGHT_W = TW - LEFT_W - 0.20;

  // Esquerda - texto
  slide.addShape('rect', {
    x: TX, y: MAIN_Y, w: LEFT_W, h: MAIN_H,
    fill: { color: 'F8F9FC' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.06,
  });
  slide.addText('ANÁLISE ESTATÍSTICA', {
    x: TX + 0.16, y: MAIN_Y + 0.10, w: LEFT_W - 0.32, h: 0.20,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY, charSpacing: 2,
  });
  slide.addText(cleanText(item.analise || ''), {
    x: TX + 0.16, y: MAIN_Y + 0.34, w: LEFT_W - 0.32, h: MAIN_H - 0.44,
    fontFace: 'Calibri', fontSize: 9, color: THEME.NAVY,
    valign: 'top', shrinkText: true,
  });

  // Direita - gráfico
  slide.addShape('rect', {
    x: RIGHT_X, y: MAIN_Y, w: RIGHT_W, h: MAIN_H,
    fill: { color: 'FFFFFF' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.06,
  });
  slide.addText('GRÁFICO', {
    x: RIGHT_X + 0.16, y: MAIN_Y + 0.10, w: RIGHT_W - 0.32, h: 0.20,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY, charSpacing: 2,
  });
  try {
    slide.addImage({
      data: ensureBase64Prefix(getPreferredGraphics(item)[0] || ''),
      x: RIGHT_X + 0.20, y: MAIN_Y + 0.34,
      w: RIGHT_W - 0.40, h: MAIN_H - 0.44,
      sizing: { type: 'contain', w: RIGHT_W - 0.40, h: MAIN_H - 0.44 },
    });
  } catch (e) {
    slide.addText('(erro ao renderizar gráfico)', {
      x: RIGHT_X + 0.20, y: MAIN_Y + 0.34, w: RIGHT_W - 0.40, h: MAIN_H - 0.44,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  }
}

// Cenário 2: 2 análises só-texto, lado a lado
function drawTwoTexts(pres: any, project: Project, itemA: AnaliseSalva, itemB: AnaliseSalva, idx: number, total: number, aiAnalysis: string) {
  const slide = createSlide(pres, project, 'Análises Estatísticas', 'Analyze', aiAnalysis);
  drawHeader(slide, 'ANÁLISES ESTATÍSTICAS', `Análises ${idx + 1}-${idx + 2} de ${total}`);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;
  const BANNER_H = 0.30;
  const MAIN_Y = TY + BANNER_H + 0.12;
  const MAIN_H = TH - BANNER_H - 0.12;
  const HALF_W = (TW - 0.20) / 2;

  [
    { item: itemA, x: TX },
    { item: itemB, x: TX + HALF_W + 0.20 },
  ].forEach(({ item, x }) => {
    slide.addShape('rect', {
      x, y: MAIN_Y, w: HALF_W, h: MAIN_H,
      fill: { color: 'F8F9FC' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.06,
    });
    slide.addText((item.tool || 'ANÁLISE').toUpperCase(), {
      x: x + 0.16, y: MAIN_Y + 0.10, w: HALF_W - 0.32, h: 0.20,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY, charSpacing: 2,
      shrinkText: true,
    });
    slide.addText(cleanText(item.analise || ''), {
      x: x + 0.16, y: MAIN_Y + 0.34, w: HALF_W - 0.32, h: MAIN_H - 0.44,
      fontFace: 'Calibri', fontSize: 9, color: THEME.NAVY,
      valign: 'top', shrinkText: true,
    });
  });
}

// Cenário 3a: 1 análise só-texto, ocupa todo o slide
function drawSingleText(pres: any, project: Project, item: AnaliseSalva, idx: number, total: number, aiAnalysis: string) {
  const slide = createSlide(pres, project, `Análise — ${item.tool || 'Estatística'}`, 'Analyze', aiAnalysis);
  drawHeader(slide, `${(item.tool || 'ANÁLISE').toUpperCase()}`, `Análise ${idx + 1} de ${total}`);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;
  const BANNER_H = 0.30;
  const MAIN_Y = TY + BANNER_H + 0.12;
  const MAIN_H = TH - BANNER_H - 0.12;

  slide.addShape('rect', {
    x: TX, y: MAIN_Y, w: TW, h: MAIN_H,
    fill: { color: 'F8F9FC' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.06,
  });
  slide.addText('ANÁLISE ESTATÍSTICA', {
    x: TX + 0.18, y: MAIN_Y + 0.10, w: TW - 0.36, h: 0.20,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY, charSpacing: 2,
  });
  slide.addText(cleanText(item.analise || ''), {
    x: TX + 0.18, y: MAIN_Y + 0.34, w: TW - 0.36, h: MAIN_H - 0.44,
    fontFace: 'Calibri', fontSize: 10, color: THEME.NAVY,
    valign: 'top', shrinkText: true,
  });
}

// Cenário 4: gráficos isolados (1 = central, 2 = lado a lado, 3+ = pagina)
function drawGraphicsOnly(pres: any, project: Project, item: AnaliseSalva, idx: number, total: number, aiAnalysis: string) {
  const graphics = getPreferredGraphics(item);
  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;
  const BANNER_H = 0.30;
  const MAIN_Y = TY + BANNER_H + 0.12;
  const MAIN_H = TH - BANNER_H - 0.12;

  // Pagina: até 2 por slide
  const PER_PAGE = 2;
  for (let pageStart = 0; pageStart < graphics.length; pageStart += PER_PAGE) {
    const pageGraphics = graphics.slice(pageStart, pageStart + PER_PAGE);
    const pageNum = Math.floor(pageStart / PER_PAGE) + 1;
    const totalPages = Math.ceil(graphics.length / PER_PAGE);
    const titleSuffix = totalPages > 1 ? ` (${pageNum}/${totalPages})` : '';

    const slide = createSlide(pres, project, `Análise — ${item.tool || 'Gráficos'}${titleSuffix}`, 'Analyze', aiAnalysis);
    drawHeader(slide, `${(item.tool || 'GRÁFICOS').toUpperCase()}`, `Análise ${idx + 1} de ${total}`);

    if (pageGraphics.length === 1) {
      // Gráfico central
      const W = TW * 0.80;
      const H = MAIN_H;
      const X = TX + (TW - W) / 2;
      slide.addShape('rect', {
        x: X, y: MAIN_Y, w: W, h: H,
        fill: { color: 'FFFFFF' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.06,
      });
      try {
        slide.addImage({
          data: ensureBase64Prefix(pageGraphics[0]),
          x: X + 0.20, y: MAIN_Y + 0.20,
          w: W - 0.40, h: H - 0.40,
          sizing: { type: 'contain', w: W - 0.40, h: H - 0.40 },
        });
      } catch (e) {
        slide.addText('(erro ao renderizar gráfico)', {
          x: X, y: MAIN_Y, w: W, h: H,
          fontFace: 'Calibri', fontSize: 10, color: THEME.MUTED, italic: true,
          align: 'center', valign: 'middle',
        });
      }
    } else {
      // 2 gráficos lado a lado
      const HALF_W = (TW - 0.20) / 2;
      pageGraphics.forEach((g, i) => {
        const x = TX + i * (HALF_W + 0.20);
        slide.addShape('rect', {
          x, y: MAIN_Y, w: HALF_W, h: MAIN_H,
          fill: { color: 'FFFFFF' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.06,
        });
        try {
          slide.addImage({
            data: ensureBase64Prefix(g),
            x: x + 0.20, y: MAIN_Y + 0.20,
            w: HALF_W - 0.40, h: MAIN_H - 0.40,
            sizing: { type: 'contain', w: HALF_W - 0.40, h: MAIN_H - 0.40 },
          });
        } catch (e) {
          slide.addText('(erro ao renderizar gráfico)', {
            x, y: MAIN_Y, w: HALF_W, h: MAIN_H,
            fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
            align: 'center', valign: 'middle',
          });
        }
      });
    }
  }
}

export async function exportStatisticalAnalysisSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  // Formato NOVO (gerado pelo ToolWrapper): { analyses: [{ variable, analysisType,
  // graphImage, interpretation }] }. Difere do formato real da aba de análise
  // (analise/grafico_base64). Detecta e delega ao exportador V2.
  if (Array.isArray(data.analyses) && data.analyses.some((a: any) => a && (a.variable !== undefined || a.analysisType !== undefined))) {
    return exportStatisticalAnalysisV2Slide(project, toolData, aiAnalysis, options);
  }

  const allAnalyses: AnaliseSalva[] = Array.isArray(data.analyses)
    ? data.analyses
    : (Array.isArray(data.analises)
      ? data.analises
      : (Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])));

  // Filtra: ignora itens sem conteúdo relevante
  const items = allAnalyses.filter(it => classifyItem(it) !== 'skip');

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (items.length === 0) {
    const slide = createSlide(pres, project, 'Análise Gráfica e Estatística', 'Analyze', aiAnalysis);
    slide.addText('Nenhuma análise estatística salva neste projeto.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const total = items.length;
    let i = 0;
    while (i < items.length) {
      const item = items[i];
      const kind = classifyItem(item);

      if (kind === 'text_with_chart') {
        drawTextWithChart(pres, project, item, i, total, aiAnalysis);
        i += 1;
      } else if (kind === 'text_only') {
        // Tenta encaixar com a próxima se também for só-texto
        const next = items[i + 1];
        if (next && classifyItem(next) === 'text_only') {
          drawTwoTexts(pres, project, item, next, i, total, aiAnalysis);
          i += 2;
        } else {
          drawSingleText(pres, project, item, i, total, aiAnalysis);
          i += 1;
        }
      } else if (kind === 'graphics_only') {
        drawGraphicsOnly(pres, project, item, i, total, aiAnalysis);
        i += 1;
      } else {
        i += 1;
      }
    }
  }

  const fileName = `Analise_Estatistica_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
