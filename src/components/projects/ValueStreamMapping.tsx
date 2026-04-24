import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  Package, 
  TrendingUp,
  Info,
  ArrowRight,
  Target,
  BarChart3,
  Lightbulb,
  ArrowDownToLine
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface VSMStep {
  id: string;
  name: string;
  description: string;
  input: string;
  output: string;
  cycleTime: number;
  waitingTime: number;
  peopleCount: number;
  resources: string;
  volume: number;
  reworkRate: number; // % of rework
}

interface VSMTargets {
  targetTotalTime: number;
  idealPeople: number;
  expectedResources: string;
  desiredProductivity: string;
  availableTimePerDay: number; // in minutes
}

interface ValueStreamMappingProps {
  onSave: (data: any) => void;
  initialData?: any;
}

export default function ValueStreamMapping({ onSave, initialData }: ValueStreamMappingProps) {
  const [steps, setSteps] = useState<VSMStep[]>(initialData?.steps || [
    { 
      id: '1', 
      name: 'Entrada de Pedido', 
      description: 'Recebimento e triagem inicial', 
      input: 'Pedido do Cliente', 
      output: 'Pedido Registrado', 
      cycleTime: 10, 
      waitingTime: 5, 
      peopleCount: 1, 
      resources: 'Computador', 
      volume: 100,
      reworkRate: 5
    }
  ]);

  const [targets, setTargets] = useState<VSMTargets>(initialData?.targets || {
    targetTotalTime: 60,
    idealPeople: 5,
    expectedResources: '',
    desiredProductivity: '95%',
    availableTimePerDay: 480 // 8 hours
  });

  useEffect(() => {
    if (initialData?.steps) {
      setSteps(initialData.steps);
    }
    if (initialData?.targets) {
      setTargets(initialData.targets);
    }
  }, [initialData]);

  const [view, setView] = useState<'edit' | 'analysis'>('edit');

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        name: '', 
        description: '', 
        input: '', 
        output: '', 
        cycleTime: 0, 
        waitingTime: 0, 
        peopleCount: 1, 
        resources: '', 
        volume: 0,
        reworkRate: 0
      }
    ]);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<VSMStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Analysis Logic
  const analysis = useMemo(() => {
    const totalCycleTime = steps.reduce((sum, s) => sum + s.cycleTime, 0);
    const totalWaitingTime = steps.reduce((sum, s) => sum + s.waitingTime, 0);
    const totalLeadTime = totalCycleTime + totalWaitingTime;
    const totalPeople = steps.reduce((sum, s) => sum + s.peopleCount, 0);
    const avgRework = steps.reduce((sum, s) => sum + s.reworkRate, 0) / (steps.length || 1);

    // Bottlenecks
    const maxCycleTime = Math.max(...steps.map(s => s.cycleTime));
    const bottleneckStep = steps.find(s => s.cycleTime === maxCycleTime);
    
    const maxWaitingTime = Math.max(...steps.map(s => s.waitingTime));
    const waitingBottleneck = steps.find(s => s.waitingTime === maxWaitingTime);

    // Waste identification
    const wastes = [];
    if (totalWaitingTime > totalCycleTime) {
      wastes.push({ type: 'Espera', detail: 'Tempo de espera superior ao tempo de processamento.' });
    }
    steps.forEach(s => {
      if (s.reworkRate > 10) {
        wastes.push({ type: 'Retrabalho', detail: `Alta taxa de retrabalho na etapa ${s.name} (${s.reworkRate}%).` });
      }
      if (s.peopleCount > targets.idealPeople / steps.length * 1.5) {
        wastes.push({ type: 'Excesso de Recursos', detail: `Muitas pessoas alocadas na etapa ${s.name}.` });
      }
    });

    // Capacity Analysis
    const capacityAnalysis = steps.map(s => ({
      name: s.name,
      capacity: s.cycleTime > 0 ? (targets.availableTimePerDay / s.cycleTime) : 0,
      isBottleneck: s.cycleTime === maxCycleTime
    }));

    return {
      totalCycleTime,
      totalWaitingTime,
      totalLeadTime,
      totalPeople,
      avgRework,
      bottleneckStep,
      waitingBottleneck,
      wastes,
      capacityAnalysis
    };
  }, [steps, targets]);

  const handleSave = () => {
    onSave({ steps, targets, analysis });
  };

  if (view === 'analysis') {
    return (
      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between border-b border-[#eee] pb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#3b82f6]" size={24} />
            <h2 className="text-[1.25rem] font-bold text-[#333]">Análise do Fluxo de Valor</h2>
          </div>
          <button 
            onClick={() => setView('edit')}
            className="text-[13px] font-bold text-[#3b82f6] hover:underline bg-transparent border-none cursor-pointer"
          >
            Voltar para Edição
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-blue-50 rounded-[8px] border border-blue-100">
            <p className="text-[11px] font-bold text-blue-600 uppercase mb-1">Lead Time Total</p>
            <h3 className="text-[2rem] font-bold text-blue-900">{analysis.totalLeadTime} <span className="text-[14px]">min</span></h3>
            <p className="text-[12px] text-blue-700 mt-2">Meta: {targets.targetTotalTime} min</p>
          </div>
          <div className="p-6 bg-red-50 rounded-[8px] border border-red-100">
            <p className="text-[11px] font-bold text-red-600 uppercase mb-1">Maior Gargalo (Ciclo)</p>
            <h3 className="text-[1.2rem] font-bold text-red-900">{analysis.bottleneckStep?.name || 'N/A'}</h3>
            <p className="text-[12px] text-red-700 mt-2">{analysis.bottleneckStep?.cycleTime} min de execução</p>
          </div>
          <div className="p-6 bg-orange-50 rounded-[8px] border border-orange-100">
            <p className="text-[11px] font-bold text-orange-600 uppercase mb-1">Maior Espera</p>
            <h3 className="text-[1.2rem] font-bold text-orange-900">{analysis.waitingBottleneck?.name || 'N/A'}</h3>
            <p className="text-[12px] text-orange-700 mt-2">{analysis.waitingBottleneck?.waitingTime} min parado</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Timeline Visualization */}
          <div className="bg-white border border-[#eee] rounded-[8px] overflow-hidden">
            <div className="bg-[#f8fafc] p-4 border-b border-[#eee] flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={18} />
              <h4 className="font-bold text-[14px]">Linha do Tempo do Processo (Lead Time Ladder)</h4>
            </div>
            <div className="p-8">
              <div className="flex items-end h-32 w-full gap-1">
                {steps.map((step, i) => (
                  <React.Fragment key={step.id}>
                    {/* Waiting Time (Down) */}
                    <div className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full bg-orange-100 border-x border-orange-200 h-8 flex items-center justify-center text-[10px] font-bold text-orange-600">
                        {step.waitingTime}m
                      </div>
                      <div className="w-[1px] h-4 bg-gray-300" />
                      {/* Cycle Time (Up) */}
                      <div 
                        className="w-full bg-blue-500 border-x border-blue-600 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ height: `${Math.max(20, (step.cycleTime / analysis.totalCycleTime) * 80)}px` }}
                      >
                        {step.cycleTime}m
                      </div>
                      <div className="absolute -bottom-6 text-[9px] font-bold text-gray-500 truncate w-full text-center">
                        {step.name}
                      </div>
                    </div>
                    {i < steps.length - 1 && <div className="w-4 h-[1px] bg-gray-300 self-center mb-4" />}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-12 flex justify-between text-[11px] font-bold text-gray-400 uppercase border-t border-dashed border-gray-200 pt-4">
                <span>Início do Processo</span>
                <div className="flex gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500" /> <span>Tempo de Ciclo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-200" /> <span>Tempo de Espera</span>
                  </div>
                </div>
                <span>Fim do Processo</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#eee] rounded-[8px] overflow-hidden">
            <div className="bg-[#f8fafc] p-4 border-b border-[#eee] flex items-center gap-2">
              <Lightbulb className="text-yellow-500" size={18} />
              <h4 className="font-bold text-[14px]">Recomendações Práticas</h4>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h5 className="font-bold text-[14px] text-red-900">Eliminação de Gargalos</h5>
                  <p className="text-[13px] text-gray-600">
                    A etapa "{analysis.bottleneckStep?.name}" é o seu limitador de velocidade. Considere redistribuir tarefas ou 
                    aumentar a automação nesta etapa específica para equilibrar o fluxo.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <h5 className="font-bold text-[14px] text-blue-900">Redução de Tempo de Ciclo</h5>
                  <p className="text-[13px] text-gray-600">
                    O tempo de espera representa {((analysis.totalWaitingTime / analysis.totalLeadTime) * 100).toFixed(1)}% do seu processo. 
                    Foque em reduzir as filas entre "{analysis.waitingBottleneck?.name}" e a etapa seguinte.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <h5 className="font-bold text-[14px] text-green-900">Otimização de Recursos</h5>
                  <p className="text-[13px] text-gray-600">
                    Você está usando {analysis.totalPeople} pessoas. O ideal seria {targets.idealPeople}. 
                    Verifique se há excesso de mão de obra em etapas com baixo volume de processamento.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#eee] rounded-[8px] overflow-hidden">
            <div className="bg-[#f8fafc] p-4 border-b border-[#eee] flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} />
              <h4 className="font-bold text-[14px]">Desperdícios Identificados (Muda)</h4>
            </div>
            <div className="p-6">
              {analysis.wastes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.wastes.map((waste, i) => (
                    <div key={i} className="p-4 bg-red-50 border border-red-100 rounded-[6px] flex gap-3">
                      <div className="w-6 h-6 bg-red-200 text-red-700 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold">
                        !
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-red-900 uppercase">{waste.type}</p>
                        <p className="text-[13px] text-red-700">{waste.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-[13px]">
                  Nenhum desperdício crítico identificado automaticamente.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#eee] rounded-[8px] overflow-hidden">
            <div className="bg-[#f8fafc] p-4 border-b border-[#eee] flex items-center gap-2">
              <Package className="text-purple-500" size={18} />
              <h4 className="font-bold text-[14px]">Análise de Capacidade</h4>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analysis.capacityAnalysis.map((cap, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="font-medium text-gray-700">{cap.name}</span>
                      <span className="font-bold text-gray-900">{cap.capacity.toFixed(0)} unid/dia</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          cap.isBottleneck ? "bg-red-500" : "bg-purple-500"
                        )}
                        style={{ width: `${Math.min(100, (cap.capacity / Math.max(...analysis.capacityAnalysis.map(c => c.capacity))) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-gray-500 italic mt-4">
                  * Capacidade calculada com base em {targets.availableTimePerDay} min de tempo disponível por dia.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#eee] rounded-[8px] overflow-hidden">
            <div className="bg-[#f8fafc] p-4 border-b border-[#eee] flex items-center gap-2">
              <TrendingUp className="text-green-500" size={18} />
              <h4 className="font-bold text-[14px]">Comparação com Metas</h4>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 font-bold uppercase mb-2">Lead Time</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn("font-bold text-[18px]", analysis.totalLeadTime <= targets.targetTotalTime ? "text-green-600" : "text-red-600")}>
                      {analysis.totalLeadTime}
                    </span>
                    <ArrowRight size={14} className="text-gray-300" />
                    <span className="font-bold text-[18px] text-gray-800">{targets.targetTotalTime}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 font-bold uppercase mb-2">Pessoas</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn("font-bold text-[18px]", analysis.totalPeople <= targets.idealPeople ? "text-green-600" : "text-orange-600")}>
                      {analysis.totalPeople}
                    </span>
                    <ArrowRight size={14} className="text-gray-300" />
                    <span className="font-bold text-[18px] text-gray-800">{targets.idealPeople}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 font-bold uppercase mb-2">Produtividade</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-bold text-[18px] text-blue-600">Atual</span>
                    <ArrowRight size={14} className="text-gray-300" />
                    <span className="font-bold text-[18px] text-gray-800">{targets.desiredProductivity}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 font-bold uppercase mb-2">Status Geral</p>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-bold uppercase",
                    analysis.totalLeadTime <= targets.targetTotalTime ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {analysis.totalLeadTime <= targets.targetTotalTime ? "Dentro da Meta" : "Ajuste Necessário"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-[#eee]">
          <button
            onClick={handleSave}
            className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer"
          >
            <CheckCircle2 size={18} className="mr-2" />
            Finalizar e Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-10">
      <div className="flex items-center justify-between border-b border-[#eee] pb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-[#3b82f6]" size={24} />
          <h2 className="text-[1.25rem] font-bold text-[#333]">Mapeamento de Valor (VSM) - Estado Atual</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView('analysis')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-[4px] text-[13px] font-bold hover:bg-blue-100 transition-all border border-blue-100 cursor-pointer"
          >
            <BarChart3 size={16} /> Ver Análise
          </button>
        </div>
      </div>

      {/* Targets Section */}
      <div className="bg-[#f8fafc] p-6 rounded-[8px] border border-[#e2e8f0] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="text-[#1e40af]" size={18} />
          <h3 className="font-bold text-[14px] text-[#1e40af] uppercase tracking-wider">Definição de Metas (Targets)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#666] uppercase">Tempo Alvo Total (min)</label>
            <input
              type="number"
              value={targets.targetTotalTime}
              onChange={(e) => setTargets(prev => ({ ...prev, targetTotalTime: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#666] uppercase">Nº Ideal de Pessoas</label>
            <input
              type="number"
              value={targets.idealPeople}
              onChange={(e) => setTargets(prev => ({ ...prev, idealPeople: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#666] uppercase">Uso de Recursos Esperado</label>
            <input
              type="text"
              value={targets.expectedResources}
              onChange={(e) => setTargets(prev => ({ ...prev, expectedResources: e.target.value }))}
              placeholder="Ex: 100% digital"
              className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#666] uppercase">Produtividade Desejada</label>
            <input
              type="text"
              value={targets.desiredProductivity}
              onChange={(e) => setTargets(prev => ({ ...prev, desiredProductivity: e.target.value }))}
              placeholder="Ex: 90%"
              className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#666] uppercase">Tempo Disponível (min/dia)</label>
            <input
              type="number"
              value={targets.availableTimePerDay}
              onChange={(e) => setTargets(prev => ({ ...prev, availableTimePerDay: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="text-[#1f2937]" size={18} />
          <h3 className="font-bold text-[14px] text-[#1f2937] uppercase tracking-wider">Fluxo de Etapas (End-to-End)</h3>
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={step.id} className="relative group">
              {idx > 0 && (
                <div className="absolute -top-6 left-6 flex flex-col items-center gap-1">
                  <div className="w-[2px] h-6 bg-gray-200" />
                </div>
              )}
              
              <div className={cn(
                "p-6 rounded-[8px] border transition-all space-y-6",
                step.cycleTime > 30 ? "border-red-200 bg-red-50/30" : "bg-white border-[#eee] hover:border-[#ccc]"
              )}>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#1f2937] text-white rounded-full flex items-center justify-center font-bold text-[14px] shrink-0">
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#666] uppercase">Nome da Etapa</label>
                        {step.cycleTime === Math.max(...steps.map(s => s.cycleTime)) && step.cycleTime > 0 && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                            <AlertTriangle size={10} /> Gargalo
                          </span>
                        )}
                        {step.waitingTime > step.cycleTime && step.waitingTime > 0 && (
                          <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                            <Clock size={10} /> Espera Alta
                          </span>
                        )}
                      </div>
                      <textarea
                        value={step.name}
                        onChange={(e) => updateStep(step.id, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] font-bold focus:outline-none focus:border-[#3b82f6] resize-none bg-transparent whitespace-normal break-words"
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-[#666] uppercase">Descrição Breve</label>
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(step.id, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#3b82f6] resize-none bg-transparent whitespace-normal break-words"
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeStep(step.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-all border-none bg-transparent cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pl-12">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase">Entrada (Input)</label>
                    <textarea
                      value={step.input}
                      onChange={(e) => updateStep(step.id, { input: e.target.value })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6] resize-none overflow-hidden bg-transparent"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase">Saída (Output)</label>
                    <textarea
                      value={step.output}
                      onChange={(e) => updateStep(step.id, { output: e.target.value })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6] resize-none overflow-hidden bg-transparent"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                      <Clock size={12} /> Ciclo (min)
                    </label>
                    <input
                      type="number"
                      value={step.cycleTime}
                      onChange={(e) => updateStep(step.id, { cycleTime: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                      <Clock size={12} /> Espera (min)
                    </label>
                    <input
                      type="number"
                      value={step.waitingTime}
                      onChange={(e) => updateStep(step.id, { waitingTime: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-12">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                      <Users size={12} /> Pessoas Envolvidas
                    </label>
                    <input
                      type="number"
                      value={step.peopleCount}
                      onChange={(e) => updateStep(step.id, { peopleCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                      <Package size={12} /> Materiais/Recursos
                    </label>
                    <input
                      type="text"
                      value={step.resources}
                      onChange={(e) => updateStep(step.id, { resources: e.target.value })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase">Volume Processado</label>
                    <input
                      type="number"
                      value={step.volume}
                      onChange={(e) => updateStep(step.id, { volume: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#666] uppercase">Taxa de Retrabalho (%)</label>
                    <input
                      type="number"
                      value={step.reworkRate}
                      onChange={(e) => updateStep(step.id, { reworkRate: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#eee] rounded-[4px] text-[13px] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="w-full py-6 border-2 border-dashed border-[#ccc] rounded-[8px] text-[#666] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-all flex items-center justify-center font-bold bg-transparent cursor-pointer"
        >
          <Plus size={20} className="mr-2" /> Adicionar Próxima Etapa
        </button>
      </div>

      <div className="flex justify-end pt-6 border-t border-[#eee] gap-4">
        <button
          onClick={() => setView('analysis')}
          className="px-8 py-3 rounded-[4px] font-bold text-[#3b82f6] hover:bg-blue-50 transition-all border border-[#3b82f6] bg-transparent cursor-pointer"
        >
          Gerar Análise Automática
        </button>
        <button
          onClick={handleSave}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar e Avançar
        </button>
      </div>
    </div>
  );
}
