import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

// Aceita toolData direto ou {toolData:{...}}.
function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

// ATENÇÃO: não existem q9 nem q11 no schema.
const QUESTION_LABELS: Record<string, string> = {
  q1: 'Nome do processo',
  q2: 'Principal problema',
  q3: 'Principais envolvidos',
  q4: 'O que está dando errado',
  q5: 'Existe algum risco',
  q7: 'Existe meta clara',
  q8: 'O que vai melhorar',
  q10: 'Próximos passos',
  q12: 'Que tipo de ajuda precisa',
};

// Ordem dos cards (q6 é o headline, tratado à parte).
const CARD_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q7', 'q8', 'q10', 'q12'];

export async function exportBriefSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);
  const answers = (data.answers && typeof data.answers === 'object') ? data.answers : {};

  const projectTitle: string = (answers.q6 || '').toString().trim();
  // O aluno pode anexar até 2 fotos direto na ferramenta (independente das
  // respostas). O exportador nunca lia esse campo — o slide saía sem elas.
  const images: string[] = Array.isArray(data.images) ? data.images.filter((img: any) => typeof img === 'string' && img.length > 100) : [];

  const cards = CARD_ORDER
    .map((key) => ({ key, label: QUESTION_LABELS[key], value: (answers[key] || '').toString().trim() }))
    .filter((c) => c.value);

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const slide = createSlide(pres, project, 'Entendendo o Problema', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  // Vazio de verdade = sem respostas E sem foto. Só foto já é conteúdo — não pode
  // cair no branch "(não preenchido)" e perder a única coisa que o aluno anexou.
  if (!projectTitle && cards.length === 0 && images.length === 0) {
    slide.addText('(não preenchido)', {
      x: TX, y: TY + TH / 2 - 0.20, w: TW, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
    const fileName = `Entendendo_o_Problema_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
    if (!options.pres) await pres.writeFile({ fileName });
    return;
  }

  // ── HEADLINE (q6 = Título do Projeto) ──
  const BANNER_H = 0.50;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText('TÍTULO DO PROJETO', {
    x: TX + 0.20, y: TY + 0.05, w: TW - 0.40, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: '8AA0E5', charSpacing: 1.5, valign: 'middle',
  });
  slide.addText(projectTitle || '(sem título)', {
    x: TX + 0.20, y: TY + 0.19, w: TW - 0.40, h: BANNER_H - 0.24,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: 'FFFFFF',
    valign: 'middle', shrinkText: true,
  });

  // ── FOTOS (se o aluno anexou) — reserva uma faixa embaixo do grid de cards ──
  const IMG_H = images.length > 0 ? 1.55 : 0;
  const IMG_GAP = images.length > 0 ? 0.16 : 0;

  // ── GRID DE CARDS (2 colunas) ──
  const gridY = TY + BANNER_H + 0.16;
  const gridH = TH - BANNER_H - 0.16 - IMG_H - IMG_GAP;
  const COLS = 2;
  const COL_GAP = 0.24;
  const ROW_GAP = 0.14;
  const CARD_W = (TW - (COLS - 1) * COL_GAP) / COLS;

  if (cards.length > 0) {
    const rows = Math.ceil(cards.length / COLS);
    const CARD_H = (gridH - (rows - 1) * ROW_GAP) / rows;

    cards.forEach((card, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const cx = TX + col * (CARD_W + COL_GAP);
      const cy = gridY + row * (CARD_H + ROW_GAP);

      slide.addShape('rect', {
        x: cx, y: cy, w: CARD_W, h: CARD_H,
        fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
      });

      const labelH = 0.20;
      slide.addText(card.label.toUpperCase(), {
        x: cx + 0.12, y: cy + 0.06, w: CARD_W - 0.24, h: labelH,
        fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
        charSpacing: 0.5, valign: 'middle',
      });
      slide.addText(card.value, {
        x: cx + 0.12, y: cy + 0.06 + labelH, w: CARD_W - 0.24, h: CARD_H - labelH - 0.14,
        fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK,
        valign: 'top', shrinkText: true,
      });
    });
  }

  if (images.length > 0) {
    const imgY = gridY + gridH + IMG_GAP;
    const imgCols = Math.min(images.length, 2);
    const imgGapX = 0.16;
    const imgW = (TW - (imgCols - 1) * imgGapX) / imgCols;

    images.slice(0, 2).forEach((img, idx) => {
      const ix = TX + idx * (imgW + imgGapX);
      try {
        // Garante o prefixo data:image/png;base64, (sem ele o PPT quebra).
        const imgData = img.startsWith('data:') ? img : `data:image/png;base64,${img}`;
        slide.addImage({
          data: imgData,
          x: ix, y: imgY, w: imgW, h: IMG_H,
          sizing: { type: 'contain', w: imgW, h: IMG_H },
        });
      } catch (err) {
        console.error('[briefSlideExporter] erro ao adicionar imagem:', err);
        slide.addShape('rect', {
          x: ix, y: imgY, w: imgW, h: IMG_H,
          fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
        });
        slide.addText('(erro ao carregar imagem)', {
          x: ix, y: imgY, w: imgW, h: IMG_H,
          fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED, italic: true,
          align: 'center', valign: 'middle',
        });
      }
    });
  }

  const fileName = `Entendendo_o_Problema_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
