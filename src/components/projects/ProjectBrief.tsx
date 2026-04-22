import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle2, FileText, Image as ImageIcon, X, Sparkles, Loader2, AlertTriangle, FileDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/src/lib/utils';

interface ProjectBriefProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  previousToolData?: any;
  project?: any;
  isLeanSixSigma?: boolean;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
}

export default function ProjectBrief({ 
  onSave, 
  initialData, 
  previousToolData, 
  project,
  isLeanSixSigma,
  onGenerateAI,
  isGeneratingAI
}: ProjectBriefProps) {
  const [answers, setAnswers] = useState(initialData?.answers || {
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
    q7: '', q8: '', q10: '', q12: ''
  });
  
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.answers) setAnswers(initialData.answers);
      if (initialData.images) setImages(initialData.images);
    } else {
      // Reset to defaults
      setAnswers({
        q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
        q7: '', q8: '', q10: '', q12: ''
      });
      setImages([]);
    }
  }, [initialData]);

  const handleAnswerChange = (q: string, value: string) => {
    const newAnswers = { ...answers, [q]: value };
    setAnswers(newAnswers);
    onSave({ answers: newAnswers, images }, { silent: true });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = [...images];
    Array.from(files).forEach(file => {
      if (newImages.length >= 2) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        newImages.push(result);
        setImages([...newImages]);
        onSave({ answers, images: [...newImages] }, { silent: true });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onSave({ answers, images: newImages }, { silent: true });
  };

  const questions = [
    { id: 'q1', label: '1. Qual é o nome do processo que você quer melhorar?', section: 'Sobre o novo processo' },
    { id: 'q2', label: '2. Qual é o principal problema hoje (em 1–2 frases)?', section: 'Sobre o novo processo' },
    { id: 'q3', label: '3. Quem são os principais envolvidos (áreas ou fornecedores)?', section: 'Sobre o novo processo' },
    { id: 'q4', label: '4. O que está dando errado na prática? (ex: atraso, retrabalho, falta de padrão, erro, etc.)', section: 'Sobre o problema' },
    { id: 'q5', label: '5. Existe algum risco? (financeiro, cliente, compliance, etc.)', section: 'Sobre o problema' },
    { id: 'q6', label: '6. O que você quer melhorar exatamente?', section: 'Sobre objetivo' },
    { id: 'q7', label: '7. Existe alguma meta clara? (tempo, qualidade, custo, volume, etc.)', section: 'Sobre objetivo' },
    { id: 'q8', label: '8. O que vai melhorar se der certo? (ex: menos custo, mais rapidez, melhor experiência, etc.)', section: 'Sobre benefícios' },
    { id: 'q10', label: '9. Quais são os próximos passos que você já tem em mente?', section: 'Sobre andamento' },
    { id: 'q12', label: '10. Que tipo de ajuda você precisa?', section: 'Sobre dificuldades' },
  ];

  const firstColumn = questions.slice(0, 5);
  const secondColumn = questions.slice(5, 10);

  const handleSave = () => {
    onSave({ answers, images });
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
Você é um consultor sênior de Lean Six Sigma. Com base nos dados abaixo do formulário "Entendendo o Problema", gere um relatório executivo profissional em HTML com design moderno e bonito.

DADOS DO FORMULÁRIO:
${JSON.stringify(answers, null, 2)}

INSTRUÇÕES DE CONTEÚDO:
- Melhore e expanda cada resposta com linguagem técnica e executiva
- Organize em seções claras: Contexto do Projeto, Problema Central, Impacto no Negócio, Metas e Objetivos, Próximos Passos Recomendados
- Seja conciso mas completo — máximo 1 página A4

INSTRUÇÕES DE DESIGN (HTML):
- Use fonte Inter ou Roboto do Google Fonts
- Cabeçalho com fundo azul escuro (#1e3a5f) e texto branco com o título "Entendendo o Problema — Relatório Executivo"
- Cada seção com título em azul (#2563eb) e linha separadora sutil
- Cards com borda esquerda colorida para destacar informações importantes
- Rodapé com "LBW Copilot — Formação em Gestão de Projetos de Melhoria"
- Layout limpo tipo consultoria profissional
- Retorne APENAS o HTML completo, sem explicações
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const html = response.text || "";
      const cleanedHtml = html.replace(/```html|```/g, "").trim();

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(cleanedHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filledFieldsCount = Object.values(answers).filter(val => typeof val === 'string' && val.trim().length > 0).length;

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8">
        <div className="flex items-center justify-between border-b border-[#eee] pb-4">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <h2 className="text-[1.25rem] font-bold text-[#333]">Entendendo o Problema</h2>
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Define Phase</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {/* Primeira Coluna */}
          <div className="space-y-8">
            {firstColumn.map((q, idx) => (
              <div key={q.id} className="space-y-2">
                {(idx === 0 || firstColumn[idx-1].section !== q.section) && (
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 mt-2">{q.section}</h3>
                )}
                <label className="block text-[12px] font-bold text-[#666] leading-tight">{q.label}</label>
                <textarea
                  value={answers[q.id as keyof typeof answers]}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="Sua resposta..."
                />
              </div>
            ))}
          </div>

          {/* Segunda Coluna */}
          <div className="space-y-8">
            {secondColumn.map((q, idx) => (
              <div key={q.id} className="space-y-2">
                {(idx === 0 || secondColumn[idx-1].section !== q.section) && (
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 mt-2">{q.section}</h3>
                )}
                <label className="block text-[12px] font-bold text-[#666] leading-tight">{q.label}</label>
                <textarea
                  value={answers[q.id as keyof typeof answers]}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="Sua resposta..."
                />
              </div>
            ))}

            {/* Item 11: Upload de Imagens */}
            <div className="space-y-4 pt-4">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">11. Suporte Visual</h3>
              <label className="block text-[12px] font-bold text-[#666] leading-tight">
                Adicione até 2 imagens (ex: gráfico de perdas, foto do problema)
              </label>
              
              <div className="flex gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-32 h-32 border border-gray-200 rounded overflow-hidden group">
                    <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                
                {images.length < 2 && (
                  <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <ImageIcon className="text-gray-400" size={24} />
                    <span className="text-[10px] font-bold text-gray-400 mt-2">UPLOAD</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4 pt-6 border-t border-[#eee]">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF || filledFieldsCount < 3}
            className={cn(
              "px-8 py-3 rounded-[4px] font-bold flex items-center transition-all border-none cursor-pointer shadow-md",
              isGeneratingPDF || filledFieldsCount < 3
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Gerando relatório...
              </>
            ) : (
              <>
                <FileDown size={18} className="mr-2" />
                Gerar PDF Executivo
              </>
            )}
          </button>

          <button
            data-save-trigger
            onClick={handleSave}
            className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-md"
          >
            <CheckCircle2 size={18} className="mr-2" />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
