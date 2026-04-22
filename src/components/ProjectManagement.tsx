import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Briefcase, Folder, Edit2, Trash2, X, User as UserIcon, CheckCircle2, Sparkles, Zap, Target, BarChart3, Settings, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import ProjectJourney from './projects/ProjectJourney';
import MentorSidebar from './projects/MentorSidebar';
import { 
  doc, 
  getDocFromServer,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getUserProjects, createProject, deleteProject, updateProjectPhase } from '../services/projectService';
import { getInitiatives } from '../services/configService';
import { Initiative, Project } from '../types';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'israelnz2018@hotmail.com';

const getInitiativeIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('pequenas') || n.includes('melhoria')) return <Zap size={24} />;
  if (n.includes('lean') || n.includes('sigma') || n.includes('six')) return <Target size={24} />;
  if (n.includes('bpm') || n.includes('processo')) return <BarChart3 size={24} />;
  if (n.includes('implementação') || n.includes('projeto')) return <Settings size={24} />;
  return <Briefcase size={24} />;
};

import { chatWithMentor, getMentorSuggestions } from '../services/aiService';

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>('');
  const [selectedParentInitiativeId, setSelectedParentInitiativeId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = auth.currentUser?.email?.toLowerCase() === ADMIN_EMAIL;

  // Mentor State
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isGeneratingMentor, setIsGeneratingMentor] = useState(false);

  // Fetch dynamic suggestions when phase or project changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (selectedProject) {
        try {
          const suggestions = await getMentorSuggestions(
            currentPhase, 
            null, 
            selectedProject.completedTools || [], 
            {} // projectData
          );
          setDynamicSuggestions(suggestions);
        } catch (error) {
          console.error("Error fetching mentor suggestions:", error);
        }
      }
    };
    fetchSuggestions();
  }, [selectedProject?.id, currentPhase]);

  const fetchProjects = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const projectsPromise = getUserProjects().catch(err => {
        console.error("Error fetching projects:", err);
        return [] as Project[];
      });
      
      const initiativesPromise = getInitiatives().catch(err => {
        console.error("Error fetching initiatives:", err);
        return [] as Initiative[];
      });

      const [projectsData, initiativesData] = await Promise.all([
        projectsPromise,
        initiativesPromise
      ]);

      setProjects(projectsData || []);
      setInitiatives(initiativesData || []);
      
      // Update selectedProject if it exists
      if (selectedProject) {
        const updatedSelected = (projectsData || []).find(p => p.id === selectedProject.id);
        if (updatedSelected) {
          setSelectedProject(updatedSelected);
        }
      }

      // Logic for "TESTE 5" - Requirement 4
      const teste5 = projectsData.find(p => p.name === 'TESTE 5');
      if (teste5 && initiativesData.length > 0) {
        const leanSixSigma = initiativesData.find(i => i.name.includes('1.2') || i.name.toLowerCase().includes('lean six sigma'));
        if (leanSixSigma && teste5.initiativeId !== leanSixSigma.id) {
          await updateDoc(doc(db, 'projects', teste5.id), {
            initiativeId: leanSixSigma.id
          });
          console.log("Updated TESTE 5 to Lean Six Sigma");
        }
      }
    } catch (error) {
      console.error("Unexpected error in fetchProjects:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedProject?.id]); // Only depend on ID to avoid loop if object reference changes

  useEffect(() => {
    // Initial load
    fetchProjects(true);
  }, []); // Only run once on mount

  const handlePhaseChange = useCallback((phase: string) => {
    setCurrentPhase(phase);
    fetchProjects(false); // Refresh list without showing the global loading spinner
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !selectedInitiativeId || isSubmitting) {
      if (!selectedInitiativeId) alert("Por favor, selecione uma iniciativa para o projeto.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const initiative = initiatives.find(i => i.id === selectedInitiativeId);
      const firstPhase = initiative?.phases?.[0]?.id || 'Define';
      
      const project = await createProject(newProjectName, selectedInitiativeId || undefined, firstPhase);
      
      setNewProjectName('');
      setSelectedInitiativeId('');
      setIsCreating(false);
      
      // Refresh list
      const data = await getUserProjects();
      setProjects(data || []);
      
      // Select the new project
      setSelectedProject(project as Project);
      setCurrentPhase(firstPhase);
      toast.success("Projeto criado com sucesso!");
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error("Erro ao criar projeto: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete);
      if (selectedProject?.id === projectToDelete) {
        setSelectedProject(null);
        setCurrentPhase(null);
      }
      fetchProjects();
      toast.success("Projeto excluído com sucesso.");
    } catch (error) {
      toast.error("Erro ao excluir projeto.");
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  const handleEditProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    const initiative = initiatives.find(i => i.id === project.initiativeId);
    const firstPhase = initiative?.phases?.[0]?.id || 'Define';
    setCurrentPhase(project.currentPhase || firstPhase);
    // Optionally update the currentPhase in DB to Define if requested
    try {
      if (!project.currentPhase) {
        await updateProjectPhase(project.id, firstPhase);
        await fetchProjects();
      }
    } catch (error) {
      console.error("Error updating phase:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedProject || isGeneratingMentor) return;
    
    const userMsg = inputMessage;
    const currentHistory = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(currentHistory);
    setInputMessage('');
    setIsGeneratingMentor(true);

    try {
      const response = await chatWithMentor(
        currentPhase,
        null,
        {}, 
        { name: selectedProject.name, description: selectedProject.description },
        currentHistory
      );
      
      setMessages([...currentHistory, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error("Error chatting with mentor:", error);
      setMessages([...currentHistory, { role: 'assistant', content: "Desculpe, tive um problema ao processar sua pergunta. Pode tentar novamente?" }]);
    } finally {
      setIsGeneratingMentor(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-[#f0f2f5] h-screen overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 min-w-0 space-y-6">
        {/* Top Section: My Projects */}
        <div className="shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Meus Projetos Ativos</h2>
            {selectedProject && (
              <button 
                onClick={() => setSelectedProject(null)}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-wider"
              >
                <Plus size={12} /> Novo Projeto
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center gap-3 py-4 text-gray-400 text-xs italic bg-white rounded-xl border border-gray-100 justify-center">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Carregando...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Nenhum projeto ativo</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="max-h-[180px] overflow-y-auto">
                {projects.map((project) => {
                  const initiative = initiatives.find(i => i.id === project.initiativeId);
                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setCurrentPhase(project.currentPhase);
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 border-b border-gray-50 last:border-0 cursor-pointer transition-all hover:bg-blue-50/30 group",
                        selectedProject?.id === project.id && "bg-blue-50/50 border-l-4 border-l-blue-600"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          selectedProject?.id === project.id ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                        )}>
                          {getInitiativeIcon(initiative?.name || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-800 text-sm truncate uppercase tracking-tight">
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                              {initiative?.name || 'Geral'}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-gray-300" />
                              Fase: {initiative?.phases?.find(p => p.id === project.currentPhase)?.name || project.currentPhase || 'Definir'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button 
                          onClick={(e) => handleEditProject(project, e)}
                          className="p-2 text-gray-300 hover:text-blue-600 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          className="p-2 text-gray-300 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key={selectedProject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="pb-8"
              >
                <ProjectJourney 
                  projectId={selectedProject.id}
                  project={selectedProject}
                  onPhaseChange={handlePhaseChange} 
                />
              </motion.div>
            ) : (
              /* New Project Selection Flow */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="text-center max-w-xl mx-auto pt-4">
                  <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter mb-2">
                    O que vamos <span className="text-blue-600">melhorar</span> hoje?
                  </h1>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Selecione uma iniciativa para iniciar sua jornada
                  </p>
                </div>

                {/* Step 1: Root Initiatives with Integrated Sub-initiatives */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {initiatives
                    .filter(i => !i.parentId)
                    .sort((a, b) => {
                      const numA = parseInt(a.name) || 0;
                      const numB = parseInt(b.name) || 0;
                      if (numA !== numB) return numA - numB;
                      return a.name.localeCompare(b.name);
                    })
                    .map((initiative) => {
                      const isSelected = selectedParentInitiativeId === initiative.id;
                      const children = initiatives
                        .filter(i => i.parentId === initiative.id)
                        .sort((ca, cb) => {
                          const numA = parseInt(ca.name.split('.')[1] || ca.name) || 0;
                          const numB = parseInt(cb.name.split('.')[1] || cb.name) || 0;
                          return numA - numB;
                        });

                      return (
                        <div key={initiative.id} className="flex flex-col gap-2">
                          <motion.button
                            whileHover={{ y: -4 }}
                            onClick={() => {
                              setSelectedParentInitiativeId(isSelected ? null : initiative.id);
                              setSelectedInitiativeId('');
                            }}
                            className={cn(
                              "p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group h-full flex flex-col",
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100"
                                : "bg-white border-gray-100 hover:border-blue-200 shadow-sm"
                            )}
                          >
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                              isSelected ? "bg-white/20" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                            )}>
                              {getInitiativeIcon(initiative.name)}
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-tight mb-1">{initiative.name}</h3>
                            <p className={cn(
                              "text-[10px] font-bold leading-tight",
                              isSelected ? "text-blue-100" : "text-gray-400"
                            )}>
                              {initiative.description || 'Selecione para ver subcategorias.'}
                            </p>
                          </motion.button>

                          {/* Sub-initiatives inside/below the box */}
                          <AnimatePresence>
                            {isSelected && children.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white border border-blue-100 rounded-2xl p-2 shadow-lg space-y-1"
                              >
                                {children.map(child => (
                                  <button
                                    key={child.id}
                                    onClick={() => {
                                      setSelectedInitiativeId(child.id);
                                      setIsCreating(true);
                                    }}
                                    className="w-full p-3 text-left hover:bg-blue-50 rounded-xl transition-all flex items-center justify-between group"
                                  >
                                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight group-hover:text-blue-600">
                                      {child.name}
                                    </span>
                                    <ChevronRight size={12} className="text-gray-300 group-hover:text-blue-600" />
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="hidden lg:block sticky top-0 h-full shrink-0">
        <MentorSidebar 
          currentPhase={currentPhase}
          messages={messages}
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          onSendMessage={handleSendMessage}
          suggestions={dynamicSuggestions.length > 0 ? dynamicSuggestions : getMentorStaticSuggestions(currentPhase)}
          mentorMessage={getMentorMessage(currentPhase)}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Excluir Projeto?</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                  Esta ação é irreversível. Todos os dados e ferramentas deste projeto serão perdidos permanentemente.
                </p>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setIsDeleting(false)}
                  className="flex-1 py-4 text-xs font-black text-gray-500 hover:text-gray-700 uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-red-700 shadow-xl shadow-red-200 uppercase tracking-widest transition-all"
                >
                  EXCLUIR AGORA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Project Modal (Simplified) */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            >
              <form onSubmit={handleCreateProject}>
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Novo Projeto</h3>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
                      {initiatives.find(i => i.id === selectedInitiativeId)?.name}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsCreating(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                      Nome do Projeto
                    </label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Ex: Redução de Desperdício na Linha A"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4 items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
                      Ao criar este projeto, o Mentor IA irá carregar as ferramentas e vídeos específicos para esta metodologia.
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-4 text-xs font-black text-gray-500 hover:text-gray-700 uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !newProjectName.trim()}
                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-50 uppercase tracking-widest transition-all"
                  >
                    {isSubmitting ? 'CRIANDO...' : 'INICIAR JORNADA'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getMentorMessage(phase: string | null): string {
  if (!phase) return 'Bem-vindo à sua central de projetos! Como posso te ajudar a organizar suas melhorias hoje?';
  switch (phase) {
    case 'Define': return 'O Project Charter é o seu contrato com a empresa. Seja específico. "Melhorar a qualidade" é vago. "Reduzir defeitos de 5% para 2%" é um compromisso.';
    case 'Analyze': return 'Agora somos detetives. Não aceite a primeira resposta. Use os "5 Porquês" para cada causa que você colocar no Ishikawa.';
    default: return 'Continue focado no processo. O DMAIC é uma bússola, não uma regra rígida. Adapte-se aos dados.';
  }
}

function getMentorStaticSuggestions(phase: string | null): string[] {
  if (!phase) return [
    'Como começar um novo projeto?',
    'Quais ferramentas usar no DMAIC?',
    'Dicas de gestão de equipe'
  ];
  switch (phase) {
    case 'Define': return [
      'Como escrever uma meta SMART?',
      'O que colocar no escopo?',
      'Como calcular o impacto financeiro?'
    ];
    case 'Analyze': return [
      'Como usar os 5 Porquês?',
      'Diferença entre causa e sintoma',
      'Como priorizar causas raiz?'
    ];
    default: return ['Próximos passos', 'Ver ferramentas recomendadas'];
  }
}
