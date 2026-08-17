import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

interface Output {
  name: string;
  importance: number;
}
interface Cause {
  id?: string;
  name: string;
  scores: number[];
  effort: number;
  selected?: boolean;
}

function calcTotal(cause: Cause, outputs: Output[]): number {
  const scores = Array.isArray(cause.scores) ? cause.scores : [];
  return scores.reduce((acc, score, idx) => {
    return acc + (score * (outputs[idx]?.importance || 0));
  }, 0);
}

// Extrai o número da variável (x18, X3, etc) e formata como 01/02/18
function extractVarNumber(cause: Cause): string {
  const fullName = cause.name || '';
  const colonIdx = fullName.indexOf(':');
  const idPart = colonIdx > 0 ? fullName.substring(0, colonIdx).trim() : (cause.id || '');
  const numMatch = idPart.match(/\d+/);
  return numMatch ? numMatch[0].padStart(2, '0') : '??';
}

export async function exportCauseEffectMatrixSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const outputs: Output[] = toolData?.outputs || [];
  const causes: Cause[] = toolData?.causes || [];

  const enriched = causes.map(c => ({
    ...c,
    total: calcTotal(c, outputs),
  }));

  const sortedAll = [...enriched].sort((a, b) => {
    if (a.selected && !b.selected) return -1;
    if (!a.selected && b.selected) return 1;
    return b.total - a.total;
  });

  const selected = enriched
    .filter(c => c.selected)
    .sort((a, b) => b.total - a.total);

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project,
    'Matriz de Causa e Efeito — Esforço e Benefício', 'Analyze', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // ── COLUNA ESQUERDA: tabela de variáveis ──
  const LEFT_W = TW * 0.42;
  const LEFT_X = TX;

  slide.addText('VARIÁVEIS DE ENTRADA (X)', {
    x: LEFT_X, y: TY, w: LEFT_W, h: 0.20,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: '6B7AAB',
    charSpacing: 2,
  });

  const HEADER_H = 0.24;
  const tblY = TY + 0.22;
  slide.addShape('rect', {
    x: LEFT_X, y: tblY, w: LEFT_W, h: HEADER_H,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
  });

  const COL_NAME_X    = LEFT_X + 0.10;
  const COL_IMPACT_X  = LEFT_X + LEFT_W * 0.62;
  const COL_EFFORT_X  = LEFT_X + LEFT_W * 0.78;
  const COL_NAME_W    = LEFT_W * 0.58;
  const COL_IMPACT_W  = LEFT_W * 0.14;
  const COL_EFFORT_W  = LEFT_W * 0.20;

  slide.addText('VARIÁVEL', { x: COL_NAME_X,   y: tblY, w: COL_NAME_W,   h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('IMPACTO',  { x: COL_IMPACT_X, y: tblY, w: COL_IMPACT_W, h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('ESFORÇO',  { x: COL_EFFORT_X, y: tblY, w: COL_EFFORT_W, h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });

  const tableBodyY = tblY + HEADER_H;
  const availableH = TY + TH - tableBodyY - 0.30;
  const rowH = sortedAll.length > 0 ? Math.min(0.28, availableH / Math.max(sortedAll.length, 1)) : 0.28;
  const fontSize = rowH < 0.22 ? 7 : 8;

  let rowY = tableBodyY;
  sortedAll.forEach((cause) => {
    if (rowY + rowH > TY + TH - 0.30) return;

    slide.addShape('line', {
      x: LEFT_X, y: rowY, w: LEFT_W, h: 0,
      line: { color: 'E8ECF4', width: 0.4 },
    });

    if (cause.selected) {
      slide.addShape('rect', {
        x: LEFT_X, y: rowY + 0.02, w: 0.05, h: rowH - 0.04,
        fill: { color: THEME.BLUE }, line: { type: 'none' },
      });
    }

    slide.addText(cause.name || '(sem nome)', {
      x: COL_NAME_X, y: rowY, w: COL_NAME_W, h: rowH,
      fontFace: 'Calibri', fontSize, bold: !!cause.selected,
      color: cause.selected ? THEME.NAVY : '6B7280',
      valign: 'middle', shrinkText: true,
    });

    slide.addText(String(Math.round(cause.total)), {
      x: COL_IMPACT_X, y: rowY, w: COL_IMPACT_W, h: rowH,
      fontFace: 'Calibri', fontSize, bold: !!cause.selected,
      color: cause.selected ? THEME.NAVY : '6B7280', valign: 'middle',
    });

    const effortHigh = cause.effort >= 5;
    const chipBg = effortHigh ? 'FEE2E2' : 'DCFCE7';
    const chipFg = effortHigh ? 'EF4444' : '16A34A';
    const chipLabel = effortHigh ? 'Alto' : 'Baixo';
    slide.addShape('rect', {
      x: COL_EFFORT_X, y: rowY + 0.04, w: COL_EFFORT_W - 0.08, h: rowH - 0.08,
      fill: { color: chipBg }, line: { type: 'none' }, rectRadius: 0.03,
    });
    slide.addText(chipLabel, {
      x: COL_EFFORT_X, y: rowY, w: COL_EFFORT_W - 0.08, h: rowH,
      fontFace: 'Calibri', fontSize: 6.5, bold: true,
      color: chipFg, align: 'center', valign: 'middle',
    });

    rowY += rowH;
  });

  slide.addShape('rect', {
    x: LEFT_X, y: TY + TH - 0.20, w: 0.05, h: 0.10,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });
  slide.addText('= Selecionadas para análise', {
    x: LEFT_X + 0.10, y: TY + TH - 0.22, w: LEFT_W - 0.10, h: 0.16,
    fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, italic: true,
    valign: 'middle',
  });

  slide.addShape('line', {
    x: LEFT_X + LEFT_W + 0.05, y: TY, w: 0, h: TH,
    line: { color: 'E8ECF4', width: 0.5 },
  });

  // ── COLUNA DIREITA ──
  const RIGHT_X = LEFT_X + LEFT_W + 0.20;
  const RIGHT_W = TW - LEFT_W - 0.20;

  // ─── SCATTER ───
  slide.addText('ESFORÇO × BENEFÍCIO', {
    x: RIGHT_X, y: TY, w: RIGHT_W, h: 0.20,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: '6B7AAB',
    charSpacing: 2,
  });

  const SC_Y = TY + 0.22;
  const SC_H = (TH - 0.44) / 2;
  slide.addShape('rect', {
    x: RIGHT_X, y: SC_Y, w: RIGHT_W, h: SC_H,
    fill: { color: 'F8F9FC' }, line: { color: THEME.CHIP_BD, width: 0.5 },
    rectRadius: 0.04,
  });

  const SC_PAD_L = 0.50;
  const SC_PAD_R = 0.16;
  const SC_PAD_T = 0.22;
  const SC_PAD_B = 0.26;
  const SC_PLOT_X = RIGHT_X + SC_PAD_L;
  const SC_PLOT_Y = SC_Y + SC_PAD_T;
  const SC_PLOT_W = RIGHT_W - SC_PAD_L - SC_PAD_R;
  const SC_PLOT_H = SC_H - SC_PAD_T - SC_PAD_B;

  // Eixos
  slide.addShape('line', {
    x: SC_PLOT_X, y: SC_PLOT_Y, w: 0, h: SC_PLOT_H,
    line: { color: 'D1D5DB', width: 0.8 },
  });
  slide.addShape('line', {
    x: SC_PLOT_X, y: SC_PLOT_Y + SC_PLOT_H, w: SC_PLOT_W, h: 0,
    line: { color: 'D1D5DB', width: 0.8 },
  });

  // Linhas dos quadrantes
  slide.addShape('line', {
    x: SC_PLOT_X + SC_PLOT_W / 2, y: SC_PLOT_Y, w: 0, h: SC_PLOT_H,
    line: { color: 'E8ECF4', width: 0.6 },
  });
  slide.addShape('line', {
    x: SC_PLOT_X, y: SC_PLOT_Y + SC_PLOT_H / 2, w: SC_PLOT_W, h: 0,
    line: { color: 'E8ECF4', width: 0.6 },
  });

  slide.addText('PRIORIDADE ALTA', {
    x: SC_PLOT_X + 0.04, y: SC_PLOT_Y + 0.02, w: SC_PLOT_W / 2 - 0.08, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: '16A34A',
  });

  slide.addText('ESFORÇO →', {
    x: SC_PLOT_X, y: SC_PLOT_Y + SC_PLOT_H + 0.04, w: SC_PLOT_W, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, align: 'center',
  });

  // Label "IMPACTO" empilhado verticalmente (letra por letra)
  const impactoLetters = ['I','M','P','A','C','T','O'];
  const impLetterH = SC_PLOT_H / impactoLetters.length;
  impactoLetters.forEach((letter, i) => {
    slide.addText(letter, {
      x: RIGHT_X + 0.04, y: SC_PLOT_Y + i * impLetterH, w: 0.22, h: impLetterH,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.MUTED,
      align: 'center', valign: 'middle',
    });
  });

  const maxImpact = Math.max(...enriched.map(c => c.total), 100);

  // Anti-colisão: pontos sobrepostos viram fileira horizontal centralizada
  const positionGroups = new Map<string, Cause[]>();
  const dotR = 0.13;

  enriched.forEach((cause) => {
    const ex = Math.max(1, Math.min(10, cause.effort));
    const im = Math.max(0, Math.min(maxImpact, cause.total));
    const key = `${ex.toFixed(1)}_${im.toFixed(1)}`;
    if (!positionGroups.has(key)) positionGroups.set(key, []);
    positionGroups.get(key)!.push(cause);
  });

  enriched.forEach((cause) => {
    const ex = Math.max(1, Math.min(10, cause.effort));
    const im = Math.max(0, Math.min(maxImpact, cause.total));
    const key = `${ex.toFixed(1)}_${im.toFixed(1)}`;
    const group = positionGroups.get(key)!;
    const idxInGroup = group.findIndex(c => c === cause);
    const groupSize = group.length;

    // Bolinha pequena
    const smallDotR = 0.13;
    // Caixa do número MAIOR (transborda a bolinha para os lados)
    const labelW = 0.50;
    const labelH = 0.30;

    const spacing = labelW * 1.05; // anti-colisão baseado na CAIXA do número, não na bolinha
    const offsetX = (idxInGroup - (groupSize - 1) / 2) * spacing;

    const px = SC_PLOT_X + ((ex - 1) / 9) * SC_PLOT_W + offsetX;
    const py = SC_PLOT_Y + SC_PLOT_H - (im / maxImpact) * SC_PLOT_H;

    const numStr = extractVarNumber(cause);

    if (cause.selected) {
      slide.addShape('ellipse', {
        x: px - smallDotR, y: py - smallDotR, w: smallDotR * 2, h: smallDotR * 2,
        fill: { color: THEME.BLUE }, line: { type: 'none' },
      });
      // Caixa do número maior, centralizada na bolinha (transborda para os lados)
      slide.addText(numStr, {
        x: px - labelW / 2, y: py - labelH / 2, w: labelW, h: labelH,
        fontFace: 'Calibri', fontSize: 9, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle',
      });
    } else {
      slide.addShape('ellipse', {
        x: px - smallDotR, y: py - smallDotR, w: smallDotR * 2, h: smallDotR * 2,
        fill: { color: 'FFFFFF' }, line: { color: '9CA3AF', width: 1.0 },
      });
      slide.addText(numStr, {
        x: px - labelW / 2, y: py - labelH / 2, w: labelW, h: labelH,
        fontFace: 'Calibri', fontSize: 9, bold: true, color: '6B7280',
        align: 'center', valign: 'middle',
      });
    }
  });

  // ─── PARETO ───
  const PT_LABEL_Y = SC_Y + SC_H + 0.10;
  slide.addText('PARETO — VARIÁVEIS SELECIONADAS', {
    x: RIGHT_X, y: PT_LABEL_Y, w: RIGHT_W, h: 0.18,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: '6B7AAB',
    charSpacing: 2,
  });

  const PT_Y = PT_LABEL_Y + 0.20;
  const PT_H = TY + TH - PT_Y;
  slide.addShape('rect', {
    x: RIGHT_X, y: PT_Y, w: RIGHT_W, h: PT_H,
    fill: { color: 'F8F9FC' }, line: { color: THEME.CHIP_BD, width: 0.5 },
    rectRadius: 0.04,
  });

  if (selected.length === 0) {
    slide.addText('Nenhuma variável selecionada para análise prioritária.', {
      x: RIGHT_X + 0.20, y: PT_Y + PT_H / 2 - 0.15, w: RIGHT_W - 0.40, h: 0.30,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const PT_PAD_L = 0.55;
    const PT_PAD_R = 0.20;
    const PT_PAD_T = 0.30;
    const PT_PAD_B = 0.50;
    const PT_PLOT_X = RIGHT_X + PT_PAD_L;
    const PT_PLOT_Y = PT_Y + PT_PAD_T;
    const PT_PLOT_W = RIGHT_W - PT_PAD_L - PT_PAD_R;
    const PT_PLOT_H = PT_H - PT_PAD_T - PT_PAD_B;

    // Eixos esquerdo + base
    slide.addShape('line', {
      x: PT_PLOT_X, y: PT_PLOT_Y, w: 0, h: PT_PLOT_H,
      line: { color: 'D1D5DB', width: 0.8 },
    });
    slide.addShape('line', {
      x: PT_PLOT_X, y: PT_PLOT_Y + PT_PLOT_H, w: PT_PLOT_W, h: 0,
      line: { color: 'D1D5DB', width: 0.8 },
    });

    const maxValue = Math.max(...selected.map(c => c.total), 1);

    // Y labels esquerda (impacto)
    slide.addText(String(Math.round(maxValue)), {
      x: RIGHT_X + 0.04, y: PT_PLOT_Y - 0.08, w: PT_PAD_L - 0.08, h: 0.14,
      fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, align: 'right',
    });
    slide.addText(String(Math.round(maxValue / 2)), {
      x: RIGHT_X + 0.04, y: PT_PLOT_Y + PT_PLOT_H / 2 - 0.07, w: PT_PAD_L - 0.08, h: 0.14,
      fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, align: 'right',
    });
    slide.addText('0', {
      x: RIGHT_X + 0.04, y: PT_PLOT_Y + PT_PLOT_H - 0.08, w: PT_PAD_L - 0.08, h: 0.14,
      fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, align: 'right',
    });

    const n = selected.length;
    const slotW = PT_PLOT_W / n;
    const barW = slotW * 0.62;
    const barGap = (slotW - barW) / 2;

    // Cores degradê navy → azul mais claro
    const navyShades = ['1E2D6E','2E3F8A','3F52A5','5066C0','6178D6','7388E0'];

    // Desenhar as barras
    selected.forEach((cause, i) => {
      const barX = PT_PLOT_X + i * slotW + barGap;
      const barH = (cause.total / maxValue) * PT_PLOT_H;
      const barY = PT_PLOT_Y + PT_PLOT_H - barH;
      const barColor = navyShades[Math.min(i, navyShades.length - 1)];

      slide.addShape('rect', {
        x: barX, y: barY, w: barW, h: barH,
        fill: { color: barColor },
        line: { type: 'none' }, rectRadius: 0.03,
      });

      // Valor real do impacto dentro da barra (no topo)
      slide.addText(String(Math.round(cause.total)), {
        x: barX, y: barY + 0.02, w: barW, h: 0.18,
        fontFace: 'Calibri', fontSize: 8, bold: true, color: 'FFFFFF',
        align: 'center',
      });

      // Nome da variável embaixo
      slide.addText(cause.name || '', {
        x: PT_PLOT_X + i * slotW + 0.02, y: PT_PLOT_Y + PT_PLOT_H + 0.06,
        w: slotW - 0.04, h: PT_PAD_B - 0.10,
        fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY,
        align: 'center', valign: 'top', shrinkText: true,
      });
    });
  }

  const fileName = `Matriz_Causa_Efeito_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
