import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Sparkles, Loader2, Trash2, X, Check, BookOpen, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TableToolbar } from './TableToolbar';

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Mesmas colunas reais do Plano de Controle (inclui checkbox Saídas/Entradas e select Método de controle).
const CP_EX_COLS: { id: string; label: string; type: 'text' | 'checkbox' | 'select' }[] = [
  { id: 'process', label: 'Variável do projeto', type: 'text' },
  { id: 'processStep', label: 'Etapa do processo', type: 'text' },
  { id: 'isOutput', label: 'Saídas', type: 'checkbox' },
  { id: 'isInput', label: 'Entradas', type: 'checkbox' },
  { id: 'specifications', label: 'Especificações do processo', type: 'text' },
  { id: 'measurementTechnique', label: 'Técnica de medição', type: 'text' },
  { id: 'msaResult', label: 'Resultado MSA', type: 'text' },
  { id: 'sampleSize', label: 'Tamanho da amostra', type: 'text' },
  { id: 'sampleFrequency', label: 'Frequência da amostra', type: 'text' },
  { id: 'controlMethod', label: 'Método de controle', type: 'select' },
  { id: 'responsible', label: 'Responsável', type: 'text' },
  { id: 'reactionPlan', label: 'Plano de reação', type: 'text' },
];

const CP_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    titulo: 'Plano de controle — Emissão de notas fiscais',
    linhas: [
      { process: 'Prazo de emissão da NF', processStep: 'Faturamento do pedido', isOutput: 'X', isInput: '', specifications: 'Emitir em até 4h após aprovação', measurementTechnique: 'Log de tempo do ERP', msaResult: 'OK', sampleSize: '100% das NFs', sampleFrequency: 'Diária', controlMethod: 'Detectar Defeito', responsible: 'Ana (Faturamento)', reactionPlan: 'Acionar supervisor e priorizar emissão pendente' },
      { process: 'Dados de cadastro', processStep: 'Validação do pedido', isOutput: '', isInput: 'X', specifications: 'CNPJ, CFOP e valor corretos', measurementTechnique: 'Checklist no ERP', msaResult: 'N/A', sampleSize: '100% dos pedidos', sampleFrequency: 'Por pedido', controlMethod: 'Prevenir Causa', responsible: 'Carlos (Supervisor)', reactionPlan: 'Bloquear faturamento e corrigir cadastro' },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    titulo: 'Plano de controle — Injeção plástica',
    linhas: [
      { process: 'Peso da peça', processStep: 'Injeção na máquina 03', isOutput: 'X', isInput: '', specifications: '25,0 g ± 0,3 g', measurementTechnique: 'Balança calibrada 0,01g', msaResult: 'R&R 8%', sampleSize: '5 peças/cavidade', sampleFrequency: 'A cada hora', controlMethod: 'Detectar Causa', responsible: 'Marcos (Processo)', reactionPlan: 'Ajustar dosagem e segregar peças fora de spec' },
      { process: 'Temperatura do molde', processStep: 'Setup da injetora', isOutput: '', isInput: 'X', specifications: '40 °C ± 5 °C', measurementTechnique: 'Termopar do CLP', msaResult: 'OK', sampleSize: 'Contínuo (CEP)', sampleFrequency: 'Online', controlMethod: 'Prevenir Causa', responsible: 'Operador da linha', reactionPlan: 'Parar a injetora e acionar manutenção' },
    ],
  },
];

interface Column {
  id: string;
  label: string;
  width?: string;
  type?: 'text' | 'checkbox' | 'select';
  options?: string[];
}

interface ControlPlanItem {
  id: string;
  data: Record<string, string>;
}

