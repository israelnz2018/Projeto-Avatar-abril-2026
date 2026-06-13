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
  Network, Plus, Trash2, Save, BookOpen, X, Pencil, Check,
  Minus, Info,
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

// Caixinha visual de um nó (compartilhada por editor e exemplo).
function NodeBox({
  no,
  critico,
  contato,
  children,
}: {
  no: { funcao?: string; nome?: string; area?: string };
  critico?: boolean;
  contato?: Contato;
  children?: React.ReactNode; // ações/edição embaixo
}) {
  const opt = contato ? CONTATO_OPCOES.find(o => o.value === contato) : null;
  return (
    <div
      className={cn(
        'w-[220px] rounded-xl border shadow-sm overflow-hidden bg-white transition-colors',
        critico ? 'border-sky-400 ring-1 ring-sky-200' : 'border-gray-200'
      )}
    >
      {/* Faixa de cor no topo */}
      <div className={cn('h-1.5 w-full', critico ? 'bg-sky-500' : 'bg-[#1E2D6E]')} />
      <div className={cn('px-3 py-2.5', critico && 'bg-sky-50/60')}>
        <p className="text-[13px] font-black text-gray-900 m-0 leading-tight truncate" title={no.funcao || ''}>
          {no.funcao || <span className="text-gray-300 font-bold">Função / Cargo</span>}
        </p>
        <p className="text-[11px] text-gray-600 m-0 mt-0.5 truncate" title={`${no.nome || ''} · ${no.area || ''}`}>
          {no.nome || <span className="text-gray-300">Nome</span>}
          {(no.nome || no.area) ? ' · ' : ''}
          {no.area ? <span className="text-gray-400">{no.area}</span> : <span className="text-gray-300">Área</span>}
        </p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {critico && (
            <span className="text-[8px] font-black uppercase tracking-widest text-sky-700 bg-white border border-sky-300 rounded px-1.5 py-0.5">
              Crítico
            </span>
          )}
          {opt && (
            <span className={cn('text-[8px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border flex items-center gap-1', opt.ativo)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', opt.dot)} />
              {opt.label}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// Layout recursivo genérico (usado por editor e exemplo via renderBox).
// `recolhido(id)` decide se esconde a subárvore; `toggle` opcional.
function ArvoreLayout({
  no,
  renderBox,
  isRecolhido,
}: {
  no: any;
  renderBox: (no: any, temFilhos: boolean, recolhido: boolean) => React.ReactNode;
  isRecolhido: (id: string) => boolean;
}) {
  const filhos: any[] = no.filhos || [];
  const temFilhos = filhos.length > 0;
  const recolhido = isRecolhido(no.id);
  const mostrarFilhos = temFilhos && !recolhido;

  return (
    <div className="flex flex-col items-center">
      {/* A caixa */}
      <div className="relative flex flex-col items-center">
        {renderBox(no, temFilhos, recolhido)}
      </div>

      {/* Tronco + filhos */}
      {mostrarFilhos && (
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
                      {/* metade esquerda da barra */}
                      <div className={cn('flex-1 border-gray-300', !primeiro && 'border-t')} />
                      {/* metade direita da barra */}
                      <div className={cn('flex-1 border-gray-300', !ultimo && 'border-t')} />
                    </div>
                  )}
                  {/* gota vertical subindo até a barra */}
                  <div className="w-px h-5 bg-gray-300" />
                  {/* subárvore do filho */}
                  <ArvoreLayout no={f} renderBox={renderBox} isRecolhido={isRecolhido} />
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
      isRecolhido={() => false}
      renderBox={(no) => <NodeBox no={no} critico={no.critico} contato={no.contato} />}
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

  // Nós recolhidos (por id). Default = todos expandidos.
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  // Nó em edição (id) — abre o mini-painel de campos.
  const [editandoId, setEditandoId] = useState<string | null>(null);
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
    const novo = novoNo();
    mutate(prev => ({ raizes: prev.raizes.map(r => adicionarFilho(r, paiId, novo)) }));
    // Garante que o pai esteja expandido pra ver o novo filho, e já abre edição.
    setRecolhidos(prev => { const n = new Set(prev); n.delete(paiId); return n; });
    setEditandoId(novo.id);
  };
  const handleRemover = (id: string) => {
    mutate(prev => {
      if (prev.raizes.some(r => r.id === id)) {
        return { raizes: prev.raizes.filter(r => r.id !== id) };
      }
      return { raizes: prev.raizes.map(r => removerDescendente(r, id)) };
    });
    if (editandoId === id) setEditandoId(null);
  };
  const adicionarTopo = () => {
    const novo = novoNo();
    mutate(prev => ({ raizes: [...prev.raizes, novo] }));
    setEditandoId(novo.id);
  };

  const toggleRecolher = (id: string) => {
    setRecolhidos(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  // ===== Caixa editável (com ações e mini-painel de edição) =====
  const renderCaixaEditavel = (no: No, temFilhos: boolean, recolhido: boolean): React.ReactNode => {
    const emEdicao = editandoId === no.id;
    return (
      <NodeBox no={no} critico={no.critico} contato={no.contato}>
        {/* Barra de ações */}
        <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setEditandoId(emEdicao ? null : no.id)}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md border cursor-pointer transition',
                emEdicao ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-100'
              )}
              title={emEdicao ? 'Fechar edição' : 'Editar'}
            >
              {emEdicao ? <Check size={13} /> : <Pencil size={13} />}
            </button>
            <button
              onClick={() => handleAddSubordinado(no.id)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-blue-600 border border-blue-100 bg-white hover:bg-blue-50 cursor-pointer transition"
              title="Adicionar subordinado"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={() => handleRemover(no.id)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-red-500 border border-red-100 bg-white hover:bg-red-50 cursor-pointer transition"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
          {/* Toggle expandir/recolher — só se tiver filhos */}
          {temFilhos && (
            <button
              onClick={() => toggleRecolher(no.id)}
              className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-black text-gray-600 border border-gray-200 bg-white hover:bg-gray-100 cursor-pointer transition"
              title={recolhido ? 'Expandir subordinados' : 'Recolher subordinados'}
            >
              {recolhido ? <Plus size={12} /> : <Minus size={12} />}
              {recolhido && <span>{no.filhos.length}</span>}
            </button>
          )}
        </div>

        {/* Mini-painel de edição (inline) */}
        {emEdicao && (
          <div className="px-2.5 py-2.5 border-t border-gray-100 bg-white space-y-2">
            <input
              type="text"
              value={no.funcao}
              onChange={(e) => handleCampo(no.id, 'funcao', e.target.value)}
              placeholder="Função / Cargo"
              autoFocus
              className="w-full px-2 py-1.5 text-[12px] font-bold border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={no.nome}
              onChange={(e) => handleCampo(no.id, 'nome', e.target.value)}
              placeholder="Nome da pessoa"
              className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={no.area}
              onChange={(e) => handleCampo(no.id, 'area', e.target.value)}
              placeholder="Área / Setor"
              className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            {/* Crítico */}
            <label className={cn(
              'flex items-center gap-1.5 text-[10px] font-bold px-2 py-1.5 rounded border cursor-pointer transition',
              no.critico ? 'text-sky-700 border-sky-300 bg-sky-50' : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50'
            )}>
              <input
                type="checkbox"
                checked={!!no.critico}
                onChange={() => toggleCritico(no.id, !!no.critico)}
                className="accent-sky-600 cursor-pointer"
              />
              Pessoa / função crítica
            </label>

            {/* Contato — 3 estados */}
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Contato</span>
              <div className="flex items-center gap-1 flex-wrap">
                {CONTATO_OPCOES.map(opt => {
                  const atual = (no.contato || 'nao-falei') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setContato(no.id, opt.value)}
                      className={cn(
                        'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border cursor-pointer transition',
                        atual ? opt.ativo : 'text-gray-400 border-gray-200 bg-white hover:bg-gray-50'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', opt.dot)} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </NodeBox>
    );
  };

  const isRecolhido = (id: string) => recolhidos.has(id);

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
                  <ArvoreLayout no={raiz} renderBox={renderCaixaEditavel} isRecolhido={isRecolhido} />
                </div>
              ))}
            </div>
          </div>

          {/* Adicionar outro topo (árvore independente) */}
          <button
            onClick={adicionarTopo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-blue-200 text-blue-600 text-xs font-black uppercase tracking-widest hover:bg-blue-50 cursor-pointer transition bg-white"
          >
            <Plus size={14} /> Adicionar outro topo (ex: outro gerente)
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
          <strong>Como montar:</strong> clique no <Pencil size={11} className="inline -mt-0.5" /> pra preencher
          a caixa, no <Plus size={11} className="inline -mt-0.5" /> pra adicionar um subordinado abaixo, e no{' '}
          <Minus size={11} className="inline -mt-0.5" /> pra recolher/expandir um ramo. Os subordinados aparecem
          lado a lado — você pode ter vários níveis em paralelo.
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
