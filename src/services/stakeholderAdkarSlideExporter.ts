import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

const LEVELS = ['Desconhece','Resistente','Neutro','Apoiador','Líder'];

function getQuadrant(power: string, interest: string): string {
  if (power === 'Alto' && interest === 'Alto') return 'Gerenciar de Perto';
  if (power === 'Alto' && interest !== 'Alto') return 'Manter Satisfeito';
  if (power !== 'Alto' && interest === 'Alto') return 'Manter Informado';
  return 'Monitorar';
}

function getAwarenessColor(s: any): string {
  const cur = LEVELS.indexOf(s.currentEngagementDefine ?? s.currentEngagement ?? 'Neutro');
  const des = LEVELS.indexOf(s.desiredEngagement ?? 'Neutro');
  if (cur === -1 || des === -1) return 'D1D5DB';
  const gap = des - cur;
  if (gap <= 0) return '22C55E';
  if (gap === 1) return 'EAB308';
  return 'EF4444';
}

function getAwarenessLevel(s: any): string {
  const cur = LEVELS.indexOf(s.currentEngagementDefine ?? s.currentEngagement ?? 'Neutro');
  const des = LEVELS.indexOf(s.desiredEngagement ?? 'Neutro');
  const gap = des - cur;
  if (gap <= 0) return 'Verde';
  if (gap === 1) return 'Amarelo';
  return 'Vermelho';
}

const AWARENESS_ACTIONS: Record<string, Record<string, string>> = {
  'Gerenciar de Perto': {
    'Vermelho': 'Conversa individual imediata para explicar o motivo da mudança e o impacto direto. Repetir semanalmente até a pessoa entender.',
    'Amarelo': 'Conversa individual para reforçar entendimento com dados concretos. Confirmar que ela sabe explicar o motivo da mudança.',
    'Verde': ''
  },
  'Manter Satisfeito': {
    'Vermelho': 'Apresentação executiva com resumo de 1 página explicando o problema, o objetivo e os benefícios esperados.',
    'Amarelo': 'Resumo mensal reforçando o motivo e os benefícios. Validar que continua alinhado com o propósito.',
    'Verde': ''
  },
  'Manter Informado': {
    'Vermelho': 'Comunicação oficial sobre o início da mudança. Explicar problema, objetivo e cronograma resumido.',
    'Amarelo': 'Atualização quinzenal reforçando contexto e como a mudança affeta a área dela.',
    'Verde': ''
  },
  'Monitorar': {
    'Vermelho': 'Mensagem direta com explicação clara da mudança. Disponibilizar canal para tirar dúvidas.',
    'Amarelo': 'Lembrete da mudança em comunicações regulares. Reforçar contexto quando houver novidade.',
    'Verde': ''
  }
};

function getAction(s: any): { text: string; isAuto: boolean } {
  if (s.customAction && s.customAction.trim()) {
    return { text: s.customAction.trim(), isAuto: false };
  }
  const quadrant = getQuadrant(s.power || 'Médio', s.interest || 'Médio');
  const level = getAwarenessLevel(s);
  if (level === 'Verde') {
    return { text: 'Sem ação imediata — manter alinhado nas próximas fases.', isAuto: true };
  }
  return { text: AWARENESS_ACTIONS[quadrant]?.[level] || '', isAuto: true };
}

function calcPct(list: any[]): number {
  if (!list.length) return 0;
  const green = list.filter(s => {
    const cur = LEVELS.indexOf(s.currentEngagementDefine ?? s.currentEngagement ?? 'Neutro');
    const des = LEVELS.indexOf(s.desiredEngagement ?? 'Neutro');
    return des - cur <= 0;
  }).length;
  return Math.round((green / list.length) * 100);
}

function kpiColor(pct: number): string {
  return pct >= 70 ? '22C55E' : pct >= 50 ? 'EAB308' : 'EF4444';
}

const CLASSIF_BG: Record<string, string> = {
  'Gerenciar de Perto': 'FEE2E2',
  'Manter Satisfeito':  'DBEAFE',
  'Manter Informado':   'DCFCE7',
  'Monitorar':          'F3F4F6',
};
const CLASSIF_FG: Record<string, string> = {
  'Gerenciar de Perto': '991B1B',
  'Manter Satisfeito':  '1E3A8A',
  'Manter Informado':   '166534',
  'Monitorar':          '374151',
};
const STATUS_BG: Record<string, string> = {
  'Pendente':     'FEE2E2',
  'Em andamento': 'FEF9C3',
  'Concluído':    'DCFCE7',
};
const STATUS_FG: Record<string, string> = {
  'Pendente':     'EF4444',
  'Em andamento': 'CA8A04',
  'Concluído':    '16A34A',
};
const STATUS_LABEL: Record<string, string> = {
  'Pendente':     'Pendente',
  'Em andamento': 'Em and.',
  'Concluído':    'Concluído',
};

