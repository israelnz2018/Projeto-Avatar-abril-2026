import type { Project } from '../types';

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
import { exportRabSlide } from './rabSlideExporter';
import { exportRaciSlide } from './raciSlideExporter';
import { exportOrganogramaSlide } from './organogramaSlideExporter';
import { exportIndicadoresSlide } from './indicadoresSlideExporter';
import { exportSopSlide } from './sopSlideExporter';
import { exportBriefSlide } from './briefSlideExporter';
import { exportBeforeAfterSlide } from './beforeAfterSlideExporter';
import { exportActionPlanSlide } from './actionPlanSlideExporter';
import { exportImprovementIdeaSlide } from './improvementIdeaSlideExporter';
import { exportVsmSlide } from './vsmSlideExporter';
import { exportBpmnSlide } from './bpmnSlideExporter';
import { exportTangibleGainsSlide } from './tangibleGainsSlideExporter';

export interface ToolHandler {
  exporter: (project: Project, localData: any, aiAnalysis: string, options?: any) => Promise<void>;
  successMsg: string;
  useAiReport?: boolean;
  exporterOptions?: any;
}

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  measureIshikawa: { exporter: exportIshikawaSlide, successMsg: 'Slide da Espinha de Peixe gerado!', useAiReport: true },
  charter: { exporter: exportCharterSlide, successMsg: 'Slide do Charter gerado!' },
  sipoc: { exporter: exportSipocSlide, successMsg: 'Slide SIPOC gerado!' },
  timeline: { exporter: exportProjectTimelineSlide, successMsg: 'Slide do Cronograma gerado!' },
  improvementPlan: { exporter: exportImprovementPlanSlide, successMsg: 'Slide do Plano de Melhoria gerado!' },
  processMap: { exporter: exportProcessMapSlide, successMsg: 'Slide do Mapa de Processo gerado!' },
  brainstorming: {
    exporter: exportBrainstormingSlide,
    successMsg: 'Slide do Brainstorming gerado!',
    exporterOptions: { title: 'Brainstorming', phase: 'Measure' },
  },
  measureMatrix: { exporter: exportCauseEffectMatrixSlide, successMsg: 'Slide da Matriz Causa e Efeito gerado!' },
  stakeholderAdkar: { exporter: exportStakeholderAdkarSlide, successMsg: 'Apresentacao ADKAR Define gerada!' },
  measureAdkar: { exporter: exportMeasureAdkarSlide, successMsg: 'Apresentacao ADKAR Measure gerada!' },
  analyzeAdkar: { exporter: exportAnalyzeAdkarSlide, successMsg: 'Apresentacao ADKAR Analyze gerada!' },
  improveAdkar: { exporter: exportImproveAdkarSlide, successMsg: 'Apresentacao ADKAR Improve gerada!' },
  controlAdkar: { exporter: exportControlAdkarSlide, successMsg: 'Apresentacao ADKAR Control gerada!' },
  tangibleGains: { exporter: exportTangibleGainsSlide, successMsg: 'Slide de Ganhos Tangiveis gerado!' },
  dataCollection: { exporter: exportDataCollectionPlanSlide, successMsg: 'Slide do Plano de Coleta gerado!' },
  directObservation: { exporter: exportDirectObservationSlide, successMsg: 'Slide da Observacao Gemba gerado!' },
  fiveWhys: { exporter: exportFiveWhysSlide, successMsg: 'Slide dos 5 Porques gerado!' },
  dataNature: { exporter: exportDataNatureSlide, successMsg: 'Slide da Natureza dos Dados gerado!' },
  brainstormingImprove: {
    exporter: exportBrainstormingSlide,
    successMsg: 'Slide do Brainstorming de Solucoes gerado!',
    exporterOptions: { title: 'Brainstorming de Solucoes', phase: 'Improve' },
  },
  effortImpact: {
    exporter: exportEffortImpactSlide,
    successMsg: 'Slide do Esforco x Beneficio gerado!',
    exporterOptions: { title: 'Esforco x Beneficio', phase: 'Improve' },
  },
  fmea: { exporter: exportFmeaSlide, successMsg: 'Slide do FMEA gerado!' },
  actionPlan5w2h: { exporter: exportActionPlan5w2hSlide, successMsg: 'Slide do Plano de Acao 5W2H gerado!' },
  plan5w2h: { exporter: exportActionPlan5w2hSlide, successMsg: 'Slide do Plano de Acao 5W2H gerado!' },
  controlPlan: { exporter: exportControlPlanSlide, successMsg: 'Slide do Plano de Controle gerado!' },
  statisticalAnalysis: { exporter: exportStatisticalAnalysisSlide, successMsg: 'Slides da Analise Grafica e Estatistica gerados!' },
  gut: { exporter: exportGutSlide, successMsg: 'Slide da Matriz GUT gerado!' },
  rab: { exporter: exportRabSlide, successMsg: 'Slide da Matriz RAB gerado!' },
  raci: { exporter: exportRaciSlide, successMsg: 'Slide da Matriz RACI gerado!' },
  organograma: { exporter: exportOrganogramaSlide, successMsg: 'Slide do Organograma gerado!' },
  indicadores: { exporter: exportIndicadoresSlide, successMsg: 'Slide dos Indicadores gerado!' },
  sop: { exporter: exportSopSlide, successMsg: 'Slide do POP gerado!' },
  brief: { exporter: exportBriefSlide, successMsg: 'Slide de Entendendo o Problema gerado!' },
  beforeAfter: { exporter: exportBeforeAfterSlide, successMsg: 'Slide de Antes x Depois gerado!' },
  actionPlan: { exporter: exportActionPlanSlide, successMsg: 'Slide do Plano de Acao gerado!' },
  improvementIdea: { exporter: exportImprovementIdeaSlide, successMsg: 'Slide de Ideias de Projeto gerado!' },
  vsm: { exporter: exportVsmSlide, successMsg: 'Slide do VSM gerado!' },
  bpmnProcessMap: { exporter: exportBpmnSlide, successMsg: 'Slide do Mapa de Processo BPMN gerado!' },
};
