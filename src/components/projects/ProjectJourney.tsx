import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight,
  ChevronLeft,
  Search,
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
  Download,
  Loader2,
  Printer,
  FileSpreadsheet,
  Lock,
  Building2,
  Microscope,
  Rocket,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateFullWordReport, generateFullPPTReport, generateProjectCharterExcel } from '../../services/reportService';
import ProjectCharter from './ProjectCharter';
import StakeholderAdkar from './StakeholderAdkar';
import AnalyzeAdkar from './AnalyzeAdkar';
import ImproveAdkar from './ImproveAdkar';
import ControlAdkar from './ControlAdkar';
import MeasureAdkar from './MeasureAdkar';
import ProjectBrief from './ProjectBrief';
import SIPOC from './SIPOC';
import ProcessMapper from './ProcessMapper';
import BpmnProcessMap from './BpmnProcessMap';
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
import CauseValidationMatrix from './CauseValidationMatrix';
import DataCollectionPlan from './DataCollectionPlan';
import ProjectTimeline from './ProjectTimeline';
import DetailedTimeline from './DetailedTimeline';
import StakeholderManagement from './StakeholderManagement';
import StandardOperatingProcedure from './StandardOperatingProcedure';
import ControlPlan from './ControlPlan';
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
import RaciTool from './RaciTool';
import Organograma from './Organograma';
import Indicadores from './Indicadores';
import Mapa90Dias from './Mapa90Dias';
import ProjectCharterPMI from './ProjectCharterPMI';
import TangibleGainsTool from './TangibleGainsTool';
import ProjectClose from './ProjectClose';
import ToolWrapper from './ToolWrapper';
import { getUserProfile } from '../UserProfile';

const AVAILABLE_TOOLS = [
  { id: 'mapa90dias', name: 'Mapa dos 90 Dias', component: Mapa90Dias },
  { id: 'brief', name: 'Entendendo o Problema', component: ProjectBrief },
  { id: 'charter', name: 'Project Charter', component: ProjectCharter },
  { id: 'stakeholderAdkar', name: 'ADKAR — Definir (Awareness)', component: StakeholderAdkar },
  { id: 'projectCharterPMI', name: 'Project Charter - PMI', component: ProjectCharterPMI },
  { id: 'measureAdkar', name: 'ADKAR — Medir (Desire)', component: MeasureAdkar },
  { id: 'analyzeAdkar', name: 'ADKAR — Analisar (Knowledge)', component: AnalyzeAdkar },
  { id: 'improveAdkar', name: 'ADKAR — Melhorar (Ability)', component: ImproveAdkar },
  { id: 'controlAdkar', name: 'ADKAR — Controlar (Reinforcement)', component: ControlAdkar },
  { id: 'sipoc', name: 'SIPOC', component: SIPOC },
  { id: 'timeline', name: 'Cronograma Macro', component: ProjectTimeline },
  { id: 'wbs', name: 'WBS (EAP)', component: WBSTool },
  { id: 'gpPlanPMI', name: 'Plano do GP - PMI', component: GPPlanPMI },
  { id: 'raci', name: 'Matriz RACI', component: RaciTool },
  { id: 'organograma', name: 'Organograma', component: Organograma },
  { id: 'indicadores', name: 'Indicadores', component: Indicadores },
  { id: 'stakeholderAnalysisPMI', name: 'Análise de Stakeholders - PMI', component: StakeholderAnalysisPMI },
  { id: 'riskManagementPMI', name: 'Plano de Riscos PMI', component: RiskManagementPMI },
  { id: 'riskMonitoringPMI', name: 'Monitoramento de Riscos - PMI', component: RiskMonitoringPMI },
  { id: 'detailedTimeline', name: 'Atividades Detalhadas', component: DetailedTimeline },
  { id: 'improvementPlan', name: 'Plano do Projeto de Melhoria', component: ImprovementProjectPlan },
  { id: 'stakeholders', name: 'Stakeholders', component: StakeholderManagement },
  { id: 'processMap', name: 'Mapeamento de Processo', component: ProcessMapper },
  { id: 'bpmnProcessMap', name: 'Mapa de Processo BPMN', component: BpmnProcessMap },
  { id: 'brainstorming', name: 'Brainstorming', component: Brainstorming },
  { id: 'brainstormingImprove', name: 'Brainstorming de Soluções', component: Brainstorming },
  { id: 'measureIshikawa', name: 'Espinha de Peixe', component: Ishikawa },
  { id: 'measureMatrix', name: 'Matriz Causa e Efeito', component: CauseEffectMatrix },
  { id: 'beforeAfter', name: 'Antes x Depois', component: BeforeAfterTool },
  { id: 'rab', name: 'Matriz RAB', component: RABTool },
  { id: 'gut', name: 'Matriz GUT', component: GUTTool },
  { id: 'effortImpact', name: 'Esforço x Benefício', component: EffortImpactTool },
  { id: 'dataCollection', name: 'Plano de Coleta de Dados', component: DataCollectionPlan },
  { id: 'vsm', name: 'VSM (Value Stream Map)', component: ValueStreamMapping },
  { id: 'directObservation', name: 'Observação Direta (Gemba)', component: DirectObservationForm },
  { id: 'fiveWhys', name: '5 Porquês', component: FiveWhys },
  { id: 'fta', name: 'Árvore de Falhas (FTA)', component: FaultTreeAnalysis },
  { id: 'statisticalAnalysis', name: 'Análise Gráfica e Estatística', component: StatisticalAnalysisForm },
  { id: 'dataNature', name: 'Natureza dos Dados', component: DataNatureAssistant },
  { id: 'causeValidation', name: 'Validação das Causas — X → Y', component: CauseValidationMatrix },
  { id: 'fmea', name: 'FMEA', component: ProcessFMEA },
  { id: 'plan5w2h', name: 'Plano de Ação 5W2H', component: ActionPlan5W2H },
  { id: 'actionPlan', name: 'Plano de Ação', component: ActionPlan },
  { id: 'sop', name: 'POP (Procedimento Operacional Padrão)', component: StandardOperatingProcedure },
  { id: 'processCanva', name: 'Canva', component: ProcessCanva },
  { id: 'processModeling', name: 'Modelagem de Processo', component: ProcessModeling },
  { id: 'processValidation', name: 'Validação de Processo', component: ProcessValidation },
  { id: 'improvementIdea', name: 'Ideia de Projeto de Melhoria', component: ImprovementProjectIdea },
  { id: 'controlPlan', name: 'Plano de Controle', component: ControlPlan },
  { id: 'tangibleGains', name: 'Ganhos Tangíveis do Projeto', component: TangibleGainsTool },
  { id: 'projectClose', name: 'Termo de Encerramento do Projeto', component: ProjectClose },
];

