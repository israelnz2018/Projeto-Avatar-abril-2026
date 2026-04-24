import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  Ruler, 
  Search, 
  Zap, 
  ShieldCheck, 
  Lightbulb,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Play,
  Clock,
  X,
  Youtube,
  FileText,
  Presentation,
  Download,
  Loader2,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateFullWordReport, generateFullPPTReport, generateProjectCharterExcel } from '../../services/reportService';
import ProjectCharter from './ProjectCharter';
import ProjectBrief from './ProjectBrief';
import SIPOC from './SIPOC';
import ProcessMapper from './ProcessMapper';
import Brainstorming from './Brainstorming';
import Ishikawa from './Ishikawa';
import FiveWhys from './FiveWhys';
import ValueStreamMapping from './ValueStreamMapping';
import DirectObservationForm from './DirectObservationForm';
import StatisticalAnalysisForm from './StatisticalAnalysisForm';
import ProcessFMEA from './ProcessFMEA';
import CauseEffectMatrix from './CauseEffectMatrix';
import ActionPlan5W2H from './ActionPlan5W2H';
import ActionPlan from './ActionPlan';
import IdeationTree from './IdeationTree';
import DataNatureAssistant from './DataNatureAssistant';
import DataCollectionPlan from './DataCollectionPlan';
import ProjectTimeline from './ProjectTimeline';
import DetailedTimeline from './DetailedTimeline';
import StakeholderManagement from './StakeholderManagement';
import StandardOperatingProcedure from './StandardOperatingProcedure';
import FaultTreeAnalysis from './FaultTreeAnalysis';
import BeforeAfterTool from './BeforeAfterTool';
import RABTool from './RABTool';
import GUTTool from './GUTTool';
import EffortImpactTool from './EffortImpactTool';
import ImprovementProjectPlan from './ImprovementProjectPlan';
import WBSTool from './WBSTool';
import GPPlanPMI from './GPPlanPMI';
import StakeholderAnalysisPMI from './StakeholderAnalysisPMI';
import RiskManagementPMI from './RiskManagementPMI';
import RiskMonitoringPMI from './RiskMonitoringPMI';
import ProcessCanva from './ProcessCanva';
import ProcessModeling from './ProcessModeling';
import ProcessValidation from './ProcessValidation';
import ImprovementProjectIdea from './ImprovementProjectIdea';

import ProjectCharterPMI from './ProjectCharterPMI';
import ToolWrapper from './ToolWrapper';
import { getUserProfile } from '../UserProfile';

