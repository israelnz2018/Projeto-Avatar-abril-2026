import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Plus, Briefcase, Folder, Edit2, Trash2, X, User as UserIcon, CheckCircle2, Sparkles, Zap, Target, BarChart3, Settings, AlertTriangle, ChevronRight, ChevronDown, ArrowRight, FolderOpen, Presentation, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateFullProjectPresentation } from '../services/fullProjectPresentationExporter';
import { getUserProfile } from './UserProfile';
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
import { Toaster, toast } from 'sonner';
import { useUserAccess } from '../hooks/useUserAccess';
import { LockedToolPopup } from './LockedToolPopup';
import { Lock } from 'lucide-react';

const ADMIN_EMAIL = 'israelnz2018@hotmail.com';

// LBW Brand Palette
const LBW = {
  navy: '#1E2D6E',
  blue: '#0033CC',
  blueLight: '#6699FF',
  light: '#F0F2FA',
  ink: '#2A2F3A',
  white: '#FFFFFF',
};

// Mesh Background animado (4 blobs azuis em loop)
function MeshBackground() {
  const reduce = useReducedMotion();
  const blobs = useMemo(() => ([
    { c: '#C7D2FF', x: '8%',  y: '14%', s: 320 },
    { c: '#A8B6FF', x: '78%', y: '8%',  s: 280 },
    { c: '#D4DCFF', x: '62%', y: '78%', s: 340 },
    { c: '#E2E8FF', x: '12%', y: '82%', s: 260 },
  ]), []);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none rounded-[24px]">
      {blobs.map((b, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ left: b.x, top: b.y, width: b.s, height: b.s, background: `radial-gradient(closest-side, ${b.c}, transparent 70%)`, filter: 'blur(40px)', opacity: 0.55 }}
          animate={reduce ? {} : { x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
          transition={{ duration: 20 + i*3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// HeroInitiativeCard com 3 variantes (dark, outlined, light)
function HeroInitiativeCard({ initiative, variant, icon: Icon, index, isSelected, hasOtherSelected, onClick }: {
  initiative: Initiative;
  variant: 'dark' | 'outlined' | 'light';
  icon: React.ReactNode;
  index: number;
  isSelected: boolean;
  hasOtherSelected: boolean;
  onClick: () => void;
}) {
  const isDark = variant === 'dark';
  const isOutlined = variant === 'outlined';

  const cardBg = isDark ? LBW.navy : (isOutlined ? LBW.white : LBW.light);
  const cardBorder = isSelected ? LBW.blueLight : (isDark ? 'transparent' : (isOutlined ? LBW.blue : 'rgba(30,45,110,0.08)'));
  const titleColor = isDark ? LBW.white : LBW.navy;
  const subColor = isDark ? 'rgba(255,255,255,0.72)' : '#52596B';
  const tagColor = isDark ? LBW.blueLight : LBW.blue;
  const iconBg = isDark ? 'rgba(255,255,255,0.12)' : `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})`;
  const iconBorder = isDark ? '1px solid rgba(255,255,255,0.18)' : 'none';
  const arrowBg = isDark ? LBW.white : LBW.blue;
  const arrowColor = isDark ? LBW.navy : LBW.white;
  const beganColor = isDark ? 'rgba(255,255,255,0.7)' : '#6B7180';

  return (
    <motion.button
      initial={{ opacity: 0, y: 18, scale: 0.92 }}
      animate={{
        opacity: hasOtherSelected ? 0.5 : 1,
        y: isSelected ? -4 : 0,
        scale: 1
      }}
      transition={{ delay: 0.18 + index*0.07, type: 'spring', stiffness: 220, damping: 18 }}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative text-left rounded-[24px] p-6 overflow-hidden flex flex-col gap-4 cursor-pointer min-h-[220px] w-full"
      style={{
        background: cardBg,
        border: `${isSelected ? '2px' : '1px'} solid ${cardBorder}`,
        boxShadow: isSelected
          ? `0 24px 60px -20px ${LBW.blue}99`
          : (isDark ? `0 18px 50px -22px ${LBW.navy}90` : (isOutlined ? `0 0 0 1px ${LBW.blue}22 inset, 0 12px 36px -20px ${LBW.navy}30` : `0 1px 0 rgba(255,255,255,0.7) inset, 0 14px 40px -16px ${LBW.navy}33`)),
      }}
    >
      {/* Glow radial no canto superior direito */}
      <motion.div aria-hidden className="absolute rounded-full pointer-events-none"
        style={{
          background: isDark ? `radial-gradient(closest-side, #6699FF55, transparent 70%)` : `radial-gradient(closest-side, ${LBW.blue}26, transparent 70%)`,
          top: '-30%', right: '-30%', width: 320, height: 320,
          opacity: isSelected ? 1 : 0.85
        }}
        variants={{ hover: { scale: 1.15, opacity: 1 } }}
      />

      {/* Ícone */}
      <motion.div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: iconBg,
          color: LBW.white,
          boxShadow: isDark ? `0 8px 22px -8px ${LBW.blue}` : `0 10px 24px -8px ${LBW.blue}66`,
          border: iconBorder
        }}
        variants={{ hover: { y: -2, scale: 1.06, rotate: -3 } }}
      >
        {Icon}
      </motion.div>

      {/* Conteúdo */}
      <div className="relative flex-1">
        <span className="text-[10px] font-semibold tracking-[0.14em] uppercase block mb-2" style={{ color: tagColor }}>
          {variant === 'dark' ? 'Melhoria' : (variant === 'light' ? 'Estatística' : 'Análise')}
        </span>
        <h3 className="text-[18px] font-semibold leading-[1.1] tracking-tight mb-2" style={{ color: titleColor }}>
          {initiative.name}
        </h3>
        <p className="text-[12px] leading-relaxed" style={{ color: subColor }}>
          {initiative.description || 'Selecione para ver subcategorias.'}
        </p>

        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg mt-3"
            style={{
              background: isDark ? 'rgba(255,255,255,0.15)' : `${LBW.blue}15`,
              color: isDark ? LBW.white : LBW.blue,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.25)' : `${LBW.blue}33`}`
            }}
          >
            <CheckCircle2 size={11} />
            <span className="text-[9px] font-semibold tracking-[0.06em] uppercase">Selecionado</span>
          </motion.div>
        )}
      </div>

      {/* Rodapé com seta */}
      <div className="relative flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: beganColor }}>
          {isSelected ? 'Escolha sua trilha →' : 'Começar'}
        </span>
        <motion.div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: arrowBg, color: arrowColor }}
          variants={{ hover: { x: 4 } }}
        >
          <ArrowRight size={15} />
        </motion.div>
      </div>
    </motion.button>
  );
}

