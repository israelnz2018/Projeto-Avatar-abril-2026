import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, TrendingUp, Info, X, Sparkles, Loader2 } from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
  Cell
} from 'recharts';
import { cn } from '@/src/lib/utils';

interface EffortImpactProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

interface ProjectAction {
  id: string;
  label: string; // X1, X2, etc.
  description: string;
  effort: number;
  impact: number;
}

export default function EffortImpactTool({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: EffortImpactProps) {
  const d = initialData?.toolData || initialData;
  const [actions, setActions] = useState<ProjectAction[]>(d?.actions || []);
  const isToolEmpty = actions.length === 0;
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.actions) {
        setActions(data.actions);
      }
    }
  }, [initialData]);

  const addAction = () => {
    if (!newDesc.trim()) return;
    const nextId = actions.length + 1;
    const newAction: ProjectAction = {
      id: Date.now().toString(),
      label: `X${nextId}`,
      description: newDesc,
      effort: 3,
      impact: 3
    };
    setActions([...actions, newAction]);
    setNewDesc('');
  };

  const updateAction = (id: string, field: keyof ProjectAction, value: any) => {
    setActions(actions.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeAction = (id: string) => {
    const filtered = actions.filter(a => a.id !== id);
    // Re-label remaining actions to keep X1, X2 sequence
    const reLabeled = filtered.map((a, idx) => ({ ...a, label: `X${idx + 1}` }));
    setActions(reLabeled);
  };

  const chartData = actions.map(a => ({
    x: a.effort,
    y: a.impact,
    name: a.description,
    label: a.label
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg text-[12px]">
          <p className="font-black text-blue-600 mb-1">{data.label}</p>
          <p className="text-gray-700 font-bold">{data.name}</p>
          <div className="mt-2 flex gap-4 text-gray-500">
            <span>Esforço: <strong>{data.x}</strong></span>
            <span>Impacto: <strong>{data.y}</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Matriz Esforço x Impacto com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Plano de Ação 5W2H" para gerar
                Matriz Esforço x Impacto técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA vai sugerir o esforço e impacto de cada ação planejada para ajudar na priorização.
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

      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
        <TrendingUp className="text-orange-500" size={24} />
        <div>
          <h2 className="text-[1.25rem] font-bold text-[#333]">Matriz Esforço x Impacto</h2>
          <p className="text-[12px] text-[#666]">Selecione os melhores projetos com base na facilidade e retorno</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Table Side */}
        <div className="space-y-6">
          <div className="flex gap-2">
            <input 
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="flex-1 p-3 border border-[#ccc] rounded-[4px] text-[13px]"
              placeholder="Descreva a ação ou projeto..."
              onKeyDown={(e) => e.key === 'Enter' && addAction()}
            />
            <button onClick={addAction} className="bg-orange-500 text-white px-6 py-2 rounded-[4px] font-bold flex items-center gap-2 hover:bg-orange-600 transition-all">
              <Plus size={18}/> Adicionar
            </button>
          </div>

          <div className="overflow-x-auto border border-[#eee] rounded-[4px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-widest text-gray-500">
                  <th className="p-3 border w-16 text-center">ID</th>
                  <th className="p-3 border">Ação / Projeto</th>
                  <th className="p-3 border text-center w-24">Esforço</th>
                  <th className="p-3 border text-center w-24">Impacto</th>
                  <th className="p-3 border w-12"></th>
                </tr>
              </thead>
              <tbody>
                {actions.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-2 border text-center font-black text-orange-600">{a.label}</td>
                    <td className="p-2 border">
                      <input 
                        value={a.description} 
                        onChange={(e) => updateAction(a.id, 'description', e.target.value)} 
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-orange-100 rounded text-[13px]"
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <select 
                        value={a.effort} 
                        onChange={(e) => updateAction(a.id, 'effort', Number(e.target.value))} 
                        className="p-1 border border-gray-200 rounded text-[12px] bg-white"
                      >
                        <option value={1}>1 (Baixo)</option>
                        <option value={3}>3 (Médio)</option>
                        <option value={5}>5 (Alto)</option>
                      </select>
                    </td>
                    <td className="p-2 border text-center">
                      <select 
                        value={a.impact} 
                        onChange={(e) => updateAction(a.id, 'impact', Number(e.target.value))} 
                        className="p-1 border border-gray-200 rounded text-[12px] bg-white"
                      >
                        <option value={1}>1 (Baixo)</option>
                        <option value={3}>3 (Médio)</option>
                        <option value={5}>5 (Alto)</option>
                      </select>
                    </td>
                    <td className="p-2 border text-center">
                      <button onClick={() => removeAction(a.id)} className="text-gray-300 hover:text-red-500 transition-all">
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {actions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 italic text-sm">
                      Nenhuma ação adicionada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Side */}
        <div className="bg-gray-50 p-6 rounded-[8px] border border-gray-200 relative min-h-[400px]">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-10 pointer-events-none opacity-20">
            <div className="border-r border-b border-gray-400 flex items-center justify-center text-[10px] font-black uppercase text-green-600">Ver e Agir</div>
            <div className="border-b border-gray-400 flex items-center justify-center text-[10px] font-black uppercase text-blue-600">Estratégico</div>
            <div className="border-r border-gray-400 flex items-center justify-center text-[10px] font-black uppercase text-gray-600">Rotina</div>
            <div className="flex items-center justify-center text-[10px] font-black uppercase text-red-600">Descartar</div>
          </div>
          
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Esforço" 
                  domain={[0, 6]} 
                  ticks={[1, 2, 3, 4, 5]}
                  label={{ value: 'Esforço', position: 'bottom', offset: 0, fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Impacto" 
                  domain={[0, 6]} 
                  ticks={[1, 2, 3, 4, 5]}
                  label={{ value: 'Impacto', angle: -90, position: 'left', fontSize: 10, fontWeight: 'bold' }}
                />
                <ZAxis type="number" range={[100, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={3} stroke="#999" strokeDasharray="3 3" />
                <ReferenceLine y={3} stroke="#999" strokeDasharray="3 3" />
                <Scatter name="Projetos" data={chartData} fill="#f97316">
                  <LabelList dataKey="label" position="top" offset={10} style={{ fontSize: '12px', fontWeight: 'bold', fill: '#333' }} />
                  {chartData.map((entry, index) => {
                    // Color points based on quadrant
                    let color = "#999";
                    if (entry.x <= 3 && entry.y > 3) color = "#22c55e"; // Ver e Agir
                    if (entry.x > 3 && entry.y > 3) color = "#3b82f6"; // Estratégico
                    if (entry.x <= 3 && entry.y <= 3) color = "#64748b"; // Rotina
                    if (entry.x > 3 && entry.y <= 3) color = "#ef4444"; // Descartar
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 p-6 rounded-[8px] border border-orange-100 text-[12px] text-orange-800 space-y-4">
        <h4 className="font-black flex items-center gap-2 uppercase tracking-widest text-orange-900">
          <Info size={16} className="text-orange-500"/> Entendendo a Matriz
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white rounded border border-green-100">
            <strong className="text-green-700 block uppercase text-[10px] mb-1">Ver e Agir:</strong>
            Baixo esforço e alto impacto. Prioridade máxima!
          </div>
          <div className="p-3 bg-white rounded border border-blue-100">
            <strong className="text-blue-700 block uppercase text-[10px] mb-1">Estratégico:</strong>
            Alto impacto, mas exige planejamento e recursos.
          </div>
          <div className="p-3 bg-white rounded border border-gray-100">
            <strong className="text-gray-700 block uppercase text-[10px] mb-1">Rotina:</strong>
            Baixo impacto e baixo esforço. Fazer se sobrar tempo.
          </div>
          <div className="p-3 bg-white rounded border border-red-100">
            <strong className="text-red-700 block uppercase text-[10px] mb-1">Descartar:</strong>
            Alto esforço para pouco retorno. Evite!
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button 
          onClick={() => onSave({ actions })} 
          className="bg-[#10b981] text-white px-10 py-4 rounded-[8px] font-black uppercase text-xs tracking-widest flex items-center hover:bg-green-600 transition-all shadow-lg shadow-green-100"
        >
          <CheckCircle2 size={18} className="mr-2" /> Salvar Matriz Esforço x Impacto
        </button>
      </div>
    </div>
  </div>
);
}
