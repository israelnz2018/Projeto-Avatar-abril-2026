import { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  Handle, Position, NodeResizer,
  MarkerType, ConnectionMode,
  type Connection, type Edge, type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Sparkles, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ProcessMapperProps {
  onSave?: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const hs = { background: '#378ADD', border: '2px solid #fff', width: 10, height: 10, borderRadius: '50%', zIndex: 50 };

const StepNode = ({ id, data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || 'Atividade');

  const startEditing = (e: any) => {
    e.stopPropagation();
    if (data.onEditStart) data.onEditStart();
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    if (data.onLabelChange) data.onLabelChange(id, text);
  };

  return (
    <div className={cn(
      "w-full h-full rounded-lg transition-all duration-200 shadow-sm relative group overflow-hidden border-2",
      selected ? "ring-2 ring-blue-600 bg-blue-50 border-blue-400" : "bg-white border-slate-200 hover:border-blue-300"
    )} style={{ fontSize: data?.fontSize || 12, fontWeight: 500, color: '#1e293b', minWidth: 120, minHeight: 60 }}>
      <NodeResizer 
        minWidth={100} 
        minHeight={44} 
        isVisible={selected} 
        onResizeStart={() => { if (data.onEditStart) data.onEditStart(); }}
        lineStyle={{ border: '2px solid #2563eb' }} 
        handleStyle={{ background: '#2563eb', width: 10, height: 10, borderRadius: '2px' }} 
      />
      
      {/* Handles Unificados em todos os lados */}
      <Handle type="target" position={Position.Left} id="t-l" style={{ ...hs, left: -6 }} />
      <Handle type="source" position={Position.Left} id="s-l" style={{ ...hs, left: -6, opacity: 0 }} />
      
      <Handle type="target" position={Position.Top} id="t-t" style={{ ...hs, top: -6 }} />
      <Handle type="source" position={Position.Top} id="s-t" style={{ ...hs, top: -6, opacity: 0 }} />
      
      <Handle type="target" position={Position.Right} id="t-r" style={{ ...hs, right: -6 }} />
      <Handle type="source" position={Position.Right} id="s-r" style={{ ...hs, right: -6, opacity: 0 }} />
      
      <Handle type="target" position={Position.Bottom} id="t-b" style={{ ...hs, bottom: -6 }} />
      <Handle type="source" position={Position.Bottom} id="s-b" style={{ ...hs, bottom: -6, opacity: 0 }} />
 
      <div className="absolute inset-2 flex items-center justify-center pointer-events-none">
        {editing ? (
          <textarea 
            autoFocus 
            value={text} 
            onChange={e => { setText(e.target.value); }} 
            onBlur={finishEditing}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEditing(); } }}
            className="nodrag pointer-events-auto w-full h-full bg-transparent border-none text-center focus:outline-none resize-none font-medium leading-tight p-0 overflow-hidden"
            style={{ fontSize: data?.fontSize || 12 }}
          />
        ) : (
          <div 
            onDoubleClick={startEditing} 
            className="nodrag pointer-events-auto break-words whitespace-pre-wrap leading-tight w-full cursor-text text-center select-none overflow-hidden max-h-full"
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
};

const DecisionNode = ({ id, data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || 'Decisão?');

  const startEditing = (e: any) => {
    e.stopPropagation();
    if (data.onEditStart) data.onEditStart();
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    if (data.onLabelChange) data.onLabelChange(id, text);
  };

  return (
    <div style={{ position: 'relative', width: 130, height: 130 }}>
      <NodeResizer 
        minWidth={100} 
        minHeight={100} 
        isVisible={selected} 
        onResizeStart={() => { if (data.onEditStart) data.onEditStart(); }}
      />
      
      <Handle type="target" position={Position.Left} id="t-l" style={{ ...hs, left: -4 }} />
      <Handle type="source" position={Position.Left} id="s-l" style={{ ...hs, left: -4, opacity: 0 }} />
      
      <Handle type="target" position={Position.Top} id="t-t" style={{ ...hs, top: -4 }} />
      <Handle type="source" position={Position.Top} id="s-t" style={{ ...hs, top: -4, opacity: 0 }} />
      
      <Handle type="target" position={Position.Right} id="t-r" style={{ ...hs, right: -4 }} />
      <Handle type="source" position={Position.Right} id="s-r" style={{ ...hs, right: -4, background: '#0F6E56' }} />
      
      <Handle type="target" position={Position.Bottom} id="t-b" style={{ ...hs, bottom: -4 }} />
      <Handle type="source" position={Position.Bottom} id="s-b" style={{ ...hs, bottom: -4, background: '#993C1D' }} />
 
      <div className={cn(
        "absolute inset-[15%] rounded-sm border-2 transform rotate-45 transition-all duration-200 flex items-center justify-center overflow-hidden",
        selected ? "bg-amber-50 border-amber-500 shadow-md scale-105" : "bg-[#FAEEDA] border-amber-600 shadow-sm"
      )}>
        <div className="transform -rotate-45 p-4 text-center w-full flex items-center justify-center h-full overflow-hidden relative">
          {editing ? (
            <textarea 
              autoFocus 
              value={text} 
              onChange={e => { setText(e.target.value); }} 
              onBlur={finishEditing}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEditing(); } }}
              className="nodrag absolute inset-4 bg-transparent border-none text-center focus:outline-none resize-none font-bold text-amber-900 leading-tight p-0 overflow-hidden"
              style={{ fontSize: data?.fontSize || 11 }}
            />
          ) : (
            <div 
              onDoubleClick={startEditing} 
              className="nodrag text-amber-900 font-bold leading-tight break-words whitespace-pre-wrap w-full cursor-text select-none overflow-hidden max-h-full" 
              style={{ fontSize: data?.fontSize || 11 }}
            >
              {text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StartEndNode = ({ id, data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || (data?.isEnd ? 'Fim' : 'Início'));

  const startEditing = (e: any) => {
    e.stopPropagation();
    if (data.onEditStart) data.onEditStart();
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    if (data.onLabelChange) data.onLabelChange(id, text);
  };

  const isEnd = data?.isEnd ?? false;
  return (
    <div className={cn(
      "w-full h-full rounded-full transition-all duration-200 border-2 relative overflow-hidden flex items-center justify-center",
      isEnd 
        ? "bg-slate-800 border-slate-900 text-white" 
        : "bg-indigo-600 border-indigo-700 text-white",
      selected && "ring-2 ring-offset-2 ring-blue-500"
    )} style={{ boxSizing: 'border-box' as any, minWidth: 100, minHeight: 50 }}>
      <NodeResizer 
        minWidth={80} 
        minHeight={40} 
        isVisible={selected} 
        onResizeStart={() => { if (data.onEditStart) data.onEditStart(); }}
        lineStyle={{ border: '2px solid white' }} 
        handleStyle={{ background: 'white' }} 
      />
      
      <Handle type="target" position={Position.Left} id="t-l" style={{ ...hs, left: -4, top: '50%' }} />
      <Handle type="source" position={Position.Left} id="s-l" style={{ ...hs, left: -4, top: '50%', opacity: 0 }} />
      
      <Handle type="target" position={Position.Top} id="t-t" style={{ ...hs, top: -4, left: '50%' }} />
      <Handle type="source" position={Position.Top} id="s-t" style={{ ...hs, top: -4, left: '50%', opacity: 0 }} />
      
      <Handle type="target" position={Position.Right} id="t-r" style={{ ...hs, right: -4, top: '50%' }} />
      <Handle type="source" position={Position.Right} id="s-r" style={{ ...hs, right: -4, top: '50%', opacity: 0 }} />
      
      <Handle type="target" position={Position.Bottom} id="t-b" style={{ ...hs, bottom: -4, left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="s-b" style={{ ...hs, bottom: -4, left: '50%', opacity: 0 }} />
 
      <div className="absolute inset-2 flex items-center justify-center pointer-events-none px-4">
        {editing ? (
          <textarea 
            autoFocus 
            value={text} 
            onChange={e => { setText(e.target.value); }} 
            onBlur={finishEditing} 
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEditing(); } }}
            className="nodrag pointer-events-auto bg-transparent border-none text-center text-white focus:outline-none font-bold w-full h-full resize-none leading-tight p-0 overflow-hidden" 
            style={{ fontSize: data?.fontSize || 12 }} 
          />
        ) : (
          <div 
            onDoubleClick={startEditing} 
            className="nodrag pointer-events-auto font-bold cursor-text break-words whitespace-pre-wrap leading-tight w-full select-none overflow-hidden max-h-full text-center"
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
};

const LaneNode = ({ id, data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || 'Área');

  const startEditing = (e: any) => {
    e.stopPropagation();
    if (data.onEditStart) data.onEditStart();
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    if (data.onLabelChange) data.onLabelChange(id, text);
  };

  return (
    <div className={cn(
      "relative w-full h-full border-2 rounded-xl transition-all duration-200",
      selected ? "border-blue-500 bg-blue-50/10" : "border-slate-200 bg-slate-50/5"
    )}>
      {/* Resizer primeiro para garantir que as alças fiquem por cima */}
      <NodeResizer 
        minWidth={200} 
        minHeight={50} 
        isVisible={selected} 
        onResizeStart={() => { if (data.onEditStart) data.onEditStart(); }}
        lineStyle={{ border: '2px solid #3b82f6' }} 
        handleStyle={{ background: '#3b82f6', width: 10, height: 10 }} 
      />
      
      {/* Cabeçalho Vertical na Esquerda */}
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-blue-600 rounded-l-[10px] flex items-center justify-center overflow-hidden z-20">
        <div 
          className="transform -rotate-90 whitespace-nowrap text-white font-black text-[10px] tracking-widest uppercase cursor-text flex items-center justify-center min-w-[300px]"
          onDoubleClick={startEditing}
        >
          {editing ? (
            <input 
              autoFocus 
              value={text} 
              onChange={e => { setText(e.target.value); }} 
              onBlur={finishEditing} 
              onKeyDown={e => e.key === 'Enter' && finishEditing()}
              className="nodrag bg-transparent border-none text-center text-white focus:outline-none font-black uppercase w-full p-2"
            />
          ) : (
            <span className="nodrag px-4 py-2 cursor-text select-none">{text}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = { step: StepNode, decision: DecisionNode, start: StartEndNode, end: StartEndNode, lane: LaneNode };

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export default function ProcessMapper({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: ProcessMapperProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges);
  const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
  const [selectedType, setSelectedType] = useState<'step' | 'decision' | 'start' | 'end'>('step');
  const [aiGenerated, setAiGenerated] = useState(initialData?.isGenerated || false);
  const [editingEdge, setEditingEdge] = useState<string | null>(null);
  const [edgeLabelInput, setEdgeLabelInput] = useState('');

  const isToolEmpty = nodes.length === 0;
  const selectedNode = nodes.find(n => n.selected);

  // Use refs to keep functions stable and avoid infinite loops
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const takeSnapshot = useCallback(() => {
    setHistory(prev => {
      const last = prev[prev.length - 1];
      const currentNodes = nodesRef.current.map(n => ({ ...n, data: { ...n.data } }));
      const currentEdges = edgesRef.current.map(e => ({ ...e }));
      
      if (last && JSON.stringify(last.nodes) === JSON.stringify(currentNodes) && JSON.stringify(last.edges) === JSON.stringify(currentEdges)) {
        return prev;
      }
      return [...prev.slice(-49), { nodes: JSON.parse(JSON.stringify(currentNodes)), edges: JSON.parse(JSON.stringify(currentEdges)) }];
    });
  }, []); // Stable

  const onLabelChange = useCallback((id: string, newLabel: string) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n));
  }, [setNodes]);

  useEffect(() => {
    if (initialData) {
      const data = initialData.nodes ? initialData : (initialData.toolData || {});
      if (data.nodes && Array.isArray(data.nodes)) {
        // Normalização para garantir formato ReactFlow
        const normalizedNodes = data.nodes.map((n: any) => ({
          ...n,
          id: n.id || `node-${Math.random()}`,
          type: n.type || 'step',
          position: n.position || { x: n.x || 0, y: n.y || 0 },
          data: {
            ...n.data,
            label: n.data?.label || n.text || n.label || 'Sem rótulo',
            isEnd: n.data?.isEnd || n.type === 'end',
            fontSize: n.data?.fontSize || n.fontSize || 12,
            onLabelChange,
            onEditStart: takeSnapshot
          }
        }));

        const normalizedEdges = (data.edges || data.connections || []).map((e: any) => ({
          id: e.id || `edge-${Math.random()}`,
          source: e.source || e.from || '',
          target: e.target || e.to || e.targetNode || '',
          type: 'smoothstep'
        }));

        setNodes(normalizedNodes);
        setEdges(normalizedEdges);
        setAiGenerated(!!data.isGenerated || !!initialData.isGenerated);
      }
    } else {
      setNodes([]);
      setEdges([]);
      setAiGenerated(false);
    }
    // We intentionally omit onLabelChange and takeSnapshot from dependencies 
    // to prevent infinite loops when they are injected into node data.
    // Since they are now stable or their changes don't require re-initializing initialData, this is safe.
  }, [initialData, setNodes, setEdges]);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const previousState = newHistory.pop();
      if (previousState) {
        setNodes(previousState.nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            onLabelChange,
            onEditStart: takeSnapshot
          }
        })));
        setEdges(previousState.edges);
      }
      return newHistory;
    });
  }, [setNodes, setEdges, onLabelChange, takeSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const onConnect = useCallback((params: Connection) => {
    takeSnapshot();
    setEdges(eds => addEdge({ 
      ...params, 
      type: 'smoothstep', 
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed }
    }, eds));
  }, [setEdges]);

  const addNodeByType = useCallback((type: 'step' | 'decision' | 'start' | 'end') => {
    takeSnapshot();
    const id = `node-${Date.now()}`;
    const nodeLabels: Record<string, string> = { step: 'Nova atividade', decision: 'Decisão?', start: 'Início', end: 'Fim' };
    
    // Add node at a visible position in the center of the current view if possible, or just a fixedOffset
    const newNode = { 
      id, 
      type, 
      position: { x: 300 + Math.random() * 50, y: 100 + Math.random() * 50 }, 
      data: { 
        label: nodeLabels[type], 
        isEnd: type === 'end', 
        fontSize: 13,
        onLabelChange,
        onEditStart: takeSnapshot
      },
      style: type === 'decision' ? { width: 130, height: 130 } : { width: 150, height: 80 }
    };
    
    setNodes(nds => [...nds, newNode]);
    setAiGenerated(false); // If user manually adds, it's no longer just an AI map
  }, [setNodes]);

  const addLane = useCallback(() => {
    takeSnapshot();
    const id = `lane-${Date.now()}`;
    setNodes(nds => [{ 
      id, 
      type: 'lane', 
      position: { x: 50, y: 50 }, 
      style: { width: 800, height: 160, zIndex: -1 }, 
      data: { 
        label: 'Nova Raia',
        onLabelChange,
        onEditStart: takeSnapshot
      }, 
      selectable: true, 
      draggable: true 
    }, ...nds]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    takeSnapshot();
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !e.selected));
  }, [setNodes, setEdges]);

  const clearAll = useCallback(() => {
    takeSnapshot();
    // Não usamos window.confirm aqui porque o onClearAIData já dispara um modal de confirmação no ToolWrapper
    onClearAIData?.();
    setNodes([]);
    setEdges([]);
    setAiGenerated(false);
  }, [setNodes, setEdges, onClearAIData]);

  const changeFontSize = useCallback((delta: number) => {
    if (!selectedNode) return;
    takeSnapshot();
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, fontSize: Math.min(24, Math.max(8, (n.data.fontSize || 12) + delta)) } } : n));
  }, [selectedNode, setNodes, takeSnapshot]);

  const handleSave = () => onSave?.({ nodes, edges });

  const handleGenerateAI = async () => {
    await onGenerateAI?.();
    setAiGenerated(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Bloco de IA — aparece quando vazio */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Mapa de Processo com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados do SIPOC e Entendendo o Problema para gerar o mapa completo do processo com raias, atividades e pontos de decisão.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir um mapa rigoroso e técnico.
              </p>
            </div>
            <button
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none shrink-0",
                isGeneratingAI
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-lg shadow-blue-100"
              )}
            >
              {isGeneratingAI
                ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={16} /> Gerar com IA</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Badge gerado com IA + botão limpar IA */}
      {aiGenerated && nodes.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600">Gerado com IA</span>
          </div>
          <button
            onClick={() => { 
                onClearAIData?.();
                setNodes([]); 
                setEdges([]); 
                setAiGenerated(false); 
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          >
            <Trash2 size={13} />
            Limpar dados da IA
          </button>
        </div>
      )}

      {/* Canvas */}
      <div style={{ height: 500, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Toolbar */}
        <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'var(--color-background-secondary)', flexShrink: 0 }}>

          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em' }}>TIPO:</span>

          {(['step', 'decision', 'start', 'end'] as const).map(type => {
            const labels = { step: 'Atividade', decision: 'Decisão', start: 'Início', end: 'Fim' };
            return (
              <button key={type} onClick={() => addNodeByType(type)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-300 active:scale-95 shadow-sm">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  type === 'step' && "bg-blue-500",
                  type === 'decision' && "bg-amber-500",
                  type === 'start' && "bg-indigo-600",
                  type === 'end' && "bg-slate-800"
                )} />
                {labels[type]}
              </button>
            );
          })}

          <button onClick={addLane} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-300 active:scale-95 shadow-sm">
            + Raia
          </button>

          {selectedNode && (
            <>
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onClick={() => changeFontSize(-1)} className="p-1 hover:bg-slate-50 rounded text-slate-500 transition-colors">A-</button>
                <span className="text-[10px] font-bold text-slate-400 w-5 text-center leading-none">{selectedNode.data?.fontSize || 12}</span>
                <button onClick={() => changeFontSize(1)} className="p-1 hover:bg-slate-50 rounded text-slate-500 transition-colors">A+</button>
              </div>
              <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 border border-red-100">
                <Trash2 size={13} />
                Remover
              </button>
            </>
          )}

          <div className="flex-1" />

          {onGenerateAI && nodes.length > 0 && (
            <button
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              {isGeneratingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Regerar com IA
            </button>
          )}

          <button onClick={clearAll} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            Limpar Tudo
          </button>

          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-100 transition-all border-none">
            Salvar
          </button>
        </div>

        {/* Dica de uso */}
        <div style={{ padding: '4px 12px', background: '#f8fafc', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            Dica: Clique duplo para editar texto · Arraste os pontos azuis para conectar · Delete para remover selecionado · Arraste as bordas para redimensionar
          </span>
        </div>

        {/* React Flow Canvas */}
        <div id="process-mapper-canvas" style={{ flex: 1, position: 'relative' }}>
          {editingEdge && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-white p-3 rounded-xl shadow-2xl border-2 border-blue-500 flex gap-2">
              <input 
                autoFocus
                type="text" 
                value={edgeLabelInput} 
                onChange={e => setEdgeLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    takeSnapshot();
                    setEdges(eds => eds.map(edge => edge.id === editingEdge ? { ...edge, label: edgeLabelInput } : edge));
                    setEditingEdge(null);
                  }
                  if (e.key === 'Escape') setEditingEdge(null);
                }}
                placeholder="Rótulo da linha..."
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ring-blue-500 w-48"
              />
              <button 
                onClick={() => {
                  takeSnapshot();
                  setEdges(eds => eds.map(edge => edge.id === editingEdge ? { ...edge, label: edgeLabelInput } : edge));
                  setEditingEdge(null);
                }}
                className="bg-blue-600 text-white px-3 py-1 text-[10px] font-black uppercase rounded-lg"
              >
                OK
              </button>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={() => takeSnapshot()}
            onSelectionDragStart={() => takeSnapshot()}
            onNodesDelete={() => takeSnapshot()}
            onEdgesDelete={() => takeSnapshot()}
            onEdgeClick={(_, edge) => {
              setEditingEdge(edge.id);
              setEdgeLabelInput(edge.label as string || '');
            }}
            onEdgeDoubleClick={(_, edge) => {
              setEditingEdge(edge.id);
              setEdgeLabelInput(edge.label as string || '');
            }}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode="Delete"
            connectionMode={ConnectionMode.Loose}
            connectionLineStyle={{ stroke: '#378ADD', strokeWidth: 2 }}
            defaultEdgeOptions={{ 
              type: 'smoothstep', 
              style: { stroke: '#94a3b8', strokeWidth: 2 },
              markerEnd: { 
                type: MarkerType.ArrowClosed, 
                color: '#94a3b8',
                width: 20,
                height: 20
              },
              labelStyle: { fill: '#334155', fontWeight: 700, fontSize: 10 },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
              labelBgPadding: [6, 3],
              labelBgBorderRadius: 4
            }}
          >
            <Background color="#e2e8f0" gap={16} />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
