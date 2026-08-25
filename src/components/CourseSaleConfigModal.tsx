import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Save, ShoppingCart, X } from 'lucide-react';
import type { Initiative } from '../types';
import { getCourseOfferDefaults } from '../services/courseOfferService';

export type CourseSaleConfig = Pick<Initiative,
  'vendaAtiva' | 'precoVenda' | 'hotmartCheckoutUrl' | 'descricaoVenda' | 'itensInclusos'
>;

interface CourseSaleConfigModalProps {
  course: Initiative | null;
  saving: boolean;
  onClose: () => void;
  onSave: (config: CourseSaleConfig) => Promise<void>;
}

export function CourseSaleConfigModal({ course, saving, onClose, onSave }: CourseSaleConfigModalProps) {
  const [vendaAtiva, setVendaAtiva] = useState(false);
  const [preco, setPreco] = useState('');
  const [checkout, setCheckout] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!course) return;
    const padrao = getCourseOfferDefaults(course.name);
    setVendaAtiva(course.vendaAtiva === true);
    setPreco(typeof course.precoVenda === 'number'
      ? String(course.precoVenda).replace('.', ',')
      : (typeof padrao.precoSugerido === 'number' ? String(padrao.precoSugerido) : ''));
    setCheckout(course.hotmartCheckoutUrl || padrao.checkoutSugerido || '');
    setDescricao(course.descricaoVenda || course.description || padrao.descricao);
    setItens(Array.isArray(course.itensInclusos) && course.itensInclusos.length > 0 ? course.itensInclusos.join('\n') : padrao.itens.join('\n'));
    setErro('');
  }, [course]);

  if (!course) return null;

  const salvar = async () => {
    const precoNumero = Number(preco.replace(/\./g, '').replace(',', '.'));
    const checkoutLimpo = checkout.trim();
    if (vendaAtiva && (!Number.isFinite(precoNumero) || precoNumero <= 0)) {
      setErro('Informe um preço maior que zero.');
      return;
    }
    if (vendaAtiva) {
      try {
        const url = new URL(checkoutLimpo);
        if (url.protocol !== 'https:' || url.hostname !== 'pay.hotmart.com') throw new Error();
      } catch {
        setErro('Informe o link completo do checkout: https://pay.hotmart.com/...');
        return;
      }
    }
    const itensInclusos = itens.split('\n').map(item => item.trim()).filter(Boolean);
    if (vendaAtiva && itensInclusos.length === 0) {
      setErro('Informe pelo menos um item que o aluno receberá.');
      return;
    }
    setErro('');
    await onSave({
      vendaAtiva,
      precoVenda: Number.isFinite(precoNumero) ? precoNumero : 0,
      hotmartCheckoutUrl: checkoutLimpo,
      descricaoVenda: descricao.trim(),
      itensInclusos,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55" onClick={saving ? undefined : onClose} />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <button onClick={onClose} disabled={saving} aria-label="Fechar" className="absolute right-4 top-4 border-none bg-transparent p-1 text-gray-400 hover:text-gray-700 disabled:opacity-40">
          <X size={22} />
        </button>
        <div className="mb-5 flex items-start gap-3 pr-8">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><ShoppingCart size={24} /></div>
          <div>
            <h2 className="m-0 text-xl font-black text-gray-900">Venda do curso na Hotmart</h2>
            <p className="mb-0 mt-1 text-sm text-gray-500">{course.name}</p>
          </div>
        </div>

        <label className="mb-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div>
            <strong className="block text-sm text-gray-900">Mostrar botão de compra para alunos sem acesso</strong>
            <span className="text-xs text-gray-500">Desative para voltar ao pedido de acesso ao consultor.</span>
          </div>
          <input type="checkbox" checked={vendaAtiva} onChange={event => setVendaAtiva(event.target.checked)} className="h-5 w-5 accent-blue-700" />
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase text-gray-500">Preço em reais</span>
            <input value={preco} onChange={event => setPreco(event.target.value)} inputMode="decimal" placeholder="Ex: 297,00" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-black uppercase text-gray-500">Link do checkout Hotmart</span>
            <div className="flex gap-2">
              <input value={checkout} onChange={event => setCheckout(event.target.value)} placeholder="https://pay.hotmart.com/..." className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
              {checkout.startsWith('https://pay.hotmart.com/') && <a href={checkout} target="_blank" rel="noreferrer" title="Abrir checkout" className="grid w-11 place-items-center rounded-lg border border-gray-300 text-blue-700"><ExternalLink size={17} /></a>}
            </div>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-black uppercase text-gray-500">Apresentação curta</span>
          <textarea value={descricao} onChange={event => setDescricao(event.target.value.slice(0, 500))} rows={3} placeholder="Explique de forma direta o resultado que o aluno alcançará." className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
          <span className="block text-right text-[11px] text-gray-400">{descricao.length}/500</span>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-black uppercase text-gray-500">O que o aluno receberá</span>
          <textarea value={itens} onChange={event => setItens(event.target.value)} rows={6} placeholder={'Curso completo com videoaulas\nExercícios práticos\nSoftware estatístico\nCertificado ao concluir'} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
          <span className="text-[11px] text-gray-400">Escreva um item por linha. Esses itens aparecerão no modal de compra.</span>
        </label>

        {erro && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{erro}</p>}

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40">Cancelar</button>
          <button onClick={salvar} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border-none bg-blue-700 px-5 py-2.5 font-bold text-white hover:bg-blue-800 disabled:opacity-50">
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {saving ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </div>
      </div>
    </div>
  );
}
