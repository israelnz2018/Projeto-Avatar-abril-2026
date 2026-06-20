import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, BarChart3, FileText, Printer, Sparkles, Loader2, BookOpen, X, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface BeforeAfterProps {
  onSave: (data: any) => void;
  initialData?: any;
}

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Mesma estrutura real: Antes/Depois com dados quantitativos e subjetivos.
const BA_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    titulo: 'Atendimento ao cliente — antes e depois da padronização',
    before: {
      quant: ['Tempo médio de resposta: 9h', '32 reclamações/mês', 'CSAT: 3,1 de 5'],
      subj: ['Clientes reclamavam de respostas confusas', 'Equipe sem padrão de resposta', 'Retrabalho constante por dúvidas repetidas'],
    },
    after: {
      quant: ['Tempo médio de resposta: 3h', '11 reclamações/mês', 'CSAT: 4,4 de 5'],
      subj: ['Respostas claras com base no FAQ interno', 'Equipe segue SLA definido', 'Queda forte de dúvidas repetidas'],
    },
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    titulo: 'Injeção plástica — antes e depois do ajuste de processo',
    before: {
      quant: ['Refugo: 8,5% da produção', 'Paradas não programadas: 6/semana', 'OEE: 62%'],
      subj: ['Peças com rebarba frequente', 'Setup demorado e sem padrão', 'Operadores sem inspeção de primeira peça'],
    },
    after: {
      quant: ['Refugo: 2,1% da produção', 'Paradas não programadas: 1/semana', 'OEE: 81%'],
      subj: ['Parâmetros padronizados na folha de processo', 'Inspeção da primeira peça antes do lote', 'Manutenção preventiva do molde implantada'],
    },
  },
];