const AVAILABLE_TOOLS = [
  { id: 'brief', name: 'Entendendo o Problema', component: ProjectBrief, defaultPhase: 'Define' },
  { id: 'charter', name: 'Project Charter', component: ProjectCharter, defaultPhase: 'Define' },
  { id: 'projectCharterPMI', name: 'Project Charter - PMI', component: ProjectCharterPMI, defaultPhase: 'Define' },
  { id: 'sipoc', name: 'SIPOC', component: SIPOC, defaultPhase: 'Define' },
  { id: 'timeline', name: 'Cronograma Macro', component: ProjectTimeline, defaultPhase: 'Define' },
  { id: 'wbs', name: 'WBS (EAP)', component: WBSTool, defaultPhase: 'Planejamento' },
  { id: 'gpPlanPMI', name: 'Plano do GP - PMI', component: GPPlanPMI, defaultPhase: 'Iniciação' },
  { id: 'stakeholderAnalysisPMI', name: 'Análise de Stakeholders - PMI', component: StakeholderAnalysisPMI, defaultPhase: 'Iniciação' },
  { id: 'riskManagementPMI', name: 'Plano de Riscos PMI', component: RiskManagementPMI, defaultPhase: 'Planejamento' },
  { id: 'riskMonitoringPMI', name: 'Monitoramento de Riscos - PMI', component: RiskMonitoringPMI, defaultPhase: 'Monitoramento' },
  { id: 'detailedTimeline', name: 'Atividades Detalhadas', component: DetailedTimeline, defaultPhase: 'Define' },
  { id: 'improvementPlan', name: 'Plano do Projeto de Melhoria', component: ImprovementProjectPlan, defaultPhase: 'Define' },
  { id: 'stakeholders', name: 'Stakeholders', component: StakeholderManagement, defaultPhase: 'Define' },
  { id: 'processMap', name: 'Mapeamento de Processo', component: ProcessMapper, defaultPhase: 'Measure' },
  { id: 'brainstorming', name: 'Brainstorming', component: Brainstorming, defaultPhase: 'Measure' },
  { id: 'measureIshikawa', name: 'Espinha de Peixe', component: Ishikawa, defaultPhase: 'Measure' },
  { id: 'measureMatrix', name: 'Matriz Causa e Efeito', component: CauseEffectMatrix, defaultPhase: 'Measure' },
  { id: 'beforeAfter', name: 'Antes x Depois', component: BeforeAfterTool, defaultPhase: 'Measure' },
  { id: 'rab', name: 'Matriz RAB', component: RABTool, defaultPhase: 'Measure' },
  { id: 'gut', name: 'Matriz GUT', component: GUTTool, defaultPhase: 'Measure' },
  { id: 'effortImpact', name: 'Esforço x Impacto', component: EffortImpactTool, defaultPhase: 'Measure' },
  { id: 'dataCollection', name: 'Plano de Coleta de Dados', component: DataCollectionPlan, defaultPhase: 'Measure' },
  { id: 'vsm', name: 'VSM (Value Stream Map)', component: ValueStreamMapping, defaultPhase: 'Analyze' },
  { id: 'directObservation', name: 'Observação Direta (Gemba)', component: DirectObservationForm, defaultPhase: 'Analyze' },
  { id: 'fiveWhys', name: '5 Porquês', component: FiveWhys, defaultPhase: 'Analyze' },
  { id: 'fta', name: 'Árvore de Falhas (FTA)', component: FaultTreeAnalysis, defaultPhase: 'Analyze' },
  { id: 'statisticalAnalysis', name: 'Análise Estatística', component: StatisticalAnalysisForm, defaultPhase: 'Analyze' },
  { id: 'dataNature', name: 'Natureza dos Dados', component: DataNatureAssistant, defaultPhase: 'Analyze' },
  { id: 'fmea', name: 'FMEA', component: ProcessFMEA, defaultPhase: 'Improve' },
  { id: 'plan5w2h', name: 'Plano de Ação 5W2H', component: ActionPlan5W2H, defaultPhase: 'Improve' },
  { id: 'actionPlan', name: 'Plano de Ação', component: ActionPlan, defaultPhase: 'Improve' },
  { id: 'sop', name: 'POP (Procedimento Operacional Padrão)', component: StandardOperatingProcedure, defaultPhase: 'Control' },
  { id: 'processCanva', name: 'Canva', component: ProcessCanva, defaultPhase: 'Measure' },
  { id: 'processModeling', name: 'Modelagem de Processo', component: ProcessModeling, defaultPhase: 'Measure' },
  { id: 'processValidation', name: 'Validação de Processo', component: ProcessValidation, defaultPhase: 'Measure' },
  { id: 'improvementIdea', name: 'Ideia de Projeto de Melhoria', component: ImprovementProjectIdea, defaultPhase: 'PreDefinir' },
];

import { toast } from 'sonner';
import { getAllKnowledge, KnowledgeEntry } from '../../services/knowledgeService';

type Phase = 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control';

const DEFAULT_PHASES = [
  { id: 'Define', name: 'Define', icon: Target, color: '#3b82f6', description: 'Defina o escopo, objetivos e equipe.' },
  { id: 'Measure', name: 'Measure', icon: Ruler, color: '#8b5cf6', description: 'Mapeie o processo e colete dados da situação atual.' },
  { id: 'Analyze', name: 'Analyze', icon: Search, color: '#ec4899', description: 'Identifique as causas raiz do problema.' },
  { id: 'Improve', name: 'Improve', icon: Zap, color: '#10b981', description: 'Desenvolva e implemente soluções.' },
  { id: 'Control', name: 'Control', icon: ShieldCheck, color: '#6366f1', description: 'Garanta que os ganhos sejam mantidos.' },
];

import { useMemo } from 'react';
import { saveProjectToolData, getProjectToolData, updateProjectPhase, markToolAsCompleted, deleteProjectToolData, getAllProjectToolData } from '../../services/projectService';
import { getInitiativeConfigs, getInitiative, saveInitiativeConfig } from '../../services/configService';
import { Project, InitiativePhaseConfig, Initiative } from '@/src/types';

interface ProjectJourneyProps {
  projectId: string;
  project: Project;
  onPhaseChange?: (phase: string) => void;
}

