/**
 * Organograma — árvore hierárquica colapsável (estilo explorer/Outlook).
 *
 * Cada nó é uma PESSOA com 3 campos: Nome, Área, Função.
 * Clica no nó → expande/recolhe os subordinados.
 * Cada nó pode: adicionar subordinado, editar, excluir.
 *
 * SEM auto-save: o componente reporta "dirty" via onDirtyChange; o pai
 * (ProjectJourney) avisa "sair sem salvar" se o usuário trocar de ferramenta.
 *
 * Ferramenta pensada pra Situação 1 da Trilha 1 ("mapear minha área"):
 * o aluno monta quem é quem e onde ele mesmo se encaixa.
 */

import React, { useState, useEffect } from 'react';
import {
  Network, Plus, Trash2, Save, BookOpen, X,
  ChevronRight, ChevronDown, Info,
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

// Renderiza um nó-exemplo (read-only) recursivo.
function NoExemplo({ no, nivel }: { no: any; nivel: number }) {
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5"
        style={{ paddingLeft: nivel * 22 }}
      >
        {no.filhos?.length > 0 ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <span className="w-3.5 shrink-0" />}
        <div className={cn(
          'flex-1 rounded-lg px-3 py-2 border',
          no.critico ? 'bg-sky-100 border-sky-300' : 'bg-white border-gray-200'
        )}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-bold text-gray-900 m-0 leading-tight">{no.funcao}</p>
            {no.critico && (
              <span className="text-[8px] font-black uppercase tracking-widest text-sky-700 bg-white border border-sky-300 rounded px-1.5 py-0.5">
                Crítico
              </span>
            )}
            {no.contato && (() => {
              const opt = CONTATO_OPCOES.find(o => o.value === no.contato);
              if (!opt) return null;
              return (
                <span className={cn('text-[8px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border flex items-center gap-1', opt.ativo)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', opt.dot)} />
                  {opt.label}
                </span>
              );
            })()}
          </div>
          <p className="text-[11px] text-gray-500 m-0">{no.nome} · {no.area}</p>
        </div>
      </div>
      {(no.filhos || []).map((f: any, i: number) => (
        <NoExemplo key={i} no={f} nivel={nivel + 1} />
      ))}
    </div>
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
  // Remove um nó de dentro de uma árvore (sem remover a própria raiz aqui).
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
    mutate(prev => ({ raizes: prev.raizes.map(r => adicionarFilho(r, paiId, novoNo())) }));
  };
  const handleRemover = (id: string) => {
    // Se o id for uma raiz (topo), remove a árvore inteira. Senão, remove o descendente.
    mutate(prev => {
      if (prev.raizes.some(r => r.id === id)) {
        return { raizes: prev.raizes.filter(r => r.id !== id) };
      }
      return { raizes: prev.raizes.map(r => removerDescendente(r, id)) };
    });
  };
  // Adiciona um novo TOPO (árvore independente) ao lado dos existentes.
  const adicionarTopo = () => {
    mutate(prev => ({ raizes: [...prev.raizes, novoNo()] }));
  };

  const toggleRecolher = (id: string) => {
    setRecolhidos(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  // ===== Render recursivo de um nó editável =====
  const renderNo = (no: No, nivel: number): React.ReactNode => {
    const temFilhos = no.filhos.length > 0;
    const recolhido = recolhidos.has(no.id);
    return (
      <div key={no.id}>
        <div className="flex items-start gap-1.5 py-1.5" style={{ paddingLeft: nivel * 24 }}>
          {/* Toggle expandir/recolher */}
          {temFilhos ? (
            <button
              onClick={() => toggleRecolher(no.id)}
              className="mt-3 shrink-0 text-gray-400 hover:text-gray-700 bg-transparent border-0 cursor-pointer p-0"
              title={recolhido ? 'Expandir' : 'Recolher'}
            >
              {recolhido ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Card editável da pessoa — fica AZUL CLARO quando marcado como crítico */}
          <div className={cn(
            'flex-1 rounded-lg p-2.5 shadow-sm border transition-colors',
            no.critico ? 'bg-sky-100 border-sky-300' : 'bg-white border-gray-200'
          )}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                value={no.funcao}
                onChange={(e) => handleCampo(no.id, 'funcao', e.target.value)}
                placeholder="Função / Cargo"
                className="px-2 py-1.5 text-[12px] font-bold border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={no.nome}
                onChange={(e) => handleCampo(no.id, 'nome', e.target.value)}
                placeholder="Nome da pessoa"
                className="px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={no.area}
                onChange={(e) => handleCampo(no.id, 'area', e.target.value)}
                placeholder="Área / Setor"
                className="px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                onClick={() => handleAddSubordinado(no.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-100 bg-white cursor-pointer transition"
              >
                <Plus size={11} /> Subordinado
              </button>
              <button
                onClick={() => handleRemover(no.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-100 bg-white cursor-pointer transition"
              >
                <Trash2 size={11} /> Excluir
              </button>
              {/* Caixinha "Crítico" — pinta o card de azul-claro ao marcar */}
              <label className={cn(
                'flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded border cursor-pointer transition ml-auto',
                no.critico ? 'text-sky-700 border-sky-300 bg-sky-50' : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50'
              )}>
                <input
                  type="checkbox"
                  checked={!!no.critico}
                  onChange={() => toggleCritico(no.id, !!no.critico)}
                  className="accent-sky-600 cursor-pointer"
                />
                Crítico
              </label>
            </div>

            {/* Status de relacionamento — 3 estados (mapa de quem já abordei) */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mr-1">Contato:</span>
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

        {/* Filhos (se não recolhido) */}
        {!recolhido && no.filhos.map(f => renderNo(f, nivel + 1))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white">
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
        <div className="space-y-3 mb-4">
          {data.raizes.map((raiz, i) => (
            <div key={raiz.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 relative">
              {data.raizes.length > 1 && (
                <span className="absolute -top-2 left-3 bg-[#1E2D6E] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                  Topo {i + 1}
                </span>
              )}
              {renderNo(raiz, 0)}
            </div>
          ))}
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
          <strong>Como montar:</strong> comece pelo topo e vá adicionando subordinados. Clique na setinha
          pra recolher/expandir um ramo. Cada pessoa tem <strong>Função</strong>, <strong>Nome</strong> e <strong>Área</strong>.
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto"
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
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <NoExemplo no={ORG_EXEMPLOS[exemploIdx].raiz} nivel={0} />
              </div>
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Cada caixa é uma pessoa (função · nome · área). A indentação mostra quem responde
                  a quem. Este exemplo é só pra ilustrar — ele <strong>não altera</strong> o seu organograma.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
