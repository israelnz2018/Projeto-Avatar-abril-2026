import React, { useState, useEffect, useMemo } from 'react';
import { ehCurso, ehTipoDeProjeto } from '../lib/tipoIniciativa';
import { 
  Plus, 
  Trash2, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  PlusCircle, 
  X,
  Layout,
  Layers,
  Wrench,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Volume2,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  getInitiatives,
  createInitiative,
  updateInitiative,
  getInitiativeConfigs,
  saveInitiativeConfig,
  saveInitiativeToolLinks,
  seedDefaultInitiative,
  restoreDefaultMethodologies,
  getFerramentasRascunho,
  toggleFerramentaRascunho,
  getToolCategories,
  saveToolCategories,
  ToolCategoryId,
  propagarRenomeacaoParaAcessos,
  registrarNomeAnterior,
} from '../services/configService';
import { updateCourseName } from '../services/knowledgeService';
import { useUserAccess } from '../hooks/useUserAccess';
import { isSiteConsultor } from '../services/consultorService';
import { Initiative, InitiativePhaseConfig, ToolLink } from '../types';
import { getToolPositions, saoVizinhas, LINKABLE_TARGETS } from '../services/toolLinks';
import MentorContextEditor from './projects/MentorContextEditor';
import { getAllToolContexts, MentorToolContext } from '../services/mentorContextService';
import { Link2, ArrowRight } from 'lucide-react';
import { ICON_CATALOG, COLOR_CATALOG, resolveInitiativeVisual } from '../services/initiativeVisual';
import { uploadInitiativeIcon } from '../services/brandingUploadService';

const DEFAULT_PHASES = [
  { id: 'Define', name: 'Definir' },
  { id: 'Measure', name: 'Medir' },
  { id: 'Analyze', name: 'Analisar' },
  { id: 'Improve', name: 'Melhorar' },
  { id: 'Control', name: 'Controlar' },
];

/**
 * CATÁLOGO DE FERRAMENTAS DA PLATAFORMA
 *
 * ⚠️ AO ADICIONAR UMA FERRAMENTA NOVA, ATUALIZE OS 4 LUGARES ABAIXO:
 *
 * 1. ESTE ARRAY (AVAILABLE_TOOLS) — id + nome + fase. É o catálogo visível
 *    na tela "Ferramentas por Projeto".
 *
 * 2. src/components/projects/ProjectJourney.tsx — array de routing onde
 *    cada toolId é mapeado pro seu componente React.
 *    Exemplo: { id: 'raci', name: 'Matriz RACI', component: RaciTool }
 *    Sem fase: em que fase a ferramenta entra é decisão do consultor.
 *
 * 3. src/services/configService.ts — função `seedDefaultInitiative`. Adicione
 *    o toolId ao array `toolIds` da fase apropriada nas iniciativas DMAIC,
 *    PMI e/ou Pequenas Melhorias. Sem isso a ferramenta nasce desmarcada
 *    nas iniciativas seedadas.
 *
 * 4. INICIATIVAS EXISTENTES NO FIRESTORE — o seed só roda na primeira vez.
 *    Pra que a ferramenta apareça em iniciativas já criadas, vá manualmente
 *    em cada uma: Ferramentas por Projeto → escolha a iniciativa → fase
 *    correspondente → clique no card da ferramenta → Salvar.
 *
 * Sem os 4 passos, a ferramenta pode existir no código mas não aparecer
 * no app — exatamente o sintoma que sempre te frustrou.
 */
// FERRAMENTA NÃO TEM FASE. Este catálogo é só id + nome: em que fase (e em que
// ordem) cada ferramenta entra é decisão exclusiva do consultor, gravada em
// initiative_configs. Nada aqui pode voltar a amarrar ferramenta a fase.
const AVAILABLE_TOOLS = [
  { id: 'mapa90dias', name: 'Mapa dos 90 Dias' },
  { id: 'brief', name: 'Entendendo o Problema' },
  { id: 'charter', name: 'Project Charter' },
  { id: 'stakeholderAdkar', name: 'ADKAR — Definir (Awareness)' },
  { id: 'projectCharterPMI', name: 'Project Charter - PMI' },
  { id: 'measureAdkar', name: 'ADKAR — Medir (Desire)' },
  { id: 'analyzeAdkar', name: 'ADKAR — Analisar (Knowledge)' },
  { id: 'improveAdkar', name: 'ADKAR — Melhorar (Ability)' },
  { id: 'controlAdkar', name: 'ADKAR — Controlar (Reinforcement)' },
  { id: 'sipoc', name: 'SIPOC' },
  { id: 'timeline', name: 'Cronograma Macro' },
  { id: 'wbs', name: 'WBS (EAP)' },
  { id: 'gpPlanPMI', name: 'Plano do GP - PMI' },
  { id: 'raci', name: 'Matriz RACI' },
  { id: 'organograma', name: 'Organograma' },
  { id: 'indicadores', name: 'Indicadores' },
  { id: 'detailedTimeline', name: 'Atividades Detalhadas' },
  { id: 'riskManagementPMI', name: 'Plano de Riscos PMI' },
  { id: 'riskMonitoringPMI', name: 'Monitoramento de Riscos - PMI' },
  { id: 'improvementPlan', name: 'Plano do Projeto de Melhoria' },
  { id: 'stakeholders', name: 'Stakeholders' },
  { id: 'stakeholderAnalysisPMI', name: 'Análise de Stakeholders - PMI' },
  { id: 'processMap', name: 'Mapeamento de Processo' },
  { id: 'bpmnProcessMap', name: 'Mapa de Processo BPMN' },
  { id: 'brainstorming', name: 'Brainstorming' },
  { id: 'brainstormingImprove', name: 'Brainstorming de Soluções' },
  { id: 'measureIshikawa', name: 'Espinha de Peixe' },
  { id: 'measureMatrix', name: 'Matriz Causa e Efeito' },
  { id: 'beforeAfter', name: 'Antes x Depois' },
  { id: 'rab', name: 'Matriz RAB' },
  { id: 'gut', name: 'Matriz GUT' },
  { id: 'effortImpact', name: 'Esforço x Benefício' },
  { id: 'dataCollection', name: 'Plano de Coleta de Dados' },
  { id: 'vsm', name: 'VSM (Value Stream Map)' },
  { id: 'directObservation', name: 'Observação Direta (Gemba)' },
  { id: 'fiveWhys', name: '5 Porquês' },
  { id: 'fta', name: 'Árvore de Falhas (FTA)' },
  { id: 'statisticalAnalysis', name: 'Análise Gráfica e Estatística' },
  { id: 'dataNature', name: 'Natureza dos Dados' },
  { id: 'fmea', name: 'FMEA' },
  { id: 'plan5w2h', name: 'Plano de Ação 5W2H' },
  { id: 'actionPlan', name: 'Plano de Ação' },
  { id: 'sop', name: 'POP (Procedimento Operacional Padrão)' },
  { id: 'controlPlan', name: 'Plano de Controle' },
  { id: 'tangibleGains', name: 'Ganhos Tangíveis do Projeto' },
  { id: 'projectClose', name: 'Termo de Encerramento do Projeto' },
  { id: 'processCanva', name: 'Canva' },
  { id: 'processModeling', name: 'Modelagem de Processo' },
  { id: 'processValidation', name: 'Validação de Processo' },
  { id: 'improvementIdea', name: 'Ideia de Projeto de Melhoria' },
];

