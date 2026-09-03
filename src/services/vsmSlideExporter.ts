import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

/**
 * Exporta o VSM para PPT.
 *
 * Ate 6 etapas cabe tudo num slide. Passando disso, a tabela de etapas vai para um
 * segundo slide em vez de ser cortada — VSM de fabrica passa de 10 etapas com
 * facilidade e perder etapa no slide invalidaria a analise.
 *
 * As contas espelham exatamente as do componente (ValueStreamMapping.tsx): takt pelo
 * tempo disponivel dividido pela demanda, tempo em fila pela Lei de Little, lead time
 * somando processo, espera e fila. Metrica sem insumo sai como "—" e nunca como numero
 * inventado, e etapa sem fonte sai marcada PENDENTE DE VALIDACAO.
 */

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

const ETAPAS_NO_PRIMEIRO_SLIDE = 6;

// Cores de apoio, solidas. Nunca usar transparency em texto: quebra o PPT.
const VERDE = '1E8449';
const AMBAR = 'B7791F';
const VERMELHO = 'C0392B';
const CINZA_LINHA = 'D1D5DB';
const AMARELO_FUNDO = 'FDF3D8';
const AMARELO_TEXTO = '8A6D1F';

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (n: number | null, casas = 1) =>
  n === null || !Number.isFinite(n) ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

const CLASSIF: Record<string, { rotulo: string; cor: string }> = {
  VA: { rotulo: 'AGREGA VALOR', cor: VERDE },
  NVA: { rotulo: 'NECESSÁRIO', cor: AMBAR },
  DESPERDICIO: { rotulo: 'DESPERDÍCIO', cor: VERMELHO },
};

interface Analise {
  tempoProcesso: number;
  esperaDeclarada: number;
  takt: number | null;
  tempoEmFila: number | null;
  leadTime: number | null;
  percentualVA: number | null;
  operadoresNecessarios: number | null;
  operadoresAtuais: number;
  gargalo: any | null;
  gargaloAcimaDoTakt: boolean;
  pendencias: string[];
}

function calcular(header: any, steps: any[]): Analise {
  const tempoProcesso = steps.reduce((s, e) => s + num(e.cycleTime), 0);
  const esperaDeclarada = steps.reduce((s, e) => s + num(e.waitingTime), 0);

  const demanda = num(header.demanda);
  const disponivel = num(header.tempoDisponivel);
  const takt = demanda > 0 ? disponivel / demanda : null;

  const tempoEmFila = takt === null ? null : steps.reduce((s, e) => s + num(e.queueQty) * takt, 0);
  const leadTime = tempoEmFila === null ? null : tempoProcesso + esperaDeclarada + tempoEmFila;

  const tempoVA = steps.filter((e) => e.classificacao === 'VA').reduce((s, e) => s + num(e.cycleTime), 0);
  const percentualVA = leadTime && leadTime > 0 ? (tempoVA / leadTime) * 100 : null;

  const operadoresNecessarios = takt && takt > 0 ? tempoProcesso / takt : null;
  const operadoresAtuais = steps.reduce((s, e) => s + num(e.peopleCount), 0);

  const gargalo = steps.length
    ? steps.reduce((pior, e) => (num(e.cycleTime) > num(pior.cycleTime) ? e : pior), steps[0])
    : null;
  const gargaloAcimaDoTakt = !!(takt && gargalo && num(gargalo.cycleTime) > takt);

  const semFonte = steps.filter((e) => !(e.fonte || '').toString().trim());
  const pendencias: string[] = [];
  if (demanda <= 0) pendencias.push('Demanda do cliente não informada — sem ela não há takt, lead time real nem %VA.');
  if (semFonte.length) pendencias.push(`${semFonte.length} etapa(s) sem fonte do dado — tratar como PENDENTE DE VALIDAÇÃO.`);

  return {
    tempoProcesso, esperaDeclarada, takt, tempoEmFila, leadTime,
    percentualVA, operadoresNecessarios, operadoresAtuais,
    gargalo, gargaloAcimaDoTakt, pendencias,
  };
}

