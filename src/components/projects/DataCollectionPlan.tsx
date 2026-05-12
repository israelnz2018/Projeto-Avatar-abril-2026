import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, CheckCircle2, X, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TableToolbar } from './TableToolbar';

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
    </div>
  );
}
