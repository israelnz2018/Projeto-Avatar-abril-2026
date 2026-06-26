import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(str: string): string {
  const d = parseDate(str);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '').replace(/^\w/, c => c.toUpperCase());
}

export async function exportProjectTimelineSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');

  const phases = (Array.isArray(toolData?.phases) ? toolData.phases : []) as Array<{
    id: string; name: string; startDate: string; endDate: string;
  }>;

  // Calcular início e fim globais do projeto
  const allDates: Date[] = [];
  phases.forEach(p => {
    const s = parseDate(p.startDate);
    const e = parseDate(p.endDate);
    if (s) allDates.push(s);
    if (e) allDates.push(e);
  });

  const projectStart = allDates.length
    ? new Date(Math.min(...allDates.map(d => d.getTime())))
    : new Date();
  const projectEnd = allDates.length
    ? new Date(Math.max(...allDates.map(d => d.getTime())))
    : new Date(projectStart.getTime() + 180 * 24 * 60 * 60 * 1000);

  const totalDays = Math.max(diffDays(projectStart, projectEnd), 1);
  const totalWeeks = Math.round(totalDays / 7);
  const totalMonths = Math.round(totalDays / 30);

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'Cronograma Macro — DMAIC', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;

  // Layout interno — ROW_H dinâmico para preencher TOOL_AREA
  const LABEL_W   = 1.20;
  const CHART_X   = TX + LABEL_W + 0.10;
  const CHART_W   = TW - LABEL_W - 0.10;
  const TH        = TOOL_AREA.h;
  const HEADER_H  = 0.28;
  const SUMMARY_H = 0.28;
  const ROW_GAP   = 0.08;
  const nPhases   = Math.max(phases.length, 1);
  const ROW_H     = Math.min(
    Math.max((TH - HEADER_H - SUMMARY_H - 0.20) / nPhases - ROW_GAP, 0.34),
    0.90,
  );
  const BAR_H = ROW_H * 0.64;

  // Gera lista de meses entre projectStart e projectEnd
  const months: Date[] = [];
  const cursor = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1);
  const endMonth = new Date(projectEnd.getFullYear(), projectEnd.getMonth(), 1);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Helper: converte data em posição X no chart
  const dateToX = (d: Date): number => {
    const days = diffDays(projectStart, d);
    return CHART_X + (days / totalDays) * CHART_W;
  };

  // Header com label "FASE"
  slide.addText('FASE', {
    x: TX, y: TY, w: LABEL_W, h: HEADER_H,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED,
    valign: 'middle',
  });

  // Labels dos meses
  months.forEach(m => {
    const mx = dateToX(m);
    slide.addText(monthLabel(m), {
      x: mx, y: TY, w: 0.60, h: HEADER_H,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: '6B7280',
      valign: 'middle',
    });
    // Linha de grade — só desenha se houver fases (evita linha de altura zero,
    // que dispara erro de reparo no PowerPoint quando phases.length === 0).
    if (phases.length > 0) {
      slide.addShape('line', {
        x: mx, y: TY + HEADER_H, w: 0, h: (ROW_H + ROW_GAP) * phases.length,
        line: { color: 'E8ECF4', width: 0.5 },
      });
    }
  });

  // Linha base horizontal
  slide.addShape('line', {
    x: CHART_X, y: TY + HEADER_H, w: CHART_W, h: 0,
    line: { color: 'E8ECF4', width: 0.8 },
  });

  // Barras das fases
  phases.forEach((phase, i) => {
    const rowY = TY + HEADER_H + i * (ROW_H + ROW_GAP);
    const barY = rowY + (ROW_H - BAR_H) / 2;

    // Label da fase (alinhado à direita)
    slide.addText(phase.name, {
      x: TX, y: rowY, w: LABEL_W, h: ROW_H,
      fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY,
      align: 'right', valign: 'middle',
    });

    // Faixa zebra de fundo
    if (i % 2 === 0) {
      slide.addShape('rect', {
        x: CHART_X, y: rowY, w: CHART_W, h: ROW_H,
        fill: { color: 'F8F9FC' }, line: { type: 'none' },
      });
    }

    const s = parseDate(phase.startDate);
    const e = parseDate(phase.endDate);
    if (!s || !e) return;

    const barX = dateToX(s);
    const barW = Math.max(dateToX(e) - barX, 0.10);

    // Barra — mesma cor para todas as fases
    slide.addShape('rect', {
      x: barX, y: barY, w: barW, h: BAR_H,
      fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
    });
  });

  // Faixa de resumo
  const summaryY = TY + HEADER_H + phases.length * (ROW_H + ROW_GAP) + 0.10;
  slide.addShape('rect', {
    x: TX, y: summaryY, w: TW, h: 0.26,
    fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03,
  });
  slide.addText('Duração total do projeto:', {
    x: TX + 0.14, y: summaryY, w: 2.20, h: 0.26,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle',
  });
  slide.addText(
    `${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'}   ·   ${fmtDate(phases[0]?.startDate)} → ${fmtDate(phases[phases.length - 1]?.endDate)}   ·   ${totalWeeks} semanas`,
    {
      x: TX + 2.40, y: summaryY, w: TW - 2.54, h: 0.26,
      fontFace: 'Calibri', fontSize: 7.5, color: THEME.INK, valign: 'middle',
    }
  );

  const fileName = `Cronograma_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
