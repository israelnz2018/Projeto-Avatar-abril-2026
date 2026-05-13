import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

interface ObservationEntry {
  id: string;
  variable: string;
  operationalDefinition: string;
  identifiedCause: boolean;
  observationDescription: string;
  images?: string[];
}

const CARDS_PER_SLIDE = 4;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function drawObservationCard(
  slide: any,
  obs: ObservationEntry,
  x: number, y: number, w: number, h: number
) {
  const isConfirmed = !!obs.identifiedCause;
  const borderColor = isConfirmed ? THEME.BLUE : '9CA3AF';
  const titleColor = isConfirmed ? THEME.NAVY : '6B7280';
  const textColor = isConfirmed ? THEME.INK : '6B7280';

  // Card (borda colorida)
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: 'FFFFFF' },
    line: { color: borderColor, width: 1.0 },
    rectRadius: 0.06,
  });

  // Faixa lateral colorida
  slide.addShape('rect', {
    x, y, w: 0.06, h,
    fill: { color: borderColor }, line: { type: 'none' },
  });

  // ─── HEADER: nome variável + chip status ───
  const PAD_X = 0.16;
  const headerY = y + 0.06;

  // Chip de status (canto superior direito)
  const chipW = 0.78;
  const chipH = 0.20;
  const chipX = x + w - chipW - PAD_X;
  const chipBg = isConfirmed ? 'DCFCE7' : 'FEE2E2';
  const chipFg = isConfirmed ? '16A34A' : '991B1B';
  const chipLabel = isConfirmed ? 'CONFIRMADA' : 'DESCARTADA';

  slide.addShape('rect', {
    x: chipX, y: headerY, w: chipW, h: chipH,
    fill: { color: chipBg }, line: { type: 'none' }, rectRadius: 0.04,
  });
  slide.addText(chipLabel, {
    x: chipX, y: headerY, w: chipW, h: chipH,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: chipFg,
    align: 'center', valign: 'middle', charSpacing: 1,
  });

  // Nome da variável
  slide.addText(obs.variable || '(variável sem nome)', {
    x: x + PAD_X, y: headerY, w: chipX - x - PAD_X - 0.08, h: chipH,
    fontFace: 'Calibri', fontSize: 11, bold: true, color: titleColor,
    valign: 'middle', shrinkText: true,
  });

  // ─── DEFINIÇÃO OPERACIONAL ───
  const defY = headerY + chipH + 0.04;
  slide.addText(obs.operationalDefinition || '—', {
    x: x + PAD_X, y: defY, w: w - PAD_X * 2, h: 0.22,
    fontFace: 'Calibri', fontSize: 8, color: '9CA3AF', italic: true,
    valign: 'middle', shrinkText: true,
  });

  // ─── IMAGEM + OBSERVAÇÃO ───
  const bodyY = defY + 0.26;
  const bodyH = h - (bodyY - y) - 0.10;

  // Imagem
  const imgW = 1.60;
  const imgH = bodyH - 0.06;
  const imgX = x + PAD_X;
  const imgY = bodyY;

  const firstImg = (obs.images && obs.images.length > 0) ? obs.images[0] : null;
  if (firstImg && typeof firstImg === 'string' && firstImg.length > 100) {
    try {
      // Garante prefixo data:
      const imgData = firstImg.startsWith('data:') ? firstImg : `data:image/png;base64,${firstImg}`;
      slide.addImage({
        data: imgData,
        x: imgX, y: imgY, w: imgW, h: imgH,
        sizing: { type: 'cover', w: imgW, h: imgH },
      });
    } catch (err) {
      // Fallback: placeholder se imagem corrompida
      slide.addShape('rect', {
        x: imgX, y: imgY, w: imgW, h: imgH,
        fill: { color: 'F0F2FA' }, line: { color: 'E8ECF4', width: 0.5 },
        rectRadius: 0.04,
      });
      slide.addText('SEM FOTO', {
        x: imgX, y: imgY, w: imgW, h: imgH,
        fontFace: 'Calibri', fontSize: 7, color: '9CA3AF', bold: true,
        align: 'center', valign: 'middle', charSpacing: 1,
      });
    }
  } else {
    // Placeholder
    slide.addShape('rect', {
      x: imgX, y: imgY, w: imgW, h: imgH,
      fill: { color: 'F0F2FA' }, line: { color: 'E8ECF4', width: 0.5 },
      rectRadius: 0.04,
    });
    slide.addText('SEM FOTO', {
      x: imgX, y: imgY, w: imgW, h: imgH,
      fontFace: 'Calibri', fontSize: 7, color: '9CA3AF', bold: true,
      align: 'center', valign: 'middle', charSpacing: 1,
    });
  }

  // Texto da observação (ao lado da imagem)
  const obsTextX = imgX + imgW + 0.16;
  const obsTextW = w - (obsTextX - x) - PAD_X;

  slide.addText('OBSERVAÇÃO REGISTRADA', {
    x: obsTextX, y: imgY, w: obsTextW, h: 0.16,
    fontFace: 'Calibri', fontSize: 6.5, bold: true, color: titleColor,
    charSpacing: 1,
  });
  slide.addText(obs.observationDescription || '(sem descrição registrada)', {
    x: obsTextX, y: imgY + 0.16, w: obsTextW, h: imgH - 0.16,
    fontFace: 'Calibri', fontSize: 8.5, color: textColor,
    italic: !obs.observationDescription,
    valign: 'top', shrinkText: true,
  });
}

