import React, { useState, useEffect, useMemo } from 'react';
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
  deleteInitiative,
  getInitiativeConfigs,
  saveInitiativeConfig,
  seedDefaultInitiative,
  restoreDefaultMethodologies,
  getFerramentasRascunho,
  toggleFerramentaRascunho,
  getToolCategories,
  saveToolCategories,
  ToolCategoryId,
} from '../services/configService';
import { updateCourseName } from '../services/knowledgeService';
import { useUserAccess } from '../hooks/useUserAccess';
import { isSiteConsultor, resolveConsultorId } from '../services/consultorService';
import { Initiative, InitiativePhaseConfig } from '../types';
import MentorContextEditor from './projects/MentorContextEditor';
import { getAllToolContexts, MentorToolContext } from '../services/mentorContextService';

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
 *    Exemplo: { id: 'raci', name: 'Matriz RACI', component: RaciTool, defaultPhase: 'Define' }
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
const AVAILABLE_TOOLS = [
  { id: 'mapa90dias', name: 'Mapa dos 90 Dias', phase: 'Define' },
  { id: 'brief', name: 'Entendendo o Problema', phase: 'Define' },
  { id: 'charter', name: 'Project Charter', phase: 'Define' },
  { id: 'stakeholderAdkar', name: 'ADKAR — Definir (Awareness)', phase: 'Define' },
  { id: 'projectCharterPMI', name: 'Project Charter - PMI', phase: 'Define' },
  { id: 'measureAdkar', name: 'ADKAR — Medir (Desire)', phase: 'Measure' },
  { id: 'analyzeAdkar', name: 'ADKAR — Analisar (Knowledge)', phase: 'Analyze' },
  { id: 'improveAdkar', name: 'ADKAR — Melhorar (Ability)', phase: 'Improve' },
  { id: 'controlAdkar', name: 'ADKAR — Controlar (Reinforcement)', phase: 'Control' },
  { id: 'sipoc', name: 'SIPOC', phase: 'Define' },
  { id: 'timeline', name: 'Cronograma Macro', phase: 'Define' },
  { id: 'wbs', name: 'WBS (EAP)', phase: 'Define' },
  { id: 'gpPlanPMI', name: 'Plano do GP - PMI', phase: 'Define' },
  { id: 'raci', name: 'Matriz RACI', phase: 'Define' },
  { id: 'organograma', name: 'Organograma', phase: 'Define' },
  { id: 'indicadores', name: 'Indicadores', phase: 'Define' },
  { id: 'detailedTimeline', name: 'Atividades Detalhadas', phase: 'Define' },
  { id: 'riskManagementPMI', name: 'Plano de Riscos PMI', phase: 'Measure' },
  { id: 'riskMonitoringPMI', name: 'Monitoramento de Riscos - PMI', phase: 'Monitor' },
  { id: 'improvementPlan', name: 'Plano do Projeto de Melhoria', phase: 'Define' },
  { id: 'stakeholders', name: 'Stakeholders', phase: 'Define' },
  { id: 'stakeholderAnalysisPMI', name: 'Análise de Stakeholders - PMI', phase: 'Define' },
  { id: 'processMap', name: 'Mapeamento de Processo', phase: 'Measure' },
  { id: 'brainstorming', name: 'Brainstorming', phase: 'Measure' },
  { id: 'brainstormingImprove', name: 'Brainstorming de Soluções', phase: 'Improve' },
  { id: 'measureIshikawa', name: 'Espinha de Peixe', phase: 'Measure' },
  { id: 'measureMatrix', name: 'Matriz Causa e Efeito', phase: 'Measure' },
  { id: 'beforeAfter', name: 'Antes x Depois', phase: 'Measure' },
  { id: 'rab', name: 'Matriz RAB', phase: 'Measure' },
  { id: 'gut', name: 'Matriz GUT', phase: 'Measure' },
  { id: 'effortImpact', name: 'Esforço x Impacto', phase: 'Measure' },
  { id: 'dataCollection', name: 'Plano de Coleta de Dados', phase: 'Measure' },
  { id: 'vsm', name: 'VSM (Value Stream Map)', phase: 'Analyze' },
  { id: 'directObservation', name: 'Observação Direta (Gemba)', phase: 'Analyze' },
  { id: 'fiveWhys', name: '5 Porquês', phase: 'Analyze' },
  { id: 'fta', name: 'Árvore de Falhas (FTA)', phase: 'Analyze' },
  { id: 'statisticalAnalysis', name: 'Análise Gráfica e Estatística', phase: 'Analyze' },
  { id: 'dataNature', name: 'Natureza dos Dados', phase: 'Analyze' },
  { id: 'fmea', name: 'FMEA', phase: 'Improve' },
  { id: 'plan5w2h', name: 'Plano de Ação 5W2H', phase: 'Improve' },
  { id: 'actionPlan', name: 'Plano de Ação', phase: 'Improve' },
  { id: 'sop', name: 'POP (Procedimento Operacional Padrão)', phase: 'Improve' },
  { id: 'controlPlan', name: 'Plano de Controle', phase: 'Control' },
  { id: 'tangibleGains', name: 'Ganhos Tangíveis do Projeto', phase: '' },
  { id: 'projectClose', name: 'Termo de Encerramento do Projeto', phase: '' },
  { id: 'processCanva', name: 'Canva', phase: 'Measure' },
  { id: 'processModeling', name: 'Modelagem de Processo', phase: 'Measure' },
  { id: 'processValidation', name: 'Validação de Processo', phase: 'Measure' },
  { id: 'improvementIdea', name: 'Ideia de Projeto de Melhoria', phase: 'Pre-Definir' },
];

