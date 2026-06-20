/**
 * MenuTour — tour único da plataforma que percorre o MENU LATERAL.
 * Destaca cada aba do menu (spotlight) e explica pra que serve. O passo de
 * Projetos mostra uma imagem da tela de dentro do projeto (fases → ferramentas
 * → vídeo de suporte), sem precisar de um projeto aberto.
 *
 * Disparo: automático nas 2 primeiras vezes (localStorage) + botão "Tour da
 * plataforma" no menu lateral, sempre disponível.
 *
 * NÃO mexe no tour da aba Data & Analysis (que é separado e detalhado).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface MenuTourStep {
  selector: string;
  title: string;
  description: string;
  image?: string; // imagem opcional exibida no tooltip (ex: tela de Projetos)
}

const STEPS: MenuTourStep[] = [
  {
    selector: '[data-tour-id="menu-/projects"]',
    title: 'Projetos',
    description:
      'O coração da plataforma. Você escolhe uma trilha e cria um projeto. Cada trilha tem FASES; cada fase traz as FERRAMENTAS daquela etapa; e cada ferramenta tem um VÍDEO de suporte do Israel pra te guiar.',
    image: '/tour-projetos.png',
  },
  {
    selector: '[data-tour-id="menu-/analysis"]',
    title: 'Data & Analysis',
    description: 'Aqui você faz as análises gráficas e estatísticas dos seus dados — sem precisar programar. Sobe a planilha e o Mentor gera os gráficos e a interpretação.',
  },
  {
    selector: '[data-tour-id="menu-/education"]',
    title: 'Educação',
    description: 'Acesso aos vídeos com as explicações do Israel, organizados por tema. É onde você aprende a teoria por trás de cada ferramenta.',
  },
  {
    selector: '[data-tour-id="menu-/chat"]',
    title: 'AI Assistant',
    description: 'Converse com o assistente pra descobrir qual trilha resolve o seu desafio. Ele te ouve e recomenda o melhor caminho.',
  },
  {
    selector: '[data-tour-id="menu-/comunidade"]',
    title: 'Comunidade LBW',
    description: 'Troque experiências com outros alunos — dúvidas, conquistas e aprendizados. Quanto mais você participa, mais aprende.',
  },
  {
    selector: '[data-tour-id="menu-/dashboard"]',
    title: 'Dashboard',
    description: 'Acompanhe seu progresso na plataforma — o que você já fez e o que vem a seguir.',
  },
];

const COUNT_KEY = 'lbw-menu-tour-count-v1';
const AUTO_LIMIT = 2; // automático nas 2 primeiras vezes

export function shouldAutoOpenMenuTour(): boolean {
  try { return (parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0) < AUTO_LIMIT; }
  catch { return false; }
}
function bumpMenuTourCount(): void {
  try {
    const c = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0;
    localStorage.setItem(COUNT_KEY, String(c + 1));
  } catch { /* ignore */ }
}

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MenuTour({ isOpen, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Só os passos cujo alvo existe no menu (ex: admin tem mais itens; gratuito não).
  const steps = isOpen ? STEPS.filter(s => document.querySelector(s.selector)) : STEPS;
  const safeSteps = steps.length > 0 ? steps : STEPS;

  const measure = useCallback(() => {
    const step = safeSteps[stepIdx];
    if (!step) return;
    setRect(getRect(step.selector));
  }, [stepIdx, safeSteps]);

  useEffect(() => {
    if (isOpen) bumpMenuTourCount();
    else setStepIdx(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    measure();
    window.addEventListener('resize', measure);
    const interval = setInterval(measure, 300);
    return () => { window.removeEventListener('resize', measure); clearInterval(interval); };
  }, [isOpen, measure]);

  if (!isOpen) return null;
  const step = safeSteps[stepIdx];
  if (!step) return null;
  const isLast = stepIdx === safeSteps.length - 1;
  const isFirst = stepIdx === 0;

  const finish = () => { setStepIdx(0); onClose(); };
  const next = () => { if (isLast) finish(); else setStepIdx(s => s + 1); };
  const prev = () => setStepIdx(s => Math.max(0, s - 1));

  const PAD = 8;
  // Tooltip aparece à DIREITA do item de menu destacado.
  const TOOLTIP_W = step.image ? 460 : 340;
  let top = rect ? rect.top : 100;
  let left = rect ? rect.right + 20 : 100;
  // clamp vertical e horizontal
  left = Math.min(left, window.innerWidth - TOOLTIP_W - 16);
  top = Math.max(16, Math.min(top, window.innerHeight - 320));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300]"
      >
        {/* Overlay com spotlight no item do menu */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="menu-tour-spotlight">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect x={rect.left - PAD} y={rect.top - PAD} width={rect.width + 2 * PAD} height={rect.height + 2 * PAD} rx="10" fill="black" />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.80)" mask="url(#menu-tour-spotlight)" />
          {rect && (
            <rect
              x={rect.left - PAD} y={rect.top - PAD}
              width={rect.width + 2 * PAD} height={rect.height + 2 * PAD}
              rx="10" fill="none" stroke="#0033CC" strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 14px rgba(0, 51, 204, 0.85))' }}
            />
          )}
        </svg>

        {/* Tooltip */}
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
          className="absolute z-[301] bg-white rounded-2xl shadow-2xl border border-blue-100"
          style={{ top, left, width: TOOLTIP_W }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {safeSteps.map((_, i) => (
                  <span key={i} className="block h-1 rounded-full transition-all"
                    style={{ width: i === stepIdx ? 18 : 6, background: i === stepIdx ? '#0033CC' : i < stepIdx ? '#93C5FD' : '#E5E7EB' }} />
                ))}
              </div>
              <button onClick={finish} className="text-gray-400 hover:text-gray-700 border-none bg-transparent cursor-pointer p-1" title="Pular tour">
                <X size={16} />
              </button>
            </div>

            <h3 className="text-[17px] font-black text-slate-800 m-0 mb-2 leading-tight">{step.title}</h3>

            {step.image && (
              <img
                src={step.image}
                alt={step.title}
                className="w-full rounded-lg border border-gray-200 mb-3"
                style={{ boxShadow: '0 6px 18px -10px rgba(0,0,0,0.3)' }}
              />
            )}

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
      </motion.div>
    </AnimatePresence>
  );
}
