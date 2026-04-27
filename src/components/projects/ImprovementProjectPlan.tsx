import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Trash2, AlertCircle, Clock, 
  ChevronDown, ChevronRight, Sparkles, X, Check, ListTodo, 
  Target, Calendar, Info, Settings, AlertTriangle, TrendingUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Activity {
  id: string;
  text: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  plannedStart?: string;
  plannedFinish?: string;
  actualFinish?: string;
  weight: number; // 1 to 10
  owner?: string;
  notes?: string;
  predecessorId?: string;
}

interface PhaseActivities {
  id: string;
  name: string;
  activities: Activity[];
  isOpen: boolean;
  weight: number;
}

interface ImprovementProjectPlanProps {
  onSave: (data: any) => void;
  initialData?: any;
  macroTimeline?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const DEFAULT_STRUCTURE: PhaseActivities[] = [
  { id: 'define', name: 'Definir', activities: [], isOpen: true, weight: 20 },
  { id: 'measure', name: 'Medir', activities: [], isOpen: false, weight: 20 },
  { id: 'analyze', name: 'Analisar', activities: [], isOpen: false, weight: 20 },
  { id: 'improve', name: 'Melhorar', activities: [], isOpen: false, weight: 20 },
  { id: 'control', name: 'Controlar', activities: [], isOpen: false, weight: 20 },
];

export default function ImprovementProjectPlan({ onSave, initialData, macroTimeline, onGenerateAI, isGeneratingAI, onClearAIData }: ImprovementProjectPlanProps) {
  const [phases, setPhases] = useState<PhaseActivities[]>(initialData?.phases || DEFAULT_STRUCTURE);
  const isToolEmpty = phases.every(p => p.activities.length === 0);
  const [editingActivity, setEditingActivity] = useState<{ phaseId: string, activityId: string } | null>(null);

  const allActivities = useMemo(() => {
    return phases.flatMap(p => p.activities.map(a => ({ id: a.id, text: a.text, phaseName: p.name })));
  }, [phases]);

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.phases) {
        setPhases(data.phases);
      }
    }
  }, [initialData]);

  useLayoutEffect(() => {
    // Automatically adjust height of all textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((t) => {
      const el = t as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }, [phases]);

  const updateActivity = (phaseId: string, activityId: string, updates: Partial<Activity>) => {
    setPhases(prev => prev.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          activities: phase.activities.map(act => {
            if (act.id === activityId) {
              const newAct = { ...act, ...updates };
              if (updates.status === 'Completed' && act.status !== 'Completed') {
                newAct.actualFinish = new Date().toISOString().split('T')[0];
              } else if (updates.status && updates.status !== 'Completed') {
                newAct.actualFinish = undefined;
              }
              return newAct;
            }
            return act;
          })
        };
      }
      return phase;
    }));
  };

  const addActivity = (phaseId: string) => {
    const macroPhase = macroTimeline?.phases?.find((p: any) => p.id === phaseId);
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'Nova atividade',
      status: 'Not Started',
      plannedStart: macroPhase?.startDate || '',
      plannedFinish: macroPhase?.endDate || '',
      weight: 5
    };
    setPhases(prev => prev.map(phase => 
      phase.id === phaseId ? { ...phase, activities: [...phase.activities, newActivity] } : phase
    ));
    setEditingActivity({ phaseId, activityId: newActivity.id });
  };

  const togglePhase = (id: string) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, isOpen: !p.isOpen } : p));
  };

  const getActivityStatus = (activity: Activity) => {
    if (activity.status === 'Completed') return { label: 'Concluído', color: 'text-green-600', icon: CheckCircle2 };
    
    const today = new Date().toISOString().split('T')[0];
    if (activity.plannedFinish && today > activity.plannedFinish) {
      return { label: 'Atrasado', color: 'text-red-600', icon: AlertTriangle };
    }
    
    if (activity.status === 'In Progress') return { label: 'Em Andamento', color: 'text-blue-600', icon: Clock };
    return { label: 'Não Iniciado', color: 'text-gray-400', icon: Circle };
  };

  const summary = useMemo(() => {
    const total = phases.reduce((acc, p) => acc + p.activities.length, 0);
    const completed = phases.reduce((acc, p) => acc + p.activities.filter(a => a.status === 'Completed').length, 0);
    const delayed = phases.reduce((acc, p) => {
      const today = new Date().toISOString().split('T')[0];
      return acc + p.activities.filter(a => a.status !== 'Completed' && a.plannedFinish && today > a.plannedFinish).length;
    }, 0);
    
    // Weighted progress
    const totalWeight = phases.reduce((acc, p) => acc + p.activities.reduce((sum, a) => sum + a.weight, 0), 0);
    const earnedWeight = phases.reduce((acc, p) => acc + p.activities.reduce((sum, a) => {
      const progress = a.status === 'Completed' ? 1 : a.status === 'In Progress' ? 0.5 : 0;
      return sum + (a.weight * progress);
    }, 0), 0);
    
    return { 
      total, 
      completed, 
      delayed, 
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      weightedProgress: totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0
    };
  }, [phases]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative animate-in fade-in duration-500">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Plano do Projeto com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA vai criar as atividades de cada fase usando as datas e título do Cronograma Macro.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA sugerirá atividades padrão para cada fase do ciclo de vida DMAIC.
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
      {!isToolEmpty && onGenerateAI && initialData?.isGenerated && (
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <ListTodo size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Progresso (Qtd)</p>
            <p className="text-xl font-black text-gray-800">{summary.progress}%</p>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Progresso (Peso)</p>
            <p className="text-xl font-black text-gray-800">{summary.weightedProgress}%</p>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Concluídas</p>
            <p className="text-xl font-black text-gray-800">{summary.completed} / {summary.total}</p>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", summary.delayed > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400")}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Atrasadas</p>
            <p className={cn("text-xl font-black", summary.delayed > 0 ? "text-red-600" : "text-gray-800")}>{summary.delayed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 border border-[#ccc] rounded-[8px] shadow-sm flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Plano do Projeto de Melhoria</h2>
          <p className="text-sm text-gray-500">Planeje e acompanhe a execução das suas atividades.</p>
        </div>
        <button onClick={() => onSave({ phases })} className="px-6 py-2 bg-[#10b981] text-white rounded-[4px] font-bold text-sm hover:bg-green-600">
          Salvar Plano
        </button>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase.id} className="bg-white border border-[#eee] rounded-[8px] shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => togglePhase(phase.id)}>
              <div className="flex items-center gap-3">
                {phase.isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                <h3 className="font-bold text-gray-800">{phase.name}</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[8px] font-bold text-gray-400 uppercase">Qtd</div>
                  <div className="text-xs font-bold text-gray-700">
                    {phase.activities.filter(a => a.status === 'Completed').length} / {phase.activities.length}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-bold text-gray-400 uppercase">Peso</div>
                  <div className="text-xs font-bold text-blue-600">
                    {phase.activities.length > 0 ? Math.round((phase.activities.reduce((sum, a) => sum + (a.status === 'Completed' ? a.weight : a.status === 'In Progress' ? a.weight * 0.5 : 0), 0) / phase.activities.reduce((sum, a) => sum + a.weight, 0)) * 100) : 0}%
                  </div>
                </div>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${phase.activities.length > 0 ? (phase.activities.reduce((sum, a) => sum + (a.status === 'Completed' ? a.weight : a.status === 'In Progress' ? a.weight * 0.5 : 0), 0) / phase.activities.reduce((sum, a) => sum + a.weight, 0)) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            </div>

            {phase.isOpen && (
              <div className="p-4 bg-gray-50/30 border-t border-[#eee] space-y-3">
                <div className="grid grid-cols-[120px_1fr_90px_90px_50px_120px_100px_40px] gap-2 px-4 mb-2 text-[9px] font-bold text-gray-400 uppercase">
                  <span>Status</span>
                  <span>Atividade</span>
                  <span>Início</span>
                  <span>Fim</span>
                  <span>Peso</span>
                  <span>Predecessora</span>
                  <span>Responsável</span>
                  <span></span>
                </div>
                {phase.activities.map((activity) => {
                  const statusInfo = getActivityStatus(activity);
                  const StatusIcon = statusInfo.icon;
                  const isPredecessorDone = !activity.predecessorId || 
                    phases.flatMap(p => p.activities).find(a => a.id === activity.predecessorId)?.status === 'Completed';

                  return (
                    <div key={activity.id} className="grid grid-cols-[120px_1fr_90px_90px_50px_120px_100px_40px] gap-2 items-center bg-white p-2 rounded border border-gray-100 group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-2">
                        <select 
                          value={activity.status}
                          onChange={(e) => updateActivity(phase.id, activity.id, { status: e.target.value as any })}
                          className={cn(
                            "text-[9px] font-bold rounded px-1.5 py-1 border-none focus:ring-0 w-full",
                            activity.status === 'Completed' ? "bg-green-100 text-green-700" :
                            activity.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                          )}
                        >
                          <option value="Not Started">Não Iniciada</option>
                          <option value="In Progress">Em Andamento</option>
                          <option value="Completed">Concluída</option>
                        </select>
                        <StatusIcon size={14} className={statusInfo.color} />
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <textarea 
                          value={activity.text}
                          onChange={(e) => updateActivity(phase.id, activity.id, { text: e.target.value })}
                          className="text-[11px] bg-transparent border-none focus:ring-0 text-gray-700 font-medium resize-none overflow-hidden leading-tight py-0"
                          rows={1}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                          }}
                        />
                        {!isPredecessorDone && (
                          <span className="text-[8px] text-orange-600 flex items-center gap-1">
                            <AlertCircle size={8} /> Aguardando predecessora
                          </span>
                        )}
                      </div>

                      <input 
                        type="date"
                        value={activity.plannedStart}
                        onChange={(e) => updateActivity(phase.id, activity.id, { plannedStart: e.target.value })}
                        className="text-[10px] border-gray-100 rounded p-1 focus:border-blue-300 outline-none bg-gray-50/50"
                      />

                      <input 
                        type="date"
                        value={activity.plannedFinish}
                        onChange={(e) => updateActivity(phase.id, activity.id, { plannedFinish: e.target.value })}
                        className={cn(
                          "text-[10px] border-gray-100 rounded p-1 focus:border-blue-300 outline-none bg-gray-50/50",
                          statusInfo.label === 'Atrasado' ? "text-red-600 font-bold" : ""
                        )}
                      />

                      <input 
                        type="number"
                        min="1"
                        max="10"
                        value={activity.weight}
                        onChange={(e) => updateActivity(phase.id, activity.id, { weight: parseInt(e.target.value) || 1 })}
                        className="text-[10px] border-gray-100 rounded p-1 text-center focus:border-blue-300 outline-none bg-gray-50/50"
                        title="Peso (1-10)"
                      />

                      <select
                        value={activity.predecessorId || ''}
                        onChange={(e) => updateActivity(phase.id, activity.id, { predecessorId: e.target.value || undefined })}
                        className="text-[9px] border-gray-100 rounded p-1 focus:border-blue-300 outline-none bg-gray-50/50 truncate max-w-[120px]"
                      >
                        <option value="">Nenhuma</option>
                        {allActivities
                          .filter(a => a.id !== activity.id)
                          .map(a => (
                            <option key={a.id} value={a.id}>
                              [{a.phaseName}] {a.text.substring(0, 20)}...
                            </option>
                          ))
                        }
                      </select>

                      <input 
                        placeholder="Responsável"
                        value={activity.owner}
                        onChange={(e) => updateActivity(phase.id, activity.id, { owner: e.target.value })}
                        className="text-[10px] border-gray-100 rounded p-1 focus:border-blue-300 outline-none bg-gray-50/50"
                      />

                      <div className="flex items-center gap-0.5">
                        <button 
                          onClick={() => setEditingActivity(editingActivity?.activityId === activity.id ? null : { phaseId: phase.id, activityId: activity.id })}
                          className={cn("p-1 rounded hover:bg-gray-100 transition-colors", editingActivity?.activityId === activity.id ? "text-blue-600" : "text-gray-400")}
                        >
                          <Info size={12} />
                        </button>
                        <button onClick={() => setPhases(prev => prev.map(p => p.id === phase.id ? { ...p, activities: p.activities.filter(a => a.id !== activity.id) } : p))} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {editingActivity?.activityId === activity.id && (
                        <div className="col-span-full mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <label className="text-[9px] font-bold text-blue-700 uppercase mb-1 block">Notas / Comentários</label>
                          <textarea 
                            value={activity.notes || ''}
                            onChange={(e) => updateActivity(phase.id, activity.id, { notes: e.target.value })}
                            placeholder="Adicione observações..."
                            className="w-full text-[10px] p-2 border border-blue-200 rounded bg-white focus:ring-1 focus:ring-blue-400 outline-none min-h-[50px]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={() => addActivity(phase.id)} className="w-full py-2 border border-dashed border-blue-200 text-blue-600 text-xs font-bold rounded hover:bg-blue-50 flex items-center justify-center gap-2">
                  <Plus size={14} /> Adicionar Atividade
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
