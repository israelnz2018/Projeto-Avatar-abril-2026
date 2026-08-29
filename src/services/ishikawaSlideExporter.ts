import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export async function exportIshikawaSlide(
  project: Project,
  toolData: { problem?: string; causes?: Record<string, string[]> },
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const causes = toolData.causes || {};

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
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
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: 'C7D2FF',
    align: 'center', charSpacing: 2,
  });
  slide.addText(toolData.problem || '(problema não informado)', {
    x: TX + TW - PROB_W + 0.10, y: SPINE_Y - PROB_H / 2 + 0.24,
    w: PROB_W - 0.20, h: PROB_H - 0.30,
    fontFace: 'Calibri', fontSize: 10, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', shrinkText: true,
  });

  // Categorias 6M — 3 em cima, 3 embaixo. Cada categoria tem uma ESPINHA
  // diagonal saindo da dorsal; o badge fica na ponta e as causas ficam ao
  // longo/ao lado da diagonal (estética clássica de espinha de peixe).
  const BONE_W = 1.65;
  const BONE_H = 0.30;

  // 3 pontos de ancoragem na dorsal (onde cada espinha diagonal encosta).
  const spineSpan = SPINE_END - SPINE_START;
  const anchorXs = [
    SPINE_START + spineSpan * 0.24,
    SPINE_START + spineSpan * 0.52,
    SPINE_START + spineSpan * 0.80,
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

  // Geometria da diagonal: badge deslocado pra esquerda do ponto de ancoragem,
  // criando o "\" (top) e "/" (bottom) que atravessa a dorsal.
  const DIAG_DX = 1.30;           // deslocamento horizontal do badge vs âncora
  const BADGE_GAP_Y = 0.10;       // folga vertical entre badge e borda da área
  const TOP_BADGE_Y = TY + BADGE_GAP_Y;
  const BOT_BADGE_Y = TY + TH - BONE_H - BADGE_GAP_Y;

  const drawBone = (cat: { name: string; col: number }, isTop: boolean) => {
    const anchorX = anchorXs[cat.col];
    const badgeY = isTop ? TOP_BADGE_Y : BOT_BADGE_Y;
    // Badge à esquerda da âncora; ponta da diagonal encosta na dorsal.
    const badgeX = anchorX - DIAG_DX - BONE_W / 2;

    // Espinha diagonal: da ponta do badge (lado direito, borda interna) até a âncora na dorsal.
    const x1 = badgeX + BONE_W;                       // saída do badge
    const y1 = isTop ? badgeY + BONE_H : badgeY;      // borda do badge voltada à dorsal
    const x2 = anchorX;
    const y2 = SPINE_Y;
    const needsFlip = (x2 < x1 && y2 < y1) || (x2 > x1 && y2 > y1);
    slide.addShape('line', {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
      line: { color: THEME.NAVY, width: 1.1 },
      flipV: needsFlip,
    });

    // Badge da categoria (na ponta externa da espinha)
    slide.addShape('rect', {
      x: badgeX, y: badgeY, w: BONE_W, h: BONE_H,
      fill: { color: THEME.NAVY },
      line: { type: 'none' }, rectRadius: 0.04,
    });
    slide.addText(cat.name, {
      x: badgeX, y: badgeY, w: BONE_W, h: BONE_H,
      fontFace: 'Calibri', fontSize: 9.5, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle',
    });

    // Causas: dispostas ao LADO DIREITO da espinha diagonal, entre o badge e a dorsal.
    const key = Object.keys(causes).find(k => normalize(k) === normalize(cat.name));
    const raw = key ? causes[key] : null;
    const list = Array.isArray(raw)
      ? raw.filter((c: string) => c && typeof c === 'string' && c.trim()).slice(0, 5)
      : [];
    if (list.length === 0) return;

    // Caixa de causas ancorada logo à direita do badge, na direção da dorsal.
    // CAUSE_SHIFT_LEFT puxa o bloco inteiro (as 6 categorias) mais pro lado do
    // badge, em vez de ficar espalhado até quase encostar na espinha dorsal.
    const CAUSE_SHIFT_LEFT = 0.35;
    const CW = DIAG_DX + BONE_W * 0.55;   // largura da coluna de causas
    const cx = badgeX + BONE_W - 0.05 - CAUSE_SHIFT_LEFT;
    const CH = Math.abs(SPINE_Y - (isTop ? badgeY + BONE_H : badgeY)) - 0.04;
    const cy = isTop ? badgeY + BONE_H + 0.02 : badgeY - CH - 0.02;

    const items = list.map(c => ({
      text: c,
      options: { bullet: { code: '2022' } },
    }));
    slide.addText(items, {
      x: cx, y: cy, w: CW, h: CH,
      fontFace: 'Calibri', fontSize: 8, color: THEME.INK,
      valign: 'middle', paraSpaceAfter: 2,
      shrinkText: true,
    });
  };

  TOP_ROW.forEach(c => drawBone(c, true));
  BOT_ROW.forEach(c => drawBone(c, false));

  const fileName = `Espinha_de_Peixe_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
