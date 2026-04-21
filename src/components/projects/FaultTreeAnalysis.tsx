import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitFork, 
  Plus, 
  Trash2, 
  Save, 
  Info, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Search,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

type InvestigationStatus = 'Não iniciado' | 'Em análise' | 'Concluído';
type ImpactResponse = 'Sim' | 'Não' | 'Pendente';
type GateType = 'AND' | 'OR' | 'NONE';

interface FTANode {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  gateType: GateType;
  status: InvestigationStatus;
  evidence: string;
  impactsY: ImpactResponse;
  justification: string;
  isExpanded: boolean;
}

interface FaultTreeAnalysisProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (prompt?: string) => void;
  isGeneratingAI?: boolean;
}

const INITIAL_NODE: FTANode = {
  id: 'root',
  parentId: null,
  name: 'Evento Principal (Y)',
  description: 'Defina aqui o problema principal que está sendo investigado.',
  gateType: 'OR',
  status: 'Não iniciado',
  evidence: '',
  impactsY: 'Pendente',
  justification: '',
  isExpanded: true
};

export default function FaultTreeAnalysis({ onSave, initialData, onGenerateAI, isGeneratingAI }: FaultTreeAnalysisProps) {
  const [nodes, setNodes] = useState<FTANode[]>(initialData?.nodes || [INITIAL_NODE]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');

  useEffect(() => {
    if (initialData?.nodes) {
      setNodes(initialData.nodes);
    }
  }, [initialData]);

  const handleAI = () => {
    if (onGenerateAI) {
      onGenerateAI("Ajude-me a estruturar uma Árvore de Falhas (FTA) completa para o evento principal do projeto.");
    }
  };

  const handleSave = () => {
    onSave({ nodes });
  };

  const addNode = (parentId: string) => {
    const newNode: FTANode = {
      id: Math.random().toString(36).substr(2, 9),
      parentId,
      name: 'Nova Causa',
      description: '',
      gateType: 'NONE',
      status: 'Não iniciado',
      evidence: '',
      impactsY: 'Pendente',
      justification: '',
      isExpanded: true
    };
    
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    
    // Ensure parent is expanded
    setNodes(prev => prev.map(n => n.id === parentId ? { ...n, isExpanded: true } : n));
  };

  const removeNode = (id: string) => {
    if (id === 'root') {
      toast.error("O evento principal não pode ser removido.");
      return;
    }
    
    // Recursive removal of children
    const getChildrenIds = (parentId: string): string[] => {
      const children = nodes.filter(n => n.parentId === parentId);
      return [...children.map(c => c.id), ...children.flatMap(c => getChildrenIds(c.id))];
    };
    
    const idsToRemove = [id, ...getChildrenIds(id)];
    setNodes(nodes.filter(n => !idsToRemove.includes(n.id)));
    if (selectedNodeId && idsToRemove.includes(selectedNodeId)) {
      setSelectedNodeId('root');
    }
  };

  const updateNode = (id: string, updates: Partial<FTANode>) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nodes.map(n => n.id === id ? { ...n, isExpanded: !n.isExpanded } : n));
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  const progress = useMemo(() => {
    const completed = nodes.filter(n => n.status === 'Concluído').length;
    return Math.round((completed / nodes.length) * 100);
  }, [nodes]);

  const confirmedCauses = useMemo(() => nodes.filter(n => n.impactsY === 'Sim'), [nodes]);

  // Recursive Tree Component
  const TreeNode = ({ nodeId, level = 0 }: { nodeId: string, level: number }) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const children = nodes.filter(n => n.parentId === nodeId);
    const isSelected = selectedNodeId === nodeId;
    const hasChildren = children.length > 0;

    return (
      <div className="flex flex-col">
        <div 
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border-2 mb-2 group relative",
            isSelected ? "border-blue-500 bg-blue-50 shadow-md" : "border-transparent hover:bg-gray-50",
            node.impactsY === 'Sim' ? "border-l-4 border-l-red-500" : "",
            node.status === 'Concluído' ? "opacity-100" : "opacity-80"
          )}
          onClick={() => setSelectedNodeId(nodeId)}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren ? (
            <button 
              onClick={(e) => toggleExpand(nodeId, e)}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
            >
              {node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className={cn(
            "w-8 h-8 rounded flex items-center justify-center shrink-0",
            nodeId === 'root' ? "bg-gray-800 text-white" : "bg-white border border-gray-300 text-gray-600"
          )}>
            {nodeId === 'root' ? <Target size={16} /> : <GitFork size={16} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-bold truncate",
                node.impactsY === 'Sim' ? "text-red-700" : "text-gray-800"
              )}>
                {node.name || 'Sem nome'}
              </span>
              {node.status === 'Concluído' && <CheckCircle2 size={12} className="text-green-500" />}
              {node.impactsY === 'Sim' && (
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Impacta</span>
              )}
            </div>
            {node.gateType !== 'NONE' && hasChildren && (
              <div className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">Porta {node.gateType}</div>
            )}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); addNode(nodeId); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-all"
            title="Adicionar Causa"
          >
            <Plus size={14} />
          </button>
        </div>

        <AnimatePresence>
          {node.isExpanded && hasChildren && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {children.map(child => (
                <TreeNode key={child.id} nodeId={child.id} level={level + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isGeneratingAI && (
          <div className="md:col-span-3 bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 animate-pulse mb-2">
            <Sparkles className="text-blue-500 animate-spin" size={20} />
            <span className="text-sm font-medium text-blue-700">A IA está estruturando sua Árvore de Falhas com base no problema central...</span>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <GitFork size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase">Progresso da Análise</div>
            <div className="text-2xl font-bold text-gray-800">{progress}%</div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase">Causas Confirmadas</div>
            <div className="text-2xl font-bold text-red-600">{confirmedCauses.length}</div>
            <div className="text-[10px] text-gray-400">Variáveis que impactam Y</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-center gap-3">
          <button
            onClick={handleSave}
            className="w-full flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-md justify-center border-none cursor-pointer"
          >
            <Save size={18} /> Salvar FTA
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tree View */}
        <div className="flex-1 bg-white border border-[#ccc] rounded-[8px] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-4 border-b border-[#eee] bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <GitFork size={16} className="text-blue-600" />
              Árvore de Falhas (FTA)
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-800 rounded-full"></div> Top Event</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Impactante</span>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-[700px]">
            <TreeNode nodeId="root" level={0} />
          </div>
        </div>

        {/* Investigation Panel */}
        <div className="w-full lg:w-[450px] shrink-0">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div 
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-[#ccc] rounded-[8px] shadow-lg overflow-hidden sticky top-6"
              >
                <div className={cn(
                  "p-4 border-b flex items-center justify-between",
                  selectedNode.id === 'root' ? "bg-gray-800 text-white" : "bg-blue-600 text-white"
                )}>
                  <div className="flex items-center gap-2">
                    <Search size={18} />
                    <h4 className="font-bold text-sm">Investigação da Causa</h4>
                  </div>
                  {selectedNode.id !== 'root' && (
                    <button 
                      onClick={() => removeNode(selectedNode.id)}
                      className="p-1.5 hover:bg-white/20 rounded text-white transition-colors"
                      title="Remover Causa"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-5">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nome da Variável/Causa</label>
                      <input 
                        type="text" 
                        value={selectedNode.name}
                        onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        placeholder="Ex: Temperatura do Forno"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Descrição Breve</label>
                      <textarea 
                        value={selectedNode.description}
                        onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                        placeholder="Descreva o que é esta causa e como ela pode ocorrer..."
                      />
                    </div>
                  </div>

                  {/* Logic & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Lógica (Porta)</label>
                      <select 
                        value={selectedNode.gateType}
                        onChange={(e) => updateNode(selectedNode.id, { gateType: e.target.value as GateType })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="NONE">Nenhuma</option>
                        <option value="OR">OU (OR)</option>
                        <option value="AND">E (AND)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status da Investigação</label>
                      <select 
                        value={selectedNode.status}
                        onChange={(e) => updateNode(selectedNode.id, { status: e.target.value as InvestigationStatus })}
                        className={cn(
                          "w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none font-bold",
                          selectedNode.status === 'Concluído' ? "border-green-300 bg-green-50 text-green-700" :
                          selectedNode.status === 'Em análise' ? "border-yellow-300 bg-yellow-50 text-yellow-700" :
                          "border-gray-300 bg-white text-gray-600"
                        )}
                      >
                        <option value="Não iniciado">Não iniciado</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100"></div>

                  {/* Investigation Core */}
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <label className="text-xs font-bold text-blue-900 block mb-3">
                        Pergunta Guia: Esta variável impacta o problema Y?
                      </label>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => updateNode(selectedNode.id, { impactsY: 'Sim' })}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all border",
                            selectedNode.impactsY === 'Sim' ? "bg-red-600 text-white border-red-600 shadow-md" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <Check size={14} /> SIM
                        </button>
                        <button 
                          onClick={() => updateNode(selectedNode.id, { impactsY: 'Não' })}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all border",
                            selectedNode.impactsY === 'Não' ? "bg-green-600 text-white border-green-600 shadow-md" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <X size={14} /> NÃO
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Evidências Encontradas</label>
                      <textarea 
                        value={selectedNode.evidence}
                        onChange={(e) => updateNode(selectedNode.id, { evidence: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                        placeholder="Descreva os dados, fotos ou observações que comprovam sua análise..."
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Justificativa da Conclusão</label>
                      <textarea 
                        value={selectedNode.justification}
                        onChange={(e) => updateNode(selectedNode.id, { justification: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                        placeholder="Por que você chegou a esta conclusão?"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-12 text-center h-full flex flex-col items-center justify-center">
                <GitFork size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 text-sm">Selecione uma causa na árvore para iniciar a investigação.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Summary List */}
      {confirmedCauses.length > 0 && (
        <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm p-6">
          <h3 className="font-bold text-red-700 text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            Causas Raiz Potenciais (Confirmadas)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {confirmedCauses.map(cause => (
              <div key={cause.id} className="bg-red-50 border border-red-100 rounded-lg p-4">
                <div className="font-bold text-red-900 text-sm mb-1">{cause.name}</div>
                <p className="text-[11px] text-red-700 line-clamp-2">{cause.justification || 'Sem justificativa preenchida.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 bg-blue-50 border border-blue-100 rounded-[8px] flex gap-4 items-start">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-blue-600">
          <Info size={20} />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 text-sm mb-1">Como usar o FTA (Fault Tree Analysis)</h4>
          <p className="text-[12px] text-blue-800 leading-relaxed">
            1. <strong>Top Event:</strong> Defina o problema principal no topo da árvore.<br/>
            2. <strong>Desdobramento:</strong> Adicione causas e subcausas usando o botão (+) em cada nó. Use portas <strong>OR</strong> (qualquer causa impacta) ou <strong>AND</strong> (todas as causas devem ocorrer).<br/>
            3. <strong>Investigação:</strong> Selecione cada nó para preencher as evidências e responder se a variável impacta o problema (Y).<br/>
            4. <strong>Foco:</strong> O sistema destacará em vermelho as causas confirmadas, que serão suas prioridades para a fase de Melhoria.
          </p>
        </div>
      </div>
    </div>
  );
}

// Icons needed but not imported in previous turns
function Target({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
