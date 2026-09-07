import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  BarChart3,
  Layers,
  Save,
  Brain,
  ChevronRight,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { acharDadoDaFerramenta } from '@/src/services/variaveisDoProjeto';
import { DATA_NATURE_TOOL_MATRIX, type DataNatureRecommendation } from '@/src/services/dataNatureRules';
import SeletorDeVariavelX from './SeletorDeVariavelX';

interface DataNatureAssistantProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  onGenerateAI?: (prompt?: string) => void;
  isGeneratingAI?: boolean;
  allProjectData?: any;
}

interface AnalysisResult {
  id: string;
  analysisRole?: 'principal' | 'estratificacao';
  sourceCause?: string;
  projectY?: string;
  question?: string;
  rootCauseConfirmed?: boolean;
  variableY: {
    sourceName?: string;
    name: string;
    type: 'Contínuo' | 'Discreto';
    originalType: 'Contínuo' | 'Discreto';
    measurement?: string;
    description: string;
  };
  variableX: {
    sourceName?: string;
    name: string;
    type: 'Contínuo' | 'Discreto';
    originalType: 'Contínuo' | 'Discreto';
    measurement?: string;
    description: string;
  };
  quadrant: string;
  recommendedTools: string[];
  recommendations?: DataNatureRecommendation[];
  explanation: string;
}

/** Eixos da matriz. A recomendacao e mostrada destacando a celula certa,
 *  em vez de um painel separado listando 1a, 2a e 3a opcao. */
const LINHAS_MATRIZ = [
  { tipo: 'Contínuo' as const, rotulo: 'Y CONTÍNUO' },
  { tipo: 'Discreto' as const, rotulo: 'Y DISCRETO' },
];
const COLUNAS_MATRIZ = [
  { tipo: 'Contínuo' as const, rotulo: 'X CONTÍNUO' },
  { tipo: 'Discreto' as const, rotulo: 'X DISCRETO (ATRIBUTO)' },
];

