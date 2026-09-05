import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  Upload,
  Eye,
  Plus,
  TrendingUp,
  Sparkles,
  Search,
  Save,
  Loader2,
  BookOpen,
  X,
  Info
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import SeletorDeVariavelX from './SeletorDeVariavelX';

interface ObservationEntry {
  id: string;
  variable: string;
  operationalDefinition: string;
  identifiedCause: boolean;
  observationDescription: string;
  images: string[];
  aiSuggestions?: {
    trueHypothesis: string;
    falseHypothesis: string;
  };
}

interface DirectObservationFormProps {
  onSave: (data: any) => void;
  initialData?: any;
  allProjectData?: any;
  onGenerateAI?: (prompt?: string) => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const HeaderRow = ({ title, className, isCompleted }: { title: string; className?: string; isCompleted?: boolean }) => (
  <div className={cn(
    "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
    isCompleted 
      ? "bg-green-50/50 border-green-100" 
      : "bg-white border-slate-100 shadow-sm",
    className
  )}>
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-2 rounded-lg",
        isCompleted ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-600"
      )}>
        <Eye size={20} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 font-medium tracking-tight">Gemba Walk & Validação de Causa Raiz</p>
      </div>
    </div>
    {isCompleted && (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black uppercase tracking-wider">
        <CheckCircle2 size={14} />
        Finalizado
      </div>
    )}
  </div>
);

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Mesma estrutura real do formulário: variable, operationalDefinition,
// observationDescription e identifiedCause (é causa raiz?).
type ExemploObs = { variable: string; operationalDefinition: string; observationDescription: string; identifiedCause: boolean };
const GEMBA_EXEMPLOS: { id: string; rotulo: string; contexto: string; obs: ExemploObs[] }[] = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    contexto: 'Atendimento ao cliente — fila no balcão',
    obs: [
      {
        variable: 'Tempo de espera na fila',
        operationalDefinition: 'Minutos entre a chegada do cliente e o início do atendimento, medido por senha.',
        observationDescription: 'Observei que, das 11h às 13h, apenas 2 dos 5 guichês ficam abertos. A fila chega a 14 pessoas e a espera passa de 25 minutos no horário de almoço.',
        identifiedCause: true,
      },
      {
        variable: 'Retrabalho por documento incompleto',
        operationalDefinition: 'Nº de atendimentos interrompidos por falta de documento do cliente.',
        observationDescription: 'Em 1 hora, 4 clientes voltaram para casa buscar documento. Não há aviso prévio na entrada sobre o que trazer.',
        identifiedCause: false,
      },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    contexto: 'Linha de usinagem — setup de máquina',
    obs: [
      {
        variable: 'Tempo de setup do torno',
        operationalDefinition: 'Minutos entre a última peça boa do lote anterior e a primeira peça boa do novo.',
        observationDescription: 'Cronometrei 3 setups: média de 47 min. O operador procura ferramentas em gavetas diferentes e busca o desenho na sala da supervisão a cada troca.',
        identifiedCause: true,
      },
      {
        variable: 'Organização do posto de trabalho',
        operationalDefinition: 'Presença de ferramentas e gabaritos no local de uso (padrão 5S).',
        observationDescription: 'O carrinho de ferramentas fica a 8 metros da máquina. Não há sombra/marcação de posição. O operador caminha várias vezes por troca.',
        identifiedCause: false,
      },
    ],
  },
];

