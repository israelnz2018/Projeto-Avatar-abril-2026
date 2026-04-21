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
  Sparkles
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { AIPromptCard } from './ToolWrapper';

interface ImprovementProjectIdeaProps {
  onSave: (data: any) => void;
  initialData?: any;
}

export default function ImprovementProjectIdea({ onSave, initialData }: ImprovementProjectIdeaProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData?.formData || {
    // Seção 1
    sector: '',
    area: '',
    role: '',
    // Seção 2
    processDescription: '',
    processType: '',
    // Seção 3
    frustration: '',
    errorsLocation: '',
    rework: '',
    delayCauses: '',
    // Seção 4
    slowestStep: '',
    unnecessaryActivities: '',
    dependency: '',
    // Seção 5
    complaints: '',
    qualityFailures: '',
    dataTrust: '',
    // Seção 6
    processVariation: '',
    resultVariation: '',
    // Seção 7
    frequency: '',
    mainImpact: '',
    // Seção 8
    systemsUsed: '',
    systemsIntegrated: '',
    parallelControls: '',
    parallelControlsWhich: '',
    // Seção 9
    communicationFailures: '',
    clearRoles: '',
    // Seção 10
    oneThingToImprove: '',
    whatWouldFacilitate: ''
  });

  const [generatedProjects, setGeneratedProjects] = useState<any[]>(initialData?.generatedProjects || []);

  useEffect(() => {
    if (initialData) {
      if (initialData.formData) setFormData(initialData.formData);
      if (initialData.generatedProjects) setGeneratedProjects(initialData.generatedProjects);
    } else {
      setGeneratedProjects([]);
      setFormData({
        sector: '',
        area: '',
        role: '',
        processDescription: '',
        processType: '',
        frustration: '',
        errorsLocation: '',
        rework: '',
        delayCauses: '',
        slowestStep: '',
        unnecessaryActivities: '',
        dependency: '',
        complaints: '',
        qualityFailures: '',
        dataTrust: '',
        processVariation: '',
        resultVariation: '',
        frequency: '',
        mainImpact: '',
        systemsUsed: '',
        systemsIntegrated: '',
        parallelControls: '',
        parallelControlsWhich: '',
        communicationFailures: '',
        clearRoles: '',
        oneThingToImprove: '',
        whatWouldFacilitate: ''
      });
    }
  }, [initialData]);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave({
      formData,
      generatedProjects
    });
  };

  const generateProjects = async () => {
    setLoading(true);
    try {
      const prompt = `
        Você é um especialista em Lean Six Sigma. Com base nas informações abaixo, gere entre 5 e 15 ideias de projetos de melhoria Lean Six Sigma (apenas as mais realistas e necessárias).
        
        CONTEXTO DO USUÁRIO:
        - Setor: ${formData.sector} | Área: ${formData.area} | Função: ${formData.role}
        - Processo: ${formData.processDescription} (${formData.processType})
        - Problemas: Frustração: ${formData.frustration} | Erros: ${formData.errorsLocation} | Retrabalho: ${formData.rework} | Atrasos: ${formData.delayCauses}
        - Tempo: Etapa demorada: ${formData.slowestStep} | Atividades desnecessárias: ${formData.unnecessaryActivities} | Dependência: ${formData.dependency}
        - Qualidade: Reclamações: ${formData.complaints} | Falhas: ${formData.qualityFailures} | Confiança nos dados: ${formData.dataTrust}
        - Variação: Processo varia: ${formData.processVariation} | Resultado varia: ${formData.resultVariation}
        - Impacto: Frequência: ${formData.frequency} | Impacto principal: ${formData.mainImpact}
        - Sistemas: Usados: ${formData.systemsUsed} | Integrados: ${formData.systemsIntegrated} | Controles paralelos: ${formData.parallelControls} (${formData.parallelControlsWhich})
        - Pessoas: Falhas de comunicação: ${formData.communicationFailures} | Papéis claros: ${formData.clearRoles}
        - Melhoria: O que melhorar: ${formData.oneThingToImprove} | O que facilitaria: ${formData.whatWouldFacilitate}

        REGRAS PARA OS PROJETOS:
        1. Gere entre 5 e 15 ideias realistas.
        2. Cada projeto deve conter: Título, Problema que resolve, Impacto esperado, Tipo (Lean, Six Sigma ou Híbrido) e Nível de dificuldade (Baixo, Médio, Alto).
        3. REGRA CRÍTICA PARA TÍTULOS: Devem SEMPRE começar com: Aumentar, Reduzir, Melhorar ou Otimizar.
        4. NUNCA usar: Estudar, Analisar, Avaliar, Verificar ou Eliminar (isoladamente).
        5. Os títulos devem ser claros, específicos e orientados a resultado.
        6. Retorne os dados em formato JSON (array de objetos).

        FORMATO DE RETORNO (JSON):
        [
          {
            "title": "Título do Projeto",
            "problem": "Problema que resolve",
            "impact": "Impacto esperado",
            "type": "Lean/Six Sigma/Híbrido",
            "difficulty": "Baixo/Médio/Alto"
          }
        ]
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
      
      // Save results and enable report buttons
      onSave({
        formData,
        generatedProjects: projects
      });
    } catch (error) {
      console.error("Erro ao gerar projetos:", error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: "SEÇÃO 1 — CONTEXTO",
      icon: Building2,
      fields: [
        { name: 'sector', label: '1. Setor', type: 'text', placeholder: 'Ex: Industrial, Serviços...' },
        { name: 'area', label: '2. Área', type: 'text', placeholder: 'Ex: Logística, RH...' },
        { name: 'role', label: '3. Função', type: 'select', options: ['Analista', 'Assistente', 'Coordenador', 'Supervisor', 'Outro'] }
      ]
    },
    {
      title: "SEÇÃO 2 — PROCESSO",
      icon: Settings2,
      fields: [
        { name: 'processDescription', label: '4. Descreva o principal processo', type: 'text', placeholder: 'Descreva o processo que você executa...' },
        { name: 'processType', label: '5. Tipo de processo', type: 'select', options: ['Manual', 'Parcialmente automatizado', 'Totalmente automatizado'] }
      ]
    },
    {
      title: "SEÇÃO 3 — PROBLEMAS",
      icon: AlertTriangle,
      fields: [
        { name: 'frustration', label: '6. O que mais te frustra?', type: 'text', placeholder: 'O que gera mais incômodo?' },
        { name: 'errorsLocation', label: '7. Onde ocorrem erros?', type: 'text', placeholder: 'Em qual etapa os erros são mais comuns?' },
        { name: 'rework', label: '8. Existe retrabalho?', type: 'select', options: ['Sim', 'Não'] },
        { name: 'delayCauses', label: '9. O que causa atrasos?', type: 'text', placeholder: 'Gargalos ou esperas...' }
      ]
    },
    {
      title: "SEÇÃO 4 — TEMPO",
      icon: Calendar,
      fields: [
        { name: 'slowestStep', label: '10. Etapa mais demorada', type: 'text', placeholder: 'Qual etapa leva mais tempo?' },
        { name: 'unnecessaryActivities', label: '11. Existem atividades desnecessárias?', type: 'select', options: ['Sim', 'Não'] },
        { name: 'dependency', label: '12. Depende de outras pessoas para continuar?', type: 'select', options: ['Sim', 'Não'] }
      ]
    },
    {
      title: "SEÇÃO 5 — QUALIDADE",
      icon: CheckCircle2,
      fields: [
        { name: 'complaints', label: '13. Existem reclamações?', type: 'select', options: ['Sim', 'Não'] },
        { name: 'qualityFailures', label: '14. Onde a qualidade falha?', type: 'text', placeholder: 'Defeitos ou desvios de padrão...' },
        { name: 'dataTrust', label: '15. Confia nos dados?', type: 'select', options: ['Sim', 'Não', 'Às vezes'] }
      ]
    },
    {
      title: "SEÇÃO 6 — VARIAÇÃO",
      icon: BarChart3,
      fields: [
        { name: 'processVariation', label: '16. O processo varia?', type: 'select', options: ['Sim', 'Não'] },
        { name: 'resultVariation', label: '17. O resultado varia?', type: 'select', options: ['Sim', 'Não'] }
      ]
    },
    {
      title: "SEÇÃO 7 — IMPACTO",
      icon: Zap,
      fields: [
        { name: 'frequency', label: '19. Frequência do problema', type: 'select', options: ['Raramente', 'Às vezes', 'Frequentemente', 'Sempre'] },
        { name: 'mainImpact', label: '20. Impacto principal', type: 'select', options: ['Tempo', 'Custo', 'Qualidade', 'Cliente', 'Estresse dos funcionários'] }
      ]
    },
    {
      title: "SEÇÃO 8 — SISTEMAS",
      icon: Search,
      fields: [
        { name: 'systemsUsed', label: '21. Sistemas usados', type: 'text', placeholder: 'ERP, Excel, Software específico...' },
        { name: 'systemsIntegrated', label: '22. Sistemas integrados?', type: 'select', options: ['Sim', 'Não', 'Parcialmente'] },
        { name: 'parallelControls', label: '23. Usa controles paralelos?', type: 'select', options: ['Sim', 'Não'] },
        { name: 'parallelControlsWhich', label: 'Se sim, quais?', type: 'text', placeholder: 'Planilhas, anotações...', condition: (data: any) => data.parallelControls === 'Sim' }
      ]
    },
    {
      title: "SEÇÃO 9 — PESSOAS",
      icon: Users,
      fields: [
        { name: 'communicationFailures', label: '24. Falhas de comunicação?', type: 'select', options: ['Sim', 'Não'] },
        { name: 'clearRoles', label: '25. Papéis e responsabilidades claros?', type: 'select', options: ['Sim', 'Não'] }
      ]
    },
    {
      title: "SEÇÃO 10 — MELHORIA",
      icon: Lightbulb,
      fields: [
        { name: 'oneThingToImprove', label: '26. Se pudesse melhorar uma coisa, o que seria?', type: 'text', placeholder: 'Sua maior prioridade de melhoria...' },
        { name: 'whatWouldFacilitate', label: '27. O que facilitaria seu trabalho?', type: 'text', placeholder: 'Ferramenta, mudança de processo...' }
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Lightbulb size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ideia de Projeto de Melhoria</h1>
            <p className="text-sm text-gray-500">Identificação inteligente de oportunidades Lean Six Sigma</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section, idx) => (
            <section key={idx} className="space-y-4 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-blue-600 font-bold border-b border-gray-50 pb-2">
                <section.icon size={20} />
                <h3 className="text-sm uppercase tracking-wider">{section.title}</h3>
              </div>
              <div className="space-y-4">
                {section.fields.map((field) => {
                  if (field.condition && !field.condition(formData)) return null;
                  
                  return (
                    <div key={field.name}>
                      <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">{field.label}</label>
                      {field.type === 'select' ? (
                        <select
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                        >
                          <option value="">Selecione...</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text"
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          placeholder={field.placeholder}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <CheckCircle2 size={18} className="text-green-500" />
            Salvar Dados
          </button>
        </div>

        {/* AI Prompt Card - Positioned below the checklist for this tool */}
        <div className="mt-8">
          <AIPromptCard 
            toolId="improvementIdea"
            toolName="Ideia de Projeto de Melhoria"
            previousToolName=""
            onAction={generateProjects}
            isGenerating={loading}
            hasPreviousData={false}
          />
        </div>

        {/* Results Section */}
        {generatedProjects.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-8 border-t border-gray-100"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Projetos de Melhoria Identificados</h2>
              <p className="text-gray-500">Abaixo estão as oportunidades sugeridas com base no seu contexto.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedProjects.map((project, idx) => (
                <div
                  key={idx}
                  className="group flex flex-col p-6 bg-white border border-gray-100 rounded-2xl text-left hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                      project.type.toLowerCase().includes('six sigma') ? "bg-purple-100 text-purple-700" : 
                      project.type.toLowerCase().includes('lean') ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {project.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <h3 className="font-bold text-gray-900 leading-tight pr-12">{project.title}</h3>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Problema</span>
                      <p className="text-xs text-gray-600 line-clamp-2">{project.problem}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Impacto</span>
                      <p className="text-xs text-gray-600 line-clamp-2">{project.impact}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Dificuldade:</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase",
                        project.difficulty === 'Baixo' ? "text-green-600" : 
                        project.difficulty === 'Médio' ? "text-orange-600" : "text-red-600"
                      )}>{project.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
