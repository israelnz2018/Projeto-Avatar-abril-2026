/**
 * RACI Tool — Matriz de Responsabilidades.
 *
 * Cada linha é uma ATIVIDADE de um processo.
 * Cada coluna é um STAKEHOLDER (pessoa, cargo ou área).
 * Cada célula é um dropdown com 4 opções:
 *   R — Responsável  (executa a atividade)
 *   A — Aprovador    (responde pelo resultado final · accountable)
 *   C — Consultado   (opina antes da decisão)
 *   I — Informado    (sabe depois que aconteceu)
 *
 * Regras de boa prática:
 *   • Cada atividade DEVE ter exatamente 1 "A"
 *   • Pode ter vários R / C / I
 *   • Se uma atividade tem 2 A's = papel mal definido
 *
 * Layout: pensado em A4 vertical (210mm × 297mm). Impressão limpa.
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Info,
  AlertCircle,
  ListChecks,
  BookOpen,
  X,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface RaciToolProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  /** Reporta ao pai se há alteração não-salva (pro guard "sair sem salvar"). */
  onDirtyChange?: (dirty: boolean) => void;
}

type RaciValue = '' | 'R' | 'A' | 'C' | 'I';

interface Stakeholder {
  id: string;
  nome: string;
}

interface Atividade {
  id: string;
  nome: string;
  /** { stakeholderId: RaciValue } */
  raci: Record<string, RaciValue>;
}

interface RaciData {
  processoNome: string;
  stakeholders: Stakeholder[];
  atividades: Atividade[];
}

const RACI_OPTIONS: { value: RaciValue; label: string; color: string }[] = [
  { value: '',  label: '—', color: 'bg-white text-gray-300' },
  { value: 'R', label: 'R', color: 'bg-blue-100 text-blue-700' },
  { value: 'A', label: 'A', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'C', label: 'C', color: 'bg-amber-100 text-amber-700' },
  { value: 'I', label: 'I', color: 'bg-violet-100 text-violet-700' },
];

const RACI_LEGENDA: { letra: RaciValue; nome: string; descricao: string; cor: string }[] = [
  { letra: 'R', nome: 'Responsável',  descricao: 'Quem EXECUTA a atividade — coloca a mão na massa.',      cor: 'bg-blue-100 text-blue-700 border-blue-200' },
  { letra: 'A', nome: 'Aprovador',    descricao: 'Quem RESPONDE pelo resultado final. Exatamente 1 por linha.', cor: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { letra: 'C', nome: 'Consultado',   descricao: 'Quem OPINA antes da decisão ser tomada.',                cor: 'bg-amber-100 text-amber-700 border-amber-200' },
  { letra: 'I', nome: 'Informado',    descricao: 'Quem SABE depois que a atividade foi feita.',            cor: 'bg-violet-100 text-violet-700 border-violet-200' },
];

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Matriz montada como: cabeçalho de papéis + linhas de atividade com R/A/C/I.
const RACI_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    processo: 'Aprovação de Novos Fornecedores',
    papeis: ['Comprador', 'Gerente de Compras', 'Jurídico', 'Financeiro'],
    linhas: [
      { atividade: 'Levantar documentação do fornecedor', raci: ['R', 'A', 'I', 'I'] },
      { atividade: 'Analisar risco jurídico do contrato', raci: ['C', 'I', 'R/A', 'I'] },
      { atividade: 'Validar saúde financeira do fornecedor', raci: ['C', 'I', 'I', 'R/A'] },
      { atividade: 'Aprovar homologação final', raci: ['C', 'A', 'C', 'C'] },
      { atividade: 'Cadastrar fornecedor no sistema', raci: ['R', 'A', 'I', 'I'] },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    processo: 'Inspeção de Qualidade de Produto Fabricado',
    papeis: ['Operador', 'Inspetor da Qualidade', 'Eng. da Qualidade', 'Supervisor de Produção'],
    linhas: [
      { atividade: 'Coletar amostra da produção', raci: ['R', 'A', 'I', 'C'] },
      { atividade: 'Medir características críticas', raci: ['I', 'R/A', 'C', 'I'] },
      { atividade: 'Comparar com a especificação', raci: ['I', 'R', 'A', 'I'] },
      { atividade: 'Decidir aprovar ou reprovar o lote', raci: ['I', 'C', 'A', 'R'] },
      { atividade: 'Registrar resultado e liberar/segregar', raci: ['C', 'R/A', 'I', 'I'] },
    ],
  },
];

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptyData(): RaciData {
  const stakeholderId = genId();
  const atividadeId = genId();
  return {
    processoNome: '',
    stakeholders: [{ id: stakeholderId, nome: '' }],
    atividades: [{ id: atividadeId, nome: '', raci: { [stakeholderId]: '' } }],
  };
}