/** Faixa de contexto do topo: processo, demanda e versão. */
function faixaContexto(slide: any, header: any, TX: number, TY: number, TW: number) {
  slide.addShape('rect', { x: TX, y: TY, w: TW, h: 0.44, fill: { color: THEME.LIGHT } });

  const campos = [
    { rotulo: 'PROCESSO / FAMÍLIA', valor: (header.processo || '').toString().trim() || 'Não informado', x: TX + 0.12, w: TW * 0.45 },
    {
      rotulo: 'DEMANDA DO CLIENTE',
      valor: num(header.demanda) > 0
        ? `${fmt(num(header.demanda), 0)} ${header.unidade || 'un'} / ${header.periodo || 'dia'} · ${fmt(num(header.tempoDisponivel), 0)} min`
        : 'Não informada',
      x: TX + TW * 0.47, w: TW * 0.35,
    },
    { rotulo: 'VERSÃO', valor: `${header.versao || 'v01'} · ${header.status || 'RASCUNHO'}`, x: TX + TW * 0.84, w: TW * 0.15 },
  ];

  campos.forEach((c) => {
    slide.addText(c.rotulo, {
      x: c.x, y: TY + 0.04, w: c.w, h: 0.16,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.MUTED, charSpacing: 1,
    });
    slide.addText(c.valor, {
      x: c.x, y: TY + 0.20, w: c.w, h: 0.20,
      fontFace: 'Calibri', fontSize: 10, bold: true, color: THEME.INK, shrinkText: true,
    });
  });
}

/** Os 4 números que abrem a conversa. */
function kpis(slide: any, a: Analise, header: any, TX: number, y: number, TW: number) {
  const gap = 0.12;
  const w = (TW - gap * 3) / 4;
  const cards = [
    { rotulo: 'TAKT TIME', valor: fmt(a.takt), unidade: a.takt === null ? '' : `min/${header.unidade || 'un'}`, destaque: true },
    { rotulo: 'TEMPO DE PROCESSO', valor: fmt(a.tempoProcesso), unidade: 'min', destaque: false },
    { rotulo: 'LEAD TIME', valor: fmt(a.leadTime), unidade: a.leadTime === null ? '' : 'min', destaque: false },
    { rotulo: '% VALOR AGREGADO', valor: fmt(a.percentualVA), unidade: a.percentualVA === null ? '' : '%', destaque: false },
  ];

  cards.forEach((c, i) => {
    const x = TX + i * (w + gap);
    slide.addShape('rect', {
      x, y, w, h: 0.78,
      fill: { color: c.destaque ? THEME.NAVY : THEME.LIGHT },
    });
    slide.addText(c.rotulo, {
      x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, bold: true, charSpacing: 1,
      color: c.destaque ? '8AA0E5' : THEME.MUTED,
    });
    slide.addText(
      [
        { text: c.valor, options: { fontSize: 20, bold: true, color: c.destaque ? 'FFFFFF' : THEME.BLUE } },
        { text: c.unidade ? ` ${c.unidade}` : '', options: { fontSize: 9, bold: true, color: c.destaque ? '8AA0E5' : THEME.MUTED } },
      ],
      { x: x + 0.12, y: y + 0.28, w: w - 0.24, h: 0.42, fontFace: 'Calibri', valign: 'middle' }
    );
  });
}

