import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { exportarFerramentaNoTemplate, temPptTemplateAtivo } from './pptTemplateExportService';
import { TOOL_HANDLERS } from './pptToolHandlers';
import { Project } from '../types';
import { generateFullPPTReport } from './reportService';

interface RouteExportPPTParams {
  toolId: string;
  project: Project;
  localData: any;
  aiReport: any;
  availableTools: any;
  phases: any;
  initiativeName: string;
  initiativeConfigs: any;
  fishboneRef: React.RefObject<HTMLDivElement>;
}

export async function routeExportPPT(params: RouteExportPPTParams): Promise<void> {
  const {
    toolId,
    project,
    localData,
    aiReport,
    availableTools,
    phases,
    initiativeName,
    initiativeConfigs,
    fishboneRef,
  } = params;

  const handler = TOOL_HANDLERS[toolId];
  if (handler) {
    try {
      const aiAnalysis = handler.useAiReport ? (aiReport?.text || '') : '';
      if (temPptTemplateAtivo()) {
        await exportarFerramentaNoTemplate({ toolId, project, localData, aiAnalysis, options: handler.exporterOptions });
      } else {
        await handler.exporter(project, localData, aiAnalysis, handler.exporterOptions);
      }
      toast.success(handler.successMsg);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar slide. Tente novamente.');
    }
    return;
  }

  const toolImages: Record<string, string> = {};

  const needsDomCapture =
    (toolId === 'measureIshikawa' || toolId === 'charter' || toolId === 'processMap') &&
    (fishboneRef.current ||
      document.getElementById('project-charter-print') ||
      document.getElementById('process-mapper-canvas'));

  if (needsDomCapture) {
    try {
      let element: HTMLElement | null = null;
      if (toolId === 'measureIshikawa') element = fishboneRef.current;
      else if (toolId === 'charter') element = document.getElementById('project-charter-print');
      else if (toolId === 'processMap') element = document.getElementById('process-mapper-canvas');

      if (element) {
        const dataUrl = await toPng(element, {
          backgroundColor: '#ffffff',
          quality: 1.0,
          pixelRatio: 2,
          filter: (node: any) => {
            if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
              return node.href.startsWith(window.location.origin);
            }
            return true;
          },
        });
        toolImages[toolId] = dataUrl;
      }
    } catch (err) {
      console.error('Erro ao capturar ferramenta', err);
    }
  }

  const tempProjectData = {
    [toolId]: {
      toolData: localData,
      aiReport: aiReport,
    },
  };
  await generateFullPPTReport(
    project,
    tempProjectData,
    availableTools,
    phases,
    initiativeName,
    initiativeConfigs,
    toolImages
  );
}
