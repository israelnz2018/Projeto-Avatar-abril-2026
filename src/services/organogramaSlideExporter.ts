import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// Aceita toolData direto, {toolData:{...}} ou {formData:{...}}.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.formData && typeof input.formData === 'object') return input.formData;
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface No {
  id: string;
  nome: string;
  area?: string;
  funcao?: string;
  critico?: boolean;
  contato?: 'nao-falei' | 'conheco' | 'boa-relacao';
  filhos?: No[];
}

// Achata a árvore por nível (BFS) e registra o vínculo pai→filho por posição.
interface FlatNode {
  no: No;
  level: number;
  parentKey: number | null; // índice no array flat do pai
  key: number;
}

function flatten(raizes: No[]): FlatNode[] {
  const out: FlatNode[] = [];
  let key = 0;
  // fila: { no, level, parentKey }
  const queue: Array<{ no: No; level: number; parentKey: number | null }> = [];
  raizes.forEach(r => queue.push({ no: r, level: 0, parentKey: null }));

  while (queue.length > 0) {
    const { no, level, parentKey } = queue.shift()!;
    const myKey = key++;
    out.push({ no, level, parentKey, key: myKey });
    const filhos = Array.isArray(no.filhos) ? no.filhos : [];
    filhos.forEach(f => {
      if (f && typeof f === 'object') queue.push({ no: f, level: level + 1, parentKey: myKey });
    });
  }
  return out;
}

export async function exportOrganogramaSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const raizes: No[] = Array.isArray(data.raizes)
    ? [...(data.raizes || [])].filter((n: any) => n && typeof n === 'object')
    : [];

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const slide = createSlide(pres, project, 'Organograma da Área', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  const flat = flatten(raizes);

  if (flat.length === 0) {
    slide.addText('(não preenchido)', {
      x: TX, y: TY + TH / 2 - 0.20, w: TW, h: 0.40,
      fontFace: 'Calibri', fontSize: 12, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
    const fileName = `Organograma_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
    if (!options.pres) await pres.writeFile({ fileName });
    return;
  }

  // ── Agrupa por nível ──────────────────────────────────
  const maxLevel = flat.reduce((m, f) => Math.max(m, f.level), 0);
  const byLevel: FlatNode[][] = [];
  for (let l = 0; l <= maxLevel; l++) {
    byLevel.push(flat.filter(f => f.level === l));
  }

  // Limita a profundidade visível ao que couber verticalmente.
  const LEVEL_GAP = 0.34;
  // Altura ideal de card entre 0.62 e 1.00, reduz se muitos níveis.
  const totalLevels = byLevel.length;
  const availPerLevel = (TH - (totalLevels - 1) * LEVEL_GAP) / totalLevels;
  const CARD_H = Math.min(1.00, Math.max(0.56, availPerLevel));
  const small = CARD_H < 0.80;

  // guarda a posição (centro x) de cada card por key, para desenhar as linhas
  const centerX: Record<number, number> = {};
  const cardTopY: Record<number, number> = {};
  const cardBottomY: Record<number, number> = {};

  byLevel.forEach((nodes, level) => {
    const rowY = TY + level * (CARD_H + LEVEL_GAP);
    const n = Math.max(nodes.length, 1);
    const CARD_GAP = 0.16;
    const cardW = Math.min(2.40, (TW - (n - 1) * CARD_GAP) / n);
    // centraliza a linha
    const rowW = n * cardW + (n - 1) * CARD_GAP;
    const startX = TX + (TW - rowW) / 2;

    nodes.forEach((fn, i) => {
      const cx = startX + i * (cardW + CARD_GAP);
      const no = fn.no;
      const isCritico = no.critico === true;

      centerX[fn.key] = cx + cardW / 2;
      cardTopY[fn.key] = rowY;
      cardBottomY[fn.key] = rowY + CARD_H;

      // Card
      slide.addShape('rect', {
        x: cx, y: rowY, w: cardW, h: CARD_H,
        fill: { color: isCritico ? THEME.CHIP_BG : THEME.LIGHT },
        line: { color: isCritico ? THEME.BLUE : THEME.CHIP_BD, width: isCritico ? 1.2 : 0.6 },
        rectRadius: 0.05,
      });

      const padX = 0.08;
      let ty = rowY + 0.06;

      // Chip CRÍTICO
      if (isCritico) {
        const chipW = 0.62;
        slide.addShape('rect', {
          x: cx + cardW - chipW - 0.06, y: rowY + 0.06, w: chipW, h: 0.16,
          fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.03,
        });
        slide.addText('CRÍTICO', {
          x: cx + cardW - chipW - 0.06, y: rowY + 0.06, w: chipW, h: 0.16,
          fontFace: 'Calibri', fontSize: 5.5, bold: true, color: 'FFFFFF',
          align: 'center', valign: 'middle', charSpacing: 1,
        });
      }

      // Nome (bold, NAVY)
      slide.addText(no.nome || '—', {
        x: cx + padX, y: ty, w: cardW - padX * 2 - (isCritico ? 0.60 : 0), h: 0.24,
        fontFace: 'Calibri', fontSize: small ? 8 : 9.5, bold: true, color: THEME.NAVY,
        valign: 'top', shrinkText: true,
      });
      ty += 0.26;

      // Função (menor, INK)
      if (no.funcao && no.funcao.trim()) {
        slide.addText(no.funcao, {
          x: cx + padX, y: ty, w: cardW - padX * 2, h: 0.22,
          fontFace: 'Calibri', fontSize: small ? 6.5 : 7.5, color: THEME.INK,
          valign: 'top', shrinkText: true,
        });
        ty += 0.22;
      }

      // Área (menor, MUTED)
      if (no.area && no.area.trim()) {
        slide.addText(no.area, {
          x: cx + padX, y: ty, w: cardW - padX * 2, h: 0.20,
          fontFace: 'Calibri', fontSize: small ? 6 : 7, color: THEME.MUTED,
          italic: true, valign: 'top', shrinkText: true,
        });
      }
    });
  });

  // ── Linhas finas NAVY do pai aos filhos ───────────────
  flat.forEach(fn => {
    if (fn.parentKey === null) return;
    const px = centerX[fn.parentKey];
    const py = cardBottomY[fn.parentKey];
    const cx = centerX[fn.key];
    const cy = cardTopY[fn.key];
    if (px === undefined || cx === undefined) return;

    const midY = (py + cy) / 2;

    // segmento vertical descendo do pai
    slide.addShape('line', {
      x: px, y: py, w: 0, h: midY - py,
      line: { color: THEME.NAVY, width: 0.75 },
    });
    // segmento horizontal até a coluna do filho
    slide.addShape('line', {
      x: Math.min(px, cx), y: midY, w: Math.abs(cx - px), h: 0,
      line: { color: THEME.NAVY, width: 0.75 },
    });
    // segmento vertical descendo até o filho
    slide.addShape('line', {
      x: cx, y: midY, w: 0, h: cy - midY,
      line: { color: THEME.NAVY, width: 0.75 },
    });
  });

  const fileName = `Organograma_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
