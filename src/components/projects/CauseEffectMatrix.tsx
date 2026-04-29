import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, Info, Plus, Trash2, HelpCircle, BarChart2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LabelList, ReferenceLine, ReferenceArea,
  ComposedChart, Bar, Line, Cell
} from 'recharts';

interface CauseEffectMatrixProps {
  onSave: (data: any) => void;
  initialData?: any;
  title?: string;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function CauseEffectMatrix({ onSave, initialData, title = "Matriz de Causa e Efeito", onGenerateAI, isGeneratingAI, onClearAIData }: CauseEffectMatrixProps) {
  const d = initialData?.toolData || initialData;
  const [outputs, setOutputs] = useState<any[]>(d?.outputs || [
    { name: 'Produtividade', importance: 10 },
    { name: 'Defeitos', importance: 8 },
  ]);
  
  const [causes, setCauses] = useState<any[]>(d?.causes || []);
  const isToolEmpty = causes.length === 0;
  const [view, setView] = useState<'matrix' | 'scatter' | 'pareto'>('matrix');
  const [colWidths, setColWidths] = useState<Record<string, number>>(d?.colWidths || {
    id: 60,
    name: 300,
    outputs: 120,
    total: 80,
    effortLabel: 120,
    effortScore: 80
  });

  const resizingCol = useRef<{ key: string, startX: number, startWidth: number, index?: number } | null>(null);

  const onResizeMouseDown = (key: string, e: React.MouseEvent, index?: number) => {
    e.preventDefault();
    const startWidth = key === 'output' && index !== undefined 
      ? (colWidths[`output_${index}`] || colWidths.outputs) 
      : colWidths[key];
    
    resizingCol.current = { key, startX: e.clientX, startWidth, index };
    document.addEventListener('mousemove', onResizeMouseMove);
    document.addEventListener('mouseup', onResizeMouseUp);
  };

  const onResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { key, startX, startWidth, index } = resizingCol.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(40, startWidth + delta);
    
    setColWidths(prev => ({
      ...prev,
      [index !== undefined ? `output_${index}` : key]: newWidth
    }));
  }, []);

  const onResizeMouseUp = useCallback(() => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', onResizeMouseMove);
    document.removeEventListener('mouseup', onResizeMouseUp);
  }, [onResizeMouseMove]);

  // Auto-resize textareas when causes or view change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [causes, view]);

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.outputs) {
        setOutputs(data.outputs);
      }
      if (data.colWidths) {
        setColWidths(data.colWidths);
      }
      if (data.causes) {
        // Ensure all causes have a selected property
        const causesWithSelected = data.causes.map((c: any) => ({
          ...c,
          selected: c.selected || false
        }));
        setCauses(causesWithSelected);
      }
    }
  }, [initialData]);

  const updateScore = (causeIdx: number, outputIdx: number, value: number) => {
    setCauses(prev => {
      const newCauses = [...prev];
      newCauses[causeIdx].scores[outputIdx] = value;
      return newCauses;
    });
  };

  const updateEffort = (causeIdx: number, value: number) => {
    setCauses(prev => {
      const newCauses = [...prev];
      newCauses[causeIdx].effort = value;
      return newCauses;
    });
  };

  const toggleSelection = (causeIdx: number) => {
    setCauses(prev => {
      const newCauses = [...prev];
      newCauses[causeIdx] = { 
        ...newCauses[causeIdx], 
        selected: !newCauses[causeIdx].selected 
      };
      return newCauses;
    });
  };

  const updateImportance = (outputIdx: number, value: number) => {
    setOutputs(prev => {
      const newOutputs = [...prev];
      newOutputs[outputIdx].importance = value;
      return newOutputs;
    });
  };

  const addCause = () => {
    setCauses(prev => [
      ...prev, 
      { 
        id: `X${String(prev.length + 1).padStart(2, '0')}`, 
        name: '', 
        scores: new Array(outputs.length).fill(0),
        effort: 1,
        selected: false
      }
    ]);
  };

  const addOutput = () => {
    const newName = `Y${outputs.length + 1}`;
    setOutputs(prev => [...prev, { name: newName, importance: 5 }]);
    setCauses(prev => prev.map(c => ({ ...c, scores: [...c.scores, 0] })));
  };

  const removeOutput = (idx: number) => {
    if (outputs.length <= 1) return;
    setOutputs(prev => prev.filter((_, i) => i !== idx));
    setCauses(prev => prev.map(c => ({
      ...c,
      scores: c.scores.filter((_, i) => i !== idx)
    })));
  };

  const removeCause = (idx: number) => {
    setCauses(prev => prev.filter((_, i) => i !== idx));
  };

  const calculateTotal = (cause: any) => {
    return cause.scores.reduce((acc: number, score: number, idx: number) => {
      return acc + (score * (outputs[idx]?.importance || 0));
    }, 0);
  };

  const getEffortLabel = (score: number) => {
    return score >= 5 ? 'Alto' : 'Baixo';
  };

  const chartData = causes.map(c => ({
    name: c.id,
    fullName: c.name,
    impact: calculateTotal(c),
    effort: c.effort,
    selected: c.selected
  }));

  const maxImpact = Math.max(...chartData.map(d => d.impact), 100);
  const avgImpact = maxImpact / 2;
  const avgEffort = 4.5;

  // Pareto Data
  const paretoData = [...chartData]
    .sort((a, b) => b.impact - a.impact)
    .map((d, i, arr) => {
      const totalImpactSum = arr.reduce((sum, item) => sum + item.impact, 0);
      const cumulativeSum = arr.slice(0, i + 1).reduce((sum, item) => sum + item.impact, 0);
      return {
        ...d,
        cumulativePercentage: totalImpactSum > 0 ? (cumulativeSum / totalImpactSum) * 100 : 0
      };
    });

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
                  Gerar Matriz Causa e Efeito com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Espinha de Peixe e Project Charter" para gerar
                Matriz Causa e Efeito técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir
                um cruzamento rigoroso e técnico.
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

      <div className="bg-white border border-[#ccc] rounded-[4px] shadow-sm overflow-hidden">
      {/* Header matching image style */}
      <div className="bg-[#f0f4f8] border-b border-[#ccc] p-6 text-center">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[#003366] font-bold text-[24px]">L&W</div>
          <div className="text-[#003366] font-bold text-[20px] uppercase tracking-wider">ANALISAR / MEDIR</div>
          <div className="w-[60px]"></div>
        </div>
        <h2 className="text-[28px] font-bold text-[#003366] whitespace-pre-wrap max-w-4xl mx-auto">{title}</h2>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button 
              onClick={() => setView('matrix')}
              className={cn(
                "px-4 py-2 rounded-[4px] text-[12px] font-bold transition-all border cursor-pointer",
                view === 'matrix' ? "bg-[#1f2937] text-white border-[#1f2937]" : "bg-white text-[#666] border-[#ccc]"
              )}
            >
              Tabela Matriz
            </button>
            <button 
              onClick={() => setView('scatter')}
              className={cn(
                "px-4 py-2 rounded-[4px] text-[12px] font-bold transition-all border cursor-pointer flex items-center gap-2",
                view === 'scatter' ? "bg-[#1f2937] text-white border-[#1f2937]" : "bg-white text-[#666] border-[#ccc]"
              )}
            >
              <BarChart2 size={14} /> Esforço x Impacto
            </button>
            <button 
              onClick={() => setView('pareto')}
              className={cn(
                "px-4 py-2 rounded-[4px] text-[12px] font-bold transition-all border cursor-pointer flex items-center gap-2",
                view === 'pareto' ? "bg-[#1f2937] text-white border-[#1f2937]" : "bg-white text-[#666] border-[#ccc]"
              )}
            >
              <BarChart2 size={14} /> Pareto de Priorização
            </button>
          </div>
        </div>

        {view === 'matrix' && (
          <>
            {/* Legend */}
            <div className="grid grid-cols-4 gap-1 text-center text-[11px] font-bold uppercase">
              <div className="bg-[#e1f5fe] p-2 border border-[#b3e5fc] text-[#01579b]">10 - 9 - 8: Forte Correlação</div>
              <div className="bg-[#e8f5e9] p-2 border border-[#c8e6c9] text-[#2e7d32]">7 - 6 - 5 - 4: Média Correlação</div>
              <div className="bg-[#fff3e0] p-2 border border-[#ffe0b2] text-[#ef6c00]">3 - 2 - 1: Baixa Correlação</div>
              <div className="bg-[#fafafa] p-2 border border-[#eee] text-[#999]">0: Não há correlação</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[#ccc] tool-table" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-[#f5f5f5]">
                    <th 
                      className="border border-[#ccc] p-3 text-[12px] font-bold text-[#333] whitespace-normal break-words relative group"
                      style={{ width: colWidths.id }}
                    >
                      ID
                      <div 
                        onMouseDown={(e) => onResizeMouseDown('id', e)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-200/50 transition-colors z-20"
                      />
                    </th>
                    <th 
                      className="border border-[#ccc] p-3 text-[12px] font-bold text-[#333] whitespace-normal break-words relative group"
                      style={{ width: colWidths.name }}
                    >
                      X's do Processo (Entradas)
                      <div 
                        onMouseDown={(e) => onResizeMouseDown('name', e)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-200/50 transition-colors z-20"
                      />
                    </th>
                    {outputs.map((y, i) => (
                      <th 
                        key={i} 
                        className="border border-[#ccc] p-0 relative group whitespace-normal break-words"
                        style={{ width: colWidths[`output_${i}`] || colWidths.outputs }}
                      >
                        <div 
                          onMouseDown={(e) => onResizeMouseDown('output', e, i)}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-200/50 transition-colors z-20"
                        />
                        <button 
                          onClick={() => removeOutput(i)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                          title="Remover indicador"
                        >
                          <Trash2 size={10} />
                        </button>
                        <div className="p-2 border-b border-[#ccc] bg-[#e3f2fd]">
                          <textarea 
                            value={y.name}
                            onChange={(e) => {
                              const newOutputs = [...outputs];
                              newOutputs[i].name = e.target.value;
                              setOutputs(newOutputs);
                              // Auto resize
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            rows={1}
                            className="w-full text-center bg-transparent font-bold text-[10px] uppercase focus:outline-none resize-none overflow-hidden leading-tight"
                            style={{ 
                              minHeight: '32px',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                          />
                        </div>
                        <div className="p-2 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-[#999] uppercase">Importância</span>
                          <input 
                            type="number"
                            min="1"
                            max="10"
                            value={y.importance}
                            onChange={(e) => updateImportance(i, parseInt(e.target.value) || 0)}
                            className="w-12 text-center border border-[#eee] rounded-[2px] text-[12px] font-bold text-[#003366]"
                          />
                        </div>
                      </th>
                    ))}
                    <th 
                      className="border border-[#ccc] p-3 text-[12px] font-bold text-[#003366] bg-[#e8f5e9] whitespace-normal break-words relative group"
                      style={{ width: colWidths.total }}
                    >
                      TOTAL
                      <div 
                        onMouseDown={(e) => onResizeMouseDown('total', e)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-200/50 transition-colors z-20"
                      />
                    </th>
                    <th 
                      className="border border-[#ccc] p-3 text-[12px] font-bold text-[#333] whitespace-normal break-words relative group"
                      style={{ width: colWidths.effortLabel }}
                    >
                      Esforço de Eliminação
                      <div 
                        onMouseDown={(e) => onResizeMouseDown('effortLabel', e)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-200/50 transition-colors z-20"
                      />
                    </th>
                    <th 
                      className="border border-[#ccc] p-3 text-[12px] font-bold text-[#333] whitespace-normal break-words relative group"
                      style={{ width: colWidths.effortScore }}
                    >
                      Score (1-8)
                      <div 
                        onMouseDown={(e) => onResizeMouseDown('effortScore', e)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-200/50 transition-colors z-20"
                      />
                    </th>
                    <th className="border border-[#ccc] p-3 w-[40px] whitespace-normal break-words"></th>
                  </tr>
                </thead>
                <tbody>
                  {causes.map((cause, cIdx) => (
                    <tr key={cIdx} className="hover:bg-[#f9f9f9]" style={{ minHeight: '52px' }}>
                      <td className="border border-[#ccc] p-3 text-center text-[12px] font-mono text-[#999] whitespace-normal break-words align-top">{cause.id}</td>
                      <td className="border border-[#ccc] p-3 whitespace-normal break-words align-top">
                        <textarea
                          value={cause.name || ''}
                          onChange={(e) => {
                            setCauses(prev => prev.map((c, i) =>
                              i === cIdx ? { ...c, name: e.target.value } : c
                            ));
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                        />
                      </td>
                      {outputs.map((_, yIdx) => (
                        <td key={yIdx} className="border border-[#ccc] p-3 text-center whitespace-normal break-words align-top">
                          <select
                            value={cause.scores[yIdx]}
                            onChange={(e) => updateScore(cIdx, yIdx, parseInt(e.target.value))}
                            className={cn(
                              "bg-transparent border border-[#eee] rounded-[4px] px-2 py-1 text-[12px] font-bold focus:outline-none",
                              cause.scores[yIdx] >= 8 ? "text-blue-600" : 
                              cause.scores[yIdx] >= 4 ? "text-green-600" : 
                              cause.scores[yIdx] >= 1 ? "text-orange-600" : "text-gray-400"
                            )}
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                      ))}
                      <td className="border border-[#ccc] p-3 text-center font-bold text-[#003366] bg-[#e8f5e9] text-[15px] whitespace-normal break-words align-top">
                        {calculateTotal(cause)}
                      </td>
                      <td className="border border-[#ccc] p-3 text-center">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-1 rounded-[2px]",
                          cause.effort >= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        )}>
                          {getEffortLabel(cause.effort)}
                        </span>
                      </td>
                      <td className="border border-[#ccc] p-3 text-center">
                        <input 
                          type="number"
                          min="1"
                          max="8"
                          value={cause.effort}
                          onChange={(e) => updateEffort(cIdx, parseInt(e.target.value) || 1)}
                          className="w-12 text-center border border-[#eee] rounded-[2px] text-[12px] font-bold"
                        />
                      </td>
                      <td className="border border-[#ccc] p-3 text-center">
                        <button
                          onClick={() => removeCause(cIdx)}
                          className="p-1 text-red-400 hover:text-red-600 transition-all border-none bg-transparent cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4">
              <button
                onClick={addCause}
                className="flex items-center px-4 py-2 bg-[#1f2937] text-white text-[12px] font-bold rounded-[4px] hover:bg-gray-800 transition-all border-none cursor-pointer"
              >
                <Plus size={16} className="mr-2" /> Adicionar Variável (X)
              </button>
              <button
                onClick={addOutput}
                className="flex items-center px-4 py-2 bg-white text-[#1f2937] border border-[#ccc] text-[12px] font-bold rounded-[4px] hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Plus size={16} className="mr-2" /> Adicionar Indicador (Y)
              </button>
            </div>
          </>
        )}

        {view === 'scatter' && (
          <div className="space-y-8">
            <div className="h-[500px] w-full bg-white p-4 border border-[#eee] rounded-[8px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="effort" 
                    name="Esforço" 
                    domain={[0, 9]} 
                    label={{ value: 'Esforço (Baixo → Alto)', position: 'bottom', offset: 0 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="impact" 
                    name="Impacto" 
                    domain={[0, maxImpact + 20]} 
                    label={{ value: 'Impacto (Total)', angle: -90, position: 'left' }}
                  />
                  <ZAxis type="number" range={[100, 1000]} />
                  
                  {/* Quadrants with ReferenceArea */}
                  {/* Q1: Low Effort / High Impact (Green) */}
                  <ReferenceArea x1={0} x2={avgEffort} y1={avgImpact} y2={maxImpact + 20} fill="#dcfce7" fillOpacity={0.5} />
                  {/* Q2: High Effort / Low Impact (Red) */}
                  <ReferenceArea x1={avgEffort} x2={9} y1={0} y2={avgImpact} fill="#fee2e2" fillOpacity={0.5} />
                  {/* Q3: Low Effort / Low Impact (Light Green) */}
                  <ReferenceArea x1={0} x2={avgEffort} y1={0} y2={avgImpact} fill="#f0fdf4" fillOpacity={0.5} />
                  {/* Q4: High Effort / High Impact (Light Red) */}
                  <ReferenceArea x1={avgEffort} x2={9} y1={avgImpact} y2={maxImpact + 20} fill="#fef2f2" fillOpacity={0.5} />

                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-[#ccc] shadow-lg rounded-[4px]">
                          <p className="font-bold text-[#003366]">{data.name}: {data.fullName}</p>
                          <p className="text-[12px]">Impacto: {data.impact}</p>
                          <p className="text-[12px]">Esforço: {data.effort}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  
                  <ReferenceLine x={avgEffort} stroke="#999" strokeDasharray="5 5" />
                  <ReferenceLine y={avgImpact} stroke="#999" strokeDasharray="5 5" />
                  
                  <Scatter name="Variáveis" data={chartData} fill="#1f2937">
                    <LabelList dataKey="name" position="top" offset={10} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Explanation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#dcfce7] border border-[#bbf7d0] rounded-[4px]">
                <h4 className="text-[12px] font-bold text-[#15803d] uppercase mb-1">Quick Wins</h4>
                <p className="text-[11px] text-[#166534]">Alto Impacto e Baixo Esforço. Prioridade 1: Implementar imediatamente.</p>
              </div>
              <div className="p-3 bg-[#f0fdf4] border border-[#dcfce7] rounded-[4px]">
                <h4 className="text-[12px] font-bold text-[#166534] uppercase mb-1">Baixa Prioridade</h4>
                <p className="text-[11px] text-[#15803d]">Baixo Impacto e Baixo Esforço. Implementar se houver recursos sobrando.</p>
              </div>
              <div className="p-3 bg-[#fef2f2] border border-[#fee2e2] rounded-[4px]">
                <h4 className="text-[12px] font-bold text-[#991b1b] uppercase mb-1">Projetos Estratégicos</h4>
                <p className="text-[11px] text-[#b91c1c]">Alto Impacto e Alto Esforço. Requer planejamento e recursos significativos.</p>
              </div>
              <div className="p-3 bg-[#fee2e2] border border-[#fecaca] rounded-[4px]">
                <h4 className="text-[12px] font-bold text-[#b91c1c] uppercase mb-1">Tarefas Ingratas</h4>
                <p className="text-[11px] text-[#991b1b]">Baixo Impacto e Alto Esforço. Evitar ou delegar se possível.</p>
              </div>
            </div>
          </div>
        )}

        {view === 'pareto' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-[16px] font-bold text-[#003366] flex items-center gap-2">
                <BarChart2 size={20} /> Pareto de Impacto (Priorização de X's)
              </h3>
              <div className="h-[400px] w-full bg-white p-4 border border-[#eee] rounded-[8px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#003366" label={{ value: 'Impacto Total', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ef4444" domain={[0, 100]} label={{ value: '% Acumulada', angle: 90, position: 'insideRight' }} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-[#ccc] shadow-lg rounded-[4px]">
                            <p className="font-bold text-[#003366]">{data.name}: {data.fullName}</p>
                            <p className="text-[12px]">Impacto: {data.impact}</p>
                            <p className="text-[12px]">Esforço: {data.effort}</p>
                            <p className="text-[12px] text-red-500">% Acumulada: {data.cumulativePercentage.toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    
                    <Bar yAxisId="left" dataKey="impact" barSize={30}>
                      {paretoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.effort >= 5 ? '#ef4444' : '#22c55e'} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-[11px] font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-[2px]"></div>
                  <span>Baixo Esforço</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-[2px]"></div>
                  <span>Alto Esforço</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[16px] font-bold text-[#003366] flex items-center gap-2">
                <CheckCircle2 size={20} /> Seleção para Investigação
              </h3>
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] overflow-hidden">
                <div className="p-3 bg-[#e2e8f0] text-[11px] font-bold uppercase text-[#475569] grid grid-cols-[40px_1fr_40px] gap-2">
                  <span>ID</span>
                  <span>Variável (X)</span>
                  <span className="text-center">Invest.</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {paretoData.map((d, i) => (
                    <div 
                      key={i} 
                      className="p-3 border-b border-[#e2e8f0] grid grid-cols-[40px_1fr_40px] gap-2 items-center hover:bg-white transition-all cursor-pointer"
                      onClick={() => {
                        const originalIdx = causes.findIndex(c => c.id === d.name);
                        if (originalIdx !== -1) toggleSelection(originalIdx);
                      }}
                    >
                      <span className="text-[12px] font-mono font-bold text-[#64748b]">{d.name}</span>
                      <span className="text-[12px] text-[#1e293b] line-clamp-2">{d.fullName}</span>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox"
                          checked={!!d.selected}
                          readOnly
                          className="w-4 h-4 rounded border-[#cbd5e1] text-[#10b981] focus:ring-[#10b981] cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-[8px]">
                <p className="text-[11px] text-yellow-800 leading-relaxed">
                  <strong>Dica:</strong> Foque nos X's com maior impacto e menor esforço (barras verdes à esquerda). 
                  Selecione os itens que serão levados para a etapa de <strong>Análise de Causa Raiz (5 Porquês, FTA, etc)</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-[4px] flex gap-3 items-start">
          <HelpCircle className="text-blue-500 shrink-0" size={20} />
          <div className="text-[12px] text-blue-800 leading-relaxed">
            <strong>Como preencher:</strong> Identifique as variáveis de entrada (X) que podem impactar seus resultados (Y). 
            Atribua um peso de importância para cada Y (1-10). Avalie a correlação entre cada X e Y (0-10). 
            O total é calculado automaticamente. Por fim, avalie o esforço necessário para controlar ou eliminar cada variável.
            Use a visualização para identificar os "Quick Wins" (ganhos rápidos).
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-[#eee]">
          <button
            onClick={() => onSave({ causes, outputs, colWidths })}
            className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-md"
          >
            <CheckCircle2 size={18} className="mr-2" />
            Salvar Matriz e Seleção
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
