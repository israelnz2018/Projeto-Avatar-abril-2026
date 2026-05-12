import React from 'react';
import { BarChart3, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StatisticalAnalysisFormProps {
  onSave: (data: any) => void;
  initialData?: any;
  allProjectData?: any;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function StatisticalAnalysisForm({ onSave }: StatisticalAnalysisFormProps) {
  const navigate = useNavigate();

  const handleAbrir = () => {
    navigate('/analysis');
  };

  // Mantém o save trigger funcionando (chamado pelo ToolWrapper)
  const handleSave = () => {
    onSave({});
  };

  return (
    <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
        <BarChart3 className="text-[#8b5cf6]" size={24} />
        <h2 className="text-[1.25rem] font-bold text-[#333]">Análise Gráfica e Estatística</h2>
      </div>

      <div className="flex justify-center py-8">
        <button
          onClick={handleAbrir}
          className="flex items-center gap-3 px-8 py-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-[8px] font-bold text-[15px] shadow-md hover:shadow-lg transition-all border-none cursor-pointer"
        >
          <BarChart3 size={20} />
          Gerar Análises Gráficas e Estatísticas
          <ArrowRight size={18} />
        </button>
      </div>

      <button data-save-trigger onClick={handleSave} className="hidden" />
    </div>
  );
}