/** Gráfico Tempo de Ciclo x Takt — a barra que passa da linha é o gargalo. */
function graficoCicloTakt(slide: any, steps: any[], a: Analise, x: number, y: number, w: number, h: number) {
  slide.addText('TEMPO DE CICLO × TAKT — BARRA ACIMA DA LINHA NÃO ATENDE O CLIENTE', {
    x, y, w, h: 0.18, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED, charSpacing: 1,
  });

  const topo = y + 0.20;
  const alturaGrafico = h - 0.20;
  slide.addShape('rect', { x, y: topo, w, h: alturaGrafico, fill: { color: 'FFFFFF' }, line: { color: CINZA_LINHA, width: 0.5 } });

  if (a.takt === null || steps.length === 0) {
    slide.addText('Informe a demanda do cliente para calcular o takt.', {
      x: x + 0.1, y: topo + alturaGrafico / 2 - 0.15, w: w - 0.2, h: 0.3,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true, align: 'center',
    });
    return;
  }

  const visiveis = steps.slice(0, 6);
  const rotuloW = 1.35;
  const valorW = 0.62;
  const trilhoX = x + rotuloW + 0.08;
  const trilhoW = w - rotuloW - valorW - 0.24;
  const maxRef = Math.max(a.takt, ...steps.map((e) => num(e.cycleTime))) || 1;
  const linhaH = Math.min(0.30, (alturaGrafico - 0.24) / Math.max(visiveis.length, 1));

  visiveis.forEach((etapa, i) => {
    const ly = topo + 0.12 + i * linhaH;
    const ciclo = num(etapa.cycleTime);
    const acima = ciclo > (a.takt as number);
    const barraW = Math.max(0.03, (ciclo / maxRef) * trilhoW);

    slide.addText((etapa.name || 'Etapa sem nome').toString(), {
      x, y: ly, w: rotuloW, h: linhaH - 0.04,
      fontFace: 'Calibri', fontSize: 8, color: THEME.INK, valign: 'middle', shrinkText: true,
    });
    slide.addShape('rect', { x: trilhoX, y: ly + 0.03, w: trilhoW, h: linhaH - 0.10, fill: { color: 'F7F8FC' } });
    slide.addShape('rect', {
      x: trilhoX, y: ly + 0.03, w: barraW, h: linhaH - 0.10,
      fill: { color: acima ? VERMELHO : THEME.NAVY },
    });
    slide.addText(`${fmt(ciclo)} min`, {
      x: x + w - valorW, y: ly, w: valorW, h: linhaH - 0.04,
      fontFace: 'Calibri', fontSize: 8, bold: acima, color: acima ? VERMELHO : THEME.MUTED,
      align: 'right', valign: 'middle',
    });
  });

  // Linha do takt. Retangulo fino em vez de 'line' — linha com w e h quase zero
  // quebra o arquivo, e a proibicao de dashType impede o tracejado.
  const taktX = trilhoX + ((a.takt as number) / maxRef) * trilhoW;
  const alturaBarras = 0.12 + visiveis.length * linhaH;
  slide.addShape('rect', {
    x: taktX, y: topo + 0.06, w: 0.02, h: Math.min(alturaBarras, alturaGrafico - 0.12),
    fill: { color: THEME.BLUE },
  });
  slide.addText(`TAKT ${fmt(a.takt)}`, {
    x: taktX + 0.04, y: topo + 0.02, w: 0.9, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.BLUE,
  });
}

/** Onde o tempo se perde + gargalo + operadores. */
function painelDireito(slide: any, a: Analise, x: number, y: number, w: number, h: number) {
  const alturaComposicao = 1.02;
  slide.addShape('rect', { x, y, w, h: alturaComposicao, fill: { color: THEME.LIGHT } });
  slide.addText('ONDE O TEMPO É CONSUMIDO', {
    x: x + 0.12, y: y + 0.05, w: w - 0.24, h: 0.16,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED, charSpacing: 1,
  });

  const lead = a.leadTime;
  const partes = [
    { rotulo: 'Processo', valor: a.tempoProcesso, cor: THEME.NAVY },
    { rotulo: 'Espera', valor: a.esperaDeclarada, cor: THEME.MUTED },
    { rotulo: 'Fila / estoque', valor: a.tempoEmFila ?? 0, cor: VERMELHO },
  ];
  partes.forEach((p, i) => {
    const ly = y + 0.24 + i * 0.24;
    const pct = lead && lead > 0 ? (p.valor / lead) * 100 : null;
    slide.addShape('rect', { x: x + 0.12, y: ly + 0.03, w: 0.30, h: 0.14, fill: { color: p.cor } });
    slide.addText(
      `${p.rotulo} — ${lead === null ? '—' : `${fmt(p.valor)} min`}${pct === null ? '' : ` (${fmt(pct, 0)}%)`}`,
      {
        x: x + 0.50, y: ly, w: w - 0.62, h: 0.20,
        fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK,
        bold: p.rotulo === 'Fila / estoque', valign: 'middle',
      }
    );
  });

  // Gargalo
  const gy = y + alturaComposicao + 0.10;
  const gh = h - alturaComposicao - 0.10;
  slide.addShape('rect', { x, y: gy, w, h: gh, fill: { color: 'FFFFFF' }, line: { color: CINZA_LINHA, width: 0.5 } });
  slide.addText('GARGALO PROVÁVEL', {
    x: x + 0.12, y: gy + 0.05, w: w - 0.24, h: 0.16,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED, charSpacing: 1,
  });

  if (a.gargalo) {
    slide.addText(`${a.gargalo.name || 'Etapa sem nome'} — ${fmt(num(a.gargalo.cycleTime))} min`, {
      x: x + 0.12, y: gy + 0.22, w: w - 0.24, h: 0.22,
      fontFace: 'Calibri', fontSize: 11, bold: true,
      color: a.gargaloAcimaDoTakt ? VERMELHO : THEME.INK, shrinkText: true,
    });
    slide.addText(
      a.gargaloAcimaDoTakt ? 'Acima do takt: não atende a demanda.' : 'Dentro do takt.',
      { x: x + 0.12, y: gy + 0.44, w: w - 0.24, h: 0.18, fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK }
    );
    slide.addText(`Evidência: ${(a.gargalo.fonte || '').toString().trim() || 'PENDENTE DE VALIDAÇÃO'}`, {
      x: x + 0.12, y: gy + 0.62, w: w - 0.24, h: 0.18,
      fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED, shrinkText: true,
    });
    slide.addText(
      `Operadores — necessários pelo takt: ${fmt(a.operadoresNecessarios)} · alocados: ${a.operadoresAtuais}`,
      { x: x + 0.12, y: gy + 0.82, w: w - 0.24, h: 0.18, fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK, shrinkText: true }
    );
  } else {
    slide.addText('Sem etapas registradas.', {
      x: x + 0.12, y: gy + 0.30, w: w - 0.24, h: 0.20,
      fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
    });
  }
}

