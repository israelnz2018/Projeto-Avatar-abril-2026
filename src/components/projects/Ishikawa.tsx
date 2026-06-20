import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Type, Sparkles, Loader2, BookOpen, X, Info } from 'lucide-react';
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

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Mesma estrutura real: brainstormingType, problem (cabeça do peixe) e causes por categoria (6M).
const ISHIKAWA_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    brainstormingType: 'Problema para investigar',
    problem: 'Notas fiscais emitidas com erro, gerando retrabalho e atraso no faturamento',
    causes: {
      'Método': ['Não há conferência dupla antes da emissão', 'Cadastro de cliente preenchido sem padrão'],
      'Máquina': ['Sistema de emissão trava em horário de pico', 'Integração ERP × portal da prefeitura falha'],
      'Medida': ['Não se mede a taxa de erro por emissor', 'Sem indicador de tempo de faturamento'],
      'Mão de obra': ['Equipe nova sem treinamento no sistema', 'Alta rotatividade no setor fiscal'],
      'Material': ['Tabela de impostos desatualizada', 'Dados do pedido vêm incompletos da venda'],
      'Meio ambiente': ['Pico de demanda no fim do mês', 'Interrupções constantes por telefone'],
    },
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    brainstormingType: 'Problema para investigar',
    problem: 'Alto índice de peças refugadas na linha de usinagem (acima de 4%)',
    causes: {
      'Método': ['Parâmetros de corte não padronizados', 'Setup feito sem checklist'],
      'Máquina': ['Desgaste da ferramenta sem troca programada', 'Folga no fuso do torno CNC'],
      'Medida': ['Paquímetro descalibrado', 'Inspeção por amostragem pequena demais'],
      'Mão de obra': ['Operador sem treino no novo programa', 'Turno da noite sem supervisão técnica'],
      'Material': ['Lote de matéria-prima fora de especificação', 'Variação na dureza do aço recebido'],
      'Meio ambiente': ['Temperatura do galpão eleva no verão', 'Vibração de máquina vizinha'],
    } as Record<string, string[]>,
  },
];

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

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

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
        <button
          onClick={() => setShowExemplo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
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

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Diagrama de Ishikawa (6M)</h3>
                  <p className="text-xs text-gray-500 m-0">{ISHIKAWA_EXEMPLOS[exemploIdx].problem}</p>
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
              {ISHIKAWA_EXEMPLOS.map((ex, i) => (
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

            <div className="p-6">
              {/* Cabeça do peixe — problema */}
              <div className="mb-4 p-4 rounded-xl border-2" style={{ background: '#FAECE7', borderColor: '#D85A30' }}>
                <p className="text-[10px] font-black uppercase tracking-widest m-0 mb-1" style={{ color: '#993C1D' }}>
                  {ISHIKAWA_EXEMPLOS[exemploIdx].brainstormingType}
                </p>
                <p className="text-sm font-bold m-0" style={{ color: '#4A1B0C' }}>
                  {ISHIKAWA_EXEMPLOS[exemploIdx].problem}
                </p>
              </div>

              {/* 6 categorias em grid, cada uma com suas causas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {['Método', 'Máquina', 'Medida', 'Mão de obra', 'Material', 'Meio ambiente'].map((cat, idx) => {
                  const c = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  const list = ISHIKAWA_EXEMPLOS[exemploIdx].causes[cat] || [];
                  return (
                    <div key={cat} style={{ background: c.bg, borderRadius: 8, padding: 12 }}>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontSize: 11, color: c.label, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {cat}
                        </span>
                        <span style={{ fontSize: 11, color: c.label, fontWeight: 700 }}>{list.length}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {list.map((cause, ci) => (
                          <div
                            key={ci}
                            style={{ background: '#fff', border: `0.5px solid ${c.border}`, borderRadius: 6, padding: '6px 9px', fontSize: 12, color: c.text, lineHeight: 1.4 }}
                          >
                            {cause}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
 

