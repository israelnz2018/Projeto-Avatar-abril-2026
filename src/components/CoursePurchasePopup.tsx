import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { Initiative } from '../types';
import { getCourseOfferDefaults, getCourseOfferPresentation } from '../services/courseOfferService';
import { resolveConsultorId } from '../services/consultorService';

// Degrau 2 da escada de /plataformalbw. É este o pacote certo para o upsell do
// popup — e NÃO o de R$ 597: a compra avulsa de qualquer curso já libera módulos
// do Software LBW (ver modulosSoftware em courseOfferService), e o plano de 597
// não tem Data Analysis. Apontar para ele entregaria menos do que a pessoa já
// leva no avulso. Preços espelham PLANOS em LandingPlataformaLBW.tsx.
const PACOTE = {
  nome: 'Tudo da LBW',
  parcela: '12x de R$ 103,11',
  vista: 997,
  checkout: 'https://pay.hotmart.com/Q100793649F',
  ganhos: [
    'Todos os cursos da LBW, não só este',
    'Todos os módulos de Data Analysis',
    'Certificado de conclusão de cada curso',
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
  const conteudo = itensConfigurados.length > 0
    ? itensConfigurados
    : (apresentacao?.ementa ?? padrao.itens);

  const precoCurso = Number(course?.precoVenda) || 0;
  // O pacote é produto da LBW: num subdomínio de consultor seria oferta de
  // terceiro dentro do produto dele. Mesma checagem que DataAnalysis e
  // LearningView usam para decidir a oferta avulsa.
  const mostrarPacote = resolveConsultorId() === 'israel' && precoCurso > 0;
  // A partir de quantos avulsos a conta passa do pacote. Só dizemos o número
  // quando ele é pequeno o bastante para soar concreto.
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
            className="relative flex max-h-[96vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1E2D6E] via-[#0033CC] to-cyan-600 px-5 py-5 text-white sm:px-6">
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10" />
              <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20">
                <X size={18} />
              </button>
              <p className="relative m-0 text-[11px] font-black uppercase tracking-widest text-blue-100">
                Curso bloqueado
              </p>
              <h2 className="relative m-0 mt-1.5 pr-10 text-[19px] font-black leading-tight sm:text-[22px]">
                {course.name}
              </h2>
              <p className="relative mb-0 mt-2 text-[13px] leading-5 text-blue-50">
                {course.descricaoVenda?.trim() || course.description?.trim() || padrao.descricao}
              </p>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <p className="mb-2.5 mt-0 text-[11px] font-black uppercase tracking-widest text-slate-400">
                O que você vai aprender
              </p>
              <div className="space-y-2">
                {conteudo.map(item => (
                  <div key={item} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-slate-700">
                    <Check size={15} strokeWidth={3} className="mt-1 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {mostrarPacote ? (
                <>
                  <p className="mb-2.5 mt-5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Como desbloquear
                  </p>

                  {/* O pacote vem primeiro e é o único destacado. Cada opção
                      carrega o próprio botão para o preço não aparecer duas
                      vezes (no card e no rótulo do botão). */}
                  <div className="overflow-hidden rounded-2xl border-2 border-[#0033CC] shadow-lg shadow-blue-100">
                    <div className="flex items-center gap-1.5 bg-[#0033CC] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                      <Sparkles size={12} /> A escolha da maioria
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-white p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-[15px] font-black text-[#1E2D6E]">{PACOTE.nome}</span>
                        <span className="text-[18px] font-black text-[#1E2D6E] [font-variant-numeric:tabular-nums]">
                          {PACOTE.parcela}
                        </span>
                      </div>
                      <p className="mb-0 mt-0.5 text-right text-[11px] font-semibold text-slate-500">
                        ou {formatarPreco(PACOTE.vista)} à vista
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {PACOTE.ganhos.map(ganho => (
                          <div key={ganho} className="flex items-start gap-2 text-[12.5px] font-semibold leading-5 text-slate-700">
                            <Check size={14} strokeWidth={3} className="mt-1 shrink-0 text-[#0033CC]" />
                            <span>{ganho}</span>
                          </div>
                        ))}
                      </div>
                      <a
                        href={PACOTE.checkout}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033CC] px-4 py-3 text-center text-[14px] font-black leading-tight text-white no-underline shadow-md shadow-blue-200 transition hover:bg-[#1E2D6E]"
                      >
                        Quero tudo da LBW <ArrowRight size={17} className="shrink-0" />
                      </a>
                    </div>
                  </div>

                  <div className="mt-2.5 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-[15px] font-black text-slate-700">Só este curso</span>
                      <span className="text-[18px] font-black text-slate-700 [font-variant-numeric:tabular-nums]">
                        {formatarPreco(precoCurso)}
                      </span>
                    </div>
                    {apresentacao && (
                      <p className="mb-0 mt-1.5 text-[12px] leading-5 text-slate-500">
                        {apresentacao.tituloPacote}
                      </p>
                    )}
                    {mostrarContaAvulsa && (
                      <p className="mb-0 mt-2 text-[12px] font-bold leading-5 text-[#1E2D6E]">
                        Comprando curso por curso, {cursosAtePagarPacote} cursos já custam mais
                        do que levar tudo.
                      </p>
                    )}
                    <a
                      href={course.hotmartCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-[13px] font-bold leading-tight text-slate-600 no-underline transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Comprar só este curso
                    </a>
                  </div>

                  <a
                    href="/plataformalbw"
                    className="mt-3 block text-center text-[12px] font-bold text-[#0033CC] underline underline-offset-2 transition hover:text-[#1E2D6E]"
                  >
                    Comparar os 3 planos da LBW
                  </a>
                </>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Investimento</span>
                    <span className="text-[22px] font-black text-[#1E2D6E] [font-variant-numeric:tabular-nums]">
                      {formatarPreco(precoCurso)}
                    </span>
                  </div>
                  <a
                    href={course.hotmartCheckoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033CC] px-4 py-3 text-center text-[14px] font-black leading-tight text-white no-underline shadow-md shadow-blue-200 transition hover:bg-[#1E2D6E]"
                  >
                    Comprar agora <ArrowRight size={17} className="shrink-0" />
                  </a>
                </>
              )}

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
