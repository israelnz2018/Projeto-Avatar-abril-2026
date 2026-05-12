import React, { useState, useEffect } from 'react';
import { HelpCircle, X, GripVertical, CheckCircle2, BarChart2, Plus, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useResizableTable } from '@/src/hooks/useResizableTable';
import { TableToolbar } from './TableToolbar';

interface GUTProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

interface Column {
  id: string;
  label: string;
  isScore: boolean;
}

export default function GUTTool({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: GUTProps) {
  const d = initialData?.toolData || initialData;
  const defaultColumns: Column[] = [
    { id: 'description', label: 'Problema / Oportunidade', isScore: false },
    { id: 'gravidade', label: 'Gravidade', isScore: true },
    { id: 'urgencia', label: 'Urgência', isScore: true },
    { id: 'tendencia', label: 'Tendência', isScore: true },
    { id: 'resultado', label: 'Resultado (G x U x T)', isScore: false },
  ];

  const [columns, setColumns] = useState<Column[]>(d?.columns || defaultColumns);
  const [rows, setRows] = useState<any[]>(d?.opportunities || []);
  const isToolEmpty = rows.length === 0 || (rows.length === 1 && !rows[0].description);
  const [isSorted, setIsSorted] = useState(false);

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.columns) setColumns(data.columns);
      if (data.opportunities) setRows(data.opportunities);
    }
  }, [initialData]);

  // Auto-resize textareas when rows change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [rows]);

  const initialWidths = d?.columnWidths || {
    description: 280,
    gravidade: 140,
    urgencia: 140,
    tendencia: 140,
    resultado: 120,
  };

  const {
    columnWidths, rowHeights, columnOrder, setColumnOrder,
    editingHeader, setEditingHeader,
    draggedCol, dragOverCol,
    startColResize, startRowResize,
    handleColDragStart, handleColDragOver, handleColDrop,
  } = useResizableTable(initialWidths);

  const TOOLTIPS: Record<string, string> = {
    gravidade: 'Impacto do problema se ele acontecer ou continuar acontecendo',
    urgencia: 'Necessidade de ação imediata — quanto tempo temos para resolver?',
    tendencia: 'O problema vai piorar, estabilizar ou melhorar com o tempo?',
  };

  const handleSort = () => {
    const sorted = [...rows].sort((a, b) => {
      const scoreA = columns.filter(c => c.isScore).reduce((sum, c) => sum + (a[c.id] || 0), 0);
      const scoreB = columns.filter(c => c.isScore).reduce((sum, c) => sum + (b[c.id] || 0), 0);
      return scoreB - scoreA;
    });
    setRows(sorted);
    setIsSorted(true);
  };

  const getRowTotal = (row: any) => 
    columns.filter(c => c.isScore).reduce((prod, c) => prod * (row[c.id] || 1), 1);

  const maxScore = Math.max(...rows.map(getRowTotal), 0);

  const handleAddColumn = (name: string) => {
    const newId = `col_${Date.now()}`;
    setColumns(prev => [...prev.filter(c => c.id !== 'resultado'), { id: newId, label: name, isScore: true }, { id: 'resultado', label: 'Resultado (G x U x T)', isScore: false }]);
    setRows(prev => prev.map(row => ({ ...row, [newId]: 1 })));
    setColumnOrder(prev => [...prev, newId, 'resultado']);
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

      <div className="bg-white p-6 border border-[#ccc] rounded-lg shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-[#eee] pb-4 mb-4">
        <BarChart2 className="text-purple-500" size={24} />
        <div>
          <h2 className="text-lg font-bold text-[#333]">Matriz de Priorização GUT</h2>
          <p className="text-xs text-[#666]">Priorize os maiores problemas.</p>
        </div>
      </div>

      <TableToolbar
        itemCount={rows.length}
        onSort={handleSort}
        onAddColumn={handleAddColumn}
        isSorted={isSorted}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse tool-table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.id}
                  draggable={col.id !== 'description'}
                  onDragStart={() => handleColDragStart(col.id)}
                  onDragOver={(e) => handleColDragOver(e, col.id)}
                  onDrop={() => handleColDrop(col.id)}
                  style={{
                    width: columnWidths[col.id] || 150,
                    position: 'relative',
                    borderLeft: dragOverCol === col.id ? '2px solid #3b82f6' : undefined,
                  }}
                  className={`px-3 py-3 bg-gray-50 border-b-2 border-gray-200 select-none whitespace-normal break-words group ${col.id === 'resultado' ? 'text-center' : 'text-left'}`}
                >
                  <div className={`flex items-center gap-1 group ${col.id === 'resultado' ? 'justify-center' : ''}`}>
                    {col.id !== 'description' && (
                      <GripVertical size={12} className="text-gray-300 cursor-grab shrink-0" />
                    )}

                    {editingHeader === col.id ? (
                      <input
                        autoFocus
                        defaultValue={col.label}
                        className="text-[11px] font-black uppercase w-full bg-white border border-blue-300 rounded px-1 focus:outline-none"
                        onBlur={(e) => {
                          setColumns(prev => prev.map(c => 
                            c.id === col.id ? { ...c, label: e.target.value } : c
                          ));
                          setEditingHeader(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') setEditingHeader(null);
                        }}
                      />
                    ) : (
                      <span
                        className="text-[11px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                        onDoubleClick={() => setEditingHeader(col.id)}
                        title="Clique duplo para editar o título"
                      >
                        {col.label}
                      </span>
                    )}

                    {TOOLTIPS[col.id] && (
                      <div className="relative group/tooltip">
                        <HelpCircle size={12} className="text-gray-300 hover:text-blue-500 cursor-help shrink-0" />
                        <div className="absolute bottom-full left-0 mb-1 w-48 bg-gray-800 text-white text-[10px] rounded-lg p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 pointer-events-none">
                          {TOOLTIPS[col.id]}
                        </div>
                      </div>
                    )}

                    {col.id !== 'description' && col.id !== 'resultado' && (
                      <button
                        onClick={() => {
                          setColumns(prev => prev.filter(c => c.id !== col.id));
                          setRows(prev => prev.map(row => {
                            const newRow = { ...row };
                            delete newRow[col.id];
                            return newRow;
                          }));
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 hover:text-red-500 text-gray-300 transition-all border-none bg-transparent cursor-pointer shrink-0"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => startColResize(e, col.id)}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 group-hover:bg-blue-200/50"
                  />
                </th>
              ))}
              <th className="px-3 py-3 w-12 text-center bg-gray-50 border-b-2 border-gray-200"></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const total = getRowTotal(row);
              const isWinner = total === maxScore && maxScore > 0;
              return (
                <tr
                  key={row.id || index}
                  style={{ minHeight: '52px', position: 'relative' }}
                  className={`border-b border-gray-100 transition-colors ${
                    isWinner ? 'bg-green-50 border-l-4 border-l-green-400' : 'hover:bg-gray-50'
                  }`}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.id}
                      style={{ width: columnWidths[col.id] || 150 }}
                      className={`px-3 py-2 whitespace-normal break-words align-top ${colIndex === 0 ? 'relative' : ''}`}
                    >
                      {col.id === 'description' ? (
                        <textarea
                          value={row[col.id] || ''}
                          onChange={(e) => {
                            setRows(prev => prev.map(r =>
                              r.id === row.id ? { ...r, description: e.target.value } : r
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
                      ) : col.id === 'resultado' ? (
                        <div className="flex justify-center flex-col h-[34px]">
                          <span className={`font-black text-center text-lg ${isWinner ? 'text-green-600' : 'text-purple-700'}`}>
                            {total}
                          </span>
                        </div>
                      ) : col.isScore ? (
                        <select
                          value={row[col.id] || 1}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRows(prev => prev.map(r => 
                              r.id === row.id ? { ...r, [col.id]: val } : r
                            ));
                          }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1}>1 pt (Baixo)</option>
                          <option value={3}>3 pts (Médio)</option>
                          <option value={5}>5 pts (Extremo)</option>
                        </select>
                      ) : (
                        <div
                          className="text-sm font-medium text-gray-800 break-words"
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: '1.5',
                            minHeight: '36px',
                          }}
                        >
                          {row[col.id]}
                        </div>
                      )}
                      
                      {colIndex === 0 && (
                        <div
                          onMouseDown={(e) => startRowResize(e, row.id)}
                          className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-blue-200 transition-colors z-10"
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 align-middle text-center">
                    <button
                      onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer inline-flex items-center justify-center"
                      title="Excluir item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => {
            const newRow: any = { id: `row_${Date.now()}`, description: '' };
            columns.filter(c => c.isScore).forEach(c => newRow[c.id] = 1);
            setRows(prev => [...prev, newRow]);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border-none cursor-pointer"
        >
          <Plus size={16} />
          Adicionar Item
        </button>

        <button 
          onClick={() => onSave({ opportunities: rows, columns, columnWidths })} 
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center hover:bg-green-700 transition-all ml-auto"
        >
          <CheckCircle2 size={16} className="mr-2" /> Salvar Matriz
        </button>
      </div>
    </div>
  </div>
);
}