interface ControlPlanProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function ControlPlan({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: ControlPlanProps) {
  const d = initialData?.toolData || initialData;
  const defaultColumns: Column[] = [
    { id: 'process', label: 'Variável do projeto', width: '160px', type: 'text' },
    { id: 'processStep', label: 'Etapa do processo', width: '180px', type: 'text' },
    { id: 'isOutput', label: 'Saídas', width: '70px', type: 'checkbox' },
    { id: 'isInput', label: 'Entradas', width: '70px', type: 'checkbox' },
    { id: 'specifications', label: 'Especificações do processo', width: '200px', type: 'text' },
    { id: 'measurementTechnique', label: 'Técnica de medição', width: '170px', type: 'text' },
    { id: 'msaResult', label: 'Resultado MSA', width: '120px', type: 'text' },
    { id: 'sampleSize', label: 'Tamanho da amostra', width: '150px', type: 'text' },
    { id: 'sampleFrequency', label: 'Frequência da amostra', width: '150px', type: 'text' },
    { id: 'controlMethod', label: 'Método de controle', width: '170px', type: 'select', options: ['Prevenir Causa', 'Detectar Causa', 'Detectar Defeito'] },
    { id: 'responsible', label: 'Responsável', width: '150px', type: 'text' },
    { id: 'reactionPlan', label: 'Plano de reação', width: '220px', type: 'text' },
  ];

  const [columns, setColumns] = useState<Column[]>(d?.columns || defaultColumns);
  const [items, setItems] = useState<ControlPlanItem[]>(d?.items || []);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const initialWidths: Record<string, number> = {};
    const sourceColumns = d?.columns || defaultColumns;
    sourceColumns.forEach((col: Column) => {
      initialWidths[col.id] = parseInt(col.width || '150');
    });
    return initialWidths;
  });

  const resizingCol = useRef<{ id: string, startX: number, startWidth: number } | null>(null);

  const onResizeMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = { id, startX: e.clientX, startWidth: colWidths[id] || 150 };
    document.addEventListener('mousemove', onResizeMouseMove);
    document.addEventListener('mouseup', onResizeMouseUp);
  };

  const onResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { id, startX, startWidth } = resizingCol.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(60, startWidth + delta);
    setColWidths(prev => ({ ...prev, [id]: newWidth }));
  }, []);

  const onResizeMouseUp = useCallback(() => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', onResizeMouseMove);
    document.removeEventListener('mouseup', onResizeMouseUp);
  }, [onResizeMouseMove]);

  const isToolEmpty = items.length === 0;

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.columns) {
        setColumns(data.columns);
        const newWidths: Record<string, number> = {};
        data.columns.forEach((col: Column) => {
          newWidths[col.id] = parseInt(col.width || '150');
        });
        setColWidths(newWidths);
      }
      if (data.items && data.items.length > 0) setItems(data.items);
    }
  }, [initialData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea.control-plan-ta');
      textareas.forEach(ta => {
        (ta as HTMLTextAreaElement).style.height = 'auto';
        (ta as HTMLTextAreaElement).style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [items, columns]);

  const [editingHeader, setEditingHeader] = useState<string | null>(null);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), data: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}) }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemValue = (itemId: string, columnId: string, value: string) => {
    setItems(items.map(item => item.id === itemId ? { ...item, data: { ...item.data, [columnId]: value } } : item));
  };

  const toggleCheckbox = (itemId: string, columnId: string) => {
    const current = items.find(it => it.id === itemId)?.data[columnId];
    updateItemValue(itemId, columnId, current === 'X' ? '' : 'X');
  };

  const addColumn = (name: string) => {
    const newId = `col_${Date.now()}`;
    setColumns([...columns, { id: newId, label: name, width: '150px', type: 'text' }]);
    setColWidths(prev => ({ ...prev, [newId]: 150 }));
    setItems(items.map(item => ({ ...item, data: { ...item.data, [newId]: '' } })));
  };

  const protectedColumnIds = ['isOutput', 'isInput', 'controlMethod'];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
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

      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Fase Controlar</p>
          <h2 className="text-xl font-bold text-gray-800">Plano de Controle</h2>
        </div>
        <button
          onClick={() => setShowExemplo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
      </div>

      <TableToolbar
        itemCount={items.length}
        onAddColumn={addColumn}
      />

      <div className="overflow-x-auto border border-[#ccc] rounded-lg" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="border-collapse tool-table" style={{ tableLayout: 'fixed', minWidth: '1600px', width: 'max-content' }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={{ width: 36, color: '#94a3b8', borderBottom: '1px solid #334155' }} className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider"></th>
              {columns.map(col => (
                <th
                  key={col.id}
                  style={{
                    width: colWidths[col.id] || 150,
                    maxWidth: colWidths[col.id] || 150,
                    overflow: 'hidden',
                    color: '#94a3b8',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #334155',
                    position: 'relative',
                  }}
                  className="px-3 py-3 text-left select-none text-[10px] font-bold uppercase tracking-wider whitespace-normal break-words group"
                >
                  <div className="flex items-center gap-2">
                    {editingHeader === col.id ? (
                      <input
                        autoFocus
                        defaultValue={col.label}
                        className="bg-white border border-blue-300 rounded px-1 w-full text-[11px]"
                        onBlur={(e) => {
                          setColumns(prev => prev.map(c => c.id === col.id ? { ...c, label: e.target.value } : c));
                          setEditingHeader(null);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingHeader(null); }}
                      />
                    ) : (
                      <span onDoubleClick={() => setEditingHeader(col.id)} className="cursor-pointer">{col.label}</span>
                    )}
                    {!protectedColumnIds.includes(col.id) && (
                      <button
                        onClick={() => {
                          setColumns(columns.filter(c => c.id !== col.id));
                          setItems(items.map(item => { const newData = { ...item.data }; delete newData[col.id]; return { ...item, data: newData }; }));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity bg-transparent border-none cursor-pointer text-gray-400"
                        title="Remover coluna"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <div
                      onMouseDown={(e) => onResizeMouseDown(col.id, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 group-hover:bg-blue-200/50"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors" style={{ minHeight: '52px', borderBottom: '0.5px solid #e2e8f0' }}>
                <td className="p-1 align-middle text-center" style={{ width: 36 }}>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 border-none bg-transparent cursor-pointer"
                    title="Excluir linha"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
                {columns.map(col => (
                  <td key={col.id} className="p-1 border border-[#eee] whitespace-normal break-words align-top" style={{ width: colWidths[col.id] || 150, maxWidth: colWidths[col.id] || 150 }}>
                    {col.type === 'checkbox' ? (
                      <div className="flex items-center justify-center h-full py-2">
                        <button
                          onClick={() => toggleCheckbox(item.id, col.id)}
                          className={cn(
                            "w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer bg-transparent",
                            item.data[col.id] === 'X'
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-400'
                          )}
                          title={item.data[col.id] === 'X' ? 'Marcado' : 'Desmarcado'}
                        >
                          {item.data[col.id] === 'X' && <Check size={16} className="text-blue-600" />}
                        </button>
                      </div>
                    ) : col.type === 'select' ? (
                      <select
                        value={item.data[col.id] || ''}
                        onChange={(e) => updateItemValue(item.id, col.id, e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-800 cursor-pointer px-1 py-1"
                      >
                        <option value="">Selecionar...</option>
                        {(col.options || []).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={item.data[col.id] || ''}
                        onChange={(e) => {
                          updateItemValue(item.id, col.id, e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        rows={1}
                        className="control-plan-ta w-full resize-none bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                        style={{ minHeight: '36px', lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={addItem}
          className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 cursor-pointer bg-transparent transition-all"
        >
          <Plus size={16} /> Adicionar Linha
        </button>
        <button data-save-trigger onClick={() => {
          const columnsWithWidths = columns.map(col => ({
            ...col,
            width: `${colWidths[col.id] || 150}px`
          }));
          onSave({ items, columns: columnsWithWidths });
        }} className="hidden" />
      </div>

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Plano de Controle</h3>
                  <p className="text-xs text-gray-500 m-0">{CP_EXEMPLOS[exemploIdx].titulo}</p>
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
              {CP_EXEMPLOS.map((ex, i) => (
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
              <div className="overflow-x-auto border border-[#ccc] rounded-lg">
                <table className="border-collapse" style={{ minWidth: 1600, width: 'max-content' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      {CP_EX_COLS.map((c) => (
                        <th key={c.id} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-normal break-words" style={{ color: '#94a3b8', borderBottom: '1px solid #334155', minWidth: c.type === 'checkbox' ? 70 : 130 }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CP_EXEMPLOS[exemploIdx].linhas.map((linha: any, idx) => (
                      <tr key={idx} style={{ borderBottom: '0.5px solid #e2e8f0' }} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                        {CP_EX_COLS.map((c) => (
                          <td key={c.id} className="p-2 border border-[#eee] text-[12px] text-gray-800 align-top whitespace-normal break-words" style={{ minWidth: c.type === 'checkbox' ? 70 : 130 }}>
                            {c.type === 'checkbox' ? (
                              <div className="flex items-center justify-center">
                                {linha[c.id] === 'X' ? (
                                  <span className="w-6 h-6 rounded-md border-2 border-blue-600 bg-blue-50 flex items-center justify-center">
                                    <Check size={14} className="text-blue-600" />
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </div>
                            ) : (
                              linha[c.id]
                            )}
                          </td>
                        ))}
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