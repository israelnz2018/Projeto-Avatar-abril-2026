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

function buildSlots(
  count: number,
  TX: number, TY: number, TW: number, TH: number,
  centerX: number, centerY: number
): { slots: Slot[]; pillFontSize: number } {
  if (count === 0) return { slots: [], pillFontSize: 10 };

  let pillW: number;
  let pillH: number;
  let pillFontSize: number;

  if (count <= 4) {
    pillW = 3.60; pillH = 0.62; pillFontSize = 11;
  } else if (count <= 8) {
    pillW = 3.40; pillH = 0.52; pillFontSize = 10;
  } else if (count <= 12) {
    pillW = 2.90; pillH = 0.46; pillFontSize = 9;
  } else if (count <= 16) {
    pillW = 2.50; pillH = 0.38; pillFontSize = 8;
  } else {
    pillW = 2.20; pillH = 0.34; pillFontSize = 7.5;
  }

  let topCount = 0;
  let bottomCount = 0;
  let midLeftCount = 0;
  let midRightCount = 0;

  if (count === 1) topCount = 1;
  else if (count === 2) { midLeftCount = 1; midRightCount = 1; }
  else if (count === 3) { topCount = 1; midLeftCount = 1; midRightCount = 1; }
  else if (count === 4) { topCount = 2; bottomCount = 2; }
  else if (count === 5) { topCount = 2; midLeftCount = 1; midRightCount = 1; bottomCount = 1; }
  else if (count === 6) { topCount = 3; bottomCount = 3; }
  else if (count === 7) { topCount = 3; midLeftCount = 1; midRightCount = 1; bottomCount = 2; }
  else if (count === 8) { topCount = 3; midLeftCount = 1; midRightCount = 1; bottomCount = 3; }
  else if (count <= 10) {
    topCount = Math.ceil(count / 2);
    bottomCount = count - topCount;
  } else if (count <= 12) {
    topCount = Math.ceil(count / 2);
    bottomCount = count - topCount;
  } else if (count <= 16) {
    topCount = Math.ceil(count / 4);
    bottomCount = Math.ceil(count / 4);
    const remaining = count - topCount - bottomCount;
    midLeftCount = Math.ceil(remaining / 2);
    midRightCount = remaining - midLeftCount;
  } else {
    // 17+: distribuir mais no topo e base, menos nas laterais
    const perTopBot = Math.ceil(count / 3);
    topCount = perTopBot;
    bottomCount = perTopBot;
    const remaining = count - topCount - bottomCount;
    midLeftCount = Math.ceil(remaining / 2);
    midRightCount = remaining - midLeftCount;
  }

  const slots: Slot[] = [];

  // TOP
  if (topCount > 0) {
    const topY = TY + 0.10;
    if (topCount === 1) {
      slots.push({ x: centerX - pillW / 2, y: topY, w: pillW, h: pillH });
    } else {
      const totalSpan = TW - pillW;
      const step = totalSpan / (topCount - 1);
      for (let i = 0; i < topCount; i++) {
        slots.push({ x: TX + i * step, y: topY, w: pillW, h: pillH });
      }
    }
  }

  // MID LEFT
  if (midLeftCount > 0) {
    const leftX = TX;
    const midSpace = TH * 0.45;
    const stepY = midLeftCount === 1 ? 0 : midSpace / (midLeftCount - 1);
    const startY = centerY - midSpace / 2;
    for (let i = 0; i < midLeftCount; i++) {
      slots.push({ x: leftX, y: startY + i * stepY, w: pillW, h: pillH });
    }
  }

  // MID RIGHT
  if (midRightCount > 0) {
    const rightX = TX + TW - pillW;
    const midSpace = TH * 0.45;
    const stepY = midRightCount === 1 ? 0 : midSpace / (midRightCount - 1);
    const startY = centerY - midSpace / 2;
    for (let i = 0; i < midRightCount; i++) {
      slots.push({ x: rightX, y: startY + i * stepY, w: pillW, h: pillH });
    }
  }

  // BOTTOM
  if (bottomCount > 0) {
    const botY = TY + TH - pillH - 0.10;
    if (bottomCount === 1) {
      slots.push({ x: centerX - pillW / 2, y: botY, w: pillW, h: pillH });
    } else {
      const totalSpan = TW - pillW;
      const step = totalSpan / (bottomCount - 1);
      for (let i = 0; i < bottomCount; i++) {
        slots.push({ x: TX + i * step, y: botY, w: pillW, h: pillH });
      }
    }
  }

  return { slots, pillFontSize };
}

export async function exportBrainstormingSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = ''
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const brainstormingType: string = data.brainstormingType || 'Ideias de projetos de melhoria';
  const brainstormingTopic: string = (data.brainstormingTopic || '').trim();
  const ideasRaw: Idea[] = Array.isArray(data.ideas) ? data.ideas : [];
  const ideas: Idea[] = ideasRaw.filter((i: any) => i && typeof i.text === 'string' && i.text.trim());

  const centerLabel = TYPE_TO_CENTER_LABEL[brainstormingType] || 'TÓPICO';

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
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
  const centerY = MAP_Y + MAP_H / 2;

  const RADIUS = ideas.length <= 6 ? 0.95 : ideas.length <= 12 ? 0.85 : 0.75;

  const { slots, pillFontSize } = buildSlots(
    ideas.length, TX, MAP_Y, TW, MAP_H, centerX, centerY
  );

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
      line: { color: THEME.BLUE, width: 0.75, transparency: 50 },
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

  if (ideas.length === 0) {
    slide.addText('Nenhuma ideia coletada ainda. Volte à ferramenta para registrar contribuições da equipe.', {
      x: TX + 1.50, y: centerY + RADIUS + 0.30, w: TW - 3.00, h: 0.40,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  }

  const fileName = `Brainstorming_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  await pres.writeFile({ fileName });
}
