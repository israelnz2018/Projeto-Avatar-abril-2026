import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Edit2, X, Check, Loader2, Plus, Trash2, ChevronRight, ChevronDown, Video, FileText, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { isIntroCourse, KNOWLEDGE_COLLECTION } from '@/src/services/knowledgeService';

export interface CustomField { id: string; label: string; content: string; }
export interface LinkedVideo {
  id: string;
  title: string;
  sourceUrl: string;
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
}
export type LeafAction = 'home' | 'projects' | 'data' | 'none';

export interface TreeNode {
  id: string;
  title: string;
  fields: CustomField[];
  videos: LinkedVideo[];
  children: TreeNode[];
  actionType?: LeafAction;
}

export interface NavCategory {
  id: string;
  title: string;
  subtitle: string;
  colorIndex?: number;
  items: TreeNode[];
}

export interface AIConfig { mentorRules: string; categories: NavCategory[]; }

export const AI_CONFIG_DOC = { collection: 'ai_assistant_config', id: 'main' };

const sanitize = (obj: any): any => JSON.parse(JSON.stringify(obj));

export const COLOR_PALETTE = [
  { bg: '#EEEDFE', border: '#AFA9EC', iconBg: '#534AB7', title: '#26215C', subtitle: '#534AB7' },
  { bg: '#E6F1FB', border: '#85B7EB', iconBg: '#185FA5', title: '#042C53', subtitle: '#185FA5' },
  { bg: '#FAECE7', border: '#F0997B', iconBg: '#993C1D', title: '#4A1B0C', subtitle: '#993C1D' },
  { bg: '#E1F5EE', border: '#5DCAA5', iconBg: '#0F6E56', title: '#04342C', subtitle: '#0F6E56' },
  { bg: '#FBEAF0', border: '#ED93B1', iconBg: '#993556', title: '#4B1528', subtitle: '#993556' },
  { bg: '#FFF4D9', border: '#F2C94C', iconBg: '#A07800', title: '#3D2C00', subtitle: '#A07800' },
];

export const getCategoryColor = (idx: number) => COLOR_PALETTE[idx % COLOR_PALETTE.length];

export const DEFAULT_CONFIG: AIConfig = {
  mentorRules: `# Mentor LBW - Regras de Comportamento

## Quem voce e
Voce e o Mentor LBW, consultor senior em Lean Six Sigma e Melhoria Continua.
Fale sempre em portugues do Brasil, direto e tecnico.

## Tom e estilo
- Direto e tecnico, sem enrolacao
- Nao elogie com frases vazias
- Maximo 150 palavras por resposta`,
  categories: [
    {
      id: 'projects', title: 'Projetos de Melhoria', colorIndex: 0,
      subtitle: 'Investigar problemas e implementar melhorias.',
      items: [
        {
          id: 'no-project', title: 'Ainda nao tenho projeto de melhoria definido',
          fields: [], videos: [],
          children: [
            { id: 'benchmarking', title: 'Benchmarking', fields: [], videos: [], children: [] },
            { id: 'replicacao', title: 'Replicacao de projetos', fields: [], videos: [], children: [] },
            { id: 'reclamacoes', title: 'Reclamacoes de clientes', fields: [], videos: [], children: [] },
            { id: 'indicadores', title: 'Indicadores de desempenho', fields: [], videos: [], children: [] },
            { id: 'brainstorming', title: 'Brainstorming', fields: [], videos: [], children: [] },
          ],
        },
        { id: 'has-project', title: 'Ja tenho projeto de melhoria definido', fields: [], videos: [], children: [] },
      ],
    },
    { id: 'data', title: 'Analise de Dados de Negocios', colorIndex: 1,
      subtitle: 'Analisar dados para gerar insights e recomendacoes.', items: [] },
    { id: 'stats', title: 'Analises Estatisticas Pontuais', colorIndex: 2,
      subtitle: 'Testes de hipoteses, regressao, capabilidade.', items: [] },
  ],
};

const genId = () => Math.random().toString(36).slice(2, 9);

function normalizeNode(n: any): TreeNode {
  return {
    id: n?.id || genId(),
    title: n?.title || '',
    fields: Array.isArray(n?.fields) ? n.fields : [],
    videos: Array.isArray(n?.videos) ? n.videos : [],
    children: Array.isArray(n?.children) ? n.children.map(normalizeNode) : [],
    actionType: n?.actionType,
  };
}