// Card de sub-iniciativa (trilha)
function SubInitiativeCard({ child, index, onClick }: { child: Initiative; index: number; onClick: () => void }) {
  // Tenta extrair número da trilha (ex: "1.1", "1.2") - se não tiver, mostra os primeiros caracteres
  const numMatch = child.name.match(/^([\d.]+)/);
  const num = numMatch ? numMatch[1] : '';
  const title = numMatch ? child.name.replace(/^[\d.]+\s*[-—]?\s*/, '') : child.name;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 220, damping: 18 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="w-full bg-white/95 backdrop-blur hover:bg-white border border-blue-100 hover:border-blue-500 rounded-[14px] p-3 flex items-start justify-between transition-all cursor-pointer group min-h-[64px]"
      style={{ boxShadow: '0 4px 12px -4px rgba(30, 45, 110, 0.1)' }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {num && (
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5"
            style={{ background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})` }}>
            {num}
          </div>
        )}
        <div className="text-left flex-1 min-w-0">
          <div className="text-[12px] font-bold uppercase tracking-tight leading-snug" style={{ color: LBW.navy, letterSpacing: '-0.01em' }}>
            {title}
          </div>
        </div>
      </div>
      <ChevronRight size={16} className="text-blue-500 shrink-0 ml-2 mt-1 transition-transform group-hover:translate-x-1" />
    </motion.button>
  );
}

const getInitiativeIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('gerenciamento') || n.includes('gestão') || n.includes('gestao') || n.includes('projetos de melhoria')) return <Zap size={24} />;
  if (n.includes('análise de dados') || n.includes('analise de dados') || n.includes('negócios') || n.includes('negocios')) return <Briefcase size={24} />;
  if (n.includes('análise técnica') || n.includes('analise tecnica') || n.includes('técnica de dados') || n.includes('tecnica de dados') || n.includes('estatística') || n.includes('estatistica')) return <BarChart3 size={24} />;
  if (n.includes('lean') || n.includes('sigma') || n.includes('six')) return <Target size={24} />;
  if (n.includes('bpm') || n.includes('processo')) return <BarChart3 size={24} />;
  if (n.includes('implementação') || n.includes('projeto')) return <Settings size={24} />;
  return <Folder size={24} />;
};

import { useProject } from '../contexts/ProjectContext';

export default function ProjectManagement() {
  const { setProjetoAtivo } = useProject();
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
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false);
  const [generatingPPTId, setGeneratingPPTId] = useState<string | null>(null);

  const { canUseInitiative } = useUserAccess();

  const isAdmin = auth.currentUser?.email?.toLowerCase() === ADMIN_EMAIL;

  // Mentor sugestões (sidebar) — pré-fixas por fase, sem IA.
  const [dynamicSuggestions] = useState<string[]>([]);

  // Dropdown "Meus Projetos Ativos"
  const [isProjectsListOpen, setIsProjectsListOpen] = useState(false);

  // Trilhas (sub-iniciativas) da iniciativa selecionada
  const children = useMemo(() => {
    if (!selectedParentInitiativeId) return [];
    return initiatives
      .filter(i => i.parentId === selectedParentInitiativeId)
      .sort((ca, cb) => {
        const numA = parseInt(ca.name.split('.')[1] || ca.name) || 0;
        const numB = parseInt(cb.name.split('.')[1] || cb.name) || 0;
        return numA - numB;
      });
  }, [initiatives, selectedParentInitiativeId]);

  // (Sugestões dinâmicas do mentor foram removidas em 2026-05-17 — antes chamavam IA
  // só pra montar 3 perguntas curtas, e o sidebar já tem sugestões fixas por fase.)

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

  const handleGeneratePPT = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (generatingPPTId) return;
    setGeneratingPPTId(project.id);
    try {
      const userProfile = getUserProfile();
      const result = await generateFullProjectPresentation(project, {
        userName: userProfile?.name || project.ownerEmail || '',
      });
      if (result.toolsExported === 0) {
        toast.error('Nenhuma ferramenta com slide disponível foi encontrada neste projeto.');
      } else {
        const skippedMsg = result.toolsSkipped.length > 0
          ? ` (${result.toolsSkipped.length} ferramenta(s) ignorada(s) sem slide)`
          : '';
        toast.success(`Apresentação gerada com ${result.toolsExported} ferramenta(s)${skippedMsg}.`);
      }
    } catch (error) {
      console.error('Erro ao gerar apresentação completa:', error);
      toast.error('Erro ao gerar a apresentação. Tente novamente.');
    } finally {
      setGeneratingPPTId(null);
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-[#f0f2f5] h-screen overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 min-w-0 space-y-4">
        {/* Top Section: Meus Projetos Ativos (DROPDOWN) */}
        <div className="shrink-0">
          {loading ? (
            <div className="flex items-center gap-3 py-4 text-gray-400 text-xs italic bg-white rounded-2xl border border-gray-100 justify-center">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Carregando...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-4 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Nenhum projeto ativo · crie seu primeiro abaixo</p>
            </div>
          ) : (
            <div>
              {/* Botão "Criar Novo Projeto" — acima do dropdown */}
              <button
                onClick={() => setIsCreating(true)}
                className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-[13px] text-white transition-all cursor-pointer border-none"
                style={{ background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})`, boxShadow: '0 6px 16px -6px rgba(0, 51, 204, 0.4)' }}
              >
                <Plus size={16} />
                Criar novo projeto
              </button>

              {/* Header do dropdown (sempre visível) */}
              <button
                onClick={() => setIsProjectsListOpen(!isProjectsListOpen)}
                className="w-full bg-white border border-gray-100 hover:border-blue-200 rounded-2xl px-5 py-3 flex items-center justify-between cursor-pointer transition-all group"
                style={{ boxShadow: '0 4px 12px -4px rgba(30, 45, 110, 0.1)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${LBW.navy}, ${LBW.blue})` }}>
                    <FolderOpen size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: LBW.blueLight }}>
                      Meus projetos ativos
                    </div>
                    <div className="text-[13px] font-semibold" style={{ color: LBW.navy }}>
                      {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'} · clique para {isProjectsListOpen ? 'recolher' : 'expandir'}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isProjectsListOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={18} style={{ color: LBW.blue }} />
                </motion.div>
              </button>

              {/* Lista expandida */}
              <AnimatePresence>
                {isProjectsListOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className="bg-white border border-blue-100 rounded-2xl p-3 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar"
                      style={{ boxShadow: '0 18px 40px -20px rgba(30, 45, 110, 0.25)' }}>
                      {projects.map((project, idx) => {
                        const initiative = initiatives.find(i => i.id === project.initiativeId);
                        const isCurrentSelected = selectedProject?.id === project.id;
                        return (
                          <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            onClick={() => {
                              setSelectedProject(project);
                              setCurrentPhase(project.currentPhase);
                              setProjetoAtivo(project);
                              setIsProjectsListOpen(false);
                            }}
                            className={cn(
                              "rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all group",
                              isCurrentSelected
                                ? "bg-blue-50"
                                : "bg-[#F0F2FA] hover:bg-blue-50"
                            )}
                            style={{
                              borderLeft: `3px solid ${isCurrentSelected ? LBW.blue : `${LBW.blue}66`}`
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-bold uppercase truncate" style={{ color: LBW.navy, letterSpacing: '-0.01em' }}>
                                {project.name}
                              </div>
                              <div className="text-[10px] mt-1 flex items-center gap-2" style={{ color: '#52596B' }}>
                                <span className="font-semibold">{initiative?.name || 'Geral'}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <span className="font-semibold" style={{ color: LBW.blue }}>
                                  Fase: {initiative?.phases?.find(p => p.id === project.currentPhase)?.name || project.currentPhase || 'Definir'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-3">
                              <button
                                onClick={(e) => handleGeneratePPT(project, e)}
                                disabled={!!generatingPPTId}
                                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-blue-600 transition-all border border-gray-200 hover:border-blue-300 cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Gerar apresentação PowerPoint completa do projeto"
                              >
                                {generatingPPTId === project.id
                                  ? <Loader2 size={12} className="animate-spin text-blue-600" />
                                  : <Presentation size={12} />}
                              </button>
                              <button
                                onClick={(e) => handleEditProject(project, e)}
                                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-blue-600 transition-all border border-gray-200 hover:border-blue-300 cursor-pointer bg-transparent"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteProject(project.id, e)}
                                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-600 transition-all border border-gray-200 hover:border-red-300 cursor-pointer bg-transparent"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 lbw-sleek-scrollbar">
          <style>{`
            .lbw-sleek-scrollbar::-webkit-scrollbar { width: 6px; }
            .lbw-sleek-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .lbw-sleek-scrollbar::-webkit-scrollbar-thumb { background: rgba(30, 45, 110, 0.15); border-radius: 3px; transition: background 0.2s; }
            .lbw-sleek-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(30, 45, 110, 0.35); }
            .lbw-sleek-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(30, 45, 110, 0.15) transparent; }
          `}</style>
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
                  onActiveToolChange={(toolId, toolLabel) => {
                    setActiveToolId(toolId);
                    setActiveToolLabel(toolLabel);
                  }}
                />
              </motion.div>
            ) : (
              /* New Project Selection Flow — LBW Design v2 */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Container com Mesh Background animado */}
                <div className="relative rounded-[24px] overflow-hidden" style={{ background: LBW.light, padding: '32px 24px' }}>
                  <MeshBackground />

                  {/* Header */}
                  <div className="relative text-center max-w-xl mx-auto mb-8">
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                      style={{ color: LBW.blue }}
                    >
                      {selectedParentInitiativeId ? 'Você selecionou' : 'Nova jornada'}
                    </motion.div>
                    <motion.h1
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="text-[32px] font-bold leading-tight tracking-tight mb-2"
                      style={{ color: LBW.navy, letterSpacing: '-0.02em' }}
                    >
                      {selectedParentInitiativeId ? (
                        <>Escolha sua <span style={{ color: LBW.blue }}>trilha</span></>
                      ) : (
                        <>O que vamos <span style={{ color: LBW.blue }}>melhorar</span> hoje?</>
                      )}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-[12px] tracking-wide"
                      style={{ color: '#52596B' }}
                    >
                      {selectedParentInitiativeId
                        ? 'Selecione uma trilha para criar o projeto'
                        : 'Selecione uma iniciativa para iniciar sua jornada'}
                    </motion.p>
                  </div>

                  {/* Hero Cards */}
                  {(() => {
                    const rootCount = initiatives.filter(i => !i.parentId).length;
                    const gridCols = rootCount === 1 ? 'lg:grid-cols-1'
                      : rootCount === 2 ? 'lg:grid-cols-2'
                      : rootCount === 3 ? 'lg:grid-cols-3'
                      : 'lg:grid-cols-4';
                    return (
                      <div className={cn("relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-2", gridCols)}>
                        {initiatives
                          .filter(i => !i.parentId)
                          .sort((a, b) => {
                            const numA = parseInt(a.name) || 0;
                            const numB = parseInt(b.name) || 0;
                            if (numA !== numB) return numA - numB;
                            return a.name.localeCompare(b.name);
                          })
                          .map((initiative, index) => {
                            const isSelected = selectedParentInitiativeId === initiative.id;
                            const hasOtherSelected = selectedParentInitiativeId !== null && !isSelected;
                            // Primeiro card sempre dark (destaque), demais alternam outlined/light
                            const variant: 'dark' | 'outlined' | 'light' =
                              index === 0 ? 'dark' : (index % 2 === 1 ? 'outlined' : 'light');
                            return (
                              <HeroInitiativeCard
                                key={initiative.id}
                                initiative={initiative}
                                variant={variant}
                                icon={getInitiativeIcon(initiative.name)}
                                index={index}
                                isSelected={isSelected}
                                hasOtherSelected={hasOtherSelected}
                                onClick={() => {
                                  setSelectedParentInitiativeId(isSelected ? null : initiative.id);
                                  setSelectedInitiativeId('');
                                }}
                              />
                            );
                          })}
                      </div>
                    );
                  })()}

                  {/* Painel de sub-iniciativas (trilhas) - desce abaixo dos cards */}
                  <AnimatePresence mode="wait">
                    {selectedParentInitiativeId && initiatives.filter(i => i.parentId === selectedParentInitiativeId).length > 0 && (
                      <motion.div
                        key={selectedParentInitiativeId}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="relative mt-4"
                      >
                          <div className="bg-white rounded-[20px] p-5 border border-blue-100 relative"
                            style={{ boxShadow: '0 24px 60px -20px rgba(30, 45, 110, 0.25)' }}>
                            {/* Conector visual saindo do card selecionado */}
                            {(() => {
                              const rootInitiatives = initiatives.filter(i => !i.parentId).sort((a, b) => {
                                const numA = parseInt(a.name) || 0;
                                const numB = parseInt(b.name) || 0;
                                if (numA !== numB) return numA - numB;
                                return a.name.localeCompare(b.name);
                              });
                              const totalRoots = rootInitiatives.length;
                              const selectedIdx = rootInitiatives.findIndex(i => i.id === selectedParentInitiativeId);
                              if (selectedIdx < 0 || totalRoots === 0) return null;
                              const leftPercent = ((selectedIdx + 0.5) / totalRoots) * 100;
                              return (
                                <>
                                  <div className="absolute -top-3 w-px h-3"
                                    style={{ left: `${leftPercent}%`, background: LBW.blueLight }} />
                                  <div className="absolute -top-[7px] w-3 h-3 rotate-45 border-l border-t border-blue-200 bg-white"
                                    style={{ left: `calc(${leftPercent}% - 6px)` }} />
                                </>
                              );
                            })()}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-[3px] h-[14px] rounded-full" style={{ background: LBW.blue }} />
                              <div className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: LBW.navy }}>
                                Trilhas Disponíveis
                              </div>
                              <div className="flex-1 h-px bg-blue-100" />
                              <div className="text-[10px] font-semibold" style={{ color: '#6B7180' }}>
                                {children.length} {children.length === 1 ? 'trilha' : 'trilhas'}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {initiatives
                                .filter(i => i.parentId === selectedParentInitiativeId)
                                .sort((ca, cb) => {
                                  const numA = parseInt(ca.name.split('.')[1] || ca.name) || 0;
                                  const numB = parseInt(cb.name.split('.')[1] || cb.name) || 0;
                                  return numA - numB;
                                })
                                .map((child, idx) => (
                                  <SubInitiativeCard
                                    key={child.id}
                                    child={child}
                                    index={idx}
                                    onClick={() => {
                                      setSelectedInitiativeId(child.id);
                                      setIsCreating(true);
                                    }}
                                  />
                                ))}
                            </div>
                          </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="hidden lg:block sticky top-0 h-full shrink-0">
        <MentorSidebar 
          currentPhase={currentPhase}
          suggestions={dynamicSuggestions.length > 0 ? dynamicSuggestions : getMentorStaticSuggestions(currentPhase)}
          mentorMessage={getMentorMessage(currentPhase)}
          activeToolId={activeToolId}
          activeToolLabel={activeToolLabel}
          projectId={selectedProject?.id || null}
          projectName={selectedProject?.name || null}
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
      <LockedToolPopup isOpen={lockedPopupOpen} onClose={() => setLockedPopupOpen(false)} />
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

