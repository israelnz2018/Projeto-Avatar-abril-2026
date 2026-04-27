import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Plus, Trash2, AlertCircle, Clock, 
  TrendingUp, TrendingDown, ChevronDown, ChevronRight, 
  Sparkles, X, Check, LayoutDashboard, ListTodo, 
  History, AlertTriangle, Target, Calendar, Info, Settings,
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
  predecessorId?: string; // ID of another activity
}

interface PhaseActivities {
  id: string;
  name: string;
  activities: Activity[];
  isOpen: boolean;
  weight: number; // Percentage of total project value
}

interface DetailedTimelineProps {
  onSave: (data: any) => void;
  initialData?: any;
  macroTimeline?: any;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const SUGGESTED_ACTIVITIES: Record<string, string[]> = {
  define: [
    "Identificação do problema e impacto no negócio.",
    "Definição clara do escopo do projeto.",
    "Mapeamento dos stakeholders (partes interessadas).",
    "Desenvolvimento do Project Charter (termo de abertura).",
    "Criação do SIPOC (Supplier, Input, Process, Output, Customer).",
    "Alinhamento das metas e objetivos financeiros e operacionais.",
    "Definição da reunião inicial (kick off)",
    "Definir as ações de contenção (se necessário)",
    "Desenvolvimento do plano de comunicação",
    "Envio da primeira comunicação"
  ],
  measure: [
    "Mapeamento do processo atual com fluxogramas",
    "Identificação das variáveis críticas",
    "Priorização das variáveis críticas",
    "Coleta de dados relevantes para entender o problema.",
    "Avaliação da capacidade do processo (Cp/Cpk/DPMO, etc).",
    "Análise do sistema de medição (MSA).",
    "Elaboração de um plano de coleta de dados",
    "Organização dos documentos da fase medir",
    "Envio da segunda comunicação"
  ],
  analyze: [
    "Uso de ferramentas da qualidade",
    "Uso de ferramentas estatísticas",
    "Uso de ferramentas Lean",
    "Identificação das causas raízes",
    "Organização dos documentos da fase Analisar",
    "Envio da terceira comunicação"
  ],
  improve: [
    "Desenvolvimento de soluções",
    "Fazer plano de ação",
    "Desenvolver um plano de gestão de mudança - ADKAR",
    "A análise de risco das ações de melhoria - FMEA",
    "Desenvolver pilotos para as ações críticas para o negócio",
    "Implementação de ações corretivas",
    "Fazer reuniões de acompanhamento das ações",
    "Recalcular a capacidade do processo após melhorias.",
    "Organização dos documentos da fase Melhorar",
    "Enviar comunicações periódicas"
  ],
  control: [
    "Criação de um plano de controle para monitoramento contínuo.",
    "Desenvolvimento de gráficos de controle para as variáveis críticas.",
    "Desenvolvimento de pokayokes para as variáveis críticas",
    "Treinamento das equipes sobre os novos processos ou padrões.",
    "Criação ou atualização de procedimentos",
    "Documentação das lições aprendidas.",
    "Verificação de sustentabilidade das melhorias (auditorias periódicas).",
    "Encerramento oficial do projeto e compartilhamento dos resultados",
    "Lançamento do projeto no sistema (se existir)"
  ]
};

const DEFAULT_STRUCTURE: PhaseActivities[] = [
  { id: 'define', name: 'Definir', activities: [], isOpen: true, weight: 15 },
  { id: 'measure', name: 'Medir', activities: [], isOpen: false, weight: 20 },
  { id: 'analyze', name: 'Analisar', activities: [], isOpen: false, weight: 20 },
  { id: 'improve', name: 'Melhorar', activities: [], isOpen: false, weight: 30 },
  { id: 'control', name: 'Controlar', activities: [], isOpen: false, weight: 15 },
];

export default function DetailedTimeline({ onSave, initialData, macroTimeline, onGenerateAI, isGeneratingAI, onClearAIData }: DetailedTimelineProps) {
  const [activeTab, setActiveTab] = useState<'activities' | 'dashboard' | 'analysis'>('activities');
  const [phases, setPhases] = useState<PhaseActivities[]>(initialData?.phases || DEFAULT_STRUCTURE);
  const isToolEmpty = phases.every(p => p.activities.length === 0);
  const [editingActivity, setEditingActivity] = useState<{ phaseId: string, activityId: string } | null>(null);

  // Auto-resize textareas when phases or editing state change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [phases, editingActivity, activeTab]);

  const allActivities = useMemo(() => {
    return phases.flatMap(p => p.activities.map(a => ({ id: a.id, text: a.text, phaseName: p.name })));
  }, [phases]);

  useEffect(() => {
    if (initialData?.phases) {
      setPhases(initialData.phases);
    }
  }, [initialData]);

  const applySuggestions = () => {
    const newPhases = phases.map(phase => {
      const macroPhase = macroTimeline?.phases?.find((p: any) => p.id === phase.id);
      return {
        ...phase,
        activities: (SUGGESTED_ACTIVITIES[phase.id] || []).map(text => ({
          id: Math.random().toString(36).substr(2, 9),
          text,
          status: 'Not Started' as const,
          plannedStart: macroPhase?.startDate || '',
          plannedFinish: macroPhase?.endDate || '',
          weight: 5,
          owner: '',
          notes: ''
        }))
      };
    });
    setPhases(newPhases);
    toast.success("Atividades sugeridas aplicadas com sucesso!");
  };

  const updateActivity = (phaseId: string, activityId: string, updates: Partial<Activity>) => {
    setPhases(prev => prev.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          activities: phase.activities.map(act => {
            if (act.id === activityId) {
              const newAct = { ...act, ...updates };
              // Auto-set actualFinish when completed
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

  // PMI Calculations
  const metrics = useMemo(() => {
    const today = new Date().getTime();
    let totalPV = 0;
    let totalEV = 0;
    
    const phaseMetrics = phases.map(phase => {
      const macroPhase = macroTimeline?.phases?.find((p: any) => p.id === phase.id);
      
      if (!macroPhase || !macroPhase.startDate || !macroPhase.endDate) {
        return { id: phase.id, pv: 0, ev: 0, spi: 1, status: 'Not Started', progress: 0, timeProgress: 0 };
      }

      const start = new Date(macroPhase.startDate).getTime();
      const end = new Date(macroPhase.endDate).getTime();
      const duration = end - start;
      
      // PV Calculation (Time-based)
      let pvFactor = 0;
      if (today > end) pvFactor = 1;
      else if (today > start) pvFactor = (today - start) / duration;
      const pv = pvFactor * phase.weight;

      // EV Calculation (Weighted Activity-based)
      const totalWeight = phase.activities.reduce((sum, a) => sum + a.weight, 0);
      const earnedWeight = phase.activities.reduce((sum, a) => {
        const progress = a.status === 'Completed' ? 1 : a.status === 'In Progress' ? 0.5 : 0;
        return sum + (a.weight * progress);
      }, 0);
      
      const evFactor = totalWeight > 0 ? (earnedWeight / totalWeight) : 0;
      const ev = evFactor * phase.weight;

      const spi = pv > 0 ? ev / pv : (ev > 0 ? 1.2 : 1);
      
      let status = 'On Schedule';
      const isCompleted = phase.activities.length > 0 && phase.activities.every(a => a.status === 'Completed');
      
      if (today < start && earnedWeight === 0) status = 'Not Started';
      else if (isCompleted) status = 'Completed';
      else if (spi < 0.85 || (today > end && !isCompleted)) status = 'Delayed';
      else if (spi < 0.95) status = 'At Risk';
      else status = 'In Progress';

      totalPV += pv;
      totalEV += ev;

      return { 
        id: phase.id, 
        name: phase.name, 
        pv, 
        ev, 
        spi, 
        status, 
        progress: Math.round(evFactor * 100), 
        timeProgress: Math.round(pvFactor * 100) 
      };
    });

    const totalSPI = totalPV > 0 ? totalEV / totalPV : (totalEV > 0 ? 1.2 : 1);
    let projectStatus = 'On Schedule';
    if (totalSPI < 0.85) projectStatus = 'Delayed';
    else if (totalSPI < 0.95) projectStatus = 'At Risk';

    return {
      phases: phaseMetrics,
      totalPV: Math.round(totalPV),
      totalEV: Math.round(totalEV),
      totalSPI: Number(totalSPI.toFixed(2)),
      projectStatus
    };
  }, [phases, macroTimeline]);

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
                  Gerar Cronograma Detalhado com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA vai detalhar as atividades de cada fase do cronograma macro para garantir o controle do projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA sugerirá atividades padrão baseadas nas fases do DMAIC e datas do cronograma macro.
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

      {/* Navigation Tabs and Quick Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex bg-gray-100 p-1 rounded-lg w-fit transition-all">
          <button 
            onClick={() => setActiveTab('activities')}
            className={cn("px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2", activeTab === 'activities' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            <ListTodo size={16} /> Atividades
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn("px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2", activeTab === 'dashboard' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            <LayoutDashboard size={16} /> Dashboard PMI
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={cn("px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2", activeTab === 'analysis' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            <History size={16} /> Análise de Desvios
          </button>
        </div>

        <button
          onClick={applySuggestions}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-blue-100 transition-all border-none cursor-pointer"
        >
          <Sparkles size={14} />
          Sugerir Atividades
        </button>
      </div>

      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-white p-6 border border-[#ccc] rounded-[8px] shadow-sm flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Execução do Projeto</h2>
              <p className="text-sm text-gray-500">Gerencie as tarefas e acompanhe o progresso real.</p>
            </div>
            <button onClick={() => onSave({ phases })} className="px-6 py-2 bg-[#10b981] text-white rounded-[4px] font-bold text-sm hover:bg-green-600">
              Salvar Progresso
            </button>
          </div>

          <div className="space-y-4">
            {phases.map((phase) => (
              <div key={phase.id} className="bg-white border border-[#eee] rounded-[8px] shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => togglePhase(phase.id)}>
                  <div className="flex items-center gap-3">
                    {phase.isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                    <h3 className="font-bold text-gray-800">{phase.name}</h3>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">Peso: {phase.weight}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Progresso</div>
                      <div className="text-sm font-bold text-gray-700">{metrics.phases.find(p => p.id === phase.id)?.progress}%</div>
                    </div>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${metrics.phases.find(p => p.id === phase.id)?.progress}%` }} />
                    </div>
                  </div>
                </div>

                {phase.isOpen && (
                  <div className="p-4 bg-gray-50/30 border-t border-[#eee] space-y-3">
                    <div className="grid grid-cols-[100px_1fr_90px_90px_50px_120px_100px_40px] gap-2 px-4 mb-2 text-[9px] font-bold text-gray-400 uppercase">
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
                      const predecessor = allActivities.find(a => a.id === activity.predecessorId);
                      const isPredecessorDone = !activity.predecessorId || 
                        phases.flatMap(p => p.activities).find(a => a.id === activity.predecessorId)?.status === 'Completed';

                      return (
                        <div key={activity.id} className="grid grid-cols-[100px_1fr_90px_90px_50px_120px_100px_40px] gap-2 items-center bg-white p-2 rounded border border-gray-100 group hover:border-blue-200 transition-all">
                          <select 
                            value={activity.status}
                            onChange={(e) => updateActivity(phase.id, activity.id, { status: e.target.value as any })}
                            className={cn(
                              "text-[9px] font-bold rounded px-1.5 py-1 border-none focus:ring-0",
                              activity.status === 'Completed' ? "bg-green-100 text-green-700" :
                              activity.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                            )}
                          >
                            <option value="Not Started">Não Iniciada</option>
                            <option value="In Progress">Em Andamento</option>
                            <option value="Completed">Concluída</option>
                          </select>
                          
                          <div className="flex flex-col min-w-0">
                            <textarea 
                              value={activity.text}
                              onChange={(e) => updateActivity(phase.id, activity.id, { text: e.target.value })}
                              className="text-[11px] bg-transparent border-none focus:ring-0 text-gray-700 font-medium resize-none leading-tight py-0 w-full h-full whitespace-normal break-words"
                              rows={1}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                const tr = target.closest('tr');
                                if (tr && tr.style.height && tr.style.height !== 'auto') {
                                  target.style.height = '100%';
                                } else {
                                  target.style.height = 'auto';
                                  target.style.height = `${target.scrollHeight}px`;
                                }
                              }}
                              style={{ height: 'auto', minHeight: '1.2em' }}
                            />
                            {activity.status === 'Completed' && activity.actualFinish && (
                              <span className="text-[8px] text-green-600">Concluído em: {activity.actualFinish}</span>
                            )}
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
                            className="text-[10px] border-gray-100 rounded p-1 focus:border-blue-300 outline-none bg-gray-50/50"
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
                              title="Notas"
                            >
                              <Info size={12} />
                            </button>
                            <button onClick={() => setPhases(prev => prev.map(p => p.id === phase.id ? { ...p, activities: p.activities.filter(a => a.id !== activity.id) } : p))} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {editingActivity?.activityId === activity.id && (
                            <div className="col-span-full mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                              <label className="text-[9px] font-bold text-blue-700 uppercase mb-1 block">Notas / Comentários</label>
                              <textarea 
                                value={activity.notes || ''}
                                onChange={(e) => updateActivity(phase.id, activity.id, { notes: e.target.value })}
                                placeholder="Adicione observações sobre esta atividade..."
                                className="w-full text-[10px] p-2 border border-blue-200 rounded bg-white focus:ring-1 focus:ring-blue-400 outline-none min-h-[50px] whitespace-normal break-words"
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
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Project Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">SPI Global</span>
                <Target size={16} className="text-blue-500" />
              </div>
              <div className="text-3xl font-black text-gray-800">{metrics.totalSPI}</div>
              <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded w-fit", metrics.totalSPI >= 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {metrics.totalSPI >= 1 ? "NO PRAZO" : "ATRASADO"}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Earned Value (EV)</span>
                <TrendingUp size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-black text-gray-800">{metrics.totalEV}%</div>
              <p className="text-[10px] text-gray-500">Trabalho Real Concluído</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Planned Value (PV)</span>
                <Calendar size={16} className="text-orange-500" />
              </div>
              <div className="text-3xl font-black text-gray-800">{metrics.totalPV}%</div>
              <p className="text-[10px] text-gray-500">Trabalho Planejado até Hoje</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Status Geral</span>
                <AlertCircle size={16} className={cn(metrics.projectStatus === 'Delayed' ? "text-red-500" : "text-green-500")} />
              </div>
              <div className={cn("text-xl font-bold", metrics.projectStatus === 'Delayed' ? "text-red-600" : "text-green-600")}>
                {metrics.projectStatus === 'Delayed' ? "Atraso Crítico" : "Saudável"}
              </div>
              <p className="text-[10px] text-gray-500">Baseado na Baseline Macro</p>
            </div>
          </div>

          {/* Phase Performance Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Performance por Fase (Schedule Control)</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50">
                  <th className="p-4 whitespace-normal break-words">Fase</th>
                  <th className="p-4 whitespace-normal break-words">Status PMI</th>
                  <th className="p-4 whitespace-normal break-words">SPI</th>
                  <th className="p-4 whitespace-normal break-words">EV (Real)</th>
                  <th className="p-4 whitespace-normal break-words">PV (Plano)</th>
                  <th className="p-4 whitespace-normal break-words">Progresso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.phases.map(p => (
                  <tr key={p.id} className="text-sm hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-700 whitespace-normal break-words align-top">{p.name}</td>
                    <td className="p-4 whitespace-normal break-words align-top">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold",
                        p.status === 'Delayed' ? "bg-red-100 text-red-700" : 
                        p.status === 'At Risk' ? "bg-orange-100 text-orange-700" :
                        p.status === 'Completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold whitespace-normal break-words align-top">{p.spi.toFixed(2)}</td>
                    <td className="p-4 text-green-600 font-bold whitespace-normal break-words align-top">{p.ev}%</td>
                    <td className="p-4 text-orange-600 font-bold whitespace-normal break-words align-top">{p.pv}%</td>
                    <td className="p-4 whitespace-normal break-words align-top">
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${p.progress}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
            <div className="flex items-center gap-4 text-red-600">
              <AlertTriangle size={32} />
              <div>
                <h3 className="text-xl font-bold">Análise de Variância e Recuperação</h3>
                <p className="text-sm text-gray-500">Identifique gargalos e implemente estratégias de recuperação do cronograma.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-500" /> Fases com Desvio Crítico
                </h4>
                {metrics.phases.filter(p => p.status === 'Delayed' || p.status === 'At Risk').length > 0 ? (
                  <div className="space-y-4">
                    {metrics.phases.filter(p => p.status === 'Delayed' || p.status === 'At Risk').map(p => (
                      <div key={p.id} className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-red-900">{p.name}</span>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">SPI: {p.spi.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-red-700">
                            <span>Atraso de Execução</span>
                            <span>{p.pv - p.ev}% do total</span>
                          </div>
                          <div className="w-full h-1.5 bg-red-200 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (p.pv - p.ev) * 2)}%` }} />
                          </div>
                        </div>
                        <p className="text-[11px] text-red-800 leading-relaxed italic">
                          "O desvio nesta fase impacta diretamente o início da próxima fase devido à dependência sequencial do DMAIC."
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-green-50 border border-green-100 rounded-lg text-center space-y-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                      <Check size={24} />
                    </div>
                    <p className="text-sm font-bold text-green-700">Excelente! Nenhuma fase apresenta atraso crítico no momento.</p>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <h5 className="text-xs font-bold text-gray-700 uppercase">Impacto no Prazo Final</h5>
                  <div className="flex items-center gap-3">
                    <div className={cn("text-2xl font-black", metrics.totalSPI < 1 ? "text-red-600" : "text-green-600")}>
                      {metrics.totalSPI < 1 ? `+${Math.round((1 - metrics.totalSPI) * 30)} dias` : "No Prazo"}
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Estimativa de atraso na entrega final baseada na performance atual (SPI).
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-500" /> Estratégias de Recuperação (PMI)
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-blue-100 rounded-lg shadow-sm space-y-2 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                      <TrendingUp size={16} /> Crashing (Compressão)
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Adicione recursos extras (horas extras, novos membros) especificamente nas atividades de <strong>maior peso</strong> que ainda não foram iniciadas nas fases em atraso.
                    </p>
                    <div className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded w-fit">Custo: Alto | Risco: Baixo</div>
                  </div>

                  <div className="p-4 bg-white border border-blue-100 rounded-lg shadow-sm space-y-2 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                      <History size={16} /> Fast Tracking (Paralelismo)
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Inicie atividades da fase <strong>{phases[Math.min(phases.length - 1, metrics.phases.findIndex(p => p.status === 'Delayed' || p.status === 'At Risk') + 1)]?.name}</strong> antes mesmo de concluir totalmente a fase atual.
                    </p>
                    <div className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded w-fit">Custo: Baixo | Risco: Alto</div>
                  </div>

                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                      <Settings size={16} /> Revisão de Escopo
                    </div>
                    <p className="text-xs text-orange-800 leading-relaxed">
                      Se o atraso persistir, considere reduzir o escopo de atividades não críticas (peso baixo) para garantir a data de entrega final.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Glossário de Indicadores */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Info size={16} className="text-blue-500" /> Entendendo os Indicadores (PMI)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="font-bold text-[10px] text-blue-600 uppercase mb-1">PV (Planned Value)</div>
                  <p className="text-[10px] text-gray-600 leading-tight">
                    <strong>Valor Planejado:</strong> Quanto do projeto deveria estar pronto hoje, baseado no tempo decorrido da baseline macro.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="font-bold text-[10px] text-green-600 uppercase mb-1">EV (Earned Value)</div>
                  <p className="text-[10px] text-gray-600 leading-tight">
                    <strong>Valor Agregado:</strong> Quanto do projeto realmente foi entregue até agora, considerando o peso de cada atividade concluída.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="font-bold text-[10px] text-purple-600 uppercase mb-1">SPI (Schedule Performance Index)</div>
                  <p className="text-[10px] text-gray-600 leading-tight">
                    <strong>Índice de Performance:</strong> Eficiência do cronograma. 
                    <br/>• {'>'} 1.0: Adiantado
                    <br/>• 1.0: No Prazo
                    <br/>• {'<'} 1.0: Atrasado
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="font-bold text-[10px] text-orange-600 uppercase mb-1">SV (Schedule Variance)</div>
                  <p className="text-[10px] text-gray-600 leading-tight">
                    <strong>Variação de Cronograma:</strong> A diferença absoluta entre o que foi feito (EV) e o que era planejado (PV).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
