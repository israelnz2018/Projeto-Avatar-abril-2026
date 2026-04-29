import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Truck, Package, Settings, PackageCheck, UserCheck, Plus, Trash2, CheckCircle2, Info, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SIPOCProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
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

const Column = ({ title, icon: Icon, color, placeholder, items = [], onUpdate, onRemove, onAdd }: ColumnProps) => (
  <div className="flex-1 min-w-[200px] flex flex-col bg-white border border-[#ccc] rounded-[4px] overflow-hidden shadow-sm">
    <div className={cn("p-4 flex items-center gap-2 border-b border-[#eee]", color)}>
      <Icon size={20} className="text-white" />
      <h3 className="text-white font-bold text-[14px] uppercase tracking-wider">{title}</h3>
    </div>
    <div className="px-2 py-4 flex-1 space-y-2 bg-[#fcfcfc]">
      {(items || []).map((item: string, idx: number) => (
        <div key={idx} className="flex items-center gap-1 group relative">
          <textarea
            value={item || ''}
            onChange={(e) => {
              onUpdate(idx, e.target.value);
              // Auto resize
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onFocus={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-white border border-[#eee] focus:ring-2 focus:ring-blue-300 rounded-[2px] px-2 py-2 text-[12px] transition-all outline-none whitespace-normal break-words overflow-hidden"
            style={{ 
              minHeight: '40px',
              lineHeight: '1.5',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
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

export default function SIPOC({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: SIPOCProps) {
  const defaultData = {
    suppliers: [],
    inputs: [],
    process: [],
    outputs: [],
    customers: []
  };

  const [data, setData] = useState(() => {
    if (!initialData) return defaultData;
    const d = initialData.toolData || initialData;
    return {
      suppliers: Array.isArray(d.suppliers) ? d.suppliers : [],
      inputs: Array.isArray(d.inputs) ? d.inputs : [],
      process: Array.isArray(d.process) ? d.process : [],
      outputs: Array.isArray(d.outputs) ? d.outputs : [],
      customers: Array.isArray(d.customers) ? d.customers : [],
    };
  });

  const isToolEmpty = data.suppliers.length === 0 && 
                     data.inputs.length === 0 && 
                     data.process.length === 0 && 
                     data.outputs.length === 0 && 
                     data.customers.length === 0;

  useEffect(() => {
    if (initialData) {
      const d = initialData.toolData || initialData;
      setData({
        suppliers: Array.isArray(d.suppliers) ? d.suppliers : defaultData.suppliers,
        inputs: Array.isArray(d.inputs) ? d.inputs : defaultData.inputs,
        process: Array.isArray(d.process) ? d.process : defaultData.process,
        outputs: Array.isArray(d.outputs) ? d.outputs : defaultData.outputs,
        customers: Array.isArray(d.customers) ? d.customers : defaultData.customers,
      });
    } else {
      setData(defaultData);
    }
  }, [initialData]);

  useLayoutEffect(() => {
    // Automatically adjust height of all textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((t) => {
      const el = t as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }, [data]);

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
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar SIPOC com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Entendendo o Problema e Project Charter" para gerar
                SIPOC técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir
                um mapeamento rigoroso e técnico.
              </p>
            </div>
            <button
              onClick={() => onGenerateAI?.()}
              disabled={isGeneratingAI}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none shrink-0",
                isGeneratingAI
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-lg shadow-blue-100"
              )}
            >
              {isGeneratingAI
                ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={16} /> Gerar com IA</>
              }
            </button>
          </div>
        </div>
      )}

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
