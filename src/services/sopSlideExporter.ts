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

interface Responsibility { role?: string; responsibility?: string; }
interface ProcessStep { description?: string; }
interface ControlPoint { step?: string; criteria?: string; }
interface Definition { term?: string; definition?: string; }
interface Risk { risk?: string; control?: string; }
interface RecordItem { name?: string; location?: string; retention?: string; }
interface FlowNode { type?: string; text?: string; }
interface Revision { version?: string; date?: string; description?: string; responsible?: string; }

const str = (v: any) => (v == null ? '' : v.toString()).trim();

function drawSectionHeader(
  slide: any,
  label: string,
  x: number,
  y: number,
  w: number
): number {
  const H = 0.18;
  slide.addText(label.toUpperCase(), {
    x, y, w, h: H,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.NAVY,
    charSpacing: 1, valign: 'middle',
  });
  return y + H + 0.03;
}

// Desenha um card de texto simples (parágrafo). Retorna o novo y.
function drawTextCard(
  slide: any, label: string, text: string,
  x: number, y: number, w: number, h: number, fill: string
): number {
  y = drawSectionHeader(slide, label, x, y, w);
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: fill }, line: { color: THEME.CHIP_BD, width: 0.5 }, rectRadius: 0.04,
  });
  slide.addText(text, {
    x: x + 0.10, y: y + 0.06, w: w - 0.20, h: h - 0.12,
    fontFace: 'Calibri', fontSize: 8.5, color: THEME.INK, valign: 'top', shrinkText: true,
  });
  return y + h + 0.14;
}

// Desenha um card com pares "chave: valor" em bullets. Retorna o novo y.
function drawPairCard(
  slide: any, label: string,
  pairs: Array<{ key: string; value: string }>,
  x: number, y: number, w: number, h: number, fill: string, borderColor: string, borderW: number
): number {
  y = drawSectionHeader(slide, label, x, y, w);
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: fill }, line: { color: borderColor, width: borderW }, rectRadius: 0.04,
  });
  const runs: any[] = [];
  pairs.forEach((p, i) => {
    runs.push({
      text: `${p.key || '—'}${p.value ? ': ' : ''}`,
      options: { bold: true, color: THEME.NAVY, bullet: { code: '2022' } },
    });
    if (p.value) {
      runs.push({
        text: p.value,
        options: { bold: false, color: THEME.INK, ...(i < pairs.length - 1 ? { breakLine: true } : {}) },
      });
    } else if (i < pairs.length - 1) {
      runs[runs.length - 1].options.breakLine = true;
    }
  });
  slide.addText(runs, {
    x: x + 0.12, y: y + 0.08, w: w - 0.22, h: h - 0.16,
    fontFace: 'Calibri', fontSize: 8, valign: 'top', paraSpaceAfter: 2, shrinkText: true,
  });
  return y + h + 0.14;
}

// Desenha um card com uma lista de linhas de texto. Retorna o novo y.
function drawListCard(
  slide: any, label: string, lines: string[],
  x: number, y: number, w: number, h: number, fill: string, borderColor: string, borderW: number
): number {
  y = drawSectionHeader(slide, label, x, y, w);
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: fill }, line: { color: borderColor, width: borderW }, rectRadius: 0.04,
  });
  const runs = lines.map((t, i) => ({
    text: t,
    options: { breakLine: i < lines.length - 1 },
  }));
  slide.addText(runs, {
    x: x + 0.12, y: y + 0.08, w: w - 0.22, h: h - 0.16,
    fontFace: 'Calibri', fontSize: 8, color: THEME.INK, valign: 'top', paraSpaceAfter: 2, shrinkText: true,
  });
  return y + h + 0.14;
}

