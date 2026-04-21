import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Target, Info, Settings2, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface RABProps {
  onSave: (data: any) => void;
  initialData?: any;
}

interface Column {
  id: string;
  label: string;
  isScore: boolean;
}

interface Row {
  id: string;
  [key: string]: any;
}

export default function RABTool({ onSave, initialData }: RABProps) {
  const defaultColumns: Column[] = [
    { id: 'description', label: 'Problema / Oportunidade', isScore: false },
    { id: 'rapidez', label: 'Rapidez', isScore: true },
    { id: 'autonomia', label: 'Autonomia', isScore: true },
    { id: 'beneficio', label: 'Benefício', isScore: true },
  ];

  const [columns, setColumns] = useState<Column[]>(initialData?.columns || defaultColumns);
  const [rows, setRows] = useState<Row[]>(initialData?.opportunities || []);
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (initialData?.columns) {
      const scoringIds = ['rapidez', 'autonomia', 'beneficio'];
      const updatedColumns = initialData.columns.map((col: any) => ({
        ...col,
        isScore: col.isScore ?? scoringIds.includes(col.id)
      }));
      setColumns(updatedColumns);
    }
    if (initialData?.opportunities) setRows(initialData.opportunities);
  }, [initialData]);

  const addColumn = () => {
    const newId = `col_${Date.now()}`;
    setColumns([...columns, { id: newId, label: 'Novo Critério', isScore: true }]);
    // Add default value to existing rows
    setRows(rows.map(row => ({ ...row, [newId]: 1 })));
  };

  const removeColumn = (id: string) => {
    if (id === 'description') return; // Don't remove the main description
    setColumns(columns.filter(c => c.id !== id));
    setRows(rows.map(row => {
      const newRow = { ...row };
      delete newRow[id];
      return newRow;
    }));
  };

  const updateColumnLabel = (id: string, label: string) => {
    setColumns(columns.map(c => c.id === id ? { ...c, label } : c));
  };

  const addRow = () => {
    if (!newDesc.trim()) return;
    const newRow: Row = { id: Date.now().toString(), description: newDesc };
    columns.forEach(col => {
      if (col.isScore) newRow[col.id] = 1;
    });
    setRows([...rows, newRow]);
    setNewDesc('');
  };

  const updateRow = (id: string, field: string, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const calculateScore = (row: Row) => {
    return columns
      .filter(c => c.isScore)
      .reduce((acc, col) => {
        const val = Number(row[col.id]);
        return acc * (isNaN(val) ? 1 : val);
      }, 1);
  };

  return (
    <div className="space-y-8 bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between border-b border-[#eee] pb-4">
        <div className="flex items-center gap-3">
          <Target className="text-blue-500" size={24} />
          <div>
            <h2 className="text-[1.25rem] font-bold text-[#333]">Matriz de Priorização Personalizada</h2>
            <p className="text-[12px] text-[#666]">Configure seus critérios e priorize suas oportunidades</p>
          </div>
        </div>
        <button 
          onClick={addColumn}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-[4px] text-[12px] font-bold hover:bg-gray-200 transition-all border border-gray-200"
        >
          <Plus size={14} /> Adicionar Coluna
        </button>
      </div>

      <div className="flex gap-2">
        <input 
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="flex-1 p-3 border border-[#ccc] rounded-[4px] text-[13px]"
          placeholder="Descreva o problema ou oportunidade..."
          onKeyDown={(e) => e.key === 'Enter' && addRow()}
        />
        <button onClick={addRow} className="bg-blue-500 text-white px-6 py-2 rounded-[4px] font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-sm">
          <Plus size={18}/> Adicionar
        </button>
      </div>

      <div className="overflow-x-auto border border-[#eee] rounded-[4px]">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-[11px] uppercase tracking-widest text-gray-500">
              {columns.map((col, idx) => (
                <th key={col.id} className="p-3 border group relative min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <input 
                      value={col.label}
                      onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                      className="bg-transparent border-none focus:ring-1 focus:ring-blue-300 rounded p-1 w-full font-black text-gray-700 uppercase"
                    />
                    {idx > 0 && (
                      <button 
                        onClick={() => removeColumn(col.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3 border text-center bg-green-50 text-green-800 font-black min-w-[120px]">
                Resultado Final
              </th>
              <th className="p-3 border w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {columns.map(col => (
                  <td key={col.id} className="p-2 border">
                    {col.id === 'description' ? (
                      <input 
                        value={row[col.id]} 
                        onChange={(e) => updateRow(row.id, col.id, e.target.value)} 
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-100 rounded text-[13px]"
                      />
                    ) : (
                      <div className="flex justify-center">
                        <select 
                          value={row[col.id] || 1} 
                          onChange={(e) => updateRow(row.id, col.id, Number(e.target.value))} 
                          className="p-2 border border-gray-200 rounded text-[13px] bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value={5}>5 pts (Alto)</option>
                          <option value={3}>3 pts (Médio)</option>
                          <option value={1}>1 pt (Baixo)</option>
                        </select>
                      </div>
                    )}
                  </td>
                ))}
                <td className="p-2 border text-center font-black text-[14px] bg-green-50/50 text-green-700">
                  {calculateScore(row)}
                </td>
                <td className="p-2 border text-center">
                  <button 
                    onClick={() => removeRow(row.id)} 
                    className="text-gray-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={16}/>
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="p-12 text-center text-gray-400 italic text-sm">
                  Nenhuma oportunidade adicionada ainda. Use o campo acima para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 p-6 rounded-[8px] border border-blue-100 text-[12px] text-blue-800 space-y-4">
        <h4 className="font-black flex items-center gap-2 uppercase tracking-widest text-blue-900">
          <Info size={16} className="text-blue-500"/> Guia de Pontuação Sugerido
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <strong className="text-blue-900 block uppercase text-[10px]">Rapidez:</strong>
            <p>5: Imediato (1 mês) | 3: Curto (1-3 meses) | 1: Longo (+3 meses)</p>
          </div>
          <div className="space-y-1">
            <strong className="text-blue-900 block uppercase text-[10px]">Autonomia:</strong>
            <p>5: Sozinho | 3: Apoio de outras áreas | 1: Depende de terceiros</p>
          </div>
          <div className="space-y-1">
            <strong className="text-blue-900 block uppercase text-[10px]">Benefício:</strong>
            <p>5: Impacto Estratégico | 3: Impacto na Área | 1: Impacto no Processo</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 font-bold uppercase italic">
          * O resultado é calculado multiplicando todos os critérios numéricos.
        </p>
        <button 
          onClick={() => onSave({ opportunities: rows, columns })} 
          className="bg-[#10b981] text-white px-10 py-4 rounded-[8px] font-black uppercase text-xs tracking-widest flex items-center hover:bg-green-600 transition-all shadow-lg shadow-green-100"
        >
          <CheckCircle2 size={18} className="mr-2" /> Salvar Matriz de Priorização
        </button>
      </div>
    </div>
  );
}