const TOOL_CATEGORIES = [
  {
    id: 'quality',
    name: 'Gerenciamento da Qualidade',
    description: 'Análise, melhoria e controle de processos',
    icon: Wrench,
    accent: 'blue',
    toolIds: [
      'brief', 'charter', 'sipoc', 'indicadores', 'processMap', 'bpmnProcessMap', 'brainstorming',
      'brainstormingImprove', 'measureIshikawa', 'measureMatrix', 'beforeAfter', 'rab',
      'gut', 'effortImpact', 'dataCollection', 'vsm', 'directObservation', 'fiveWhys',
      'fta', 'statisticalAnalysis', 'dataNature', 'fmea', 'plan5w2h', 'actionPlan',
      'sop', 'controlPlan', 'processCanva', 'processModeling', 'processValidation',
    ],
  },
  {
    id: 'projects',
    name: 'Gerenciamento de Projetos',
    description: 'Planejamento, execução, riscos e encerramento',
    icon: Layers,
    accent: 'indigo',
    toolIds: [
      'mapa90dias', 'projectCharterPMI', 'timeline', 'wbs', 'gpPlanPMI', 'raci',
      'organograma', 'detailedTimeline', 'riskManagementPMI', 'riskMonitoringPMI',
      'improvementPlan', 'stakeholderAnalysisPMI', 'tangibleGains', 'projectClose',
      'improvementIdea',
    ],
  },
  {
    id: 'change',
    name: 'Gerenciamento de Mudanças',
    description: 'Pessoas, engajamento e adoção da mudança',
    icon: Sparkles,
    accent: 'violet',
    toolIds: [
      'stakeholderAdkar', 'measureAdkar', 'analyzeAdkar', 'improveAdkar',
      'controlAdkar', 'stakeholders',
    ],
  },
] as const;

