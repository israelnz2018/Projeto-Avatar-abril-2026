import { useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Escolher UM X por vez, a partir da lista trazida da ferramenta de origem.
 *
 * Existe compartilhado porque as tres ferramentas que trabalham em cima da lista
 * de X — Observacao Direta, Mapa Estatístico e 5 Porques — seguem o mesmo
 * caminho: o aluno escolhe uma variavel, aperta o botao, e SO ENTAO aparece o
 * campo pra preencher sobre aquela. Nunca as 18 de uma vez.
 *
 * O componente nao aparece enquanto a lista estiver vazia — ou seja, enquanto o
 * aluno nao tiver apertado o botao verde de migrar. E o que evita dois blocos
 * verdes competindo na tela.
 */

export interface VariavelDisponivel {
  variable: string;
  definition?: string;
}

interface Props {
  /** Lista trazida da origem (Espinha de Peixe, Matriz Causa e Efeito...). */
  disponiveis: VariavelDisponivel[];
  /** Variaveis que o aluno ja trouxe — ficam marcadas e bloqueadas. */
  jaUsadas: string[];
  /** Chamado ao apertar o botao, com a variavel escolhida. */
  onAdicionar: (variavel: VariavelDisponivel) => void;
  titulo: string;
  descricao: string;
  rotuloBotao?: string;
}

export default function SeletorDeVariavelX({
  disponiveis,
  jaUsadas,
  onAdicionar,
  titulo,
  descricao,
  rotuloBotao = 'Trazer esta variável',
}: Props) {
  const [escolhida, setEscolhida] = useState('');

  if (disponiveis.length === 0) return null;

  const usadas = new Set(jaUsadas.map((v) => v.trim()).filter(Boolean));
  const jaFoi = (v: VariavelDisponivel) => usadas.has(v.variable.trim());
  const total = disponiveis.length;
  const feitas = disponiveis.filter(jaFoi).length;

  const adicionar = () => {
    const alvo = disponiveis.find((v) => v.variable === escolhida);
    if (!alvo || jaFoi(alvo)) return;
    onAdicionar(alvo);
    setEscolhida('');
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Search size={18} />
        </div>
        <div>
          <h4 className="font-black text-emerald-900 m-0">{titulo}</h4>
          <p className="text-sm text-emerald-800/80 mt-1 mb-0">{descricao}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <select
          value={escolhida}
          onChange={(e) => setEscolhida(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-emerald-200 bg-white text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">Selecione uma variável...</option>
          {disponiveis.map((v) => (
            <option key={v.variable} value={v.variable} disabled={jaFoi(v)}>
              {jaFoi(v) ? '✓ ' : ''}{v.variable}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={adicionar}
          disabled={!escolhida}
          className="px-5 py-3 rounded-xl border-0 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          {rotuloBotao}
        </button>
      </div>

      <p className="text-[11px] text-emerald-800/70 m-0">
        {feitas} de {total} já trazidas. As já trazidas aparecem com ✓ e ficam bloqueadas na lista.
      </p>
    </div>
  );
}
