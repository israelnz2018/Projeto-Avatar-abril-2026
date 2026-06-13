/**
 * Indicadores — Painel de KPIs por nível de gestão.
 *
 * 3 abas:
 *   1. Linha de Visão — árvore fixa de 3 camadas: Estratégico → Tático →
 *      Operacional. O aluno vê como o indicador da empresa "desce" até o que
 *      ele controla no dia a dia (a linha de visão entre trabalho e estratégia).
 *   2. Minha Área — o aluno cadastra os indicadores reais da área dele,
 *      marcando o nível de cada um.
 *   3. Biblioteca — referência LBW de KPIs típicos por área (read-only).
 *
 * SEM auto-save: reporta dirty via onDirtyChange; o pai (ProjectJourney) avisa
 * "sair sem salvar" se o usuário trocar de ferramenta.
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3, Plus, Trash2, Save, BookOpen, X, Info,
  Target, Layers, Settings2,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface IndicadoresProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  onDirtyChange?: (dirty: boolean) => void;
}

type Nivel = 'estrategico' | 'tatico' | 'operacional';

interface Indicador {
  id: string;
  nome: string;
  nivel: Nivel;
}

interface IndicadoresData {
  // Aba 1: indicadores da árvore por nível (a "linha de visão")
  linhaVisao: { estrategico: string; tatico: string; operacional: string };
  // Aba 2: inventário da área do aluno
  meusIndicadores: Indicador[];
}

const NIVEIS: { value: Nivel; label: string; desc: string; icon: any; cor: string; barra: string }[] = [
  { value: 'estrategico', label: 'Estratégico', desc: 'Diretoria · empresa toda · longo prazo', icon: Target,    cor: 'text-[#1E2D6E]', barra: 'bg-[#1E2D6E]' },
  { value: 'tatico',      label: 'Tático',      desc: 'Gerência · a sua área · médio prazo',  icon: Layers,    cor: 'text-[#0033CC]', barra: 'bg-[#0033CC]' },
  { value: 'operacional', label: 'Operacional', desc: 'Execução · o seu dia a dia · curto prazo', icon: Settings2, cor: 'text-sky-600',  barra: 'bg-sky-500' },
];

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ===== Exemplos da Linha de Visão (Aba 1) — read-only, escritório + manufatura.
const LINHA_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório (Logística)',
    estrategico: 'Margem operacional da empresa',
    tatico: 'Custo logístico total da área',
    operacional: 'Custo por entrega que EU controlo',
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura (Produção)',
    estrategico: 'EBITDA da planta',
    tatico: 'OEE da linha de produção',
    operacional: 'Refugo do meu turno',
  },
];

// ===== Biblioteca de referência (Aba 3) — KPIs típicos por área (read-only).
// Mantida enxuta (4 áreas, ~3 indicadores cada) pra não sobrecarregar o novato.
const BIBLIOTECA: { area: string; itens: { nome: string; nivel: Nivel }[] }[] = [
  { area: 'Logística', itens: [
    { nome: 'Entrega no prazo (OTIF)', nivel: 'tatico' },
    { nome: 'Custo por entrega', nivel: 'operacional' },
    { nome: '% de avaria no transporte', nivel: 'operacional' },
  ]},
  { area: 'Comercial / Vendas', itens: [
    { nome: 'Faturamento', nivel: 'estrategico' },
    { nome: 'Taxa de conversão', nivel: 'tatico' },
    { nome: 'Ticket médio', nivel: 'tatico' },
  ]},
  { area: 'Qualidade', itens: [
    { nome: '% de defeitos', nivel: 'operacional' },
    { nome: '% de retrabalho', nivel: 'operacional' },
    { nome: 'Custo da não-qualidade', nivel: 'estrategico' },
  ]},
  { area: 'Produção', itens: [
    { nome: 'Produtividade (peças/hora)', nivel: 'operacional' },
    { nome: '% de refugo', nivel: 'operacional' },
    { nome: 'Eficiência da linha (OEE)', nivel: 'tatico' },
  ]},
];

function nivelInfo(n: Nivel) {
  return NIVEIS.find(x => x.value === n)!;
}

export default function Indicadores({ onSave, initialData, onDirtyChange }: IndicadoresProps) {
  const [data, setData] = useState<IndicadoresData>(() => {
    const raw = initialData?.formData || initialData?.toolData || initialData;
    if (raw && (raw.linhaVisao || raw.meusIndicadores)) {
      return {
        linhaVisao: raw.linhaVisao || { estrategico: '', tatico: '', operacional: '' },
        meusIndicadores: Array.isArray(raw.meusIndicadores) ? raw.meusIndicadores : [],
      };
    }
    return { linhaVisao: { estrategico: '', tatico: '', operacional: '' }, meusIndicadores: [] };
  });

  const [aba, setAba] = useState<'linha' | 'area' | 'biblioteca'>('linha');
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0);

  const [dirty, setDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  const mutate = (updater: (prev: IndicadoresData) => IndicadoresData) => {
    setData(updater);
    setDirty(true);
  };

  // ===== Aba 1 — Linha de Visão =====
  const setLinha = (nivel: Nivel, valor: string) => {
    mutate(prev => ({ ...prev, linhaVisao: { ...prev.linhaVisao, [nivel]: valor } }));
  };

  // ===== Aba 2 — Meus Indicadores =====
  const addIndicador = () => {
    mutate(prev => ({
      ...prev,
      meusIndicadores: [...prev.meusIndicadores, { id: genId(), nome: '', nivel: 'operacional' }],
    }));
  };
  const updateIndicador = (id: string, campo: keyof Indicador, valor: string) => {
    mutate(prev => ({
      ...prev,
      meusIndicadores: prev.meusIndicadores.map(i => i.id === id ? { ...i, [campo]: valor } : i),
    }));
  };
  const removeIndicador = (id: string) => {
    mutate(prev => ({ ...prev, meusIndicadores: prev.meusIndicadores.filter(i => i.id !== id) }));
  };

  const TABS = [
    { id: 'linha' as const, label: 'Linha de Visão' },
    { id: 'area' as const, label: 'Indicadores da Minha Área' },
    { id: 'biblioteca' as const, label: 'Biblioteca de Referência' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-[#0033CC] text-white rounded-xl flex items-center justify-center shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 m-0">Indicadores</h1>
            <p className="text-xs text-gray-500 m-0 mt-0.5">Estratégico · Tático · Operacional — entenda como sua área é gerenciada</p>
          </div>
        </div>
        {aba === 'linha' && (
          <button
            onClick={() => setShowExemplo(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={cn(
              'px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px cursor-pointer bg-transparent',
              aba === t.id ? 'text-[#0033CC] border-[#0033CC]' : 'text-gray-400 border-transparent hover:text-gray-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== ABA 1 — LINHA DE VISÃO ===== */}
      {aba === 'linha' && (
        <div>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Preencha de cima pra baixo: como o indicador da empresa (estratégico) se desdobra
            até chegar no que <strong>você</strong> controla no dia a dia (operacional). Isso é a sua "linha de visão".
          </p>
          <div className="space-y-3">
            {NIVEIS.map((n, idx) => {
              const Icone = n.icon;
              return (
                <div key={n.value} className="flex items-stretch gap-3">
                  {/* Conector vertical entre níveis */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 44 }}>
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-white', n.barra)}>
                      <Icone size={20} />
                    </div>
                    {idx < NIVEIS.length - 1 && <div className="flex-1 w-0.5 bg-gray-200 mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={cn('text-[11px] font-black uppercase tracking-widest', n.cor)}>{n.label}</span>
                      <span className="text-[10px] text-gray-400">{n.desc}</span>
                    </div>
                    <input
                      type="text"
                      value={data.linhaVisao[n.value]}
                      onChange={(e) => setLinha(n.value, e.target.value)}
                      placeholder={
                        n.value === 'estrategico' ? 'Ex: Margem operacional da empresa' :
                        n.value === 'tatico' ? 'Ex: Custo logístico total da área' :
                        'Ex: Custo por entrega que EU controlo'
                      }
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[12px] text-blue-800 leading-relaxed m-0">
              Se você não souber o indicador estratégico da empresa, pergunte ao seu gestor — descobrir isso já é
              meio caminho pra entender as prioridades da organização.
            </p>
          </div>
        </div>
      )}

      {/* ===== ABA 2 — MINHA ÁREA ===== */}
      {aba === 'area' && (
        <div>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Liste os indicadores que existem de verdade na sua área. Marque o nível de cada um.
            Não precisa preencher tudo — comece pelo que você já conhece.
          </p>
          <div className="space-y-3">
            {data.meusIndicadores.map((ind) => (
              <div key={ind.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={ind.nome}
                    onChange={(e) => updateIndicador(ind.id, 'nome', e.target.value)}
                    placeholder="Nome do indicador (ex: % de pedidos no prazo)"
                    className="flex-1 px-2.5 py-2 text-sm font-bold border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeIndicador(ind.id)}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-red-400 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 cursor-pointer transition"
                    title="Excluir indicador"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Nível — só Nome + Nível (simples pro novato) */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {NIVEIS.map(n => (
                    <button
                      key={n.value}
                      onClick={() => updateIndicador(ind.id, 'nivel', n.value)}
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded border cursor-pointer transition',
                        ind.nivel === n.value ? `${n.barra} text-white border-transparent` : 'text-gray-400 border-gray-200 bg-white hover:bg-gray-50'
                      )}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={addIndicador}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-blue-200 text-blue-600 text-xs font-black uppercase tracking-widest hover:bg-blue-50 cursor-pointer transition bg-white"
            >
              <Plus size={14} /> Adicionar indicador
            </button>
          </div>
        </div>
      )}

      {/* ===== ABA 3 — BIBLIOTECA ===== */}
      {aba === 'biblioteca' && (
        <div>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Exemplos de indicadores que cada área costuma ter. Use como referência pra entender
            o que <strong>deveria</strong> estar sendo medido — depois cadastre os reais na aba "Minha Área".
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BIBLIOTECA.map((b) => (
              <div key={b.area} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-black text-gray-800 m-0 mb-3">{b.area}</h3>
                <div className="space-y-2">
                  {b.itens.map((item, i) => {
                    const ni = nivelInfo(item.nivel);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', ni.barra)} />
                        <span className="text-[12px] text-gray-700 flex-1">{item.nome}</span>
                        <span className={cn('text-[9px] font-bold uppercase tracking-wider', ni.cor)}>{ni.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-500">
            {NIVEIS.map(n => (
              <span key={n.value} className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', n.barra)} /> {n.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Salvar */}
      <div className="flex justify-end mt-8 pt-4 border-t border-gray-200">
        <button
          data-save-trigger
          onClick={() => { onSave(data); setDirty(false); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-black uppercase tracking-widest cursor-pointer border-0 transition"
        >
          <Save size={14} /> Salvar
        </button>
      </div>

      {/* MODAL "Ver exemplo" — Linha de Visão (read-only) */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <h3 className="text-base font-black text-gray-800 m-0">Exemplo — Linha de Visão</h3>
              </div>
              <button onClick={() => setShowExemplo(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer">
                <X size={16} />
              </button>
            </div>
            {/* Abas do exemplo */}
            <div className="flex gap-2 px-6 pt-4">
              {LINHA_EXEMPLOS.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setExemploIdx(i)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                    exemploIdx === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {NIVEIS.map((n, idx) => {
                  const Icone = n.icon;
                  const valor = (LINHA_EXEMPLOS[exemploIdx] as any)[n.value];
                  return (
                    <div key={n.value} className="flex items-stretch gap-3">
                      <div className="flex flex-col items-center shrink-0" style={{ width: 44 }}>
                        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-white', n.barra)}>
                          <Icone size={20} />
                        </div>
                        {idx < NIVEIS.length - 1 && <div className="flex-1 w-0.5 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <span className={cn('text-[11px] font-black uppercase tracking-widest', n.cor)}>{n.label}</span>
                        <div className="mt-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                          {valor}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Repare como o indicador desce: a empresa quer margem, isso vira custo da área, que vira
                  o custo que VOCÊ controla. Este exemplo é só pra ilustrar — não altera o seu painel.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
