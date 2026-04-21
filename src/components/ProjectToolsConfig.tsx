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
  ArrowDown
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
  restoreDefaultMethodologies
} from '../services/configService';
import { Initiative, InitiativePhaseConfig } from '../types';

const DEFAULT_PHASES = [
  { id: 'Define', name: 'Definir' },
  { id: 'Measure', name: 'Medir' },
  { id: 'Analyze', name: 'Analisar' },
  { id: 'Improve', name: 'Melhorar' },
  { id: 'Control', name: 'Controlar' },
];

const AVAILABLE_TOOLS = [
  { id: 'brief', name: 'Entendendo o Problema', phase: 'Define' },
  { id: 'charter', name: 'Project Charter', phase: 'Define' },
  { id: 'projectCharterPMI', name: 'Project Charter - PMI', phase: 'Define' },
  { id: 'sipoc', name: 'SIPOC', phase: 'Define' },
  { id: 'timeline', name: 'Cronograma Macro', phase: 'Define' },
  { id: 'wbs', name: 'WBS (EAP)', phase: 'Define' },
  { id: 'gpPlanPMI', name: 'Plano do GP - PMI', phase: 'Define' },
  { id: 'detailedTimeline', name: 'Atividades Detalhadas', phase: 'Define' },
  { id: 'riskManagementPMI', name: 'Plano de Riscos PMI', phase: 'Measure' },
  { id: 'riskMonitoringPMI', name: 'Monitoramento de Riscos - PMI', phase: 'Monitor' },
  { id: 'improvementPlan', name: 'Plano do Projeto de Melhoria', phase: 'Define' },
  { id: 'stakeholders', name: 'Stakeholders', phase: 'Define' },
  { id: 'stakeholderAnalysisPMI', name: 'Análise de Stakeholders - PMI', phase: 'Define' },
  { id: 'processMap', name: 'Mapeamento de Processo', phase: 'Measure' },
  { id: 'brainstorming', name: 'Brainstorming', phase: 'Measure' },
  { id: 'measureIshikawa', name: 'Espinha de Peixe (Medir)', phase: 'Measure' },
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
  { id: 'statisticalAnalysis', name: 'Análise Estatística', phase: 'Analyze' },
  { id: 'dataNature', name: 'Natureza dos Dados', phase: 'Analyze' },
  { id: 'fmea', name: 'FMEA', phase: 'Improve' },
  { id: 'plan5w2h', name: 'Plano de Ação 5W2H', phase: 'Improve' },
  { id: 'actionPlan', name: 'Plano de Ação', phase: 'Improve' },
  { id: 'sop', name: 'POP (Procedimento Operacional Padrão)', phase: 'Improve' },
  { id: 'processCanva', name: 'Canva', phase: 'Measure' },
  { id: 'processModeling', name: 'Modelagem de Processo', phase: 'Measure' },
  { id: 'processValidation', name: 'Validação de Processo', phase: 'Measure' },
  { id: 'improvementIdea', name: 'Ideia de Projeto de Melhoria', phase: 'Pre-Definir' },
];

