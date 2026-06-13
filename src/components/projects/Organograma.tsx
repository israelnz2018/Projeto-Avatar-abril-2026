/**
 * Organograma — árvore hierárquica em CAIXINHAS (top-down), estilo organograma
 * corporativo profissional.
 *
 * Cada nó é uma CAIXA (pessoa/função). Os filhos ficam LADO A LADO abaixo do pai,
 * conectados por linhas. Cada nó pode expandir/recolher seus subordinados, e a
 * árvore suporta vários níveis em paralelo.
 *
 * Cada nó tem 3 campos: Função, Nome, Área. Pode ser marcado como "crítico"
 * (caixa azul-clara) e ter um status de relacionamento (3 estados).
 *
 * Suporta VÁRIOS topos (raízes) independentes lado a lado.
 *
 * SEM auto-save: o componente reporta "dirty" via onDirtyChange; o pai
 * (ProjectJourney) avisa "sair sem salvar" se o usuário trocar de ferramenta.
 */

import React, { useState, useEffect } from 'react';
import {
  Network, Plus, Trash2, Save, BookOpen, X,
  Info, GitBranch,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface OrganogramaProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  onDirtyChange?: (dirty: boolean) => void;
}

type Contato = 'nao-falei' | 'conheco' | 'boa-relacao';

interface No {
  id: string;
  nome: string;
  area: string;
  funcao: string;
  critico?: boolean; // marcado pelo aluno = pessoa/função crítica (caixa azul-clara)
  contato?: Contato; // status de relacionamento (default: 'nao-falei')
  filhos: No[];
}

// Config visual dos 3 estados de relacionamento.
const CONTATO_OPCOES: { value: Contato; label: string; dot: string; ativo: string }[] = [
  { value: 'nao-falei',   label: 'Não falei',     dot: 'bg-gray-300',   ativo: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'conheco',     label: 'Já conheço',    dot: 'bg-amber-400',  ativo: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'boa-relacao', label: 'Boa relação',   dot: 'bg-emerald-500', ativo: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
];

interface OrganogramaData {
  // Várias árvores independentes (topos): cada item é uma raiz com sua estrutura.
  raizes: No[];
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function novoNo(): No {
  return { id: genId(), nome: '', area: '', funcao: '', filhos: [] };
}

// ===== Exemplos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
const ORG_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    titulo: 'Diretoria de Operações',
    raiz: {
      nome: 'Carlos Mendes', area: 'Operações', funcao: 'Diretor de Operações', contato: 'nao-falei',
      filhos: [
        { nome: 'Maria Souza', area: 'Logística', funcao: 'Gerente de Logística', critico: true, contato: 'conheco', filhos: [
          { nome: 'Pedro Lima', area: 'Logística', funcao: 'Analista Sênior', critico: true, contato: 'boa-relacao', filhos: [] },
          { nome: 'Ana Costa', area: 'Logística', funcao: 'Analista Júnior', contato: 'boa-relacao', filhos: [] },
        ]},
        { nome: 'João Alves', area: 'Compras', funcao: 'Gerente de Compras', contato: 'nao-falei', filhos: [
          { nome: 'Rita Nunes', area: 'Compras', funcao: 'Compradora', contato: 'conheco', filhos: [] },
        ]},
      ],
    },
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    titulo: 'Gerência de Produção',
    raiz: {
      nome: 'Roberto Dias', area: 'Produção', funcao: 'Gerente de Produção', contato: 'conheco',
      filhos: [
        { nome: 'Sandra Reis', area: 'Produção', funcao: 'Supervisora de Linha', critico: true, contato: 'boa-relacao', filhos: [
          { nome: 'Marcos Pinto', area: 'Produção', funcao: 'Líder de Turno', contato: 'conheco', filhos: [] },
          { nome: 'Time da Linha', area: 'Produção', funcao: 'Operadores', contato: 'conheco', filhos: [] },
        ]},
        { nome: 'Felipe Rocha', area: 'Qualidade', funcao: 'Eng. da Qualidade', critico: true, contato: 'nao-falei', filhos: [
          { nome: 'Bia Martins', area: 'Qualidade', funcao: 'Inspetora da Qualidade', critico: true, contato: 'nao-falei', filhos: [] },
        ]},
        { nome: 'Luísa Gomes', area: 'Manutenção', funcao: 'Supervisora de Manutenção', contato: 'conheco', filhos: [] },
      ],
    },
  },
];