// ─── SLIDE 1 ───
function drawSlide1(
  slide: any,
  header: any,
  objective: string,
  scope: string,
  responsibilities: Responsibility[],
  processSteps: ProcessStep[]
) {
  const TX = TOOL_AREA.x, TY = TOOL_AREA.y, TW = TOOL_AREA.w, TH = TOOL_AREA.h;

  // ── BANNER (header) ──
  const BANNER_H = 0.44;
  slide.addShape('rect', {
    x: TX, y: TY, w: TW, h: BANNER_H,
    fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.04,
  });
  const bTitle = str(header.title) || 'Procedimento sem título';
  slide.addText(bTitle.toUpperCase(), {
    x: TX + 0.18, y: TY + 0.04, w: TW - 3.60, h: BANNER_H - 0.08,
    fontFace: 'Calibri', fontSize: 11, bold: true, color: 'FFFFFF',
    valign: 'middle', shrinkText: true,
  });
  const metaParts: string[] = [];
  if (str(header.code)) metaParts.push(`Cód: ${header.code}`);
  if (str(header.version)) metaParts.push(`Rev: ${header.version}`);
  if (str(header.department)) metaParts.push(`${header.department}`);
  slide.addText(metaParts.join('   ·   ') || '—', {
    x: TX + TW - 3.42, y: TY + 0.04, w: 3.24, h: BANNER_H - 0.08,
    fontFace: 'Calibri', fontSize: 8, color: 'D1D5DB',
    align: 'right', valign: 'middle', shrinkText: true,
  });

  // ── DUAS COLUNAS ──
  const bodyY = TY + BANNER_H + 0.14;
  const bodyH = TH - BANNER_H - 0.14;
  const COL_GAP = 0.24;
  const COL_W = (TW - COL_GAP) / 2;
  const LX = TX;
  const RX = TX + COL_W + COL_GAP;
  const bottom = bodyY + bodyH;

  // ─── COLUNA ESQUERDA: Objetivo, Escopo, Responsabilidades ───
  let ly = bodyY;
  if (objective) ly = drawTextCard(slide, 'Objetivo', objective, LX, ly, COL_W, 0.60, THEME.LIGHT);
  if (scope) ly = drawTextCard(slide, 'Escopo', scope, LX, ly, COL_W, 0.60, THEME.LIGHT);
  if (responsibilities.length > 0) {
    const rh = Math.max(0.30, bottom - ly - 0.21);
    drawPairCard(
      slide, 'Responsabilidades',
      responsibilities.map(r => ({ key: str(r.role) || '—', value: str(r.responsibility) })),
      LX, ly, COL_W, rh, 'EAF1F8', THEME.CHIP_BD, 0.5
    );
  }

  // ─── COLUNA DIREITA: Etapas do Processo ───
  if (processSteps.length > 0) {
    const eh = Math.max(0.30, bottom - bodyY - 0.21);
    drawListCard(
      slide, 'Etapas do Processo',
      processSteps.map((s, i) => `${i + 1}. ${str(s.description) || '—'}`),
      RX, bodyY, COL_W, eh, THEME.LIGHT, THEME.CHIP_BD, 0.5
    );
  }
}

// ─── SLIDE 2 ───
function drawSlide2(
  slide: any,
  definitions: Definition[],
  controlPoints: ControlPoint[],
  risks: Risk[],
  records: RecordItem[],
  flowchart: FlowNode[],
  revisions: Revision[],
  reviewFrequency: string,
  attachments: string
) {
  const TX = TOOL_AREA.x, TY = TOOL_AREA.y, TW = TOOL_AREA.w, TH = TOOL_AREA.h;
  const COL_GAP = 0.24;
  const COL_W = (TW - COL_GAP) / 2;
  const LX = TX;
  const RX = TX + COL_W + COL_GAP;
  const bottom = TY + TH;

  // Coluna esquerda: Definições, Pontos de Controle, Riscos
  let ly = TY;
  if (definitions.length > 0) {
    ly = drawPairCard(
      slide, 'Definições',
      definitions.map(d => ({ key: str(d.term) || '—', value: str(d.definition) })),
      LX, ly, COL_W, 1.10, THEME.LIGHT, THEME.CHIP_BD, 0.5
    );
  }
  if (controlPoints.length > 0) {
    ly = drawPairCard(
      slide, 'Pontos de Controle',
      controlPoints.map(c => ({ key: str(c.step) || '—', value: str(c.criteria) })),
      LX, ly, COL_W, 1.10, 'EAF1F8', THEME.BLUE, 0.8
    );
  }
  if (risks.length > 0) {
    const rh = Math.max(0.30, bottom - ly - 0.21);
    drawPairCard(
      slide, 'Riscos e Controles',
      risks.map(r => ({ key: str(r.risk) || '—', value: str(r.control) })),
      LX, ly, COL_W, rh, 'EAF1F8', THEME.CHIP_BD, 0.5
    );
  }

  // Coluna direita: Registros, Fluxograma, Revisões, Frequência, Anexos
  let ry = TY;
  if (records.length > 0) {
    ry = drawListCard(
      slide, 'Registros',
      records.map(r => {
        const parts = [str(r.name) || '—'];
        if (str(r.location)) parts.push(str(r.location));
        if (str(r.retention)) parts.push(`retenção: ${str(r.retention)}`);
        return `• ${parts.join(' — ')}`;
      }),
      RX, ry, COL_W, 0.90, THEME.LIGHT, THEME.CHIP_BD, 0.5
    );
  }
  if (flowchart.length > 0) {
    ry = drawListCard(
      slide, 'Fluxograma',
      flowchart.map(f => `[${str(f.type) || '—'}] ${str(f.text)}`.trim()),
      RX, ry, COL_W, 0.90, THEME.LIGHT, THEME.CHIP_BD, 0.5
    );
  }
  if (revisions.length > 0) {
    ry = drawListCard(
      slide, 'Revisões',
      revisions.map(r => {
        const parts: string[] = [];
        if (str(r.version)) parts.push(`v${str(r.version)}`);
        if (str(r.date)) parts.push(str(r.date));
        if (str(r.description)) parts.push(str(r.description));
        if (str(r.responsible)) parts.push(str(r.responsible));
        return `• ${parts.join(' — ') || '—'}`;
      }),
      RX, ry, COL_W, 0.72, THEME.LIGHT, THEME.CHIP_BD, 0.5
    );
  }
  if (reviewFrequency || attachments) {
    const rh = Math.max(0.30, bottom - ry - 0.21);
    const lines: string[] = [];
    if (reviewFrequency) lines.push(`Frequência de revisão: ${reviewFrequency}`);
    if (attachments) lines.push(`Anexos: ${attachments}`);
    drawListCard(
      slide, 'Revisão e Anexos', lines,
      RX, ry, COL_W, rh, 'EAF1F8', THEME.CHIP_BD, 0.5
    );
  }
}

