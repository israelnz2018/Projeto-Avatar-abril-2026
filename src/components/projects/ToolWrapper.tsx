import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Edit2, Save, FileDown, Presentation, CheckCircle2, X, Printer, Wand2, HelpCircle, Trash2, FileSpreadsheet, ListTodo, TrendingUp, AlertTriangle, Calendar, Settings } from 'lucide-react';
import { generateAIToolReport, generateToolData } from '@/src/services/aiService';
import { generateFullWordReport, generateFullPPTReport, generateProjectCharterExcel } from '@/src/services/reportService';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image';

interface ToolWrapperProps {
  toolId: string;
  toolName: string;
  projectName: string;
  initialData: any;
  onSave: (data: any) => void;
  children: (props: { 
    onSave: (data: any) => void; 
    initialData: any;
    onGenerateAI?: (customContext?: any) => Promise<void>;
    isGeneratingAI?: boolean;
  }) => React.ReactNode;
  project: any;
  availableTools: any[];
  phases: any[];
  initiativeName?: string;
  initiativeConfigs: any[];
  previousToolData?: any;
  previousToolName?: string | null;
  allProjectData?: any;
  showAIPrompt?: boolean;
  currentPhaseId?: string;
}

const FishboneDiagram = ({ 
  content, 
  problem: externalProblem,
  causes: externalCauses,
  categories: externalCategories
}: { 
  content: string, 
  problem?: string,
  causes?: Record<string, string[]>,
  categories?: string[]
}) => {
  const defaultCategories = [
    { id: 'Mão de Obra', name: 'Mão de Obra' },
    { id: 'Método', name: 'Método' },
    { id: 'Máquina', name: 'Máquina' },
    { id: 'Material', name: 'Material' },
    { id: 'Medida', name: 'Medida' },
    { id: 'Meio Ambiente', name: 'Meio Ambiente' }
  ];

  const categories = externalCategories 
    ? externalCategories.map(name => ({ id: name, name }))
    : defaultCategories;

  const data: Record<string, string[]> = {};
  
  if (externalCauses) {
    categories.forEach(cat => {
      data[cat.id] = externalCauses[cat.id] || [];
    });
  } else {
    categories.forEach(cat => {
      const possibleNames = [cat.name, cat.id, cat.name.split(' (')[0]];
      let match = null;
      for (const name of possibleNames) {
        const regex = new RegExp(`(?:##|###)\\s*${name}[\\s\\S]*?(?=(?:##|###)|$)`, 'i');
        match = content.match(regex);
        if (match) break;
      }
      if (match) {
        const lines = match[0].split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
        data[cat.id] = lines.map(l => l.replace(/^[-*]\s*/, '').trim());
      } else {
        data[cat.id] = [];
      }
    });
  }

  const effectMatch = content.match(/#\s*(.*)/);
  const effect = externalProblem || (effectMatch ? effectMatch[1] : 'Efeito / Problema');

  const wrapText = (text: string, maxChars: number) => {
    const words = String(text).split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (test.length <= maxChars) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const renderMultilineText = (text: string, x: number, y: number, maxChars: number, fontSize: number, lineHeight: number) => {
    const lines = wrapText(text, maxChars);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    return lines.map((line, i) => (
      <tspan key={i} x={x} y={startY + i * lineHeight}>{line}</tspan>
    ));
  };

  // Dynamic anchors based on number of categories
  const spineY = 390;
  const topY = 80;
  const bottomY = 700;
  const spineStartX = 100;
  const spineEndX = 1140;
  
  const half = Math.ceil(categories.length / 2);
  const topCats = categories.slice(0, half);
  const bottomCats = categories.slice(half);

  const getAnchors = (count: number, isTop: boolean) => {
    const availableWidth = spineEndX - spineStartX - 100;
    const spacing = availableWidth / (count + 1);
    return Array.from({ length: count }).map((_, i) => {
      const x = spineStartX + spacing * (i + 1);
      return {
        spineX: x + 50,
        catX: x - 50,
        catY: isTop ? topY : bottomY,
        causeX: x - 300 // Offset for cause boxes
      };
    });
  };

  const topAnchors = getAnchors(topCats.length, true);
  const bottomAnchors = getAnchors(bottomCats.length, false);

  const effectX = 1260;
  const effectY = spineY;
  const effectW = 240;
  const effectH = 100;

  return (
    <div className="w-full py-6 bg-white flex justify-center overflow-hidden">
      <div className="w-full max-w-[1000px] aspect-[1400/780] relative">
        <svg viewBox="0 0 1400 780" className="w-full h-full font-sans select-none overflow-visible">
          <defs>
            <filter id="boxShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.1" />
            </filter>
            <marker id="arrowBranch" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#234a7d" />
            </marker>
            <marker id="arrowCause" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#234a7d" />
            </marker>
          </defs>

          {/* Main Spine */}
          <line x1={spineStartX} y1={spineY} x2={spineEndX} y2={spineY} stroke="#234a7d" strokeWidth="8" strokeLinecap="round" />
          
          {/* Spine Arrows at intersections */}
          {topAnchors.map(anchor => (
            <path key={anchor.spineX} d={`M${anchor.spineX-18},${spineY-12} L${anchor.spineX+2},${spineY} L${anchor.spineX-18},${spineY+12}`} fill="none" stroke="#234a7d" strokeWidth="4" strokeLinecap="round" />
          ))}
          <path d={`M${spineEndX-18},${spineY-12} L${spineEndX+2},${spineY} L${spineEndX-18},${spineY+12}`} fill="none" stroke="#234a7d" strokeWidth="4" strokeLinecap="round" />

          {/* Effect Box */}
          <g filter="url(#boxShadow)">
            <rect x={effectX - effectW / 2} y={effectY - effectH / 2} width={effectW} height={effectH} rx="12" fill="#0f172a" />
            <text x={effectX} y={effectY} textAnchor="middle" fill="white" className="text-[18px] font-bold">
              {renderMultilineText(effect, effectX, effectY, 22, 18, 22)}
            </text>
          </g>

          {/* Top Categories */}
          {topCats.map((cat, i) => {
            const anchor = topAnchors[i];
            const causes = data[cat.id] || [];
            const catW = 160;
            const catH = 48;
            const causeW = 210;
            const causeH = 34;
            const causeGap = 12;
            
            // Diagonal line slope
            const slope = (anchor.catY + 20 - spineY) / (anchor.catX + 20 - anchor.spineX);

            return (
              <g key={cat.id}>
                {/* Diagonal Branch */}
                <line x1={anchor.spineX} y1={spineY} x2={anchor.catX + 20} y2={anchor.catY + 20} stroke="#234a7d" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrowBranch)" />
                
                {/* Category Box */}
                <rect x={anchor.catX - catW / 2} y={anchor.catY - catH / 2} width={catW} height={catH} rx="8" fill="#234a7d" filter="url(#boxShadow)" />
                <text x={anchor.catX} y={anchor.catY + 1} textAnchor="middle" fill="white" className="text-[14px] font-bold uppercase tracking-wider">
                  {cat.name}
                </text>

                {/* Top Causes */}
                {causes.slice(0, 5).map((cause, idx) => {
                  // Distribute causes along the diagonal line, closer to the spine
                  const boxCenterY = spineY - 60 - idx * (causeH + causeGap);
                  if (boxCenterY < anchor.catY + 40) return null;

                  // Calculate X on the diagonal line for this Y
                  const lineX = anchor.spineX + (boxCenterY - spineY) / slope;
                  
                  // Position box closer to the line, slightly above it
                  const boxX = lineX - causeW - 5;
                  const adjustedBoxCenterY = boxCenterY - 5; 

                  return (
                    <g key={idx}>
                      <line x1={boxX + causeW} y1={adjustedBoxCenterY} x2={lineX - 2} y2={boxCenterY} stroke="#8aa3c2" strokeWidth="1.5" markerEnd="url(#arrowCause)" />
                      <rect x={boxX} y={adjustedBoxCenterY - causeH / 2} width={causeW} height={causeH} rx="4" fill="white" stroke="#234a7d" strokeWidth="1.5" filter="url(#boxShadow)" />
                      <text x={boxX + causeW / 2} y={adjustedBoxCenterY} textAnchor="middle" fill="#1e293b" className="text-[10px] font-bold">
                        {renderMultilineText(cause, boxX + causeW / 2, adjustedBoxCenterY, 32, 10, 11)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Bottom Categories */}
          {bottomCats.map((cat, i) => {
            const anchor = bottomAnchors[i];
            const causes = data[cat.id] || [];
            const catW = 160;
            const catH = 48;
            const causeW = 210;
            const causeH = 34;
            const causeGap = 12;
            
            // Diagonal line slope
            const slope = (anchor.catY - 20 - spineY) / (anchor.catX + 20 - anchor.spineX);

            return (
              <g key={cat.id}>
                {/* Diagonal Branch */}
                <line x1={anchor.spineX} y1={spineY} x2={anchor.catX + 20} y2={anchor.catY - 20} stroke="#234a7d" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arrowBranch)" />
                
                {/* Category Box */}
                <rect x={anchor.catX - catW / 2} y={anchor.catY - catH / 2} width={catW} height={catH} rx="8" fill="#234a7d" filter="url(#boxShadow)" />
                <text x={anchor.catX} y={anchor.catY + 1} textAnchor="middle" fill="white" className="text-[14px] font-bold uppercase tracking-wider">
                  {cat.name}
                </text>

                {/* Bottom Causes */}
                {causes.slice(0, 5).map((cause, idx) => {
                  // Distribute causes along the diagonal line, closer to the spine
                  const boxCenterY = spineY + 60 + idx * (causeH + causeGap);
                  if (boxCenterY > anchor.catY - 40) return null;

                  // Calculate X on the diagonal line for this Y
                  const lineX = anchor.spineX + (boxCenterY - spineY) / slope;
                  
                  // Position box closer to the line, slightly below it
                  const boxX = lineX - causeW - 5;
                  const adjustedBoxCenterY = boxCenterY + 5;

                  return (
                    <g key={idx}>
                      <line x1={boxX + causeW} y1={adjustedBoxCenterY} x2={lineX - 2} y2={boxCenterY} stroke="#8aa3c2" strokeWidth="1.5" markerEnd="url(#arrowCause)" />
                      <rect x={boxX} y={adjustedBoxCenterY - causeH / 2} width={causeW} height={causeH} rx="4" fill="white" stroke="#234a7d" strokeWidth="1.5" filter="url(#boxShadow)" />
                      <text x={boxX + causeW / 2} y={adjustedBoxCenterY} textAnchor="middle" fill="#1e293b" className="text-[10px] font-bold">
                        {renderMultilineText(cause, boxX + causeW / 2, adjustedBoxCenterY, 32, 10, 11)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const AIPromptCard = ({ 
  toolId,
  toolName, 
  previousToolName, 
  onAction, 
  isGenerating,
  hasPreviousData,
  previousToolData,
  allProjectData
}: { 
  toolId: string;
  toolName: string; 
  previousToolName: string; 
  onAction: (customContext?: any) => void; 
  isGenerating: boolean;
  hasPreviousData: boolean;
  previousToolData?: any;
  allProjectData?: any;
}) => {
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<string>("");
  const [projectStartDate, setProjectStartDate] = useState<string>("");

  const projects = toolId === 'brief' && (previousToolData?.generatedProjects || previousToolData?.toolData?.generatedProjects)
    ? (previousToolData?.generatedProjects || previousToolData?.toolData?.generatedProjects)
    : [];

  const handleAction = () => {
    if (toolId === 'brief') {
      if (selectedProjectIndex === "") {
        toast.error("Por favor, selecione um título de projeto no dropdown antes de gerar.");
        return;
      }
      const selectedProject = projects[parseInt(selectedProjectIndex)];
      onAction(selectedProject);
    } else if (toolId === 'timeline') {
      if (projectStartDate === "") {
        toast.error("Por favor, selecione a data de início do projeto.");
        return;
      }
      onAction({ projectStartDate });
    } else if (toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI') {
      const charterData = allProjectData?.charter || allProjectData?.projectCharterPMI;
      if (!charterData) {
        toast.error("Para usar esta função, você precisa primeiro preencher e salvar o Project Charter (DMAIC ou PMI).");
        return;
      }
      onAction({ useCharterData: true });
    } else if (toolId === 'improvementPlan') {
      onAction();
    } else {
      onAction();
    }
  };

  return (
    <div className="bg-[#f0f7ff] p-8 rounded-2xl border border-blue-100 mb-10 shadow-sm relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-100/50 rounded-full blur-3xl group-hover:bg-blue-200/50 transition-colors"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3 text-blue-700 font-black uppercase tracking-[0.2em] text-xs">
            <Wand2 size={20} className="text-blue-500" />
            <span>Gerar {toolName} com IA</span>
          </div>
          <p className="text-[14px] text-blue-800 font-medium leading-relaxed max-w-2xl">
            {toolId === 'timeline' ? (
              <>O cronograma macro pode ser calculado automaticamente. Informe a data de início do projeto abaixo para gerar o planejamento sugerido das fases do DMAIC.</>
            ) : toolId === 'improvementPlan' ? (
              <>Deseja carregar um plano de atividades sugerido para seu projeto de melhoria? A IA utilizará as datas do seu Cronograma Macro para estruturar as atividades.</>
            ) : (toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI') ? (
              <>A IA pode buscar automaticamente os nomes e funções dos stakeholders definidos no seu <strong className="text-blue-900">Project Charter</strong> para iniciar sua análise de engajamento.</>
            ) : toolId === 'effortImpact' ? (
              <>A IA buscará as ideias listadas no seu <strong className="text-blue-900">Brainstorming</strong> para preencher a matriz de priorização automaticamente.</>
            ) : previousToolName ? (
              <>A IA analisará os dados da ferramenta <strong className="text-blue-900">"{previousToolName}"</strong> para gerar {toolName.toLowerCase()} técnicos e específicos para este projeto.</>
            ) : (
              <>A IA analisará o contexto do seu projeto para sugerir um preenchimento inicial de {toolName.toLowerCase()} técnico e estruturado.</>
            )}
          </p>

          {toolId === 'timeline' && (
            <div className="mt-4 space-y-2">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                Data de Início do Projeto:
              </label>
              <input 
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
                className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          )}

          {toolId === 'brief' && projects.length > 0 && (
            <div className="mt-4 space-y-2">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                Selecione o Título do Projeto Gerado:
              </label>
              <select
                value={selectedProjectIndex}
                onChange={(e) => setSelectedProjectIndex(e.target.value)}
                className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">-- Escolha um projeto da lista --</option>
                {projects.map((p: any, idx: number) => (
                  <option key={idx} value={idx}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          <p className="text-[11px] text-blue-400 font-bold italic flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
            {previousToolName ? (
              <>* A IA utiliza os fatos e dados coletados na fase anterior para garantir um {toolName.toLowerCase()} rigoroso e técnico.</>
            ) : (
              <>* A IA utiliza as melhores práticas de consultoria para propor um {toolName.toLowerCase()} alinhado aos seus objetivos.</>
            )}
          </p>
        </div>

        <button
          onClick={handleAction}
          disabled={isGenerating || ((toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI') && !allProjectData?.charter && !allProjectData?.projectCharterPMI)}
          className={cn(
            "w-full md:w-auto min-w-[240px] h-16 flex items-center justify-center gap-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl border-none cursor-pointer active:scale-95",
            isGenerating || ((toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI') && !allProjectData?.charter && !allProjectData?.projectCharterPMI)
              ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>{toolId === 'timeline' ? 'Calculando...' : toolId === 'improvementPlan' ? 'Carregando...' : 'Analisando Dados...'}</span>
            </>
          ) : (
            <>
              <Sparkles size={20} />
              <span>
                {toolId === 'timeline' ? 'Gerar Cronograma' : 
                 toolId === 'improvementPlan' ? 'Carregar Sugestões' : 
                 (toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI') ? 'Puxar do Charter' : 'Gerar com IA'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default function ToolWrapper({
  toolId,
  toolName,
  projectName,
  initialData,
  onSave,
  children,
  project,
  availableTools,
  phases,
  initiativeName,
  initiativeConfigs,
  previousToolData,
  previousToolName,
  allProjectData,
  showAIPrompt = true,
  currentPhaseId
}: ToolWrapperProps) {
  const [localData, setLocalData] = useState(initialData?.toolData || initialData);
  const [aiReport, setAiReport] = useState(initialData?.aiReport || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReport, setEditedReport] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearKey, setClearKey] = useState(0);
  const fishboneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalData(initialData?.toolData || initialData);
    setAiReport(initialData?.aiReport || '');
    setIsEditingReport(false);
    setEditedReport('');
    setError(null);
  }, [initialData]);

  const handleToolSave = (data: any) => {
    setLocalData(data);
    onSave({
      toolData: data,
      aiReport: toolId === 'charter' ? '' : aiReport
    });
  };

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    setLocalData(null);
    setAiReport('');
    setClearKey(prev => prev + 1);
    onSave(null);
    setShowClearConfirm(false);
    toast.success("Dados limpos com sucesso!");
  };

  const handleGenerateData = async (customContext?: any) => {
    if (toolId === 'timeline' && customContext?.projectStartDate) {
      setIsGeneratingData(true);
      try {
        // Manual calculation for timeline instead of AI
        const start = new Date(customContext.projectStartDate);
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const addDays = (date: Date, days: number) => {
          const result = new Date(date);
          result.setDate(result.getDate() + days);
          return result;
        };

        const defineStart = new Date(start);
        const defineEnd = addDays(defineStart, 15);
        const measureStart = addDays(defineEnd, 1);
        const measureEnd = addDays(measureStart, 30);
        const analyzeStart = addDays(measureEnd, 1);
        const analyzeEnd = addDays(analyzeStart, 45);
        const improveStart = addDays(analyzeEnd, 1);
        const improveEnd = addDays(improveStart, 60);
        const controlStart = addDays(improveEnd, 1);
        const controlEnd = addDays(controlStart, 30);

        const generatedData = {
          projectStartDate: customContext.projectStartDate,
          phases: [
            { id: 'define', name: 'Define', startDate: formatDate(defineStart), endDate: formatDate(defineEnd), color: 'bg-blue-500' },
            { id: 'measure', name: 'Measure', startDate: formatDate(measureStart), endDate: formatDate(measureEnd), color: 'bg-blue-500' },
            { id: 'analyze', name: 'Analyze', startDate: formatDate(analyzeStart), endDate: formatDate(analyzeEnd), color: 'bg-blue-500' },
            { id: 'improve', name: 'Improve', startDate: formatDate(improveStart), endDate: formatDate(improveEnd), color: 'bg-blue-500' },
            { id: 'control', name: 'Control', startDate: formatDate(controlStart), endDate: formatDate(controlEnd), color: 'bg-blue-500' },
          ]
        };

        setLocalData(generatedData);
        onSave({
          toolData: generatedData,
          aiReport: aiReport
        });
        toast.success("Cronograma macro gerado com sucesso!");
      } catch (error) {
        console.error("Erro ao calcular cronograma:", error);
        setError("Erro ao calcular o cronograma.");
      } finally {
        setIsGeneratingData(false);
      }
      return;
    }

    if (toolId === 'improvementPlan') {
      setIsGeneratingData(true);
      try {
        const SUGGESTED_ACTIVITIES: Record<string, string[]> = {
          define: [
            "Identificação do problema e impacto no negócio.",
            "Definição clara do escopo do projeto.",
            "Mapeamento dos stakeholders (partes interessadas).",
            "Desenvolvimento do Project Charter (termo de abertura).",
            "Criação do SIPOC (Supplier, Input, Process, Output, Customer).",
            "Alinhamento das metas e objetivos financeiros e operacionais.",
            "Definição da reunião inicial (kick off)",
            "Definir as ações de contenção (se necessário)",
            "Desenvolvimento do plano de comunicação",
            "Envio da primeira comunicação"
          ],
          measure: [
            "Mapeamento do processo atual com fluxogramas",
            "Identificação das variáveis críticas",
            "Priorização das variáveis críticas",
            "Coleta de dados relevantes para entender o problema.",
            "Avaliação da capacidade do processo (Cp/Cpk/DPMO, etc).",
            "Análise do sistema de medição (MSA).",
            "Elaboração de um plano de coleta de dados",
            "Organização dos documentos da fase medir",
            "Envio da segunda comunicação"
          ],
          analyze: [
            "Uso de ferramentas da qualidade",
            "Uso de ferramentas estatísticas",
            "Uso de ferramentas Lean",
            "Identificação das causas raízes",
            "Organização dos documentos da fase Analisar",
            "Envio da terceira comunicação"
          ],
          improve: [
            "Desenvolvimento de soluções",
            "Fazer plano de ação",
            "Desenvolver um plano de gestão de mudança - ADKAR",
            "A análise de risco das ações de melhoria - FMEA",
            "Desenvolver pilotos para as ações críticas para o negócio",
            "Implementação de ações corretivas",
            "Fazer reuniões de acompanhamento das ações",
            "Recalcular a capacidade do processo após melhorias.",
            "Organização dos documentos da fase Melhorar",
            "Enviar comunicações periódicas"
          ],
          control: [
            "Criação de um plano de controle para monitoramento contínuo.",
            "Desenvolvimento de gráficos de controle para as variáveis críticas.",
            "Desenvolvimento de pokayokes para as variáveis críticas",
            "Treinamento das equipes sobre os novos processos ou padrões.",
            "Criação ou atualização de procedimentos",
            "Documentação das lições aprendidas.",
            "Verificação de sustentabilidade das melhorias (auditorias periódicas).",
            "Encerramento oficial do projeto e compartilhamento dos resultados",
            "Lançamento do projeto no sistema (se existir)"
          ]
        };

        const macroTimeline = previousToolData?.toolData || previousToolData;
        const DEFAULT_STRUCTURE = [
          { id: 'define', name: 'Definir', activities: [], isOpen: true, weight: 20 },
          { id: 'measure', name: 'Medir', activities: [], isOpen: false, weight: 20 },
          { id: 'analyze', name: 'Analisar', activities: [], isOpen: false, weight: 20 },
          { id: 'improve', name: 'Melhorar', activities: [], isOpen: false, weight: 20 },
          { id: 'control', name: 'Controlar', activities: [], isOpen: false, weight: 20 },
        ];

        const generatedData = {
          phases: DEFAULT_STRUCTURE.map(phase => {
            const macroPhase = macroTimeline?.phases?.find((p: any) => p.id === phase.id);
            return {
              ...phase,
              activities: (SUGGESTED_ACTIVITIES[phase.id] || []).map(text => ({
                id: Math.random().toString(36).substr(2, 9),
                text,
                status: 'Not Started' as const,
                plannedStart: macroPhase?.startDate || '',
                plannedFinish: macroPhase?.endDate || '',
                weight: 5,
                owner: '',
                notes: ''
              }))
            };
          })
        };

        setLocalData(generatedData);
        onSave({
          toolData: generatedData,
          aiReport: aiReport
        });
        toast.success("Plano de projeto sugerido carregado!");
      } catch (error) {
        console.error("Erro ao carregar sugestões:", error);
        setError("Erro ao carregar as sugestões do plano.");
      } finally {
        setIsGeneratingData(false);
      }
      return;
    }

    if ((toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI') && customContext?.useCharterData) {
      setIsGeneratingData(true);
      try {
        // Check both DMAIC Charter and PMI Charter
        const dmaicCharterFull = allProjectData?.charter;
        const pmiCharterFull = allProjectData?.projectCharterPMI;
        
        const dmaicCharter = dmaicCharterFull?.toolData || dmaicCharterFull;
        const pmiCharter = pmiCharterFull?.toolData || pmiCharterFull;
        
        console.log("DMAIC Charter found:", dmaicCharter);
        console.log("PMI Charter found:", pmiCharter);

        let stakeholdersToMap = [];
        
        // Try to find stakeholders in DMAIC Charter
        if (dmaicCharter) {
          if (Array.isArray(dmaicCharter.stakeholders) && dmaicCharter.stakeholders.length > 0) {
            stakeholdersToMap = dmaicCharter.stakeholders;
          } else if (Array.isArray(dmaicCharter.team) && dmaicCharter.team.length > 0) {
            stakeholdersToMap = dmaicCharter.team;
          }
        }
        
        // If not found, try PMI Charter
        if (stakeholdersToMap.length === 0 && pmiCharter) {
          if (Array.isArray(pmiCharter.stakeholders) && pmiCharter.stakeholders.length > 0) {
            stakeholdersToMap = pmiCharter.stakeholders;
          }
        }

        if (stakeholdersToMap.length > 0) {
          const mappedStakeholders = stakeholdersToMap
            .filter((s: any) => s.name && s.name.trim() !== '')
            .map((s: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: s.name,
              area: s.area || '',
              role: s.role ? s.role.replace(':', '').trim() : 'Membro da Equipe',
              power: 'Médio',
              interest: 'Médio',
              currentEngagement: 'Neutro',
              notes: ''
            }));

          if (mappedStakeholders.length === 0) {
            toast.error("Nenhum nome de stakeholder encontrado nos Charters. Certifique-se de preencher a coluna 'Nome'.");
            return;
          }

          const generatedData = { stakeholders: mappedStakeholders };
          setLocalData(generatedData);
          onSave({
            toolData: generatedData,
            aiReport: aiReport
          });
          toast.success(`${mappedStakeholders.length} stakeholders importados do Project Charter!`);
        } else {
          toast.error("Nenhum Project Charter (DMAIC ou PMI) encontrado ou sem stakeholders definidos.");
        }
      } catch (error) {
        console.error("Erro ao importar stakeholders:", error);
        toast.error("Erro ao importar dados do Project Charter.");
      } finally {
        setIsGeneratingData(false);
      }
      return;
    }

    if (toolId === 'processMap' && customContext?.useSipocData) {
      setIsGeneratingData(true);
      try {
        const sipocData = allProjectData?.sipoc;
        const sipoc = sipocData?.toolData || sipocData;

        if (!sipoc || !sipoc.process || sipoc.process.length === 0) {
          toast.error("SIPOC sem etapas de processo definidas.");
          return;
        }

        // Deterministic generation from SIPOC steps
        const processSteps = sipoc.process;
        const laneHeight = 150;
        const nodeWidth = 120;
        const nodeHeight = 60;
        const spacing = 60;
        const startX = 150;
        const laneId = 'lane-1';

        const nodes = processSteps.map((step: string, index: number) => ({
          id: `node-${index}`,
          type: index === 0 ? 'start' : (index === processSteps.length - 1 ? 'start' : 'step'),
          text: step,
          laneId: laneId,
          x: startX + index * (nodeWidth + spacing),
          y: laneHeight / 2 - nodeHeight / 2,
          width: nodeWidth,
          height: nodeHeight,
          fontSize: 11
        }));

        const connections = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          connections.push({
            id: `conn-${i}`,
            from: nodes[i].id,
            to: nodes[i+1].id
          });
        }

        const generatedData = { 
          nodes, 
          connections,
          lanes: [{ id: laneId, name: 'Processo Principal', height: laneHeight }]
        };

        setLocalData(generatedData);
        onSave({
          toolData: generatedData,
          aiReport: aiReport
        });
        toast.success("Mapa gerado a partir do SIPOC com sucesso!");
      } catch (error) {
        console.error("Erro ao gerar mapa do SIPOC:", error);
        toast.error("Erro ao processar dados do SIPOC.");
      } finally {
        setIsGeneratingData(false);
      }
      return;
    }

    setIsGeneratingData(true);
    setError(null);
    try {
      let targetContext = customContext || previousToolData;
      
      // Special handling for brainstorming to pull exclusively from requested sources
      if (toolId === 'brainstorming' && allProjectData) {
        targetContext = {
          brief: allProjectData.brief,
          sipoc: allProjectData.sipoc,
          processMap: allProjectData.processMap
        };
      }

      if (toolId === 'effortImpact' && allProjectData) {
        // Find the correct brainstorming storage key for the current phase
        const brainstormDef = availableTools?.find((t: any) => t.id === 'brainstorming');
        const brainstormKey = brainstormDef && brainstormDef.defaultPhase === currentPhaseId
          ? 'brainstorming'
          : (currentPhaseId ? `${currentPhaseId}_brainstorming` : 'brainstorming');
        
        console.log(`EffortImpact: Pulling brainstorming data from key: ${brainstormKey}`);
        targetContext = allProjectData[brainstormKey] || allProjectData['brainstorming'];
      }

      if (toolId === 'measureMatrix' && allProjectData) {
        targetContext = {
          brief: allProjectData.brief,
          sipoc: allProjectData.sipoc,
          processMap: allProjectData.processMap,
          measureIshikawa: allProjectData.measureIshikawa
        };
      }

      if (toolId === 'dataCollection' && allProjectData) {
        // HARD FILTER: Only send items that are explicitly selected in the measureMatrix
        const filteredMatrix = {
          ...allProjectData.measureMatrix,
          causes: (allProjectData.measureMatrix?.causes || []).filter((item: any) => item.selected === true)
        };

        targetContext = {
          brief: allProjectData.brief,
          sipoc: allProjectData.sipoc,
          processMap: allProjectData.processMap,
          measureMatrix: filteredMatrix
        };
      }

      if (toolId === 'statisticalAnalysis' && allProjectData) {
        targetContext = {
          brief: allProjectData.brief,
          dataCollection: allProjectData.dataCollection
        };
      }

      if (toolId === 'dataNature' && allProjectData) {
        targetContext = {
          brief: allProjectData.brief,
          dataCollection: allProjectData.dataCollection
        };
      }

      if (toolId === 'fiveWhys' && allProjectData) {
        targetContext = {
          brief: allProjectData.brief,
          measureIshikawa: allProjectData.measureIshikawa
        };
      }

      if (toolId === 'qualitativeAnalysis' && allProjectData) {
        targetContext = {
          brief: allProjectData.brief,
          sipoc: allProjectData.sipoc,
          processMap: allProjectData.processMap,
          measureMatrix: allProjectData.measureMatrix
        };
      }

      const generatedData = await generateToolData(
        toolId, 
        toolName, 
        previousToolName || null, 
        targetContext,
        { name: projectName, description: project.description }
      );
      setLocalData(generatedData);
      onSave({
        toolData: generatedData,
        aiReport: aiReport
      });
    } catch (error: any) {
      console.error("Erro ao gerar dados com IA:", error);
      setError(error.message || "Ocorreu um erro ao gerar os dados com IA.");
    } finally {
      setIsGeneratingData(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!localData) return;
    setIsGenerating(true);
    setError(null);
    setAiReport(''); // Clear previous report to show update feedback
    try {
      const report = await generateAIToolReport(toolName, localData, projectName);
      setAiReport(report);
      setEditedReport(report);
      // Save both tool data and AI report
      onSave({
        toolData: localData,
        aiReport: report
      });
    } catch (error: any) {
      console.error("Erro ao gerar relatório IA:", error);
      setError(error.message || "Ocorreu um erro ao gerar o relatório com IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEditedReport = () => {
    setAiReport(editedReport);
    setIsEditingReport(false);
    onSave({
      toolData: localData,
      aiReport: editedReport
    });
  };

  const isToolEmpty = () => {
    if (!localData) return true;
    
    // Recursive function to check if data is effectively empty
    const isEmpty = (data: any): boolean => {
      if (data === null || data === undefined || data === '') return true;
      
      if (Array.isArray(data)) {
        if (data.length === 0) return true;
        // For arrays of objects (like ideas), check if they are all empty
        return data.every(item => isEmpty(item));
      }
      
      if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return true;
        
        // Special logic for specific tools to ignore metadata/config fields
        if (toolId === 'timeline') {
          return !data.projectStartDate;
        }

        if (toolId === 'improvementPlan') {
          return !data.phases || !Array.isArray(data.phases) || data.phases.every((p: any) => !p.activities || p.activities.length === 0);
        }

        if (toolId === 'brainstorming') {
          return !data.ideas || !Array.isArray(data.ideas) || data.ideas.length === 0;
        }

        if (toolId === 'dataNature') {
          return !data.analyses || !Array.isArray(data.analyses) || data.analyses.length === 0;
        }
        
        if (toolId === 'measureIshikawa') {
          const causes = data.causes || {};
          const hasCauses = Object.values(causes).some((c: any) => Array.isArray(c) && c.length > 0);
          return !hasCauses;
        }

        if (toolId === 'measureMatrix') {
          return !data.causes || !Array.isArray(data.causes) || data.causes.length === 0;
        }
        
        if (toolId === 'rab') {
          return !data.opportunities || !Array.isArray(data.opportunities) || data.opportunities.length === 0;
        }

        if (toolId === 'gut') {
          return !data.opportunities || !Array.isArray(data.opportunities) || data.opportunities.length === 0;
        }

        if (toolId === 'fiveWhys') {
          const chains = data.chains || [];
          if (chains.length === 0) return true;
          return chains.every((c: any) => 
            !c.problem && 
            (!c.whys || c.whys.every((w: any) => !w)) && 
            !c.rootCause
          );
        }

        if (toolId === 'fmea') {
          return !data.items || !Array.isArray(data.items) || data.items.length === 0;
        }

        if (toolId === 'directObservation') {
          const observations = data.observations || [];
          if (observations.length === 0) return true;
          return observations.every((o: any) => !o.variable && !o.observationDescription);
        }

        if (toolId === 'statisticalAnalysis') {
          const analyses = data.analyses || [];
          if (analyses.length === 0) return true;
          return analyses.every((a: any) => !a.variable && !a.analysisType && !a.graphImage && !a.interpretation);
        }

        if (toolId === 'fta' || toolId === 'faultTreeAnalysis') {
          const nodes = data.nodes || [];
          if (nodes.length <= 1) { // Only root node
            const root = nodes[0] || {};
            return !root.description || root.description.includes('Defina aqui o problema');
          }
          return false;
        }

        if (toolId === 'processMap') {
          return !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0;
        }

        if (toolId === 'dataCollection') {
          return !data.items || !Array.isArray(data.items) || data.items.length === 0 || data.items.every((item: any) => Object.values(item.data || {}).every(v => !v));
        }

        if (toolId === 'sipoc') {
          const hasSuppliers = Array.isArray(data.suppliers) && data.suppliers.length > 0;
          const hasInputs = Array.isArray(data.inputs) && data.inputs.length > 0;
          const hasProcess = Array.isArray(data.process) && data.process.length > 0;
          const hasOutputs = Array.isArray(data.outputs) && data.outputs.length > 0;
          const hasCustomers = Array.isArray(data.customers) && data.customers.length > 0;
          return !hasSuppliers && !hasInputs && !hasProcess && !hasOutputs && !hasCustomers;
        }

        // For other objects, check if all properties are empty
        return keys.every(key => isEmpty(data[key]));
      }
      
      return false;
    };

    return isEmpty(localData);
  };

  const exportWord = async () => {
    let toolImages: Record<string, string> = {};
    
    if ((toolId === 'measureIshikawa' || toolId === 'charter' || toolId === 'processMap') && (fishboneRef.current || document.getElementById('project-charter-print') || document.getElementById('process-mapper-canvas'))) {
      try {
        let element = null;
        if (toolId === 'measureIshikawa') element = fishboneRef.current;
        else if (toolId === 'charter') element = document.getElementById('project-charter-print');
        else if (toolId === 'processMap') element = document.getElementById('process-mapper-canvas');

        if (element) {
          const dataUrl = await toPng(element, { 
            backgroundColor: '#ffffff',
            quality: 1.0,
            pixelRatio: 2,
            filter: (node: any) => {
              if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                return node.href.startsWith(window.location.origin);
              }
              return true;
            }
          });
          toolImages[toolId] = dataUrl;
        }
      } catch (err) {
        console.error("Erro ao capturar ferramenta", err);
      }
    }

    // Create a temporary projectData object with only this tool's AI report if available
    const tempProjectData = {
      [toolId]: {
        toolData: localData,
        aiReport: aiReport
      }
    };
    await generateFullWordReport(project, tempProjectData, availableTools, phases, initiativeName, initiativeConfigs, toolImages);
  };

  const exportPPT = async () => {
    let toolImages: Record<string, string> = {};
    
    if ((toolId === 'measureIshikawa' || toolId === 'charter' || toolId === 'processMap') && (fishboneRef.current || document.getElementById('project-charter-print') || document.getElementById('process-mapper-canvas'))) {
      try {
        let element = null;
        if (toolId === 'measureIshikawa') element = fishboneRef.current;
        else if (toolId === 'charter') element = document.getElementById('project-charter-print');
        else if (toolId === 'processMap') element = document.getElementById('process-mapper-canvas');

        if (element) {
          const dataUrl = await toPng(element, { 
            backgroundColor: '#ffffff',
            quality: 1.0,
            pixelRatio: 2,
            filter: (node: any) => {
              if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                return node.href.startsWith(window.location.origin);
              }
              return true;
            }
          });
          toolImages[toolId] = dataUrl;
        }
      } catch (err) {
        console.error("Erro ao capturar ferramenta", err);
      }
    }

    const tempProjectData = {
      [toolId]: {
        toolData: localData,
        aiReport: aiReport
      }
    };
    await generateFullPPTReport(project, tempProjectData, availableTools, phases, initiativeName, initiativeConfigs, toolImages);
  };

  const exportExcel = async () => {
    if (toolId === 'charter') {
      await generateProjectCharterExcel(project, localData);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    const element = document.getElementById('report-content');
    if (!element) {
      window.print();
      return;
    }

    setIsPrinting(true);
    try {
      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        filter: (node) => {
          const exclusionClasses = ['no-print'];
          if (node instanceof HTMLElement) {
            return !exclusionClasses.some(cls => node.classList.contains(cls));
          }
          return true;
        }
      });
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Relatório - ${projectName}</title>
              <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; background: #f3f4f6; }
                img { width: 210mm; height: auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                @media print {
                  body { background: white; }
                  img { width: 100%; box-shadow: none; }
                  @page { size: A4; margin: 0; }
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="p-2 bg-red-100 rounded-xl text-red-600">
            <HelpCircle size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-red-800 mb-1 uppercase tracking-wider">Ops! Algo deu errado</h4>
            <p className="text-[11px] text-red-600 font-bold leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Tool Content */}
      <div className="relative">
        <div className="flex items-center justify-between absolute -top-3 left-0 right-0 z-10 px-3">
          <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
            Etapa 1: Preenchimento
          </div>
          
          {!isToolEmpty() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearData();
              }}
              className="bg-white text-red-500 hover:bg-red-50 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest border-2 border-red-100 transition-all flex items-center gap-1.5 cursor-pointer pointer-events-auto hover:scale-105 active:scale-95 z-[50]"
            >
              <Trash2 size={12} />
              Limpar Dados
            </button>
          )}
        </div>

        {/* AI Prompt Card - Only show if tool is empty and NOT improvementIdea (which has custom placement) */}
        {isToolEmpty() && toolId !== 'improvementIdea' && showAIPrompt && (
          <AIPromptCard 
            toolId={toolId}
            toolName={toolName}
            previousToolName={previousToolName || ''}
            onAction={(customContext) => handleGenerateData(customContext)}
            isGenerating={isGeneratingData}
            hasPreviousData={!!previousToolData}
            previousToolData={previousToolData}
            allProjectData={allProjectData}
          />
        )}

        <div className="p-8" key={`${toolId}-${clearKey}`}>
          {children({ 
            onSave: handleToolSave, 
            initialData: localData,
            onGenerateAI: handleGenerateData,
            isGeneratingAI: isGeneratingData
          })}
        </div>
      </div>

      <div className="flex justify-center py-6 gap-4">
        {toolId === 'brief' && localData && (
          <button
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className={cn(
              "px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl border-none cursor-pointer active:scale-95 bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100",
              isGenerating && "opacity-50 cursor-not-allowed"
            )}
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            {aiReport ? 'Atualizar Relatório IA' : 'Gerar Relatório com IA'}
          </button>
        )}

        {toolId === 'charter' && (
          <div className="flex items-center gap-4">
            <button
              onClick={exportWord}
              disabled={!localData}
              className={cn(
                "px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl border-none cursor-pointer active:scale-95",
                !localData ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
              )}
            >
              <FileDown size={20} />
              Gerar Word
            </button>
            <button
              onClick={exportPPT}
              disabled={!localData}
              className={cn(
                "px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl border-none cursor-pointer active:scale-95",
                !localData ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-100"
              )}
            >
              <Presentation size={20} />
              Gerar PowerPoint
            </button>
            <button
              onClick={exportExcel}
              disabled={!localData}
              className={cn(
                "px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl border-none cursor-pointer active:scale-95",
                !localData ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700 shadow-green-100"
              )}
            >
              <FileSpreadsheet size={20} />
              Gerar Excel
            </button>
          </div>
        )}
      </div>

      {/* Step 3: AI Report & Export - Restored for 'brief' as requested */}
      <AnimatePresence>
        {toolId === 'brief' && aiReport && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 flex flex-col items-center w-full"
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body { background: white !important; }
                .no-print { display: none !important; }
                .print-container { 
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                @page {
                  margin: 20mm;
                }
              }
            `}} />

            {/* Document Page Container */}
            <div id="report-content" className="w-full max-w-[850px] bg-white border border-gray-200 shadow-[0_30px_60px_rgba(0,0,0,0.12)] rounded-sm min-h-[1100px] flex flex-col relative overflow-hidden mb-12 print-container">
              {/* Page Header Decoration */}
              <div className="h-3 bg-[#1f2937] w-full no-print"></div>
              
              <div className="p-16 flex-1 flex flex-col">
                {/* Company Logo in Report */}
                <div className="flex justify-between items-start mb-12">
                  <img 
                    src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" 
                    alt="Logo LBW" 
                    className="h-14 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Relatório Técnico</p>
                    <p className="text-[12px] font-bold text-gray-800">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-10 border-b-2 border-gray-100 pb-6 no-print">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                      <FileDown className="text-gray-800" size={20} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Visualização do Documento</h3>
                      <p className="text-[9px] text-indigo-600 font-bold uppercase">Pronto para Impressão e Exportação</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={handlePrint}
                      disabled={isPrinting}
                      className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-700 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-100 bg-white cursor-pointer disabled:opacity-50"
                    >
                      {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir
                    </button>
                    <button
                      onClick={exportWord}
                      className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-700 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-100 bg-white cursor-pointer"
                    >
                      <FileDown size={16} /> Word
                    </button>
                    <button
                      onClick={exportPPT}
                      className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-700 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-100 bg-white cursor-pointer"
                    >
                      <Presentation size={16} /> PPT
                    </button>
                    <button
                      onClick={() => {
                        if (isEditingReport) {
                          handleSaveEditedReport();
                        } else {
                          setEditedReport(aiReport);
                          setIsEditingReport(true);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all border-none cursor-pointer shadow-lg shadow-indigo-100"
                    >
                      {isEditingReport ? (
                        <><Save size={16} /> Salvar</>
                      ) : (
                        <><Edit2 size={16} /> Editar</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Document Content Area */}
                <div className="flex-1">
                  {isEditingReport ? (
                    <div className="relative h-full">
                      <textarea
                        value={editedReport}
                        onChange={(e) => setEditedReport(e.target.value)}
                        className="w-full h-[850px] p-8 bg-gray-50 border-2 border-dashed border-indigo-200 rounded-2xl focus:outline-none focus:border-indigo-400 text-gray-700 font-mono leading-relaxed text-sm resize-none transition-all shadow-inner"
                        placeholder="Edite o relatório aqui usando Markdown..."
                      />
                      <div className="absolute bottom-6 right-6 text-[10px] text-white font-black uppercase bg-indigo-600 px-3 py-1.5 rounded-full shadow-lg">
                        Modo de Edição Ativo
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none prose-sm font-serif text-gray-800 leading-relaxed selection:bg-indigo-100">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-8 shadow-sm rounded-lg border border-gray-200">
                              <table className="w-full border-collapse">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-gray-50 border-b-2 border-gray-200">{children}</thead>,
                          th: ({ children }) => <th className="p-4 text-left font-black text-gray-700 uppercase tracking-wider text-[10px] border-r border-gray-200 last:border-r-0">{children}</th>,
                          td: ({ children }) => <td className="p-4 text-[12px] text-gray-600 border-r border-gray-100 last:border-r-0 border-b border-gray-100">{children}</td>,
                          h1: ({ children }) => <h1 className="text-3xl font-black text-gray-900 mb-8 border-b-4 border-gray-900 pb-4 uppercase tracking-tighter">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-black text-gray-800 mt-12 mb-6 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-2 h-6 bg-gray-900 rounded-sm"></span>
                            {children}
                          </h2>,
                          h3: ({ children }) => <h3 className="text-sm font-black text-gray-700 mt-8 mb-4 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">{children}</h3>,
                          p: ({ children }) => <p className="mb-6 text-gray-700 leading-8 text-[14px]">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-8 mb-6 space-y-3">{children}</ul>,
                          li: ({ children }) => <li className="text-gray-700 text-[14px]">{children}</li>,
                        }}
                      >
                        {aiReport}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Page Footer */}
                <div className="mt-16 pt-10 border-t-2 border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">
                  <span>PROJETO: {projectName}</span>
                  <span className="bg-gray-50 px-3 py-1 rounded-full">PÁGINA 01</span>
                  <span>LBW CONSULTORIA</span>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10 max-w-sm w-full animate-in zoom-in-95 fade-in duration-300 pointer-events-auto border-4 border-slate-50">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-2 shadow-inner">
                <Trash2 size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Limpar Tudo?</h3>
                <p className="text-slate-500 text-[13px] font-bold leading-relaxed px-4">
                  Esta ação irá apagar permanentemente todos os dados preenchidos nesta ferramenta.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 text-slate-500 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Manter Dados
                </button>
                <button
                  onClick={() => {
                    confirmClearData();
                  }}
                  className="flex-1 py-4 px-6 rounded-2xl bg-red-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-200 transition-all cursor-pointer"
                >
                  Sim, Limpar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
