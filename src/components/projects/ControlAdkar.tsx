import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  Users, 
  Target, 
  MessageSquare, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  Info,
  Check,
  X,
  Minus,
  TrendingDown,
  TrendingUp,
  Share2,
  Lock,
  ArrowRight,
  BookOpen,
  ChevronDown,
  MessageCircle,
  Lightbulb,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

type AdkarLevel = 'Vermelho' | 'Amarelo' | 'Verde' | 'Cinza';
type PowerInterest = 'Baixo' | 'Médio' | 'Alto';
type StakeholderType = 'Core Team' | 'Impactado';
type EngagementLevel = 'Desconhece' | 'Resistente' | 'Neutro' | 'Apoiador' | 'Líder';

interface Stakeholder {
  id: string;
  name: string;
  area: string;
  role: string;
  customRole?: string;
  type: StakeholderType;
  power: PowerInterest;
  interest: PowerInterest;
  currentEngagement: EngagementLevel;
  desiredEngagement: EngagementLevel;
  
  awareness: AdkarLevel;
  desire: AdkarLevel;
  knowledge: AdkarLevel;
  ability: AdkarLevel;
  reinforcement: AdkarLevel;

  currentEngagementDefine?: EngagementLevel;
  currentEngagementMeasure?: EngagementLevel;
  currentEngagementAnalyze?: EngagementLevel;
  currentEngagementImprove?: EngagementLevel;
  currentEngagementControl?: EngagementLevel;
  actionStatusDefine?: 'Pendente' | 'Em andamento' | 'Concluído';
  actionStatusMeasure?: 'Pendente' | 'Em andamento' | 'Concluído';
  actionStatusAnalyze?: 'Pendente' | 'Em andamento' | 'Concluído';
  actionStatusImprove?: 'Pendente' | 'Em andamento' | 'Concluído';
  actionStatusControl?: 'Pendente' | 'Em andamento' | 'Concluído';
  customActionMeasure?: string;
  customActionAnalyze?: string;
  customActionImprove?: string;
  customActionControl?: string;

  channel?: string;
  frequency?: string;
  owner?: string;
  customAction?: string;
  notes?: string;
}

interface ControlAdkarProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
  allProjectData?: any;
  improveAdkarData?: any;
  currentPhase?: string;
}

const ROLES = [
  'Patrocinador / Sponsor',
  'Champion Executive',
  'Champion',
  'Process Owner',
  'Master Black Belt (MBB)',
  'Black Belt',
  'Green Belt',
  'Yellow Belt',
  'White Belt',
  'Team Member / SME',
  'Gestor de Área Impactada',
  'Operador / Frontline',
  'Cliente / Usuário Final',
  'Fornecedor / Suporte',
  'Outro'
];

const ROLE_DESIRED_ENGAGEMENT: Record<string, EngagementLevel> = {
  'Patrocinador / Sponsor': 'Neutro',
  'Champion Executive': 'Líder',
  'Champion': 'Líder',
  'Process Owner': 'Apoiador',
  'Master Black Belt (MBB)': 'Líder',
  'Black Belt': 'Líder',
  'Green Belt': 'Líder',
  'Yellow Belt': 'Líder',
  'White Belt': 'Apoiador',
  'Team Member / SME': 'Apoiador',
  'Gestor de Área Impactada': 'Apoiador',
  'Operador / Frontline': 'Apoiador',
  'Cliente / Usuário Final': 'Neutro',
  'Fornecedor / Suporte': 'Neutro',
  'Outro': 'Neutro'
};

const ROLE_DEFAULT_TYPE: Record<string, 'Core Team' | 'Impactado'> = {
  'Patrocinador / Sponsor': 'Core Team',
  'Champion Executive': 'Core Team',
  'Champion': 'Core Team',
  'Process Owner': 'Core Team',
  'Master Black Belt (MBB)': 'Core Team',
  'Black Belt': 'Core Team',
  'Green Belt': 'Core Team',
  'Yellow Belt': 'Core Team',
  'White Belt': 'Core Team',
  'Team Member / SME': 'Core Team',
  'Gestor de Área Impactada': 'Impactado',
  'Operador / Frontline': 'Impactado',
  'Cliente / Usuário Final': 'Impactado',
  'Fornecedor / Suporte': 'Impactado',
  'Outro': 'Impactado'
};

const CHANNELS = [
  'E-mail', 
  'Reunião 1:1', 
  'Status Report', 
  'Workshop',
  'Steering Committee', 
  'Comunicado Geral', 
  'Mensagem Direta'
];

const FREQUENCIES = [
  'Diária', 
  'Semanal', 
  'Quinzenal', 
  'Mensal', 
  'Marcos', 
  'Sob demanda'
];

const ENGAGEMENT_LEVELS: EngagementLevel[] = [
  'Desconhece', 
  'Resistente', 
  'Neutro', 
  'Apoiador', 
  'Líder'
];

