import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, CheckCircle2, X, Sparkles, Loader2, Trash2, BookOpen, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TableToolbar } from './TableToolbar';

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Mesmas colunas reais do Plano de Coleta de Dados.
const DCP_EX_COLS: { id: string; label: string }[] = [
  { id: 'variable', label: 'Variável' },
  { id: 'priority', label: 'Prioridade' },
  { id: 'operationalDefinition', label: 'Definição Operacional' },
  { id: 'msa', label: 'MSA' },
  { id: 'method', label: 'Método de medição' },
  { id: 'stratification', label: 'Estratificação' },
  { id: 'responsible', label: 'Responsável' },
  { id: 'when', label: 'Quando' },
  { id: 'howMany', label: 'Quantas' },
];

const DCP_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    titulo: 'Coleta de dados — Processo de emissão de notas fiscais',
    linhas: [
      { variable: 'Tempo de emissão da NF', priority: 'Alta', operationalDefinition: 'Tempo em minutos entre o pedido aprovado e a NF emitida, medido pelo log do ERP', msa: 'OK', method: 'Quantitativa', stratification: 'Por turno e por operador', responsible: 'Ana (Faturamento)', when: 'Diário, por 4 semanas', howMany: '100% das NFs do período' },
      { variable: 'Erros de cadastro', priority: 'Alta', operationalDefinition: 'Nº de NFs devolvidas por dado incorreto (CNPJ, CFOP, valor)', msa: 'N/A', method: 'Quantitativa', stratification: 'Por tipo de erro', responsible: 'Carlos (Supervisor)', when: 'Diário, por 4 semanas', howMany: 'Todas as devoluções' },
      { variable: 'Satisfação do solicitante', priority: 'Média', operationalDefinition: 'Avaliação 1 a 5 sobre clareza e prazo do faturamento', msa: 'N/A', method: 'Qualitativa', stratification: 'Por área solicitante', responsible: 'Bruna (Qualidade)', when: 'Semanal', howMany: 'Amostra de 30/semana' },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    titulo: 'Coleta de dados — Linha de injeção plástica',
    linhas: [
      { variable: 'Peso da peça injetada', priority: 'Alta', operationalDefinition: 'Massa em gramas medida em balança calibrada (0,01g)', msa: 'R&R < 10%', method: 'Quantitativa', stratification: 'Por cavidade do molde', responsible: 'Marcos (Processo)', when: 'A cada hora', howMany: '5 peças/hora por cavidade' },
      { variable: 'Taxa de refugo', priority: 'Alta', operationalDefinition: '% de peças reprovadas sobre o total produzido no turno', msa: 'N/A', method: 'Quantitativa', stratification: 'Por turno e por defeito', responsible: 'Juliana (Qualidade)', when: 'Por turno', howMany: '100% da produção' },
      { variable: 'Aparência da peça', priority: 'Média', operationalDefinition: 'Inspeção visual contra padrão-limite (rebarba, mancha, falha)', msa: 'Atributo (kappa)', method: 'Qualitativa', stratification: 'Por molde', responsible: 'Inspetor da Qualidade', when: 'A cada lote', howMany: 'Amostra de 20/lote' },
    ],
  },
];

interface Column {
  id: string;
  label: string;
  width?: string;
}

interface DataCollectionItem {
  id: string;
  data: Record<string, string>;
}

interface DataCollectionPlanProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function DataCollectionPlan({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: DataCollectionPlanProps) {
  const d = initialData?.toolData || initialData;
  const defaultColumns: Column[] = [
    { id: 'variable', label: 'Variável', width: '180px' },
    { id: 'priority', label: 'Prioridade', width: '100px' },
    { id: 'operationalDefinition', label: 'Definição Operacional', width: '380px' },
    { id: 'msa', label: 'MSA', width: '80px' },
    { id: 'method', label: 'Método de medição', width: '150px' },
    { id: 'stratification', label: 'Estratificação', width: '150px' },
    { id: 'responsible', label: 'Responsável', width: '140px' },
    { id: 'when', label: 'Quando', width: '130px' },
    { id: 'howMany', label: 'Quantas', width: '150px' }
  ];

  const [columns, setColumns] = useState<Column[]>(d?.columns || defaultColumns);
  const [items, setItems] = useState<DataCollectionItem[]>(d?.items || []);
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
    
    setColWidths(prev => ({
      ...prev,
      [id]: newWidth
    }));
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

  // Auto-resize textareas when items or columns change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
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

  const addColumn = (name: string) => {
    const newId = `col_${Date.now()}`;
    setColumns([...columns, { id: newId, label: name, width: '150px' }]);
    setColWidths(prev => ({ ...prev, [newId]: 150 }));
    setItems(items.map(item => ({ ...item, data: { ...item.data, [newId]: '' } })));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
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

      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Fase Medir</p>
          <h2 className="text-xl font-bold text-gray-800">Plano de Coleta de Dados</h2>
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
        <table className="border-collapse tool-table" style={{ tableLayout: 'fixed', minWidth: '1200px', width: 'max-content' }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={{ width: 36 }}></th>
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
                            onKeyDown={(e) => { if(e.key === 'Enter') e.currentTarget.blur(); if(e.key === 'Escape') setEditingHeader(null); }}
                        />
                    ) : (
                        <span onDoubleClick={() => setEditingHeader(col.id)} className="cursor-pointer">{col.label}</span>
                    )}
                    {col.id !== 'method' && (
                        <button
                            onClick={() => {
                                setColumns(columns.filter(c => c.id !== col.id));
                                setItems(items.map(item => { const newData = {...item.data}; delete newData[col.id]; return {...item, data: newData}; }));
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                        >
                            <X size={12} />
                        </button>
                    )}
                    {/* Resize handle */}
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
                <td className="p-1 align-middle" style={{ width: 36 }}>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 border-none bg-transparent cursor-pointer"
                    title="Excluir linha"
                    aria-label="Excluir linha"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
                {columns.map(col => (
                  <td key={col.id} className="p-1 border border-[#eee] whitespace-normal break-words align-top" style={{ width: colWidths[col.id] || 150, maxWidth: colWidths[col.id] || 150 }}>
                    {col.id === 'method' ? (
                      <select
                        value={item.data[col.id] || ''}
                        onChange={(e) => updateItemValue(item.id, col.id, e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-800 cursor-pointer px-1 py-1"
                      >
                        <option value="">Selecionar...</option>
                        <option value="Quantitativa">Quantitativa</option>
                        <option value="Qualitativa">Qualitativa</option>
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
                        className="w-full resize-none bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Plano de Coleta de Dados</h3>
                  <p className="text-xs text-gray-500 m-0">{DCP_EXEMPLOS[exemploIdx].titulo}</p>
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
              {DCP_EXEMPLOS.map((ex, i) => (
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
                <table className="border-collapse" style={{ minWidth: 1200, width: 'max-content' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      {DCP_EX_COLS.map((c) => (
                        <th key={c.id} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-normal break-words" style={{ color: '#94a3b8', borderBottom: '1px solid #334155', minWidth: 110 }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DCP_EXEMPLOS[exemploIdx].linhas.map((linha: any, idx) => (
                      <tr key={idx} style={{ borderBottom: '0.5px solid #e2e8f0' }} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                        {DCP_EX_COLS.map((c) => (
                          <td key={c.id} className="p-2 border border-[#eee] text-[12px] text-gray-800 align-top whitespace-normal break-words" style={{ minWidth: 110 }}>
                            {linha[c.id]}
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