export default function DataNatureAssistant({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData, allProjectData }: DataNatureAssistantProps & { onClearAIData?: () => void }) {
  const navigate = useNavigate();
  const d = initialData?.toolData || initialData;
  const [description, setDescription] = useState(d?.description || '');
  const [analyses, setAnalyses] = useState<AnalysisResult[]>(d?.analyses || []);
  const [selectedObservationId, setSelectedObservationId] = useState<string>(d?.selectedObservationId || '');
  const isToolEmpty = analyses.length === 0;
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Lista de X trazida pelo botão verde de migrar. O dropdown só aparece depois
   * que o aluno aperta o botão; antes disso, nem existe.
   */
  const [listaMigrada, setListaMigrada] = useState<{ variable: string; definition?: string; metodo?: string }[]>(
    Array.isArray(d?.variaveisDisponiveis) ? d.variaveisDisponiveis : [],
  );

  /**
   * Os Y do projeto — o EFEITO. Vêm da mesma migração dos X: a cabeça do peixe
   * (Espinha) ou as saídas com peso (Matriz Causa e Efeito).
   *
   * É aqui que o Y é usado de verdade: esta ferramenta existe pra relacionar
   * UM X com UM Y e recomendar a ferramenta estatística certa pra esse par.
   */
  const [listaY, setListaY] = useState<{ variable: string; importancia?: number }[]>(
    Array.isArray(d?.variaveisY) ? d.variaveisY : [],
  );
  const [yEscolhido, setYEscolhido] = useState<string>(d?.yEscolhido || '');

  /** Evidência já registrada na Observação Direta, por variável. */
  const evidenciaPorVariavel = React.useMemo(() => {
    const obs = acharDadoDaFerramenta(allProjectData, 'directObservation');
    const lista = Array.isArray(obs?.observations) ? obs.observations : [];
    const mapa = new Map<string, { evidencia: string; imagens: number; causaRaiz: boolean }>();
    lista.forEach((o: any) => {
      const nome = String(o?.variable || '').trim();
      if (!nome) return;
      mapa.set(nome, {
        evidencia: String(o?.observationDescription || '').trim(),
        imagens: Array.isArray(o?.images) ? o.images.length : 0,
        causaRaiz: Boolean(o?.identifiedCause),
      });
    });
    return mapa;
  }, [allProjectData]);
  /**
   * Traz UM X pra análise: monta o texto de "O que você deseja analisar?" já
   * preenchido, aproveitando a evidência se a variável tiver passado pela
   * Observação Direta. O aluno edita por cima se quiser.
   */
  /** O Y contra o qual o X vai ser analisado. Com um Y só, não há o que escolher. */
  const yAtivo = listaY.length === 1 ? listaY[0].variable : yEscolhido;

  /**
   * Traz UM X e JÁ MANDA PRA IA analisar o par X × Y.
   *
   * É o propósito da ferramenta: a IA interpreta a variável, monta a relação
   * entre X e Y, classifica os dois como Contínuo ou Discreto e recomenda qual
   * ferramenta gráfica/estatística usar — o que o aluno leva para a aba de
   * Análise de Dados.
   */
  const trazerVariavel = (escolhida: { variable: string; definition?: string; metodo?: string }) => {
    if (!yAtivo) {
      toast.error('Escolha primeiro o Y (o efeito) que você quer relacionar com esta variável.');
      return;
    }

    const registro = evidenciaPorVariavel.get(escolhida.variable);
    const linhas = [
      `Variável X: ${escolhida.variable}`,
      `Variável Y (efeito): ${yAtivo}`,
    ];
    if (escolhida.definition) linhas.push(`Definição operacional do X: ${escolhida.definition}`);
    if (escolhida.metodo) linhas.push(`Método de coleta do X: ${escolhida.metodo}`);
    if (registro?.evidencia) linhas.push(`Evidência observada no gemba: ${registro.evidencia}`);
    if (registro?.causaRaiz) linhas.push('Foi marcada como causa raiz na Observação Direta.');
    linhas.push('', `Analise a relação entre X e Y e recomende a ferramenta estatística adequada.`);

    const texto = linhas.join(String.fromCharCode(10));
    setDescription(texto);
    setSelectedObservationId(escolhida.variable);

    if (onGenerateAI) {
      onGenerateAI({ variavelX: escolhida.variable, variavelY: yAtivo, contexto: texto } as any);
      toast.success('Analisando a relação com a IA...');
    }
  };
  // Helper to get tools based on current types
  const getDynamicTools = (yType: string, xType: string) => {
    return DATA_NATURE_TOOL_MATRIX[`${yType}-${xType}`] || [];
  };

  const handleTypeChange = (analysisId: string, variable: 'X' | 'Y', newType: 'Contínuo' | 'Discreto') => {
    setAnalyses(prev => prev.map(analysis => {
      if (analysis.id !== analysisId) return analysis;

      const updated = { ...analysis };
      if (variable === 'Y') {
        updated.variableY.type = newType;
      } else {
        updated.variableX.type = newType;
      }

      updated.recommendedTools = getDynamicTools(updated.variableY.type, updated.variableX.type);
      updated.recommendations = [];
      updated.quadrant = `Y ${updated.variableY.type} / X ${updated.variableX.type}`;
      return updated;
    }));
  };

  const resetToAI = (analysisId: string) => {
    setAnalyses(prev => prev.map(analysis => {
      if (analysis.id !== analysisId) return analysis;

      const updated = { ...analysis };
      updated.variableY.type = updated.variableY.originalType;
      updated.variableX.type = updated.variableX.originalType;
      updated.recommendedTools = getDynamicTools(updated.variableY.type, updated.variableX.type);
      updated.recommendations = [];
      updated.quadrant = `Y ${updated.variableY.type} / X ${updated.variableX.type}`;
      return updated;
    }));
  };

  /**
   * Rotulo de cada analise. Uma causa que se desdobra em duas relacoes vira
   * X4.1 e X4.2, deixando visivel que as duas investigam a MESMA causa. Causa
   * que gera uma analise so continua sendo X4.
   *
   * O numero sai do proprio texto da causa ("x4: Analistas sobrecarregados").
   * Sem numero no texto, cai numa contagem sequencial.
   */
  const rotulosDasAnalises = React.useMemo(() => {
    const porCausa = new Map<string, AnalysisResult[]>();
    analyses.forEach((a) => {
      const causa = String(a.sourceCause || a.variableX?.sourceName || a.id).trim();
      if (!porCausa.has(causa)) porCausa.set(causa, []);
      porCausa.get(causa)!.push(a);
    });

    const rotulos = new Map<string, string>();
    let sequencial = 1;
    porCausa.forEach((grupo, causa) => {
      const achado = causa.match(/x\s*(\d+)/i);
      const base = achado ? achado[1] : String(sequencial++);
      grupo.forEach((a, i) => {
        rotulos.set(a.id, grupo.length > 1 ? `X${base}.${i + 1}` : `X${base}`);
      });
    });
    return rotulos;
  }, [analyses]);

  const toggleRootCause = (analysisId: string) => {
    const atualizadas = analyses.map(analysis => analysis.id === analysisId
      ? { ...analysis, rootCauseConfirmed: !analysis.rootCauseConfirmed }
      : analysis);
    setAnalyses(atualizadas);
    // Confirmar causa é uma decisão, não apenas uma edição visual. Grava
    // imediatamente para ela não se perder ao trocar de ferramenta.
    onSave({
      description,
      analyses: atualizadas,
      selectedObservationId,
      variaveisDisponiveis: listaMigrada,
      variaveisY: listaY,
      yEscolhido,
    });
  };

  const openDataAnalysis = (analysis: AnalysisResult) => {
    onSave({ description, analyses, selectedObservationId, variaveisDisponiveis: listaMigrada, variaveisY: listaY, yEscolhido });
    // Mantém a recomendação disponível durante a troca de aba. A Data Analysis
    // continua exigindo que o aluno selecione as colunas reais da planilha.
    sessionStorage.setItem('lbw-data-nature-recommendation', JSON.stringify({
      projectId: allProjectData?.__projectId || '',
      analysisId: analysis.id,
      sourceCause: analysis.sourceCause || analysis.variableX?.sourceName || '',
      analysisRole: analysis.analysisRole || 'principal',
      projectY: analysis.projectY || analysis.variableY?.sourceName || analysis.variableY?.name || '',
      question: analysis.question || '',
      variableX: analysis.variableX,
      variableY: analysis.variableY,
      recommendations: analysis.recommendations || [],
      recommendedTools: analysis.recommendedTools || [],
    }));
    navigate('/analysis');
  };

  useEffect(() => {
    if (initialData) {
      const toolData = initialData.toolData || initialData;
      setDescription(toolData.description || '');
      setAnalyses(toolData.analyses || []);
      setSelectedObservationId(toolData.selectedObservationId || '');
      if (Array.isArray(toolData.variaveisDisponiveis)) setListaMigrada(toolData.variaveisDisponiveis);
      if (Array.isArray(toolData.variaveisY)) setListaY(toolData.variaveisY);
      if (typeof toolData.yEscolhido === 'string') setYEscolhido(toolData.yEscolhido);
    }
  }, [initialData]);

  const handleAnalyze = async () => {
    if (onGenerateAI) {
      // Analise manual: o aluno escreveu o contexto por conta propria.
      onGenerateAI({ contexto: description, variavelY: yAtivo } as any);
      return;
    }
    if (!description.trim()) {
      toast.error("Por favor, descreva o que você quer analisar.");
      return;
    }
  };

  const handleSave = () => {
    onSave({ description, analyses, selectedObservationId, variaveisDisponiveis: listaMigrada, variaveisY: listaY, yEscolhido });
  };

  const removeAnalysis = (id: string) => {
    setAnalyses(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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

      <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#eee] bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-[#1f2937] text-[1.1rem]">Assistente de Natureza de Dados</h3>
              <p className="text-xs text-[#666]">Defina a natureza das suas variáveis e escolha a ferramenta estatística correta.</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#ccc] text-[#1f2937] rounded-[4px] text-xs font-bold hover:bg-gray-100 transition-all"
          >
            <Save size={14} /> Salvar
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Status Indicator */}
          {(isGeneratingAI || isAnalyzing) && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 animate-pulse mb-6">
              <Sparkles className="text-blue-500 animate-spin" size={20} />
              <span className="text-sm font-medium text-blue-700">
                A IA está buscando variáveis quantitativas e recomendando ferramentas estatísticas...
              </span>
            </div>
          )}

          {listaY.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 space-y-3">
              <div>
                <h4 className="font-black text-indigo-900 m-0">Y — o efeito que você quer mudar</h4>
                <p className="text-sm text-indigo-800/80 mt-1 mb-0">
                  {listaY.length === 1
                    ? 'Veio junto com as variáveis. Toda análise abaixo relaciona um X com este Y.'
                    : 'Escolha contra qual efeito você quer analisar as variáveis.'}
                </p>
              </div>
              {listaY.length === 1 ? (
                <p className="text-sm font-bold text-indigo-900 bg-white rounded-xl border border-indigo-200 px-4 py-3 m-0">
                  {listaY[0].variable}
                </p>
              ) : (
                <select
                  value={yEscolhido}
                  onChange={(e) => setYEscolhido(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Selecione o Y...</option>
                  {listaY.map((y) => (
                    <option key={y.variable} value={y.variable}>
                      {y.variable}{typeof y.importancia === 'number' ? ` (importância ${y.importancia})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <SeletorDeVariavelX
            disponiveis={listaMigrada}
            jaUsadas={analyses.map((a) => a.sourceCause || a.variableX?.sourceName || a.variableX?.name).filter(Boolean) as string[]}
            onAdicionar={trazerVariavel}
            titulo="Trazer variável para a análise"
            descricao="Escolha um X e aperte o botão. A IA relaciona esse X com o Y acima, classifica os dois e recomenda a ferramenta estatística certa — que você leva para a aba de Análise de Dados."
            rotuloBotao="Analisar este X"
          />
          <div className="space-y-4">
            <label className="block text-sm font-bold text-[#1f2937]">
              O que você deseja analisar? (Contexto Alternativo)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Quero entender se a temperatura do forno (X) influencia na dureza da peça final (Y)..."
              className="w-full h-32 p-4 border border-[#ccc] rounded-[4px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm resize-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isGeneratingAI || !description.trim()}
              className={cn(
                "w-full py-4 rounded-[4px] font-bold text-sm flex items-center justify-center gap-2 transition-all",
                isAnalyzing || isGeneratingAI || !description.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#1f2937] text-white hover:bg-gray-800 shadow-md"
              )}
            >
              {(isAnalyzing || isGeneratingAI) ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Activity size={18} />
                  </motion.div>
                  Analisando Mapa Estatístico...
                </>
              ) : (
                <>
                  <Search size={18} /> Analisar Variáveis (Contexto Manual)
                </>
              )}
            </button>
          </div>

          {analyses.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
              <span>{new Set(analyses.map((a) => a.variableX?.name).filter(Boolean)).size} variável(is) X identificada(s)</span>
              <span className="text-blue-300">•</span>
              <span>{analyses.filter((a) => a.rootCauseConfirmed).length} causa(s) raiz confirmada(s)</span>
            </div>
          )}

          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {analyses.map((analysis, index) => (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 pt-10 border-t border-[#eee] relative group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-8 min-w-8 px-2.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs whitespace-nowrap">
                        {rotulosDasAnalises.get(analysis.id) || `X${index + 1}`}
                      </span>
                      <div>
                        <h4 className="font-bold text-gray-800 m-0">
                          {analysis.analysisRole === 'estratificacao'
                            ? 'O fator está relacionado com a medida da causa?'
                            : 'A causa está relacionada com o problema?'}
                        </h4>
                        <p className="m-0 mt-0.5 text-xs text-slate-500">
                          {analysis.analysisRole === 'estratificacao' ? 'Análise complementar de estratificação' : 'Análise principal'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRootCause(analysis.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none",
                          analysis.rootCauseConfirmed
                            ? "bg-green-600 text-white shadow-lg shadow-green-100"
                            : "bg-slate-200 text-slate-500 hover:bg-green-100 hover:text-green-600"
                        )}
                      >
                        <CheckCircle2 size={14} />
                        {analysis.rootCauseConfirmed ? 'É Causa Raiz' : 'Confirmar Causa'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAnalysis(analysis.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                        title="Remover Análise"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {(analysis.sourceCause || analysis.question) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      {analysis.sourceCause && (
                        <p className="m-0 text-xs text-slate-600"><strong>Causa selecionada:</strong> {analysis.sourceCause}</p>
                      )}
                      {analysis.question && (
                        <p className="m-0 mt-1 text-sm font-bold text-slate-900">{analysis.question}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Variable Y */}
                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-[8px] relative overflow-hidden group/var">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/var:opacity-20 transition-opacity">
                        <Activity size={64} />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase">Variável Y</span>
                        <select 
                          value={analysis.variableY.type}
                          onChange={(e) => handleTypeChange(analysis.id, 'Y', e.target.value as 'Contínuo' | 'Discreto')}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded uppercase border-none outline-none cursor-pointer ring-1 ring-blue-200",
                            analysis.variableY.type === 'Contínuo' ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
                          )}
                        >
                          <option value="Contínuo">Contínuo</option>
                          <option value="Discreto">Discreto</option>
                        </select>
                        {analysis.variableY.type !== analysis.variableY.originalType && (
                          <span className="text-[9px] text-amber-600 font-medium flex items-center gap-1">
                            <AlertCircle size={10} /> IA: {analysis.variableY.originalType}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-[#1f2937] text-lg mb-2">{analysis.variableY.name}</h4>
                      {analysis.variableY.sourceName && analysis.variableY.sourceName !== analysis.variableY.name && (
                        <p className="text-xs text-blue-700 mb-2"><strong>Origem:</strong> {analysis.variableY.sourceName}</p>
                      )}
                      {/* measurement continua sendo gerado: e ele que vira a
                          definicao operacional da variavel na proxima ferramenta
                          da cadeia (variaveisDoProjeto). So nao ocupa a tela. */}
                      <p className="text-sm text-[#666] leading-relaxed">{analysis.variableY.description}</p>
                    </div>

                    {/* Variable X */}
                    <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[8px] relative overflow-hidden group/var">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/var:opacity-20 transition-opacity">
                        <Layers size={64} />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase">Variável X</span>
                        <select 
                          value={analysis.variableX.type}
                          onChange={(e) => handleTypeChange(analysis.id, 'X', e.target.value as 'Contínuo' | 'Discreto')}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded uppercase border-none outline-none cursor-pointer ring-1 ring-indigo-200",
                            analysis.variableX.type === 'Contínuo' ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
                          )}
                        >
                          <option value="Contínuo">Contínuo</option>
                          <option value="Discreto">Discreto</option>
                        </select>
                        {analysis.variableX.type !== analysis.variableX.originalType && (
                          <span className="text-[9px] text-amber-600 font-medium flex items-center gap-1">
                            <AlertCircle size={10} /> IA: {analysis.variableX.originalType}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-[#1f2937] text-lg mb-2">{analysis.variableX.name}</h4>
                      {analysis.variableX.sourceName && analysis.variableX.sourceName !== analysis.variableX.name && (
                        <p className="text-xs text-indigo-700 mb-2"><strong>Causa original:</strong> {analysis.variableX.sourceName}</p>
                      )}
                      <p className="text-sm text-[#666] leading-relaxed">{analysis.variableX.description}</p>
                    </div>
                  </div>

                  {/* A recomendação É a matriz: a célula do quadrante fica destacada
                      e a ferramenta escolhida vem marcada dentro dela. Uma só — as
                      outras do quadrante seguem visíveis, sem destaque. */}
                  <div className="rounded-[8px] border border-[#e5e7eb] bg-white p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-blue-600" />
                        <h4 className="m-0 text-sm font-bold text-[#1f2937]">Ferramenta recomendada</h4>
                        <span className="text-xs text-slate-500">{analysis.quadrant}</span>
                      </div>
                      {(analysis.variableX.type !== analysis.variableX.originalType || analysis.variableY.type !== analysis.variableY.originalType) && (
                        <button
                          type="button"
                          onClick={() => resetToAI(analysis.id)}
                          className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 cursor-pointer"
                        >
                          <Sparkles size={12} /> Voltar à classificação da IA
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="border border-[#eee] bg-gray-50 p-2"></th>
                            {COLUNAS_MATRIZ.map((col) => (
                              <th
                                key={col.tipo}
                                className={cn(
                                  "border border-[#eee] p-2 font-bold",
                                  analysis.variableX.type === col.tipo ? "bg-blue-100 text-blue-900" : "bg-gray-50 text-slate-400"
                                )}
                              >
                                {col.rotulo}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {LINHAS_MATRIZ.map((lin) => (
                            <tr key={lin.tipo}>
                              <th
                                className={cn(
                                  "border border-[#eee] p-2 text-center font-bold",
                                  analysis.variableY.type === lin.tipo ? "bg-blue-100 text-blue-900" : "bg-gray-50 text-slate-400"
                                )}
                              >
                                {lin.rotulo}
                              </th>
                              {COLUNAS_MATRIZ.map((col) => {
                                const ativa = analysis.variableY.type === lin.tipo && analysis.variableX.type === col.tipo;
                                const escolhida = analysis.recommendations?.[0]?.tool || '';
                                return (
                                  <td
                                    key={col.tipo}
                                    className={cn(
                                      "p-3 align-top",
                                      ativa ? "border-2 border-blue-600 bg-blue-50" : "border border-[#eee] opacity-40"
                                    )}
                                  >
                                    <ul className="m-0 list-none space-y-1 p-0">
                                      {(DATA_NATURE_TOOL_MATRIX[`${lin.tipo}-${col.tipo}`] || []).map((tool) => (
                                        <li
                                          key={tool}
                                          className={cn(
                                            "flex items-center gap-1.5",
                                            ativa && tool === escolhida ? "font-black text-blue-700" : "text-slate-500"
                                          )}
                                        >
                                          {ativa && tool === escolhida
                                            ? <CheckCircle2 size={13} className="shrink-0" />
                                            : <span className="ml-1 mr-0.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />}
                                          {tool}
                                        </li>
                                      ))}
                                    </ul>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {analysis.recommendations?.[0]?.reason && (
                      <p className="m-0 text-xs leading-relaxed text-slate-600">{analysis.recommendations[0].reason}</p>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => openDataAnalysis(analysis)}
                        className="flex items-center gap-2 rounded-lg border-none bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-500 cursor-pointer"
                      >
                        <BarChart3 size={16} /> Realizar análise <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {analyses.length === 0 && !isGeneratingAI && !isAnalyzing && (
              <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database size={32} />
                </div>
                <h4 className="text-gray-600 font-medium">Nenhuma análise gerada</h4>
                <p className="text-sm text-gray-400 mt-2">Clique em "Gerar com IA" no topo ou use o contexto manual acima.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
