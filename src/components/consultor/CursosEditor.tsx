/**
 * CursosEditor — editor único de acesso a cursos. O coordenador é tratado como um
 * aluno: mesma lista, mesma mecânica de marcar/desmarcar, editar e deletar.
 * A única diferença é a coluna "acessos" (cota de vagas que o coordenador
 * distribui pro time dele), ligada por `comAcessos`.
 */
import React from 'react';

export interface CursoSel { vencimento: string; valor: string; quantidade: string }
export type CursosSel = Record<string, CursoSel>;

export const dataPadrao = () => new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
export const moedaParaNumero = (valor: string) => Number(String(valor || '0').replace(',', '.')) || 0;
export const formatMoney = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** cursosAcesso do Firestore -> estado do editor. */
export function selDeCursosAcesso(lista: any[]): CursosSel {
  const sel: CursosSel = {};
  (Array.isArray(lista) ? lista : []).forEach((c) => {
    const curso = String(c?.curso || '').trim();
    if (!curso) return;
    sel[curso] = {
      vencimento: c?.vencimento ? String(c.vencimento).slice(0, 10) : dataPadrao(),
      valor: c?.valor ? String(c.valor).replace('.', ',') : '',
      quantidade: c?.quantidade ? String(c.quantidade) : '',
    };
  });
  return sel;
}

/** Estado do editor -> payload do Firestore + totais SEMPRE calculados (nunca digitados). */
export function resumoDaSel(sel: CursosSel, comAcessos?: boolean) {
  const cursosAcesso = Object.entries(sel).map(([curso, v]) => ({
    curso,
    vencimento: v.vencimento || null,
    valor: moedaParaNumero(v.valor),
    ...(comAcessos ? { quantidade: Number(v.quantidade) || 0 } : {}),
  }));
  const datas = cursosAcesso.map((c) => c.vencimento).filter(Boolean) as string[];
  return {
    cursosAcesso,
    totalAcessos: cursosAcesso.reduce((s, c: any) => s + (Number(c.quantidade) || 0), 0),
    totalValor: cursosAcesso.reduce((s, c) => s + c.valor, 0),
    vencimentoGeral: datas.length ? datas.sort().at(-1)! : '',
  };
}

/** Valida antes de salvar. Retorna a mensagem de erro ou '' se estiver ok. */
export function validarSel(sel: CursosSel, comAcessos?: boolean): string {
  const itens = Object.entries(sel);
  if (itens.length === 0) return 'Escolha ao menos um curso.';
  if (itens.some(([, v]) => !v.vencimento)) return 'Informe a expiração de cada curso selecionado.';
  if (comAcessos && itens.some(([, v]) => (Number(v.quantidade) || 0) <= 0)) {
    return 'Informe a quantidade de acessos de cada curso selecionado.';
  }
  return '';
}

export default function CursosEditor({ catalogo, sel, onChange, comAcessos }: {
  catalogo: string[];
  sel: CursosSel;
  onChange: (s: CursosSel) => void;
  /** Coordenador: mostra a coluna de cota de acessos por curso. Aluno: oculta. */
  comAcessos?: boolean;
}) {
  const patch = (curso: string, campo: keyof CursoSel, valor: string) =>
    onChange({ ...sel, [curso]: { ...sel[curso], [campo]: valor } });

  const toggle = (curso: string) => {
    if (sel[curso]) {
      const { [curso]: _fora, ...resto } = sel;
      onChange(resto);
      return;
    }
    onChange({ ...sel, [curso]: { vencimento: dataPadrao(), valor: '', quantidade: comAcessos ? '1' : '' } });
  };

  const todos = () => onChange(Object.fromEntries(catalogo.map((curso) => [
    curso, sel[curso] || { vencimento: dataPadrao(), valor: '', quantidade: comAcessos ? '1' : '' },
  ])));

  const input = 'border border-gray-300 rounded-lg px-2 py-1.5 text-xs disabled:bg-gray-100';
  const colunas = comAcessos ? 'md:grid-cols-[minmax(0,1fr)_110px_120px_150px]' : 'md:grid-cols-[minmax(0,1fr)_120px_150px]';

  return (
    <div>
      {catalogo.length > 0 && (
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={todos} className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">Selecionar todos</button>
          <button type="button" onClick={() => onChange({})} className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">Limpar seleção</button>
        </div>
      )}
      <div className="space-y-2">
        {catalogo.length === 0 && <span className="text-xs text-gray-400">Nenhum curso cadastrado ainda.</span>}
        {catalogo.map((curso) => {
          const on = !!sel[curso];
          const v = sel[curso];
          return (
            <div key={curso} className={`grid gap-2 rounded-xl border p-3 ${colunas} ${on ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <label className="flex min-w-0 items-center gap-2 text-sm font-bold text-gray-800">
                <input type="checkbox" checked={on} onChange={() => toggle(curso)} className="h-4 w-4" />
                <span className="truncate">{curso}</span>
              </label>
              {comAcessos && (
                <input value={v?.quantidade || ''} disabled={!on} placeholder="Acessos" className={input}
                  onChange={(e) => patch(curso, 'quantidade', e.target.value.replace(/\D/g, ''))} />
              )}
              <input value={v?.valor || ''} disabled={!on} placeholder="Valor R$" className={input}
                onChange={(e) => patch(curso, 'valor', e.target.value.replace(/[^\d.,]/g, ''))} />
              <input type="date" value={v?.vencimento || ''} disabled={!on} className={input}
                onChange={(e) => patch(curso, 'vencimento', e.target.value)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
