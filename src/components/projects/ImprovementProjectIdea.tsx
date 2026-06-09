import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Building2,
  Settings2,
  AlertTriangle,
  BarChart3,
  Zap,
  Loader2,
  CheckCircle2,
  FileText,
  Users,
  Calendar,
  Search,
  Sparkles,
  PlayCircle,
  UserCircle,
  ClipboardList,
  Target,
  TrendingDown,
  Clock,
  Briefcase,
  Share2,
  Info,
  ChevronDown,
  Plus,
  Trash2,
  X,
  Map,
  Globe2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AIPromptCard } from './ToolWrapper';

interface ImprovementProjectIdeaProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
}

// Perfis NOVOS — por ESCOPO de melhoria, não por cargo.
// Mantemos os antigos como aliases pra retrocompatibilidade de dados salvos.
type UserProfile = 'Atividades' | 'Area' | 'Empresa' | null;
type LegacyProfile = 'Analista' | 'Gestor' | 'Black Belt';

const LEGACY_PROFILE_MAP: Record<LegacyProfile, UserProfile> = {
  'Analista': 'Atividades',
  'Gestor': 'Area',
  'Black Belt': 'Empresa',
};

function normalizeProfile(p: any): UserProfile {
  if (!p) return null;
  if (p === 'Atividades' || p === 'Area' || p === 'Empresa') return p;
  if (LEGACY_PROFILE_MAP[p as LegacyProfile]) return LEGACY_PROFILE_MAP[p as LegacyProfile];
  return null;
}

// Mapa de recomendação de trilha por perfil (popup informativo, aluno decide)
const PERFIL_RECOMENDACAO: Record<Exclude<UserProfile, null>, { trilhaNumero: string; trilhaNome: string; explicacao: string } | null> = {
  'Atividades': {
    trilhaNumero: 'Trilha 1',
    trilhaNome: 'Como Chegar Numa Área Nova e Já Entregar Resultado',
    explicacao: 'Pra quem quer melhorar o que executa no dia a dia, essa trilha (grátis) cobre 10 situações: da adaptação até implementar mudança que sustenta. Inclui Mini-Charter, causa-raiz com 5 Porquês, vender solução sem virar inimigo do time e plano de controle. É o caminho mais direto pro seu escopo — e não custa nada.',
  },
  'Area': null, // sem recomendação específica — o aluno tem várias opções
  'Empresa': {
    trilhaNumero: 'Trilha 9',
    trilhaNome: 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria',
    explicacao: 'Pra quem enxerga a empresa como sistema, essa formação cobre PMI completo, gerenciamento de stakeholders em múltiplas áreas, risk register e relatório executivo. É o nível pra liderar projeto que atravessa departamentos.',
  },
};

