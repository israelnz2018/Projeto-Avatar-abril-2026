import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Edit2, Save, FileDown, Presentation, CheckCircle2, X, Printer, Wand2, HelpCircle, Trash2, FileSpreadsheet, ListTodo, TrendingUp, AlertTriangle, Calendar, Settings, Search, ArrowDownToLine } from 'lucide-react';
import { generateToolData } from '@/src/services/aiService';
import { resolveToolLink } from '@/src/services/toolLinks';
import { esqueletoDoSipoc, sipocParaProcessMap, sipocParaBpmn } from '@/src/services/sipocParaProcesso';
import { variaveisDaOrigem, variaveisYDaOrigem } from '@/src/services/variaveisDoProjeto';
import { generateBriefData } from '@/src/services/claudeAiService';
import { generateFullWordReport, generateFullPPTReport, generateProjectCharterExcel } from '@/src/services/reportService';
import { exportIshikawaSlide } from '@/src/services/ishikawaSlideExporter';
import { exportCharterSlide } from '@/src/services/charterSlideExporter';
import { exportStakeholderAdkarSlide } from '@/src/services/stakeholderAdkarSlideExporter';
import { exportMeasureAdkarSlide } from '@/src/services/measureAdkarSlideExporter';
import { exportAnalyzeAdkarSlide } from '@/src/services/analyzeAdkarSlideExporter';
import { exportImproveAdkarSlide } from '@/src/services/improveAdkarSlideExporter';
import { exportControlAdkarSlide } from '@/src/services/controlAdkarSlideExporter';
import { exportSipocSlide } from '@/src/services/sipocSlideExporter';
import { exportProjectTimelineSlide } from '@/src/services/projectTimelineSlideExporter';
import { exportImprovementPlanSlide } from '@/src/services/improvementPlanSlideExporter';
import { exportProcessMapSlide } from '@/src/services/processMapSlideExporter';
import { exportDataCollectionPlanSlide } from '@/src/services/dataCollectionPlanSlideExporter';
import { exportBrainstormingSlide } from '@/src/services/brainstormingSlideExporter';
import { exportCauseEffectMatrixSlide } from '@/src/services/causeEffectMatrixSlideExporter';
import { exportDirectObservationSlide } from '@/src/services/directObservationSlideExporter';
import { routeExportPPT } from '@/src/services/exportPPTRouter';
import { InlinePresentationShell } from './InlinePresentationShell';
import { IshikawaSlide } from './presentations/IshikawaSlide';
import { useUserTheme } from '@/src/hooks/useUserTheme';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image';
import { cn } from '@/src/lib/utils';
import { logToolOpened } from '@/src/services/eventLogger';
import { normalizeDataNatureData } from '@/src/services/dataNatureRules';
import { buildCauseEvidenceCandidates, getConfirmedCauseRows } from '@/src/services/causeValidationService';
import { alinharIdeiasAsCausas, causasSemIdeia } from '@/src/services/brainstormingSolutionCoverage';
import { prioritizationItemsFromSource } from '@/src/services/prioritizationMigration';

