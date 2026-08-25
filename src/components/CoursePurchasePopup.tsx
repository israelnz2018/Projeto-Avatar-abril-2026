import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ExternalLink, ShieldCheck, ShoppingCart, X } from 'lucide-react';
import type { Initiative } from '../types';
import { getCourseOfferDefaults, getCourseOfferPresentation } from '../services/courseOfferService';

interface CoursePurchasePopupProps {
  course: Initiative | null;
  onClose: () => void;
  videoCount?: number;
}

const formatarPreco = (valor: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(valor);

export function CoursePurchasePopup({ course, onClose, videoCount = 0 }: CoursePurchasePopupProps) {
  const aberto = Boolean(course);
  const itensConfigurados = Array.isArray(course?.itensInclusos)
    ? course.itensInclusos.map(item => String(item).trim()).filter(Boolean)
    : [];
  const padrao = getCourseOfferDefaults(course?.name || '', videoCount);
  const apresentacao = getCourseOfferPresentation(course?.name || '');
  const itens = itensConfigurados.length > 0 ? itensConfigurados : padrao.itens;

  return (
    <AnimatePresence>
      {aberto && course && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-3">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative max-h-[96vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-blue-100 bg-white shadow-2xl"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1E2D6E] via-[#0033CC] to-cyan-600 px-6 py-5 text-white">
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10" />
              <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20">
                <X size={20} />
              </button>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                <ShoppingCart size={14} /> {apresentacao ? 'Amplie seu acesso à LBW' : 'Curso disponível'}
              </div>
              <h2 className="relative m-0 pr-7 text-xl font-black leading-tight sm:text-[22px]">{course.name}</h2>
              <p className="relative mb-0 mt-2 text-[13px] leading-5 text-blue-50">
                {course.descricaoVenda?.trim() || course.description?.trim() || padrao.descricao}
              </p>
            </div>

            <div className="p-5 sm:px-6">
              {apresentacao ? (
                <>
                  <p className="mb-2 mt-0 text-[11px] font-black uppercase tracking-widest text-slate-500">O que você receberá a mais</p>
                  <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-[13px] font-black leading-5 text-[#1E2D6E]">
                    {apresentacao.tituloPacote}
                  </div>
                  <p className="mb-2 mt-0 text-[11px] font-black uppercase tracking-widest text-slate-500">Conteúdo do curso</p>
                  <div className="space-y-1.5">
                    {apresentacao.ementa.map(item => (
                      <div key={item} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-slate-700">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-[12px] leading-5 text-slate-600">
                    <strong className="text-slate-700">Você continuará tendo acesso a:</strong><br />
                    {apresentacao.acessosMantidos.join(' · ')}
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-2 mt-0 text-[11px] font-black uppercase tracking-widest text-slate-500">O que você receberá</p>
                  <div className="space-y-2">
                    {itens.map(item => (
                      <div key={item} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-slate-700">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className={`my-4 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 ${apresentacao ? 'text-center' : ''}`}>
                <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-blue-700">Investimento</p>
                <p className="mb-0 mt-0.5 text-2xl font-black text-[#1E2D6E]">{formatarPreco(Number(course.precoVenda) || 0)}</p>
              </div>

              <a
                href={course.hotmartCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033CC] px-5 py-3 text-center text-sm font-black text-white no-underline shadow-lg shadow-blue-200 transition hover:bg-[#1E2D6E]"
              >
                Comprar agora <ExternalLink size={18} />
              </a>
              <div className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
                <ShieldCheck size={16} className="text-emerald-600" />
                Pagamento seguro via Hotmart e acesso após a confirmação.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