// ===== Exemplo "Ver exemplo" (read-only) =====
// Caso único (escritório / mudança administrativa), usado nas 5 telas ADKAR.
// O exemplo é ACUMULATIVO: cada tela mostra as fases preenchidas até a fase dela.
const ADKAR_FASES = [
  { key: 'awareness',     letra: 'A', nome: 'Awareness (Consciência)' },
  { key: 'desire',        letra: 'D', nome: 'Desire (Desejo)' },
  { key: 'knowledge',     letra: 'K', nome: 'Knowledge (Conhecimento)' },
  { key: 'ability',       letra: 'A', nome: 'Ability (Habilidade)' },
  { key: 'reinforcement', letra: 'R', nome: 'Reinforcement (Reforço)' },
] as const;

const ADKAR_EXEMPLO = {
  caso: 'Implantação de novo sistema de gestão (ERP) no time administrativo',
  stakeholders: [
    { nome: 'Mariana — Gerente Administrativo',    papel: 'Patrocinador da área', awareness: 'Verde' as AdkarLevel,    desire: 'Verde' as AdkarLevel,    knowledge: 'Verde' as AdkarLevel,   ability: 'Verde' as AdkarLevel,   reinforcement: 'Verde' as AdkarLevel },
    { nome: 'Rafael — Analista Sênior Financeiro', papel: 'Team Member / SME',     awareness: 'Amarelo' as AdkarLevel,  desire: 'Amarelo' as AdkarLevel,  knowledge: 'Verde' as AdkarLevel,   ability: 'Verde' as AdkarLevel,   reinforcement: 'Verde' as AdkarLevel },
    { nome: 'Carlos — Coordenador de TI',          papel: 'Process Owner',         awareness: 'Verde' as AdkarLevel,    desire: 'Verde' as AdkarLevel,    knowledge: 'Amarelo' as AdkarLevel, ability: 'Verde' as AdkarLevel,   reinforcement: 'Verde' as AdkarLevel },
    { nome: 'Júlia — Assistente Administrativo',   papel: 'Operador / Frontline',  awareness: 'Vermelho' as AdkarLevel, desire: 'Amarelo' as AdkarLevel,  knowledge: 'Amarelo' as AdkarLevel, ability: 'Amarelo' as AdkarLevel, reinforcement: 'Verde' as AdkarLevel },
  ],
};

const adkarChipColor = (nivel: AdkarLevel): string =>
  nivel === 'Verde' ? 'bg-green-500 text-white' :
  nivel === 'Amarelo' ? 'bg-amber-400 text-white' :
  nivel === 'Vermelho' ? 'bg-red-500 text-white' :
  'bg-gray-100 text-gray-300 border border-gray-200';

const ResizableHeader = ({ children, initialWidth, minWidth, className }: { children: React.ReactNode, initialWidth: number, minWidth?: number, className?: string }) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const headerRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !headerRef.current) return;
      
      const newWidth = e.clientX - headerRef.current.getBoundingClientRect().left;
      setWidth(Math.max(minWidth || 50, newWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth]);

  return (
    <th 
      ref={headerRef} 
      className={cn("px-4 py-3 relative select-none", className)}
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
    >
      {children}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/50 z-10 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing(true);
        }}
      />
    </th>
  );
};

const REINFORCEMENT_ACTIONS: Record<string, Record<string, string>> = {
  'Gerenciar de Perto': {
    'Vermelho': 'Intervenção imediata: identificar a causa da volta ao jeito antigo e replanejar. Considerar retomar treinamento.',
    'Amarelo': 'Coaching semanal para sustentar o novo jeito. Reconhecimento público dos avanços conquistados.',
    'Verde': ''
  },
  'Manter Satisfeito': {
    'Vermelho': 'Reportar a regressão à liderança. Solicitar suporte executivo para retomar a sustentação da mudança.',
    'Amarelo': 'Atualização mensal com indicadores de sustentação. Reforçar visibilidade dos resultados conquistados.',
    'Verde': ''
  },
  'Manter Informado': {
    'Vermelho': 'Reciclagem do treinamento. Identificar barreiras com a equipe e replanejar a sustentação.',
    'Amarelo': 'Acompanhamento quinzenal do indicador. Reconhecer publicamente quem está mantendo o novo jeito.',
    'Verde': ''
  },
  'Monitorar': {
    'Vermelho': 'Comunicado pedindo retorno ao jeito correto. Reforçar os benefícios já obtidos.',
    'Amarelo': 'Mensagem de reconhecimento nas comunicações regulares. Reforçar resultados sustentados.',
    'Verde': ''
  }
};

const calculateAwareness = (
  currentEngagement: EngagementLevel,
  desiredEngagement: EngagementLevel
): AdkarLevel => {
  const levels: EngagementLevel[] = [
    'Desconhece', 'Resistente', 'Neutro', 'Apoiador', 'Líder'
  ];
  const currentIdx = levels.indexOf(currentEngagement);
  const desiredIdx = levels.indexOf(desiredEngagement);
  const gap = desiredIdx - currentIdx;

  if (gap <= 0) return 'Verde';
  if (gap === 1) return 'Amarelo';
  return 'Vermelho';
};

