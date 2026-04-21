import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, CheckCircle2, FileText, LineChart, PieChart, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

interface StatAnalysisEntry {
  id: string;
  variable: string;
  analysisType: string;
  graphImage: string;
  interpretation: string;
}

interface StatisticalAnalysisFormProps {
  onSave: (data: any) => void;
  initialData?: any;
  allProjectData?: any;
  isGeneratingAI?: boolean;
}

export default function StatisticalAnalysisForm({ onSave, initialData, allProjectData, isGeneratingAI }: StatisticalAnalysisFormProps) {
  const [analyses, setAnalyses] = useState<StatAnalysisEntry[]>(initialData?.analyses || [
    {
      id: '1',
      analysisType: '',
      variable: '',
      graphImage: '',
      interpretation: ''
    }
  ]);

  useEffect(() => {
    if (initialData?.analyses && initialData.analyses.length > 0) {
      setAnalyses(initialData.analyses);
    } else if (initialData === null) {
      // If data was cleared, don't auto-sync quantitative variables again to avoid confusion
      // Reset to empty initial state
      setAnalyses([
        {
          id: '1',
          analysisType: '',
          variable: '',
          graphImage: '',
          interpretation: ''
        }
      ]);
    }
  }, [initialData]);

  // Sync quantitative variables from Data Collection Plan
  useEffect(() => {
    // Only sync if it's the first load (initialState is undefined)
    if (initialData === undefined) {
      const dcData = allProjectData?.dataCollection?.toolData || allProjectData?.dataCollection;
      const dataCollection = dcData?.items || [];
      const quantVariables = dataCollection
        .filter((item: any) => item.data?.method?.toLowerCase() === 'quantitativa')
        .map((item: any) => item.data?.variable)
        .filter((v: string) => v && v.trim() !== '');

      if (quantVariables.length > 0) {
        const newAnalyses = quantVariables.map((v: string, idx: number) => ({
          id: `auto-${idx}-${Date.now()}`,
          variable: v,
          analysisType: 'Histograma / Boxplot', // Suggestion
          graphImage: '',
          interpretation: ''
        }));
        setAnalyses(newAnalyses);
      }
    }
  }, [allProjectData, initialData]);

  const addAnalysis = () => {
    setAnalyses(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        analysisType: '',
        variable: '',
        graphImage: '',
        interpretation: ''
      }
    ]);
  };

  const removeAnalysis = (id: string) => {
    setAnalyses(prev => prev.filter(a => a.id !== id));
  };

  const updateAnalysis = (id: string, updates: Partial<StatAnalysisEntry>) => {
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateAnalysis(id, { graphImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({ analyses });
  };

  return (
    <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-10">
      {isGeneratingAI && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 animate-pulse">
          <Sparkles className="text-blue-500 animate-spin" size={20} />
          <span className="text-sm font-medium text-blue-700">A IA está analisando suas variáveis e sugerindo as melhores ferramentas estatísticas...</span>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-[#eee] pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-[#8b5cf6]" size={24} />
          <h2 className="text-[1.25rem] font-bold text-[#333]">Análise Gráfica e Estatística</h2>
        </div>
      </div>

      <div className="space-y-12">
        {analyses.map((analysis, idx) => (
          <div key={analysis.id} className="p-8 rounded-[8px] border border-[#eee] bg-white hover:border-[#ccc] transition-all space-y-8 relative">
            <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#8b5cf6] text-white rounded-full flex items-center justify-center font-bold text-[16px] shadow-md">
              {idx + 1}
            </div>

            <button
              onClick={() => removeAnalysis(analysis.id)}
              className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded transition-all border-none bg-transparent cursor-pointer"
              title="Remover análise"
            >
              <Trash2 size={18} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                  <Activity size={12} /> Variável Analisada
                </label>
                <input
                  type="text"
                  value={analysis.variable}
                  onChange={(e) => updateAnalysis(analysis.id, { variable: e.target.value })}
                  placeholder="Ex: Tempo de ciclo (min), Diâmetro (mm)"
                  className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                  Tipo de Análise
                </label>
                <input
                  type="text"
                  value={analysis.analysisType}
                  onChange={(e) => updateAnalysis(analysis.id, { analysisType: e.target.value })}
                  placeholder="Ex: Histograma, Boxplot, Carta de Controle"
                  className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              <div className="space-y-2 flex flex-col h-full">
                <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                  <LineChart size={12} /> Gráfico / Tabela
                </label>
                <div className="flex-1 relative group bg-gray-50 rounded-[4px] min-h-[250px] flex items-center justify-center">
                  {analysis.graphImage ? (
                    <div className="relative w-full h-full p-2">
                      <img 
                        src={analysis.graphImage} 
                        alt="Gráfico" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={() => updateAnalysis(analysis.id, { graphImage: '' })}
                        className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white text-red-500 rounded-full shadow-sm border-none cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-[#ccc] rounded-[4px] cursor-pointer hover:border-[#8b5cf6] hover:bg-purple-50 transition-all p-4">
                      <Upload className="text-[#999] mb-2" size={24} />
                      <span className="text-[12px] text-[#666]">Upload do gráfico ou tabela</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(analysis.id, e)}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex flex-col space-y-2 h-full">
                <label className="text-[11px] font-bold text-[#666] uppercase flex items-center gap-1">
                  <FileText size={12} /> Interpretação dos Resultados
                </label>
                <textarea
                  value={analysis.interpretation}
                  onChange={(e) => updateAnalysis(analysis.id, { interpretation: e.target.value })}
                  placeholder="O que esses dados dizem sobre o problema?"
                  className="flex-1 w-full p-4 border border-[#ccc] rounded-[4px] text-[14px] focus:outline-none focus:border-[#8b5cf6] resize-none min-h-[250px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addAnalysis}
        className="w-full py-6 border-2 border-dashed border-[#ccc] rounded-[8px] text-[#666] hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-all flex items-center justify-center font-bold bg-transparent cursor-pointer"
      >
        <Plus size={20} className="mr-2" /> Adicionar Nova Análise
      </button>

      <div className="flex justify-end pt-6 border-t border-[#eee]">
        <button
          onClick={handleSave}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar e Avançar
        </button>
      </div>
    </div>
  );
}
