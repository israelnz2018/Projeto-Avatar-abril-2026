import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, Trash2, CheckCircle2, MessageSquare, Tag, Users, HelpCircle, Target, Edit2, X as CloseIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface BrainstormingProps {
  onSave: (data: any) => void;
  initialData?: any;
}

interface Idea {
  id: string;
  text: string;
  category: string;
  author: string;
  votes: number;
}

const CATEGORIES = ['Mão de Obra', 'Método', 'Material', 'Máquina', 'Meio Ambiente', 'Medição', 'Não colocar na espinha de peixe'];
const BRAINSTORMING_TYPES = [
  'Ideias de projetos de melhoria',
  'Problema pra resolver',
  'Identificar melhor solução',
  'Identificação de riscos'
];

export default function Brainstorming({ onSave, initialData }: BrainstormingProps) {
  const [brainstormingType, setBrainstormingType] = useState(initialData?.brainstormingType || BRAINSTORMING_TYPES[0]);
  const [brainstormingTopic, setBrainstormingTopic] = useState(initialData?.brainstormingTopic || '');
  const [ideas, setIdeas] = useState<Idea[]>(initialData?.ideas || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editAuthor, setEditAuthor] = useState('');

  useEffect(() => {
    if (initialData) {
      if (initialData.ideas) setIdeas(initialData.ideas);
      if (initialData.brainstormingType) setBrainstormingType(initialData.brainstormingType);
      if (initialData.brainstormingTopic) setBrainstormingTopic(initialData.brainstormingTopic);
    } else {
      // Reset to defaults if initialData is null/undefined
      setIdeas([]);
      setBrainstormingType(BRAINSTORMING_TYPES[0]);
      setBrainstormingTopic('');
    }
  }, [initialData]);

  const [newIdea, setNewIdea] = useState('');
  const [author, setAuthor] = useState('');

  const addIdea = () => {
    if (!newIdea.trim()) return;
    
    const idea: Idea = {
      id: Date.now().toString(),
      text: newIdea,
      category: 'Mão de Obra',
      author: author || 'Anônimo',
      votes: 0
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

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8">
        <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
          <Lightbulb className="text-yellow-500" size={24} />
          <div>
            <h2 className="text-[1.25rem] font-bold text-[#333]">Brainstorming</h2>
            <p className="text-[12px] text-[#666]">Colete opiniões e ideias sobre possíveis causas e variáveis do processo.</p>
          </div>
        </div>

        {/* Configuration Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {/* Input Area */}
        <div className="bg-[#f9fafb] p-6 rounded-[8px] border border-[#eee] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-500" />
                Ideia
              </label>
              <input 
                type="text"
                value={newIdea}
                onChange={(e) => setNewIdea(e.target.value)}
                placeholder="Digite sua ideia aqui..."
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
            <h3 className="text-[14px] font-black text-[#333] uppercase tracking-widest">Ideias Coletadas ({ideas.length})</h3>
          </div>
          
          <div className="overflow-x-auto border border-[#eee] rounded-[8px] shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[#eee]">
                  <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[8%] text-center">ID</th>
                  <th className={cn("p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest", showCategories ? "w-[42%]" : "w-[62%]")}>Ideia</th>
                  <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[20%]">Autor</th>
                  {showCategories && <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[20%] text-center">Categoria (6M)</th>}
                  <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-[10%] text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ideas.map((idea, index) => (
                  <tr key={idea.id} className="border-b border-[#f5f5f5] hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-center">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-black rounded border border-blue-100">
                        X{index + 1}
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
                        idea.text
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
                        idea.author
                      )}
                    </td>
                    {showCategories && (
                      <td className="p-4">
                        <select 
                          value={idea.category}
                          onChange={(e) => updateIdeaCategory(idea.id, e.target.value)}
                          className="w-full p-1.5 border border-[#eee] rounded-[4px] text-[12px] focus:outline-none focus:border-blue-500 bg-white"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </td>
                    )}
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
                ))}
                {ideas.length === 0 && (
                  <tr>
                    <td colSpan={showCategories ? 5 : 4} className="p-12 text-center">
                      <Lightbulb className="mx-auto text-[#ccc] mb-2" size={32} />
                      <p className="text-[#999] text-[13px]">Nenhuma ideia coletada ainda. Comece a brainstormar!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-[#eee]">
          <button
            onClick={handleSave}
            className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-md"
          >
            <CheckCircle2 size={18} className="mr-2" />
            Salvar e Prosseguir
          </button>
        </div>
      </div>
    </div>
  );
}