/** Tabela de etapas. Usada no slide 1 (até 6) ou sozinha no slide 2. */
function tabelaEtapas(slide: any, steps: any[], x: number, y: number, w: number) {
  slide.addText('ETAPAS DO FLUXO', {
    x, y, w, h: 0.18, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED, charSpacing: 1,
  });

  const cols = [0.26, 0.09, 0.09, 0.08, 0.08, 0.09, 0.15, 0.16];
  const cabecalhos = ['ETAPA', 'CICLO', 'ESPERA', 'FILA', 'RETRAB.', 'DISPON.', 'CLASSIFICAÇÃO', 'FONTE DO DADO'];
  const linhaH = 0.26;
  let ly = y + 0.20;

  slide.addShape('rect', { x, y: ly, w, h: linhaH, fill: { color: THEME.NAVY } });
  let cx = x;
  cabecalhos.forEach((h, i) => {
    slide.addText(h, {
      x: cx + 0.06, y: ly, w: w * cols[i] - 0.08, h: linhaH,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: 'FFFFFF', valign: 'middle',
    });
    cx += w * cols[i];
  });
  ly += linhaH;

  steps.forEach((etapa, idx) => {
    slide.addShape('rect', {
      x, y: ly, w, h: linhaH,
      fill: { color: idx % 2 === 0 ? 'FFFFFF' : 'F7F8FC' },
      line: { color: CINZA_LINHA, width: 0.5 },
    });

    const classif = CLASSIF[etapa.classificacao] || CLASSIF.VA;
    const fonte = (etapa.fonte || '').toString().trim();
    const valores = [
      (etapa.name || 'Etapa sem nome').toString(),
      `${fmt(num(etapa.cycleTime))} min`,
      `${fmt(num(etapa.waitingTime))} min`,
      `${fmt(num(etapa.queueQty), 0)} un`,
      `${fmt(num(etapa.reworkRate), 0)}%`,
      `${fmt(num(etapa.availability), 0)}%`,
    ];

    cx = x;
    valores.forEach((v, i) => {
      slide.addText(v, {
        x: cx + 0.06, y: ly, w: w * cols[i] - 0.08, h: linhaH,
        fontFace: 'Calibri', fontSize: 8, color: THEME.INK, valign: 'middle', shrinkText: true,
      });
      cx += w * cols[i];
    });

    // Classificação — tarja sólida
    slide.addShape('rect', {
      x: cx + 0.04, y: ly + 0.05, w: w * cols[6] - 0.10, h: linhaH - 0.10,
      fill: { color: classif.cor },
    });
    slide.addText(classif.rotulo, {
      x: cx + 0.04, y: ly + 0.05, w: w * cols[6] - 0.10, h: linhaH - 0.10,
      fontFace: 'Calibri', fontSize: 6.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle',
    });
    cx += w * cols[6];

    // Fonte — sem fonte vira alerta visível, como o kit exige
    if (!fonte) {
      slide.addShape('rect', {
        x: cx + 0.04, y: ly + 0.05, w: w * cols[7] - 0.10, h: linhaH - 0.10,
        fill: { color: AMARELO_FUNDO },
      });
    }
    slide.addText(fonte || 'PENDENTE DE VALIDAÇÃO', {
      x: cx + 0.06, y: ly, w: w * cols[7] - 0.10, h: linhaH,
      fontFace: 'Calibri', fontSize: fonte ? 7.5 : 6.5, bold: !fonte,
      color: fonte ? THEME.INK : AMARELO_TEXTO, valign: 'middle', shrinkText: true,
    });

    ly += linhaH;
  });

  return ly;
}

