import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  Handle, Position, NodeResizer,
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
}

const hs = { background: '#378ADD', border: '2px solid #fff', width: 10, height: 10, borderRadius: '50%' };

const StepNode = ({ data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || 'Atividade');
  return (
    <div style={{ background: '#E6F1FB', border: `2px solid ${selected ? '#1e3a5f' : '#378ADD'}`, borderRadius: 8, padding: '10px 14px', minWidth: 120, minHeight: 48, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: data?.fontSize || 12, fontWeight: 500, color: '#0C447C', textAlign: 'center', wordBreak: 'break-word', boxSizing: 'border-box' as any }}>
      <NodeResizer minWidth={100} minHeight={44} isVisible={selected} lineStyle={{ border: '1px dashed #378ADD' }} handleStyle={{ background: '#378ADD', width: 8, height: 8, borderRadius: '50%' }} />
      <Handle type="target" position={Position.Left} style={hs} />
      <Handle type="target" position={Position.Top} style={hs} />
      <Handle type="source" position={Position.Right} style={hs} />
      <Handle type="source" position={Position.Bottom} style={hs} />
      {editing ? (
        <input autoFocus value={text} onChange={e => { setText(e.target.value); data.label = e.target.value; }} onBlur={() => setEditing(false)} onKeyDown={e => e.key === 'Enter' && setEditing(false)} style={{ border: 'none', background: 'transparent', textAlign: 'center', fontSize: data?.fontSize || 12, fontWeight: 500, color: '#0C447C', width: '100%', outline: 'none' }} />
      ) : (
        <span onDoubleClick={() => setEditing(true)} title="Clique duplo para editar">{text}</span>
      )}
    </div>
  );
};

const DecisionNode = ({ data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || 'Decisão?');
  return (
    <div style={{ position: 'relative', width: 110, height: 110 }}>
      <NodeResizer minWidth={90} minHeight={90} isVisible={selected} />
      <Handle type="target" position={Position.Left} style={{ ...hs, left: -5, top: '50%', transform: 'translateY(-50%)' }} />
      <Handle type="target" position={Position.Top} style={{ ...hs, top: -5, left: '50%', transform: 'translateX(-50%)' }} />
      <Handle type="source" id="right" position={Position.Right} style={{ ...hs, right: -5, top: '50%', transform: 'translateY(-50%)', background: '#0F6E56' }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ ...hs, bottom: -5, left: '50%', transform: 'translateX(-50%)', background: '#993C1D' }} />
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, background: '#FAEEDA', border: `2px solid ${selected ? '#1e3a5f' : '#BA7517'}`, transform: 'rotate(45deg)', borderRadius: 4 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, padding: 16 }}>
        {editing ? (
          <input autoFocus value={text} onChange={e => { setText(e.target.value); data.label = e.target.value; }} onBlur={() => setEditing(false)} onKeyDown={e => e.key === 'Enter' && setEditing(false)} style={{ border: 'none', background: 'transparent', textAlign: 'center', fontSize: data?.fontSize || 11, fontWeight: 500, color: '#633806', width: '100%', outline: 'none' }} />
        ) : (
          <span onDoubleClick={() => setEditing(true)} style={{ fontSize: data?.fontSize || 11, fontWeight: 500, color: '#633806', textAlign: 'center', wordBreak: 'break-word', cursor: 'text' }} title="Clique duplo para editar">{text}</span>
        )}
      </div>
    </div>
  );
};

