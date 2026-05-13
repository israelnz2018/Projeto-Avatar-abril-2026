import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface WhyChain {
  id: string;
  problem: string;
  whys: string[];
  rootCause: string;
}

function drawChainSlide(
  pres: any,
  project: Project,
  chain: WhyChain,
  chainIndex: number,
  totalChains: number,
  aiAnalysis: string
) {
  const slideTitle = totalChains > 1
    ? `5 Porquês (${chainIndex + 1}/${totalChains})`
    : '5 Porquês';
  const slide = createSlide(pres, project, slideTitle, 'Analyze', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  const whysFiltered = Array.isArray(chain.whys)
    ? chain.whys.filter(w => typeof w === 'string')
    : [];
  const numLevels = Math.max(whysFiltered.length, 1);

  // BANNER
  const BANNER_H = 0.28;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('ANÁLISE DE CAUSA RAIZ POR DESDOBRAMENTO ITERATIVO', {
    x: TX + 0.18, y: TY, w: TW - 3.20, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
    charSpacing: 2, valign: 'middle',
  });
  slide.addText(`${numLevels} ${numLevels === 1 ? 'nível' : 'níveis'} de análise`, {
    x: TX + TW - 3.00, y: TY, w: 2.82, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // PROBLEMA INICIAL
  const PROB_Y = TY + BANNER_H + 0.10;
  const PROB_H = 0.50;
  slide.addShape('rect', {
    x: TX, y: PROB_Y, w: TW, h: PROB_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.06,
  });
  slide.addText('PROBLEMA INICIAL', {
    x: TX + 0.18, y: PROB_Y + 0.06, w: TW - 0.36, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: '8AA0E5',
    charSpacing: 2,
  });
  slide.addText(chain.problem || '(problema não informado)', {
    x: TX + 0.18, y: PROB_Y + 0.22, w: TW - 0.36, h: PROB_H - 0.28,
    fontFace: 'Calibri', fontSize: 11, bold: true,
    color: chain.problem ? 'FFFFFF' : '8AA0E5',
    italic: !chain.problem,
    valign: 'top', shrinkText: true,
  });

  // CAUSA RAIZ
  const ROOT_H = 0.56;
  const ROOT_Y = TY + TH - ROOT_H;
  slide.addShape('rect', {
    x: TX, y: ROOT_Y, w: TW, h: ROOT_H,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.06,
  });
  slide.addShape('rect', {
    x: TX, y: ROOT_Y, w: 0.08, h: ROOT_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' },
  });
  slide.addText('★ CAUSA RAIZ IDENTIFICADA', {
    x: TX + 0.20, y: ROOT_Y + 0.06, w: TW - 0.36, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: 'D6DEFF',
    charSpacing: 2,
  });
  slide.addText(chain.rootCause || '(causa raiz não preenchida)', {
    x: TX + 0.20, y: ROOT_Y + 0.24, w: TW - 0.36, h: ROOT_H - 0.30,
    fontFace: 'Calibri', fontSize: 11, bold: true,
    color: chain.rootCause ? 'FFFFFF' : 'D6DEFF',
    italic: !chain.rootCause,
    valign: 'top', shrinkText: true,
  });

  // PORQUÊS
  const WHYS_Y = PROB_Y + PROB_H + 0.10;
  const WHYS_H = ROOT_Y - WHYS_Y - 0.10;

  if (numLevels === 0 || (numLevels === 1 && !whysFiltered[0])) {
    slide.addText('Nenhum porquê preenchido nesta análise.', {
      x: TX, y: WHYS_Y + WHYS_H / 2 - 0.10, w: TW, h: 0.20,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const GAP = 0.08;
    const rowH = Math.min(0.42, (WHYS_H - (numLevels - 1) * GAP) / numLevels);
    const fontSize = rowH < 0.32 ? 7.5 : 8.5;
    const labelFontSize = rowH < 0.32 ? 5.5 : 6;
    const circleR = Math.min(0.13, rowH * 0.35);
    const circleCx = TX + circleR + 0.04;

    const firstY = WHYS_Y + rowH / 2;
    const lastY = WHYS_Y + (numLevels - 1) * (rowH + GAP) + rowH / 2;
    if (lastY > firstY) {
      slide.addShape('line', {
        x: circleCx, y: firstY, w: 0, h: lastY - firstY,
        line: { color: THEME.BLUE, width: 1.2 },
      });
    }

    whysFiltered.forEach((why, i) => {
      const rowY = WHYS_Y + i * (rowH + GAP);
      const boxX = circleCx + circleR + 0.08;
      const boxW = TX + TW - boxX;

      slide.addShape('rect', {
        x: boxX, y: rowY, w: boxW, h: rowH,
        fill: { color: THEME.LIGHT },
        line: { color: 'E8ECF4', width: 0.5 },
        rectRadius: 0.04,
      });

      slide.addShape('ellipse', {
        x: circleCx - circleR, y: rowY + rowH / 2 - circleR,
        w: circleR * 2, h: circleR * 2,
        fill: { color: THEME.BLUE }, line: { type: 'none' },
      });
      slide.addText(String(i + 1), {
        x: circleCx - circleR, y: rowY + rowH / 2 - circleR,
        w: circleR * 2, h: circleR * 2,
        fontFace: 'Calibri', fontSize: rowH < 0.32 ? 7.5 : 9, bold: true,
        color: 'FFFFFF', align: 'center', valign: 'middle',
      });

      slide.addText('POR QUE?', {
        x: boxX + 0.12, y: rowY + 0.04, w: boxW - 0.24, h: 0.14,
        fontFace: 'Calibri', fontSize: labelFontSize, bold: true, color: THEME.BLUE,
        charSpacing: 1,
      });

      slide.addText(why || '(não preenchido)', {
        x: boxX + 0.12, y: rowY + 0.16, w: boxW - 0.24, h: rowH - 0.20,
        fontFace: 'Calibri', fontSize, color: why ? THEME.NAVY : THEME.MUTED,
        italic: !why, valign: 'top', shrinkText: true,
      });
    });
  }
}

export async function exportFiveWhysSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const allChains: WhyChain[] = Array.isArray(data.chains) ? data.chains : [];
  const chains = allChains.filter(c => {
    if (!c) return false;
    const hasProblem = c.problem && c.problem.trim();
    const hasAnyWhy = Array.isArray(c.whys) && c.whys.some(w => w && w.trim());
    const hasRoot = c.rootCause && c.rootCause.trim();
    return hasProblem || hasAnyWhy || hasRoot;
  });

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  if (chains.length === 0) {
    const slide = createSlide(pres, project, '5 Porquês', 'Analyze', aiAnalysis);
    slide.addText('Nenhuma análise de 5 Porquês foi preenchida nesta ferramenta.', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20,
      w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    chains.forEach((chain, idx) => {
      drawChainSlide(pres, project, chain, idx, chains.length, aiAnalysis);
    });
  }

  const fileName = `5_Porques_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}