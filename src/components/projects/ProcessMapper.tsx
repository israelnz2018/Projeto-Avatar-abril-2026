import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Stage, Layer, Rect, Circle, RegularPolygon, Text, Line, Group, Arrow } from 'react-konva';
import { 
  Plus, 
  Trash2, 
  Type, 
  Circle as CircleIcon, 
  Square, 
  Diamond, 
  MousePointer2, 
  Link2,
  Save,
  Download,
  Sparkles,
  Wand2,
  Loader2,
  Users,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Printer
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toPng } from 'html-to-image';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

interface Lane {
  id: string;
  name: string;
  height: number;
}

interface Node {
  id: string;
  type: 'start' | 'step' | 'decision' | 'subprocess' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  laneId?: string;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  type?: 'right' | 'left' | 'up' | 'down';
  label?: string;
}

interface AITask {
  area: string;
  type: 'step' | 'decision' | 'subprocess';
  activity: string;
  noAction?: string;
  noActionArea?: string;
  noActionType?: 'step' | 'subprocess' | 'start';
}

interface ProcessMapperProps {
  onSave?: (data: any) => void;
  initialData?: any;
  sipocData?: any;
}

export default function ProcessMapper({ onSave, initialData }: ProcessMapperProps) {
  const DEFAULT_WIDTH = 160;
  const DEFAULT_HEIGHT = 80;
  const START_END_SIZE = 40;
  const LANE_LABEL_WIDTH = 120;
  const DEFAULT_LANE_HEIGHT = 150;

  const [nodes, setNodes] = useState<Node[]>(initialData?.nodes || []);
  const [connections, setConnections] = useState<Connection[]>(initialData?.connections || []);
  const [lanes, setLanes] = useState<Lane[]>(initialData?.lanes || [
    { id: 'lane-1', name: 'Processo', height: DEFAULT_LANE_HEIGHT }
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [selectedLaneId, setSelectedLaneId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [lastNodePos, setLastNodePos] = useState({ x: LANE_LABEL_WIDTH + 50, y: 50 });
  const [dragLine, setDragLine] = useState<{ x1: number, y1: number, x2: number, y2: number, type: 'right' | 'left' | 'up' | 'down' } | null>(null);
  const [draggingConnPoint, setDraggingConnPoint] = useState<{ connId: string, isStart: boolean } | null>(null);
  
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiTasks, setAiTasks] = useState<AITask[]>(initialData?.aiTasks || [
    { area: '', type: 'step', activity: '' }
  ]);
  
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 3000, height: 2000 });

  useEffect(() => {
    const updateSize = () => {
      const minHeight = Math.max(800, lanes.reduce((acc, l) => acc + l.height, 0));
      setStageSize(prev => ({
        width: 3000, // Fixed large width for horizontal navigation
        height: minHeight
      }));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [lanes]);

  // Auto-save aiTasks when they change to preserve state
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave?.({ nodes, connections, lanes, aiTasks });
    }, 1000);
    return () => clearTimeout(timer);
  }, [aiTasks]);

  const handleSave = () => {
    onSave?.({ nodes, connections, lanes, aiTasks });
  };

  const autoFitFontSize = (text: string, width: number, height: number, type: string) => {
    // Heuristic for fitting text: 
    // Area available for text is smaller in diamonds
    const padding = type === 'decision' ? 40 : 20;
    const availableWidth = width - padding;
    const availableHeight = height - padding;
    
    // Start with a reasonable max font size
    let fontSize = 14;
    const charCount = text.length || 1;
    
    // Very simple estimation: width * height / (chars * factor)
    // For 160x80, area is 12800. If 20 chars, 12800 / 200 = 64. Sqrt(64) = 8.
    // This is just a rough starting point.
    const estimatedSize = Math.sqrt((availableWidth * availableHeight) / (charCount * 1.5));
    fontSize = Math.min(14, Math.max(8, Math.floor(estimatedSize)));
    
    return fontSize;
  };

  const addLane = () => {
    const newLane: Lane = {
      id: `lane-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Nova Área',
      height: DEFAULT_LANE_HEIGHT
    };
    setLanes([...lanes, newLane]);
  };

  const deleteLane = (id: string) => {
    if (lanes.length <= 1) return;
    setLanes(lanes.filter(l => l.id !== id));
    setNodes(nodes.filter(n => n.laneId !== id));
  };

  const updateLane = (id: string, updates: Partial<Lane>) => {
    setLanes(lanes.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const addPathFromDecision = (decisionId: string, label: string) => {
    const decisionNode = nodes.find(n => n.id === decisionId);
    if (!decisionNode) return;

    const nodeWidth = 160;
    const nodeHeight = 80;
    
    // Position "Sim" to the right, "Não" to the bottom
    let newX = decisionNode.x + decisionNode.width + 80;
    let newY = decisionNode.y;
    let startType: 'right' | 'left' | 'up' | 'down' = 'right';

    if (label === 'Não') {
      newX = decisionNode.x;
      newY = decisionNode.y + decisionNode.height + 80;
      startType = 'down';
    }

    const newNodeId = Math.random().toString(36).substr(2, 9);
    const newNode: Node = {
      id: newNodeId,
      type: 'step',
      x: newX,
      y: newY,
      width: nodeWidth,
      height: nodeHeight,
      text: label === 'Sim' ? 'Executar ação' : 'Tratar exceção',
      fontSize: autoFitFontSize(label === 'Sim' ? 'Executar ação' : 'Tratar exceção', nodeWidth, nodeHeight, 'step'),
      laneId: decisionNode.laneId
    };

    const newConnection: Connection = {
      id: Math.random().toString(36).substr(2, 9),
      from: decisionId,
      to: newNodeId,
      label: label,
      type: startType
    };

    setNodes([...nodes, newNode]);
    setConnections([...connections, newConnection]);
    setSelectedId(newNodeId);
    setSelectedIds([newNodeId]);
  };

  const addNode = (type: Node['type']) => {
    const text = type === 'decision' ? 'Pergunta?' : 
                 type === 'subprocess' ? 'Subprocesso' : 
                 type === 'start' ? 'Início' :
                 type === 'text' ? 'Seu texto aqui...' : 'Nova Etapa';
    
    // Calculate new position with offset
    const newX = lastNodePos.x + 20;
    const newY = lastNodePos.y + 20;
    
    let nodeWidth = DEFAULT_WIDTH;
    let nodeHeight = DEFAULT_HEIGHT;

    if (type === 'decision') {
      nodeWidth = 120;
      nodeHeight = 120;
    } else if (type === 'start') {
      nodeWidth = START_END_SIZE;
      nodeHeight = START_END_SIZE;
    } else if (type === 'text') {
      nodeWidth = 150;
      nodeHeight = 40;
    }

    const newNode: Node = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: newX,
      y: newY,
      width: nodeWidth,
      height: nodeHeight,
      text,
      fontSize: autoFitFontSize(text, nodeWidth, nodeHeight, type),
      laneId: lanes[0]?.id || ''
    };
    setNodes([...nodes, newNode]);
    setSelectedId(newNode.id);
    setSelectedIds([newNode.id]);
    setLastNodePos({ x: newX, y: newY });
  };

  const alignHorizontal = () => {
    if (selectedIds.length < 2) return;
    const firstNode = nodes.find(n => n.id === selectedIds[0]);
    if (!firstNode) return;
    
    const targetYCenter = firstNode.y + firstNode.height / 2;
    
    setNodes(nodes.map(n => 
      selectedIds.includes(n.id) ? { ...n, y: targetYCenter - n.height / 2 } : n
    ));
    toast.success("Alinhado horizontalmente pelo centro");
  };

  const alignVertical = () => {
    if (selectedIds.length < 2) return;
    const firstNode = nodes.find(n => n.id === selectedIds[0]);
    if (!firstNode) return;
    
    const targetXCenter = firstNode.x + firstNode.width / 2;
    
    setNodes(nodes.map(n => 
      selectedIds.includes(n.id) ? { ...n, x: targetXCenter - n.width / 2 } : n
    ));
    toast.success("Alinhado verticalmente pelo centro");
  };

  const deleteSelected = () => {
    if (selectedIds.length > 0) {
      setNodes(nodes.filter(n => !selectedIds.includes(n.id)));
      setConnections(connections.filter(c => !selectedIds.includes(c.from) && !selectedIds.includes(c.to)));
      setSelectedIds([]);
      setSelectedId(null);
    } else if (selectedConnId) {
      setConnections(connections.filter(c => c.id !== selectedConnId));
      setSelectedConnId(null);
    }
  };

  const handleClear = () => {
    setNodes([]);
    setConnections([]);
    setLanes([{ id: 'lane-1', name: 'Área 1', height: DEFAULT_LANE_HEIGHT }]);
    onSave({ nodes: [], connections: [], lanes: [{ id: 'lane-1', name: 'Área 1', height: DEFAULT_LANE_HEIGHT }] });
    toast.success("Mapa limpo com sucesso!");
  };

  const handleNodeClick = (id: string, e: any) => {
    const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    
    if (isMulti) {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
      setSelectedId(null);
      setSelectedLaneId(null);
    } else {
      setSelectedId(id);
      setSelectedIds([id]);
      setSelectedConnId(null);
      setSelectedLaneId(null);
      setIsEditingText(false);
    }
  };

  const handleNodeDblClick = (id: string) => {
    setSelectedId(id);
    setSelectedConnId(null);
    setIsEditingText(true);
  };

  const handleNodeMouseDown = (id: string, e: any) => {
    // This is handled by connection points now
  };

  const handleConnectionPointMouseDown = (nodeId: string, type: 'right' | 'left' | 'up' | 'down', e: any) => {
    e.cancelBubble = true; // Prevent node drag
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    let startX = node.x + node.width / 2;
    let startY = node.y + node.height / 2;

    if (type === 'right') startX = node.x + node.width;
    if (type === 'left') startX = node.x;
    if (type === 'down') startY = node.y + node.height;
    if (type === 'up') startY = node.y;

    setConnectingFrom(nodeId);
    setDragLine({ x1: startX, y1: startY, x2: startX, y2: startY, type });
  };

  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();

    if (connectingFrom && dragLine) {
      setDragLine({ ...dragLine, x2: pointerPos.x, y2: pointerPos.y });
    } else if (draggingConnPoint) {
      setDragLine(prev => prev ? { ...prev, x2: pointerPos.x, y2: pointerPos.y } : null);
    }
  };

  const handleStageMouseUp = (e: any) => {
    if ((connectingFrom || draggingConnPoint) && dragLine) {
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      
      const shape = stage.getIntersection(pointerPos);
      let targetNodeId = null;

      if (shape) {
        let current = shape;
        while (current && !current.attrs.id?.startsWith('node-group-')) {
          current = current.getParent();
        }
        if (current) {
          targetNodeId = current.attrs.id.replace('node-group-', '');
        }
      }

      if (!targetNodeId) {
        const manualTarget = nodes.find(n => 
          pointerPos.x >= n.x && pointerPos.x <= n.x + n.width &&
          pointerPos.y >= n.y && pointerPos.y <= n.y + n.height
        );
        if (manualTarget) targetNodeId = manualTarget.id;
      }

      if (draggingConnPoint) {
        const { connId, isStart } = draggingConnPoint;
        if (targetNodeId) {
          setConnections(connections.map(c => {
            if (c.id === connId) {
              if (isStart) {
                // If dragging start, we also need to determine the new start side (type)
                // For simplicity, we'll try to keep the original type if it's the same node,
                // or just use 'right' as default for a new node.
                return { ...c, from: targetNodeId };
              } else {
                return { ...c, to: targetNodeId };
              }
            }
            return c;
          }));
        }
      } else if (connectingFrom && targetNodeId && targetNodeId !== connectingFrom) {
        const newConn: Connection = {
          id: Math.random().toString(36).substr(2, 9),
          from: connectingFrom,
          to: targetNodeId,
          type: dragLine.type
        };
        if (!connections.find(c => c.from === newConn.from && c.to === newConn.to)) {
          setConnections([...connections, newConn]);
        }
      }

      setConnectingFrom(null);
      setDraggingConnPoint(null);
      setDragLine(null);
    }
  };

  const updateNode = (id: string, updates: Partial<Node>) => {
    setNodes(nodes.map(n => {
      if (n.id === id) {
        const updated = { ...n, ...updates };
        // Auto-fit font size if text or dimensions change
        if (updates.text || updates.width || updates.height) {
          updated.fontSize = autoFitFontSize(
            updated.text, 
            updated.width, 
            updated.height, 
            updated.type
          );
        }
        return updated;
      }
      return n;
    }));
  };

  const generateFromAI = () => {
    if (aiTasks.every(t => !t.activity.trim())) {
      toast.error("Preencha pelo menos uma atividade!");
      return;
    }

    // 1. Identify all unique areas
    const uniqueAreas = Array.from(new Set(aiTasks.filter(t => t.area.trim()).map(t => t.area.trim())));
    
    let currentLanes = [...lanes];
    
    // If only default lane exists and it's empty, and we have new areas, remove the default one
    if (currentLanes.length === 1 && currentLanes[0].name === 'Área 1' && nodes.length === 0 && uniqueAreas.length > 0) {
      currentLanes = [];
    }

    uniqueAreas.forEach(areaName => {
      if (!currentLanes.find(l => l.name === areaName)) {
        currentLanes.push({
          id: `lane-${Math.random().toString(36).substr(2, 9)}`,
          name: areaName,
          height: DEFAULT_LANE_HEIGHT
        });
      }
    });
    setLanes(currentLanes);

    const newNodes: Node[] = [];
    const newConnections: Connection[] = [];
    
    // Start X position
    let currentX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + n.width)) + 100 : LANE_LABEL_WIDTH + 50;
    
    // Helper to get lane Y offset
    const getLaneY = (laneName: string) => {
      const lane = currentLanes.find(l => l.name === laneName.trim()) || currentLanes[0];
      const laneIndex = currentLanes.indexOf(lane);
      let yOffset = 0;
      for (let i = 0; i < laneIndex; i++) yOffset += currentLanes[i].height;
      return { laneId: lane.id, centerY: yOffset + lane.height / 2 };
    };

    // Add Início
    const firstTaskArea = aiTasks[0].area || currentLanes[0].name;
    const startPos = getLaneY(firstTaskArea);
    const startNode: Node = {
      id: `node-ai-start-${Math.random().toString(36).substr(2, 9)}`,
      type: 'start',
      x: currentX,
      y: startPos.centerY - START_END_SIZE / 2,
      width: START_END_SIZE,
      height: START_END_SIZE,
      text: 'Início',
      fontSize: 10,
      laneId: startPos.laneId
    };
    newNodes.push(startNode);
    currentX += START_END_SIZE + 100;

    let lastMainNodeId = startNode.id;

    aiTasks.forEach((task, index) => {
      if (!task.activity.trim()) return;
      
      const { laneId, centerY } = getLaneY(task.area);
      const nodeWidth = task.type === 'decision' ? 120 : DEFAULT_WIDTH;
      const nodeHeight = task.type === 'decision' ? 120 : DEFAULT_HEIGHT;
      
      const newNode: Node = {
        id: `node-ai-${Math.random().toString(36).substr(2, 9)}`,
        type: task.type,
        x: currentX,
        y: centerY - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight,
        text: task.activity,
        fontSize: autoFitFontSize(task.activity, nodeWidth, nodeHeight, task.type),
        laneId: laneId
      };
      
      newNodes.push(newNode);
      
      // Connection from previous main path node
      newConnections.push({
        id: `conn-ai-${Math.random().toString(36).substr(2, 9)}`,
        from: lastMainNodeId,
        to: newNode.id,
        type: 'right',
        label: index > 0 && aiTasks[index-1].type === 'decision' ? 'Sim' : ''
      });

      // Special case: if it's a decision, add a 'Não' branch
      if (task.type === 'decision') {
        const noAreaName = task.noActionArea || task.area;
        const { laneId: noLaneId, centerY: noCenterY } = getLaneY(noAreaName);
        
        const noNode: Node = {
          id: `node-ai-no-${Math.random().toString(36).substr(2, 9)}`,
          type: task.noActionType || 'step',
          x: currentX,
          y: noCenterY + (noLaneId === laneId ? 120 : 0), // Push down if same lane
          width: task.noActionType === 'start' ? START_END_SIZE : DEFAULT_WIDTH,
          height: task.noActionType === 'start' ? START_END_SIZE : DEFAULT_HEIGHT,
          text: task.noAction || 'Tratar Exceção',
          fontSize: 12,
          laneId: noLaneId
        };
        newNodes.push(noNode);
        newConnections.push({
          id: `conn-ai-no-${Math.random().toString(36).substr(2, 9)}`,
          from: newNode.id,
          to: noNode.id,
          type: 'down',
          label: 'Não'
        });
      }
      
      lastMainNodeId = newNode.id;
      currentX += nodeWidth + 100;
    });

    // Add Fim - connect from the last main path node
    const { laneId: endLaneId, centerY: endCenterY } = getLaneY(aiTasks[aiTasks.length-1].area);
    const endNode: Node = {
      id: `node-ai-end-${Math.random().toString(36).substr(2, 9)}`,
      type: 'start',
      x: currentX,
      y: endCenterY - START_END_SIZE / 2,
      width: START_END_SIZE,
      height: START_END_SIZE,
      text: 'Fim',
      fontSize: 10,
      laneId: endLaneId
    };
    newNodes.push(endNode);
    newConnections.push({
      id: `conn-ai-final-${Math.random().toString(36).substr(2, 9)}`,
      from: lastMainNodeId,
      to: endNode.id,
      type: 'right'
    });

    setNodes([...nodes, ...newNodes]);
    setConnections([...connections, ...newConnections]);
    toast.success("Mapa gerado com sucesso!");
    setShowAIGenerator(false);
    
    // Trigger save to preserve state
    setTimeout(() => {
      onSave?.({ 
        nodes: [...nodes, ...newNodes], 
        connections: [...connections, ...newConnections], 
        lanes, 
        aiTasks 
      });
    }, 100);
  };

  const handleDragEnd = (id: string, e: any) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, x: e.target.x(), y: e.target.y() } : n));
  };

  const getConnectorPoints = (conn: Connection) => {
    const from = nodes.find(n => n.id === conn.from);
    const to = nodes.find(n => n.id === conn.to);
    if (!from || !to) return [];
    
    let startX = from.x + from.width / 2;
    let startY = from.y + from.height / 2;

    if (conn.type === 'right') startX = from.x + from.width;
    else if (conn.type === 'left') startX = from.x;
    else if (conn.type === 'down') startY = from.y + from.height;
    else if (conn.type === 'up') startY = from.y;

    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;

    if (conn.type === 'right' || conn.type === 'left') {
      // Starts horizontal
      if (Math.abs(startY - toCenterY) < 15) {
        // Straight horizontal
        const endX = startX < toCenterX ? to.x : to.x + to.width;
        return [startX, startY, endX, startY];
      } else {
        // L-shape: Horizontal then Vertical
        const endX = toCenterX;
        const endY = startY < toCenterY ? to.y : to.y + to.height;
        return [startX, startY, endX, startY, endX, endY];
      }
    } else {
      // Starts vertical
      if (Math.abs(startX - toCenterX) < 15) {
        // Straight vertical
        const endY = startY < toCenterY ? to.y : to.y + to.height;
        return [startX, startY, startX, endY];
      } else {
        // L-shape: Vertical then Horizontal
        const endX = startX < toCenterX ? to.x : to.x + to.width;
        const endY = toCenterY;
        return [startX, startY, startX, endY, endX, endY];
      }
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedId);

  return (
    <div className="flex flex-col gap-4 bg-white p-6 border border-gray-200 rounded-[12px] shadow-sm">
      {/* AI Assistant Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[12px] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-[8px] backdrop-blur-sm">
              <Sparkles size={20} className="text-yellow-300" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold">Assistente de Processos IA</h3>
              <p className="text-[12px] text-blue-100 opacity-90">Crie seu mapa do processo automaticamente preenchendo a tabela abaixo.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAIGenerator(!showAIGenerator)}
            className="px-4 py-2 bg-white text-blue-600 rounded-[8px] text-[13px] font-bold hover:bg-blue-50 transition-colors shadow-sm"
          >
            {showAIGenerator ? 'Recolher Assistente' : 'Abrir Tabela de Atividades'}
          </button>
        </div>

        {showAIGenerator && (
          <div className="mt-6 bg-white/10 backdrop-blur-md rounded-[12px] p-4 border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-blue-100 font-bold">
                    <th className="pb-3 pl-2 w-1/4">Área / Raia</th>
                    <th className="pb-3 w-1/4">Tipo de Atividade</th>
                    <th className="pb-3 w-2/4">Descrição da Atividade (Ações)</th>
                    <th className="pb-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {aiTasks.map((task, idx) => (
                    <tr key={idx} className="group hover:bg-white/5 transition-colors">
                      <td className="pr-2 py-3 align-top">
                        <div className={cn(
                          "w-full",
                          ((idx > 0 && aiTasks[idx - 1].type === 'decision') || task.type === 'decision') && "mt-3.5",
                          (idx > 0 && aiTasks[idx - 1].type === 'decision' && task.type === 'decision') && "mt-7"
                        )}>
                          <input 
                            value={task.area}
                            onChange={(e) => {
                              const newTasks = [...aiTasks];
                              newTasks[idx].area = e.target.value;
                              setAiTasks(newTasks);
                            }}
                            placeholder="Ex: Vendas, RH..."
                            className="w-full bg-white/10 border border-white/10 rounded-[6px] px-3 py-1.5 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                          />
                        </div>
                      </td>
                      <td className="pr-2 py-3 align-top">
                        <div className={cn(
                          "w-full",
                          ((idx > 0 && aiTasks[idx - 1].type === 'decision') || task.type === 'decision') && "mt-3.5",
                          (idx > 0 && aiTasks[idx - 1].type === 'decision' && task.type === 'decision') && "mt-7"
                        )}>
                          <select 
                            value={task.type}
                            onChange={(e) => {
                              const newTasks = [...aiTasks];
                              newTasks[idx].type = e.target.value as any;
                              setAiTasks(newTasks);
                            }}
                            className="w-full bg-white/10 border border-white/10 rounded-[6px] px-3 py-1.5 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                          >
                            <option value="step" className="text-gray-900">Etapa (Retângulo)</option>
                            <option value="decision" className="text-gray-900">Decisão (Losango)</option>
                            <option value="subprocess" className="text-gray-900">Subprocesso</option>
                          </select>
                        </div>
                      </td>
                      <td className="pr-2 py-3 align-top">
                        <div className="space-y-1 relative">
                          {idx > 0 && aiTasks[idx - 1].type === 'decision' && (
                            <div className="flex items-center gap-2 mb-0.5 animate-in fade-in slide-in-from-left-1 h-3">
                              <span className="text-[8px] font-black text-green-400 uppercase tracking-widest whitespace-nowrap">SE SIM:</span>
                              <div className="h-[1px] flex-1 bg-white/5" />
                            </div>
                          )}
                          {task.type === 'decision' && (
                            <div className="flex items-center gap-2 mb-0.5 h-3">
                              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">ATIVIDADE / PERGUNTA:</span>
                              <div className="h-[1px] flex-1 bg-white/5" />
                            </div>
                          )}
                          <input 
                            value={task.activity}
                            onChange={(e) => {
                              const newTasks = [...aiTasks];
                              newTasks[idx].activity = e.target.value;
                              setAiTasks(newTasks);
                            }}
                            placeholder="Ex: Realizar check-in, Validar documentos..."
                            className="w-full bg-white/10 border border-white/10 rounded-[6px] px-3 py-1.5 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                          />
                          
                          {task.type === 'decision' && (
                            <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-300">
                              <div className="flex items-center gap-2 h-3">
                                <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">SE NÃO:</span>
                                <div className="h-[1px] flex-1 bg-white/5" />
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <input 
                                  value={task.noActionArea || ''}
                                  onChange={(e) => {
                                    const newTasks = [...aiTasks];
                                    newTasks[idx].noActionArea = e.target.value;
                                    setAiTasks(newTasks);
                                  }}
                                  placeholder="Área (Não)"
                                  className="bg-white/10 border border-white/5 rounded-[4px] px-2 py-1.5 text-[11px] text-white placeholder:text-white/30"
                                />
                                <select 
                                  value={task.noActionType || 'step'}
                                  onChange={(e) => {
                                    const newTasks = [...aiTasks];
                                    newTasks[idx].noActionType = e.target.value as any;
                                    setAiTasks(newTasks);
                                  }}
                                  className="bg-white/10 border border-white/5 rounded-[4px] px-2 py-1.5 text-[11px] text-white outline-none cursor-pointer"
                                >
                                  <option value="step" className="bg-gray-800">Etapa</option>
                                  <option value="subprocess" className="bg-gray-800">Subprocesso</option>
                                  <option value="start" className="bg-gray-800">Fim</option>
                                </select>
                                <input 
                                  value={task.noAction || ''}
                                  onChange={(e) => {
                                    const newTasks = [...aiTasks];
                                    newTasks[idx].noAction = e.target.value;
                                    setAiTasks(newTasks);
                                  }}
                                  placeholder="Atividade (Não)"
                                  className="bg-white/10 border border-white/5 rounded-[4px] px-2 py-1.5 text-[11px] text-white placeholder:text-white/30"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="pr-1 py-1 align-top text-right">
                        <button 
                          onClick={() => {
                            const newTasks = aiTasks.filter((_, i) => i !== idx);
                            setAiTasks(newTasks.length ? newTasks : [{ area: '', type: 'step', activity: '' }]);
                          }}
                          className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <button 
                onClick={() => setAiTasks([...aiTasks, { area: '', type: 'step', activity: '' }])}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-[8px] text-[12px] font-bold transition-colors"
              >
                <Plus size={16} /> Adicionar Linha
              </button>
              
              <button 
                onClick={generateFromAI}
                className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 rounded-[8px] text-[13px] font-black transition-all shadow-lg active:scale-95"
              >
                <Wand2 size={18} /> GERAR MAPA COMPLETO
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-[8px]">
            <MousePointer2 size={18} />
          </div>
          <div className="w-[1px] h-6 bg-gray-200 mx-2" />
          <button onClick={() => addNode('start')} className="p-2 text-gray-500 hover:bg-gray-50 rounded-[8px] flex items-center gap-2 text-[13px] font-bold">
            <CircleIcon size={18} className="text-green-500" /> Início/Fim
          </button>
          <button onClick={() => addNode('step')} className="p-2 text-gray-500 hover:bg-gray-50 rounded-[8px] flex items-center gap-2 text-[13px] font-bold">
            <Square size={18} className="text-blue-500" /> Etapa
          </button>
          <button onClick={() => addNode('decision')} className="p-2 text-gray-500 hover:bg-gray-50 rounded-[8px] flex items-center gap-2 text-[13px] font-bold">
            <Diamond size={18} className="text-orange-500" /> Decisão
          </button>
          <button onClick={() => addNode('subprocess')} className="p-2 text-gray-500 hover:bg-gray-50 rounded-[8px] flex items-center gap-2 text-[13px] font-bold">
            <div className="relative w-[18px] h-[18px] border-2 border-purple-500 rounded-sm">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-purple-500" />
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-purple-500" />
            </div>
            Subprocesso
          </button>
          <button onClick={() => addNode('text')} className="p-2 text-gray-500 hover:bg-gray-50 rounded-[8px] flex items-center gap-2 text-[13px] font-bold">
            <Type size={18} className="text-gray-600" /> Texto Livre
          </button>
          
          <div className="w-[1px] h-6 bg-gray-200 mx-2" />
          
          <button 
            onClick={alignHorizontal} 
            disabled={selectedIds.length < 2}
            className={cn(
              "p-2 rounded-[8px] flex items-center gap-2 text-[13px] font-bold transition-all",
              selectedIds.length >= 2 ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-300 cursor-not-allowed"
            )}
            title="Alinhar Horizontalmente (Selecione 2+ boxes)"
          >
            <AlignHorizontalJustifyCenter size={18} />
          </button>
          <button 
            onClick={alignVertical} 
            disabled={selectedIds.length < 2}
            className={cn(
              "p-2 rounded-[8px] flex items-center gap-2 text-[13px] font-bold transition-all",
              selectedIds.length >= 2 ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-300 cursor-not-allowed"
            )}
            title="Alinhar Verticalmente (Selecione 2+ boxes)"
          >
            <AlignVerticalJustifyCenter size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={addLane}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-[8px] text-[13px] font-bold hover:bg-blue-100 transition-all"
          >
            <Plus size={18} /> Adicionar Área
          </button>
          {(selectedId || selectedConnId || selectedIds.length > 0) && (
            <button onClick={deleteSelected} className="p-2 text-red-500 hover:bg-red-50 rounded-[8px]" title="Excluir Selecionado">
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[8px] transition-all"
            title="Limpar Todos os Dados"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => {
              const element = document.getElementById('process-mapper-canvas');
              if (element && stageRef.current) {
                // To print perfectly, we capture the bounding box of the content
                const stage = stageRef.current;
                
                // Calculate bounding box of all nodes and lanes
                let minX = Infinity, minY = 0, maxX = 0, maxY = 0;
                
                nodes.forEach(node => {
                  minX = Math.min(minX, node.x);
                  minY = Math.min(minY, node.y);
                  maxX = Math.max(maxX, node.x + node.width);
                  maxY = Math.max(maxY, node.y + node.height);
                });
                
                lanes.forEach((lane, idx) => {
                  let yOffset = 0;
                  for(let i=0; i<idx; i++) yOffset += lanes[i].height;
                  maxY = Math.max(maxY, yOffset + lane.height);
                });
                
                // Include lane labels
                minX = Math.min(minX, 0); 
                maxX = Math.max(maxX, 2000); // at least some width
                
                // Add some padding
                const padding = 50;
                const cropRect = {
                  x: 0,
                  y: 0,
                  width: Math.min(3000, maxX + padding),
                  height: maxY + padding
                };

                toPng(element, { 
                  backgroundColor: '#ffffff', 
                  quality: 1.0, 
                  pixelRatio: 3,
                  width: Math.max(1200, maxX + padding),
                  height: Math.max(800, maxY + padding),
                  style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                  },
                  filter: (node) => {
                    if (node instanceof HTMLElement && node.classList.contains('no-print')) return false;
                    return true;
                  }
                })
                  .then(dataUrl => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Mapa de Processo</title>
                            <style>
                              @page { size: landscape; margin: 10mm; }
                              body { 
                                margin: 0; 
                                padding: 0; 
                                background: #f8fafc;
                                display: flex;
                                justify-content: center;
                                align-items: flex-start;
                                min-height: 100vh;
                                overflow-y: auto;
                              }
                              .img-wrapper {
                                background: white;
                                padding: 40px;
                                margin: 20px;
                                border-radius: 12px;
                                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                                max-width: 95vw;
                                display: flex;
                                justify-content: center;
                              }
                              img { 
                                width: 100%; 
                                height: auto; 
                                display: block;
                                object-fit: contain;
                              }
                              @media print { 
                                body { background: white; padding: 0; margin: 0; }
                                .img-wrapper { box-shadow: none; padding: 0; margin: 0; border-radius: 0; max-width: 100vw; }
                                img { width: 100%; height: auto; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="img-wrapper">
                              <img src="${dataUrl}" onload="setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 500);" />
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  });
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-[8px] text-[13px] font-bold hover:bg-gray-200 transition-all"
            title="Imprimir Mapa"
          >
            <Printer size={18} /> Imprimir
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f2937] text-white rounded-[8px] text-[13px] font-bold hover:bg-gray-800 transition-all"
          >
            <Save size={18} /> Salvar Mapa
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div id="process-mapper-canvas" ref={containerRef} className="flex-1 bg-gray-50 rounded-[12px] border-2 border-dashed border-gray-200 overflow-auto relative min-h-[600px]">
          {connectingFrom && (
            <div className="absolute top-4 left-4 z-10 bg-blue-600 text-white px-3 py-1 rounded-full text-[11px] font-bold animate-pulse">
              Arraste até o destino...
            </div>
          )}
          
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onClick={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedId(null);
                setSelectedIds([]);
                setSelectedConnId(null);
                setSelectedLaneId(null);
                setConnectingFrom(null);
              }
            }}
          >
            <Layer>
              {/* Swimlanes Background and Labels */}
              {lanes.map((lane, index) => {
                const yOffset = lanes.slice(0, index).reduce((acc, l) => acc + l.height, 0);
                return (
                  <Group key={lane.id}>
                    {/* Lane Label Area */}
                    <Rect
                      x={0}
                      y={yOffset}
                      width={LANE_LABEL_WIDTH}
                      height={lane.height}
                      fill={selectedLaneId === lane.id ? '#eff6ff' : '#f8fafc'}
                      stroke={selectedLaneId === lane.id ? '#3b82f6' : '#e2e8f0'}
                      strokeWidth={selectedLaneId === lane.id ? 2 : 1}
                      onClick={() => {
                        setSelectedLaneId(lane.id);
                        setSelectedId(null);
                        setSelectedIds([]);
                        setSelectedConnId(null);
                      }}
                    />
                    <Text
                      x={10}
                      y={yOffset + lane.height / 2 - 10}
                      text={lane.name}
                      width={LANE_LABEL_WIDTH - 20}
                      align="center"
                      fontSize={12}
                      fontStyle="bold"
                      fill="#475569"
                    />
                    {/* Lane Content Area Background */}
                    <Rect
                      x={LANE_LABEL_WIDTH}
                      y={yOffset}
                      width={stageSize.width - LANE_LABEL_WIDTH}
                      height={lane.height}
                      fill="white"
                      stroke="#f1f5f9"
                      strokeWidth={1}
                    />
                    {/* Separator Line */}
                    <Line
                      points={[0, yOffset + lane.height, stageSize.width, yOffset + lane.height]}
                      stroke="#e2e8f0"
                      strokeWidth={1}
                    />
                  </Group>
                );
              })}

              {/* Drag Preview Line */}
              {dragLine && (
                <Arrow
                  points={
                    dragLine.type === 'right' || dragLine.type === 'left' 
                      ? [dragLine.x1, dragLine.y1, dragLine.x2, dragLine.y1, dragLine.x2, dragLine.y2]
                      : [dragLine.x1, dragLine.y1, dragLine.x1, dragLine.y2, dragLine.x2, dragLine.y2]
                  }
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeScaleEnabled={false}
                  dash={[5, 5]}
                  fill="#3b82f6"
                  pointerLength={8}
                  pointerWidth={8}
                  listening={false}
                />
              )}

              {/* Nodes */}
              {nodes.map((node) => (
                <Group
                  key={node.id}
                  id={`node-group-${node.id}`}
                  x={node.x}
                  y={node.y}
                  draggable={!connectingFrom}
                  onDragEnd={(e) => handleDragEnd(node.id, e)}
                  onClick={(e) => handleNodeClick(node.id, e)}
                  onDblClick={() => handleNodeDblClick(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  dragBoundFunc={(pos) => {
                    const x = Math.max(LANE_LABEL_WIDTH, Math.min(pos.x, stageSize.width - node.width));
                    const y = Math.max(0, Math.min(pos.y, stageSize.height - node.height));
                    return { x, y };
                  }}
                >
                  {(selectedId === node.id || selectedIds.includes(node.id)) && (
                    <Rect
                      x={-5}
                      y={-5}
                      width={node.width + 10}
                      height={node.height + 10}
                      stroke="#3b82f6"
                      strokeWidth={1}
                      dash={[4, 4]}
                      cornerRadius={node.type === 'start' ? (node.height + 10) / 2 : 4}
                    />
                  )}
                  {node.type === 'start' && (
                    <Rect
                      width={node.width}
                      height={node.height}
                      cornerRadius={node.height / 2}
                      fill={selectedId === node.id || selectedIds.includes(node.id) ? '#dcfce7' : '#f0fdf4'}
                      stroke={selectedId === node.id || selectedIds.includes(node.id) ? '#22c55e' : '#bbf7d0'}
                      strokeWidth={2}
                    />
                  )}
                  {node.type === 'step' && (
                    <Rect
                      width={node.width}
                      height={node.height}
                      cornerRadius={4}
                      fill={selectedId === node.id || selectedIds.includes(node.id) ? '#dbeafe' : '#eff6ff'}
                      stroke={selectedId === node.id || selectedIds.includes(node.id) ? '#3b82f6' : '#bfdbfe'}
                      strokeWidth={2}
                    />
                  )}
                  {node.type === 'decision' && (
                    <Line
                      points={[
                        node.width / 2, 0,
                        node.width, node.height / 2,
                        node.width / 2, node.height,
                        0, node.height / 2
                      ]}
                      closed
                      fill={selectedId === node.id || selectedIds.includes(node.id) ? '#ffedd5' : '#fff7ed'}
                      stroke={selectedId === node.id || selectedIds.includes(node.id) ? '#f97316' : '#fed7aa'}
                      strokeWidth={2}
                    />
                  )}
                  {node.type === 'subprocess' && (
                    <Group>
                      <Rect
                        width={node.width}
                        height={node.height}
                        cornerRadius={4}
                        fill={selectedId === node.id || selectedIds.includes(node.id) ? '#f3e8ff' : '#faf5ff'}
                        stroke={selectedId === node.id || selectedIds.includes(node.id) ? '#a855f7' : '#e9d5ff'}
                        strokeWidth={2}
                      />
                      {/* Subprocess side bars */}
                      <Line
                        points={[10, 0, 10, node.height]}
                        stroke={selectedId === node.id ? '#a855f7' : '#e9d5ff'}
                        strokeWidth={2}
                      />
                      <Line
                        points={[node.width - 10, 0, node.width - 10, node.height]}
                        stroke={selectedId === node.id ? '#a855f7' : '#e9d5ff'}
                        strokeWidth={2}
                      />
                    </Group>
                  )}
                  {node.type === 'text' && (
                    <Rect
                      width={node.width}
                      height={node.height}
                      fill="transparent"
                      stroke={selectedId === node.id ? '#3b82f6' : 'transparent'}
                      strokeWidth={1}
                      dash={[2, 2]}
                    />
                  )}
                  <Text
                    text={node.text}
                    width={node.type === 'decision' ? node.width * 0.7 : node.width}
                    height={node.type === 'decision' ? node.height * 0.7 : node.height}
                    x={node.type === 'decision' ? node.width * 0.15 : 0}
                    y={node.type === 'decision' ? node.height * 0.15 : 0}
                    align="center"
                    verticalAlign="middle"
                    fontSize={node.fontSize}
                    fontStyle={node.type === 'text' ? 'normal' : 'bold'}
                    fill={node.type === 'text' ? '#1e293b' : (selectedId === node.id ? '#1e293b' : '#64748b')}
                    padding={node.type === 'decision' ? 5 : 10}
                    wrap="word"
                  />

                  {/* Connection Points */}
                  {(hoveredNodeId === node.id || selectedId === node.id) && (
                    <Group>
                      {/* Right */}
                      <Circle
                        x={node.width}
                        y={node.height / 2}
                        radius={6}
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth={2}
                        onMouseDown={(e) => handleConnectionPointMouseDown(node.id, 'right', e)}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'default';
                        }}
                      />
                      {/* Left */}
                      <Circle
                        x={0}
                        y={node.height / 2}
                        radius={6}
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth={2}
                        onMouseDown={(e) => handleConnectionPointMouseDown(node.id, 'left', e)}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'default';
                        }}
                      />
                      {/* Top */}
                      <Circle
                        x={node.width / 2}
                        y={0}
                        radius={6}
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth={2}
                        onMouseDown={(e) => handleConnectionPointMouseDown(node.id, 'up', e)}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'default';
                        }}
                      />
                      {/* Bottom */}
                      <Circle
                        x={node.width / 2}
                        y={node.height}
                        radius={6}
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth={2}
                        onMouseDown={(e) => handleConnectionPointMouseDown(node.id, 'down', e)}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage().container();
                          container.style.cursor = 'default';
                        }}
                      />
                    </Group>
                  )}
                </Group>
              ))}

              {/* Connections */}
              {connections.map((conn) => {
                const points = getConnectorPoints(conn);
                const isSelected = selectedConnId === conn.id;
                
                // Don't render the line if we are dragging one of its points (dragLine will handle it)
                if (draggingConnPoint?.connId === conn.id) return null;

                return (
                  <Group key={conn.id}>
                    <Arrow
                      points={points}
                      stroke={isSelected ? '#3b82f6' : '#475569'}
                      strokeWidth={isSelected ? 3 : 2}
                      fill={isSelected ? '#3b82f6' : '#475569'}
                      pointerLength={10}
                      pointerWidth={10}
                      pointerAtEnding={true}
                      tension={0}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedConnId(conn.id);
                        setSelectedId(null);
                        setSelectedIds([]);
                        setSelectedLaneId(null);
                      }}
                    />
                    {conn.label && points.length >= 4 && (
                      <Group
                        x={(points[0] + points[2]) / 2}
                        y={(points[1] + points[3]) / 2}
                      >
                        <Rect
                          width={40}
                          height={20}
                          fill="white"
                          cornerRadius={4}
                          stroke="#e2e8f0"
                          strokeWidth={1}
                          offsetX={20}
                          offsetY={10}
                        />
                        <Text
                          text={conn.label}
                          fontSize={10}
                          fill="#475569"
                          width={40}
                          align="center"
                          verticalAlign="middle"
                          offsetX={20}
                          offsetY={5}
                        />
                      </Group>
                    )}
                    {isSelected && (
                      <>
                        {/* Start handle */}
                        <Circle
                          x={points[0]}
                          y={points[1]}
                          radius={6}
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth={2}
                          draggable
                          onDragStart={(e) => {
                            e.cancelBubble = true;
                            setDraggingConnPoint({ connId: conn.id, isStart: true });
                            setDragLine({ 
                              x1: points[points.length-2], 
                              y1: points[points.length-1], 
                              x2: points[0], 
                              y2: points[1], 
                              type: conn.type || 'right' 
                            });
                          }}
                        />
                        {/* End handle */}
                        <Circle
                          x={points[points.length - 2]}
                          y={points[points.length - 1]}
                          radius={6}
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth={2}
                          draggable
                          onDragStart={(e) => {
                            e.cancelBubble = true;
                            setDraggingConnPoint({ connId: conn.id, isStart: false });
                            setDragLine({ 
                              x1: points[0], 
                              y1: points[1], 
                              x2: points[points.length - 2], 
                              y2: points[points.length - 1], 
                              type: conn.type || 'right' 
                            });
                          }}
                        />
                      </>
                    )}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>

        {(selectedId || selectedConnId || selectedLaneId) && (
          <div className="w-72 p-4 bg-white border border-gray-200 rounded-[12px] space-y-6 overflow-y-auto max-h-[600px] animate-in slide-in-from-right duration-300">
            {selectedId && selectedNode ? (
              <>
                {isEditingText ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                      <Type size={16} /> Editar Texto
                    </h4>
                    <textarea
                      value={selectedNode.text}
                      onChange={(e) => updateNode(selectedId, { text: e.target.value })}
                      className="w-full p-3 border-2 border-blue-500 rounded-[8px] text-[13px] min-h-[100px] focus:ring-0 outline-none shadow-sm"
                      placeholder="Digite o texto..."
                      autoFocus
                      onBlur={() => setIsEditingText(false)}
                    />
                    <p className="text-[10px] text-gray-400 italic">Clique fora da caixa para concluir a edição</p>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-[8px] flex items-center gap-2 text-blue-600">
                    <Type size={16} className="shrink-0" />
                    <p className="text-[11px] font-medium">Dê um <strong>duplo clique</strong> no bloco para editar o texto.</p>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <h4 className="text-[14px] font-bold text-gray-800">Área (Lane)</h4>
                  <select 
                    value={selectedNode.laneId || ''}
                    onChange={(e) => updateNode(selectedId, { laneId: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-[8px] text-[13px] focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Nenhuma</option>
                    {lanes.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {selectedNode.type === 'decision' && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-2 mt-2">
                      <Wand2 size={16} /> Caminhos de Decisão
                    </h4>
                    <p className="text-[11px] text-gray-500">Crie rapidamente as ramificações de resposta:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => addPathFromDecision(selectedId, 'Sim')}
                        className="py-2.5 bg-green-50 text-green-700 border border-green-100 rounded-[8px] text-[12px] font-bold hover:bg-green-100 transition-all flex flex-col items-center gap-1 shadow-sm"
                      >
                        <span>Caminho SIM</span>
                        <span className="text-[10px] font-normal opacity-70">Para Direita</span>
                      </button>
                      <button 
                        onClick={() => addPathFromDecision(selectedId, 'Não')}
                        className="py-2.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-[8px] text-[12px] font-bold hover:bg-orange-100 transition-all flex flex-col items-center gap-1 shadow-sm"
                      >
                        <span>Caminho NÃO</span>
                        <span className="text-[10px] font-normal opacity-70">Para Baixo</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[14px] font-bold text-gray-800">Dimensões</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-400 font-bold uppercase">Largura</label>
                      <input 
                        type="number" 
                        value={selectedNode.width}
                        onChange={(e) => updateNode(selectedId, { width: parseInt(e.target.value) || 40 })}
                        className="w-full p-2 border border-gray-200 rounded-[6px] text-[13px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-400 font-bold uppercase">Altura</label>
                      <input 
                        type="number" 
                        value={selectedNode.height}
                        onChange={(e) => updateNode(selectedId, { height: parseInt(e.target.value) || 40 })}
                        className="w-full p-2 border border-gray-200 rounded-[6px] text-[13px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[14px] font-bold text-gray-800">Tamanho da Letra</h4>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="8" 
                      max="32" 
                      value={selectedNode.fontSize}
                      onChange={(e) => updateNode(selectedId, { fontSize: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-[13px] font-bold text-gray-600 w-8">{selectedNode.fontSize}px</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <button 
                    onClick={deleteSelected}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-[8px] text-[13px] font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Excluir Etapa
                  </button>
                </div>
              </>
            ) : selectedConnId ? (
              <>
                <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                  <Link2 size={16} /> Conexão Selecionada
                </h4>
                
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 font-bold uppercase">Etiqueta (Sim/Não/Outro)</label>
                  <input 
                    value={connections.find(c => c.id === selectedConnId)?.label || ''}
                    onChange={(e) => {
                      setConnections(connections.map(c => 
                        c.id === selectedConnId ? { ...c, label: e.target.value } : c
                      ));
                    }}
                    placeholder="Ex: Sim, Não..."
                    className="w-full p-2 border border-gray-200 rounded-[8px] text-[13px] focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <button 
                    onClick={deleteSelected}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-[8px] text-[13px] font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Excluir Conexão
                  </button>
                </div>
              </>
            ) : selectedLaneId ? (
              <>
                <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                  <Users size={16} /> Configurar Área
                </h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase">Nome da Área</label>
                    <input 
                      value={lanes.find(l => l.id === selectedLaneId)?.name || ''}
                      onChange={(e) => updateLane(selectedLaneId, { name: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-[8px] text-[13px] focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase">Altura da Área</label>
                    <input 
                      type="number" 
                      value={lanes.find(l => l.id === selectedLaneId)?.height || 150}
                      onChange={(e) => updateLane(selectedLaneId, { height: parseInt(e.target.value) || 50 })}
                      className="w-full p-2 border border-gray-200 rounded-[8px] text-[13px] focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      deleteLane(selectedLaneId);
                      setSelectedLaneId(null);
                    }}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-[8px] text-[13px] font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Excluir Área
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Swimlanes Management (Bottom Section) */}
      {!selectedId && !selectedConnId && !selectedLaneId && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-[12px] animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
              <Users size={16} /> Áreas (Swimlanes)
            </h4>
            <button 
              onClick={addLane}
              className="px-3 py-1 bg-blue-600 text-white rounded-[6px] text-[12px] font-bold hover:bg-blue-700 transition-all"
            >
              + Adicionar Área
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lanes.map((lane) => (
              <div key={lane.id} className="p-3 bg-white rounded-[8px] border border-gray-200 shadow-sm flex items-center justify-between gap-4">
                <div className="flex-1">
                  <input 
                    value={lane.name}
                    onChange={(e) => updateLane(lane.id, { name: e.target.value })}
                    className="bg-transparent font-bold text-[12px] text-gray-700 outline-none w-full focus:border-b focus:border-blue-300"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">H:</span>
                    <input 
                      type="number" 
                      value={lane.height}
                      onChange={(e) => updateLane(lane.id, { height: parseInt(e.target.value) || 50 })}
                      className="w-12 p-1 border border-gray-100 rounded-[4px] text-[11px] text-center"
                    />
                  </div>
                  <button onClick={() => deleteLane(lane.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
