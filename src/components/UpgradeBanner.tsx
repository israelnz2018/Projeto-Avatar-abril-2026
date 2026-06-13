/**
 * UpgradeBanner — CTA de compra do Plano Completo.
 *
 * Aparece SOMENTE para quem é plano gratuito (não admin, não coordenador).
 * Para os demais, renderiza null — então pode ser plugado no topo de qualquer
 * aba sem checagem extra no chamador.
 *
 * Link de compra: HOTMART_CHECKOUT_URL (lib/constants).
 */

import React from 'react';
import { Sparkles, ArrowRight, Unlock } from 'lucide-react';
import { useUserAccess } from '../hooks/useUserAccess';
import { HOTMART_CHECKOUT_URL } from '../lib/constants';
import { cn } from '../lib/utils';

interface UpgradeBannerProps {
  /** Frase de contexto da aba (ex: "Libere todas as ferramentas"). Opcional. */
  mensagem?: string;
  /** 'banner' (padrão, largura cheia) ou 'compact' (faixa fina). */
  variant?: 'banner' | 'compact';
  className?: string;
}

const NAVY_BLUE = 'linear-gradient(135deg, #1E2D6E 0%, #0033CC 100%)';

export default function UpgradeBanner({ mensagem, variant = 'banner', className }: UpgradeBannerProps) {
  const { plano, isAdmin, isCoordenador, loading } = useUserAccess();

  // Só para aluno gratuito.
  if (loading || isAdmin || isCoordenador || plano === 'completo') return null;

  const texto = mensagem || 'Você está no plano gratuito. Libere TODAS as trilhas, ferramentas e análises.';

  if (variant === 'compact') {
    return (
      <a
        href={HOTMART_CHECKOUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-white no-underline transition-all hover:brightness-110',
          className
        )}
        style={{ background: NAVY_BLUE }}
      >
        <span className="flex items-center gap-2 text-[12px] font-bold">
          <Sparkles size={15} className="shrink-0" />
          <span className="truncate">{texto}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#0033CC] shrink-0 group-hover:bg-white/90">
          Liberar tudo <ArrowRight size={12} />
        </span>
      </a>
    );
  }

  return (
    <div
      className={cn('rounded-2xl p-5 md:p-6 text-white relative overflow-hidden', className)}
      style={{ background: NAVY_BLUE, boxShadow: '0 12px 32px -8px rgba(0,51,204,0.4)' }}
    >
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Unlock size={22} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80 m-0">Plano Completo</p>
            <h3 className="text-white font-black text-[1.15rem] leading-tight m-0 mt-0.5">Libere a plataforma inteira</h3>
            <p className="text-white/75 text-sm m-0 mt-1 max-w-xl">{texto}</p>
          </div>
        </div>
        <a
          href={HOTMART_CHECKOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-[#0033CC] text-[12px] font-black uppercase tracking-widest hover:bg-white/90 transition-all whitespace-nowrap no-underline shrink-0"
        >
          Quero liberar tudo
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