export async function exportSopSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const header = (data.header && typeof data.header === 'object') ? data.header : {};
  const objective = str(data.objective);
  const scope = str(data.scope);
  const responsibilities: Responsibility[] = Array.isArray(data.responsibilities)
    ? data.responsibilities.filter((r: any) => r && (str(r.role) || str(r.responsibility)))
    : [];
  const processSteps: ProcessStep[] = Array.isArray(data.processSteps)
    ? data.processSteps.filter((s: any) => s && str(s.description))
    : [];
  const definitions: Definition[] = Array.isArray(data.definitions)
    ? data.definitions.filter((d: any) => d && (str(d.term) || str(d.definition)))
    : [];
  const controlPoints: ControlPoint[] = Array.isArray(data.controlPoints)
    ? data.controlPoints.filter((c: any) => c && (str(c.step) || str(c.criteria)))
    : [];
  const risks: Risk[] = Array.isArray(data.risks)
    ? data.risks.filter((r: any) => r && (str(r.risk) || str(r.control)))
    : [];
  const records: RecordItem[] = Array.isArray(data.records)
    ? data.records.filter((r: any) => r && (str(r.name) || str(r.location) || str(r.retention)))
    : [];
  const flowchart: FlowNode[] = Array.isArray(data.flowchart)
    ? data.flowchart.filter((f: any) => f && (str(f.type) || str(f.text)))
    : [];
  const revisions: Revision[] = Array.isArray(data.revisions)
    ? data.revisions.filter((r: any) => r && (str(r.version) || str(r.date) || str(r.description) || str(r.responsible)))
    : [];
  const reviewFrequency = str(data.reviewFrequency);
  const attachments = str(data.attachments);

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const hasSlide1 =
    !!str(header.title) || !!objective || !!scope ||
    responsibilities.length > 0 || processSteps.length > 0;
  const hasSlide2 =
    definitions.length > 0 || controlPoints.length > 0 || risks.length > 0 ||
    records.length > 0 || flowchart.length > 0 || revisions.length > 0 ||
    !!reviewFrequency || !!attachments;

  const totalPages = (hasSlide1 ? 1 : 0) + (hasSlide2 ? 1 : 0);

  if (totalPages === 0) {
    const slide = createSlide(pres, project, 'POP — Procedimento Operacional Padrão', 'Define', aiAnalysis);
    slide.addText('(não preenchido)', {
      x: TOOL_AREA.x, y: TOOL_AREA.y + TOOL_AREA.h / 2 - 0.20, w: TOOL_AREA.w, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
    const fileName = `POP_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
    if (!options.pres) await pres.writeFile({ fileName });
    return;
  }

  const suffix = (n: number) => (totalPages > 1 ? ` (${n}/${totalPages})` : '');
  let pageNum = 0;

  if (hasSlide1) {
    pageNum++;
    const slide = createSlide(
      pres, project,
      `POP — Procedimento Operacional Padrão${suffix(pageNum)}`,
      'Define', aiAnalysis
    );
    drawSlide1(slide, header, objective, scope, responsibilities, processSteps);
  }

  if (hasSlide2) {
    pageNum++;
    const slide = createSlide(
      pres, project,
      `POP — Procedimento Operacional Padrão${suffix(pageNum)}`,
      'Define', aiAnalysis
    );
    drawSlide2(slide, definitions, controlPoints, risks, records, flowchart, revisions, reviewFrequency, attachments);
  }

  const fileName = `POP_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
