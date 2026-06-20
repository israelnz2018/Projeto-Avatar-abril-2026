import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, Info, Settings, Sparkles, X, Check, ShieldCheck, Loader2, Trash2, BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface PhaseTimeline {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
  baselineStartDate?: string;
  baselineEndDate?: string;
}

interface ProjectTimelineProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const DEFAULT_PHASES: PhaseTimeline[] = [
  { id: 'define', name: 'Definir', startDate: '', endDate: '', color: 'bg-blue-500' },
  { id: 'measure', name: 'Medir', startDate: '', endDate: '', color: 'bg-blue-500' },
  { id: 'analyze', name: 'Analisar', startDate: '', endDate: '', color: 'bg-blue-500' },
  { id: 'improve', name: 'Melhorar', startDate: '', endDate: '', color: 'bg-blue-500' },
  { id: 'control', name: 'Controlar', startDate: '', endDate: '', color: 'bg-blue-500' },
];

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Cada fase do DMAIC com datas de início/fim realistas e duração calculada.
const CRONOGRAMA_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    projeto: 'Redução do Tempo de Aprovação de Pedidos de Compra',
    inicio: '03/02/2026',
    fases: [
      { name: 'Definir',   inicio: '03/02/2026', fim: '18/02/2026', dias: 15 },
      { name: 'Medir',     inicio: '19/02/2026', fim: '20/03/2026', dias: 30 },
      { name: 'Analisar',  inicio: '23/03/2026', fim: '07/05/2026', dias: 45 },
      { name: 'Melhorar',  inicio: '08/05/2026', fim: '07/07/2026', dias: 60 },
      { name: 'Controlar', inicio: '08/07/2026', fim: '07/08/2026', dias: 30 },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    projeto: 'Redução de Refugo na Linha de Injeção Plástica',
    inicio: '06/01/2026',
    fases: [
      { name: 'Definir',   inicio: '06/01/2026', fim: '21/01/2026', dias: 15 },
      { name: 'Medir',     inicio: '22/01/2026', fim: '22/02/2026', dias: 30 },
      { name: 'Analisar',  inicio: '23/02/2026', fim: '08/04/2026', dias: 45 },
      { name: 'Melhorar',  inicio: '09/04/2026', fim: '08/06/2026', dias: 60 },
      { name: 'Controlar', inicio: '09/06/2026', fim: '09/07/2026', dias: 30 },
    ],
  },
];