export async function exportDirectObservationSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const allObservations: ObservationEntry[] = Array.isArray(data.observations) ? data.observations : [];
  // Filtra observações com pelo menos uma variável OU descrição preenchida
  const observations = allObservations.filter(obs =>
    obs && ((obs.variable && obs.variable.trim()) || (obs.observationDescription && obs.observationDescription.trim()))
  );

  const confirmedCount = observations.filter(o => o.identifiedCause).length;

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  // Paginação: cada slide tem até 4 cards (2x2)
  const pages = observations.length === 0 ? [[]] : chunk(observations, CARDS_PER_SLIDE);

  pages.forEach((pageObservations, pageIdx) => {
    const slideTitle = pages.length > 1
      ? `Observação Direta — Gemba (${pageIdx + 1}/${pages.length})`
      : 'Observação Direta — Gemba';
    const slide = createSlide(pres, project, slideTitle, 'Analyze', aiAnalysis);

    const TX = TOOL_AREA.x;
    const TY = TOOL_AREA.y;
    const TW = TOOL_AREA.w;
    const TH = TOOL_AREA.h;

    // ── BANNER ──
    const BANNER_H = 0.32;
    slide.addShape('rect', {
      x: TX, y: TY, w: TW, h: BANNER_H,
      fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
    });
    slide.addText('VALIDAÇÃO DE HIPÓTESES NO CHÃO DE FÁBRICA', {
      x: TX + 0.18, y: TY, w: TW - 4.50, h: BANNER_H,
      fontFace: 'Calibri', fontSize: 9.5, bold: true, color: 'FFFFFF',
      charSpacing: 2, valign: 'middle',
    });
    const summary = observations.length === 0
      ? 'nenhuma observação registrada'
      : `${observations.length} ${observations.length === 1 ? 'variável observada' : 'variáveis observadas'} · ${confirmedCount} ${confirmedCount === 1 ? 'confirmada' : 'confirmadas'}`;
    slide.addText(summary, {
      x: TX + TW - 4.30, y: TY, w: 4.12, h: BANNER_H,
      fontFace: 'Calibri', fontSize: 8.5, color: 'D1D5DB',
      align: 'right', valign: 'middle',
    });

    // ── ÁREA DOS CARDS (2x2) ──
    const GRID_Y = TY + BANNER_H + 0.12;
    const GRID_H = TH - BANNER_H - 0.12;
    const GAP = 0.12;
    const cardW = (TW - GAP) / 2;
    const cardH = (GRID_H - GAP) / 2;

    if (pageObservations.length === 0) {
      slide.addText('Nenhuma observação registrada nesta ferramenta.', {
        x: TX, y: GRID_Y + GRID_H / 2 - 0.20, w: TW, h: 0.40,
        fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
        align: 'center', valign: 'middle',
      });
    } else {
      pageObservations.forEach((obs, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = TX + col * (cardW + GAP);
        const cy = GRID_Y + row * (cardH + GAP);
        drawObservationCard(slide, obs, cx, cy, cardW, cardH);
      });
    }
  });

  const fileName = `Observacao_Gemba_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
