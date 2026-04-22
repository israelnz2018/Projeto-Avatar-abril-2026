import React, { useState, useEffect } from 'react';
import { Truck, Package, Settings, PackageCheck, UserCheck, Plus, Trash2, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SIPOCProps {
  onSave: (data: any) => void;
  initialData?: any;
}

interface ColumnProps {
  title: string;
  icon: any;
  column: string;
  color: string;
  placeholder: string;
  items: string[];
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

const Column = ({ title, icon: Icon, color, placeholder, items, onUpdate, onRemove, onAdd }: ColumnProps) => (
  <div className="flex-1 min-w-[200px] flex flex-col bg-white border border-[#ccc] rounded-[4px] overflow-hidden shadow-sm">
    <div className={cn("p-4 flex items-center gap-2 border-b border-[#eee]", color)}>
      <Icon size={20} className="text-white" />
      <h3 className="text-white font-bold text-[14px] uppercase tracking-wider">{title}</h3>
    </div>
    <div className="px-2 py-4 flex-1 space-y-2 bg-[#fcfcfc]">
      {items.map((item: string, idx: number) => (
        <div key={idx} className="flex items-center gap-1 group relative">
          <textarea
            value={item}
            onChange={(e) => onUpdate(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 p-2 pr-8 text-[12px] border border-[#eee] rounded-[2px] focus:outline-none focus:border-blue-400 bg-white resize-none min-h-[64px]"
            rows={3}
          />
          <button 
            onClick={() => onRemove(idx)}
            className="absolute right-1 top-1 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer z-10"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button 
        onClick={onAdd}
        className="w-full py-2 flex items-center justify-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-dashed border-[#ddd] rounded-[2px] transition-all cursor-pointer"
      >
        <Plus size={14} /> Adicionar
      </button>
    </div>
  </div>
);

export default function SIPOC({ onSave, initialData }: SIPOCProps) {
  const [data, setData] = useState(initialData || {
    suppliers: ['Fornecedor A'],
    inputs: ['Matéria Prima'],
    process: ['Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4', 'Etapa 5'],
    outputs: ['Produto Final'],
    customers: ['Cliente Final']
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const addItem = (column: keyof typeof data) => {
    setData((prev: any) => ({
      ...prev,
      [column]: [...prev[column], '']
    }));
  };

  const removeItem = (column: keyof typeof data, index: number) => {
    setData((prev: any) => ({
      ...prev,
      [column]: prev[column].filter((_: any, i: number) => i !== index)
    }));
  };

  const updateItem = (column: keyof typeof data, index: number, value: string) => {
    setData((prev: any) => {
      const newList = [...prev[column]];
      newList[index] = value;
      return { ...prev, [column]: newList };
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 border border-[#ccc] rounded-[4px] shadow-sm w-full overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#eee] pb-4 mb-6">
          <Settings className="text-[#3b82f6]" size={24} />
          <div>
            <h2 className="text-[1.25rem] font-bold text-[#333]">SIPOC</h2>
            <p className="text-[12px] text-[#666]">Visão macro do processo: Fornecedores, Entradas, Processo, Saídas e Clientes.</p>
          </div>
        </div>

        <div className="flex flex-nowrap gap-4 items-stretch overflow-x-auto pb-4">
          <Column 
            title="Suppliers" 
            icon={Truck} 
            column="suppliers" 
            color="bg-[#1f2937]" 
            placeholder="Quem fornece?"
            items={data.suppliers}
            onUpdate={(idx, val) => updateItem('suppliers', idx, val)}
            onRemove={(idx) => removeItem('suppliers', idx)}
            onAdd={() => addItem('suppliers')}
          />
          <Column 
            title="Inputs" 
            icon={Package} 
            column="inputs" 
            color="bg-[#374151]" 
            placeholder="O que é fornecido?"
            items={data.inputs}
            onUpdate={(idx, val) => updateItem('inputs', idx, val)}
            onRemove={(idx) => removeItem('inputs', idx)}
            onAdd={() => addItem('inputs')}
          />
          <Column 
            title="Process" 
            icon={Settings} 
            column="process" 
            color="bg-[#4b5563]" 
            placeholder="Etapa do processo..."
            items={data.process}
            onUpdate={(idx, val) => updateItem('process', idx, val)}
            onRemove={(idx) => removeItem('process', idx)}
            onAdd={() => addItem('process')}
          />
          <Column 
            title="Outputs" 
            icon={PackageCheck} 
            column="outputs" 
            color="bg-[#6b7280]" 
            placeholder="O que é entregue?"
            items={data.outputs}
            onUpdate={(idx, val) => updateItem('outputs', idx, val)}
            onRemove={(idx) => removeItem('outputs', idx)}
            onAdd={() => addItem('outputs')}
          />
          <Column 
            title="Customers" 
            icon={UserCheck} 
            column="customers" 
            color="bg-[#9ca3af]" 
            placeholder="Quem recebe?"
            items={data.customers}
            onUpdate={(idx, val) => updateItem('customers', idx, val)}
            onRemove={(idx) => removeItem('customers', idx)}
            onAdd={() => addItem('customers')}
          />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-[4px] flex gap-3 items-start border border-blue-100">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-[12px] text-blue-800 leading-relaxed">
            <strong>Dica:</strong> Comece pelo <strong>Processo</strong> (5 a 7 etapas macro), depois identifique as <strong>Saídas</strong> e os <strong>Clientes</strong>. 
            Por fim, determine as <strong>Entradas</strong> necessárias e seus respectivos <strong>Fornecedores</strong>.
          </p>
        </div>

      <div className="flex justify-end pt-6 border-t border-[#eee]">
        <button
          data-save-trigger
          onClick={() => onSave(data)}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-lg"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar SIPOC
        </button>
      </div>
      </div>
    </div>
  );
}
