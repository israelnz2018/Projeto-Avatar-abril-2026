import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface AnalysisResult {
  id: string;
  variableY: { name: string; type: string; description?: string };
  variableX: { name: string; type: string; description?: string };
  quadrant: string;
  recommendedTools: string[];
  explanation?: string;
}

const TOOL_MATRIX: Record<string, string[]> = {
  'Contínuo-Contínuo': ['Diagrama de Dispersão', 'Gráfico de tendência', 'Regressão simples', 'Regressão múltipla'],
  'Contínuo-Discreto': ['Box Plot', 'Teste de Hipótese', 'ANOVA'],
  'Discreto-Contínuo': ['Regressão Logística (Binária/Ordinal/Nominal)'],
  'Discreto-Discreto': ['Histograma', 'Pareto', 'Chi Quadrado'],
};

function isContinuous(type: string): boolean {
  return (type || '').toLowerCase().startsWith('cont');
}

function getTypeChipColor(type: string): { bg: string; fg: string } {
  return isContinuous(type)
    ? { bg: 'DBEAFE', fg: '1E40AF' }
    : { bg: 'FEF3C7', fg: '92400E' };
}

function getQuadrantKey(yType: string, xType: string): string {
  const yNorm = isContinuous(yType) ? 'Contínuo' : 'Discreto';
  const xNorm = isContinuous(xType) ? 'Contínuo' : 'Discreto';
  return `${yNorm}-${xNorm}`;
}

