import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Info,
  Save,
  Brain,
  ChevronRight,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'sonner';

interface DataNatureAssistantProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (prompt?: string) => void;
  isGeneratingAI?: boolean;
}

interface AnalysisResult {
  id: string;
  variableY: {
    name: string;
    type: 'Contínuo' | 'Discreto';
    originalType: 'Contínuo' | 'Discreto';
    description: string;
  };
  variableX: {
    name: string;
    type: 'Contínuo' | 'Discreto';
    originalType: 'Contínuo' | 'Discreto';
    description: string;
  };
  quadrant: string;
  recommendedTools: string[];
  explanation: string;
}

const TOOL_MATRIX: Record<string, string[]> = {
  'Contínuo-Contínuo': ['Diagrama de Dispersão', 'Gráfico de tendência', 'Regressão simples', 'Regressão múltipla'],
  'Contínuo-Discreto': ['Box Plot', 'Teste de Hipótese', 'ANOVA'],
  'Discreto-Contínuo': ['Regressão Logística (Binária/Ordinal/Nominal)'],
  'Discreto-Discreto': ['Histograma', 'Pareto', 'Chi Quadrado'],
};

export default function DataNatureAssistant({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: DataNatureAssistantProps & { onClearAIData?: () => void }) {
  const d = initialData?.toolData || initialData;
  const [description, setDescription] = useState(d?.description || '');
  const [analyses, setAnalyses] = useState<AnalysisResult[]>(d?.analyses || []);
  const isToolEmpty = analyses.length === 0;
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper to get tools based on current types
  const getDynamicTools = (yType: string, xType: string) => {
    return TOOL_MATRIX[`${yType}-${xType}`] || [];
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
      updated.quadrant = `Y ${updated.variableY.type} / X ${updated.variableX.type}`;
      return updated;
    }));
  };

  useEffect(() => {
    if (initialData) {
      const toolData = initialData.toolData || initialData;
      setDescription(toolData.description || '');
      setAnalyses(toolData.analyses || []);
    }
  }, [initialData]);

  const handleAnalyze = async () => {
    if (onGenerateAI) {
      onGenerateAI(description);
      return;
    }
    if (!description.trim()) {
      toast.error("Por favor, descreva o que você quer analisar.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise a seguinte descrição de um problema ou análise de dados de um projeto Lean Six Sigma: "${description}"
        
        Identifique a Variável Resposta (Y) e a Fonte de Variação (X).
        Determine se cada uma é Contínua ou Discreta (Atributo).
        
        Use a seguinte matriz de decisão:
        - Se Y é Contínuo e X é Contínuo: Quadrante "Y Contínuo / X Contínuo". Ferramentas: Diagrama de Dispersão, Gráfico de tendência, Regressão simples, Regressão múltipla.
        - Se Y é Contínuo e X é Discreto: Quadrante "Y Contínuo / X Discreto". Ferramentas: Box Plot, Teste de Hipótese, ANOVA.
        - Se Y é Discreto e X é Contínuo: Quadrante "Y Discreto / X Contínuo". Ferramentas: Regressão Logística (Binária/Ordinal/Nominal).
        - Se Y é Discreto e X é Discreto: Quadrante "Y Discreto / X Discreto". Ferramentas: Histograma, Pareto, Chi Quadrado.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variableY: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["Contínuo", "Discreto"] },
                  description: { type: Type.STRING }
                },
                required: ["name", "type", "description"]
              },
              variableX: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["Contínuo", "Discreto"] },
                  description: { type: Type.STRING }
                },
                required: ["name", "type", "description"]
              },
              quadrant: { type: Type.STRING },
              recommendedTools: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              explanation: { type: Type.STRING }
            },
            required: ["variableY", "variableX", "quadrant", "recommendedTools", "explanation"]
          }
        }
      });

      const analysis = JSON.parse(response.text || '{}');
      analysis.id = Date.now().toString();
      analysis.variableY.originalType = analysis.variableY.type;
      analysis.variableX.originalType = analysis.variableX.type;
      
      setAnalyses([analysis]);
      toast.success("Análise concluída com sucesso!");
    } catch (error) {
      console.error("Erro na análise da IA:", error);
      toast.error("Erro ao analisar os dados. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    onSave({ description, analyses });
  };

  const removeAnalysis = (id: string) => {
    setAnalyses(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Identificar Natureza dos Dados com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA vai analisar os dados coletados na ferramenta anterior para sugerir quais variáveis são Contínuas ou Discretas.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA analisará o plano de coleta para classificar as variáveis e sugerir ferramentas estatísticas.
              </p>
            </div>
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-[4px] text-xs font-bold hover:bg-green-700 transition-all"
          >
            <Save size={14} /> Salvar Progresso
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
                  Analisando Natureza dos Dados...
                </>
              ) : (
                <>
                  <Search size={18} /> Analisar Variáveis (Contexto Manual)
                </>
              )}
            </button>
          </div>

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
                  <button
                    onClick={() => removeAnalysis(analysis.id)}
                    className="absolute top-4 right-0 p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover Análise"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <h4 className="font-bold text-gray-800">Análise de Relacionamento</h4>
                  </div>

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
                      <p className="text-sm text-[#666] leading-relaxed">{analysis.variableX.description}</p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="p-8 bg-[#1f2937] text-white rounded-[8px] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <BarChart3 size={120} />
                    </div>
                    
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xl text-white">Recomendação de Ferramentas</h4>
                            <p className="text-blue-200 text-sm">{analysis.quadrant}</p>
                          </div>
                        </div>

                        {(analysis.variableX.type !== analysis.variableX.originalType || analysis.variableY.type !== analysis.variableY.originalType) && (
                          <button 
                            onClick={() => resetToAI(analysis.id)}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[10px] font-bold transition-all flex items-center gap-2"
                          >
                            <Sparkles size={12} /> Resetar para Recomendação da IA
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {analysis.recommendedTools.map((tool, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white/10 p-4 rounded-[4px] border border-white/10 hover:bg-white/20 transition-all">
                            <div className="w-2 h-2 bg-blue-400 rounded-full" />
                            <span className="font-bold text-sm text-white">{tool}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-white/5 rounded-[4px] border border-white/5">
                        <div className="flex items-start gap-3">
                          <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-300 leading-relaxed italic">
                            {analysis.explanation}
                          </p>
                        </div>
                      </div>
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

      {/* Reference Matrix */}
      <div className="bg-white border border-[#ccc] rounded-[8px] p-6">
        <h4 className="font-bold text-[#1f2937] mb-6 flex items-center gap-2">
          <Database size={18} className="text-blue-600" />
          Matriz de Natureza dos Dados
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-[#eee] p-4 bg-gray-50"></th>
                <th className="border border-[#eee] p-4 bg-blue-50 text-blue-800 font-bold">X CONTÍNUO</th>
                <th className="border border-[#eee] p-4 bg-purple-50 text-purple-800 font-bold">X DISCRETO (ATRIBUTO)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#eee] p-4 bg-blue-50 text-blue-800 font-bold text-center">Y CONTÍNUO</td>
                <td className="border border-[#eee] p-4 text-[#666]">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Diagrama de Dispersão</li>
                    <li>Gráfico de tendência</li>
                    <li>Regressão simples</li>
                    <li>Regressão múltipla</li>
                  </ul>
                </td>
                <td className="border border-[#eee] p-4 text-[#666]">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Box Plot</li>
                    <li>Teste de Hipótese</li>
                    <li>ANOVA</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td className="border border-[#eee] p-4 bg-purple-50 text-purple-800 font-bold text-center">Y DISCRETO</td>
                <td className="border border-[#eee] p-4 text-[#666]">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Regressão Logística</li>
                  </ul>
                </td>
                <td className="border border-[#eee] p-4 text-[#666]">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Histograma</li>
                    <li>Pareto</li>
                    <li>Chi Quadrado</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
