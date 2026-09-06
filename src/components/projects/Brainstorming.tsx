import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, Trash2, CheckCircle2, MessageSquare, Tag, Users, HelpCircle, Target, Edit2, X as CloseIcon, Sparkles, Loader2, BookOpen, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { generateBrainstormingCausas } from '@/src/services/claudeAiService';
import { getConfirmedCauseRows } from '@/src/services/causeValidationService';

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Cada exemplo traz ideias agrupadas pelas categorias 6M reais da ferramenta.
const BRAINSTORMING_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    brainstormingType: 'Problema pra resolver',
    brainstormingTopic: 'Por que as propostas comerciais demoram tanto pra sair?',
    ideas: [
      { text: 'Analistas não têm treinamento no sistema de precificação', category: 'Mão de Obra' },
      { text: 'Equipe sobrecarregada em fim de mês', category: 'Mão de Obra' },
      { text: 'Não existe modelo padrão de proposta', category: 'Método' },
      { text: 'Aprovação de desconto passa por 3 níveis', category: 'Método' },
      { text: 'Tabela de preços desatualizada', category: 'Material' },
      { text: 'Sistema de CRM lento e travando', category: 'Máquina' },
      { text: 'Falta indicador de tempo médio de emissão', category: 'Medição' },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    brainstormingType: 'Problema pra resolver',
    brainstormingTopic: 'Por que o refugo da linha de injeção está alto?',
    ideas: [
      { text: 'Operadores novos sem treinamento de setup', category: 'Mão de Obra' },
      { text: 'Parâmetros de injeção ajustados "no olho"', category: 'Método' },
      { text: 'Resina com umidade acima do especificado', category: 'Material' },
      { text: 'Molde com desgaste sem manutenção', category: 'Máquina' },
      { text: 'Temperatura do galpão variando muito', category: 'Meio Ambiente' },
      { text: 'Não há medição de refugo por turno', category: 'Medição' },
    ],
  },
];

interface BrainstormingProps {
  toolId?: string;
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
  allProjectData?: any;
  causeValidationRequired?: boolean;
}

// Acha os dados de uma ferramenta no allProjectData, ignorando o prefixo de fase.
function findToolData(allData: any, toolKey: string) {
  if (!allData) return null;
  const keys = Object.keys(allData).filter(k => k === toolKey || k.endsWith(`_${toolKey}`));
  if (keys.length === 0) return null;
  const meta = allData.__metadata;
  let chosen = keys[0];
  if (meta) {
    let max = meta[chosen] || 0;
    for (const k of keys) { if ((meta[k] || 0) > max) { max = meta[k]; chosen = k; } }
  }
  const d = allData[chosen];
  return d?.toolData || d;
}

// Extrai os rótulos das etapas (nodes) do Mapa de Processo, ignorando raias.
function etapasDoMapa(processMap: any): string[] {
  const nodes = processMap?.nodes || [];
  return nodes
    .filter((n: any) => n.type !== 'lane')
    .map((n: any) => (n.data?.label || '').trim())
    .filter((l: string) => l && l.toLowerCase() !== 'nova raia');
}

interface Idea {
  id: string;
  text: string;
  category: string;
  author: string;
  votes: number;
  topic?: string;
}

const CATEGORIES = ['Mão de Obra', 'Método', 'Material', 'Máquina', 'Meio Ambiente', 'Medição', 'Não colocar na espinha de peixe'];
const BRAINSTORMING_TYPES = [
  'Ideias de projetos de melhoria',
  'Problema pra resolver',
  'Identificar melhor solução',
  'Identificação de riscos'
];

