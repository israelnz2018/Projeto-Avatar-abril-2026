import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { THEME, getSlideBrand } from './slideTemplate';

const ACCENT  = '8AA0E5';
const LIGHT_T = 'C7D2FF';
const SUBTLE  = '6B7AB8';

function ptBrDateLong(d: Date): string {
  const months = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  return `${d.getDate()} / ${months[d.getMonth()]} / ${d.getFullYear()}`;
}

export function addCoverSlide(
  pres: pptxgen,
  project: Project,
  userName: string = '',
  phase: string = ''
): void {
  const dateStr = ptBrDateLong(new Date());
  const brandText = getSlideBrand();
  const slide = pres.addSlide();
  slide.background = { color: THEME.NAVY };

  // Brand mark — topo-esquerda, tipografia pura (white-label)
  slide.addText(brandText, {
    x: 0.62, y: 0.42, w: 1.70, h: 0.32,
    fontFace: 'Calibri', fontSize: brandText.length > 4 ? 18 : 22, bold: true, color: 'FFFFFF',
    charSpacing: 3,
  });
  slide.addText('CONTINUOUS IMPROVEMENT COPILOT', {
    x: 0.62, y: 0.76, w: 5.00, h: 0.22,
    fontFace: 'Calibri', fontSize: 10, color: ACCENT,
    charSpacing: 3,
  });

  // Linha vertical de destaque (à esquerda do bloco de título)
  slide.addShape('rect', {
    x: 0.62, y: 2.50, w: 0.04, h: 1.67,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });

  // Eyebrow
  slide.addText('PROJETO DE MELHORIA · APRESENTAÇÃO EXECUTIVA', {
    x: 0.82, y: 2.62, w: 10.50, h: 0.30,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: ACCENT,
    charSpacing: 4,
  });

  // Nome do projeto — grande, assimétrico, left-aligned
  slide.addText(project.name || 'NOME DO PROJETO', {
    x: 0.82, y: 3.06, w: 11.80, h: 1.06,
    fontFace: 'Calibri', fontSize: 50, bold: true, color: 'FFFFFF',
    charSpacing: -1, shrinkText: true,
  });

  // Tagline
  slide.addText('Relatório executivo de projeto · Análise de causa raiz e plano de ação', {
    x: 0.82, y: 3.98, w: 11.00, h: 0.30,
    fontFace: 'Calibri', fontSize: 14, color: LIGHT_T,
  });

  // Linha separadora curta antes dos stats
  slide.addShape('line', {
    x: 0.62, y: 5.52, w: 1.66, h: 0,
    line: { color: ACCENT, width: 0.5 },
  });

  // Stat — RESPONSÁVEL
  slide.addText('RESPONSÁVEL', {
    x: 0.62, y: 5.68, w: 3.20, h: 0.24,
    fontFace: 'Calibri', fontSize: 11, bold: true, color: ACCENT,
    charSpacing: 3,
  });
  slide.addText(userName || '', {
    x: 0.62, y: 5.92, w: 3.20, h: 0.44,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: 'FFFFFF',
    shrinkText: true,
  });

  // Stat — DATA
  slide.addText('DATA', {
    x: 4.00, y: 5.68, w: 3.20, h: 0.24,
    fontFace: 'Calibri', fontSize: 11, bold: true, color: ACCENT,
    charSpacing: 3,
  });
  slide.addText(dateStr, {
    x: 4.00, y: 5.92, w: 3.20, h: 0.44,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: 'FFFFFF',
    shrinkText: true,
  });

  // Stat — FASE ATUAL (opcional)
  if (phase) {
    slide.addText('FASE ATUAL', {
      x: 7.38, y: 5.68, w: 3.20, h: 0.24,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: ACCENT,
      charSpacing: 3,
    });
    slide.addText(phase, {
      x: 7.38, y: 5.92, w: 3.20, h: 0.44,
      fontFace: 'Calibri', fontSize: 20, bold: true, color: 'FFFFFF',
      shrinkText: true,
    });
  }

  // CONFIDENCIAL — canto inferior direito, muito sutil
  slide.addText('CONFIDENCIAL', {
    x: 10.30, y: 7.16, w: 2.90, h: 0.22,
    fontFace: 'Calibri', fontSize: 9, color: SUBTLE,
    align: 'right', charSpacing: 2,
  });
}