import { toast } from 'sonner';
import { getAllKnowledge, KnowledgeEntry } from '../../services/knowledgeService';

type Phase = 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control';

const DEFAULT_PHASES = [
  { id: 'Define', name: 'Definir', icon: Building2, color: '#3b82f6', description: 'Defina o escopo, objetivos e equipe.' },
  { id: 'Measure', name: 'Medir', icon: Search, color: '#8b5cf6', description: 'Mapeie o processo e colete dados da situação atual.' },
  { id: 'Analyze', name: 'Analisar', icon: Microscope, color: '#ec4899', description: 'Identifique as causas raiz do problema.' },
  { id: 'Improve', name: 'Melhorar', icon: Rocket, color: '#10b981', description: 'Desenvolva e implemente soluções.' },
  { id: 'Control', name: 'Controlar', icon: ShieldCheck, color: '#6366f1', description: 'Garanta que os ganhos sejam mantidos.' },
];

/**
 * Escolhe o ícone da fase pelo SIGNIFICADO do nome (palavras-chave), com
 * fallback pro ícone padrão da fase DMAIC subjacente (por id) e, por último,
 * por posição. As trilhas usam nomes customizados (ex: "Entenda como sua área
 * funciona") cujos ids ainda são Define/Measure/... — mapear só por id deixava
 * ícones genéricos/repetidos. O nome é o que de fato distingue a fase.
 */
const PHASE_ICON_KEYWORDS: { re: RegExp; icon: any }[] = [
  { re: /entend|conhe|empresa|área|area|funciona|mape/i, icon: Building2 },   // entender a área
  { re: /encontr|identific|problema|oportunidad|priori/i, icon: Search },     // encontrar problemas
  { re: /causa|raiz|investig|analis|por que|porqu/i, icon: Microscope },      // descobrir a causa
  { re: /solu|implement|melhor|executa|ação|acao|resolver/i, icon: Rocket },  // implementar solução
  { re: /comunic|apresent|influen|lideran|mudança|mudanca|story|stakeholder/i, icon: Megaphone }, // comunicar
  { re: /control|sustenta|manter|padroniz|garant/i, icon: ShieldCheck },      // controlar/sustentar
];

function getPhaseIcon(name: string, id: string, index: number): any {
  for (const { re, icon } of PHASE_ICON_KEYWORDS) {
    if (re.test(name)) return icon;
  }
  const byId = DEFAULT_PHASES.find(dp => dp.id === id)?.icon;
  if (byId) return byId;
  // Último recurso: ícone por posição (sequência DMAIC clássica).
  return [Building2, Search, Microscope, Rocket, ShieldCheck][index] || Lightbulb;
}

