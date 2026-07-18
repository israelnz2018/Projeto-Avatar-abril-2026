import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const GAIN = '12805C'; // verde semântico — ganho real
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
  const custos: number[] = [];
  baselineRows.forEach((r) => {
    if (!hasData(r)) return;
    if (r.mode !== 'money') { qtys.push(qtyOf(r)); custos.push(effCusto(r)); }
    if (r.mode === 'coef') coefs.push(num(r.coef));
    valores.push(valorMensal(r));
  });
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const qtyAvg = avg(qtys);
  const coefAvg = coefs.length ? avg(coefs) : null;
  const valorAvg = avg(valores);
  const custoAvg = custos.length ? avg(custos) : padrao;
  // Preço congelado (histórico): informado manualmente ou média de custo da baseline.
  const precoCongelado = data?.precoCongelado !== '' && data?.precoCongelado != null ? num(data.precoCongelado) : custoAvg;

  // ---- Depois ----
  let accTeo = 0;
  let accReal = 0;
  let accFis = 0;
  const afterCoefs: number[] = [];
  const series: { label: string; teo: number; real: number; acc: number }[] = [];
  afterRows.forEach((r, i) => {
    if (!hasData(r)) return;
    const c = effCusto(r);
    const vm = valorMensal(r);
    let gFis = 0;
    let gTeo = 0;
    let gReal = 0;
    if (r.mode === 'money') {
      gReal = dir * (valorAvg - vm);
      gTeo = gReal;
    } else {
      if (r.mode === 'coef' && coefAvg != null) {
        gFis = dir * (coefAvg - num(r.coef)) * num(r.volume);
        afterCoefs.push(num(r.coef));
      } else {
        gFis = dir * (qtyAvg - qtyOf(r));
      }
      gTeo = gFis * precoCongelado;
      gReal = gFis * c;
    }
    accFis += gFis;
    accTeo += gTeo;
    accReal += gReal;
    series.push({ label: (r.label || `M${i + 1}`).toString(), teo: gTeo, real: gReal, acc: accReal });
  });
  const filled = series.length;
  const afterCoefAvg = afterCoefs.length ? avg(afterCoefs) : null;
  const efeitoPreco = accReal - accTeo;
  let pct: number | null = null;
  if (coefAvg != null && afterCoefAvg != null && coefAvg !== 0) pct = (dir * (coefAvg - afterCoefAvg) / coefAvg) * 100;

  // ---- Slide ----
  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  // Sem fase fixa: quem decide a fase é o usuário (a Apresentação Completa sobrescreve).
  const slide = createSlide(pres, project, 'Ganhos Tangíveis do Projeto', '', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;

  slide.addText(
    [
      { text: `${indicator}  `, options: { bold: true, color: THEME.NAVY } },
      { text: `· ${unit} · preço congelado R$ ${fmt(precoCongelado, 2)}/${unit}`, options: { color: THEME.MUTED } },
    ],
    { x: TX, y: TY, w: TW, h: 0.24, fontFace: 'Calibri', fontSize: 10, valign: 'middle' }
  );

  // KPI cards
  const kY = TY + 0.32;
  const kH = 1.02;
  const gap = 0.18;
  const kW = (TW - gap * 3) / 4;
  const cards = [
    { lab: 'MELHORIA DE EFICIÊNCIA', big: pct != null ? `${fmt(pct, 1)}%` : '—', sub: coefAvg != null && afterCoefAvg != null ? `${fmt(coefAvg, 2)}→${fmt(afterCoefAvg, 2)}` : 'no indicador', bg: THEME.LIGHT, labC: THEME.MUTED, valC: pct != null && pct >= 0 ? GAIN : THEME.NAVY, subC: THEME.MUTED },
    { lab: 'GANHO TEÓRICO ACUM.', big: brl(accTeo), sub: 'mérito do projeto', bg: THEME.NAVY, labC: '9CB0EE', valC: 'FFFFFF', subC: 'C9D1F2' },
    { lab: 'GANHO REAL ACUM.', big: brl(accReal), sub: 'entrou no caixa', bg: GAIN, labC: 'BFE6D6', valC: 'FFFFFF', subC: 'D7F0E6' },
    { lab: 'EFEITO PREÇO', big: `${efeitoPreco >= 0 ? '+' : ''}${brl(efeitoPreco)}`, sub: 'mercado, não o time', bg: THEME.LIGHT, labC: THEME.MUTED, valC: THEME.INK, subC: THEME.MUTED },
  ];
  cards.forEach((c, i) => {
    const x = TX + i * (kW + gap);
    slide.addShape('rect', { x, y: kY, w: kW, h: kH, fill: { color: c.bg }, line: { type: 'none' }, rectRadius: 0.05 });
    slide.addText(c.lab, { x: x + 0.12, y: kY + 0.10, w: kW - 0.24, h: 0.20, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: c.labC, charSpacing: 1 });
    slide.addText(c.big, { x: x + 0.12, y: kY + 0.30, w: kW - 0.24, h: 0.42, fontFace: 'Calibri', fontSize: 18, bold: true, color: c.valC, valign: 'middle', shrinkText: true });
    slide.addText(c.sub, { x: x + 0.12, y: kY + 0.72, w: kW - 0.24, h: 0.22, fontFace: 'Calibri', fontSize: 8.5, color: c.subC });
  });

  // Chart (esq) + tabela (dir)
  const lowerY = kY + kH + 0.22;
  const bottomY = TY + TOOL_AREA.h;
  const chartX = TX;
  const chartW = 5.85;
  const tableX = TX + chartW + 0.30;
  const tableW = TW - chartW - 0.30;

  slide.addText('Ganho por mês — teórico (navy) x real (verde)', { x: chartX, y: lowerY, w: chartW, h: 0.24, fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY });

  const plotTop = lowerY + 0.32;
  const plotBottom = bottomY - 0.30;
  const plotH = plotBottom - plotTop;

  if (filled === 0) {
    slide.addText('Preencha as abas Antes e Depois para calcular os ganhos.', { x: chartX, y: plotTop + 0.4, w: chartW, h: 0.5, fontFace: 'Calibri', fontSize: 10, italic: true, color: THEME.MUTED });
  } else {
    const maxVal = Math.max(...series.map((s) => Math.max(Math.abs(s.teo), Math.abs(s.real))), 1);
    const n = series.length;
    const slot = chartW / n;
    const barW = Math.min(0.26, slot * 0.32);
    slide.addShape('line', { x: chartX, y: plotBottom, w: chartW, h: 0, line: { color: THEME.CHIP_BD, width: 1 } });
    series.forEach((s, i) => {
      const cx = chartX + i * slot + slot / 2;
      const hT = Math.max(0.04, (Math.abs(s.teo) / maxVal) * plotH);
      const hR = Math.max(0.04, (Math.abs(s.real) / maxVal) * plotH);
      slide.addShape('rect', { x: cx - barW - 0.03, y: plotBottom - hT, w: barW, h: hT, fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.02 });
      slide.addShape('rect', { x: cx + 0.03, y: plotBottom - hR, w: barW, h: hR, fill: { color: GAIN }, line: { type: 'none' }, rectRadius: 0.02 });
      slide.addText(s.label, { x: cx - slot / 2, y: plotBottom + 0.03, w: slot, h: 0.18, fontFace: 'Calibri', fontSize: 7, color: THEME.MUTED, align: 'center' });
    });
  }

  const head = ['Mês', 'Teórico (R$)', 'Real (R$)', 'Acum. real'].map((t) => ({
    text: t, options: { bold: true, color: 'FFFFFF', fill: { color: THEME.NAVY }, fontSize: 8, align: 'center' as const, valign: 'middle' as const },
  }));
  const bodyRows = series.slice(0, 13).map((s) => [
    { text: s.label, options: { fontSize: 8, color: THEME.INK, align: 'left' as const } },
    { text: brl(s.teo), options: { fontSize: 8, color: THEME.BLUE, bold: true, align: 'right' as const } },
    { text: brl(s.real), options: { fontSize: 8, color: GAIN, bold: true, align: 'right' as const } },
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
