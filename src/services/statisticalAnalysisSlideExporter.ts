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
  graficoInterativo?: any;
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

interface IndicadorGrafico {
  label: string;
  value: string;
}

interface LinhaIntervalo {
  grupo: string;
  n: string;
  media: string;
  dp: string;
  se: string;
  inferior: string;
  superior: string;
}

interface ComplementoGrafico {
  indicadores: IndicadorGrafico[];
  regressao: IndicadorGrafico[];
  intervalo?: {
    nivel: string;
    linhas: LinhaIntervalo[];
  };
}

function formatNumber(value: unknown, decimals: number = 2, integer: boolean = false): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (integer) return Math.round(numeric).toLocaleString('pt-BR');
  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Lê os mesmos dados estruturados exibidos abaixo do Plotly na plataforma.
 * Assim, o PPT não depende de tentar capturar elementos HTML junto da imagem.
 */
function getGraphicSupplement(item: AnaliseSalva): ComplementoGrafico | null {
  const graphic = item.graficoInterativo;
  if (!graphic || typeof graphic !== 'object') return null;

  const indicadores: IndicadorGrafico[] = [];
  const stats = graphic.estatisticas?.global || graphic.estatisticas;
  if (stats && stats.n !== undefined) {
    indicadores.push(
      { label: 'n', value: formatNumber(stats.n, 0, true) },
      { label: 'Média', value: formatNumber(stats.media) },
      { label: 'DP', value: formatNumber(stats.desvio_padrao) },
      { label: 'Mínimo', value: formatNumber(stats.minimo) },
      { label: 'Mediana', value: formatNumber(stats.mediana) },
      { label: 'Máximo', value: formatNumber(stats.maximo) },
    );
  }

  const regressao: IndicadorGrafico[] = [];
  const trend = graphic.tipo === 'dispersao' ? graphic.config?.tendencia_global : null;
  if (trend) {
    const slope = Number(trend.slope);
    const intercept = Number(trend.intercept);
    const equation = Number.isFinite(slope) && Number.isFinite(intercept)
      ? `y = ${formatNumber(slope, 4)} · x ${intercept >= 0 ? '+' : '−'} ${formatNumber(Math.abs(intercept), 4)}`
      : '—';
    regressao.push(
      { label: 'n', value: formatNumber(trend.n, 0, true) },
      { label: 'R (Pearson)', value: formatNumber(trend.r, 4) },
      { label: 'R²', value: formatNumber(trend.r2, 4) },
      { label: 'Equação', value: equation },
    );
  }

  let intervalo: ComplementoGrafico['intervalo'];
  if (graphic.tipo === 'intervalo' && graphic.series?.[0]) {
    const serie = graphic.series[0];
    const categorias = Array.isArray(serie.categorias) ? serie.categorias : [];
    const linhas = categorias.map((categoria: unknown, index: number): LinhaIntervalo => ({
      grupo: String(categoria ?? '—'),
      n: formatNumber(serie.ns?.[index], 0, true),
      media: formatNumber(serie.medias?.[index], 4),
      dp: formatNumber(serie.dps?.[index], 4),
      se: formatNumber(serie.ses?.[index], 4),
      inferior: formatNumber(serie.ic_inferior?.[index], 4),
      superior: formatNumber(serie.ic_superior?.[index], 4),
    }));
    if (linhas.length > 0) {
      intervalo = {
        nivel: formatNumber(graphic.config?.nivel_confianca ?? 95, 0),
        linhas,
      };
    }
  }

  if (indicadores.length === 0 && regressao.length === 0 && !intervalo) return null;
  return { indicadores, regressao, intervalo };
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

function getFirstIntervalRowCount(supplement: ComplementoGrafico | null): number {
  if (!supplement?.intervalo) return 0;
  const hasOtherBlocks = supplement.indicadores.length > 0 || supplement.regressao.length > 0;
  return Math.min(supplement.intervalo.linhas.length, hasOtherBlocks ? 3 : 5);
}

function getSupplementHeight(supplement: ComplementoGrafico | null, intervalRows: number): number {
  if (!supplement) return 0;
  const heights: number[] = [];
  if (supplement.indicadores.length > 0) heights.push(0.62);
  if (supplement.regressao.length > 0) heights.push(0.62);
  if (supplement.intervalo && intervalRows > 0) heights.push(0.54 + intervalRows * 0.25);
  return heights.reduce((total, height) => total + height, 0) + Math.max(0, heights.length - 1) * 0.08;
}

function drawIndicatorCards(
  slide: any,
  title: string,
  indicators: IndicadorGrafico[],
  x: number,
  y: number,
  w: number,
): number {
  if (indicators.length === 0) return 0;

  slide.addText(title, {
    x, y, w, h: 0.16,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
    charSpacing: 1.2, valign: 'middle',
  });

  const gap = 0.08;
  const cardY = y + 0.19;
  const cardH = 0.43;
  const cardW = (w - gap * (indicators.length - 1)) / indicators.length;
  indicators.forEach((indicator, index) => {
    const cardX = x + index * (cardW + gap);
    slide.addShape('rect', {
      x: cardX, y: cardY, w: cardW, h: cardH,
      fill: { color: THEME.LIGHT }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });
    slide.addText(indicator.label.toUpperCase(), {
      x: cardX + 0.08, y: cardY + 0.03, w: cardW - 0.16, h: 0.12,
      fontFace: 'Calibri', fontSize: 5.5, bold: true, color: THEME.MUTED,
      charSpacing: 0.5, align: 'center', valign: 'middle', shrinkText: true,
    });
    slide.addText(indicator.value, {
      x: cardX + 0.06, y: cardY + 0.16, w: cardW - 0.12, h: 0.21,
      fontFace: 'Calibri', fontSize: indicator.label === 'Equação' ? 8 : 9,
      bold: true, color: THEME.NAVY, align: 'center', valign: 'middle', shrinkText: true,
    });
  });

  return 0.62;
}

const INTERVAL_COLUMNS = [0.24, 0.07, 0.13, 0.12, 0.12, 0.16, 0.16];

function drawIntervalTable(
  slide: any,
  supplement: NonNullable<ComplementoGrafico['intervalo']>,
  rows: LinhaIntervalo[],
  x: number,
  y: number,
  w: number,
  continuation: boolean = false,
): number {
  const title = continuation
    ? `INTERVALOS DE CONFIANÇA (${supplement.nivel}%) · CONTINUAÇÃO`
    : `INTERVALOS DE CONFIANÇA (${supplement.nivel}%)`;
  slide.addText(title, {
    x, y, w, h: 0.18,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
    charSpacing: 1.2, valign: 'middle',
  });

  const headers = ['Grupo', 'n', 'Média', 'DP', 'SE', 'IC inferior', 'IC superior'];
  const rowValues = rows.map(row => [row.grupo, row.n, row.media, row.dp, row.se, row.inferior, row.superior]);
  const tableY = y + 0.21;
  const headerH = 0.28;
  const rowH = 0.25;
  let cellX = x;

  headers.forEach((header, index) => {
    const cellW = w * INTERVAL_COLUMNS[index];
    slide.addShape('rect', {
      x: cellX, y: tableY, w: cellW, h: headerH,
      fill: { color: THEME.NAVY }, line: { color: 'FFFFFF', width: 0.4 },
    });
    slide.addText(header, {
      x: cellX + 0.03, y: tableY, w: cellW - 0.06, h: headerH,
      fontFace: 'Calibri', fontSize: 6.5, bold: true, color: 'FFFFFF',
      align: index === 0 ? 'left' : 'center', valign: 'middle', shrinkText: true,
    });
    cellX += cellW;
  });

  rowValues.forEach((values, rowIndex) => {
    const rowY = tableY + headerH + rowIndex * rowH;
    cellX = x;
    values.forEach((value, columnIndex) => {
      const cellW = w * INTERVAL_COLUMNS[columnIndex];
      slide.addShape('rect', {
        x: cellX, y: rowY, w: cellW, h: rowH,
        fill: { color: rowIndex % 2 === 0 ? 'FFFFFF' : THEME.LIGHT },
        line: { color: THEME.CHIP_BD, width: 0.35 },
      });
      slide.addText(value, {
        x: cellX + 0.03, y: rowY, w: cellW - 0.06, h: rowH,
        fontFace: 'Calibri', fontSize: 6.5, color: THEME.INK,
        bold: columnIndex === 0, align: columnIndex === 0 ? 'left' : 'right',
        valign: 'middle', shrinkText: true,
      });
      cellX += cellW;
    });
  });

  return 0.54 + rows.length * rowH;
}

function drawGraphicSupplement(
  slide: any,
  supplement: ComplementoGrafico | null,
  x: number,
  y: number,
  w: number,
  intervalRows: number,
): void {
  if (!supplement) return;
  let currentY = y;

  if (supplement.indicadores.length > 0) {
    currentY += drawIndicatorCards(slide, 'INDICADORES DO GRÁFICO', supplement.indicadores, x, currentY, w) + 0.08;
  }
  if (supplement.regressao.length > 0) {
    currentY += drawIndicatorCards(slide, 'REGRESSÃO LINEAR GLOBAL', supplement.regressao, x, currentY, w) + 0.08;
  }
  if (supplement.intervalo && intervalRows > 0) {
    drawIntervalTable(
      slide,
      supplement.intervalo,
      supplement.intervalo.linhas.slice(0, intervalRows),
      x,
      currentY,
      w,
    );
  }
}

function drawIntervalContinuationSlides(
  pres: any,
  project: Project,
  item: AnaliseSalva,
  supplement: ComplementoGrafico | null,
  firstRowCount: number,
  idx: number,
  total: number,
  aiAnalysis: string,
): void {
  if (!supplement?.intervalo || firstRowCount >= supplement.intervalo.linhas.length) return;

  const remaining = supplement.intervalo.linhas.slice(firstRowCount);
  const rowsPerSlide = 15;
  const totalPages = Math.ceil(remaining.length / rowsPerSlide);
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const rows = remaining.slice(pageIndex * rowsPerSlide, (pageIndex + 1) * rowsPerSlide);
    const pageLabel = totalPages > 1 ? ` ${pageIndex + 1}/${totalPages}` : '';
    const slide = createSlide(
      pres,
      project,
      `Dados — ${item.tool || 'Intervalos'}${pageLabel}`,
      'Analyze',
      aiAnalysis,
    );
    drawHeader(
      slide,
      `${(item.tool || 'INTERVALOS').toUpperCase()} · DADOS DO GRÁFICO`,
      `Análise ${idx + 1} de ${total}`,
    );
    drawIntervalTable(
      slide,
      supplement.intervalo,
      rows,
      TOOL_AREA.x,
      TOOL_AREA.y + 0.44,
      TOOL_AREA.w,
      true,
    );
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
  const supplement = getGraphicSupplement(item);
  const intervalRows = getFirstIntervalRowCount(supplement);
  const supplementH = getSupplementHeight(supplement, intervalRows);
  const contentH = MAIN_H - (supplementH > 0 ? supplementH + 0.10 : 0);
  const LEFT_W = TW * 0.48;
  const RIGHT_X = TX + LEFT_W + 0.20;
  const RIGHT_W = TW - LEFT_W - 0.20;

  // Esquerda - texto
  slide.addShape('rect', {
    x: TX, y: MAIN_Y, w: LEFT_W, h: contentH,
    fill: { color: 'F8F9FC' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.06,
  });
  slide.addText('ANÁLISE ESTATÍSTICA', {
    x: TX + 0.16, y: MAIN_Y + 0.10, w: LEFT_W - 0.32, h: 0.20,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY, charSpacing: 2,
  });
  slide.addText(cleanText(item.analise || ''), {
    x: TX + 0.16, y: MAIN_Y + 0.34, w: LEFT_W - 0.32, h: contentH - 0.44,
    fontFace: 'Calibri', fontSize: 9, color: THEME.NAVY,
    valign: 'top', shrinkText: true,
  });

  // Direita - gráfico
  slide.addShape('rect', {
    x: RIGHT_X, y: MAIN_Y, w: RIGHT_W, h: contentH,
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
      w: RIGHT_W - 0.40, h: contentH - 0.44,
      sizing: { type: 'contain', w: RIGHT_W - 0.40, h: contentH - 0.44 },
    });
  } catch (e) {
    slide.addText('(erro ao renderizar gráfico)', {
      x: RIGHT_X + 0.20, y: MAIN_Y + 0.34, w: RIGHT_W - 0.40, h: contentH - 0.44,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  }

  if (supplementH > 0) {
    drawGraphicSupplement(slide, supplement, TX, MAIN_Y + contentH + 0.10, TW, intervalRows);
  }
  drawIntervalContinuationSlides(pres, project, item, supplement, intervalRows, idx, total, aiAnalysis);
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
  const supplement = getGraphicSupplement(item);
  const intervalRows = getFirstIntervalRowCount(supplement);
  const supplementH = getSupplementHeight(supplement, intervalRows);
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
      const hasSupplement = pageStart === 0 && supplementH > 0;
      const H = MAIN_H - (hasSupplement ? supplementH + 0.10 : 0);
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
      if (hasSupplement) {
        drawGraphicSupplement(slide, supplement, TX, MAIN_Y + H + 0.10, TW, intervalRows);
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

  drawIntervalContinuationSlides(pres, project, item, supplement, intervalRows, idx, total, aiAnalysis);
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
