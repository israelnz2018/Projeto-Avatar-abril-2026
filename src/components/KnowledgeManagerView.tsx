import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  Trash2,
  Save,
  X,
  Video,
  Folder,
  Edit2,
  ListVideo,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GripVertical,
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, youtubeThumb } from '@/src/lib/utils';
import { db, auth } from '../lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { useConsultor } from '../contexts/ConsultorContext';
import {
  saveKnowledge,
  getRecentKnowledge,
  getAllKnowledge,
  KnowledgeEntry,
  deleteKnowledge,
  updateKnowledge,
  deleteCourse,
  updateCourseName,
  deletePlaylist,
  updatePlaylistName,
  KNOWLEDGE_COLLECTION,
  INTRO_COURSE_ALUNO,
  INTRO_COURSE_COORDENADOR,
  INTRO_COURSE_CONSULTOR,
  CONSULTOR_ONBOARDING_PLAYLISTS,
  consultorOnboardingStepId,
  INTRO_PLAYLIST,
  isIntroCourse,
  isFixedIntroCourse
} from '../services/knowledgeService';
import {
  getInitiatives,
  updateInitiative,
  createInitiative,
  deleteInitiative,
  propagarRenomeacaoParaAcessos,
} from '../services/configService';
import { ICON_CATALOG, COLOR_CATALOG } from '../services/initiativeVisual';

const AVAILABLE_TOOLS = [
  { id: 'brief', name: 'Entendendo o Problema' },
  { id: 'charter', name: 'Project Charter' },
  { id: 'stakeholderAdkar', name: 'ADKAR — Definir (Awareness)' },
  { id: 'projectCharterPMI', name: 'Project Charter - PMI' },
  { id: 'measureAdkar', name: 'ADKAR — Medir (Desire)' },
  { id: 'analyzeAdkar', name: 'ADKAR — Analisar (Knowledge)' },
  { id: 'improveAdkar', name: 'ADKAR — Melhorar (Ability)' },
  { id: 'controlAdkar', name: 'ADKAR — Controlar (Reinforcement)' },
  { id: 'sipoc', name: 'SIPOC' },
  { id: 'timeline', name: 'Cronograma Macro' },
  { id: 'wbs', name: 'WBS (EAP)' },
  { id: 'gpPlanPMI', name: 'Plano do GP - PMI' },
  { id: 'raci', name: 'Matriz RACI' },
  { id: 'organograma', name: 'Organograma' },
  { id: 'indicadores', name: 'Indicadores' },
  { id: 'stakeholderAnalysisPMI', name: 'Análise de Stakeholders - PMI' },
  { id: 'riskManagementPMI', name: 'Plano de Riscos PMI' },
  { id: 'riskMonitoringPMI', name: 'Monitoramento de Riscos - PMI' },
  { id: 'detailedTimeline', name: 'Atividades Detalhadas' },
  { id: 'improvementPlan', name: 'Plano do Projeto de Melhoria' },
  { id: 'stakeholders', name: 'Stakeholders' },
  { id: 'processMap', name: 'Mapeamento de Processo' },
  { id: 'brainstorming', name: 'Brainstorming' },
  { id: 'brainstormingImprove', name: 'Brainstorming de Soluções' },
  { id: 'measureIshikawa', name: 'Espinha de Peixe' },
  { id: 'measureMatrix', name: 'Matriz Causa e Efeito' },
  { id: 'beforeAfter', name: 'Antes x Depois' },
  { id: 'rab', name: 'Matriz RAB' },
  { id: 'gut', name: 'Matriz GUT' },
  { id: 'effortImpact', name: 'Esforço x Benefício' },
  { id: 'dataCollection', name: 'Plano de Coleta de Dados' },
  { id: 'vsm', name: 'VSM (Value Stream Map)' },
  { id: 'directObservation', name: 'Observação Direta (Gemba)' },
  { id: 'fiveWhys', name: '5 Porquês' },
  { id: 'fta', name: 'Árvore de Falhas (FTA)' },
  { id: 'statisticalAnalysis', name: 'Análise Gráfica e Estatística' },
  { id: 'dataNature', name: 'Natureza dos Dados' },
  { id: 'fmea', name: 'FMEA' },
  { id: 'plan5w2h', name: 'Plano de Ação 5W2H' },
  { id: 'actionPlan', name: 'Plano de Ação' },
  { id: 'sop', name: 'POP (Procedimento Operacional Padrão)' },
  { id: 'processCanva', name: 'Canva' },
  { id: 'processModeling', name: 'Modelagem de Processo' },
  { id: 'processValidation', name: 'Validação de Processo' },
  { id: 'improvementIdea', name: 'Ideia de Projeto de Melhoria' },
  { id: 'controlPlan', name: 'Plano de Controle' }
];

const AVAILABLE_ANALYSES = [
  // Análise Exploratória
  { id: 'graficoSumario', name: 'Gráfico Sumario' },
  { id: 'analiseOutliers', name: 'Análise de outliers' },
  { id: 'correlacaoPearson', name: 'Correlação de Pearson' },
  { id: 'matrixDispersao', name: 'Matrix de dispersão' },
  { id: 'analiseEstabilidade', name: 'Análise de estabilidade' },
  { id: 'analiseLimpezaDados', name: 'Análise de limpeza dos dados' },
  { id: 'analiseCluster', name: 'Análise de cluster' },
  // Análise Descritiva (Gráficos)
  { id: 'histograma', name: 'Histograma' },
  { id: 'pareto', name: 'Pareto' },
  { id: 'pizza', name: 'Setores (Pizza)' },
  { id: 'barras', name: 'Barras' },
  { id: 'boxplot', name: 'BoxPlot' },
  { id: 'dispersao', name: 'Dispersão' },
  { id: 'tendencia', name: 'Tendência' },
  { id: 'bolhas3D', name: 'Bolhas - 3D' },
  { id: 'superficie3D', name: 'Superfície - 3D' },
  { id: 'dispersao3D', name: 'Dispersão 3D' },
  { id: 'intervalo', name: 'Intervalo' },
  // Análise Inferencial - Médias
  { id: 't1Sample', name: '1 Sample T' },
  { id: 't2Sample', name: '2 Sample T' },
  { id: 't2Paired', name: '2 Paired Test' },
  { id: 'anova1way', name: 'One way ANOVA' },
  { id: 'intervaloConfianca1', name: '1 Intervalo de Confiança' },
  // Análise Inferencial - Medianas
  { id: 'wilcoxon1', name: '1 Wilcoxon' },
  { id: 'mannWhitney', name: '2 Mann-Whitney' },
  { id: 'wilcoxonPaired', name: '2 Wilcoxon Paired' },
  { id: 'kruskalWallis', name: 'Kruskal-Wallis' },
  { id: 'friedmanPareado', name: 'Friedman Pareado' },
  { id: 'intervaloInterquartilico', name: '1 Intervalo Interquartílico' },
  // Análise Inferencial - Variâncias
  { id: 'variancas2', name: '2 Variâncias' },
  { id: 'variancasBF', name: '2 Variâncias Brown-Forsythe' },
  { id: 'bartlett', name: 'Bartlett' },
  { id: 'brownForsythe', name: 'Brown-Forsythe' },
  { id: 'intervaloConfiancaVar', name: '1 Intervalo de Confiança Variância' },
  // Análise Inferencial - Proporção
  { id: 'proporcao1', name: '1 Proporção' },
  { id: 'proporcoes2', name: '2 Proporções' },
  { id: 'proporcoesK', name: 'K Proporções' },
  // Análise Inferencial - Independência
  { id: 'quiQuadradoAssociacao', name: 'Qui-quadrado de Associação' },
  { id: 'quiQuadradoAjuste', name: 'Qui-quadrado de Ajuste' },
  // MSA - Dados Contínuos
  { id: 'gageRR', name: 'Gage R&R' },
  { id: 'bias', name: 'Vício (Bias)' },
  { id: 'linearidade', name: 'Linearidade' },
  { id: 'msaEstabilidade', name: 'Estabilidade (MSA)' },
  // MSA - Dados Discretos
  { id: 'concordanciaAtributos', name: 'Concordância de Atributos' },
  { id: 'metodoAnalitico', name: 'Método Analítico' },
  // Análise Preditiva
  { id: 'tipoModeloRegressao', name: 'Tipo de modelo de regressão' },
  { id: 'regressaoLinear', name: 'Regressão Linear' },
  { id: 'regressaoQuadratica', name: 'Regressão Quadrática' },
  { id: 'regressaoCubica', name: 'Regressão Cúbica' },
  { id: 'regressaoLinearMultipla', name: 'Regressão Linear Múltipla' },
  { id: 'regressaoBinaria', name: 'Regressão Binária' },
  { id: 'regressaoOrdinal', name: 'Regressão Ordinal' },
  { id: 'regressaoNominal', name: 'Regressão Nominal' },
  { id: 'arvoreDecisao', name: 'Árvore de Decisão - CART' },
  { id: 'randomForest', name: 'Random Forest' },
  { id: 'serieTemporal', name: 'Série Temporal' },
  // Controle de Processo
  { id: 'cartaIMR', name: 'Carta I-MR' },
  { id: 'cartaXBarraR', name: 'Carta X-Barra R' },
  { id: 'cartaXBarraS', name: 'Carta X-Barra S' },
  { id: 'cartaP', name: 'Carta P' },
  { id: 'cartaNP', name: 'Carta NP' },
  { id: 'cartaC', name: 'Carta C' },
  { id: 'cartaU', name: 'Carta U' },
  { id: 'cartaEWMA', name: 'Carta EWMA' },
  // Capabilidade
  { id: 'testeNormalidade', name: 'Teste de normalidade' },
  { id: 'analiseEstabilidadeCap', name: 'Análise de estabilidade (Capab.)' },
  { id: 'analiseDistribuicao', name: 'Análise de distribuição estatística' },
  { id: 'capabilidadeNormal', name: 'Capabilidade - dados normais' },
  { id: 'capabilidadeOutras', name: 'Capabilidade - outras distribuições' },
  { id: 'capabilidadeTransformados', name: 'Capabilidade - dados transformados' },
  { id: 'capabilidadeDiscretizados', name: 'Capabilidade - dados discretizados' },
  // Diversas
  { id: 'calculoProbabilidade', name: 'Cálculo de probabilidade' },
];

const TOOL_NAME_BY_ID: Record<string, string> = Object.fromEntries(AVAILABLE_TOOLS.map(t => [t.id, t.name]));
const ANALYSIS_NAME_BY_ID: Record<string, string> = Object.fromEntries(AVAILABLE_ANALYSES.map(a => [a.id, a.name]));

type ModalConfig = {
  isOpen: boolean;
  type: 'editCourse' | 'deleteCourse' | 'editPlaylist' | 'deletePlaylist' | 'editVideo' | 'deleteVideo' | 'importTranscript';
  targetId?: string;
  targetCourse?: string;
  targetPlaylist?: string;
  inputValue?: string;
};

interface SortableVideoRowProps {
  item: KnowledgeEntry;
  items: KnowledgeEntry[];
  expandedId: string | null;
  seekTime: number;
  isReprocessing: string | null;
  parseTimeToSeconds: (timeStr: string) => number;
  handleRegenerateIndex: (item: KnowledgeEntry) => void;
  handleRetryProcessing: (item: KnowledgeEntry) => void;
  setModalConfig: React.Dispatch<React.SetStateAction<ModalConfig>>;
  setExpandedId: (id: string | null) => void;
  setSeekTime: (time: number) => void;
  setEditVideoData: React.Dispatch<React.SetStateAction<any>>;
  setEditPlacements: (placements: Array<{ id?: string; course: string; playlist: string; newPlaylistName: string }>) => void;
  setEditOriginalIds: (ids: string[]) => void;
}

type PipelineStageStatus = 'aguardando' | 'processando' | 'concluido' | 'erro';

const PIPELINE_STATUS_LABEL: Record<PipelineStageStatus, string> = {
  aguardando: 'Aguardando',
  processando: 'Processando...',
  concluido: 'Concluído',
  erro: 'Falha',
};

