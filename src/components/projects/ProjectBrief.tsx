import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle2, FileText, Image as ImageIcon, X, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ProjectBriefProps {
  onSave: (data: any) => void;
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showSixSigmaWarning, setShowSixSigmaWarning] = useState(false);

  const projectIdeas = previousToolData?.generatedProjects || [];

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
    onSave({ answers: newAnswers, images });
  };

  const handleProjectSelect = (projectTitle: string) => {
    setSelectedProjectId(projectTitle);
    const selectedProject = projectIdeas.find((p: any) => p.title === projectTitle);
    
    if (selectedProject) {
      // Simple Six Sigma validation (can be improved)
      const title = selectedProject.title.toLowerCase();
      const isSixSigmaCandidate = 
        title.includes('redução') || 
        title.includes('aumento') || 
        title.includes('otimização') || 
        title.includes('variabilidade') ||
        title.includes('defeito') ||
        title.includes('erro') ||
        title.includes('custo') ||
        title.includes('tempo') ||
        title.includes('lead time');
      
      setShowSixSigmaWarning(!isSixSigmaCandidate);
    } else {
      setShowSixSigmaWarning(false);
    }
  };

  const handleGenerateClick = async () => {
    if (!selectedProjectId || !onGenerateAI) return;
    
    const selectedProject = projectIdeas.find((p: any) => p.title === selectedProjectId);
    if (selectedProject) {
      await onGenerateAI(selectedProject);
    }
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
        onSave({ answers, images: [...newImages] });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onSave({ answers, images: newImages });
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

  return (
    <div className="space-y-8">
      {/* Lean Six Sigma Project Selection */}
      {isLeanSixSigma && projectIdeas.length > 0 && (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-4">
          <div className="flex items-center gap-3 text-blue-700">
            <Sparkles size={20} className="text-blue-500" />
            <h3 className="text-sm font-black uppercase tracking-wider">Selecione um Projeto da IDEIA DE PROJETOS DE MELHORIA</h3>
          </div>
          <p className="text-xs text-blue-800 font-medium">
            Escolha uma das ideias de projeto geradas na ferramenta anterior para preencher automaticamente esta etapa.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="flex-1 w-full px-4 py-3 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Selecione um projeto...</option>
              {projectIdeas.map((p: any, idx: number) => (
                <option key={idx} value={p.title}>{p.title}</option>
              ))}
            </select>
            
            <button
              onClick={handleGenerateClick}
              disabled={isGeneratingAI || !selectedProjectId}
              className={cn(
                "h-[46px] px-6 rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md",
                isGeneratingAI || !selectedProjectId
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              )}
            >
              {isGeneratingAI ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {isGeneratingAI ? "Gerando..." : "Gerar com IA"}
            </button>
          </div>

          <AnimatePresence>
            {showSixSigmaWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3"
              >
                <AlertTriangle className="text-amber-600 shrink-0" size={18} />
                <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
                  Aviso: Este título não parece ser um projeto Lean Six Sigma típico. 
                  Projetos Six Sigma geralmente focam em redução de variabilidade, defeitos ou otimização de métricas quantitativas.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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

        <div className="flex justify-end pt-6 border-t border-[#eee]">
          <button
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
