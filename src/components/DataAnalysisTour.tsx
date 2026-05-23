/**
 * DataAnalysisTour — guided tour da aba Data & Analysis (8 passos).
 *
 * Como funciona:
 *   1. Overlay escuro cobre a tela inteira
 *   2. SVG mask cria um "furo" iluminado em volta do elemento alvo
 *   3. Anel azul brilhante destaca o alvo
 *   4. Tooltip ao lado explica o que fazer
 *   5. Auto-scroll pra que o alvo apareça
 *
 * Cada elemento alvo no DataAnalysis tem `data-tour-id="..."`.
 * Esse componente lê via querySelector — desacoplado do DOM interno.
 *
 * Estado:
 *   - Auto-mostra na 1ª visita (localStorage flag 'analysis-tour-seen')
 *   - Reinicia via botão "?" na página
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: TourStep[] = [
  {
    id: 'upload',
    selector: '[data-tour-id="upload"]',
    title: '1 · Suba sua planilha',
    description: 'Clique aqui e selecione um arquivo .xlsx com os dados que você quer analisar.',
    position: 'bottom',
  },
  {
    id: 'sheet',
    selector: '[data-tour-id="sheet"]',
    title: '2 · Escolha a aba',
    description: 'Cada Excel pode ter várias abas. Selecione a que contém seus dados.',
    position: 'bottom',
  },
  {
    id: 'menu',
    selector: '[data-tour-id="menu"]',
    title: '3 · Escolha a análise',
    description: 'Passe o mouse pelas categorias do topo. Comece pela "Exploratória" se não souber por onde começar.',
    position: 'bottom',
  },
  {
    id: 'edu-videos',
    selector: '[data-tour-id="edu-videos"]',
    title: '4 · Variáveis X e Y — Fundamentos',
    description: '4 vídeos curtos que ensinam a usar variáveis X e Y na análise. Sempre disponíveis aqui — clique pra abrir e o vídeo toca logo abaixo da lista.',
    position: 'left',
  },
  {
    id: 'variables',
    selector: '[data-tour-id="variables"]',
    title: '5 · Configure as variáveis',
    description: 'Quando escolher a análise, esse painel mostra os parâmetros pra ajustar (colunas, limites, etc).',
    position: 'left',
  },
  {
    id: 'videos',
    selector: '[data-tour-id="videos"]',
    title: '6 · Vídeos de apoio',
    description: 'Pra cada análise específica, o Mentor sugere vídeos extras de teoria e prática. Aparece logo abaixo das variáveis.',
    position: 'left',
  },
  {
    id: 'enviar',
    selector: '[data-tour-id="enviar"]',
    title: '7 · Rode a análise',
    description: 'Clique e o Mentor IA gera o resultado + interpretação automaticamente.',
    position: 'top',
  },
  {
    id: 'perguntar',
    selector: '[data-tour-id="perguntar"]',
    title: '8 · Pergunte sobre o resultado',
    description: 'Digite uma dúvida estatística sobre a última análise e o Mentor responde no contexto.',
    position: 'top',
  },
  {
    id: 'ppt',
    selector: '[data-tour-id="ppt"]',
    title: '9 · Gere o PPT',
    description: 'Exporta todas as análises rodadas como uma apresentação executiva pronta.',
    position: 'left',
  },
  {
    id: 'salvar',
    selector: '[data-tour-id="salvar"]',
    title: '10 · Salve no projeto',
    description: 'Guarda planilha + análises dentro do projeto ativo. Você pode reabrir depois e continuar de onde parou.',
    position: 'bottom',
  },
];

const COUNT_KEY = 'lbw-analysis-tour-count-v1';
const AUTO_LIMIT = 2; // mostra automaticamente nas 2 primeiras visitas, depois só manual

/** True se o aluno já viu o tour automaticamente o número máximo de vezes. */
export function hasSeenAnalysisTour(): boolean {
  try {
    const count = parseInt(localStorage.getItem(COUNT_KEY) || '0');
    return count >= AUTO_LIMIT;
  } catch {
    return false;
  }
}

/** Incrementa o contador de visualizações automáticas. */
function bumpTourCount(): void {
  try {
    const count = parseInt(localStorage.getItem(COUNT_KEY) || '0');
    localStorage.setItem(COUNT_KEY, String(count + 1));
  } catch {}
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

  // Clamp pra viewport
  left = Math.max(PAD, Math.min(window.innerWidth - TOOLTIP_WIDTH - PAD, left));
  top = Math.max(PAD, Math.min(window.innerHeight - TOOLTIP_HEIGHT - PAD, top));

  return { top, left };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataAnalysisTour({ isOpen, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    const step = STEPS[stepIdx];
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      // Scroll suave pra trazer o alvo pra viewport
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    // Espera o scroll terminar antes de medir
    requestAnimationFrame(() => {
      setRect(getRect(step.selector));
    });
  }, [stepIdx]);

  useEffect(() => {
    if (!isOpen) return;
    measure();
    window.addEventListener('resize', measure);
    const scrollListener = () => measure();
    window.addEventListener('scroll', scrollListener, true);
    const interval = setInterval(measure, 300); // remede periodicamente (animações, layouts mudando)
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', scrollListener, true);
      clearInterval(interval);
    };
  }, [isOpen, measure]);

  if (!isOpen) return null;

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  const next = () => {
    if (isLast) finish();
    else setStepIdx(s => s + 1);
  };
  const prev = () => setStepIdx(s => Math.max(0, s - 1));
  const finish = () => {
    bumpTourCount();
    setStepIdx(0);
    onClose();
  };

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
        {/* Overlay com spotlight via SVG mask */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tour-spotlight">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - PAD}
                  y={rect.top - PAD}
                  width={rect.width + 2 * PAD}
                  height={rect.height + 2 * PAD}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.78)"
            mask="url(#tour-spotlight)"
          />
          {rect && (
            <rect
              x={rect.left - PAD}
              y={rect.top - PAD}
              width={rect.width + 2 * PAD}
              height={rect.height + 2 * PAD}
              rx="12"
              fill="none"
              stroke="#0033CC"
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 16px rgba(0, 51, 204, 0.8))' }}
            />
          )}
        </svg>

        {/* Tooltip */}
        {rect && (
          <motion.div
            key={stepIdx}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="absolute z-[201] bg-white rounded-2xl shadow-2xl border border-blue-100"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              width: 320,
            }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {STEPS.map((_, i) => (
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
                <button
                  onClick={finish}
                  className="text-gray-400 hover:text-gray-700 border-none bg-transparent cursor-pointer p-1"
                  title="Pular tour"
                >
                  <X size={16} />
                </button>
              </div>
              <h3 className="text-[16px] font-black text-slate-800 m-0 mb-2 leading-tight">
                {step.title}
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed m-0 mb-4">
                {step.description}
              </p>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={prev}
                  disabled={isFirst}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border-none bg-transparent cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={14} /> Voltar
                </button>
                <span className="text-[10px] font-bold text-slate-400">
                  {stepIdx + 1} / {STEPS.length}
                </span>
                <button
                  onClick={next}
                  className="px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white border-none cursor-pointer flex items-center gap-1 transition-colors shadow-md"
                >
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