export default function ProjectTimeline({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: ProjectTimelineProps) {
  const translatePhaseName = (name: string) => {
    const translations: Record<string, string> = {
      'Define': 'Definir',
      'Measure': 'Medir',
      'Analyze': 'Analisar',
      'Improve': 'Melhorar',
      'Control': 'Controlar'
    };
    return translations[name] || name;
  };

  const [projectStartDate, setProjectStartDate] = useState<string>(initialData?.projectStartDate || '');
  const [phases, setPhases] = useState<PhaseTimeline[]>(() => {
    const p = initialData?.phases || DEFAULT_PHASES;
    return p.map((f: any) => ({ ...f, name: translatePhaseName(f.name) }));
  });

  const isToolEmpty = !projectStartDate && phases.every(p => !p.startDate && !p.endDate);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  const [showRecommendationPrompt, setShowRecommendationPrompt] = useState(false);
  const [pendingStartDate, setPendingStartDate] = useState('');

  useEffect(() => {
    if (initialData?.phases) {
      setPhases(initialData.phases.map((p: any) => ({ ...p, name: translatePhaseName(p.name) })));
    }
    if (initialData?.projectStartDate) setProjectStartDate(initialData.projectStartDate);
  }, [initialData]);

  const handleStartDateChange = (date: string) => {
    setPendingStartDate(date);
    setShowRecommendationPrompt(true);
  };

  const applyRecommendation = () => {
    const start = new Date(pendingStartDate);
    if (isNaN(start.getTime())) return;

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const defineStart = new Date(start);
    const defineEnd = addDays(defineStart, 15);

    const measureStart = addDays(defineEnd, 1);
    const measureEnd = addDays(measureStart, 30);

    const analyzeStart = addDays(measureEnd, 1);
    const analyzeEnd = addDays(analyzeStart, 45);

    const improveStart = addDays(analyzeEnd, 1);
    const improveEnd = addDays(improveStart, 60);

    const controlStart = addDays(improveEnd, 1);
    const controlEnd = addDays(controlStart, 30);

    const newPhases = [
      { ...phases[0], startDate: formatDate(defineStart), endDate: formatDate(defineEnd) },
      { ...phases[1], startDate: formatDate(measureStart), endDate: formatDate(measureEnd) },
      { ...phases[2], startDate: formatDate(analyzeStart), endDate: formatDate(analyzeEnd) },
      { ...phases[3], startDate: formatDate(improveStart), endDate: formatDate(improveEnd) },
      { ...phases[4], startDate: formatDate(controlStart), endDate: formatDate(controlEnd) },
    ];

    setPhases(newPhases);
    setProjectStartDate(pendingStartDate);
    setShowRecommendationPrompt(false);
    toast.success("Cronograma recomendado aplicado com sucesso!");
  };

  const skipRecommendation = () => {
    setProjectStartDate(pendingStartDate);
    setShowRecommendationPrompt(false);
  };

  const updatePhase = (id: string, field: keyof PhaseTimeline, value: string) => {
    setPhases(phases.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSave = () => {
    if (!projectStartDate) {
      toast.error("Por favor, defina a data de início do projeto.");
      return;
    }
    onSave({ projectStartDate, phases });
  };

  // Generate 6 months of 15-day intervals starting from projectStartDate
  const timelineHeaders = useMemo(() => {
    if (!projectStartDate) return [];
    
    const start = new Date(projectStartDate);
    const headers = [];
    
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
      // Hardcoded English month names to ensure it follows the requested format regardless of browser locale
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthName = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
      
      headers.push({
        month: monthName,
        q1: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        q2: new Date(monthDate.getFullYear(), monthDate.getMonth(), 16),
        end: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      });
    }
    return headers;
  }, [projectStartDate]);

  const calculateBarPosition = (startDateStr: string, endDateStr: string) => {
    if (!projectStartDate || !startDateStr || !endDateStr) return { left: 0, width: 0, show: false };

    const projectStart = new Date(projectStartDate).getTime();
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();

    if (start > end || end < projectStart) return { left: 0, width: 0, show: false };

    // Total timeline duration is 182.5 days (approx 6 months)
    const totalDays = 182.5;
    const msPerDay = 1000 * 60 * 60 * 24;

    const startOffsetDays = (start - projectStart) / msPerDay;
    const durationDays = (end - start) / msPerDay;

    // Calculate percentages based on 12 columns (each column is roughly 15.2 days)
    // 100% width = 182.5 days
    const leftPercent = Math.max(0, (startOffsetDays / totalDays) * 100);
    const widthPercent = Math.min(100 - leftPercent, (durationDays / totalDays) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      show: true
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm overflow-hidden relative">
        <AnimatePresence>
          {showRecommendationPrompt && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <div className="max-w-md w-full bg-white border border-blue-200 rounded-xl shadow-2xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-gray-900">Recomendação de Cronograma</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Deseja que eu configure automaticamente as datas das fases do DMAIC com base na data de início selecionada? 
                    Isso criará um planejamento sugerido de aproximadamente 6 meses.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={skipRecommendation}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={18} /> Não, prefiro manual
                  </button>
                  <button
                    onClick={applyRecommendation}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Sim, aplicar sugestão
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 border-b border-[#eee] bg-gray-50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-[#1f2937] text-[1.1rem]">Cronograma do Projeto (Macro)</h3>
              <p className="text-xs text-[#666]">Planeje as datas de início e fim de cada fase do DMAIC.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExemplo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
            >
              <BookOpen size={14} /> Ver exemplo
            </button>

            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-700">Início do Projeto:</label>
              <input
                type="date"
                value={projectStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              data-save-trigger
              onClick={handleSave}
              className="hidden"
            >
              Save
            </button>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Timeline Header */}
            <div className="flex mb-4">
              <div className="w-[300px] shrink-0 font-bold text-sm text-gray-700 flex items-end pb-2 border-b-2 border-gray-200 uppercase tracking-widest">
                Fases do Projeto
              </div>
              <div className="flex-1 border-b-2 border-gray-200 flex">
                {timelineHeaders.length > 0 ? timelineHeaders.map((header, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center border-l border-gray-200 first:border-l-0">
                    <div className="text-xs font-bold text-gray-600 capitalize py-1">{header.month}</div>
                    <div className="flex w-full border-t border-gray-100">
                      <div className="flex-1 text-[10px] text-center text-gray-400 py-1 border-r border-gray-100">Q1</div>
                      <div className="flex-1 text-[10px] text-center text-gray-400 py-1">Q2</div>
                    </div>
                  </div>
                )) : (
                  <div className="w-full text-center text-sm text-gray-400 py-4">
                    Defina a data de início do projeto para visualizar o calendário (6 meses).
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Rows */}
            <div className="space-y-4 relative">
              {/* Grid Background */}
              {timelineHeaders.length > 0 && (
                <div className="absolute top-0 bottom-0 left-[300px] right-0 flex pointer-events-none">
                  {timelineHeaders.map((_, i) => (
                    <div key={i} className="flex-1 flex border-l border-gray-100 first:border-l-0">
                      <div className="flex-1 border-r border-gray-50"></div>
                      <div className="flex-1"></div>
                    </div>
                  ))}
                </div>
              )}

              {phases.map((phase) => {
                const barStyle = calculateBarPosition(phase.startDate, phase.endDate);
                
                return (
                  <div key={phase.id} className="flex items-center relative z-10 group">
                    <div className="w-[300px] shrink-0 flex items-center gap-4 pr-4 bg-white">
                      <div className="w-24 font-bold text-sm text-gray-700">{phase.name}</div>
                      <div className="flex gap-2 flex-1">
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] text-gray-500 mb-1">Início</label>
                          <input 
                            type="date" 
                            value={phase.startDate}
                            onChange={(e) => updatePhase(phase.id, 'startDate', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] text-gray-500 mb-1">Fim</label>
                          <input 
                            type="date" 
                            value={phase.endDate}
                            onChange={(e) => updatePhase(phase.id, 'endDate', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 relative h-10 bg-gray-50/50 flex items-center">
                      {barStyle.show && (
                        <div 
                          className={cn("absolute h-6 rounded-sm shadow-sm transition-all duration-300 flex items-center px-3 overflow-hidden", phase.color)}
                          style={{ left: barStyle.left, width: barStyle.width }}
                        >
                          <span className="text-white text-[9px] font-bold truncate uppercase tracking-tighter">
                            {phase.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-100 rounded-[8px] flex gap-4 items-start">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-blue-600">
          <Info size={20} />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 text-sm mb-1">Como usar o Cronograma</h4>
          <p className="text-[12px] text-blue-800 leading-relaxed">
            1. Primeiro, defina a <strong>Data de Início do Projeto</strong> no topo. O calendário exibirá 6 meses a partir dessa data, divididos em quinzenas (Q1 e Q2).<br/>
            2. Para cada fase do DMAIC, preencha as datas de <strong>Início</strong> e <strong>Fim</strong>.<br/>
            3. A barra colorida será desenhada automaticamente na linha do tempo correspondente ao período selecionado.
          </p>
        </div>
      </div>

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Cronograma Macro</h3>
                  <p className="text-xs text-gray-500 m-0">{CRONOGRAMA_EXEMPLOS[exemploIdx].projeto}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemplo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Abas — Escritório / Manufatura */}
            <div className="flex gap-2 px-6 pt-4">
              {CRONOGRAMA_EXEMPLOS.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setExemploIdx(i)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                    exemploIdx === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="mb-4 text-xs text-gray-500">
                Início do projeto: <strong className="text-gray-700">{CRONOGRAMA_EXEMPLOS[exemploIdx].inicio}</strong>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-[12px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600">Fase</th>
                      <th className="text-left p-3 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600">Início</th>
                      <th className="text-left p-3 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600">Fim</th>
                      <th className="text-left p-3 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CRONOGRAMA_EXEMPLOS[exemploIdx].fases.map((f, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                            <span className="font-bold text-gray-800">{f.name}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono text-gray-700">{f.inicio}</td>
                        <td className="p-3 font-mono text-gray-700">{f.fim}</td>
                        <td className="p-3 text-gray-600">{f.dias} dias</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Este exemplo é só pra consulta — não altera os seus dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