/* =========================================================================
   CONECTORES — organograma top-down com filhos lado a lado.
   Técnica CSS pura (sem medir DOM): cada nível de filhos é uma linha flex;
   conectores são pseudo-traços desenhados com divs absolutos. Robusto e
   responsivo. Estrutura por nó:

     [ CAIXA ]
        │            (tronco descendo do pai)
     ┌──┴──┐         (barra horizontal ligando os filhos)
     │     │         (gota subindo pra cada filho)
   [filho][filho]
   ========================================================================= */

// Largura única das caixas (um pouco mais largas pra caber os campos com label).
const BOX_W = 248;

// Campo compacto com label sempre visível.
function Campo({
  label, valor, placeholder, onChange, bold, readOnly,
}: {
  label: string; valor: string; placeholder: string;
  onChange?: (v: string) => void; bold?: boolean; readOnly?: boolean;
}) {
  return (
    <div>
      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block leading-none mb-0.5">{label}</span>
      {readOnly ? (
        <p className={cn('m-0 leading-tight truncate text-gray-900', bold ? 'text-[12.5px] font-black' : 'text-[11px]')} title={valor}>
          {valor || <span className="text-gray-300">{placeholder}</span>}
        </p>
      ) : (
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full px-1.5 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500',
            bold ? 'text-[12px] font-bold' : 'text-[11px]'
          )}
        />
      )}
    </div>
  );
}