function migrateConfig(data: any): AIConfig {
  return {
    mentorRules: data?.mentorRules || DEFAULT_CONFIG.mentorRules,
    categories: (Array.isArray(data?.categories) ? data.categories : DEFAULT_CONFIG.categories).map((c: any) => ({
      id: c?.id || genId(),
      title: c?.title || '',
      subtitle: c?.subtitle || '',
      colorIndex: c?.colorIndex,
      items: (() => {
        if (Array.isArray(c?.items)) return c.items.map(normalizeNode);
        if (Array.isArray(c?.subcategories)) {
          return c.subcategories.map((sub: any) => ({
            id: sub?.id || genId(),
            title: sub?.title || '',
            fields: Array.isArray(sub?.fields) ? sub.fields : [],
            videos: Array.isArray(sub?.videos) ? sub.videos : [],
            children: Array.isArray(sub?.children) ? sub.children.map(normalizeNode) : [],
            actionType: sub?.actionType,
          }));
        }
        return [];
      })(),
    })),
  };
}

type Path = string[];

function updateNode(items: TreeNode[], path: Path, updater: (n: TreeNode) => TreeNode): TreeNode[] {
  if (path.length === 0) return items;
  const [head, ...rest] = path;
  return items.map(n => {
    if (n.id !== head) return n;
    if (rest.length === 0) return updater(n);
    return { ...n, children: updateNode(n.children || [], rest, updater) };
  });
}

function removeNode(items: TreeNode[], path: Path): TreeNode[] {
  if (path.length === 0) return items;
  const [head, ...rest] = path;
  if (rest.length === 0) return items.filter(n => n.id !== head);
  return items.map(n => n.id !== head ? n : { ...n, children: removeNode(n.children || [], rest) });
}

function addChildToNode(items: TreeNode[], path: Path, newChild: TreeNode): TreeNode[] {
  if (path.length === 0) return [...items, newChild];
  const [head, ...rest] = path;
  return items.map(n => {
    if (n.id !== head) return n;
    if (rest.length === 0) return { ...n, children: [...(n.children || []), newChild] };
    return { ...n, children: addChildToNode(n.children || [], rest, newChild) };
  });
}

function moveNode(items: TreeNode[], path: Path, direction: -1 | 1): TreeNode[] {
  if (path.length === 0) return items;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    const idx = items.findIndex(n => n.id === head);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= items.length) return items;
    const arr = [...items];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    return arr;
  }
  return items.map(n => n.id !== head ? n : { ...n, children: moveNode(n.children || [], rest, direction) });
}

interface KnowledgeEntry {
  id: string;
  title: string;
  sourceUrl: string;
  course: string;
  playlist: string;
  playlistOrder?: number;
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
}