import { useUserAccess } from '../../hooks/useUserAccess';
import { LockedToolPopup } from '../LockedToolPopup';
import { CoursePurchasePopup } from '../CoursePurchasePopup';
import { getCourseOfferDefaults } from '../../services/courseOfferService';
import { resolveConsultorId } from '../../services/consultorService';
import { useMemo } from 'react';
import { saveProjectToolData, getProjectToolData, updateProjectPhase, setProjectPhaseCompleted, markToolAsCompleted, deleteProjectToolData, getAllProjectToolData } from '../../services/projectService';
import { getInitiativeConfigs, getInitiative, saveInitiativeConfig } from '../../services/configService';
import { Project, InitiativePhaseConfig, Initiative } from '@/src/types';

interface ProjectJourneyProps {
  projectId: string;
  project: Project;
  onPhaseChange?: (phase: string) => void;
  onActiveToolChange?: (toolId: string | null, toolLabel: string | null) => void;
}

export default function ProjectJourney({ projectId, project, onPhaseChange, onActiveToolChange }: ProjectJourneyProps) {
  const [currentPhase, setCurrentPhase] = useState<string>(project.currentPhase || 'Define');
  const [projectData, setProjectData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [initiativeConfigs, setInitiativeConfigs] = useState<InitiativePhaseConfig[]>([]);
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

useEffect(() => {
  if (onActiveToolChange) {
    const toolLabel = activeToolId ? (AVAILABLE_TOOLS.find(t => t.id === activeToolId)?.name || null) : null;
    onActiveToolChange(activeToolId, toolLabel);
  }
}, [activeToolId, onActiveToolChange]);
  
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeEntry[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<KnowledgeEntry | null>(null);
  const [seekTime, setSeekTime] = useState<number>(0);
  // Garante que clicar no mesmo item do índice recarregue o vídeo no tempo certo.
  const [seekNonce, setSeekNonce] = useState<number>(0);

  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportType, setReportType] = useState<'word' | 'ppt' | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toolVersion, setToolVersion] = useState(0);
  const [completedTools, setCompletedTools] = useState<string[]>(project.completedTools || []);
  const [completedPhases, setCompletedPhases] = useState<string[]>(project.completedPhases || []);
  const [savingPhaseCompletion, setSavingPhaseCompletion] = useState(false);
  // Mantém a ordem dos salvamentos quando o aluno confirma várias causas
  // rapidamente dentro da mesma ferramenta.
  const saveQueueByTool = useRef<Map<string, Promise<void>>>(new Map());
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false);
  // Ferramenta bloqueada abre a oferta do curso DESTE projeto — é ele que
  // destrava estas ferramentas. No tenant de um consultor não há checkout
  // Hotmart nosso pra oferecer, então lá continua o LockedToolPopup, que
  // orienta a falar com o consultor.
  const [cursoParaCompra, setCursoParaCompra] = useState<Initiative | null>(null);
  const abrirBloqueioDeFerramenta = () => {
    if (!initiative || resolveConsultorId() !== 'israel') {
      setLockedPopupOpen(true);
      return;
    }
    const padrao = getCourseOfferDefaults(initiative.name);
    setCursoParaCompra({
      ...initiative,
      precoVenda: Number(initiative.precoVenda ?? padrao.precoSugerido ?? 0),
      hotmartCheckoutUrl: String(initiative.hotmartCheckoutUrl || padrao.checkoutSugerido || ''),
    });
  };

  // ===== Guard "sair sem salvar" =====
  // A ferramenta ativa reporta se tem alteração não-salva via onDirtyChange.
  // Quando o usuário tenta trocar de ferramenta com dados sujos, abrimos um
  // popup em vez de trocar direto. pendingToolId guarda o destino pendente.
  const [isToolDirty, setIsToolDirty] = useState(false);
  const [pendingToolId, setPendingToolId] = useState<string | null>(null);

  // Troca de ferramenta COM guard: se sujo, pergunta antes; senão troca direto.
  const requestToolChange = (novoToolId: string) => {
    if (novoToolId === activeToolId) return;
    if (isToolDirty) {
      setPendingToolId(novoToolId);
    } else {
      setActiveToolId(novoToolId);
    }
  };
  // Confirma sair sem salvar → troca pro destino pendente, descarta sujeira.
  const confirmDiscardAndChange = () => {
    if (pendingToolId) {
      setIsToolDirty(false);
      setActiveToolId(pendingToolId);
      setPendingToolId(null);
    }
  };

  // Ao trocar de ferramenta, zera o dirty (o ToolWrapper remonta limpo).
  useEffect(() => { setIsToolDirty(false); }, [activeToolId]);

  const { canUseTool } = useUserAccess();

  const userProfile = getUserProfile();
  const enrichedProjectData = useMemo(() => ({
    ...projectData,
    // O mapa de datas não é enumerável no retorno do Firestore e se perdia
    // no spread acima. Sem ele, leitores consolidados podiam escolher um
    // documento legado da ferramenta em vez da versão mais recente.
    __metadata: (projectData as any).__metadata || {},
    // Prefixado para nunca colidir com um toolId: as ferramentas varrem as
    // chaves deste mapa procurando dados salvos.
    __projectId: project.id,
    userProfile: {
      name: userProfile.name,
      email: userProfile.email,
      company: userProfile.company,
      role: userProfile.role
    }
  }), [projectData, userProfile, project.id]);

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
    // Resolve o nome de exibição da fase.
    // REGRA: o nome customizado que o admin definiu no Firestore SEMPRE vence.
    // Só traduzimos quando o `name` ainda está em inglês (igual ao id padrão,
    // ex: name === 'Define'). Antes, o código traduzia pelo ID e jogava fora
    // o nome customizado — por isso o card mostrava "Encontre Problemas que
    // Merecem Atenção" mas a barra de fases mostrava "Definir".
    const PHASE_TRANSLATIONS: Record<string, string> = {
      'Define': 'Definir',
      'Measure': 'Medir',
      'Analyze': 'Analisar',
      'Improve': 'Melhorar',
      'Control': 'Controlar',
    };
    const resolvePhaseName = (id: string, name: string) => {
      // Se o admin customizou o nome (diferente do id em inglês), respeita.
      if (name && !PHASE_TRANSLATIONS[name] && name !== id) return name;
      // Caso contrário, traduz o id/name padrão pro português.
      return PHASE_TRANSLATIONS[name] || PHASE_TRANSLATIONS[id] || name;
    };

    if (project.initiativeId) {
      if (initiative?.phases && initiative.phases.length > 0) {
        return initiative.phases.map((p, idx) => {
          const defaultPhase = DEFAULT_PHASES.find(dp => dp.id === p.id);
          const resolvedName = resolvePhaseName(p.id, p.name);
          return {
            id: p.id,
            name: resolvedName,
            icon: getPhaseIcon(resolvedName, p.id, idx),
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

  useEffect(() => {
    setCompletedPhases(project.completedPhases || []);
  }, [project.id, project.completedPhases]);

  const toggleCurrentPhaseCompleted = async () => {
    const phaseId = filteredPhases[currentPhaseIndex]?.id;
    if (!phaseId || savingPhaseCompletion) return;
    const willComplete = !completedPhases.includes(phaseId);
    setSavingPhaseCompletion(true);
    setCompletedPhases((current) => willComplete
      ? Array.from(new Set([...current, phaseId]))
      : current.filter((id) => id !== phaseId));
    try {
      await setProjectPhaseCompleted(projectId, phaseId, willComplete);
      toast.success(willComplete ? 'Fase marcada como concluída.' : 'Conclusão da fase removida.');
    } catch (error) {
      setCompletedPhases((current) => willComplete
        ? current.filter((id) => id !== phaseId)
        : Array.from(new Set([...current, phaseId])));
      toast.error('Não foi possível atualizar a conclusão da fase.');
    } finally {
      setSavingPhaseCompletion(false);
    }
  };

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
      // Fase sem configuração não tem ferramenta nenhuma — e é isso mesmo. O que
      // aparece em cada fase é decisão do consultor (initiative_configs), nunca uma
      // "fase padrão" embutida na ferramenta.
      setActiveToolId(null);
    }
  };

  const currentPhaseIndex = useMemo(() => {
    const index = filteredPhases.findIndex(p => p.id === currentPhase || p.name === currentPhase);
    return index === -1 ? 0 : index;
  }, [currentPhase, filteredPhases]);

  const allEnabledTools = useMemo(() => {
    return filteredPhases.flatMap(phase => {
      let tools: typeof AVAILABLE_TOOLS = [];
      const config = initiativeConfigs.find(c => c.phaseId === phase.id);
      if (config) {
        const expandedToolIds = config.toolIds.flatMap(id => {
          if (id === 'qualitativeAnalysis') return ['directObservation', 'fiveWhys', 'fta'];
          return [id];
        });
        const uniqueToolIds = Array.from(new Set(expandedToolIds));
        tools = uniqueToolIds.map(id => AVAILABLE_TOOLS.find(t => t.id === id)).filter(Boolean) as any;
      } else {
        tools = [];
      }
      return tools.map(t => ({ toolId: t.id, phaseId: phase.id }));
    });
  }, [filteredPhases, initiativeConfigs]);

  const currentToolIndex = useMemo(() => {
    return allEnabledTools.findIndex(t => t.toolId === activeToolId && t.phaseId === currentPhase);
  }, [allEnabledTools, activeToolId, currentPhase]);

  const handleNext = () => {
    if (currentToolIndex < allEnabledTools.length - 1) {
      const next = allEnabledTools[currentToolIndex + 1];
      if (isToolDirty) { setPendingToolId(next.toolId); return; }
      if (next.phaseId !== currentPhase) {
        setCurrentPhase(next.phaseId);
      }
      setActiveToolId(next.toolId);
    }
  };

  const handleBack = () => {
    if (currentToolIndex > 0) {
      const prev = allEnabledTools[currentToolIndex - 1];
      if (isToolDirty) { setPendingToolId(prev.toolId); return; }
      if (prev.phaseId !== currentPhase) {
        setCurrentPhase(prev.phaseId);
      }
      setActiveToolId(prev.toolId);
    }
  };

  // FERRAMENTA NÃO TEM FASE. Quem decide em que fase(s) ela aparece é o consultor,
  // e isso não pode mudar ONDE o dado é gravado. A chave é sempre o toolId puro.
  //
  // Antes, uma ferramenta usada fora da "fase padrão" dela gravava em
  // `${phaseId}_${toolId}`. Como as fases de trilhas próprias têm id-UUID, a mesma
  // ferramenta acabava com dois endereços possíveis — origem dos bugs em que o botão
  // de transferência (GUT, RAB, Brief) simplesmente não aparecia. A fase saiu da conta.
  const getToolStorageKey = (toolId: string, _phaseId?: string) => toolId;

  const hasContent = (raw: any) => {
    if (!raw) return false;
    const d = raw.toolData ?? raw;
    if (d == null) return false;
    if (Array.isArray(d)) return d.length > 0;
    if (typeof d === 'object') return Object.keys(d).length > 0;
    return true;
  };

  // Todas as chaves onde o dado de uma ferramenta pode estar: a atual (`toolId`) e as
  // compostas legadas (`${phaseId}_${toolId}`), gravadas quando a ferramenta ainda
  // "pertencia" a uma fase.
  const chavesDaFerramenta = (toolId: string) =>
    [toolId, ...Object.keys(projectData).filter((k) => k !== toolId && k.endsWith(`_${toolId}`))];

  // Quando há dado em mais de uma chave, vence o MAIS RECENTE — nunca a chave.
  // Preferir a chave simples faria um projeto real (Projeto Master 2026, ferramenta
  // Ideia de Projeto) voltar a exibir a versão antiga do trabalho do aluno.
  const chaveMaisRecente = (toolId: string) => {
    const meta: Record<string, number> = (projectData as any).__metadata || {};
    const comDado = chavesDaFerramenta(toolId).filter((k) => hasContent(projectData[k]));
    if (comDado.length === 0) return null;
    return comDado.reduce((melhor, k) => ((meta[k] || 0) > (meta[melhor] || 0) ? k : melhor));
  };

  // Acha o dado de uma ferramenta sem saber em que fase ela está.
  const findToolData = (toolId: string) => {
    const chave = chaveMaisRecente(toolId);
    return chave ? projectData[chave] : undefined;
  };

  const chavesLegado = (toolId: string) => chavesDaFerramenta(toolId).slice(1);

  // Dados salvos ANTES dessa mudança estão na chave composta `${fase}_${toolId}`.
  // Nada se perde: lê-se sempre a versão mais recente, esteja onde estiver. No
  // próximo Salvar o dado migra sozinho para a chave simples.
  const resolveToolData = (toolId: string, key: string) => {
    const chave = chaveMaisRecente(toolId);
    return chave ? projectData[chave] : projectData[key];
  };

  // Progresso por FERRAMENTA SALVA (não por fase): conta quantas das ferramentas
  // habilitadas têm dado salvo em projectData. Vale pra todas as trilhas.
  const toolProgress = useMemo(() => {
    const total = allEnabledTools.length;
    if (total === 0) return { saved: 0, total: 0, percent: 0 };
    const hasData = (raw: any) => {
      if (!raw) return false;
      const d = raw.toolData ?? raw;
      if (d == null) return false;
      if (Array.isArray(d)) return d.length > 0;
      if (typeof d === 'object') return Object.keys(d).length > 0;
      return true;
    };
    const saved = allEnabledTools.filter(({ toolId }) =>
      hasData(projectData[toolId]) || chavesLegado(toolId).some((k) => hasData(projectData[k]))
    ).length;
    return { saved, total, percent: Math.round((saved / total) * 100) };
  }, [allEnabledTools, projectData]);

  const handleDeleteTool = async () => {
    if (!activeToolId) return;
    
    setIsDeleting(true);
    try {
      const tool = AVAILABLE_TOOLS.find(t => t.id === activeToolId);
      // Apaga a chave atual E as compostas antigas: se sobrasse uma composta, o
      // fallback de leitura traria o dado de volta e a exclusão pareceria não funcionar.
      const chaves = Array.from(new Set([activeToolId, ...chavesLegado(activeToolId)]));

      for (const chave of chaves) {
        await deleteProjectToolData(projectId, chave, activeToolId);
      }

      setProjectData(prev => {
        const updated = { ...prev };
        chaves.forEach((chave) => delete updated[chave]);
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
      // "Limpar dados da IA" (dentro de cada ferramenta) chama onSave(null) pra
      // apagar o conteúdo — isso vale pra QUALQUER ferramenta, não só uma. Sem essa
      // checagem, o código abaixo marcava a ferramenta como concluída mesmo tendo
      // acabado de ficar vazia (o "box" ficava verde depois de limpar/excluir).
      // Trata como exclusão: mesma limpeza que o botão de excluir já faz certo.
      if (!hasContent(data)) {
        const chaves = Array.from(new Set([storageKey, toolId, ...chavesLegado(toolId)]));
        for (const chave of chaves) {
          await deleteProjectToolData(projectId, chave, toolId);
        }
        setProjectData(prev => {
          const updated = { ...prev };
          chaves.forEach((chave) => delete updated[chave]);
          return updated;
        });
        setCompletedTools(prev => prev.filter(id => id !== toolId));
        if (onPhaseChange) onPhaseChange(currentPhase);
        return;
      }

      const updatedMetadata = {
        ...((projectData as any).__metadata || {}),
        [storageKey]: Date.now(),
      };
      let updatedProjectData = { ...projectData, [storageKey]: data };
      Object.defineProperty(updatedProjectData, '__metadata', {
        value: updatedMetadata,
        enumerable: false,
        configurable: true,
      });
      setProjectData(updatedProjectData);
      const previousSave = saveQueueByTool.current.get(storageKey) || Promise.resolve();
      const queuedSave = previousSave
        .catch(() => undefined)
        .then(() => saveProjectToolData(projectId, storageKey, data));
      saveQueueByTool.current.set(storageKey, queuedSave);
      await queuedSave;
      if (saveQueueByTool.current.get(storageKey) === queuedSave) {
        saveQueueByTool.current.delete(storageKey);
      }

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
    'causeValidation': 'causeValidation',
    'dataCollection': 'dataCollection',
    'fmea': 'fmea',
    'plan5w2h': 'plan5w2h',
    'actionPlan': 'actionPlan',
    'sop': 'sop',
    'fta': 'fta',
    'beforeAfter': 'beforeAfter',
    'rab': 'rab',
    'analyzeAdkar': 'analyzeAdkar',
    'improveAdkar': 'improveAdkar',
    'controlAdkar': 'controlAdkar',
    'processModeling': 'processModeling',
    'processCanva': 'processCanva',
    'processValidation': 'processValidation',
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
    // Dedup por sourceUrl — knowledge_base tem multi-placement (mesmo vídeo em N cursos),
    // sem isso o mesmo vídeo aparece repetido em "Vídeos de Apoio".
    const toolVideos = knowledgeItems
      .filter(item => item.associatedTools?.includes(toolId))
      .filter((v, idx, arr) => v.sourceUrl && arr.findIndex(x => x.sourceUrl === v.sourceUrl) === idx);

    if (toolVideos.length === 0) return null;

    const handleSeek = (timeStr: string) => {
      const seconds = parseTimeToSeconds(timeStr);
      setSeekTime(seconds);
      setSeekNonce(n => n + 1); // força o player a recarregar mesmo no mesmo tempo
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
                {/* Índice à ESQUERDA */}
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

                {/* Vídeo à DIREITA */}
                <div
                  className="relative lg:col-span-2 aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-800"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <iframe
                    key={`${selectedVideo.id}-${seekTime}-${seekNonce}`}
                    width="100%"
                    height="100%"
                    src={`https://iframe.mediadelivery.net/embed/${selectedVideo.bunnyLibraryId}/${selectedVideo.bunnyVideoId}?autoplay=true&preload=true&t=${seekTime}`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  {/* Overlays: topo (título/compartilhar) e cantos inferiores (link 🔗 / logo YouTube) */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70, zIndex: 20, pointerEvents: 'auto' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 95, zIndex: 20, pointerEvents: 'auto' }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 320, height: 95, zIndex: 20, pointerEvents: 'auto' }} />
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

    // Mostra exatamente as ferramentas configuradas na iniciativa para esta fase
    let configuredToolIds: string[] = [];
    if (initiativeConfigs.length > 0) {
      const config = initiativeConfigs.find(c => c.phaseId === phase.id);
      if (config) {
        configuredToolIds = config.toolIds.flatMap(id => {
          if (id === 'qualitativeAnalysis') return ['directObservation', 'fiveWhys', 'fta'];
          return [id];
        });
      }
    }

    const toolsToRender = Array.from(new Set(configuredToolIds))
      .map(id => AVAILABLE_TOOLS.find(t => t.id === id))
      .filter(Boolean) as typeof AVAILABLE_TOOLS;

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

    const previousToolData = (() => {
      if (activeTool?.id === 'brief') {
        // Para o Brief, monta objeto com dados das três fontes DO PROJETO ATUAL
        const ideaData = findToolData('improvementIdea');
        const gutData = findToolData('gut');
        const rabData = findToolData('rab');
        
        return {
          // Projetos da Ideia de Projetos de Melhoria — só os aprovados pelo aluno
          generatedProjects: (ideaData?.toolData?.generatedProjects
            || ideaData?.generatedProjects
            || []).filter((p: any) => p?.aprovado !== false),
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
      
      if ((activeTool?.id === 'rab' || activeTool?.id === 'gut') && findToolData('improvementIdea')) {
        return findToolData('improvementIdea');
      }
      
      return previousTool ? findToolData(previousTool.id) ?? null : null;
    })();

    const previousToolName = activeTool?.id === 'brief'
      ? 'Ideia de Projetos, Matriz GUT e Matriz RAB'
      : (activeTool?.id === 'rab' || activeTool?.id === 'gut') && findToolData('improvementIdea')
      ? 'Ideia de Projeto de Melhoria'
      : (previousTool ? previousTool.name : null);

    const ActiveComponent = activeTool?.component;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Ferramentas Disponíveis
            </h3>
            <label className="ml-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={completedPhases.includes(phase.id)}
                onChange={toggleCurrentPhaseCompleted}
                disabled={savingPhaseCompletion}
                className="h-4 w-4 accent-emerald-600 cursor-pointer disabled:cursor-wait"
              />
              {savingPhaseCompletion
                ? 'Salvando...'
                : completedPhases.includes(phase.id)
                  ? 'Fase concluída'
                  : 'Marcar fase como concluída'}
            </label>
          </div>

          {/* Report Generation Buttons - Visible if tool is charter and saved */}
          {Object.keys(projectData).length > 0 && activeToolId === 'charter' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-bold rounded-md transition-all shadow-sm cursor-pointer"
              >
                <Printer size={14} />
                Imprimir Contrato
              </button>
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
            const hasAccess = canUseTool(tool.id);

            return (
              <div key={tool.id} className="flex items-center gap-1 relative">
                {!hasAccess && (
                  <div className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm z-10 pointer-events-none">
                    <Lock size={10} className="text-gray-600" />
                  </div>
                )}
                <button
                  onClick={() => {
                    if (hasAccess) {
                      requestToolChange(tool.id);
                    } else {
                      abrirBloqueioDeFerramenta();
                    }
                  }}
                  className={cn(
                    getToolButtonClass(tool.id, activeTool?.id || ''),
                    !hasAccess && "opacity-75"
                  )}
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

        {/* Popup "sair sem salvar" — aparece ao trocar de ferramenta com dados sujos */}
        <AnimatePresence>
          {pendingToolId && (
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
                  <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight">Sair sem salvar?</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Você tem alterações não salvas</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Você fez alterações nesta ferramenta que ainda não foram salvas. Se sair agora, elas serão perdidas. O que deseja fazer?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPendingToolId(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition-all border-none cursor-pointer"
                  >
                    Continuar editando
                  </button>
                  <button
                    onClick={confirmDiscardAndChange}
                    className="flex-1 px-4 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-all border-none cursor-pointer shadow-lg shadow-amber-200"
                  >
                    Sair sem salvar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                : resolveToolData(activeTool.id, storageKey)
            }
            onSave={(data, options) => handleSaveTool(storageKey, data, activeTool.id, options)}
            project={project}
            availableTools={AVAILABLE_TOOLS}
            phases={phases}
            initiativeName={initiative?.name}
            initiative={initiative}
            initiativeConfigs={initiativeConfigs}
            previousToolData={previousToolData}
            previousToolName={previousToolName}
            allProjectData={enrichedProjectData}
            // O caso especial de brief/rab/gut saiu daqui. Ele testava
            // `projectData.improvementIdea` — chave CRUA, que só existe quando a Ideia de
            // Projeto está na fase padrão. No Yellow Belt ela fica numa fase de id próprio,
            // a chave real vira `<fase>_improvementIdea` e o gate zerava, escondendo os
            // botões de gerar/migrar. Quem decide agora é `linkHasContent` no ToolWrapper,
            // que resolve a chave por prefixo e respeita as ligações declaradas do projeto.
            //
            // O Mapeamento de Processo também ficava bloqueado aqui, de quando não havia
            // nada que soubesse alimentá-lo. Agora existe: o SIPOC entrega o esqueleto do
            // fluxo. Sem ligação declarada nada aparece de qualquer forma.
            showAIPrompt={true}
          >
            {({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData, allProjectData: wrapperAllProjectData }) => {
              const Component = ActiveComponent as any;
              const commonProps = {
                toolId: activeTool.id,
                onSave,
                initialData: initialData && typeof initialData === 'object' && 'toolData' in initialData
                  ? initialData.toolData
                  : initialData,
                previousToolData,
                previousToolName,
                onGenerateAI,
                isGeneratingAI,
                onClearAIData,
                onDirtyChange: setIsToolDirty,
                allProjectData: wrapperAllProjectData,
                causeValidationRequired: allEnabledTools.some((tool) => tool.toolId === 'causeValidation')
              };

              switch (activeTool.id) {
                case 'brief':
                  return (
                    <Component 
                      {...commonProps}
                      project={project}
                      onGenerateAI={onGenerateAI}
                      isGeneratingAI={isGeneratingAI}
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
                case 'causeValidation':
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
                case 'stakeholderAdkar':
                case 'measureAdkar':
                  return (
                    <Component 
                      {...commonProps}
                      allProjectData={projectData}
                      stakeholderAdkarData={projectData?.stakeholderAdkar}
                    />
                  );
                case 'analyzeAdkar':
                  return (
                    <Component 
                      {...commonProps}
                      allProjectData={projectData}
                      measureAdkarData={projectData?.measureAdkar}
                    />
                  );
                case 'improveAdkar':
                  return (
                    <Component 
                      {...commonProps}
                      allProjectData={projectData}
                      analyzeAdkarData={projectData?.analyzeAdkar}
                    />
                  );
                case 'controlAdkar':
                  return (
                    <Component 
                      {...commonProps}
                      allProjectData={projectData}
                      improveAdkarData={projectData?.improveAdkar}
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
        {/* Progress Stepper — redesign limpo, sem scroll horizontal forçado */}
        <div className="bg-white p-5 border border-[#e5e7eb] rounded-xl shadow-sm">
          {/* Header: Fase atual + % concluído */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-[#1E2D6E]">
              <span>Fase {currentPhaseIndex + 1} de {filteredPhases.length}</span>
              <span className="text-[#9CA3AF]">·</span>
              <span className="text-[#0033CC]">
                {toolProgress.saved}/{toolProgress.total} ferramentas · {toolProgress.percent}% concluído
              </span>
            </div>
            <span className="text-[11px] text-[#9CA3AF] font-medium truncate max-w-[60%]" title={filteredPhases[currentPhaseIndex]?.name}>
              {filteredPhases[currentPhaseIndex]?.name}
            </span>
          </div>

          {/* Barra de progresso linear contínua acima dos passos */}
          <div className="relative h-1.5 bg-[#f3f4f6] rounded-full mb-5 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0033CC] to-[#1E2D6E] rounded-full transition-all duration-500"
              style={{ width: `${toolProgress.percent}%` }}
            />
          </div>

          {/* Steps — tamanhos consistentes, texto maior, truncate em 2 linhas */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${filteredPhases.length}, minmax(0, 1fr))` }}>
            {filteredPhases.map((phase, i) => {
              const Icon = phase.icon;
              const isActive = currentPhase === phase.id || currentPhase === phase.name;
              const isCompleted = completedPhases.includes(phase.id);
              return (
                <button
                  key={phase.id}
                  onClick={() => setCurrentPhase(phase.id)}
                  title={phase.name}
                  className={cn(
                    "group flex flex-col items-center text-center gap-2 p-2 rounded-lg transition-all cursor-pointer border-0 bg-transparent",
                    isActive
                      ? isCompleted ? "bg-emerald-50" : "bg-[#F0F2FA]"
                      : "hover:bg-[#f9fafb]"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      isCompleted
                        ? "bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-100 scale-105"
                        : isActive
                          ? "bg-gradient-to-br from-[#0033CC] to-[#1E2D6E] text-white shadow-lg shadow-blue-200 scale-105"
                          : "bg-[#eef0f7] text-[#8A93B0] group-hover:bg-[#e0e4f0] group-hover:text-[#1E2D6E]"
                    )}
                  >
                    {isCompleted ? <CheckCircle2 size={22} /> : <Icon size={22} strokeWidth={2} />}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] leading-tight font-bold tracking-tight line-clamp-2",
                      isCompleted ? "text-emerald-700" : isActive ? "text-[#1E2D6E]" : "text-[#6B7280]"
                    )}
                  >
                    {phase.name}
                  </span>
                </button>
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
            disabled={currentToolIndex <= 0}
            className="flex items-center px-6 py-2 text-[13px] font-bold text-[#666] hover:text-[#333] disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
          >
            <ChevronLeft size={18} className="mr-1" /> Voltar
          </button>
          <div className="text-[12px] text-[#999] font-medium italic">
            {filteredPhases[currentPhaseIndex]?.description}
          </div>
          <button
            onClick={handleNext}
            disabled={currentToolIndex >= allEnabledTools.length - 1}
            className="flex items-center px-6 py-2 text-[13px] font-bold text-[#3b82f6] hover:text-[#2563eb] disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
          >
            Avançar <ChevronRight size={18} className="ml-1" />
          </button>
        </div>
      </div>
      <LockedToolPopup isOpen={lockedPopupOpen} onClose={() => setLockedPopupOpen(false)} />
      <CoursePurchasePopup course={cursoParaCompra} onClose={() => setCursoParaCompra(null)} />
    </div>
  );
}
