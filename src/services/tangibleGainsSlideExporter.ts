import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const GAIN = '12805C'; // verde semântico — só ganho
const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

const num = (s: any): number => {
  if (typeof s === 'number') return s;
  if (s == null || s === '') return 0;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const fmt = (n: number, dec = 0): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const brl = (n: number): string => `R$ ${fmt(n, 0)}`;

export async function exportTangibleGainsSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const indicator: string = (data?.indicator || 'Indicador').toString();
  const unit: string = (data?.unit || 'un').toString();
  const direction: string = data?.direction === 'higher' ? 'higher' : 'lower';
  const dir = direction === 'lower' ? 1 : -1;
  const uv = num(data?.unitValue);
  const useRS = uv > 0;
  const baselineRows: any[] = Array.isArray(data?.baselineRows) ? data.baselineRows : [];
  const afterRows: any[] = Array.isArray(data?.afterRows) ? data.afterRows : [];

  // ---- Baseline ----
  const monthVals: number[] = [];
  const coefVals: number[] = [];
  baselineRows.forEach((r) => {
    if (r?.mode === 'coef') {
      if (r.coef !== '' && r.volume !== '') {
        monthVals.push(num(r.coef) * num(r.volume));
        coefVals.push(num(r.coef));
      }
    } else if (r?.value !== '' && r?.value != null) {
      monthVals.push(num(r.value));
    }
  });
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const valueAvg = avg(monthVals);
  const coefAvg = coefVals.length ? avg(coefVals) : null;

  // ---- Depois ----
  let accFis = 0;
  let accRS = 0;
  const afterCoefs: number[] = [];
  const afterVals: number[] = [];
  const series: { label: string; val: number; acc: number }[] = [];
  afterRows.forEach((r, i) => {
    const hasData = r?.mode === 'coef' ? r.coef !== '' && r.volume !== '' : r?.value !== '' && r?.value != null;
    if (!hasData) return;
    let gFis = 0;
    if (r.mode === 'coef' && coefAvg != null) {
      gFis = dir * (coefAvg - num(r.coef)) * num(r.volume);
      afterCoefs.push(num(r.coef));
    } else {
      const v = r.mode === 'coef' ? num(r.coef) * num(r.volume) : num(r.value);
      gFis = dir * (valueAvg - v);
      afterVals.push(v);
    }
    accFis += gFis;
    if (useRS) accRS += gFis * uv;
    series.push({ label: (r.label || `M${i + 1}`).toString(), val: useRS ? gFis * uv : gFis, acc: useRS ? accRS : accFis });
  });
  const filled = series.length;
  const afterCoefAvg = afterCoefs.length ? avg(afterCoefs) : null;
  const afterValAvg = afterVals.length ? avg(afterVals) : null;
  let pct: number | null = null;
  if (coefAvg != null && afterCoefAvg != null && coefAvg !== 0) pct = (dir * (coefAvg - afterCoefAvg) / coefAvg) * 100;
  else if (afterValAvg != null && valueAvg !== 0) pct = (dir * (valueAvg - afterValAvg) / valueAvg) * 100;

  // ---- Slide ----
  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'Ganhos Tangíveis do Projeto', 'Controlar', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;

  // Linha do indicador
  slide.addText(
    [
      { text: `${indicator}  `, options: { bold: true, color: THEME.NAVY } },
      { text: `· ${unit} · ${direction === 'lower' ? 'menor é melhor' : 'maior é melhor'}${useRS ? ` · R$ ${fmt(uv, 2)}/${unit}` : ''}`, options: { color: THEME.MUTED } },
    ],
    { x: TX, y: TY, w: TW, h: 0.24, fontFace: 'Calibri', fontSize: 10, valign: 'middle' }
  );

  // ---- KPI cards ----
  const kY = TY + 0.32;
  const kH = 1.02;
  const gap = 0.18;
  const kW = (TW - gap * 3) / 4;
  const cards = [
    { lab: 'ANTES · BASELINE', big: coefAvg != null ? fmt(coefAvg, 2) : fmt(valueAvg, 0), sub: coefAvg != null ? `${unit}/vol` : `${unit}/mês`, hero: false, val: THEME.NAVY },
    { lab: 'DEPOIS · MÉDIA', big: afterCoefAvg != null ? fmt(afterCoefAvg, 2) : afterValAvg != null ? fmt(afterValAvg, 0) : '—', sub: pct != null ? `${fmt(pct, 1)}% melhor` : '', hero: false, val: pct != null && pct >= 0 ? GAIN : THEME.NAVY },
    { lab: 'GANHO MÉDIO / MÊS', big: filled ? (useRS ? brl(accRS / filled) : `${fmt(accFis / filled, 0)}`) : '—', sub: `${filled} ${filled === 1 ? 'mês' : 'meses'}`, hero: false, val: GAIN },
    { lab: 'GANHO ACUMULADO', big: useRS ? brl(accRS) : `${fmt(accFis, 0)} ${unit}`, sub: useRS ? `≈ ${fmt(accFis, 0)} ${unit}` : '', hero: true, val: 'FFFFFF' },
  ];
  cards.forEach((c, i) => {
    const x = TX + i * (kW + gap);
    slide.addShape('rect', { x, y: kY, w: kW, h: kH, fill: { color: c.hero ? THEME.NAVY : THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.05 });
    slide.addText(c.lab, { x: x + 0.12, y: kY + 0.10, w: kW - 0.24, h: 0.20, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: c.hero ? '9CB0EE' : THEME.MUTED, charSpacing: 1 });
    slide.addText(c.big, { x: x + 0.12, y: kY + 0.30, w: kW - 0.24, h: 0.42, fontFace: 'Calibri', fontSize: 18, bold: true, color: c.val, valign: 'middle', shrinkText: true });
    if (c.sub) slide.addText(c.sub, { x: x + 0.12, y: kY + 0.72, w: kW - 0.24, h: 0.22, fontFace: 'Calibri', fontSize: 8.5, color: c.hero ? 'C9D1F2' : THEME.MUTED });
  });

  // ---- Chart (esquerda) + Tabela (direita) ----
  const lowerY = kY + kH + 0.22; // ~2.58
  const bottomY = TY + TOOL_AREA.h; // 6.26
  const chartX = TX;
  const chartW = 6.05;
  const tableX = TX + chartW + 0.30;
  const tableW = TW - chartW - 0.30;

  slide.addText(`Ganho por mês ${useRS ? '(R$)' : `(${unit})`}`, { x: chartX, y: lowerY, w: chartW, h: 0.24, fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY });

  const plotTop = lowerY + 0.32;
  const plotBottom = bottomY - 0.30;
  const plotH = plotBottom - plotTop;

  if (filled === 0) {
    slide.addText('Preencha as abas Antes e Depois para calcular os ganhos.', {
      x: chartX, y: plotTop + 0.4, w: chartW, h: 0.5, fontFace: 'Calibri', fontSize: 10, italic: true, color: THEME.MUTED,
    });
  } else {
    const maxVal = Math.max(...series.map((s) => Math.abs(s.val)), 1);
    const n = series.length;
    const slot = chartW / n;
    const barW = Math.min(0.62, slot * 0.6);
    // eixo base
    slide.addShape('line', { x: chartX, y: plotBottom, w: chartW, h: 0, line: { color: THEME.CHIP_BD, width: 1 } });
    series.forEach((s, i) => {
      const cx = chartX + i * slot + slot / 2;
      const h = Math.max(0.04, (Math.abs(s.val) / maxVal) * plotH);
      const barX = cx - barW / 2;
      const barY = plotBottom - h;
      slide.addShape('rect', { x: barX, y: barY, w: barW, h, fill: { color: i >= n - Math.ceil(n / 2) ? THEME.BLUE : THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.02 });
      slide.addText(useRS ? `R$${fmt(s.val / 1000, 1)}k` : fmt(s.val, 0), { x: cx - slot / 2, y: barY - 0.22, w: slot, h: 0.20, fontFace: 'Calibri', fontSize: 7, bold: true, color: GAIN, align: 'center' });
      slide.addText(s.label, { x: cx - slot / 2, y: plotBottom + 0.03, w: slot, h: 0.18, fontFace: 'Calibri', fontSize: 7, color: THEME.MUTED, align: 'center' });
    });
  }

  // Tabela (direita)
  const head = ['Mês', `Ganho ${unit}`, 'Ganho R$', 'Acum. R$'].map((t) => ({
    text: t,
    options: { bold: true, color: 'FFFFFF', fill: { color: THEME.NAVY }, fontSize: 8, align: 'center' as const, valign: 'middle' as const },
  }));
  const bodyRows = series.slice(0, 13).map((s, i) => {
    const gFisVal = useRS && uv ? s.val / uv : s.val;
    return [
      { text: s.label, options: { fontSize: 8, color: THEME.INK, align: 'left' as const } },
      { text: fmt(gFisVal, 0), options: { fontSize: 8, color: THEME.INK, align: 'right' as const } },
      { text: useRS ? brl(s.val) : '—', options: { fontSize: 8, color: GAIN, bold: true, align: 'right' as const } },
      { text: useRS ? brl(s.acc) : fmt(s.acc, 0), options: { fontSize: 8, color: GAIN, bold: true, align: 'right' as const, fill: { color: 'E6F4EE' } } },
    ];
  });
  const rows = bodyRows.length ? [head, ...bodyRows] : [head, [{ text: '(sem dados)', options: { colspan: 4, italic: true, color: THEME.MUTED, fontSize: 8, align: 'center' as const } }]];
  slide.addTable(rows as any, {
    x: tableX, y: lowerY, w: tableW, colW: [tableW * 0.24, tableW * 0.24, tableW * 0.26, tableW * 0.26],
    border: { type: 'solid', color: 'E2E6F0', pt: 0.5 }, valign: 'middle', rowH: 0.24,
  });

  const fileName = `Ganhos_Tangiveis_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
