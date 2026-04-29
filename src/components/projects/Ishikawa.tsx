import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, HelpCircle, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface IshikawaProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function Ishikawa({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: IshikawaProps) {
  const d = initialData?.toolData || initialData;
  const [categories, setCategories] = useState<string[]>(
    d?.categories || ['Método', 'Máquina', 'Medida', 'Meio Ambiente', 'Mão de Obra', 'Material']
  );
  const [causes, setCauses] = useState<Record<string, string[]>>(
    d?.causes || {
      'Método': [],
      'Máquina': [],
      'Medida': [],
      'Meio Ambiente': [],
      'Mão de Obra': [],
      'Material': [],
    }
  );
  const [problem, setProblem] = useState(d?.problem || "Efeito/Problema Principal");
  const [headWidth, setHeadWidth] = useState(d?.headWidth || 180);
  const [headHeight, setHeadHeight] = useState(d?.headHeight || 120);

  const isResizing = useRef<{ width: boolean, height: boolean } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const container = document.getElementById('ishikawa-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    if (isResizing.current.width) {
      const newWidth = rect.right - e.clientX;
      if (newWidth > 120 && newWidth < 600) {
        setHeadWidth(newWidth);
      }
    }
    
    if (isResizing.current.height) {
      const headElement = document.getElementById('ishikawa-head');
      if (headElement) {
        const headRect = headElement.getBoundingClientRect();
        const newHeight = e.clientY - headRect.top;
        if (newHeight > 80 && newHeight < 400) {
          setHeadHeight(newHeight);
        }
      }
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, [handleMouseMove]);

  const startResizingWidth = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = { width: true, height: false };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const startResizingHeight = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = { width: false, height: true };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const startResizingBoth = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = { width: true, height: true };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const isToolEmpty = Object.values(causes).every(list => list.length === 0);

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.categories) setCategories(data.categories);
      if (data.causes) setCauses(data.causes);
      if (data.problem) setProblem(data.problem);
      if (data.headWidth) setHeadWidth(data.headWidth);
      if (data.headHeight) setHeadHeight(data.headHeight);
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
      setHeadWidth(180);
      setHeadHeight(120);
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
    <div className="space-y-8">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Espinha de Peixe com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Brainstorming" para gerar
                Espinha de Peixe técnico e específico para este projeto.
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

      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8">
      <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
        <HelpCircle className="text-[#3b82f6]" size={24} />
        <h2 className="text-[1.25rem] font-bold text-[#333]">Diagrama de Ishikawa (Espinha de Peixe)</h2>
      </div>

      <div id="ishikawa-container" className="relative bg-white p-4 md:p-8 rounded-[8px] border border-[#eee] min-h-[850px] flex flex-col overflow-x-auto">
        
        {/* Top Labels and Bones */}
        <div className="grid grid-cols-3 gap-x-24 mb-0 relative z-10" style={{ paddingRight: headWidth + 40 }}>
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
          <div className="absolute left-0 h-[10px] bg-gray-800 rounded-full shadow-lg" style={{ right: headWidth + 10 }} />
          
          {/* The "Head" */}
          <div 
            id="ishikawa-head"
            className="absolute right-0 bg-white border-4 border-gray-800 flex items-center justify-center p-4 rounded-[8px] shadow-2xl z-20 group/head"
            style={{ width: headWidth, minHeight: headHeight }}
          >
            {/* Resize Handles */}
            {/* Left handle (Width) */}
            <div 
              onMouseDown={startResizingWidth}
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-30 flex items-center justify-center"
            >
               <div className="w-0.5 h-8 bg-gray-300 group-hover/head:bg-blue-400" />
            </div>

            {/* Bottom handle (Height) */}
            <div 
              onMouseDown={startResizingHeight}
              className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-30 flex items-center justify-center"
            >
               <div className="h-0.5 w-8 bg-gray-300 group-hover/head:bg-blue-400" />
            </div>

            {/* Corner handle (Both) */}
            <div 
              onMouseDown={startResizingBoth}
              className="absolute left-0 bottom-0 w-3 h-3 cursor-nwse-resize z-40 bg-gray-200 hover:bg-blue-500 transition-colors rounded-tr-sm rounded-bl-sm flex items-center justify-center"
            >
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
            </div>

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
        <div className="grid grid-cols-3 gap-x-24 mt-0 relative z-10" style={{ paddingRight: headWidth + 40 }}>
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
          onClick={() => onSave({ causes, problem, categories, headWidth, headHeight })}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-lg"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar e Avançar
        </button>
      </div>
    </div>
  </div>
);
}
