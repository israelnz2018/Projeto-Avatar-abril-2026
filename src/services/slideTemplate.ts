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

// Marca (texto) do cabeçalho do slide — white-label. Default 'LBW'. O app seta
// com a sigla do consultor atual (ConsultorContext). Curta pra caber no header.
let slideBrandText = 'LBW';
export function setSlideBrand(text: string | null): void {
  const t = (text || '').trim().toUpperCase();
  slideBrandText = t ? t.slice(0, 7) : 'LBW';
}
export function getSlideBrand(): string {
  return slideBrandText;
}

// Cores do template — white-label. O consultor escolhe 3 cores na Minha Marca
// (escura/destaque/clara) e o ConsultorContext chama setSlideColors ao trocar de
// tenant. Muta as chaves de THEME que TODOS os exporters já leem em render-time —
// então a paleta inteira re-veste sem tocar em cada exportador. Default = LBW.
const CORES_LBW = { navy: '1E2D6E', blue: '0033CC', light: 'F0F2FA', ink: '2A2F3A', muted: '9CA3AF' };
const hex6 = (c?: string): string | null => {
  if (!c) return null;
  const h = c.trim().replace(/^#/, '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(h) ? h : null;
};
export function setSlideColors(cores?: { navy?: string; blue?: string; light?: string; ink?: string; muted?: string } | null): void {
  THEME.NAVY = hex6(cores?.navy) || CORES_LBW.navy;
  THEME.BLUE = hex6(cores?.blue) || CORES_LBW.blue;
  THEME.LIGHT = hex6(cores?.light) || CORES_LBW.light;
  THEME.INK = hex6(cores?.ink) || CORES_LBW.ink;
  THEME.MUTED = hex6(cores?.muted) || CORES_LBW.muted;
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

  // Logo/marca — tipografia (white-label: sigla do consultor). Box um pouco maior
  // pra acomodar siglas de até 7 caracteres sem estourar.
  slide.addText(slideBrandText, {
    x: 0.18, y: 0, w: 1.30, h: 0.55,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 2,
  });

  // Divisor vertical sutil
  slide.addShape('line', {
    x: 1.55, y: 0.12, w: 0, h: 0.30,
    line: { color: '8AA0E5', width: 0.5 },
  });

  // Nome do projeto no cabeçalho
  slide.addText(project.name || '', {
    x: 1.66, y: 0, w: 9.10, h: 0.55,
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

  // Rodapé — texto simples, sem barras decorativas (white-label: usa a sigla do consultor)
  slide.addText(
    `${slideBrandText} · Continuous Improvement Copilot   ·   ${project.name || ''}   ·   ${today}`,
    {
      x: 0.22, y: 7.30, w: 13.00, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, color: THEME.MUTED,
    }
  );

  return slide;
}
