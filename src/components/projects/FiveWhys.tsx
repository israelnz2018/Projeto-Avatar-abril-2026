import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, HelpCircle, Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FiveWhysProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

interface WhyChain {
  id: string;
  problem: string;
  whys: string[];
  rootCause: string;
}

export default function FiveWhys({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: FiveWhysProps) {
  const d = initialData?.toolData || initialData;
  const [chains, setChains] = useState<WhyChain[]>(d?.chains || [
    { id: '1', problem: '', whys: ['', '', '', '', ''], rootCause: '' }
  ]);
  const isToolEmpty = chains.length === 0 || (chains.length === 1 && !chains[0].problem && chains[0].whys.every(w => !w));

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.chains) {
        setChains(data.chains);
      }
    } else {
      setChains([
        { id: '1', problem: '', whys: ['', '', '', '', ''], rootCause: '' }
      ]);
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
    <div className="space-y-8">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar 5 Porquês com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Espinha de Peixe" para gerar
                5 Porquês técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir
                uma investigação profunda e técnica.
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
                  <textarea
                    value={chain.problem || ''}
                    onChange={(e) => {
                      updateChain(chain.id, 'problem', e.target.value);
                      // Auto resize
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    placeholder="Descreva o problema que deseja analisar..."
                    rows={1}
                    className="w-full resize-none bg-white border border-[#ccc] focus:ring-2 focus:ring-blue-300 rounded-[4px] px-4 py-2 text-[14px] transition-all outline-none whitespace-normal break-words"
                    style={{ 
                      minHeight: '40px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
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
                  <textarea
                    value={why || ''}
                    onChange={(e) => {
                      updateWhy(chain.id, wIdx, e.target.value);
                      // Auto resize
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    rows={1}
                    placeholder={`Resposta para o ${wIdx + 1}º porquê...`}
                    className="w-full resize-none bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-2 py-1 transition-all whitespace-normal break-words"
                    style={{ 
                      minHeight: '32px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
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
                value={chain.rootCause || ''}
                onChange={(e) => {
                  updateChain(chain.id, 'rootCause', e.target.value);
                  // Auto resize
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onFocus={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                rows={1}
                placeholder="Qual é a causa fundamental?"
                className="w-full resize-none bg-white border border-[#bfdbfe] focus:ring-2 focus:ring-blue-300 rounded-[4px] px-4 py-2 text-[14px] transition-all outline-none whitespace-normal break-words"
                style={{ 
                  minHeight: '40px',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
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
          data-save-trigger
          onClick={() => onSave({ chains })}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar e Avançar
        </button>
      </div>
    </div>
  </div>
);
}
