import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

const NODE_W_DEFAULT = 150;
const NODE_H_DEFAULT = 80;
const DECISION_W = 130;
const DECISION_H = 130;
const START_W = 100;
const START_H = 50;

// Largura fixa reservada para os labels das raias no slide (em polegadas)
const LANE_LABEL_W = 0.80;

function getNodeDims(n: any): { w: number; h: number } {
  if (n.type === 'decision') return { w: n.style?.width || DECISION_W, h: n.style?.height || DECISION_H };
  if (n.type === 'start' || n.type === 'end') return { w: n.style?.width || START_W, h: n.style?.height || START_H };
  if (n.type === 'lane') return { w: n.style?.width || 200, h: n.style?.height || 80 };
  return { w: n.style?.width || NODE_W_DEFAULT, h: n.style?.height || NODE_H_DEFAULT };
}

// ─────────────────────────────────────────────────────────
// Roteamento ortogonal: gera caminho em L (2 segmentos) ou Z (3 segmentos)
// entre dois nós, escolhendo automaticamente o melhor lado de saída
// ─────────────────────────────────────────────────────────
type Pt = { x: number; y: number };
type NodeRect = { cx: number; cy: number; x: number; y: number; w: number; h: number; type: string };

function pickSides(src: NodeRect, tgt: NodeRect): { sExit: 'top' | 'bottom' | 'left' | 'right'; tEnter: 'top' | 'bottom' | 'left' | 'right' } {
  const dx = tgt.cx - src.cx;
  const dy = tgt.cy - src.cy;
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  if (horizontal) {
    return {
      sExit: dx >= 0 ? 'right' : 'left',
      tEnter: dx >= 0 ? 'left' : 'right',
    };
  } else {
    return {
      sExit: dy >= 0 ? 'bottom' : 'top',
      tEnter: dy >= 0 ? 'top' : 'bottom',
    };
  }
}

function sidePoint(node: NodeRect, side: 'top' | 'bottom' | 'left' | 'right'): Pt {
  switch (side) {
    case 'top':    return { x: node.cx, y: node.y };
    case 'bottom': return { x: node.cx, y: node.y + node.h };
    case 'left':   return { x: node.x, y: node.cy };
    case 'right':  return { x: node.x + node.w, y: node.cy };
  }
}

// Gera os pontos de uma rota ortogonal (em L ou Z) entre origem e destino
function buildOrthogonalPath(src: NodeRect, tgt: NodeRect): Pt[] {
  const { sExit, tEnter } = pickSides(src, tgt);
  const p1 = sidePoint(src, sExit);
  const p2 = sidePoint(tgt, tEnter);

  // Caso simples: alinhados (mesmo X ou mesmo Y) → linha reta
  if (Math.abs(p1.x - p2.x) < 0.01 || Math.abs(p1.y - p2.y) < 0.01) {
    return [p1, p2];
  }

  // Caso L: saída horizontal e entrada vertical (ou vice-versa) → 1 cotovelo
  if ((sExit === 'left' || sExit === 'right') && (tEnter === 'top' || tEnter === 'bottom')) {
    return [p1, { x: p2.x, y: p1.y }, p2];
  }
  if ((sExit === 'top' || sExit === 'bottom') && (tEnter === 'left' || tEnter === 'right')) {
    return [p1, { x: p1.x, y: p2.y }, p2];
  }

  // Caso Z: saída e entrada na mesma orientação → 2 cotovelos pelo meio
  if (sExit === 'right' || sExit === 'left') {
    const midX = (p1.x + p2.x) / 2;
    return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
  } else {
    const midY = (p1.y + p2.y) / 2;
    return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
  }
}