/** Faixa de pendências — o kit manda separar o calculado do estimado. */
function faixaPendencias(slide: any, a: Analise, x: number, y: number, w: number) {
  if (a.pendencias.length === 0) return;
  slide.addShape('rect', { x, y, w, h: 0.44, fill: { color: AMARELO_FUNDO } });
  slide.addText('HIPÓTESES E DADOS AUSENTES', {
    x: x + 0.12, y: y + 0.04, w: w - 0.24, h: 0.16,
    fontFace: 'Calibri', fontSize: 7, bold: true, color: AMARELO_TEXTO, charSpacing: 1,
  });
  slide.addText(a.pendencias.join('  ·  '), {
    x: x + 0.12, y: y + 0.20, w: w - 0.24, h: 0.20,
    fontFace: 'Calibri', fontSize: 8, color: AMARELO_TEXTO, shrinkText: true,
  });
}

export async function exportVsmSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const header = data.header && typeof data.header === 'object' ? data.header : {};
  const todas: any[] = Array.isArray(data.steps) ? data.steps : [];
  const steps = todas.filter((e) => e && (e.name || '').toString().trim());

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  if (steps.length === 0) {
    const slide = createSlide(pres, project, 'VSM — Mapa do Fluxo de Valor', 'Analyze', aiAnalysis);
    slide.addText('Nenhuma etapa registrada no VSM.', {
      x: TX, y: TY + TH / 2 - 0.20, w: TW, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
  } else {
    const a = calcular(header, steps);
    const cabemNoPrimeiro = steps.length <= ETAPAS_NO_PRIMEIRO_SLIDE;
    const totalSlides = cabemNoPrimeiro ? 1 : 2;

    // ---------- Slide 1: contexto, métricas, gráfico e gargalo ----------
    const slide1 = createSlide(
      pres, project,
      totalSlides > 1 ? 'VSM — Mapa do Fluxo de Valor (1/2)' : 'VSM — Mapa do Fluxo de Valor',
      'Analyze', aiAnalysis
    );

    faixaContexto(slide1, header, TX, TY, TW);
    kpis(slide1, a, header, TX, TY + 0.54, TW);

    const yBlocos = TY + 1.44;
    const alturaBlocos = cabemNoPrimeiro ? 1.80 : 2.30;
    const larguraGrafico = TW * 0.62;
    graficoCicloTakt(slide1, steps, a, TX, yBlocos, larguraGrafico, alturaBlocos);
    painelDireito(slide1, a, TX + larguraGrafico + 0.16, yBlocos + 0.20, TW - larguraGrafico - 0.16, alturaBlocos - 0.20);

    if (cabemNoPrimeiro) {
      const yTabela = yBlocos + alturaBlocos + 0.14;
      const fim = tabelaEtapas(slide1, steps, TX, yTabela, TW);
      faixaPendencias(slide1, a, TX, Math.min(fim + 0.10, TY + TH - 0.44), TW);
    } else {
      faixaPendencias(slide1, a, TX, TY + TH - 0.44, TW);

      // ---------- Slide 2: tabela completa, sem cortar etapa ----------
      const slide2 = createSlide(pres, project, 'VSM — Etapas do Fluxo (2/2)', 'Analyze', '');
      faixaContexto(slide2, header, TX, TY, TW);
      tabelaEtapas(slide2, steps, TX, TY + 0.56, TW);
    }
  }

  const fileName = `VSM_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