export default function RaciTool({ onSave, initialData, onDirtyChange }: RaciToolProps) {
  const [data, setData] = useState<RaciData>(() => {
    const raw = initialData?.formData || initialData?.toolData || initialData;
    if (raw && raw.stakeholders && raw.atividades) return raw as RaciData;
    return emptyData();
  });

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  // SEM auto-save. Em vez disso, marca "dirty" quando o usuário edita —
  // o pai (ProjectJourney) avisa "sair sem salvar" se ele trocar de ferramenta.
  const [dirty, setDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  // Toda mutação passa por aqui: aplica a mudança E marca como não-salvo.
  const mutate = (updater: (prev: RaciData) => RaciData) => {
    setData(updater);
    setDirty(true);
  };

  const updateField = <K extends keyof RaciData>(key: K, value: RaciData[K]) => {
    mutate(prev => ({ ...prev, [key]: value }));
  };

  // ===== Stakeholders =====
  const addStakeholder = () => {
    const id = genId();
    mutate(prev => ({
      ...prev,
      stakeholders: [...prev.stakeholders, { id, nome: '' }],
      atividades: prev.atividades.map(a => ({ ...a, raci: { ...a.raci, [id]: '' } })),
    }));
  };
  const removeStakeholder = (id: string) => {
    mutate(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.filter(s => s.id !== id),
      atividades: prev.atividades.map(a => {
        const novoRaci = { ...a.raci };
        delete novoRaci[id];
        return { ...a, raci: novoRaci };
      }),
    }));
  };
  const updateStakeholderNome = (id: string, nome: string) => {
    mutate(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.map(s => s.id === id ? { ...s, nome } : s),
    }));
  };

  // ===== Atividades =====
  const addAtividade = () => {
    const id = genId();
    const raciInicial: Record<string, RaciValue> = {};
    data.stakeholders.forEach(s => { raciInicial[s.id] = ''; });
    mutate(prev => ({
      ...prev,
      atividades: [...prev.atividades, { id, nome: '', raci: raciInicial }],
    }));
  };
  const removeAtividade = (id: string) => {
    mutate(prev => ({
      ...prev,
      atividades: prev.atividades.filter(a => a.id !== id),
    }));
  };
  const updateAtividadeNome = (id: string, nome: string) => {
    mutate(prev => ({
      ...prev,
      atividades: prev.atividades.map(a => a.id === id ? { ...a, nome } : a),
    }));
  };
  const updateCelula = (atividadeId: string, stakeholderId: string, valor: RaciValue) => {
    mutate(prev => ({
      ...prev,
      atividades: prev.atividades.map(a =>
        a.id === atividadeId ? { ...a, raci: { ...a.raci, [stakeholderId]: valor } } : a
      ),
    }));
  };

  // ===== Validações leves (warning visual, não bloqueia) =====
  const validacoes = data.atividades.map(a => {
    const valores = Object.values(a.raci);
    const numA = valores.filter(v => v === 'A').length;
    const numR = valores.filter(v => v === 'R').length;
    if (a.nome.trim() === '') return null; // sem nome, sem validação
    if (numA === 0) return { atividadeId: a.id, tipo: 'sem-aprovador' as const, msg: 'Sem Aprovador (A)' };
    if (numA > 1) return { atividadeId: a.id, tipo: 'multiplos-A' as const, msg: `${numA} Aprovadores — deve ser 1 só` };
    if (numR === 0) return { atividadeId: a.id, tipo: 'sem-R' as const, msg: 'Sem Responsável (R)' };
    return null;
  });
  const warnings = validacoes.filter(v => v !== null);

  return (
    <div className="raci-tool-root max-w-[210mm] mx-auto p-6 md:p-10 bg-white">
      {/* Estilos de impressão A4 */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .raci-tool-root {
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          select { -webkit-appearance: none; appearance: none; background: transparent !important; }
        }
      `}</style>

      {/* Header com print + título do processo */}
      <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-[#0033CC] text-white rounded-xl flex items-center justify-center flex-shrink-0">
            <ListChecks size={22} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900 m-0">Matriz RACI</h1>
            <p className="text-xs text-gray-500 m-0 mt-0.5">Responsável · Aprovador · Consultado · Informado</p>
          </div>
        </div>
        <div className="no-print flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowExemplo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
        </div>
      </div>

      {/* Nome do Processo — título em destaque (as atividades vêm abaixo na matriz) */}
      <div className="mb-6">
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Nome do Processo</label>
        <input
          type="text"
          value={data.processoNome}
          onChange={(e) => updateField('processoNome', e.target.value)}
          placeholder="Ex: Aprovação de novos fornecedores"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Matriz */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg mb-6">
        <table className="w-full text-[12px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600 sticky left-0 bg-gray-50 z-10" style={{ minWidth: 220 }}>
                Atividade
              </th>
              {data.stakeholders.map((s) => (
                <th key={s.id} className="p-1 border-b border-gray-200 align-bottom" style={{ minWidth: 90 }}>
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="text"
                      value={s.nome}
                      onChange={(e) => updateStakeholderNome(s.id, e.target.value)}
                      placeholder="Stakeholder"
                      className="w-full text-center text-[11px] font-bold px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeStakeholder(s.id)}
                      disabled={data.stakeholders.length <= 1}
                      className="no-print text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer p-0.5"
                      title="Remover stakeholder"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="no-print p-1 border-b border-gray-200" style={{ width: 50 }}>
                <button
                  onClick={addStakeholder}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md p-2 flex items-center justify-center cursor-pointer border-0"
                  title="Adicionar stakeholder (coluna)"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.atividades.map((a, idx) => {
              const warning = warnings.find(w => w?.atividadeId === a.id);
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-2 sticky left-0 bg-white z-10" style={{ minWidth: 240 }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 w-5 text-right">{idx + 1}.</span>
                      <input
                        type="text"
                        value={a.nome}
                        onChange={(e) => updateAtividadeNome(a.id, e.target.value)}
                        placeholder="Ex: Receber pedido do cliente"
                        className="flex-1 px-2 py-1 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {warning && (
                        <div title={warning.msg}>
                          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                        </div>
                      )}
                      {/* Botão deletar a LINHA — sempre visível e sempre ativo.
                          Pode deletar todas; quando a matriz fica vazia, o aluno
                          adiciona uma nova pelo botão "Adicionar atividade". */}
                      <button
                        onClick={() => removeAtividade(a.id)}
                        className="no-print shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-red-400 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 cursor-pointer transition"
                        title="Excluir esta atividade"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  {data.stakeholders.map((s) => {
                    const valor = a.raci[s.id] || '';
                    const opt = RACI_OPTIONS.find(o => o.value === valor)!;
                    return (
                      <td key={s.id} className="p-1 text-center">
                        <select
                          value={valor}
                          onChange={(e) => updateCelula(a.id, s.id, e.target.value as RaciValue)}
                          className={`w-full text-center text-[12px] font-black px-1 py-1.5 border border-gray-200 rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${opt.color}`}
                        >
                          {RACI_OPTIONS.map(o => (
                            <option key={o.value} value={o.value} className="bg-white text-gray-900 font-bold">
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="no-print">
              <td colSpan={data.stakeholders.length + 2} className="p-2">
                <button
                  onClick={addAtividade}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md py-2 cursor-pointer border-0 transition"
                >
                  <Plus size={12} /> Adicionar atividade
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Avisos de validação (não bloqueia, só destaca) */}
      {warnings.length > 0 && (
        <div className="no-print bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2">
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-800">
            <p className="font-bold m-0 mb-1">⚠ {warnings.length} atividade(s) com problema:</p>
            <ul className="m-0 pl-4 space-y-0.5">
              {warnings.map((w, i) => {
                const a = data.atividades.find(x => x.id === w!.atividadeId);
                return <li key={i}><strong>{a?.nome}</strong>: {w!.msg}</li>;
              })}
            </ul>
          </div>
        </div>
      )}

      {/* LEGENDA */}
      <div className="border-t-2 border-gray-200 pt-5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3">Legenda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RACI_LEGENDA.map(l => (
            <div key={l.letra} className={`flex items-start gap-3 p-3 rounded-lg border ${l.cor}`}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-black text-[16px] bg-white border border-current flex-shrink-0">
                {l.letra}
              </div>
              <div>
                <p className="font-black text-[12px] m-0 leading-tight">{l.nome}</p>
                <p className="text-[11px] m-0 mt-0.5 opacity-85 leading-snug">{l.descricao}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-gray-500 italic text-center">
          Regra: cada atividade tem 1 só "A" (Aprovador) e ao menos 1 "R" (Responsável). Pode ter vários C e I.
        </div>
      </div>

      {/* Save explícito — salva e limpa o estado "não-salvo" */}
      <div className="no-print flex justify-end mt-6 pt-4 border-t border-gray-200">
        <button
          data-save-trigger
          onClick={() => { onSave(data); setDirty(false); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-black uppercase tracking-widest cursor-pointer border-0 transition"
        >
          <Save size={14} /> Salvar
        </button>
      </div>

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
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
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Matriz RACI</h3>
                  <p className="text-xs text-gray-500 m-0">{RACI_EXEMPLOS[exemploIdx].processo}</p>
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
              {RACI_EXEMPLOS.map((ex, i) => (
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
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-[12px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 border-b border-gray-200 font-black uppercase tracking-wider text-[10px] text-gray-600" style={{ minWidth: 200 }}>
                        Atividade
                      </th>
                      {RACI_EXEMPLOS[exemploIdx].papeis.map((p) => (
                        <th key={p} className="p-2 border-b border-gray-200 text-center text-[11px] font-bold text-gray-700" style={{ minWidth: 90 }}>
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RACI_EXEMPLOS[exemploIdx].linhas.map((linha, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2 text-[12px] text-gray-800">
                          <span className="text-[10px] font-bold text-gray-400 mr-1.5">{idx + 1}.</span>
                          {linha.atividade}
                        </td>
                        {linha.raci.map((v, ci) => {
                          const cor =
                            v.includes('A') ? 'bg-emerald-100 text-emerald-700' :
                            v.includes('R') ? 'bg-blue-100 text-blue-700' :
                            v === 'C' ? 'bg-amber-100 text-amber-700' :
                            v === 'I' ? 'bg-violet-100 text-violet-700' :
                            'text-gray-300';
                          return (
                            <td key={ci} className="p-1 text-center">
                              <span className={`inline-block w-full py-1.5 rounded font-black text-[12px] ${cor}`}>
                                {v || '—'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  <strong>Como ler:</strong> cada linha é uma atividade; cada coluna é um papel.
                  <strong> R</strong> = executa, <strong>A</strong> = aprova (1 por linha),
                  <strong> C</strong> = consultado, <strong>I</strong> = informado.
                  "R/A" = a mesma pessoa executa e responde. Este exemplo é só pra ilustrar —
                  ele <strong>não altera</strong> a sua matriz.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
