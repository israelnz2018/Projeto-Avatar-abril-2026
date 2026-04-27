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
  ChevronDown
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AIPromptCard } from './ToolWrapper';

interface ImprovementProjectIdeaProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
}

type UserProfile = 'Analista' | 'Gestor' | 'Black Belt' | null;

export default function ImprovementProjectIdea({ onSave, initialData }: ImprovementProjectIdeaProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialData?.userProfile || null);
  const [formData, setFormData] = useState(initialData?.formData || {
    // SEÇÃO 1
    sector: '',
    area: '',
    participantCount: '',
    clientType: '',
    // SEÇÃO 2
    processDetail: '',
    processCritical: '',
    processVolume: '',
    areaPriority: '',
    automationLevel: '',
    // SEÇÃO 3
    problemVolume: '',
    financialImpact: '',
    frequency: '',
    affectedClient: '',
    clientPerception: '',
    // SEÇÃO 4
    processVariation: '',
    worseningContext: '',
    rootCauseHypothesis: '',
    dataAvailability: '',
    // SEÇÃO 5
    leadershipSupport: '',
    previousAttempts: '',
    systemsUsed: '',
    timeHorizon: '',
    // SEÇÃO 6
    futureVision: '',
    successIndicator: '',
    replicability: ''
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
      if (initialData.userProfile) setUserProfile(initialData.userProfile);
      if (initialData.formData) setFormData(initialData.formData);
      if (initialData.generatedProjects) setGeneratedProjects(normalizeProjects(initialData.generatedProjects));
    }
  }, [initialData]);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const handleInputChange = (name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    onSave({
      userProfile,
      formData: newFormData,
      generatedProjects
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

  const handleUpdateProject = (updatedProject: any) => {
    const updatedProjects = generatedProjects.map(p => 
      p.title === updatedProject.title ? updatedProject : p
    );
    setGeneratedProjects(updatedProjects);
    onSave({
      userProfile,
      formData,
      generatedProjects: updatedProjects
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
      const prompt = `
Você é um Master Black Belt com 20 anos de experiência.

PERFIL: ${userProfile}
DADOS: ${JSON.stringify(formData, null, 2)}

Gere entre 5 e 10 projetos ordenados por prioridade.

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

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonResponse = JSON.parse(response.text || '{}');
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

  // Progress Calculation
  const sectionsStatus = [
    { id: 1, filled: !!(formData.sector && formData.area && formData.participantCount && formData.clientType) },
    { id: 2, filled: !!(userProfile === 'Analista' ? formData.processDetail : userProfile === 'Gestor' ? (formData.processCritical && formData.processVolume) : formData.areaPriority) && !!formData.automationLevel },
    { id: 3, filled: !!(formData.problemVolume && formData.financialImpact && formData.frequency && formData.affectedClient && formData.clientPerception) },
    { id: 4, filled: !!(formData.processVariation && formData.worseningContext && formData.rootCauseHypothesis && formData.dataAvailability) },
    { id: 5, filled: !!(formData.leadershipSupport && formData.previousAttempts && formData.systemsUsed) },
    { id: 6, filled: !!(formData.futureVision && formData.successIndicator) }
  ];

  const canGenerate = sectionsStatus[0].filled; // Only Section 1 required
  const progressPercent = (sectionsStatus.filter(s => s.filled).length / 6) * 100;

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto p-12 space-y-12 text-center bg-[#f8fafc] min-h-screen">
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Para personalizar suas perguntas, me diz: qual é o seu perfil?</h2>
          <p className="text-gray-500 font-medium italic">Isso ajudará nosso consultor IA a fazer as perguntas certas para você.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              id: 'Analista' as UserProfile, 
              title: 'Analista / Especialista', 
              description: 'Executo processos e identifico problemas no dia a dia',
              icon: ClipboardList
            },
            { 
              id: 'Gestor' as UserProfile, 
              title: 'Gestor / Gerente de Área', 
              description: 'Gerencio equipes e processo com visão de resultados',
              icon: Briefcase
            },
            { 
              id: 'Black Belt' as UserProfile, 
              title: 'Black Belt / Consultor', 
              description: 'Conduzo projetos de melhoria em diferentes áreas',
              icon: Zap
            }
          ].map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleProfileSelect(profile.id)}
              className="p-8 bg-white border-2 border-gray-100 rounded-3xl text-left hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                <profile.icon className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{profile.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{profile.description}</p>
            </button>
          ))}
        </div>
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
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Entrevista Investigativa Six Sigma
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest translate-y-[-2px]">
                Modo {userProfile}
              </span>
            </h1>
            <p className="text-sm text-gray-500 font-bold">Responda as perguntas para identificarmos gargalos estatísticos.</p>
          </div>
        </div>
        <button 
          onClick={() => setUserProfile(null)}
          className="text-xs font-black text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 uppercase tracking-widest"
        >
          <UserCircle size={14} />
          Trocar Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 gap-10 pb-20">
        {/* SEÇÃO 1 */}
        <SectionCard 
          step={1} 
          title="Contexto e Cenário" 
          icon={Building2}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Setor da Empresa">
              <Input 
                value={formData.sector} 
                onChange={(v) => handleInputChange('sector', v)}
                placeholder="Ex: Automotivo, Varejo, Saúde..." 
              />
            </Field>
            <Field label="Área de Atuação">
              <Input 
                value={formData.area} 
                onChange={(v) => handleInputChange('area', v)}
                placeholder="Ex: Comercial, Logística, Manutenção..." 
              />
            </Field>
            <Field label="Pessoas envolvidas no processo?">
              <Input 
                type="number"
                value={formData.participantCount} 
                onChange={(v) => handleInputChange('participantCount', v)}
                placeholder="0" 
              />
            </Field>
            <Field label="Quem o processo atende?">
              <Select 
                value={formData.clientType} 
                onChange={(v) => handleInputChange('clientType', v)}
                options={[
                  { label: 'Clientes Internos', value: 'Internos' },
                  { label: 'Clientes Externos', value: 'Externos' },
                  { label: 'Ambos', value: 'Ambos' }
                ]}
              />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 2 */}
        <SectionCard 
          step={2} 
          title="O Processo em Questão" 
          icon={Settings2}
        >
          <div className="space-y-6">
            {userProfile === 'Analista' && (
              <Field label="Descreva em detalhes o processo que você executa do início ao fim">
                <Textarea 
                  value={formData.processDetail} 
                  onChange={(v) => handleInputChange('processDetail', v)}
                  placeholder="Seja detalhado sobre as etapas..." 
                />
              </Field>
            )}
            {userProfile === 'Gestor' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Field label="Qual é o processo mais crítico sob sua responsabilidade?">
                    <Textarea 
                      value={formData.processCritical} 
                      onChange={(v) => handleInputChange('processCritical', v)}
                      placeholder="Identifique o processo prioritário..." 
                    />
                  </Field>
                </div>
                <Field label="Volume diário/mensal?">
                  <Input 
                    type="number"
                    value={formData.processVolume} 
                    onChange={(v) => handleInputChange('processVolume', v)}
                    placeholder="Ex: 500 chamados/mês" 
                  />
                </Field>
              </div>
            )}
            {userProfile === 'Black Belt' && (
              <Field label="Qual processo foi identificado como prioritário e por quê?">
                <Textarea 
                  value={formData.areaPriority} 
                  onChange={(v) => handleInputChange('areaPriority', v)}
                  placeholder="Contexto da identificação estratégica..." 
                />
              </Field>
            )}
            <Field label="Nível de Automação">
              <Select 
                value={formData.automationLevel} 
                onChange={(v) => handleInputChange('automationLevel', v)}
                options={[
                  { label: 'Manual (Muitas planilhas e digitação)', value: 'Manual' },
                  { label: 'Parcialmente Automatizado', value: 'Parcial' },
                  { label: 'Totalmente Automatizado', value: 'Total' }
                ]}
              />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 3 */}
        <SectionCard 
          step={3} 
          title="Dor e Impacto" 
          icon={TrendingDown}
          subtitle="Aqui precisamos de números. Sem dados não há projeto Six Sigma."
        >
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 mb-8">
            <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <p className="text-xs text-amber-800 font-bold leading-relaxed">
              💡 Dica: projetos Six Sigma sem dados quantitativos têm baixa chance de aprovação. Seja específico sobre volume de erros, tempo ou custo.
            </p>
          </div>

          <div className="space-y-6">
            <Field label="Qual é o volume do problema? (Ex: X erros/semana, Y% retrabalho, Z horas/mês)" important>
              <Textarea 
                value={formData.problemVolume} 
                onChange={(v) => handleInputChange('problemVolume', v)}
                placeholder="Traga números reais aqui..." 
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Impacto Financeiro Estimado" important>
                <Select 
                  value={formData.financialImpact} 
                  onChange={(v) => handleInputChange('financialImpact', v)}
                  options={[
                    { label: 'Menos de R$10k/ano', value: '<10k' },
                    { label: 'R$10k–50k/ano', value: '10k-50k' },
                    { label: 'R$50k–200k/ano', value: '50k-200k' },
                    { label: 'Acima de R$200k/ano', value: '>200k' },
                    { label: 'Não sei estimar', value: 'unknown' }
                  ]}
                />
              </Field>
              <Field label="Frequência do Problema" important>
                <Select 
                  value={formData.frequency} 
                  onChange={(v) => handleInputChange('frequency', v)}
                  options={[
                    { label: 'Diariamente', value: 'Diário' },
                    { label: 'Semanalmente', value: 'Semanal' },
                    { label: 'Mensalmente', value: 'Mensal' },
                    { label: 'Raramente (alto impacto)', value: 'Raro' }
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Quem é o cliente mais afetado?">
                <Input 
                  value={formData.affectedClient} 
                  onChange={(v) => handleInputChange('affectedClient', v)}
                  placeholder="Área destino ou cliente final..." 
                />
              </Field>
              <Field label="Como o cliente percebe o problema?">
                <Textarea 
                  value={formData.clientPerception} 
                  onChange={(v) => handleInputChange('clientPerception', v)}
                  placeholder="Reclamação, atraso, insatisfação..." 
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* SEÇÃO 4 */}
        <SectionCard 
          step={4} 
          title="Causas e Variação" 
          icon={BarChart3}
          subtitle="Vamos investigar a variabilidade — isso é o que define um projeto Six Sigma"
        >
          <div className="space-y-6">
            <Field label="O resultado é sempre o mesmo ou varia? Descreva a variação.">
              <Textarea 
                value={formData.processVariation} 
                onChange={(v) => handleInputChange('processVariation', v)}
                placeholder="Ex: 'Alguns dias o prazo é 2h, em outros é 24h'..." 
              />
            </Field>
            <Field label="Quando o problema é pior? (Dia, turno, operador, equipamento)">
              <Textarea 
                value={formData.worseningContext} 
                onChange={(v) => handleInputChange('worseningContext', v)}
                placeholder="Padrões identificados..." 
              />
            </Field>
            <Field label="Causa Raiz: Já existe alguma hipótese?">
              <Textarea 
                value={formData.rootCauseHypothesis} 
                onChange={(v) => handleInputChange('rootCauseHypothesis', v)}
                placeholder="O que você acha que está causando isso?" 
              />
            </Field>
            <Field label="Disponibilidade de Dados Históricos">
              <Select 
                value={formData.dataAvailability} 
                onChange={(v) => handleInputChange('dataAvailability', v)}
                options={[
                  { label: 'Sim, temos dados estruturados', value: 'Estruturados' },
                  { label: 'Sim, mas planilhas dispersas', value: 'Dispersas' },
                  { label: 'Dados parciais', value: 'Parciais' },
                  { label: 'Não temos dados', value: 'Nenhum' }
                ]}
              />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 5 */}
        <SectionCard 
          step={5} 
          title="Contexto Organizacional" 
          icon={Users}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Apoio da Liderança">
                <Select 
                  value={formData.leadershipSupport} 
                  onChange={(v) => handleInputChange('leadershipSupport', v)}
                  options={[
                    { label: 'Sim, total', value: 'Total' },
                    { label: 'Parcial', value: 'Parcial' },
                    { label: 'Ainda não discutido', value: 'Nao' }
                  ]}
                />
              </Field>
              {['Gestor', 'Black Belt'].includes(userProfile) && (
                <Field label="Horizonte de Tempo para Resultados">
                  <Select 
                    value={formData.timeHorizon} 
                    onChange={(v) => handleInputChange('timeHorizon', v)}
                    options={[
                      { label: '30 dias', value: '30d' },
                      { label: '3 meses', value: '3m' },
                      { label: '6 meses', value: '6m' },
                      { label: 'Mais de 6 meses', value: '6m+' }
                    ]}
                  />
                </Field>
              )}
            </div>
            <Field label="Já houve tentativas anteriores de melhoria? O que aconteceu?">
              <Textarea 
                value={formData.previousAttempts} 
                onChange={(v) => handleInputChange('previousAttempts', v)}
                placeholder="Histórico de mudanças..." 
              />
            </Field>
            <Field label="Sistemas Usados (ERP, planilhas, sistemas próprios)">
              <Input 
                value={formData.systemsUsed} 
                onChange={(v) => handleInputChange('systemsUsed', v)}
                placeholder="Ex: SAP, Excel, JIRA..." 
              />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 6 */}
        <SectionCard 
          step={6} 
          title="Visão de Futuro" 
          icon={Sparkles}
        >
          <div className="space-y-6">
            <Field label="Se este processo funcionasse perfeitamente, como seria diferente do hoje?">
              <Textarea 
                value={formData.futureVision} 
                onChange={(v) => handleInputChange('futureVision', v)}
                placeholder="Descreva o estado futuro desejado..." 
              />
            </Field>
            <Field label="Qual seria o indicador de sucesso mais importante?">
              <Input 
                value={formData.successIndicator} 
                onChange={(v) => handleInputChange('successIndicator', v)}
                placeholder="Ex: Reduzir de 15% para 2% em 4 meses" 
              />
            </Field>
            {userProfile === 'Black Belt' && (
              <Field label="Este projeto poderia ser replicado em outras áreas?">
                <Select 
                  value={formData.replicability} 
                  onChange={(v) => handleInputChange('replicability', v)}
                  options={[
                    { label: 'Sim', value: 'Sim' },
                    { label: 'Não', value: 'Nao' },
                    { label: 'Talvez', value: 'Talvez' }
                  ]}
                />
              </Field>
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
              {loading ? "Processando..." : "Gerar Ideias de Projeto"}
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
                .map((project, idx) => (
                  <ProjectResultCard 
                    key={idx} 
                    project={project} 
                    index={idx} 
                    onUpdateProject={handleUpdateProject}
                  />
                ))
              }
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

function ProjectResultCard({ project, index, onUpdateProject }: { project: any, index: number, onUpdateProject: (updatedProject: any) => void }) {
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
                        {label: 'Black Belt', value: 'Black Belt'},
                        {label: 'Design for Six Sigma (DFSS)', value: 'Design for Six Sigma (DFSS)'},
                        {label: 'Matriz de Decisão', value: 'Matriz de Decisão'}
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
