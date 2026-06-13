import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Type, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { distribuirCausasNos6M } from '@/src/services/claudeAiService';

interface IshikawaProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
  allProjectData?: any;
}

// Acha os dados de uma ferramenta no allProjectData, ignorando o prefixo de fase.
function findToolData(allData: any, toolKey: string) {
  if (!allData) return null;
  const keys = Object.keys(allData).filter(k => k === toolKey || k.endsWith(`_${toolKey}`));
  if (keys.length === 0) return null;
  const meta = allData.__metadata;
  let chosen = keys[0];
  if (meta) {
    let max = meta[chosen] || 0;
    for (const k of keys) { if ((meta[k] || 0) > max) { max = meta[k]; chosen = k; } }
  }
  const d = allData[chosen];
  return d?.toolData || d;
}
 
const BRAINSTORMING_TYPES = [
  'Problema para investigar',
  'Ideias de projetos de melhoria',
  'Definir melhor solução',
  'Identificação de riscos',
];
 
const CATEGORY_COLORS = [
  { bg: '#EEEDFE', border: '#CECBF6', label: '#3C3489', text: '#26215C' },
  { bg: '#E1F5EE', border: '#9FE1CB', label: '#085041', text: '#04342C' },
  { bg: '#E6F1FB', border: '#B5D4F4', label: '#0C447C', text: '#042C53' },
  { bg: '#FAECE7', border: '#F5C4B3', label: '#712B13', text: '#4A1B0C' },
  { bg: '#EAF3DE', border: '#C0DD97', label: '#27500A', text: '#173404' },
  { bg: '#FAEEDA', border: '#FAC775', label: '#633806', text: '#412402' },
];
 
const FONT_SIZES = [12, 13, 14, 15, 16, 18];
 
