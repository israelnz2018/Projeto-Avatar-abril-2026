import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface IshikawaProps {
  onSave: (data: any) => void;
  initialData?: any;
}

export default function Ishikawa({ onSave, initialData }: IshikawaProps) {
  const [categories, setCategories] = useState<string[]>(
    initialData?.categories || ['Método', 'Máquina', 'Medida', 'Meio Ambiente', 'Mão de Obra', 'Material']
  );
  const [causes, setCauses] = useState<Record<string, string[]>>(
    initialData?.causes || {
      'Método': [],
      'Máquina': [],
      'Medida': [],
      'Meio Ambiente': [],
      'Mão de Obra': [],
      'Material': [],
    }
  );
  const [problem, setProblem] = useState(initialData?.problem || "Efeito/Problema Principal");

  useEffect(() => {
    if (initialData) {
      if (initialData.categories) setCategories(initialData.categories);
      if (initialData.causes) setCauses(initialData.causes);
      if (initialData.problem) setProblem(initialData.problem);
    } else {
      // Reset to defaults
      setCategories(['Método', 'Máquina', 'Medida', 'Meio Ambiente', 'Mão de Obra', 'Material']);
      setCauses({
        'Método': [],
        'Máquina': [],
        'Medida': [],
        'Meio Ambiente': [],
        'Mão de Obra': [],
        'Material': [],
      });
      setProblem("Efeito/Problema Principal");
    }
  }, [initialData]);

  const addCause = (category: string) => {
    setCauses(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), '']
    }));
  };

  const updateCause = (category: string, index: number, value: string) => {
    setCauses(prev => {
      const newCauses = [...(prev[category] || [])];
      newCauses[index] = value;
      return { ...prev, [category]: newCauses };
    });
  };

  const removeCause = (category: string, index: number) => {
    setCauses(prev => {
      const newCauses = (prev[category] || []).filter((_, i) => i !== index);
      return { ...prev, [category]: newCauses };
    });
  };

  const updateCategoryName = (oldName: string, newName: string, index: number) => {
    if (oldName === newName) return;
    
    setCategories(prev => {
      const newCats = [...prev];
      newCats[index] = newName;
      return newCats;
    });

    setCauses(prev => {
      const { [oldName]: oldCauses, ...rest } = prev;
      return {
        ...rest,
        [newName]: oldCauses || []
      };
    });
  };

  return (
    <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8">
      <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
        <HelpCircle className="text-[#3b82f6]" size={24} />
        <h2 className="text-[1.25rem] font-bold text-[#333]">Diagrama de Ishikawa (Espinha de Peixe)</h2>
      </div>

      <div className="relative bg-white p-4 md:p-8 rounded-[8px] border border-[#eee] min-h-[850px] flex flex-col overflow-x-auto">
        
        {/* Top Labels and Bones */}
        <div className="grid grid-cols-3 gap-x-24 pr-[280px] mb-0 relative z-10">
          {categories.slice(0, 3).map((cat, idx) => (
            <div key={`${cat}-${idx}`} className="flex flex-col items-start relative min-w-[220px]">
              <input
                type="text"
                value={cat}
                onChange={(e) => updateCategoryName(cat, e.target.value, idx)}
                className="bg-[#1f2937] text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-[4px] shadow-md mb-4 w-full text-center border-none focus:ring-2 focus:ring-blue-400 outline-none"
                placeholder="Categoria..."
              />
              
              {/* Diagonal Bone Line - Leaning Left */}
              <div className="absolute left-4 bottom-0 w-[2px] h-[350px] bg-gray-300 origin-bottom -rotate-[35deg] -z-10" />

              <div className="w-full space-y-3 min-h-[300px] flex flex-col justify-end pb-4 pl-14">
                {causes[cat]?.map((cause, cIdx) => (
                  <div key={cIdx} className="flex items-start gap-1 group relative w-full">
                    {/* Horizontal branch line connecting to diagonal */}
                    <div className="absolute -left-8 top-4 w-8 h-[2px] bg-gray-300" />
                    
                    <textarea
                      value={cause}
                      onChange={(e) => updateCause(cat, cIdx, e.target.value)}
                      placeholder="Causa..."
                      rows={5}
                      className="w-full px-3 py-2 border-b border-gray-200 text-[12px] focus:outline-none focus:border-blue-500 bg-white hover:bg-gray-50 transition-all font-bold text-gray-800 resize-none leading-tight min-w-[180px] overflow-hidden scrollbar-hide"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    />
                    <button
                      onClick={() => removeCause(cat, cIdx)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all border-none bg-transparent cursor-pointer shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="pt-1">
                  <button
                    onClick={() => addCause(cat)}
                    className="flex items-center text-[9px] font-black text-blue-600 hover:text-blue-800 transition-all border-none bg-transparent cursor-pointer uppercase tracking-wider py-1 bg-blue-50 px-2 rounded shadow-sm"
                  >
                    <Plus size={12} className="mr-1" /> Causa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Spine and Head */}
        <div className="relative h-[10px] flex items-center w-full my-4">
          {/* The "Spine" */}
          <div className="absolute left-0 right-[250px] h-[10px] bg-gray-800 rounded-full shadow-lg" />
          
          {/* The "Head" */}
          <div className="absolute right-0 w-[240px] min-h-[120px] bg-white border-4 border-gray-800 flex items-center justify-center p-4 rounded-[8px] shadow-2xl z-20">
            <div className="w-full text-center">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Efeito / Problema</label>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="w-full text-center font-black text-[14px] border-none focus:outline-none resize-none bg-transparent text-gray-900 leading-tight scrollbar-hide whitespace-normal break-words"
                rows={8}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                placeholder="Qual o problema?"
              />
            </div>
          </div>
        </div>

        {/* Bottom Labels and Bones */}
        <div className="grid grid-cols-3 gap-x-24 pr-[280px] mt-0 relative z-10">
          {categories.slice(3, 6).map((cat, idx) => (
            <div key={`${cat}-${idx+3}`} className="flex flex-col items-start relative min-w-[220px]">
              <div className="w-full space-y-3 min-h-[300px] flex flex-col pt-4 pl-14">
                {/* Diagonal Bone Line - Leaning Left */}
                <div className="absolute left-4 top-0 w-[2px] h-[350px] bg-gray-300 origin-top rotate-[35deg] -z-10" />
                
                {causes[cat]?.map((cause, cIdx) => (
                  <div key={cIdx} className="flex items-start gap-1 group relative w-full">
                    {/* Horizontal branch line connecting to diagonal */}
                    <div className="absolute -left-8 top-4 w-8 h-[2px] bg-gray-300" />
                    
                    <textarea
                      value={cause}
                      onChange={(e) => updateCause(cat, cIdx, e.target.value)}
                      placeholder="Causa..."
                      rows={5}
                      className="w-full px-3 py-2 border-b border-gray-200 text-[12px] focus:outline-none focus:border-blue-500 bg-white hover:bg-gray-50 transition-all font-bold text-gray-800 resize-none leading-tight min-w-[180px] overflow-hidden scrollbar-hide"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    />
                    <button
                      onClick={() => removeCause(cat, cIdx)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all border-none bg-transparent cursor-pointer shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="pt-1">
                  <button
                    onClick={() => addCause(cat)}
                    className="flex items-center text-[9px] font-black text-blue-600 hover:text-blue-800 transition-all border-none bg-transparent cursor-pointer uppercase tracking-wider py-1 bg-blue-50 px-2 rounded shadow-sm"
                  >
                    <Plus size={12} className="mr-1" /> Causa
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={cat}
                onChange={(e) => updateCategoryName(cat, e.target.value, idx + 3)}
                className="bg-[#1f2937] text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-[4px] shadow-md mt-4 w-full text-center border-none focus:ring-2 focus:ring-blue-400 outline-none"
                placeholder="Categoria..."
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-[#eee]">
        <button
          data-save-trigger
          onClick={() => onSave({ causes, problem, categories })}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-lg"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar e Avançar
        </button>
      </div>
    </div>
  );
}