export async function exportStakeholderAdkarSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = ''
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const stakeholders: any[] = toolData?.stakeholders || [];
  const core     = stakeholders.filter(s => s.type === 'Core Team');
  const impacted = stakeholders.filter(s => s.type === 'Impactado');

  const generalPct  = calcPct(stakeholders);
  const corePct     = calcPct(core);
  const impactedPct = calcPct(impacted);

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(pres, project,
    'Stakeholders — ADKAR e Plano de Comunicação', 'Define', aiAnalysis);

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;

  // ── KPI CARDS — 4 em linha, largura total ─────────────
  const CARD_W = (TW - 0.30) / 4;
  const CARD_H = 1.10;
  const kpis = [
    { label: 'MAPEADOS',          sub: 'Total de stakeholders',     value: String(stakeholders.length), color: THEME.NAVY },
    { label: 'GERAL VERDE',       sub: '% do total alinhado',       value: `${generalPct}%`,  color: kpiColor(generalPct) },
    { label: 'CORE TEAM VERDE',   sub: '% do time do projeto',      value: `${corePct}%`,     color: kpiColor(corePct) },
    { label: 'IMPACTADOS VERDE',  sub: '% dos que recebem mudança', value: `${impactedPct}%`, color: kpiColor(impactedPct) },
  ];
  kpis.forEach((k, i) => {
    const cx = TX + i * (CARD_W + 0.10);
    slide.addShape('rect', { x: cx, y: TY, w: CARD_W, h: CARD_H, fill: { color: 'FFFFFF' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.06 });
    slide.addText(k.label, { x: cx + 0.14, y: TY + 0.10, w: CARD_W - 0.28, h: 0.22, fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY, charSpacing: 1 });
    slide.addText(k.sub,   { x: cx + 0.14, y: TY + 0.32, w: CARD_W - 0.28, h: 0.20, fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED });
    slide.addText(k.value, { x: cx + 0.14, y: TY + 0.54, w: CARD_W - 0.28, h: 0.50, fontFace: 'Calibri', fontSize: 28, bold: true, color: k.color });
  });

  // ── TABELA ÚNICA ──────────────────────────────────────
  const tableY = TY + CARD_H + 0.18;
  const HEADER_H = 0.28;
  const ROW_H = 0.52;

  // Colunas em polegadas. Total = 12.63"
  // NOME 1.80 | PAPEL 1.50 | ADKAR 1.55 | ATUAL→DESEJ 2.30 | CLASSIF 1.80 | AÇÃO 2.50 | STATUS 1.18
  const C = {
    name:    TX,
    role:    TX + 1.80,
    adkar:   TX + 3.30,
    eng:     TX + 4.85,
    classif: TX + 7.15,
    action:  TX + 8.95,
    status:  TX + 11.45,
  };

  // Header
  slide.addShape('rect', { x: TX, y: tableY, w: TW, h: HEADER_H, fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.04 });
  slide.addText('NOME',              { x: C.name + 0.10,    y: tableY, w: 1.70, h: HEADER_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('PAPEL',             { x: C.role + 0.10,    y: tableY, w: 1.40, h: HEADER_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('A* D K A R',        { x: C.adkar + 0.05,   y: tableY, w: 1.50, h: HEADER_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('ATUAL → DESEJADO',  { x: C.eng + 0.10,     y: tableY, w: 2.20, h: HEADER_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('CLASSIFICAÇÃO',     { x: C.classif + 0.10, y: tableY, w: 1.70, h: HEADER_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('AÇÃO RECOMENDADA',  { x: C.action + 0.10,  y: tableY, w: 2.40, h: HEADER_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('STATUS',            { x: C.status + 0.10,  y: tableY, w: 1.08, h: HEADER_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, valign: 'middle' });

  let rowY = tableY + HEADER_H;

  const drawSectionLabel = (label: string, isCore: boolean) => {
    const bgColor = isCore ? 'EAF1F8' : 'F3F4F6';
    const stripeColor = isCore ? THEME.BLUE : '6B7280';
    const textColor = isCore ? THEME.NAVY : '374151';
    slide.addShape('rect', { x: TX, y: rowY, w: TW, h: 0.22, fill: { color: bgColor }, line: { type: 'none' }, rectRadius: 0.03 });
    slide.addShape('rect', { x: TX, y: rowY, w: 0.05, h: 0.22, fill: { color: stripeColor }, line: { type: 'none' } });
    slide.addText(label, { x: TX + 0.12, y: rowY, w: 3.00, h: 0.22, fontFace: 'Calibri', fontSize: 8, bold: true, color: textColor, charSpacing: 1, valign: 'middle' });
    rowY += 0.22;
  };

  const drawRow = (s: any) => {
    slide.addShape('line', { x: TX, y: rowY, w: TW, h: 0, line: { color: 'E8ECF4', width: 0.4 } });
    const mid = rowY + ROW_H / 2;
    const awareColor = getAwarenessColor(s);
    const classif = getQuadrant(s.power || 'Médio', s.interest || 'Médio');
    const status = s.actionStatusDefine || 'Pendente';
    const action = getAction(s);
    const cur = s.currentEngagementDefine ?? s.currentEngagement ?? '—';
    const des = s.desiredEngagement ?? '—';

    // Nome + Papel
    slide.addText(s.name || '', { x: C.name + 0.10, y: rowY, w: 1.70, h: ROW_H, fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY, valign: 'middle', shrinkText: true });
    slide.addText(s.role || '', { x: C.role + 0.10, y: rowY, w: 1.40, h: ROW_H, fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED, valign: 'middle', shrinkText: true });

    // 5 Dots ADKAR
    const dotXs = [0.10, 0.36, 0.62, 0.88, 1.14];
    dotXs.forEach((dx, i) => {
      slide.addShape('ellipse', {
        x: C.adkar + dx, y: mid - 0.08, w: 0.16, h: 0.16,
        fill: { color: i === 0 ? awareColor : 'D1D5DB' },
        line: { type: 'none' },
      });
    });

    // Engagement
    slide.addText(`${cur} → ${des}`, { x: C.eng + 0.10, y: rowY, w: 2.20, h: ROW_H, fontFace: 'Calibri', fontSize: 8, color: THEME.INK, valign: 'middle', shrinkText: true });

    // Classificação
    slide.addShape('rect', { x: C.classif + 0.08, y: rowY + 0.12, w: 1.70, h: ROW_H - 0.24, fill: { color: CLASSIF_BG[classif] || 'F3F4F6' }, line: { type: 'none' }, rectRadius: 0.03 });
    slide.addText(classif, { x: C.classif + 0.08, y: rowY, w: 1.70, h: ROW_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: CLASSIF_FG[classif] || '374151', align: 'center', valign: 'middle', shrinkText: true });

    // Ação
    slide.addText(action.text, {
      x: C.action + 0.10, y: rowY, w: 2.40, h: ROW_H,
      fontFace: 'Calibri', fontSize: 8,
      color: action.isAuto ? THEME.MUTED : THEME.INK,
      italic: action.isAuto, valign: 'middle', shrinkText: true,
    });

    // Status
    slide.addShape('rect', { x: C.status + 0.08, y: rowY + 0.12, w: 1.02, h: ROW_H - 0.24, fill: { color: STATUS_BG[status] || 'F3F4F6' }, line: { type: 'none' }, rectRadius: 0.03 });
    slide.addText(STATUS_LABEL[status] || status, { x: C.status + 0.08, y: rowY, w: 1.02, h: ROW_H, fontFace: 'Calibri', fontSize: 7.5, bold: true, color: STATUS_FG[status] || '374151', align: 'center', valign: 'middle', shrinkText: true });

    rowY += ROW_H;
  };

  if (core.length > 0) {
    drawSectionLabel('CORE TEAM', true);
    core.forEach(drawRow);
  }
  if (impacted.length > 0) {
    drawSectionLabel('IMPACTADOS', false);
    impacted.forEach(drawRow);
  }

  // Nota + legenda
  slide.addText('* A = Awareness avaliado na fase Define. D K A R serão avaliados nas fases seguintes.', {
    x: TX, y: rowY + 0.06, w: TW, h: 0.18,
    fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, italic: true,
  });
  rowY += 0.26;

  if (rowY < TY + TOOL_AREA.h - 0.30) {
    const legend: [string, string][] = [['22C55E','No nível esperado'],['EAB308','1 nível abaixo'],['EF4444','Resistência ativa'],['D1D5DB','N/A']];
    let lx = TX + 0.10;
    legend.forEach(([color, label]) => {
      slide.addShape('ellipse', { x: lx, y: rowY + 0.04, w: 0.10, h: 0.10, fill: { color }, line: { type: 'none' } });
      slide.addText(label, { x: lx + 0.14, y: rowY, w: 1.70, h: 0.18, fontFace: 'Calibri', fontSize: 7, color: THEME.INK, valign: 'middle' });
      lx += 1.90;
    });
  }

  const fileName = `Stakeholder_ADKAR_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  await pres.writeFile({ fileName });
}
