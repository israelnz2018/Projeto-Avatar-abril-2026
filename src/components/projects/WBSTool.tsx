import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, Edit3, 
  LayoutGrid, List, FileText, Download, Share2,
  Users, Info, Maximize2, Minimize2, Save, AlertCircle, Sparkles, Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface WBSItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  owner?: string;
  dictionary?: string;
  children: WBSItem[];
  isExpanded?: boolean;
}

interface WBSToolProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const DEFAULT_WBS: WBSItem = {
  id: 'root',
  name: 'Novo Projeto',
  code: '1.0',
  description: 'Projeto completo',
  isExpanded: true,
  children: [
    {
      id: 'init',
      name: 'Iniciação',
      code: '1.1',
      isExpanded: true,
      children: [
        { id: 'init-1', name: 'Termo de Abertura (Project Charter)', code: '1.1.1', children: [] },
        { id: 'init-2', name: 'Identificação de Stakeholders', code: '1.1.2', children: [] }
      ]
    },
    {
      id: 'plan',
      name: 'Planejamento',
      code: '1.2',
      isExpanded: true,
      children: [
        { id: 'plan-1', name: 'Plano de Gerenciamento do Projeto', code: '1.2.1', children: [] },
        { id: 'plan-2', name: 'Declaração de Escopo', code: '1.2.2', children: [] },
        { id: 'plan-3', name: 'Cronograma Detalhado', code: '1.2.3', children: [] }
      ]
    },
    {
      id: 'exec',
      name: 'Execução',
      code: '1.3',
      isExpanded: true,
      children: [
        { id: 'exec-1', name: 'Entregas do Produto/Serviço', code: '1.3.1', children: [] },
        { id: 'exec-2', name: 'Gestão da Equipe', code: '1.3.2', children: [] }
      ]
    },
    {
      id: 'mc',
      name: 'Monitoramento & Controle',
      code: '1.4',
      isExpanded: true,
      children: [
        { id: 'mc-1', name: 'Relatórios de Desempenho', code: '1.4.1', children: [] },
        { id: 'mc-2', name: 'Controle de Mudanças', code: '1.4.2', children: [] }
      ]
    },
    {
      id: 'close',
      name: 'Encerramento',
      code: '1.5',
      isExpanded: true,
      children: [
        { id: 'close-1', name: 'Aceite Final das Entregas', code: '1.5.1', children: [] },
        { id: 'close-2', name: 'Lições Aprendidas', code: '1.5.2', children: [] }
      ]
    }
  ]
};

