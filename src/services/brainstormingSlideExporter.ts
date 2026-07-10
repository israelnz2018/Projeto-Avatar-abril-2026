import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface Idea {
  id?: string;
  text: string;
  category?: string;
  author?: string;
}

const TYPE_TO_CENTER_LABEL: Record<string, string> = {
  'Ideias de projetos de melhoria': 'OPORTUNIDADE',
  'Problema pra resolver': 'PROBLEMA',
  'Identificar melhor solução': 'DESAFIO',
  'Identificação de riscos': 'CONTEXTO',
};

type Slot = { x: number; y: number; w: number; h: number };

// Limites de layout (estilo sol/radial):
//   - até 5 ideias no TOPO e até 5 embaixo (BASE)
//   - excedente (>10) vai para as LATERAIS (esquerda/direita)
//   - nunca empilhar: cada região respeita um gap fixo entre caixas
const MAX_TOP = 5;
const MAX_BOTTOM = 5;
const GAP = 0.14;              // espaço mínimo entre caixas vizinhas
const H_MARGIN = 0.10;         // recuo do topo/base da área
const SIDE_LANE_W = 2.30;      // largura reservada nas laterais

/**
 * Distribui `count` ideias entre 4 regiões (topo, base, esquerda, direita)
 * sem sobreposição. Enche topo (máx 5) e base (máx 5) primeiro; o excedente
 * vai para as laterais. Se ainda assim não couber, limita ao que cabe e
 * reporta `overflow` (número de ideias não exibidas).
 */
function buildSlots(
  count: number,
  TX: number, TY: number, TW: number, TH: number,
  centerX: number, centerY: number
): { slots: Slot[]; pillFontSize: number; overflow: number } {
  if (count <= 0) return { slots: [], pillFontSize: 10, overflow: 0 };

  // Dimensões das caixas encolhem conforme a contagem, com mínimo legível.
  let pillW: number;
  let pillH: number;
  let pillFontSize: number;

  if (count <= 4) {
    pillW = 3.60; pillH = 0.62; pillFontSize = 11;
  } else if (count <= 8) {
    pillW = 3.30; pillH = 0.54; pillFontSize = 10;
  } else if (count <= 12) {
    pillW = 2.95; pillH = 0.46; pillFontSize = 9;
  } else if (count <= 16) {
    pillW = 2.60; pillH = 0.40; pillFontSize = 8;
  } else {
    pillW = 2.30; pillH = 0.36; pillFontSize = 7.5;
  }

  // ---- Capacidade por região (nº de caixas que cabem SEM colidir) ----
  // Topo/base: caixas lado a lado na horizontal.
  const perRowFit = Math.max(1, Math.floor((TW + GAP) / (pillW + GAP)));
  const topCap = Math.min(MAX_TOP, perRowFit);
  const bottomCap = Math.min(MAX_BOTTOM, perRowFit);

  // Laterais: caixas empilhadas na vertical, deixando espaço central livre
  // (evita colidir com o círculo). Usa ~40% da altura em cada lateral.
  const sideSpan = TH * 0.80;
  const sideCap = Math.max(1, Math.floor((sideSpan + GAP) / (pillH + GAP)));

  // ---- Quantos vão para cada região ----
  let topCount = 0;
  let bottomCount = 0;
  let leftCount = 0;
  let rightCount = 0;

  let remaining = count;

  // 1) Enche topo e base (equilibrado), respeitando o máx de 5 e a capacidade.
  const rowTarget = Math.min(topCap + bottomCap, remaining);
  topCount = Math.min(topCap, Math.ceil(rowTarget / 2));
  bottomCount = Math.min(bottomCap, rowTarget - topCount);
  remaining -= topCount + bottomCount;

  // 2) Excedente vai para as laterais (dividido esquerda/direita).
  if (remaining > 0) {
    const sideTarget = Math.min(sideCap * 2, remaining);
    leftCount = Math.min(sideCap, Math.ceil(sideTarget / 2));
    rightCount = Math.min(sideCap, sideTarget - leftCount);
    remaining -= leftCount + rightCount;
  }

  // 3) O que sobrar não cabe sem sobrepor → vira nota "+N ideias".
  const overflow = remaining;

  const slots: Slot[] = [];

  // Distribui N caixas horizontalmente numa faixa [x0, x0+spanW], centralizadas.
  const layoutRow = (n: number, y: number) => {
    if (n <= 0) return;
    const totalW = n * pillW + (n - 1) * GAP;
    const startX = centerX - totalW / 2;
    for (let i = 0; i < n; i++) {
      slots.push({ x: startX + i * (pillW + GAP), y, w: pillW, h: pillH });
    }
  };

  // Distribui N caixas verticalmente numa lateral, centradas verticalmente.
  const layoutSide = (n: number, x: number) => {
    if (n <= 0) return;
    const totalH = n * pillH + (n - 1) * GAP;
    const startY = centerY - totalH / 2;
    for (let i = 0; i < n; i++) {
      slots.push({ x, y: startY + i * (pillH + GAP), w: pillW, h: pillH });
    }
  };

  // TOPO
  layoutRow(topCount, TY + H_MARGIN);

  // BASE
  layoutRow(bottomCount, TY + TH - pillH - H_MARGIN);

  // LATERAL ESQUERDA (encostada na borda esquerda da área)
  layoutSide(leftCount, TX);

  // LATERAL DIREITA (encostada na borda direita da área)
  layoutSide(rightCount, TX + TW - pillW);

  return { slots, pillFontSize, overflow };
}

