import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Search, 
  HelpCircle,
  CheckCircle2,
  Play,
  Zap,
  Briefcase,
  BarChart2,
  PieChart,
  LineChart,
  Lightbulb,
  Video,
  MessageSquare,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Initiative } from '../../types';

interface IdeationTreeProps {
  initiatives: Initiative[];
  onSelect: (initiativeId: string) => void;
}

interface Node {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children?: Node[];
}

export default function IdeationTree({ initiatives, onSelect }: IdeationTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree from initiatives
  const buildTree = (parentId?: string): Node[] => {
    return initiatives
      .filter(i => (parentId ? i.parentId === parentId : !i.parentId))
      .map(i => ({
        id: i.id,
        label: i.name,
        description: i.description,
        icon: <Target size={16} />, // Default icon, could be dynamic later
        children: buildTree(i.id)
      }));
  };

  const treeData = buildTree();

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: Node, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="relative">
        {/* Connection Line for children */}
        {level > 0 && (
          <div className="absolute left-[-20px] top-1/2 w-4 h-[2px] bg-blue-200" />
        )}
        
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer mb-3",
            hasChildren 
              ? isExpanded ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-white border-gray-200 hover:border-blue-300"
              : "bg-white border-gray-200 hover:border-blue-400 hover:shadow-md group"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            } else {
              onSelect(node.id);
            }
          }}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            hasChildren 
              ? isExpanded ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
              : "bg-gray-100 text-gray-500 group-hover:bg-blue-600 group-hover:text-white"
          )}>
            {node.icon || <Target size={16} />}
          </div>
          
          <div className="flex-1">
            <div className="font-bold text-gray-800 text-sm">{node.label}</div>
            {node.description && (
              <div className="text-xs text-gray-500 mt-0.5">{node.description}</div>
            )}
          </div>

          {hasChildren ? (
            <div className="text-gray-400">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={16} className="text-blue-600" />
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pl-8 relative">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-0 bottom-6 w-[2px] bg-blue-100" />
                {node.children!.map(child => renderNode(child, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (treeData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <Target size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-black text-gray-800 mb-2">Nenhuma Iniciativa Configurada</h2>
        <p className="text-gray-500">
          Vá em "Configurações" para criar suas iniciativas e montar a árvore de ideação.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-2">
          Árvore de Ideação
        </h2>
        <p className="text-gray-500">
          Navegue pelas iniciativas para encontrar o caminho ideal para o seu projeto.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        {treeData.map(node => renderNode(node))}
      </div>
    </div>
  );
}
