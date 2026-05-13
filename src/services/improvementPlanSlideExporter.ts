import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

interface Activity {
  id: string;
  text: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  weight: number;
  owner?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  category?: string;
  priority?: string;
}

interface Phase {
  id: string;
  name: string;
  weight: number;
  activities: Activity[];
}

function calcPhaseMetrics(phase: Phase) {
  const today = new Date().getTime();

  // Datas vêm das próprias atividades (auto-suficiente, não depende do cronograma macro)
  const dates = phase.activities
    .flatMap(a => [a.plannedStartDate, a.plannedEndDate])
    .filter(d => d && d.length > 0)
    .map(d => new Date(d as string).getTime())
    .filter(n => !isNaN(n));

  const hasDates = dates.length > 0;
  const start = hasDates ? Math.min(...dates) : today;
  const end = hasDates ? Math.max(...dates) : today;
  const duration = Math.max(end - start, 1);

  let pvFactor = 0;
  if (hasDates) {
    if (today > end) pvFactor = 1;
    else if (today > start) pvFactor = (today - start) / duration;
  }
  const pv = pvFactor * phase.weight;

  const totalWeight = phase.activities.reduce((sum, a) => sum + a.weight, 0);
  const earnedWeight = phase.activities.reduce((sum, a) => {
    const progress = a.status === 'Completed' ? 1 : a.status === 'In Progress' ? 0.5 : 0;
    return sum + (a.weight * progress);
  }, 0);

  const evFactor = totalWeight > 0 ? (earnedWeight / totalWeight) : 0;
  const ev = evFactor * phase.weight;
  const spi = pv > 0 ? ev / pv : (ev > 0 ? 1.2 : 1);

  let status = 'In Progress';
  const isCompleted = phase.activities.length > 0 && phase.activities.every(a => a.status === 'Completed');
  if (!hasDates || (today < start && earnedWeight === 0)) status = 'Not Started';
  else if (isCompleted) status = 'Completed';
  else if (spi < 0.85 || (today > end && !isCompleted)) status = 'Delayed';
  else if (spi < 0.95) status = 'At Risk';
  else status = 'In Progress';

  const completed = phase.activities.filter(a => a.status === 'Completed').length;

  return {
    pv, ev, spi,
    status,
    progress: Math.round(evFactor * 100),
    timeProgress: Math.round(pvFactor * 100),
    completed,
    total: phase.activities.length,
  };
}

const STATUS_LABEL_PT: Record<string, string> = {
  'Not Started': 'Não iniciado',
  'In Progress': 'Em andamento',
  'Completed':   'Concluído',
  'At Risk':     'Em risco',
  'Delayed':     'Atrasado',
};

const STATUS_COLOR: Record<string, string> = {
  'Not Started': '374151',
  'In Progress': '1E3A8A',
  'Completed':   '16A34A',
  'At Risk':     'CA8A04',
  'Delayed':     'EF4444',
};

const PROGRESS_CHIP_BG: Record<string, string> = {
  'Not Started': 'F3F4F6',
  'In Progress': 'DBEAFE',
  'Completed':   'DCFCE7',
  'At Risk':     'FEF9C3',
  'Delayed':     'FEE2E2',
};
const PROGRESS_CHIP_FG: Record<string, string> = {
  'Not Started': '374151',
  'In Progress': '1E3A8A',
  'Completed':   '16A34A',
  'At Risk':     'CA8A04',
  'Delayed':     '991B1B',
};

const BAR_COLOR: Record<string, string> = {
  'Not Started': '9CA3AF',
  'In Progress': '0033CC',
  'Completed':   '22C55E',
  'At Risk':     'EAB308',
  'Delayed':     'EF4444',
};

function fmtSPI(spi: number, hasData: boolean): string {
  if (!hasData) return '—';
  return spi.toFixed(2).replace('.', ',');
}

