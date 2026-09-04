import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle2, FileText, Image as ImageIcon, X, Sparkles, Loader2, AlertTriangle, Trash2, BookOpen, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// As chaves batem com os ids reais das perguntas (q1..q12) usadas na ferramenta.
const BRIEF_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    titulo: 'Reduzir o tempo de emissão de propostas comerciais',
    answers: {
      q6: 'Reduzir o tempo de emissão de propostas comerciais',
      q1: 'Emissão de propostas comerciais para novos clientes',
      q2: 'As propostas demoram em média 5 dias para serem enviadas, e o cliente muitas vezes desiste antes de receber.',
      q3: 'Equipe comercial, área de precificação, financeiro e jurídico.',
      q4: 'Retrabalho na precificação, idas e vindas por e-mail e falta de um modelo padrão de proposta.',
      q5: 'Risco financeiro: perda de vendas por demora e risco de enviar preço errado ao cliente.',
      q7: 'Reduzir o tempo médio de emissão de 5 dias para no máximo 1 dia útil.',
      q8: 'Mais propostas enviadas no prazo, aumento na taxa de conversão e menos retrabalho da equipe.',
      q10: 'Mapear o fluxo atual da proposta e criar um modelo padrão com preços pré-aprovados.',
      q12: 'Ajuda para mapear o processo e definir indicadores de acompanhamento.',
    },
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    titulo: 'Reduzir o índice de refugo na linha de injeção plástica',
    answers: {
      q6: 'Reduzir o índice de refugo na linha de injeção plástica',
      q1: 'Processo de injeção plástica da linha 3',
      q2: 'O índice de refugo está em 8%, bem acima da meta de 2%, gerando desperdício de matéria-prima.',
      q3: 'Operadores da linha 3, manutenção, qualidade e engenharia de processo.',
      q4: 'Peças saindo com rebarba e falha de preenchimento, exigindo separação e retrabalho.',
      q5: 'Risco financeiro pelo desperdício de material e risco de enviar peça defeituosa ao cliente.',
      q7: 'Reduzir o índice de refugo de 8% para no máximo 2% em 3 meses.',
      q8: 'Menos desperdício de matéria-prima, mais produtividade e menos paradas para retrabalho.',
      q10: 'Coletar dados de refugo por turno e por molde e analisar as principais causas.',
      q12: 'Ajuda para organizar a coleta de dados e analisar as causas raiz dos defeitos.',
    },
  },
];

interface ProjectBriefProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  previousToolData?: any;
  project?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function ProjectBrief({ 
  onSave, 
  initialData, 
  previousToolData, 
  project,
  onGenerateAI,
  isGeneratingAI,
  onClearAIData
}: ProjectBriefProps) {
  const [answers, setAnswers] = useState(initialData?.answers || {
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '',
    q7: '', q8: '', q10: '', q12: ''
  });
  
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  const isToolEmpty = Object.values(answers).every(val => !val) && images.length === 0;

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

  const filledFieldsCount = Object.values(answers).filter(val => typeof val === 'string' && val.trim().length > 0).length;

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

      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between border-b border-[#eee] pb-4">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <h2 className="text-[1.25rem] font-bold text-[#333]">Entendendo o Problema</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExemplo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
            >
              <BookOpen size={14} /> Ver exemplo
            </button>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Define Phase</div>
          </div>
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
            data-save-trigger
            onClick={handleSave}
            className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-md"
          >
            <CheckCircle2 size={18} className="mr-2" />
            Salvar Alterações
          </button>
        </div>
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
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Entendendo o Problema</h3>
                  <p className="text-xs text-gray-500 m-0">{BRIEF_EXEMPLOS[exemploIdx].titulo}</p>
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
              {BRIEF_EXEMPLOS.map((ex, i) => (
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

            <div className="p-6 space-y-5">
              {questions.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-[#666] leading-tight">{q.label}</label>
                  <div className="w-full px-4 py-2 border border-[#ccc] rounded-[4px] text-[13px] bg-gray-50 text-gray-800 whitespace-pre-wrap break-words">
                    {BRIEF_EXEMPLOS[exemploIdx].answers[q.id as keyof typeof BRIEF_EXEMPLOS[number]['answers']] || '-'}
                  </div>
                </div>
              ))}

              <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
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
