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

// Tool content area — maximized after header + tool title
export const TOOL_AREA = {
  x: 0.33,
  y: 1.00,
  w: 12.67,
  h: 5.26,
};

// Override do rótulo de fase no cabeçalho. A apresentação COMPLETA do projeto seta
// isto com o nome da fase REAL da trilha antes de cada ferramenta (evita o "FASE
// DEFINE" hardcoded dentro de cada exportador). Uso avulso de uma ferramenta deixa
// null e mantém o rótulo que o próprio exportador passa.
let phaseLabelOverride: string | null = null;
export function setPhaseLabelOverride(label: string | null): void {
  phaseLabelOverride = label;
}

export function createSlide(
  pres: pptxgen,
  project: Project,
  toolTitle: string,
  toolPhase: string,
  aiAnalysis: string = ''
): pptxgen.Slide {
  // Se a apresentação completa definiu a fase da trilha, ela vence o hardcoded.
  if (phaseLabelOverride) toolPhase = phaseLabelOverride;
  const today = new Date().toLocaleDateString('pt-BR');
  const slide = pres.addSlide();
  slide.background = { color: 'FFFFFF' };

  // Cabeçalho navy (fino: 0.55")
  slide.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 0.55,
    fill: { color: THEME.NAVY }, line: { type: 'none' },
  });

  // Logo LBW — tipografia apenas, sem caixa
  slide.addText('LBW', {
    x: 0.20, y: 0, w: 0.82, h: 0.55,
    fontFace: 'Calibri', fontSize: 14, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 3,
  });

  // Divisor vertical sutil
  slide.addShape('line', {
    x: 1.08, y: 0.12, w: 0, h: 0.30,
    line: { color: '8AA0E5', width: 0.5 },
  });

  // Nome do projeto no cabeçalho
  slide.addText(project.name || '', {
    x: 1.18, y: 0, w: 9.60, h: 0.55,
    fontFace: 'Calibri', fontSize: 10, color: 'C7D2FF',
    valign: 'middle',
  });

  // Chip fase (direita do header)
  slide.addShape('rect', {
    x: 11.48, y: 0.12, w: 1.68, h: 0.30,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(`FASE ${toolPhase.toUpperCase()}`, {
    x: 11.48, y: 0.12, w: 1.68, h: 0.30,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 1,
  });

  // Título da ferramenta (h2) — abaixo do header, à esquerda
  slide.addText(toolTitle, {
    x: 0.33, y: 0.63, w: 12.67, h: 0.30,
    fontFace: 'Calibri', fontSize: 18, bold: true, color: THEME.NAVY,
  });

  // Painel análise executiva
  const analysisY = 6.34;
  const analysisH = 0.83;

  slide.addShape('rect', {
    x: 0.33, y: analysisY, w: 12.67, h: analysisH,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.06,
  });

  // Bullet azul
  slide.addShape('rect', {
    x: 0.44, y: analysisY + 0.10, w: 0.09, h: 0.09,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.045,
  });

  slide.addText('ANÁLISE EXECUTIVA DO ALUNO', {
    x: 0.58, y: analysisY + 0.05, w: 12.00, h: 0.24,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY,
    charSpacing: 2, valign: 'middle',
  });

  const hasAnalysis = aiAnalysis && aiAnalysis.trim().length > 0;
  slide.addText(
    hasAnalysis
      ? aiAnalysis
      : 'Espaço para o aluno escrever a análise executiva e os próximos passos do projeto.',
    {
      x: 0.44, y: analysisY + 0.32, w: 12.42, h: 0.44,
      fontFace: 'Calibri', fontSize: 9.5,
      color: hasAnalysis ? THEME.INK : THEME.MUTED,
      italic: !hasAnalysis, valign: 'top', shrinkText: true,
    }
  );

  // Rodapé — texto simples, sem barras decorativas
  slide.addText(
    `LBW · Continuous Improvement Copilot   ·   ${project.name || ''}   ·   ${today}`,
    {
      x: 0.22, y: 7.30, w: 13.00, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, color: THEME.MUTED,
    }
  );

  return slide;
}
