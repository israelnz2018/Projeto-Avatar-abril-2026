import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Settings, Info, X, GripVertical } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useResizableTable } from '@/src/hooks/useResizableTable';
import { TableToolbar } from './TableToolbar';

interface Column {
  id: string;
  title: string;
  type: 'text' | 'status';
  isDefault?: boolean;
}

interface Action {
  id: string;
  [key: string]: any;
}

interface ActionPlan5W2HProps {
  onSave: (data: any) => void;
  initialData?: any;
}

export default function ActionPlan5W2H({ onSave, initialData }: ActionPlan5W2HProps) {
  const defaultColumns: Column[] = [
    { id: 'description', title: 'Ação / Variável', type: 'text', isDefault: true },
    { id: 'what', title: 'O que? (What)', type: 'text' },
    { id: 'why', title: 'Por que? (Why)', type: 'text' },
    { id: 'where', title: 'Onde? (Where)', type: 'text' },
    { id: 'when', title: 'Quando? (When)', type: 'text' },
    { id: 'who', title: 'Quem? (Who)', type: 'text' },
    { id: 'how', title: 'Como? (How)', type: 'text' },
    { id: 'howMuch', title: 'Quanto? (How Much)', type: 'text' },
    { id: 'status', title: 'Status da Ação', type: 'status', isDefault: true },
  ];

  const [columns, setColumns] = useState<Column[]>(initialData?.columns || defaultColumns);
  const [actions, setActions] = useState<Action[]>(initialData?.actions || [{ id: crypto.randomUUID(), description: '', what: '', why: '', where: '', when: '', who: '', how: '', howMuch: '', status: { state: 'green', progress: '0%' } }]);

  // Auto-resize textareas when actions change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [actions]);

  const {
    columnWidths, rowHeights, columnOrder, setColumnOrder,
    editingHeader, setEditingHeader,
    draggedCol, dragOverCol,
    startColResize, startRowResize,
    handleColDragStart, handleColDragOver, handleColDrop,
  } = useResizableTable(Object.fromEntries(columns.map(c => [c.id, 160])));

  const addAction = () => {
    const newAction: Action = { id: crypto.randomUUID(), description: '' };
    columns.forEach(col => {
      if (col.type === 'status') {
        newAction[col.id] = { state: 'green', progress: '0%' };
      } else {
        newAction[col.id] = '';
      }
    });
    setActions(prev => [...prev, newAction]);
  };

  const removeAction = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id));
  };

  const updateActionValue = (actionId: string, columnId: string, value: any) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, [columnId]: value } : a));
  };

  return (
    <div className="bg-white border border-[#ccc] rounded-lg shadow-sm p-6 w-full space-y-4">
      <div className="flex items-center gap-3 border-b border-[#eee] pb-4 mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Settings className="text-[#3b82f6]" size={20} />
        </div>
        <div>
            <h2 className="text-lg font-bold text-[#333]">Plano de Ação Estratégico (5W2H)</h2>
            <p className="text-xs text-[#666] uppercase tracking-wider font-medium">Gestão de Iniciativas</p>
        </div>
      </div>

      <TableToolbar
        itemCount={actions.length}
      />

      <div className="overflow-x-auto pb-2">
        <table className="w-full border-collapse tool-table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-[#1f2937] text-white">
              {columns.map((col) => (
                <th
                  key={col.id}
                  draggable={!col.isDefault}
                  onDragStart={() => handleColDragStart(col.id)}
                  onDragOver={(e) => handleColDragOver(e, col.id)}
                  onDrop={() => handleColDrop(col.id)}
                  style={{
                    width: columnWidths[col.id] || 160,
                    position: 'relative',
                    borderLeft: dragOverCol === col.id ? '2px solid #3b82f6' : undefined,
                  }}
                  className="p-3 border border-gray-700 font-bold text-left select-none whitespace-normal break-words"
                >
                  <div className="flex items-center gap-1 group">
                    <GripVertical size={12} className="text-gray-500 cursor-grab shrink-0" />
                    
                    <span 
                      className="text-[11px] uppercase tracking-wider cursor-pointer font-bold"
                      onDoubleClick={() => setEditingHeader(col.id)}
                    >
                      {editingHeader === col.id ? (
                        <input
                          autoFocus
                          defaultValue={col.title}
                          className="bg-gray-800 text-white border-none outline-none px-1 py-0.5 w-full text-[11px] rounded"
                          onBlur={(e) => {
                            setColumns(prev => prev.map(c => c.id === col.id ? {...c, title: e.target.value} : c));
                            setEditingHeader(null);
                          }}
                          onKeyDown={(e) => { if(e.key === 'Enter') e.currentTarget.blur(); if(e.key === 'Escape') setEditingHeader(null); }}
                        />
                      ) : col.title}
                    </span>
                  </div>

                  {!col.isDefault && (
                    <div
                      onMouseDown={(e) => startColResize(e, col.id)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
                    />
                  )}
                </th>
              ))}
              <th className="p-2 border border-gray-700 w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, actionIdx) => (
              <tr 
                key={action.id} 
                className={cn(actionIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50", "transition-all group/row")}
                style={{ minHeight: '52px' }}
              >
                {columns.map((col) => (
                  <td key={col.id} className="p-1 border border-[#eee] relative whitespace-normal break-words align-top" style={{ width: columnWidths[col.id] || 160 }}>
                    {col.type === 'status' ? (
                      <div className="flex flex-col gap-1.5 p-1.5">
                        <select
                          value={action[col.id]?.state || 'green'}
                          onChange={(e) => updateActionValue(action.id, col.id, { ...action[col.id], state: e.target.value })}
                          className={cn(
                            "w-full p-2 text-[11px] font-bold rounded border border-[#ddd] appearance-none cursor-pointer outline-none transition-all",
                            action[col.id]?.state === 'green' ? "text-green-700 bg-green-50 border-green-200" :
                            action[col.id]?.state === 'yellow' ? "text-yellow-700 bg-yellow-50 border-yellow-200" :
                            "text-red-700 bg-red-50 border-red-200"
                          )}
                        >
                          <option value="green">No prazo</option>
                          <option value="yellow">Atrasado</option>
                          <option value="red">Risco</option>
                        </select>
                      </div>
                    ) : (
                      <textarea
                        value={action[col.id] || ''}
                        onChange={(e) => {
                          updateActionValue(action.id, col.id, e.target.value);
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
                    )}
                  </td>
                ))}
                <td className="p-1 border border-[#eee] text-center relative">
                    <button
                        onClick={() => removeAction(action.id)}
                        className="text-gray-300 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer opacity-0 group-hover/row:opacity-100"
                    >
                        <X size={16} />
                    </button>
                    <div
                        onMouseDown={(e) => startRowResize(e, action.id)}
                        className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-blue-200 transition-colors z-10"
                    />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button
          onClick={addAction}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1f2937] text-white text-[12px] font-bold rounded hover:bg-gray-800 transition-all border-none cursor-pointer"
        >
          <Plus size={16} /> Adicionar Nova Ação
        </button>

        <button
          onClick={() => onSave({ columns, actions })}
          className="flex items-center gap-2 px-8 py-2.5 bg-[#10b981] text-white text-[13px] font-bold rounded hover:bg-green-600 transition-all border-none cursor-pointer"
        >
          <CheckCircle2 size={16} /> Salvar Plano de Ação
        </button>
      </div>
    </div>
  );
}


