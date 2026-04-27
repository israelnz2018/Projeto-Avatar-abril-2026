import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Users, 
  Settings2, 
  ArrowRight, 
  Play, 
  Square, 
  GitBranch,
  Layout,
  RefreshCw,
  Edit3,
  Clock,
  Monitor,
  FileText,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface ModelingStep {
  id: string;
  type: 'task' | 'decision' | 'start' | 'end';
  text: string;
  responsible: string;
  description?: string;
  system?: string;
  activityType?: 'manual' | 'automated';
  estimatedTime?: string;
  nextId?: string;
  yesNextId?: string;
  noNextId?: string;
}

interface ModelingData {
  lanes: string[];
  steps: ModelingStep[];
}

interface ProcessModelingProps {
  data?: any;
  onSave: (data: any) => void;
  canvaData?: any; // Data from the Canva tool
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function ProcessModeling({ data, onSave, canvaData, onGenerateAI, isGeneratingAI, onClearAIData }: ProcessModelingProps) {
  const [modelingData, setModelingData] = useState<ModelingData>(() => {
    if (data && data.steps) return data;
    return { lanes: [], steps: [] };
  });

  const isToolEmpty = modelingData.steps.length === 0;

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isEditingLane, setIsEditingLane] = useState<number | null>(null);

  // Auto-generate from Canva if empty and canvaData exists
  useEffect(() => {
    if (modelingData.steps.length === 0 && canvaData?.steps?.length > 0) {
      generateFromCanva();
    }
  }, [canvaData]);

  const generateFromCanva = () => {
    if (!canvaData?.steps) return;

    const canvaSteps = canvaData.steps;
    const roles = Array.from(new Set(canvaSteps.map((s: any) => s.responsible || 'Não Definido'))) as string[];
    
    // Add Start and End if not present
    const steps: ModelingStep[] = [
      {
        id: 'start-node',
        type: 'start',
        text: 'Início',
        responsible: roles[0] || 'Dono do Processo',
        nextId: canvaSteps[0]?.id
      },
      ...canvaSteps.map((s: any) => ({
        ...s,
        activityType: 'manual',
        description: '',
        system: '',
        estimatedTime: ''
      })),
      {
        id: 'end-node',
        type: 'end',
        text: 'Fim',
        responsible: roles[roles.length - 1] || roles[0] || 'Dono do Processo'
      }
    ];

    // Link last steps to end node
    steps.forEach(s => {
      if (s.type === 'task' && !s.nextId) s.nextId = 'end-node';
      if (s.type === 'decision') {
        if (!s.yesNextId) s.yesNextId = 'end-node';
        if (!s.noNextId) s.noNextId = 'end-node';
      }
    });

    setModelingData({ lanes: roles, steps });
  };

  const handleSave = () => {
    onSave(modelingData);
  };