export async function exportProcessMapSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');

  const rawData = toolData?.nodes ? toolData : (toolData?.toolData || {});
  const nodes: any[] = rawData?.nodes || [];
  const edges: any[] = rawData?.edges || [];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'Mapa do Processo', 'Analyze', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TW = TOOL_AREA.w;

  const LEGEND_H = 0.22;
  const MAP_H = TOOL_AREA.h - LEGEND_H - 0.12;
  const MAP_Y = TOOL_AREA.y;

  const lanes = nodes.filter(n => n.type === 'lane');
  const flowNodes = nodes.filter(n => n.type !== 'lane');

  if (flowNodes.length === 0) {
    slide.addText('Nenhum nó encontrado no mapa do processo.', {
      x: TX, y: MAP_Y + MAP_H / 2, w: TW, h: 0.30,
      fontFace: 'Calibri', fontSize: 10, color: THEME.MUTED, italic: true, align: 'center',
    });
    const fileName = `Mapa_do_Processo_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
    if (!options.pres) await pres.writeFile({ fileName });
    return;
  }

  // Calcular bounding box considerando TODOS os nós (lanes + flow)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const { w, h } = getNodeDims(n);
    const x = n.position?.x ?? 0;
    const y = n.position?.y ?? 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  });

  const bboxW = Math.max(maxX - minX, 1);
  const bboxH = Math.max(maxY - minY, 1);

  // Reservar coluna esquerda para os títulos das raias.
  // O fluxo é desenhado APENAS na área à direita dessa coluna.
  const flowAreaX = TX + LANE_LABEL_W;
  const flowAreaW = TW - LANE_LABEL_W;

  const scaleX = flowAreaW / bboxW;
  const scaleY = MAP_H / bboxH;
  const scale = Math.min(scaleX, scaleY) * 0.96;

  const scaledW = bboxW * scale;
  const scaledH = bboxH * scale;
  const offsetX = flowAreaX + (flowAreaW - scaledW) / 2;
  const offsetY = MAP_Y + (MAP_H - scaledH) / 2;

  const mapX = (x: number) => offsetX + (x - minX) * scale;
  const mapY = (y: number) => offsetY + (y - minY) * scale;
  const mapW = (w: number) => w * scale;
  const mapH = (h: number) => h * scale;

  // ── LANES ──
  // Desenhamos a faixa colorida da raia ESTENDIDA até o início do slide,
  // mas o LABEL ocupa a coluna fixa LANE_LABEL_W, e os flow nodes ficam
  // apenas na área à direita.
  lanes.forEach(lane => {
    const ly = mapY(lane.position?.y ?? 0);
    const { h } = getNodeDims(lane);
    const lh = mapH(h);

    // Faixa de fundo da raia: largura total do slide
    slide.addShape('rect', {
      x: TX, y: ly, w: TW, h: lh,
      fill: { color: 'F0F2FA' },
      line: { color: THEME.CHIP_BD, width: 0.5 },
      rectRadius: 0.02,
    });

    // Coluna do label (lado esquerdo, largura fixa)
    slide.addShape('rect', {
      x: TX, y: ly, w: LANE_LABEL_W, h: lh,
      fill: { color: 'EAF1F8' }, line: { type: 'none' },
      rectRadius: 0.02,
    });

    const label = lane.data?.label || 'Área';
    slide.addText(label, {
      x: TX + 0.04, y: ly, w: LANE_LABEL_W - 0.08, h: lh,
      fontFace: 'Calibri', fontSize: Math.max(Math.min(lh * 12, 9), 6),
      bold: true, color: THEME.NAVY, valign: 'middle', align: 'center',
      shrinkText: true,
    });

    // Linha divisória entre label e área de fluxo
    slide.addShape('line', {
      x: TX + LANE_LABEL_W, y: ly, w: 0, h: lh,
      line: { color: THEME.CHIP_BD, width: 0.5 },
    });
  });

  // ── FLOW NODES ──
  const nodeMap: Record<string, NodeRect> = {};

  flowNodes.forEach(n => {
    const { w, h } = getNodeDims(n);
    const nx = mapX(n.position?.x ?? 0);
    const ny = mapY(n.position?.y ?? 0);
    const nw = mapW(w);
    const nh = mapH(h);
    const cx = nx + nw / 2;
    const cy = ny + nh / 2;
    const label = n.data?.label || '';
    const fontSize = Math.max(Math.min(nw * 12, nh * 10, 9), 6);

    nodeMap[n.id] = { cx, cy, x: nx, y: ny, w: nw, h: nh, type: n.type };

    if (n.type === 'start' || n.type === 'end') {
      slide.addShape('ellipse', {
        x: nx, y: ny, w: nw, h: nh,
        fill: { color: THEME.NAVY }, line: { type: 'none' },
      });
      slide.addText(label, {
        x: nx, y: ny, w: nw, h: nh,
        fontFace: 'Calibri', fontSize, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle', shrinkText: true,
      });

    } else if (n.type === 'decision') {
      slide.addShape('diamond', {
        x: nx, y: ny, w: nw, h: nh,
        fill: { color: 'FEF9C3' }, line: { color: 'EAB308', width: 0.8 },
      });
      slide.addText(label, {
        x: nx + nw * 0.15, y: ny + nh * 0.15,
        w: nw * 0.70, h: nh * 0.70,
        fontFace: 'Calibri', fontSize, bold: true, color: 'CA8A04',
        align: 'center', valign: 'middle', shrinkText: true,
      });

    } else {
      slide.addShape('rect', {
        x: nx, y: ny, w: nw, h: nh,
        fill: { color: 'EAF1F8' }, line: { color: THEME.BLUE, width: 0.8 },
        rectRadius: 0.04,
      });
      slide.addText(label, {
        x: nx + 0.06, y: ny, w: nw - 0.12, h: nh,
        fontFace: 'Calibri', fontSize, bold: true, color: THEME.NAVY,
        align: 'center', valign: 'middle', shrinkText: true,
      });
    }
  });

  // ── EDGES (setas em L ortogonais) ──
  edges.forEach(edge => {
    const src = nodeMap[edge.source];
    const tgt = nodeMap[edge.target];
    if (!src || !tgt) return;

    const path = buildOrthogonalPath(src, tgt);
    if (path.length < 2) return;

    const lineColor = THEME.NAVY;
    const lineWidth = 1.2;

    // Desenha todos os segmentos exceto o último sem ponta de seta.
    // Pula segmentos degenerados (w e h ~zero), que disparam erro de reparo no PowerPoint.
    // A ponta de seta vai no último segmento NÃO-degenerado desenhado.
    const segs: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let i = 0; i < path.length - 1; i++) {
      const dw = path[i + 1].x - path[i].x;
      const dh = path[i + 1].y - path[i].y;
      if (Math.abs(dw) < 0.05 && Math.abs(dh) < 0.05) continue;
      segs.push({ x: path[i].x, y: path[i].y, w: dw, h: dh });
    }
    segs.forEach((s, i) => {
      const isLast = i === segs.length - 1;
      slide.addShape('line', {
        x: s.x, y: s.y, w: s.w, h: s.h,
        line: {
          color: lineColor,
          width: lineWidth,
          ...(isLast ? { endArrowType: 'triangle' as any } : {}),
        },
      });
    });

    // Label da seta (ex: Sim/Não) — posiciona no primeiro segmento
    const edgeLabel = edge.label || edge.data?.label || '';
    if (edgeLabel) {
      const p1 = path[0];
      const p2 = path[1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const isHorizontal = Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y);

      const labelColor =
        edgeLabel.toLowerCase() === 'sim' || edgeLabel.toLowerCase() === 'yes'
          ? '16A34A'
          : edgeLabel.toLowerCase() === 'não' || edgeLabel.toLowerCase() === 'nao' || edgeLabel.toLowerCase() === 'no'
            ? 'EF4444'
            : THEME.NAVY;

      slide.addText(edgeLabel, {
        x: midX - 0.22,
        y: isHorizontal ? midY - 0.18 : midY - 0.08,
        w: 0.44, h: 0.16,
        fontFace: 'Calibri', fontSize: 7, bold: true,
        color: labelColor,
        align: 'center', shrinkText: true,
      });
    }
  });

  // ── LEGENDA ──
  const legY = MAP_Y + MAP_H + 0.04;
  slide.addShape('rect', {
    x: TX, y: legY, w: TW, h: LEGEND_H,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.02,
  });

  let lx = TX + 0.14;

  slide.addShape('ellipse', { x: lx, y: legY + 0.05, w: 0.14, h: 0.14, fill: { color: THEME.NAVY }, line: { type: 'none' } });
  slide.addText('Início / Fim', { x: lx + 0.18, y: legY, w: 0.90, h: LEGEND_H, fontFace: 'Calibri', fontSize: 7, color: THEME.NAVY, valign: 'middle' });
  lx += 1.12;

  slide.addShape('rect', { x: lx, y: legY + 0.05, w: 0.22, h: 0.14, fill: { color: 'EAF1F8' }, line: { color: THEME.BLUE, width: 0.6 }, rectRadius: 0.02 });
  slide.addText('Atividade', { x: lx + 0.26, y: legY, w: 0.80, h: LEGEND_H, fontFace: 'Calibri', fontSize: 7, color: THEME.NAVY, valign: 'middle' });
  lx += 1.10;

  slide.addShape('diamond', { x: lx, y: legY + 0.03, w: 0.18, h: 0.18, fill: { color: 'FEF9C3' }, line: { color: 'EAB308', width: 0.6 } });
  slide.addText('Decisão', { x: lx + 0.22, y: legY, w: 0.70, h: LEGEND_H, fontFace: 'Calibri', fontSize: 7, color: THEME.NAVY, valign: 'middle' });
  lx += 0.96;

  slide.addShape('line', { x: lx, y: legY + 0.11, w: 0.30, h: 0, line: { color: THEME.NAVY, width: 1.2, endArrowType: 'triangle' as any } });
  slide.addText('Fluxo', { x: lx + 0.34, y: legY, w: 0.55, h: LEGEND_H, fontFace: 'Calibri', fontSize: 7, color: THEME.NAVY, valign: 'middle' });

  const fileName = `Mapa_do_Processo_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