export default function Ishikawa({ onSave, initialData, allProjectData }: IshikawaProps) {
  const d = initialData?.toolData || initialData;
 
  const [brainstormingType, setBrainstormingType] = useState<string>(
    d?.brainstormingType || BRAINSTORMING_TYPES[0]
  );
  const [categories, setCategories] = useState<string[]>(
    d?.categories || ['Método', 'Máquina', 'Medida', 'Mão de obra', 'Material', 'Meio ambiente']
  );
  const [causes, setCauses] = useState<Record<string, string[]>>(
    d?.causes || {
      'Método': [],
      'Máquina': [],
      'Medida': [],
      'Mão de obra': [],
      'Material': [],
      'Meio ambiente': [],
    }
  );
  const [problem, setProblem] = useState<string>(d?.problem || '');
  const [fontSize, setFontSize] = useState<number>(d?.fontSize || 13);
  const [columnHeight, setColumnHeight] = useState<number>(d?.columnHeight || 0);
 
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
 
  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.brainstormingType) setBrainstormingType(data.brainstormingType);
      if (data.categories) setCategories(data.categories);
      if (data.causes) setCauses(data.causes);
      if (data.problem !== undefined) setProblem(data.problem);
      if (data.fontSize) setFontSize(data.fontSize);
      if (data.columnHeight) setColumnHeight(data.columnHeight);
    }
  }, [initialData]);

  // Ajusta automaticamente a altura de todos os textareas para mostrar o texto completo
  useEffect(() => {
    const adjustAll = () => {
      document.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(t => {
        t.style.height = 'auto';
        t.style.height = t.scrollHeight + 'px';
      });
    };
    // Pequeno delay para garantir que o DOM ja renderizou
    const timer = setTimeout(adjustAll, 0);
    return () => clearTimeout(timer);
  }, [causes, problem, fontSize]);
 
  // Tamanhos derivados do fontSize
  const fsCard = fontSize;
  const fsTitle = Math.max(10, fontSize - 3);
  const fsProblem = fontSize + 1;
  const fsLabel = Math.max(9, fontSize - 4);
 
  const handleAddCause = (cat: string) => {
    setCauses(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ''] }));
  };
 
  const handleRemoveCause = (cat: string, idx: number) => {
    setCauses(prev => ({ ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }));
  };
 
  const handleUpdateCause = (cat: string, idx: number, value: string) => {
    setCauses(prev => ({
      ...prev,
      [cat]: prev[cat].map((c, i) => (i === idx ? value : c)),
    }));
  };
 
  const handleUpdateCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    const newCategories = categories.map(c => (c === oldName ? newName : c));
    const newCauses: Record<string, string[]> = {};
    Object.keys(causes).forEach(k => {
      newCauses[k === oldName ? newName : k] = causes[k];
    });
    setCategories(newCategories);
    setCauses(newCauses);
  };
 
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = columnHeight || 220;
 
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientY - startY.current;
      const next = Math.max(150, startHeight.current + delta);
      setColumnHeight(next);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
 
  const handleSave = () => {
    onSave({ brainstormingType, categories, causes, problem, fontSize, columnHeight });
  };

  // ===== IA: distribui as ideias do Brainstorming nos 6M =====
  const [isGenerating, setIsGenerating] = useState(false);
  const brainstorming = findToolData(allProjectData, 'brainstorming');
  const causasDoBrainstorming: string[] = (brainstorming?.ideas || [])
    .map((i: any) => (i?.text || '').trim())
    .filter(Boolean);
  const temBrainstorming = causasDoBrainstorming.length > 0;

  const handleDistribuirIA = async () => {
    if (!temBrainstorming) {
      toast.error('Nenhuma ideia encontrada no Brainstorming. Preencha aquela ferramenta primeiro.');
      return;
    }
    setIsGenerating(true);
    try {
      const { causes: distribuidas } = await distribuirCausasNos6M(causasDoBrainstorming, categories);
      // Mescla: acrescenta às causas que já existem (sem duplicar texto idêntico na mesma coluna).
      setCauses(prev => {
        const merged: Record<string, string[]> = { ...prev };
        categories.forEach(cat => {
          const atuais = merged[cat] || [];
          const novas = (distribuidas[cat] || []).filter(
            nova => !atuais.some(a => a.trim().toLowerCase() === nova.trim().toLowerCase())
          );
          merged[cat] = [...atuais, ...novas];
        });
        return merged;
      });
      const total = Object.values(distribuidas).reduce((s, arr) => s + arr.length, 0);
      toast.success(`${total} causas distribuídas nos 6M a partir do Brainstorming.`);
    } catch (e: any) {
      console.error('Erro ao distribuir causas:', e);
      toast.error(e.message || 'Erro ao distribuir as causas com IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const colTop = categories.slice(0, 3);
  const colBottom = categories.slice(3, 6);
 
  const renderColumn = (cat: string, idx: number) => {
    const c = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    const list = causes[cat] || [];
    return (
      <div
        key={cat}
        style={{
          background: c.bg,
          borderRadius: 8,
          padding: 12,
          minHeight: columnHeight || 220,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <input
            type="text"
            value={cat}
            onChange={(e) => handleUpdateCategory(cat, e.target.value)}
            style={{
              fontSize: fsTitle,
              color: c.label,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              flex: 1,
              padding: 0,
              minWidth: 0,
            }}
          />
          <span style={{ fontSize: fsTitle, color: c.label, fontWeight: 500, flexShrink: 0 }}>
            {list.length}
          </span>
        </div>
 
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((cause, cIdx) => (
            <div
              key={cIdx}
              style={{
                background: '#fff',
                border: `0.5px solid ${c.border}`,
                borderRadius: 6,
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <textarea
                value={cause}
                onChange={(e) => handleUpdateCause(cat, cIdx, e.target.value)}
                placeholder="Digite a causa..."
                style={{
                  flex: 1,
                  fontSize: fsCard,
                  color: c.text,
                  lineHeight: 1.4,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  padding: 0,
                  minHeight: 18,
                  overflow: 'hidden',
                }}
                rows={1}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = t.scrollHeight + 'px';
                }}
              />
              <button
                onClick={() => handleRemoveCause(cat, cIdx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  padding: 0,
                  flexShrink: 0,
                }}
                title="Remover"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
 
        <button
          onClick={() => handleAddCause(cat)}
          style={{
            marginTop: 8,
            background: 'transparent',
            border: `1px dashed ${c.border}`,
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            color: c.label,
            fontSize: fsLabel,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <Plus size={12} /> Causa
        </button>
      </div>
    );
  };
 
  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12 w-full">
      {/* Box de IA — distribui as causas do Brainstorming nos 6M */}
      {temBrainstorming && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Distribuir causas com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA pega as <strong>{causasDoBrainstorming.length} causas</strong> do seu Brainstorming
                e coloca cada uma na categoria certa dos 6M (Método, Máquina, Medida, Mão de obra,
                Material, Meio ambiente).
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * As causas vão direto pras colunas. Você ajusta, move ou remove o que quiser.
              </p>
            </div>
            <button
              onClick={handleDistribuirIA}
              disabled={isGenerating}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none shrink-0",
                isGenerating
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-lg shadow-blue-100"
              )}
            >
              {isGenerating
                ? <><Loader2 size={16} className="animate-spin" /> Distribuindo...</>
                : <><Sparkles size={16} /> Distribuir com IA</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest whitespace-nowrap">
            Tipo de brainstorming
          </span>
          <select
            value={brainstormingType}
            onChange={(e) => setBrainstormingType(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer outline-none focus:border-blue-500 bg-white"
          >
            {BRAINSTORMING_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
 
        <div className="flex items-center gap-2">
          <Type size={14} className="text-gray-500" />
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
            Fonte
          </span>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer outline-none focus:border-blue-500 bg-white"
          >
            {FONT_SIZES.map(size => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>
        <button data-save-trigger onClick={handleSave} className="hidden" />
      </div>
 
      {/* Diagrama em formato kanban-espinha */}
      <div
        className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
        style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, alignItems: 'stretch' }}
      >
        {/* Lado esquerdo: 6 colunas em 2 linhas + espinha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Linha de cima */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {colTop.map((cat, idx) => renderColumn(cat, idx))}
          </div>
 
          {/* Espinha central */}
          <div style={{ height: 6, background: '#2C2C2A', borderRadius: 3 }}></div>
 
          {/* Linha de baixo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {colBottom.map((cat, idx) => renderColumn(cat, idx + 3))}
          </div>
 
          {/* Handle de redimensionamento de altura */}
          <div
            onMouseDown={startResize}
            style={{
              height: 8,
              cursor: 'ns-resize',
              background: '#f1f1f1',
              borderRadius: 4,
              marginTop: 4,
            }}
            title="Arraste para mudar a altura das colunas"
          />
        </div>
 
        {/* Lado direito: cabeça do peixe */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              background: '#FAECE7',
              border: '1.5px solid #D85A30',
              borderRadius: 12,
              padding: '16px 14px',
              width: '100%',
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: '#993C1D',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                margin: '0 0 8px 0',
                textAlign: 'center',
              }}
            >
              {brainstormingType}
            </p>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Descreva aqui..."
              style={{
                fontSize: fsProblem,
                color: '#4A1B0C',
                fontWeight: 500,
                margin: 0,
                textAlign: 'center',
                lineHeight: 1.4,
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                minHeight: 60,
                overflow: 'hidden',
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = t.scrollHeight + 'px';
              }}
            />
          </div>
        </div>
      </div>
 
      {/* Botão final salvar removido conforme solicitado */}
    </div>
  );
}
 