export default function ProjectToolsConfig() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [configs, setConfigs] = useState<InitiativePhaseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newInitiativeName, setNewInitiativeName] = useState('');
  const [newInitiativeParentId, setNewInitiativeParentId] = useState('');
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

  const handleOpenEditInitiative = () => {
    if (!selectedInitiative) return;
    setEditingInitiativeName(selectedInitiative.name);
    setEditingInitiativeParentId(selectedInitiative.parentId || '');
    setIsEditingInitiative(true);
  };

  const handleSaveInitiativeEdit = async () => {
    if (!selectedInitiative || !editingInitiativeName.trim()) return;
    
    try {
      const updates: any = { name: editingInitiativeName };
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
      toast.success("Iniciativa atualizada com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar iniciativa");
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
      const initiative = await createInitiative(newInitiativeName, undefined, newInitiativeParentId || undefined);
      setInitiatives(prev => [...prev, initiative]);
      setNewInitiativeName('');
      setNewInitiativeParentId('');
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
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Tipo de Projeto Pai (Opcional)
                  </label>
                  <select
                    value={editingInitiativeParentId}
                    onChange={(e) => setEditingInitiativeParentId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Nenhum (Tipo Principal)</option>
                    {initiatives
                      .filter(i => i.id !== selectedInitiative?.id) // Prevent setting itself as parent
                      .map((initiative) => (
                        <option key={initiative.id} value={initiative.id}>
                          {initiative.name}
                        </option>
                      ))}
                  </select>
                </div>
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
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                1. Selecione o Tipo de Projeto
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedInitiative?.id || ''}
                  onChange={(e) => {
                    const initiative = initiatives.find(i => i.id === e.target.value);
                    if (initiative) handleSelectInitiative(initiative);
                  }}
                  className="flex-1 p-3 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Selecione um tipo de projeto para configurar...</option>
                  {initiatives
                    .filter(i => !i.parentId) // Top-level initiatives
                    .map((parent) => (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>{parent.name} (Principal)</option>
                        {initiatives
                          .filter(child => child.parentId === parent.id)
                          .map(child => (
                            <option key={child.id} value={child.id}>
                              ↳ {child.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  {/* Initiatives that might have a parent that doesn't exist anymore (fallback) */}
                  {initiatives
                    .filter(i => i.parentId && !initiatives.some(p => p.id === i.parentId))
                    .map(orphan => (
                      <option key={orphan.id} value={orphan.id}>
                        {orphan.name} (Órfã)
                      </option>
                    ))}
                </select>
                {selectedInitiative && (
                  <button
                    onClick={handleOpenEditInitiative}
                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 border border-gray-200"
                    title="Editar Tipo de Projeto"
                  >
                    <Settings size={18} />
                  </button>
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
              <div className="flex items-end gap-2">
                <button 
                  onClick={() => setIsDeleting(selectedInitiative.id)}
                  className="p-3 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"
                  title="Excluir este tipo de projeto"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => handleSaveConfigs()}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-black hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 uppercase text-xs tracking-wider"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                  Salvar Configuração
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
                      placeholder="Ex: 1.1 Pequenas melhorias (ver e agir)"
                      value={newInitiativeName}
                      onChange={(e) => setNewInitiativeName(e.target.value)}
                      className="w-full p-3 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold bg-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateInitiative()}
                    />
                  </div>
                  <div className="w-full md:w-64">
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">Tipo de Projeto Pai (Opcional)</label>
                    <select
                      value={newInitiativeParentId}
                      onChange={(e) => setNewInitiativeParentId(e.target.value)}
                      className="w-full p-3 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold bg-white"
                    >
                      <option value="">Nenhum (Principal)</option>
                      {initiatives
                        .filter(i => !i.parentId)
                        .map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name}
                          </option>
                        ))}
                    </select>
                  </div>
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
                      }}
                      className="flex-1 md:flex-none bg-white text-gray-500 px-8 py-3 rounded-lg border border-gray-200 font-black text-xs hover:bg-gray-50 uppercase tracking-wider"
                    >
                      CANCELAR
                    </button>
                  </div>
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
                  onClick={() => setEditedPhases([...editedPhases, { id: Math.random().toString(36).substr(2, 9), name: 'Nova Fase' }])}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {AVAILABLE_TOOLS.map((tool) => {
                                const isSelected = config.toolIds.includes(tool.id);
                                return (
                                  <button
                                    key={tool.id}
                                    onClick={() => toggleTool(phase.id, tool.id)}
                                    className={cn(
                                      "flex items-center justify-between p-4 rounded-xl border text-left transition-all group",
                                      isSelected
                                        ? "bg-blue-600 border-blue-600 shadow-md ring-2 ring-blue-100"
                                        : "bg-white border-gray-100 hover:border-blue-200"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                        isSelected ? "bg-white/20 text-white" : "bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                      )}>
                                        <Wrench size={16} />
                                      </div>
                                      <div>
                                        <div className={cn("text-xs font-black uppercase tracking-tight", isSelected ? "text-white" : "text-gray-500")}>
                                          {tool.name}
                                        </div>
                                        <div className={cn("text-[9px] font-bold uppercase mt-0.5", isSelected ? "text-blue-100" : "text-gray-400")}>
                                          Sugestão: {tool.phase}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && <CheckCircle2 size={18} className="text-white" />}
                                  </button>
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-20 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Settings size={64} className="mx-auto mb-6 text-gray-200 animate-pulse" />
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Configurador de Metodologias</h3>
              <p className="text-gray-500 max-w-md mx-auto mt-2">
                Selecione uma iniciativa no dropdown acima para definir quais fases e ferramentas o aluno terá acesso.
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Restore Defaults Area */}
      <div className="max-w-4xl mx-auto w-full p-4 border-t border-gray-200 mt-8 flex justify-center">
        <button
          onClick={async () => {
            if (window.confirm('Isso irá apagar todas as configurações customizadas e restaurar os padrões de fábrica. Deseja continuar?')) {
              setLoading(true);
              try {
                await restoreDefaultMethodologies(AVAILABLE_TOOLS);
                const fresh = await getInitiatives();
                setInitiatives(fresh);
                setSelectedInitiative(null);
                setConfigs([]);
                toast.success('Padrões restaurados com sucesso!');
              } catch (err) {
                toast.error('Erro ao restaurar padrões.');
              } finally {
                setLoading(false);
              }
            }
          }}
          className="flex items-center gap-2 py-3 px-6 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-sm font-bold transition-all border border-orange-200 shadow-sm"
        >
          <Sparkles size={16} />
          Restaurar Metodologias Padrão (Limpar Tudo)
        </button>
      </div>
    </div>
  );
}
