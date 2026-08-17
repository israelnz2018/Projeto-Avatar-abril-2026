import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface ProjectAction {
  id: string;
  label: string;
  description: string;
  effort: number;
  impact: number;
}

type Quadrant = 'quickwin' | 'strategic' | 'low' | 'avoid';

function getQuadrant(effort: number, impact: number): Quadrant {
  // Escala 1-5; ponto médio = 3
  const isHighImpact = impact >= 3.5;
  const isLowEffort = effort <= 2.5;
  if (isLowEffort && isHighImpact) return 'quickwin';
  if (!isLowEffort && isHighImpact) return 'strategic';
  if (isLowEffort && !isHighImpact) return 'low';
  return 'avoid';
}

function getQuadrantColor(q: Quadrant): string {
  if (q === 'quickwin') return '16A34A';
  if (q === 'strategic') return '0033CC';
  if (q === 'low') return '9CA3AF';
  return 'EF4444';
}

export async function exportEffortImpactSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { title?: string; phase?: 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control'; pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);
  const allActions: ProjectAction[] = Array.isArray(data.actions) ? data.actions : [];
  const actions = allActions.filter(a => a && (a.description || '').trim());

  const quickWinCount = actions.filter(a => getQuadrant(a.effort, a.impact) === 'quickwin').length;

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const slideTitle = options.title || 'Esforço × Benefício';
  const slidePhase = options.phase || 'Improve';
  const slide = createSlide(pres, project, slideTitle, slidePhase, aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // ── BANNER ──
  const BANNER_H = 0.30;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('PRIORIZAÇÃO DE AÇÕES PELO QUADRANTE ESFORÇO × BENEFÍCIO', {
    x: TX + 0.18, y: TY, w: TW - 4.20, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8.5, bold: true, color: 'FFFFFF',
    charSpacing: 2, valign: 'middle',
  });
  const summary = actions.length === 0
    ? 'nenhuma ação registrada'
    : `${actions.length} ${actions.length === 1 ? 'ação mapeada' : 'ações mapeadas'} · ${quickWinCount} quick ${quickWinCount === 1 ? 'win' : 'wins'}`;
  slide.addText(summary, {
    x: TX + TW - 4.00, y: TY, w: 3.82, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ── COLUNA ESQUERDA: tabela de ações ──
  const MAIN_Y = TY + BANNER_H + 0.12;
  const MAIN_H = TH - BANNER_H - 0.12;
  const LEFT_W = TW * 0.42;
  const RIGHT_X = TX + LEFT_W + 0.20;
  const RIGHT_W = TW - LEFT_W - 0.20;

  slide.addText('AÇÕES MAPEADAS', {
    x: TX, y: MAIN_Y, w: LEFT_W, h: 0.18,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: '6B7AAB',
    charSpacing: 2,
  });

  const tblY = MAIN_Y + 0.20;
  const HEADER_H = 0.22;
  slide.addShape('rect', {
    x: TX, y: tblY, w: LEFT_W, h: HEADER_H,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
  });

  // Larguras de coluna fixas somando LEFT_W (margens internas de 0.10 cada lado).
  const COL_ID_W = 0.34;
  const COL_EFF_W = 0.62;
  const COL_IMP_W = 0.62;
  const COL_QW_W = 0.40;
  const PAD_L = 0.10;
  const PAD_R = 0.10;
  const COL_DESC_W = LEFT_W - PAD_L - PAD_R - COL_ID_W - COL_EFF_W - COL_IMP_W - COL_QW_W;

  const COL_ID_X = TX + PAD_L;
  const COL_DESC_X = COL_ID_X + COL_ID_W;
  const COL_EFF_X = COL_DESC_X + COL_DESC_W;
  const COL_IMP_X = COL_EFF_X + COL_EFF_W;
  const COL_QW_X = COL_IMP_X + COL_IMP_W;

  slide.addText('ID', { x: COL_ID_X, y: tblY, w: COL_ID_W, h: HEADER_H, fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('DESCRIÇÃO', { x: COL_DESC_X, y: tblY, w: COL_DESC_W, h: HEADER_H, fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('ESF.', { x: COL_EFF_X, y: tblY, w: COL_EFF_W, h: HEADER_H, fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY, align: 'center', valign: 'middle' });
  slide.addText('IMP.', { x: COL_IMP_X, y: tblY, w: COL_IMP_W, h: HEADER_H, fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY, align: 'center', valign: 'middle' });

  if (actions.length === 0) {
    slide.addText('Nenhuma ação registrada nesta ferramenta.', {
      x: TX, y: tblY + HEADER_H + 0.40, w: LEFT_W, h: 0.30,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const bodyY = tblY + HEADER_H;
    const availableH = MAIN_Y + MAIN_H - bodyY;
    const rowH = Math.min(0.28, Math.max(0.22, availableH / Math.max(actions.length, 1)));
    const fontSize = rowH < 0.24 ? 6.5 : 7;

    let rowY = bodyY;
    actions.forEach((a, idx) => {
      if (rowY + rowH > MAIN_Y + MAIN_H) return;

      const isZebra = idx % 2 === 0;
      if (isZebra) {
        slide.addShape('rect', {
          x: TX, y: rowY, w: LEFT_W, h: rowH,
          fill: { color: 'F8F9FC' }, line: { type: 'none' },
        });
      }

      slide.addText(a.label || `X${idx + 1}`, {
        x: COL_ID_X, y: rowY, w: COL_ID_W, h: rowH,
        fontFace: 'Calibri', fontSize, bold: true, color: THEME.BLUE, valign: 'middle',
      });
      slide.addText(a.description || '—', {
        x: COL_DESC_X, y: rowY, w: COL_DESC_W, h: rowH,
        fontFace: 'Calibri', fontSize, color: THEME.NAVY, valign: 'middle', shrinkText: true,
      });
      slide.addText(String(a.effort ?? '-'), {
        x: COL_EFF_X, y: rowY, w: COL_EFF_W, h: rowH,
        fontFace: 'Calibri', fontSize, bold: true, color: THEME.INK, align: 'center', valign: 'middle',
      });
      slide.addText(String(a.impact ?? '-'), {
        x: COL_IMP_X, y: rowY, w: COL_IMP_W, h: rowH,
        fontFace: 'Calibri', fontSize, bold: true, color: THEME.INK, align: 'center', valign: 'middle',
      });

      // Chip Quick Win (centralizado dentro da coluna QW)
      const q = getQuadrant(a.effort, a.impact);
      if (q === 'quickwin') {
        const chipW = 0.30;
        const chipX = COL_QW_X + (COL_QW_W - chipW) / 2;
        slide.addShape('rect', {
          x: chipX, y: rowY + 0.04, w: chipW, h: rowH - 0.08,
          fill: { color: 'DCFCE7' }, line: { type: 'none' }, rectRadius: 0.03,
        });
        slide.addText('QW', {
          x: chipX, y: rowY, w: chipW, h: rowH,
          fontFace: 'Calibri', fontSize: 6, bold: true, color: '16A34A',
          align: 'center', valign: 'middle',
        });
      }

      rowY += rowH;
    });

    // Legenda QW
    slide.addText('QW = Quick Win (baixo esforço, alto benefício)', {
      x: TX, y: MAIN_Y + MAIN_H - 0.16, w: LEFT_W, h: 0.14,
      fontFace: 'Calibri', fontSize: 6, color: THEME.MUTED, italic: true,
    });
  }

  // ── COLUNA DIREITA: scatter com 4 quadrantes ──
  slide.addText('QUADRANTES DE PRIORIZAÇÃO', {
    x: RIGHT_X, y: MAIN_Y, w: RIGHT_W, h: 0.18,
    fontFace: 'Calibri', fontSize: 8, bold: true, color: '6B7AAB',
    charSpacing: 2,
  });

  const SC_Y = MAIN_Y + 0.20;
  const SC_H = MAIN_H - 0.20;
  slide.addShape('rect', {
    x: RIGHT_X, y: SC_Y, w: RIGHT_W, h: SC_H,
    fill: { color: 'F8F9FC' }, line: { color: 'E8ECF4', width: 0.5 }, rectRadius: 0.04,
  });

  const SC_PAD_L = 0.40;
  const SC_PAD_R = 0.16;
  const SC_PAD_T = 0.30;
  const SC_PAD_B = 0.30;
  const PX = RIGHT_X + SC_PAD_L;
  const PY = SC_Y + SC_PAD_T;
  const PW = RIGHT_W - SC_PAD_L - SC_PAD_R;
  const PH = SC_H - SC_PAD_T - SC_PAD_B;

  // Eixos
  slide.addShape('line', { x: PX, y: PY, w: 0, h: PH, line: { color: 'D1D5DB', width: 0.8 } });
  slide.addShape('line', { x: PX, y: PY + PH, w: PW, h: 0, line: { color: 'D1D5DB', width: 0.8 } });

  // Linhas dos quadrantes (no meio)
  slide.addShape('line', { x: PX + PW / 2, y: PY, w: 0, h: PH, line: { color: 'E8ECF4', width: 0.6 } });
  slide.addShape('line', { x: PX, y: PY + PH / 2, w: PW, h: 0, line: { color: 'E8ECF4', width: 0.6 } });

  // Labels dos quadrantes
  slide.addText('★ QUICK WINS', {
    x: PX + 0.06, y: PY + 0.04, w: PW / 2 - 0.12, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: '16A34A',
  });
  slide.addText('PROJETOS ESTRATÉGICOS', {
    x: PX + PW / 2 + 0.06, y: PY + 0.04, w: PW / 2 - 0.12, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.BLUE, align: 'right',
  });
  slide.addText('MENOR PRIORIDADE', {
    x: PX + 0.06, y: PY + PH - 0.20, w: PW / 2 - 0.12, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: '9CA3AF',
  });
  slide.addText('EVITAR', {
    x: PX + PW / 2 + 0.06, y: PY + PH - 0.20, w: PW / 2 - 0.12, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: 'EF4444', align: 'right',
  });

  // Eixo X
  slide.addText('ESFORÇO →', {
    x: PX, y: PY + PH + 0.04, w: PW, h: 0.14,
    fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, align: 'center',
  });

  // IMPACTO empilhado verticalmente
  const impactoLetters = ['I','M','P','A','C','T','O'];
  const letterH = PH / impactoLetters.length;
  impactoLetters.forEach((letter, i) => {
    slide.addText(letter, {
      x: RIGHT_X + 0.06, y: PY + i * letterH, w: 0.22, h: letterH,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.MUTED,
      align: 'center', valign: 'middle',
    });
  });

  // Plotar pontos (escala 1-5)
  if (actions.length > 0) {
    // Anti-colisão: agrupar por posição
    const positionGroups = new Map<string, ProjectAction[]>();
    actions.forEach(a => {
      const ex = Math.max(1, Math.min(5, a.effort));
      const im = Math.max(1, Math.min(5, a.impact));
      const key = `${ex.toFixed(1)}_${im.toFixed(1)}`;
      if (!positionGroups.has(key)) positionGroups.set(key, []);
      positionGroups.get(key)!.push(a);
    });

    const dotR = 0.16;
    actions.forEach((a) => {
      const ex = Math.max(1, Math.min(5, a.effort));
      const im = Math.max(1, Math.min(5, a.impact));
      const key = `${ex.toFixed(1)}_${im.toFixed(1)}`;
      const group = positionGroups.get(key)!;
      const idxInGroup = group.findIndex(x => x === a);
      const groupSize = group.length;
      const spacing = dotR * 2.2;
      const offsetX = (idxInGroup - (groupSize - 1) / 2) * spacing;

      // Mapeamento 1-5 para 0-1 dentro do plot
      const px = PX + ((ex - 1) / 4) * PW + offsetX;
      const py = PY + PH - ((im - 1) / 4) * PH;

      const q = getQuadrant(a.effort, a.impact);
      const color = getQuadrantColor(q);

      slide.addShape('ellipse', {
        x: px - dotR, y: py - dotR, w: dotR * 2, h: dotR * 2,
        fill: { color }, line: { type: 'none' },
      });
      slide.addText(a.label || '?', {
        x: px - dotR, y: py - dotR, w: dotR * 2, h: dotR * 2,
        fontFace: 'Calibri', fontSize: 7, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle',
      });
    });
  }

  const fileName = `Esforco_x_Beneficio_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
