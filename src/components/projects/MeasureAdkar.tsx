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

interface MeasureAdkarProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
  allProjectData?: any;
  stakeholderAdkarData?: any;
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

const DESIRE_ACTIONS: Record<string, Record<string, string>> = {
  'Gerenciar de Perto': {
    'Vermelho': 'Conversa individual para entender o que está bloqueando o engajamento. Endereçar a preocupação específica e mostrar o que ela ganha com a mudança.',
    'Amarelo': 'Convite ativo para participar das próximas etapas. Reforçar como a contribuição dela é valiosa.',
    'Verde': ''
  },
  'Manter Satisfeito': {
    'Vermelho': 'Reapresentar os benefícios do projeto com dados. Solicitar apoio visível e ativo.',
    'Amarelo': 'Apresentar progresso e pedir endosso público nas próximas comunicações.',
    'Verde': ''
  },
  'Manter Informado': {
    'Vermelho': 'Conversa direta para entender resistência. Validar que o impacto na área é positivo ou neutro.',
    'Amarelo': 'Atualização destacando como a contribuição dela é essencial. Pedir disponibilidade para envolvimento.',
    'Verde': ''
  },
  'Monitorar': {
    'Vermelho': 'Comunicação clara do porquê o engajamento dela importa. Endereçar diretamente boatos ou desinformação.',
    'Amarelo': 'Reforçar valor da mudança nas comunicações regulares. Citar exemplos de quem já apoia.',
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
  const color = calculateColorForPhase(s, 'Measure');
  if (color === 'Verde') {
    return 'Sem ação imediata — manter alinhado nas próximas fases';
  }
  if (color === 'Cinza') return '';
  return DESIRE_ACTIONS[quadrant]?.[color] || '';
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

export default function MeasureAdkar({ 
  onSave, 
  initialData, 
  onGenerateAI, 
  isGeneratingAI, 
  onClearAIData,
  allProjectData,
  stakeholderAdkarData,
  currentPhase = 'Measure'
}: MeasureAdkarProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEngagementRoleGuideOpen, setIsEngagementRoleGuideOpen] = useState(false);
  const [showExemplo, setShowExemplo] = useState(false);
  // Quantas fases ADKAR aparecem preenchidas neste exemplo (acumulativo por tela).
  const EXEMPLO_FASES_VISIVEIS = 2; // Measure = Awareness + Desire
 
  useEffect(() => {
    console.log('🔍 MeasureAdkar useEffect:', {
      initialData,
      allProjectDataKeys: allProjectData ? Object.keys(allProjectData) : null,
      stakeholderAdkar: stakeholderAdkarData
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
        currentEngagementMeasure: s.currentEngagementMeasure || undefined,
        customAction: ''
      })));
      return;
    }

    // Só auto-importa se initialData for UNDEFINED (ferramenta nunca salva antes)
    if (initialData === undefined) {
      // Senão, puxar da ferramenta StakeholderAdkar (fase Define)
      const previousData = stakeholderAdkarData?.toolData || stakeholderAdkarData;
      if (previousData?.stakeholders && previousData.stakeholders.length > 0) {
        const imported = previousData.stakeholders.map((s: any) => ({
          ...s,
          type: s.type || ROLE_DEFAULT_TYPE[s.role] || 'Impactado',
          desiredEngagement: s.desiredEngagement || ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro',
          currentEngagementDefine: s.currentEngagementDefine || s.currentEngagement,
          currentEngagementMeasure: undefined,
          customAction: ''
        }));
        setStakeholders(imported);
      }
    }
  }, [initialData, allProjectData, stakeholderAdkarData]);

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

  const handleRefreshFromDefine = () => {
    const rawSource = stakeholderAdkarData || allProjectData?.stakeholderAdkar;
    const source = rawSource?.toolData || rawSource;
    if (!source?.stakeholders?.length) {
      alert('Nenhum dado encontrado na ferramenta ADKAR — Definir (Awareness). Salve os dados lá primeiro.');
      return;
    }
    const imported = source.stakeholders.map((s: any) => ({
      ...s,
      type: s.type || ROLE_DEFAULT_TYPE[s.role] || 'Impactado',
      desiredEngagement: s.desiredEngagement || ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro',
      currentEngagementDefine: s.currentEngagementDefine || s.currentEngagement,
      currentEngagementMeasure: stakeholders.find(
        existing => existing.id === s.id
      )?.currentEngagementMeasure || undefined,
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
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status Awareness</p>
          <div className="flex gap-1 mt-1 justify-end">
            {['A'].map((l, i) => {
              const targetList = leaders.length > 0 ? leaders : stakeholders;
              const allGreen = targetList.length > 0 && targetList.every(ld => calculateColorForPhase(ld, 'Measure') === 'Verde');
              
              return (
                <div key={`${l}-${i}`} className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-black",
                  allGreen ? "bg-green-400 text-green-900" : 
                  targetList.some(ld => calculateColorForPhase(ld, 'Measure') === 'Vermelho') ? "bg-red-400 text-white" :
                  targetList.some(ld => calculateColorForPhase(ld, 'Measure') === 'Amarelo') ? "bg-amber-400 text-white" :
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

      {/* SEÇÕES DE REFERÊNCIA (DROPDOWNS) - REMOVIDO DAQUI */}

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
                  O Belt avalia o Desire observando se a pessoa coopera com o mapeamento e a coleta de dados. Use os critérios abaixo como referência.
                </p>

                <div className="grid grid-cols-1 gap-3 max-w-md">
                  {/* Desire */}
                  <div className="border border-purple-200 rounded-lg overflow-hidden">
                    <div className="bg-purple-50 px-3 py-2 border-b border-purple-200 text-purple-800">
                      <div className="text-2xl font-black">D</div>
                      <div className="text-[10px] font-bold uppercase">DESIRE</div>
                    </div>
                    <div className="p-2 space-y-2">
                      <div className="flex gap-2">
                        <span className="shrink-0">🔴</span>
                        <p className="text-[10px] text-gray-600 leading-tight">Engajamento Atual está 2 ou mais níveis abaixo do esperado para o papel — resistência ativa.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0">🟡</span>
                        <p className="text-[10px] text-gray-600 leading-tight">Engajamento Atual está 1 nível abaixo do esperado para o papel — falta engajamento, precisa motivar.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0">🟢</span>
                        <p className="text-[10px] text-gray-600 leading-tight">Engajamento Atual está no nível esperado ou acima — pessoa quer cooperar.</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 italic px-2 pb-2">
                      "A cor é calculada automaticamente comparando o Engajamento Atual da fase Medir com o nível esperado para cada papel. Em Medir, o foco é fazer cada pessoa QUERER cooperar com o mapeamento do processo."
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
                          placeholder="Nome..."
                          className="w-full px-2 py-1 text-sm font-bold border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white rounded outline-none bg-transparent whitespace-normal break-words"
                        />
                        <input 
                          type="text" 
                          value={s.area}
                          onChange={(e) => updateStakeholder(s.id, { area: e.target.value })}
                          placeholder="Área impactada..."
                          className="w-full px-2 py-0.5 text-xs text-gray-400 border border-transparent hover:border-gray-200 focus:border-blue-300 focus:bg-white rounded outline-none bg-transparent whitespace-normal break-words"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                        <button 
                          onClick={() => updateStakeholder(s.id, { type: 'Core Team' })}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                            s.type === 'Core Team' ? "bg-purple-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Core Team
                        </button>
                        <button 
                          onClick={() => updateStakeholder(s.id, { type: 'Impactado' })}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                            s.type === 'Impactado' ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Impactado
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <select 
                          value={s.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            updateStakeholder(s.id, { 
                              role: newRole,
                              type: ROLE_DEFAULT_TYPE[newRole] || s.type,
                              desiredEngagement: ROLE_DESIRED_ENGAGEMENT[newRole] || s.desiredEngagement
                            });
                          }}
                          className="w-full px-1 py-1 text-[12px] border border-transparent hover:border-gray-300 rounded outline-none bg-transparent cursor-pointer"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {s.role === 'Outro' && (
                          <input 
                            type="text" 
                            value={s.customRole || ''}
                            onChange={(e) => updateStakeholder(s.id, { customRole: e.target.value })}
                            placeholder="Especificar..."
                            className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded outline-none"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={s.power}
                        onChange={(e) => updateStakeholder(s.id, { power: e.target.value as any })}
                        className="px-1 py-1 text-[12px] border border-transparent hover:border-gray-300 rounded outline-none bg-transparent cursor-pointer"
                      >
                        {['Baixo', 'Médio', 'Alto'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={s.interest}
                        onChange={(e) => updateStakeholder(s.id, { interest: e.target.value as any })}
                        className="px-1 py-1 text-[12px] border border-transparent hover:border-gray-300 rounded outline-none bg-transparent cursor-pointer"
                      >
                        {['Baixo', 'Médio', 'Alto'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const fieldMap: Record<string, keyof Stakeholder> = {
                          'Define': 'currentEngagementDefine',
                          'Measure': 'currentEngagementMeasure',
                          'Analyze': 'currentEngagementAnalyze',
                          'Improve': 'currentEngagementImprove',
                          'Control': 'currentEngagementControl'
                        };
                        const field = fieldMap[currentPhase];
                        const value = (s[field] as EngagementLevel) || '';

                        return (
                          <select
                            value={value}
                            onChange={(e) => updateStakeholder(s.id, {
                              [field]: e.target.value as any
                            } as any)}
                            className="px-1 py-1 text-[12px] border border-transparent hover:border-gray-300 rounded outline-none bg-transparent cursor-pointer font-medium"
                          >
                            <option value="">— selecione —</option>
                            {ENGAGEMENT_LEVELS.map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    {/* ADKAR SEMAPHORES */}
                    {PHASE_ORDER.map((phase) => {
                      const color = getAdkarColor(s, phase, currentPhase);
                      return (
                        <td key={phase} className="px-2 py-3 text-center">
                          <div
                            title={color === 'Cinza'
                              ? `Disponível na fase ${phase}`
                              : `${PHASE_TO_NAME[phase]} — ${color}`}
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center mx-auto shadow-sm",
                              color === 'Verde' ? "bg-green-500 text-white" :
                              color === 'Amarelo' ? "bg-amber-400 text-white" :
                              color === 'Vermelho' ? "bg-red-500 text-white" :
                              "bg-gray-100 text-gray-300 border border-gray-200"
                            )}
                          >
                            {color === 'Verde' ? <Check size={12} strokeWidth={3} /> :
                             color === 'Amarelo' ? <Minus size={12} strokeWidth={3} /> :
                             color === 'Vermelho' ? <X size={12} strokeWidth={3} /> :
                             <span className="text-[9px] font-black">{PHASE_TO_LETTER[phase]}</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => removeStakeholder(s.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button 
            onClick={addStakeholder}
            className="w-full py-4 border-t border-gray-100 text-[11px] font-bold text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-2 transition-all border-none bg-transparent cursor-pointer"
          >
            <Plus size={16} /> ADICIONAR STAKEHOLDER
          </button>
        </>
      )}
    </div>

      {/* SEÇÃO 4: MATRIZES */}
      {stakeholders.length > 0 && (
        <div className="space-y-8">
          {/* PODER X INTERESSE */}
          {/* DROPDOWN 2 — Matriz Poder × Interesse */}
          {stakeholders.length > 0 && (
            <div className="bg-white border border-blue-100 rounded-lg overflow-hidden shadow-sm mb-4">
              <button
                onClick={() => setIsMatrixOpen(!isMatrixOpen)}
                className="w-full flex items-center justify-between bg-blue-50 px-4 py-2.5 hover:bg-blue-100/70 transition-colors border-none cursor-pointer"
              >
                <div className="flex items-center gap-2 text-blue-700">
                  <Target size={14} />
                  <span className="text-xs font-medium">Matriz Poder × Interesse — intensidade da relação com cada stakeholder</span>
                </div>
                <ChevronDown 
                  size={14} 
                  className={cn("text-blue-500 transition-transform duration-200", isMatrixOpen && "rotate-180")} 
                />
              </button>

              {isMatrixOpen && (
                <div className="p-4 bg-white border-t border-blue-100 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-gray-500 mb-3">
                    A matriz Poder × Interesse define a INTENSIDADE da relação com cada stakeholder — o quanto você vai investir tempo nele.
                  </p>
                  
                  <div className="border border-gray-100 rounded-md overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-2 text-[10px] uppercase text-gray-500 font-bold border-b border-gray-100 w-[180px]">Quadrante</th>
                          <th className="p-2 text-[10px] uppercase text-gray-500 font-bold border-b border-gray-100">Significa</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        <tr className="border-b border-gray-100">
                          <td className="p-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Gerenciar de Perto</span>
                          </td>
                          <td className="p-2 text-gray-700 text-xs">Atenção máxima — reuniões frequentes, contato direto</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Manter Satisfeito</span>
                          </td>
                          <td className="p-2 text-gray-700 text-xs">Tem poder, baixo interesse — manter alinhado mas não sobrecarregar</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="p-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Manter Informado</span>
                          </td>
                          <td className="p-2 text-gray-700 text-xs">Interesse alto, pouco poder — manter na linha de informação</td>
                        </tr>
                        <tr>
                          <td className="p-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Monitorar</span>
                          </td>
                          <td className="p-2 text-gray-700 text-xs">Acompanhar de longe, contato pontual</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-500" />
              Matriz de Poder x Interesse
            </h3>
            
            <div className="relative w-full aspect-video min-h-[500px] border-2 border-gray-200 grid grid-cols-2 grid-rows-2">
              {/* Labels Eixos */}
              <div className="absolute -left-10 top-1/2 -rotate-90 origin-center text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                Poder (Alto →)
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Interesse (Alto →)
              </div>
              
              {/* Quadrantes */}
              {/* Top Left: Satisfeito */}
              <div className="bg-blue-50/50 border-r border-b border-gray-200 p-4 overflow-y-auto min-h-[250px]">
                <span className="text-[10px] font-black text-blue-800 uppercase block mb-3">Manter Satisfeito</span>
                <div className="flex flex-wrap gap-2">
                  {stakeholders.filter(s => getClassification(s.power, s.interest) === 'Manter Satisfeito').map(s => (
                    <div key={s.id} className={cn(
                      "px-3 py-1 text-xs rounded-full shadow-sm whitespace-nowrap",
                      s.type === 'Core Team' ? "bg-purple-600 text-white border-2 border-purple-700 font-bold" : "bg-white text-purple-700 border-2 border-dashed border-purple-400 font-medium"
                    )}>
                      {s.name || '---'}
                    </div>
                  ))}
                </div>
              </div>
              {/* Top Right: Perto */}
              <div className="bg-red-50/50 border-b border-gray-200 p-4 overflow-y-auto min-h-[250px]">
                <span className="text-[10px] font-black text-red-800 uppercase block mb-3">Gerenciar de Perto</span>
                <div className="flex flex-wrap gap-2">
                  {stakeholders.filter(s => getClassification(s.power, s.interest) === 'Gerenciar de Perto').map(s => (
                    <div key={s.id} className={cn(
                      "px-3 py-1 text-xs rounded-full shadow-sm whitespace-nowrap",
                      s.type === 'Core Team' ? "bg-purple-600 text-white border-2 border-purple-700 font-bold" : "bg-white text-purple-700 border-2 border-dashed border-purple-400 font-medium"
                    )}>
                      {s.name || '---'}
                    </div>
                  ))}
                </div>
              </div>
              {/* Bottom Left: Monitorar */}
              <div className="bg-purple-50/50 border-r border-gray-200 p-4 overflow-y-auto min-h-[250px]">
                <span className="text-[10px] font-black text-purple-800 uppercase block mb-3">Monitorar</span>
                <div className="flex flex-wrap gap-2">
                  {stakeholders.filter(s => getClassification(s.power, s.interest) === 'Monitorar').map(s => (
                    <div key={s.id} className={cn(
                      "px-3 py-1 text-xs rounded-full shadow-sm whitespace-nowrap",
                      s.type === 'Core Team' ? "bg-purple-600 text-white border-2 border-purple-700 font-bold" : "bg-white text-purple-700 border-2 border-dashed border-purple-400 font-medium"
                    )}>
                      {s.name || '---'}
                    </div>
                  ))}
                </div>
              </div>
              {/* Bottom Right: Informado */}
              <div className="bg-green-50/50 p-4 overflow-y-auto min-h-[250px]">
                <span className="text-[10px] font-black text-green-800 uppercase block mb-3">Manter Informado</span>
                <div className="flex flex-wrap gap-2">
                  {stakeholders.filter(s => getClassification(s.power, s.interest) === 'Manter Informado').map(s => (
                    <div key={s.id} className={cn(
                      "px-3 py-1 text-xs rounded-full shadow-sm whitespace-nowrap",
                      s.type === 'Core Team' ? "bg-purple-600 text-white border-2 border-purple-700 font-bold" : "bg-white text-purple-700 border-2 border-dashed border-purple-400 font-medium"
                    )}>
                      {s.name || '---'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex gap-6 justify-center bg-gray-50/50 py-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 border-2 border-purple-700 rounded-full" />
                <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Core Team</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-purple-400 border-dashed rounded-full" />
                <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Impactado</span>
              </div>
            </div>
          </div>

          {/* MATRIZ DE ENGAJAMENTO (C -> D) */}
          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Share2 size={18} className="text-blue-500" />
                  Matriz de Engajamento
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-black">
                  C = NÍVEL ATUAL • D = NÍVEL DESEJÁVEL
                </p>
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-[10px] font-black text-red-700 shadow-sm">C</div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Atual (Current)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[10px] font-black text-blue-700 shadow-sm">D</div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Desejável (Desired)</span>
                </div>
              </div>
            </div>

            {/* Guia de Engajamento Colapsável */}
            <div className="mb-6">
              <button
                onClick={() => setIsEngagementRoleGuideOpen(!isEngagementRoleGuideOpen)}
                className="w-full flex items-center justify-between bg-blue-50 px-4 py-2.5 hover:bg-blue-100/80 transition-colors border border-blue-100 rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-2 text-blue-700">
                  <BookOpen size={14} />
                  <span className="text-xs font-medium">Sugestão de engajamento desejado por papel (Lean Six Sigma)</span>
                </div>
                <ChevronDown 
                  size={14} 
                  className={cn("text-blue-400 transition-transform duration-200", isEngagementRoleGuideOpen && "rotate-180")} 
                />
              </button>

              {isEngagementRoleGuideOpen && (
                <div className="mt-1 p-4 bg-white border border-blue-100 rounded-lg animate-in slide-in-from-top-1 duration-200">
                  <p className="text-xs text-gray-500 mb-3">
                    Esta tabela é uma sugestão baseada na literatura Lean Six Sigma. Os valores vêm pré-preenchidos quando você seleciona o papel e são aplicados automaticamente na matriz de engajamento abaixo.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-2 border border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider font-bold text-left">Papel</th>
                          <th className="p-2 border border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider font-bold text-left">Tipo</th>
                          <th className="p-2 border border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider font-bold text-left">Engaj. Desejado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ROLES.map(role => (
                          <tr key={role} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="p-2 font-medium text-gray-700">{role}</td>
                            <td className="p-2">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                ROLE_DEFAULT_TYPE[role] === 'Core Team' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                              )}>
                                {ROLE_DEFAULT_TYPE[role]}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                ROLE_DESIRED_ENGAGEMENT[role] === 'Líder' ? "bg-green-100 text-green-700" :
                                ROLE_DESIRED_ENGAGEMENT[role] === 'Apoiador' ? "bg-blue-100 text-blue-700" :
                                "bg-gray-100 text-gray-600"
                              )}>
                                {ROLE_DESIRED_ENGAGEMENT[role]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 italic">
                      Fontes: ASQ — American Society for Quality, Prosci ADKAR, Lean Six Sigma Hub. Adapte conforme o contexto real.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-200">Stakeholder</th>
                    {ENGAGEMENT_LEVELS.map(level => (
                      <th key={level} className="px-2 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-200 w-[12%]">
                        {level}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stakeholders.map(s => {
                    const current = s.currentEngagement || 'Neutro';
                    const desired = ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro';
                    const currentIndex = ENGAGEMENT_LEVELS.indexOf(current);
                    const desiredIndex = ENGAGEMENT_LEVELS.indexOf(desired);
                    const minIdx = Math.min(currentIndex, desiredIndex);
                    const maxIdx = Math.max(currentIndex, desiredIndex);

                    return (
                      <tr key={s.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 border border-gray-200">
                          <span className="text-xs font-bold text-gray-800">{s.name || '---'}</span>
                        </td>
                        {ENGAGEMENT_LEVELS.map((level, idx) => {
                          const isCurrent = idx === currentIndex;
                          const isDesired = idx === desiredIndex;
                          const isBetween = idx > minIdx && idx < maxIdx;
                          const isStart = idx === minIdx;
                          const isEnd = idx === maxIdx;

                          return (
                            <td 
                              key={level} 
                              className="p-0 border border-gray-200 relative h-12"
                            >
                              {/* Connection Line */}
                              {isBetween && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-full h-1 bg-red-200" />
                                </div>
                              )}
                              {isStart && currentIndex !== desiredIndex && (
                                <div className="absolute inset-y-0 right-0 flex items-center">
                                  <div className="w-1/2 h-1 bg-red-200" />
                                </div>
                              )}
                              {isEnd && currentIndex !== desiredIndex && (
                                <div className="absolute inset-y-0 left-0 flex items-center">
                                  <div className="w-1/2 h-1 bg-red-200" />
                                </div>
                              )}

                              {/* Symbols */}
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                {isCurrent && isDesired ? (
                                  <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center text-[10px] font-black text-green-700 shadow-md transform group-hover:scale-110 transition-transform">C/D</div>
                                ) : isCurrent ? (
                                  <div className="w-7 h-7 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center text-[10px] font-black text-red-700 shadow-md transform group-hover:scale-110 transition-transform">C</div>
                                ) : isDesired ? (
                                  <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center text-[10px] font-black text-blue-700 shadow-md transform group-hover:scale-110 transition-transform">D</div>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 border-t border-gray-100 pt-5">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 w-full">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="text-gray-500" size={20} />
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Regras de Negócio</h4>
                </div>
                <ul className="text-[11px] text-gray-600 space-y-2 list-disc pl-4 italic leading-relaxed">
                  <li>O nível <strong>Desejável (D)</strong> é calculado automaticamente com base no papel ocupado no projeto.</li>
                  <li>Patrocinadores e Líderes devem obrigatoriamente estar no nível "Líder" de engajamento.</li>
                  <li>Se o atual for menor que o desejável, há um esforço de engajamento pendente no Plano de Comunicação.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 5: PLANO DE COMUNICAÇÃO */}
      {stakeholders.length > 0 && (
        <>
          {/* DROPDOWN 3 — Tabela de Ações Recomendadas (Awareness) */}
          <div className="bg-white border border-purple-100 rounded-lg overflow-hidden shadow-sm mb-4">
            <button
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              className="w-full flex items-center justify-between bg-purple-50 px-4 py-2.5 hover:bg-purple-100/70 transition-colors border-none cursor-pointer"
            >
              <div className="flex items-center gap-2 text-purple-700">
                <Lightbulb size={14} />
                <span className="text-xs font-medium">Ações Recomendadas — Fase Medir (Desire)</span>
              </div>
              <ChevronDown 
                size={14} 
                className={cn("text-purple-500 transition-transform duration-200", isActionsOpen && "rotate-180")} 
              />
            </button>

            {isActionsOpen && (
              <div className="p-4 bg-white border-t border-purple-100 mt-1 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-purple-50 rounded-md p-3 mb-3">
                  <h4 className="font-bold text-sm text-purple-800 mb-1">Foco: Desire</h4>
                  <p className="text-xs text-purple-700">
                    Fazer cada pessoa QUERER cooperar com o mapeamento do processo e a coleta de dados.
                  </p>
                </div>

                <div className="border border-gray-100 rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100 w-[150px]">Quadrante</th>
                        <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100 w-[60px] text-center">Estado</th>
                        <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">Ação Recomendada</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      <tr className="border-b border-gray-100">
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Gerenciar de Perto</span></td>
                        <td className="p-2 text-center text-sm">🔴</td>
                        <td className="p-2 text-xs text-gray-700">Conversa individual para entender o que está bloqueando o engajamento. Endereçar a preocupação específica e mostrar o que ela ganha com a mudança.</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Gerenciar de Perto</span></td>
                        <td className="p-2 text-center text-sm">🟡</td>
                        <td className="p-2 text-xs text-gray-700">Convite ativo para participar das próximas etapas. Reforçar como a contribuição dela é valiosa.</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Manter Satisfeito</span></td>
                        <td className="p-2 text-center text-sm">🔴</td>
                        <td className="p-2 text-xs text-gray-700">Reapresentar os benefícios do projeto com dados. Solicitar apoio visível e ativo.</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Manter Satisfeito</span></td>
                        <td className="p-2 text-center text-sm">🟡</td>
                        <td className="p-2 text-xs text-gray-700">Apresentar progresso e pedir endosso público nas próximas comunicações.</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Manter Informado</span></td>
                        <td className="p-2 text-center text-sm">🔴</td>
                        <td className="p-2 text-xs text-gray-700">Conversa direta para entender resistência. Validar que o impacto na área é positivo ou neutro.</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Manter Informado</span></td>
                        <td className="p-2 text-center text-sm">🟡</td>
                        <td className="p-2 text-xs text-gray-700">Atualização destacando como a contribuição dela é essencial. Pedir disponibilidade para envolvimento.</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Monitorar</span></td>
                        <td className="p-2 text-center text-sm">🔴</td>
                        <td className="p-2 text-xs text-gray-700">Comunicação clara do porquê o engajamento dela importa. Endereçar diretamente boatos ou desinformação.</td>
                      </tr>
                      <tr>
                        <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Monitorar</span></td>
                        <td className="p-2 text-center text-sm">🟡</td>
                        <td className="p-2 text-xs text-gray-700">Reforçar valor da mudança nas comunicações regulares. Citar exemplos de quem já apoia.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-100 mt-3 pt-3">
                  <p className="text-[10px] text-gray-400 italic">
                    Use esta referência para preencher o campo de Ação Recomendada de cada stakeholder na tabela abaixo.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden no-print">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/30">
            <div>
              <div className="flex items-center gap-2 text-gray-800">
                <MessageSquare size={20} className="text-purple-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Plano de Comunicação & Engajamento</h2>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Quem fala, com quem, por qual canal e com qual frequência.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200">
                  <th className="px-4 py-3 min-w-[220px]">Stakeholder</th>
                  <th className="px-4 py-3 min-w-[150px]">Classificação</th>
                  <th className="px-4 py-3 text-center w-[120px]">Desire</th>
                  <th className="px-4 py-3 min-w-[300px]">Ação Recomendada</th>
                  <th className="px-4 py-3 min-w-[150px]">Canal</th>
                  <th className="px-4 py-3 min-w-[150px]">Frequência</th>
                  <th className="px-4 py-3 min-w-[150px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stakeholders.map((s) => {
                  const classification = getClassification(s.power, s.interest);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <div className="text-[13px] font-bold text-gray-800 flex items-center gap-2 whitespace-normal break-words">
                            {s.name || '---'}
                            <span className={cn(
                              "px-1.5 py-0.5 text-[8px] font-black rounded uppercase shrink-0",
                              s.type === 'Core Team' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {s.type}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 whitespace-normal break-words">{s.area || 'Sem área'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                          classification === 'Gerenciar de Perto' ? "bg-red-100 text-red-700" :
                          classification === 'Manter Satisfeito' ? "bg-blue-100 text-blue-700" :
                          classification === 'Manter Informado' ? "bg-green-100 text-green-700" :
                          "bg-purple-100 text-purple-700"
                        )}>
                          {classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-center gap-1">
                          {(() => {
                            const color = calculateColorForPhase(s, currentPhase);
                            return (
                              <div 
                                title="Calculado automaticamente a partir do Engajamento Atual"
                                className={cn(
                                  "w-3 h-3 rounded-full border border-white shadow-sm",
                                  color === 'Verde' ? "bg-green-500" :
                                  color === 'Amarelo' ? "bg-amber-400" :
                                  "bg-red-500"
                                )}
                              />
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="relative">
                          {(() => {
                            const actionProp = currentPhase === 'Define' ? 'customAction' : `customAction${currentPhase}`;
                            const customVal = s[actionProp as keyof Stakeholder] as string;
                            const recommended = getRecommendedAction(s);
                            const displayValue = customVal !== undefined && customVal !== '' && customVal !== recommended ? customVal : recommended;
                            return (
                              <>
                                <textarea
                                  value={displayValue}
                                  onChange={(e) => updateStakeholder(s.id, { [actionProp]: e.target.value })}
                                  placeholder={recommended}
                                  className="w-full px-2 py-1.5 pr-6 text-[11px] border border-gray-100 focus:border-blue-300 focus:bg-white rounded outline-none bg-gray-50/50 resize-none min-h-[56px] whitespace-normal break-words overflow-hidden"
                                  style={{ height: 'auto', minHeight: 'unset' }}
                                  onInput={(e) => {
                                    const t = e.target as HTMLTextAreaElement;
                                    t.style.height = 'auto';
                                    t.style.height = t.scrollHeight + 'px';
                                  }}
                                />
                                {customVal && customVal !== recommended && (
                                  <button
                                    onClick={() => updateStakeholder(s.id, { [actionProp]: '' })}
                                    className="absolute top-1.5 right-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Limpar e usar sugestão"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          value={s.channel || getDefaultChannel(classification)}
                          onChange={(e) => updateStakeholder(s.id, { channel: e.target.value })}
                          className="w-full px-1 py-1 text-[11px] border border-gray-100 rounded outline-none bg-transparent cursor-pointer"
                        >
                          <option value="">Selecionar canal...</option>
                          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          value={s.frequency || getDefaultFrequency(classification)}
                          onChange={(e) => updateStakeholder(s.id, { frequency: e.target.value })}
                          className="w-full px-1 py-1 text-[11px] border border-gray-100 rounded outline-none bg-transparent cursor-pointer"
                        >
                          <option value="">Selecionar freq...</option>
                          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {(() => {
                          const statusProp = `actionStatus${currentPhase}`;
                          const statusValue = (s[statusProp as keyof Stakeholder] as string) || 'Pendente';
                          return (
                            <select 
                              value={statusValue}
                              onChange={(e) => updateStakeholder(s.id, { [statusProp]: e.target.value })}
                              className={cn(
                                "w-full px-2 py-1.5 text-[11px] border rounded outline-none appearance-none cursor-pointer",
                                statusValue === 'Pendente' ? "text-red-600 bg-red-50 border-red-200" :
                                statusValue === 'Em andamento' ? "text-amber-600 bg-amber-50 border-amber-200" :
                                "text-green-600 bg-green-50 border-green-200"
                              )}
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Em andamento">Em andamento</option>
                              <option value="Concluído">Concluído</option>
                            </select>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 p-4 border-t border-gray-100">
            <div className="flex gap-3">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <p className="text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold">Boas práticas (PMI + Prosci):</span> Mensagens-chave devem ser repetidas 5–7 vezes ao longo do projeto. O sponsor é o sender preferido para mensagens estratégicas; o gestor direto, para mensagens operacionais.
              </p>
            </div>
          </div>
        </div>
      </>)}

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
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de ADKAR — Desire (Desejo)</h3>
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
                  Vermelho = resistência. As fases ainda não trabalhadas aparecem em cinza ("—").
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

