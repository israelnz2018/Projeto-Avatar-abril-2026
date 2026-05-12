import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Type } from 'lucide-react';
import { cn } from '@/src/lib/utils';
 
interface IshikawaProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
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
 
export default function Ishikawa({ onSave, initialData }: IshikawaProps) {
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
 

