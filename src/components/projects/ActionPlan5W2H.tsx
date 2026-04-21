import React, { useState, useEffect } from 'react';
import { CheckCircle2, Plus, Trash2, Settings, Edit2, Save, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

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
  initialData?: any; // Can be old array format or new object format
}

export default function ActionPlan5W2H({ onSave, initialData }: ActionPlan5W2HProps) {
  const defaultColumns: Column[] = [
    { id: 'variable', title: 'Variável Estudada', type: 'text', isDefault: true },
    { id: 'what', title: 'O que? (What)', type: 'text' },
    { id: 'why', title: 'Por que? (Why)', type: 'text' },
    { id: 'where', title: 'Onde? (Where)', type: 'text' },
    { id: 'when', title: 'Quando? (When)', type: 'text' },
    { id: 'who', title: 'Quem? (Who)', type: 'text' },
    { id: 'how', title: 'Como? (How)', type: 'text' },
    { id: 'howMuch', title: 'Quanto? (How Much)', type: 'text' },
    { id: 'status', title: 'Status da Ação', type: 'status', isDefault: true },
  ];

  const [columns, setColumns] = useState<Column[]>(() => {
    if (initialData && !Array.isArray(initialData) && initialData.columns) {
      return initialData.columns;
    }
    return defaultColumns;
  });

  const [actions, setActions] = useState<Action[]>(() => {
    if (initialData && !Array.isArray(initialData) && initialData.actions) {
      return initialData.actions;
    }
    if (Array.isArray(initialData)) {
      return initialData.map((a, idx) => ({
        id: a.id || `legacy_${idx}_${Date.now()}`,
        ...a,
        variable: a.variable || '',
        status: a.status || { state: 'green', progress: '0%' }
      }));
    }
    return [
      { id: crypto.randomUUID(), variable: '', what: '', why: '', where: '', when: '', who: '', how: '', howMuch: '', status: { state: 'green', progress: '0%' } }
    ];
  });
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [tempColumnTitle, setTempColumnTitle] = useState('');

  useEffect(() => {
    if (initialData) {
      if (!Array.isArray(initialData) && initialData.columns) {
        setColumns(initialData.columns);
      }
      if (!Array.isArray(initialData) && initialData.actions) {
        setActions(initialData.actions);
      } else if (Array.isArray(initialData)) {
        setActions(initialData.map((a: any, idx: number) => ({
          id: a.id || `legacy_${idx}_${Date.now()}`,
          ...a,
          variable: a.variable || '',
          status: a.status || { state: 'green', progress: '0%' }
        })));
      }
    }
  }, [initialData]);

  const addAction = () => {
    const newAction: Action = { id: crypto.randomUUID() };
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

  const addColumn = () => {
    const newId = `col_${Date.now()}`;
    const newCol: Column = { id: newId, title: 'Nova Coluna', type: 'text' };
    
    const statusIdx = columns.findIndex(c => c.type === 'status');
    if (statusIdx !== -1) {
      const newCols = [...columns];
      newCols.splice(statusIdx, 0, newCol);
      setColumns(newCols);
    } else {
      setColumns([...columns, newCol]);
    }

    setActions(prev => prev.map(a => ({ ...a, [newId]: '' })));
  };

  const removeColumn = (id: string) => {
    if (columns.find(c => c.id === id)?.isDefault) return;
    setColumns(prev => prev.filter(c => c.id !== id));
    setActions(prev => prev.map(a => {
      const { [id]: _, ...rest } = a;
      return rest as Action;
    }));
  };

  const startEditingColumn = (col: Column) => {
    setEditingColumnId(col.id);
    setTempColumnTitle(col.title);
  };

  const saveColumnTitle = () => {
    if (editingColumnId) {
      setColumns(prev => prev.map(c => c.id === editingColumnId ? { ...c, title: tempColumnTitle } : c));
      setEditingColumnId(null);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white border border-[#ccc] rounded-[4px] shadow-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[#f8f9fa] border-b border-[#eee] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Settings className="text-[#3b82f6]" size={20} />
          </div>
          <div>
            <h2 className="text-[1.1rem] font-bold text-[#333]">Plano de Ação Estratégico (5W2H)</h2>
            <p className="text-[11px] text-[#666] uppercase tracking-wider font-medium">Gestão de Iniciativas e Status de Avanço</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={addColumn}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#ddd] hover:bg-gray-50 text-[#666] text-[12px] font-bold rounded-[4px] transition-all cursor-pointer shadow-sm"
          >
            <Plus size={14} /> Adicionar Coluna
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50/50 p-3 border-b border-blue-100 flex items-center gap-3">
        <Info size={16} className="text-blue-500 shrink-0" />
        <p className="text-[12px] text-blue-700">
          Personalize seu plano de ação adicionando ou editando colunas. O status permite acompanhar o progresso real de cada iniciativa.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-[#1f2937] text-white">
              {columns.map((col) => (
                <th key={col.id} className="p-3 border border-gray-700 font-bold text-left min-w-[160px] relative group">
                  {editingColumnId === col.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={tempColumnTitle}
                        onChange={(e) => setTempColumnTitle(e.target.value)}
                        onBlur={saveColumnTitle}
                        onKeyDown={(e) => e.key === 'Enter' && saveColumnTitle()}
                        className="bg-gray-800 text-white border-none outline-none px-2 py-1 w-full text-[12px] rounded"
                      />
                      <button onClick={saveColumnTitle} className="text-green-400 hover:text-green-300 bg-transparent border-none p-1 cursor-pointer">
                        <Save size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider">{col.title}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditingColumn(col)}
                          className="text-gray-400 hover:text-white bg-transparent border-none p-1 cursor-pointer rounded hover:bg-gray-700"
                          title="Editar título"
                        >
                          <Edit2 size={12} />
                        </button>
                        {!col.isDefault && (
                          <button 
                            onClick={() => removeColumn(col.id)}
                            className="text-gray-400 hover:text-red-400 bg-transparent border-none p-1 cursor-pointer rounded hover:bg-gray-700"
                            title="Remover coluna"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </th>
              ))}
              <th className="p-2 border border-gray-700 w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, actionIdx) => (
              <tr key={action.id} className={cn(
                actionIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                "hover:bg-blue-50/30 transition-all group/row"
              )}>
                {columns.map((col) => (
                  <td key={col.id} className="p-1 border border-[#eee]">
                    {col.type === 'status' ? (
                      <div className="flex flex-col gap-1.5 p-1.5">
                        <div className="relative">
                          <select
                            value={action[col.id]?.state || 'green'}
                            onChange={(e) => updateActionValue(action.id, col.id, { ...action[col.id], state: e.target.value })}
                            className={cn(
                              "w-full p-2 pl-8 text-[11px] font-bold rounded-[4px] border border-[#ddd] appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm",
                              action[col.id]?.state === 'green' ? "text-green-700 bg-green-50 border-green-200" :
                              action[col.id]?.state === 'yellow' ? "text-yellow-700 bg-yellow-50 border-yellow-200" :
                              "text-red-700 bg-red-50 border-red-200"
                            )}
                          >
                            <option value="green">Realizado no prazo</option>
                            <option value="yellow">Em andamento com atraso</option>
                            <option value="red">Risco de não ser realizado</option>
                          </select>
                          <div className={cn(
                            "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-inner",
                            getStatusColor(action[col.id]?.state || 'green')
                          )} />
                          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="flex items-center gap-2 bg-white/50 p-1 rounded border border-gray-100">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Avanço:</span>
                          <input
                            type="text"
                            value={action[col.id]?.progress || '0%'}
                            onChange={(e) => updateActionValue(action.id, col.id, { ...action[col.id], progress: e.target.value })}
                            placeholder="0%"
                            className="flex-1 p-1 text-[11px] font-bold text-center border-none bg-transparent focus:ring-0 outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={action[col.id] || ''}
                        onChange={(e) => updateActionValue(action.id, col.id, e.target.value)}
                        className="w-full p-2.5 border-none bg-transparent focus:ring-2 focus:ring-blue-100 rounded-[4px] resize-none text-[12px] min-h-[70px] leading-relaxed transition-all"
                        placeholder={`Descreva ${col.title.toLowerCase()}...`}
                      />
                    )}
                  </td>
                ))}
                <td className="p-1 border border-[#eee] text-center">
                  <button
                    onClick={() => removeAction(action.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all border-none bg-transparent cursor-pointer opacity-0 group-hover/row:opacity-100"
                    title="Remover ação"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="p-5 bg-[#f8f9fa] border-t border-[#eee] flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          onClick={addAction}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1f2937] text-white text-[12px] font-bold rounded-[4px] hover:bg-gray-800 transition-all border-none cursor-pointer shadow-md active:scale-95"
        >
          <Plus size={18} /> Adicionar Nova Ação
        </button>

        <button
          onClick={() => onSave({ columns, actions })}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-[#10b981] text-white text-[13px] font-bold rounded-[4px] hover:bg-green-600 transition-all border-none cursor-pointer shadow-md active:scale-95"
        >
          <CheckCircle2 size={18} /> Salvar Plano de Ação Completo
        </button>
      </div>
    </div>
  );
}