const getQuadrant = (power: string, interest: string): string => {
  if (power === 'Alto' && interest === 'Alto') return 'Gerenciar de Perto';
  if (power === 'Alto' && interest !== 'Alto') return 'Manter Satisfeito';
  if (power !== 'Alto' && interest === 'Alto') return 'Manter Informado';
  return 'Monitorar';
};

const getRecommendedAction = (s: Stakeholder): string => {
  const quadrant = getQuadrant(s.power, s.interest);
  const color = calculateColorForPhase(s, 'Control');
  if (color === 'Verde') {
    return 'Sem ação imediata — manter alinhado nas próximas fases';
  }
  if (color === 'Cinza') return '';
  return REINFORCEMENT_ACTIONS[quadrant]?.[color] || '';
};

const PHASE_ORDER = ['Define', 'Measure', 'Analyze', 'Improve', 'Control'];

const PHASE_TO_LETTER: Record<string, string> = {
  'Define': 'A',
  'Measure': 'D',
  'Analyze': 'K',
  'Improve': 'A',
  'Control': 'R'
};

const PHASE_TO_NAME: Record<string, string> = {
  'Define': 'Awareness',
  'Measure': 'Desire',
  'Analyze': 'Knowledge',
  'Improve': 'Ability',
  'Control': 'Reinforcement'
};

const getEngagementForPhase = (s: Stakeholder, phase: string): EngagementLevel | undefined => {
  if (phase === 'Define') {
    return s.currentEngagementDefine !== undefined && s.currentEngagementDefine !== ('' as any)
      ? s.currentEngagementDefine
      : s.currentEngagement;
  }
  if (phase === 'Measure') return s.currentEngagementMeasure;
  if (phase === 'Analyze') return s.currentEngagementAnalyze;
  if (phase === 'Improve') return s.currentEngagementImprove;
  if (phase === 'Control') return s.currentEngagementControl;
  return undefined;
};

const calculateColorForPhase = (s: Stakeholder, phase: string): AdkarLevel => {
  const engagement = getEngagementForPhase(s, phase);

  if (!engagement || engagement === '' as any) return 'Cinza';

  const desired = s.desiredEngagement
    || ROLE_DESIRED_ENGAGEMENT[s.role]
    || 'Neutro';

  const levels: EngagementLevel[] = [
    'Desconhece', 'Resistente', 'Neutro', 'Apoiador', 'Líder'
  ];
  const currentIdx = levels.indexOf(engagement as EngagementLevel);
  const desiredIdx = levels.indexOf(desired);

  if (currentIdx === -1 || desiredIdx === -1) return 'Cinza';

  const gap = desiredIdx - currentIdx;
  if (gap <= 0) return 'Verde';
  if (gap === 1) return 'Amarelo';
  return 'Vermelho';
};

const getAdkarColor = (s: Stakeholder, columnPhase: string, currentPhase: string): AdkarLevel => {
  const colIdx = PHASE_ORDER.indexOf(columnPhase);
  const curIdx = PHASE_ORDER.indexOf(currentPhase);
  if (colIdx > curIdx) return 'Cinza';
  return calculateColorForPhase(s, columnPhase);
};