// Caixinha visual de um nó — campos SEMPRE visíveis (sem painel retrátil).
// Usada tanto no editor (readOnly=false) quanto no exemplo (readOnly=true).
function NodeBox({
  no, critico, contato, readOnly,
  onCampo, onToggleCritico, onContato, footer,
}: {
  no: { funcao?: string; nome?: string; area?: string };
  critico?: boolean;
  contato?: Contato;
  readOnly?: boolean;
  onCampo?: (campo: 'funcao' | 'nome' | 'area', v: string) => void;
  onToggleCritico?: () => void;
  onContato?: (v: Contato) => void;
  footer?: React.ReactNode; // barra de ações (editor)
}) {
  return (
    <div
      className={cn(
        'rounded-xl border shadow-sm overflow-hidden bg-white transition-colors',
        critico ? 'border-sky-400 ring-1 ring-sky-200' : 'border-gray-200'
      )}
      style={{ width: BOX_W }}
    >
      {/* Faixa de cor no topo */}
      <div className={cn('h-1.5 w-full', critico ? 'bg-sky-500' : 'bg-[#1E2D6E]')} />
      <div className={cn('px-2.5 py-2 space-y-1.5', critico && 'bg-sky-50/50')}>
        <Campo label="Função / Cargo" valor={no.funcao || ''} placeholder="ex: Gerente" bold readOnly={readOnly} onChange={(v) => onCampo?.('funcao', v)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Campo label="Nome" valor={no.nome || ''} placeholder="ex: Maria" readOnly={readOnly} onChange={(v) => onCampo?.('nome', v)} />
          <Campo label="Área" valor={no.area || ''} placeholder="ex: Logística" readOnly={readOnly} onChange={(v) => onCampo?.('area', v)} />
        </div>

        {/* Crítico + Contato — sempre visíveis */}
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {readOnly ? (
            <>
              {critico && (
                <span className="text-[8px] font-black uppercase tracking-widest text-sky-700 bg-white border border-sky-300 rounded px-1.5 py-0.5">Crítico</span>
              )}
              {(() => {
                const opt = contato ? CONTATO_OPCOES.find(o => o.value === contato) : null;
                if (!opt) return null;
                return (
                  <span className={cn('text-[8px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border flex items-center gap-1', opt.ativo)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', opt.dot)} />{opt.label}
                  </span>
                );
              })()}
            </>
          ) : (
            <>
              <label className={cn(
                'flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded border cursor-pointer transition',
                critico ? 'text-sky-700 border-sky-300 bg-sky-50' : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50'
              )}>
                <input type="checkbox" checked={!!critico} onChange={() => onToggleCritico?.()} className="accent-sky-600 cursor-pointer w-3 h-3" />
                Crítico
              </label>
              {CONTATO_OPCOES.map(opt => {
                const atual = (contato || 'nao-falei') === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onContato?.(opt.value)}
                    title={opt.label}
                    className={cn(
                      'flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded border cursor-pointer transition',
                      atual ? opt.ativo : 'text-gray-400 border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', opt.dot)} />
                    {opt.label}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
      {footer}
    </div>
  );
}

// Layout recursivo genérico (usado por editor e exemplo via renderBox).
// Sempre mostra todos os filhos (sem retrair) — o aluno bate o olho e vê tudo.
function ArvoreLayout({
  no,
  renderBox,
}: {
  no: any;
  renderBox: (no: any) => React.ReactNode;
}) {
  const filhos: any[] = no.filhos || [];
  const temFilhos = filhos.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* A caixa */}
      <div className="relative flex flex-col items-center">
        {renderBox(no)}
      </div>

      {/* Tronco + filhos */}
      {temFilhos && (
        <>
          {/* tronco vertical saindo do pai */}
          <div className="w-px h-5 bg-gray-300" />
          {/* linha de filhos */}
          <div className="flex items-start justify-center">
            {filhos.map((f, i) => {
              const primeiro = i === 0;
              const ultimo = i === filhos.length - 1;
              const unico = filhos.length === 1;
              return (
                <div key={f.id || i} className="flex flex-col items-center px-3 relative">
                  {/* conector superior (barra horizontal + gota) — escondido se filho único */}
                  {!unico && (
                    <div className="absolute top-0 left-0 right-0 h-5 flex">
                      <div className={cn('flex-1 border-gray-300', !primeiro && 'border-t')} />
                      <div className={cn('flex-1 border-gray-300', !ultimo && 'border-t')} />
                    </div>
                  )}
                  {/* gota vertical subindo até a barra */}
                  <div className="w-px h-5 bg-gray-300" />
                  {/* subárvore do filho */}
                  <ArvoreLayout no={f} renderBox={renderBox} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ===== Render do nó-exemplo (read-only) usando o mesmo layout de caixinhas.
function ExemploArvore({ raiz }: { raiz: any }) {
  // No exemplo tudo expandido; ids sintéticos por índice.
  const withIds = (n: any, prefix = 'e'): any => ({
    ...n,
    id: prefix,
    filhos: (n.filhos || []).map((f: any, i: number) => withIds(f, `${prefix}-${i}`)),
  });
  const root = withIds(raiz);
  return (
    <ArvoreLayout
      no={root}
      renderBox={(no) => <NodeBox no={no} critico={no.critico} contato={no.contato} readOnly />}
    />
  );
}

export default function Organograma({ onSave, initialData, onDirtyChange }: OrganogramaProps) {
  const [data, setData] = useState<OrganogramaData>(() => {
    const raw = initialData?.formData || initialData?.toolData || initialData;
    if (raw && Array.isArray(raw.raizes)) return raw as OrganogramaData;
    // Retrocompat: dado antigo tinha 1 raiz única → vira lista de 1 topo.
    if (raw && raw.raiz) return { raizes: [raw.raiz] };
    return { raizes: [] };
  });

  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0);

  // SEM auto-save — marca dirty pro guard "sair sem salvar".
  const [dirty, setDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const mutate = (updater: (prev: OrganogramaData) => OrganogramaData) => {
    setData(updater);
    setDirty(true);
  };

  // ===== Operações dentro de UMA árvore (imutáveis, recursivas) =====
  const atualizarNo = (no: No, id: string, patch: Partial<No>): No => {
    if (no.id === id) return { ...no, ...patch };
    return { ...no, filhos: no.filhos.map(f => atualizarNo(f, id, patch)) };
  };
  const adicionarFilho = (no: No, paiId: string, filho: No): No => {
    if (no.id === paiId) return { ...no, filhos: [...no.filhos, filho] };
    return { ...no, filhos: no.filhos.map(f => adicionarFilho(f, paiId, filho)) };
  };
  const removerDescendente = (no: No, id: string): No => {
    return { ...no, filhos: no.filhos.filter(f => f.id !== id).map(f => removerDescendente(f, id)) };
  };
  // É um topo (raiz)? Topos não têm "parear" — usam o botão "nova estrutura".
  const ehTopo = (id: string) => data.raizes.some(r => r.id === id);
  // Insere `novo` como irmão de `id` (mesmo pai). Se `id` não for filho de ninguém
  // dentro desta árvore, não faz nada (caso de topo é tratado fora).
  const adicionarIrmaoNaArvore = (no: No, id: string, novo: No): No => {
    if (no.filhos.some(f => f.id === id)) {
      return { ...no, filhos: [...no.filhos, novo] };
    }
    return { ...no, filhos: no.filhos.map(f => adicionarIrmaoNaArvore(f, id, novo)) };
  };

  // ===== Handlers (operam sobre o array de raízes) =====
  const handleCampo = (id: string, campo: keyof No, valor: string) => {
    mutate(prev => ({ raizes: prev.raizes.map(r => atualizarNo(r, id, { [campo]: valor })) }));
  };
  const toggleCritico = (id: string, atual: boolean) => {
    mutate(prev => ({ raizes: prev.raizes.map(r => atualizarNo(r, id, { critico: !atual })) }));
  };
  const setContato = (id: string, valor: Contato) => {
    mutate(prev => ({ raizes: prev.raizes.map(r => atualizarNo(r, id, { contato: valor })) }));
  };
  const handleAddSubordinado = (paiId: string) => {
    mutate(prev => ({ raizes: prev.raizes.map(r => adicionarFilho(r, paiId, novoNo())) }));
  };
  // "Parear" = adicionar um colega no MESMO nível (mesmo chefe).
  const handleParear = (id: string) => {
    mutate(prev => ({ raizes: prev.raizes.map(r => adicionarIrmaoNaArvore(r, id, novoNo())) }));
  };
  const handleRemover = (id: string) => {
    mutate(prev => {
      if (prev.raizes.some(r => r.id === id)) {
        return { raizes: prev.raizes.filter(r => r.id !== id) };
      }
      return { raizes: prev.raizes.map(r => removerDescendente(r, id)) };
    });
  };
  // Cria um TOPO independente (nova estrutura, sem relação com as outras).
  const adicionarTopo = () => {
    mutate(prev => ({ raizes: [...prev.raizes, novoNo()] }));
  };

  // ===== Caixa editável: campos sempre visíveis + ações =====
  const renderCaixaEditavel = (no: No): React.ReactNode => {
    const topo = ehTopo(no.id);
    return (
      <NodeBox
        no={no}
        critico={no.critico}
        contato={no.contato}
        onCampo={(campo, v) => handleCampo(no.id, campo, v)}
        onToggleCritico={() => toggleCritico(no.id, !!no.critico)}
        onContato={(v) => setContato(no.id, v)}
        footer={
          <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100 bg-gray-50/70">
            <button
              onClick={() => handleAddSubordinado(no.id)}
              className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-bold text-blue-600 border border-blue-100 bg-white hover:bg-blue-50 cursor-pointer transition"
              title="Adicionar subordinado (abaixo)"
            >
              <Plus size={12} /> Abaixo
            </button>
            {/* Parear — só pra quem TEM chefe (não-topo) */}
            {!topo && (
              <button
                onClick={() => handleParear(no.id)}
                className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-bold text-indigo-600 border border-indigo-100 bg-white hover:bg-indigo-50 cursor-pointer transition"
                title="Parear: adicionar colega no mesmo nível (mesmo chefe)"
              >
                <GitBranch size={12} /> Parear
              </button>
            )}
            <button
              onClick={() => handleRemover(no.id)}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-red-500 border border-red-100 bg-white hover:bg-red-50 cursor-pointer transition"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
        }
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-[#0033CC] text-white rounded-xl flex items-center justify-center shrink-0">
            <Network size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 m-0">Organograma</h1>
            <p className="text-xs text-gray-500 m-0 mt-0.5">Quem é quem na empresa — e onde cada área se encaixa</p>
          </div>
        </div>
        <button
          onClick={() => setShowExemplo(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
      </div>

      {/* Árvores (vários topos) ou estado vazio */}
      {data.raizes.length > 0 ? (
        <div className="space-y-5 mb-4">
          {/* Canvas com scroll horizontal pra organogramas largos */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-start gap-10 min-w-min px-2 pt-3">
              {data.raizes.map((raiz, i) => (
                <div key={raiz.id} className="relative shrink-0 pt-3">
                  {data.raizes.length > 1 && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-[#1E2D6E] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded z-10 whitespace-nowrap">
                      Topo {i + 1}
                    </span>
                  )}
                  <ArvoreLayout no={raiz} renderBox={renderCaixaEditavel} />
                </div>
              ))}
            </div>
          </div>

          {/* Nova estrutura independente (outro topo, sem relação com as demais) */}
          <button
            onClick={adicionarTopo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-blue-200 text-blue-600 text-xs font-black uppercase tracking-widest hover:bg-blue-50 cursor-pointer transition bg-white"
          >
            <Plus size={14} /> Criar outra estrutura independente
          </button>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl mb-6">
          <Network size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">Comece pelo topo da hierarquia (diretor, gerente ou líder).</p>
          <button
            onClick={adicionarTopo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest cursor-pointer border-0 transition"
          >
            <Plus size={14} /> Criar o primeiro topo
          </button>
        </div>
      )}

      {/* Dica */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start mb-6">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <p className="text-[12px] text-blue-800 leading-relaxed m-0">
          <strong>Como montar:</strong> preencha os campos direto na caixa.
          <strong> Abaixo</strong> adiciona um subordinado; <strong>Parear</strong> adiciona um colega
          no mesmo nível (mesmo chefe). Os subordinados aparecem lado a lado — você pode ter vários
          níveis em paralelo.
        </p>
      </div>

      {/* Salvar */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          data-save-trigger
          onClick={() => { onSave(data); setDirty(false); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-black uppercase tracking-widest cursor-pointer border-0 transition"
        >
          <Save size={14} /> Salvar
        </button>
      </div>

      {/* MODAL "Ver exemplo" — read-only */}
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
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Organograma</h3>
                  <p className="text-xs text-gray-500 m-0">{ORG_EXEMPLOS[exemploIdx].titulo}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemplo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Abas */}
            <div className="flex gap-2 px-6 pt-4">
              {ORG_EXEMPLOS.map((ex, i) => (
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
              <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 overflow-x-auto">
                <div className="flex justify-center min-w-min pt-2">
                  <ExemploArvore raiz={ORG_EXEMPLOS[exemploIdx].raiz} />
                </div>
              </div>
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Cada caixa é uma pessoa (função · nome · área). As linhas mostram quem responde
                  a quem, com os subordinados lado a lado. Este exemplo é só pra ilustrar — ele{' '}
                  <strong>não altera</strong> o seu organograma.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
