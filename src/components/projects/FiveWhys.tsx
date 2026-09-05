import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, HelpCircle, Sparkles, X, Loader2, BookOpen, Info } from 'lucide-react';
import SeletorDeVariavelX from './SeletorDeVariavelX';
import { cn } from '@/src/lib/utils';

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Cada exemplo é uma cadeia de 5 Porquês encadeados, no MESMO formato da ferramenta.
const FIVE_WHYS_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    problem: 'O fechamento contábil do mês atrasou 4 dias úteis.',
    whys: [
      'Porque os lançamentos de notas fiscais chegaram incompletos ao financeiro.',
      'Porque várias áreas enviaram as notas só no último dia do mês.',
      'Porque não existe um prazo interno definido pra envio das notas.',
      'Porque ninguém foi designado como responsável por cobrar esse prazo.',
      'Porque o processo de fechamento nunca foi formalmente mapeado e padronizado.',
    ],
    rootCause: 'Ausência de um processo de fechamento padronizado, com prazos internos e responsável definido pela cobrança.',
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    problem: 'A linha de montagem parou por 2 horas no turno da manhã.',
    whys: [
      'Porque a esteira transportadora travou no meio da produção.',
      'Porque o motor da esteira superaqueceu e desarmou.',
      'Porque o rolamento do motor estava sem lubrificação.',
      'Porque a lubrificação preventiva não foi feita no prazo previsto.',
      'Porque o plano de manutenção preventiva não estava sendo seguido nem auditado.',
    ],
    rootCause: 'Falha na execução e no acompanhamento do plano de manutenção preventiva dos equipamentos da linha.',
  },
];

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

  /**
   * Lista de X trazida pelo botão verde de migrar. O dropdown só aparece depois
   * que o aluno aperta esse botão; antes disso, nem existe.
   */
  const [listaMigrada, setListaMigrada] = useState<{ variable: string; definition?: string }[]>(
    Array.isArray(d?.variaveisDisponiveis) ? d.variaveisDisponiveis : [],
  );

  /** Traz UM X: vira o "Problema / Efeito" de uma nova cadeia de porquês. */
  const trazerVariavel = (escolhida: { variable: string }) => {
    const nova: WhyChain = {
      id: crypto.randomUUID(),
      problem: escolhida.variable,
      whys: ['', '', '', '', ''],
      rootCause: '',
    };
    setChains((prev) => {
      const soAVazia = prev.length === 1 && !prev[0].problem && prev[0].whys.every((w) => !w);
      return soAVazia ? [nova] : [...prev, nova];
    });
  };

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura
  const isToolEmpty = chains.length === 0 || (chains.length === 1 && !chains[0].problem && chains[0].whys.every(w => !w));

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (Array.isArray(data.variaveisDisponiveis)) {
        setListaMigrada(data.variaveisDisponiveis);
      }
      if (data.chains && data.chains.length > 0) {
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
        <button
          onClick={() => setShowExemplo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
      </div>

      {isGeneratingAI && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3 animate-pulse">
          <Sparkles className="text-blue-500 animate-spin" size={20} />
          <span className="text-sm font-medium text-blue-700">A IA está gerando uma recomendação técnica para o seu problema...</span>
        </div>
      )}

      <SeletorDeVariavelX
        disponiveis={listaMigrada}
        jaUsadas={chains.map((c) => c.problem)}
        onAdicionar={trazerVariavel}
        titulo="Trazer variável para investigar"
        descricao="Escolha um X e aperte o botão. A cadeia de porquês para ele aparece logo abaixo. Terminou? Volte aqui e escolha o próximo."
        rotuloBotao="Investigar este X"
      />

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

      <button data-save-trigger onClick={() => onSave({ chains, variaveisDisponiveis: listaMigrada })} className="hidden" />
    </div>

    {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
    {showExemplo && (
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setShowExemplo(false)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-blue-600" />
              <div>
                <h3 className="text-base font-black text-gray-800 m-0">Exemplo de 5 Porquês</h3>
                <p className="text-xs text-gray-500 m-0">{FIVE_WHYS_EXEMPLOS[exemploIdx].problem}</p>
              </div>
            </div>
            <button
              onClick={() => setShowExemplo(false)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Abas — Escritório / Manufatura */}
          <div className="flex gap-2 px-6 pt-4">
            {FIVE_WHYS_EXEMPLOS.map((ex, i) => (
              <button
                key={ex.id}
                onClick={() => setExemploIdx(i)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                  exemploIdx === i
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                )}
              >
                {ex.rotulo}
              </button>
            ))}
          </div>

          <div className="p-6">
            <div className="p-6 bg-[#f9f9f9] rounded-[8px] border border-[#eee] space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-[#666] uppercase tracking-wider mb-2">
                  Problema / Efeito
                </label>
                <div className="w-full bg-white border border-[#ccc] rounded-[4px] px-4 py-2 text-[14px] text-gray-800">
                  {FIVE_WHYS_EXEMPLOS[exemploIdx].problem}
                </div>
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-[#3b82f6]">
                {FIVE_WHYS_EXEMPLOS[exemploIdx].whys.map((why, wIdx) => (
                  <div key={wIdx} className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider">
                      {wIdx + 1}º Porquê?
                    </label>
                    <p className="text-sm font-medium text-gray-800 px-2 py-1 m-0">{why}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#eff6ff] p-4 rounded-[4px] border border-[#bfdbfe]">
                <label className="block text-[11px] font-bold text-[#1e40af] uppercase tracking-wider mb-2">
                  Causa Raiz Identificada
                </label>
                <p className="text-[14px] text-gray-800 m-0 bg-white border border-[#bfdbfe] rounded-[4px] px-4 py-2">
                  {FIVE_WHYS_EXEMPLOS[exemploIdx].rootCause}
                </p>
              </div>
            </div>

            <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
              <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-amber-800 leading-relaxed m-0">
                Este exemplo é só pra consulta — não altera os seus dados.
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
