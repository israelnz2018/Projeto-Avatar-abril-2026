import pptxgen from 'pptxgenjs';
import { Project } from '../types';

export const THEME = {
  NAVY:    '1E2D6E',
  BLUE:    '0033CC',
  LIGHT:   'F0F2FA',
  CHIP_BG: 'EAF1F8',
  CHIP_BD: 'C7D6E6',
  INK:     '2A2F3A',
  MUTED:   '9CA3AF',
};

export const TOOL_AREA = {
  x: 0.35,
  y: 1.08,
  w: 12.63,
  h: 4.53,
};

export function createSlide(
  pres: pptxgen,
  project: Project,
  toolTitle: string,
  toolPhase: string,
  aiAnalysis: string = ''
): pptxgen.Slide {
  const today = new Date().toLocaleDateString('pt-BR');
  const slide = pres.addSlide();
  slide.background = { color: 'FFFFFF' };

  // Barra lateral
  slide.addShape('rect', {
    x: 0, y: 0, w: 0.07, h: 7.5,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });

  // Cabeçalho navy
  slide.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 0.88,
    fill: { color: THEME.NAVY }, line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: 0, y: 0.81, w: 13.33, h: 0.07,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });

  // Logo LBW
  slide.addShape('rect', {
    x: 0.22, y: 0.16, w: 0.88, h: 0.40,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('LBW', {
    x: 0.22, y: 0.16, w: 0.88, h: 0.40,
    fontFace: 'Calibri', fontSize: 16, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 4,
  });

  // Linha divisória vertical
  slide.addShape('line', {
    x: 1.24, y: 0.18, w: 0, h: 0.44,
    line: { color: 'FFFFFF', width: 0.3, transparency: 70 },
  });

  // Título e subtítulo
  slide.addText(toolTitle, {
    x: 1.34, y: 0.10, w: 10.20, h: 0.38,
    fontFace: 'Calibri', fontSize: 15, bold: true, color: 'FFFFFF',
  });
  slide.addText(`Projeto: ${project.name || ''}   ·   Fase ${toolPhase}   ·   ${today}`, {
    x: 1.34, y: 0.46, w: 10.20, h: 0.25,
    fontFace: 'Calibri', fontSize: 9, color: 'FFFFFF', transparency: 45,
  });

  // Chip fase
  slide.addShape('rect', {
    x: 11.60, y: 0.18, w: 1.55, h: 0.30,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(`FASE ${toolPhase.toUpperCase()}`, {
    x: 11.60, y: 0.18, w: 1.55, h: 0.30,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 1,
  });

  // Painel análise executiva
  slide.addShape('rect', {
    x: 0.35, y: 5.82, w: 12.63, h: 1.12,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.06,
  });
  slide.addShape('rect', {
    x: 0.35, y: 5.82, w: 0.06, h: 1.12,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.02,
  });
  slide.addText('ANÁLISE EXECUTIVA', {
    x: 0.50, y: 5.88, w: 12.00, h: 0.22,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY,
    charSpacing: 2, transparency: 30,
  });
  slide.addShape('line', {
    x: 0.50, y: 6.10, w: 12.28, h: 0,
    line: { color: THEME.NAVY, width: 0.3, transparency: 80 },
  });
  const hasAnalysis = aiAnalysis && aiAnalysis.trim().length > 0;
  slide.addText(
    hasAnalysis
      ? aiAnalysis
      : 'Insira aqui a análise executiva e os próximos passos recomendados para o projeto.',
    {
      x: 0.50, y: 6.14, w: 12.00, h: 0.72,
      fontFace: 'Calibri', fontSize: 9.5, color: THEME.INK,
      italic: !hasAnalysis, transparency: hasAnalysis ? 0 : 50,
      valign: 'top',
    }
  );

  // Rodapé
  slide.addShape('rect', {
    x: 0, y: 7.22, w: 13.33, h: 0.28,
    fill: { color: THEME.LIGHT }, line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: 0, y: 7.22, w: 0.07, h: 0.28,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });
  slide.addText(
    `LBW · Continuous Improvement Copilot   ·   ${project.name || ''}   ·   ${today}`,
    {
      x: 0.20, y: 7.24, w: 12.00, h: 0.22,
      fontFace: 'Calibri', fontSize: 7.5, color: THEME.NAVY, transparency: 55,
    }
  );

  return slide;
}