  const updateStep = (id: string, updates: Partial<ModelingStep>) => {
    setModelingData(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const addStep = (afterId: string) => {
    const newId = `step-${Math.random().toString(36).substr(2, 9)}`;
    const afterStep = modelingData.steps.find(s => s.id === afterId);
    
    const newStep: ModelingStep = {
      id: newId,
      type: 'task',
      text: 'Nova Atividade',
      responsible: afterStep?.responsible || modelingData.lanes[0] || 'Responsável',
      nextId: afterStep?.nextId
    };

    setModelingData(prev => {
      const newSteps = prev.steps.map(s => {
        if (s.id === afterId) {
          if (s.type === 'decision') return s; // Decisions handle next differently
          return { ...s, nextId: newId };
        }
        return s;
      });
      return { ...prev, steps: [...newSteps, newStep] };
    });
    
    setSelectedStepId(newId);
  };

  const removeStep = (id: string) => {
    if (id === 'start-node' || id === 'end-node') return;
    
    setModelingData(prev => {
      const stepToRemove = prev.steps.find(s => s.id === id);
      const nextId = stepToRemove?.nextId || stepToRemove?.yesNextId;
      
      return {
        ...prev,
        steps: prev.steps
          .filter(s => s.id !== id)
          .map(s => {
            if (s.nextId === id) return { ...s, nextId };
            if (s.yesNextId === id) return { ...s, yesNextId: nextId };
            if (s.noNextId === id) return { ...s, noNextId: nextId };
            return s;
          })
      };
    });
    setSelectedStepId(null);
  };

  const selectedStep = useMemo(() => 
    modelingData.steps.find(s => s.id === selectedStepId), 
  [modelingData.steps, selectedStepId]);

  // Diagram Layout Logic
  const renderDiagram = () => {
    return (
      <div className="relative overflow-x-auto pb-8 min-h-[600px] bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Swimlanes Background */}
        <div className="absolute inset-0 flex flex-col">
          {modelingData.lanes.map((lane, idx) => (
            <div 
              key={idx} 
              className={`flex-1 border-b border-slate-100 relative group ${idx % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-48 bg-slate-100 border-r border-slate-200 flex items-center justify-center p-4 z-10">
                {isEditingLane === idx ? (
                  <input
                    autoFocus
                    className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-sm font-medium focus:outline-none"
                    value={lane}
                    onChange={(e) => {
                      const newLanes = [...modelingData.lanes];
                      newLanes[idx] = e.target.value;
                      setModelingData(prev => ({ ...prev, lanes: newLanes }));
                    }}
                    onBlur={() => setIsEditingLane(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingLane(null)}
                  />
                ) : (
                  <div className="flex items-center gap-2 group/lane">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{lane}</span>
                    <button 
                      onClick={() => setIsEditingLane(idx)}
                      className="opacity-0 group-hover/lane:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Nodes and Connections */}
        <div className="relative ml-48 p-12 flex items-start gap-12 min-w-max">
          {renderFlow()}
        </div>
      </div>
    );
  };

  const renderFlow = () => {
    // Simple linear flow rendering for MVP
    // In a real app, we'd use a graph layout algorithm
    const orderedSteps: ModelingStep[] = [];
    const visited = new Set<string>();
    
    const traverse = (id?: string) => {
      if (!id || visited.has(id)) return;
      const step = modelingData.steps.find(s => s.id === id);
      if (!step) return;
      
      visited.add(id);
      orderedSteps.push(step);
      
      if (step.type === 'decision') {
        traverse(step.yesNextId);
        traverse(step.noNextId);
      } else {
        traverse(step.nextId);
      }
    };

    traverse('start-node');

    return (
      <div className="flex items-center gap-12">
        {orderedSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              {/* Lane Indicator (Vertical offset) */}
              <div 
                style={{ 
                  marginTop: `${modelingData.lanes.indexOf(step.responsible) * 150}px`,
                  transition: 'margin-top 0.3s ease'
                }}
                className="relative"
              >
                <div 
                  onClick={() => setSelectedStepId(step.id)}
                  className={`
                    cursor-pointer transition-all duration-200
                    ${step.type === 'start' || step.type === 'end' ? 'w-16 h-16 rounded-full' : ''}
                    ${step.type === 'task' ? 'w-48 p-4 rounded-lg border-2' : ''}
                    ${step.type === 'decision' ? 'w-32 h-32 rotate-45 flex items-center justify-center border-2' : ''}
                    ${selectedStepId === step.id ? 'ring-4 ring-blue-100 border-blue-500 shadow-lg scale-105' : 'border-slate-300 hover:border-slate-400 bg-white shadow-sm'}
                    flex items-center justify-center text-center
                  `}
                >
                  <div className={step.type === 'decision' ? '-rotate-45' : ''}>
                    {step.type === 'start' && <Play className="w-6 h-6 text-emerald-500" />}
                    {step.type === 'end' && <Square className="w-6 h-6 text-rose-500" />}
                    {step.type === 'task' && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{step.text}</p>
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium uppercase">
                          <Users className="w-2.5 h-2.5" />
                          {step.responsible}
                        </div>
                      </div>
                    )}
                    {step.type === 'decision' && (
                      <div className="p-2">
                        <p className="text-xs font-bold text-slate-700 leading-tight">{step.text}?</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Button */}
                {step.type !== 'end' && step.type !== 'decision' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); addStep(step.id); }}
                    className="absolute -right-6 top-1/2 -translate-y-1/2 bg-blue-500 text-white p-1 rounded-full opacity-0 hover:opacity-100 hover:scale-110 transition-all z-20 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Connection Arrow */}
            {index < orderedSteps.length - 1 && (
              <div className="flex items-center text-slate-300">
                <ArrowRight className="w-6 h-6" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Modelar Processo com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará o Process Mapping Canva para criar um modelo de processo estruturado com raias de responsabilidade, tempos estimados e sistemas.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * O modelo gerado será usado para realizar a simulação e validação do processo.
              </p>
            </div>
            <button
              onClick={() => onGenerateAI?.()}
              disabled={isGeneratingAI}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none shrink-0",
                isGeneratingAI
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-lg shadow-blue-100"
              )}
            >
              {isGeneratingAI
                ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={16} /> Gerar com IA</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Indicador de IA */}
      {!isToolEmpty && onGenerateAI && data?.isGenerated && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600">Gerado com IA</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Deseja limpar os dados gerados pela IA?')) {
                onClearAIData?.();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          >
            <Trash2 size={13} />
            Limpar dados da IA
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layout className="w-7 h-7 text-blue-600" />
            Modelagem de Processo
          </h2>
          <p className="text-slate-500">Transforme o rascunho em um modelo estruturado com raias de responsabilidade.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateFromCanva}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Regerar do Canva
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-sm"
          >
            <Save className="w-4 h-4" />
            Salvar Modelo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Diagram Area */}
        <div className="lg:col-span-3 space-y-4">
          {modelingData.steps.length > 0 ? (
            renderDiagram()
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-20 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Layout className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Nenhum modelo gerado</h3>
                <p className="text-slate-500">Clique no botão abaixo para transformar os dados do Canva em um modelo estruturado automaticamente.</p>
                <button
                  onClick={generateFromCanva}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-md"
                >
                  <RefreshCw className="w-5 h-5" />
                  Gerar Modelo do Canva
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Editor */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedStep ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 sticky top-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-blue-500" />
                    Propriedades
                  </h3>
                  <button 
                    onClick={() => removeStep(selectedStep.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="Remover etapa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={selectedStep.text}
                      onChange={(e) => updateStep(selectedStep.id, { text: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável (Raia)</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={selectedStep.responsible}
                      onChange={(e) => updateStep(selectedStep.id, { responsible: e.target.value })}
                    >
                      {modelingData.lanes.map(lane => (
                        <option key={lane} value={lane}>{lane}</option>
                      ))}
                    </select>
                  </div>

                  {selectedStep.type === 'task' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Descrição
                        </label>
                        <textarea
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                          placeholder="O que é feito nesta etapa?"
                          value={selectedStep.description || ''}
                          onChange={(e) => updateStep(selectedStep.id, { description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Monitor className="w-3 h-3" /> Sistema
                          </label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedStep.system || ''}
                            onChange={(e) => updateStep(selectedStep.id, { system: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Tempo Est.
                          </label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ex: 15min"
                            value={selectedStep.estimatedTime || ''}
                            onChange={(e) => updateStep(selectedStep.id, { estimatedTime: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Atividade</label>
                        <div className="flex gap-2">
                          {(['manual', 'automated'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => updateStep(selectedStep.id, { activityType: type })}
                              className={`
                                flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                ${selectedStep.activityType === type 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                              `}
                            >
                              {type === 'manual' ? 'Manual' : 'Auto'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedStep.type === 'decision' && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase mb-2">
                        <GitBranch className="w-4 h-4" />
                        Lógica de Decisão
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Decisões criam ramificações no fluxo. Use o Canva para definir os destinos de "Sim" e "Não".
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                <Edit3 className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Selecione uma etapa no diagrama para editar seus detalhes.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
