import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, HelpCircle, Sparkles, X } from 'lucide-react';

interface FiveWhysProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (prompt?: string) => void;
  isGeneratingAI?: boolean;
}

interface WhyChain {
  id: string;
  problem: string;
  whys: string[];
  rootCause: string;
}

export default function FiveWhys({ onSave, initialData, onGenerateAI, isGeneratingAI }: FiveWhysProps) {
  const [chains, setChains] = useState<WhyChain[]>(initialData?.chains || [
    { id: '1', problem: '', whys: ['', '', '', '', ''], rootCause: '' }
  ]);

  useEffect(() => {
    if (initialData?.chains) {
      setChains(initialData.chains);
    }
  }, [initialData]);

  const handleAI = () => {
    if (onGenerateAI) {
      onGenerateAI("Ajude-me a realizar uma análise de 5 Porquês para o problema central do projeto.");
    }
  };

  const addChain = () => {
    setChains(prev => [
      ...prev,
      { id: Date.now().toString(), problem: '', whys: ['', '', '', '', ''], rootCause: '' }
    ]);
  };

  const removeChain = (id: string) => {
    setChains(prev => prev.filter(c => c.id !== id));
  };

  const updateChain = (id: string, field: keyof WhyChain, value: any) => {
    setChains(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateWhy = (chainId: string, index: number, value: string) => {
    setChains(prev => prev.map(c => {
      if (c.id === chainId) {
        const newWhys = [...c.whys];
        newWhys[index] = value;
        return { ...c, whys: newWhys };
      }
      return c;
    }));
  };

  const addWhyToChain = (chainId: string) => {
    setChains(prev => prev.map(c => {
      if (c.id === chainId) {
        return { ...c, whys: [...c.whys, ''] };
      }
      return c;
    }));
  };

  const removeWhyFromChain = (chainId: string, index: number) => {
    setChains(prev => prev.map(c => {
      if (c.id === chainId && c.whys.length > 1) {
        const newWhys = [...c.whys];
        newWhys.splice(index, 1);
        return { ...c, whys: newWhys };
      }
      return c;
    }));
  };

  return (
    <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8">
      <div className="flex items-center justify-between border-b border-[#eee] pb-4">
        <div className="flex items-center gap-3">
          <HelpCircle className="text-[#3b82f6]" size={24} />
          <h2 className="text-[1.25rem] font-bold text-[#333]">Análise dos 5 Porquês</h2>
        </div>
      </div>

      {isGeneratingAI && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3 animate-pulse">
          <Sparkles className="text-blue-500 animate-spin" size={20} />
          <span className="text-sm font-medium text-blue-700">A IA está gerando uma recomendação técnica para o seu problema...</span>
        </div>
      )}

      <div className="space-y-12">
        {chains.map((chain, idx) => (
          <div key={chain.id} className="relative p-6 bg-[#f9f9f9] rounded-[8px] border border-[#eee] space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-[#666] uppercase tracking-wider mb-2">
                  Problema / Efeito #{idx + 1}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chain.problem}
                    onChange={(e) => updateChain(chain.id, 'problem', e.target.value)}
                    placeholder="Descreva o problema que deseja analisar..."
                    className="w-full px-4 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>
              {chains.length > 1 && (
                <button
                  onClick={() => removeChain(chain.id)}
                  className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded transition-all border-none bg-transparent cursor-pointer"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-4 pl-4 border-l-2 border-[#3b82f6]">
              {chain.whys.map((why, wIdx) => (
                <div key={wIdx} className="group relative space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider">
                      {wIdx + 1}º Porquê?
                    </label>
                    {chain.whys.length > 1 && (
                      <button
                        onClick={() => removeWhyFromChain(chain.id, wIdx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer"
                        title="Remover este nível"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={why}
                    onChange={(e) => updateWhy(chain.id, wIdx, e.target.value)}
                    placeholder={`Resposta para o ${wIdx + 1}º porquê...`}
                    className="w-full px-4 py-2 border-b border-[#eee] text-[13px] focus:outline-none focus:border-[#3b82f6] bg-transparent"
                  />
                </div>
              ))}
              
              <button
                onClick={() => addWhyToChain(chain.id)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#3b82f6] hover:text-[#2563eb] mt-2 border-none bg-transparent cursor-pointer transition-colors"
              >
                <Plus size={14} /> Adicionar Próximo Porquê
              </button>
            </div>

            <div className="bg-[#eff6ff] p-4 rounded-[4px] border border-[#bfdbfe]">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-[#1e40af] uppercase tracking-wider">
                  Causa Raiz Identificada
                </label>
                <span className="text-[10px] text-blue-600 font-medium italic">Baseado na análise acima</span>
              </div>
              <textarea
                value={chain.rootCause}
                onChange={(e) => updateChain(chain.id, 'rootCause', e.target.value)}
                placeholder="Qual é a causa fundamental?"
                className="w-full px-4 py-2 border border-[#bfdbfe] rounded-[4px] text-[14px] focus:outline-none focus:border-[#1e40af] bg-white resize-none"
                rows={2}
              />
            </div>
          </div>
        ))}

        <button
          onClick={addChain}
          className="w-full py-4 border-2 border-dashed border-[#ccc] rounded-[8px] text-[#666] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-all flex items-center justify-center font-bold bg-transparent cursor-pointer"
        >
          <Plus size={20} className="mr-2" /> Adicionar Nova Análise
        </button>
      </div>

      <div className="flex justify-end pt-6 border-t border-[#eee]">
        <button
          onClick={() => onSave({ chains })}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar e Avançar
        </button>
      </div>
    </div>
  );
}
