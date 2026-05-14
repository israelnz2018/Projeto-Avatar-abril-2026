import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  Trash2,
  Youtube,
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
  PlusCircle
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
import { cn } from '@/src/lib/utils';
import { db } from '../lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
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
  migrateAllCourses,
  KNOWLEDGE_COLLECTION
} from '../services/knowledgeService';
import { getInitiatives } from '../services/configService';

const AVAILABLE_TOOLS = [
  { id: 'brief', name: 'Entendendo o Problema' },
  { id: 'charter', name: 'Project Charter' },
  { id: 'stakeholderAdkar', name: 'Stakeholder & ADKAR' },
  { id: 'projectCharterPMI', name: 'Project Charter - PMI' },
  { id: 'measureAdkar', name: 'Stakeholder & ADKAR — Medir (Desire)' },
  { id: 'analyzeAdkar', name: 'ADKAR — Analisar (Knowledge)' },
  { id: 'improveAdkar', name: 'ADKAR — Melhorar (Ability)' },
  { id: 'controlAdkar', name: 'ADKAR — Controlar (Reinforcement)' },
  { id: 'sipoc', name: 'SIPOC' },
  { id: 'timeline', name: 'Cronograma Macro' },
  { id: 'wbs', name: 'WBS (EAP)' },
  { id: 'gpPlanPMI', name: 'Plano do GP - PMI' },
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
  { id: 'effortImpact', name: 'Esforço x Impacto' },
  { id: 'dataCollection', name: 'Plano de Coleta de Dados' },
  { id: 'vsm', name: 'VSM (Value Stream Map)' },
  { id: 'directObservation', name: 'Observação Direta (Gemba)' },
  { id: 'fiveWhys', name: '5 Porquês' },
  { id: 'fta', name: 'Árvore de Falhas (FTA)' },
  { id: 'statisticalAnalysis', name: 'Análise Estatística' },
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
  getYoutubeId: (url: string) => string | null;
  parseTimeToSeconds: (timeStr: string) => number;
  handleRegenerateIndex: (item: KnowledgeEntry) => void;
  setModalConfig: React.Dispatch<React.SetStateAction<ModalConfig>>;
  setExpandedId: (id: string | null) => void;
  setSeekTime: (time: number) => void;
  setEditVideoData: React.Dispatch<React.SetStateAction<any>>;
  setEditPlacements: (placements: Array<{ id?: string; course: string; playlist: string; newPlaylistName: string }>) => void;
  setEditOriginalIds: (ids: string[]) => void;
}

