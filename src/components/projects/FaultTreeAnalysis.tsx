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
  Sparkles,
  Loader2,
  BookOpen
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
  onClearAIData?: () => void;
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

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Estrutura real do FTA: evento topo (level 0) + causas/subcausas em níveis,
// com porta lógica (gate) e marcação se a causa impacta o problema (Y).
type ExemploFTANode = { level: number; name: string; gate?: GateType; impactsY?: boolean };
const FTA_EXEMPLOS: { id: string; rotulo: string; topo: string; nodes: ExemploFTANode[] }[] = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    topo: 'Pagamento a fornecedor feito em duplicidade',
    nodes: [
      { level: 0, name: 'Pagamento a fornecedor feito em duplicidade', gate: 'OR' },
      { level: 1, name: 'Falha no controle de notas fiscais', gate: 'OR' },
      { level: 2, name: 'Nota lançada duas vezes no sistema', impactsY: true },
      { level: 2, name: 'Sem conferência de NF já paga' },
      { level: 1, name: 'Falha de comunicação entre setores', gate: 'AND' },
      { level: 2, name: 'Compras e Financeiro usam planilhas separadas', impactsY: true },
      { level: 2, name: 'Aprovação manual sem registro central' },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    topo: 'Parada não planejada da linha de envase',
    nodes: [
      { level: 0, name: 'Parada não planejada da linha de envase', gate: 'OR' },
      { level: 1, name: 'Falha mecânica do equipamento', gate: 'OR' },
      { level: 2, name: 'Rolamento da esteira sem lubrificação', impactsY: true },
      { level: 2, name: 'Correia gasta além do limite' },
      { level: 1, name: 'Falha de processo / operação', gate: 'AND' },
      { level: 2, name: 'Manutenção preventiva atrasada', impactsY: true },
      { level: 2, name: 'Operador sem checklist de partida' },
    ],
  },
];

export default function FaultTreeAnalysis({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: FaultTreeAnalysisProps) {
  const [nodes, setNodes] = useState<FTANode[]>(initialData?.nodes || [INITIAL_NODE]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  const isToolEmpty = nodes.length <= 1 && nodes[0]?.id === 'root' && (nodes[0]?.description === INITIAL_NODE.description || nodes[0]?.description === '');

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
      id: crypto.randomUUID(),
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
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Árvore de Falhas (FTA) com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará o problema principal e as causas identificadas no Brainstorming e Ishikawa para estruturar uma Árvore de Falhas técnica e lógica.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA organizará as causas em portas lógicas (OU/E) para facilitar a investigação das causas raiz.
              </p>
            </div>
            <button
              onClick={() => handleAI()}
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

      {/* Indicador de IA */}
      {!isToolEmpty && onGenerateAI && initialData?.isGenerated && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600">Gerado com IA</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Deseja limpar os dados gerados pela IA?')) {
                onClearAIData?.();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          >
            <Trash2 size={13} />
            Limpar dados da IA
          </button>
        </div>
      )}

      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-center gap-2">
          <button
            onClick={() => setShowExemplo(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
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

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Árvore de Falhas (FTA)</h3>
                  <p className="text-xs text-gray-500 m-0">{FTA_EXEMPLOS[exemploIdx].topo}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemplo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Abas — Escritório / Manufatura */}
            <div className="flex gap-2 px-6 pt-4">
              {FTA_EXEMPLOS.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setExemploIdx(i)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                    exemploIdx === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>

            {/* Árvore por níveis (indentação) */}
            <div className="p-6">
              <div className="flex flex-col gap-2">
                {FTA_EXEMPLOS[exemploIdx].nodes.map((n, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border',
                      n.level === 0 ? 'bg-gray-800 text-white border-gray-900' :
                      n.impactsY ? 'bg-red-50 border-l-4 border-l-red-500 border-red-100' :
                      'bg-white border-gray-200'
                    )}
                    style={{ marginLeft: `${n.level * 28}px` }}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded flex items-center justify-center shrink-0',
                      n.level === 0 ? 'bg-white/20 text-white' : 'bg-white border border-gray-300 text-gray-600'
                    )}>
                      <GitFork size={14} />
                    </div>
                    <span className={cn(
                      'text-sm font-bold flex-1',
                      n.level === 0 ? 'text-white' : n.impactsY ? 'text-red-700' : 'text-gray-800'
                    )}>
                      {n.name}
                    </span>
                    {n.gate && n.gate !== 'NONE' && (
                      <span className={cn(
                        'text-[10px] font-black uppercase px-1.5 py-0.5 rounded',
                        n.level === 0 ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                      )}>
                        Porta {n.gate}
                      </span>
                    )}
                    {n.impactsY && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Impacta</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Este exemplo é só pra consulta — <strong>não altera os seus dados</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
