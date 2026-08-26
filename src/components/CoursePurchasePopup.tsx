import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, ShoppingCart, Sparkles, X } from 'lucide-react';
import type { Initiative } from '../types';
import { getCourseOfferDefaults, getCourseOfferPresentation } from '../services/courseOfferService';
import { resolveConsultorId } from '../services/consultorService';

// Degrau 2 da escada de /plataformalbw. É este o pacote certo para o upsell do
// popup — e NÃO o de R$ 597: a compra avulsa de qualquer curso já libera módulos
// do Software LBW (ver modulosSoftware em courseOfferService), e o plano de 597
// não tem Data Analysis. Apontar para ele entregaria menos do que a pessoa já
// leva no avulso. Preços espelham PLANOS em LandingPlataformaLBW.tsx.
const PACOTE = {
  nome: 'Formação Profissional + Software LBW',
  parcela: '12x de R$ 103,11',
  vista: 997,
  checkout: 'https://pay.hotmart.com/Q100793649F',
  ganhos: [
    'Todos os cursos da LBW, não só este',
    'Todos os módulos de Data Analysis',
    'Certificados de conclusão de cada curso',
  ],
};

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

  const precoCurso = Number(course?.precoVenda) || 0;
  // O pacote é produto da LBW: num subdomínio de consultor seria oferta de
  // terceiro. Mesma checagem que DataAnalysis/LearningView usam para o avulso.
  const mostrarPacote = resolveConsultorId() === 'israel' && precoCurso > 0;
  // A partir de quantos avulsos a conta passa do pacote. Só vale a pena dizer
  // se o número for pequeno o bastante para soar concreto.
  const cursosAtePagarPacote = precoCurso > 0 ? Math.ceil(PACOTE.vista / precoCurso) : 0;
  const mostrarContaAvulsa = cursosAtePagarPacote >= 2 && cursosAtePagarPacote <= 8;

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

            {/* Sem padding-bottom: quem fecha a caixa é o rodapé sticky, que
                precisa encostar na borda para não deixar conteúdo aparecendo
                por baixo enquanto rola. */}
            <div className="px-5 pt-5 sm:px-6">
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

              {mostrarPacote ? (
                <div className="my-4 overflow-hidden rounded-2xl border-2 border-[#0033CC] bg-gradient-to-br from-blue-50 to-white shadow-lg shadow-blue-100">
                  <div className="flex items-center gap-1.5 bg-[#0033CC] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                    <Sparkles size={13} /> A escolha da maioria
                  </div>
                  <div className="p-4">
                    {/* Os dois preços lado a lado: é a comparação que faz o
                        pacote parecer óbvio, não o tamanho do botão. */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">Só este curso</p>
                        <p className="mb-0 mt-1 text-[19px] font-black leading-none text-slate-700 [font-variant-numeric:tabular-nums]">
                          {formatarPreco(precoCurso)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#0033CC] bg-white px-3 py-2.5">
                        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[#0033CC]">Tudo da LBW</p>
                        <p className="mb-0 mt-1 text-[19px] font-black leading-none text-[#1E2D6E] [font-variant-numeric:tabular-nums]">
                          {PACOTE.parcela}
                        </p>
                        <p className="mb-0 mt-1 text-[11px] font-semibold leading-none text-slate-500">
                          ou {formatarPreco(PACOTE.vista)} à vista
                        </p>
                      </div>
                    </div>

                    {mostrarContaAvulsa && (
                      <p className="mb-0 mt-3 text-center text-[12px] font-bold leading-5 text-[#1E2D6E]">
                        Comprando curso por curso, {cursosAtePagarPacote} cursos já custam
                        mais do que levar tudo.
                      </p>
                    )}

                    <div className="mt-3 space-y-1.5 border-t border-blue-100 pt-3">
                      {PACOTE.ganhos.map(ganho => (
                        <div key={ganho} className="flex items-start gap-2 text-[12.5px] font-semibold leading-5 text-slate-700">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0033CC]" />
                          <span>{ganho}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`my-4 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 ${apresentacao ? 'text-center' : ''}`}>
                  <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-blue-700">Investimento</p>
                  <p className="mb-0 mt-0.5 text-2xl font-black text-[#1E2D6E]">{formatarPreco(precoCurso)}</p>
                </div>
              )}

              {/* Fica colado no rodapé enquanto o conteúdo rola — no celular a
                  ementa empurra os botões para fora da tela. */}
              <div className="sticky bottom-0 -mx-5 mt-4 border-t border-slate-100 bg-white px-5 pb-4 pt-3 sm:-mx-6 sm:px-6">
                {mostrarPacote ? (
                  <>
                    <a
                      href={PACOTE.checkout}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033CC] px-4 py-3.5 text-center text-[15px] font-black leading-tight text-white no-underline shadow-lg shadow-blue-200 transition hover:bg-[#1E2D6E]"
                    >
                      Quero tudo por {PACOTE.parcela} <ArrowRight size={18} className="shrink-0" />
                    </a>
                    <a
                      href={course.hotmartCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-[13px] font-bold leading-tight text-slate-600 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Comprar só este curso · {formatarPreco(precoCurso)}
                    </a>
                    <a
                      href="/plataformalbw"
                      className="mt-2 block text-center text-[12px] font-bold text-[#0033CC] underline underline-offset-2 hover:text-[#1E2D6E]"
                    >
                      Comparar os 3 planos da LBW
                    </a>
                  </>
                ) : (
                  <a
                    href={course.hotmartCheckoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033CC] px-4 py-3.5 text-center text-[15px] font-black leading-tight text-white no-underline shadow-lg shadow-blue-200 transition hover:bg-[#1E2D6E]"
                  >
                    Comprar agora <ExternalLink size={18} className="shrink-0" />
                  </a>
                )}
                <div className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] leading-4 text-slate-500">
                  <ShieldCheck size={15} className="shrink-0 text-emerald-600" />
                  Pagamento seguro via Hotmart e acesso após a confirmação.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