function SortableVideoRow({
  item, items, expandedId, seekTime, isReprocessing,
  getYoutubeId, parseTimeToSeconds, handleRegenerateIndex,
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
  const videoId = getYoutubeId(item.sourceUrl);

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
            <div className="w-24 aspect-video rounded overflow-hidden flex-shrink-0 border border-[#eee] relative group">
              {videoId ? (
                <>
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <Youtube className="text-white opacity-0 group-hover:opacity-100" size={24} />
                  </div>
                </>
              ) : (
                <Video className="w-full h-full p-2 text-gray-300" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm m-0 text-gray-800 line-clamp-2">{item.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                  Acessar no YouTube
                </a>
                <button
                  onClick={() => setModalConfig({ isOpen: true, type: 'importTranscript', targetId: item.id })}
                  disabled={isReprocessing === item.id}
                  className={cn(
                    "text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border transition-colors disabled:opacity-50 cursor-pointer",
                    item.rawTranscript
                      ? "bg-teal-600 border-teal-600 text-white hover:bg-teal-700"
                      : "bg-white border-blue-500 text-blue-600 hover:bg-blue-50"
                  )}
                  title={item.rawTranscript ? 'Ver/editar transcrição e reprocessar' : 'Colar transcrição do YouTube — a IA gera índice e resumo automaticamente'}
                >
                  <ListVideo size={12} />
                  {isReprocessing === item.id
                    ? 'Processando...'
                    : item.rawTranscript
                      ? 'Transcrição ✓'
                      : 'Importar Transcrição'}
                </button>
              </div>
              {item.associatedTools && item.associatedTools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.associatedTools.map(toolId => (
                    <span key={toolId} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                      {toolId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-4 text-xs text-gray-500 w-32 text-right">{item.timestamp.toLocaleDateString()}</td>
        <td className="p-4 w-28">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => {
                if (expandedId === item.id) { setExpandedId(null); }
                else { setExpandedId(item.id!); setSeekTime(0); }
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors border-none bg-transparent cursor-pointer flex items-center gap-1 text-xs font-bold"
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
                        <p className="text-sm text-gray-500">A transcrição está salva. Gere o índice clicável a partir dela:</p>
                        <button
                          onClick={() => handleRegenerateIndex(item)}
                          disabled={isReprocessing === item.id}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles size={14} />
                          {isReprocessing === item.id ? 'Gerando...' : 'Gerar índice'}
                        </button>
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
                  {videoId ? (
                    <iframe
                      ref={iframeRef}
                      width="100%" height="100%"
                      src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                      title="YouTube video player" frameBorder="0"
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
}

function SortablePlaylistTab({ playlist, isActive, onSelect, onEdit, onDelete }: SortablePlaylistTabProps) {
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
        <span className="text-[10px] ml-1 text-gray-400">({playlist.videos.length})</span>
      </button>
      <div className="flex items-center ml-1">
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
      </div>
    </div>
  );
}

export default function KnowledgeManagerView() {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [importMode, setImportMode] = useState<'single' | 'playlist'>('single');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    sourceUrl: '',
    playlistUrl: '',
    placements: [{ course: '', playlist: '', newPlaylistName: '' }] as Array<{ course: string; playlist: string; newPlaylistName: string }>,
    associatedTools: [] as string[],
    associatedAnalyses: [] as string[]
  });

  const emptyFormData = {
    sourceUrl: '',
    playlistUrl: '',
    placements: [{ course: '', playlist: '', newPlaylistName: '' }],
    associatedTools: [] as string[],
    associatedAnalyses: [] as string[]
  };

  const updatePlacement = (idx: number, patch: Partial<{ course: string; playlist: string; newPlaylistName: string }>) => {
    setFormData(prev => ({
      ...prev,
      placements: prev.placements.map((p, i) => i === idx ? { ...p, ...patch } : p)
    }));
  };

  const addPlacement = () => {
    setFormData(prev => ({ ...prev, placements: [...prev.placements, { course: '', playlist: '', newPlaylistName: '' }] }));
  };

  const removePlacement = (idx: number) => {
    setFormData(prev => ({ ...prev, placements: prev.placements.filter((_, i) => i !== idx) }));
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState<string | null>(null);
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

  const MIGRATION_COURSE = '1.2 - Formação em Gestão de Projetos de Melhoria (Lean Six Sigma Black Belt)';

  useEffect(() => {
    getInitiatives().then(list => {
      const names = list.filter(i => !!i.parentId).map(i => i.name).filter(Boolean);
      setInitiativeNames(names);
    }).catch(console.error);
    migrateAllCourses(MIGRATION_COURSE).catch(console.error);
    fetchItems();
  }, []);

  useEffect(() => {
    if (modalConfig.isOpen && modalConfig.type === 'importTranscript' && modalConfig.targetId) {
      const item = items.find(i => i.id === modalConfig.targetId);
      setRawTranscriptText(item?.rawTranscript || '');
    }
  }, [modalConfig.isOpen, modalConfig.type, modalConfig.targetId, items]);

  const fetchItems = async () => {
    setLoading(true);
    const data = await getAllKnowledge();
    setItems(data);
    
    // Set initial active playlists for each course
    const grouped = data.reduce((acc, item) => {
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
          const firstPlaylist = Array.from(playlists)[0];
          if (firstPlaylist) {
            next[course] = firstPlaylist;
          }
        }
      });
      return next;
    });
    
    setLoading(false);
  };

  const fetchYoutubeTitle = async (url: string) => {
    try {
      const res = await fetch(`https://noembed.com/embed?url=${url}`);
      const data = await res.json();
      return data.title || 'Vídeo do YouTube';
    } catch (e) {
      return 'Vídeo do YouTube';
    }
  };

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
      if (importMode === 'playlist') {
        const first = resolved[0];
        if (resolved.length > 1) {
          alert('A importação de fase usa apenas o primeiro curso/playlist. Os demais serão ignorados.');
        }
        const { extractPlaylistVideos } = await import('../lib/gemini');
        try {
          const videos = await extractPlaylistVideos(formData.playlistUrl);
          if (videos && videos.length > 0) {
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            const q = query(
              collection(db, KNOWLEDGE_COLLECTION),
              where('course', '==', first.course),
              where('playlist', '==', first.playlist)
            );
            const snapshot = await getDocs(q);
            let lastOrder = 0;
            snapshot.docs.forEach(doc => {
              const docOrder = doc.data().order || 0;
              if (docOrder > lastOrder) lastOrder = docOrder;
            });

            Promise.all(videos.map((video, index) =>
              saveKnowledge({
                title: video.title,
                content: '',
                sourceUrl: video.url,
                course: first.course,
                playlist: first.playlist,
                summary: [],
                transcript: '',
                associatedTools: formData.associatedTools
              }, lastOrder + index + 1)
            )).then(() => fetchItems())
              .catch(err => console.error('Erro na importação em segundo plano:', err));

            alert('Importação iniciada em segundo plano! Você pode continuar usando o app.');
          } else {
            alert('Não foi possível extrair vídeos desta fase. Verifique a URL.');
          }
        } catch (error: any) {
          alert(error.message || 'Erro ao extrair fase.');
        }
      } else {
        const title = await fetchYoutubeTitle(formData.sourceUrl);

        // Se já existe um doc com a mesma sourceUrl, copia transcrição/índice pra novas placements
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const existingSnap = await getDocs(query(
          collection(db, KNOWLEDGE_COLLECTION),
          where('sourceUrl', '==', formData.sourceUrl)
        ));
        const existing = existingSnap.docs[0]?.data();
        const sharedFields = existing
          ? { rawTranscript: existing.rawTranscript || '', summary: existing.summary || [], transcript: existing.transcript || '' }
          : { rawTranscript: '', summary: [], transcript: '' };

        await Promise.all(resolved.map(p =>
          saveKnowledge({
            title,
            content: '',
            sourceUrl: formData.sourceUrl,
            course: p.course,
            playlist: p.playlist,
            ...sharedFields,
            associatedTools: formData.associatedTools,
            associatedAnalyses: formData.associatedAnalyses
          })
        ));
      }

      setFormData(emptyFormData);
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
      await syncSiblingsBySourceUrl(item.sourceUrl, {
        summary: summary || [],
        transcript: transcript || ''
      });
      await fetchItems();
    } catch (error) {
      alert('Erro ao gerar índice.');
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

  const makePlaylistDragEnd = (courseName: string, playlistNames: string[]) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = playlistNames.indexOf(String(active.id));
    const newIdx = playlistNames.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(playlistNames, oldIdx, newIdx);

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

  const handleModalConfirm = async () => {
    try {
      if (modalConfig.type === 'deleteVideo' && modalConfig.targetId) {
        await deleteKnowledge(modalConfig.targetId);
      } else if (modalConfig.type === 'editVideo' && editVideoData.id) {
        const currentItem = items.find(i => i.id === editVideoData.id);
        if (!currentItem) {
          throw new Error('Vídeo não encontrado.');
        }
        const keptIds = new Set(editPlacements.filter(p => p.id).map(p => p.id!));
        for (const oid of editOriginalIds) {
          if (!keptIds.has(oid)) {
            await deleteKnowledge(oid);
          }
        }
        for (const p of editPlacements) {
          const finalPlaylist = p.playlist === 'NEW' ? p.newPlaylistName.trim() : p.playlist;
          if (!p.course || !finalPlaylist) continue;
          if (p.id) {
            await updateKnowledge(p.id, {
              title: editVideoData.title,
              course: p.course,
              playlist: finalPlaylist,
              associatedTools: editVideoData.associatedTools,
              associatedAnalyses: editVideoData.associatedAnalyses
            });
          } else {
            await saveKnowledge({
              title: editVideoData.title,
              content: currentItem.content || '',
              sourceUrl: currentItem.sourceUrl,
              course: p.course,
              playlist: finalPlaylist,
              rawTranscript: currentItem.rawTranscript || '',
              summary: currentItem.summary || [],
              transcript: currentItem.transcript || '',
              associatedTools: editVideoData.associatedTools,
              associatedAnalyses: editVideoData.associatedAnalyses
            });
          }
        }
      } else if (modalConfig.type === 'deleteCourse' && modalConfig.targetCourse) {
        await deleteCourse(modalConfig.targetCourse);
      } else if (modalConfig.type === 'editCourse' && modalConfig.targetCourse && modalConfig.inputValue) {
        await updateCourseName(modalConfig.targetCourse, modalConfig.inputValue);
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

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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

  const makeHandleDragEnd = (playlistItems: KnowledgeEntry[]) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = playlistItems.findIndex(v => v.id === String(active.id));
    const newIdx = playlistItems.findIndex(v => v.id === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(playlistItems, oldIdx, newIdx);
    setItems(prev => {
      const others = prev.filter(i => !playlistItems.some(v => v.id === i.id));
      return [...others, ...reordered.map((item, i) => ({ ...item, order: i + 1 }))];
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
  
  const playlistsForCourse = (course: string) => course && course !== 'NEW'
    ? Array.from(new Set(items.filter(i => i.course === course).map(i => i.playlist).filter(Boolean)))
    : [];

  // Group by Course -> Playlist -> Videos
  const groupedItemsMap = filteredItems.reduce((acc, item) => {
    const course = item.course || 'Sem Curso';
    const playlist = item.playlist || 'Sem Playlist';
    
    if (!acc[course]) acc[course] = {};
    if (!acc[course][playlist]) acc[course][playlist] = [];
    
    acc[course][playlist].push(item);
    return acc;
  }, {} as Record<string, Record<string, KnowledgeEntry[]>>);

  // Convert to sorted arrays
  const groupedItems = Object.entries(groupedItemsMap).map(([courseName, playlistsMap]) => {
    const sortedPlaylists = Object.entries(playlistsMap)
      .map(([playlistName, videos]) => ({
        name: playlistName,
        videos,
        // Use the playlistOrder of the first video as the order for the whole playlist
        order: videos[0]?.playlistOrder ?? Number.MAX_SAFE_INTEGER
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
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-[4px] font-bold hover:bg-blue-700 transition-all border-none cursor-pointer"
        >
          <Plus size={18} /> Adicionar Vídeo
        </button>
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

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 border border-[#ccc] rounded-[4px] shadow-lg"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Youtube className="text-red-600" size={24} />
              Adicionar Novo Vídeo
            </h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setImportMode('single')}
                className={cn("px-4 py-2 rounded-md text-sm font-bold transition-colors border-none cursor-pointer", importMode === 'single' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
              >
                Vídeo Único
              </button>
              <button
                type="button"
                onClick={() => setImportMode('playlist')}
                className={cn("px-4 py-2 rounded-md text-sm font-bold transition-colors border-none cursor-pointer", importMode === 'playlist' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
              >
                Importar Fase
              </button>
            </div>

            {importMode === 'single' ? (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL do YouTube</label>
                <div className="relative">
                  <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600" />
                  <input
                    required
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({...formData, sourceUrl: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL da Fase do YouTube</label>
                <div className="relative">
                  <ListVideo size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600" />
                  <input
                    required
                    type="url"
                    value={formData.playlistUrl}
                    onChange={(e) => setFormData({...formData, playlistUrl: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="https://www.youtube.com/playlist?list=..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  A importação irá cadastrar todos os vídeos da playlist sequencialmente. O processamento da IA (resumo e legenda) não será feito automaticamente para evitar sobrecarga. Você poderá reprocessar cada vídeo individualmente depois.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase">
                {importMode === 'single' ? 'Cursos e playlists onde este vídeo aparece' : 'Curso e playlist de destino'}
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
                      {initiativeNames.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="space-y-2">
                      <select
                        required
                        value={p.playlist}
                        onChange={(e) => updatePlacement(idx, { playlist: e.target.value })}
                        className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-white"
                      >
                        <option value="" disabled>Selecione uma playlist...</option>
                        {availPlaylists.map(pl => (
                          <option key={pl} value={pl}>{pl}</option>
                        ))}
                        <option value="NEW">+ Cadastrar nova playlist</option>
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
              {importMode === 'single' && (
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
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#ccc] rounded-[4px]">
            <Video size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">Nenhum vídeo encontrado.</p>
            <p className="text-gray-400 text-sm">Adicione seu primeiro vídeo para começar.</p>
          </div>
        ) : (
          groupedItems.map((course) => (
            <div key={course.name} className="bg-white border border-[#ccc] rounded-[4px] overflow-hidden">
              {/* Course Header */}
              <div className="bg-gray-50 p-4 border-b border-[#ccc] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="text-blue-600" size={20} />
                  <h2 className="font-bold text-lg text-gray-800 m-0">{course.name}</h2>
                  <span className="ml-2 bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                    {course.playlists.reduce((sum, p) => sum + p.videos.length, 0)} vídeos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setModalConfig({ isOpen: true, type: 'editCourse', targetCourse: course.name, inputValue: course.name })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer" 
                    title="Editar nome do curso"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setModalConfig({ isOpen: true, type: 'deleteCourse', targetCourse: course.name })}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer" 
                    title="Excluir curso e todos os seus vídeos"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Playlists Tabs */}
              <div className="bg-white border-b border-[#eee] px-4 pt-4">
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
                          onSelect={() => setActivePlaylists(prev => ({ ...prev, [course.name]: playlist.name }))}
                          onEdit={() => setModalConfig({ isOpen: true, type: 'editPlaylist', targetCourse: course.name, targetPlaylist: playlist.name, inputValue: playlist.name })}
                          onDelete={() => setModalConfig({ isOpen: true, type: 'deletePlaylist', targetCourse: course.name, targetPlaylist: playlist.name })}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              {/* Active Playlist Content */}
              {activePlaylists[course.name] && course.playlists.find(p => p.name === activePlaylists[course.name]) && (
                <div className="border-b border-[#eee] last:border-0">
                  <table className="w-full border-collapse">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={makeHandleDragEnd(course.playlists.find(p => p.name === activePlaylists[course.name])!.videos)}
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
                              getYoutubeId={getYoutubeId}
                              parseTimeToSeconds={parseTimeToSeconds}
                              handleRegenerateIndex={handleRegenerateIndex}
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
          ))
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
                    <p>Cole abaixo a <strong>transcrição completa</strong> do YouTube (com os tempos). A IA vai ler 100% do texto para gerar um índice clicável e um resumo detalhado, e o texto original ficará salvo para você ler.</p>
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
                            <div key={p.id || `new-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                              <select
                                value={p.course}
                                onChange={(e) => setEditPlacements(prev => prev.map((pp, i) => i === idx ? { ...pp, course: e.target.value, playlist: '', newPlaylistName: '' } : pp))}
                                className="p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 bg-white text-sm"
                              >
                                <option value="" disabled>Selecione um curso...</option>
                                {initiativeNames.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <div className="space-y-1">
                                <select
                                  value={p.playlist}
                                  onChange={(e) => setEditPlacements(prev => prev.map((pp, i) => i === idx ? { ...pp, playlist: e.target.value } : pp))}
                                  className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 bg-white text-sm"
                                >
                                  <option value="" disabled>Selecione uma playlist...</option>
                                  {availPlaylists.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                                  <option value="NEW">+ Nova playlist</option>
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
