import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, 
  Calendar, MessageSquare, AlertTriangle, TrendingUp,
  LayoutList, Save, Info, CheckCircle, AlertCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface GPActivity {
  id: string;
  displayId: string;
  text: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  startDate?: string;
  endDate?: string;
  predecessors: string[];
  weight: 1 | 3 | 5;
  notes?: string;
}

interface GPPhase {
  id: string;
  name: string;
  color: string;
  activities: GPActivity[];
  isOpen: boolean;
}

interface GPPlanPMIProps {
  onSave: (data: any) => void;
  initialData?: any;
}

const INITIAL_PHASES: GPPhase[] = [
  {
    id: 'initiation',
    name: 'Iniciação',
    color: 'bg-blue-600',
    isOpen: true,
    activities: [
      { id: 'i1', displayId: 'I1', text: 'Definir objetivo do projeto', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'i2', displayId: 'I2', text: 'Identificar stakeholders', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'i3', displayId: 'I3', text: 'Alinhar expectativas com sponsor', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'i4', displayId: 'I4', text: 'Criar Project Charter', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'i5', displayId: 'I5', text: 'Obter aprovação do Project Charter', status: 'Not Started', weight: 1, predecessors: [] },
    ]
  },
  {
    id: 'planning',
    name: 'Planejamento',
    color: 'bg-green-600',
    isOpen: false,
    activities: [
      { id: 'p1', displayId: 'P1', text: 'Definir escopo do projeto', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'p2', displayId: 'P2', text: 'Criar WBS (Work Breakdown Structure)', status: 'Not Started', weight: 5, predecessors: [] },
      { id: 'p3', displayId: 'P3', text: 'Detalhar atividades a partir do WBS', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'p4', displayId: 'P4', text: 'Sequenciar atividades (dependências)', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p5', displayId: 'P5', text: 'Estimar duração das atividades com responsáveis', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p6', displayId: 'P6', text: 'Desenvolver cronograma do projeto', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'p7', displayId: 'P7', text: 'Definir responsáveis por atividade', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p8', displayId: 'P8', text: 'Estimar recursos necessários', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p9', displayId: 'P9', text: 'Identificar riscos do projeto', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'p10', displayId: 'P10', text: 'Analisar riscos (probabilidade e impacto)', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p11', displayId: 'P11', text: 'Definir plano de resposta aos riscos', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p12', displayId: 'P12', text: 'Definir responsáveis pelos riscos', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p13', displayId: 'P13', text: 'Planejar comunicação (quem, o quê, quando)', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p14', displayId: 'P14', text: 'Definir indicadores de acompanhamento', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'p15', displayId: 'P15', text: 'Consolidar e aprovar plano do projeto', status: 'Not Started', weight: 3, predecessors: [] },
    ]
  },
  {
    id: 'execution',
    name: 'Execução',
    color: 'bg-yellow-500',
    isOpen: false,
    activities: [
      { id: 'e1', displayId: 'E1', text: 'Iniciar execução das atividades', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'e2', displayId: 'E2', text: 'Coordenar equipe do projeto', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'e3', displayId: 'E3', text: 'Realizar reuniões de acompanhamento', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'e4', displayId: 'E4', text: 'Atualizar progresso das atividades', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'e5', displayId: 'E5', text: 'Gerenciar comunicação com stakeholders', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'e6', displayId: 'E6', text: 'Gerenciar expectativas dos stakeholders', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'e7', displayId: 'E7', text: 'Resolver impedimentos do projeto', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'e8', displayId: 'E8', text: 'Garantir qualidade das entregas', status: 'Not Started', weight: 1, predecessors: [] },
    ]
  },
  {
    id: 'monitoring',
    name: 'Monitoramento & Controle',
    color: 'bg-orange-600',
    isOpen: false,
    activities: [
      { id: 'm1', displayId: 'M1', text: 'Comparar progresso real vs planejado', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'm2', displayId: 'M2', text: 'Identificar desvios de prazo', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'm3', displayId: 'M3', text: 'Atualizar cronograma do projeto', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'm4', displayId: 'M4', text: 'Monitorar riscos e novos riscos', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'm5', displayId: 'M5', text: 'Executar planos de resposta a riscos', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'm6', displayId: 'M6', text: 'Gerenciar solicitações de mudança', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'm7', displayId: 'M7', text: 'Avaliar impacto das mudanças', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'm8', displayId: 'M8', text: 'Atualizar stakeholders sobre status', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'm9', displayId: 'M9', text: 'Tomar ações corretivas quando necessário', status: 'Not Started', weight: 3, predecessors: [] },
    ]
  },
  {
    id: 'closing',
    name: 'Encerramento',
    color: 'bg-red-600',
    isOpen: false,
    activities: [
      { id: 'c1', displayId: 'C1', text: 'Validar entregas com stakeholders', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'c2', displayId: 'C2', text: 'Obter aceite formal do sponsor', status: 'Not Started', weight: 3, predecessors: [] },
      { id: 'c3', displayId: 'C3', text: 'Registrar lições aprendidas', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'c4', displayId: 'C4', text: 'Consolidar documentação do projeto', status: 'Not Started', weight: 1, predecessors: [] },
      { id: 'c5', displayId: 'C5', text: 'Comunicar encerramento do projeto', status: 'Not Started', weight: 1, predecessors: [] },
    ]
  }
];

