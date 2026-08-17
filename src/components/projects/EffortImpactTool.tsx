import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, TrendingUp, Info, X, Sparkles, Loader2, BookOpen } from 'lucide-react';
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

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Cada ação tem esforço (X) e benefício (Y) de 1 a 5 — posicionada nos quadrantes.
const EI_EXEMPLOS: { id: string; rotulo: string; acoes: { label: string; description: string; effort: number; impact: number }[] }[] = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    acoes: [
      { label: 'X1', description: 'Modelo padrão de e-mail de cobrança', effort: 1, impact: 5 },
      { label: 'X2', description: 'Implantar novo CRM integrado', effort: 5, impact: 5 },
      { label: 'X3', description: 'Reorganizar pastas do drive compartilhado', effort: 1, impact: 1 },
      { label: 'X4', description: 'Migrar relatórios para BI corporativo', effort: 5, impact: 1 },
      { label: 'X5', description: 'Automatizar lembrete de reuniões', effort: 1, impact: 3 },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    acoes: [
      { label: 'X1', description: 'Checklist de troca de turno', effort: 1, impact: 5 },
      { label: 'X2', description: 'Trocar layout completo da linha', effort: 5, impact: 5 },
      { label: 'X3', description: 'Pintar faixas de segurança do piso', effort: 1, impact: 1 },
      { label: 'X4', description: 'Substituir injetora antiga', effort: 5, impact: 3 },
      { label: 'X5', description: 'Padronizar etiquetas de estoque', effort: 1, impact: 3 },
    ],
  },
];

export default function EffortImpactTool({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: EffortImpactProps) {
  const d = initialData?.toolData || initialData;
  const [actions, setActions] = useState<ProjectAction[]>(d?.actions || []);
  const isToolEmpty = actions.length === 0;
  const [newDesc, setNewDesc] = useState('');

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

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
        <div className="flex-1">
          <h2 className="text-[1.25rem] font-bold text-[#333]">Matriz Esforço x Benefício</h2>
          <p className="text-[12px] text-[#666]">Selecione os melhores projetos com base na facilidade e retorno</p>
        </div>
        <button
          onClick={() => setShowExemplo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
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
            Baixo esforço e alto benefício. Prioridade máxima!
          </div>
          <div className="p-3 bg-white rounded border border-blue-100">
            <strong className="text-blue-700 block uppercase text-[10px] mb-1">Estratégico:</strong>
            Alto benefício, mas exige planejamento e recursos.
          </div>
          <div className="p-3 bg-white rounded border border-gray-100">
            <strong className="text-gray-700 block uppercase text-[10px] mb-1">Rotina:</strong>
            Baixo benefício e baixo esforço. Fazer se sobrar tempo.
          </div>
          <div className="p-3 bg-white rounded border border-red-100">
            <strong className="text-red-700 block uppercase text-[10px] mb-1">Descartar:</strong>
            Alto esforço para pouco retorno. Evite!
          </div>
        </div>
      </div>

      <button data-save-trigger onClick={() => onSave({ actions })} className="hidden" />
    </div>

    {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
    {showExemplo && (
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setShowExemplo(false)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-orange-500" />
              <div>
                <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Matriz Esforço × Benefício</h3>
                <p className="text-xs text-gray-500 m-0">Onde cada ação cai nos quadrantes</p>
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
            {EI_EXEMPLOS.map((ex, i) => (
              <button
                key={ex.id}
                onClick={() => setExemploIdx(i)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                  exemploIdx === i
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                )}
              >
                {ex.rotulo}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            {/* Quadrante visual 2x2 — eixo X = Esforço, eixo Y = Benefício */}
            <div className="relative bg-gray-50 border border-gray-200 rounded-[8px] p-10">
              {/* rótulos de quadrante ao fundo */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-10 pointer-events-none opacity-20">
                <div className="border-r border-b border-gray-400 flex items-start justify-start p-2 text-[10px] font-black uppercase text-green-600">Ver e Agir</div>
                <div className="border-b border-gray-400 flex items-start justify-end p-2 text-[10px] font-black uppercase text-blue-600">Estratégico</div>
                <div className="border-r border-gray-400 flex items-end justify-start p-2 text-[10px] font-black uppercase text-gray-600">Rotina</div>
                <div className="flex items-end justify-end p-2 text-[10px] font-black uppercase text-red-600">Descartar</div>
              </div>

              {/* área do gráfico com pontos posicionados */}
              <div className="relative w-full" style={{ height: 360 }}>
                {/* eixos */}
                <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-gray-300" />
                <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-gray-300" />
                {EI_EXEMPLOS[exemploIdx].acoes.map((a) => {
                  // posiciona: esforço (1..5) no eixo X, benefício (1..5) no eixo Y invertido
                  const leftPct = ((a.effort - 1) / 4) * 100;
                  const topPct = (1 - (a.impact - 1) / 4) * 100;
                  let color = '#64748b';
                  if (a.effort <= 3 && a.impact > 3) color = '#22c55e';
                  if (a.effort > 3 && a.impact > 3) color = '#3b82f6';
                  if (a.effort <= 3 && a.impact <= 3) color = '#64748b';
                  if (a.effort > 3 && a.impact <= 3) color = '#ef4444';
                  return (
                    <div
                      key={a.label}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      title={a.description}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-md"
                        style={{ backgroundColor: color }}
                      >
                        {a.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* legendas de eixo */}
              <div className="text-center text-[10px] font-bold uppercase text-gray-400 mt-2">Esforço (Baixo → Alto)</div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold uppercase text-gray-400">Impacto</div>
            </div>

            {/* tabela de apoio — qual ponto é qual ação */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-[12px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border-b border-gray-200 text-center text-[10px] font-black uppercase text-orange-600 w-16">ID</th>
                    <th className="text-left p-2 border-b border-gray-200 text-[10px] font-black uppercase text-gray-600">Ação / Projeto</th>
                    <th className="p-2 border-b border-gray-200 text-center text-[10px] font-black uppercase text-gray-600 w-24">Esforço</th>
                    <th className="p-2 border-b border-gray-200 text-center text-[10px] font-black uppercase text-gray-600 w-24">Impacto</th>
                  </tr>
                </thead>
                <tbody>
                  {EI_EXEMPLOS[exemploIdx].acoes.map((a) => (
                    <tr key={a.label} className="border-b border-gray-100">
                      <td className="p-2 text-center font-black text-orange-600">{a.label}</td>
                      <td className="p-2 text-gray-800">{a.description}</td>
                      <td className="p-2 text-center font-bold text-gray-700">{a.effort}</td>
                      <td className="p-2 text-center font-bold text-gray-700">{a.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
              <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-amber-800 leading-relaxed m-0">
                Cada bolinha é uma ação posicionada por esforço (eixo X) e benefício (eixo Y). O ideal é priorizar o quadrante
                "Ver e Agir" (baixo esforço, alto benefício). Este exemplo é só pra consulta — não altera os seus dados.
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
