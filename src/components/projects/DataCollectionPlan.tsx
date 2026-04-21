import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle,
  GripHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

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
  teamMembers?: string[];
}

export default function DataCollectionPlan({ onSave, initialData }: DataCollectionPlanProps) {
  const defaultColumns: Column[] = [
    { id: 'variable', label: 'Variável', width: '120px' },
    { id: 'priority', label: 'Prioridade', width: '60px' },
    { id: 'operationalDefinition', label: 'Definição Operacional', width: '450px' },
    { id: 'msa', label: 'MSA', width: '60px' },
    { id: 'method', label: 'Método de medição', width: '100px' },
    { id: 'stratification', label: 'Estratificação', width: '100px' },
    { id: 'responsible', label: 'Responsável', width: '100px' },
    { id: 'when', label: 'Quando', width: '80px' },
    { id: 'howMany', label: 'quantas', width: '150px' }
  ];

  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [items, setItems] = useState<DataCollectionItem[]>(initialData?.items || [
    { 
      id: '1', 
      data: defaultColumns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {})
    }
  ]);

  const [resizing, setResizing] = useState<{ index: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (initialData?.items) {
      setItems(initialData.items);
    } else if (initialData === null) {
      setItems([{ 
        id: '1', 
        data: defaultColumns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {})
      }]);
    }
    
    // Safety check: Filter out 'record' column if it exists in initial data
    if (initialData?.columns) {
      const filteredCols = initialData.columns
        .filter((c: Column) => c.id !== 'record')
        .map((c: Column) => {
          const dc = defaultColumns.find(d => d.id === c.id);
          // Keep the existing width/label if present, otherwise use default
          return dc ? { ...dc, ...c } : c;
        });
      
      // Ensure all default columns exist
      const mergedCols = [...filteredCols];
      defaultColumns.forEach(dc => {
        if (!mergedCols.find(mc => mc.id === dc.id)) {
          mergedCols.push(dc);
        }
      });

      // Sort according to default order for consistency
      const orderedCols = defaultColumns.map(dc => mergedCols.find(mc => mc.id === dc.id) || dc);
      setColumns(orderedCols);
    }
  }, [initialData]);

  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(),
      data: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {})
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error("O plano deve ter pelo menos uma linha.");
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemValue = (itemId: string, columnId: string, value: string) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, data: { ...item.data, [columnId]: value } } 
        : item
    ));
  };

  const addColumn = () => {
    const newId = `col-${Date.now()}`;
    const label = `Nova Coluna`;
    setColumns([...columns, { id: newId, label, width: '10%' }]);
    setItems(items.map(item => ({
      ...item,
      data: { ...item.data, [newId]: '' }
    })));
  };

  const removeColumn = (columnId: string) => {
    if (columns.length <= 1) {
      toast.error("O plano deve ter pelo menos uma coluna.");
      return;
    }
    setColumns(columns.filter(col => col.id !== columnId));
    setItems(items.map(item => {
      const newData = { ...item.data };
      delete newData[columnId];
      return { ...item, data: newData };
    }));
  };

  const updateColumnLabel = (columnId: string, newLabel: string) => {
    setColumns(columns.map(col => col.id === columnId ? { ...col, label: newLabel } : col));
  };

  const startResize = (index: number, e: React.MouseEvent) => {
    const startX = e.pageX;
    const startWidth = parseInt(columns[index].width || '0', 10);
    setResizing({ index, startX, startWidth });
    e.preventDefault();
  };

  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.pageX - resizing.startX;
      const newWidth = Math.max(20, resizing.startWidth + delta);
      
      setColumns(prev => prev.map((col, i) => 
        i === resizing.index ? { ...col, width: `${newWidth}px` } : col
      ));
    };

    const onMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing]);

  const handleSave = () => {
    onSave({ items, columns });
    toast.success("Plano de coleta salvo com sucesso!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-full overflow-hidden">
      <div className="bg-white border border-[#ccc] rounded-[4px] shadow-sm overflow-hidden">
        {/* Header matching image style */}
        <div className="bg-[#6699cc] p-3 text-center border-b border-[#4477aa]">
          <h2 className="text-[22px] font-bold text-white uppercase tracking-wider">Plano de Coleta de dados</h2>
        </div>

        <div className="overflow-x-auto w-full pb-2">
          <table 
            ref={tableRef}
            className={cn(
              "border-collapse border border-[#000] text-[10px] table-fixed",
              resizing && "cursor-col-resize select-none"
            )}
            style={{ width: 'max-content', minWidth: '100%' }}
          >
            <colgroup>
              {columns.map(col => (
                <col key={col.id} width={col.width} />
              ))}
              <col width="30px" />
            </colgroup>
            <thead>
              {/* Main Categories Header */}
              <tr className="bg-slate-50 uppercase tracking-tighter">
                <th colSpan={3} className="border border-[#000] p-1 text-center font-black text-[11px] bg-slate-50">O QUE MEDIR</th>
                <th colSpan={3} className="border border-[#000] p-1 text-center font-black text-[11px] bg-slate-50">COMO MEDIR</th>
                <th colSpan={1} className="border border-[#000] p-1 text-center font-black text-[11px] bg-slate-50">QUEM</th>
                <th colSpan={2} className="border border-[#000] p-1 text-center font-black text-[11px] bg-slate-50">AMOSTRA</th>
                <th className="border border-[#000] p-1 bg-slate-50"></th>
              </tr>
              {/* Header Title Editor Row */}
              <tr className="bg-white">
                {columns.map((col, idx) => (
                  <th key={col.id} className="border border-[#000] p-0 relative group overflow-visible h-10">
                    <div className="flex items-center justify-center h-full px-1">
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                        className="w-full font-bold text-center bg-transparent border-none focus:ring-0 rounded text-[9px] uppercase leading-tight"
                      />
                    </div>
                    
                    {/* Resizer Handle */}
                    <div
                      onMouseDown={(e) => startResize(idx, e)}
                      className={cn(
                        "absolute right-[-4px] top-0 h-full w-[8px] cursor-col-resize z-50 transition-colors bg-transparent",
                        "hover:bg-blue-400/30 active:bg-blue-500",
                        resizing?.index === idx && "bg-blue-500"
                      )}
                    />

                    <button
                      onClick={() => removeColumn(col.id)}
                      className="absolute -top-2 -left-2 hidden group-hover:flex bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 transition-colors z-[60] shadow-sm"
                    >
                      <X size={10} />
                    </button>
                  </th>
                ))}
                <th className="border border-[#000] p-0.5 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.id} className="border border-[#000] p-1 h-full min-h-[40px]">
                      {col.id === 'method' ? (
                        <select
                          value={item.data[col.id] || ''}
                          onChange={(e) => updateItemValue(item.id, col.id, e.target.value)}
                          className="w-full h-full p-1 border-none focus:ring-0 bg-transparent text-[10px] appearance-none cursor-pointer font-bold uppercase overflow-hidden text-ellipsis"
                        >
                          <option value="">Selecione...</option>
                          <option value="Qualitativa">QUALITATIVA</option>
                          <option value="Quantitativa">QUANTITATIVA</option>
                        </select>
                      ) : (
                        <textarea
                          value={item.data[col.id] || ''}
                          onChange={(e) => updateItemValue(item.id, col.id, e.target.value)}
                          className="w-full h-full p-1 border-none focus:ring-0 resize-none bg-transparent min-h-[40px] text-[10px] leading-tight"
                          placeholder="..."
                        />
                      )}
                    </td>
                  ))}
                  <td className="border border-[#000] p-0 text-center w-[25px] align-middle">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer p-0.5"
                      title="Excluir linha"
                    >
                      <Trash2 size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-[#ccc] flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={addItem}
              className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors border-none bg-transparent cursor-pointer"
            >
              <Plus size={18} /> Adicionar Linha
            </button>
            <button
              onClick={addColumn}
              className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors border-none bg-transparent cursor-pointer"
            >
              <Plus size={18} /> Adicionar Coluna
            </button>
          </div>
          
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-[#10b981] text-white rounded-[4px] font-bold hover:bg-green-600 transition-all shadow-md border-none cursor-pointer"
          >
            <CheckCircle2 size={18} /> Salvar Plano de Coleta
          </button>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-[4px] flex gap-3 items-start">
        <HelpCircle className="text-blue-500 shrink-0" size={20} />
        <div className="text-[12px] text-blue-800 leading-relaxed">
          <strong>Personalização:</strong> Agora você pode editar os títulos das colunas clicando neles. 
          Use os botões abaixo para adicionar novas linhas ou colunas. Posicione o mouse sobre o título de uma coluna para removê-la.
          <strong>Nota:</strong> A IA preencherá automaticamente apenas as colunas mapeadas se você usar o comando de geração.
        </div>
      </div>
    </div>
  );
}