export default function GPPlanPMI({ onSave, initialData }: GPPlanPMIProps) {
  const [phases, setPhases] = useState<GPPhase[]>(initialData?.phases || INITIAL_PHASES);
  const [openPredecessorId, setOpenPredecessorId] = useState<string | null>(null);

  const allActivityIds = useMemo(() => {
    return phases.flatMap(p => p.activities.map(a => a.displayId));
  }, [phases]);

  const summary = useMemo(() => {
    const total = phases.reduce((acc, p) => acc + p.activities.length, 0);
    const totalWeight = phases.reduce((acc, p) => acc + p.activities.reduce((sum, a) => sum + a.weight, 0), 0);
    const completedWeight = phases.reduce((acc, p) => acc + p.activities.filter(a => a.status === 'Completed').reduce((sum, a) => sum + a.weight, 0), 0);
    
    const completed = phases.reduce((acc, p) => acc + p.activities.filter(a => a.status === 'Completed').length, 0);
    const inProgress = phases.reduce((acc, p) => acc + p.activities.filter(a => a.status === 'In Progress').length, 0);
    const pending = total - completed;
    const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    const phaseProgress = phases.map(p => {
      const pTotalWeight = p.activities.reduce((sum, a) => sum + a.weight, 0);
      const pCompletedWeight = p.activities.filter(a => a.status === 'Completed').reduce((sum, a) => sum + a.weight, 0);
      return {
        name: p.name,
        progress: pTotalWeight > 0 ? Math.round((pCompletedWeight / pTotalWeight) * 100) : 0
      };
    });

    return { total, completed, inProgress, pending, progress, phaseProgress };
  }, [phases]);

  const updateActivity = (phaseId: string, activityId: string, updates: Partial<GPActivity>) => {
    setPhases(prev => prev.map(p => {
      if (p.id !== phaseId) return p;
      return {
        ...p,
        activities: p.activities.map(a => a.id === activityId ? { ...a, ...updates } : a)
      };
    }));
  };

  const togglePhase = (phaseId: string) => {
    setPhases(prev => prev.map(p => p.id === phaseId ? { ...p, isOpen: !p.isOpen } : p));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            Plano do GP - PMI
          </h2>
          <p className="text-sm text-gray-500">Gestão das atividades do Gerente de Projeto ao longo do ciclo de vida.</p>
        </div>
        <button 
          onClick={() => onSave({ phases })}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <Save size={18} /> Salvar Plano
        </button>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Progresso Total</p>
            <p className="text-xl font-black text-gray-800">{summary.progress}%</p>
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
          <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Em Andamento</p>
            <p className="text-xl font-black text-gray-800">{summary.inProgress}</p>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
            <LayoutList size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Pendentes</p>
            <p className="text-xl font-black text-gray-800">{summary.pending}</p>
          </div>
        </div>
      </div>

      {/* Phase Progress Bars */}
      <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600" />
          Progresso por Fase
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {summary.phaseProgress.map((p, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-gray-500 truncate">{p.name}</span>
                <span className="text-blue-600">{p.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", phases[idx].color)}
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button 
              onClick={() => togglePhase(phase.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", phase.color)} />
                <h3 className="font-bold text-gray-800">{phase.name}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded">
                  {phase.activities.filter(a => a.status === 'Completed').length} / {phase.activities.length}
                </span>
              </div>
              {phase.isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
            </button>

            <AnimatePresence>
              {phase.isOpen && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-100 bg-gray-50/30 space-y-2">
                    <div className="grid grid-cols-[140px_40px_1fr_110px_110px_100px_70px_40px] gap-4 px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase">
                      <span>Status</span>
                      <span>ID</span>
                      <span>Atividade</span>
                      <span>Início</span>
                      <span>Fim</span>
                      <span>Pred.</span>
                      <span>Peso</span>
                      <span></span>
                    </div>
                    
                    {phase.activities.map((activity) => (
                      <div key={activity.id} className="grid grid-cols-[140px_40px_1fr_110px_110px_100px_70px_40px] gap-4 items-center bg-white p-3 rounded-lg border border-gray-100 group hover:border-blue-200 transition-all">
                        <select 
                          value={activity.status}
                          onChange={(e) => updateActivity(phase.id, activity.id, { status: e.target.value as any })}
                          className={cn(
                            "text-[10px] font-bold rounded-lg px-2 py-1.5 border-none focus:ring-0 w-full",
                            activity.status === 'Completed' ? "bg-green-100 text-green-700" :
                            activity.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                          )}
                        >
                          <option value="Not Started">Não Iniciado</option>
                          <option value="In Progress">Em Andamento</option>
                          <option value="Completed">Concluído</option>
                        </select>

                        <div className="text-xs font-black text-gray-400 text-center">
                          {activity.displayId}
                        </div>

                        <div className="flex flex-col">
                          <textarea 
                            value={activity.text}
                            onChange={(e) => updateActivity(phase.id, activity.id, { text: e.target.value })}
                            className={cn(
                              "text-sm font-medium bg-transparent border-none focus:ring-0 resize-none p-0 w-full h-full leading-tight whitespace-normal break-words",
                              activity.status === 'Completed' ? "text-gray-400 line-through" : "text-gray-700"
                            )}
                            rows={1}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                            style={{ height: 'auto', minHeight: '1.2em' }}
                          />
                          {activity.notes && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                              <MessageSquare size={10} /> {activity.notes}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input 
                            type="date"
                            value={activity.startDate || ''}
                            onChange={(e) => updateActivity(phase.id, activity.id, { startDate: e.target.value })}
                            className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-gray-50 border-none rounded-md focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="relative">
                          <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input 
                            type="date"
                            value={activity.endDate || ''}
                            onChange={(e) => updateActivity(phase.id, activity.id, { endDate: e.target.value })}
                            className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-gray-50 border-none rounded-md focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="relative">
                          <button 
                            onClick={() => setOpenPredecessorId(openPredecessorId === activity.id ? null : activity.id)}
                            className="w-full px-2 py-1.5 text-[10px] bg-gray-50 border border-gray-100 rounded-md hover:bg-gray-100 transition-colors text-left truncate min-h-[30px]"
                          >
                            {activity.predecessors.length > 0 ? activity.predecessors.join(', ') : 'Selecionar'}
                          </button>
                          
                          <AnimatePresence>
                            {openPredecessorId === activity.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setOpenPredecessorId(null)} 
                                />
                                <motion.div 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute left-0 top-full mt-1 w-48 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 space-y-1"
                                >
                                  {allActivityIds.filter(id => id !== activity.displayId).map(id => (
                                    <label key={id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                      <input 
                                        type="checkbox"
                                        checked={activity.predecessors.includes(id)}
                                        onChange={(e) => {
                                          const newPreds = e.target.checked 
                                            ? [...activity.predecessors, id]
                                            : activity.predecessors.filter(p => p !== id);
                                          updateActivity(phase.id, activity.id, { predecessors: newPreds });
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-xs font-bold text-gray-700">{id}</span>
                                    </label>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="relative">
                          <select 
                            value={activity.weight}
                            onChange={(e) => updateActivity(phase.id, activity.id, { weight: parseInt(e.target.value) as any })}
                            className="w-full px-2 py-1.5 text-[10px] bg-gray-50 border-none rounded-md focus:ring-1 focus:ring-blue-500 text-center font-bold appearance-none"
                          >
                            <option value={1}>1</option>
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                          </select>
                        </div>

                        <button 
                          onClick={() => {
                            const note = window.prompt("Adicionar nota:", activity.notes || "");
                            if (note !== null) updateActivity(phase.id, activity.id, { notes: note });
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Adicionar Nota"
                        >
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Best Practices / Tip */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 items-start">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Dica de Gestão</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            Este plano foca nas <strong>atividades do Gerente de Projeto</strong>. Enquanto a equipe executa as tarefas técnicas, você deve garantir que os processos de gestão (comunicação, riscos, stakeholders) estejam fluindo. Atividades marcadas como críticas ou em atraso devem ser sua prioridade imediata.
          </p>
        </div>
      </div>
    </div>
  );
}