export default function ImprovementProjectIdea({ onSave, initialData }: ImprovementProjectIdeaProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(normalizeProfile(initialData?.userProfile));
  // Popup de recomendação de trilha — aparece quando aluno clica em perfil com sugestão
  const [recommendationPopup, setRecommendationPopup] = useState<{
    perfil: UserProfile;
    trilhaNumero: string;
    trilhaNome: string;
    explicacao: string;
  } | null>(null);
  const [formData, setFormData] = useState(initialData?.formData || initialData?.toolData || {
    // Comuns
    sector: '',
    area: '',
    participantCount: '',
    clientType: '',
    automationLevel: '',
    problemVolume: '',
    financialImpact: '',
    frequency: '',
    affectedClient: '',
    clientPerception: '',
    processVariation: '',
    worseningContext: '',
    rootCauseHypothesis: '',
    dataAvailability: '',
    leadershipSupport: '',
    previousAttempts: '',
    systemsUsed: '',
    timeHorizon: '',
    futureVision: '',
    successIndicator: '',
    replicability: '',
    // Específicos por perfil (preservados se algum migrar de antigo)
    processDetail: '',     // Atividades
    processCritical: '',   // Area
    processVolume: '',     // Area
    areaPriority: '',      // Empresa
    // NOVOS — Perfil "Atividades"
    minhaFuncao: '',
    tempoNaFuncao: '',
    atividadesQueExecuto: '',
    problemasQueEnfrento: '',
    reclamacoesQueRecebo: '',
    ideiasJaPensadas: '',
    // NOVOS — Perfil "Area"
    tamanhoEquipe: '',
    principaisProcessos: '',
    indicadorChaveArea: '',
    valorAtualIndicador: '',
    pontosFracosArea: '',
    areasQueReclamam: '',
    areasComConflito: '',
    // NOVOS — Perfil "Empresa"
    tamanhoEmpresa: '',
    meuPapelEmpresa: '',
    doresExecutivas: '',
    areasCriticasEmpresa: '',
    conexoesProblematicas: '',
    jaTemProgramaOpEx: '',
    historicoOpEx: '',
    numeroEstrategico: '',
  });

  const normalizeProjects = (projects: any[]) => {
    return projects.map(p => {
      // Prioritize the belt_level returned by the AI or stored
      let belt = p.belt_level || p.beltLevel || '';
      belt = belt.toString().toLowerCase();

      // Precise mapping based on Belt Guide
      if (belt.includes('ver') || belt.includes('agir')) {
        p.belt_level = 'Ver e Agir';
      } else if (belt.includes('yellow') || belt.includes('amarelo')) {
        p.belt_level = 'Yellow Belt';
      } else if (belt.includes('green') || belt.includes('verde')) {
        p.belt_level = 'Green Belt';
      } else if (belt.includes('black') || belt.includes('preto')) {
        p.belt_level = 'Black Belt';
      } else {
        // Fallback for unexpected strings
        if (belt.includes('quick') || belt.includes('kaizen')) {
          p.belt_level = 'Ver e Agir';
        } else if (belt.includes('simples')) {
          p.belt_level = 'Yellow Belt';
        } else {
          p.belt_level = 'Green Belt'; // Mid-range default
        }
      }

      p.priority_score = Number(p.priority_score) || 50;
      return p;
    });
  };

  const [generatedProjects, setGeneratedProjects] = useState<any[]>(initialData?.generatedProjects ? normalizeProjects(initialData.generatedProjects) : []);
  const [beltFilter, setBeltFilter] = useState<string>('Todos');
  const [showBeltGuide, setShowBeltGuide] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.userProfile) setUserProfile(normalizeProfile(initialData.userProfile));
      if (initialData.formData || initialData.toolData) setFormData(initialData.formData || initialData.toolData);
      if (initialData.generatedProjects) setGeneratedProjects(normalizeProjects(initialData.generatedProjects));
    }
  }, [initialData]);

  const handleInputChange = (name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    onSave({
      userProfile,
      formData: newFormData,
      generatedProjects
    }, { silent: true });
  };

  // Quando aluno clica num card de perfil: se tem recomendação de trilha, mostra popup primeiro.
  // Senão, seleciona direto.
  const handleProfileClick = (profile: Exclude<UserProfile, null>) => {
    const rec = PERFIL_RECOMENDACAO[profile];
    if (rec) {
      setRecommendationPopup({ perfil: profile, ...rec });
    } else {
      confirmProfileSelection(profile);
    }
  };

  // Aluno decide: aceitar recomendação (vira pra trilha) ou continuar nessa ferramenta.
  // De qualquer forma, define o perfil pra que se ele decidir continuar, a ferramenta esteja pronta.
  const confirmProfileSelection = (profile: Exclude<UserProfile, null>) => {
    setUserProfile(profile);
    setRecommendationPopup(null);
    onSave({
      userProfile: profile,
      formData,
      generatedProjects,
    }, { silent: true });
  };

  const handleProfileSelect = (profile: UserProfile) => {
    setUserProfile(profile);
    onSave({
      userProfile: profile,
      formData,
      generatedProjects
    }, { silent: true });
  };



  const handleSave = () => {
    onSave({
      userProfile,
      formData,
      generatedProjects
    });
  };

  const generateProjects = async () => {
    setLoading(true);
    try {
      const focoDescritivo =
        userProfile === 'Atividades' ? 'O aluno quer melhorar SUAS PRÓPRIAS ATIVIDADES no dia a dia. Foco em ações individuais — não propor projetos que dependam de várias áreas ou alto patrocínio. Quick wins, ideias acionáveis sem aprovação executiva.' :
        userProfile === 'Area' ? 'O aluno é coordenador/gerente de área e quer melhorar SUA ÁREA. Foco em projetos de escopo de área (1-3 processos), com possíveis interfaces com áreas vizinhas. Não propor projetos corporativos amplos.' :
        userProfile === 'Empresa' ? 'O aluno é especialista/consultor com visão SISTÊMICA da empresa. Pode propor projetos transversais grandes, programa OpEx, mudanças estruturais, projetos Black Belt com 5+ áreas envolvidas.' :
        '';
      const prompt = `
Você é o Israel, mentor LBW (Lean Six Sigma Master Black Belt · PMP · MBA).

FOCO ESCOLHIDO PELO ALUNO: ${userProfile}
CONTEXTO DO FOCO: ${focoDescritivo}

DADOS COLETADOS NA ENTREVISTA:
${JSON.stringify(formData, null, 2)}

Gere entre 5 e 10 ideias de projetos ordenados por prioridade. RESPEITE o foco escolhido — não fuja do escopo.

CLASSIFICAÇÃO — siga RIGOROSAMENTE esta matriz para o campo belt_level:
1. "Ver e Agir": Solução óbvia, melhoria rápida, 1 pessoa, prazo < 30 dias, Sem estatística.
2. "Yellow Belt": Problema simples, 1 área envolvida, 1 a 3 pessoas, prazo 1 a 2 meses, Estatística básica.
3. "Green Belt": Requer análise de dados, 1 área envolvida, 2 a 5 pessoas, prazo 2 a 4 meses, Estatística intermediária.
4. "Black Belt": Múltiplas áreas (transversal), alto impacto financeiro, 5+ pessoas, prazo 4 a 6 meses, Estatística avançada.

REGRAS:
1. Título começa com Reduzir, Aumentar, Melhorar ou Otimizar — máximo 10 palavras
2. y_indicator: APENAS o nome do indicador sem meta ou prazo. Ex: "Taxa de defeitos"
3. priority_score: número de 0 a 100

Retorne APENAS um objeto JSON com uma chave "projects" contendo a lista:
{
  "projects": [{
    "title": "...",
    "problem": "descrição do problema em 1 frase",
    "y_indicator": "nome do indicador apenas",
    "financial_impact": "estimativa de impacto",
    "belt_level": "Ver e Agir | Yellow Belt | Green Belt | Black Belt",
    "priority_score": 85,
    "justification": "Explicação técnica de por que este nível foi escolhido com base na Equipe, Prazo e Estatística necessária"
  }]
}
`;

      const { callAIJSON } = await import('../../services/aiRouter');
      const jsonResponse = await callAIJSON<{ projects?: any[] }>({
        location: 'fill-tool',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4096,
      });
      const projects = jsonResponse.projects || [];

      const normalized = normalizeProjects(projects);
      setGeneratedProjects(normalized);
      
      onSave({
        userProfile,
        formData,
        generatedProjects: projects
      });
    } catch (error) {
      console.error("Erro ao gerar projetos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Progress Calculation — adaptado aos novos perfis (Atividades/Area/Empresa).
  const sec1Filled =
    userProfile === 'Atividades' ? !!(formData.sector && formData.area && formData.minhaFuncao && formData.tempoNaFuncao) :
    userProfile === 'Area' ? !!(formData.sector && formData.area && formData.tamanhoEquipe && formData.clientType) :
    userProfile === 'Empresa' ? !!(formData.sector && formData.area && formData.tamanhoEmpresa && formData.meuPapelEmpresa) :
    false;
  const sec2Filled =
    userProfile === 'Atividades' ? !!(formData.atividadesQueExecuto && formData.clientType && formData.automationLevel) :
    userProfile === 'Area' ? !!(formData.principaisProcessos && formData.processCritical && formData.automationLevel) :
    userProfile === 'Empresa' ? !!(formData.doresExecutivas && formData.areasCriticasEmpresa && formData.automationLevel) :
    false;
  const sec3Filled =
    userProfile === 'Atividades' ? !!(formData.problemasQueEnfrento && formData.reclamacoesQueRecebo && formData.problemVolume) :
    userProfile === 'Area' ? !!(formData.pontosFracosArea && formData.areasQueReclamam && formData.problemVolume) :
    userProfile === 'Empresa' ? !!(formData.conexoesProblematicas && formData.problemVolume) :
    false;
  const sectionsStatus = [
    { id: 1, filled: sec1Filled },
    { id: 2, filled: sec2Filled },
    { id: 3, filled: sec3Filled },
    { id: 4, filled: !!(formData.processVariation && formData.worseningContext && formData.rootCauseHypothesis && formData.dataAvailability) },
    { id: 5, filled: !!(formData.leadershipSupport && formData.previousAttempts) },
    { id: 6, filled: !!(formData.futureVision && formData.successIndicator) },
  ];

  const canGenerate = sectionsStatus[0].filled; // Só seção 1 obrigatória pra liberar geração
  const progressPercent = (sectionsStatus.filter(s => s.filled).length / 6) * 100;

  if (!userProfile) {
    return (
      <div className="max-w-5xl mx-auto p-12 space-y-12 text-center bg-[#f8fafc] min-h-screen">
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Antes de tudo: qual é o ESCOPO da melhoria que você quer?</h2>
          <p className="text-gray-500 font-medium italic">Vou fazer perguntas diferentes pra cada caso. Escolhe o que descreve melhor a sua situação.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              id: 'Atividades' as Exclude<UserProfile, null>,
              title: 'Quero melhorar MINHAS ATIVIDADES',
              description: 'O que EU faço no dia a dia — re-trabalho, ferramenta ruim, espera, reclamação que recebo.',
              icon: ClipboardList,
              hint: 'Sugestão: Trilha 1 (grátis)',
            },
            {
              id: 'Area' as Exclude<UserProfile, null>,
              title: 'Quero melhorar MINHA ÁREA',
              description: 'Sou coordenador/gerente — onde minha área está fraca, queixas internas, conflito com outras áreas.',
              icon: Building2,
              hint: '',
            },
            {
              id: 'Empresa' as Exclude<UserProfile, null>,
              title: 'Quero melhorar MINHA EMPRESA',
              description: 'Sou especialista/consultor — visão sistêmica, dores executivas, conexões entre áreas, programa OpEx.',
              icon: Globe2,
              hint: 'Sugestão: Trilha 9',
            },
          ].map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleProfileClick(profile.id)}
              className="p-6 bg-white border-2 border-gray-100 rounded-3xl text-left hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer flex flex-col"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                <profile.icon className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
              </div>
              <h3 className="text-[15px] font-black text-gray-900 mb-3 leading-tight">{profile.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed flex-1">{profile.description}</p>
              {profile.hint && (
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-4 pt-3 border-t border-gray-100">
                  💡 {profile.hint}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Popup de recomendação de trilha — aluno decide */}
        <AnimatePresence>
          {recommendationPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setRecommendationPopup(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-left"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F0F2FA] flex items-center justify-center text-[#0033CC]">
                      <Lightbulb size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black tracking-widest uppercase text-[#0033CC]">Recomendação do Israel</p>
                      <p className="text-[18px] font-black text-gray-900">{recommendationPopup.trilhaNumero}</p>
                    </div>
                  </div>
                  <button onClick={() => setRecommendationPopup(null)} className="text-gray-400 hover:text-gray-700 bg-transparent border-0 cursor-pointer p-1">
                    <X size={18} />
                  </button>
                </div>

                <p className="text-[15px] font-bold text-gray-900 mb-2 leading-tight">{recommendationPopup.trilhaNome}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">{recommendationPopup.explicacao}</p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex gap-2">
                  <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Você pode <strong>seguir com essa ferramenta aqui</strong> de qualquer jeito — a recomendação acima é só um atalho. Sua escolha vale.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setRecommendationPopup(null)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-[12px] font-black uppercase tracking-widest hover:bg-gray-50 transition cursor-pointer bg-white"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => recommendationPopup.perfil && confirmProfileSelection(recommendationPopup.perfil as Exclude<UserProfile, null>)}
                    className="flex-[2] px-4 py-3 rounded-xl bg-[#0033CC] hover:bg-[#1E2D6E] text-white text-[12px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer border-0"
                  >
                    Continuar com essa ferramenta <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 bg-[#f8fafc] min-h-screen">
      {/* ProgressBar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-gray-100 z-50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 flex-wrap">
              Bate-papo com o Israel pra achar a melhor ideia
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest translate-y-[-2px]">
                {userProfile === 'Atividades' && 'Foco: Suas atividades'}
                {userProfile === 'Area' && 'Foco: Sua área'}
                {userProfile === 'Empresa' && 'Foco: A empresa'}
              </span>
            </h1>
            <p className="text-sm text-gray-500 font-bold">
              {userProfile === 'Atividades' && 'Vou te fazer perguntas sobre o que VOCÊ faz no dia a dia.'}
              {userProfile === 'Area' && 'Vou te fazer perguntas sobre os processos da sua ÁREA.'}
              {userProfile === 'Empresa' && 'Vou te fazer perguntas sistêmicas sobre a EMPRESA como um todo.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setUserProfile(null)}
          className="text-xs font-black text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 uppercase tracking-widest"
        >
          <UserCircle size={14} />
          Trocar Foco
        </button>
      </div>

      <div className="grid grid-cols-1 gap-10 pb-20">
        {/* SEÇÃO 1 — Contexto (varia por foco) */}
        <SectionCard
          step={1}
          title={
            userProfile === 'Atividades' ? 'Quem é você no jogo' :
            userProfile === 'Area' ? 'Contexto da sua área' :
            'Contexto da empresa'
          }
          icon={Building2}
          subtitle={
            userProfile === 'Atividades' ? 'Antes de tudo, preciso te conhecer um pouco.' :
            userProfile === 'Area' ? 'Vamos posicionar sua área no mapa.' :
            'Visão geral pra entender o terreno.'
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Setor da empresa">
              <Input
                value={formData.sector}
                onChange={(v) => handleInputChange('sector', v)}
                placeholder="Ex: Automotivo, Varejo, Saúde..."
              />
            </Field>
            <Field label={
              userProfile === 'Atividades' ? 'Sua área (onde você está)' :
              userProfile === 'Area' ? 'Nome da sua área' :
              'Áreas que você acompanha'
            }>
              <Input
                value={formData.area}
                onChange={(v) => handleInputChange('area', v)}
                placeholder={
                  userProfile === 'Atividades' ? 'Ex: Logística, Comercial, TI...' :
                  userProfile === 'Area' ? 'Ex: Atendimento, Manutenção, Suprimentos...' :
                  'Ex: todas, ou as 3-5 críticas'
                }
              />
            </Field>
            {userProfile === 'Atividades' && (
              <>
                <Field label="Sua função / cargo">
                  <Input
                    value={formData.minhaFuncao}
                    onChange={(v) => handleInputChange('minhaFuncao', v)}
                    placeholder="Ex: Analista de processos, Coordenador..."
                  />
                </Field>
                <Field label="Há quanto tempo nessa função?">
                  <Select
                    value={formData.tempoNaFuncao}
                    onChange={(v) => handleInputChange('tempoNaFuncao', v)}
                    options={[
                      { label: 'Menos de 6 meses', value: '<6m' },
                      { label: '6 meses a 2 anos', value: '6m-2a' },
                      { label: '2 a 5 anos', value: '2-5a' },
                      { label: 'Mais de 5 anos', value: '>5a' },
                    ]}
                  />
                </Field>
              </>
            )}
            {userProfile === 'Area' && (
              <>
                <Field label="Tamanho da equipe que você coordena">
                  <Input
                    type="number"
                    value={formData.tamanhoEquipe}
                    onChange={(v) => handleInputChange('tamanhoEquipe', v)}
                    placeholder="Ex: 12"
                  />
                </Field>
                <Field label="Quem a sua área atende?">
                  <Select
                    value={formData.clientType}
                    onChange={(v) => handleInputChange('clientType', v)}
                    options={[
                      { label: 'Outras áreas (cliente interno)', value: 'Internos' },
                      { label: 'Cliente final (externo)', value: 'Externos' },
                      { label: 'Ambos', value: 'Ambos' },
                    ]}
                  />
                </Field>
              </>
            )}
            {userProfile === 'Empresa' && (
              <>
                <Field label="Tamanho da empresa">
                  <Select
                    value={formData.tamanhoEmpresa}
                    onChange={(v) => handleInputChange('tamanhoEmpresa', v)}
                    options={[
                      { label: 'Pequena (< 100 pessoas)', value: 'pequena' },
                      { label: 'Média (100 a 1000)', value: 'media' },
                      { label: 'Grande (> 1000)', value: 'grande' },
                    ]}
                  />
                </Field>
                <Field label="Seu papel na empresa">
                  <Input
                    value={formData.meuPapelEmpresa}
                    onChange={(v) => handleInputChange('meuPapelEmpresa', v)}
                    placeholder="Ex: Consultor interno, Black Belt, Gerente OpEx..."
                  />
                </Field>
              </>
            )}
          </div>
        </SectionCard>

        {/* SEÇÃO 2 — Foco do problema (varia por foco) */}
        <SectionCard
          step={2}
          title={
            userProfile === 'Atividades' ? 'O que você FAZ no dia a dia' :
            userProfile === 'Area' ? 'O que sua área entrega' :
            'Onde a empresa mais dói'
          }
          icon={Settings2}
          subtitle={
            userProfile === 'Atividades' ? 'Quero entender as atividades concretas — não cargo, não responsabilidade no papel.' :
            userProfile === 'Area' ? 'Vamos olhar os processos críticos e o nível de maturidade.' :
            'As 3 dores executivas que aparecem em reunião de diretoria.'
          }
        >
          <div className="space-y-6">
            {userProfile === 'Atividades' && (
              <>
                <Field label="Liste suas 3-5 atividades principais da semana">
                  <Textarea
                    value={formData.atividadesQueExecuto}
                    onChange={(v) => handleInputChange('atividadesQueExecuto', v)}
                    placeholder="Ex: 1) Fechar relatório mensal · 2) Atender solicitações de outras áreas · 3) Atualizar planilha XYZ..."
                  />
                </Field>
                <Field label="Pra quem você entrega o resultado dessas atividades?">
                  <Select
                    value={formData.clientType}
                    onChange={(v) => handleInputChange('clientType', v)}
                    options={[
                      { label: 'Pro meu chefe', value: 'Chefe' },
                      { label: 'Pra outras áreas internas', value: 'Internos' },
                      { label: 'Pro cliente final', value: 'Externos' },
                      { label: 'Mistura de tudo', value: 'Ambos' },
                    ]}
                  />
                </Field>
              </>
            )}
            {userProfile === 'Area' && (
              <>
                <Field label="Quais são os 2-3 processos críticos da sua área?">
                  <Textarea
                    value={formData.principaisProcessos}
                    onChange={(v) => handleInputChange('principaisProcessos', v)}
                    placeholder="Ex: 1) Atendimento de chamados · 2) Gestão de estoque · 3) Cadastro de novos clientes..."
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Qual é O processo MAIS crítico (o que mais te tira o sono)?">
                    <Textarea
                      value={formData.processCritical}
                      onChange={(v) => handleInputChange('processCritical', v)}
                      placeholder="Aquele que se falhar, vira problema com diretoria..."
                    />
                  </Field>
                  <Field label="Volume desse processo (semanal/mensal)">
                    <Input
                      value={formData.processVolume}
                      onChange={(v) => handleInputChange('processVolume', v)}
                      placeholder="Ex: 500 chamados/mês, 200 pedidos/semana..."
                    />
                  </Field>
                </div>
              </>
            )}
            {userProfile === 'Empresa' && (
              <>
                <Field label="Quais 3 dores aparecem MAIS em reuniões executivas?">
                  <Textarea
                    value={formData.doresExecutivas}
                    onChange={(v) => handleInputChange('doresExecutivas', v)}
                    placeholder="Ex: 1) Margem caindo em produtos B · 2) Atraso em entrega · 3) Custo de retrabalho subindo..."
                  />
                </Field>
                <Field label="Quais áreas você considera críticas hoje (onde se concentra o maior risco)?">
                  <Textarea
                    value={formData.areasCriticasEmpresa}
                    onChange={(v) => handleInputChange('areasCriticasEmpresa', v)}
                    placeholder="Ex: Operações da unidade SP, Faturamento, TI..."
                  />
                </Field>
              </>
            )}
            <Field label="Nível de automação do que estamos discutindo">
              <Select
                value={formData.automationLevel}
                onChange={(v) => handleInputChange('automationLevel', v)}
                options={[
                  { label: 'Manual (planilhas, papel, digitação)', value: 'Manual' },
                  { label: 'Parcial (uns sistemas + planilhas no meio)', value: 'Parcial' },
                  { label: 'Total (sistema integrado, sem retrabalho)', value: 'Total' },
                ]}
              />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 3 — A dor concreta + reclamações (varia por foco) */}
        <SectionCard
          step={3}
          title={
            userProfile === 'Atividades' ? 'O que TE ATRAPALHA + reclamações' :
            userProfile === 'Area' ? 'Pontos fracos da área + atritos' :
            'Onde acumula custo, atraso ou perda'
          }
          icon={TrendingDown}
          subtitle={
            userProfile === 'Atividades' ? 'Bora ser concreto: o que sai errado, o que toma seu tempo, quem reclama de você.' :
            userProfile === 'Area' ? 'Onde a área tropeça, quem reclama, quem você "briga" no dia a dia.' :
            'Os pontos cegos sistêmicos. Cuidado: aqui aparece muita causa raiz organizacional.'
          }
        >
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 mb-8">
            <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <p className="text-xs text-amber-800 font-bold leading-relaxed">
              💡 Quanto mais NÚMERO você trouxer aqui (% retrabalho, horas, custo), melhor a ideia que a IA vai te gerar. Sem número, sai sugestão vaga.
            </p>
          </div>

          <div className="space-y-6">
            {userProfile === 'Atividades' && (
              <>
                <Field label="O que mais TE ATRAPALHA no dia a dia? (re-trabalho, espera, ferramenta ruim, info que falta)" important>
                  <Textarea
                    value={formData.problemasQueEnfrento}
                    onChange={(v) => handleInputChange('problemasQueEnfrento', v)}
                    placeholder="Ex: Toda segunda perco 2h fazendo um relatório que ninguém usa..."
                  />
                </Field>
                <Field label="Quem RECLAMA de você? E sobre o quê?" important>
                  <Textarea
                    value={formData.reclamacoesQueRecebo}
                    onChange={(v) => handleInputChange('reclamacoesQueRecebo', v)}
                    placeholder="Ex: A área X reclama de atraso · Meu chefe pede dado que eu não tenho na hora..."
                  />
                </Field>
              </>
            )}
            {userProfile === 'Area' && (
              <>
                <Field label="Onde sua área TROPEÇA mais? (pontos fracos honestos)" important>
                  <Textarea
                    value={formData.pontosFracosArea}
                    onChange={(v) => handleInputChange('pontosFracosArea', v)}
                    placeholder="Ex: SLA furado em pedidos urgentes · Equipe sobrecarregada às sextas..."
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Quais áreas RECLAMAM da sua?" important>
                    <Textarea
                      value={formData.areasQueReclamam}
                      onChange={(v) => handleInputChange('areasQueReclamam', v)}
                      placeholder="Ex: Comercial reclama de prazo, Faturamento reclama de info errada..."
                    />
                  </Field>
                  <Field label="Quais áreas VOCÊ tem atrito recorrente?">
                    <Textarea
                      value={formData.areasComConflito}
                      onChange={(v) => handleInputChange('areasComConflito', v)}
                      placeholder="Ex: TI demora demais · Suprimentos não respeita prazo..."
                    />
                  </Field>
                </div>
              </>
            )}
            {userProfile === 'Empresa' && (
              <>
                <Field label="Quais áreas se PREJUDICAM mutuamente (conexões problemáticas)?" important>
                  <Textarea
                    value={formData.conexoesProblematicas}
                    onChange={(v) => handleInputChange('conexoesProblematicas', v)}
                    placeholder="Ex: Vendas promete prazo que Operações não cumpre · Comercial vs Crédito..."
                  />
                </Field>
              </>
            )}
            <Field label="Volume do problema em NÚMERO (X erros/semana, Y% retrabalho, Z horas/mês)" important>
              <Textarea
                value={formData.problemVolume}
                onChange={(v) => handleInputChange('problemVolume', v)}
                placeholder="Traga números reais — chute educado vale mais que 'muito'..."
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Impacto financeiro estimado" important>
                <Select
                  value={formData.financialImpact}
                  onChange={(v) => handleInputChange('financialImpact', v)}
                  options={[
                    { label: 'Menos de R$10k/ano', value: '<10k' },
                    { label: 'R$10k–50k/ano', value: '10k-50k' },
                    { label: 'R$50k–200k/ano', value: '50k-200k' },
                    { label: 'R$200k–1MM/ano', value: '200k-1MM' },
                    { label: 'Acima de R$1MM/ano', value: '>1MM' },
                    { label: 'Não sei estimar', value: 'unknown' },
                  ]}
                />
              </Field>
              <Field label="Com que frequência o problema ocorre" important>
                <Select
                  value={formData.frequency}
                  onChange={(v) => handleInputChange('frequency', v)}
                  options={[
                    { label: 'Diariamente', value: 'Diário' },
                    { label: 'Semanalmente', value: 'Semanal' },
                    { label: 'Mensalmente', value: 'Mensal' },
                    { label: 'Raramente, mas alto impacto', value: 'Raro' },
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label={
                userProfile === 'Atividades' ? 'Quem é o cliente mais afetado pelo seu output?' :
                userProfile === 'Area' ? 'Quem é o cliente mais afetado pela área?' :
                'Qual stakeholder externo mais sofre com isso?'
              }>
                <Input
                  value={formData.affectedClient}
                  onChange={(v) => handleInputChange('affectedClient', v)}
                  placeholder="Ex: Cliente Premium · Área Comercial · Acionistas..."
                />
              </Field>
              <Field label="Como ele percebe o problema?">
                <Textarea
                  value={formData.clientPerception}
                  onChange={(v) => handleInputChange('clientPerception', v)}
                  placeholder="Reclamação, atraso, insatisfação, churn..."
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* SEÇÃO 4 — Causa raiz + variação (universal) */}
        <SectionCard
          step={4}
          title="Causas e variação"
          icon={BarChart3}
          subtitle={
            userProfile === 'Atividades' ? 'Vamos olhar PADRÕES — o que torna seu dia mais difícil em alguns momentos.' :
            userProfile === 'Area' ? 'Onde a variabilidade aparece — é o que separa "ruim sempre" de "ruim às vezes".' :
            'Investigação sistêmica — variabilidade em múltiplas dimensões revela problemas estruturais.'
          }
        >
          <div className="space-y-6">
            <Field label="O resultado é SEMPRE igual ou VARIA muito? Descreve a variação.">
              <Textarea
                value={formData.processVariation}
                onChange={(v) => handleInputChange('processVariation', v)}
                placeholder={
                  userProfile === 'Atividades' ? "Ex: Tem dia que faço em 1h, outros em 4h..." :
                  userProfile === 'Area' ? "Ex: Alguns dias o SLA é cumprido em 90%, outros em 60%..." :
                  "Ex: Algumas unidades atingem meta, outras ficam 30% abaixo..."
                }
              />
            </Field>
            <Field label="QUANDO o problema piora? (dia da semana, turno, mês, sazonalidade, pessoa específica)">
              <Textarea
                value={formData.worseningContext}
                onChange={(v) => handleInputChange('worseningContext', v)}
                placeholder="Padrões observáveis..."
              />
            </Field>
            <Field label="JÁ tem alguma hipótese de causa raiz? (chute educado vale)">
              <Textarea
                value={formData.rootCauseHypothesis}
                onChange={(v) => handleInputChange('rootCauseHypothesis', v)}
                placeholder={
                  userProfile === 'Atividades' ? "Ex: Acho que a ferramenta X é lenta · O processo Y depende de info que só vem na sexta..." :
                  userProfile === 'Area' ? "Ex: Equipe nova faz mais erro · Sistema Z trava em pico..." :
                  "Ex: Não tem dono claro do processo entre Comercial e Operações..."
                }
              />
            </Field>
            <Field label="Tem dados históricos disponíveis?">
              <Select
                value={formData.dataAvailability}
                onChange={(v) => handleInputChange('dataAvailability', v)}
                options={[
                  { label: 'Sim, temos em sistema estruturado', value: 'Estruturados' },
                  { label: 'Sim, mas em planilhas dispersas', value: 'Dispersas' },
                  { label: 'Dados parciais — alguns sim, outros não', value: 'Parciais' },
                  { label: 'Não temos dado nenhum', value: 'Nenhum' },
                ]}
              />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 5 — Contexto organizacional (varia por foco) */}
        <SectionCard
          step={5}
          title={
            userProfile === 'Atividades' ? 'Apoio + tentativas anteriores' :
            userProfile === 'Area' ? 'Suporte gerencial + histórico' :
            'Maturidade OpEx da empresa'
          }
          icon={Users}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label={
                userProfile === 'Atividades' ? 'Seu chefe topa você mexer nisso?' :
                userProfile === 'Area' ? 'Apoio da diretoria pra essa melhoria' :
                'Patrocínio executivo / sponsor da iniciativa'
              }>
                <Select
                  value={formData.leadershipSupport}
                  onChange={(v) => handleInputChange('leadershipSupport', v)}
                  options={[
                    { label: 'Sim, total apoio', value: 'Total' },
                    { label: 'Parcial — vai aprovar se eu trouxer bons números', value: 'Parcial' },
                    { label: 'Ainda não conversei sobre isso', value: 'Nao' },
                  ]}
                />
              </Field>
              {(userProfile === 'Area' || userProfile === 'Empresa') && (
                <Field label="Horizonte de tempo desejado pra resultados">
                  <Select
                    value={formData.timeHorizon}
                    onChange={(v) => handleInputChange('timeHorizon', v)}
                    options={[
                      { label: '30 dias (quick win)', value: '30d' },
                      { label: '3 meses (DMAIC compacto)', value: '3m' },
                      { label: '6 meses (DMAIC pleno)', value: '6m' },
                      { label: 'Mais de 6 meses (projeto grande)', value: '6m+' },
                    ]}
                  />
                </Field>
              )}
            </div>
            {userProfile === 'Empresa' && (
              <>
                <Field label="A empresa já tem programa formal de melhoria contínua (OpEx, Lean, Six Sigma)?">
                  <Select
                    value={formData.jaTemProgramaOpEx}
                    onChange={(v) => handleInputChange('jaTemProgramaOpEx', v)}
                    options={[
                      { label: 'Sim, maduro (3+ anos)', value: 'maduro' },
                      { label: 'Sim, começando (< 2 anos)', value: 'iniciante' },
                      { label: 'Tinha mas parou', value: 'parou' },
                      { label: 'Nunca teve', value: 'nunca' },
                    ]}
                  />
                </Field>
                {(formData.jaTemProgramaOpEx === 'maduro' || formData.jaTemProgramaOpEx === 'iniciante' || formData.jaTemProgramaOpEx === 'parou') && (
                  <Field label="Conta um pouco do histórico OpEx — o que funcionou, o que não">
                    <Textarea
                      value={formData.historicoOpEx}
                      onChange={(v) => handleInputChange('historicoOpEx', v)}
                      placeholder="Tipo de projetos, resultados, por que parou..."
                    />
                  </Field>
                )}
              </>
            )}
            <Field label="Já houve tentativas anteriores de melhoria nessa frente? O que aconteceu?">
              <Textarea
                value={formData.previousAttempts}
                onChange={(v) => handleInputChange('previousAttempts', v)}
                placeholder="Histórico de mudanças que funcionaram OU travaram..."
              />
            </Field>
            <Field label="Sistemas usados (ERP, planilhas, ferramentas internas)">
              <Input
                value={formData.systemsUsed}
                onChange={(v) => handleInputChange('systemsUsed', v)}
                placeholder="Ex: SAP, Excel, JIRA, Sistema interno X..."
              />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 6 — Visão de futuro (varia por foco) */}
        <SectionCard
          step={6}
          title="Como ficaria se desse certo"
          icon={Sparkles}
          subtitle={
            userProfile === 'Atividades' ? 'Quero entender o "depois" — sem isso a IA chuta meta no escuro.' :
            userProfile === 'Area' ? 'O futuro desejado da área (e o impacto em quem é cliente dela).' :
            'A visão estratégica e o impacto no negócio.'
          }
        >
          <div className="space-y-6">
            <Field label={
              userProfile === 'Atividades' ? 'Se essa(s) atividade(s) rolasse(m) "perfeita(s)", o que seria diferente pra você?' :
              userProfile === 'Area' ? 'Se a área ficasse "show", o que mudaria pra quem é cliente dela?' :
              'Se essa dor sumisse, qual seria o impacto pra empresa?'
            }>
              <Textarea
                value={formData.futureVision}
                onChange={(v) => handleInputChange('futureVision', v)}
                placeholder="Descreva o estado futuro desejado..."
              />
            </Field>
            <Field label="Qual o indicador de sucesso (número-meta)?">
              <Input
                value={formData.successIndicator}
                onChange={(v) => handleInputChange('successIndicator', v)}
                placeholder="Ex: Reduzir de 15% pra 2% em 4 meses · SLA de 70% pra 95%..."
              />
            </Field>
            {userProfile === 'Atividades' && (
              <Field label="Você já PENSOU em alguma ideia mas não pôs em prática? Conta.">
                <Textarea
                  value={formData.ideiasJaPensadas}
                  onChange={(v) => handleInputChange('ideiasJaPensadas', v)}
                  placeholder="Mesmo as ideias que parecem 'pequenas demais' — vale ouro pra IA gerar variantes..."
                />
              </Field>
            )}
            {userProfile === 'Empresa' && (
              <>
                <Field label="Qual o NÚMERO ESTRATÉGICO que se virasse, mudaria a empresa?">
                  <Textarea
                    value={formData.numeroEstrategico}
                    onChange={(v) => handleInputChange('numeroEstrategico', v)}
                    placeholder="Ex: Reduzir custo unitário em 8%, dobrar capacidade sem CAPEX, retenção de cliente de 70 pra 85%..."
                  />
                </Field>
                <Field label="Esse projeto seria replicável em outras unidades/áreas/empresas?">
                  <Select
                    value={formData.replicability}
                    onChange={(v) => handleInputChange('replicability', v)}
                    options={[
                      { label: 'Sim, em várias áreas/unidades', value: 'Sim' },
                      { label: 'Talvez, com ajustes', value: 'Talvez' },
                      { label: 'Não, é específico desse caso', value: 'Nao' },
                    ]}
                  />
                </Field>
              </>
            )}
          </div>
        </SectionCard>

        {/* Action Section */}
        <div className="flex flex-col items-center gap-4 py-8 border-t-2 border-gray-100 border-dashed">
          <div className="relative group">
            <button
              onClick={generateProjects}
              disabled={loading || !canGenerate}
              className={cn(
                "w-72 py-5 px-8 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-4 shadow-2xl",
                loading || !canGenerate
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-100"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1 active:scale-95 shadow-blue-200"
              )}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Sparkles size={24} />
              )}
              {loading ? "Processando..." : (generatedProjects.length > 0 ? "Regenerar Ideias de Projeto" : "Gerar Ideias de Projeto")}
            </button>
            
            {!canGenerate && (
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold px-4 py-2 rounded-xl whitespace-nowrap z-10 pointer-events-none shadow-xl">
                Preencha pelo menos as 3 primeiras seções para gerar projetos
              </div>
            )}
          </div>
          
          <button
            onClick={handleSave}
            className="text-xs font-black text-gray-400 hover:text-green-600 transition-colors uppercase tracking-[0.3em] flex items-center gap-3 pt-4"
          >
            <CheckCircle2 size={16} />
            Salvar Entrevista
          </button>
        </div>

        {/* Results Section */}
        {generatedProjects.length > 0 && (
          <div className="space-y-4 mt-8">
            
            {/* Título da seção */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                Oportunidades Identificadas
              </div>
              <h2 className="text-2xl font-black text-gray-900">Carteira de Projetos</h2>
              <p className="text-sm text-gray-400">
                Projetos identificados com base na sua realidade. Clique para ver os detalhes.
              </p>
            </div>

            {/* Filtros — APENAS estas 5 opções */}
            <div className="flex flex-wrap gap-2 justify-center">
              {['Todos', 'Ver e Agir', 'Yellow Belt', 'Green Belt', 'Black Belt'].map(level => {
                const count = level === 'Todos' 
                  ? generatedProjects.length 
                  : generatedProjects.filter(p => p.belt_level === level).length;
                const isActive = beltFilter === level;
                const colors: Record<string, string> = {
                  'Todos': 'bg-gray-800 text-white border-gray-800',
                  'Ver e Agir': 'bg-lime-500 text-white border-lime-500',
                  'Yellow Belt': 'bg-yellow-400 text-yellow-900 border-yellow-400',
                  'Green Belt': 'bg-green-500 text-white border-green-500',
                  'Black Belt': 'bg-gray-800 text-white border-gray-800',
                };
                return (
                  <button
                    key={level}
                    onClick={() => setBeltFilter(level)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border-2 cursor-pointer ${
                      isActive ? colors[level] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {level} ({count})
                  </button>
                );
              })}
            </div>

            {/* Guia de Belt colapsável */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowBeltGuide(!showBeltGuide)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors border-none cursor-pointer text-left"
              >
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Guia — Quando usar cada nível Belt?
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showBeltGuide ? 'rotate-180' : ''}`} />
              </button>
              {showBeltGuide && (
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Nível', 'Quando usar', 'Equipe', 'Prazo', 'Estatística'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-gray-400 font-black uppercase tracking-widest whitespace-normal break-words">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { level: 'Ver e Agir', dot: 'bg-lime-500', when: 'Solução óbvia, melhoria rápida', team: '1 pessoa', time: '< 30 dias', stats: 'Não' },
                        { level: 'Yellow Belt', dot: 'bg-yellow-400', when: 'Problema simples, 1 área', team: '1 a 3 pessoas', time: '1 a 2 meses', stats: 'Básica' },
                        { level: 'Green Belt', dot: 'bg-green-500', when: 'Análise de dados, 1 área', team: '2 a 5 pessoas', time: '2 a 4 meses', stats: 'Intermediária' },
                        { level: 'Black Belt', dot: 'bg-gray-800', when: 'Múltiplas áreas, alto impacto', team: '5+ pessoas', time: '4 a 6 meses', stats: 'Avançada' },
                      ].map(row => (
                        <tr key={row.level} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${row.dot}`} />
                               <span className="font-bold text-gray-800 whitespace-normal break-words">{row.level}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">{row.when}</td>
                          <td className="py-2.5 px-3 text-gray-600 whitespace-normal break-words align-top">{row.team}</td>
                          <td className="py-2.5 px-3 text-gray-600 whitespace-normal break-words align-top">{row.time}</td>
                          <td className="py-2.5 px-3 text-gray-600">{row.stats}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Cards de projetos */}
            <div className="space-y-3">
              {generatedProjects
                .filter(p => beltFilter === 'Todos' || p.belt_level === beltFilter)
                .map((project, idx) => {
                  // Precisamos do indice original para passar corretamente para o remove
                  const originalIndex = generatedProjects.indexOf(project);
                  return (
                  <ProjectResultCard 
                    key={originalIndex} 
                    project={project} 
                    index={originalIndex} 
                    onUpdateProject={(updatedProject) => {
                        const updatedProjects = [...generatedProjects];
                        updatedProjects[originalIndex] = updatedProject;
                        setGeneratedProjects(updatedProjects);
                        onSave({ userProfile, formData, generatedProjects: updatedProjects }, { silent: true });
                    }}
                    onRemoveProject={() => {
                        const updatedProjects = generatedProjects.filter((_, i) => i !== originalIndex);
                        setGeneratedProjects(updatedProjects);
                        onSave({ userProfile, formData, generatedProjects: updatedProjects }, { silent: true });
                    }}
                  />
                  );
                })
              }
              
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    const newProject = {
                      title: 'Nova Ideia de Projeto',
                      beltLevel: 'Ver e Agir',
                      what: '',
                      why: '',
                      where: '',
                      who: '',
                      how: '',
                      when: '',
                      howMuch: '',
                      expectedImpact: ''
                    };
                    const updatedProjects = [...generatedProjects, newProject];
                    setGeneratedProjects(updatedProjects);
                    setBeltFilter('Todos');
                    onSave({ userProfile, formData, generatedProjects: updatedProjects }, { silent: true });
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-100 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <Plus size={16} /> Adicionar Nova Ideia
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponents
function SectionCard({ step, title, icon: Icon, subtitle, children }: { step: number, title: string, icon: any, subtitle?: string, children: React.ReactNode }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 md:p-10 relative overflow-hidden"
    >
      <div className="absolute top-6 right-6">
        <span className="w-10 h-10 border border-blue-50 rounded-full flex items-center justify-center text-blue-200 font-black text-sm">
          {String(step).padStart(2, '0')}
        </span>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-700">
            <Icon size={24} className="text-blue-600" />
            <h3 className="text-xl font-black tracking-tight">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{subtitle}</p>
          )}
        </div>
        <div className="pt-2">
          {children}
        </div>
      </div>
    </motion.section>
  );
}

function Field({ label, labelIcon: Icon, children, important }: { label: string, labelIcon?: any, children: React.ReactNode, important?: boolean }) {
  return (
    <div className={cn("space-y-3", important && "border-l-4 border-blue-900 pl-4")}>
      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block pl-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string, onChange: (v: string) => void, placeholder?: string, type?: string }) {
  return (
    <input 
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-normal"
    />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea 
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-normal resize-none bg-transparent whitespace-normal break-words"
      style={{ height: 'auto', minHeight: '60px' }}
    />
  );
}

function Select({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { label: string, value: string }[] }) {
  return (
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
    >
      <option value="">Selecione uma opção...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function BeltReferenceTable() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors border-none cursor-pointer text-left"
      >
        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
          Guia de Níveis — Quando usar cada Belt?
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              <table className="w-full text-xs box-border">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-400 font-black uppercase tracking-widest whitespace-normal break-words">Nível</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-black uppercase tracking-widest hidden md:table-cell whitespace-normal break-words">Quando usar</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-black uppercase tracking-widest whitespace-normal break-words">Equipe</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-black uppercase tracking-widest whitespace-normal break-words">Prazo</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-black uppercase tracking-widest hidden lg:table-cell whitespace-normal break-words">Estatística</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      level: 'Ver e Agir', dot: 'bg-lime-500',
                      when: 'Solução óbvia, melhoria rápida',
                      team: '1 pessoa', time: '< 30 dias', stats: 'Não'
                    },
                    {
                      level: 'Yellow Belt', dot: 'bg-yellow-400',
                      when: 'Problema simples, 1 área',
                      team: '1 a 3 pessoas', time: '1 a 2 meses', stats: 'Básica'
                    },
                    {
                      level: 'Green Belt', dot: 'bg-green-500',
                      when: 'Análise de dados, 1 área',
                      team: '2 a 5 pessoas', time: '2 a 4 meses', stats: 'Intermediária'
                    },
                    {
                      level: 'Black Belt', dot: 'bg-gray-800',
                      when: 'Múltiplas áreas, alto impacto',
                      team: '5+ pessoas', time: '4 a 6 meses', stats: 'Avançada'
                    },
                    {
                      level: 'Design for Six Sigma', dot: 'bg-blue-600',
                      when: 'Criação de novo processo/produto',
                      team: '3 a 6 pessoas', time: 'Múltiplos meses', stats: 'Variável'
                    },
                    {
                      level: 'Matriz de Decisão', dot: 'bg-purple-600',
                      when: 'Escolher entre soluções prontas',
                      team: '1 a 3 pessoas', time: '< 1 mês', stats: 'Não'
                    },
                  ].map(row => (
                    <tr key={row.level} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 whitespace-normal break-words align-top">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${row.dot} shrink-0`} />
                          <span className="font-bold text-gray-800 whitespace-normal break-words">{row.level}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 hidden md:table-cell whitespace-normal break-words align-top">{row.when}</td>
                      <td className="py-2.5 px-3 text-gray-600 whitespace-normal break-words align-top">{row.team}</td>
                      <td className="py-2.5 px-3 text-gray-600 whitespace-normal break-words align-top">{row.time}</td>
                      <td className="py-2.5 px-3 text-gray-600 hidden lg:table-cell whitespace-normal break-words align-top">{row.stats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectResultCard({ project, index, onUpdateProject, onRemoveProject }: { project: any, index: number, onUpdateProject: (updatedProject: any) => void, onRemoveProject?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const beltConfig: Record<string, { 
    color: string; 
    bg: string; 
    border: string; 
    dot: string;
    label: string;
  }> = {
    'Ver e Agir': { 
      color: 'text-lime-700', bg: 'bg-lime-50', 
      border: 'border-lime-200', dot: 'bg-lime-500',
      label: 'Ver e Agir'
    },
    'Yellow Belt': { 
      color: 'text-yellow-700', bg: 'bg-yellow-50', 
      border: 'border-yellow-200', dot: 'bg-yellow-400',
      label: 'Yellow Belt'
    },
    'Green Belt': { 
      color: 'text-green-700', bg: 'bg-green-50', 
      border: 'border-green-200', dot: 'bg-green-500',
      label: 'Green Belt'
    },
    'Black Belt': { 
      color: 'text-gray-700', bg: 'bg-gray-50', 
      border: 'border-gray-300', dot: 'bg-gray-800',
      label: 'Black Belt'
    },
    'Design for Six Sigma (DFSS)': {
      color: 'text-blue-700', bg: 'bg-blue-50',
      border: 'border-blue-200', dot: 'bg-blue-600',
      label: 'DFSS'
    },
    'Matriz de Decisão (Pugh)': {
      color: 'text-purple-700', bg: 'bg-purple-50',
      border: 'border-purple-200', dot: 'bg-purple-600',
      label: 'Matriz Decisão'
    },
    'Matriz de Decisão': {
      color: 'text-purple-700', bg: 'bg-purple-50',
      border: 'border-purple-200', dot: 'bg-purple-600',
      label: 'Matriz Decisão'
    },
    'QFD': {
      color: 'text-purple-700', bg: 'bg-purple-50',
      border: 'border-purple-200', dot: 'bg-purple-600',
      label: 'QFD'
    }
  };

  const title = project.title || '';
  const beltLevel = project.beltLevel || project.belt_level || project.type || 'Green Belt';
  const priorityScore = project.priority_score || 0;

  const [editForm, setEditForm] = useState({
    title: project.title || '',
    beltLevel: beltLevel,
    what: project.what || project.problem || '',
    why: project.why || project.justification || '',
    where: project.where || '',
    who: project.who || '',
    when: project.when || '',
    how: project.how || '',
    howMuch: project.howMuch || project.financial_impact || '',
    expectedImpact: project.expectedImpact || ''
  });

  useEffect(() => {
    setEditForm({
      title: project.title || '',
      beltLevel: project.beltLevel || project.belt_level || project.type || 'Green Belt',
      what: project.what || project.problem || '',
      why: project.why || project.justification || '',
      where: project.where || '',
      who: project.who || '',
      when: project.when || '',
      how: project.how || '',
      howMuch: project.howMuch || project.financial_impact || '',
      expectedImpact: project.expectedImpact || ''
    });
  }, [project]);

  const belt = beltConfig[beltLevel] || beltConfig['Green Belt'];
  const priorityColor = priorityScore >= 80 ? 'bg-red-500' : priorityScore >= 60 ? 'bg-orange-400' : 'bg-blue-400';

  const handleSave = () => {
    onUpdateProject({ ...project, ...editForm });
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white border rounded-2xl overflow-hidden transition-all ${belt.border} hover:shadow-md`}
    >
      {/* Header — sempre visível */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors cursor-pointer bg-transparent border-none"
      >
        {/* Número */}
        <div className="w-7 h-7 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
          {index + 1}
        </div>

        {/* Badge Belt */}
        <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shrink-0 ${belt.bg} ${belt.color} border ${belt.border}`}>
          {belt.label}
        </span>

        {/* Título */}
        <span className="flex-1 text-sm font-bold text-gray-900 text-left leading-tight">
          {title}
        </span>

        {/* Expand icon */}
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Detalhes — colapsável */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isEditing ? (
              <div className={`px-4 sm:px-5 pb-5 pt-4 space-y-4 border-t ${belt.border} ${belt.bg}`}>
                <Field label="Título">
                  <Input value={editForm.title} onChange={(v) => setEditForm({...editForm, title: v})} />
                </Field>

                <Field label="Nível Belt">
                    <Select value={editForm.beltLevel} onChange={(v) => setEditForm({...editForm, beltLevel: v})} options={[
                        {label: 'Ver e Agir', value: 'Ver e Agir'},
                        {label: 'Yellow Belt', value: 'Yellow Belt'},
                        {label: 'Green Belt', value: 'Green Belt'},
                        {label: 'Black Belt', value: 'Black Belt'}
                    ]} />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="O que será feito (What)">
                    <Textarea value={editForm.what} onChange={(v) => setEditForm({...editForm, what: v})} />
                  </Field>
                  <Field label="Por que é importante (Why)">
                    <Textarea value={editForm.why} onChange={(v) => setEditForm({...editForm, why: v})} />
                  </Field>
                  <Field label="Onde será implementado (Where)">
                    <Input value={editForm.where} onChange={(v) => setEditForm({...editForm, where: v})} />
                  </Field>
                  <Field label="Quem são os envolvidos (Who)">
                    <Input value={editForm.who} onChange={(v) => setEditForm({...editForm, who: v})} />
                  </Field>
                  <Field label="Como será feito (How)">
                    <Textarea value={editForm.how} onChange={(v) => setEditForm({...editForm, how: v})} />
                  </Field>
                  <Field label="Quando será feito (When)">
                    <Input value={editForm.when} onChange={(v) => setEditForm({...editForm, when: v})} />
                  </Field>
                  <Field label="Custo / Impacto Financeiro (How Much)">
                    <Input value={editForm.howMuch} onChange={(v) => setEditForm({...editForm, howMuch: v})} />
                  </Field>
                  <Field label="Impacto Esperado Geral">
                    <Input value={editForm.expectedImpact} onChange={(v) => setEditForm({...editForm, expectedImpact: v})} />
                  </Field>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-white text-gray-500 border border-gray-200 hover:bg-gray-50`}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    className={`flex-[2] py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none cursor-pointer ${belt.bg} ${belt.color} border ${belt.border} hover:opacity-80`}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            ) : (
              <div className={`px-4 sm:px-5 pb-5 pt-2 space-y-4 border-t ${belt.border} ${belt.bg}`}>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">O que (What)</span>
                    <p className="text-sm font-medium text-gray-800">{editForm.what || '-'}</p>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Por que (Why)</span>
                    <p className="text-sm font-medium text-gray-800">{editForm.why || '-'}</p>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Como (How)</span>
                    <p className="text-sm font-medium text-gray-800">{editForm.how || '-'}</p>
                  </div>
                  <div className="flex flex-col gap-4">
                      <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Onde / Quem / Quando</span>
                        <p className="text-xs text-gray-600 mt-1"><strong>Onde:</strong> {editForm.where || '-'}</p>
                        <p className="text-xs text-gray-600 mt-1"><strong>Quem:</strong> {editForm.who || '-'}</p>
                        <p className="text-xs text-gray-600 mt-1"><strong>Quando:</strong> {editForm.when || '-'}</p>
                      </div>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Custo / Estimativa em $ (How Much)</span>
                    <p className="text-sm font-bold text-gray-900">{editForm.howMuch || '-'}</p>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Impacto Esperado</span>
                    <p className="text-sm font-bold text-gray-900">{editForm.expectedImpact || '-'}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3 pt-2">
                  {onRemoveProject && (
                    <button
                      className="p-3 rounded-xl font-black text-gray-400 bg-white border border-gray-200 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer flex-shrink-0 flex items-center justify-center"
                      onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if(onRemoveProject) onRemoveProject();
                      }}
                      title="Remover Ideia"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-white text-gray-600 border border-gray-200 hover:bg-gray-50`}
                    onClick={() => setIsEditing(true)}
                  >
                    Editar Ideia
                  </button>
                  <button
                    className={`flex-[2] py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none cursor-pointer ${belt.bg} ${belt.color} border ${belt.border} hover:opacity-80`}
                    onClick={() => {
                      // Salva o projeto selecionado para usar no Brief
                      const event = new CustomEvent('selectProject', { 
                        detail: { title: title, project: {...project, ...editForm} } 
                      });
                      window.dispatchEvent(event);
                    }}
                  >
                    Selecionar este projeto →
                  </button>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