export default function WBSTool({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: WBSToolProps) {
  const [wbs, setWbs] = useState<WBSItem>(initialData?.wbs || DEFAULT_WBS);
  const isToolEmpty = wbs.name === 'Novo Projeto' && wbs.children.length === 5 && wbs.children[0].name === 'Iniciação';
  const [viewMode, setViewMode] = useState<'tree' | 'outline'>('tree');
  const [editingItem, setEditingItem] = useState<WBSItem | null>(null);
  const [showDictionary, setShowDictionary] = useState<string | null>(null);

  // Auto-generate codes recursively
  const updateCodes = (item: WBSItem, parentCode: string = ''): WBSItem => {
    const children = item.children.map((child, index) => {
      const newCode = parentCode ? `${parentCode}.${index + 1}` : `${index + 1}.0`;
      return updateCodes(child, newCode);
    });
    return { ...item, children };
  };

  const handleUpdate = (updatedWbs: WBSItem) => {
    const wbsWithNewCodes = updateCodes(updatedWbs, '');
    // Fix root code to always be 1.0 if it's the top
    if (wbsWithNewCodes.id === 'root') wbsWithNewCodes.code = '1.0';
    setWbs(wbsWithNewCodes);
  };

  const findAndReplace = (root: WBSItem, id: string, replacement: Partial<WBSItem> | null): WBSItem | null => {
    if (root.id === id) {
      if (replacement === null) return null; // Delete
      return { ...root, ...replacement };
    }
    const newChildren = root.children
      .map(child => findAndReplace(child, id, replacement))
      .filter((c): c is WBSItem => c !== null);
    return { ...root, children: newChildren };
  };

  const addItem = (parentId: string) => {
    const newItem: WBSItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Nova Entrega',
      code: '',
      children: [],
      isExpanded: true
    };

    const addRecursive = (item: WBSItem): WBSItem => {
      if (item.id === parentId) {
        return { ...item, children: [...item.children, newItem], isExpanded: true };
      }
      return { ...item, children: item.children.map(addRecursive) };
    };

    handleUpdate(addRecursive(wbs));
    setEditingItem(newItem);
  };

  const updateItem = (id: string, updates: Partial<WBSItem>) => {
    const newWbs = findAndReplace(wbs, id, updates);
    if (newWbs) handleUpdate(newWbs);
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    if (id === 'root') {
      toast.error("Não é possível excluir a raiz do projeto.");
      return;
    }
    const newWbs = findAndReplace(wbs, id, null);
    if (newWbs) handleUpdate(newWbs);
  };

  const toggleExpand = (id: string) => {
    const toggleRecursive = (item: WBSItem): WBSItem => {
      if (item.id === id) return { ...item, isExpanded: !item.isExpanded };
      return { ...item, children: item.children.map(toggleRecursive) };
    };
    setWbs(toggleRecursive(wbs));
  };

  // Visual Tree Node Component
  const TreeNode = ({ item, level = 0 }: { item: WBSItem; level: number }) => {
    const colors = [
      'bg-blue-600 border-blue-700 text-white',
      'bg-blue-50 border-blue-200 text-blue-900',
      'bg-white border-gray-200 text-gray-800',
      'bg-gray-50 border-gray-200 text-gray-600',
    ];
    const colorClass = colors[Math.min(level, colors.length - 1)];

    return (
      <div className="flex flex-col items-center">
        <motion.div 
          layout
          className={cn(
            "relative p-3 rounded-lg border shadow-sm min-w-[180px] max-w-[240px] text-center group transition-all",
            colorClass,
            editingItem?.id === item.id && "ring-2 ring-yellow-400"
          )}
        >
          <div className="text-[10px] font-bold opacity-70 mb-1">{item.code}</div>
          <div className="text-xs font-bold leading-tight mb-2">{item.name}</div>
          
          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditingItem(item)} className="p-1 hover:bg-black/10 rounded" title="Editar">
              <Edit3 size={12} />
            </button>
            <button onClick={() => addItem(item.id)} className="p-1 hover:bg-black/10 rounded" title="Adicionar Filho">
              <Plus size={12} />
            </button>
            <button onClick={() => setShowDictionary(item.id)} className="p-1 hover:bg-black/10 rounded" title="Dicionário WBS">
              <FileText size={12} />
            </button>
            {item.id !== 'root' && (
              <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-red-500/20 rounded text-red-500" title="Excluir">
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {item.children.length > 0 && (
            <button 
              onClick={() => toggleExpand(item.id)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 shadow-sm z-10"
            >
              {item.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </motion.div>

        {item.isExpanded && item.children.length > 0 && (
          <div className="relative pt-8 flex gap-6">
            {/* Horizontal connection line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-gray-300" />
            {item.children.length > 1 && (
              <div className="absolute top-8 left-[calc(50%/children.length)] right-[calc(50%/children.length)] h-px bg-gray-300" 
                style={{ 
                  left: `${100 / (item.children.length * 2)}%`, 
                  right: `${100 / (item.children.length * 2)}%` 
                }} 
              />
            )}
            
            {item.children.map((child) => (
              <TreeNode key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Outline List Item Component
  const OutlineItem = ({ item, level = 0 }: { item: WBSItem; level: number }) => {
    return (
      <div className="space-y-1">
        <div 
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg border group transition-all",
            level === 0 ? "bg-blue-600 text-white border-blue-700" : 
            level === 1 ? "bg-blue-50 text-blue-900 border-blue-100 ml-6" :
            "bg-white text-gray-800 border-gray-100 ml-" + (level * 6)
          )}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <button onClick={() => toggleExpand(item.id)} className="text-current/50 hover:text-current">
            {item.children.length > 0 ? (item.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <div className="w-4" />}
          </button>
          <span className="text-[10px] font-mono font-bold opacity-70 w-12">{item.code}</span>
          <span className="text-sm font-bold flex-1">{item.name}</span>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditingItem(item)} className="p-1.5 hover:bg-black/5 rounded">
              <Edit3 size={14} />
            </button>
            <button onClick={() => addItem(item.id)} className="p-1.5 hover:bg-black/5 rounded">
              <Plus size={14} />
            </button>
            <button onClick={() => setShowDictionary(item.id)} className="p-1.5 hover:bg-black/5 rounded">
              <FileText size={14} />
            </button>
            {item.id !== 'root' && (
              <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        
        {item.isExpanded && item.children.map(child => (
          <OutlineItem key={child.id} item={child} level={level + 1} />
        ))}
      </div>
    );
  };

  const dictionaryItem = useMemo(() => {
    if (!showDictionary) return null;
    const findRecursive = (item: WBSItem): WBSItem | null => {
      if (item.id === showDictionary) return item;
      for (const child of item.children) {
        const found = findRecursive(child);
        if (found) return found;
      }
      return null;
    };
    return findRecursive(wbs);
  }, [showDictionary, wbs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar WBS com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Project Charter" para gerar
                WBS técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir
                um mapeamento rigoroso e técnico.
              </p>
            </div>
            <button
              onClick={() => onGenerateAI?.()}
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

      {/* Header */}
      <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            WBS - Estrutura Analítica do Projeto
          </h2>
          <p className="text-sm text-gray-500">Baseado nas boas práticas do PMI (Project Management Institute).</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button 
              onClick={() => setViewMode('tree')}
              className={cn("p-2 rounded-md flex items-center gap-2 text-xs font-bold transition-all", viewMode === 'tree' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
            >
              <LayoutGrid size={16} /> Árvore
            </button>
            <button 
              onClick={() => setViewMode('outline')}
              className={cn("p-2 rounded-md flex items-center gap-2 text-xs font-bold transition-all", viewMode === 'outline' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
            >
              <List size={16} /> Lista
            </button>
          </div>
          <button 
            onClick={() => window.print()}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
            title="Imprimir / Exportar PDF"
          >
            <Download size={18} />
          </button>
          <button 
            onClick={() => onSave({ wbs })}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            <Save size={18} /> Salvar WBS
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[600px] overflow-auto p-8 print:p-0 print:border-none print:shadow-none">
        {viewMode === 'tree' ? (
          <div className="flex justify-center min-w-max py-10">
            <TreeNode item={wbs} level={0} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-2">
            <OutlineItem item={wbs} level={0} />
          </div>
        )}
      </div>

      {/* PMI Best Practices Reminder */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 items-start">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Boas Práticas PMI</h4>
          <ul className="text-xs text-blue-700 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 list-disc pl-4">
            <li>Regra dos 100%: O WBS deve representar 100% do trabalho planejado.</li>
            <li>Foco em Entregas: Use substantivos (ex: "Relatório"), não verbos (ex: "Fazer relatório").</li>
            <li>Evite Sobreposição: Cada pacote de trabalho deve ser único.</li>
            <li>Nível de Detalhe: Decomponha até que o custo e cronograma possam ser estimados com precisão.</li>
          </ul>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-600" />
                  Editar Entrega {editingItem.code}
                </h3>
                <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                  <Maximize2 size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nome da Entrega</label>
                  <input 
                    autoFocus
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Responsável</label>
                  <div className="relative">
                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      value={editingItem.owner || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, owner: e.target.value })}
                      placeholder="Nome do responsável"
                      className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição Breve</label>
                  <textarea 
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    rows={3}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-white"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => updateItem(editingItem.id, editingItem)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dictionary Modal */}
      <AnimatePresence>
        {showDictionary && dictionaryItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText size={20} />
                    Dicionário WBS - {dictionaryItem.code}
                  </h3>
                  <p className="text-xs opacity-80">{dictionaryItem.name}</p>
                </div>
                <button onClick={() => setShowDictionary(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <Minimize2 size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Código WBS</label>
                    <div className="p-3 bg-gray-50 rounded-xl font-mono font-bold text-blue-600">{dictionaryItem.code}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Responsável</label>
                    <div className="p-3 bg-gray-50 rounded-xl font-bold">{dictionaryItem.owner || 'Não definido'}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                    <Info size={12} /> Descrição Detalhada do Pacote de Trabalho
                  </label>
                  <textarea 
                    value={dictionaryItem.dictionary || ''}
                    onChange={(e) => updateItem(dictionaryItem.id, { dictionary: e.target.value })}
                    placeholder="Descreva detalhadamente o que compõe esta entrega, critérios de aceitação, marcos, recursos necessários, etc..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[200px]"
                  />
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex gap-3">
                  <AlertCircle size={18} className="text-yellow-600 shrink-0" />
                  <p className="text-[11px] text-yellow-700 leading-relaxed">
                    <strong>Dica PMI:</strong> O Dicionário WBS é o documento que fornece informações detalhadas sobre as entregas, atividades e cronograma de cada componente na WBS. Ele evita ambiguidades sobre o que está incluído no escopo.
                  </p>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setShowDictionary(null)}
                  className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg"
                >
                  Fechar Dicionário
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
