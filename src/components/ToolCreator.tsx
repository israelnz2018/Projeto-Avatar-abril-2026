import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Wand2, 
  ChevronRight, 
  Layout, 
  Type, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Save,
  Plus,
  ArrowRight,
  Settings,
  FileText,
  Zap,
  Target,
  BarChart3,
  Edit2
} from 'lucide-react';
import { getInitiatives } from '../services/configService';
import { Initiative } from '../types';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';

const getInitiativeIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('pequenas') || n.includes('melhoria')) return <Zap size={20} />;
  if (n.includes('lean') || n.includes('sigma') || n.includes('six')) return <Target size={20} />;
  if (n.includes('bpm') || n.includes('processo')) return <BarChart3 size={20} />;
  if (n.includes('implementação') || n.includes('projeto')) return <Settings size={20} />;
  return <Layout size={20} />;
};

export default function ToolCreator() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [fullTool, setFullTool] = useState<any | null>(null);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [showFullToolFeedback, setShowFullToolFeedback] = useState(false);
  const [fullToolFeedback, setFullToolFeedback] = useState('');
  const [toolData, setToolData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        const data = await getInitiatives();
        setInitiatives(data);
      } catch (error) {
        console.error('Error fetching initiatives:', error);
        toast.error('Erro ao carregar iniciativas');
      } finally {
        setLoading(false);
      }
    };
    fetchInitiatives();
  }, []);

  const parentInitiatives = initiatives.filter(i => !i.parentId).sort((a, b) => a.name.localeCompare(b.name));
  const childInitiatives = initiatives.filter(i => i.parentId === selectedParentId).sort((a, b) => a.name.localeCompare(b.name));
  const selectedChild = initiatives.find(i => i.id === selectedChildId);
  const phases = selectedChild?.phases || [];

  const handleGenerateDraft = async (isAdjustment = false) => {
    if (!selectedChildId || !selectedPhaseId || !description.trim()) {
      toast.error('Por favor, selecione subcategoria, fase e descreva o que deseja fazer.');
      return;
    }

    setIsGenerating(true);
    setFullTool(null);
    setToolData({});
    if (!isAdjustment) setGeneratedDraft(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const parent = initiatives.find(i => i.id === selectedParentId);
      const child = initiatives.find(i => i.id === selectedChildId);
      const phase = phases.find(p => p.id === selectedPhaseId);

      const prompt = `
        Você é um consultor sênior de melhoria contínua, prático e direto ao ponto.
        O usuário deseja criar uma ferramenta para:
        
        Tipo de Projeto: ${parent?.name}
        Subcategoria: ${child?.name}
        Fase do Projeto: ${phase?.name}
        Descrição Inicial: ${description}
        ${isAdjustment ? `Feedback/Mudanças solicitadas: ${feedback}` : ''}
        
        Crie um "Conceito" REALISTA e PRÁTICO para esta ferramenta.
        REGRAS CRÍTICAS:
        1. NOME: Use nomes profissionais em PORTUGUÊS (ex: "Matriz de Priorização", "Checklist de Setup"). Nada de nomes fantasiosos ou em inglês.
        2. FOCO NA AÇÃO: O que o aluno REALMENTE tem que fazer?
        3. SEM ENROLAÇÃO: Não explique a teoria. Vá direto para a aplicação.
        
        Estrutura da resposta:
        - Nome da Ferramenta (Realista e em Português)
        - Objetivo Direto (1 frase)
        - O que o aluno DEVE fazer (Lista de ações práticas)
        - O que o aluno NÃO DEVE fazer (Erros comuns a evitar)
        - Campos necessários para o formulário
        
        Responda em Markdown limpo.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setGeneratedDraft(response.text || 'Não foi possível gerar o draft.');
      setShowFeedbackInput(false);
      setFeedback('');
      toast.success(isAdjustment ? 'Ideia ajustada com sucesso!' : 'Ideia gerada com sucesso!');
    } catch (error) {
      console.error('Error generating tool draft:', error);
      toast.error('Erro ao gerar a ideia da ferramenta');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFullTool = async (isAdjustment = false) => {
    if (!generatedDraft) return;

    setIsGeneratingFull(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const parent = initiatives.find(i => i.id === selectedParentId);
      const child = initiatives.find(i => i.id === selectedChildId);
      const phase = phases.find(p => p.id === selectedPhaseId);

      const prompt = `
        Você é um consultor sênior de melhoria contínua.
        O usuário aprovou a seguinte ideia de ferramenta:
        
        ${generatedDraft}
        
        ${isAdjustment ? `O usuário solicitou os seguintes ajustes na ferramenta funcional: ${fullToolFeedback}` : ''}

        Agora, gere a estrutura FUNCIONAL desta ferramenta em formato JSON.
        A ferramenta deve seguir o PADRÃO VISUAL E FUNCIONAL das ferramentas existentes (como Project Brief e Ishikawa):
        - Cabeçalho com Título e Fase.
        - Campos de entrada claros e organizados.
        - Lógica de resultado ou conclusão prática.

        REGRAS:
        - Título em PORTUGUÊS e profissional.
        - Campos práticos que o aluno deve preencher.
        - Descrição curta e focada na AÇÃO.
        
        O JSON deve seguir este formato:
        {
          "title": "Nome da Ferramenta",
          "description": "Instrução curta do que o aluno deve fazer agora.",
          "phase": "${phase?.name}",
          "fields": [
            { "id": "field1", "label": "Nome do Campo", "type": "text" | "number" | "select", "options": ["Opção 1", "Opção 2"], "placeholder": "Dica prática de preenchimento" }
          ],
          "resultLogic": "O que o aluno deve concluir após preencher esses dados."
        }

        Retorne APENAS o JSON.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const toolJson = JSON.parse(response.text || '{}');
      setFullTool(toolJson);
      
      // Initialize tool data with empty values
      const initialData: Record<string, any> = {};
      toolJson.fields?.forEach((f: any) => initialData[f.id] = '');
      setToolData(initialData);

      setShowFullToolFeedback(false);
      setFullToolFeedback('');
      toast.success(isAdjustment ? 'Ferramenta ajustada com sucesso!' : 'Ferramenta funcional gerada com sucesso!');
    } catch (error) {
      console.error('Error generating full tool:', error);
      toast.error('Erro ao gerar a ferramenta funcional');
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const handleSaveIdea = () => {
    toast.success('Ideia salva na sua Base de Conhecimento para uso futuro!');
    // In a real app, this would save to a 'tool_ideas' collection
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Plus size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Criar Nova Ferramenta</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Desenvolva soluções personalizadas com auxílio de IA</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                1. Tipo de Projeto
              </label>
              <div className="space-y-2">
                {parentInitiatives.map((initiative) => (
                  <button
                    key={initiative.id}
                    onClick={() => {
                      setSelectedParentId(initiative.id);
                      setSelectedChildId('');
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 group",
                      selectedParentId === initiative.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                        : "bg-white border-gray-50 hover:border-blue-200 text-gray-600"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      selectedParentId === initiative.id ? "bg-white/20" : "bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                    )}>
                      {getInitiativeIcon(initiative.name)}
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight truncate">{initiative.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedParentId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-4"
                >
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                    2. Subcategoria
                  </label>
                  <div className="space-y-2">
                    {childInitiatives.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSelectedChildId(child.id);
                          setSelectedPhaseId('');
                        }}
                        className={cn(
                          "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                          selectedChildId === child.id
                            ? "bg-blue-50 border-blue-600 text-blue-600"
                            : "bg-white border-gray-50 hover:border-blue-100 text-gray-500"
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">{child.name}</span>
                        {selectedChildId === child.id && <CheckCircle2 size={14} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {selectedChildId && phases.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-4"
                >
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                    3. Fase do Projeto
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {phases.map((phase) => (
                      <button
                        key={phase.id}
                        onClick={() => setSelectedPhaseId(phase.id)}
                        className={cn(
                          "p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between group",
                          selectedPhaseId === phase.id
                            ? "bg-blue-50 border-blue-600 text-blue-600"
                            : "bg-white border-gray-50 hover:border-blue-100 text-gray-500"
                        )}
                      >
                        <span className="text-[9px] font-black uppercase tracking-tight">{phase.name}</span>
                        {selectedPhaseId === phase.id && <CheckCircle2 size={12} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Input & Output Area */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                  4. O que você quer fazer?
                </label>
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  <Sparkles size={12} /> IA Assistida
                </div>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a necessidade. Ex: 'Preciso de uma ferramenta para priorizar ideias de melhoria baseada em custo, facilidade e impacto financeiro...'"
                className="w-full h-32 p-6 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner resize-none"
              />
              <button
                onClick={() => handleGenerateDraft(false)}
                disabled={isGenerating || !selectedPhaseId || !description.trim()}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none uppercase tracking-widest transition-all flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Gerando Draft...
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    Gerar Primeiro Draft
                  </>
                )}
              </button>
            </div>
          </section>

          <AnimatePresence>
            {generatedDraft && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Idea/Draft Section */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Sparkles size={18} />
                      </div>
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Ideia da Ferramenta</h3>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveIdea}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-all"
                      >
                        <Save size={14} /> Salvar Ideia
                      </button>
                    </div>
                  </div>
                  <div className="p-8 prose prose-sm max-w-none prose-blue">
                    <div className="whitespace-pre-wrap font-medium text-gray-700 leading-relaxed">
                      {generatedDraft}
                    </div>
                  </div>

                  {/* Review Actions */}
                  {!fullTool && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleGenerateFullTool(false)}
                          disabled={isGeneratingFull}
                          className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-green-700 shadow-lg shadow-green-100 uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          {isGeneratingFull ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          Gostei, Gerar Ferramenta Completa
                        </button>
                        <button
                          onClick={() => setShowFeedbackInput(!showFeedbackInput)}
                          className="flex-1 bg-white border-2 border-gray-100 text-gray-600 py-4 rounded-2xl font-black text-xs hover:border-blue-200 hover:text-blue-600 uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Edit2 size={16} />
                          Quero Ajustar a Ideia
                        </button>
                      </div>

                      <AnimatePresence>
                        {showFeedbackInput && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 space-y-4 overflow-hidden"
                          >
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                              O que você deseja mudar na ideia?
                            </label>
                            <textarea
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Ex: 'Adicione uma coluna para impacto ambiental' ou 'Simplifique o passo 3'..."
                              className="w-full h-24 p-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                            />
                            <button
                              onClick={() => handleGenerateDraft(true)}
                              disabled={isGenerating || !feedback.trim()}
                              className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] hover:bg-blue-700 uppercase tracking-widest transition-all"
                            >
                              {isGenerating ? 'Ajustando...' : 'Atualizar Ideia'}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Full Tool Section (Functional Preview) */}
                <AnimatePresence>
                  {fullTool && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-[4px] border border-[#ccc] shadow-sm overflow-hidden"
                    >
                      {/* Standard Tool Header */}
                      <div className="p-8 border-b border-[#eee] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="text-blue-600" size={24} />
                          <div>
                            <h3 className="text-[1.25rem] font-bold text-[#333]">{fullTool.title}</h3>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Fase: {fullTool.phase}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowFullToolFeedback(!showFullToolFeedback)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all border-none bg-transparent cursor-pointer"
                            title="Editar Estrutura da Ferramenta"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => toast.success('Ferramenta exportada para seu projeto!')}
                            className="flex items-center gap-2 px-6 py-2 bg-[#10b981] text-white rounded-[4px] text-[12px] font-bold hover:bg-green-600 transition-all border-none cursor-pointer shadow-md"
                          >
                            <Save size={16} /> Finalizar e Salvar
                          </button>
                        </div>
                      </div>

                      <div className="p-8 space-y-8">
                        {/* Feedback for Full Tool */}
                        <AnimatePresence>
                          {showFullToolFeedback && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-4 overflow-hidden"
                            >
                              <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block">
                                O que você deseja ajustar na estrutura funcional?
                              </label>
                              <textarea
                                value={fullToolFeedback}
                                onChange={(e) => setFullToolFeedback(e.target.value)}
                                placeholder="Ex: 'Mude o campo X para um dropdown' ou 'Adicione uma nova seção de riscos'..."
                                className="w-full h-24 p-4 bg-white border border-blue-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setShowFullToolFeedback(false)}
                                  className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-gray-700"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleGenerateFullTool(true)}
                                  disabled={isGeneratingFull || !fullToolFeedback.trim()}
                                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                                >
                                  {isGeneratingFull ? 'Ajustando...' : 'Aplicar Ajustes'}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="bg-gray-50 p-6 rounded-[4px] border border-[#eee]">
                          <p className="text-[13px] font-bold text-[#666] leading-relaxed italic">
                            "{fullTool.description}"
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          {fullTool.fields?.map((field: any) => (
                            <div key={field.id} className="space-y-2">
                              <label className="block text-[12px] font-bold text-[#666] leading-tight">
                                {field.label}
                              </label>
                              {field.type === 'select' ? (
                                <select
                                  value={toolData[field.id] || ''}
                                  onChange={(e) => setToolData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                  className="w-full px-4 py-3 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                                >
                                  <option value="">Selecione...</option>
                                  {field.options?.map((opt: string) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <textarea
                                  value={toolData[field.id] || ''}
                                  onChange={(e) => setToolData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  rows={2}
                                  className="w-full px-4 py-3 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-all shadow-sm"
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="pt-8 border-t border-[#eee]">
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Conclusão / Resultado</h4>
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                              Lógica de Processamento
                            </div>
                          </div>
                          <div className="p-8 bg-gray-50 rounded-[4px] border border-[#eee] space-y-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                                <Zap size={16} />
                              </div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">O que você deve concluir:</p>
                            </div>
                            <p className="text-[14px] font-medium text-gray-700 leading-relaxed italic border-l-4 border-blue-200 pl-4">
                              "{fullTool.resultLogic}"
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                              {Object.entries(toolData).map(([key, val]) => (
                                <div key={key} className="flex flex-col gap-1 p-3 bg-white border border-gray-100 rounded shadow-sm">
                                  <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{fullTool.fields?.find((f: any) => f.id === key)?.label}</span>
                                  <span className="text-[12px] text-gray-800 font-bold truncate">{val || '---'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-blue-50 border-t border-blue-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
                          <Sparkles size={20} />
                        </div>
                        <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
                          Esta ferramenta foi gerada seguindo o padrão metodológico da LBW. Teste o preenchimento acima e, se estiver satisfeito, salve-a para uso oficial.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