export async function exportImprovementPlanSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const phases: Phase[] = (toolData?.phases || []) as Phase[];

  // Métricas por fase + total
  const phaseMetrics = phases.map(p => ({ phase: p, metrics: calcPhaseMetrics(p) }));

  const totalPV = phaseMetrics.reduce((s, x) => s + x.metrics.pv, 0);
  const totalEV = phaseMetrics.reduce((s, x) => s + x.metrics.ev, 0);
  const totalSPI = totalPV > 0 ? totalEV / totalPV : (totalEV > 0 ? 1.2 : 1);
  const totalProgress = Math.round(totalEV);
  const allActivities = phases.flatMap(p => p.activities);
  const completedTotal = allActivities.filter(a => a.status === 'Completed').length;

  // Em risco: atividades não concluídas com data de fim no passado OU em fases At Risk/Delayed
  const todayMs = Date.now();
  const overdueActsCount = allActivities.filter(a => {
    if (a.status === 'Completed') return false;
    if (!a.plannedEndDate) return false;
    return todayMs > new Date(a.plannedEndDate).getTime();
  }).length;
  const phasesAtRiskCount = phaseMetrics.filter(x => x.metrics.status === 'At Risk' || x.metrics.status === 'Delayed').length;
  const riskTotal = Math.max(overdueActsCount, phasesAtRiskCount);

  // Fase atual = primeira não concluída e não "Not Started"
  const currentPhaseIdx = phaseMetrics.findIndex(x => x.metrics.status !== 'Completed' && x.metrics.status !== 'Not Started');
  const currentIdx = currentPhaseIdx >= 0 ? currentPhaseIdx : 0;
  const currentPhaseName = phases[currentIdx]?.name || 'Definir';
  const phaseToBadge: Record<string, string> = {
    'Definir': 'Define', 'Medir': 'Measure', 'Analisar': 'Analyze',
    'Melhorar': 'Improve', 'Controlar': 'Control'
  };

  // Top ações críticas (3 atrasadas/em risco + 3 próximas a iniciar)
  const overdueActs = allActivities
    .map(a => {
      if (a.status === 'Completed') return null;
      if (!a.plannedEndDate) return null;
      const phase = phases.find(p => p.activities.some(act => act.id === a.id));
      const end = new Date(a.plannedEndDate).getTime();
      const isOverdue = todayMs > end;
      const daysToEnd = (end - todayMs) / (1000 * 60 * 60 * 24);
      const isAtRisk = !isOverdue && daysToEnd <= 7 && a.status !== 'Not Started';
      if (!isOverdue && !isAtRisk) return null;
      return {
        type: isOverdue ? 'Atrasada' : 'Em risco',
        text: a.text,
        phase: phase?.name || '—',
        owner: a.owner || '—',
        status: isOverdue ? 'Delayed' : 'At Risk',
        sortKey: end,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.sortKey - b.sortKey)
    .slice(0, 3);

  const upcomingActs = allActivities
    .map(a => {
      if (a.status !== 'Not Started') return null;
      if (!a.plannedStartDate) return null;
      const phase = phases.find(p => p.activities.some(act => act.id === a.id));
      const start = new Date(a.plannedStartDate).getTime();
      if (start < todayMs) return null;
      const daysAhead = (start - todayMs) / (1000 * 60 * 60 * 24);
      if (daysAhead > 30) return null;
      return {
        type: 'Próxima',
        text: a.text,
        phase: phase?.name || '—',
        owner: a.owner || '—',
        status: 'Not Started',
        sortKey: start,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.sortKey - b.sortKey)
    .slice(0, 3);

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';
  const slide = createSlide(
    pres, project, 'Plano de Melhoria — Visão Executiva',
    phaseToBadge[currentPhaseName] || 'Improve', aiAnalysis
  );

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;

  // ── ZONA 1: KPIs gerais ──────────────────────────────
  const KPI_W = (TW - 0.30) / 4;
  const KPI_H = 0.78;
  const kpiColor = (v: number, type: 'pct' | 'spi' | 'risk') => {
    if (type === 'pct') return v >= 70 ? '22C55E' : v >= 50 ? 'EAB308' : 'EF4444';
    if (type === 'spi') return v >= 0.95 ? '22C55E' : v >= 0.85 ? 'EAB308' : 'EF4444';
    return v === 0 ? '22C55E' : v <= 3 ? 'EAB308' : 'EF4444';
  };
  const kpis = [
    { label: 'PROGRESSO GERAL', sub: '% concluído (EV)', value: `${totalProgress}%`, color: kpiColor(totalProgress, 'pct') },
    { label: 'SPI MÉDIO', sub: 'Schedule Performance Index', value: fmtSPI(totalSPI, totalPV > 0), color: kpiColor(totalSPI, 'spi') },
    { label: 'CONCLUÍDAS', sub: 'Atividades encerradas', value: `${completedTotal} / ${allActivities.length}`, color: THEME.NAVY },
    { label: 'EM RISCO / ATRASADAS', sub: 'Requerem atenção', value: String(riskTotal), color: kpiColor(riskTotal, 'risk') },
  ];
  kpis.forEach((k, i) => {
    const cx = TX + i * (KPI_W + 0.10);
    slide.addShape('rect', { x: cx, y: TY, w: KPI_W, h: KPI_H, fill: { color: 'FFFFFF' }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.06 });
    slide.addText(k.label, { x: cx + 0.12, y: TY + 0.06, w: KPI_W - 0.24, h: 0.18, fontFace: 'Calibri', fontSize: 8, bold: true, color: THEME.NAVY, charSpacing: 1 });
    slide.addText(k.sub,   { x: cx + 0.12, y: TY + 0.22, w: KPI_W - 0.24, h: 0.14, fontFace: 'Calibri', fontSize: 7, color: THEME.MUTED });
    slide.addText(k.value, { x: cx + 0.12, y: TY + 0.36, w: KPI_W - 0.24, h: 0.40, fontFace: 'Calibri', fontSize: 22, bold: true, color: k.color });
  });

  // ── ZONA 2: Saúde por fase com Plano vs Real ─────────
  const SECTION_LABEL_Y = TY + KPI_H + 0.10;
  slide.addText('SAÚDE POR FASE — PLANO vs REAL', {
    x: TX, y: SECTION_LABEL_Y, w: TW, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, charSpacing: 1,
  });

  const PHASE_CARDS_Y = SECTION_LABEL_Y + 0.20;
  const PCARD_H = 1.30;
  const PCARD_W = (TW - 0.20) / 5;
  const PCARD_GAP = 0.05;

  phaseMetrics.forEach((x, i) => {
    const px = TX + i * (PCARD_W + PCARD_GAP);
    const isCurrent = i === currentIdx;
    const m = x.metrics;
    const phaseName = x.phase.name;

    slide.addShape('rect', {
      x: px, y: PHASE_CARDS_Y, w: PCARD_W, h: PCARD_H,
      fill: { color: isCurrent ? 'EAF1F8' : THEME.LIGHT },
      line: { color: isCurrent ? THEME.BLUE : THEME.CHIP_BD, width: isCurrent ? 0.8 : 0.5 },
      rectRadius: 0.04,
    });

    slide.addText(phaseName, {
      x: px + 0.10, y: PHASE_CARDS_Y + 0.06, w: PCARD_W - 0.55, h: 0.18,
      fontFace: 'Calibri', fontSize: 9, bold: true, color: THEME.NAVY,
    });

    const chipBg = PROGRESS_CHIP_BG[m.status] || 'F3F4F6';
    const chipFg = PROGRESS_CHIP_FG[m.status] || '374151';
    slide.addShape('rect', {
      x: px + PCARD_W - 0.50, y: PHASE_CARDS_Y + 0.06, w: 0.40, h: 0.16,
      fill: { color: chipBg }, line: { type: 'none' }, rectRadius: 0.02,
    });
    slide.addText(`${m.progress}%`, {
      x: px + PCARD_W - 0.50, y: PHASE_CARDS_Y + 0.06, w: 0.40, h: 0.16,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: chipFg, align: 'center', valign: 'middle',
    });

    // PLANO
    slide.addText('PLANO', {
      x: px + 0.10, y: PHASE_CARDS_Y + 0.28, w: PCARD_W - 0.20, h: 0.14,
      fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.MUTED, charSpacing: 0.5,
    });
    slide.addShape('rect', {
      x: px + 0.10, y: PHASE_CARDS_Y + 0.42, w: PCARD_W - 0.20, h: 0.06,
      fill: { color: 'E8ECF4' }, line: { type: 'none' }, rectRadius: 0.01,
    });
    if (m.timeProgress > 0) {
      slide.addShape('rect', {
        x: px + 0.10, y: PHASE_CARDS_Y + 0.42,
        w: ((PCARD_W - 0.20) * Math.min(m.timeProgress, 100)) / 100, h: 0.06,
        fill: { color: '9CA3AF' }, line: { type: 'none' }, rectRadius: 0.01,
      });
    }
    slide.addText(`${x.phase.activities.length} atividades · ${m.timeProgress}%`, {
      x: px + 0.10, y: PHASE_CARDS_Y + 0.50, w: PCARD_W - 0.20, h: 0.14,
      fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED,
    });

    // REAL
    slide.addText('REAL', {
      x: px + 0.10, y: PHASE_CARDS_Y + 0.68, w: PCARD_W - 0.20, h: 0.14,
      fontFace: 'Calibri', fontSize: 6.5, bold: true, color: THEME.NAVY, charSpacing: 0.5,
    });
    slide.addShape('rect', {
      x: px + 0.10, y: PHASE_CARDS_Y + 0.82, w: PCARD_W - 0.20, h: 0.06,
      fill: { color: 'E8ECF4' }, line: { type: 'none' }, rectRadius: 0.01,
    });
    if (m.progress > 0) {
      slide.addShape('rect', {
        x: px + 0.10, y: PHASE_CARDS_Y + 0.82,
        w: ((PCARD_W - 0.20) * Math.min(m.progress, 100)) / 100, h: 0.06,
        fill: { color: BAR_COLOR[m.status] || '9CA3AF' }, line: { type: 'none' }, rectRadius: 0.01,
      });
    }
    slide.addText(`${m.completed}/${m.total} · SPI ${fmtSPI(m.spi, m.pv > 0)}`, {
      x: px + 0.10, y: PHASE_CARDS_Y + 0.90, w: PCARD_W - 0.20, h: 0.14,
      fontFace: 'Calibri', fontSize: 6.5, color: THEME.NAVY,
    });
    slide.addText(STATUS_LABEL_PT[m.status] || m.status, {
      x: px + 0.10, y: PHASE_CARDS_Y + 1.05, w: PCARD_W - 0.20, h: 0.18,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: STATUS_COLOR[m.status] || '374151',
    });
  });

  // ── ZONA 3: Ações críticas ────────────────────────────
  const ACTION_LABEL_Y = PHASE_CARDS_Y + PCARD_H + 0.12;
  slide.addText('AÇÕES CRÍTICAS', {
    x: TX, y: ACTION_LABEL_Y, w: TW, h: 0.16,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY, charSpacing: 1,
  });

  const TBL_Y = ACTION_LABEL_Y + 0.18;
  const HEADER_H = 0.22;
  const COL = {
    type:   TX,
    text:   TX + 1.30,
    phase:  TX + 8.30,
    owner:  TX + 9.50,
    status: TX + 11.50,
  };

  slide.addShape('rect', { x: TX, y: TBL_Y, w: TW, h: HEADER_H, fill: { color: THEME.LIGHT }, line: { type: 'none' }, rectRadius: 0.03 });
  slide.addText('TIPO',        { x: COL.type + 0.10,   y: TBL_Y, w: 1.20, h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('AÇÃO',        { x: COL.text + 0.10,   y: TBL_Y, w: 6.80, h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('FASE',        { x: COL.phase + 0.10,  y: TBL_Y, w: 1.10, h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('RESPONSÁVEL', { x: COL.owner + 0.10,  y: TBL_Y, w: 1.90, h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });
  slide.addText('STATUS',      { x: COL.status + 0.10, y: TBL_Y, w: 1.13, h: HEADER_H, fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.NAVY, valign: 'middle' });

  let rowY = TBL_Y + HEADER_H;

  const drawGroupLabel = (label: string, isUrgent: boolean) => {
    const bg = isUrgent ? 'FEE2E2' : 'DBEAFE';
    const stripe = isUrgent ? 'EF4444' : '0033CC';
    const fg = isUrgent ? '991B1B' : '1E3A8A';
    slide.addShape('rect', { x: TX, y: rowY, w: TW, h: 0.18, fill: { color: bg }, line: { type: 'none' }, rectRadius: 0.02 });
    slide.addShape('rect', { x: TX, y: rowY, w: 0.05, h: 0.18, fill: { color: stripe }, line: { type: 'none' } });
    slide.addText(label, { x: TX + 0.12, y: rowY, w: 4.00, h: 0.18, fontFace: 'Calibri', fontSize: 7, bold: true, color: fg, charSpacing: 1, valign: 'middle' });
    rowY += 0.18;
  };

  const ROW_H_ACT = 0.26;
  const drawActionRow = (a: any) => {
    slide.addShape('line', { x: TX, y: rowY, w: TW, h: 0, line: { color: 'E8ECF4', width: 0.4 } });
    const typeBg = a.type === 'Atrasada' ? 'FEE2E2' : a.type === 'Em risco' ? 'FEF9C3' : 'DBEAFE';
    const typeFg = a.type === 'Atrasada' ? '991B1B' : a.type === 'Em risco' ? 'CA8A04' : '1E3A8A';
    slide.addShape('rect', { x: COL.type + 0.06, y: rowY + 0.05, w: 1.10, h: ROW_H_ACT - 0.10, fill: { color: typeBg }, line: { type: 'none' }, rectRadius: 0.02 });
    slide.addText(a.type, { x: COL.type + 0.06, y: rowY, w: 1.10, h: ROW_H_ACT, fontFace: 'Calibri', fontSize: 7, bold: true, color: typeFg, align: 'center', valign: 'middle' });
    slide.addText(a.text, { x: COL.text + 0.10, y: rowY, w: 6.80, h: ROW_H_ACT, fontFace: 'Calibri', fontSize: 8, color: THEME.NAVY, valign: 'middle', shrinkText: true });
    slide.addText(a.phase, { x: COL.phase + 0.10, y: rowY, w: 1.10, h: ROW_H_ACT, fontFace: 'Calibri', fontSize: 7.5, color: THEME.MUTED, valign: 'middle', shrinkText: true });
    slide.addText(a.owner, { x: COL.owner + 0.10, y: rowY, w: 1.90, h: ROW_H_ACT, fontFace: 'Calibri', fontSize: 8, color: THEME.NAVY, valign: 'middle', shrinkText: true });
    const stBg = PROGRESS_CHIP_BG[a.status] || 'F3F4F6';
    const stFg = STATUS_COLOR[a.status] || '374151';
    slide.addShape('rect', { x: COL.status + 0.06, y: rowY + 0.05, w: 1.10, h: ROW_H_ACT - 0.10, fill: { color: stBg }, line: { type: 'none' }, rectRadius: 0.02 });
    slide.addText(STATUS_LABEL_PT[a.status] || a.status, { x: COL.status + 0.06, y: rowY, w: 1.10, h: ROW_H_ACT, fontFace: 'Calibri', fontSize: 7, bold: true, color: stFg, align: 'center', valign: 'middle' });
    rowY += ROW_H_ACT;
  };

  if (overdueActs.length > 0) {
    drawGroupLabel('ATENÇÃO IMEDIATA', true);
    overdueActs.forEach((a: any) => drawActionRow(a));
  }
  if (upcomingActs.length > 0) {
    drawGroupLabel('PRÓXIMAS A INICIAR', false);
    upcomingActs.forEach((a: any) => drawActionRow(a));
  }

  if (overdueActs.length === 0 && upcomingActs.length === 0) {
    slide.addText('Nenhuma ação crítica identificada no momento.', {
      x: TX, y: rowY + 0.10, w: TW, h: 0.20,
      fontFace: 'Calibri', fontSize: 8, color: THEME.MUTED, italic: true, align: 'center',
    });
    rowY += 0.30;
  } else {
    rowY += 0.06;
  }

  // ── Legenda das siglas ────────────────────────────────
  const legendY = Math.min(rowY, TY + TOOL_AREA.h - 0.20);
  slide.addText(
    'EV (Earned Value): % de avanço real concluído.   ·   SPI (Schedule Performance Index): índice de aderência ao cronograma — >1 adiantado, =1 no prazo, <1 atrasado.   ·   DMAIC: Define, Measure, Analyze, Improve, Control.',
    {
      x: TX, y: legendY, w: TW, h: 0.16,
      fontFace: 'Calibri', fontSize: 6.5, color: THEME.MUTED, italic: true, valign: 'middle',
    }
  );

  const fileName = `Plano_de_Melhoria_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