const TOOL_CATEGORIES = [
  {
    id: 'quality',
    name: 'Gerenciamento da Qualidade',
    description: 'Análise, melhoria e controle de processos',
    icon: Wrench,
    accent: 'blue',
    toolIds: [
      'brief', 'charter', 'sipoc', 'indicadores', 'processMap', 'brainstorming',
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
  // "Trilha" é vocabulário específico do curso do Israel — outros consultores usam
  // "curso", termo genérico já usado no resto da plataforma (Meus Cursos etc.).
  const ehIsrael = resolveConsultorId() === 'israel';
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
  const [isCreating, setIsCreating] = useState(false);
  const [newInitiativeName, setNewInitiativeName] = useState('');
  const [newInitiativeParentId, setNewInitiativeParentId] = useState('');
  const [newInitiativeIsFree, setNewInitiativeIsFree] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [editedPhases, setEditedPhases] = useState<{id: string, name: string}[]>([]);
  const [activeConfigPhaseId, setActiveConfigPhaseId] = useState<string | null>(null);

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
      if (data.length === 0) {
        // Auto-seed if empty
        try {
          await seedDefaultInitiative(AVAILABLE_TOOLS);
        } catch (seedError: any) {
          console.error("Erro ao criar iniciativa padrão:", seedError);
          // Don't fail the whole fetch if seeding fails, just show empty
        }
        const seededData = await getInitiatives();
        setInitiatives(seededData);
        if (seededData.length > 0) handleSelectInitiative(seededData[0]);
      } else {
        setInitiatives(data);
        if (data.length > 0 && !selectedInitiative) {
          handleSelectInitiative(data[0]);
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
  const [editIsFree, setEditIsFree] = useState<boolean>(false);

  const handleOpenEditInitiative = () => {
    if (!selectedInitiative) return;
    setEditingInitiativeName(selectedInitiative.name);
    setEditingInitiativeParentId(selectedInitiative.parentId || '');
    setEditIsFree(selectedInitiative.isFree || false);
    setIsEditingInitiative(true);
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
        // updateCourseName é no-op se não houver vídeos vinculados (batch vazio).
        await updateCourseName(nomeAntigo, nomeNovo);
      }

      const updates: any = {
        name: nomeNovo,
        isFree: editIsFree
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
        toast.success("Trilha renomeada e vídeos vinculados atualizados.");
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
      await deleteInitiative(id);
      setInitiatives(initiatives.filter(i => i.id !== id));
      if (selectedInitiative?.id === id) {
        setSelectedInitiative(null);
        setConfigs([]);
      }
      toast.success("Iniciativa excluída");
      setIsDeleting(null);
    } catch (error) {
      toast.error("Erro ao excluir iniciativa");
    }
  };

  const handleCreateInitiative = async () => {
    if (!newInitiativeName.trim()) return;
    
    // Check for duplicate names
    if (initiatives.some(i => i.name.toLowerCase() === newInitiativeName.toLowerCase())) {
      toast.error("Uma iniciativa com este nome já existe.");
      return;
    }

    try {
      const initiative = await createInitiative(newInitiativeName, undefined, newInitiativeParentId || undefined, newInitiativeIsFree);
      setInitiatives(prev => [...prev, initiative]);
      setNewInitiativeName('');
      setNewInitiativeParentId('');
      setNewInitiativeIsFree(false);
      setIsCreating(false);
      
      // Select the new initiative and clear configs (it's new)
      setSelectedInitiative(initiative);
      setConfigs([]);
      
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-800">Editar Tipo de Projeto</h2>
                <button onClick={() => setIsEditingInitiative(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
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
                {/* Campo "Tipo de Projeto Pai" removido — modelo agora é de trilhas individuais.
                    O estado editingInitiativeParentId e o save no Firestore continuam intactos,
                    preservando qualquer parentId histórico que já exista (não apaga dados). */}

                {/* "Trilha 1 grátis" é um artefato específico do curso do Israel — no modelo
                    por-consultor o acesso é sempre pelo que o consultor libera explicitamente
                    (sem bypass de curso "grátis"), então esse toggle não se aplica aos outros. */}
                {ehIsrael && <div className="w-full">
                  <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={editIsFree}
                      onChange={(e) => setEditIsFree(e.target.checked)}
                      className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-blue-700">
                      Trilha 1 (acessível para todos os alunos)
                    </span>
                  </label>
                </div>}
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <button
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir este tipo de projeto? Isso não excluirá os projetos associados, mas eles ficarão órfãos.")) {
                      handleDeleteInitiative(selectedInitiative!.id);
                      setIsEditingInitiative(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-black text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  EXCLUIR
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
                  <option value="">{ehIsrael ? 'Selecione uma trilha para configurar...' : 'Escolha ou crie o seu curso...'}</option>
                  {initiatives
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((trilha) => (
                      <option key={trilha.id} value={trilha.id}>
                        {trilha.name}
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

            {isDeleting && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} />
                  <p className="font-bold text-sm">Tem certeza que deseja excluir este tipo de projeto?</p>
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
                    Excluir AGORA
                  </button>
                </div>
              </div>
            )}

            {selectedInitiative && (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={() => setIsDeleting(selectedInitiative.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all text-xs font-bold"
                  title="Excluir este tipo de projeto"
                >
                  <Trash2 size={18} />
                  Excluir tipo
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
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">{ehIsrael ? 'Nome da Nova Trilha' : 'Nome do Novo Curso'}</label>
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
                        setNewInitiativeName('');
                        setNewInitiativeIsFree(false);
                      }}
                      className="flex-1 md:flex-none bg-white text-gray-500 px-8 py-3 rounded-lg border border-gray-200 font-black text-xs hover:bg-gray-50 uppercase tracking-wider"
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>

                {ehIsrael && <div className="w-full mt-4">
                  <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={newInitiativeIsFree}
                      onChange={(e) => setNewInitiativeIsFree(e.target.checked)}
                      className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-blue-700">
                      Trilha 1 (acessível para todos os alunos)
                    </span>
                  </label>
                </div>}
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
                                  return (
                                    <div key={toolId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm group">
                                      <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                                        {index + 1}
                                      </div>
                                      <span className="flex-1 text-xs font-bold text-gray-700 uppercase">{tool.name}</span>
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