export async function exportBrainstormingSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const brainstormingType: string = data.brainstormingType || 'Ideias de projetos de melhoria';
  const brainstormingTopic: string = (data.brainstormingTopic || '').trim();
  const ideasRaw: Idea[] = Array.isArray(data.ideas) ? data.ideas : [];
  const ideas: Idea[] = ideasRaw.filter((i: any) => i && typeof i.text === 'string' && i.text.trim());

  const centerLabel = TYPE_TO_CENTER_LABEL[brainstormingType] || 'TÓPICO';

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'Brainstorming', 'Improve', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // BANNER
  const BANNER_H = 0.36;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(brainstormingType.toUpperCase(), {
    x: TX + 0.18, y: TY, w: TW - 4.00, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 10, bold: true, color: 'FFFFFF',
    charSpacing: 2, valign: 'middle',
  });
  slide.addText(`${ideas.length} ${ideas.length === 1 ? 'ideia coletada' : 'ideias coletadas'}`, {
    x: TX + TW - 3.50, y: TY, w: 3.32, h: BANNER_H,
    fontFace: 'Calibri', fontSize: 9, color: 'D1D5DB',
    align: 'right', valign: 'middle',
  });

  // ÁREA DO MAPA
  const MAP_Y = TY + BANNER_H + 0.15;
  const MAP_H = TH - BANNER_H - 0.15;
  const centerX = TX + TW / 2;

  const RADIUS = ideas.length <= 6 ? 0.95 : ideas.length <= 12 ? 0.85 : 0.75;

  // Primeiro cálculo para saber se haverá nota de excedente no rodapé.
  const probe = buildSlots(ideas.length, TX, MAP_Y, TW, MAP_H, centerX, MAP_Y + MAP_H / 2);

  // Se houver excedente, reserva uma faixa de rodapé (0.24") para a nota
  // "+N ideias", recalculando o layout na área reduzida (evita sobreposição).
  const FOOTER_H = 0.24;
  const effMapH = probe.overflow > 0 ? MAP_H - FOOTER_H : MAP_H;
  const centerY = MAP_Y + effMapH / 2;
  const { slots, pillFontSize, overflow } =
    probe.overflow > 0
      ? buildSlots(ideas.length, TX, MAP_Y, TW, effMapH, centerX, centerY)
      : probe;

  // CONECTORES — só desenha se a linha tem comprimento >= 0.10" (evita XML quebrado)
  ideas.forEach((_, i) => {
    if (i >= slots.length) return;
    const slot = slots[i];
    const pillCx = slot.x + slot.w / 2;
    const pillCy = slot.y + slot.h / 2;

    const dx = pillCx - centerX;
    const dy = pillCy - centerY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Só desenha se a linha for longa o suficiente
    if (length < 0.10) return;

    // Calcula ponto de saída na BORDA do círculo central (não do centro)
    const angle = Math.atan2(dy, dx);
    const startX = centerX + Math.cos(angle) * RADIUS;
    const startY = centerY + Math.sin(angle) * RADIUS;

    // Calcula ponto de entrada na borda da pílula
    const endX = pillCx - Math.cos(angle) * (slot.w / 2);
    const endY = pillCy - Math.sin(angle) * (slot.h / 2);

    const w = endX - startX;
    const h = endY - startY;

    // Validação final: garante que w ou h tem magnitude mínima
    if (Math.abs(w) < 0.05 && Math.abs(h) < 0.05) return;

    slide.addShape('line', {
      x: startX, y: startY, w, h,
      line: { color: '8AA0E5', width: 0.75 },
    });
  });

  // CÍRCULO CENTRAL
  slide.addShape('ellipse', {
    x: centerX - RADIUS, y: centerY - RADIUS, w: RADIUS * 2, h: RADIUS * 2,
    fill: { color: THEME.NAVY }, line: { color: THEME.BLUE, width: 1.5 },
  });

  slide.addText(centerLabel, {
    x: centerX - RADIUS, y: centerY - RADIUS + 0.18,
    w: RADIUS * 2, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: '8AA0E5',
    align: 'center', charSpacing: 2,
  });

  const topicText = brainstormingTopic || '(tópico não preenchido)';
  slide.addText(topicText, {
    x: centerX - RADIUS + 0.10, y: centerY - RADIUS + 0.42,
    w: RADIUS * 2 - 0.20, h: RADIUS * 2 - 0.55,
    fontFace: 'Calibri',
    fontSize: ideas.length <= 6 ? 11 : ideas.length <= 12 ? 10 : 9,
    bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', shrinkText: true,
    italic: !brainstormingTopic,
  });

  // PÍLULAS
  ideas.forEach((idea, i) => {
    if (i >= slots.length) return;
    const slot = slots[i];

    slide.addShape('rect', {
      x: slot.x, y: slot.y, w: slot.w, h: slot.h,
      fill: { color: 'EAF1F8' },
      line: { color: THEME.BLUE, width: 1.0 },
      rectRadius: slot.h / 2,
    });

    slide.addText(idea.text.replace(/X\d+[:-]\s*/i, '').trim(), {
      x: slot.x + 0.18, y: slot.y, w: slot.w - 0.36, h: slot.h,
      fontFace: 'Calibri', fontSize: pillFontSize, bold: true, color: THEME.NAVY,
      align: 'center', valign: 'middle', shrinkText: true,
    });
  });

  // NOTA DE EXCEDENTE — quando há mais ideias do que cabem sem sobrepor
  if (overflow > 0) {
    slide.addText(`+${overflow} ${overflow === 1 ? 'ideia' : 'ideias'} não exibida${overflow === 1 ? '' : 's'}`, {
      x: TX, y: MAP_Y + MAP_H - FOOTER_H, w: TW - 0.10, h: FOOTER_H,
      fontFace: 'Calibri', fontSize: 8, italic: true, color: THEME.MUTED,
      align: 'right', valign: 'middle',
    });
  }

  if (ideas.length === 0) {
    slide.addText('Nenhuma ideia coletada ainda. Volte à ferramenta para registrar contribuições da equipe.', {
      x: TX + 1.50, y: centerY + RADIUS + 0.30, w: TW - 3.00, h: 0.40,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  }

  const fileName = `Brainstorming_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
