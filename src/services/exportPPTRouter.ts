import pptxgen from 'pptxgenjs';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

import { Project } from '../types';

import { exportIshikawaSlide } from './ishikawaSlideExporter';
import { exportCharterSlide } from './charterSlideExporter';
import { exportSipocSlide } from './sipocSlideExporter';
import { exportProjectTimelineSlide } from './projectTimelineSlideExporter';
import { exportImprovementPlanSlide } from './improvementPlanSlideExporter';
import { exportProcessMapSlide } from './processMapSlideExporter';
import { exportBrainstormingSlide } from './brainstormingSlideExporter';
import { exportCauseEffectMatrixSlide } from './causeEffectMatrixSlideExporter';
import { exportStakeholderAdkarSlide } from './stakeholderAdkarSlideExporter';
import { exportMeasureAdkarSlide } from './measureAdkarSlideExporter';
import { exportAnalyzeAdkarSlide } from './analyzeAdkarSlideExporter';
import { exportImproveAdkarSlide } from './improveAdkarSlideExporter';
import { exportControlAdkarSlide } from './controlAdkarSlideExporter';
import { exportDataCollectionPlanSlide } from './dataCollectionPlanSlideExporter';
import { exportDirectObservationSlide } from './directObservationSlideExporter';
import { exportFiveWhysSlide } from './fiveWhysSlideExporter';
import { exportDataNatureSlide } from './dataNatureSlideExporter';
import { exportEffortImpactSlide } from './effortImpactSlideExporter';
import { exportFmeaSlide } from './fmeaSlideExporter';
import { exportActionPlan5w2hSlide } from './actionPlan5w2hSlideExporter';
import { exportControlPlanSlide } from './controlPlanSlideExporter';
import { exportStatisticalAnalysisSlide } from './statisticalAnalysisSlideExporter';
import { exportGutSlide } from './gutSlideExporter';

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

interface ToolHandler {
  exporter: (project: Project, localData: any, aiAnalysis: string, options?: any) => Promise<void>;
  successMsg: string;
  useAiReport?: boolean;
  exporterOptions?: any;
}

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  measureIshikawa: {
    exporter: exportIshikawaSlide,
    successMsg: 'Slide da Espinha de Peixe gerado!',
    useAiReport: true,
  },
  charter: {
    exporter: exportCharterSlide,
    successMsg: 'Slide do Charter gerado!',
  },
  sipoc: {
    exporter: exportSipocSlide,
    successMsg: 'Slide SIPOC gerado!',
  },
  timeline: {
    exporter: exportProjectTimelineSlide,
    successMsg: 'Slide do Cronograma gerado!',
  },
  improvementPlan: {
    exporter: exportImprovementPlanSlide,
    successMsg: 'Slide do Plano de Melhoria gerado!',
  },
  processMap: {
    exporter: exportProcessMapSlide,
    successMsg: 'Slide do Mapa de Processo gerado!',
  },
  brainstorming: {
    exporter: exportBrainstormingSlide,
    successMsg: 'Slide do Brainstorming gerado!',
    exporterOptions: { title: 'Brainstorming', phase: 'Measure' },
  },
  measureMatrix: {
    exporter: exportCauseEffectMatrixSlide,
    successMsg: 'Slide da Matriz Causa e Efeito gerado!',
  },
  stakeholderAdkar: {
    exporter: exportStakeholderAdkarSlide,
    successMsg: 'Apresentação ADKAR Define gerada!',
  },
  measureAdkar: {
    exporter: exportMeasureAdkarSlide,
    successMsg: 'Apresentação ADKAR Measure gerada!',
  },
  analyzeAdkar: {
    exporter: exportAnalyzeAdkarSlide,
    successMsg: 'Apresentação ADKAR Analyze gerada!',
  },
  improveAdkar: {
    exporter: exportImproveAdkarSlide,
    successMsg: 'Apresentação ADKAR Improve gerada!',
  },
  controlAdkar: {
    exporter: exportControlAdkarSlide,
    successMsg: 'Apresentação ADKAR Control gerada!',
  },
  dataCollection: {
    exporter: exportDataCollectionPlanSlide,
    successMsg: 'Slide do Plano de Coleta gerado!',
  },
  directObservation: {
    exporter: exportDirectObservationSlide,
    successMsg: 'Slide da Observação Gemba gerado!',
  },
  fiveWhys: {
    exporter: exportFiveWhysSlide,
    successMsg: 'Slide dos 5 Porquês gerado!',
  },
  dataNature: {
    exporter: exportDataNatureSlide,
    successMsg: 'Slide da Natureza dos Dados gerado!',
  },
  brainstormingImprove: {
    exporter: exportBrainstormingSlide,
    successMsg: 'Slide do Brainstorming de Soluções gerado!',
    exporterOptions: { title: 'Brainstorming de Soluções', phase: 'Improve' },
  },
  effortImpact: {
    exporter: exportEffortImpactSlide,
    successMsg: 'Slide do Esforço × Impacto gerado!',
    exporterOptions: { title: 'Esforço × Impacto', phase: 'Improve' },
  },
  fmea: {
    exporter: exportFmeaSlide,
    successMsg: 'Slide do FMEA gerado!',
  },
  actionPlan5w2h: {
    exporter: exportActionPlan5w2hSlide,
    successMsg: 'Slide do Plano de Ação 5W2H gerado!',
  },
  plan5w2h: {
    exporter: exportActionPlan5w2hSlide,
    successMsg: 'Slide do Plano de Ação 5W2H gerado!',
  },
  controlPlan: {
    exporter: exportControlPlanSlide,
    successMsg: 'Slide do Plano de Controle gerado!',
  },
  statisticalAnalysis: {
    exporter: exportStatisticalAnalysisSlide,
    successMsg: 'Slides da Análise Gráfica e Estatística gerados!',
  },
  gut: {
    exporter: exportGutSlide,
    successMsg: 'Slide da Matriz GUT gerado!',
  },
};

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

  // Caminho 1: ferramentas com exporter dedicado
  const handler = TOOL_HANDLERS[toolId];
  if (handler) {
    try {
      const aiAnalysis = handler.useAiReport ? (aiReport?.text || '') : '';
      await handler.exporter(project, localData, aiAnalysis, handler.exporterOptions);
      toast.success(handler.successMsg);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar slide. Tente novamente.');
    }
    return;
  }

  // Caminho 2: ferramentas legadas que ainda dependem de captura DOM + relatório completo
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