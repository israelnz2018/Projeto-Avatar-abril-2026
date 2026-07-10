import pptxgen from 'pptxgenjs';
import { Project, Initiative, InitiativePhaseConfig } from '../types';
import { addCoverSlide } from './coverSlide';
import { TOOL_HANDLERS } from './exportPPTRouter';
import { getAllProjectToolData } from './projectService';
import { getInitiative, getInitiativeConfigs } from './configService';
import { THEME, setPhaseLabelOverride } from './slideTemplate';

const DEFAULT_PHASE_ORDER = ['Define', 'Measure', 'Analyze', 'Improve', 'Control'];

const PHASE_LABELS: Record<string, string> = {
  Define: 'Definir',
  Measure: 'Medir',
  Analyze: 'Analisar',
  Improve: 'Melhorar',
  Control: 'Controlar',
};

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function addAgendaSlide(
  pres: pptxgen,
  project: Project,
  phaseLabels: { id: string; label: string; tools: string[] }[],
): void {
  const slide = pres.addSlide();
  slide.background = { color: 'FFFFFF' };

  // Header fino — consistente com o novo template padrão
  slide.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 0.55,
    fill: { color: THEME.NAVY }, line: { type: 'none' },
  });
  slide.addText('LBW', {
    x: 0.20, y: 0, w: 0.82, h: 0.55,
    fontFace: 'Calibri', fontSize: 14, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 3,
  });
  slide.addShape('line', {
    x: 1.08, y: 0.12, w: 0, h: 0.30,
    line: { color: '8AA0E5', width: 0.5 },
  });
  slide.addText(project.name || '', {
    x: 1.18, y: 0, w: 9.60, h: 0.55,
    fontFace: 'Calibri', fontSize: 10, color: 'C7D2FF', valign: 'middle',
  });

  // Título "Agenda" abaixo do header
  slide.addText('Agenda — Conteúdo da Apresentação', {
    x: 0.33, y: 0.63, w: 12.67, h: 0.30,
    fontFace: 'Calibri', fontSize: 18, bold: true, color: THEME.NAVY,
  });

  // Colunas de fases
  const totalPhases = Math.max(phaseLabels.length, 1);
  const startX = 0.33;
  const endX = 13.00;
  const arrowW = 0.16;
  const totalW = endX - startX;
  const colW = (totalW - (totalPhases - 1) * arrowW) / totalPhases;
  const topY = 1.04;
  const colH = 6.04;

  phaseLabels.forEach((p, i) => {
    const x = startX + i * (colW + arrowW);
    const phaseNum = String(i + 1).padStart(2, '0');

    // Número da fase (01, 02...)
    slide.addText(phaseNum, {
      x, y: topY, w: colW, h: 0.28,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: THEME.BLUE,
      align: 'center', valign: 'middle', charSpacing: 2,
    });

    // Chip com nome da fase
    slide.addShape('rect', {
      x, y: topY + 0.30, w: colW, h: 0.42,
      fill: { color: THEME.NAVY }, line: { type: 'none' }, rectRadius: 0.06,
    });
    slide.addText(p.label.toUpperCase(), {
      x, y: topY + 0.30, w: colW, h: 0.42,
      fontFace: 'Calibri', fontSize: 10, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 2,
    });

    // Caixa de ferramentas
    const listY = topY + 0.76;
    const listH = colH - 0.76;
    slide.addShape('rect', {
      x, y: listY, w: colW, h: listH,
      fill: { color: THEME.LIGHT }, line: { color: THEME.CHIP_BD, width: 0.5 },
      rectRadius: 0.06,
    });

    if (p.tools.length === 0) {
      slide.addText('—', {
        x: x + 0.10, y: listY, w: colW - 0.20, h: listH,
        fontFace: 'Calibri', fontSize: 18, color: THEME.MUTED,
        align: 'center', valign: 'middle',
      });
    } else {
      const items = p.tools.map(t => ({ text: t, options: { bullet: { code: '2022' } } }));
      slide.addText(items, {
        x: x + 0.14, y: listY + 0.12, w: colW - 0.28, h: listH - 0.24,
        fontFace: 'Calibri', fontSize: 10.5, color: THEME.INK,
        paraSpaceAfter: 5, valign: 'top', shrinkText: true,
      });
    }

    // Seta entre colunas (exceto a última)
    if (i < totalPhases - 1) {
      slide.addText('›', {
        x: x + colW + 0.02, y: topY + 0.30, w: arrowW - 0.04, h: 0.42,
        fontFace: 'Calibri', fontSize: 14, color: '8AA0E5',
        align: 'center', valign: 'middle',
      });
    }
  });

  // Rodapé
  slide.addText('LBW · Continuous Improvement Copilot — Agenda da Apresentação', {
    x: 0.22, y: 7.30, w: 13.00, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, color: THEME.MUTED,
  });
}