export default function Brainstorming({ toolId, onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData, allProjectData, causeValidationRequired }: BrainstormingProps) {
  const isSolutionBrainstorming = toolId === 'brainstormingImprove';
  const defaultData = initialData?.toolData || initialData;
  const [brainstormingType, setBrainstormingType] = useState(
    defaultData?.brainstormingType || (isSolutionBrainstorming ? 'Identificar melhor solução' : BRAINSTORMING_TYPES[0])
  );
  const [brainstormingTopic, setBrainstormingTopic] = useState(defaultData?.brainstormingTopic || '');
  const [ideas, setIdeas] = useState<Idea[]>(defaultData?.ideas || []);
  const isToolEmpty = ideas.length === 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editAuthor, setEditAuthor] = useState('');

  useEffect(() => {
    if (initialData) {
      const d = initialData.toolData || initialData;
      if (d.ideas) setIdeas(d.ideas);
      if (d.brainstormingType) setBrainstormingType(d.brainstormingType);
      if (d.brainstormingTopic) setBrainstormingTopic(d.brainstormingTopic);
    } else {
      // Reset to defaults if initialData is null/undefined
      setIdeas([]);
      setBrainstormingType(isSolutionBrainstorming ? 'Identificar melhor solução' : BRAINSTORMING_TYPES[0]);
      setBrainstormingTopic('');
    }
  }, [initialData, isSolutionBrainstorming]);

  const [newIdea, setNewIdea] = useState('');
  const [author, setAuthor] = useState('');

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  // ===== Geração de causas a partir do Mapa de Processo (IA enxuta) =====
  const [isGenerating, setIsGenerating] = useState(false);
  const processMap = findToolData(allProjectData, 'processMap');
  const etapas = etapasDoMapa(processMap);
  const temMapa = etapas.length > 0;
  // Bloco de IA só aparece se o Brainstorming AINDA está vazio (nao sobrescreve
  // ideias já registradas). 3 condições: Brainstorming vazio + Mapa existe + preenchido.
  const brainstormingVazio = !Array.isArray(ideas) || ideas.every((i: any) => !i?.text || !i.text.trim());
  const causeValidation = findToolData(allProjectData, 'causeValidation');
  const confirmedCauses = getConfirmedCauseRows(causeValidation);
  const needsCauseValidation = isSolutionBrainstorming && Boolean(causeValidationRequired);

  const handleGenerateSolutions = async () => {
    const improvementGoal = brainstormingTopic.trim();
    if (improvementGoal.length < 10) {
      toast.error('Descreva com um pouco mais de detalhe o que você quer melhorar.');
      return;
    }
    if (!onGenerateAI) {
      toast.error('A geração com IA não está disponível neste momento.');
      return;
    }
    if (needsCauseValidation && confirmedCauses.length === 0) {
      toast.error('Valide pelo menos uma causa como contribuinte e marque-a para o Brainstorming antes de gerar solucoes.');
      return;
    }
    await onGenerateAI({ improvementGoal });
  };

  const handleGenerateFromMap = async () => {
    if (!temMapa) {
      toast.error('Nenhuma etapa encontrada no Mapa de Processo. Preencha aquela ferramenta primeiro.');
      return;
    }
    setIsGenerating(true);
    try {
      const { ideas: novas } = await generateBrainstormingCausas(etapas, brainstormingTopic);
      if (novas.length === 0) {
        toast.error('A IA não retornou causas. Tente de novo.');
        return;
      }
      const novasIdeas: Idea[] = novas.map((n, i) => ({
        id: `${Date.now()}-${i}`,
        text: n.text,
        category: 'Mão de Obra',
        author: 'IA LBW',
        votes: 0,
      }));
      setIdeas(prev => [...prev, ...novasIdeas]);
      toast.success(`${novasIdeas.length} causas potenciais geradas a partir do Mapa de Processo.`);
    } catch (e: any) {
      console.error('Erro ao gerar causas:', e);
      toast.error(e.message || 'Erro ao gerar causas com IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addIdea = () => {
    if (!newIdea.trim()) return;
    
    const idea: Idea = {
      id: Date.now().toString(),
      text: newIdea,
      category: isSolutionBrainstorming ? 'Adicionada manualmente' : 'Mão de Obra',
      author: author || '',
      votes: 0,
      topic: isSolutionBrainstorming ? brainstormingTopic.trim() : undefined,
    };
    
    setIdeas(prev => [...prev, idea]);
    setNewIdea('');
    setAuthor('');
  };

  const removeIdea = (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const updateIdeaCategory = (id: string, category: string) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, category } : i));
  };

  const startEditing = (idea: Idea) => {
    setEditingId(idea.id);
    setEditValue(idea.text);
    setEditAuthor(idea.author);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setIdeas(prev => prev.map(i => i.id === editingId ? { ...i, text: editValue, author: editAuthor } : i));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = () => {
    onSave({
      brainstormingType,
      brainstormingTopic,
      ideas
    });
  };

  const showCategories = brainstormingType !== 'Ideias de projetos de melhoria' && brainstormingType !== 'Identificar melhor solução';

  type IdeaDisplayRow =
    | { kind: 'topic'; topic: string }
    | { kind: 'idea'; idea: Idea; index: number };

  const ideaDisplayRows: IdeaDisplayRow[] = [];
  if (isSolutionBrainstorming) {
    const grupos = new Map<string, Array<{ idea: Idea; index: number }>>();
    ideas.forEach((idea, index) => {
      const topic = idea.topic?.trim() || 'Ideias anteriores';
      const grupo = grupos.get(topic) || [];
      grupo.push({ idea, index });
      grupos.set(topic, grupo);
    });
    grupos.forEach((itens, topic) => {
      ideaDisplayRows.push({ kind: 'topic', topic });
      itens.forEach(({ idea, index }) => ideaDisplayRows.push({ kind: 'idea', idea, index }));
    });
  } else {
    ideas.forEach((idea, index) => ideaDisplayRows.push({ kind: 'idea', idea, index }));
  }

  return (
    <div className="space-y-8">
      {/* Box de IA — gera causas potenciais a partir das etapas do Mapa de Processo.
          Só aparece se o Mapa existe/está preenchido E o Brainstorming ainda está vazio. */}
      {!isSolutionBrainstorming && temMapa && brainstormingVazio && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar causas potenciais com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA olha as <strong>{etapas.length} etapas</strong> do seu Mapa de Processo e levanta
                causas potenciais pra cada uma. Ex: <em>"Fazer inspeção"</em> → "Inspeção inadequada",
                "Inspeção insuficiente"...
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * As causas entram na lista abaixo. Você edita, remove ou adiciona as suas.
              </p>
            </div>
            <button
              onClick={handleGenerateFromMap}
              disabled={isGenerating}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none shrink-0",
                isGenerating
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-lg shadow-blue-100"
              )}
            >
              {isGenerating
                ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={16} /> Gerar com IA</>
              }
            </button>
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

      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8">
        <div className="flex items-center justify-between border-b border-[#eee] pb-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="text-yellow-500" size={24} />
            <div>
              <h2 className="text-[1.25rem] font-bold text-[#333]">
                {isSolutionBrainstorming ? 'Brainstorming de Soluções' : 'Brainstorming'}
              </h2>
              <p className="text-[12px] text-[#666]">
                {isSolutionBrainstorming
                  ? 'Gere soluções conectadas ao objetivo e às evidências já registradas no projeto.'
                  : 'Colete opiniões e ideias sobre possíveis causas e variáveis do processo.'}
              </p>
            </div>
          </div>
          {!isSolutionBrainstorming && <button
            onClick={() => setShowExemplo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0 shrink-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>}
        </div>

        {/* Configuration Area */}
        {isSolutionBrainstorming ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                <Target size={15} /> O que você quer melhorar?
              </label>
              <textarea
                value={brainstormingTopic}
                onChange={(e) => setBrainstormingTopic(e.target.value)}
                placeholder="Ex.: Reduzir o tempo de aprovação de pagamentos sem aumentar o risco de erros."
                rows={3}
                className="w-full p-4 border border-blue-200 rounded-lg text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm resize-y"
              />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-xs text-blue-700 leading-relaxed m-0">
                A IA combinará este objetivo com as causas e análises já registradas no projeto.
                Revise as sugestões e acrescente novas ideias manualmente quando quiser.
              </p>
              <button
                type="button"
                onClick={handleGenerateSolutions}
                disabled={!!isGeneratingAI || brainstormingTopic.trim().length < 10}
                className={cn(
                  'min-w-[220px] h-12 px-5 rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest border-none transition-all',
                  isGeneratingAI || brainstormingTopic.trim().length < 10
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-lg shadow-blue-100 active:scale-95'
                )}
              >
                {isGeneratingAI ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                {isGeneratingAI ? 'Gerando soluções...' : ideas.length ? 'Gerar novas soluções' : 'Gerar ideias com IA'}
              </button>
            </div>
            {needsCauseValidation && confirmedCauses.length === 0 && (
              <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Antes de gerar soluÃ§Ãµes, valide na matriz pelo menos uma causa como contribuinte e marque-a para o Brainstorming.
              </p>
            )}
          </div>
        ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <HelpCircle size={14} className="text-blue-500" />
              Tipo de Brainstorming
            </label>
            <select 
              value={brainstormingType}
              onChange={(e) => setBrainstormingType(e.target.value)}
              className="w-full p-3 border border-[#ccc] rounded-[4px] text-[13px] font-bold focus:outline-none focus:border-blue-500 bg-white shadow-sm"
            >
              {BRAINSTORMING_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} className="text-red-500" />
              O que é / Objetivo
            </label>
            <input 
              type="text"
              value={brainstormingTopic}
              onChange={(e) => setBrainstormingTopic(e.target.value)}
              placeholder="Descreva o foco deste brainstorming..."
              className="w-full p-3 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>}

        {/* Input Area */}
        <div className="bg-[#f9fafb] p-6 rounded-[8px] border border-[#eee] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-500" />
                {isSolutionBrainstorming ? 'Adicionar outra solução' : 'Ideia'}
              </label>
              <input 
                type="text"
                value={newIdea}
                onChange={(e) => setNewIdea(e.target.value)}
                placeholder={isSolutionBrainstorming ? 'Digite uma solução adicional...' : 'Digite sua ideia aqui...'}
                className="w-full p-3 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addIdea();
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-green-500" />
                Autor (Opcional)
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nome..."
                  className="flex-1 p-3 border border-[#ccc] rounded-[4px] text-[13px] focus:outline-none focus:border-blue-500 shadow-sm"
                />
                <button 
                  onClick={addIdea}
                  className="bg-[#1f2937] text-white px-4 rounded-[4px] font-bold hover:bg-gray-800 transition-all border-none cursor-pointer flex items-center justify-center shadow-md"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ideas Table */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[14px] font-black text-[#333] uppercase tracking-widest">
              {isSolutionBrainstorming ? 'Ideias de solução' : 'Ideias coletadas'} ({ideas.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto border border-[#eee] rounded-[8px] shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[#eee]">
                  <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[20%] text-center">ID</th>
                  <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[62%]">Ideia</th>
                  <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[20%]">Autor</th>
                  <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[10%] text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ideaDisplayRows.map((row) => {
                  if (row.kind === 'topic') {
                    return (
                      <tr key={`topic-${row.topic}`} className="border-y border-blue-100 bg-blue-50">
                        <td colSpan={4} className="px-4 py-3 text-[12px] font-black text-blue-800">
                          <span className="text-[10px] uppercase tracking-widest text-blue-500 mr-2">Tópico</span>
                          {row.topic}
                        </td>
                      </tr>
                    );
                  }
                  const { idea, index } = row;
                  return (
                  <tr key={idea.id} className="border-b border-[#f5f5f5] hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-center">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-black rounded border border-blue-100">
                        {isSolutionBrainstorming ? 'S' : 'X'}{index + 1}
                      </span>
                    </td>
                    <td className="p-4 text-[13px] text-[#333] font-medium">
                      {editingId === idea.id ? (
                        <input 
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full p-1 border border-blue-300 rounded text-[13px] focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        idea.text.replace(/X\d+[:-]\s*/i, '')
                      )}
                    </td>
                    <td className="p-4 text-[12px] text-gray-500">
                      {editingId === idea.id ? (
                        <input 
                          type="text"
                          value={editAuthor}
                          onChange={(e) => setEditAuthor(e.target.value)}
                          className="w-full p-1 border border-blue-300 rounded text-[12px] focus:outline-none"
                        />
                      ) : (
                        idea.author === 'IA LBW' || idea.author === 'IA' ? '' : idea.author
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {editingId === idea.id ? (
                          <>
                            <button 
                              onClick={saveEdit}
                              className="text-green-600 hover:text-green-800 transition-all border-none bg-transparent cursor-pointer font-bold text-[11px] flex items-center gap-1"
                              title="Salvar Alterações"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button 
                              onClick={cancelEdit}
                              className="text-gray-400 hover:text-gray-600 transition-all border-none bg-transparent cursor-pointer font-bold text-[11px] flex items-center gap-1"
                              title="Cancelar"
                            >
                              <CloseIcon size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEditing(idea)}
                              className="text-blue-400 hover:text-blue-600 transition-all border-none bg-transparent cursor-pointer"
                              title="Editar Ideia"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => removeIdea(idea.id)}
                              className="text-red-300 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer"
                              title="Excluir Ideia"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {ideas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <Lightbulb className="mx-auto text-[#ccc] mb-2" size={32} />
                      <p className="text-[#999] text-[13px]">
                        {isSolutionBrainstorming
                          ? 'Informe acima o que deseja melhorar e gere as primeiras ideias.'
                          : 'Nenhuma ideia coletada ainda. Comece a brainstormar!'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button data-save-trigger onClick={handleSave} className="hidden" />
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
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Brainstorming</h3>
                  <p className="text-xs text-gray-500 m-0">{BRAINSTORMING_EXEMPLOS[exemploIdx].brainstormingTopic}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemplo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Abas — Escritório / Manufatura */}
            <div className="flex gap-2 px-6 pt-4">
              {BRAINSTORMING_EXEMPLOS.map((ex, i) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tipo de Brainstorming</span>
                  <p className="text-[13px] font-bold text-gray-800 p-3 bg-gray-50 border border-[#eee] rounded-[4px] m-0">{BRAINSTORMING_EXEMPLOS[exemploIdx].brainstormingType}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">O que é / Objetivo</span>
                  <p className="text-[13px] text-gray-800 p-3 bg-gray-50 border border-[#eee] rounded-[4px] m-0">{BRAINSTORMING_EXEMPLOS[exemploIdx].brainstormingTopic}</p>
                </div>
              </div>

              {/* Ideias agrupadas por categoria (6M) */}
              <div className="space-y-4">
                {CATEGORIES.map((cat) => {
                  const ideasDaCat = BRAINSTORMING_EXEMPLOS[exemploIdx].ideas.filter(i => i.category === cat);
                  if (ideasDaCat.length === 0) return null;
                  return (
                    <div key={cat} className="border border-[#eee] rounded-[8px] overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-[#eee]">
                        <Tag size={13} className="text-blue-500" />
                        <span className="text-[12px] font-black text-[#333] uppercase tracking-wider">{cat}</span>
                        <span className="text-[11px] text-gray-400">({ideasDaCat.length})</span>
                      </div>
                      <ul className="divide-y divide-[#f5f5f5] m-0 p-0 list-none">
                        {ideasDaCat.map((idea, idx) => (
                          <li key={idx} className="px-4 py-2.5 text-[13px] text-[#333] font-medium">{idea.text}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

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