function drawAnalysisCard(slide: any, analysis: AnalysisResult, x: number, y: number, w: number, h: number) {
  // Borda + faixa lateral
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: 'FFFFFF' },
    line: { color: THEME.BLUE, width: 1.0 },
    rectRadius: 0.06,
  });
  slide.addShape('rect', {
    x, y, w: 0.06, h,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });

  const PAD = 0.16;
  const innerX = x + PAD;
  const innerW = w - PAD * 2;

  // ─ VARIÁVEL Y ─
  slide.addText('VARIÁVEL Y (RESPOSTA)', {
    x: innerX, y: y + 0.08, w: innerW, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: '9CA3AF', charSpacing: 1,
  });

  const yName = analysis.variableY?.name || '(sem nome)';
  const yType = analysis.variableY?.type || 'Contínuo';
  const yChip = getTypeChipColor(yType);

  // Chip de tipo Y (à direita)
  const chipW = 0.62;
  const chipH = 0.18;
  const chipY = y + 0.22;
  slide.addShape('rect', {
    x: x + w - PAD - chipW, y: chipY, w: chipW, h: chipH,
    fill: { color: yChip.bg }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(yType, {
    x: x + w - PAD - chipW, y: chipY, w: chipW, h: chipH,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: yChip.fg,
    align: 'center', valign: 'middle',
  });

  slide.addText(yName, {
    x: innerX, y: y + 0.22, w: innerW - chipW - 0.08, h: 0.18,
    fontFace: 'Calibri', fontSize: 9.5, bold: true, color: THEME.NAVY,
    valign: 'middle', shrinkText: true,
  });

  // Linha divisória
  slide.addShape('line', {
    x: innerX, y: y + 0.46, w: innerW, h: 0,
    line: { color: 'E8ECF4', width: 0.5 },
  });

  // ─ VARIÁVEL X ─
  slide.addText('VARIÁVEL X (CAUSA)', {
    x: innerX, y: y + 0.50, w: innerW, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: '9CA3AF', charSpacing: 1,
  });

  const xName = analysis.variableX?.name || '(sem nome)';
  const xType = analysis.variableX?.type || 'Contínuo';
  const xChip = getTypeChipColor(xType);

  slide.addShape('rect', {
    x: x + w - PAD - chipW, y: y + 0.64, w: chipW, h: chipH,
    fill: { color: xChip.bg }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(xType, {
    x: x + w - PAD - chipW, y: y + 0.64, w: chipW, h: chipH,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: xChip.fg,
    align: 'center', valign: 'middle',
  });

  slide.addText(xName, {
    x: innerX, y: y + 0.64, w: innerW - chipW - 0.08, h: 0.18,
    fontFace: 'Calibri', fontSize: 9.5, bold: true, color: THEME.NAVY,
    valign: 'middle', shrinkText: true,
  });

  // ─ QUADRANTE (faixa azul clara embaixo) ─
  const quadH = 0.16;
  slide.addShape('rect', {
    x: innerX, y: y + h - quadH - 0.06, w: innerW, h: quadH,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
  });
  const quadLabel = `Y ${isContinuous(yType) ? 'CONTÍNUO' : 'DISCRETO'} × X ${isContinuous(xType) ? 'CONTÍNUO' : 'DISCRETO'}`;
  slide.addText(quadLabel, {
    x: innerX, y: y + h - quadH - 0.06, w: innerW, h: quadH,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.BLUE,
    align: 'center', valign: 'middle', charSpacing: 0.5,
  });
}

function drawMatrix(
  slide: any,
  x: number, y: number, w: number, h: number,
  usedQuadrants: Set<string>
) {
  // Título
  slide.addText('MATRIZ DE TÉCNICAS APLICÁVEIS', {
    x, y, w, h: 0.18,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY,
    charSpacing: 1,
  });

  const gridY = y + 0.22;
  const gridH = h - 0.22 - 0.20; // espaço pra legenda

  // Padding pra labels Y (à esquerda) e X (no topo)
  const labelW = 0.30;
  const headerH = 0.18;
  const cellAreaX = x + labelW;
  const cellAreaY = gridY + headerH;
  const cellAreaW = w - labelW;
  const cellAreaH = gridH - headerH;
  const cellW = cellAreaW / 2;
  const cellH = cellAreaH / 2;

  // Header X
  slide.addText('X CONTÍNUO', {
    x: cellAreaX, y: gridY, w: cellW, h: headerH,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: '9CA3AF',
    align: 'center', valign: 'middle', charSpacing: 1,
  });
  slide.addText('X DISCRETO', {
    x: cellAreaX + cellW, y: gridY, w: cellW, h: headerH,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: '9CA3AF',
    align: 'center', valign: 'middle', charSpacing: 1,
  });

  // Labels Y (empilhados verticalmente — letra por letra)
  const labelYContText = ['Y','C','O','N','T'];
  const labelYDiscText = ['Y','D','I','S','C'];
  const labelYContH = cellH / labelYContText.length;
  const labelYDiscH = cellH / labelYDiscText.length;

  labelYContText.forEach((letter, i) => {
    slide.addText(letter, {
      x, y: cellAreaY + i * labelYContH, w: labelW, h: labelYContH,
      fontFace: 'Calibri', fontSize: 6.5, bold: true, color: '9CA3AF',
      align: 'center', valign: 'middle',
    });
  });
  labelYDiscText.forEach((letter, i) => {
    slide.addText(letter, {
      x, y: cellAreaY + cellH + i * labelYDiscH, w: labelW, h: labelYDiscH,
      fontFace: 'Calibri', fontSize: 6.5, bold: true, color: '9CA3AF',
      align: 'center', valign: 'middle',
    });
  });

  // Quadrantes
  const quadrants = [
    { key: 'Contínuo-Contínuo', col: 0, row: 0 },
    { key: 'Contínuo-Discreto', col: 1, row: 0 },
    { key: 'Discreto-Contínuo', col: 0, row: 1 },
    { key: 'Discreto-Discreto', col: 1, row: 1 },
  ];

  quadrants.forEach(q => {
    const qx = cellAreaX + q.col * cellW;
    const qy = cellAreaY + q.row * cellH;
    const isUsed = usedQuadrants.has(q.key);
    const tools = TOOL_MATRIX[q.key] || [];

    // Caixa do quadrante
    slide.addShape('rect', {
      x: qx + 0.04, y: qy + 0.04, w: cellW - 0.08, h: cellH - 0.08,
      fill: { color: isUsed ? THEME.NAVY : 'F8F9FC' },
      line: { color: isUsed ? THEME.NAVY : 'E8ECF4', width: 0.5 },
      rectRadius: 0.04,
    });

    // Lista de técnicas
    const toolsText = tools.map(t => t.toUpperCase()).join(' • ');
    slide.addText(toolsText, {
      x: qx + 0.10, y: qy + 0.04, w: cellW - 0.20, h: cellH - 0.08,
      fontFace: 'Calibri', fontSize: 6.5, bold: true,
      color: isUsed ? 'FFFFFF' : '9CA3AF',
      align: 'center', valign: 'middle', shrinkText: true,
    });
  });

  // Legenda
  const legY = gridY + gridH + 0.04;
  slide.addShape('rect', {
    x: cellAreaX, y: legY + 0.02, w: 0.10, h: 0.10,
    fill: { color: THEME.NAVY }, line: { type: 'none' },
  });
  slide.addText('Em uso', {
    x: cellAreaX + 0.14, y: legY, w: 0.50, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: THEME.NAVY, valign: 'middle',
  });
  slide.addShape('rect', {
    x: cellAreaX + 0.70, y: legY + 0.02, w: 0.10, h: 0.10,
    fill: { color: 'F8F9FC' }, line: { color: 'E8ECF4', width: 0.5 },
  });
  slide.addText('Não usados', {
    x: cellAreaX + 0.84, y: legY, w: 0.70, h: 0.14,
    fontFace: 'Calibri', fontSize: 6, color: '9CA3AF', valign: 'middle',
  });
}

export async function exportDataNatureSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const allAnalyses: AnalysisResult[] = Array.isArray(data.analyses) ? data.analyses : [];
  const analyses = allAnalyses.filter(a => a && a.variableY?.name && a.variableX?.name);

  const usedQuadrants = new Set<string>();
  analyses.forEach(a => {
    usedQuadrants.add(getQuadrantKey(a.variableY.type, a.variableX.type));
  });

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'Mapa Estatístico', 'Analyze', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // BANNER
  const BANNER_H = 0.30;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('CLASSIFICAÇÃO DE VARIÁVEIS E TÉCNICAS ESTATÍSTICAS RECOMENDADAS', {
    x: TX + 0.18, y: TY, w: TW - 3.20, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
    charSpacing: 2, valign: 'middle',
  });
  slide.addText(`${analyses.length} ${analyses.length === 1 ? 'análise mapeada' : 'análises mapeadas'}`, {
    x: TX + TW - 3.00, y: TY, w: 2.82, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ÁREA PRINCIPAL: esquerda = cards, direita = matriz
  const MAIN_Y = TY + BANNER_H + 0.12;
  const MAIN_H = TH - BANNER_H - 0.12;
  const LEFT_W = TW * 0.50;
  const RIGHT_X = TX + LEFT_W + 0.20;
  const RIGHT_W = TW - LEFT_W - 0.20;

  // ── ESQUERDA: cards das análises ──
  if (analyses.length === 0) {
    slide.addText('Nenhuma análise registrada nesta ferramenta.', {
      x: TX, y: MAIN_Y + MAIN_H / 2 - 0.15, w: LEFT_W, h: 0.30,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const cardGap = 0.12;
    const visibleCount = Math.min(analyses.length, 4);
    const cardH = (MAIN_H - (visibleCount - 1) * cardGap) / visibleCount;
    const minCardH = 0.85;
    const maxCardH = 1.15;
    const finalCardH = Math.max(minCardH, Math.min(maxCardH, cardH));

    analyses.slice(0, 4).forEach((a, i) => {
      const cardY = MAIN_Y + i * (finalCardH + cardGap);
      drawAnalysisCard(slide, a, TX, cardY, LEFT_W, finalCardH);
    });

    if (analyses.length > 4) {
      slide.addText(`+ ${analyses.length - 4} análises adicionais disponíveis na ferramenta.`, {
        x: TX, y: MAIN_Y + MAIN_H - 0.16, w: LEFT_W, h: 0.16,
        fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, italic: true,
        align: 'center',
      });
    }
  }

  // ── DIREITA: matriz 2x2 ──
  drawMatrix(slide, RIGHT_X, MAIN_Y, RIGHT_W, MAIN_H, usedQuadrants);

  const fileName = `Natureza_dos_Dados_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
