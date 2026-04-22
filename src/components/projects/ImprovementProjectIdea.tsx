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
  Info
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

  const [generatedProjects, setGeneratedProjects] = useState<any[]>(initialData?.generatedProjects || []);

  useEffect(() => {
    if (initialData) {
      if (initialData.userProfile) setUserProfile(initialData.userProfile);
      if (initialData.formData) setFormData(initialData.formData);
      if (initialData.generatedProjects) setGeneratedProjects(initialData.generatedProjects);
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
Você é um Master Black Belt em Lean Six Sigma com 20 anos de experiência.
Sua tarefa é analisar as informações coletadas e identificar EXCLUSIVAMENTE oportunidades de projetos Six Sigma com metodologia DMAIC.

PERFIL DO USUÁRIO: ${userProfile}

DADOS COLETADOS:
${JSON.stringify(formData, null, 2)}

REGRAS CRÍTICAS:
1. Gere APENAS projetos que se encaixam no modelo DMAIC — com problema quantificável, causa raiz investigável e solução mensurável.
2. NÃO gere projetos puramente Lean (5S, Kaizen rápido) — esses não precisam de DMAIC.
3. Cada projeto DEVE ter um Y mensurável claro (ex: "reduzir o lead time de aprovação de 5 dias para 2 dias").
4. Títulos SEMPRE começam com: Reduzir, Aumentar, Melhorar ou Otimizar — seguido do indicador e do processo.
5. Gere entre 5 e 10 projetos ordenados por prioridade (impacto x viabilidade).
6. Para cada projeto inclua: título, problema_central, y_do_projeto (indicador + baseline + meta), impacto_financeiro_estimado, complexidade (Verde/Amarelo/Vermelho), justificativa_six_sigma (por que precisa de DMAIC e não de outra abordagem).

FORMATO JSON:
[{
  "title": "...",
  "problem": "...",
  "y_metric": "De X para Y em Z meses",
  "financial_impact": "...",
  "complexity": "Verde/Amarelo/Vermelho",
  "six_sigma_justification": "...",
  "type": "Six Sigma DMAIC"
}]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const projects = JSON.parse(response.text);
      setGeneratedProjects(projects);
      
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

  const canGenerate = sectionsStatus[0].filled && sectionsStatus[1].filled && sectionsStatus[2].filled;
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
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pt-12 border-t-2 border-gray-200 border-dashed"
          >
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                <Target size={14} /> Oportunidades Identificadas
              </div>
              <h2 className="text-3xl font-black text-gray-900">Carteira de Projetos Six Sigma</h2>
              <p className="text-gray-500 font-medium max-w-2xl mx-auto italic">
                Abaixo estão as propostas de projeto DMAIC que nossa IA estratégica identificou como as mais promissoras para sua realidade.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {generatedProjects.map((project, idx) => (
                <ProjectResultCard key={idx} project={project} index={idx} />
              ))}
            </div>
          </motion.div>
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
  return (
    <textarea 
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-normal resize-none"
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

function ProjectResultCard({ project, index }: { project: any, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-50 transition-all flex flex-col gap-6 relative group"
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl border border-blue-100">
          {index + 1}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[9px] font-black px-3 py-1 bg-purple-100 text-purple-700 rounded-full uppercase tracking-widest border border-purple-200">
            {project.type || "Six Sigma DMAIC"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Complexidade:</span>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              project.complexity.includes('Verde') ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
              project.complexity.includes('Amarelo') ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
              "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            )} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
          {project.title}
        </h3>
        
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-blue-700">
            <BarChart3 size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Y do Projeto (Métrica)</span>
          </div>
          <p className="text-lg font-black text-gray-800 tracking-tight">{project.y_metric}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Problema Central</span>
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed line-clamp-3">{project.problem}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Impacto Financeiro</span>
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">{project.financial_impact}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 mt-2">
          <div className="flex items-start gap-2 italic">
            <Sparkles size={14} className="text-gray-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <span className="font-bold not-italic">Justificativa Six Sigma:</span> {project.six_sigma_justification}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
