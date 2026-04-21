import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ShieldCheck, 
  FileText, 
  Table, 
  ClipboardCheck, 
  BrainCircuit,
  MessageSquare,
  Download,
  ChevronRight,
  ChevronLeft,
  Save,
  UserCheck,
  Users,
  Calendar,
  History,
  ArrowLeft,
  RefreshCw,
  Play,
  GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";

interface ModelingStep {
  id: string;
  type: 'task' | 'decision' | 'start' | 'end';
  text: string;
  responsible: string;
  description?: string;
  system?: string;
  activityType?: 'manual' | 'automated';
  estimatedTime?: string;
  nextId?: string;
  yesNextId?: string;
  noNextId?: string;
}

interface ModelingData {
  lanes: string[];
  steps: ModelingStep[];
}

interface ValidationResult {
  status: 'Approved' | 'Approved with Recommendations' | 'Not Approved';
  score: number;
  feedback: {
    correct: string[];
    adjustments: string[];
    suggestions: string[];
    unclearSteps: string[];
    roleConflicts: string[];
  };
}

interface RACIEntry {
  step: string;
  responsible: string; // R
  accountable: string;  // A
  consulted: string[];  // C
  informed: string[];   // I
}

interface SOPData {
  processName: string;
  objective: string;
  owner: string;
  steps: {
    title: string;
    description: string;
    responsible: string;
    inputs?: string;
    outputs?: string;
  }[];
  decisions: {
    question: string;
    yesPath: string;
    noPath: string;
  }[];
}

interface ApprovalData {
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy: string;
  date: string;
  version: string;
  comments: string;
}

interface ProcessValidationProps {
  data?: any;
  onSave: (data: any) => void;
  modelingData?: ModelingData;
  projectCharter?: any;
}

