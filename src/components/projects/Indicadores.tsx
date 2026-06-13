/**
 * Indicadores — Linha de Visão por TRIO correlacionado.
 *
 * O aluno monta conjuntos (trios): cada trio tem um TEMA (ex: "Qualidade") e os
 * 3 indicadores que se DESDOBRAM um do outro — Estratégico → Tático → Operacional.
 * Os 3 do mesmo trio têm que se manter correlacionados (mesmo tema).
 * Em cada trio o aluno marca qual nível é o DELE (onde ele atua).
 * Pode adicionar quantos trios quiser.
 *
 * O botão "Ver exemplo" abre um modal com a biblioteca de referência: KPIs
 * típicos de 8 áreas, cada uma com os 3 níveis (read-only).
 *
 * SEM auto-save: reporta dirty via onDirtyChange; o pai (ProjectJourney) avisa
 * "sair sem salvar" se o usuário trocar de ferramenta.
 *
 * Simples de propósito — o público é novato.
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3, Plus, Trash2, Save, BookOpen, X, Info, Check,
  Target, Layers, Settings2,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface IndicadoresProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  onDirtyChange?: (dirty: boolean) => void;
}

type Nivel = 'estrategico' | 'tatico' | 'operacional';

interface Trio {
  id: string;
  tema: string;
  estrategico: string;
  tatico: string;
  operacional: string;
  // Qual nível DESTE trio é o do usuário (onde ele atua). null = não marcado.
  meuNivel: Nivel | null;
}

interface IndicadoresData {
  trios: Trio[];
}

const NIVEIS: { value: Nivel; label: string; desc: string; icon: any; cor: string; barra: string }[] = [
  { value: 'estrategico', label: 'Estratégico', desc: 'Diretoria · empresa toda · longo prazo',     icon: Target,    cor: 'text-[#1E2D6E]', barra: 'bg-[#1E2D6E]' },
  { value: 'tatico',      label: 'Tático',      desc: 'Gerência · a sua área · médio prazo',         icon: Layers,    cor: 'text-[#0033CC]', barra: 'bg-[#0033CC]' },
  { value: 'operacional', label: 'Operacional', desc: 'Execução · o seu dia a dia · curto prazo',    icon: Settings2, cor: 'text-sky-600',  barra: 'bg-sky-500' },
];

// ===== Biblioteca (read-only) — 8 áreas, cada uma com os 3 níveis.
// Exibida no modal "Ver exemplo".
const BIBLIOTECA: { area: string; estrategico: string; tatico: string; operacional: string }[] = [
  { area: 'Logística',        estrategico: 'Custo logístico sobre a receita', tatico: 'Entregas no prazo (OTIF)',     operacional: 'Custo por entrega' },
  { area: 'Comercial / Vendas', estrategico: 'Faturamento',                   tatico: 'Taxa de conversão',           operacional: 'Ligações / visitas por dia' },
  { area: 'Qualidade',        estrategico: 'Custo da não-qualidade',          tatico: 'First Pass Yield (acerto de 1ª)', operacional: '% de defeitos' },
  { area: 'Produção',         estrategico: 'EBITDA da planta',                tatico: 'Eficiência da linha (OEE)',   operacional: '% de refugo' },
  { area: 'Financeiro',       estrategico: 'Margem / EBITDA',                 tatico: 'Prazo médio de recebimento',  operacional: 'Inadimplência do dia' },
  { area: 'RH / Pessoas',     estrategico: 'Engajamento / clima',             tatico: 'Turnover (rotatividade)',     operacional: 'Absenteísmo' },
  { area: 'TI',               estrategico: 'Disponibilidade dos sistemas',    tatico: 'SLA de atendimento',          operacional: 'Chamados resolvidos/dia' },
  { area: 'Manutenção',       estrategico: 'Custo de manutenção sobre o ativo', tatico: 'MTBF (tempo entre falhas)', operacional: 'Ordens de serviço/dia' },
];

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function novoTrio(): Trio {
  return { id: genId(), tema: '', estrategico: '', tatico: '', operacional: '', meuNivel: null };
}

export default function Indicadores({ onSave, initialData, onDirtyChange }: IndicadoresProps) {
  const [data, setData] = useState<IndicadoresData>(() => {
    const raw = initialData?.formData || initialData?.toolData || initialData;
    // Formato novo (trios)
    if (raw && Array.isArray(raw.trios)) {
      return { trios: raw.trios.length ? raw.trios.map((t: any) => ({ ...novoTrio(), ...t })) : [novoTrio()] };
    }
    // Retrocompat: formato antigo (listas por nível) → vira 1 trio com o 1º de cada
    if (raw && (raw.estrategico || raw.tatico || raw.operacional)) {
      const first = (v: any) => Array.isArray(v) ? (v[0] || '') : (v || '');
      return { trios: [{ ...novoTrio(), estrategico: first(raw.estrategico), tatico: first(raw.tatico), operacional: first(raw.operacional), meuNivel: raw.meuNivel || null }] };
    }
    // Retrocompat: formato bem antigo (linhaVisao)
    if (raw && raw.linhaVisao) {
      const lv = raw.linhaVisao;
      return { trios: [{ ...novoTrio(), estrategico: lv.estrategico || '', tatico: lv.tatico || '', operacional: lv.operacional || '' }] };
    }
    return { trios: [novoTrio()] };
  });

  const [showExemplo, setShowExemplo] = useState(false);

  const [dirty, setDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  const mutate = (updater: (prev: IndicadoresData) => IndicadoresData) => {
    setData(updater);
    setDirty(true);
  };

  // ===== Trios =====
  const addTrio = () => mutate(prev => ({ trios: [...prev.trios, novoTrio()] }));
  const removeTrio = (id: string) => mutate(prev => ({ trios: prev.trios.filter(t => t.id !== id) }));
  const updateTrio = (id: string, campo: keyof Trio, valor: string) =>
    mutate(prev => ({ trios: prev.trios.map(t => t.id === id ? { ...t, [campo]: valor } : t) }));
  const setMeuNivel = (id: string, nivel: Nivel) =>
    mutate(prev => ({ trios: prev.trios.map(t => t.id === id ? { ...t, meuNivel: t.meuNivel === nivel ? null : nivel } : t) }));

  const placeholderDe = (nivel: Nivel) =>
    nivel === 'estrategico' ? 'ex: margem da empresa' :
    nivel === 'tatico' ? 'ex: custo / desempenho da área' :
    'ex: o que eu controlo no dia a dia';

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
        <button
          onClick={() => setShowExemplo(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
      </div>

      {/* ===== LINHA DE VISÃO por TRIO correlacionado ===== */}
      <div>
        <p className="text-sm text-gray-500 mb-2 leading-relaxed">
          Pra cada tema, preencha os <strong>3 indicadores que se desdobram um do outro</strong>:
          o estratégico (empresa) → o tático (sua área) → o operacional (seu dia a dia). Os três têm
          que ser do <strong>mesmo assunto</strong>. Depois você pode adicionar outro tema.
        </p>
        <p className="text-xs text-gray-400 mb-5">
          Em cada tema, clique em <strong>"Esse é o meu nível"</strong> na linha onde <strong>você</strong> atua.
        </p>

        {/* Lista de trios */}
        <div className="space-y-5">
          {data.trios.map((trio, ti) => (
            <div key={trio.id} className="border-2 border-gray-200 rounded-xl p-4">
              {/* Cabeçalho do trio: tema + remover */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1E2D6E] text-white text-[11px] font-black shrink-0">
                  {ti + 1}
                </span>
                <input
                  type="text"
                  value={trio.tema}
                  onChange={(e) => updateTrio(trio.id, 'tema', e.target.value)}
                  placeholder="Tema (ex: Qualidade, Custo, Entrega...)"
                  className="flex-1 px-3 py-1.5 text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 placeholder:font-normal"
                />
                {data.trios.length > 1 && (
                  <button
                    onClick={() => removeTrio(trio.id)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-red-400 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 cursor-pointer transition"
                    title="Remover tema"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* As 3 linhas correlacionadas */}
              <div>
                {NIVEIS.map((n, idx) => {
                  const Icone = n.icon;
                  const ehMeu = trio.meuNivel === n.value;
                  return (
                    <div key={n.value} className="flex items-stretch gap-3">
                      {/* Coluna do nível + conector vertical */}
                      <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0', n.barra)}>
                          <Icone size={17} />
                        </div>
                        {idx < NIVEIS.length - 1 && <div className="flex-1 w-0.5 bg-gray-200" />}
                      </div>

                      {/* Conteúdo da linha */}
                      <div className={cn(
                        'flex-1 rounded-lg px-2.5 py-2 mb-1.5 border transition-colors',
                        ehMeu ? 'bg-sky-50 border-sky-300' : 'border-transparent'
                      )}>
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-baseline gap-2">
                            <span className={cn('text-[11px] font-black uppercase tracking-widest', n.cor)}>{n.label}</span>
                            <span className="text-[10px] text-gray-400">{n.desc}</span>
                          </div>
                          <button
                            onClick={() => setMeuNivel(trio.id, n.value)}
                            className={cn(
                              'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border cursor-pointer transition',
                              ehMeu ? 'bg-sky-600 text-white border-sky-600' : 'text-gray-400 border-gray-200 bg-white hover:bg-gray-50'
                            )}
                          >
                            {ehMeu ? <><Check size={11} /> Meu nível</> : 'Esse é o meu nível'}
                          </button>
                        </div>

                        <input
                          type="text"
                          value={trio[n.value]}
                          onChange={(e) => updateTrio(trio.id, n.value, e.target.value)}
                          placeholder={placeholderDe(n.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar outro trio */}
        <button
          onClick={addTrio}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 text-[12px] font-black uppercase tracking-widest hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition"
        >
          <Plus size={15} /> Adicionar outro tema
        </button>

        <div className="mt-5 bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
          <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
          <p className="text-[12px] text-blue-800 leading-relaxed m-0">
            Não sabe o indicador estratégico da empresa? Pergunte ao seu gestor — descobrir isso já
            é meio caminho pra entender as prioridades da organização.
          </p>
        </div>
      </div>

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

      {/* MODAL "Ver exemplo" — biblioteca de indicadores por área (read-only) */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplos de indicadores por área</h3>
                  <p className="text-xs text-gray-500 m-0">Sempre nos 3 níveis — use como referência</p>
                </div>
              </div>
              <button onClick={() => setShowExemplo(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BIBLIOTECA.map((b) => (
                  <div key={b.area} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-black text-gray-800 m-0 mb-3">{b.area}</h3>
                    <div className="space-y-2">
                      {([['estrategico', b.estrategico], ['tatico', b.tatico], ['operacional', b.operacional]] as [Nivel, string][]).map(([niv, valor]) => {
                        const ni = NIVEIS.find(x => x.value === niv)!;
                        return (
                          <div key={niv} className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full shrink-0', ni.barra)} />
                            <span className="text-[12px] text-gray-700 flex-1">{valor}</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