function PipelineStageRow({
  label,
  status,
  onRetry,
  retrying,
  retryWhenProcessing,
}: {
  label: string;
  status: PipelineStageStatus;
  onRetry?: () => void;
  retrying?: boolean;
  retryWhenProcessing?: boolean;
}) {
  const colors = {
    aguardando: 'text-slate-500',
    processando: 'text-blue-700',
    concluido: 'text-emerald-700',
    erro: 'text-red-700',
  }[status];
  return (
    <div className="flex items-center gap-2 text-[11px] leading-5">
      <span className="w-[132px] text-slate-600">{label}</span>
      <span className={cn('font-bold', colors)}>{PIPELINE_STATUS_LABEL[status]}</span>
      {(status === 'erro' || (status === 'processando' && retryWhenProcessing)) && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
        >
          {retrying ? 'Refazendo...' : 'Refazer processamento'}
        </button>
      )}
    </div>
  );
}

function SortableVideoRow({
  item, items, expandedId, seekTime, isReprocessing,
  parseTimeToSeconds, handleRegenerateIndex, handleRetryProcessing,
  setModalConfig, setExpandedId, setSeekTime,
  setEditVideoData, setEditPlacements, setEditOriginalIds,
}: SortableVideoRowProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (seekTime > 0 && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime, true] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  }, [seekTime]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id! });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? '#eff6ff' : undefined,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 'auto' as any,
  };
  const youtubeMatch = String(item.sourceUrl || '').match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  const youtubeId = youtubeMatch && youtubeMatch[2].length === 11 ? youtubeMatch[2] : null;
  const thumbnailUrl = youtubeId ? youtubeThumb(youtubeId, 'hqdefault') : item.bunnyThumbnailUrl || '';
  const legacyErrorStage: 'transcricao' | 'indice' | undefined = item.transcricaoErro
    ? (item.rawTranscript && !(item.summary?.length || 0) ? 'indice' : 'transcricao')
    : undefined;
  const pipeline = item.pipelineStatus || {};
  const statusVideo: PipelineStageStatus = pipeline.processamentoVideo
    || (item.rawTranscript || (item.summary?.length || 0) > 0 ? 'concluido' : 'aguardando');
  const statusTranscricao: PipelineStageStatus = pipeline.transcricao
    || (legacyErrorStage === 'transcricao' ? 'erro' : item.rawTranscript ? 'concluido' : 'aguardando');
  const statusIndice: PipelineStageStatus = pipeline.indice
    || (legacyErrorStage === 'indice' ? 'erro' : (item.summary?.length || 0) > 0 ? 'concluido' : 'aguardando');
  const pipelineCompleto = statusVideo === 'concluido'
    && statusTranscricao === 'concluido'
    && statusIndice === 'concluido';
  const ultimoStatus = pipeline.atualizadoEm ? Date.parse(pipeline.atualizadoEm) : 0;
  const pipelineTravado = [statusVideo, statusTranscricao, statusIndice].some(status => status === 'processando')
    && (!ultimoStatus || Date.now() - ultimoStatus > 5 * 60 * 1000);
  return (
    <React.Fragment>
      <tr ref={setNodeRef} style={style} className="border-b border-[#eee] last:border-0 hover:bg-gray-50 transition-colors group/row">
        <td className="pl-2 w-8">
          <div
            {...attributes}
            {...listeners}
            className="p-1.5 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing transition-colors"
            title="Arrastar para reordenar"
          >
            <GripVertical size={16} />
          </div>
        </td>
        <td className="p-4 pl-2">
          <div className="flex items-center gap-3">
            <div className="w-24 aspect-video rounded overflow-hidden flex-shrink-0 border border-[#eee] relative group bg-slate-100 flex items-center justify-center">
              {thumbnailUrl ? (
                // no-referrer só no YouTube. O CDN do Bunny exige referer e devolve
                // 403 sem ele — era isso que quebrava a capa dos vídeos enviados
                // direto pra plataforma (os do YouTube não usam esta URL).
                <img src={thumbnailUrl} alt={item.title} className="w-full h-full object-cover" referrerPolicy={youtubeId ? 'no-referrer' : undefined} />
              ) : (
                <Video className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm m-0 text-gray-800 line-clamp-2">{item.title}</p>
              {item.bunnyVideoId && (
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                  <PipelineStageRow
                    label="Processamento do vídeo"
                    status={statusVideo}
                    onRetry={() => handleRetryProcessing(item)}
                    retrying={isReprocessing === item.id}
                    retryWhenProcessing={pipelineTravado && statusVideo === 'processando'}
                  />
                  <PipelineStageRow
                    label="Transcrição"
                    status={statusTranscricao}
                    onRetry={() => handleRetryProcessing(item)}
                    retrying={isReprocessing === item.id}
                    retryWhenProcessing={pipelineTravado && statusTranscricao === 'processando'}
                  />
                  <PipelineStageRow
                    label="Índice e resumo"
                    status={statusIndice}
                    onRetry={() => handleRetryProcessing(item)}
                    retrying={isReprocessing === item.id}
                    retryWhenProcessing={pipelineTravado && statusIndice === 'processando'}
                  />
                  {item.transcricaoErro?.mensagem && (
                    <p className="mt-1 max-w-[420px] text-[10px] leading-4 text-red-600" title={item.transcricaoErro.mensagem}>
                      {item.transcricaoErro.mensagem}
                    </p>
                  )}
                  {!pipelineCompleto && !item.transcricaoErro && (
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      {pipelineTravado ? 'O processamento parece travado. Use Refazer processamento.' : 'A transcrição será importada automaticamente.'}
                    </p>
                  )}
                </div>
              )}
              {((item.associatedTools && item.associatedTools.length > 0) || (item.associatedAnalyses && item.associatedAnalyses.length > 0)) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(item.associatedTools || []).map(toolId => (
                    <span key={`tool-${toolId}`} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                      {TOOL_NAME_BY_ID[toolId] || toolId}
                    </span>
                  ))}
                  {(item.associatedAnalyses || []).map(analysisId => (
                    <span key={`analysis-${analysisId}`} className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100">
                      {ANALYSIS_NAME_BY_ID[analysisId] || analysisId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-4 text-xs text-gray-500 w-32 text-right">{item.timestamp.toLocaleDateString()}</td>
        <td className="p-4 w-40">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => {
                if (expandedId === item.id) { setExpandedId(null); }
                else { setExpandedId(item.id!); setSeekTime(0); }
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors border-none bg-transparent cursor-pointer flex items-center gap-1 text-xs font-bold whitespace-nowrap"
            >
              Detalhes {expandedId === item.id ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} className="-rotate-90" />}
            </button>
            <button
              onClick={() => {
                setEditVideoData({ id: item.id!, title: item.title, associatedTools: item.associatedTools || [], associatedAnalyses: item.associatedAnalyses || [] });
                const allSiblings = items.filter(i => i.sourceUrl === item.sourceUrl);
                const ordered = [item, ...allSiblings.filter(s => s.id !== item.id)];
                setEditPlacements(ordered.map(s => ({ id: s.id, course: s.course, playlist: s.playlist, newPlaylistName: '' })));
                setEditOriginalIds(allSiblings.map(s => s.id!).filter(Boolean));
                setModalConfig({ isOpen: true, type: 'editVideo', targetId: item.id });
              }}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer"
              title="Editar"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setModalConfig({ isOpen: true, type: 'deleteVideo', targetId: item.id })}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer"
              title="Remover"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {expandedId === item.id && (
        <tr>
          <td colSpan={4} className="p-0 border-b border-[#eee] bg-[#f8fafc]">
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200 h-[450px] flex flex-col shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <ListVideo size={18} className="text-blue-600" /> Índice do Vídeo
                  </h4>
                  <div className="overflow-y-auto flex-1 pr-2 space-y-2 flex flex-col">
                    {!item.rawTranscript ? (
                      <div className="flex-1 flex items-center justify-center text-center p-4">
                        <p className="text-sm text-gray-500 italic">Importe a transcrição completa pra gerar o índice.</p>
                      </div>
                    ) : (item.summary?.length || 0) === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 gap-3">
                        {item.bunnyVideoId ? (
                          <p className="text-sm text-gray-500">A transcrição está salva. O índice e o resumo serão concluídos pelo processamento automático; acompanhe o status acima.</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500">A transcrição está salva. Gere o índice clicável a partir dela:</p>
                            <button
                              onClick={() => handleRegenerateIndex(item)}
                              disabled={isReprocessing === item.id}
                              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Sparkles size={14} />
                              {isReprocessing === item.id ? 'Gerando...' : 'Gerar índice'}
                            </button>
                          </>
                        )}
                      </div>
                    ) : item.summary!.map((s, i) => (
                      <button key={i} onClick={() => setSeekTime(parseTimeToSeconds(s.time))}
                        className="text-left text-sm hover:bg-blue-50 p-2 rounded w-full flex gap-3 transition-colors border border-transparent hover:border-blue-100 group cursor-pointer">
                        <span className="text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded group-hover:bg-blue-100">{s.time}</span>
                        <span className="text-gray-700 leading-tight">{s.topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-black rounded-lg overflow-hidden h-[450px] flex items-center justify-center shadow-sm">
                  {item.bunnyVideoId && item.bunnyLibraryId ? (
                    <iframe
                      ref={iframeRef}
                      width="100%" height="100%"
                      src={`https://iframe.mediadelivery.net/embed/${item.bunnyLibraryId}/${item.bunnyVideoId}?autoplay=false&preload=true&t=${seekTime}`}
                      title={item.title} frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen />
                  ) : <p className="text-white">Vídeo indisponível</p>}
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 h-[450px] flex flex-col shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <ListVideo size={18} className="text-teal-600" /> Transcrição completa
                  </h4>
                  <div className="overflow-y-auto flex-1 pr-2">
                    {item.rawTranscript ? (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-mono text-xs">{item.rawTranscript}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Nenhuma transcrição importada.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

interface SortablePlaylistTabProps {
  playlist: { name: string; videos: KnowledgeEntry[]; order: number };
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  isFirst: boolean;
  isLast: boolean;
  hideActions?: boolean;
}

function SortablePlaylistTab({ playlist, isActive, onSelect, onEdit, onDelete, onMoveLeft, onMoveRight, isFirst, isLast, hideActions }: SortablePlaylistTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: playlist.name });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as any,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      <button
        {...attributes}
        {...listeners}
        onClick={onSelect}
        className={cn(
          "px-4 py-2 rounded-[4px] text-xs font-bold transition-colors whitespace-nowrap border flex items-center gap-2 cursor-grab active:cursor-grabbing",
          isActive
            ? "bg-[#1f2937] text-white border-[#1f2937]"
            : "bg-white border-[#ccc] text-gray-600 hover:bg-gray-50"
        )}
        title="Arrastar para reordenar — clique para abrir"
      >
        <ListVideo size={14} className={isActive ? "text-purple-400" : "text-purple-500"} />
        {playlist.name}
        <span className={cn(
          "text-[11px] font-bold px-1.5 py-0.5 rounded ml-1",
          isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
        )}>
          {playlist.videos.length}
        </span>
      </button>
      {!hideActions && <div className="flex items-center ml-1">
        <button
          onClick={(event) => { event.stopPropagation(); onMoveLeft(); }}
          disabled={isFirst}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
          title="Mover fase para a esquerda"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={(event) => { event.stopPropagation(); onMoveRight(); }}
          disabled={isLast}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
          title="Mover fase para a direita"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer"
          title="Editar nome da fase"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer"
          title="Excluir fase e seus vídeos"
        >
          <Trash2 size={14} />
        </button>
      </div>}
    </div>
  );
}

export default function KnowledgeManagerView() {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    running: boolean;
    kind: 'transcript' | 'index';
    total: number;
    done: number;
    failed: number;
    currentTitle: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Multi-tenant: escopo do conteúdo pelo consultor atual (resolvido pelo subdomínio).
  // Hoje = 'israel' no app. e no israel., então nada muda — só passa a filtrar/carimbar por tenant.
  const { consultorId } = useConsultor();

  const [formData, setFormData] = useState({
    placements: [{ course: '', playlist: '', newPlaylistName: '' }] as Array<{ course: string; playlist: string; newPlaylistName: string }>,
    associatedTools: [] as string[],
    associatedAnalyses: [] as string[]
  });

  const emptyFormData = {
    placements: [{ course: '', playlist: '', newPlaylistName: '' }],
    associatedTools: [] as string[],
    associatedAnalyses: [] as string[]
  };

  const updatePlacement = (idx: number, patch: Partial<{ course: string; playlist: string; newPlaylistName: string }>) => {
    setFormData(prev => ({
      ...prev,
      placements: prev.placements.map((p, i) => {
        if (i !== idx) return p;
        const next = { ...p, ...patch };
        if (patch.course && isFixedIntroCourse(patch.course)) {
          next.playlist = INTRO_PLAYLIST;
          next.newPlaylistName = '';
        }
        return next;
      })
    }));
  };

  const addPlacement = () => {
    setFormData(prev => ({ ...prev, placements: [...prev.placements, { course: '', playlist: '', newPlaylistName: '' }] }));
  };

  const removePlacement = (idx: number) => {
    setFormData(prev => ({ ...prev, placements: prev.placements.filter((_, i) => i !== idx) }));
  };
  const [isSaving, setIsSaving] = useState(false);
  // ===== Upload direto de vídeo (o provedor fica invisível para o consultor) =====
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upTitle, setUpTitle] = useState('');
  const [upProgress, setUpProgress] = useState<number | null>(null);
  const [upBunny, setUpBunny] = useState<{ guid: string; libraryId: string } | null>(null);
  const [upErro, setUpErro] = useState('');
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const uploadParaBunny = async () => {
    if (!upFile) { setUpErro('Escolha um arquivo de vídeo.'); return; }
    setUpErro(''); setUpProgress(0); setUpBunny(null);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const nome = (upTitle || upFile.name.replace(/\.[^.]+$/, '')).trim();
      const r = await fetch('/api/bunny/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: nome }),
      });
      const resposta = await r.text();
      let cred: any = {};
      try { cred = resposta ? JSON.parse(resposta) : {}; } catch { /* servidor pode ter devolvido HTML */ }
      if (!r.ok) throw new Error(cred.error || `Não foi possível preparar o envio do vídeo (HTTP ${r.status}).`);
      if (!cred.guid || !cred.libraryId || !cred.signature || !cred.expiration) {
        throw new Error('O servidor não devolveu as credenciais completas do Bunny.');
      }
      const tus = await import('tus-js-client');
      await new Promise<void>((resolve, reject) => {
        const up = new tus.Upload(upFile as File, {
          endpoint: 'https://video.bunnycdn.com/tusupload',
          retryDelays: [0, 3000, 5000, 10000, 20000, 30000, 60000],
          storeFingerprintForResuming: true,
          removeFingerprintOnSuccess: true,
          headers: {
            AuthorizationSignature: cred.signature,
            AuthorizationExpire: String(cred.expiration),
            LibraryId: String(cred.libraryId),
            VideoId: cred.guid,
          },
          metadata: { filetype: (upFile as File).type || 'video/mp4', title: nome },
          onError: (e: any) => reject(e),
          onProgress: (sent: number, total: number) => setUpProgress(Math.round((sent / total) * 100)),
          onSuccess: () => resolve(),
        });
        void up.findPreviousUploads()
          .then((previous) => {
            if (previous.length > 0) up.resumeFromPreviousUpload(previous[0]);
            up.start();
          })
          .catch(reject);
      });
      setUpBunny({ guid: cred.guid, libraryId: String(cred.libraryId) });
      setUpProgress(100);
    } catch (e: any) {
      setUpErro(e?.message || String(e));
      setUpProgress(null);
    }
  };
  const processUploadedVideoAutomatically = async (bunnyVideoId: string) => {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/bunny/transcribe-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bunnyVideoId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('[processUploadedVideoAutomatically]', error);
      // O servidor persiste transcricaoErro. Recarregar a lista transforma a
      // falha em status no vídeo, sem interromper o consultor com alertas.
      await fetchItems();
      return false;
    }
  };
  const [isReprocessing, setIsReprocessing] = useState<string | null>(null);
  // Até quando continuar conferindo o servidor mesmo sem etapa em "processando".
  // A requisição do navegador pode morrer (timeout de proxy, rede) enquanto o
  // servidor segue trabalhando e conclui. Sem esta janela, a tela ficava exibindo
  // a "Falha" antiga de um vídeo que já tinha dado certo.
  const [acompanharAte, setAcompanharAte] = useState(0);
  const acompanharPor20Min = () => setAcompanharAte(Date.now() + 20 * 60 * 1000);

  const handleRetryProcessing = async (item: KnowledgeEntry) => {
    if (!item.id || !item.bunnyVideoId) return;
    setIsReprocessing(item.id);
    acompanharPor20Min();
    try {
      await processUploadedVideoAutomatically(item.bunnyVideoId);
    } finally {
      setIsReprocessing(null);
    }
  };
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isAnalysesDropdownOpen, setIsAnalysesDropdownOpen] = useState(false);

  const [editVideoData, setEditVideoData] = useState({
    id: '',
    title: '',
    associatedTools: [] as string[],
    associatedAnalyses: [] as string[]
  });
  const [editPlacements, setEditPlacements] = useState<Array<{ id?: string; course: string; playlist: string; newPlaylistName: string }>>([]);
  const [editOriginalIds, setEditOriginalIds] = useState<string[]>([]);
  const [isEditToolsDropdownOpen, setIsEditToolsDropdownOpen] = useState(false);
  const [isEditAnalysesDropdownOpen, setIsEditAnalysesDropdownOpen] = useState(false);

  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, type: 'editCourse' });
  const [rawTranscriptText, setRawTranscriptText] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [seekTime, setSeekTime] = useState<number>(0);
  const [activePlaylists, setActivePlaylists] = useState<Record<string, string>>({});
  const [initiativeNames, setInitiativeNames] = useState<string[]>([]);
  // Initiatives completas (id + temProjeto) do consultor atual — pro toggle "tem projeto?".
  const [initiatives, setInitiatives] = useState<any[]>([]);

  // Estados do helper de reconciliação de cursos órfãos
  // (cursos que estão nos vídeos mas não existem mais como trilhas no /config — provavelmente foram renomeados)

  useEffect(() => {
    getInitiatives().then(list => {
      // Modelo antigo assumia hierarquia pai/filho — só "filhos" (com parentId) viravam
      // cursos selecionáveis aqui. Após a migração pra trilhas individuais (todas
      // viraram Principal), o filtro `!!i.parentId` retornava [] e o dropdown ficava
      // vazio. Agora pegamos TODAS as iniciativas como opções de curso.
      // Curso de verdade = iniciativa que NÃO aponta pra outra em cursoAssociadoId.
      // Quando cursoAssociadoId aponta pra outra iniciativa, o registro é um TIPO DE
      // PROJETO liberado por aquele curso (ex: "LEAN SIX SIGMA BLACK BELT" aponta pra
      // "Como Se Tornar um Especialista..."), e não deve aparecer como curso aqui.
      const cursos = list.filter((i: any) =>
        !i.somenteProjeto && (!i.cursoAssociadoId || i.cursoAssociadoId === i.id));
      const names = cursos.map(i => i.name).filter(Boolean);
      setInitiativeNames(names);
      setInitiatives(cursos);
    }).catch(console.error);
    fetchItems();
  }, []);

  // ===== Criar curso =====
  // Um curso é uma Initiative do consultor atual (createInitiative já carimba o
  // consultorId do subdomínio). Depois de criado ele entra no dropdown de "Adicionar
  // Vídeo" e o resto do fluxo — vídeo, playlist, ferramentas, análises — é o mesmo.
  // Abre "Adicionar Vídeo" já com o curso preenchido — evita ter que subir a página,
  // achar o curso num dropdown longo e lembrar em qual playlist ele ia.
  const addFormRef = useRef<HTMLDivElement>(null);
  const abrirAdicaoNoCurso = (course: string, playlist?: string) => {
    const semPlaylist = playlistsForCourse(course).length === 0;
    setIsCreatingCourse(false);
    setFormData({
      placements: [{
        course,
        // Curso novo ainda não tem playlist: já cai no campo de criar a primeira.
        playlist: playlist || (semPlaylist ? 'NEW' : ''),
        newPlaylistName: '',
      }],
      associatedTools: [],
      associatedAnalyses: [],
    });
    setUpFile(null); setUpTitle(''); setUpProgress(null); setUpBunny(null); setUpErro('');
    setIsAdding(true);
    setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = newCourseName.trim();
    if (!nome) return;
    if (isIntroCourse(nome)) {
      alert('Esse nome é reservado para as abas especiais. Escolha outro nome.');
      return;
    }
    if (initiatives.some((i) => i.name?.trim().toLowerCase() === nome.toLowerCase())) {
      alert('Você já tem um curso com esse nome.');
      return;
    }
    setIsSavingCourse(true);
    try {
      // Sem cursoAssociadoId de propósito: este registro É o curso.
      const criado = await createInitiative(nome);
      // Visual só pra o card do curso não nascer sem ícone/cor na aba Projetos.
      // O consultor troca depois em "Projetos, Fases e Ferramentas".
      const iconId = ICON_CATALOG.find((i) => i.id === 'book')?.id || ICON_CATALOG[0].id;
      const corId = COLOR_CATALOG[initiatives.length % COLOR_CATALOG.length].id;
      const ordem = initiatives.reduce((max, i) => Math.max(max, Number(i.ordem) || 0), 0) + 1;
      await updateInitiative(criado.id, { iconId, corId, ordem });
      const completo = { ...criado, iconId, corId, ordem };
      setInitiatives((prev) => [...prev, completo]);
      setInitiativeNames((prev) => [...prev, nome]);
      setNewCourseName('');
      setIsCreatingCourse(false);
    } catch (error: any) {
      console.error('[handleCreateCourse]', error);
      alert(`Não foi possível criar o curso.\n\n${error?.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingCourse(false);
    }
  };

  /** Curso ainda sem vídeo: não há o que apagar na Base de Conhecimento, some só a Initiative. */
  const handleDeleteEmptyCourse = async (courseName: string) => {
    const ini = initiatives.find((i) => i.name === courseName);
    if (!ini) return;
    if (!confirm(`Excluir o curso "${courseName}"?\n\nEle ainda não tem nenhum vídeo.`)) return;
    try {
      await deleteInitiative(ini.id);
      setInitiatives((prev) => prev.filter((i) => i.id !== ini.id));
      setInitiativeNames((prev) => prev.filter((n) => n !== courseName));
    } catch (error) {
      console.error('[handleDeleteEmptyCourse]', error);
      alert('Não foi possível excluir o curso.');
    }
  };

  // Liga/desliga "este curso tem projeto?" — grava temProjeto na initiative de mesmo nome.
  // Default (ausente/true) = tem projeto (comportamento atual). false = curso só-conteúdo.
  const toggleTemProjeto = async (courseName: string) => {
    const ini = initiatives.find((i) => i.name === courseName);
    if (!ini) return; // curso sem trilha correspondente já não vira projeto
    const novo = ini.temProjeto === false; // estava sem projeto → liga; senão desliga
    try {
      await updateInitiative(ini.id, { temProjeto: novo });
      setInitiatives((prev) => prev.map((i) => (i.id === ini.id ? { ...i, temProjeto: novo } : i)));
    } catch (e) {
      console.error('Erro ao alternar "tem projeto":', e);
    }
  };

  useEffect(() => {
    if (modalConfig.isOpen && modalConfig.type === 'importTranscript' && modalConfig.targetId) {
      const item = items.find(i => i.id === modalConfig.targetId);
      setRawTranscriptText(item?.rawTranscript || '');
    }
  }, [modalConfig.isOpen, modalConfig.type, modalConfig.targetId, items]);

  // Quando o usuário limpa o filtro (ou ele muda), garante que a playlist ativa
  // de cada curso ainda existe; se não, escolhe a com mais vídeos.
  // Isso evita o "sumiço" aparente quando o filtro tira a playlist ativa.
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const visibleByCourse = items.reduce((acc, item) => {
      const matches = !term ||
        item.title.toLowerCase().includes(term) ||
        item.course.toLowerCase().includes(term) ||
        item.playlist.toLowerCase().includes(term);
      if (!matches) return acc;
      const c = item.course || 'Sem Curso';
      const p = item.playlist || 'Sem Playlist';
      if (!acc[c]) acc[c] = {};
      acc[c][p] = (acc[c][p] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    setActivePlaylists(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(visibleByCourse).forEach(([course, plMap]) => {
        const current = next[course];
        if (!current || !plMap[current]) {
          const best = Object.entries(plMap).sort((a, b) => b[1] - a[1])[0];
          if (best) {
            next[course] = best[0];
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [searchTerm, items]);

  // Processa uma única vez cada vídeo Bunny sem transcript. O servidor usa Groq
  // Whisper, publica a legenda pt no player e devolve o texto completo com tempos.
  const handleBulkImportTranscripts = async () => {
    const grouped = new Map<string, { item: KnowledgeEntry; hasTranscript: boolean }>();
    for (const item of items) {
      const key = item.bunnyVideoId || item.sourceUrl;
      if (!key) continue;
      const hasTranscript = Boolean(item.rawTranscript?.trim() || item.transcript?.trim());
      const current = grouped.get(key);
      if (!current) grouped.set(key, { item, hasTranscript });
      else current.hasTranscript ||= hasTranscript;
    }
    const pending = [...grouped.values()].filter(group => !group.hasTranscript).map(group => group.item);

    if (pending.length === 0) {
      alert('✅ Todos os vídeos já possuem transcript. Nada a fazer.');
      return;
    }

    const confirmed = window.confirm(
      `Importar transcripts faltantes em lote?\n\n` +
      `Vídeos a processar: ${pending.length}\n\n` +
      `O que vai acontecer:\n` +
      `• Transcreve o áudio do vídeo com IA\n` +
      `• Publica a legenda em português no player\n` +
      `• Salva o transcript integral com timestamps\n` +
      `• Processa apenas uma vez vídeos usados em vários cursos\n\n` +
      `Não feche essa aba durante o processo.\n\n` +
      `Continuar?`
    );
    if (!confirmed) return;

    setBulkProgress({ running: true, kind: 'transcript', total: pending.length, done: 0, failed: 0, currentTitle: '' });

    let done = 0;
    let failed = 0;
    const failures: { title: string; reason: string }[] = [];

    for (const item of pending) {
      setBulkProgress({
        running: true,
        kind: 'transcript',
        total: pending.length,
        done,
        failed,
        currentTitle: item.title || item.sourceUrl
      });

      try {
        if (!item.id) {
          throw new Error('Item sem id no Firestore');
        }

        if (!item.bunnyVideoId) throw new Error('Vídeo sem identificação Bunny');
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : '';
        const res = await fetch('/api/bunny/transcribe-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bunnyVideoId: item.bunnyVideoId })
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }
        const { transcript: rawTranscript, summary } = await res.json();
        if (!rawTranscript || rawTranscript.trim().length === 0) {
          throw new Error('Transcript vazio retornado pela transcrição');
        }

        // O servidor já gravou rawTranscript, transcript e summary nos placements.
        // Só sincroniza os irmãos por sourceUrl com o que ele devolveu — NUNCA
        // sobrescrever com summary vazio, que apagava o índice recém-gerado.
        await syncSiblingsBySourceUrl(item.sourceUrl, {
          rawTranscript,
          ...(Array.isArray(summary) && summary.length ? { summary } : {}),
        });

        done++;
      } catch (err: any) {
        console.error(`[bulkImport] erro em "${item.title}":`, err);
        failed++;
        failures.push({
          title: item.title || item.sourceUrl,
          reason: err?.message || 'erro desconhecido'
        });
      }
    }

    setBulkProgress({ running: false, kind: 'transcript', total: pending.length, done, failed, currentTitle: '' });
    await fetchItems();

    const failureSummary = failures.length > 0
      ? `\n\nFalhas:\n${failures.map(f => `• ${f.title}: ${f.reason}`).join('\n')}`
      : '';
    alert(
      `Importação em lote concluída!\n\n` +
      `✅ Sucesso: ${done}\n` +
      `❌ Falha: ${failed}${failureSummary}`
    );
  };

  // Processa em lote todos os vídeos com transcript mas sem índice (summary):
  // Usa Gemini pra gerar índice + resumo a partir do rawTranscript salvo no Firestore.
  const handleBulkGenerateIndexes = async () => {
    // Passo 1: agrupar por sourceUrl e descobrir quais URLs já têm summary
    // em PELO MENOS UMA placement irmã. Se sim, o vídeo está pronto — pula.
    const sourceUrlsComSummary = new Set<string>();
    for (const item of items) {
      if ((item.summary?.length || 0) > 0 && item.sourceUrl) {
        sourceUrlsComSummary.add(item.sourceUrl);
      }
    }

    // Passo 2: pega 1 placement por sourceUrl que precise de índice
    // (tem rawTranscript, mas o sourceUrl não está no set de "já tem").
    const bySourceUrl = new Map<string, KnowledgeEntry>();
    for (const item of items) {
      if (!item.sourceUrl) continue;
      if (sourceUrlsComSummary.has(item.sourceUrl)) continue;
      const hasRaw = item.rawTranscript && item.rawTranscript.trim().length > 0;
      if (!hasRaw) continue;
      if (!bySourceUrl.has(item.sourceUrl)) bySourceUrl.set(item.sourceUrl, item);
    }
    const pending = Array.from(bySourceUrl.values());

    if (pending.length === 0) {
      alert('✅ Todos os vídeos com transcript já possuem índice. Nada a fazer.');
      return;
    }

    // Lista preview dos 8 primeiros pra você bater olho se realmente faltam
    const preview = pending.slice(0, 8).map((p, i) => `${i + 1}. ${p.title || p.sourceUrl}`).join('\n');
    const remaining = pending.length > 8 ? `\n…e mais ${pending.length - 8} vídeos` : '';

    console.log('[bulkGenerateIndexes] Lista completa de pendentes:', pending.map(p => ({ title: p.title, url: p.sourceUrl })));

    const confirmed = window.confirm(
      `Gerar índices faltantes em lote?\n\n` +
      `Vídeos a processar: ${pending.length}\n\n` +
      `PRIMEIROS 8 DA FILA (confira se realmente faltam):\n${preview}${remaining}\n\n` +
      `Custo estimado: ~$0,003/vídeo\n` +
      `Tempo: ~15s por vídeo (com throttle de 10s entre chamadas)\n\n` +
      `Lista completa logada no Console (F12) pra conferência.\n\n` +
      `Continuar?`
    );
    if (!confirmed) return;

    setBulkProgress({ running: true, kind: 'index', total: pending.length, done: 0, failed: 0, currentTitle: '' });

    let done = 0;
    let failed = 0;
    const failures: { title: string; reason: string }[] = [];

    const { generateSummaryFromRawTranscript } = await import('../lib/gemini');

    // Helpers: delay + timeout pra evitar trava em rate-limit / chamada lenta
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout (${ms / 1000}s) em "${label}"`)), ms)
        ),
      ]);

    console.log(`[bulkGenerateIndexes] iniciando lote de ${pending.length} vídeos`);

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setBulkProgress({
        running: true,
        kind: 'index',
        total: pending.length,
        done,
        failed,
        currentTitle: item.title || item.sourceUrl
      });
      console.log(`[bulkGenerateIndexes] ${i + 1}/${pending.length} → ${item.title}`);

      try {
        const { summary, transcript } = await withTimeout(
          generateSummaryFromRawTranscript(item.sourceUrl, item.rawTranscript || ''),
          90_000,
          item.title || item.sourceUrl
        );
        if (!Array.isArray(summary) || summary.length === 0) {
          throw new Error('IA retornou índice vazio (possível falha de quota, modelo ou parse).');
        }
        await syncSiblingsBySourceUrl(item.sourceUrl, {
          summary,
          transcript: transcript || ''
        });
        done++;
        console.log(`[bulkGenerateIndexes] ✅ OK: "${item.title}"`);
      } catch (err: any) {
        console.error(`[bulkGenerateIndexes] ❌ erro em "${item.title}":`, err);
        failed++;
        failures.push({
          title: item.title || item.sourceUrl,
          reason: err?.message || 'erro desconhecido'
        });
      }

      // Throttle: 2s entre chamadas (Gemini paid tier suporta 2000 RPM, sobra margem)
      if (i < pending.length - 1) {
        await sleep(2_000);
      }
    }

    setBulkProgress({ running: false, kind: 'index', total: pending.length, done, failed, currentTitle: '' });
    await fetchItems();

    const failureSummary = failures.length > 0
      ? `\n\nFalhas:\n${failures.map(f => `• ${f.title}: ${f.reason}`).join('\n')}`
      : '';
    alert(
      `Geração de índices em lote concluída!\n\n` +
      `✅ Sucesso: ${done}\n` +
      `❌ Falha: ${failed}${failureSummary}`
    );
  };

  const nomeNormalizado = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const ePlaylistIntroducao = (nome: string) => nomeNormalizado(nome).startsWith('introducao');

  // A ordem dos cards precisa ser a mesma ordem da jornada do aluno.
  // Dados antigos podem não ter playlistOrder; nesse caso a primeira playlist
  // de introdução fica no início e as demais preservam a ordem já existente.
  const normalizarOrdemInicialPlaylists = async (data: KnowledgeEntry[]) => {
    const porCurso = new Map<string, string[]>();
    data.forEach((item) => {
      const curso = item.course || 'Sem Curso';
      const playlist = item.playlist || 'Sem Playlist';
      const atuais = porCurso.get(curso) || [];
      if (!atuais.includes(playlist)) atuais.push(playlist);
      porCurso.set(curso, atuais);
    });

    const alteracoes: Array<{ id: string; playlistOrder: number }> = [];
    const localOrder = new Map<string, number>();
    porCurso.forEach((playlists, curso) => {
      const primeiraOcorrencia = new Map(playlists.map((playlist, index) => [playlist, index]));
      const ordemAtual = (playlist: string) => {
        // Basta UM vídeo da playlist ter ordem definida — não necessariamente o
        // primeiro do array. Um vídeo novo sem playlistOrder não pode "esconder"
        // a ordem que os irmãos já tinham.
        const item = data.find((entry) => entry.course === curso && entry.playlist === playlist && typeof entry.playlistOrder === 'number');
        return typeof item?.playlistOrder === 'number' ? item.playlistOrder : Number.MAX_SAFE_INTEGER;
      };
      const temOrdemCompleta = playlists.every((playlist) => ordemAtual(playlist) !== Number.MAX_SAFE_INTEGER)
        && new Set(playlists.map(ordemAtual)).size === playlists.length
        && playlists.map(ordemAtual).sort((a, b) => a - b).every((valor, index) => valor === index);
      if (temOrdemCompleta) return;

      const ordenadas = playlists.slice().sort((a, b) => {
        const aIntro = ePlaylistIntroducao(a);
        const bIntro = ePlaylistIntroducao(b);
        if (aIntro !== bIntro) return aIntro ? -1 : 1;
        const porOrdem = ordemAtual(a) - ordemAtual(b);
        if (porOrdem !== 0 && Number.isFinite(porOrdem)) return porOrdem;
        return (primeiraOcorrencia.get(a) || 0) - (primeiraOcorrencia.get(b) || 0);
      });
      ordenadas.forEach((playlist, index) => localOrder.set(`${curso}__${playlist}`, index));
    });

    const atualizados = data.map((item) => {
      const novo = localOrder.get(`${item.course || 'Sem Curso'}__${item.playlist || 'Sem Playlist'}`);
      if (novo === undefined || novo === item.playlistOrder) return item;
      if (item.id) alteracoes.push({ id: item.id, playlistOrder: novo });
      return { ...item, playlistOrder: novo };
    });

    if (alteracoes.length > 0) {
      try {
        // Firestore aceita no máximo 500 operações por batch.
        for (let inicio = 0; inicio < alteracoes.length; inicio += 400) {
          const batch = writeBatch(db);
          alteracoes.slice(inicio, inicio + 400).forEach((alteracao) => {
            batch.update(doc(db, KNOWLEDGE_COLLECTION, alteracao.id), { playlistOrder: alteracao.playlistOrder });
          });
          await batch.commit();
        }
      } catch (error) {
        console.error('Erro ao normalizar a ordem inicial das playlists:', error);
      }
    }
    return atualizados;
  };

  // silencioso = releitura de fundo (polling do processamento). Não liga o "loading"
  // pra não trocar a lista inteira pelo "Carregando recursos..." a cada ciclo.
  const fetchItems = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    const data = await getAllKnowledge(consultorId);
    const dataOrdenada = await normalizarOrdemInicialPlaylists(data);
    setItems(dataOrdenada);
    
    // Set initial active playlists for each course
    const grouped = dataOrdenada.reduce((acc, item) => {
      const course = item.course || 'Sem Curso';
      const playlist = item.playlist || 'Sem Playlist';
      if (!acc[course]) acc[course] = new Set();
      acc[course].add(playlist);
      return acc;
    }, {} as Record<string, Set<string>>);

    setActivePlaylists(prev => {
      const next = { ...prev };
      Object.entries(grouped).forEach(([course, playlists]) => {
        if (!next[course]) {
          const firstPlaylist = Array.from(playlists).sort((a, b) => {
            const ordemA = dataOrdenada.find((item) => item.course === course && item.playlist === a)?.playlistOrder ?? Number.MAX_SAFE_INTEGER;
            const ordemB = dataOrdenada.find((item) => item.course === course && item.playlist === b)?.playlistOrder ?? Number.MAX_SAFE_INTEGER;
            return ordemA - ordemB;
          })[0];
          if (firstPlaylist) {
            next[course] = firstPlaylist;
          }
        }
      });
      return next;
    });

    if (!silencioso) setLoading(false);
  };

  // ===== Acompanhamento automático do processamento =====
  // O servidor grava cada etapa (vídeo → transcrição → índice) em pipelineStatus,
  // mas a tela lia os dados uma única vez, no mount: o consultor via o status
  // congelado e precisava recarregar a página pra descobrir que já tinha acabado.
  // Enquanto houver vídeo em andamento, relê em silêncio a cada 15s e para sozinho
  // quando as três etapas concluem.
  const JANELA_PROCESSAMENTO_MS = 30 * 60 * 1000;
  const temVideoProcessando = useMemo(() => items.some((item) => {
    if (!item.bunnyVideoId) return false;
    const ps = item.pipelineStatus;
    const referencia = ps?.atualizadoEm
      ? Date.parse(ps.atualizadoEm)
      : (item.timestamp instanceof Date ? item.timestamp.getTime() : 0);
    // Vídeo antigo travado não entra em loop eterno de polling — pra esse caso
    // o consultor tem o "Refazer" em cada vídeo.
    if (!referencia || Date.now() - referencia > JANELA_PROCESSAMENTO_MS) return false;
    if (ps) {
      return [ps.processamentoVideo, ps.transcricao, ps.indice].some((etapa) => etapa === 'processando');
    }
    // Recém-enviado: o servidor ainda não gravou a primeira etapa.
    return !(item.summary?.length);
  }), [items]);

  useEffect(() => {
    if (!temVideoProcessando && Date.now() >= acompanharAte) return;
    const timer = setInterval(() => {
      // A janela de acompanhamento se encerra sozinha quando expira e não há
      // mais nada em andamento.
      if (!temVideoProcessando && Date.now() >= acompanharAte) {
        clearInterval(timer);
        return;
      }
      void fetchItems(true);
    }, 15_000);
    return () => clearInterval(timer);
  }, [temVideoProcessando, acompanharAte]);

  // Voltar pra aba relê na hora. Cobre o caso de sair da tela enquanto processa
  // e voltar depois: sem isso o consultor via o estado de quando saiu.
  useEffect(() => {
    let ultima = 0;
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - ultima < 10_000) return; // não relê a cada alt-tab
      ultima = Date.now();
      void fetchItems(true);
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, []);

  const toggleTool = (toolId: string) => {
    setFormData(prev => ({
      ...prev,
      associatedTools: prev.associatedTools.includes(toolId)
        ? prev.associatedTools.filter(id => id !== toolId)
        : [...prev.associatedTools, toolId]
    }));
  };

  const toggleAnalysis = (analysisId: string) => {
    setFormData(prev => ({
      ...prev,
      associatedAnalyses: prev.associatedAnalyses.includes(analysisId)
        ? prev.associatedAnalyses.filter(id => id !== analysisId)
        : [...prev.associatedAnalyses, analysisId]
    }));
  };

  const toggleEditTool = (toolId: string) => {
    setEditVideoData(prev => ({
      ...prev,
      associatedTools: prev.associatedTools.includes(toolId)
        ? prev.associatedTools.filter(id => id !== toolId)
        : [...prev.associatedTools, toolId]
    }));
  };

  const toggleEditAnalysis = (analysisId: string) => {
    setEditVideoData(prev => ({
      ...prev,
      associatedAnalyses: prev.associatedAnalyses.includes(analysisId)
        ? prev.associatedAnalyses.filter(id => id !== analysisId)
        : [...prev.associatedAnalyses, analysisId]
    }));
  };

  // Todo vídeo novo numa playlist EXISTENTE precisa nascer com o mesmo playlistOrder
  // dos irmãos. Sem isso o curso inteiro perde "ordem completa" (nem toda playlist
  // tem valor numérico) e a tela recalcula a ordem de TODAS as playlists do curso
  // do zero a cada carregamento — o que é exatamente o que fazia uma playlist
  // reordenada manualmente "voltar sozinha" pro lugar errado.
  const playlistOrderPara = (course: string, playlist: string): number | undefined => {
    const irmao = items.find((i) => i.course === course && i.playlist === playlist && typeof i.playlistOrder === 'number');
    if (irmao) return irmao.playlistOrder;
    // Playlist nova: entra depois da última já existente no curso.
    const ordensDoCurso = items
      .filter((i) => i.course === course && typeof i.playlistOrder === 'number')
      .map((i) => i.playlistOrder as number);
    return ordensDoCurso.length ? Math.max(...ordensDoCurso) + 1 : 0;
  };

  const resolvePlacements = () => formData.placements
    .map(p => ({ course: p.course, playlist: p.playlist === 'NEW' ? p.newPlaylistName.trim() : p.playlist }))
    .filter(p => p.course && p.playlist);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolved = resolvePlacements();
    if (resolved.length === 0) {
      alert('Selecione ao menos um curso e playlist.');
      return;
    }
    setIsSaving(true);
    try {
      if (!upBunny) { alert('Envie o arquivo de vídeo primeiro.'); setIsSaving(false); return; }
      const title = (upTitle || upFile?.name?.replace(/\.[^.]+$/, '') || 'Vídeo').trim();
      // ID técnico único preserva multi-placement sem expor o provedor na interface.
      const src = `bunny:${upBunny.guid}`;
      await Promise.all(resolved.map(p =>
        saveKnowledge({
          title, content: '', sourceUrl: src,
          course: p.course, playlist: p.playlist,
          rawTranscript: '', summary: [], transcript: '',
          associatedTools: formData.associatedTools,
          associatedAnalyses: formData.associatedAnalyses,
          consultorId,
          bunnyVideoId: upBunny.guid, bunnyLibraryId: upBunny.libraryId,
          playlistOrder: playlistOrderPara(p.course, p.playlist),
          ...(p.course === INTRO_COURSE_CONSULTOR && consultorOnboardingStepId(p.playlist)
            ? { onboardingStep: consultorOnboardingStepId(p.playlist) }
            : {}),
        } as any)
      ));

      // Inicia automaticamente as três etapas no servidor. Não bloqueia o fechamento
      // do formulário; o servidor aguarda a codificação do Bunny e atualiza os placements.
      void processUploadedVideoAutomatically(upBunny.guid);
      acompanharPor20Min();

      setFormData(emptyFormData);
      setUpFile(null); setUpTitle(''); setUpProgress(null); setUpBunny(null); setUpErro('');
      setIsAdding(false);
      setIsToolsDropdownOpen(false);
      setIsAnalysesDropdownOpen(false);
      fetchItems();
    } catch (error) {
      alert('Erro ao salvar item.');
    } finally {
      setIsSaving(false);
    }
  };

  // Atualiza transcrição/resumo em todos os docs com a mesma sourceUrl (placements irmãos).
  const syncSiblingsBySourceUrl = async (sourceUrl: string, fields: Partial<KnowledgeEntry>) => {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, KNOWLEDGE_COLLECTION), where('sourceUrl', '==', sourceUrl)));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, fields));
    await batch.commit();
  };

  const handleRegenerateIndex = async (item: KnowledgeEntry) => {
    if (!item.rawTranscript || !item.id) return;
    setIsReprocessing(item.id);
    try {
      const { generateSummaryFromRawTranscript } = await import('../lib/gemini');
      const { summary, transcript } = await generateSummaryFromRawTranscript(item.sourceUrl, item.rawTranscript);
      if (!Array.isArray(summary) || summary.length === 0) {
        // Gemini engoliu o erro internamente e retornou vazio. Não sobrescrevemos
        // o doc com vazio — informamos o usuário pra ele saber que algo falhou.
        throw new Error('A IA retornou índice vazio. Verifique o console (F12) — pode ser limite de uso, serviço indisponível ou erro de leitura.');
      }
      await syncSiblingsBySourceUrl(item.sourceUrl, {
        summary,
        transcript: transcript || ''
      });
      await fetchItems();
    } catch (error: any) {
      console.error('[handleRegenerateIndex] erro:', error);
      alert(`Erro ao gerar índice: ${error?.message || 'erro desconhecido'}`);
    } finally {
      setIsReprocessing(null);
    }
  };

  const handleImportTranscript = async () => {
    if (!modalConfig.targetId || !rawTranscriptText.trim()) return;

    setIsReprocessing(modalConfig.targetId);
    setModalConfig({ isOpen: false, type: 'importTranscript' });

    try {
      const item = items.find(i => i.id === modalConfig.targetId);
      if (!item) return;

      const { generateSummaryFromRawTranscript } = await import('../lib/gemini');
      const { summary, transcript } = await generateSummaryFromRawTranscript(item.sourceUrl, rawTranscriptText);

      await syncSiblingsBySourceUrl(item.sourceUrl, {
        rawTranscript: rawTranscriptText,
        summary: summary || [],
        transcript: transcript || ''
      });
      setRawTranscriptText('');
      await fetchItems();
      setExpandedId(item.id!);
    } catch (error) {
      alert("Erro ao processar transcrição completa.");
    } finally {
      setIsReprocessing(null);
    }
  };

  const salvarOrdemPlaylists = async (courseName: string, reordered: string[]) => {
    setItems(prev => prev.map(item => {
      if (item.course !== courseName) return item;
      const newOrder = reordered.indexOf(item.playlist);
      return newOrder === -1 ? item : { ...item, playlistOrder: newOrder };
    }));

    try {
      const batch = writeBatch(db);
      reordered.forEach((playlistName, idx) => {
        const playlistVideos = items.filter(i => i.course === courseName && i.playlist === playlistName);
        playlistVideos.forEach(video => {
          if (video.id) batch.update(doc(db, KNOWLEDGE_COLLECTION, video.id), { playlistOrder: idx });
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Erro ao salvar ordem das playlists:', error);
      alert('Erro ao salvar a ordem das playlists. Recarregue a página.');
    }
  };

  const makePlaylistDragEnd = (courseName: string, playlistNames: string[]) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = playlistNames.indexOf(String(active.id));
    const newIdx = playlistNames.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    await salvarOrdemPlaylists(courseName, arrayMove(playlistNames, oldIdx, newIdx));
  };

  const moverPlaylist = async (courseName: string, playlistNames: string[], playlistName: string, delta: -1 | 1) => {
    const index = playlistNames.indexOf(playlistName);
    const destino = index + delta;
    if (index < 0 || destino < 0 || destino >= playlistNames.length) return;
    await salvarOrdemPlaylists(courseName, arrayMove(playlistNames, index, destino));
  };

  const handleModalConfirm = async () => {
    try {
      if (modalConfig.type === 'deleteVideo' && modalConfig.targetId) {
        await deleteKnowledge(modalConfig.targetId);
      } else if (modalConfig.type === 'editVideo' && editVideoData.id) {
        const currentItem = items.find(i => i.id === editVideoData.id);
        if (!currentItem) {
          throw new Error('Vídeo não encontrado.');
        }
        const placementsValidos = editPlacements
          .map((p) => ({
            ...p,
            course: p.course.trim(),
            playlist: isFixedIntroCourse(p.course) ? INTRO_PLAYLIST : (p.playlist === 'NEW' ? p.newPlaylistName.trim() : p.playlist.trim()),
          }))
          .filter((p) => p.course && p.playlist);
        if (placementsValidos.length === 0) {
          throw new Error('Selecione ao menos um curso e uma playlist.');
        }
        const chaves = placementsValidos.map((p) => `${p.course}__${p.playlist}`.toLowerCase());
        if (new Set(chaves).size !== chaves.length) {
          throw new Error('O mesmo curso e playlist foi selecionado mais de uma vez para este video.');
        }
        const keptIds = new Set(placementsValidos.filter(p => p.id).map(p => p.id!));
        for (const oid of editOriginalIds) {
          if (!keptIds.has(oid)) {
            await deleteKnowledge(oid);
          }
        }
        for (const p of placementsValidos) {
          const finalPlaylist = p.playlist;
          if (p.id) {
            await updateKnowledge(p.id, {
              title: editVideoData.title,
              course: p.course,
              playlist: finalPlaylist,
              associatedTools: editVideoData.associatedTools,
              associatedAnalyses: editVideoData.associatedAnalyses,
              ...(p.course === INTRO_COURSE_CONSULTOR && consultorOnboardingStepId(finalPlaylist)
                ? { onboardingStep: consultorOnboardingStepId(finalPlaylist) }
                : {})
            });
          } else {
            const novoPlacement: Omit<KnowledgeEntry, 'timestamp' | 'id'> = {
              title: editVideoData.title,
              content: currentItem.content || '',
              sourceUrl: currentItem.sourceUrl,
              course: p.course,
              playlist: finalPlaylist,
              rawTranscript: currentItem.rawTranscript || '',
              summary: currentItem.summary || [],
              transcript: currentItem.transcript || '',
              associatedTools: editVideoData.associatedTools,
              associatedAnalyses: editVideoData.associatedAnalyses,
              consultorId,
              playlistOrder: playlistOrderPara(p.course, finalPlaylist),
              ...(p.course === INTRO_COURSE_CONSULTOR && consultorOnboardingStepId(finalPlaylist)
                ? { onboardingStep: consultorOnboardingStepId(finalPlaylist) }
                : {}),
            };
            if (currentItem.bunnyVideoId) novoPlacement.bunnyVideoId = currentItem.bunnyVideoId;
            if (currentItem.bunnyLibraryId) novoPlacement.bunnyLibraryId = currentItem.bunnyLibraryId;
            if (currentItem.bunnyThumbnailUrl) novoPlacement.bunnyThumbnailUrl = currentItem.bunnyThumbnailUrl;
            await saveKnowledge(novoPlacement);
          }
        }
      } else if (modalConfig.type === 'deleteCourse' && modalConfig.targetCourse) {
        await deleteCourse(modalConfig.targetCourse);
      } else if (modalConfig.type === 'editCourse' && modalConfig.targetCourse && modalConfig.inputValue) {
        const nomeAntigo = modalConfig.targetCourse;
        const nomeNovo = modalConfig.inputValue.trim();
        if (nomeNovo && nomeNovo !== nomeAntigo) {
          // Mesma propagação do /config: o curso é referenciado por NOME nos vídeos
          // e nos acessos (users.cursosAcesso / cursosLiberados). Renomear só um dos
          // três desliga o aluno do curso. Ou propaga tudo, ou nada.
          await updateCourseName(nomeAntigo, nomeNovo);
          await propagarRenomeacaoParaAcessos(nomeAntigo, nomeNovo);
          const ini = initiatives.find((i) => i.name === nomeAntigo);
          if (ini) {
            await updateInitiative(ini.id, { name: nomeNovo });
            setInitiatives((prev) => prev.map((i) => (i.id === ini.id ? { ...i, name: nomeNovo } : i)));
            setInitiativeNames((prev) => prev.map((n) => (n === nomeAntigo ? nomeNovo : n)));
          }
        }
      } else if (modalConfig.type === 'deletePlaylist' && modalConfig.targetCourse && modalConfig.targetPlaylist) {
        await deletePlaylist(modalConfig.targetCourse, modalConfig.targetPlaylist);
      } else if (modalConfig.type === 'editPlaylist' && modalConfig.targetCourse && modalConfig.targetPlaylist && modalConfig.inputValue) {
        await updatePlaylistName(modalConfig.targetCourse, modalConfig.targetPlaylist, modalConfig.inputValue);
      }
      
      setModalConfig({ isOpen: false, type: 'editCourse' });
      fetchItems();
    } catch (error) {
      console.error("Erro na operação:", error);
      alert("Ocorreu um erro ao realizar a operação.");
    }
  };

  const parseTimeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const ordenarVideos = (videos: KnowledgeEntry[]) => [...videos].sort((a, b) => {
    const ordemA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const ordemB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const makeHandleDragEnd = (courseName: string, playlistName: string) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Sempre usa todos os vídeos da playlist, e não apenas os filtrados pela
    // busca. Assim uma busca ativa não renumera ou perde vídeos ocultos.
    const playlistItems = ordenarVideos(
      items.filter((item) => item.course === courseName && item.playlist === playlistName)
    );
    const oldIdx = playlistItems.findIndex(v => v.id === String(active.id));
    const newIdx = playlistItems.findIndex(v => v.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(playlistItems, oldIdx, newIdx);

    const ordemPorId = new Map(reordered.map((item, index) => [item.id, index + 1]));
    setItems(prev => {
      // Mantém cada vídeo no seu curso/playlist e altera somente o campo de
      // ordem. Isso evita que a lista inteira seja remontada ao final.
      return prev.map((item) => {
        const novaOrdem = ordemPorId.get(item.id);
        return novaOrdem === undefined ? item : { ...item, order: novaOrdem };
      });
    });
    try {
      const batch = writeBatch(db);
      reordered.forEach((item, i) => {
        if (item.id) batch.update(doc(db, KNOWLEDGE_COLLECTION, item.id), { order: i + 1 });
      });
      await batch.commit();
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      alert('Erro ao salvar a ordem. Recarregue a página.');
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.playlist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueCourses = Array.from(new Set(items.map(item => item.course).filter(Boolean)));

  const introCourseOptions = [INTRO_COURSE_ALUNO, INTRO_COURSE_COORDENADOR, INTRO_COURSE_CONSULTOR];
  const regularCourseOptions = initiativeNames.filter(c => !isIntroCourse(c));

  const playlistsForCourse = (course: string) => {
    if (isFixedIntroCourse(course)) return [INTRO_PLAYLIST];
    const playlistsCriadas = course && course !== 'NEW'
      ? items.filter(i => i.course === course).map(i => i.playlist).filter(Boolean)
      : [];
    // A lista inicial aparece mesmo antes do primeiro vídeo ser cadastrado.
    return Array.from(new Set([
      ...(course === INTRO_COURSE_CONSULTOR ? CONSULTOR_ONBOARDING_PLAYLISTS : []),
      ...playlistsCriadas,
    ]));
  };

  // Group by Course -> Playlist -> Videos
  const groupedItemsMap = filteredItems.reduce((acc, item) => {
    const course = item.course || 'Sem Curso';
    const playlist = item.playlist || 'Sem Playlist';
    
    if (!acc[course]) acc[course] = {};
    if (!acc[course][playlist]) acc[course][playlist] = [];
    
    acc[course][playlist].push(item);
    return acc;
  }, {} as Record<string, Record<string, KnowledgeEntry[]>>);

  // A sequência dos vídeos é independente da sequência das playlists/fases.
  // Ordenar aqui também protege a tela contra registros antigos com
  // playlistOrder inconsistente.
  Object.values(groupedItemsMap).forEach((playlists) => {
    Object.keys(playlists).forEach((playlistName) => {
      playlists[playlistName] = ordenarVideos(playlists[playlistName]);
    });
  });

  // Cursos cadastrados que ainda não têm nenhum vídeo também aparecem — senão o
  // curso recém-criado ficaria invisível e não haveria como perceber que existe.
  regularCourseOptions
    .filter((nome) => !groupedItemsMap[nome])
    .filter((nome) => !searchTerm || nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .forEach((nome) => { groupedItemsMap[nome] = {}; });

  // As três trilhas de orientação são áreas especiais, mas devem aparecer
  // sempre na Base de Conhecimento do consultor — inclusive antes de haver
  // vídeos cadastrados nessa trilha.
  introCourseOptions
    .filter((nome) => !groupedItemsMap[nome])
    .filter((nome) => !searchTerm || nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .forEach((nome) => { groupedItemsMap[nome] = {}; });

  // Convert to sorted arrays — cursos ordenados por nome com numeric:true,
  // pra que prefixos numéricos do nome ("1-", "2-", "10-") sejam respeitados.
  const groupedItems = Object.entries(groupedItemsMap)
    .sort(([a], [b]) => {
      const introA = isIntroCourse(a);
      const introB = isIntroCourse(b);
      if (introA !== introB) return introA ? -1 : 1;
      if (introA && introB) return introCourseOptions.indexOf(a) - introCourseOptions.indexOf(b);
      return a.localeCompare(b, 'pt-BR', { numeric: true });
    })
    .map(([courseName, playlistsMap]) => {
    const sortedPlaylists = Object.entries(playlistsMap)
      .map(([playlistName, videos]) => ({
        name: playlistName,
        videos,
        // Ordem da playlist = a de QUALQUER vídeo dela que já tenha playlistOrder
        // definido — não necessariamente videos[0]. Um vídeo recém-adicionado sem
        // ordem (upload em andamento, dado legado) não pode empurrar a playlist
        // inteira pro fim só por ter caído primeiro no array.
        order: videos.find((v) => typeof v.playlistOrder === 'number')?.playlistOrder ?? Number.MAX_SAFE_INTEGER
      }))
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });

    return {
      name: courseName,
      playlists: sortedPlaylists
    };
  });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center bg-white p-6 border border-[#ccc] rounded-[4px]">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#333] m-0">Base de Conhecimento</h1>
          <p className="text-[#666] mt-1 text-sm">Gerencie seus vídeos e recursos educacionais.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsCreatingCourse(true); setIsAdding(false); }}
            className="flex items-center gap-2 bg-white text-blue-700 border border-blue-600 px-4 py-2 rounded-[4px] font-bold hover:bg-blue-50 transition-all cursor-pointer"
            title="Criar um curso novo. Depois é só adicionar vídeos nele normalmente."
          >
            <Folder size={18} /> Criar Curso
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-[4px] font-bold hover:bg-blue-700 transition-all border-none cursor-pointer"
          >
            <Plus size={18} /> Adicionar Vídeo
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 bg-white p-4 border border-[#ccc] rounded-[4px]">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Pesquisar por título, curso ou playlist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#f9f9f9] border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {isCreatingCourse && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 border border-[#ccc] rounded-[4px] shadow-lg"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 m-0">
              <Folder className="text-blue-600" size={22} />
              Criar Novo Curso
            </h2>
            <button onClick={() => { setIsCreatingCourse(false); setNewCourseName(''); }} className="p-2 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateCourse} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do curso</label>
              <input
                required
                autoFocus
                type="text"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Ex: Análise de Causa Raiz"
                className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-2 m-0">
                Depois de criar, o curso já aparece no campo <b>Curso</b> de "Adicionar Vídeo".
                Vídeos, playlists, ferramentas da qualidade e análises estatísticas funcionam
                exatamente como nos outros cursos.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#eee]">
              <button
                type="button"
                onClick={() => { setIsCreatingCourse(false); setNewCourseName(''); }}
                className="px-6 py-2 border border-[#ccc] rounded-[4px] font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingCourse || !newCourseName.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-[4px] font-bold hover:bg-blue-700 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                {isSavingCourse ? 'Criando...' : <><Save size={18} /> Criar Curso</>}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {isAdding && (
        <motion.div
          ref={addFormRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 border border-[#ccc] rounded-[4px] shadow-lg"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Video className="text-blue-600" size={24} />
              Adicionar Novo Vídeo
            </h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase">Arquivo de vídeo</label>
              <input
                type="text"
                value={upTitle}
                onChange={(e) => setUpTitle(e.target.value)}
                placeholder="Título do vídeo (ou use o nome do arquivo)"
                className="w-full px-4 py-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
              />
              <div ref={uploadAreaRef} className="flex items-center gap-2 flex-wrap [&>input[type=file]]:sr-only">
                <button
                  type="button"
                  onClick={() => uploadAreaRef.current?.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                >
                  Selecionar vídeo
                </button>
                <span className="text-sm text-gray-600 truncate max-w-[420px]">
                  {upFile ? upFile.name : 'Nenhum arquivo selecionado'}
                </span>
                <input type="file" accept="video/*" onChange={(e) => { setUpFile(e.target.files?.[0] || null); setUpBunny(null); setUpProgress(null); setUpErro(''); }} className="text-sm" />
                <button type="button" onClick={uploadParaBunny} title="Enviar este arquivo para o Bunny" disabled={upProgress !== null && upProgress < 100} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
                  {upProgress !== null && upProgress < 100 ? `Enviando ${upProgress}%` : (upBunny ? 'Enviado ✓' : 'Enviar vídeo')}
                </button>
              </div>
              <div className="text-xs text-gray-500">1) Envie o arquivo para o Bunny  2) Escolha o curso e a playlist  3) Clique em Salvar Vídeo</div>
              {!upFile && !upErro && <div className="text-xs text-gray-500">Selecione um arquivo de vídeo antes de enviar.</div>}
              {upProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 transition-all" style={{ width: `${upProgress}%` }} />
                </div>
              )}
              {upBunny && <div className="text-xs font-bold text-emerald-600">✅ Vídeo enviado — agora escolha os cursos e salve.</div>}
              {upErro && <div className="text-xs font-bold text-red-600">❌ {upErro}</div>}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase">
                Cursos e playlists onde este vídeo aparece
              </label>
              {formData.placements.map((p, idx) => {
                const availPlaylists = playlistsForCourse(p.course);
                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                    <select
                      required
                      value={p.course}
                      onChange={(e) => updatePlacement(idx, { course: e.target.value, playlist: '', newPlaylistName: '' })}
                      className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-white"
                    >
                      <option value="" disabled>Selecione um curso...</option>
                      <optgroup label="Abas especiais">
                        {introCourseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Cursos">
                        {regularCourseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                    <div className="space-y-2">
                      <select
                        required
                        value={p.playlist}
                        onChange={(e) => updatePlacement(idx, { playlist: e.target.value })}
                        className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-white"
                        disabled={isFixedIntroCourse(p.course)}
                      >
                        <option value="" disabled>Selecione uma playlist...</option>
                        {availPlaylists.map(pl => (
                          <option key={pl} value={pl}>{pl}</option>
                        ))}
                        {!isFixedIntroCourse(p.course) && <option value="NEW">+ Cadastrar nova playlist</option>}
                      </select>
                      {p.playlist === 'NEW' && (
                        <input
                          required
                          type="text"
                          value={p.newPlaylistName}
                          onChange={(e) => updatePlacement(idx, { newPlaylistName: e.target.value })}
                          className="w-full p-2 border border-blue-300 rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-blue-50"
                          placeholder="Nome da nova playlist"
                        />
                      )}
                    </div>
                    {formData.placements.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePlacement(idx)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer self-center"
                        title="Remover este destino"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <div className="w-9" />
                    )}
                  </div>
                );
              })}
              {(
                <button
                  type="button"
                  onClick={addPlacement}
                  className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 border-none bg-transparent cursor-pointer pt-1"
                >
                  <Plus size={14} /> Adicionar em outro curso
                </button>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ferramentas Associadas (Opcional)</label>
              <div className="relative">
                <div 
                  className="w-full p-2 border border-[#ccc] rounded-[4px] bg-white cursor-pointer flex justify-between items-center text-sm min-h-[38px]"
                  onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                >
                  <span className="text-gray-700 truncate">
                    {formData.associatedTools.length === 0 
                      ? "Selecione as ferramentas..." 
                      : `${formData.associatedTools.length} ferramenta(s) selecionada(s)`}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
                
                {isToolsDropdownOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#ccc] rounded-[4px] shadow-lg max-h-60 overflow-y-auto">
                    {[...AVAILABLE_TOOLS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(tool => (
                      <label key={tool.id} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.associatedTools.includes(tool.id)}
                          onChange={() => toggleTool(tool.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {tool.name}
                      </label>
                    ))}
                    <div className="sticky bottom-0 bg-white border-t border-[#eee] p-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsToolsDropdownOpen(false); }}
                        className="w-full bg-blue-50 text-blue-600 font-bold py-2 rounded hover:bg-blue-100 transition-colors text-sm cursor-pointer border-none"
                      >
                        Confirmar Seleção
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Análises Associadas (Opcional)</label>
              <div className="relative">
                <div 
                  className="w-full p-2 border border-[#ccc] rounded-[4px] bg-white cursor-pointer flex justify-between items-center text-sm min-h-[38px]"
                  onClick={() => setIsAnalysesDropdownOpen(!isAnalysesDropdownOpen)}
                >
                  <span className="text-gray-700 truncate">
                    {formData.associatedAnalyses.length === 0 
                      ? "Selecione as análises..." 
                      : `${formData.associatedAnalyses.length} análise(s) selecionada(s)`}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
                
                {isAnalysesDropdownOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#ccc] rounded-[4px] shadow-lg max-h-60 overflow-y-auto">
                    {[...AVAILABLE_ANALYSES].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(analysis => (
                      <label key={analysis.id} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.associatedAnalyses.includes(analysis.id)}
                          onChange={() => toggleAnalysis(analysis.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {analysis.name}
                      </label>
                    ))}
                    <div className="sticky bottom-0 bg-white border-t border-[#eee] p-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsAnalysesDropdownOpen(false); }}
                        className="w-full bg-blue-50 text-blue-600 font-bold py-2 rounded hover:bg-blue-100 transition-colors text-sm cursor-pointer border-none"
                      >
                        Confirmar Seleção
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#eee]">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 border border-[#ccc] rounded-[4px] font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-[4px] font-bold hover:bg-blue-700 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Gerando Resumo com IA e Salvando...' : <><Save size={18} /> Salvar Vídeo</>}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="text-center py-12 bg-white border border-[#ccc] rounded-[4px]">
            <p className="text-gray-500">Carregando recursos...</p>
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#ccc] rounded-[4px]">
            <Video size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">Nenhum vídeo encontrado.</p>
            <p className="text-gray-400 text-sm">Adicione seu primeiro vídeo para começar.</p>
          </div>
        ) : (
          groupedItems.map((course) => {
            const abaEspecial = isIntroCourse(course.name);
            const totalDoCurso = items.filter(i => i.course === course.name).length;
            const visibleNoCurso = course.playlists.reduce((sum, p) => sum + p.videos.length, 0);
            const filtroAtivo = !!searchTerm && visibleNoCurso < totalDoCurso;
            const activePl = course.playlists.find(p => p.name === activePlaylists[course.name]);
            return (
            <div key={course.name} className="bg-white border border-[#ccc] rounded-[4px] overflow-hidden">
              {/* Course Header */}
              <div className="bg-gray-50 p-4 border-b border-[#ccc] flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Folder className="text-blue-600" size={20} />
                  <h2 className="font-bold text-lg text-gray-800 m-0">{course.name}</h2>
                  {abaEspecial && (
                    <span className="bg-purple-50 text-purple-700 text-[11px] font-bold px-2 py-1 rounded-full border border-purple-200">
                      Aba especial
                    </span>
                  )}
                  <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {totalDoCurso} vídeo{totalDoCurso !== 1 ? 's' : ''} {abaEspecial ? 'na aba' : 'no curso'}
                  </span>
                  {activePl && (
                    <span className="bg-gray-200 text-gray-700 text-[11px] font-bold px-2 py-1 rounded-full">
                      {activePl.videos.length} nesta playlist
                    </span>
                  )}
                  {filtroAtivo && (
                    <span className="bg-yellow-100 text-yellow-800 text-[11px] font-bold px-2 py-1 rounded-full border border-yellow-300">
                      Filtro ativo · {visibleNoCurso} de {totalDoCurso} visíveis
                    </span>
                  )}
                  {/* Toggle "tem projeto?" — decide se o curso vira tipo de projeto na aba Projetos */}
                  {!abaEspecial && (() => {
                    const ini = initiatives.find((i) => i.name === course.name);
                    if (!ini) return <span className="text-[11px] text-gray-400 italic ml-1" title="Curso sem projeto correspondente">sem projeto</span>;
                    const temProjeto = ini.temProjeto !== false;
                    return (
                      <button
                        onClick={() => toggleTemProjeto(course.name)}
                        title="Este curso aparece como projeto na aba Projetos? Clique para alternar."
                        className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors ${temProjeto ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'}`}
                      >
                        {temProjeto ? '✓ Tem projeto' : 'Só conteúdo'}
                      </button>
                    );
                  })()}
                </div>
                {!abaEspecial && <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirAdicaoNoCurso(course.name)}
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-[4px] hover:bg-blue-700 transition-colors border-none cursor-pointer whitespace-nowrap"
                    title={`Adicionar um vídeo em ${course.name}`}
                  >
                    <Plus size={14} /> Adicionar vídeo
                  </button>
                  <button
                    onClick={() => setModalConfig({ isOpen: true, type: 'editCourse', targetCourse: course.name, inputValue: course.name })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer" 
                    title="Editar nome do curso"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => totalDoCurso === 0
                      ? handleDeleteEmptyCourse(course.name)
                      : setModalConfig({ isOpen: true, type: 'deleteCourse', targetCourse: course.name })}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer"
                    title={totalDoCurso === 0 ? 'Excluir curso' : 'Excluir curso e todos os seus vídeos'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>}
              </div>
              
              {/* Curso recém-criado, ainda sem nenhum vídeo */}
              {course.playlists.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Video size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm font-bold m-0">Este curso ainda não tem vídeos.</p>
                  <p className="text-gray-400 text-xs mt-1 mb-3">
                    Comece pelo primeiro vídeo — você dá o nome da primeira playlist na hora.
                  </p>
                  <button
                    onClick={() => abrirAdicaoNoCurso(course.name)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-[4px] font-bold text-sm hover:bg-blue-700 transition-colors border-none cursor-pointer"
                  >
                    <Plus size={16} /> Adicionar primeiro vídeo
                  </button>
                </div>
              )}

              {/* Playlists Tabs */}
              <div className={cn('bg-white border-b border-[#eee] px-4 pt-4', course.playlists.length === 0 && 'hidden')}>
                <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={makePlaylistDragEnd(course.name, course.playlists.map(p => p.name))}
                  >
                    <SortableContext
                      items={course.playlists.map(p => p.name)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {course.playlists.map((playlist) => (
                        <SortablePlaylistTab
                          key={playlist.name}
                          playlist={playlist}
                          isActive={activePlaylists[course.name] === playlist.name}
                          isFirst={course.playlists[0]?.name === playlist.name}
                          isLast={course.playlists[course.playlists.length - 1]?.name === playlist.name}
                          onSelect={() => setActivePlaylists(prev => ({ ...prev, [course.name]: playlist.name }))}
                          onEdit={() => setModalConfig({ isOpen: true, type: 'editPlaylist', targetCourse: course.name, targetPlaylist: playlist.name, inputValue: playlist.name })}
                          onDelete={() => setModalConfig({ isOpen: true, type: 'deletePlaylist', targetCourse: course.name, targetPlaylist: playlist.name })}
                          onMoveLeft={() => moverPlaylist(course.name, course.playlists.map((item) => item.name), playlist.name, -1)}
                          onMoveRight={() => moverPlaylist(course.name, course.playlists.map((item) => item.name), playlist.name, 1)}
                          // As playlists de aluno/coordenador são fixas. Já o
                          // Consultor Comece por aqui é editável pelo consultor.
                          hideActions={isFixedIntroCourse(course.name)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  {!abaEspecial && activePlaylists[course.name] && (
                    <button
                      onClick={() => abrirAdicaoNoCurso(course.name, activePlaylists[course.name])}
                      className="flex items-center gap-1.5 shrink-0 text-blue-700 bg-blue-50 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap"
                      title={`Adicionar vídeo em ${activePlaylists[course.name]}`}
                    >
                      <Plus size={14} /> Vídeo nesta playlist
                    </button>
                  )}
                </div>
              </div>

              {/* Active Playlist Content */}
              {activePlaylists[course.name] && course.playlists.find(p => p.name === activePlaylists[course.name]) && (
                <div className="border-b border-[#eee] last:border-0">
                  <table className="w-full border-collapse">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={makeHandleDragEnd(course.name, activePlaylists[course.name])}
                    >
                      <SortableContext
                        items={course.playlists.find(p => p.name === activePlaylists[course.name])!.videos.map(v => v.id!)}
                        strategy={verticalListSortingStrategy}
                      >
                        <tbody>
                          {course.playlists.find(p => p.name === activePlaylists[course.name])!.videos.map((item) => (
                            <SortableVideoRow
                              key={item.id}
                              item={item}
                              items={items}
                              expandedId={expandedId}
                              seekTime={seekTime}
                              isReprocessing={isReprocessing}
                              parseTimeToSeconds={parseTimeToSeconds}
                              handleRegenerateIndex={handleRegenerateIndex}
                              handleRetryProcessing={handleRetryProcessing}
                              setModalConfig={setModalConfig}
                              setExpandedId={setExpandedId}
                              setSeekTime={setSeekTime}
                              setEditVideoData={setEditVideoData}
                              setEditPlacements={setEditPlacements}
                              setEditOriginalIds={setEditOriginalIds}
                            />
                          ))}
                        </tbody>
                      </SortableContext>
                    </DndContext>
                  </table>
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {/* Custom Modal */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {modalConfig.type === 'deleteCourse' && `Excluir Curso`}
                {modalConfig.type === 'editCourse' && `Editar Nome do Curso`}
                {modalConfig.type === 'deletePlaylist' && `Excluir Playlist`}
                {modalConfig.type === 'editPlaylist' && `Editar Nome da Playlist`}
                {modalConfig.type === 'deleteVideo' && `Excluir Vídeo`}
                {modalConfig.type === 'editVideo' && `Editar Vídeo`}
                {modalConfig.type === 'importTranscript' && `Importar Transcrição Completa`}
              </h3>
              
              <div className="mb-6 text-sm text-gray-600">
                {modalConfig.type === 'deleteCourse' && (
                  <p>Tem certeza que deseja excluir o curso <strong>{modalConfig.targetCourse}</strong>? Isso excluirá <strong>todos os vídeos</strong> associados a ele. Esta ação não pode ser desfeita.</p>
                )}
                {modalConfig.type === 'deletePlaylist' && (
                  <p>Tem certeza que deseja excluir a playlist <strong>{modalConfig.targetPlaylist}</strong>? Isso excluirá <strong>todos os vídeos</strong> desta playlist. Esta ação não pode ser desfeita.</p>
                )}
                {modalConfig.type === 'deleteVideo' && (
                  <p>Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.</p>
                )}
                
                {modalConfig.type === 'importTranscript' && (
                  <div className="space-y-4">
                    <p>Cole abaixo a <strong>transcrição completa</strong> do vídeo (com os tempos). A IA vai ler 100% do texto para gerar um índice clicável e um resumo detalhado, e o texto original ficará salvo para você ler.</p>
                    <textarea
                      value={rawTranscriptText}
                      onChange={(e) => setRawTranscriptText(e.target.value)}
                      placeholder="Exemplo:&#10;00:00 Olá pessoal, bem-vindos a mais um vídeo...&#10;00:05 Hoje vamos falar sobre Lean Six Sigma...&#10;00:10 E como aplicar na sua empresa..."
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-48 font-mono text-xs"
                    />
                  </div>
                )}
                
                {modalConfig.type === 'editVideo' && (
                  <div className="space-y-4">
                    <div>
                      <label className="font-bold text-xs uppercase text-gray-500 block mb-1">Título do Vídeo</label>
                      <input 
                        type="text" 
                        value={editVideoData.title} 
                        onChange={(e) => setEditVideoData({...editVideoData, title: e.target.value})}
                        className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="font-bold text-xs uppercase text-gray-500 block mb-2">Cursos onde este vídeo aparece</label>
                      <div className="space-y-2">
                        {editPlacements.map((p, idx) => {
                          const availPlaylists = playlistsForCourse(p.course);
                          return (
                            <div key={p.id || `new-${idx}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                              <select
                                value={p.course}
                                onChange={(e) => {
                                  const course = e.target.value;
                                  setEditPlacements(prev => prev.map((pp, i) => i === idx
                                    ? { ...pp, course, playlist: isFixedIntroCourse(course) ? INTRO_PLAYLIST : '', newPlaylistName: '' }
                                    : pp
                                  ));
                                }}
                                className="p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 bg-white text-sm"
                              >
                                <option value="" disabled>Selecione um curso...</option>
                                <optgroup label="Abas especiais">
                                  {introCourseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                                <optgroup label="Cursos">
                                  {regularCourseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                              </select>
                              <div className="space-y-1">
                                <select
                                  value={p.playlist}
                                  onChange={(e) => setEditPlacements(prev => prev.map((pp, i) => i === idx ? { ...pp, playlist: e.target.value } : pp))}
                                  className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 bg-white text-sm"
                                  disabled={isFixedIntroCourse(p.course)}
                                >
                                  <option value="" disabled>Selecione uma playlist...</option>
                                  {availPlaylists.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                                  {!isFixedIntroCourse(p.course) && <option value="NEW">+ Nova playlist</option>}
                                </select>
                                {p.playlist === 'NEW' && (
                                  <input
                                    type="text"
                                    value={p.newPlaylistName}
                                    onChange={(e) => setEditPlacements(prev => prev.map((pp, i) => i === idx ? { ...pp, newPlaylistName: e.target.value } : pp))}
                                    className="w-full p-2 border border-blue-300 rounded-[4px] focus:outline-none focus:border-blue-500 bg-blue-50 text-sm"
                                    placeholder="Nome da nova playlist"
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditPlacements(prev => prev.filter((_, i) => i !== idx))}
                                disabled={editPlacements.length === 1}
                                title={editPlacements.length === 1 ? "Use o botão de remover do vídeo (lixeira) para excluir o último placement" : "Remover deste curso"}
                                className={cn(
                                  "p-2 border-none bg-transparent self-start",
                                  editPlacements.length === 1 ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-red-600 cursor-pointer"
                                )}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPlacements(prev => [...prev, { course: '', playlist: '', newPlaylistName: '' }])}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 border-none bg-transparent cursor-pointer pt-2"
                      >
                        <PlusCircle size={14} /> Adicionar em outro curso
                      </button>
                    </div>

                    <div>
                      <label className="font-bold text-xs uppercase text-gray-500 block mb-1">Ferramentas Associadas</label>
                      <div className="relative">
                        <div
                          className="w-full p-2 border border-[#ccc] rounded-[4px] bg-white cursor-pointer flex justify-between items-center min-h-[38px]"
                          onClick={() => setIsEditToolsDropdownOpen(!isEditToolsDropdownOpen)}
                        >
                          <span className="text-gray-700 truncate">
                            {editVideoData.associatedTools.length === 0 
                              ? "Selecione..." 
                              : `${editVideoData.associatedTools.length} selecionada(s)`}
                          </span>
                          <ChevronDown size={16} className="text-gray-400" />
                        </div>
                        
                        {isEditToolsDropdownOpen && (
                          <div className="absolute z-10 bottom-full mb-1 left-0 right-0 bg-white border border-[#ccc] rounded-[4px] shadow-lg max-h-48 overflow-y-auto">
                            {[...AVAILABLE_TOOLS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(tool => (
                              <label key={tool.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={editVideoData.associatedTools.includes(tool.id)}
                                  onChange={() => toggleEditTool(tool.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {tool.name}
                              </label>
                            ))}
                            <div className="sticky bottom-0 bg-white border-t border-[#eee] p-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsEditToolsDropdownOpen(false); }}
                                className="w-full bg-blue-50 text-blue-600 font-bold py-1.5 rounded hover:bg-blue-100 transition-colors cursor-pointer border-none"
                              >
                                Confirmar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-xs uppercase text-gray-500 block mb-1">Análises Associadas</label>
                      <div className="relative">
                        <div 
                          className="w-full p-2 border border-[#ccc] rounded-[4px] bg-white cursor-pointer flex justify-between items-center min-h-[38px]"
                          onClick={() => setIsEditAnalysesDropdownOpen(!isEditAnalysesDropdownOpen)}
                        >
                          <span className="text-gray-700 truncate">
                            {editVideoData.associatedAnalyses.length === 0 
                              ? "Selecione..." 
                              : `${editVideoData.associatedAnalyses.length} selecionada(s)`}
                          </span>
                          <ChevronDown size={16} className="text-gray-400" />
                        </div>
                        
                        {isEditAnalysesDropdownOpen && (
                          <div className="absolute z-10 bottom-full mb-1 left-0 right-0 bg-white border border-[#ccc] rounded-[4px] shadow-lg max-h-48 overflow-y-auto">
                            {[...AVAILABLE_ANALYSES].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(analysis => (
                              <label key={analysis.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={editVideoData.associatedAnalyses.includes(analysis.id)}
                                  onChange={() => toggleEditAnalysis(analysis.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {analysis.name}
                              </label>
                            ))}
                            <div className="sticky bottom-0 bg-white border-t border-[#eee] p-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsEditAnalysesDropdownOpen(false); }}
                                className="w-full bg-blue-50 text-blue-600 font-bold py-1.5 rounded hover:bg-blue-100 transition-colors cursor-pointer border-none"
                              >
                                Confirmar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {modalConfig.type.startsWith('edit') && modalConfig.type !== 'editVideo' && (
                  <div className="space-y-2">
                    <label className="font-bold text-xs uppercase text-gray-500">Novo Nome</label>
                    <input 
                      type="text" 
                      value={modalConfig.inputValue || ''} 
                      onChange={(e) => setModalConfig({...modalConfig, inputValue: e.target.value})}
                      className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setModalConfig({ isOpen: false, type: 'editCourse' })}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-[4px] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={
                    modalConfig.type === 'importTranscript' ? handleImportTranscript : 
                    handleModalConfirm
                  }
                  disabled={
                    (modalConfig.type === 'importTranscript' && !rawTranscriptText.trim())
                  }
                  className={cn(
                    "px-4 py-2 text-white font-bold rounded-[4px] transition-colors disabled:opacity-50",
                    modalConfig.type.startsWith('delete') ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {modalConfig.type === 'importTranscript' ? 'Processar Transcrição' : 
                   'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