const StartEndNode = ({ data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || (data?.isEnd ? 'Fim' : 'Início'));
  const isEnd = data?.isEnd ?? false;
  return (
    <div style={{ background: isEnd ? '#444441' : '#3C3489', border: `2px solid ${selected ? '#fff' : isEnd ? '#2C2C2A' : '#26215C'}`, borderRadius: 999, padding: '8px 20px', minWidth: 80, minHeight: 36, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' as any }}>
      <NodeResizer minWidth={70} minHeight={32} isVisible={selected} lineStyle={{ border: '1px dashed #fff' }} handleStyle={{ background: '#fff', width: 8, height: 8, borderRadius: '50%' }} />
      <Handle type="target" position={Position.Left} style={hs} />
      <Handle type="target" position={Position.Top} style={hs} />
      <Handle type="source" position={Position.Right} style={hs} />
      <Handle type="source" position={Position.Bottom} style={hs} />
      {editing ? (
        <input autoFocus value={text} onChange={e => { setText(e.target.value); data.label = e.target.value; }} onBlur={() => setEditing(false)} onKeyDown={e => e.key === 'Enter' && setEditing(false)} style={{ border: 'none', background: 'transparent', textAlign: 'center', fontSize: data?.fontSize || 12, fontWeight: 600, color: '#fff', width: '100%', outline: 'none' }} />
      ) : (
        <span onDoubleClick={() => setEditing(true)} style={{ fontSize: data?.fontSize || 12, fontWeight: 600, color: '#fff', cursor: 'text' }} title="Clique duplo para editar">{text}</span>
      )}
    </div>
  );
};

const LaneNode = ({ data, selected }: any) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data?.label || 'Raia');
  return (
    <div style={{ width: '100%', height: '100%', border: `2px solid ${selected ? '#1e3a5f' : '#B5D4F4'}`, borderRadius: 12, background: 'rgba(230,241,251,0.15)', boxSizing: 'border-box' as any }}>
      <NodeResizer minWidth={200} minHeight={100} isVisible={selected} lineStyle={{ border: '1px dashed #378ADD' }} handleStyle={{ background: '#378ADD', width: 8, height: 8, borderRadius: '50%' }} />
      <div style={{ padding: '5px 12px', background: '#1e3a5f', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        {editing ? (
          <input autoFocus value={text} onChange={e => { setText(e.target.value); data.label = e.target.value; }} onBlur={() => setEditing(false)} onKeyDown={e => e.key === 'Enter' && setEditing(false)} style={{ border: 'none', background: 'transparent', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', outline: 'none', flex: 1 }} />
        ) : (
          <span onDoubleClick={() => setEditing(true)} style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'text', flex: 1 }} title="Clique duplo para editar">{text}</span>
        )}
      </div>
    </div>
  );
};

const nodeTypes = { step: StepNode, decision: DecisionNode, start: StartEndNode, end: StartEndNode, lane: LaneNode };

const initialNodes: Node[] = [
  { id: '1', type: 'start', position: { x: 50, y: 120 }, data: { label: 'Início' } },
  { id: '2', type: 'step', position: { x: 220, y: 104 }, data: { label: 'Receber solicitação' } },
  { id: '3', type: 'decision', position: { x: 420, y: 90 }, data: { label: 'Aprovado?' } },
  { id: '4', type: 'step', position: { x: 620, y: 60 }, data: { label: 'Processar' } },
  { id: '5', type: 'step', position: { x: 620, y: 190 }, data: { label: 'Devolver' } },
  { id: '6', type: 'end', position: { x: 820, y: 112 }, data: { label: 'Fim', isEnd: true } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
  { id: 'e2-3', source: '2', target: '3', type: 'smoothstep' },
  { id: 'e3-4', source: '3', sourceHandle: 'right', target: '4', type: 'smoothstep', label: 'Sim', style: { stroke: '#0F6E56' }, labelStyle: { fill: '#0F6E56', fontWeight: 600, fontSize: 11 } },
  { id: 'e3-5', source: '3', sourceHandle: 'bottom', target: '5', type: 'smoothstep', label: 'Não', style: { stroke: '#993C1D' }, labelStyle: { fill: '#993C1D', fontWeight: 600, fontSize: 11 } },
  { id: 'e4-6', source: '4', target: '6', type: 'smoothstep' },
  { id: 'e5-6', source: '5', target: '6', type: 'smoothstep' },
];

export default function ProcessMapper({ onSave, initialData, onGenerateAI, isGeneratingAI }: ProcessMapperProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges);
  const [selectedType, setSelectedType] = useState<'step' | 'decision' | 'start' | 'end'>('step');
  const [aiGenerated, setAiGenerated] = useState(false);

  const isEmpty = nodes.length === 0;
  const selectedNode = nodes.find(n => n.selected);

  useEffect(() => {
    if (initialData?.nodes?.length > 0) {
      setNodes(initialData.nodes);
      setEdges(initialData.edges || []);
      setAiGenerated(true);
    }
  }, [initialData, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, type: 'smoothstep', animated: false }, eds));
  }, [setEdges]);

  const addNode = useCallback(() => {
    const id = `node-${Date.now()}`;
    const labels: Record<string, string> = { step: 'Nova atividade', decision: 'Decisão?', start: 'Início', end: 'Fim' };
    setNodes(nds => [...nds, { id, type: selectedType, position: { x: 200 + Math.random() * 300, y: 80 + Math.random() * 200 }, data: { label: labels[selectedType], isEnd: selectedType === 'end', fontSize: 12 } }]);
  }, [selectedType, setNodes]);

  const addLane = useCallback(() => {
    const id = `lane-${Date.now()}`;
    setNodes(nds => [{ id, type: 'lane', position: { x: 30, y: 20 }, style: { width: 700, height: 120, zIndex: -1 }, data: { label: 'Nova Raia' }, selectable: true, draggable: true }, ...nds]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !e.selected));
  }, [setNodes, setEdges]);

  const clearAll = useCallback(() => {
    if (window.confirm('Limpar todo o mapa de processo?')) {
      setNodes([]);
      setEdges([]);
      setAiGenerated(false);
    }
  }, [setNodes, setEdges]);

  const changeFontSize = useCallback((delta: number) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, fontSize: Math.min(24, Math.max(8, (n.data.fontSize || 12) + delta)) } } : n));
  }, [selectedNode, setNodes]);

  const handleSave = () => onSave?.({ nodes, edges });

  const handleGenerateAI = async () => {
    await onGenerateAI?.();
    setAiGenerated(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Bloco de IA — aparece quando vazio */}
      {isEmpty && onGenerateAI && !aiGenerated && (
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
      {aiGenerated && !isEmpty && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600">Gerado com IA</span>
          </div>
          <button
            onClick={() => { if (window.confirm('Deseja limpar o mapa gerado pela IA?')) { setNodes([]); setEdges([]); setAiGenerated(false); } }}
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
              <button key={type} onClick={() => setSelectedType(type)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: selectedType === type ? '#1e3a5f' : 'var(--color-background-primary)', color: selectedType === type ? '#fff' : 'var(--color-text-primary)', border: `0.5px solid ${selectedType === type ? '#1e3a5f' : 'var(--color-border-secondary)'}` }}>
                {labels[type]}
              </button>
            );
          })}

          <button onClick={addNode} style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none' }}>
            + Nó
          </button>

          <button onClick={addLane} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-secondary)' }}>
            + Raia
          </button>

          {selectedNode && (
            <>
              <div style={{ width: 1, height: 20, background: 'var(--color-border-tertiary)' }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Fonte:</span>
              <button onClick={() => changeFontSize(-1)} style={{ padding: '2px 7px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>A-</button>
              <span style={{ fontSize: 11, minWidth: 18, textAlign: 'center', color: 'var(--color-text-secondary)' }}>{selectedNode.data?.fontSize || 12}</span>
              <button onClick={() => changeFontSize(1)} style={{ padding: '2px 7px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>A+</button>
              <button onClick={deleteSelected} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F7C1C1' }}>
                Deletar
              </button>
            </>
          )}

          <button onClick={clearAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F7C1C1' }}>
            Limpar
          </button>

          <button onClick={handleSave} style={{ marginLeft: 'auto', padding: '4px 16px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', background: '#1e3a5f', color: '#fff', border: 'none' }}>
            Salvar Mapa
          </button>
        </div>

        {/* Dica de uso */}
        <div style={{ padding: '4px 12px', background: '#f8fafc', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            Dica: Clique duplo para editar texto · Arraste os pontos azuis para conectar · Delete para remover selecionado · Arraste as bordas para redimensionar
          </span>
        </div>

        {/* React Flow Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode="Delete"
            connectionLineStyle={{ stroke: '#378ADD', strokeWidth: 2 }}
            defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#888', strokeWidth: 1.5 } }}
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