function addPhaseDividerSlide(
  pres: pptxgen,
  project: Project,
  phaseLabel: string,
  phaseIdx: number = 0,
  totalPhases: number = 5,
): void {
  const slide = pres.addSlide();
  slide.background = { color: THEME.NAVY };

  // Número grande da fase (marca d'água sutil — levemente mais claro que NAVY)
  const phaseNum = String(phaseIdx + 1).padStart(2, '0');
  slide.addText(phaseNum, {
    x: -1.20, y: 0.60, w: 9.00, h: 6.00,
    fontFace: 'Calibri', fontSize: 240, bold: true, color: '253585',
    align: 'left', valign: 'middle',
  });

  // Eyebrow "FASE"
  slide.addText('FASE', {
    x: 0.50, y: 2.55, w: 12.33, h: 0.36,
    fontFace: 'Calibri', fontSize: 14, bold: true, color: THEME.BLUE,
    align: 'center', charSpacing: 6,
  });

  // Nome da fase
  slide.addText(phaseLabel.toUpperCase(), {
    x: 0.50, y: 3.10, w: 12.33, h: 1.20,
    fontFace: 'Calibri', fontSize: 54, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 4,
  });

  // Nome do projeto
  slide.addText(project.name || '', {
    x: 0.50, y: 4.50, w: 12.33, h: 0.40,
    fontFace: 'Calibri', fontSize: 14, color: 'C7D2FF',
    align: 'center',
  });

  // Stepper das fases da trilha (bolinhas numeradas — sem DMAIC/Seis Sigma)
  const dotSize = 0.22;
  const dotGap = 0.18;
  const effectiveTotal = Math.max(totalPhases, 1);
  const stepperW = effectiveTotal * dotSize + (effectiveTotal - 1) * dotGap;
  const startX = (13.33 - stepperW) / 2;

  for (let i = 0; i < effectiveTotal; i++) {
    const cx = startX + i * (dotSize + dotGap);
    const isCurrent = i === phaseIdx;

    slide.addShape('rect', {
      x: cx, y: 6.32, w: dotSize, h: dotSize,
      fill: { color: isCurrent ? THEME.BLUE : THEME.NAVY },
      line: { color: isCurrent ? THEME.BLUE : '5A6A9A', width: 0.75 },
      rectRadius: dotSize / 2,
    });
    slide.addText(String(i + 1), {
      x: cx - 0.06, y: 6.60, w: dotSize + 0.12, h: 0.18,
      fontFace: 'Calibri', fontSize: 7, bold: isCurrent,
      color: isCurrent ? '8AA0E5' : '4D6080',
      align: 'center',
    });
  }
}

const ALIAS_MAP: Record<string, string> = {
  qualitativeAnalysis: 'fiveWhys',
  actionPlan5w2h: 'plan5w2h',
};

// Some tools persist data under a different Firestore doc id than the toolId.
const DATA_DOC_MAP: Record<string, string> = {
  statisticalAnalysis: 'dataAnalysis',
};

function resolveHandlerKey(toolId: string): string | null {
  if (TOOL_HANDLERS[toolId]) return toolId;
  const alias = ALIAS_MAP[toolId];
  if (alias && TOOL_HANDLERS[alias]) return alias;
  return null;
}

// Uma ferramenta usada fora da sua fase padrão é salva no Firestore com a chave
// composta `${phaseId}_${toolId}` (ver getToolStorageKey em ProjectJourney). Aqui
// resolvemos a chave real dos dados tentando o toolId puro e depois os prefixos de
// fase. Aceita as fases REAIS da trilha (incluindo ids-UUID) além dos padrões DMAIC —
// senão ferramentas salvas numa fase custom (ex.: a fase "Descubra a Causa...") somem.
function resolveDataKey(projectData: any, toolId: string, phaseList?: { id: string }[]): string | null {
  const docKey = DATA_DOC_MAP[toolId] || toolId;
  if (projectData[docKey]) return docKey;
  const phaseIds = [
    ...(phaseList ? phaseList.map(p => p.id) : []),
    ...DEFAULT_PHASE_ORDER,
  ];
  const seen = new Set<string>();
  for (const phaseId of phaseIds) {
    if (seen.has(phaseId)) continue;
    seen.add(phaseId);
    const composite = `${phaseId}_${docKey}`;
    if (projectData[composite]) return composite;
  }
  return null;
}

