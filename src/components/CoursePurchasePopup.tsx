import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, ChevronRight, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { Initiative } from '../types';
import { getCourseOfferDefaults, getCourseOfferPresentation } from '../services/courseOfferService';
import { resolveConsultorId } from '../services/consultorService';
import { PLANOS_LBW, PLANO_DESTAQUE } from '../services/planosLBW';

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

  // Só listamos conteúdo quando ele é REAL (ementa do curso ou itens que o
  // consultor cadastrou). O padrão genérico de getCourseOfferDefaults promete
  // módulos do Software LBW, o que seria falso para um curso de trilha.
  const conteudo = itensConfigurados.length > 0 ? itensConfigurados : (apresentacao?.ementa ?? []);

  const precoCurso = Number(course?.precoVenda) || 0;
  const checkoutCurso = String(course?.hotmartCheckoutUrl || '');
  const temOfertaAvulsa = precoCurso > 0 && checkoutCurso.startsWith('https://pay.hotmart.com/');

  // Os planos são produto da LBW: num subdomínio de consultor seriam oferta de
  // terceiro dentro do produto dele.
  const mostrarPlanos = resolveConsultorId() === 'israel';

  // A partir de quantos avulsos a conta passa do plano destacado. Só dizemos o
  // número quando ele é pequeno o bastante para soar concreto.
  const planoDestaque = PLANOS_LBW.find(p => p.id === PLANO_DESTAQUE) ?? PLANOS_LBW[PLANOS_LBW.length - 1];
  const cursosAtePagarPlano = precoCurso > 0 ? Math.ceil(planoDestaque.vista / precoCurso) : 0;
  const mostrarContaAvulsa = temOfertaAvulsa && cursosAtePagarPlano >= 2 && cursosAtePagarPlano <= 8;

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
            className="relative flex max-h-[96vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1E2D6E] via-[#0033CC] to-cyan-600 px-5 py-5 text-white sm:px-6">
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10" />
              <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20">
                <X size={18} />
              </button>
              <p className="relative m-0 text-[11px] font-black uppercase tracking-widest text-blue-100">
                Conteúdo bloqueado
              </p>
              <h2 className="relative m-0 mt-1.5 pr-10 text-[19px] font-black leading-tight sm:text-[22px]">
                {course.name}
              </h2>
              <p className="relative mb-0 mt-2 text-[13px] leading-5 text-blue-50">
                {course.descricaoVenda?.trim() || course.description?.trim() || padrao.descricao}
              </p>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {conteudo.length > 0 && (
                <>
                  <p className="mb-2.5 mt-0 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    O que você vai aprender
                  </p>
                  <div className="mb-5 space-y-2">
                    {conteudo.map(item => (
                      <div key={item} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-slate-700">
                        <Check size={15} strokeWidth={3} className="mt-1 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {mostrarPlanos ? (
                <>
                  <p className="mb-2.5 mt-0 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Escolha seu acesso
                  </p>

                  {/* Cada plano É o botão: o card inteiro é clicável. Sem botão
                      separado, o preço aparece uma vez só e o alvo de toque no
                      celular é a linha toda. */}
                  <div className="space-y-2.5">
                    {PLANOS_LBW.map(plano => {
                      const destaque = plano.id === PLANO_DESTAQUE;
                      return (
                        <a
                          key={plano.id}
                          href={plano.checkout}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block overflow-hidden rounded-2xl no-underline transition ${
                            destaque
                              ? 'border-2 border-[#0033CC] shadow-lg shadow-blue-100 hover:shadow-xl'
                              : 'border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {destaque && (
                            <div className="flex items-center gap-1.5 bg-[#0033CC] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                              <Sparkles size={12} /> A escolha da maioria
                            </div>
                          )}
                          <div className={`flex items-center gap-3 p-4 ${destaque ? 'bg-gradient-to-br from-blue-50 to-white' : 'bg-white'}`}>
                            <div className="min-w-0 flex-1">
                              <p className={`m-0 text-[14.5px] font-black leading-tight ${destaque ? 'text-[#1E2D6E]' : 'text-slate-700'}`}>
                                {plano.nome}
                              </p>
                              <p className="mb-0 mt-1 text-[12px] leading-4 text-slate-500">{plano.resumo}</p>
                              <p className={`mb-0 mt-2 text-[15px] font-black leading-none [font-variant-numeric:tabular-nums] ${destaque ? 'text-[#0033CC]' : 'text-slate-700'}`}>
                                {plano.parcela}
                              </p>
                              <p className="mb-0 mt-1 text-[11px] font-semibold leading-none text-slate-500">
                                {plano.precoDe && (
                                  <s className="mr-1 text-slate-400">{formatarPreco(plano.precoDe)}</s>
                                )}
                                ou {formatarPreco(plano.vista)} à vista
                              </p>
                            </div>
                            <ChevronRight size={20} className={`shrink-0 ${destaque ? 'text-[#0033CC]' : 'text-slate-400'}`} />
                          </div>
                        </a>
                      );
                    })}
                  </div>

                  {temOfertaAvulsa && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <a
                        href={checkoutCurso}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[13px] font-black leading-tight text-slate-700">
                            Ou compre só este curso
                          </p>
                          {apresentacao && (
                            <p className="mb-0 mt-1 text-[11.5px] leading-4 text-slate-500">
                              {apresentacao.tituloPacote}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[15px] font-black text-slate-700 [font-variant-numeric:tabular-nums]">
                          {formatarPreco(precoCurso)}
                        </span>
                      </a>
                      {mostrarContaAvulsa && (
                        <p className="mb-0 mt-2 text-center text-[11.5px] font-bold leading-4 text-[#1E2D6E]">
                          Comprando curso por curso, {cursosAtePagarPlano} cursos já custam mais
                          do que levar tudo.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : temOfertaAvulsa ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Investimento</span>
                    <span className="text-[22px] font-black text-[#1E2D6E] [font-variant-numeric:tabular-nums]">
                      {formatarPreco(precoCurso)}
                    </span>
                  </div>
                  <a
                    href={checkoutCurso}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033CC] px-4 py-3 text-center text-[14px] font-black leading-tight text-white no-underline shadow-md shadow-blue-200 transition hover:bg-[#1E2D6E]"
                  >
                    Comprar agora <ArrowRight size={17} className="shrink-0" />
                  </a>
                </>
              ) : null}

              <div className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[11px] leading-4 text-slate-400">
                <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
                Pagamento seguro via Hotmart e acesso após a confirmação.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
