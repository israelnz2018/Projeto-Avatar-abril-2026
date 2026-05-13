import pptxgen from 'pptxgenjs';
import { Project, Initiative, InitiativePhaseConfig } from '../types';
import { addCoverSlide } from './coverSlide';
import { TOOL_HANDLERS } from './exportPPTRouter';
import { getAllProjectToolData } from './projectService';
import { getInitiative, getInitiativeConfigs } from './configService';
import { THEME } from './slideTemplate';

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

  slide.addShape('rect', {
    x: 0, y: 0, w: 0.07, h: 7.5,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 0.88,
    fill: { color: THEME.NAVY }, line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: 0, y: 0.81, w: 13.33, h: 0.07,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });
  slide.addText('AGENDA', {
    x: 0.40, y: 0.10, w: 8.00, h: 0.38,
    fontFace: 'Calibri', fontSize: 16, bold: true, color: 'FFFFFF',
  });
  slide.addText(`Projeto: ${project.name || ''}`, {
    x: 0.40, y: 0.46, w: 12.50, h: 0.25,
    fontFace: 'Calibri', fontSize: 9, color: 'FFFFFF', transparency: 45,
  });

  const totalPhases = phaseLabels.length;
  const colW = totalPhases > 0 ? Math.min(2.40, 11.80 / totalPhases) : 2.40;
  const startX = 0.50;
  const topY = 1.40;

  phaseLabels.forEach((p, i) => {
    const x = startX + i * (colW + 0.18);
    slide.addShape('rect', {
      x, y: topY, w: colW, h: 0.50,
      fill: { color: THEME.BLUE }, line: { type: 'none' }, rectRadius: 0.06,
    });
    slide.addText(p.label.toUpperCase(), {
      x, y: topY, w: colW, h: 0.50,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 2,
    });

    slide.addShape('rect', {
      x, y: topY + 0.60, w: colW, h: 4.40,
      fill: { color: THEME.LIGHT }, line: { color: THEME.CHIP_BD, width: 0.5 },
      rectRadius: 0.06,
    });

    if (p.tools.length === 0) {
      slide.addText('Sem ferramentas preenchidas nesta fase.', {
        x: x + 0.10, y: topY + 0.80, w: colW - 0.20, h: 0.60,
        fontFace: 'Calibri', fontSize: 9, color: THEME.MUTED, italic: true,
        align: 'center', valign: 'top',
      });
    } else {
      const items = p.tools.map(t => ({ text: t, options: { bullet: { code: '2022' } } }));
      slide.addText(items, {
        x: x + 0.14, y: topY + 0.74, w: colW - 0.28, h: 4.16,
        fontFace: 'Calibri', fontSize: 9.5, color: THEME.INK,
        paraSpaceAfter: 4, valign: 'top', shrinkText: true,
      });
    }
  });

  slide.addShape('rect', {
    x: 0, y: 7.22, w: 13.33, h: 0.28,
    fill: { color: THEME.LIGHT }, line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: 0, y: 7.22, w: 0.07, h: 0.28,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });
  slide.addText('LBW · Continuous Improvement Copilot — Agenda da Apresentação', {
    x: 0.20, y: 7.24, w: 12.00, h: 0.22,
    fontFace: 'Calibri', fontSize: 7.5, color: THEME.NAVY, transparency: 55,
  });
}

function addPhaseDividerSlide(pres: pptxgen, project: Project, phaseLabel: string): void {
  const slide = pres.addSlide();
  slide.background = { color: THEME.NAVY };

  slide.addShape('rect', {
    x: 0, y: 3.10, w: 13.33, h: 0.06,
    fill: { color: THEME.BLUE }, line: { type: 'none' },
  });

  slide.addText('FASE', {
    x: 0.50, y: 2.55, w: 12.33, h: 0.36,
    fontFace: 'Calibri', fontSize: 14, bold: true, color: THEME.BLUE,
    align: 'center', charSpacing: 6,
  });

  slide.addText(phaseLabel.toUpperCase(), {
    x: 0.50, y: 3.30, w: 12.33, h: 1.20,
    fontFace: 'Calibri', fontSize: 54, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 4,
  });

  slide.addText(project.name || '', {
    x: 0.50, y: 4.70, w: 12.33, h: 0.40,
    fontFace: 'Calibri', fontSize: 14, color: 'FFFFFF',
    align: 'center', transparency: 35,
  });
}

const ALIAS_MAP: Record<string, string> = {
  qualitativeAnalysis: 'fiveWhys',
  actionPlan5w2h: 'plan5w2h',
};

function resolveHandlerKey(toolId: string): string | null {
  if (TOOL_HANDLERS[toolId]) return toolId;
  const alias = ALIAS_MAP[toolId];
  if (alias && TOOL_HANDLERS[alias]) return alias;
  return null;
}

function getToolData(projectData: any, toolId: string): { localData: any; aiReport: any } | null {
  const raw = projectData[toolId];
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

  const phaseList: { id: string; label: string }[] = initiative?.phases?.length
    ? initiative.phases.map(p => ({ id: p.id, label: PHASE_LABELS[p.id] || p.name }))
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
      .filter(tid => projectData[tid])
      .map(tid => {
        const key = resolveHandlerKey(tid);
        return key ? (TOOL_HANDLERS[key].successMsg.replace(/^Slide d[oa] /, '').replace(/^Apresentação /, '').replace(/ gerad[oa]!?$/, '')) : tid;
      }),
  }));

  addAgendaSlide(pres, project, agendaData);

  const toolsSkipped: string[] = [];
  let toolsExported = 0;

  for (const phase of phasesWithTools) {
    const phaseToolsWithData = phase.toolIds.filter(tid => projectData[tid]);
    if (phaseToolsWithData.length === 0) continue;

    addPhaseDividerSlide(pres, project, phase.label);

    for (const toolId of phaseToolsWithData) {
      const handlerKey = resolveHandlerKey(toolId);
      if (!handlerKey) {
        toolsSkipped.push(toolId);
        continue;
      }
      const handler = TOOL_HANDLERS[handlerKey];
      const data = getToolData(projectData, toolId);
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

  const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '');
  const fileName = `Apresentacao_Final_${sanitize(project.name || 'Projeto')}_${today}.pptx`;
  await pres.writeFile({ fileName });

  return { toolsExported, toolsSkipped };
}
