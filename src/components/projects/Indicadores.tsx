/**
 * Indicadores — Painel de KPIs por nível de gestão (Estratégico/Tático/Operacional).
 *
 * Tela única — Linha de Visão: 3 camadas fixas. Cada camada pode ter VÁRIOS
 * indicadores. O aluno marca qual nível é o DELE (onde ele atua) e vê como o
 * indicador da empresa "desce" até o que ele controla no dia a dia.
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

interface IndicadoresData {
  // Listas de indicadores por nível (cada nível pode ter vários).
  estrategico: string[];
  tatico: string[];
  operacional: string[];
  // Qual nível é o do usuário (onde ele atua). null = não marcado.
  meuNivel: Nivel | null;
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

export default function Indicadores({ onSave, initialData, onDirtyChange }: IndicadoresProps) {
  const [data, setData] = useState<IndicadoresData>(() => {
    const raw = initialData?.formData || initialData?.toolData || initialData;
    if (raw && (raw.estrategico || raw.tatico || raw.operacional)) {
      return {
        estrategico: Array.isArray(raw.estrategico) ? raw.estrategico : [],
        tatico: Array.isArray(raw.tatico) ? raw.tatico : [],
        operacional: Array.isArray(raw.operacional) ? raw.operacional : [],
        meuNivel: raw.meuNivel || null,
      };
    }
    // Retrocompat com o formato antigo (linhaVisao: {estrategico, tatico, operacional} como strings)
    if (raw && raw.linhaVisao) {
      const lv = raw.linhaVisao;
      return {
        estrategico: lv.estrategico ? [lv.estrategico] : [],
        tatico: lv.tatico ? [lv.tatico] : [],
        operacional: lv.operacional ? [lv.operacional] : [],
        meuNivel: null,
      };
    }
    return { estrategico: [], tatico: [], operacional: [], meuNivel: null };
  });

  const [showExemplo, setShowExemplo] = useState(false);

  const [dirty, setDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  const mutate = (updater: (prev: IndicadoresData) => IndicadoresData) => {
    setData(updater);
    setDirty(true);
  };

  // ===== Indicadores por nível =====
  const addIndicador = (nivel: Nivel) => {
    mutate(prev => ({ ...prev, [nivel]: [...prev[nivel], ''] }));
  };
  const updateIndicador = (nivel: Nivel, idx: number, valor: string) => {
    mutate(prev => ({ ...prev, [nivel]: prev[nivel].map((v, i) => i === idx ? valor : v) }));
  };
  const removeIndicador = (nivel: Nivel, idx: number) => {
    mutate(prev => ({ ...prev, [nivel]: prev[nivel].filter((_, i) => i !== idx) }));
  };
  const setMeuNivel = (nivel: Nivel) => {
    mutate(prev => ({ ...prev, meuNivel: prev.meuNivel === nivel ? null : nivel }));
  };

  const placeholderDe = (nivel: Nivel) =>
    nivel === 'estrategico' ? 'ex: margem da empresa' :
    nivel === 'tatico' ? 'ex: custo da área' :
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

      {/* ===== LINHA DE VISÃO (aba única) ===== */}
      {(
        <div>
          <p className="text-sm text-gray-500 mb-2 leading-relaxed">
            Preencha de cima pra baixo: como o indicador da empresa (estratégico) se desdobra até
            chegar no que <strong>você</strong> controla (operacional). Pode ter vários por nível.
          </p>
          <p className="text-xs text-gray-400 mb-5">
            Clique em <strong>"Esse é o meu nível"</strong> pra marcar onde você atua.
          </p>

          {/* 3 níveis compactos e coesos (juntinhos), mostrando o desdobramento */}
          <div>
            {NIVEIS.map((n, idx) => {
              const Icone = n.icon;
              const ehMeu = data.meuNivel === n.value;
              return (
                <div key={n.value} className="flex items-stretch gap-3">
                  {/* Coluna do nível + conector */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0', n.barra)}>
                      <Icone size={17} />
                    </div>
                    {idx < NIVEIS.length - 1 && <div className="flex-1 w-0.5 bg-gray-200" />}
                  </div>

                  {/* Conteúdo do nível */}
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
                        onClick={() => setMeuNivel(n.value)}
                        className={cn(
                          'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border cursor-pointer transition',
                          ehMeu ? 'bg-sky-600 text-white border-sky-600' : 'text-gray-400 border-gray-200 bg-white hover:bg-gray-50'
                        )}
                      >
                        {ehMeu ? <><Check size={11} /> Meu nível</> : 'Esse é o meu nível'}
                      </button>
                    </div>

                    {/* Lista de indicadores deste nível */}
                    <div className="space-y-1.5">
                      {data[n.value].map((ind, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ind}
                            onChange={(e) => updateIndicador(n.value, i, e.target.value)}
                            placeholder={placeholderDe(n.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
                          />
                          <button
                            onClick={() => removeIndicador(n.value, i)}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-red-400 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 cursor-pointer transition"
                            title="Remover"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addIndicador(n.value)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded border border-blue-100 bg-white cursor-pointer transition"
                      >
                        <Plus size={12} /> Adicionar indicador {n.label.toLowerCase()}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[12px] text-blue-800 leading-relaxed m-0">
              Não sabe o indicador estratégico da empresa? Pergunte ao seu gestor — descobrir isso já
              é meio caminho pra entender as prioridades da organização.
            </p>
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