export default function BeforeAfterTool({ onSave, initialData }: BeforeAfterProps) {
  const [data, setData] = useState(initialData || {
    before: { quant: [], subj: [], images: [] },
    after: { quant: [], subj: [], images: [] }
  });
  const [tempInputs, setTempInputs] = useState({ beforeQuant: '', beforeSubj: '', afterQuant: '', afterSubj: '' });
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isImproving, setIsImproving] = useState(false);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  const addItem = (side: 'before' | 'after', field: 'quant' | 'subj', value: string) => {
    if (!value.trim()) return;
    setData(prev => ({
      ...prev,
      [side]: { ...prev[side], [field]: [...prev[side][field], value] }
    }));
    setTempInputs(prev => ({ ...prev, [`${side}${field.charAt(0).toUpperCase() + field.slice(1)}`]: '' }));
  };

  const removeItem = (side: 'before' | 'after', field: 'quant' | 'subj', index: number) => {
    setData(prev => ({
      ...prev,
      [side]: { ...prev[side], [field]: prev[side][field].filter((_: any, i: number) => i !== index) }
    }));
  };

  const handleImageUpload = (side: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = event.target?.result as string;
        setData(prev => ({
          ...prev,
          [side]: { ...prev[side], images: [...prev[side].images, newImage].slice(0, 2) }
        }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const removeImage = (side: 'before' | 'after', index: number) => {
    setData(prev => ({
      ...prev,
      [side]: { ...prev[side], images: prev[side].images.filter((_: any, i: number) => i !== index) }
    }));
  };

  const generateReportText = () => {
    return `Relatório de Melhoria: Antes x Depois

ANTES
Dados Quantitativos: ${data.before.quant.join(', ')}
Dados Subjetivos: ${data.before.subj.join(', ')}

DEPOIS
Dados Quantitativos: ${data.after.quant.join(', ')}
Dados Subjetivos: ${data.after.subj.join(', ')}`;
  };

  const handleGenerateReport = () => {
    setReportText(generateReportText());
    setShowReport(true);
  };

  const improveWithAI = async () => {
    setIsImproving(true);
    try {
      const { callAI } = await import('../../services/aiRouter');
      const prompt = `Melhore o seguinte relatório de melhoria, tornando as frases mais bonitas, gramaticalmente corretas e profissionais. Mantenha a estrutura de Antes e Depois.

${reportText}

Retorne apenas o texto melhorado.`;
      const { text } = await callAI({
        location: 'fill-tool',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2048,
      });
      if (text) setReportText(text);
    } catch (error: any) {
      console.error("Erro ao melhorar com IA:", error);
    } finally {
      setIsImproving(false);
    }
  };

  const renderListInput = (side: 'before' | 'after', field: 'quant' | 'subj', label: string, placeholder: string) => (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={tempInputs[`${side}${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof typeof tempInputs]}
          onChange={(e) => setTempInputs({...tempInputs, [`${side}${field.charAt(0).toUpperCase() + field.slice(1)}`]: e.target.value})}
          className="flex-1 p-3 border border-[#ccc] rounded-[4px] text-[13px]"
          placeholder={placeholder}
        />
        <button onClick={() => addItem(side, field, tempInputs[`${side}${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof typeof tempInputs])} className="bg-blue-500 text-white p-3 rounded-[4px]"><Plus size={18}/></button>
      </div>
      <ul className="space-y-1 mt-2">
        {data[side][field].map((item: string, i: number) => (
          <li key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded text-[13px]">
            <span>• {item}</span>
            <button onClick={() => removeItem(side, field, i)} className="text-red-500"><Trash2 size={14}/></button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8">
        <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
          <BarChart3 className="text-blue-500" size={24} />
          <h2 className="text-[1.25rem] font-bold text-[#333]">Antes x Depois</h2>
          <button
            onClick={() => setShowExemplo(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6 border-r border-[#eee] pr-8">
            <h3 className="text-[14px] font-black text-gray-700 uppercase tracking-widest">Antes</h3>
            {renderListInput('before', 'quant', 'Dados Quantitativos', 'Ex: 10 erros por dia')}
            {renderListInput('before', 'subj', 'Dados Subjetivos', 'Descreva a situação...')}
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Evidências (Imagens - máx 2)</label>
            <div className="flex gap-2">
              {data.before.images.map((img: string, i: number) => (
                <div key={i} className="relative w-24 h-24 border border-[#ccc] rounded-[4px] overflow-hidden">
                  <img src={img} alt="Antes" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage('before', i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><Trash2 size={12}/></button>
                </div>
              ))}
              {data.before.images.length < 2 && (
                <label className="w-24 h-24 border-2 border-dashed border-[#ccc] rounded-[4px] flex items-center justify-center cursor-pointer hover:border-blue-500">
                  <Plus size={24} className="text-[#ccc]" />
                  <input type="file" className="hidden" onChange={(e) => handleImageUpload('before', e)} accept="image/*" />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[14px] font-black text-gray-700 uppercase tracking-widest">Depois</h3>
            {renderListInput('after', 'quant', 'Dados Quantitativos', 'Ex: 2 erros por dia')}
            {renderListInput('after', 'subj', 'Dados Subjetivos', 'Descreva a situação após a melhoria...')}
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Evidências (Imagens - máx 2)</label>
            <div className="flex gap-2">
              {data.after.images.map((img: string, i: number) => (
                <div key={i} className="relative w-24 h-24 border border-[#ccc] rounded-[4px] overflow-hidden">
                  <img src={img} alt="Depois" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage('after', i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><Trash2 size={12}/></button>
                </div>
              ))}
              {data.after.images.length < 2 && (
                <label className="w-24 h-24 border-2 border-dashed border-[#ccc] rounded-[4px] flex items-center justify-center cursor-pointer hover:border-blue-500">
                  <Plus size={24} className="text-[#ccc]" />
                  <input type="file" className="hidden" onChange={(e) => handleImageUpload('after', e)} accept="image/*" />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-[#eee]">
          <button onClick={() => onSave(data)} className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600">
            <CheckCircle2 size={18} className="mr-2" /> Salvar Comparativo
          </button>
          <button onClick={handleGenerateReport} className="bg-blue-600 text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-blue-700">
            <FileText size={18} className="mr-2" /> Gerar Relatório
          </button>
        </div>
      </div>

      {showReport && (
        <div className="bg-white p-10 border border-[#ccc] rounded-[4px] shadow-lg space-y-6" id="report-content">
          <h2 className="text-2xl font-bold text-center border-b pb-4">Relatório de Melhoria</h2>
          <textarea 
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full h-64 p-4 border border-[#ccc] rounded-[4px] text-[14px] whitespace-normal break-words"
          />
          <div className="flex gap-4">
            <button onClick={improveWithAI} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center hover:bg-purple-700">
              {isImproving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Sparkles size={16} className="mr-2"/>} 
              Melhorar com IA
            </button>
            <button onClick={() => window.print()} className="bg-gray-200 text-gray-800 px-4 py-2 rounded flex items-center hover:bg-gray-300"><Printer size={16} className="mr-2"/> Imprimir/Salvar PDF</button>
          </div>
        </div>
      )}

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Antes x Depois</h3>
                  <p className="text-xs text-gray-500 m-0">{BA_EXEMPLOS[exemploIdx].titulo}</p>
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
              {BA_EXEMPLOS.map((ex, i) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6 md:border-r border-[#eee] md:pr-8">
                  <h3 className="text-[14px] font-black text-gray-700 uppercase tracking-widest">Antes</h3>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Dados Quantitativos</label>
                    <ul className="space-y-1 mt-2">
                      {BA_EXEMPLOS[exemploIdx].before.quant.map((item, i) => (
                        <li key={i} className="bg-gray-50 p-2 rounded text-[13px]">• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Dados Subjetivos</label>
                    <ul className="space-y-1 mt-2">
                      {BA_EXEMPLOS[exemploIdx].before.subj.map((item, i) => (
                        <li key={i} className="bg-gray-50 p-2 rounded text-[13px]">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[14px] font-black text-gray-700 uppercase tracking-widest">Depois</h3>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Dados Quantitativos</label>
                    <ul className="space-y-1 mt-2">
                      {BA_EXEMPLOS[exemploIdx].after.quant.map((item, i) => (
                        <li key={i} className="bg-green-50 p-2 rounded text-[13px]">• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Dados Subjetivos</label>
                    <ul className="space-y-1 mt-2">
                      {BA_EXEMPLOS[exemploIdx].after.subj.map((item, i) => (
                        <li key={i} className="bg-green-50 p-2 rounded text-[13px]">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
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
