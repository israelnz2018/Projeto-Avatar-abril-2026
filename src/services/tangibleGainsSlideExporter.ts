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
  const padrao = num(data?.custoPadrao ?? data?.unitValue);
  const baselineRows: any[] = Array.isArray(data?.baselineRows) ? data.baselineRows : [];
  const afterRows: any[] = Array.isArray(data?.afterRows) ? data.afterRows : [];

  const effCusto = (r: any): number => (r?.custo !== '' && r?.custo != null ? num(r.custo) : padrao);
  const qtyOf = (r: any): number => (r?.mode === 'coef' ? num(r.coef) * num(r.volume) : r?.mode === 'direct' ? num(r?.value) : 0);
  const valorMensal = (r: any): number => (r?.mode === 'money' ? num(r?.valorRS) : qtyOf(r) * effCusto(r));
  const hasData = (r: any): boolean => (r?.mode === 'coef' ? r.coef !== '' && r.volume !== '' : r?.mode === 'direct' ? (r?.value !== '' && r?.value != null) : (r?.valorRS !== '' && r?.valorRS != null));

  // ---- Baseline ----
  const qtys: number[] = [];
  const coefs: number[] = [];
  const valores: number[] = [];
  baselineRows.forEach((r) => {
    if (!hasData(r)) return;
    if (r.mode !== 'money') qtys.push(qtyOf(r));
    if (r.mode === 'coef') coefs.push(num(r.coef));
    valores.push(valorMensal(r));
  });
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const qtyAvg = avg(qtys);
  const coefAvg = coefs.length ? avg(coefs) : null;
  const valorAvg = avg(valores);

  // ---- Depois ----
  let accRS = 0;
  let accFis = 0;
  const afterCoefs: number[] = [];
  const series: { label: string; val: number; acc: number; valorMensal: number }[] = [];
  afterRows.forEach((r, i) => {
    if (!hasData(r)) return;
    const c = effCusto(r);
    const vm = valorMensal(r);
    let gFis = 0;
    let gRS = 0;
    if (r.mode === 'coef' && coefAvg != null) {
      gFis = dir * (coefAvg - num(r.coef)) * num(r.volume);
      gRS = gFis * c;
      afterCoefs.push(num(r.coef));
    } else if (r.mode === 'direct') {
      gFis = dir * (qtyAvg - qtyOf(r));
      gRS = gFis * c;
    } else {
      gRS = dir * (valorAvg - vm);
    }
    accFis += gFis;
    accRS += gRS;
    series.push({ label: (r.label || `M${i + 1}`).toString(), val: gRS, acc: accRS, valorMensal: vm });
  });
  const filled = series.length;
  const afterCoefAvg = afterCoefs.length ? avg(afterCoefs) : null;
  let pct: number | null = null;
  if (coefAvg != null && afterCoefAvg != null && coefAvg !== 0) pct = (dir * (coefAvg - afterCoefAvg) / coefAvg) * 100;

  // ---- Slide ----
  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  // Sem fase fixa: a ferramenta pode ser usada em qualquer fase (quem decide é o usuário).
  // Na Apresentação Completa o rótulo real da fase vem de setPhaseLabelOverride.
  const slide = createSlide(pres, project, 'Ganhos Tangíveis do Projeto', '', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;

  slide.addText(
    [
      { text: `${indicator}  `, options: { bold: true, color: THEME.NAVY } },
      { text: `· ${unit} · ${direction === 'lower' ? 'menor é melhor' : 'maior é melhor'}`, options: { color: THEME.MUTED } },
    ],
    { x: TX, y: TY, w: TW, h: 0.24, fontFace: 'Calibri', fontSize: 10, valign: 'middle' }
  );

  // KPI cards
  const kY = TY + 0.32;
  const kH = 1.02;
  const gap = 0.18;
  const kW = (TW - gap * 3) / 4;
  const cards = [
    { lab: 'COEF. BASELINE → PÓS', big: coefAvg != null && afterCoefAvg != null ? `${fmt(coefAvg, 2)}→${fmt(afterCoefAvg, 2)}` : coefAvg != null ? fmt(coefAvg, 2) : '—', sub: 'eficiência técnica', hero: false, val: THEME.NAVY },
    { lab: 'MELHORIA', big: pct != null ? `${fmt(pct, 1)}%` : '—', sub: 'no indicador', hero: false, val: pct != null && pct >= 0 ? GAIN : THEME.NAVY },
    { lab: 'GANHO MÉDIO / MÊS', big: filled ? brl(accRS / filled) : '—', sub: `${filled} ${filled === 1 ? 'mês' : 'meses'}`, hero: false, val: GAIN },
    { lab: 'GANHO ACUMULADO', big: brl(accRS), sub: `≈ ${fmt(accFis, 0)} ${unit} ${direction === 'lower' ? 'evitados' : 'a mais'}`, hero: true, val: 'FFFFFF' },
  ];
  cards.forEach((c, i) => {
    const x = TX + i * (kW + gap);
    slide.addShape('rect', { x, y: kY, w: kW, h: kH, fill: { color: c.hero ? THEME.NAVY : THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.05 });
    slide.addText(c.lab, { x: x + 0.12, y: kY + 0.10, w: kW - 0.24, h: 0.20, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: c.hero ? '9CB0EE' : THEME.MUTED, charSpacing: 1 });
    slide.addText(c.big, { x: x + 0.12, y: kY + 0.30, w: kW - 0.24, h: 0.42, fontFace: 'Calibri', fontSize: 18, bold: true, color: c.val, valign: 'middle', shrinkText: true });
    slide.addText(c.sub, { x: x + 0.12, y: kY + 0.72, w: kW - 0.24, h: 0.22, fontFace: 'Calibri', fontSize: 8.5, color: c.hero ? 'C9D1F2' : THEME.MUTED });
  });

  // Chart (esq) + tabela (dir)
  const lowerY = kY + kH + 0.22;
  const bottomY = TY + TOOL_AREA.h;
  const chartX = TX;
  const chartW = 6.05;
  const tableX = TX + chartW + 0.30;
  const tableW = TW - chartW - 0.30;

  slide.addText('Ganho por mês (R$)', { x: chartX, y: lowerY, w: chartW, h: 0.24, fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY });

  const plotTop = lowerY + 0.32;
  const plotBottom = bottomY - 0.30;
  const plotH = plotBottom - plotTop;

  if (filled === 0) {
    slide.addText('Preencha as abas Antes e Depois para calcular os ganhos.', { x: chartX, y: plotTop + 0.4, w: chartW, h: 0.5, fontFace: 'Calibri', fontSize: 10, italic: true, color: THEME.MUTED });
  } else {
    const maxVal = Math.max(...series.map((s) => Math.abs(s.val)), 1);
    const n = series.length;
    const slot = chartW / n;
    const barW = Math.min(0.62, slot * 0.6);
    slide.addShape('line', { x: chartX, y: plotBottom, w: chartW, h: 0, line: { color: THEME.CHIP_BD, width: 1 } });
    series.forEach((s, i) => {
      const cx = chartX + i * slot + slot / 2;
      const h = Math.max(0.04, (Math.abs(s.val) / maxVal) * plotH);
      const barY = plotBottom - h;
      slide.addShape('rect', { x: cx - barW / 2, y: barY, w: barW, h, fill: { color: i >= n - Math.ceil(n / 2) ? THEME.BLUE : THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.02 });
      slide.addText(`R$${fmt(s.val / 1000, 1)}k`, { x: cx - slot / 2, y: barY - 0.22, w: slot, h: 0.20, fontFace: 'Calibri', fontSize: 7, bold: true, color: GAIN, align: 'center' });
      slide.addText(s.label, { x: cx - slot / 2, y: plotBottom + 0.03, w: slot, h: 0.18, fontFace: 'Calibri', fontSize: 7, color: THEME.MUTED, align: 'center' });
    });
  }

  const head = ['Mês', 'Valor mês (R$)', 'Ganho (R$)', 'Acum. (R$)'].map((t) => ({
    text: t, options: { bold: true, color: 'FFFFFF', fill: { color: THEME.NAVY }, fontSize: 8, align: 'center' as const, valign: 'middle' as const },
  }));
  const bodyRows = series.slice(0, 13).map((s) => [
    { text: s.label, options: { fontSize: 8, color: THEME.INK, align: 'left' as const } },
    { text: brl(s.valorMensal), options: { fontSize: 8, color: THEME.INK, align: 'right' as const } },
    { text: brl(s.val), options: { fontSize: 8, color: GAIN, bold: true, align: 'right' as const } },
    { text: brl(s.acc), options: { fontSize: 8, color: GAIN, bold: true, align: 'right' as const, fill: { color: 'E6F4EE' } } },
  ]);
  const rows = bodyRows.length ? [head, ...bodyRows] : [head, [{ text: '(sem dados)', options: { colspan: 4, italic: true, color: THEME.MUTED, fontSize: 8, align: 'center' as const } }]];
  slide.addTable(rows as any, {
    x: tableX, y: lowerY, w: tableW, colW: [tableW * 0.22, tableW * 0.26, tableW * 0.26, tableW * 0.26],
    border: { type: 'solid', color: 'E2E6F0', pt: 0.5 }, valign: 'middle', rowH: 0.24,
  });

  const fileName = `Ganhos_Tangiveis_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