function InlineVideoList({ selected, onToggle }: {
  selected: LinkedVideo[];
  onToggle: (v: LinkedVideo) => void;
}) {
  const [videos, setVideos] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCourse, setActiveCourse] = useState<string>('Todos');
  const [activePlaylist, setActivePlaylist] = useState<string>('Todas');

  useEffect(() => {
    getDocs(collection(db, KNOWLEDGE_COLLECTION))
      .then(snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeEntry))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const courses = ['Todos', ...Array.from(new Set(videos.map(v => v.course).filter((course): course is string => Boolean(course && !isIntroCourse(course)))))];
  const playlists = activeCourse === 'Todos' ? ['Todas']
    : ['Todas', ...Array.from(new Set(
        videos.filter(v => v.course === activeCourse).map(v => v.playlist).filter(Boolean)
      )).sort((a, b) => {
        const orderA = videos.find(i => i.course === activeCourse && i.playlist === a)?.playlistOrder ?? 999;
        const orderB = videos.find(i => i.course === activeCourse && i.playlist === b)?.playlistOrder ?? 999;
        return orderA - orderB;
      })];

  const filtered = videos.filter(v => {
    const cMatch = activeCourse === 'Todos' || v.course === activeCourse;
    const pMatch = activePlaylist === 'Todas' || v.playlist === activePlaylist;
    const sMatch = !search || v.title?.toLowerCase().includes(search.toLowerCase());
    return cMatch && pMatch && sMatch;
  });

  const isSelected = (id: string) => selected.some(s => s.id === id);

  return (
    <div className="border border-[#e2e8f0] rounded-[4px] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border-b border-[#e2e8f0]">
        <Search size={12} className="text-[#94a3b8]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar video..."
          className="flex-1 bg-transparent border-none outline-none text-[12px] text-[#334155]" />
      </div>
      <div className="flex gap-1 px-2 py-1.5 border-b border-[#e2e8f0] overflow-x-auto">
        {courses.map(c => (
          <button key={c} onClick={() => { setActiveCourse(c); setActivePlaylist('Todas'); }}
            className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[3px] border whitespace-nowrap cursor-pointer flex-shrink-0',
              activeCourse === c ? 'bg-[#1f2937] text-white border-[#1f2937]' : 'bg-white text-[#666] border-[#e2e8f0]')}>
            {c}
          </button>
        ))}
      </div>
      {activeCourse !== 'Todos' && playlists.length > 1 && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-[#e2e8f0] overflow-x-auto bg-[#fafbfc]">
          {playlists.map(p => (
            <button key={p} onClick={() => setActivePlaylist(p)}
              className={cn('text-[10px] font-medium px-2 py-1 rounded-[3px] border whitespace-nowrap cursor-pointer flex-shrink-0',
                activePlaylist === p ? 'bg-[#3b82f6] text-white border-[#3b82f6]' : 'bg-white text-[#666] border-[#e2e8f0]')}>
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-[280px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-[#3b82f6]" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-[12px] text-[#aaa] text-center p-4">Nenhum video encontrado.</p>
        ) : (
          filtered.map(v => {
            const sel = isSelected(v.id);
            return (
              <button key={v.id} onClick={() => onToggle({
                id: v.id,
                title: v.title,
                sourceUrl: v.sourceUrl,
                bunnyVideoId: v.bunnyVideoId,
                bunnyLibraryId: v.bunnyLibraryId,
              })}
                className={cn('flex items-center gap-2 px-3 py-2 border-b border-[#f1f5f9] last:border-b-0 text-left cursor-pointer w-full',
                  sel ? 'bg-blue-50' : 'bg-white hover:bg-[#f8fafc]')}>
                <div className={cn('w-4 h-4 rounded-[3px] border flex items-center justify-center flex-shrink-0',
                  sel ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-[#ccc]')}>
                  {sel && <Check size={10} className="text-white" />}
                </div>
                <div className="w-[40px] h-[24px] bg-[#e2e8f0] rounded-[2px] flex-shrink-0 flex items-center justify-center">
                  <Video size={12} className="text-[#94a3b8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#334155] truncate leading-tight">{v.title}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">{v.playlist}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="px-3 py-1.5 bg-[#f8fafc] border-t border-[#e2e8f0]">
        <p className="text-[11px] text-[#666]">{selected.length} selecionado(s) · {filtered.length} videos</p>
      </div>
    </div>
  );
}

function NodeEditor({ node, onSave, onCancel }: {
  node: TreeNode;
  onSave: (fields: CustomField[], videos: LinkedVideo[], actionType: LeafAction) => void;
  onCancel: () => void;
}) {
  const [localFields, setLocalFields] = useState<CustomField[]>(() => node.fields.map(f => ({ ...f })));
  const [localVideos, setLocalVideos] = useState<LinkedVideo[]>(() => node.videos.map(v => ({ ...v })));
  const [localAction, setLocalAction] = useState<LeafAction>(node.actionType || 'home');
  const [showVideos, setShowVideos] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const addField = () => {
    if (!newFieldLabel.trim()) return;
    setLocalFields(prev => [...prev, { id: genId(), label: newFieldLabel.trim(), content: '' }]);
    setNewFieldLabel('');
    setShowAddField(false);
  };

  const toggleVideo = (v: LinkedVideo) =>
    setLocalVideos(prev => prev.find(x => x.id === v.id) ? prev.filter(x => x.id !== v.id) : [...prev, v]);

  return (
    <div className="bg-[#f0f2f5] border-t border-[#e2e8f0]">
      <div className="p-4 flex flex-col gap-4">

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#534AB7]">Campos de informacao</p>
            <button onClick={() => setShowAddField(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-[#3b82f6] border border-[#3b82f6] rounded-[3px] py-1 px-2 bg-white cursor-pointer hover:bg-blue-50">
              <Plus size={10} /> Campo
            </button>
          </div>

          {showAddField && (
            <div className="bg-white border border-[#3b82f6] rounded-[3px] p-2 mb-2 flex gap-2 items-center">
              <input autoFocus value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addField(); if (e.key === 'Escape') { setShowAddField(false); setNewFieldLabel(''); } }}
                placeholder="Nome do campo..."
                className="flex-1 border-none outline-none text-[12px] bg-transparent" />
              <button onClick={addField} className="bg-[#3b82f6] text-white border-none rounded-[3px] px-2 py-1 text-[10px] font-bold cursor-pointer">OK</button>
              <button onClick={() => { setShowAddField(false); setNewFieldLabel(''); }}
                className="border-none bg-transparent cursor-pointer text-[#999]"><X size={12} /></button>
            </div>
          )}

          {localFields.length === 0 && !showAddField ? (
            <p className="text-[11px] text-[#aaa] italic">Sem campos. Adicione conteudo se este item for um destino final.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {localFields.map(f => (
                <div key={f.id} className="bg-white p-3 rounded border-2 border-gray-300">
                  <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Nome do campo (curto)</label>
                  <input value={f.label}
                    onChange={e => setLocalFields(prev => prev.map(x => x.id === f.id ? { ...x, label: e.target.value } : x))}
                    placeholder="Ex: Definicao, Quando usar..."
                    className="w-full px-2 py-1.5 mb-2 text-[13px] border-2 border-red-300 bg-red-50 rounded outline-none" />
                  <label className="block text-[10px] font-bold text-green-700 uppercase mb-1">Conteudo</label>
                  <textarea value={f.content}
                    onChange={e => setLocalFields(prev => prev.map(x => x.id === f.id ? { ...x, content: e.target.value } : x))}
                    rows={8} placeholder="Cole aqui o texto explicativo..."
                    className="w-full px-2 py-2 text-[13px] border-2 border-green-300 bg-green-50 rounded outline-none resize-y leading-relaxed"
                    style={{ minHeight: 160 }} />
                  <button onClick={() => setLocalFields(prev => prev.filter(x => x.id !== f.id))}
                    className="mt-2 px-2 py-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-300 rounded cursor-pointer">
                    Remover este campo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#185FA5]">Videos vinculados ({localVideos.length})</p>
            <button onClick={() => setShowVideos(!showVideos)}
              className="flex items-center gap-1 text-[10px] font-bold text-[#3b82f6] border border-[#3b82f6] rounded-[3px] py-1 px-2 bg-white cursor-pointer hover:bg-blue-50">
              {showVideos ? <X size={10} /> : <Plus size={10} />} {showVideos ? 'Fechar' : 'Selecionar'}
            </button>
          </div>
          {localVideos.length > 0 && (
            <div className="flex flex-col gap-1 mb-2">
              {localVideos.map(v => {
                return (
                  <div key={v.id} className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-[3px] px-2 py-1">
                    <div className="w-[40px] h-[24px] bg-[#e2e8f0] rounded-[2px] flex-shrink-0 flex items-center justify-center">
                      <Video size={12} className="text-[#94a3b8]" />
                    </div>
                    <p className="flex-1 text-[12px] text-[#334155] truncate">{v.title}</p>
                    <button onClick={() => setLocalVideos(prev => prev.filter(x => x.id !== v.id))}
                      className="border-none bg-transparent cursor-pointer text-[#ccc] hover:text-red-500 p-1">
                      <Trash2 size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {showVideos && <InlineVideoList selected={localVideos} onToggle={toggleVideo} />}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#16a34a] mb-2">Acao do botao final (so se este item for destino)</p>
          <select value={localAction} onChange={e => setLocalAction(e.target.value as LeafAction)}
            className="w-full px-3 py-2 text-[13px] border-2 border-gray-300 rounded outline-none bg-white">
            <option value="home">Voltar para a pagina principal (AI Assistente)</option>
            <option value="projects">Ir para os Projetos</option>
            <option value="data">Ir para Analise de Dados</option>
            <option value="none">Nao mostrar botao</option>
          </select>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-[#e2e8f0]">
          <button onClick={() => onSave(localFields, localVideos, localAction)}
            className="px-3 py-1.5 text-[11px] font-bold text-[#666] border border-[#ccc] rounded-[3px] bg-white cursor-pointer hover:bg-[#f8fafc] flex items-center gap-1">
            <X size={11} /> Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function InlineNewItem({ placeholder, onCreate, onCancel }: {
  placeholder: string; onCreate: (title: string) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  return (
    <div className="bg-white border border-[#3b82f6] rounded-[3px] p-2 flex gap-2 items-center">
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onCreate(title.trim()); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        className="flex-1 border-none outline-none text-[12px] bg-transparent" />
      <button onClick={() => title.trim() && onCreate(title.trim())}
        className="bg-[#3b82f6] text-white border-none rounded-[3px] px-2 py-1 text-[10px] font-bold cursor-pointer">OK</button>
      <button onClick={onCancel} className="border-none bg-transparent cursor-pointer text-[#999]"><X size={12} /></button>
    </div>
  );
}

interface TreeProps {
  node: TreeNode; path: Path; depth: number; isFirst: boolean; isLast: boolean;
  editingId: string | null; setEditingId: (id: string | null) => void;
  renamingId: string | null; setRenamingId: (id: string | null) => void;
  expandedIds: Record<string, boolean>; toggleExpand: (id: string) => void;
  newChildForId: string | null; setNewChildForId: (id: string | null) => void;
  onUpdate: (path: Path, patch: Partial<TreeNode>) => void;
  onRemove: (path: Path) => void;
  onAddChild: (path: Path, title: string) => void;
  onMove: (path: Path, direction: -1 | 1) => void;
}

function TreeNodeRow(props: TreeProps) {
  const { node, path, depth, isFirst, isLast,
    editingId, setEditingId, renamingId, setRenamingId,
    expandedIds, toggleExpand, newChildForId, setNewChildForId,
    onUpdate, onRemove, onAddChild, onMove } = props;

  const isEditing = editingId === node.id;
  const isRenaming = renamingId === node.id;
  const isExpanded = expandedIds[node.id] ?? false;
  const hasChildren = (node.children || []).length > 0;

  return (
    <div className="border border-[#e2e8f0] rounded-[4px] overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-[#f8fafc]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => toggleExpand(node.id)} className="border-none bg-transparent cursor-pointer text-[#666] p-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {isRenaming ? (
            <input autoFocus value={node.title}
              onChange={e => onUpdate(path, { title: e.target.value })}
              onBlur={() => setRenamingId(null)}
              onKeyDown={e => { if (e.key === 'Enter') setRenamingId(null); }}
              className="flex-1 border border-[#3b82f6] rounded-[3px] px-2 py-0.5 text-[13px] font-bold text-[#1f2937] outline-none bg-white" />
          ) : (
            <span onClick={() => setRenamingId(node.id)} className="text-[13px] font-bold text-[#1f2937] cursor-text truncate">
              {node.title}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-[#aaa] bg-[#e2e8f0] px-2 py-0.5 rounded-full flex-shrink-0">
            {hasChildren ? `${node.children.length} subitens` : 'conteudo'}
          </span>
          {(node.fields?.length || 0) > 0 && <FileText size={11} className="text-[#534AB7] flex-shrink-0" />}
          {(node.videos?.length || 0) > 0 && <Video size={11} className="text-[#22c55e] flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onMove(path, -1)} disabled={isFirst}
            className="border-none bg-transparent cursor-pointer text-[#666] hover:text-[#1f2937] p-1 disabled:opacity-20 disabled:cursor-not-allowed">
            <ArrowUp size={11} />
          </button>
          <button onClick={() => onMove(path, 1)} disabled={isLast}
            className="border-none bg-transparent cursor-pointer text-[#666] hover:text-[#1f2937] p-1 disabled:opacity-20 disabled:cursor-not-allowed">
            <ArrowDown size={11} />
          </button>
          <button onClick={() => setEditingId(isEditing ? null : node.id)}
            className={cn('border-none rounded-[3px] p-1 cursor-pointer',
              isEditing ? 'bg-[#3b82f6] text-white' : 'bg-transparent text-[#3b82f6] hover:bg-blue-50')}>
            <Edit2 size={11} />
          </button>
          <button onClick={() => onRemove(path)}
            className="border-none bg-transparent cursor-pointer text-[#ccc] hover:text-red-500 p-1">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <NodeEditor key={node.id} node={node}
              onSave={(fields, videos, actionType) => {
                onUpdate(path, { fields, videos, actionType });
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3 pt-2 border-t border-[#e2e8f0] bg-white">
            <div className="flex flex-col gap-2 ml-3 border-l-2 border-[#f1f5f9] pl-3">
              {(node.children || []).map((c, i) => (
                <TreeNodeRow {...props} key={c.id} node={c} path={[...path, c.id]}
                  depth={depth + 1} isFirst={i === 0} isLast={i === node.children.length - 1} />
              ))}
              {newChildForId === node.id ? (
                <InlineNewItem placeholder="Titulo do novo subitem..."
                  onCreate={t => onAddChild(path, t)}
                  onCancel={() => setNewChildForId(null)} />
              ) : (
                <button onClick={() => setNewChildForId(node.id)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#3b82f6] border border-dashed border-[#3b82f6] rounded-[3px] py-1.5 px-3 bg-transparent cursor-pointer hover:bg-blue-50 w-full justify-center">
                  <Plus size={10} /> Adicionar subitem
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AIAssistantConfig() {
  const [tab, setTab] = useState<'navigation' | 'mentor'>('navigation');
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [newChildForId, setNewChildForId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [showNewTopLevelFor, setShowNewTopLevelFor] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, AI_CONFIG_DOC.collection, AI_CONFIG_DOC.id);
        const snap = await getDoc(ref);
        if (snap.exists()) setConfig(migrateConfig(snap.data()));
        else await setDoc(ref, DEFAULT_CONFIG);
      } catch (e) { console.error('[AIConfig]', e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, AI_CONFIG_DOC.collection, AI_CONFIG_DOC.id), sanitize(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const setCategoryItems = (catId: string, fn: (items: TreeNode[]) => TreeNode[]) =>
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === catId ? { ...c, items: fn(c.items || []) } : c)
    }));

  const handleUpdate = (catId: string) => (path: Path, patch: Partial<TreeNode>) =>
    setCategoryItems(catId, items => updateNode(items, path, n => ({ ...n, ...patch })));

  const handleRemove = (catId: string) => (path: Path) =>
    setCategoryItems(catId, items => removeNode(items, path));

  const handleAddChild = (catId: string) => (path: Path, title: string) => {
    const newNode: TreeNode = { id: genId(), title, fields: [], videos: [], children: [] };
    setCategoryItems(catId, items => addChildToNode(items, path, newNode));
    if (path.length > 0) setExpandedIds(prev => ({ ...prev, [path[path.length - 1]]: true }));
    setNewChildForId(null);
  };

  const handleMove = (catId: string) => (path: Path, direction: -1 | 1) =>
    setCategoryItems(catId, items => moveNode(items, path, direction));

  const addTopLevel = (catId: string, title: string) => {
    const newNode: TreeNode = { id: genId(), title, fields: [], videos: [], children: [] };
    setCategoryItems(catId, items => [...items, newNode]);
    setShowNewTopLevelFor(null);
  };

  const updateCategory = (catId: string, patch: Partial<NavCategory>) =>
    setConfig(prev => ({ ...prev, categories: prev.categories.map(c => c.id === catId ? { ...c, ...patch } : c) }));

  const addCategory = (title: string) => {
    const newCat: NavCategory = {
      id: genId(), title, subtitle: 'Descreva esta area aqui.',
      colorIndex: config.categories.length, items: [],
    };
    setConfig(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
    setShowNewCategory(false);
  };

  const removeCategory = (catId: string) => {
    setConfig(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== catId) }));
  };

  const moveCategory = (catId: string, direction: -1 | 1) =>
    setConfig(prev => {
      const idx = prev.categories.findIndex(c => c.id === catId);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.categories.length) return prev;
      const arr = [...prev.categories];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...prev, categories: arr };
    });

  const toggleExpand = (id: string) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#3b82f6]" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#1f2937] m-0">AI Assistant — Admin</h1>
          <p className="text-[13px] text-[#666] mt-1 m-0">Lembre de clicar em "Salvar agora" depois de fazer mudancas.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="bg-[#1f2937] text-white border-none rounded-[4px] py-2 px-5 text-[12px] font-bold uppercase tracking-wider cursor-pointer hover:bg-[#374151] flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar agora'}
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#e2e8f0]">
        {[{ id: 'navigation', label: 'Navegacao e Conteudo', icon: FileText }, { id: 'mentor', label: 'Regras do Mentor', icon: Edit2 }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={cn('flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-wider border-none cursor-pointer border-b-2 -mb-px',
              tab === t.id ? 'text-[#3b82f6] border-[#3b82f6] bg-transparent' : 'text-[#999] border-transparent bg-transparent hover:text-[#666]')}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'mentor' && (
        <div className="bg-white border border-[#ccc] rounded-[4px] p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#999] mb-3">Regras em linguagem natural</p>
          <textarea value={config.mentorRules} onChange={e => setConfig(prev => ({ ...prev, mentorRules: e.target.value }))}
            rows={20} className="w-full border border-[#ccc] rounded-[4px] p-4 text-[13px] text-[#333] font-mono focus:outline-none focus:border-[#3b82f6] resize-none leading-relaxed" />
        </div>
      )}

      {tab === 'navigation' && (
        <div className="flex flex-col gap-4">
          {config.categories.map((cat, catIdx) => {
            const colors = getCategoryColor(cat.colorIndex ?? catIdx);
            const isEditingCat = editingCategoryId === cat.id;
            return (
              <div key={cat.id} className="bg-white border border-[#ccc] rounded-[4px] overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: colors.iconBg, color: 'white' }}>
                  <div className="flex-1 min-w-0">
                    {isEditingCat ? (
                      <div className="flex flex-col gap-2">
                        <input value={cat.title} onChange={e => updateCategory(cat.id, { title: e.target.value })}
                          className="bg-white/10 border border-white/20 rounded-[3px] px-2 py-1 text-[14px] font-bold text-white outline-none" />
                        <input value={cat.subtitle} onChange={e => updateCategory(cat.id, { subtitle: e.target.value })}
                          className="bg-white/10 border border-white/20 rounded-[3px] px-2 py-1 text-[11px] text-white outline-none" />
                      </div>
                    ) : (
                      <>
                        <p className="text-[14px] font-bold m-0">{cat.title}</p>
                        <p className="text-[11px] text-white/70 m-0 mt-1">{cat.subtitle}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <button onClick={() => moveCategory(cat.id, -1)} disabled={catIdx === 0}
                      className="border-none bg-white/10 text-white rounded-[3px] p-1 cursor-pointer hover:bg-white/20 disabled:opacity-30">
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => moveCategory(cat.id, 1)} disabled={catIdx === config.categories.length - 1}
                      className="border-none bg-white/10 text-white rounded-[3px] p-1 cursor-pointer hover:bg-white/20 disabled:opacity-30">
                      <ArrowDown size={12} />
                    </button>
                    <button onClick={() => setEditingCategoryId(isEditingCat ? null : cat.id)}
                      className="border-none bg-white/10 text-white rounded-[3px] p-1 cursor-pointer hover:bg-white/20">
                      {isEditingCat ? <Check size={12} /> : <Edit2 size={12} />}
                    </button>
                    <button onClick={() => removeCategory(cat.id)}
                      className="border-none bg-white/10 text-white rounded-[3px] p-1 cursor-pointer hover:bg-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  {(cat.items || []).map((node, i) => (
                    <TreeNodeRow key={node.id} node={node} path={[node.id]} depth={0}
                      isFirst={i === 0} isLast={i === cat.items.length - 1}
                      editingId={editingId} setEditingId={setEditingId}
                      renamingId={renamingId} setRenamingId={setRenamingId}
                      expandedIds={expandedIds} toggleExpand={toggleExpand}
                      newChildForId={newChildForId} setNewChildForId={setNewChildForId}
                      onUpdate={handleUpdate(cat.id)} onRemove={handleRemove(cat.id)}
                      onAddChild={handleAddChild(cat.id)} onMove={handleMove(cat.id)} />
                  ))}

                  {showNewTopLevelFor === cat.id ? (
                    <InlineNewItem placeholder="Titulo do novo item..."
                      onCreate={t => addTopLevel(cat.id, t)}
                      onCancel={() => setShowNewTopLevelFor(null)} />
                  ) : (
                    <button onClick={() => setShowNewTopLevelFor(cat.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#666] border border-dashed border-[#ccc] rounded-[3px] py-2 px-3 bg-transparent cursor-pointer hover:bg-[#f8fafc] w-full justify-center">
                      <Plus size={11} /> Adicionar item
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {showNewCategory ? (
            <InlineNewItem placeholder="Titulo da nova categoria principal..."
              onCreate={t => addCategory(t)}
              onCancel={() => setShowNewCategory(false)} />
          ) : (
            <button onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#3b82f6] border-2 border-dashed border-[#3b82f6] rounded-[4px] py-3 px-3 bg-transparent cursor-pointer hover:bg-blue-50 w-full justify-center">
              <Plus size={14} /> Adicionar nova categoria principal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