export default function ProjectJourney({ projectId, project, onPhaseChange }: ProjectJourneyProps) {
  const [currentPhase, setCurrentPhase] = useState<string>(project.currentPhase || 'Define');
  const [projectData, setProjectData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [initiativeConfigs, setInitiativeConfigs] = useState<InitiativePhaseConfig[]>([]);
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeEntry[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<KnowledgeEntry | null>(null);
  const [seekTime, setSeekTime] = useState<number>(0);

  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportType, setReportType] = useState<'word' | 'ppt' | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toolVersion, setToolVersion] = useState(0);
  const [completedTools, setCompletedTools] = useState<string[]>(project.completedTools || []);

  const userProfile = getUserProfile();
  const enrichedProjectData = useMemo(() => ({
    ...projectData,
    userProfile: {
      name: userProfile.name,
      email: userProfile.email,
      company: userProfile.company,
      role: userProfile.role
    }
  }), [projectData, userProfile]);

  const handleGenerateReport = async () => {
    if (!reportType) return;
    
    setIsGeneratingReport(true);
    try {
      if (reportType === 'word') {
        await generateFullWordReport(project, projectData, AVAILABLE_TOOLS, phases, initiative?.name, initiativeConfigs);
      } else {
        await generateFullPPTReport(project, projectData, AVAILABLE_TOOLS, phases, initiative?.name, initiativeConfigs);
      }
      toast.success(`Relatório ${reportType === 'word' ? 'Word' : 'PowerPoint'} gerado com sucesso!`);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar o relatório. Tente novamente.");
    } finally {
      setIsGeneratingReport(false);
      setShowReportConfirm(false);
      setReportType(null);
    }
  };

  const phases = useMemo(() => {
    if (project.initiativeId) {
      if (initiative?.phases && initiative.phases.length > 0) {
        return initiative.phases.map(p => {
          const defaultPhase = DEFAULT_PHASES.find(dp => dp.id === p.id);
          return {
            id: p.id,
            name: p.name,
            icon: defaultPhase?.icon || Lightbulb,
            color: defaultPhase?.color || '#6366f1',
            description: defaultPhase?.description || `Fase de ${p.name}`
          };
        });
      }
      return []; // No phases defined for this project type
    }
    return DEFAULT_PHASES;
  }, [initiative, project.initiativeId]);

  const isPhaseEnabled = (phaseId: string) => {
    if (!project.initiativeId || initiativeConfigs.length === 0) return true;
    return initiativeConfigs.some(c => c.phaseId === phaseId);
  };

  const isToolEnabled = (toolId: string) => {
    // Se não há iniciativa, todas habilitadas
    if (!project.initiativeId) return true;
    if (loading) return true; 
    
    const phaseId = filteredPhases[currentPhaseIndex]?.id;
    if (!phaseId) return true;

    const config = initiativeConfigs.find(c => c.phaseId === phaseId);
    
    // Se temos configuração para esta fase, respeitamos estritamente
    if (config) {
      if (['directObservation', 'fiveWhys', 'fta'].includes(toolId)) {
        if (config.toolIds.includes('qualitativeAnalysis')) return true;
      }
      return config.toolIds.includes(toolId);
    }
    
    // Fallback: se a iniciativa tem configurações mas NÃO para ESTA fase, não está configurada
    if (initiativeConfigs.length > 0) return false;
    
    // Fallback total se não houver NENHUMA config
    return true; 
  };

  const filteredPhases = useMemo(() => phases.filter(p => isPhaseEnabled(p.id)), [phases, initiativeConfigs]);

  useEffect(() => {
    const fetchKnowledge = async () => {
      const items = await getAllKnowledge();
      setKnowledgeItems(items);
    };
    fetchKnowledge();
  }, []);

  useEffect(() => {
    if (initiative && initiative.phases && initiative.phases.length > 0) {
      const validPhaseIds = initiative.phases.map(p => p.id);
      if (!project.currentPhase || !validPhaseIds.includes(project.currentPhase)) {
        const firstPhaseId = initiative.phases[0].id;
        if (currentPhase !== firstPhaseId) {
          setCurrentPhase(firstPhaseId);
        }
      } else if (project.currentPhase !== currentPhase) {
        setCurrentPhase(project.currentPhase);
      }
    }
  }, [initiative, project.id, project.currentPhase]);

  useEffect(() => {
    if (project.completedTools) {
      setCompletedTools(project.completedTools);
    }
  }, [project.completedTools]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [allData, initConfigs, init] = await Promise.all([
        getAllProjectToolData(projectId),
        project.initiativeId ? getInitiativeConfigs(project.initiativeId) : Promise.resolve([]),
        project.initiativeId ? getInitiative(project.initiativeId) : Promise.resolve(null)
      ]);
      
      setProjectData(allData || {});
      setInitiativeConfigs(initConfigs);
      setInitiative(init);

    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [projectId, project.initiativeId]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    const syncPhase = async () => {
      // Don't sync on initial mount if the phase is already what's in the project
      if (isInitialMount.current) {
        isInitialMount.current = false;
        if (currentPhase === project.currentPhase) {
          // Even if we don't sync, we should still auto-select the tool
          autoSelectTool(currentPhase);
          return;
        }
      }

      if (onPhaseChange) {
        onPhaseChange(currentPhase);
        try {
          await updateProjectPhase(projectId, currentPhase);
          // Auto-select tool when phase changes
          autoSelectTool(currentPhase);
        } catch (error) {
          console.error("Error updating project phase:", error);
        }
      }
    };
    syncPhase();
  }, [currentPhase, onPhaseChange, projectId, project.currentPhase]);

  const autoSelectTool = (phaseId: string) => {
    if (!phaseId) return;

    const config = initiativeConfigs.find(c => c.phaseId === phaseId);
    if (config && config.toolIds.length > 0) {
      const firstId = config.toolIds[0];
      // Expand qualitativeAnalysis for auto-selection
      if (firstId === 'qualitativeAnalysis') {
        setActiveToolId('directObservation');
      } else {
        setActiveToolId(firstId);
      }
    } else {
      // Fallback: select first default tool for this phase
      const defaultTools = AVAILABLE_TOOLS.filter(t => t.defaultPhase === phaseId);
      if (defaultTools.length > 0) {
        setActiveToolId(defaultTools[0].id);
      } else {
        setActiveToolId(null);
      }
    }
  };

  const currentPhaseIndex = useMemo(() => {
    const index = filteredPhases.findIndex(p => p.id === currentPhase || p.name === currentPhase);
    return index === -1 ? 0 : index;
  }, [currentPhase, filteredPhases]);

  const handleNext = () => {
    if (currentPhaseIndex < filteredPhases.length - 1) {
      setCurrentPhase(filteredPhases[currentPhaseIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentPhaseIndex > 0) {
      setCurrentPhase(filteredPhases[currentPhaseIndex - 1].id);
    }
  };

  const getToolStorageKey = (toolId: string, phaseId: string) => {
    const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
    if (!toolDef) return toolId;
    
    // Maintain backward compatibility for the default phase
    if (toolDef.defaultPhase === phaseId) return toolId;
    
    // Use composite key if tool is used in a non-default phase
    return `${phaseId}_${toolId}`;
  };

  const handleDeleteTool = async () => {
    if (!activeToolId) return;
    
    setIsDeleting(true);
    try {
      const tool = AVAILABLE_TOOLS.find(t => t.id === activeToolId);
      const phaseId = filteredPhases[currentPhaseIndex].id;
      const storageKey = getToolStorageKey(activeToolId, phaseId);
      
      await deleteProjectToolData(projectId, storageKey);
      
      setProjectData(prev => {
        const updated = { ...prev };
        delete updated[storageKey];
        delete updated[activeToolId];
        return updated;
      });
      
      setToolVersion(prev => prev + 1);
      setCompletedTools(prev => prev.filter(id => id !== activeToolId));
      
      toast.success("Dados da ferramenta removidos com sucesso!");
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Erro ao deletar ferramenta:", error);
      toast.error("Erro ao remover os dados da ferramenta.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTool = async (storageKey: string, data: any, toolId: string, options?: { silent?: boolean }) => {
    try {
      let updatedProjectData = { ...projectData, [storageKey]: data };
      setProjectData(updatedProjectData);
      await saveProjectToolData(projectId, storageKey, data);
      
      // Mark original tool ID as completed regardless of storage key
      await markToolAsCompleted(projectId, toolId);
      setCompletedTools(prev => prev.includes(toolId) ? prev : [...prev, toolId]);
      
      if (!options?.silent) {
        toast.success("Alterações salvas com sucesso!", {
          description: "Seu progresso foi registrado no banco de dados.",
          duration: 3000,
        });
      }
      if (onPhaseChange) onPhaseChange(currentPhase);
    } catch (error) {
      if (!options?.silent) {
        toast.error("Erro ao salvar alterações.");
      }
      console.error(error);
    }
  };

  const toolIdMap: Record<string, string> = {
    'brief': 'brief',
    'charter': 'charter',
    'projectCharterPMI': 'projectCharterPMI',
    'sipoc': 'sipoc',
    'timeline': 'timeline',
    'stakeholders': 'stakeholders',
    'stakeholderAnalysisPMI': 'stakeholderAnalysisPMI',
    'riskManagementPMI': 'riskManagementPMI',
    'riskMonitoringPMI': 'riskMonitoringPMI',
    'processMap': 'processMap',
    'brainstorming': 'brainstorming',
    'measureIshikawa': 'measureIshikawa',
    'measureMatrix': 'measureMatrix',
    'vsm': 'vsm',
    'directObservation': 'directObservation',
    'statisticalAnalysis': 'statisticalAnalysis',
    'fiveWhys': 'fiveWhys',
    'dataNature': 'dataNature',
    'dataCollection': 'dataCollection',
    'fmea': 'fmea',
    'plan5w2h': 'plan5w2h',
    'actionPlan': 'actionPlan',
    'sop': 'sop',
    'fta': 'fta',
    'beforeAfter': 'beforeAfter',
    'rab': 'rab',
    'processModeling': 'processModeling',
    'processCanva': 'processCanva',
    'processValidation': 'processValidation'
  };

  const isToolCompleted = (toolId: string) => {
    return completedTools.includes(toolId);
  };

  const getToolButtonClass = (stepId: string, currentStep: string) => {
    const isActive = currentStep === stepId;
    const isCompleted = isToolCompleted(stepId);
    
    return cn(
      "px-4 py-2 rounded-[4px] text-[12px] font-bold transition-all border cursor-pointer flex items-center gap-2",
      isCompleted
        ? (isActive ? "bg-green-600 text-white border-green-600 shadow-md" : "bg-green-100 text-green-800 border-green-300 hover:bg-green-200")
        : (isActive ? "bg-[#1f2937] text-white border-[#1f2937] shadow-md" : "bg-white text-[#666] border-[#ccc] hover:bg-gray-50")
    );
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?#]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const parseTimeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const ToolVideos = ({ toolId }: { toolId: string }) => {
    const toolVideos = knowledgeItems.filter(item => item.associatedTools?.includes(toolId));
    
    if (toolVideos.length === 0) return null;

    const handleSeek = (timeStr: string) => {
      const seconds = parseTimeToSeconds(timeStr);
      setSeekTime(seconds);
    };

    return (
      <div className="mt-2 mb-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-[1px] flex-1 bg-gray-200"></div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Play size={10} className="text-red-500" />
            Vídeos de Apoio
          </span>
          <div className="h-[1px] flex-1 bg-gray-200"></div>
        </div>

        <div className="flex flex-wrap gap-2">
          {toolVideos.map((video) => (
            <motion.button
              key={video.id}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (selectedVideo?.id === video.id) {
                  setSelectedVideo(null);
                } else {
                  setSelectedVideo(video);
                  setSeekTime(0);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer shadow-sm",
                selectedVideo?.id === video.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              )}
            >
              <Play size={10} className={selectedVideo?.id === video.id ? "text-white" : "text-red-500"} />
              {video.title}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {selectedVideo && selectedVideo.associatedTools?.includes(toolId) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white border border-blue-100 rounded-[8px] p-5 shadow-xl ring-1 ring-black/5 overflow-hidden mt-4"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                    <Youtube size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">
                      {selectedVideo.title}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Assistindo agora</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                  title="Fechar vídeo"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-800">
                  <iframe
                    key={`${selectedVideo.id}-${seekTime}`}
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${getYoutubeId(selectedVideo.sourceUrl)}?start=${seekTime}&autoplay=1`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col h-full max-h-[350px]">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock size={12} className="text-blue-500" />
                    Índice do Conteúdo
                  </h5>
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    {selectedVideo.summary?.map((chapter, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSeek(chapter.time)}
                        className="w-full text-left p-2 hover:bg-white hover:shadow-sm rounded-md transition-all group flex items-center gap-3 border border-transparent hover:border-blue-100"
                      >
                        <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                          {chapter.time}
                        </span>
                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-blue-700 transition-colors line-clamp-2">
                          {chapter.topic}
                        </span>
                      </button>
                    ))}
                    {(!selectedVideo.summary || selectedVideo.summary.length === 0) && (
                      <div className="text-center py-8 text-gray-400 italic text-xs">
                        Nenhum índice disponível para este vídeo.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderPhaseContent = () => {
    const phase = filteredPhases[currentPhaseIndex];
    if (!phase) return null;

    let toolsToRender: typeof AVAILABLE_TOOLS = [];
    
    if (initiativeConfigs.length > 0) {
      const config = initiativeConfigs.find(c => {
        // Precise matching by phase ID
        return c.phaseId === phase.id;
      });

      if (config) {
        // Expand qualitativeAnalysis to individual tools for compatibility with old configs
        const expandedToolIds = config.toolIds.flatMap(id => {
          if (id === 'qualitativeAnalysis') {
            return ['directObservation', 'fiveWhys', 'fta'];
          }
          return [id];
        });
        
        // Map to tool definitions and ensure unique entries if expansion caused overlaps
        const uniqueToolIds = Array.from(new Set(expandedToolIds));
        toolsToRender = uniqueToolIds.map(id => AVAILABLE_TOOLS.find(t => t.id === id)).filter(Boolean) as any;
      } else {
        // If config exists for other phases but not this one, use defaults for this phase
        toolsToRender = AVAILABLE_TOOLS.filter(t => t.defaultPhase === phase.id);
      }
    } else {
      // Initial loading fallback or no initiative: show defaults based on defaultPhase
      toolsToRender = AVAILABLE_TOOLS.filter(t => t.defaultPhase === phase.id);
    }

    if (toolsToRender.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 font-medium">Esta ferramenta não está habilitada para esta fase.</p>
          <p className="text-gray-400 text-sm mt-1">Selecione uma das ferramentas habilitadas acima.</p>
        </div>
      );
    }

    const activeToolIndex = toolsToRender.findIndex(t => t.id === activeToolId);
    const activeTool = toolsToRender[activeToolIndex] || toolsToRender[0];
    
    const phaseId = filteredPhases[currentPhaseIndex].id;
    const storageKey = getToolStorageKey(activeTool.id, phaseId);

    // Logic to find the previous tool, even across phases
    let previousTool = null;
    if (activeToolIndex > 0) {
      previousTool = toolsToRender[activeToolIndex - 1];
    } else if (currentPhaseIndex > 0) {
      // If it's the first tool of the current phase, look at the last tool of the previous phase
      const previousPhase = filteredPhases[currentPhaseIndex - 1];
      let previousPhaseTools: typeof AVAILABLE_TOOLS = [];
      
      if (initiativeConfigs.length > 0) {
        const config = initiativeConfigs.find(c => c.phaseId === previousPhase.id);
        if (config) {
          previousPhaseTools = config.toolIds.map(id => AVAILABLE_TOOLS.find(t => t.id === id)).filter(Boolean) as any;
        }
      } else {
        previousPhaseTools = [];
      }
      
      if (previousPhaseTools.length > 0) {
        previousTool = previousPhaseTools[previousPhaseTools.length - 1];
      }
    }

    const prevToolPhaseId = activeToolIndex > 0 ? phaseId : (filteredPhases[currentPhaseIndex - 1]?.id || phaseId);
    
    const previousToolData = (() => {
      if (activeTool?.id === 'brief') {
        // Para o Brief, monta objeto com dados das três fontes DO PROJETO ATUAL
        const ideaData = projectData['improvementIdea'];
        const gutData = projectData['gut'];
        const rabData = projectData['rab'];
        
        return {
          // Projetos da Ideia de Projetos de Melhoria
          generatedProjects: ideaData?.toolData?.generatedProjects 
            || ideaData?.generatedProjects 
            || [],
          // Projetos da GUT
          gutOpportunities: gutData?.toolData?.opportunities 
            || gutData?.opportunities 
            || [],
          // Projetos da RAB
          rabOpportunities: rabData?.toolData?.opportunities 
            || rabData?.opportunities 
            || [],
        };
      }
      
      if ((activeTool?.id === 'rab' || activeTool?.id === 'gut') && projectData.improvementIdea) {
        return projectData.improvementIdea;
      }
      
      return previousTool 
        ? projectData[getToolStorageKey(previousTool.id, prevToolPhaseId)] || projectData[previousTool.id] 
        : null;
    })();

    const previousToolName = activeTool?.id === 'brief'
      ? 'Ideia de Projetos, Matriz GUT e Matriz RAB'
      : (activeTool?.id === 'rab' || activeTool?.id === 'gut') && projectData.improvementIdea
      ? 'Ideia de Projeto de Melhoria'
      : (previousTool ? previousTool.name : null);

    const isLeanSixSigma = initiative?.name?.toLowerCase().includes('lean six sigma');
    const ActiveComponent = activeTool?.component;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Ferramentas Disponíveis
            </h3>
          </div>

          {/* Report Generation Buttons - Visible if at least one tool is saved */}
          {Object.keys(projectData).length > 0 && (
            <div className="flex items-center gap-2">
              {activeToolId === 'charter' ? (
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-bold rounded-md transition-all shadow-sm cursor-pointer"
                >
                  <Printer size={14} />
                  Imprimir Contrato
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setReportType('word'); setShowReportConfirm(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-[11px] font-bold rounded-md transition-all shadow-sm cursor-pointer"
                  >
                    <FileText size={14} />
                    Gerar Word
                  </button>
                  <button
                    onClick={() => { setReportType('ppt'); setShowReportConfirm(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 text-[11px] font-bold rounded-md transition-all shadow-sm cursor-pointer"
                  >
                    <Presentation size={14} />
                    Gerar PowerPoint
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showReportConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <Download className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">Confirmar Relatório</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Atenção</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  O relatório incluirá apenas as ferramentas que foram <strong>salvas</strong> durante o projeto. As ferramentas não preenchidas ou não salvas serão omitidas. Deseja continuar com a geração do arquivo {reportType === 'word' ? 'Word' : 'PowerPoint'}?
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setShowReportConfirm(false); setReportType(null); }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition-all border-none cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all border-none cursor-pointer shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Sim, Gerar!
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {toolsToRender.map((tool, index) => {
            const isSaved = !!projectData[tool.id];
            return (
              <div key={tool.id} className="flex items-center gap-1">
                <button 
                  onClick={() => setActiveToolId(tool.id)}
                  className={getToolButtonClass(tool.id, activeTool?.id || '')}
                >
                  {isToolCompleted(tool.id) && <CheckCircle2 size={14} />}
                  {index + 1}. {tool.name}
                </button>
                {isSaved && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveToolId(tool.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                    title="Excluir dados desta ferramenta"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">Excluir Dados</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Ação Irreversível</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Você está prestes a excluir todos os dados salvos da ferramenta <strong>{activeTool?.name}</strong>. Esta ação não pode ser desfeita e a ferramenta voltará ao estado inicial (cinza). Deseja continuar?
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition-all border-none cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteTool}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-all border-none cursor-pointer shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <X size={18} />
                        Sim, Excluir!
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTool && <ToolVideos toolId={activeTool.id} />}

        {ActiveComponent ? (
          <ToolWrapper
            key={`${activeTool.id}-${storageKey}-${toolVersion}`}
            toolId={activeTool.id}
            toolName={activeTool.name}
            projectName={project.name}
            currentPhaseId={phaseId}
            initialData={
              activeTool.id === 'qualitativeAnalysis' && !projectData[storageKey]
                ? { 
                    gemba: projectData['directObservation'], 
                    fiveWhys: projectData['fiveWhys'], 
                    fta: projectData['fta'] 
                  }
                : projectData[storageKey]
            }
            onSave={(data, options) => handleSaveTool(storageKey, data, activeTool.id, options)}
            project={project}
            availableTools={AVAILABLE_TOOLS}
            phases={phases}
            initiativeName={initiative?.name}
            initiativeConfigs={initiativeConfigs}
            previousToolData={previousToolData}
            previousToolName={previousToolName}
            allProjectData={enrichedProjectData}
            showAIPrompt={
              activeTool.id === 'processMap' ? false :
              (['brief', 'rab', 'gut'].includes(activeTool.id) && isLeanSixSigma) ? !!projectData.improvementIdea : 
              true
            }
          >
            {({ onSave, initialData, onGenerateAI, isGeneratingAI }) => {
              const Component = ActiveComponent as any;
              const commonProps = {
                onSave,
                initialData: initialData?.toolData || initialData,
                previousToolData,
                previousToolName,
                onGenerateAI,
                isGeneratingAI
              };

              switch (activeTool.id) {
                case 'brief':
                  return (
                    <Component 
                      {...commonProps}
                      project={project}
                      isLeanSixSigma={isLeanSixSigma}
                      onGenerateAI={onGenerateAI}
                      isGeneratingAI={isGeneratingAI}
                      ideaProjects={
                        projectData['improvementIdea']?.toolData?.generatedProjects || 
                        projectData['improvementIdea']?.generatedProjects || 
                        []
                      }
                      gutProjects={
                        projectData['gut']?.toolData?.opportunities || 
                        projectData['gut']?.opportunities || 
                        []
                      }
                      rabProjects={
                        projectData['rab']?.toolData?.opportunities || 
                        projectData['rab']?.opportunities || 
                        []
                      }
                    />
                  );
                case 'charter':
                  return (
                    <Component 
                      {...commonProps}
                      briefData={projectData.brief}
                    />
                  );
                case 'detailedTimeline':
                  return (
                    <Component 
                      {...commonProps}
                      macroTimeline={projectData.timeline}
                    />
                  );
                case 'improvementPlan':
                  return (
                    <Component 
                      {...commonProps}
                      macroTimeline={projectData.timeline}
                    />
                  );
                case 'measureIshikawa':
                  return (
                    <Component 
                      {...commonProps}
                      briefData={projectData.brief}
                    />
                  );
                case 'measureMatrix':
                  return (
                    <Component 
                      {...commonProps}
                    />
                  );
                case 'vsm':
                case 'directObservation':
                case 'statisticalAnalysis':
                  return (
                    <Component 
                      {...commonProps}
                      allProjectData={projectData}
                    />
                  );
                case 'fiveWhys':
                case 'fta':
                  return (
                    <Component 
                      {...commonProps}
                    />
                  );
                case 'dataCollection':
                  return (
                    <Component 
                      {...commonProps}
                      teamMembers={projectData.charter?.team ? projectData.charter.team.split(',').map((s: string) => s.trim()) : []}
                    />
                  );
                case 'brainstorming':
                  return (
                    <Component 
                      {...commonProps}
                      briefData={projectData.brief}
                    />
                  );
                case 'processModeling':
                  return (
                    <Component 
                      {...commonProps}
                      data={initialData?.toolData || initialData} 
                      canvaData={projectData.processCanva}
                    />
                  );
                case 'processValidation':
                  return (
                    <Component 
                      {...commonProps}
                      data={initialData?.toolData || initialData} 
                      modelingData={projectData.processModeling}
                      projectCharter={projectData.charter}
                    />
                  );
                default:
                  return (
                    <Component 
                      {...commonProps}
                    />
                  );
              }
            }}
          </ToolWrapper>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Componente da ferramenta não encontrado.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-8 relative min-h-[calc(100vh-100px)]">
      {/* Main Content */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Progress Stepper */}
        <div className="bg-white p-4 border border-[#ccc] rounded-[4px] shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[800px] px-4">
            {filteredPhases.map((phase, i) => {
              const Icon = phase.icon;
              const isActive = currentPhase === phase.id || currentPhase === phase.name;
              const isCompleted = i < currentPhaseIndex;
              
              return (
                <div key={phase.id} className="flex items-center flex-1 last:flex-none">
                  <div 
                    className={cn(
                      "flex flex-col items-center space-y-2 cursor-pointer transition-all",
                      isActive ? "scale-110" : "opacity-60 hover:opacity-100"
                    )}
                    onClick={() => setCurrentPhase(phase.id)}
                  >
                    <div 
                      className={cn(
                        "w-[40px] h-[40px] rounded-[8px] flex items-center justify-center border-2 transition-all",
                        isActive ? "bg-[#1f2937] text-white border-[#1f2937] shadow-lg" :
                        isCompleted ? "bg-green-100 text-green-600 border-green-200" : "bg-white text-[#ccc] border-[#eee]"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isActive ? "text-[#333]" : "text-[#999]"
                    )}>
                      {phase.name}
                    </span>
                  </div>
                  {i < filteredPhases.length - 1 && (
                    <div className="flex-1 h-[2px] mx-4 bg-[#eee]">
                      <div 
                        className="h-full bg-green-500 transition-all duration-500" 
                        style={{ width: isCompleted ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase Content */}
        <div className="py-4">
          {renderPhaseContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={handleBack}
            disabled={currentPhaseIndex === 0}
            className="flex items-center px-6 py-2 text-[13px] font-bold text-[#666] hover:text-[#333] disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
          >
            <ChevronLeft size={18} className="mr-1" /> Voltar
          </button>
          <div className="text-[12px] text-[#999] font-medium italic">
            {filteredPhases[currentPhaseIndex]?.description}
          </div>
          <button
            onClick={handleNext}
            disabled={currentPhaseIndex === filteredPhases.length - 1}
            className="flex items-center px-6 py-2 text-[13px] font-bold text-[#3b82f6] hover:text-[#2563eb] disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
          >
            Avançar <ChevronRight size={18} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