interface ToolWrapperProps {
  toolId: string;
  toolName: string;
  projectName: string;
  initialData: any;
  onSave: (data: any, options?: { silent?: boolean }) => void;
  children: (props: { 
    onSave: (data: any, options?: { silent?: boolean }) => void; 
    initialData: any;
    onGenerateAI?: (customContext?: any) => Promise<void>;
    isGeneratingAI?: boolean;
    onClearAIData?: () => void;
    allProjectData?: any;
  }) => React.ReactNode;
  project: any;
  availableTools: any[];
  phases: any[];
  initiativeName?: string;
  /** Iniciativa (tipo de projeto) — carrega `toolLinks`, as ligações declaradas deste projeto. */
  initiative?: any;
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

interface AIPromptCardProps {
  toolId: string;
  toolName: string;
  previousToolName: string;
  onAction: (customContext?: any) => Promise<void>;
  isGenerating: boolean;
  hasPreviousData: boolean;
  previousToolData?: any;
  allProjectData?: any;
  customTitle?: string;
  customDescription?: string;
}

// Helper to find tool data regardless of phase prefix
const getToolDataByPrefix = (allData: any, toolKey: string) => {
  if (!allData) return null;
  
  const matchingKeys = Object.keys(allData).filter(k => k === toolKey || k.endsWith(`_${toolKey}`));
  if (matchingKeys.length === 0) return null;
  
  const metadata = allData.__metadata;
  if (metadata) {
    let latestKey = matchingKeys[0];
    let maxTime = metadata[latestKey] || 0;
    for (const key of matchingKeys) {
      const time = metadata[key] || 0;
      if (time > maxTime) {
        maxTime = time;
        latestKey = key;
      }
    }
    return allData[latestKey];
  }

  // Fallback for missing metadata
  if (allData[toolKey]) return allData[toolKey];

  return allData[matchingKeys[0]];
};

// Checagem GENÉRICA de "tem conteúdo?" — usada pra decidir se a ferramenta-fonte
// já foi preenchida (não só aberta e salva vazia). Sem regra por-tool: cobre
// null/''/[]/{}, arrays só com itens vazios e objetos só com campos vazios.
// Desembrulha {toolData:{...}} se vier assim.
const sourceHasContent = (raw: any): boolean => {
  const data = raw?.toolData ?? raw;
  const isEmpty = (d: any): boolean => {
    if (d === null || d === undefined || d === '' || d === false) return true;
    if (Array.isArray(d)) return d.length === 0 || d.every(isEmpty);
    if (typeof d === 'object') {
      const keys = Object.keys(d).filter(k => k !== '__metadata');
      return keys.length === 0 || keys.every(k => isEmpty(d[k]));
    }
    return false; // number (inclui 0) ou string não-vazia contam como conteúdo
  };
  return !isEmpty(data);
};

export const AIPromptCard = ({ 
  toolId,
  toolName, 
  previousToolName, 
  onAction, 
  isGenerating,
  hasPreviousData,
  previousToolData,
  allProjectData,
  customTitle,
  customDescription
}: AIPromptCardProps) => {
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<string>("");
  const [projectStartDate, setProjectStartDate] = useState<string>("");

  const [extractedProjects, setExtractedProjects] = useState<any[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // We explicitly removed the old JS-based 'projects' logic, letting the AI generate it instead.

  // Extração local — sem IA. Lê os projetos das ferramentas anteriores diretamente
  // do estado. A versão anterior chamava o Gemini só pra fazer parse, o que era
  // overkill — agora é um simples map sobre os dados.
  const handleExtractProjectsAI = async () => {
    setIsExtracting(true);
    try {
      const improvementIdea = getToolDataByPrefix(allProjectData, 'improvementIdea');
      const gut = getToolDataByPrefix(allProjectData, 'gut');
      const rab = getToolDataByPrefix(allProjectData, 'rab');

      const fromImprovement = Array.isArray(improvementIdea?.generatedProjects)
        ? improvementIdea.generatedProjects.filter((p: any) => p?.aprovado !== false).map((p: any) => ({
            title: p.title || '',
            description: p.problem || '',
            y_indicator: p.y_indicator || '',
            financial_impact: p.financial_impact || '',
            belt_level: p.belt_level || '',
            justification: p.justification || '',
          }))
        : [];
      const fromGut = Array.isArray(gut?.opportunities)
        ? gut.opportunities.map((o: any) => ({ title: o.description || o.title || '', description: o.description || '' }))
        : [];
      const fromRab = Array.isArray(rab?.opportunities)
        ? rab.opportunities.map((o: any) => ({ title: o.description || o.title || '', description: o.description || '' }))
        : [];

      const all = fromImprovement.length > 0 ? fromImprovement : fromGut.length > 0 ? fromGut : fromRab;
      const seen = new Set<string>();
      const dedup = all.filter((p: any) => {
        const key = (p.title || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setExtractedProjects(dedup);
      toast.success("Títulos puxados das fases anteriores.");
    } catch (error: any) {
      console.error("Erro ao extrair títulos:", error);
      toast.error("Erro ao puxar dados das fases anteriores.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAction = () => {
    if (toolId === 'brief') {
      if (selectedProjectIndex === "") {
        toast.error("Por favor, selecione um título de projeto no dropdown antes de gerar.");
        return;
      }
      const selectedProject = extractedProjects[parseInt(selectedProjectIndex)];
      onAction(selectedProject);
    } else if (toolId === 'timeline') {
      if (projectStartDate === "") {
        toast.error("Por favor, selecione a data de início do projeto.");
        return;
      }
      onAction({ projectStartDate });
    } else if (toolId === 'improvementPlan') {
      onAction();
    } else {
      onAction();
    }
  };

  const hasCharterData = useMemo(() => {
    return !!(getToolDataByPrefix(allProjectData, 'charter') || getToolDataByPrefix(allProjectData, 'projectCharterPMI'));
  }, [allProjectData]);

  return (
    <div className="bg-[#f0fdf4] p-8 rounded-2xl border border-emerald-100 mb-10 shadow-sm relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-100/50 rounded-full blur-3xl group-hover:bg-emerald-200/50 transition-colors"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3 text-emerald-700 font-black uppercase tracking-[0.2em] text-xs">
            <Wand2 size={20} className="text-emerald-500" />
            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2">
              {customTitle || `Gerar ${toolName}`}
            </p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {customDescription || (previousToolName ? <>Obter os dados de <strong>{previousToolName}</strong> e gerar {toolName}.</> : `Gerar ${toolName} para este projeto.`)}
          </p>

          {toolId === 'brief' && (
            <div className="mt-4 space-y-2">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">
                Selecione um Projeto para Trabalhar:
              </label>
              <p className="text-xs text-emerald-800 font-medium opacity-80 mb-2">
                Clique no botão "1. Puxar Títulos" para que a IA extraia os projetos disponíveis das fases anteriores.
              </p>
              <select
                value={selectedProjectIndex}
                onChange={(e) => setSelectedProjectIndex(e.target.value)}
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                disabled={extractedProjects.length === 0}
              >
                <option value="">
                  {extractedProjects.length === 0 
                    ? "-- Puxe os títulos primeiro --" 
                    : "-- Escolha um projeto da lista --"}
                </option>
                {extractedProjects.map((p: any, idx: number) => (
                  <option key={idx} value={idx}>{p.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {toolId === 'brief' && (
            <button
              onClick={handleExtractProjectsAI}
              disabled={isExtracting || isGenerating}
              className={cn(
                "w-full md:w-auto min-w-[240px] h-12 flex items-center justify-center gap-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md border border-emerald-600 cursor-pointer active:scale-95",
                isExtracting || isGenerating
                  ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed shadow-none"
                  : "bg-white text-emerald-600 hover:bg-emerald-50"
              )}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Extraindo...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>1. Puxar Títulos</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleAction}
            disabled={isGenerating || ((toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI' || toolId === 'stakeholderAdkar' || toolId === 'measureAdkar') && !hasCharterData)}
            className={cn(
              "w-full md:w-auto min-w-[240px] h-16 flex items-center justify-center gap-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl border-none cursor-pointer active:scale-95",
              isGenerating || ((toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI') && !hasCharterData)
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200"
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
                   toolId === 'improvementPlan' ? 'Carregar' : 
                   toolId === 'brief' ? '2. Gerar' : 'Gerar'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface MigratePromptCardProps {
  toolId?: string;
  toolName: string;
  sourceName: string;
  onMigrate: () => void;
  isMigrating: boolean;
  hasSourceData: boolean;
  /** A ferramenta ja tem a lista: vira uma barra fina em vez do card grande.
   *  Sem isto o card verde competiria com o seletor verde de X na mesma tela. */
  compacto?: boolean;
  /** Quantos itens a ferramenta anterior tem que ainda nao chegaram aqui. */
  novidades?: number;
}

/**
 * Ferramentas que trabalham em cima da LISTA DE X do projeto e ja sabem
 * sincronizar: o botao ACRESCENTA o que falta e nunca sobrescreve o que o aluno
 * escreveu. Por isso ele fica disponivel a jornada inteira nelas, em vez de
 * sumir depois do primeiro uso — que era o que congelava a lista e impedia uma
 * causa criada depois na Espinha de Peixe de chegar ate aqui.
 */
const TOOLS_QUE_SINCRONIZAM_LISTA = ['directObservation', 'dataNature', 'fiveWhys'];

const semAcento = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('pt-BR');

/** Chave de comparacao de variavel: mesmo nome = mesma variavel. Sem acento
 *  porque a mesma categoria aparece como "Metodo" e "Método" entre projetos. */
const chaveDaVariavel = (valor: any) =>
  semAcento(String(valor?.variable ?? valor?.name ?? valor ?? ''));

/** Categoria que o aluno marca para a ideia NAO virar causa na espinha. */
const FORA_DA_ESPINHA = 'nao colocar na espinha de peixe';

const PALAVRAS_VAZIAS = new Set([
  'esta', 'estao', 'sao', 'sem', 'com', 'para', 'por', 'que', 'nao', 'dos',
  'das', 'nos', 'nas', 'uma', 'uns', 'umas', 'pelo', 'pela', 'entre', 'seu',
  'sua', 'mais', 'menos', 'ser', 'tem', 'ate', 'como', 'quando', 'onde',
]);

/** Palavras com sentido, cortadas em 6 letras para "atualizado" e "atualizar"
 *  contarem como a mesma ideia. */
const palavrasChave = (texto: string) =>
  new Set(
    semAcento(texto)
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length > 3 && !PALAVRAS_VAZIAS.has(p))
      .map((p) => p.slice(0, 6))
  );

/**
 * Quanto dois textos se parecem, de 0 a 1.
 *
 * A IA reescreve a mesma causa com outras palavras — "Aprovador substituto nao
 * esta atualizado no sistema" vira "Aprovador substituto desatualizado" — entao
 * comparar texto exato acusa novidade onde nao ha, e sincronizar duplicaria a
 * causa. Isto so LEVANTA A SUSPEITA: quem decide e o aluno, na lista de
 * conferencia.
 */
const parecencaEntre = (a: string, b: string) => {
  const pa = palavrasChave(a);
  const pb = palavrasChave(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  let iguais = 0;
  pa.forEach((palavra) => { if (pb.has(palavra)) iguais += 1; });
  return iguais / Math.min(pa.size, pb.size);
};

const PARECIDO_DEMAIS = 0.5;

/** O texto que o aluno le, seja a ideia do Brainstorming ou a variavel X. */
const textoDoItem = (item: any) =>
  String(item?.text ?? item?.variable ?? item?.name ?? item ?? '').trim();

/** O que ja esta escrito nesta ferramenta, para comparar com o que vem de tras. */
const textosJaNaFerramenta = (toolId: string, dadosAtuais: any): string[] => {
  const atual = dadosAtuais?.toolData || dadosAtuais || {};
  if (toolId === 'measureIshikawa') {
    return Object.values(atual.causes || {})
      .flatMap((lista: any) => (Array.isArray(lista) ? lista : []))
      .map(textoDoItem)
      .filter(Boolean);
  }
  const lista = toolId === 'measureMatrix'
    ? (Array.isArray(atual.causes) ? atual.causes : [])
    : (Array.isArray(atual.variaveisDisponiveis) ? atual.variaveisDisponiveis : []);
  return lista.map(textoDoItem).filter(Boolean);
};

/**
 * O que a ferramenta anterior tem e ainda nao chegou aqui.
 *
 * Uma funcao so, usada pelo aviso de desatualizado E pelo botao — se fossem
 * duas, o aviso poderia dizer "3 novidades" e o botao trazer outra coisa.
 *
 * Cada destino guarda a informacao num formato: a Espinha em causes por
 * categoria 6M, a Matriz numa lista de causas pontuadas, e as ferramentas de
 * investigacao na lista de X migrada.
 */
const novidadesDaOrigem = (toolId: string, origem: any, dadosAtuais: any): any[] => {
  const atual = dadosAtuais?.toolData || dadosAtuais || {};

  // Espinha de Peixe <- Brainstorming. As ideias ja vem com a categoria 6M
  // escolhida pelo aluno, entao nao ha o que a IA precise classificar aqui.
  if (toolId === 'measureIshikawa') {
    const dadosOrigem = origem?.toolData || origem || {};
    const ideias = Array.isArray(dadosOrigem.ideas) ? dadosOrigem.ideas : [];
    const jaNaEspinha = new Set(
      Object.values(atual.causes || {})
        .flatMap((lista: any) => Array.isArray(lista) ? lista : [])
        .map(chaveDaVariavel)
    );
    return ideias.filter((ideia: any) => {
      const texto = String(ideia?.text ?? '').trim();
      const categoria = String(ideia?.category ?? '').trim();
      if (!texto || !categoria) return false;
      if (semAcento(categoria) === FORA_DA_ESPINHA) return false;
      return !jaNaEspinha.has(chaveDaVariavel({ variable: texto }));
    });
  }

  const daOrigem = variaveisDaOrigem(origem);
  if (daOrigem.length === 0) return [];

  const existentes = toolId === 'measureMatrix'
    ? (Array.isArray(atual.causes) ? atual.causes : [])
    : (Array.isArray(atual.variaveisDisponiveis) ? atual.variaveisDisponiveis : []);

  const conhecidas = new Set(existentes.map(chaveDaVariavel));
  return daOrigem.filter((v) => chaveDaVariavel(v) && !conhecidas.has(chaveDaVariavel(v)));
};

const MigratePromptCard = ({ toolId, toolName, sourceName, onMigrate, isMigrating, hasSourceData, compacto, novidades }: MigratePromptCardProps) => {
  if (compacto) {
    // Desatualizado = a etapa anterior mudou depois que esta foi preenchida.
    // Ficar em cinza quando nao ha nada novo evita o aluno apertar por seguranca
    // sem saber se precisa.
    const desatualizado = (novidades ?? 0) > 0;
    return (
      <div className={cn(
        'mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
        desatualizado ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
      )}>
        <p className={cn('m-0 text-xs', desatualizado ? 'text-blue-900' : 'text-gray-500')}>
          {desatualizado ? (
            <>
              <strong>{sourceName} mudou.</strong>{' '}
              {novidades === 1 ? '1 item novo ainda não está aqui.' : `${novidades} itens novos ainda não estão aqui.`}{' '}
              Trazer não altera nada do que você já preencheu.
            </>
          ) : (
            <>Atualizado com <strong>{sourceName}</strong>. Nada novo para trazer.</>
          )}
        </p>
        <button
          onClick={onMigrate}
          disabled={isMigrating || !hasSourceData || !desatualizado}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-lg border-none px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
            isMigrating || !hasSourceData || !desatualizado
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          )}
        >
          {isMigrating
            ? <><Loader2 className="animate-spin" size={14} /> Sincronizando...</>
            : <><ArrowDownToLine size={14} /> Sincronizar</>}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100 mb-10 shadow-sm relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-100/50 rounded-full blur-3xl"></div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3 text-blue-700 font-black uppercase tracking-[0.2em] text-xs">
            <ArrowDownToLine size={20} className="text-blue-500" />
            <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">
              Sincronizar com {sourceName}
            </p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {toolId === 'improvementPlan'
              ? <>Obter as datas de <strong>Cronograma Macro</strong> e carregar as atividades sugeridas por fase.</>
              : TOOLS_QUE_SINCRONIZAM_LISTA.includes(toolId)
                ? <>Buscar em <strong>{sourceName}</strong> as variáveis que ainda não estão aqui. Só acrescenta o que falta — nada do que você já preencheu é alterado.</>
                : <>Obter os dados de <strong>{sourceName}</strong> e carregar em {toolName}.</>
            }
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={onMigrate}
            disabled={isMigrating || !hasSourceData}
            className={cn(
              "w-full md:w-auto min-w-[240px] h-16 flex items-center justify-center gap-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl border-none cursor-pointer active:scale-95",
              isMigrating || !hasSourceData
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200"
            )}
          >
            {isMigrating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <ArrowDownToLine size={20} />
                <span>Sincronizar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// As ligacoes entre ferramentas vivem em services/toolLinks.ts e so existem quando
// o consultor as declara no painel — nao ha mais mapa global ligando por padrao.


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
  initiative,
  initiativeConfigs,
  previousToolData,
  previousToolName,
  allProjectData,
  showAIPrompt = true,
  currentPhaseId
}: ToolWrapperProps) {
  const { headerColor, headerTextColor, companyLogoUrl, companyName } = useUserTheme();

  // Telemetria: registra abertura da ferramenta. Fire-and-forget, falha silenciosa.
  useEffect(() => {
    logToolOpened(toolId, project?.id, toolName);
  }, [toolId, project?.id]);

  const [localData, setLocalData] = useState(initialData?.toolData || initialData);
  const [aiReport, setAiReport] = useState(initialData?.aiReport || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  /** Lista que o aluno confere antes de sincronizar. Sem esta etapa o botao
   *  acrescentaria em silencio uma causa que ja existe escrita de outro jeito. */
  const [revisaoSync, setRevisaoSync] = useState<{
    origem: string;
    itens: Array<{ item: any; texto: string; parecidoCom: string | null }>;
    marcados: boolean[];
  } | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReport, setEditedReport] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearKey, setClearKey] = useState(0);
  const [showInlinePresentation, setShowInlinePresentation] = useState(false);

  // Estados especificos do Brief (Entendendo o Problema)
  // _fonte e _pontos são só rótulo da lista; o resto vai pra IA.
  const [briefTitlesPulled, setBriefTitlesPulled] = useState<Array<{ title: string; problem?: string; y_indicator?: string; financial_impact?: string; belt_level?: string; justification?: string; _fonte?: string; _pontos?: number | null }>>([]);
  const [briefSelectedTitle, setBriefSelectedTitle] = useState<string>('');

  const normalizeInitialData = (toolId: string, raw: any): any => {
    if (!raw) return raw;
    
    // Extrai dados do toolData se existir
    const d = raw.toolData || raw;
    
    // Campos que devem ser sempre arrays por ferramenta
    const arrayFields: Record<string, string[]> = {
      sipoc: ['suppliers', 'inputs', 'process', 'outputs', 'customers'],
      brainstorming: ['ideas'],
      gut: ['opportunities'],
      rab: ['opportunities'],
      fiveWhys: ['chains'],
      fmea: ['items'],
      plan5w2h: ['actions'],
      stakeholders: ['stakeholders'],
      desireCheck: ['actions'],
      knowledgeCheck: ['coreTeam', 'stakeholders'],
      abilityCheck: ['solutionValidation', 'planApproval', 'implementation'],
      reinforcementCheck: ['sustainability'],
      dataCollection: ['items'],
      effortImpact: ['actions'],
      measureMatrix: ['outputs', 'causes'],
      directObservation: ['observations'],
      dataNature: ['analyses'],
      causeValidation: ['rows'],
      improvementPlan: ['phases'],
      sop: ['revisions', 'definitions', 'responsibilities', 'processSteps', 'flowchart', 'controlPoints', 'risks', 'records'],
      charter: ['team', 'stakeholders', 'milestones'],
      projectCharterPMI: ['team', 'stakeholders', 'milestones'],
      tangibleGains: ['baselineRows', 'afterRows'],
      projectClose: ['causasRaizes', 'solucoes'],
    };

    const fields = arrayFields[toolId] || [];
    const normalized = { ...d };

    // Limpa o campo 'area' se for dado gerado ou se estiver em branco
    if (toolId === 'stakeholders' || toolId === 'stakeholderAdkar' || toolId === 'measureAdkar') {
      if (Array.isArray(normalized.stakeholders)) {
        normalized.stakeholders = normalized.stakeholders.map((s: any) => ({
          ...s,
          // Se for dado novo/gerado ou se for Pintura Automotiva (por precaução), limpa
          area: s.area === 'Pintura Automotiva' ? '' : (s.area || '')
        }));
      }
    }

    if (toolId === 'charter' || toolId === 'projectCharterPMI') {
      if (normalized.area === 'Pintura Automotiva') {
        normalized.area = '';
      }
      if (normalized.department === 'Pintura Automotiva') {
        normalized.department = '';
      }
    }

    // Garante que campos esperados como array sejam arrays
    fields.forEach(field => {
      if (normalized[field] === undefined || normalized[field] === null) {
        normalized[field] = [];
      } else if (!Array.isArray(normalized[field])) {
        normalized[field] = [normalized[field]];
      }
    });

    // Normalização específica por ferramenta
    if (toolId === 'sop') {
      if (!normalized.header) {
        normalized.header = {
          title: '', code: '', version: '1.0', issueDate: '', revisionDate: '', author: '', approver: '', department: ''
        };
      }
    }

    if (toolId === 'charter' || toolId === 'projectCharterPMI') {
      if (!normalized.scope) normalized.scope = { in: '', out: '' };
      if (!normalized.impacts) normalized.impacts = { quality: '', financial: '', customer: '' };
    }
    if (toolId === 'measureIshikawa') {
      if (!normalized.categories) {
        normalized.categories = ['Método', 'Máquina', 'Medida', 'Meio Ambiente', 'Mão de Obra', 'Material'];
      }
      if (!normalized.causes || typeof normalized.causes !== 'object') {
        normalized.causes = {};
      }
      normalized.categories.forEach((cat: string) => {
        if (!Array.isArray(normalized.causes[cat])) {
          normalized.causes[cat] = [];
        }
      });
      if (!normalized.problem) normalized.problem = '';
    }

    if (toolId === 'brainstorming') {
      normalized.ideas = (normalized.ideas || []).map((idea: any, idx: number) => ({
        id: idea.id || String(idx + 1),
        text: idea.text || idea.description || '',
        category: idea.category || 'Método',
        author: idea.author || 'IA LBW',
        votes: typeof idea.votes === 'number' ? idea.votes : 0,
      }));
    }

    if (toolId === 'fiveWhys') {
      normalized.chains = (normalized.chains || []).map((chain: any, idx: number) => ({
        id: chain.id || String(idx + 1),
        problem: chain.problem || '',
        whys: Array.isArray(chain.whys) ? chain.whys : ['', '', '', '', ''],
        rootCause: chain.rootCause || '',
      }));
    }

    if (toolId === 'dataNature') {
      return normalizeDataNatureData(normalized);
    }

    if (toolId === 'gut' || toolId === 'rab') {
      // BUG: "id: opp.id || ..." vinha ANTES do "...opp", entao o spread
      // sempre sobrescrevia com o id original — inclusive quando duas linhas
      // migradas do Brainstorming traziam o mesmo id pequeno ("1", "1", por
      // exemplo). Com o id duplicado, editar a nota de uma linha editava as
      // duas ao mesmo tempo (setRows casa por "r.id === row.id"). Confirmado
      // no Firestore real: Projeto Setmbro 2026 tinha as duas linhas com id
      // "1". Agora o id calculado vem DEPOIS do spread, e nunca repete.
      const idsUsados = new Set<string>();
      normalized.opportunities = (normalized.opportunities || []).map((opp: any, idx: number) => {
        let id = String(opp.id ?? '').trim() || String(idx + 1);
        if (idsUsados.has(id)) id = `${id}-dup${idx}`;
        idsUsados.add(id);
        return {
          description: opp.description || opp.title || '',
          ...opp,
          id,
        };
      });
      if (!Array.isArray(normalized.columns)) {
        normalized.columns = [];
      }
    }

    if (toolId === 'fmea') {
      normalized.items = (normalized.items || []).map((item: any, idx: number) => ({
        id: item.id || String(idx + 1),
        processStep: item.processStep || '',
        failureMode: item.failureMode || '',
        failureEffect: item.failureEffect || '',
        severity: Number(item.severity) || 1,
        causes: item.causes || '',
        occurrence: Number(item.occurrence) || 1,
        controls: item.controls || '',
        detection: Number(item.detection) || 1,
        actions: item.actions || '',
      }));
    }

    if (toolId === 'plan5w2h') {
      normalized.actions = (normalized.actions || []).map((action: any, idx: number) => ({
        id: action.id || String(idx + 1),
        // "description" era o nome antigo do campo, antes de padronizar em
        // "variable" (igual ao resto da plataforma). Sem o fallback, uma linha
        // salva antes da mudanca perderia o texto aqui — este mapa reconstroi
        // o objeto so com os campos listados, entao o "description" antigo
        // nunca chegaria ate o componente se nao for copiado agora.
        variable: action.variable || action.description || '',
        what: action.what || '',
        why: action.why || '',
        where: action.where || '',
        when: action.when || '',
        who: action.who || '',
        how: action.how || '',
        howMuch: action.howMuch || '',
        status: action.status || { state: 'green', progress: '0%' },
      }));
    }

    if (toolId === 'measureMatrix') {
      normalized.outputs = (normalized.outputs || []).map((out: any) => ({
        name: out.name || '',
        importance: Number(out.importance) || 1,
        ...out,
      }));
      normalized.causes = (normalized.causes || []).map((cause: any, idx: number) => ({
        id: cause.id || `X${String(idx + 1).padStart(2, '0')}`,
        name: cause.name || '',
        scores: Array.isArray(cause.scores) ? cause.scores : normalized.outputs.map(() => 0),
        effort: Number(cause.effort) || 1,
        selected: Boolean(cause.selected),
      }));
    }

    if (toolId === 'sipoc') {
      normalized.suppliers = Array.isArray(normalized.suppliers) ? normalized.suppliers : [''];
      normalized.inputs = Array.isArray(normalized.inputs) ? normalized.inputs : [''];
      normalized.process = Array.isArray(normalized.process) ? normalized.process : ['', '', '', '', ''];
      normalized.outputs = Array.isArray(normalized.outputs) ? normalized.outputs : [''];
      normalized.customers = Array.isArray(normalized.customers) ? normalized.customers : [''];
    }

    return normalized;
  };

  const fishboneRef = useRef<HTMLDivElement>(null);
  const [isSaved, setIsSaved] = useState<boolean>(
    !!initialData && Object.keys(initialData).length > 0
  );

  useEffect(() => {
    setLocalData(initialData?.toolData || initialData);
    setAiReport(initialData?.aiReport || '');
    setIsEditingReport(false);
    setEditedReport('');
    setError(null);
  }, [initialData]);

  const handleToolSave = (data: any, options?: { silent?: boolean }) => {
    // Se for auto-save silencioso (mudança em campo), marca como NÃO salvo (tem alterações pendentes)
    // Se for save explícito (botão Salvar), marca como salvo de verdade
    if (options?.silent) {
      setIsSaved(false);
    } else {
      setIsSaved(true);
    }
    setLocalData(data);
    onSave({
      toolData: data,
      aiReport: toolId === 'charter' ? '' : aiReport
    }, options);
  };

  const handleClearData = () => {
    setIsSaved(false);
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

  // Handler do botao verde do Brief: puxa os titulos das fontes DECLARADAS (sem IA).
  // Antes lia só o improvementIdea. Agora percorre `toolLink.from`, porque um projeto
  // pode declarar que o Brief vem da GUT e da RAB — que guardam `opportunities`, não
  // `generatedProjects`. Titulo repetido entre fontes entra uma vez só.
  const handleBriefPullTitles = () => {
    const projects: any[] = [];
    const vistos = new Set<string>();

    // Mesma conta que a própria GUTTool/RABTool já mostra na coluna "Resultado" —
    // campo que o aluno nunca tocou entra com o valor neutro de cada fórmula (GUT é
    // produto: neutro 1: RAB é soma: neutro 0). Migrar da Ideia de Projeto cria a
    // linha só com a descrição, sem nenhum campo de nota — por isso aparecia em
    // branco aqui mesmo a linha já tendo uma nota (a mesma que a GUT/RAB exibe).
    const pontuacao = (p: any, sourceId: string): number | null => {
      if (sourceId === 'gut') {
        return ['gravidade', 'urgencia', 'tendencia']
          .reduce((prod, campo) => prod * (Number(p?.[campo]) || 1), 1);
      }
      if (sourceId === 'rab') {
        return ['rapidez', 'autonomia', 'beneficio']
          .reduce((soma, campo) => soma + (Number(p?.[campo]) || 0), 0);
      }
      return null;
    };

    for (const sourceId of toolLink?.from || []) {
      const raw = getToolDataByPrefix(allProjectData, sourceId);
      const data = raw?.toolData || raw;
      const nomeFonte = toolNameOf(sourceId);

      // Ideia de Projeto: generatedProjects, respeitando o que o aluno aprovou.
      const ideias = (data?.generatedProjects || []).filter((p: any) => p?.aprovado !== false);
      // GUT / RAB e afins: opportunities, onde o titulo é a descrição da linha.
      const oportunidades = (data?.opportunities || [])
        .filter((o: any) => (o?.description || '').trim())
        .map((o: any) => ({ ...o, title: o.description }));

      for (const p of [...ideias, ...oportunidades]) {
        const titulo = (p?.title || '').trim();
        if (!titulo || vistos.has(titulo)) continue;
        vistos.add(titulo);
        // _fonte e _pontos existem só pra montar o rótulo da lista; saem antes de
        // qualquer coisa ir pra IA.
        projects.push({ ...p, _fonte: nomeFonte, _pontos: pontuacao(p, sourceId) });
      }
    }

    if (projects.length === 0) {
      toast.error(`Nenhum titulo encontrado. Preencha ${linkSourceLabel || 'a ferramenta de origem'} primeiro.`);
      return;
    }

    setBriefTitlesPulled(projects);
    setBriefSelectedTitle('');
    toast.success(`${projects.length} titulo(s) carregado(s)!`);
  };

  // Handler do botao azul do Brief: envia o projeto selecionado pra Claude
  const handleBriefGenerate = async () => {
    if (!briefSelectedTitle) {
      toast.error("Selecione um projeto antes de gerar.");
      return;
    }
    
    const escolhido = briefTitlesPulled.find(p => p.title === briefSelectedTitle);
    if (!escolhido) {
      toast.error("Projeto selecionado nao encontrado.");
      return;
    }
    const { _fonte, _pontos, ...selectedProject } = escolhido;
    
    setIsGeneratingData(true);
    try {
      // Brief usa uma chamada ENXUTA (generateBriefData): manda só o projeto
      // selecionado — NÃO o allProjectData inteiro — pra ser rápido.
      const generatedData = await generateBriefData(
        selectedProject,
        { name: projectName, description: project.description }
      );
      const normalized = normalizeInitialData('brief', generatedData);
      handleToolSave(normalized);
      setClearKey(prev => prev + 1);
      toast.success("Brief gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar brief:", error);
      toast.error(error.message || "Erro ao gerar brief.");
    } finally {
      setIsGeneratingData(false);
    }
  };

  /**
   * Monta a lista de conferencia: o que a etapa anterior tem e ainda nao chegou
   * aqui, ja deixando desmarcado o que parece repeticao do que o aluno escreveu.
   */
  const abrirRevisaoSync = (sourceToolId: string) => {
    const sourceData = getToolDataByPrefix(allProjectData, sourceToolId);
    if (!sourceData) {
      toast.error('A ferramenta anterior ainda não tem dados para trazer.');
      return;
    }

    const novas = novidadesDaOrigem(toolId, sourceData, localData);
    if (novas.length === 0) {
      toast.info('Nada novo para trazer. O que você já preencheu continua intacto.');
      return;
    }

    const jaEscritos = textosJaNaFerramenta(toolId, localData);
    const itens = novas.map((item) => {
      const texto = textoDoItem(item);
      const maisParecido = jaEscritos
        .map((existente) => ({ existente, nota: parecencaEntre(texto, existente) }))
        .sort((a, b) => b.nota - a.nota)[0];
      return {
        item,
        texto,
        parecidoCom: maisParecido && maisParecido.nota >= PARECIDO_DEMAIS ? maisParecido.existente : null,
      };
    });

    setRevisaoSync({
      origem: sourceToolId,
      itens,
      marcados: itens.map((linha) => linha.parecidoCom === null),
    });
  };

  const confirmarRevisaoSync = async () => {
    if (!revisaoSync) return;
    const escolhidos = revisaoSync.itens
      .filter((_, i) => revisaoSync.marcados[i])
      .map((linha) => linha.item);
    const origem = revisaoSync.origem;
    setRevisaoSync(null);
    if (escolhidos.length === 0) return;
    await handleMigrateData(origem, escolhidos);
  };

  /** `apenas` = so os itens que o aluno marcou na conferencia. Sem ele o botao
   *  traz tudo o que a etapa anterior tem de novo (primeiro uso, ferramenta
   *  vazia, onde nao ha o que duplicar). */
  const handleMigrateData = async (sourceToolId: string, apenas?: any[]) => {
    setIsGeneratingData(true);
    try {
      const sourceData = getToolDataByPrefix(allProjectData, sourceToolId);
      if (!sourceData) {
        toast.error(`Nenhum dado encontrado em ${sourceToolId}. Preencha a ferramenta de origem primeiro.`);
        return;
      }

      let migratedData: any = {};
      // Cada ferramenta pode dizer exatamente o que trouxe. O aluno precisa
      // saber que sincronizar acrescenta, e nao sobrescreve.
      let mensagemSucesso = 'Dados sincronizados com sucesso!';

      console.log('🔄 handleMigrateData:', { sourceToolId, sourceData, toolId });
      
      // Helper para acessar dados que podem estar em sourceData direto ou dentro de sourceData.toolData
      const getField = (field: string) => sourceData?.[field] ?? sourceData?.toolData?.[field];

      if (toolId === 'improvementPlan') {
        setIsGeneratingData(false);
        await handleGenerateData();
        return;
      }

      // Ferramentas que trabalham em cima da LISTA DE X do projeto. O botao verde
      // traz a lista da ferramenta que o consultor ligou nesta — nao importa qual
      // seja (Espinha de Peixe, Matriz Causa e Efeito, Plano de Coleta, ou a
      // propria ferramenta anterior da cadeia, que repassa o que recebeu).
      //
      // Traz a LISTA, nao os campos preenchidos: o aluno escolhe um X por vez no
      // dropdown que aparece depois. E por isso que o card verde some aqui — sem
      // isso os dois blocos verdes ficavam na tela ao mesmo tempo.
      // A Matriz e gerada por IA na primeira vez (a IA monta os outputs e sugere
      // as notas). Depois disso ela so recebe causa NOVA por copia direta: deixar
      // a IA regerar arriscaria reescrever linha que o aluno ja pontuou.
      // Espinha de Peixe <- Brainstorming. A ideia ja traz a categoria 6M que o
      // aluno escolheu, entao a causa cai na espinha certa por copia direta. As
      // causas que ja estao la nao sao tocadas.
      if (toolId === 'measureIshikawa') {
        const atual = localData?.toolData || localData || {};
        const novas = apenas ?? novidadesDaOrigem(toolId, sourceData, localData);

        if (novas.length === 0) {
          toast.info('Nada novo para trazer. A espinha de peixe já está atualizada.');
          setIsGeneratingData(false);
          return;
        }

        const causas: Record<string, string[]> = { ...(atual.causes || {}) };
        novas.forEach((ideia: any) => {
          // Casa com a categoria que ja existe na espinha, mesmo escrita sem
          // acento ("Metodo" x "Método"), pra nao criar categoria duplicada.
          const categoriaIdeia = String(ideia.category).trim();
          const existente = Object.keys(causas).find(
            (c) => semAcento(c) === semAcento(categoriaIdeia)
          );
          const alvo = existente || categoriaIdeia;
          causas[alvo] = [...(causas[alvo] || []), String(ideia.text).trim()];
        });

        migratedData = { ...atual, causes: causas };
        mensagemSucesso = `${novas.length} ${novas.length === 1 ? 'causa nova trazida' : 'causas novas trazidas'} do Brainstorming. Nada do que já estava na espinha mudou.`;
      }

      if (toolId === 'measureMatrix') {
        const atual = localData?.toolData || localData || {};
        const causasAtuais = Array.isArray(atual.causes) ? atual.causes : [];
        const outputs = Array.isArray(atual.outputs) ? atual.outputs : [];
        const novas = apenas ?? novidadesDaOrigem(toolId, sourceData, localData);

        if (novas.length === 0) {
          toast.info('Nada novo para trazer. A matriz já está atualizada.');
          setIsGeneratingData(false);
          return;
        }

        // Nota em branco de proposito: quem pontua e o aluno. E `selected` fica
        // falso ate ele decidir, senao a causa nova entraria na proxima etapa
        // sem ninguem ter avaliado.
        const proximoNumero = causasAtuais.length;
        migratedData = {
          ...atual,
          causes: [
            ...causasAtuais,
            ...novas.map((v, i) => ({
              id: `X${String(proximoNumero + i + 1).padStart(2, '0')}`,
              name: v.variable,
              scores: outputs.map(() => 0),
              selected: false,
            })),
          ],
        };
        mensagemSucesso = `${novas.length} ${novas.length === 1 ? 'causa nova trazida' : 'causas novas trazidas'} para pontuar. As notas que você já deu não mudaram.`;
      }

      if (toolId === 'directObservation' || toolId === 'dataNature' || toolId === 'fiveWhys') {
        const variaveis = variaveisDaOrigem(sourceData);

        if (variaveis.length === 0) {
          toast.error('A ferramenta de origem ainda nao tem variaveis para trazer. Preencha-a primeiro.');
          setIsGeneratingData(false);
          return;
        }

        const lista = variaveis.map((v) => ({
          variable: v.variable,
          definition: v.definition || '',
          origem: v.origem || '',
          metodo: v.metodo || '',
          observada: v.observada === true,
          evidencia: v.evidencia || '',
          causaRaiz: v.causaRaiz === true,
        }));

        // O Y viaja junto dos X — sem ele o Mapa Estatístico teria que adivinhar
        // o efeito a cada analise. Lista separada de proposito: o Y e contexto,
        // nao item pro aluno escolher no dropdown de causas.
        const listaY = variaveisYDaOrigem(sourceData);

        // SINCRONIZAR, nao substituir. Antes isto zerava observations/chains/
        // analyses, e por isso o botao so podia aparecer com a ferramenta vazia
        // — o que congelava a lista: a causa criada depois na Espinha de Peixe
        // nunca mais chegava aqui. Agora o botao fica a jornada inteira e so
        // ACRESCENTA o que falta, sem encostar no que o aluno ja escreveu.
        const atual = localData?.toolData || localData || {};
        const chaveVar = chaveDaVariavel;

        const xAtuais = Array.isArray(atual.variaveisDisponiveis) ? atual.variaveisDisponiveis : [];
        const xNovosBrutos = apenas ?? novidadesDaOrigem(toolId, sourceData, localData);
        const xNovos = lista.filter((v) => xNovosBrutos.some((n: any) => chaveVar(n) === chaveVar(v)));

        const yAtuais = Array.isArray(atual.variaveisY) ? atual.variaveisY : [];
        const yConhecidos = new Set(yAtuais.map(chaveVar));
        const yNovos = listaY.filter((v: any) => chaveVar(v) && !yConhecidos.has(chaveVar(v)));

        if (xNovos.length === 0 && yNovos.length === 0 && xAtuais.length > 0) {
          toast.info('Nada novo para trazer. O que você já preencheu continua intacto.');
          setIsGeneratingData(false);
          return;
        }

        mensagemSucesso = xNovos.length > 0
          ? `${xNovos.length} ${xNovos.length === 1 ? 'variável nova trazida' : 'variáveis novas trazidas'}. Nada do que você já preencheu foi alterado.`
          : 'Lista de efeitos (Y) atualizada. Nada do que você já preencheu foi alterado.';

        migratedData = {
          ...atual,
          variaveisDisponiveis: [...xAtuais, ...xNovos],
          variaveisY: [...yAtuais, ...yNovos],
        };
      }

      if (toolId === 'statisticalAnalysis') {
        const dnAnalyses = getField('analyses') || [];
        if (dnAnalyses.length === 0) {
          toast.error('Nenhuma analise encontrada no Mapa Estatístico. Preencha aquela ferramenta primeiro.');
          setIsGeneratingData(false);
          return;
        }
        migratedData = {
          analyses: dnAnalyses.map((a: any) => ({
            id: crypto.randomUUID(),
            variable: a.variableX?.name || '',
            analysisType: a.recommendations?.[0]?.tool || (a.recommendedTools && a.recommendedTools[0]) || 'Histograma / Boxplot',
            graphImage: '',
            interpretation: '',
          }))
        };
      }

      if (toolId === 'controlPlan') {
        const sourceActions = getField('actions') || [];
        if (sourceActions.length === 0) {
          toast.error('Nenhuma ação encontrada no Plano de Ação 5W2H. Preencha aquela ferramenta primeiro.');
          setIsGeneratingData(false);
          return;
        }
        const items = sourceActions
          .filter((a: any) => (a.description || '').toString().trim())
          .map((a: any) => ({
            id: crypto.randomUUID(),
            data: {
              process: a.description || '',
              processStep: '',
              isOutput: '',
              isInput: '',
              specifications: '',
              measurementTechnique: '',
              msaResult: '',
              sampleSize: '',
              sampleFrequency: '',
              controlMethod: '',
              responsible: '',
              reactionPlan: '',
            },
          }));
        if (items.length === 0) {
          toast.error('Nenhuma ação válida no Plano de Ação 5W2H para migrar.');
          setIsGeneratingData(false);
          return;
        }
        migratedData = { items };
      }

      // SIPOC -> mapa de processo, nos dois formatos. O "P" do SIPOC são as etapas
      // macro; aqui elas viram o esqueleto do caminho normal, com a entrada virando
      // evento inicial e a saída virando evento final. Decisões, retornos e exceções
      // ficam para o aluno detalhar — o kit manda não completar fluxo por suposição.
      if (toolId === 'processMap' || toolId === 'bpmnProcessMap') {
        const esqueleto = esqueletoDoSipoc(sourceData);
        if (!esqueleto) {
          toast.error('O SIPOC não tem etapas de processo preenchidas. Preencha a coluna "Processo" primeiro.');
          setIsGeneratingData(false);
          return;
        }

        if (toolId === 'processMap') {
          migratedData = sipocParaProcessMap(sourceData);
        } else {
          const xml = sipocParaBpmn(sourceData, projectName);
          migratedData = { xml, nomeProcesso: projectName || '' };
        }
        console.log('🗺️ Etapas migradas do SIPOC:', esqueleto.atividades.length);
      }

      if (toolId === 'gut' || toolId === 'rab') {
        // A origem pode ser Ideias de Projetos (`generatedProjects`) ou um
        // Brainstorming (`ideas`). Antes a RAB procurava apenas o primeiro
        // formato e criava uma tabela vazia quando vinha do Brainstorming.
        const opportunities = prioritizationItemsFromSource(sourceData);
        console.log('📋 Itens encontrados para priorização:', opportunities.length);

        if (opportunities.length === 0) {
          toast.error('A ferramenta de origem ainda não tem ideias para trazer. Preencha e salve o Brainstorming primeiro.');
          setIsGeneratingData(false);
          return;
        }
        
        // Colunas padrao por ferramenta (sem isso a tabela nao renderiza)
        const defaultColumns = toolId === 'gut' ? [
          { id: 'description', label: 'Problema / Oportunidade', isScore: false },
          { id: 'gravidade', label: 'Gravidade', isScore: true },
          { id: 'urgencia', label: 'Urgência', isScore: true },
          { id: 'tendencia', label: 'Tendência', isScore: true },
          { id: 'resultado', label: 'Resultado Final', isScore: false },
        ] : [
          { id: 'description', label: 'Problema / Oportunidade', isScore: false },
          { id: 'rapidez', label: 'Rapidez', isScore: true },
          { id: 'autonomia', label: 'Autonomia', isScore: true },
          { id: 'beneficio', label: 'Benefício', isScore: true },
          { id: 'resultado', label: 'Resultado Final', isScore: false },
        ];
        
        migratedData = { opportunities, columns: defaultColumns };
      } else if (toolId === 'effortImpact') {
        const ideas = getField('ideas') || [];
        console.log('💡 Ideias encontradas:', ideas.length);
        migratedData = {
          actions: ideas.map((idea: any, idx: number) => ({
            id: String(idx + 1),
            label: `X${idx + 1}`,
            description: idea.text || '',
            effort: 3,
            impact: 3,
          }))
        };
      } else if (['measureAdkar', 'analyzeAdkar', 'improveAdkar', 'controlAdkar'].includes(toolId)) {
        const stakeholders = getField('stakeholders') || [];
        console.log('👥 Stakeholders encontrados:', stakeholders.length);
        migratedData = { stakeholders };
      }
      
      console.log('✅ Dados migrados:', migratedData);

      const normalized = normalizeInitialData(toolId, migratedData);
      console.log('💾 Salvando dados migrados:', normalized);
      
      handleToolSave(normalized);
      setClearKey(prev => prev + 1);

      toast.success(mensagemSucesso);
    } catch (error: any) {
      console.error("Erro ao sincronizar dados:", error);
      toast.error(error.message || "Erro ao sincronizar dados.");
    } finally {
      setIsGeneratingData(false);
    }
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
        setClearKey(prev => prev + 1);
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
                id: crypto.randomUUID(),
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
        setClearKey(prev => prev + 1);
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

    if (toolId === 'processMap' && customContext?.useSipocData) {
      setIsGeneratingData(true);
      try {
        const sipocData = getToolDataByPrefix(allProjectData, 'sipoc');
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

        const nodes = processSteps.map((step: string, index: number) => {
          const type = index === 0 ? 'start' : (index === processSteps.length - 1 ? 'end' : 'step');
          const isEnd = type === 'end';
          return {
            id: `node-${index}`,
            type,
            position: { 
              x: startX + index * (nodeWidth + spacing), 
              y: laneHeight / 2 
            },
            data: { 
              label: step, 
              isEnd,
              fontSize: 12 
            }
          };
        });

        const edges = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          edges.push({
            id: `edge-${i}`,
            source: nodes[i].id,
            target: nodes[i+1].id,
            type: 'smoothstep'
          });
        }

        const generatedData = { 
          nodes, 
          edges,
          isGenerated: true
        };

        setLocalData(generatedData);
        setClearKey(prev => prev + 1);
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
      
      // Special handling for gut and rab to pull from improvementIdea
      if ((toolId === 'gut' || toolId === 'rab') && allProjectData) {
        const ideaData = getToolDataByPrefix(allProjectData, 'improvementIdea');
        targetContext = {
          improvementIdea: ideaData
        };
      }

      // Special handling for brief to provide the exact context the AI needs
      if (toolId === 'brief' && allProjectData) {
        const selectedProjectId = customContext?.title || customContext?.description || '';
        const ideaData = getToolDataByPrefix(allProjectData, 'improvementIdea');
        const gutDataObj = getToolDataByPrefix(allProjectData, 'gut');
        const rabDataObj = getToolDataByPrefix(allProjectData, 'rab');
        
        targetContext = {
          selectedProject: selectedProjectId,
          title: selectedProjectId,
          projectDetails: customContext || {},
          generatedProjects: ideaData?.generatedProjects || ideaData?.toolData?.generatedProjects || [],
          gutOpportunities: gutDataObj?.opportunities || gutDataObj?.toolData?.opportunities || [],
          rabOpportunities: rabDataObj?.opportunities || rabDataObj?.toolData?.opportunities || [],
          gutData: (gutDataObj?.opportunities || gutDataObj?.toolData?.opportunities || []).find(
            (p: any) => p.description === selectedProjectId || p.title === selectedProjectId
          ),
          rabData: (rabDataObj?.opportunities || rabDataObj?.toolData?.opportunities || []).find(
            (p: any) => p.description === selectedProjectId || p.title === selectedProjectId
          ),
        };
      }

      // Special handling for stakeholders to pull from Charter or Brief
      if ((toolId === 'stakeholders' || toolId === 'stakeholderAnalysisPMI' || toolId === 'stakeholderAdkar' || toolId === 'measureAdkar') && allProjectData) {
        targetContext = {
          charter: getToolDataByPrefix(allProjectData, 'charter'),
          projectCharterPMI: getToolDataByPrefix(allProjectData, 'projectCharterPMI'),
          stakeholderAdkar: getToolDataByPrefix(allProjectData, 'stakeholderAdkar'),
          measureAdkar: getToolDataByPrefix(allProjectData, 'measureAdkar'),
          brief: getToolDataByPrefix(allProjectData, 'brief')
        };
      }

      // SIPOC — era a única ferramenta de IA sem bloco de contexto: o botão gerava
      // sem receber nada do projeto. Puxa o Entendendo o Problema (é dele que saem
      // processo, envolvidos e problema) e o Charter quando existir.
      if (toolId === 'sipoc' && allProjectData) {
        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          charter: getToolDataByPrefix(allProjectData, 'charter'),
        };
      }

      // Special handling for brainstorming to pull exclusively from requested sources
      if (toolId === 'brainstorming' && allProjectData) {
        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          sipoc: getToolDataByPrefix(allProjectData, 'sipoc'),
          processMap: getToolDataByPrefix(allProjectData, 'processMap')
        };
      }

      if (toolId === 'effortImpact' && allProjectData) {
        // Find the correct brainstorming data regardless of phase
        targetContext = getToolDataByPrefix(allProjectData, 'brainstorming');
      }

      if (toolId === 'measureMatrix' && allProjectData) {
        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          sipoc: getToolDataByPrefix(allProjectData, 'sipoc'),
          processMap: getToolDataByPrefix(allProjectData, 'processMap'),
          measureIshikawa: getToolDataByPrefix(allProjectData, 'measureIshikawa')
        };
      }

      if (toolId === 'dataCollection' && allProjectData) {
        // HARD FILTER: Only send items that are explicitly selected in the measureMatrix
        const matrixData = getToolDataByPrefix(allProjectData, 'measureMatrix');
        const filteredMatrix = {
          ...matrixData,
          causes: (matrixData?.causes || []).filter((item: any) => item.selected === true)
        };

        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          sipoc: getToolDataByPrefix(allProjectData, 'sipoc'),
          processMap: getToolDataByPrefix(allProjectData, 'processMap'),
          measureMatrix: filteredMatrix
        };
      }

      if (toolId === 'statisticalAnalysis' && allProjectData) {
        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          dataCollection: getToolDataByPrefix(allProjectData, 'dataCollection')
        };
      }

      if (toolId === 'brainstormingImprove' && allProjectData) {
        const validationData = getToolDataByPrefix(allProjectData, 'causeValidation');
        // BUG QUE IGNORAVA A VALIDACAO INTEIRA: o Firestore guarda
        // {aiReport, toolData:{rows:[...]}}, mas a checagem lia validationData.rows
        // direto — sempre undefined, sempre false. Resultado: caia no ramo de
        // baixo e mandava a Espinha de Peixe inteira pra IA, que gerava solucao
        // pra causa que o aluno nunca confirmou e ignorava as que ele confirmou.
        // getConfirmedCauseRows ja desembrulha; a deteccao tambem precisa.
        const validationRows = validationData?.toolData?.rows ?? validationData?.rows;
        const hasValidationTable = Array.isArray(validationRows);
        // A IA precisa saber o que JA existe, senao a segunda geracao devolve as
        // mesmas causas com a solucao reescrita com outras palavras em vez de
        // cobrir as causas que ainda estao sem ideia nenhuma.
        const jaExistentes = ((localData?.toolData || localData || {})?.ideas || [])
          .map((idea: any) => ({
            causeSourceId: idea?.causeSourceId || '',
            category: idea?.category || '',
            text: idea?.text || '',
          }))
          .filter((idea: any) => idea.text);
        targetContext = hasValidationTable ? {
          improvementGoal: customContext?.improvementGoal || '',
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          validatedCauses: getConfirmedCauseRows(validationData),
          existingIdeas: jaExistentes,
        } : {
          improvementGoal: customContext?.improvementGoal || '',
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          directObservation: getToolDataByPrefix(allProjectData, 'directObservation'),
          fiveWhys: getToolDataByPrefix(allProjectData, 'fiveWhys'),
          measureIshikawa: getToolDataByPrefix(allProjectData, 'measureIshikawa'),
          measureMatrix: getToolDataByPrefix(allProjectData, 'measureMatrix'),
          statisticalAnalysis: getToolDataByPrefix(allProjectData, 'statisticalAnalysis'),
          dataNature: getToolDataByPrefix(allProjectData, 'dataNature'),
        };

        // Uma causa confirmada, uma chamada de IA. Antes disto a IA recebia as
        // 5 causas de uma vez e tinha que devolver sourceId e X certos pra cada
        // uma; quando errava uma, o realinhamento por texto/codigo nao sempre
        // corrigia, e a causa ficava sem solucao na tela. Pedindo uma causa por
        // vez a confusao nao pode acontecer — so ha uma causa no contexto.
        const causasConfirmadasAgora: any[] = hasValidationTable && Array.isArray(targetContext.validatedCauses)
          ? targetContext.validatedCauses
          : [];
        if (causasConfirmadasAgora.length > 0) {
          const anterior = localData?.toolData || localData || {};
          const ideiasAtuais = alinharIdeiasAsCausas(
            Array.isArray(anterior.ideas) ? anterior.ideas : [],
            causasConfirmadasAgora,
          );
          const faltantes = causasSemIdeia(ideiasAtuais, causasConfirmadasAgora);

          if (faltantes.length === 0) {
            toast.info('Todas as causas confirmadas já têm pelo menos uma solução.');
            return;
          }

          const geradas = await Promise.all(faltantes.map(async (cause: any) => {
            const contextoIsolado = { ...targetContext, validatedCauses: [cause] };
            const resposta = await generateToolData(
              toolId,
              toolName,
              previousToolName || null,
              contextoIsolado,
              { name: projectName, description: project.description },
              contextoIsolado,
            );
            const respostaNormalizada = normalizeInitialData(toolId, resposta);
            const primeira = (respostaNormalizada?.ideas || []).find((idea: any) => String(idea?.text || '').trim());
            return primeira ? {
              ...primeira,
              id: primeira.id || `${Date.now()}-${cause.sourceId}`,
              causeSourceId: cause.sourceId,
              category: cause.x,
            } : null;
          }));

          const novasIdeias = geradas.filter(Boolean);
          const combinadas = [...ideiasAtuais, ...novasIdeias];
          const aindaFaltantes = causasSemIdeia(combinadas, causasConfirmadasAgora);
          if (aindaFaltantes.length > 0) {
            throw new Error(`A IA não conseguiu gerar uma solução válida para: ${aindaFaltantes.map((c: any) => c.x).join(', ')}. Tente novamente.`);
          }

          // Preserva tudo que ja existia — inclusive ideia de causa que hoje
          // nao esta mais confirmada — e so acrescenta a que faltava.
          const normalizedFinal = {
            ...anterior,
            brainstormingTopic: targetContext.improvementGoal || anterior.brainstormingTopic || '',
            brainstormingType: 'Identificar melhor solução',
            ideas: combinadas,
          };
          setLocalData(normalizedFinal);
          setClearKey(prev => prev + 1);
          onSave({ toolData: normalizedFinal, aiReport: aiReport, isGenerated: true });
          toast.success(`${novasIdeias.length} ${novasIdeias.length === 1 ? 'solução nova gerada' : 'soluções novas geradas'}. As causas já cobertas não mudaram.`);
          return;
        }
      }

      // Matriz de validação: reúne as evidências de todas as fontes sem mandar
      // imagens, planilhas ou o projeto inteiro para a IA. A matriz é derivada;
      // os dados originais permanecem intocados.
      if (toolId === 'causeValidation' && allProjectData) {
        targetContext = {
          projectIndicatorY: getToolDataByPrefix(allProjectData, 'brief'),
          candidates: buildCauseEvidenceCandidates(allProjectData),
        };
      }

      // Mapa Estatístico analisa UM par X x Y por vez — nao a lista inteira.
      // O X e o Y vem do que o aluno escolheu na tela (customContext); antes o
      // codigo mandava todos os itens do Plano de Coleta e pedia uma analise por
      // item, o que nao e o proposito da ferramenta.
      if (toolId === 'dataNature' && allProjectData) {
        targetContext = {
          variavelX: customContext?.variavelX || '',
          variavelY: customContext?.variavelY || '',
          contexto: customContext?.contexto || '',
          brief: getToolDataByPrefix(allProjectData, 'brief'),
        };
      }

      if (toolId === 'plan5w2h' && allProjectData) {
        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          fmea: getToolDataByPrefix(allProjectData, 'fmea'),
          effortImpact: getToolDataByPrefix(allProjectData, 'effortImpact'),
          fiveWhys: getToolDataByPrefix(allProjectData, 'fiveWhys'),
          improveAdkar: getToolDataByPrefix(allProjectData, 'improveAdkar'),
        };
      }

      if (toolId === 'fiveWhys' && allProjectData) {
        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          measureIshikawa: getToolDataByPrefix(allProjectData, 'measureIshikawa')
        };
      }

      if (toolId === 'qualitativeAnalysis' && allProjectData) {
        targetContext = {
          brief: getToolDataByPrefix(allProjectData, 'brief'),
          sipoc: getToolDataByPrefix(allProjectData, 'sipoc'),
          processMap: getToolDataByPrefix(allProjectData, 'processMap'),
          measureMatrix: getToolDataByPrefix(allProjectData, 'measureMatrix')
        };
      }

      // Todas as ferramentas agora usam Anthropic via aiRouter (location: 'fill-tool').
      const generatedData = await generateToolData(
        toolId,
        toolName,
        previousToolName || null,
        targetContext,
        { name: projectName, description: project.description },
        // Para soluções, enviamos somente as evidências selecionadas acima. Isso
        // reduz ruído e impede que informações sem relação contaminem as ideias.
        (toolId === 'brainstormingImprove' || toolId === 'causeValidation') ? targetContext : allProjectData
      );
      let normalized = normalizeInitialData(toolId, generatedData);

      if (toolId === 'brainstormingImprove') {
        const causasConfirmadas = Array.isArray(targetContext?.validatedCauses)
          ? targetContext.validatedCauses
          : [];
        normalized.ideas = alinharIdeiasAsCausas(normalized?.ideas || [], causasConfirmadas);

        const anterior = localData?.toolData || localData || {};
        const ideiasJaExistentes = alinharIdeiasAsCausas(anterior?.ideas || [], causasConfirmadas);
        const faltantes = causasSemIdeia(
          [...ideiasJaExistentes, ...normalized.ideas],
          causasConfirmadas,
        );

        // O prompt pede uma ideia para cada causa, mas a cobertura não pode
        // depender apenas da obediência do modelo. Se faltar algum X, fazemos
        // uma geração curta e isolada para ele; como o contexto contém uma
        // única causa, a associação fica inequívoca.
        if (faltantes.length > 0) {
          const complementos = await Promise.all(faltantes.map(async (cause: any) => {
            const resposta = await generateToolData(
              toolId,
              toolName,
              previousToolName || null,
              { ...targetContext, validatedCauses: [cause] },
              { name: projectName, description: project.description },
              { ...targetContext, validatedCauses: [cause] },
            );
            const respostaNormalizada = normalizeInitialData(toolId, resposta);
            const primeira = (respostaNormalizada?.ideas || []).find((idea: any) => String(idea?.text || '').trim());
            return primeira ? {
              ...primeira,
              causeSourceId: cause.sourceId,
              category: cause.x,
            } : null;
          }));
          normalized.ideas = [...normalized.ideas, ...complementos.filter(Boolean)];

          const aindaFaltantes = causasSemIdeia(
            [...ideiasJaExistentes, ...normalized.ideas],
            causasConfirmadas,
          );
          if (aindaFaltantes.length > 0) {
            throw new Error(`A IA não conseguiu gerar uma solução válida para: ${aindaFaltantes.map((cause) => cause.x).join(', ')}. Tente novamente.`);
          }
        }
      }

      if (toolId === 'causeValidation') {
        const anterior = localData?.toolData || localData || {};
        const anteriores = Array.isArray(anterior.rows) ? anterior.rows : [];
        const anterioresPorId = new Map<string, any>(anteriores.map((row: any) => [String(row.sourceId), row] as [string, any]));
        const candidatos = Array.isArray(targetContext?.candidates)
          ? targetContext.candidates
          : buildCauseEvidenceCandidates(allProjectData);
        const geradasPorId = new Map<string, any>((Array.isArray(normalized?.rows) ? normalized.rows : [])
          .filter((row: any) => row?.sourceId)
          .map((row: any) => [String(row.sourceId), row] as [string, any]));

        normalized = {
          version: 1,
          updatedAt: new Date().toISOString(),
          projectIndicatorY: normalized?.projectIndicatorY || targetContext?.projectIndicatorY || '',
          rows: candidatos.map((candidate: any) => {
            const ai = geradasPorId.get(String(candidate.sourceId)) || {};
            const anteriorRow = anterioresPorId.get(String(candidate.sourceId)) || {};
            const confirmadaNaOrigem = candidate.sourceConfirmed === true;
            const humanDecision = anteriorRow.humanDecision || (confirmadaNaOrigem ? 'contribui' : null);
            return {
              ...candidate,
              aiDecision: ai.aiDecision,
              aiReason: ai.aiReason,
              confidence: ai.confidence,
              humanDecision,
              confirmed: anteriorRow.confirmed === true || confirmadaNaOrigem,
              includeInBrainstorming: anteriorRow.humanDecision
                ? anteriorRow.includeInBrainstorming === true
                : confirmadaNaOrigem,
            };
          }),
        };
      }

      if (toolId === 'brainstormingImprove') {
        const anterior = localData?.toolData || localData || {};
        const causasConfirmadas = Array.isArray(targetContext?.validatedCauses)
          ? targetContext.validatedCauses
          : [];
        // Corrige tambem ideias antigas salvas com categoria abreviada (por
        // exemplo, "X3.1") antes de verificar duplicidade e montar a tela.
        const anteriores = alinharIdeiasAsCausas(
          Array.isArray(anterior.ideas) ? anterior.ideas : [],
          causasConfirmadas,
        );
        const topicoAtual = customContext?.improvementGoal || normalized.brainstormingTopic || anterior.brainstormingTopic || '';
        // O identificador da causa faz parte da chave. Duas causas diferentes
        // podem receber propostas parecidas sem que uma apague a outra.
        const chaveDaIdeia = (idea: any) => `${String(idea?.causeSourceId || idea?.category || '').trim().toLocaleLowerCase('pt-BR')}|${String(idea?.topic || '').trim().toLocaleLowerCase('pt-BR')}|${String(idea?.text || '').trim().toLocaleLowerCase('pt-BR')}`;
        const chavesExistentes = new Set(anteriores.map(chaveDaIdeia));
        const geradas = (Array.isArray(normalized.ideas) ? normalized.ideas : [])
          .map((idea: any, index: number) => ({
            ...idea,
            id: `${Date.now()}-ai-${index}`,
            author: 'IA LBW',
            topic: topicoAtual,
          }))
          .filter((idea: any) => {
            const chave = chaveDaIdeia(idea);
            if (chavesExistentes.has(chave)) return false;
            chavesExistentes.add(chave);
            return true;
          });
        normalized = {
          ...normalized,
          brainstormingType: 'Identificar melhor solução',
          brainstormingTopic: topicoAtual,
          // Cada novo tema acrescenta sugestões sem apagar as ideias dos temas
          // anteriores nem as inclusões manuais do aluno.
          ideas: [...anteriores, ...geradas],
        };
      }

      // Mapa Estatístico analisa um X por vez, entao cada geracao ACUMULA em
      // vez de substituir — senao a analise anterior seria perdida a cada X novo.
      // E a IA devolve so `analyses`: sem preservar as listas, o dropdown de X
      // (e o Y) sumiriam depois da primeira analise.
      if (toolId === 'dataNature') {
        const anterior = localData?.toolData || localData || {};
        const jaFeitas = Array.isArray(anterior.analyses) ? anterior.analyses : [];
        const novas = Array.isArray(normalized.analyses) ? normalized.analyses : [];
        // Uma causa composta pode gerar duas relações: a principal contra o Y
        // do projeto e a estratificação medida por grupo. A função da análise,
        // e não apenas o nome bruto das variáveis, identifica cada resultado.
        const chave = (a: any) => `${a?.sourceCause || a?.variableX?.sourceName || a?.variableX?.name || ''}|${a?.projectY || a?.variableY?.sourceName || a?.variableY?.name || ''}|${a?.analysisRole || 'principal'}`;
        const anterioresPorChave = new Map<string, any>(jaFeitas.map((a: any) => [chave(a), a] as [string, any]));
        const novasComDecisaoHumana = novas.map((a: any, index: number) => {
          const existente = anterioresPorChave.get(chave(a));
          return {
            ...a,
            id: existente?.id || `${Date.now()}-${index}-${a?.analysisRole || 'principal'}`,
            // Regerar a recomendação não apaga uma confirmação feita pelo aluno.
            rootCauseConfirmed: existente?.rootCauseConfirmed === true,
          };
        });
        const substituidas = new Set(novasComDecisaoHumana.map(chave));
        normalized = {
          ...anterior,
          ...normalized,
          // Reanalisar o mesmo par X x Y troca o resultado em vez de duplicar.
          analyses: [...jaFeitas.filter((a: any) => !substituidas.has(chave(a))), ...novasComDecisaoHumana],
          variaveisDisponiveis: anterior.variaveisDisponiveis || [],
          variaveisY: anterior.variaveisY || [],
          yEscolhido: anterior.yEscolhido || '',
        };
      }

      setLocalData(normalized);
      setClearKey(prev => prev + 1); // Force remount to pass down new generated data to internal useState
      onSave({
        toolData: normalized,
        aiReport: aiReport,
        isGenerated: true
      });
    } catch (error: any) {
      console.error("Erro ao gerar dados com IA:", error);
      setError(error.message || "Ocorreu um erro ao gerar os dados com IA.");
    } finally {
      setIsGeneratingData(false);
    }
  };

  // handleGenerateAI removido em 2026-05-17 — botão estava escondido por {false &&}
  // e a função generateAIToolReport (Claude/Gemini) foi descontinuada.

  const handleSaveEditedReport = () => {
    setAiReport(editedReport);
    setIsEditingReport(false);
    onSave({
      toolData: localData,
      aiReport: editedReport
    });
  };

  // Ligação efetiva desta ferramenta NESTE projeto. O que a iniciativa declara em
  // `toolLinks` vence; sem declaração, cai no mapa global de sempre (services/toolLinks.ts),
  // então projeto que não declarou nada se comporta exatamente como antes.
  const toolLink = useMemo(
    () => resolveToolLink(toolId, initiative, initiativeConfigs),
    [toolId, initiative, initiativeConfigs]
  );

  const toolNameOf = (id: string) =>
    (availableTools || []).find((t: any) => t.id === id)?.name || id;

  // Rótulo da fonte, montado pelo nome da ferramenta que o consultor ligou nesta.
  const linkSourceLabel = toolLink?.from.map(toolNameOf).join(' e ') || '';

  // Basta UMA fonte preenchida pro card aparecer.
  const linkHasContent = !!toolLink && toolLink.from.some(
    (id) => sourceHasContent(getToolDataByPrefix(allProjectData, id))
  );

  // Quantos itens da ferramenta anterior ainda nao chegaram aqui. Alimenta o
  // aviso de desatualizado: sem ele o aluno mexe na Espinha de Peixe e nao tem
  // como saber que a etapa seguinte ficou para tras.
  /**
   * A ferramenta ja mostra um card de IA dela mesma?
   *
   * Espinha de Peixe e Brainstorming trazem um card proprio dentro do componente
   * ("Distribuir causas com IA", "Gerar causas potenciais com IA"). Ele e melhor
   * que o generico: diz quantas causas vem e de onde, e ACRESCENTA em vez de
   * sobrescrever o que ja esta na tela. So que o card generico daqui nao sabia
   * disso e aparecia junto — dois botoes de IA na mesma ferramenta.
   *
   * A condicao abaixo repete a do componente de proposito. Quando ela NAO vale
   * (o consultor ligou esta ferramenta a outra origem, por exemplo), o card
   * generico volta a aparecer; senao a ferramenta ficaria sem botao nenhum.
   */
  const temCardProprioDeIA = useMemo(() => {
    const conteudo = (id: string) => {
      const bruto = getToolDataByPrefix(allProjectData, id);
      return bruto?.toolData || bruto || {};
    };

    if (toolId === 'measureIshikawa') {
      const ideias = conteudo('brainstorming').ideas;
      return Array.isArray(ideias)
        && ideias.some((ideia: any) => String(ideia?.text || '').trim());
    }

    if (toolId === 'brainstorming') {
      const nodes = conteudo('processMap').nodes;
      return Array.isArray(nodes) && nodes
        .filter((n: any) => n?.type !== 'lane')
        .some((n: any) => {
          const rotulo = String(n?.data?.label || '').trim();
          return rotulo && rotulo.toLocaleLowerCase('pt-BR') !== 'nova raia';
        });
    }

    return false;
  }, [toolId, allProjectData]);

  const novidadesPendentes = useMemo(() => {
    const sincroniza = TOOLS_QUE_SINCRONIZAM_LISTA.includes(toolId)
      || toolId === 'measureMatrix'
      || toolId === 'measureIshikawa';
    const origemId = toolLink?.from?.[0];
    if (!sincroniza || !origemId) return 0;
    const origem = getToolDataByPrefix(allProjectData, origemId);
    if (!origem) return 0;
    return novidadesDaOrigem(toolId, origem, localData).length;
  }, [toolId, toolLink, allProjectData, localData]);

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
        if (toolId === 'brief') {
          return !data.answers || Object.values(data.answers).every((v: any) => !v);
        }

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
          // Lista ja trazida conta como conteudo: faz o card verde de migrar sumir
          // e dar lugar ao dropdown de escolher um X por vez.
          if ((data.variaveisDisponiveis || []).length > 0) return false;
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
          if ((data.variaveisDisponiveis || []).length > 0) return false;
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
          // Lista ja trazida da ferramenta de origem conta como conteudo: e o que
          // faz o card de migrar sumir e dar lugar ao dropdown.
          if ((data.variaveisDisponiveis || []).length > 0) return false;
          const observations = data.observations || [];
          if (observations.length === 0) return true;
          return observations.every((o: any) => !o.variable && !o.observationDescription);
        }

        if (toolId === 'processMap' || toolId === 'processModeling') {
          return !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0;
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
    await routeExportPPT({
      toolId,
      project,
      localData,
      aiReport,
      availableTools,
      phases,
      initiativeName,
      initiativeConfigs,
      fishboneRef,
    });
  };

  const exportExcel = async () => {
    if (toolId === 'charter') {
      await generateProjectCharterExcel(project, localData);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    const PRESENTATION_ENABLED = ['measureIshikawa'];
    if (PRESENTATION_ENABLED.includes(toolId)) {
      setShowInlinePresentation(true);
      return;
    }
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
        <div 
          className="flex items-center justify-between px-6 py-4 mb-6 rounded-2xl shadow-sm"
          style={{ backgroundColor: headerColor, color: headerTextColor }}
        >
          <div className="flex items-center gap-4">
            {companyLogoUrl && (
              <img src={companyLogoUrl} alt="Logo Empresa" className="h-10 w-auto object-contain bg-white/10 rounded-lg p-1" />
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                {projectName || companyName || 'Meu Projeto'}
              </p>
              <h2 className="text-lg font-black tracking-tight">{toolName}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botão Salvar */}
            <button
              onClick={() => {
                const saveBtn = document.querySelector('[data-save-trigger]') as HTMLButtonElement;
                if (saveBtn) saveBtn.click();
              }}
              className="flex items-center gap-2 px-5 py-2 bg-white text-blue-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all active:scale-95 border-none cursor-pointer"
            >
              <Save size={14} />
              Salvar
            </button>

            {/* Botão Excluir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearData();
              }}
              className="flex items-center gap-2 px-5 py-2 bg-white/20 text-white border-2 border-white/20 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/30 transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 size={14} />
              Excluir
            </button>

            {/* Indicador de status */}
            {isSaved ? (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={13} className="text-green-500" />
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Salvo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                <AlertTriangle size={13} className="text-gray-400" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Não salvo</span>
              </div>
            )}
          </div>
        </div>

      {/* AI Block — só aparece se a ferramenta FONTE já existe e tem dados salvos.
          Antes checava previousToolData (a ferramenta anterior por ORDEM da fase, não a
          fonte declarada) — por isso o SIPOC mostrava o bloco mesmo sem Charter preenchido.
          Agora a fonte vem de `toolLink`, que respeita o que o projeto declarou. */}
      {isToolEmpty() && toolLink?.mode === 'ai' && !temCardProprioDeIA && toolId !== 'improvementIdea' && toolId !== 'brief' && toolId !== 'dataNature' && toolId !== 'brainstormingImprove' && toolId !== 'causeValidation' && showAIPrompt && linkHasContent && (
        <AIPromptCard
            toolId={toolId}
            toolName={toolName}
            previousToolName={linkSourceLabel}
            onAction={(customContext) => handleGenerateData(customContext)}
            isGenerating={isGeneratingData}
            hasPreviousData={!!previousToolData}
            allProjectData={allProjectData}
        />
      )}

      {/* Bloco de sincronizacao — so aparece se a ferramenta FONTE existe E esta
          preenchida. Nas ferramentas que trabalham em cima da LISTA DE X, o botao
          fica disponivel a jornada inteira: sincronizar acrescenta o que falta sem
          tocar no que ja foi preenchido, entao nao ha risco em deixa-lo visivel.
          Nas demais ele ainda substitui, e por isso continua so com a ferramenta
          vazia — ate cada uma ganhar a sua propria logica de acrescentar. */}
      {(TOOLS_QUE_SINCRONIZAM_LISTA.includes(toolId) || isToolEmpty()) && toolLink?.mode === 'migrate' && showAIPrompt && linkHasContent && (
        <MigratePromptCard
          toolId={toolId}
          toolName={toolName}
          sourceName={linkSourceLabel}
          onMigrate={() => (isToolEmpty()
            ? handleMigrateData(toolLink.from[0])
            : abrirRevisaoSync(toolLink.from[0]))}
          isMigrating={isGeneratingData}
          hasSourceData={true}
          compacto={!isToolEmpty()}
          novidades={novidadesPendentes}
        />
      )}

      {/* Matriz Causa e Efeito: a IA monta a matriz na primeira vez (card acima).
          Depois disso, causa nova da Espinha de Peixe entra por copia direta, sem
          a IA encostar nas notas ja dadas — por isso esta barra vive fora do
          fluxo de 'migrate' e so aparece com a matriz ja preenchida. */}
      {(toolId === 'measureMatrix' || toolId === 'measureIshikawa') && !isToolEmpty() && toolLink?.from?.[0] && showAIPrompt && linkHasContent && (
        <MigratePromptCard
          toolId={toolId}
          toolName={toolName}
          sourceName={linkSourceLabel}
          onMigrate={() => abrirRevisaoSync(toolLink.from[0])}
          isMigrating={isGeneratingData}
          hasSourceData={true}
          compacto={true}
          novidades={novidadesPendentes}
        />
      )}

      {/* Conferencia antes de sincronizar. A IA reescreve a mesma causa com
          outras palavras, entao trazer tudo em silencio duplicaria o que o aluno
          ja tem escrito. Aqui ele ve item por item, e o que parece repetido ja
          vem desmarcado. */}
      {revisaoSync && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <p className="m-0 text-[11px] font-black uppercase tracking-widest text-blue-700">
            Conferir antes de trazer
          </p>
          <p className="mt-2 mb-4 text-sm leading-relaxed text-gray-600">
            Marque o que é realmente novo. Nada do que já está em <strong>{toolName}</strong> é alterado.
          </p>

          <div className="flex flex-col gap-2">
            {revisaoSync.itens.map((linha, i) => (
              <label
                key={`${linha.texto}-${i}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  revisaoSync.marcados[i]
                    ? 'border-blue-200 bg-blue-50/60'
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={revisaoSync.marcados[i]}
                  onChange={() => setRevisaoSync((r) => (r ? {
                    ...r,
                    marcados: r.marcados.map((m, j) => (j === i ? !m : m)),
                  } : r))}
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span className="flex-1">
                  <span className="block text-sm text-gray-800">{linha.texto}</span>
                  {linha.item?.category && (
                    <span className="mt-1 block text-[11px] uppercase tracking-widest text-gray-400">
                      {String(linha.item.category)}
                    </span>
                  )}
                  {linha.parecidoCom && (
                    <span className="mt-1 block text-xs text-amber-700">
                      Parece com o que já está aqui: “{linha.parecidoCom}”
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={confirmarRevisaoSync}
              disabled={isGeneratingData || !revisaoSync.marcados.some(Boolean)}
              className={cn(
                'flex items-center gap-2 rounded-lg border-none px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                isGeneratingData || !revisaoSync.marcados.some(Boolean)
                  ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                  : 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              )}
            >
              {isGeneratingData
                ? <><Loader2 className="animate-spin" size={14} /> Trazendo...</>
                : <><ArrowDownToLine size={14} /> Trazer {revisaoSync.marcados.filter(Boolean).length}</>}
            </button>
            <button
              onClick={() => setRevisaoSync(null)}
              className="cursor-pointer rounded-lg border-none bg-transparent px-2 py-2 text-[11px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Brief: um card só, em duas etapas. O Brief precisa de um passo a mais que as
          outras ferramentas — escolher QUAL projeto da fonte virar brief — mas isso não
          justifica dois cards competindo na tela. Etapa 1 puxa os títulos, etapa 2 gera.
          O rótulo sai de `linkSourceLabel`, ou seja, da ligação que o consultor declarou. */}
      {isToolEmpty() && toolId === 'brief' && showAIPrompt && linkHasContent && (
        <div className="bg-emerald-50 p-8 rounded-2xl border border-emerald-100 mb-10 shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-100/50 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-emerald-500" />
              <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                Gerar {toolName} a partir de {linkSourceLabel}
              </p>
            </div>

            {briefTitlesPulled.length === 0 ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <p className="text-sm text-gray-600 leading-relaxed flex-1">
                  Puxe os projetos de <strong>{linkSourceLabel}</strong> e escolha qual deles
                  vira o {toolName.toLowerCase()}.
                </p>
                <button
                  onClick={handleBriefPullTitles}
                  className="min-w-[240px] h-16 flex items-center justify-center gap-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl border-none cursor-pointer active:scale-95 bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200"
                >
                  <ArrowDownToLine size={20} />
                  <span>Puxar Projetos</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <select
                  value={briefSelectedTitle}
                  onChange={(e) => setBriefSelectedTitle(e.target.value)}
                  className="flex-1 px-4 py-4 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Escolha um projeto da lista --</option>
                  {briefTitlesPulled.map((p, idx) => (
                    <option key={idx} value={p.title}>
                      {p._pontos != null ? `${p.title}  ·  ${p._fonte}: ${p._pontos}` : p.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBriefGenerate}
                  disabled={isGeneratingData || !briefSelectedTitle}
                  className={cn(
                    "min-w-[200px] h-16 flex items-center justify-center gap-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl border-none active:scale-95",
                    isGeneratingData || !briefSelectedTitle
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 cursor-pointer"
                  )}
                >
                  {isGeneratingData ? (
                    <><Loader2 className="animate-spin" size={20} /><span>Gerando...</span></>
                  ) : (
                    <><Sparkles size={20} /><span>Gerar</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

        <div className="p-8" key={`${toolId}-${clearKey}`}>
          {children({ 
            onSave: handleToolSave, 
            initialData: normalizeInitialData(toolId, localData),
            onGenerateAI: handleGenerateData,
            isGeneratingAI: isGeneratingData,
            onClearAIData: handleClearData,
            allProjectData: allProjectData
          })}
        </div>
      </div>

      <div className="border-t border-gray-100 mt-6 pt-5 px-8 pb-6">
        <div className="flex items-center justify-between">
          
          {/* Label */}
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Exportar ferramenta:
          </span>

          {/* Botões de exportação */}
          <div className="flex items-center gap-2">

            {/* PDF — só no Mapa dos 90 Dias (substitui o PPT nessa ferramenta) */}
            {toolId === 'mapa90dias' && (
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                title="Imprimir / Gerar PDF"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border-none bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100 cursor-pointer"
              >
                {isPrinting ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                PDF
              </button>
            )}

            {/* Word */}
            {false && (
              <button
                onClick={exportWord}
                disabled={!isSaved}
                title={!isSaved ? "Salve primeiro para exportar" : "Gerar relatório Word"}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border-none",
                  !isSaved
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-blue-700 text-white hover:bg-blue-800 shadow-lg shadow-blue-100 cursor-pointer"
                )}
              >
                <FileDown size={15} />
                Word
              </button>
            )}

            {/* PPT — escondido no Mapa dos 90 Dias (lá o export é PDF) */}
            {toolId !== 'mapa90dias' && (
            <button
              onClick={exportPPT}
              disabled={!isSaved}
              title={!isSaved ? "Salve primeiro para exportar" : "Gerar apresentação PowerPoint"}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border-none",
                !isSaved
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-100 cursor-pointer"
              )}
            >
              <Presentation size={15} />
              Gerar PPT (versão beta)
            </button>
            )}

            {/* Excel (Special case for Charter) */}
            {false && toolId === 'charter' && (
              <button
                onClick={exportExcel}
                disabled={!isSaved}
                title={!isSaved ? "Salve primeiro para exportar" : "Gerar Excel"}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border-none",
                  !isSaved
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100 cursor-pointer"
                )}
              >
                <FileSpreadsheet size={15} />
                Excel
              </button>
            )}

          </div>
        </div>

        {/* Dica quando não salvo */}
        {!isSaved && (
          <p className="text-[11px] text-gray-400 text-right mt-2 font-bold">
            Salve a ferramenta para habilitar a exportação
          </p>
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
                    {false && (
                      <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-700 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-100 bg-white cursor-pointer disabled:opacity-50"
                      >
                        {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir
                      </button>
                    )}
                    {false && (
                      <button
                        onClick={exportWord}
                        className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-700 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-100 bg-white cursor-pointer"
                      >
                        <FileDown size={16} /> Word
                      </button>
                    )}
                    <button
                      onClick={exportPPT}
                      className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-700 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-100 bg-white cursor-pointer"
                    >
                      <Presentation size={16} /> Gerar PPT (versão beta)
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

      {showInlinePresentation && toolId === 'measureIshikawa' && (
        <InlinePresentationShell
          project={project}
          toolId={toolId}
          toolData={localData}
          toolTitle="Análise de causa raiz — Diagrama de Ishikawa"
          toolPhase="Analyze"
          initialAnalysis={localData?.aiExecutiveAnalysis || ''}
          onAnalysisChange={(text) => setLocalData({ ...localData, aiExecutiveAnalysis: text })}
          onClose={() => setShowInlinePresentation(false)}
        >
          <IshikawaSlide toolData={localData} />
        </InlinePresentationShell>
      )}

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
