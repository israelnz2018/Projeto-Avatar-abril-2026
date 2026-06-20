/**
 * GuidedTour — motor genérico de tour guiado (reutilizável em qualquer aba).
 * Extraído do DataAnalysisTour pra padronizar o tour em todo o app.
 *
 * Como funciona:
 *   1. Overlay escuro cobre a tela
 *   2. SVG mask cria um "furo" iluminado em volta do elemento alvo
 *   3. Anel azul destaca o alvo + tooltip ao lado explica
 *   4. Auto-scroll traz o alvo pra viewport
 *
 * Cada elemento alvo na aba tem `data-tour-id="..."`. Passos que apontam pra um
 * alvo inexistente (ex: ferramenta não carregada) são PULADOS automaticamente.
 *
 * Disparo automático e botão "rever" ficam no useTour (ver useTour.ts).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

function computeTooltipPosition(
  rect: DOMRect | null,
  position: 'top' | 'bottom' | 'left' | 'right',
): { top: number; left: number } {
  if (!rect) return { top: 100, left: 100 };
  const TOOLTIP_WIDTH = 320;
  const TOOLTIP_HEIGHT = 180;
  const PAD = 16;
  let top = 100;
  let left = 100;
  switch (position) {
    case 'bottom':
      top = rect.bottom + PAD;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'top':
      top = rect.top - TOOLTIP_HEIGHT - PAD;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = rect.left - TOOLTIP_WIDTH - PAD;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = rect.right + PAD;
      break;
  }
  left = Math.max(PAD, Math.min(window.innerWidth - TOOLTIP_WIDTH - PAD, left));
  top = Math.max(PAD, Math.min(window.innerHeight - TOOLTIP_HEIGHT - PAD, top));
  return { top, left };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  steps: TourStep[];
}

export default function GuidedTour({ isOpen, onClose, steps }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Só considera os passos cujo alvo existe no DOM (pula itens ausentes).
  const visibleSteps = useMemo(
    () => (isOpen ? steps.filter(s => document.querySelector(s.selector)) : steps),
    [isOpen, steps],
  );
  const safeSteps = visibleSteps.length > 0 ? visibleSteps : steps;

  const measure = useCallback(() => {
    const step = safeSteps[stepIdx];
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    requestAnimationFrame(() => setRect(getRect(step.selector)));
  }, [stepIdx, safeSteps]);

  useEffect(() => {
    if (!isOpen) { setStepIdx(0); return; }
    measure();
    window.addEventListener('resize', measure);
    const scrollListener = () => measure();
    window.addEventListener('scroll', scrollListener, true);
    const interval = setInterval(measure, 300);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', scrollListener, true);
      clearInterval(interval);
    };
  }, [isOpen, measure]);

  if (!isOpen) return null;

  const step = safeSteps[stepIdx];
  if (!step) return null;
  const isLast = stepIdx === safeSteps.length - 1;
  const isFirst = stepIdx === 0;

  const finish = () => { setStepIdx(0); onClose(); };
  const next = () => { if (isLast) finish(); else setStepIdx(s => s + 1); };
  const prev = () => setStepIdx(s => Math.max(0, s - 1));

  const PAD = 10;
  const tooltipPos = computeTooltipPosition(rect, step.position || 'bottom');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200]"
      >
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="tour-spotlight">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect x={rect.left - PAD} y={rect.top - PAD} width={rect.width + 2 * PAD} height={rect.height + 2 * PAD} rx="12" fill="black" />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.78)" mask="url(#tour-spotlight)" />
          {rect && (
            <rect
              x={rect.left - PAD} y={rect.top - PAD}
              width={rect.width + 2 * PAD} height={rect.height + 2 * PAD}
              rx="12" fill="none" stroke="#0033CC" strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 16px rgba(0, 51, 204, 0.8))' }}
            />
          )}
        </svg>

        {rect && (
          <motion.div
            key={stepIdx}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="absolute z-[201] bg-white rounded-2xl shadow-2xl border border-blue-100"
            style={{ top: tooltipPos.top, left: tooltipPos.left, width: 320 }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {safeSteps.map((_, i) => (
                    <span
                      key={i}
                      className="block h-1 rounded-full transition-all"
                      style={{
                        width: i === stepIdx ? 18 : 6,
                        background: i === stepIdx ? '#0033CC' : i < stepIdx ? '#93C5FD' : '#E5E7EB',
                      }}
                    />
                  ))}
                </div>
                <button onClick={finish} className="text-gray-400 hover:text-gray-700 border-none bg-transparent cursor-pointer p-1" title="Pular tour">
                  <X size={16} />
                </button>
              </div>
              <h3 className="text-[16px] font-black text-slate-800 m-0 mb-2 leading-tight">{step.title}</h3>
              <p className="text-[13px] text-slate-600 leading-relaxed m-0 mb-4">{step.description}</p>
              <div className="flex items-center justify-between gap-2">
                <button onClick={prev} disabled={isFirst} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border-none bg-transparent cursor-pointer flex items-center gap-1 transition-colors">
                  <ChevronLeft size={14} /> Voltar
                </button>
                <span className="text-[10px] font-bold text-slate-400">{stepIdx + 1} / {safeSteps.length}</span>
                <button onClick={next} className="px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white border-none cursor-pointer flex items-center gap-1 transition-colors shadow-md">
                  {isLast ? 'Concluir' : 'Próximo'}
                  {!isLast && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