function getToolData(projectData: any, toolId: string, phaseList?: { id: string }[]): { localData: any; aiReport: any } | null {
  const dataKey = resolveDataKey(projectData, toolId, phaseList);
  if (!dataKey) return null;
  const raw = projectData[dataKey];
  if (!raw) return null;
  const localData = raw.toolData || raw;
  return { localData, aiReport: raw.aiReport };
}

function getAiAnalysis(aiReport: any): string {
  if (!aiReport) return '';
  if (typeof aiReport === 'string') return aiReport;
  return aiReport.text || '';
}

export interface FullProjectPresentationOptions {
  userName?: string;
}

export async function generateFullProjectPresentation(
  project: Project,
  options: FullProjectPresentationOptions = {},
): Promise<{ toolsExported: number; toolsSkipped: string[] }> {
  const [projectData, initiative, configs] = await Promise.all([
    getAllProjectToolData(project.id),
    project.initiativeId ? getInitiative(project.initiativeId) : Promise.resolve(null as Initiative | null),
    project.initiativeId ? getInitiativeConfigs(project.initiativeId) : Promise.resolve([] as InitiativePhaseConfig[]),
  ]);

  // Usa o NOME REAL da fase da trilha (p.name). Só cai no rótulo DMAIC traduzido
  // quando a fase não tem nome próprio. Antes era o inverso — por isso aparecia
  // "Definir/Medir" em vez de "Entenda Como Sua Área Funciona".
  const phaseList: { id: string; label: string }[] = initiative?.phases?.length
    ? initiative.phases.map(p => ({ id: p.id, label: p.name || PHASE_LABELS[p.id] || p.id }))
    : DEFAULT_PHASE_ORDER.map(id => ({ id, label: PHASE_LABELS[id] || id }));

  const phasesWithTools = phaseList.map(p => {
    const config = configs.find(c => c.phaseId === p.id);
    const toolIds = (config?.toolIds || []).flatMap(id => {
      if (id === 'qualitativeAnalysis') return ['directObservation', 'fiveWhys', 'fta'];
      return [id];
    });
    return {
      id: p.id,
      label: p.label,
      toolIds: Array.from(new Set(toolIds)),
    };
  });

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';

  addCoverSlide(pres, project, options.userName || project.ownerEmail || '');

  const agendaData = phasesWithTools.map(p => ({
    id: p.id,
    label: p.label,
    tools: p.toolIds
      .filter(tid => resolveDataKey(projectData, tid, phaseList))
      .map(tid => {
        const key = resolveHandlerKey(tid);
        return key ? (TOOL_HANDLERS[key].successMsg.replace(/^Slide d[oa] /, '').replace(/^Apresentação /, '').replace(/ gerad[oa]!?$/, '')) : tid;
      }),
  }));

  addAgendaSlide(pres, project, agendaData);

  const toolsSkipped: string[] = [];
  let toolsExported = 0;

  for (let pIdx = 0; pIdx < phasesWithTools.length; pIdx++) {
    const phase = phasesWithTools[pIdx];
    const phaseToolsWithData = phase.toolIds.filter(tid => resolveDataKey(projectData, tid, phaseList));
    if (phaseToolsWithData.length === 0) continue;

    // Índice REAL da fase na trilha (não DMAIC) — controla o número e o stepper.
    addPhaseDividerSlide(pres, project, phase.label, pIdx, phaseList.length);

    // O cabeçalho de cada ferramenta desta fase mostra o nome REAL da fase da trilha.
    setPhaseLabelOverride(phase.label);

    for (const toolId of phaseToolsWithData) {
      const handlerKey = resolveHandlerKey(toolId);
      if (!handlerKey) {
        toolsSkipped.push(toolId);
        continue;
      }
      const handler = TOOL_HANDLERS[handlerKey];
      const data = getToolData(projectData, toolId, phaseList);
      if (!data) continue;

      const aiAnalysis = handler.useAiReport ? getAiAnalysis(data.aiReport) : '';
      const callOptions = { ...(handler.exporterOptions || {}), pres };

      try {
        await handler.exporter(project, data.localData, aiAnalysis, callOptions);
        toolsExported++;
      } catch (err) {
        console.error(`[fullProjectPresentation] Falha ao exportar ${toolId}:`, err);
        toolsSkipped.push(toolId);
      }
    }
  }
  setPhaseLabelOverride(null); // limpa o override pra não vazar pra exports avulsos

  const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '');
  const fileName = `Apresentacao_Final_${sanitize(project.name || 'Projeto')}_${today}.pptx`;
  await pres.writeFile({ fileName });

  return { toolsExported, toolsSkipped };
}
