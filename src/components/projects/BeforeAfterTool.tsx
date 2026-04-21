import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, BarChart3, FileText, Printer, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GoogleGenAI } from "@google/genai";

interface BeforeAfterProps {
  onSave: (data: any) => void;
  initialData?: any;
}

export default function BeforeAfterTool({ onSave, initialData }: BeforeAfterProps) {
  const [data, setData] = useState(initialData || {
    before: { quant: [], subj: [], images: [] },
    after: { quant: [], subj: [], images: [] }
  });
  const [tempInputs, setTempInputs] = useState({ beforeQuant: '', beforeSubj: '', afterQuant: '', afterSubj: '' });
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isImproving, setIsImproving] = useState(false);

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `Melhore o seguinte relatório de melhoria, tornando as frases mais bonitas, gramaticalmente corretas e profissionais. Mantenha a estrutura de Antes e Depois.
      
      ${reportText}
      
      Retorne apenas o texto melhorado.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      if (response.text) {
        setReportText(response.text);
      }
    } catch (error) {
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
            className="w-full h-64 p-4 border border-[#ccc] rounded-[4px] text-[14px]"
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
    </div>
  );
}
