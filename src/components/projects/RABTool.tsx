import React, { useState, useEffect } from 'react';
import { HelpCircle, X, GripVertical, CheckCircle2, Target, Plus, Sparkles, Loader2, Trash2, BookOpen, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useResizableTable } from '@/src/hooks/useResizableTable';
import { TableToolbar } from './TableToolbar';

interface RABProps {
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

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Cada item tem a oportunidade + Rapidez, Autonomia, Benefício (1/3/5). Resultado = soma.
const RAB_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    itens: [
      { description: 'Criar modelo padrão de proposta comercial', rapidez: 5, autonomia: 5, beneficio: 5 },
      { description: 'Automatizar lembrete de cobrança por e-mail', rapidez: 5, autonomia: 3, beneficio: 5 },
      { description: 'Digitalizar arquivo físico de contratos', rapidez: 3, autonomia: 3, beneficio: 3 },
      { description: 'Implantar novo sistema de CRM', rapidez: 1, autonomia: 1, beneficio: 5 },
      { description: 'Revisar layout da sala de reuniões', rapidez: 5, autonomia: 5, beneficio: 1 },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    itens: [
      { description: 'Padronizar checklist de troca de turno', rapidez: 5, autonomia: 5, beneficio: 5 },
      { description: 'Implantar 5S na bancada de montagem', rapidez: 5, autonomia: 3, beneficio: 5 },
      { description: 'Instalar sensor de parada na esteira', rapidez: 3, autonomia: 3, beneficio: 5 },
      { description: 'Trocar fornecedor de matéria-prima crítica', rapidez: 1, autonomia: 1, beneficio: 3 },
      { description: 'Repintar faixas de segurança do piso', rapidez: 5, autonomia: 5, beneficio: 1 },
    ],
  },
];

export default function RABTool({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: RABProps) {
  const d = initialData?.toolData || initialData;
  const defaultColumns: Column[] = [
    { id: 'description', label: 'Problema / Oportunidade', isScore: false },
    { id: 'rapidez', label: 'Rapidez', isScore: true },
    { id: 'autonomia', label: 'Autonomia', isScore: true },
    { id: 'beneficio', label: 'Benefício', isScore: true },
    { id: 'resultado', label: 'Resultado Final', isScore: false },
  ];

  const [columns, setColumns] = useState<Column[]>(d?.columns || defaultColumns);
  const [rows, setRows] = useState<any[]>(d?.opportunities || []);
  const isToolEmpty = rows.length === 0 || (rows.length === 1 && !rows[0].description);
  const [isSorted, setIsSorted] = useState(false);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

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
    rapidez: 140,
    autonomia: 140,
    beneficio: 140,
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
    rapidez: 'Velocidade de resultado da ação',
    autonomia: 'Independência para executar',
    beneficio: 'Impacto estratégico da solução',
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
    columns.filter(c => c.isScore).reduce((sum, c) => sum + (row[c.id] || 0), 0);

  const maxScore = Math.max(...rows.map(getRowTotal), 0);

  const handleAddColumn = (name: string) => {
    const newId = `col_${Date.now()}`;
    setColumns(prev => [...prev.filter(c => c.id !== 'resultado'), { id: newId, label: name, isScore: true }, { id: 'resultado', label: 'Resultado Final', isScore: false }]);
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
        <Target className="text-blue-500" size={24} />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[#333]">Matriz de Priorização RAB</h2>
          <p className="text-xs text-[#666]">Priorize as melhores oportunidades.</p>
        </div>
        <button
          onClick={() => setShowExemplo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
      </div>

      <TableToolbar
        itemCount={rows.length}
        onSort={handleSort}
        onAddColumn={handleAddColumn}
        isSorted={isSorted}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
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
                  className={`px-3 py-3 bg-slate-100 border border-slate-300 select-none whitespace-normal break-words group ${col.id === 'resultado' ? 'text-center' : 'text-left'}`}
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
                  className={`border-b border-slate-200 transition-colors ${
                    isWinner ? 'bg-green-50 border-l-4 border-l-green-400' : 'hover:bg-gray-50'
                  }`}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.id}
                      style={{ width: columnWidths[col.id] || 150 }}
                      className={`px-3 py-2 border border-slate-200 bg-white whitespace-normal break-words align-top ${colIndex === 0 ? 'relative' : ''}`}
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
                          className="w-full resize-none bg-white border border-slate-300 shadow-sm outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 rounded-lg px-2 py-1.5 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                        />
                      ) : col.id === 'resultado' ? (
                        <div className="flex justify-center flex-col h-[34px]">
                          <span className={`font-black text-center text-lg ${isWinner ? 'text-green-600' : 'text-blue-700'}`}>
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
                          className="w-full min-h-[38px] bg-white text-sm border-2 border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={1}>1 pt (Baixo)</option>
                          <option value={3}>3 pts (Médio)</option>
                          <option value={5}>5 pts (Alto)</option>
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
                  <td className="px-3 py-2 border border-slate-200 bg-white align-middle text-center">
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
              <BookOpen size={20} className="text-blue-600" />
              <div>
                <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Matriz RAB</h3>
                <p className="text-xs text-gray-500 m-0">Rapidez + Autonomia + Benefício</p>
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
            {RAB_EXEMPLOS.map((ex, i) => (
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
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-[12px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600" style={{ minWidth: 240 }}>Problema / Oportunidade</th>
                    <th className="p-2 border-b border-gray-200 text-center text-[10px] font-black uppercase text-gray-600">Rapidez</th>
                    <th className="p-2 border-b border-gray-200 text-center text-[10px] font-black uppercase text-gray-600">Autonomia</th>
                    <th className="p-2 border-b border-gray-200 text-center text-[10px] font-black uppercase text-gray-600">Benefício</th>
                    <th className="p-2 border-b border-gray-200 text-center text-[10px] font-black uppercase text-blue-700">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const itens = [...RAB_EXEMPLOS[exemploIdx].itens];
                    const maxRes = Math.max(...itens.map(it => it.rapidez + it.autonomia + it.beneficio));
                    return itens.map((it, idx) => {
                      const res = it.rapidez + it.autonomia + it.beneficio;
                      const isWinner = res === maxRes;
                      return (
                        <tr key={idx} className={`border-b border-gray-100 ${isWinner ? 'bg-green-50' : ''}`}>
                          <td className="p-2 text-[12px] text-gray-800">{it.description}</td>
                          <td className="p-2 text-center font-bold text-gray-700">{it.rapidez}</td>
                          <td className="p-2 text-center font-bold text-gray-700">{it.autonomia}</td>
                          <td className="p-2 text-center font-bold text-gray-700">{it.beneficio}</td>
                          <td className={`p-2 text-center font-black text-base ${isWinner ? 'text-green-600' : 'text-blue-700'}`}>{res}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
              <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-amber-800 leading-relaxed m-0">
                Cada nota vai de 1 (baixo) a 5 (alto). O resultado é a soma de Rapidez + Autonomia + Benefício — quanto maior, mais prioritário.
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