export default function ProjectToolsConfig() {
  const { isAdmin } = useUserAccess();
  // No SITE do consultor (israel.…) esconde rascunhos mesmo pro admin (visão do consultor).
  // O marcar rascunho + ver tudo fica no admin (app.…). ehAdminHub = pode marcar/ver tudo.
  const ehAdminHub = isAdmin && !isSiteConsultor();
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editingToolName, setEditingToolName] = useState<string>('');
  const [mentorContexts, setMentorContexts] = useState<Record<string, MentorToolContext>>({});
  // F6: ferramentas em rascunho (não prontas). Admin marca; consultor não vê.
  const [rascunhos, setRascunhos] = useState<string[]>([]);
  const [toolCategories, setToolCategories] = useState<Record<string, ToolCategoryId>>({});
  const [movingToolId, setMovingToolId] = useState<string | null>(null);

  useEffect(() => {
    getAllToolContexts().then(data => setMentorContexts(data));
    getFerramentasRascunho().then(setRascunhos);
    getToolCategories().then(setToolCategories);
  }, []);

  const defaultCategoryFor = (toolId: string): ToolCategoryId =>
    (TOOL_CATEGORIES.find((category) => category.toolIds.includes(toolId as never))?.id || 'quality') as ToolCategoryId;

  const categoryFor = (toolId: string): ToolCategoryId => toolCategories[toolId] || defaultCategoryFor(toolId);

  const moveToolToCategory = async (toolId: string, categoryId: ToolCategoryId) => {
    const previous = toolCategories;
    const next = { ...toolCategories, [toolId]: categoryId };
    setToolCategories(next);
    setMovingToolId(toolId);
    try {
      await saveToolCategories(next);
      toast.success('Ferramenta movida para outra categoria.');
    } catch (error) {
      setToolCategories(previous);
      toast.error('Não foi possível salvar a categoria.');
    } finally {
      setMovingToolId(null);
    }
  };

  const alternarRascunho = async (toolId: string, rascunho: boolean) => {
    const nova = await toggleFerramentaRascunho(toolId, rascunho, rascunhos);
    setRascunhos(nova);
  };

  const refreshContexts = async () => {
    const data = await getAllToolContexts();
    setMentorContexts(data);
  };

  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [configs, setConfigs] = useState<InitiativePhaseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCourses, setAllCourses] = useState<Initiative[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newInitiativeName, setNewInitiativeName] = useState('');
  const [newInitiativeParentId, setNewInitiativeParentId] = useState('');
  const [newInitiativeCourseId, setNewInitiativeCourseId] = useState('');
  const [newInitiativeIconId, setNewInitiativeIconId] = useState(ICON_CATALOG[0].id);
  const [newInitiativeCorId, setNewInitiativeCorId] = useState(COLOR_CATALOG[0].id);
  const [saving, setSaving] = useState(false);
  const [editedPhases, setEditedPhases] = useState<{id: string, name: string}[]>([]);
  const [activeConfigPhaseId, setActiveConfigPhaseId] = useState<string | null>(null);
  // Ligações entre ferramentas: cada ferramenta pode passar os dados dela pra
  // ferramenta imediatamente seguinte. O mapa é destino -> fonte, igual ao que o
  // app consome; a marcação do checkbox é lida e escrita a partir dele.
  const [toolLinks, setToolLinks] = useState<Record<string, ToolLink>>({});

  useEffect(() => {
    setToolLinks(selectedInitiative?.toolLinks || {});
  }, [selectedInitiative?.id]);

  // Sequência global das ferramentas: fases na ordem × ferramentas dentro de cada fase.
  // É ela que define quem é a "de baixo" — e ela ATRAVESSA a fase, então a última
  // ferramenta de uma fase transfere pra primeira da fase seguinte.
  // Posições COM repetição: ferramenta usada em duas fases ocupa duas posições, e
  // cada uma tem a sua própria "de baixo". Sem isso, a segunda aparição não
  // conseguia transferir pra ninguém (ver getToolPositions em services/toolLinks).
  const posicoes = useMemo(
    () => getToolPositions(selectedInitiative, configs),
    [selectedInitiative, configs]
  );

  /** Índice absoluto onde cada fase começa dentro de `posicoes`. */
  const inicioDaFase = useMemo(() => {
    const mapa: Record<string, number> = {};
    let n = 0;
    for (const phase of selectedInitiative?.phases || []) {
      mapa[phase.id] = n;
      n += (configs.find((c) => c.phaseId === phase.id)?.toolIds || []).length;
    }
    return mapa;
  }, [selectedInitiative, configs]);

  /** Ferramenta que recebe os dados DESTA ocorrência, ou null se for a última de todas. */
  const proximaDe = (phaseId: string, indice: number) =>
    posicoes[(inicioDaFase[phaseId] ?? 0) + indice + 1]?.toolId || null;

  const transfereParaProxima = (toolId: string, phaseId: string, indice: number) => {
    const proxima = proximaDe(phaseId, indice);
    return !!proxima && (toolLinks[proxima]?.from || []).includes(toolId);
  };

  const alternarTransferencia = (toolId: string, phaseId: string, indice: number) => {
    const proxima = proximaDe(phaseId, indice);
    if (!proxima || !LINKABLE_TARGETS[proxima]) return;
    setToolLinks((prev) => {
      const copia = { ...prev };
      if (transfereParaProxima(toolId, phaseId, indice)) delete copia[proxima];
      else copia[proxima] = { from: [toolId], mode: LINKABLE_TARGETS[proxima] };
      return copia;
    });
  };

  const handleSavePhases = async () => {
    if (!selectedInitiative) return;
    try {
      await updateInitiative(selectedInitiative.id, { phases: editedPhases });
      const updated = { ...selectedInitiative, phases: editedPhases };
      setSelectedInitiative(updated);
      setInitiatives(initiatives.map(i => i.id === updated.id ? updated : i));
      toast.success("Fases atualizadas com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar fases");
    }
  };

  useEffect(() => {
    fetchInitiatives();
  }, []);

  const fetchInitiatives = async () => {
    setLoading(true);
    try {
      const data = await getInitiatives();
      setAllCourses(data.filter(ehCurso));
      const projectTypes = data.filter(ehTipoDeProjeto);
      if (data.length === 0) {
        // Auto-seed if empty
        try {
          await seedDefaultInitiative(AVAILABLE_TOOLS);
        } catch (seedError: any) {
          console.error("Erro ao criar iniciativa padrão:", seedError);
          // Don't fail the whole fetch if seeding fails, just show empty
        }
        const seededData = await getInitiatives();
        setAllCourses(seededData.filter(ehCurso));
        const seededProjectTypes = seededData.filter(ehTipoDeProjeto);
        setInitiatives(seededProjectTypes);
        if (seededProjectTypes.length > 0) handleSelectInitiative(seededProjectTypes[0]);
      } else {
        setInitiatives(projectTypes);
        if (projectTypes.length > 0 && !selectedInitiative) {
          handleSelectInitiative(projectTypes[0]);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar iniciativas:", error);
      // Removido o toast de erro para não incomodar o usuário com erros de permissão temporários
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefault = async () => {
    setSaving(true);
    try {
      await seedDefaultInitiative(AVAILABLE_TOOLS);
      await fetchInitiatives();
      toast.success("Configuração padrão aplicada com sucesso!");
    } catch (error) {
      toast.error("Erro ao aplicar configuração padrão");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectInitiative = async (initiative: Initiative) => {
    setSelectedInitiative(initiative);
    setEditedPhases(initiative.phases || []);
    setActiveConfigPhaseId(null);
    try {
      const data = await getInitiativeConfigs(initiative.id);
      setConfigs(data);
      if (initiative.phases && initiative.phases.length > 0) {
        setActiveConfigPhaseId(initiative.phases[0].id);
      }
    } catch (error) {
      toast.error("Erro ao carregar configurações");
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditingInitiative, setIsEditingInitiative] = useState(false);
  const [editingInitiativeName, setEditingInitiativeName] = useState('');
  const [editingInitiativeParentId, setEditingInitiativeParentId] = useState<string>('');
  const [editingCourseId, setEditingCourseId] = useState<string>('');
  const [editIsFree, setEditIsFree] = useState<boolean>(false);
  const [editIconId, setEditIconId] = useState(ICON_CATALOG[0].id);
  const [editCorId, setEditCorId] = useState(COLOR_CATALOG[0].id);
  const [editIconUrl, setEditIconUrl] = useState('');
  const [uploadingEditIcon, setUploadingEditIcon] = useState(false);

  const handleOpenEditInitiative = () => {
    if (!selectedInitiative) return;
    setEditingInitiativeName(selectedInitiative.name);
    setEditingInitiativeParentId(selectedInitiative.parentId || '');
    setEditingCourseId(selectedInitiative.cursoAssociadoId || selectedInitiative.id);
    setEditIsFree(selectedInitiative.isFree || false);
    setEditIconId(selectedInitiative.iconId || ICON_CATALOG[0].id);
    setEditCorId(selectedInitiative.corId || COLOR_CATALOG[0].id);
    setEditIconUrl(selectedInitiative.iconUrl || '');
    setIsEditingInitiative(true);
  };

  const handleUploadEditIcon = async (file: File) => {
    if (!selectedInitiative) return;
    setUploadingEditIcon(true);
    try {
      const url = await uploadInitiativeIcon(file, selectedInitiative.id);
      setEditIconUrl(url);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar o ícone.');
    } finally {
      setUploadingEditIcon(false);
    }
  };

  const handleSaveInitiativeEdit = async () => {
    if (!selectedInitiative || !editingInitiativeName.trim()) return;

    const nomeAntigo = selectedInitiative.name;
    const nomeNovo = editingInitiativeName.trim();
    const renomeou = nomeAntigo !== nomeNovo;

    try {
      // ────────────────────────────────────────────────────────────────────
      // PROPAGAÇÃO AUTOMÁTICA (Opção B):
      // Vídeos da Base de Conhecimento referenciam o curso por NOME (campo
      // `course` em KnowledgeEntry), não por ID. Se o admin renomeia a trilha
      // sem propagar, os vídeos viram órfãos. Aqui interceptamos: ANTES de
      // salvar a iniciativa, fazemos batch update dos vídeos vinculados.
      //
      // Ordem importa: se updateCourseName falhar, NÃO salvamos a iniciativa
      // (consistência — ou propaga tudo, ou nada).
      // ────────────────────────────────────────────────────────────────────
      if (renomeou) {
        // Propagação silenciosa: usuário renomeou de propósito, não precisa confirmar.
        // Ambas são no-op se não houver nada vinculado ao nome antigo.
        // Antes de qualquer propagação: guarda o nome antigo na própria iniciativa.
        // É o que garante que nada quebre mesmo onde a propagação não alcança
        // (materiais de apoio, quizzes, referências antigas).
        await registrarNomeAnterior(selectedInitiative.id, nomeAntigo);
        await updateCourseName(nomeAntigo, nomeNovo);
        await propagarRenomeacaoParaAcessos(nomeAntigo, nomeNovo);
      }

      const updates: any = {
        name: nomeNovo,
        cursoAssociadoId: editingCourseId || selectedInitiative.id,
        isFree: editIsFree,
        iconId: editIconUrl ? null : editIconId,
        corId: editIconUrl ? null : editCorId,
        iconUrl: editIconUrl || null,
      };
      if (editingInitiativeParentId) {
        updates.parentId = editingInitiativeParentId;
      } else {
        updates.parentId = null; // Or remove it
      }

      await updateInitiative(selectedInitiative.id, updates);

      const updated = { ...selectedInitiative, ...updates };
      setSelectedInitiative(updated);
      setInitiatives(initiatives.map(i => i.id === updated.id ? updated : i));
      setIsEditingInitiative(false);
      if (renomeou) {
        toast.success("Curso renomeado e vídeos vinculados atualizados.");
      } else {
        toast.success("Iniciativa atualizada com sucesso!");
      }
    } catch (error) {
      console.error('[Edit Initiative] Falha:', error);
      toast.error("Erro ao atualizar iniciativa. Veja o console.");
    }
  };

  const handleDeleteInitiative = async (id: string) => {
    try {
      await updateInitiative(id, { temProjeto: false });
      setInitiatives(initiatives.filter(i => i.id !== id));
      if (selectedInitiative?.id === id) {
        setSelectedInitiative(null);
        setConfigs([]);
      }
      toast.success("Tipo de projeto removido desta aba. O curso e os vídeos continuam existindo.");
      setIsDeleting(null);
    } catch (error) {
      toast.error("Erro ao remover tipo de projeto");
    }
  };

  const handleCreateInitiative = async () => {
    if (!newInitiativeName.trim()) return;
    if (!newInitiativeCourseId) {
      toast.error("Selecione o curso que libera este tipo de projeto.");
      return;
    }
    
    // Check for duplicate names
    if (initiatives.some(i => i.name.toLowerCase() === newInitiativeName.toLowerCase())) {
      toast.error("Uma iniciativa com este nome já existe.");
      return;
    }

    try {
      const initiative = await createInitiative(newInitiativeName, undefined, newInitiativeParentId || undefined);
      await updateInitiative(initiative.id, {
        iconId: newInitiativeIconId,
        corId: newInitiativeCorId,
        cursoAssociadoId: newInitiativeCourseId,
      });
      initiative.iconId = newInitiativeIconId;
      initiative.corId = newInitiativeCorId;
      initiative.cursoAssociadoId = newInitiativeCourseId;
      setInitiatives(prev => [...prev, initiative]);
      setNewInitiativeName('');
      setNewInitiativeCourseId('');
      setNewInitiativeParentId('');
      setNewInitiativeIconId(ICON_CATALOG[0].id);
      setNewInitiativeCorId(COLOR_CATALOG[0].id);
      setIsCreating(false);
      
      // Select the new initiative and clear configs (it's new)
      setSelectedInitiative(initiative);
      setConfigs([]);
      setEditedPhases([]);
      setActiveConfigPhaseId(null);
      
      toast.success("Iniciativa criada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao criar iniciativa:", error);
      toast.error(`Erro ao criar iniciativa: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  const togglePhase = (phaseId: string) => {
    if (!selectedInitiative) return;
    
    setActiveConfigPhaseId(phaseId);
    
    const exists = configs.find(c => c.phaseId === phaseId);
    if (!exists) {
      setConfigs([...configs, { initiativeId: selectedInitiative.id, phaseId, toolIds: [] }]);
    }
  };

  const movePhase = (fromIndex: number, toIndex: number) => {
    const newPhases = [...editedPhases];
    const [movedPhase] = newPhases.splice(fromIndex, 1);
    newPhases.splice(toIndex, 0, movedPhase);
    setEditedPhases(newPhases);
  };

  const toggleTool = (phaseId: string, toolId: string) => {
    setConfigs(prev => prev.map(c => {
      if (c.phaseId === phaseId) {
        const toolIds = c.toolIds.includes(toolId)
          ? c.toolIds.filter(id => id !== toolId)
          : [...c.toolIds, toolId];
        return { ...c, toolIds };
      }
      return c;
    }));
  };

  const moveToolInConfig = (phaseId: string, toolId: string, direction: 'up' | 'down') => {
    setConfigs(prev => prev.map(c => {
      if (c.phaseId === phaseId) {
        const newToolIds = [...c.toolIds];
        const currentIndex = newToolIds.indexOf(toolId);
        if (currentIndex === -1) return c;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= newToolIds.length) return c;

        // Swap
        [newToolIds[currentIndex], newToolIds[targetIndex]] = [newToolIds[targetIndex], newToolIds[currentIndex]];
        return { ...c, toolIds: newToolIds };
      }
      return c;
    }));
  };

  const handleSaveConfigs = async (phaseId?: string) => {
    if (!selectedInitiative) return;
    setSaving(true);
    try {
      if (phaseId) {
        const config = configs.find(c => c.phaseId === phaseId);
        if (config) {
          await saveInitiativeConfig(config);
        }
      } else {
        // Save each config
        for (const config of configs) {
          await saveInitiativeConfig(config);
        }
      }

      // Ligação só existe entre vizinhas. Se o consultor reordenou as ferramentas, um
      // par que era vizinho pode ter deixado de ser — essas ligações caem aqui, pra o
      // que fica salvo bater exatamente com os checkboxes que ele está vendo.
      const somenteVizinhas = Object.fromEntries(
        Object.entries(toolLinks).filter(([destino, link]) => saoVizinhas(link.from?.[0], destino, posicoes))
      );
      await saveInitiativeToolLinks(selectedInitiative.id, somenteVizinhas);
      const atualizada = { ...selectedInitiative, toolLinks: somenteVizinhas };
      setSelectedInitiative(atualizada);
      setInitiatives(initiatives.map(i => i.id === atualizada.id ? atualizada : i));
      setToolLinks(somenteVizinhas);

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#f0f2f5] min-h-screen">
      {/* Edit Initiative Modal */}
      <AnimatePresence>
        {isEditingInitiative && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[86vh] overflow-y-auto"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-black text-gray-800">Editar Tipo de Projeto</h2>
                <button onClick={() => setIsEditingInitiative(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Nome do Tipo de Projeto
                  </label>
                  <input
                    type="text"
                    value={editingInitiativeName}
                    onChange={(e) => setEditingInitiativeName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nome do Tipo de Projeto"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Curso associado (libera este projeto)
                  </label>
                  <select
                    value={editingCourseId}
                    onChange={(e) => setEditingCourseId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Selecione o curso...</option>
                    {(allCourses.length > 0 ? allCourses : initiatives).map((curso) => (
                      <option key={curso.id} value={curso.id}>{curso.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">O aluno só poderá usar este projeto se tiver acesso a esse curso.</p>
                </div>
                {/* Campo "Tipo de Projeto Pai" removido — modelo agora é de trilhas individuais.
                    O estado editingInitiativeParentId e o save no Firestore continuam intactos,
                    preservando qualquer parentId histórico que já exista (não apaga dados). */}

                {/* Checkbox "Trilha 1 grátis" removido daqui — artefato antigo do modelo
                    B2C do Israel. O valor de isFree já salvo continua preservado (outras
                    telas ainda leem esse campo), só não dá mais pra editar por aqui. */}

                {/* "Ordem" (posição na lista) continua interna — mas o ícone/cor do card
                    o consultor já escolhe aqui, sem precisar pedir pra gente mudar. */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Desenho do card em Projetos
                  </label>
                  <IconColorPicker
                    iconId={editIconId}
                    corId={editCorId}
                    iconUrl={editIconUrl}
                    onChangeIcon={setEditIconId}
                    onChangeCor={setEditCorId}
                    onUploadIcon={handleUploadEditIcon}
                    uploadingIcon={uploadingEditIcon}
                    onRemoveIconUrl={() => setEditIconUrl('')}
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <button
                  onClick={() => {
                    if (confirm("Remover este tipo da aba Projetos?\n\nO curso e os vídeos continuam existindo em Meus Cursos. Esta ação só faz este curso parar de aparecer como tipo de projeto.")) {
                      handleDeleteInitiative(selectedInitiative!.id);
                      setIsEditingInitiative(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-black text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  REMOVER DA ABA PROJETOS
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditingInitiative(false)}
                    className="px-6 py-2 text-sm font-black text-gray-500 hover:text-gray-700"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleSaveInitiativeEdit}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    SALVAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-blue-600" />
            Configuração de Ferramentas por Projeto
          </h1>
          <p className="text-gray-500 text-sm">Mapeie quais fases e ferramentas estão disponíveis para cada tipo de projeto.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Step 1: Project Type Selection Dropdown */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="space-y-5">
            <div className="flex-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                1. Selecione o Tipo de Projeto
              </label>
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedInitiative?.id || ''}
                  onChange={(e) => {
                    const initiative = initiatives.find(i => i.id === e.target.value);
                    if (initiative) handleSelectInitiative(initiative);
                  }}
                  className="min-w-[280px] flex-1 p-3 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Selecione um curso para configurar...</option>
                  {initiatives
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((curso) => (
                      <option key={curso.id} value={curso.id}>
                        {curso.name}
                      </option>
                    ))}
                </select>
                {selectedInitiative && (
                  <>
                    <button
                      onClick={handleOpenEditInitiative}
                      className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 border border-gray-200"
                      title="Editar Tipo de Projeto"
                    >
                      <Edit3 size={18} />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-100"
                >
                  <PlusCircle size={18} />
                  NOVO TIPO
                </button>
              </div>
            </div>

            {selectedInitiative && (() => {
              const cursoAssociado = (allCourses.length > 0 ? allCourses : initiatives)
                .find((curso) => curso.id === (selectedInitiative.cursoAssociadoId || selectedInitiative.id));
              return (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-blue-500">Curso associado</span>
                  <span className="block truncate text-sm font-bold text-gray-700" title={cursoAssociado?.name || selectedInitiative.name}>
                    {cursoAssociado?.name || selectedInitiative.name}
                  </span>
                  <span className="block text-[11px] text-gray-500">Este curso libera o uso deste projeto para o aluno.</span>
                </div>
              );
            })()}

            {isDeleting && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} />
                  <p className="font-bold text-sm">Remover este tipo da aba Projetos?</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDeleting(null)}
                    className="px-3 py-1.5 text-gray-600 hover:bg-white rounded-lg transition-colors text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteInitiative(isDeleting)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-bold shadow-sm"
                  >
                    Remover AGORA
                  </button>
                </div>
              </div>
            )}

            {selectedInitiative && (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={() => setIsDeleting(selectedInitiative.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all text-xs font-bold"
                  title="Remover este curso da lista de tipos de projeto"
                >
                  <Trash2 size={18} />
                  Remover tipo
                </button>
                <button
                  onClick={() => handleSaveConfigs()}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 whitespace-nowrap bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm shadow-blue-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                  {saving ? 'Salvando…' : 'Salvar configuração'}
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-6 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-4 shadow-inner"
              >
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">Nome do Novo Tipo de Projeto</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Ex: Primeiros Passos para se Destacar no Trabalho"
                      value={newInitiativeName}
                      onChange={(e) => setNewInitiativeName(e.target.value)}
                      className="w-full p-3 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold bg-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateInitiative()}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">Curso associado</label>
                    <select
                      value={newInitiativeCourseId}
                      onChange={(e) => setNewInitiativeCourseId(e.target.value)}
                      className="w-full p-3 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold bg-white"
                    >
                      <option value="">Selecione o curso que libera este projeto...</option>
                      {(allCourses.length > 0 ? allCourses : initiatives).map((curso) => (
                        <option key={curso.id} value={curso.id}>{curso.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Campo "Tipo de Projeto Pai" removido — modelo agora é de trilhas individuais.
                      newInitiativeParentId continua no estado mas nunca recebe valor — createInitiative
                      é chamado com undefined no 3º arg, então o Firestore não recebe o campo. */}

                  <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={handleCreateInitiative}
                      className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3 rounded-lg font-black text-xs hover:bg-blue-700 shadow-md uppercase tracking-wider"
                    >
                      CRIAR AGORA
                    </button>
                    <button 
                      onClick={() => {
                        setIsCreating(false);
                        setNewInitiativeParentId('');
                        setNewInitiativeCourseId('');
                        setNewInitiativeName('');
                        setNewInitiativeIconId(ICON_CATALOG[0].id);
                        setNewInitiativeCorId(COLOR_CATALOG[0].id);
                      }}
                      className="flex-1 md:flex-none bg-white text-gray-500 px-8 py-3 rounded-lg border border-gray-200 font-black text-xs hover:bg-gray-50 uppercase tracking-wider"
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>

                {/* Checkbox "curso introdutório/grátis" removido — coisa do passado,
                    o acesso já é decidido de outra forma hoje (por consultor/coordenador). */}

                <div className="pt-2 border-t border-blue-100">
                  <IconColorPicker
                    iconId={newInitiativeIconId}
                    corId={newInitiativeCorId}
                    onChangeIcon={setNewInitiativeIconId}
                    onChangeCor={setNewInitiativeCorId}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 2 & 3: Phases and Tools */}
        {selectedInitiative ? (
          <div className="space-y-6">
            {/* Step 2: Phase Management */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">
                    2. Configure as Fases deste Tipo de Projeto
                  </label>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Adicione, remova ou renomeie as fases da jornada.</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {editedPhases.map((phase, index) => (
                  <div key={phase.id} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-black text-gray-400 border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => {
                        const newPhases = [...editedPhases];
                        newPhases[index].name = e.target.value;
                        setEditedPhases(newPhases);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      placeholder="Nome da Fase"
                    />
                    <button
                      onClick={() => movePhase(index, index - 1)}
                      disabled={index === 0}
                      className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-30"
                      title="Mover para cima"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => movePhase(index, index + 1)}
                      disabled={index === editedPhases.length - 1}
                      className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      onClick={() => setEditedPhases(editedPhases.filter((_, i) => i !== index))}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Remover Fase"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => setEditedPhases([...editedPhases, { id: crypto.randomUUID(), name: 'Nova Fase' }])}
                  className="w-full py-3 border-2 border-dashed border-gray-100 rounded-xl text-xs font-black text-gray-400 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <Plus size={16} />
                  Adicionar Nova Fase
                </button>
              </div>

              <div className="flex justify-end border-t border-gray-50 pt-4">
                <button
                  onClick={handleSavePhases}
                  className="px-6 py-2 bg-gray-800 text-white text-[10px] font-black rounded-lg hover:bg-gray-900 transition-all shadow-md uppercase tracking-widest"
                >
                  Atualizar Estrutura de Fases
                </button>
              </div>
            </div>

            {/* Step 3: Tool Selection per Phase */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-gray-200"></div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  3. Configure as Ferramentas por Fase
                </label>
                <div className="h-[1px] flex-1 bg-gray-200"></div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <p className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fases Ativas (Clique para configurar ferramentas):</p>
                {(selectedInitiative.phases || []).map((phase) => {
                  const isActive = activeConfigPhaseId === phase.id;
                  return (
                    <button
                      key={phase.id}
                      onClick={() => togglePhase(phase.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black border transition-all uppercase tracking-wider",
                        isActive 
                          ? "bg-blue-600 border-blue-600 text-white shadow-md" 
                          : "bg-white border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600"
                      )}
                    >
                      {phase.name}
                    </button>
                  );
                })}
              </div>

              {!activeConfigPhaseId ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                  <Layers size={48} className="mx-auto mb-4 text-gray-200" />
                  <p className="text-gray-500 font-bold">Selecione uma fase acima para configurar as ferramentas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {(() => {
                    const phase = (selectedInitiative.phases || []).find(p => p.id === activeConfigPhaseId);
                    
                    if (!phase) return null;
                    
                    const config = configs.find(c => c.phaseId === phase.id) || { initiativeId: selectedInitiative.id, phaseId: phase.id, toolIds: [] };
                    
                    return (
                      <div key={phase.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="font-black text-gray-700 flex items-center gap-2 uppercase text-xs tracking-wider">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            Fase: {phase.name}
                          </h3>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black px-2 py-1 rounded border text-blue-600 bg-blue-50 border-blue-100">
                              {config.toolIds.length} SELECIONADAS
                            </span>
                            <button
                              onClick={() => handleSaveConfigs(phase.id)}
                              disabled={saving}
                              className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 uppercase tracking-widest flex items-center gap-2"
                            >
                              {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
                              Salvar ferramentas nesta fase
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-6 space-y-8">
                          {/* Selected Tools Reordering */}
                          {config.toolIds.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={14} />
                                Ordem de Exibição (Arraste ou use as setas)
                              </h4>
                              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-2">
                                {config.toolIds.map((toolId, index) => {
                                  const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
                                  if (!tool) return null;
                                  // A "de baixo" vem da sequência global, então a última
                                  // ferramenta de uma fase aponta pra primeira da seguinte.
                                  const proxima = proximaDe(phase.id, index);
                                  // Só dá pra transferir pra ferramenta que sabe receber
                                  // dados; nas outras o botão existiria sem fazer nada.
                                  const podeTransferir = !!proxima && !!LINKABLE_TARGETS[proxima];
                                  return (
                                    <div key={toolId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm group">
                                      <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                                        {index + 1}
                                      </div>
                                      <span className="flex-1 text-xs font-bold text-gray-700 uppercase">{tool.name}</span>

                                      {/* Só aparece quando a ferramenta de baixo sabe receber dados.
                                          Nas outras não existe transformador escrito, então marcar
                                          não produziria botão nenhum na jornada do aluno. */}
                                      {podeTransferir && (
                                        <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={transfereParaProxima(toolId, phase.id, index)}
                                            onChange={() => alternarTransferencia(toolId, phase.id, index)}
                                            className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                                          />
                                          <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                            Transferir os dados para a ferramenta de baixo
                                          </span>
                                        </label>
                                      )}

                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => moveToolInConfig(phase.id, toolId, 'up')}
                                          disabled={index === 0}
                                          className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded disabled:opacity-20 transition-colors"
                                        >
                                          <ArrowUp size={14} />
                                        </button>
                                        <button 
                                          onClick={() => moveToolInConfig(phase.id, toolId, 'down')}
                                          disabled={index === config.toolIds.length - 1}
                                          className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded disabled:opacity-20 transition-colors"
                                        >
                                          <ArrowDown size={14} />
                                        </button>
                                        <button
                                          onClick={() => toggleTool(phase.id, toolId)}
                                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Catálogo de Ferramentas (Clique para adicionar/remover)
                            </h4>
                            <div className="space-y-6">
                              {TOOL_CATEGORIES.map((category) => {
                                const CategoryIcon = category.icon;
                                const categoryTools = AVAILABLE_TOOLS
                                  .filter((tool) => categoryFor(tool.id) === category.id)
                                  .filter((tool) => ehAdminHub || !rascunhos.includes(tool.id))
                                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

                                if (categoryTools.length === 0) return null;

                                return (
                                  <section key={category.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50">
                                    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-4">
                                      <div className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-xl",
                                        category.accent === 'blue' && "bg-blue-50 text-blue-600",
                                        category.accent === 'indigo' && "bg-indigo-50 text-indigo-600",
                                        category.accent === 'violet' && "bg-violet-50 text-violet-600"
                                      )}>
                                        <CategoryIcon size={19} />
                                      </div>
                                      <div>
                                        <h5 className="text-sm font-black text-gray-800">{category.name}</h5>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{category.description}</p>
                                      </div>
                                      <span className="ml-auto rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black text-gray-500">
                                        {categoryTools.length}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
                                      {categoryTools.map((tool) => {
                                const isSelected = config.toolIds.includes(tool.id);
                                const ctx = mentorContexts[tool.id];
                                const hasMentorContent = ctx && (
                                  (ctx.responseMode === 'text' && ctx.responseText?.trim()) ||
                                  (ctx.responseMode === 'audio' && ctx.audioUrl)
                                );
                                return (
                                  <div
                                    key={tool.id}
                                    className={cn(
                                      "flex flex-col rounded-xl border text-left transition-all group relative overflow-hidden",
                                      isSelected
                                        ? "bg-blue-600 border-blue-600 shadow-md ring-2 ring-blue-100"
                                        : "bg-white border-gray-100 hover:border-blue-200"
                                    )}
                                  >
                                    <button
                                      onClick={() => toggleTool(phase.id, tool.id)}
                                      className="flex items-center gap-3 w-full flex-1 text-left bg-transparent border-none cursor-pointer p-4"
                                    >
                                      <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                        isSelected ? "bg-white/20 text-white" : "bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                      )}>
                                        <Wrench size={16} />
                                      </div>
                                      <div className="flex-1">
                                        <div className={cn("text-xs font-black uppercase tracking-tight", isSelected ? "text-white" : "text-gray-500")}>
                                          {tool.name}
                                        </div>
                                        {hasMentorContent && (
                                          <div className={cn(
                                            "text-[9px] uppercase tracking-wider font-bold mt-0.5 flex items-center gap-1",
                                            isSelected ? "text-blue-100" : "text-green-600"
                                          )}>
                                            {ctx?.responseMode === 'audio' ? <Volume2 size={9} /> : <FileText size={9} />}
                                            Mentor configurado
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                    <div className="absolute right-4 top-4 flex items-center gap-2">
                                      {ehAdminHub && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); alternarRascunho(tool.id, !rascunhos.includes(tool.id)); }}
                                          className={cn(
                                            "text-[9px] font-black uppercase tracking-wide rounded px-2 py-0.5 border transition-colors cursor-pointer",
                                            rascunhos.includes(tool.id)
                                              ? "bg-amber-100 text-amber-700 border-amber-300"
                                              : "bg-emerald-100 text-emerald-700 border-emerald-300"
                                          )}
                                          title="Alternar: pronta (distribui aos consultores) ↔ rascunho (só você vê)"
                                        >
                                          {rascunhos.includes(tool.id) ? 'rascunho' : 'pronta'}
                                        </button>
                                      )}
                                      {isSelected && <CheckCircle2 size={18} className="text-white" />}
                                    </div>
                                    {ehAdminHub && (
                                      <div className={cn(
                                        "mt-auto flex items-center gap-2 border-t px-3 py-2",
                                        isSelected ? "border-white/20 bg-blue-700/40" : "border-gray-100 bg-gray-50/70"
                                      )}>
                                        <span className={cn(
                                          "shrink-0 text-[9px] font-black uppercase tracking-wider",
                                          isSelected ? "text-blue-100" : "text-gray-400"
                                        )}>
                                          Mover para
                                        </span>
                                        <select
                                          value={categoryFor(tool.id)}
                                          disabled={movingToolId === tool.id}
                                          onClick={(event) => event.stopPropagation()}
                                          onChange={(event) => moveToolToCategory(tool.id, event.target.value as ToolCategoryId)}
                                          className={cn(
                                            "min-w-0 flex-1 cursor-pointer rounded-md border px-2 py-1 text-[10px] font-bold outline-none disabled:cursor-wait disabled:opacity-60",
                                            isSelected
                                              ? "border-white/30 bg-blue-600 text-white"
                                              : "border-gray-200 bg-white text-gray-600 focus:border-blue-400"
                                          )}
                                          aria-label={`Mover ${tool.name} para outra categoria`}
                                        >
                                          {TOOL_CATEGORIES.map((option) => (
                                            <option key={option.id} value={option.id} className="bg-white text-gray-700">
                                              {option.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                );
                                      })}
                                    </div>
                                  </section>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-16 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Settings size={56} className="mx-auto mb-5 text-gray-200" />
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Escolha ou crie o seu curso</h3>
                <p className="text-gray-500 max-w-md mx-auto mt-2">
                  Selecione um curso no dropdown acima (ou crie um novo) pra definir quais fases e ferramentas o aluno terá acesso.
                </p>
              </motion.div>
            </div>

            {/* Catálogo de ferramentas aprovadas pela plataforma — visível mesmo sem
                curso selecionado, pra o consultor conhecer o que já pode usar. */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Ferramentas disponíveis na plataforma
              </h4>
              <div className="space-y-6">
                {TOOL_CATEGORIES.map((category) => {
                  const CategoryIcon = category.icon;
                  const categoryTools = AVAILABLE_TOOLS
                    .filter((tool) => categoryFor(tool.id) === category.id)
                    .filter((tool) => ehAdminHub || !rascunhos.includes(tool.id))
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
                  if (categoryTools.length === 0) return null;
                  return (
                    <section key={category.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50">
                      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-4">
                        <CategoryIcon size={18} className="text-gray-400" />
                        <div>
                          <h5 className="text-sm font-black text-gray-800">{category.name}</h5>
                          <p className="text-[11px] text-gray-500">{category.description}</p>
                        </div>
                      </div>
                      <div className="p-4 flex flex-wrap gap-2">
                        {categoryTools.map((tool) => (
                          <span key={tool.id} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-600">
                            {tool.name}
                          </span>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

/**
 * Escolha de ícone + cor do "desenho" do card em Projetos. Reaproveitada no
 * form de criar e no modal de editar. `onUploadIcon` só existe quando a
 * initiative já tem id (edição) — no form de criar, o consultor escolhe do
 * catálogo; pra subir imagem própria, salva primeiro e edita depois.
 */
function IconColorPicker({
  iconId, corId, iconUrl, onChangeIcon, onChangeCor,
  onUploadIcon, uploadingIcon, onRemoveIconUrl,
}: {
  iconId: string;
  corId: string;
  iconUrl?: string;
  onChangeIcon: (id: string) => void;
  onChangeCor: (id: string) => void;
  onUploadIcon?: (file: File) => void;
  uploadingIcon?: boolean;
  onRemoveIconUrl?: () => void;
}) {
  const cor = COLOR_CATALOG.find(c => c.id === corId) || COLOR_CATALOG[0];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${cor.gradient}`}>
          {iconUrl
            ? <img src={iconUrl} alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
            : (() => { const Icone = (ICON_CATALOG.find(i => i.id === iconId) || ICON_CATALOG[0]).Icon; return <Icone size={22} className="text-white" />; })()}
        </div>
        <span className="text-xs text-gray-500">É assim que fica o card em Projetos.</span>
        {iconUrl && onRemoveIconUrl && (
          <button type="button" onClick={onRemoveIconUrl} className="ml-auto text-xs font-bold text-red-600 hover:text-red-800">
            usar ícone do catálogo
          </button>
        )}
      </div>

      {onUploadIcon && (
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
            Ou envie o seu próprio ícone
          </label>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
            {uploadingIcon ? 'Enviando…' : (iconUrl ? 'Trocar imagem' : 'Enviar imagem')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingIcon}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadIcon(f); e.target.value = ''; }}
            />
          </label>
        </div>
      )}

      {!iconUrl && (
        <>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Ícone</label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_CATALOG.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => onChangeIcon(id)}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center border transition-colors',
                    iconId === id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                  )}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Cor</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_CATALOG.map(({ id, label, gradient }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => onChangeCor(id)}
                  className={cn(
                    `w-6 h-6 rounded-full bg-gradient-to-br ${gradient} transition-transform`,
                    corId === id ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'hover:scale-105'
                  )}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