export default function DirectObservationForm({ onSave, initialData, allProjectData, onGenerateAI, isGeneratingAI, onClearAIData }: DirectObservationFormProps) {
  const d = initialData?.toolData || initialData;
  // Qualitative variables from Data Collection Plan
  const qualitativeOptions = React.useMemo(() => {
    const dcData = allProjectData?.dataCollection?.toolData || allProjectData?.dataCollection;
    if (!dcData?.items || !Array.isArray(dcData.items)) return [];
    
    return dcData.items
      .filter((item: any) => item?.data?.method?.toLowerCase() === "qualitativa")
      .map((item: any) => ({
        variable: item?.data?.variable || '',
        definition: item?.data?.operationalDefinition || ''
      }));
  }, [allProjectData?.dataCollection]);

  const [observations, setObservations] = useState<ObservationEntry[]>(() => {
    if (d?.observations) {
      return d.observations;
    }
    return [
      {
        id: 'default-1',
        variable: '',
        operationalDefinition: '',
        identifiedCause: false,
        observationDescription: '',
        images: []
      }
    ];
  });

  const isToolEmpty = observations.length === 0 || (observations.length === 1 && !observations[0].variable && !observations[0].observationDescription);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  // Sync with initialData (important for AI generation and Clearing)
  useEffect(() => {
    if (initialData) {
      const toolData = initialData.toolData || initialData;
      if (Array.isArray(toolData.variaveisDisponiveis)) {
        setListaMigrada(toolData.variaveisDisponiveis);
      }
      if (Array.isArray(toolData.variaveisY)) {
        setListaY(toolData.variaveisY);
      }
      if (toolData.observations && toolData.observations.length > 0) {
        setObservations(toolData.observations);
      } else if (toolData === null || (toolData.observations && toolData.observations.length === 0)) {
        // If we have qualitative variables, auto-populate them instead of showing prompt
        if (qualitativeOptions.length > 0) {
          const autoObservations: ObservationEntry[] = qualitativeOptions.map((opt: any) => ({
            id: `auto-${crypto.randomUUID()}`,
            variable: opt.variable || 'Variável sem nome',
            operationalDefinition: opt.definition || '',
            identifiedCause: false,
            observationDescription: '',
            images: []
          }));
          setObservations(autoObservations);
        } else {
          // EXPLICIT RESET when parent sends null (Clear Data button)
          setObservations([
            {
              id: 'default-' + crypto.randomUUID(),
              variable: '',
              operationalDefinition: '',
              identifiedCause: false,
              observationDescription: '',
              images: []
            }
          ]);
        }
      }
    }
  }, [initialData, qualitativeOptions]);

  /**
   * Lista de X trazida pelo botão verde de migrar, guardada junto com os dados.
   *
   * O dropdown só existe DEPOIS que o aluno aperta o botão — antes disso ele nem
   * aparece. Era isso que deixava dois blocos verdes na tela ao mesmo tempo.
   */
  const [listaMigrada, setListaMigrada] = useState<{ variable: string; definition?: string }[]>(
    Array.isArray(d?.variaveisDisponiveis) ? d.variaveisDisponiveis : [],
  );
  /** O Y viaja junto: esta ferramenta nao usa, mas repassa pra proxima da cadeia. */
  const [listaY, setListaY] = useState<any[]>(Array.isArray(d?.variaveisY) ? d.variaveisY : []);

  /** Traz UMA variável: só aí aparece o campo pra preencher sobre ela. */
  const trazerVariavel = (escolhida: { variable: string; definition?: string }) => {
    const nova: ObservationEntry = {
      id: crypto.randomUUID(),
      variable: escolhida.variable,
      operationalDefinition: escolhida.definition || '',
      identifiedCause: false,
      observationDescription: '',
      images: [],
    };
    setObservations((prev) => {
      const soAVazia = prev.length === 1 && !prev[0].variable && !prev[0].observationDescription;
      return soAVazia ? [nova] : [...prev, nova];
    });
    toast.success(`"${escolhida.variable}" trazida para observação.`);
  };

  const addObservation = () => {
    setObservations(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        variable: '',
        operationalDefinition: '',
        identifiedCause: false,
        observationDescription: '',
        images: []
      }
    ]);
  };

  const removeObservation = (id: string) => {
    setObservations(prev => prev.filter(obs => obs.id !== id));
  };

  const updateObservation = (id: string, updates: Partial<ObservationEntry>) => {
    setObservations(prev => prev.map(obs => obs.id === id ? { ...obs, ...updates } : obs));
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const readers = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(newImages => {
        setObservations(prev => prev.map(obs => 
          obs.id === id ? { ...obs, images: [...(obs.images || []), ...newImages] } : obs
        ));
      });
    }
  };

  const removeImage = (id: string, index: number) => {
    setObservations(prev => prev.map(obs => {
      if (obs.id === id) {
        const newImages = [...(obs.images || [])];
        newImages.splice(index, 1);
        return { ...obs, images: newImages };
      }
      return obs;
    }));
  };

  const handleSave = () => {
    // A lista migrada vai junto: sem isso ela sumiria no recarregar e o aluno
    // ficaria sem o dropdown (e sem o card de migrar, que ja tinha sumido).
    onSave({ observations, variaveisDisponiveis: listaMigrada, variaveisY: listaY });
    toast.success("Dados de observação salvos com sucesso!");
  };

  const isCompleted = observations.length > 0 && observations.every(o => o.observationDescription.trim() !== '');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

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

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <HeaderRow title="Observação Direta" isCompleted={isCompleted} className="flex-1" />
        <button
          onClick={() => setShowExemplo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
        <button data-save-trigger onClick={handleSave} className="hidden" />
      </div>

      {isGeneratingAI && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 animate-pulse">
          <Sparkles className="text-blue-500 animate-spin" size={20} />
          <span className="text-sm font-medium text-blue-700">A IA está gerando hipóteses realistas para validação de causa raiz...</span>
        </div>
      )}

      <SeletorDeVariavelX
        disponiveis={listaMigrada}
        jaUsadas={observations.map((o) => o.variable)}
        onAdicionar={trazerVariavel}
        titulo="Trazer variável para observar"
        descricao="Escolha um X e aperte o botão. O campo para preencher sobre ele aparece logo abaixo. Terminou? Volte aqui e escolha o próximo."
        rotuloBotao="Trazer para observação"
      />

      <div className="space-y-8">
        {observations.map((obs, idx) => (
          <div key={obs.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-1">
                <span className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={obs.variable}
                        onChange={(e) => updateObservation(obs.id, { variable: e.target.value })}
                        placeholder="Identifique a variável..."
                        className="bg-transparent border-b border-dashed border-slate-300 text-sm font-black text-slate-800 uppercase tracking-tight focus:ring-0 focus:border-blue-500 w-full pb-1"
                      />
                    </div>
                    
                    {obs.operationalDefinition && (
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Definição: {obs.operationalDefinition}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateObservation(obs.id, { identifiedCause: !obs.identifiedCause })}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none",
                    obs.identifiedCause 
                      ? "bg-green-600 text-white shadow-lg shadow-green-100" 
                      : "bg-slate-200 text-slate-500 hover:bg-green-100 hover:text-green-600"
                  )}
                >
                  <CheckCircle2 size={14} />
                  {obs.identifiedCause ? 'É Causa Raiz' : 'Confirmar Causa'}
                </button>
                <button
                  onClick={() => removeObservation(obs.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-all cursor-pointer bg-transparent border-none"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* O que viu */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Search size={14} className="text-blue-500" /> O que viu (Observação Direta)
                  </label>
                  <textarea
                    value={obs.observationDescription}
                    onChange={(e) => updateObservation(obs.id, { observationDescription: e.target.value })}
                    placeholder="Descreva o que foi observado na prática..."
                    className="w-full h-40 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none shadow-inner"
                  />

                  {obs.aiSuggestions && (
                    <div className="space-y-3 mt-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escolha o cenário observado (IA):</p>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => {
                            updateObservation(obs.id, { 
                              observationDescription: obs.aiSuggestions!.trueHypothesis,
                              identifiedCause: true 
                            });
                          }}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all group/opt",
                            obs.observationDescription === obs.aiSuggestions.trueHypothesis
                              ? "bg-green-50 border-green-200"
                              : "bg-white border-slate-100 hover:border-green-200 hover:bg-green-50/30 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hipótese Verdadeira (Confirma Causa)</span>
                            {obs.observationDescription === obs.aiSuggestions.trueHypothesis && <CheckCircle2 size={12} className="text-green-600" />}
                          </div>
                          <p className="text-[11px] text-slate-600 italic leading-relaxed">{obs.aiSuggestions.trueHypothesis}</p>
                        </button>

                        <button
                          onClick={() => {
                            updateObservation(obs.id, { 
                              observationDescription: obs.aiSuggestions!.falseHypothesis,
                              identifiedCause: false
                            });
                          }}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all group/opt",
                            obs.observationDescription === obs.aiSuggestions.falseHypothesis
                              ? "bg-red-50 border-red-200"
                              : "bg-white border-slate-100 hover:border-red-200 hover:bg-red-50/30 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Hipótese Falsa (Nenhuma Evidência)</span>
                            {obs.observationDescription === obs.aiSuggestions.falseHypothesis && <CheckCircle2 size={12} className="text-red-600" />}
                          </div>
                          <p className="text-[11px] text-slate-600 italic leading-relaxed">{obs.aiSuggestions.falseHypothesis}</p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Imagens */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Camera size={14} className="text-blue-500" /> Registro Fotográfico
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(obs.images || []).map((img, i) => (
                      <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 shadow-sm group/img">
                        <img src={img} className="w-full h-full object-cover" alt={`Evidência ${i+1}`} referrerPolicy="no-referrer" />
                        <button
                          onClick={() => removeImage(obs.id, i)}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-lg shadow-sm opacity-0 group-hover/img:opacity-100 transition-all border-none cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group/upload">
                      <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2 group-hover/upload:bg-blue-100 transition-all">
                        <Upload size={18} className="text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600">Upload</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(obs.id, e)} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addObservation}
          className="w-full py-10 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all flex flex-col items-center justify-center gap-2 bg-transparent cursor-pointer group"
        >
          <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-100 transition-all">
            <Plus size={32} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Adicionar Nova Observação Manual</span>
        </button>
      </div>

      <div className="pt-10">
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
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Observação Direta (Gemba)</h3>
                  <p className="text-xs text-gray-500 m-0">{GEMBA_EXEMPLOS[exemploIdx].contexto}</p>
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
              {GEMBA_EXEMPLOS.map((ex, i) => (
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

            {/* Formulários de observação preenchidos */}
            <div className="p-6 space-y-5">
              {GEMBA_EXEMPLOS[exemploIdx].obs.map((o, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{o.variable}</span>
                    </div>
                    <span className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0',
                      o.identifiedCause ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'
                    )}>
                      <CheckCircle2 size={12} />
                      {o.identifiedCause ? 'É Causa Raiz' : 'Não confirmada'}
                    </span>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Definição operacional</p>
                      <p className="text-sm text-slate-600 m-0">{o.operationalDefinition}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Search size={12} className="text-blue-500" /> O que viu (observação direta)
                      </p>
                      <p className="text-sm text-slate-700 m-0 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                        {o.observationDescription}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Este exemplo é só pra consulta — <strong>não altera os seus dados</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
