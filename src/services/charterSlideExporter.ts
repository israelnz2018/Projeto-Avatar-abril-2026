import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function addBlock(
  slide: pptxgen.Slide,
  x: number, y: number, w: number, h: number,
  label: string,
  text: string,
  opts?: { subLabel1?: string; text1?: string; subLabel2?: string; text2?: string }
): void {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.05,
  });
  slide.addShape('rect', {
    x, y, w: 0.06, h,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.02,
  });
  slide.addText(label, {
    x: x + 0.14, y: y + 0.10, w: w - 0.20, h: 0.20,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
    charSpacing: 2,
  });
  slide.addShape('line', {
    x: x + 0.14, y: y + 0.32, w: w - 0.24, h: 0,
    line: { color: 'D1D5E8', width: 0.3 },
  });

  if (opts?.subLabel1) {
    const halfH = (h - 0.40) / 2;
    const midY = y + 0.40 + halfH;

    slide.addText(opts.subLabel1, {
      x: x + 0.14, y: y + 0.38, w: w - 0.20, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.BLUE,
    });
    slide.addText(opts.text1 || '(não preenchido)', {
      x: x + 0.14, y: y + 0.56, w: w - 0.20, h: halfH - 0.24,
      fontFace: 'Calibri', fontSize: 9, color: opts.text1 ? THEME.INK : THEME.MUTED,
      italic: !opts.text1, shrinkText: true, valign: 'top',
    });

    slide.addShape('line', {
      x: x + 0.14, y: midY, w: w - 0.24, h: 0,
      line: { color: 'D1D5E8', width: 0.3 },
    });
    slide.addText(opts.subLabel2 || '', {
      x: x + 0.14, y: midY + 0.06, w: w - 0.20, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED,
    });
    slide.addText(opts.text2 || '(não preenchido)', {
      x: x + 0.14, y: midY + 0.24, w: w - 0.20, h: halfH - 0.24,
      fontFace: 'Calibri', fontSize: 9, color: opts.text2 ? THEME.INK : THEME.MUTED,
      italic: !opts.text2, shrinkText: true, valign: 'top',
    });
  } else {
    slide.addText(text || '(não preenchido)', {
      x: x + 0.14, y: y + 0.40, w: w - 0.20, h: h - 0.50,
      fontFace: 'Calibri', fontSize: 9, color: text ? THEME.INK : THEME.MUTED,
      italic: !text, shrinkText: true, valign: 'top',
    });
  }
}

export async function exportCharterSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const slide = createSlide(pres, project, 'Contrato do Projeto — Project Charter', 'Define', aiAnalysis);

  const TH   = TOOL_AREA.h;
  const COL_W = (TOOL_AREA.w - 0.10) / 2;
  const COL1_X = TOOL_AREA.x;
  const COL2_X = TOOL_AREA.x + COL_W + 0.10;
  const GAP = 0.08;
  const Y1 = TOOL_AREA.y + 0.04;
  const H1 = TH * 0.32;
  const Y2 = Y1 + H1 + GAP;
  const H2 = TH * 0.22;
  const Y3 = Y2 + H2 + GAP;
  const H3 = TOOL_AREA.h - H1 - H2 - GAP * 2 - 0.04;

  // COLUNA ESQUERDA
  addBlock(slide, COL1_X, Y1, COL_W, H1, 'DEFINIÇÃO DO PROBLEMA', toolData?.problemDefinition || '');
  addBlock(slide, COL1_X, Y2, COL_W, H2, 'META DO PROJETO', toolData?.goalDefinition || '');
  addBlock(slide, COL1_X, Y3, COL_W, H3, 'ESCOPO', '', {
    subLabel1: 'DENTRO',
    text1: toolData?.scopeIn || '',
    subLabel2: 'FORA',
    text2: toolData?.scopeOut || '',
  });

  // COLUNA DIREITA
  const leader    = toolData?.leader    ? `Líder: ${toolData.leader}`       : '';
  const champion  = toolData?.champion  ? `Champion: ${toolData.champion}`  : '';
  const area      = toolData?.area      ? `Área: ${toolData.area}`          : '';
  const teamCount = toolData?.stakeholders?.length
    ? `Equipe: ${toolData.stakeholders.length} membros`
    : '';
  const equipe = [leader, champion, area, teamCount].filter(Boolean).join('\n');

  addBlock(slide, COL2_X, Y1, COL_W, H1, 'EQUIPE E LIDERANÇA', equipe);
  addBlock(slide, COL2_X, Y2, COL_W, H2, 'GANHOS ESTIMADOS', toolData?.businessContributions || '');

  // Bloco imagem
  slide.addShape('rect', {
    x: COL2_X, y: Y3, w: COL_W, h: H3,
    fill: { color: THEME.LIGHT },
    line: { color: THEME.CHIP_BD, width: 0.8 },
    rectRadius: 0.05, lineDash: 'dash',
  });
  slide.addShape('rect', {
    x: COL2_X, y: Y3, w: 0.06, h: H3,
    fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.02,
  });
  slide.addText('IMAGEM / FOTO DO PROBLEMA', {
    x: COL2_X + 0.14, y: Y3 + 0.10, w: COL_W - 0.20, h: 0.20,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
    charSpacing: 2,
  });
  slide.addShape('line', {
    x: COL2_X + 0.14, y: Y3 + 0.32, w: COL_W - 0.24, h: 0,
    line: { color: 'D1D5E8', width: 0.3 },
  });

  const images: string[] = toolData?.images || [];
  if (images.length > 0) {
    slide.addImage({
      data: images[0],
      x: COL2_X + 0.20, y: Y3 + 0.42,
      w: COL_W - 0.40, h: H3 - 0.54,
      sizing: { type: 'contain', w: COL_W - 0.40, h: H3 - 0.54 },
    });
  } else {
    slide.addText('(nenhuma imagem adicionada no Charter)', {
      x: COL2_X + 0.14, y: Y3 + 0.40, w: COL_W - 0.20, h: H3 - 0.50,
      fontFace: 'Calibri', fontSize: 8.5, color: THEME.MUTED,
      italic: true, align: 'center', valign: 'middle',
    });
  }

  const fileName = `Contrato_do_Projeto_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
