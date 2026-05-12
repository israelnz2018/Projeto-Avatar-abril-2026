import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export async function exportIshikawaSlide(
  project: Project,
  toolData: { problem?: string; causes?: Record<string, string[]> },
  aiAnalysis: string = ''
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const causes = toolData.causes || {};

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project,
    'Análise de Causa Raiz — Diagrama de Ishikawa', 'Analyze', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // Espinha dorsal
  const SPINE_Y = TY + TH * 0.43;
  const SPINE_START = TX;
  const SPINE_END   = TX + TW - 2.20;

  slide.addShape('line', {
    x: SPINE_START, y: SPINE_Y, w: SPINE_END - SPINE_START, h: 0,
    line: { color: THEME.NAVY, width: 1.75 },
  });

  // Quadro do PROBLEMA (direita da espinha)
  const PROB_W = 2.10;
  const PROB_H = 0.90;
  slide.addShape('rect', {
    x: TX + TW - PROB_W, y: SPINE_Y - PROB_H / 2,
    w: PROB_W, h: PROB_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.05,
  });
  slide.addText('PROBLEMA', {
    x: TX + TW - PROB_W, y: SPINE_Y - PROB_H / 2 + 0.04,
    w: PROB_W, h: 0.20,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.BLUE,
    align: 'center', charSpacing: 2,
  });
  slide.addText(toolData.problem || '(problema não informado)', {
    x: TX + TW - PROB_W + 0.10, y: SPINE_Y - PROB_H / 2 + 0.24,
    w: PROB_W - 0.20, h: PROB_H - 0.30,
    fontFace: 'Calibri', fontSize: 10, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', shrinkText: true,
  });

  // Categorias 6M — 3 em cima, 3 embaixo
  const BONE_W = 1.70;
  const BONE_H = 0.30;
  const CAUSE_W = 2.10;
  const CAUSE_H = 1.40;

  // Posições X das 3 colunas de ossos
  const colXs = [
    TX + 0.10,
    TX + TW * 0.36,
    TX + TW * 0.64,
  ];

  const TOP_ROW = [
    { name: 'Método',   col: 0 },
    { name: 'Material', col: 1 },
    { name: 'Medida',   col: 2 },
  ];
  const BOT_ROW = [
    { name: 'Máquina',       col: 0 },
    { name: 'Mão de obra',   col: 1 },
    { name: 'Meio ambiente', col: 2 },
  ];

  const TOP_BADGE_Y  = TY + 0.05;
  const TOP_CAUSE_Y  = TY + 0.38;
  const BOT_BADGE_Y  = TY + TH - 0.70;
  const BOT_CAUSE_Y  = TY + TH - 0.68 - CAUSE_H;

  const drawBone = (cat: { name: string; col: number }, isTop: boolean) => {
    const bx = colXs[cat.col];
    const badgeY  = isTop ? TOP_BADGE_Y  : BOT_BADGE_Y;
    const causeY  = isTop ? TOP_CAUSE_Y  : BOT_CAUSE_Y;

    // Ponto de ancoragem do badge (centro inferior do badge se top, centro superior se bot)
    const badgeCx = bx + BONE_W / 2;
    const badgeAnchorY = isTop ? badgeY + BONE_H : badgeY;

    // Ponto de ancoragem na espinha (perto do centro da coluna)
    const spineAnchorX = bx + BONE_W / 2;

    // Linha diagonal do badge à espinha
    const x1 = badgeCx;
    const y1 = badgeAnchorY;
    const x2 = spineAnchorX;
    const y2 = SPINE_Y;
    const needsFlip = (x2 < x1 && y2 < y1) || (x2 > x1 && y2 > y1);

    slide.addShape('line', {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
      line: { color: THEME.NAVY, width: 0.9 },
      flipV: needsFlip,
    });

    // Badge da categoria
    slide.addShape('rect', {
      x: bx, y: badgeY, w: BONE_W, h: BONE_H,
      fill: { color: 'EAF1F8' },
      line: { color: THEME.BLUE, width: 0.6 },
      rectRadius: 0.04,
    });
    slide.addText(cat.name, {
      x: bx, y: badgeY, w: BONE_W, h: BONE_H,
      fontFace: 'Calibri', fontSize: 9.5, bold: true, color: THEME.NAVY,
      align: 'center', valign: 'middle',
    });

    // Causas da categoria
    const key = Object.keys(causes).find(k => normalize(k) === normalize(cat.name));
    const list = key ? (causes[key] || []).filter((c: string) => c && c.trim()) : [];

    if (list.length > 0) {
      const items = list.slice(0, 5).map(c => ({
        text: c,
        options: { bullet: { code: '2022' } },
      }));
      slide.addText(items, {
        x: bx, y: causeY, w: CAUSE_W, h: CAUSE_H,
        fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK,
        valign: isTop ? 'bottom' : 'top', paraSpaceAfter: 3,
        shrinkText: true,
      });
    }
  };

  TOP_ROW.forEach(c => drawBone(c, true));
  BOT_ROW.forEach(c => drawBone(c, false));

  const fileName = `Espinha_de_Peixe_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  await pres.writeFile({ fileName });
}