export default function ControlAdkar({ 
  onSave, 
  initialData, 
  onGenerateAI, 
  isGeneratingAI, 
  onClearAIData,
  allProjectData,
  improveAdkarData,
  currentPhase = 'Control'
}: ControlAdkarProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEngagementRoleGuideOpen, setIsEngagementRoleGuideOpen] = useState(false);
  const [showExemplo, setShowExemplo] = useState(false);
  // Quantas fases ADKAR aparecem preenchidas neste exemplo (acumulativo por tela).
  const EXEMPLO_FASES_VISIVEIS = 5; // Control = todas as 5 fases
 
  useEffect(() => {
    console.log('🔍 ControlAdkar useEffect:', {
      initialData,
      allProjectDataKeys: allProjectData ? Object.keys(allProjectData) : null,
      improveAdkar: improveAdkarData
    });

    // Se initialData é EXPLICITAMENTE null, o usuário limpou ou excluiu.
    if (initialData === null) {
      setStakeholders([]);
      return;
    }

    // Se já tem dados salvos da própria ferramenta, usar
    if (initialData?.stakeholders && initialData.stakeholders.length > 0) {
      setStakeholders(initialData.stakeholders.map((s: any) => ({
        ...s,
        type: s.type || ROLE_DEFAULT_TYPE[s.role] || 'Impactado',
        desiredEngagement: s.desiredEngagement || ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro',
        currentEngagementDefine: s.currentEngagementDefine || s.currentEngagement,
        currentEngagementControl: s.currentEngagementControl || undefined,
        customAction: ''
      })));
      return;
    }

    // Só auto-importa se initialData for UNDEFINED (ferramenta nunca salva antes)
    if (initialData === undefined) {
      // Senão, puxar da ferramenta ImproveAdkar (fase Improve)
      const previousData = improveAdkarData?.toolData || improveAdkarData;
      if (previousData?.stakeholders && previousData.stakeholders.length > 0) {
        const imported = previousData.stakeholders.map((s: any) => ({
          ...s,
          type: s.type || ROLE_DEFAULT_TYPE[s.role] || 'Impactado',
          desiredEngagement: s.desiredEngagement || ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro',
          currentEngagementDefine: s.currentEngagementDefine || s.currentEngagement,
          currentEngagementControl: undefined,
          customAction: ''
        }));
        setStakeholders(imported);
      }
    }
  }, [initialData, allProjectData, improveAdkarData]);

  useEffect(() => {
    document.querySelectorAll('textarea').forEach(t => {
      const el = t as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }, [stakeholders]);

  const addStakeholder = () => {
    const defaultRole = 'Operador / Frontline';
    const newStakeholder: Stakeholder = {
      id: crypto.randomUUID(),
      name: '',
      area: '',
      role: defaultRole,
      type: ROLE_DEFAULT_TYPE[defaultRole],
      power: 'Médio',
      interest: 'Médio',
      currentEngagement: 'Neutro',
      desiredEngagement: ROLE_DESIRED_ENGAGEMENT[defaultRole],
      awareness: 'Vermelho',
      desire: 'Cinza',
      knowledge: 'Cinza',
      ability: 'Cinza',
      reinforcement: 'Cinza',
      channel: 'Comunicado Geral',
      frequency: 'Sob demanda',
      owner: '',
      customAction: '',
      notes: ''
    };
    setStakeholders([...stakeholders, newStakeholder]);
  };

  const removeStakeholder = (id: string) => {
    setStakeholders(stakeholders.filter(s => s.id !== id));
  };

  const updateStakeholder = (id: string, updates: Partial<Stakeholder>) => {
    setStakeholders(stakeholders.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleRefreshFromImprove = () => {
    const rawSource = improveAdkarData || allProjectData?.improveAdkar;
    const source = rawSource?.toolData || rawSource;
    if (!source?.stakeholders?.length) {
      alert('Nenhum dado encontrado na ferramenta ADKAR da fase Melhorar. Salve os dados lá primeiro.');
      return;
    }
    const imported = source.stakeholders.map((s: any) => ({
      ...s,
      type: s.type || ROLE_DEFAULT_TYPE[s.role] || 'Impactado',
      desiredEngagement: s.desiredEngagement || ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro',
      currentEngagementDefine: s.currentEngagementDefine || s.currentEngagement,
      currentEngagementControl: stakeholders.find(
        existing => existing.id === s.id
      )?.currentEngagementControl || undefined,
      customAction: ''
    }));
    setStakeholders(imported);
  };

  // Identify Project Leader(s)
  const leaders = useMemo(() => {
    return stakeholders.filter(s => 
      s.role === 'Black Belt' || 
      s.role === 'Green Belt' || 
      s.role === 'Master Black Belt (MBB)'
    );
  }, [stakeholders]);

  // Project Title from Charter or Brief
  const projectTitle = useMemo(() => {
    const charter = allProjectData?.charter || allProjectData?.projectCharterPMI;
    if (charter?.title) return charter.title;
    const brief = allProjectData?.brief;
    if (brief?.answers?.q1) return brief.answers.q1;
    if (brief?.title) return brief.title;
    return "Gestão de Mudanças & Stakeholders";
  }, [allProjectData]);

  // KPIs
  const kpis = useMemo(() => {
    if (stakeholders.length === 0) return null;

    const core = stakeholders.filter(s => s.type === 'Core Team');
    const impacted = stakeholders.filter(s => s.type === 'Impactado');

    const calculatePct = (list: Stakeholder[]) => {
      if (list.length === 0) return 0;
      const complete = list.filter(s => 
        calculateColorForPhase(s, currentPhase) === 'Verde'
      ).length;
      return (complete / list.length) * 100;
    };

    const generalPct = calculatePct(stakeholders);
    const corePct = calculatePct(core);
    const impactedPct = calculatePct(impacted);

    return {
      total: stakeholders.length,
      generalPct: Math.round(generalPct),
      corePct: Math.round(corePct),
      impactedPct: Math.round(impactedPct)
    };
  }, [stakeholders, currentPhase]);

  const getClassification = (power: PowerInterest, interest: PowerInterest) => {
    return getQuadrant(power, interest);
  };

  const getDefaultChannel = (classification: string) => {
    switch(classification) {
      case 'Gerenciar de Perto': return 'Reunião 1:1';
      case 'Manter Satisfeito': return 'Steering Committee';
      case 'Manter Informado': return 'Status Report';
      default: return 'Comunicado Geral';
    }
  };

  const getDefaultFrequency = (classification: string) => {
    switch(classification) {
      case 'Gerenciar de Perto': return 'Semanal';
      case 'Manter Satisfeito': return 'Mensal';
      case 'Manter Informado': return 'Quinzenal';
      default: return 'Marcos';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* SEÇÃO 1: PROJETO EM DESTAQUE */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-xl shadow-md text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm">
            <Target size={24} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Título do Projeto em Análise</p>
            <h3 className="text-lg font-bold leading-none uppercase tracking-tight">
              {projectTitle}
            </h3>
            {leaders.length > 0 && (
              <p className="text-[10px] font-medium opacity-70 mt-1">
                Liderança: {leaders.map(l => l.name || '(a definir)').join(' & ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExemplo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
        <div className="hidden md:block text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status Reinforcement</p>
          <div className="flex gap-1 mt-1 justify-end">
            {['R'].map((l, i) => {
              const targetList = leaders.length > 0 ? leaders : stakeholders;
              const allGreen = targetList.length > 0 && targetList.every(ld => calculateColorForPhase(ld, 'Control') === 'Verde');
              
              return (
                <div key={`${l}-${i}`} className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-black",
                  allGreen ? "bg-green-400 text-green-900" : 
                  targetList.some(ld => calculateColorForPhase(ld, 'Control') === 'Vermelho') ? "bg-red-400 text-white" :
                  targetList.some(ld => calculateColorForPhase(ld, 'Control') === 'Amarelo') ? "bg-amber-400 text-white" :
                  "bg-white/20 text-white"
                )}>
                  {l}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {/* SEÇÃO 2: DASHBOARD */}

      {stakeholders.length > 0 && kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">MAPEADOS</p>
            <p className="text-[9px] text-gray-400 mb-2">Total de stakeholders</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black text-gray-800">{kpis.total}</span>
              <Users className="opacity-30 text-gray-800" size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">GERAL VERDE</p>
            <p className="text-[9px] text-gray-400 mb-2">% do total alinhado</p>
            <div className="flex items-end justify-between">
              <span className={cn(
                "text-2xl font-black",
                kpis.generalPct >= 70 ? "text-green-600" :
                kpis.generalPct >= 50 ? "text-amber-500" :
                "text-red-500"
              )}>{kpis.generalPct}%</span>
              <CheckCircle2 className={cn(
                "opacity-30",
                kpis.generalPct >= 70 ? "text-green-600" :
                kpis.generalPct >= 50 ? "text-amber-500" :
                "text-red-500"
              )} size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">CORE TEAM VERDE</p>
            <p className="text-[9px] text-gray-400 mb-2">% do time do projeto</p>
            <div className="flex items-end justify-between">
              <span className={cn(
                "text-2xl font-black",
                kpis.corePct >= 70 ? "text-green-600" :
                kpis.corePct >= 50 ? "text-amber-500" :
                "text-red-500"
              )}>{kpis.corePct}%</span>
              <ShieldAlert className={cn(
                "opacity-30",
                kpis.corePct >= 70 ? "text-green-600" :
                kpis.corePct >= 50 ? "text-amber-500" :
                "text-red-500"
              )} size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">IMPACTADOS VERDE</p>
            <p className="text-[9px] text-gray-400 mb-2">% dos que recebem a mudança</p>
            <div className="flex items-end justify-between">
              <span className={cn(
                "text-2xl font-black",
                kpis.impactedPct >= 70 ? "text-green-600" :
                kpis.impactedPct >= 50 ? "text-amber-500" :
                "text-red-500"
              )}>{kpis.impactedPct}%</span>
              <Target className={cn(
                "opacity-30",
                kpis.impactedPct >= 70 ? "text-green-600" :
                kpis.impactedPct >= 50 ? "text-amber-500" :
                "text-red-500"
              )} size={20} />
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 3: REGISTER */}
      {/* DROPDOWN 1 — Guia de Avaliação ADKAR */}
      {stakeholders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-4">
          <button
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full flex items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors border-none cursor-pointer"
          >
            <div className="flex items-center gap-2 text-gray-700">
              <BookOpen size={18} className="text-gray-500" />
              <span className="text-sm font-medium">Guia de Avaliação ADKAR — critérios para cada letra</span>
            </div>
            <ChevronDown 
              size={18} 
              className={cn("text-gray-400 transition-transform duration-200", isGuideOpen && "rotate-180")} 
            />
          </button>

            {isGuideOpen && (
              <div className="p-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-gray-500 mb-4">
                  O Belt avalia o Reinforcement observando se a pessoa sustenta o novo jeito de trabalhar ao longo do tempo, sem voltar ao comportamento antigo. Use os critérios abaixo como referência.
                </p>

                <div className="grid grid-cols-1 gap-3 max-w-md">
                  {/* Reinforcement */}
                  <div className="border border-purple-200 rounded-lg overflow-hidden">
                    <div className="bg-purple-50 px-3 py-2 border-b border-purple-200 text-purple-800">
                      <div className="text-2xl font-black">R</div>
                      <div className="text-[10px] font-bold uppercase">REINFORCEMENT</div>
                    </div>
                    <div className="p-2 space-y-2">
                      <div className="flex gap-2">
                        <span className="shrink-0">🔴</span>
                        <p className="text-[10px] text-gray-600 leading-tight">Engajamento Atual está 2 ou mais níveis abaixo do esperado para o papel — resistência ativa ou desconhecimento total.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0">🟡</span>
                        <p className="text-[10px] text-gray-600 leading-tight">Engajamento Atual está 1 nível abaixo do esperado para o papel — entende pouco, precisa de mais clareza.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0">🟢</span>
                        <p className="text-[10px] text-gray-600 leading-tight">Engajamento Atual está no nível esperado ou acima — pessoa consegue executar o novo jeito.</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 italic px-2 pb-2">
                      "A cor é calculada automaticamente comparando o Engajamento Atual da fase Controlar com o nível esperado para cada papel. Em Controlar, o foco é fazer cada pessoa SUSTENTAR o novo jeito de trabalhar ao longo do tempo, sem regredir ao comportamento antigo."
                    </p>
                  </div>
                </div>

              </div>
            )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-800">
            <Users size={20} className="text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Registro de Stakeholders</h2>
            {initialData?.isGenerated && (
              <span className="ml-3 flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                <Sparkles size={10} /> Gerado por IA
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {stakeholders.length > 0 && (
              <button
                onClick={() => {
                  setStakeholders([]);
                  onSave(null);
                }}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1 bg-white border border-red-100 rounded"
              >
                Limpar
              </button>
            )}
            <button 
              data-save-trigger
              onClick={() => onSave({ stakeholders })}
              className="hidden"
            >
              Salvar Análise
            </button>
          </div>
        </div>

        {stakeholders.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhum stakeholder cadastrado ainda.</p>
            <p className="text-xs text-gray-400 mt-1">Utilize o botão acima para adicionar manualmente ou utilize o atalho de IA para sugerir baseado no Charter.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1400px]">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200">
                    <ResizableHeader initialWidth={250} minWidth={150}>Stakeholder / Área</ResizableHeader>
                    <ResizableHeader initialWidth={180} minWidth={100}>Tipo</ResizableHeader>
                    <ResizableHeader initialWidth={200} minWidth={120}>Função</ResizableHeader>
                    <ResizableHeader initialWidth={100} minWidth={80}>Poder</ResizableHeader>
                    <ResizableHeader initialWidth={100} minWidth={80}>Interesse</ResizableHeader>
                    <ResizableHeader initialWidth={150} minWidth={100}>Engagem. Atual</ResizableHeader>
                    {PHASE_ORDER.map((phase) => {
                      const colIdx = PHASE_ORDER.indexOf(phase);
                      const curIdx = PHASE_ORDER.indexOf(currentPhase);
                      const isFuture = colIdx > curIdx;
                      return (
                        <th key={phase}
                          className={cn(
                            "px-2 py-3 text-center w-[50px]",
                            isFuture ? "opacity-30" : ""
                          )}
                          title={PHASE_TO_NAME[phase]}
                        >
                          <div className="text-[10px] font-black">{PHASE_TO_LETTER[phase]}</div>
                          <div className="text-[8px] font-normal opacity-60">{phase.slice(0,3)}</div>
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {stakeholders.map((s) => (
                  <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <input 
                          type="text" 
                          value={s.name}
                          onChange={(e) => updateStakeholder(s.id, { name: e.target.value })}
                          placeholder="Nome do Stakeholder"
                          className="w-full px-2 py-1 text-xs font-bold text-gray-800 border border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent rounded outline-none"
                        />
                        <input 
                          type="text" 
                          value={s.area}
                          onChange={(e) => updateStakeholder(s.id, { area: e.target.value })}
                          placeholder="Área / Departamento"
                          className="w-full px-2 py-0.5 text-[10px] text-gray-500 border border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent rounded outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select 
                        value={s.type}
                        onChange={(e) => updateStakeholder(s.id, { type: e.target.value as StakeholderType })}
                        className="w-full px-2 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded shadow-sm focus:border-blue-500 outline-none h-[28px]"
                      >
                        <option value="Impactado">Impactado</option>
                        <option value="Core Team">Core Team</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <select 
                          value={s.role}
                          onChange={(e) => {
                            const role = e.target.value;
                            updateStakeholder(s.id, { 
                              role, 
                              type: ROLE_DEFAULT_TYPE[role],
                              desiredEngagement: ROLE_DESIRED_ENGAGEMENT[role]
                            });
                          }}
                          className="w-full px-2 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded shadow-sm focus:border-blue-500 outline-none h-[28px]"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {s.role === 'Outro' && (
                          <input 
                            type="text" 
                            value={s.customRole || ''}
                            onChange={(e) => updateStakeholder(s.id, { customRole: e.target.value })}
                            placeholder="Descreva o papel..."
                            className="w-full px-2 py-1 text-[10px] text-gray-600 border border-gray-200 rounded focus:border-blue-500 outline-none"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select 
                        value={s.power}
                        onChange={(e) => updateStakeholder(s.id, { power: e.target.value as PowerInterest })}
                        className="w-full px-2 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded shadow-sm focus:border-blue-500 outline-none h-[28px]"
                      >
                        <option value="Baixo">Baixo</option>
                        <option value="Médio">Médio</option>
                        <option value="Alto">Alto</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select 
                        value={s.interest}
                        onChange={(e) => updateStakeholder(s.id, { interest: e.target.value as PowerInterest })}
                        className="w-full px-2 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded shadow-sm focus:border-blue-500 outline-none h-[28px]"
                      >
                        <option value="Baixo">Baixo</option>
                        <option value="Médio">Médio</option>
                        <option value="Alto">Alto</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select 
                        value={getEngagementForPhase(s, currentPhase) || ''}
                        onChange={(e) => {
                          const val = e.target.value as EngagementLevel;
                          updateStakeholder(s.id, { currentEngagementControl: val });
                        }}
                        className={cn(
                          "w-full px-2 py-1 text-[11px] font-bold rounded shadow-sm focus:border-blue-500 outline-none h-[28px]",
                          calculateColorForPhase(s, currentPhase) === 'Verde' ? "bg-green-50 text-green-700 border-green-200" :
                          calculateColorForPhase(s, currentPhase) === 'Amarelo' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          calculateColorForPhase(s, currentPhase) === 'Vermelho' ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-white text-gray-400 border-gray-200"
                        )}
                      >
                        <option value="" disabled>Selecione...</option>
                        {ENGAGEMENT_LEVELS.map(level => (
                          <option key={level} value={level} className="text-gray-900 font-normal">
                            {level}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* ADKAR SEMAPHORES */}
                    {PHASE_ORDER.map((phase) => {
                      const color = getAdkarColor(s, phase, currentPhase);
                      return (
                        <td key={phase} className="px-2 py-3 align-top text-center">
                          <div className={cn(
                            "w-6 h-6 rounded-full mx-auto flex items-center justify-center transition-all shadow-sm",
                            color === 'Verde' ? "bg-green-500 shadow-green-200" :
                            color === 'Amarelo' ? "bg-amber-400 shadow-amber-100" :
                            color === 'Vermelho' ? "bg-red-500 shadow-red-100" :
                            "bg-gray-100 opacity-30"
                          )}>
                            {color === 'Verde' && <Check size={14} className="text-white" />}
                            {color === 'Amarelo' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            {color === 'Vermelho' && <X size={14} className="text-white" />}
                          </div>
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 align-top">
                      <button 
                        onClick={() => removeStakeholder(s.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>

            {/* Ações Recomendadas Panel */}
            <div className="bg-purple-100/30 border-t border-purple-100 p-2">
              <button 
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white rounded border border-purple-100 text-left hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-purple-700">
                  <Lightbulb size={14} />
                  <span className="text-xs font-medium">Ações Recomendadas — Fase Controlar (Reinforcement)</span>
                </div>
                <ChevronDown 
                  size={14} 
                  className={cn("text-purple-400 transition-transform", isActionsOpen && "rotate-180")} 
                />
              </button>

              {isActionsOpen && (
                <div className="p-4 bg-white border-t border-purple-100 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-purple-50 rounded-md p-3 mb-3">
                    <h4 className="font-bold text-sm text-purple-800 mb-1">Foco: Reinforcement</h4>
                    <p className="text-xs text-purple-700">
                      Fazer cada pessoa SUSTENTAR o novo jeito de trabalhar ao longo do tempo, evitando a regressão ao comportamento antigo.
                    </p>
                  </div>

                  <div className="overflow-hidden border border-gray-100 rounded-lg">
                    <table className="w-full text-left bg-white border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                          <th className="p-2 w-1/4">Quadrante</th>
                          <th className="p-2 w-[40px] text-center">Cor</th>
                          <th className="p-2">Ação Recomendada</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Gerenciar de Perto</span></td>
                          <td className="p-2 text-center text-sm">🔴</td>
                          <td className="p-2 text-xs text-gray-700">Intervenção imediata: identificar a causa da volta ao jeito antigo e replanejar. Considerar retomar treinamento.</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Gerenciar de Perto</span></td>
                          <td className="p-2 text-center text-sm">🟡</td>
                          <td className="p-2 text-xs text-gray-700">Coaching semanal para sustentar o novo jeito. Reconhecimento público dos avanços conquistados.</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Manter Satisfeito</span></td>
                          <td className="p-2 text-center text-sm">🔴</td>
                          <td className="p-2 text-xs text-gray-700">Reportar a regressão à liderança. Solicitar suporte executivo para retomar a sustentação da mudança.</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Manter Satisfeito</span></td>
                          <td className="p-2 text-center text-sm">🟡</td>
                          <td className="p-2 text-xs text-gray-700">Atualização mensal com indicadores de sustentação. Reforçar visibilidade dos resultados conquistados.</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Manter Informado</span></td>
                          <td className="p-2 text-center text-sm">🔴</td>
                          <td className="p-2 text-xs text-gray-700">Reciclagem do treinamento. Identificar barreiras com a equipe e replanejar a sustentação.</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Manter Informado</span></td>
                          <td className="p-2 text-center text-sm">🟡</td>
                          <td className="p-2 text-xs text-gray-700">Acompanhamento quinzenal do indicador. Reconhecer publicamente quem está mantendo o novo jeito.</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Monitorar</span></td>
                          <td className="p-2 text-center text-sm">🔴</td>
                          <td className="p-2 text-xs text-gray-700">Comunicado pedindo retorno ao jeito correto. Reforçar os benefícios já obtidos.</td>
                        </tr>
                        <tr>
                          <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Monitorar</span></td>
                          <td className="p-2 text-center text-sm">🟡</td>
                          <td className="p-2 text-xs text-gray-700">Mensagem de reconhecimento nas comunicações regulares. Reforçar resultados sustentados.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 4: PLANO DE COMUNICAÇÃO */}
            <div className="bg-gray-50/50 p-5 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 mb-6">
                <MessageSquare size={18} className="text-blue-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Plano de Comunicação & Ação</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200">
                      <th className="px-4 py-3 min-w-[220px]">Stakeholder</th>
                      <th className="px-4 py-3 min-w-[150px]">Classificação</th>
                      <th className="px-4 py-3 text-center w-[120px]">Reinforcement</th>
                      <th className="px-4 py-3 min-w-[300px]">Ação Recomendada</th>
                      <th className="px-4 py-3 min-w-[150px]">Canal</th>
                      <th className="px-4 py-3 min-w-[150px]">Frequência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {stakeholders.map(s => {
                      const classification = getClassification(s.power, s.interest);
                      const color = calculateColorForPhase(s, currentPhase);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-bold text-xs text-gray-800">{s.name || '(Sem nome)'}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide font-black">
                              {s.role} • {s.area}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight",
                              classification === 'Gerenciar de Perto' ? "bg-red-100 text-red-700" :
                              classification === 'Manter Satisfeito' ? "bg-blue-100 text-blue-700" :
                              classification === 'Manter Informado' ? "bg-green-100 text-green-700" :
                              "bg-gray-100 text-gray-600"
                            )}>
                              {classification}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center">
                              <div className={cn(
                                "w-3 h-3 rounded-full mr-2",
                                color === 'Verde' ? "bg-green-500" :
                                color === 'Amarelo' ? "bg-amber-400" :
                                color === 'Vermelho' ? "bg-red-500" :
                                "bg-gray-200"
                              )} />
                              <span className="text-[10px] font-bold text-gray-600 uppercase">{color}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <textarea
                                value={s.customAction || getRecommendedAction(s)}
                                onChange={(e) => updateStakeholder(s.id, { customAction: e.target.value })}
                                className="w-full p-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-100 rounded focus:bg-white focus:border-blue-500 outline-none transition-all resize-none min-h-[40px]"
                                placeholder="Descreva a ação..."
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <select 
                              value={s.channel || getDefaultChannel(classification)}
                              onChange={(e) => updateStakeholder(s.id, { channel: e.target.value })}
                              className="w-full px-2 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded shadow-sm focus:border-blue-500 outline-none h-[32px]"
                            >
                              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            <select 
                              value={s.frequency || getDefaultFrequency(classification)}
                              onChange={(e) => updateStakeholder(s.id, { frequency: e.target.value })}
                              className="w-full px-2 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded shadow-sm focus:border-blue-500 outline-none h-[32px]"
                            >
                              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>

      {/* MODAL "Ver exemplo" — read-only, não altera os dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de ADKAR — Reinforcement (Reforço)</h3>
                  <p className="text-xs text-gray-500 m-0">{ADKAR_EXEMPLO.caso}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemplo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-[12px] border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600" style={{ minWidth: 220 }}>
                        Stakeholder
                      </th>
                      {ADKAR_FASES.map((f) => (
                        <th key={f.nome} className="p-2 border-b border-gray-200 text-center" title={f.nome} style={{ minWidth: 56 }}>
                          <div className="text-[12px] font-black text-gray-700">{f.letra}</div>
                          <div className="text-[8px] font-normal text-gray-400">{f.key.slice(0, 3)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ADKAR_EXEMPLO.stakeholders.map((s, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2 align-top">
                          <p className="text-[12px] font-bold text-gray-800 m-0 leading-tight">{s.nome}</p>
                          <p className="text-[10px] text-gray-400 m-0">{s.papel}</p>
                        </td>
                        {ADKAR_FASES.map((f, fi) => {
                          const visivel = fi < EXEMPLO_FASES_VISIVEIS;
                          const nivel = (s as any)[f.key] as AdkarLevel;
                          return (
                            <td key={f.key} className="p-1 text-center">
                              <span className={cn(
                                'inline-flex w-7 h-7 rounded-full items-center justify-center mx-auto font-black text-[11px]',
                                visivel ? adkarChipColor(nivel) : 'bg-gray-50 text-gray-300 border border-gray-100'
                              )}>
                                {visivel
                                  ? (nivel === 'Verde' ? '✓' : nivel === 'Amarelo' ? '~' : '✕')
                                  : '—'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Este exemplo é só pra consulta — <strong>não altera os seus dados</strong>. Repare como o ADKAR evolui:
                  cada fase preenche mais uma etapa da jornada. Verde = no nível esperado, Amarelo = falta 1 nível,
                  Vermelho = resistência. Aqui, na última fase, todas as 5 etapas aparecem preenchidas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