export default function ProcessValidation({ data, onSave, modelingData, projectCharter }: ProcessValidationProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'raci' | 'sop' | 'approval'>('ai');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(data?.validationResult || null);
  const [raciMatrix, setRaciMatrix] = useState<RACIEntry[]>(data?.raciMatrix || []);
  const [sop, setSop] = useState<SOPData | null>(data?.sop || null);
  const [approval, setApproval] = useState<ApprovalData>(data?.approval || {
    status: 'Pending',
    approvedBy: '',
    date: '',
    version: '1.0',
    comments: ''
  });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const runAIValidation = async () => {
    if (!modelingData || modelingData.steps.length === 0) return;
    
    setIsValidating(true);
    try {
      const prompt = `
        Analyze the following process model for best practices in process modeling.
        
        Process Steps:
        ${JSON.stringify(modelingData.steps, null, 2)}
        
        Roles/Lanes:
        ${JSON.stringify(modelingData.lanes, null, 2)}
        
        Evaluate:
        1. Logical sequence of steps.
        2. Presence of clear start and end.
        3. Consistency of decision points (Yes/No paths).
        4. Clarity of responsibilities.
        5. Duplication of steps.
        6. Missing steps.
        7. Unnecessary complexity.
        
        Return a JSON object with the following structure:
        {
          "status": "Approved" | "Approved with Recommendations" | "Not Approved",
          "score": number (0-100),
          "feedback": {
            "correct": ["string"],
            "adjustments": ["string"],
            "suggestions": ["string"],
            "unclearSteps": ["string"],
            "roleConflicts": ["string"]
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ["Approved", "Approved with Recommendations", "Not Approved"] },
              score: { type: Type.NUMBER },
              feedback: {
                type: Type.OBJECT,
                properties: {
                  correct: { type: Type.ARRAY, items: { type: Type.STRING } },
                  adjustments: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  unclearSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  roleConflicts: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["correct", "adjustments", "suggestions", "unclearSteps", "roleConflicts"]
              }
            },
            required: ["status", "score", "feedback"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setValidationResult(result);
      
      // Auto-generate RACI and SOP if at least "Approved with Recommendations"
      if (result.status !== 'Not Approved') {
        generateRACI();
        generateSOP();
      }
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const generateRACI = () => {
    if (!modelingData) return;
    
    const owner = projectCharter?.projectOwner || "Dono do Processo";
    const entries: RACIEntry[] = modelingData.steps
      .filter(s => s.type === 'task' || s.type === 'decision')
      .map(s => ({
        step: s.text,
        responsible: s.responsible,
        accountable: owner,
        consulted: modelingData.lanes.filter(l => l !== s.responsible && l !== owner).slice(0, 1),
        informed: modelingData.lanes.filter(l => l !== s.responsible && l !== owner).slice(1, 2)
      }));
    
    setRaciMatrix(entries);
  };

  const generateSOP = () => {
    if (!modelingData) return;

    const owner = projectCharter?.projectOwner || "Dono do Processo";
    const sopData: SOPData = {
      processName: projectCharter?.projectName || "Processo Sem Nome",
      objective: projectCharter?.problemStatement || "Definir o objetivo do processo.",
      owner: owner,
      steps: modelingData.steps
        .filter(s => s.type === 'task')
        .map(s => ({
          title: s.text,
          description: s.description || "Descrição da atividade.",
          responsible: s.responsible,
          inputs: "Dados de entrada",
          outputs: "Resultado da atividade"
        })),
      decisions: modelingData.steps
        .filter(s => s.type === 'decision')
        .map(s => ({
          question: s.text,
          yesPath: modelingData.steps.find(next => next.id === s.yesNextId)?.text || "Próxima etapa",
          noPath: modelingData.steps.find(next => next.id === s.noNextId)?.text || "Próxima etapa"
        }))
    };

    setSop(sopData);
  };

  const handleSave = () => {
    onSave({
      validationResult,
      raciMatrix,
      sop,
      approval
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Approved with Recommendations': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Not Approved': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="w-5 h-5" />;
      case 'Approved with Recommendations': return <AlertCircle className="w-5 h-5" />;
      case 'Not Approved': return <XCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Validação de Processo
          </h2>
          <p className="text-slate-500">Valide a estrutura, gere documentação e aprove o modelo final.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold shadow-sm"
        >
          <Save className="w-4 h-4" />
          Salvar Validação
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'ai', label: 'Validação IA', icon: BrainCircuit },
          { id: 'raci', label: 'Matriz RACI', icon: Table },
          { id: 'sop', label: 'Documentação (POP)', icon: FileText },
          { id: 'approval', label: 'Aprovação Final', icon: ClipboardCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 space-y-8"
            >
              {!validationResult ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                    <BrainCircuit className="w-10 h-10 text-indigo-600" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Iniciar Validação Inteligente</h3>
                    <p className="text-slate-500">A IA analisará seu modelo de processo em busca de falhas lógicas, duplicidades e inconsistências de responsabilidade.</p>
                  </div>
                  <button
                    onClick={runAIValidation}
                    disabled={isValidating || !modelingData?.steps?.length}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg disabled:opacity-50"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analisando Processo...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Executar Validação
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className={`p-6 rounded-2xl border-2 ${getStatusColor(validationResult.status)}`}>
                      <div className="flex items-center gap-3 mb-4">
                        {getStatusIcon(validationResult.status)}
                        <h4 className="font-bold uppercase tracking-wider text-sm">Status da Validação</h4>
                      </div>
                      <p className="text-2xl font-black mb-2">{validationResult.status}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-current transition-all duration-1000" 
                            style={{ width: `${validationResult.score}%` }} 
                          />
                        </div>
                        <span className="text-sm font-bold">{validationResult.score}/100</span>
                      </div>
                    </div>

                    <button
                      onClick={runAIValidation}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-bold"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refazer Validação
                    </button>
                    
                    {validationResult.status === 'Not Approved' && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
                        <p className="font-bold flex items-center gap-2 mb-1">
                          <ArrowLeft className="w-4 h-4" />
                          Ação Necessária
                        </p>
                        O modelo possui falhas críticas. Volte à etapa de Modelagem para corrigir os pontos indicados no feedback.
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h5 className="font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Pontos Positivos
                        </h5>
                        <ul className="space-y-2">
                          {validationResult.feedback.correct.map((item, i) => (
                            <li key={i} className="text-sm text-slate-600 flex gap-2">
                              <span className="text-emerald-500 font-bold">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h5 className="font-bold text-slate-900 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          Ajustes Necessários
                        </h5>
                        <ul className="space-y-2">
                          {validationResult.feedback.adjustments.map((item, i) => (
                            <li key={i} className="text-sm text-slate-600 flex gap-2">
                              <span className="text-amber-500 font-bold">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <h5 className="font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Sugestões de Melhoria Estrutural
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Estrutura</p>
                          <ul className="space-y-1">
                            {validationResult.feedback.suggestions.map((item, i) => (
                              <li key={i} className="text-xs text-slate-600">• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Conflitos/Dúvidas</p>
                          <ul className="space-y-1">
                            {validationResult.feedback.roleConflicts.map((item, i) => (
                              <li key={i} className="text-xs text-rose-600">• {item}</li>
                            ))}
                            {validationResult.feedback.unclearSteps.map((item, i) => (
                              <li key={i} className="text-xs text-slate-600">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'raci' && (
            <motion.div
              key="raci"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Matriz RACI Automática</h3>
                  <p className="text-slate-500 text-sm">Responsabilidades definidas com base no modelo de processo.</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded flex items-center justify-center font-bold text-blue-700">R</span> Responsável</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 border border-purple-200 rounded flex items-center justify-center font-bold text-purple-700">A</span> Aprovador</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded flex items-center justify-center font-bold text-amber-700">C</span> Consultado</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center font-bold text-emerald-700">I</span> Informado</div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Atividade / Etapa</th>
                      {modelingData?.lanes.map(lane => (
                        <th key={lane} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{lane}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {raciMatrix.map((entry, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                        <td className="p-4 text-sm font-medium text-slate-700">{entry.step}</td>
                        {modelingData?.lanes.map(lane => {
                          const isR = entry.responsible === lane;
                          const isA = entry.accountable === lane;
                          const isC = entry.consulted.includes(lane);
                          const isI = entry.informed.includes(lane);
                          
                          return (
                            <td key={lane} className="p-4 text-center">
                              <div className="flex justify-center gap-1">
                                {isR && <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded flex items-center justify-center font-bold text-xs" title="Responsável">R</span>}
                                {isA && <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded flex items-center justify-center font-bold text-xs" title="Aprovador">A</span>}
                                {isC && <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded flex items-center justify-center font-bold text-xs" title="Consultado">C</span>}
                                {isI && <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded flex items-center justify-center font-bold text-xs" title="Informado">I</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'sop' && (
            <motion.div
              key="sop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900">{sop?.processName}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Dono: {sop?.owner}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Versão: {approval.version}</span>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-bold text-sm">
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <section className="space-y-3">
                    <h4 className="text-lg font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">1. Objetivo do Processo</h4>
                    <p className="text-slate-600 leading-relaxed">{sop?.objective}</p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">2. Descrição das Atividades</h4>
                    <div className="space-y-4">
                      {sop?.steps.map((step, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Passo {i + 1}</span>
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {step.responsible}
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-800">{step.title}</h5>
                          <p className="text-sm text-slate-600">{step.description}</p>
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 mt-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Entradas</p>
                              <p className="text-xs text-slate-600">{step.inputs}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Saídas</p>
                              <p className="text-xs text-slate-600">{step.outputs}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="md:col-span-1 space-y-6">
                  <section className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                    <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      Pontos de Decisão
                    </h4>
                    <div className="space-y-4">
                      {sop?.decisions.map((dec, i) => (
                        <div key={i} className="space-y-2">
                          <p className="text-sm font-bold text-indigo-800">{dec.question}?</p>
                          <div className="flex flex-col gap-1 pl-4 border-l-2 border-indigo-200">
                            <p className="text-xs text-indigo-600"><span className="font-bold">Sim:</span> {dec.yesPath}</p>
                            <p className="text-xs text-indigo-600"><span className="font-bold">Não:</span> {dec.noPath}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'approval' && (
            <motion.div
              key="approval"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 flex items-center justify-center min-h-[500px]"
            >
              <div className="max-w-xl w-full bg-slate-50 rounded-3xl border border-slate-200 p-8 space-y-8 shadow-sm">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                    <ClipboardCheck className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Aprovação Formal do Processo</h3>
                  <p className="text-slate-500">Ao aprovar, este modelo torna-se a versão oficial de trabalho.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Aprovado Por</label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Nome do Gestor"
                        value={approval.approvedBy}
                        onChange={(e) => setApproval(prev => ({ ...prev, approvedBy: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Versão</label>
                    <div className="relative">
                      <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={approval.version}
                        onChange={(e) => setApproval(prev => ({ ...prev, version: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Comentários Adicionais</label>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Observações sobre a aprovação ou ressalvas..."
                    value={approval.comments}
                    onChange={(e) => setApproval(prev => ({ ...prev, comments: e.target.value }))}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setApproval(prev => ({ ...prev, status: 'Rejected', date: new Date().toISOString() }))}
                    className={`
                      flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                      ${approval.status === 'Rejected' 
                        ? 'bg-rose-600 text-white shadow-lg scale-105' 
                        : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'}
                    `}
                  >
                    <XCircle className="w-5 h-5" />
                    Reprovar
                  </button>
                  <button
                    onClick={() => setApproval(prev => ({ ...prev, status: 'Approved', date: new Date().toISOString() }))}
                    className={`
                      flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                      ${approval.status === 'Approved' 
                        ? 'bg-emerald-600 text-white shadow-lg scale-105' 
                        : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'}
                    `}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Aprovar Processo
                  </button>
                </div>

                {approval.status !== 'Pending' && (
                  <div className={`text-center p-3 rounded-xl font-bold text-sm ${approval.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    Status Atual: {approval.status === 'Approved' ? 'APROVADO' : 'REPROVADO'} em {new Date(approval.date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

