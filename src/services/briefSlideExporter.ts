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

  const gridY = TY + BANNER_H + 0.16;
  const gridBottom = TY + TH;          // fim da área da ferramenta; abaixo disso é a
                                       // faixa da ANÁLISE EXECUTIVA, que é padrão de
                                       // todos os PPTs e não pode ser tocada aqui.
  const COL_GAP = 0.24;
  const ROW_GAP = 0.14;
  const CARD_W = (TW - COL_GAP) / 2;
  const RIGHT_X = TX + CARD_W + COL_GAP;

  // Desenha um card de resposta na posição/altura pedidas.
  const drawCard = (card: { label: string; value: string }, cx: number, cy: number, ch: number) => {
    slide.addShape('rect', {
      x: cx, y: cy, w: CARD_W, h: ch,
      fill: { color: 'F0F2FA' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
    });
    const labelH = 0.20;
    slide.addText(card.label.toUpperCase(), {
      x: cx + 0.12, y: cy + 0.06, w: CARD_W - 0.24, h: labelH,
      fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
      charSpacing: 0.5, valign: 'middle',
    });
    slide.addText(card.value, {
      x: cx + 0.12, y: cy + 0.06 + labelH, w: CARD_W - 0.24, h: ch - labelH - 0.14,
      fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK,
      valign: 'top', shrinkText: true,
    });
  };

  // Empilha uma lista de cards numa coluna, dividindo a altura disponível por igual.
  // O teto evita que uma coluna com 1 ou 2 respostas vire uma caixa gigante e vazia:
  // nesse caso os cards ficam no topo, com o tamanho natural.
  const MAX_CARD_H = 1.30;
  const drawColumn = (lista: typeof cards, cx: number, topY: number, altura: number) => {
    if (lista.length === 0) return;
    const ch = Math.min((altura - (lista.length - 1) * ROW_GAP) / lista.length, MAX_CARD_H);
    lista.forEach((card, i) => drawCard(card, cx, topY + i * (ch + ROW_GAP), ch));
  };

  if (images.length === 0) {
    // ── SEM FOTO: layout de sempre, intocado — 2 colunas preenchidas por linha ──
    const gridH = TH - BANNER_H - 0.16;
    if (cards.length > 0) {
      const rows = Math.ceil(cards.length / 2);
      const CARD_H = (gridH - (rows - 1) * ROW_GAP) / rows;
      cards.forEach((card, idx) => {
        const cx = TX + (idx % 2) * (CARD_W + COL_GAP);
        const cy = gridY + Math.floor(idx / 2) * (CARD_H + ROW_GAP);
        drawCard(card, cx, cy, CARD_H);
      });
    }
  } else {
    // ── COM FOTO: a coluna da direita cede a parte de baixo para as imagens ──
    // As fotos descem até o fim da área da ferramenta (logo acima da análise
    // executiva), ganhando bem mais altura do que numa faixa horizontal.
    const IMG_H = 2.45;
    const imgY = gridBottom - IMG_H;

    const alturaEsq = gridBottom - gridY;
    const alturaDir = imgY - 0.16 - gridY;

    // Divide os cards na proporção da altura de cada coluna, para as duas ficarem
    // cheias e com cards de altura parecida — a direita naturalmente leva menos.
    const nDir = Math.max(
      0,
      Math.min(cards.length - 1, Math.round((cards.length * alturaDir) / (alturaEsq + alturaDir)))
    );

    const esq: typeof cards = [];
    const dir: typeof cards = [];
    cards.forEach((card) => {
      if (dir.length < nDir && esq.length > dir.length) dir.push(card);
      else esq.push(card);
    });

    drawColumn(esq, TX, gridY, alturaEsq);
    drawColumn(dir, RIGHT_X, gridY, alturaDir);

    // 1 foto ocupa a área inteira; 2 fotos dividem essa mesma área, lado a lado.
    const imgGapX = 0.14;
    const usadas = images.slice(0, 2);
    const imgW = (CARD_W - (usadas.length - 1) * imgGapX) / usadas.length;

    usadas.forEach((img, idx) => {
      const ix = RIGHT_X + idx * (imgW + imgGapX);
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
