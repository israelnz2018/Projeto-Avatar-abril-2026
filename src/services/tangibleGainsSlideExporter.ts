import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const GAIN = '12805C'; // verde semântico — patamar depois / ganho
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
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

  // Métrica exibida: a mesma escolhida na aba Resultado (default = gasto em R$).
  const hasAnyCoef = baselineRows.concat(afterRows).some((r) => r?.mode === 'coef' && r?.coef !== '');
  let metric: string = data?.barMetric || (hasAnyCoef ? 'coef' : 'valor');
  if (metric === 'coef' && !hasAnyCoef) metric = 'valor';
  const money = metric === 'valor';
  const dec = metric === 'coef' ? 2 : 0;
  const metricNome = metric === 'coef' ? 'Coeficiente' : metric === 'qty' ? `Quantidade (${unit})` : 'Gasto mensal (R$)';
  const showVal = (n: number) => (money ? brl(n) : fmt(n, dec));

  // Valor do mês na métrica escolhida (null quando não se aplica).
  const metricVal = (r: any): number | null => {
    if (metric === 'coef') return r?.mode === 'coef' ? num(r.coef) : null;
    if (metric === 'qty') return r?.mode !== 'money' ? qtyOf(r) : null;
    return valorMensal(r);
  };

  const antes: { label: string; val: number }[] = [];
  const depois: { label: string; val: number }[] = [];
  baselineRows.forEach((r, i) => {
    if (!hasData(r)) return;
    const v = metricVal(r);
    if (v == null) return;
    antes.push({ label: (r.label || `A${i + 1}`).toString(), val: v });
  });
  afterRows.forEach((r, i) => {
    if (!hasData(r)) return;
    const v = metricVal(r);
    if (v == null) return;
    depois.push({ label: (r.label || `D${i + 1}`).toString(), val: v });
  });

  const antesAvg = antes.length ? avg(antes.map((x) => x.val)) : null;
  const depoisAvg = depois.length ? avg(depois.map((x) => x.val)) : null;
  const ganhoMes = antesAvg != null && depoisAvg != null ? dir * (antesAvg - depoisAvg) : null;

  // Ganho real acumulado (mesma conta da aba Depois) para o KPI.
  const coefs = baselineRows.filter((r) => hasData(r) && r.mode === 'coef').map((r) => num(r.coef));
  const coefAvg = coefs.length ? avg(coefs) : null;
  const qtyAvg = avg(baselineRows.filter((r) => hasData(r) && r.mode !== 'money').map((r) => qtyOf(r)));
  const valorAvgBase = avg(baselineRows.filter((r) => hasData(r)).map((r) => valorMensal(r)));
  let accReal = 0;
  afterRows.forEach((r) => {
    if (!hasData(r)) return;
    if (r.mode === 'money') { accReal += dir * (valorAvgBase - valorMensal(r)); return; }
    const gFis = r.mode === 'coef' && coefAvg != null
      ? dir * (coefAvg - num(r.coef)) * num(r.volume)
      : dir * (qtyAvg - qtyOf(r));
    accReal += gFis * effCusto(r);
  });

  // ---- Slide ----
  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project, 'Ganhos Tangíveis do Projeto', '', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;

  slide.addText(
    [
      { text: `${indicator}  `, options: { bold: true, color: THEME.NAVY } },
      { text: `· ${metricNome} · ${direction === 'lower' ? 'menor é melhor' : 'maior é melhor'}`, options: { color: THEME.MUTED } },
    ],
    { x: TX, y: TY, w: TW, h: 0.24, fontFace: 'Calibri', fontSize: 10, valign: 'middle' }
  );

  // ---- KPIs ----
  const kY = TY + 0.30;
  const kH = 0.92;
  const gap = 0.18;
  const kW = (TW - gap * 3) / 4;
  const cards = [
    { lab: 'MÉDIA ANTES', big: antesAvg != null ? showVal(antesAvg) : '—', sub: metricNome, bg: THEME.LIGHT, labC: THEME.MUTED, valC: THEME.NAVY, subC: THEME.MUTED },
    { lab: 'MÉDIA DEPOIS', big: depoisAvg != null ? showVal(depoisAvg) : '—', sub: 'pós-projeto', bg: THEME.LIGHT, labC: THEME.MUTED, valC: GAIN, subC: THEME.MUTED },
    { lab: 'GANHO POR MÊS', big: ganhoMes != null ? showVal(ganhoMes) : '—', sub: 'distância entre os patamares', bg: GAIN, labC: 'BFE6D6', valC: 'FFFFFF', subC: 'D7F0E6' },
    { lab: 'GANHO REAL ACUM.', big: brl(accReal), sub: `${depois.length} ${depois.length === 1 ? 'mês' : 'meses'} pós`, bg: THEME.NAVY, labC: '9CB0EE', valC: 'FFFFFF', subC: 'C9D1F2' },
  ];
  cards.forEach((c, i) => {
    const x = TX + i * (kW + gap);
    slide.addShape('rect', { x, y: kY, w: kW, h: kH, fill: { color: c.bg }, line: { type: 'none' }, rectRadius: 0.05 });
    slide.addText(c.lab, { x: x + 0.12, y: kY + 0.08, w: kW - 0.24, h: 0.18, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: c.labC, charSpacing: 1 });
    slide.addText(c.big, { x: x + 0.12, y: kY + 0.26, w: kW - 0.24, h: 0.38, fontFace: 'Calibri', fontSize: 17, bold: true, color: c.valC, valign: 'middle', shrinkText: true });
    slide.addText(c.sub, { x: x + 0.12, y: kY + 0.64, w: kW - 0.24, h: 0.20, fontFace: 'Calibri', fontSize: 8, color: c.subC });
  });

  // ---- Gráfico de patamares ----
  const chY = kY + kH + 0.20;
  slide.addText('Gasto do processo mês a mês — a distância entre os patamares é o ganho', {
    x: TX, y: chY, w: TW, h: 0.22, fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY,
  });

  const AXW = 0.95;                        // faixa lateral pros valores das médias
  const plotX = TX + AXW;
  const plotW = TW - AXW * 2;
  const plotRight = plotX + plotW;
  const plotTop = chY + 0.30;
  const plotBottom = TY + TOOL_AREA.h - 0.44; // sobra pros rótulos de mês + legenda

  const serie = [...antes.map((a) => ({ ...a, per: 'antes' })), ...depois.map((d) => ({ ...d, per: 'depois' }))];

  if (serie.length === 0) {
    slide.addText('Preencha as abas Antes e Depois para gerar o gráfico.', {
      x: plotX, y: plotTop + 0.5, w: plotW, h: 0.4, fontFace: 'Calibri', fontSize: 10, italic: true, color: THEME.MUTED,
    });
  } else {
    const maxV = Math.max(...serie.map((s) => s.val), antesAvg || 0, depoisAvg || 0, 1) * 1.15;
    const plotH = plotBottom - plotTop;
    const yOf = (v: number) => plotBottom - (v / maxV) * plotH;
    const n = serie.length;
    const slot = plotW / n;
    const barW = Math.min(0.46, slot * 0.62);

    // eixo base
    slide.addShape('line', { x: plotX, y: plotBottom, w: plotW, h: 0, line: { color: THEME.CHIP_BD, width: 1 } });

    // barras + rótulo de mês
    const showEvery = n > 14 ? 2 : 1;
    serie.forEach((s, i) => {
      const cx = plotX + i * slot + slot / 2;
      const h = Math.max(0.03, (s.val / maxV) * plotH);
      slide.addShape('rect', {
        x: cx - barW / 2, y: plotBottom - h, w: barW, h,
        fill: { color: s.per === 'antes' ? THEME.NAVY : THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.02,
      });
      if (i % showEvery === 0) {
        slide.addText(s.label, { x: cx - slot / 2, y: plotBottom + 0.04, w: slot, h: 0.16, fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, align: 'center' });
      }
    });

    const xBoundary = plotX + antes.length * slot;

    // divisor vertical no início do projeto (linha sólida — dash é proibido)
    if (antes.length > 0 && depois.length > 0) {
      slide.addShape('line', { x: xBoundary, y: plotTop, w: 0, h: plotH, line: { color: 'C3CBE6', width: 1 } });
      slide.addText('início do projeto', { x: xBoundary + 0.04, y: plotTop - 0.02, w: 1.3, h: 0.16, fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED });
    }

    // PATAMAR ANTES — segmento que termina no último mês do antes
    if (antesAvg != null && antes.length > 0) {
      const y = yOf(antesAvg);
      const w = antes.length * slot;
      if (w > 0.05) slide.addShape('line', { x: plotX, y, w, h: 0, line: { color: THEME.NAVY, width: 2.25 } });
      slide.addText(showVal(antesAvg), {
        x: TX, y: y - 0.11, w: AXW - 0.06, h: 0.22,
        fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY, align: 'right', valign: 'middle', shrinkText: true,
      });
    }

    // PATAMAR DEPOIS — segmento que começa no primeiro mês do depois
    if (depoisAvg != null && depois.length > 0) {
      const y = yOf(depoisAvg);
      const w = depois.length * slot;
      if (w > 0.05) slide.addShape('line', { x: xBoundary, y, w, h: 0, line: { color: GAIN, width: 2.25 } });
      slide.addText(showVal(depoisAvg), {
        x: plotRight + 0.06, y: y - 0.11, w: AXW - 0.06, h: 0.22,
        fontFace: 'Calibri', fontSize: 9, bold: true, color: GAIN, align: 'left', valign: 'middle', shrinkText: true,
      });
    }

    // conector do ganho: vão entre os dois patamares
    if (antesAvg != null && depoisAvg != null) {
      const yA = yOf(antesAvg);
      const yD = yOf(depoisAvg);
      const top = Math.min(yA, yD);
      const hGap = Math.abs(yA - yD);
      const xg = xBoundary + 0.18;
      if (hGap > 0.05) {
        slide.addShape('line', { x: xg, y: top, w: 0, h: hGap, line: { color: GAIN, width: 1.5 } });
        slide.addText(`ganho ${ganhoMes != null ? showVal(ganhoMes) : ''}/mês`, {
          x: xg + 0.06, y: top + hGap / 2 - 0.11, w: 1.9, h: 0.22,
          fontFace: 'Calibri', fontSize: 8, bold: true, color: GAIN, valign: 'middle',
        });
      }
    }

    // legenda
    const legY = plotBottom + 0.24;
    const legend = [
      { c: THEME.NAVY, t: 'Antes (gasto mensal)' },
      { c: THEME.BLUE, t: 'Depois (gasto mensal)' },
      { c: GAIN, t: 'Patamar médio depois' },
    ];
    let lx = plotX;
    legend.forEach((l) => {
      slide.addShape('rect', { x: lx, y: legY + 0.04, w: 0.13, h: 0.13, fill: { color: l.c }, line: { type: 'none' }, rectRadius: 0.02 });
      slide.addText(l.t, { x: lx + 0.18, y: legY, w: 2.3, h: 0.20, fontFace: 'Calibri', fontSize: 7.5, color: THEME.MUTED, valign: 'middle' });
      lx += 2.6;
    });
  }

  const fileName = `Ganhos_Tangiveis_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
