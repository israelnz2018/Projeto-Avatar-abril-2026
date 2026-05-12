import pptxgen from 'pptxgenjs';
import { Project } from '../types';

const NAVY  = '1E2D6E';
const BLUE  = '0033CC';
const LIGHT = 'F0F2FA';
const MUTED = '9CA3AF';

export function addCoverSlide(pres: pptxgen, project: Project, userName: string = ''): void {
  const today = new Date().toLocaleDateString('pt-BR');
  const slide = pres.addSlide();
  slide.background = { color: 'FFFFFF' };

  // Barra lateral esquerda
  slide.addShape('rect', {
    x: 0, y: 0, w: 0.07, h: 7.5,
    fill: { color: BLUE }, line: { type: 'none' },
  });

  // Topo navy
  slide.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 1.80,
    fill: { color: NAVY }, line: { type: 'none' },
  });

  // Faixa azul elétrico na base do topo
  slide.addShape('rect', {
    x: 0, y: 1.72, w: 13.33, h: 0.10,
    fill: { color: BLUE }, line: { type: 'none' },
  });

  // Logo LBW
  slide.addShape('rect', {
    x: 0.35, y: 0.28, w: 1.05, h: 0.44,
    fill: { color: 'FFFFFF', transparency: 88 }, line: { type: 'none' },
  });
  slide.addText('LBW', {
    x: 0.35, y: 0.28, w: 1.05, h: 0.44,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 4,
  });

  // Nome do app
  slide.addText('CONTINUOUS IMPROVEMENT COPILOT', {
    x: 1.55, y: 0.28, w: 9.00, h: 0.24,
    fontFace: 'Calibri', fontSize: 10, bold: true, color: 'FFFFFF',
    charSpacing: 2, transparency: 30,
  });
  slide.addText('Lean Six Sigma · DMAIC', {
    x: 1.55, y: 0.52, w: 9.00, h: 0.22,
    fontFace: 'Calibri', fontSize: 10, color: 'FFFFFF', transparency: 55,
  });

  // Chip DMAIC
  slide.addShape('rect', {
    x: 0.35, y: 1.14, w: 0.92, h: 0.28,
    fill: { color: BLUE }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('DMAIC', {
    x: 0.35, y: 1.14, w: 0.92, h: 0.28,
    fontFace: 'Calibri', fontSize: 9, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 2,
  });

  // Chip Relatório de Projeto
  slide.addShape('rect', {
    x: 1.36, y: 1.14, w: 1.80, h: 0.28,
    fill: { color: 'FFFFFF', transparency: 85 }, line: { type: 'none' },
  });
  slide.addText('RELATÓRIO DE PROJETO', {
    x: 1.36, y: 1.14, w: 1.80, h: 0.28,
    fontFace: 'Calibri', fontSize: 9, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 1, transparency: 15,
  });

  // Título do projeto (centro)
  slide.addText(project.name || 'NOME DO PROJETO', {
    x: 1.50, y: 2.30, w: 10.33, h: 1.20,
    fontFace: 'Calibri', fontSize: 32, bold: true, color: NAVY,
    align: 'center', valign: 'middle',
  });

  // Linha separadora
  slide.addShape('line', {
    x: 3.50, y: 3.62, w: 6.33, h: 0,
    line: { color: NAVY, width: 0.5, transparency: 80 },
  });

  // Subtítulo
  slide.addText('Análise de causa raiz e plano de ação · DMAIC', {
    x: 1.50, y: 3.72, w: 10.33, h: 0.36,
    fontFace: 'Calibri', fontSize: 12, color: MUTED, align: 'center',
  });

  // Card Responsável
  slide.addShape('rect', {
    x: 2.80, y: 4.40, w: 2.80, h: 0.90,
    fill: { color: LIGHT }, line: { type: 'none' }, rectRadius: 0.06,
  });
  slide.addText('RESPONSÁVEL', {
    x: 2.80, y: 4.50, w: 2.80, h: 0.22,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: NAVY,
    align: 'center', charSpacing: 2, transparency: 40,
  });
  slide.addText(userName || 'RESPONSÁVEL', {
    x: 2.80, y: 4.72, w: 2.80, h: 0.44,
    fontFace: 'Calibri', fontSize: 14, bold: true, color: NAVY,
    align: 'center', valign: 'middle',
  });

  // Card Data
  slide.addShape('rect', {
    x: 7.73, y: 4.40, w: 2.80, h: 0.90,
    fill: { color: LIGHT }, line: { type: 'none' }, rectRadius: 0.06,
  });
  slide.addText('DATA', {
    x: 7.73, y: 4.50, w: 2.80, h: 0.22,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: NAVY,
    align: 'center', charSpacing: 2, transparency: 40,
  });
  slide.addText(today, {
    x: 7.73, y: 4.72, w: 2.80, h: 0.44,
    fontFace: 'Calibri', fontSize: 14, bold: true, color: NAVY,
    align: 'center', valign: 'middle',
  });

  // Rodapé
  slide.addShape('rect', {
    x: 0, y: 7.22, w: 13.33, h: 0.28,
    fill: { color: LIGHT }, line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: 0, y: 7.22, w: 0.07, h: 0.28,
    fill: { color: BLUE }, line: { type: 'none' },
  });
  slide.addText('LBW · Continuous Improvement Copilot', {
    x: 0.20, y: 7.24, w: 6.00, h: 0.22,
    fontFace: 'Calibri', fontSize: 7.5, color: NAVY, transparency: 55,
  });
  slide.addText('Confidencial', {
    x: 7.00, y: 7.24, w: 6.13, h: 0.22,
    fontFace: 'Calibri', fontSize: 7.5, color: NAVY,
    align: 'right', transparency: 55,
  });
}
