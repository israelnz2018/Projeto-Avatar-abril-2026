import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle2, FileText, Image as ImageIcon, X, Sparkles, Loader2, AlertTriangle, FileDown, Trash2 } from 'lucide-react';
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
  ideaProjects?: any[];
  gutProjects?: any[];
  rabProjects?: any[];
  onClearAIData?: () => void;
}

export default function ProjectBrief({ 
  onSave, 
  initialData, 
  previousToolData, 
  project,
  isLeanSixSigma,
  onGenerateAI,
  isGeneratingAI,
  ideaProjects = [],
  gutProjects = [],
  rabProjects = [],
  onClearAIData
}: ProjectBriefProps) {
  const [answers, setAnswers] = useState(initialData?.answers || {
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
    q7: '', q8: '', q10: '', q12: ''
  });
  
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialData?.selectedProject || ''
  );

  const isToolEmpty = Object.values(answers).every(val => !val) && images.length === 0;

  const getUniqueProjects = () => {
    const allTitles = new Set<string>();
    const combined: { title: string }[] = [];

    // Fonte 1 — Ideia de Projetos
    ideaProjects.forEach((p: any) => {
      const title = p?.title?.trim();
      if (title && !allTitles.has(title)) {
        allTitles.add(title);
        combined.push({ title });
      }
    });

    // Fonte 2 — GUT
    gutProjects.forEach((p: any) => {
      const title = p?.description?.trim();
      if (title && !allTitles.has(title)) {
        allTitles.add(title);
        combined.push({ title });
      }
    });

    // Fonte 3 — RAB
    rabProjects.forEach((p: any) => {
      const title = p?.description?.trim();
      if (title && !allTitles.has(title)) {
        allTitles.add(title);
        combined.push({ title });
      }
    });

    return combined;
  };

  const projectIdeas = getUniqueProjects();

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

  // Auto-resize textareas when answers or active tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [answers]);

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
    { id: 'q6', label: '1. Título do Projeto', section: 'Sobre o novo processo' },
    { id: 'q1', label: '2. Qual é o nome do processo que você quer melhorar?', section: 'Sobre o novo processo' },
    { id: 'q2', label: '3. Qual é o principal problema hoje (em 1–2 frases)?', section: 'Sobre o novo processo' },
    { id: 'q3', label: '4. Quem são os principais envolvidos (áreas ou fornecedores)?', section: 'Sobre o novo processo' },
    { id: 'q4', label: '5. O que está dando errado na prática? (ex: atraso, retrabalho, falta de padrão, erro, etc.)', section: 'Sobre o problema' },
    { id: 'q5', label: '6. Existe algum risco? (financeiro, cliente, compliance, etc.)', section: 'Sobre o problema' },
    { id: 'q7', label: '7. Existe alguma meta clara? (tempo, qualidade, custo, volume, etc.)', section: 'Objetivos e Benefícios' },
    { id: 'q8', label: '8. O que vai melhorar se der certo? (ex: menos custo, mais rapidez, melhor experiência, etc.)', section: 'Objetivos e Benefícios' },
    { id: 'q10', label: '9. Quais são os próximos passos que você já tem em mente?', section: 'Andamento e Dificuldades' },
    { id: 'q12', label: '10. Que tipo de ajuda você precisa?', section: 'Andamento e Dificuldades' },
  ];

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
      {isLeanSixSigma && (
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 space-y-3 mb-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Sparkles size={16} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              Selecione um Projeto Para Trabalhar
            </h3>
          </div>
          <p className="text-xs text-blue-600">
            Projetos disponíveis das ferramentas anteriores deste projeto.
          </p>
          <div className="flex gap-3 items-center">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                if (val) {
                  const newAnswers = { ...answers, q6: val };
                  setAnswers(newAnswers);
                  onSave({ answers: newAnswers, images }, { silent: true });
                }
              }}
              className="flex-1 px-4 py-3 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Escolha um projeto da lista --</option>
              {projectIdeas.length === 0 && (
                <option disabled value="">
                  Nenhum projeto encontrado — preencha Ideia de Projetos, GUT ou RAB primeiro
                </option>
              )}
              {projectIdeas.map((p, idx) => (
                <option key={idx} value={p.title}>{p.title}</option>
              ))}
            </select>

            <button
              onClick={async () => {
                if (!selectedProjectId || !onGenerateAI) return;
                await onGenerateAI({
                  selectedProject: selectedProjectId,
                  title: selectedProjectId,
                  generatedProjects: previousToolData?.generatedProjects || [],
                  gutOpportunities: previousToolData?.gutOpportunities || [],
                  rabOpportunities: previousToolData?.rabOpportunities || [],
                });
              }}
              disabled={isGeneratingAI || !selectedProjectId}
              className={cn(
                "px-5 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                isGeneratingAI || !selectedProjectId
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
              )}
            >
              {isGeneratingAI
                ? <><Loader2 className="animate-spin" size={14} /> Gerando...</>
                : <><Sparkles size={14} /> Gerar com IA</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Entendendo o Problema com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Matriz de Priorização" para gerar
                Entendendo o Problema técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir
                um relatório rigoroso e técnico.
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

      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between border-b border-[#eee] pb-4">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <h2 className="text-[1.25rem] font-bold text-[#333]">Entendendo o Problema</h2>
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Define Phase</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {questions.map((q, idx) => {
            const isSectionStart = idx === 0 || questions[idx - 1].section !== q.section;
            // Check if this is the only question in its section to potentially span full width
            const sectionQuestions = questions.filter(item => item.section === q.section);
            const isAlone = sectionQuestions.length === 1;

            return (
              <React.Fragment key={q.id}>
                {isSectionStart && (
                  <div className="col-span-1 md:col-span-2">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 mt-6 first:mt-2 border-b border-blue-50 pb-2">
                      {q.section}
                    </h3>
                  </div>
                )}
                <div className={cn("space-y-2", isAlone && "md:col-span-2")}>
                  <label className="block text-[12px] font-bold text-[#666] leading-tight">{q.label}</label>
                  <textarea
                    value={answers[q.id as keyof typeof answers]}
                    onChange={(e) => {
                      handleAnswerChange(q.id, e.target.value);
                      // Auto resize
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    rows={1}
                    className="w-full resize-none px-4 py-2 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-all shadow-inner whitespace-normal break-words"
                    style={{ minHeight: '44px', height: 'auto', lineHeight: '1.5' }}
                    placeholder="Sua resposta..."
                  />
                </div>
              </React.Fragment>
            );
          })}

          {/* Item 11: Upload de Imagens - Agora fora do loop para manter consistência */}
          <div className="col-span-1 md:col-span-2 space-y-4 pt-4">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">11. Suporte Visual</h3>
            <label className="block text-[12px] font-bold text-[#666] leading-tight">
              Adicione até 2 imagens (ex: gráfico de perdas, foto do problema)
            </label>
            
            <div className="flex gap-4 flex-wrap">
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
