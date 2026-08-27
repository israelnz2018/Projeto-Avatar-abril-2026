import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, LayoutGrid, ShieldCheck, X } from 'lucide-react';
import type { Initiative } from '../types';
import { getCourseOfferDefaults, getCourseOfferPresentation } from '../services/courseOfferService';
import { resolveConsultorId } from '../services/consultorService';

interface CoursePurchasePopupProps {
  course: Initiative | null;
  onClose: () => void;
  videoCount?: number;
}

const formatarPreco = (valor: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(valor);

/**
 * Popup único de conteúdo bloqueado. Estrutura fixa, igual para todo curso e
 * todo módulo de análise:
 *   nome do curso -> detalhes do conteúdo -> preço unitário -> pacotes.
 * O foco é o produto que a pessoa clicou; os pacotes são um segundo caminho,
 * nunca a vitrine principal.
 */
export function CoursePurchasePopup({ course, onClose, videoCount = 0 }: CoursePurchasePopupProps) {
  const aberto = Boolean(course);
  const itensConfigurados = Array.isArray(course?.itensInclusos)
    ? course.itensInclusos.map(item => String(item).trim()).filter(Boolean)
    : [];
  const padrao = getCourseOfferDefaults(course?.name || '', videoCount);
  const apresentacao = getCourseOfferPresentation(course?.name || '');
  const recebeAMais = apresentacao?.recebeAMais ?? [];
  const continuaraAcessando = apresentacao?.continuaraAcessando;
  const usaEstruturaPadronizada = recebeAMais.length > 0;
  // Ementa real quando existe; itens do consultor têm prioridade sobre ela.
  const conteudo = itensConfigurados.length > 0
    ? itensConfigurados
    : (apresentacao?.ementa ?? padrao.itens);

  const precoCurso = Number(course?.precoVenda) || 0;
  const checkoutCurso = String(course?.hotmartCheckoutUrl || '');
  const temOfertaAvulsa = precoCurso > 0 && checkoutCurso.startsWith('https://pay.hotmart.com/');
  // /plataformalbw é página da LBW: num subdomínio de consultor seria mandar o
  // aluno dele para a oferta de outra pessoa.
  const mostrarPacotes = resolveConsultorId() === 'israel';

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
            key={course.id || course.name}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative flex max-h-[96vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* 1. Nome do curso */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#1E2D6E] via-[#0033CC] to-cyan-600 px-5 py-5 text-white sm:px-6">
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10" />
              <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20">
                <X size={18} />
              </button>
              <h2 className="relative m-0 pr-10 text-[19px] font-black leading-tight sm:text-[22px]">
                {course.name}
              </h2>
              <p className="relative mb-0 mt-2 text-[13px] leading-5 text-blue-50">
                {course.descricaoVenda?.trim() || course.description?.trim() || padrao.descricao}
              </p>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
              {/* 2. Detalhes do conteúdo */}
              {usaEstruturaPadronizada && (
                <>
                  <p className="mb-2.5 mt-0 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    O que você receberá a mais
                  </p>
                  <div className="space-y-2">
                    {recebeAMais.map(item => (
                      <div key={item} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-slate-700">
                        <Check size={15} strokeWidth={3} className="mt-1 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {conteudo.length > 0 && (
                <>
                  <p className={`mb-2.5 text-[11px] font-black uppercase tracking-widest text-slate-400 ${usaEstruturaPadronizada ? 'mt-4' : 'mt-0'}`}>
                    {usaEstruturaPadronizada ? 'Conteúdo principal' : 'O que você vai aprender'}
                  </p>
                  <div className="space-y-2">
                    {conteudo.map(item => (
                      <div key={item} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-slate-700">
                        <Check size={15} strokeWidth={3} className="mt-1 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {continuaraAcessando && (
                <p className="mb-0 mt-4 text-[12px] leading-5 text-slate-500">
                  <strong className="text-slate-700">Você continuará acessando:</strong> {continuaraAcessando}
                </p>
              )}

              {/* 3. Preço unitário + compra do curso */}
              {temOfertaAvulsa && (
                <>
                  <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-center">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Investimento</span>
                    <span className="whitespace-nowrap text-[21px] font-black text-[#1E2D6E] [font-variant-numeric:tabular-nums]">
                      {formatarPreco(precoCurso)}
                    </span>
                  </div>
                  <a
                    href={checkoutCurso}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033CC] px-4 py-3.5 text-center text-[14.5px] font-black leading-tight text-white no-underline shadow-md shadow-blue-200 transition hover:bg-[#1E2D6E]"
                  >
                    Comprar agora <ArrowRight size={17} className="shrink-0" />
                  </a>
                </>
              )}

              {/* 4. Pacotes, sempre como segundo caminho */}
              {mostrarPacotes && (
                <a
                  href="/plataformalbw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center text-[13.5px] font-black leading-tight no-underline transition ${
                    temOfertaAvulsa
                      ? 'mt-2.5 border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                      // Sem oferta avulsa este é o único caminho: ganha o peso do botão principal.
                      : 'mt-5 border-[#0033CC] bg-[#0033CC] text-white shadow-md shadow-blue-200 hover:bg-[#1E2D6E]'
                  }`}
                >
                  <LayoutGrid size={16} className="shrink-0" />
                  Conhecer pacotes disponíveis
                </a>
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
