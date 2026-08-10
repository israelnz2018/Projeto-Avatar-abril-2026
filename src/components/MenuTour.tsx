/**
 * MenuTour — tour da aba Projetos. Dois modos de passo:
 *
 *  A) Passo "na tela real": destaca (spotlight) um elemento da página viva via
 *     `selector` (data-tour-id). Usado pra Projetos ativos e lista de cursos.
 *
 *  B) Passo "na imagem": mostra a imagem da tela de dentro do projeto em GRANDE
 *     (quase tela cheia) e destaca uma REGIÃO dela via `region` (coordenadas em %
 *     relativas à imagem). Usado pra explicar fases / ferramentas / agente Israel.
 *
 * Disparo: só manual (botão na aba Projetos dispara o evento 'lbw-open-menu-tour').
 * NÃO mexe no tour da aba Data & Analysis (separado).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface ImgRegion { xPct: number; yPct: number; wPct: number; hPct: number; }

interface MenuTourStep {
  title: string;
  description: string;
  selector?: string;        // modo A: destaca elemento real da página
  image?: string;           // modo B: imagem grande de fundo
  region?: ImgRegion;       // modo B: região da imagem a destacar (em %)
}

const PROJ_IMG = '/tour-projetos.png';

const STEPS: MenuTourStep[] = [
  // --- Modo A: tela real ---
  {
    selector: '[data-tour-id="proj-ativos"]',
    title: 'Seus projetos',
    description: 'Aqui em cima ficam os projetos que você já começou. Clique pra abrir, trocar entre eles ou continuar de onde parou.',
  },
  {
    selector: '[data-tour-id="proj-trilhas"]',
    title: 'Escolha um curso',
    description: 'Estes são os cursos disponíveis. Clique no curso que combina com o que você quer melhorar pra criar um novo projeto.',
  },
  // --- Modo B: imagem grande da tela de dentro do projeto, com 3 regiões ---
  {
    image: PROJ_IMG,
    title: 'As fases do projeto',
    description: 'Dentro de um projeto, o trabalho é dividido em FASES. Você avança fase a fase, da primeira (entender a área) até a última.',
    region: { xPct: 17, yPct: 30, wPct: 57, hPct: 24 },
  },
  {
    image: PROJ_IMG,
    title: 'As ferramentas de cada fase',
    description: 'Cada fase traz as FERRAMENTAS daquela etapa (SIPOC, RACI, Organograma…) pra você aplicar no seu projeto.',
    region: { xPct: 17, yPct: 56, wPct: 57, hPct: 17 },
  },
  {
    image: PROJ_IMG,
    title: 'Os vídeos de apoio',
    description: 'Cada ferramenta tem VÍDEOS DE APOIO do Israel — é só clicar pra assistir e aprender a usar a ferramenta na prática.',
    region: { xPct: 17, yPct: 70, wPct: 40, hPct: 10 },
  },
  {
    image: '/tour-video.png',
    title: 'Pule pra parte que interessa',
    description: 'Ao assistir uma videoaula, use o ÍNDICE DO CONTEÚDO pra clicar e ir direto pra parte que você quer ver — sem precisar assistir tudo.',
    region: { xPct: 64, yPct: 18, wPct: 35, hPct: 78 },
  },
  {
    image: PROJ_IMG,
    title: 'O Israel digital',
    description: 'À direita fica o agente Israel digital, associado à ferramenta que você está usando. Ele te orienta com respostas baseadas nos vídeos do próprio Israel.',
    region: { xPct: 76, yPct: 6, wPct: 23, hPct: 90 },
  },
  // --- Volta pra tela real: o botão de feedback no rodapé do Israel ---
  {
    selector: '[data-tour-id="proj-reportar"]',
    title: 'Reportar, sugerir ou perguntar',
    description: 'Achou um problema, tem uma sugestão ou uma dúvida? Use este botão pra falar com a gente — sua opinião ajuda a melhorar a plataforma.',
  },
];

const COUNT_KEY = 'lbw-menu-tour-count-v1';
const AUTO_LIMIT = 2;

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

  // No modo A, só mantém passos cujo alvo existe na página.
  const steps = isOpen
    ? STEPS.filter(s => s.image || (s.selector && document.querySelector(s.selector)))
    : STEPS;
  const safeSteps = steps.length > 0 ? steps : STEPS;

  const measure = useCallback(() => {
    const step = safeSteps[stepIdx];
    if (!step || step.image) { setRect(null); return; } // modo B não usa rect de DOM
    setRect(step.selector ? getRect(step.selector) : null);
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

  // ---- Barra de progresso + navegação (compartilhada pelos dois modos) ----
  const Nav = (
    <div className="flex items-center justify-between gap-2 mt-4">
      <button onClick={prev} disabled={isFirst} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border-none bg-transparent cursor-pointer flex items-center gap-1 transition-colors">
        <ChevronLeft size={14} /> Voltar
      </button>
      <span className="text-[10px] font-bold text-slate-400">{stepIdx + 1} / {safeSteps.length}</span>
      <button onClick={next} className="px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white border-none cursor-pointer flex items-center gap-1 transition-colors shadow-md">
        {isLast ? 'Concluir' : 'Próximo'}
        {!isLast && <ChevronRight size={14} />}
      </button>
    </div>
  );

  const Dots = (
    <div className="flex items-center gap-1.5">
      {safeSteps.map((_, i) => (
        <span key={i} className="block h-1 rounded-full transition-all"
          style={{ width: i === stepIdx ? 18 : 6, background: i === stepIdx ? '#0033CC' : i < stepIdx ? '#93C5FD' : '#E5E7EB' }} />
      ))}
    </div>
  );

  // =================== MODO B: imagem grande com região destacada ===================
  if (step.image) {
    const r = step.region;
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-slate-900/90 flex items-center justify-center p-3"
        >
          {/* Imagem ocupa quase a tela toda (largura e altura) */}
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative inline-block max-w-full max-h-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={step.image}
                alt={step.title}
                className="block max-w-full"
                style={{ maxHeight: '94vh' }}
              />
              {/* Região destacada (anel) sobre a imagem */}
              {r && (
                <div
                  className="absolute pointer-events-none rounded-lg"
                  style={{
                    left: `${r.xPct}%`, top: `${r.yPct}%`, width: `${r.wPct}%`, height: `${r.hPct}%`,
                    border: '3px solid #0033CC',
                    boxShadow: '0 0 0 9999px rgba(15,23,42,0.55), 0 0 18px rgba(0,51,204,0.9)',
                  }}
                />
              )}

            {/* Card de texto — dentro do container da imagem, pra posicionar relativo
                a ela. Quando a região destacada está na direita (ex: o Israel), o card
                encosta logo à ESQUERDA dela (perto, sem cobrir). Senão, canto direito. */}
            <div
              className="absolute bottom-4 bg-white rounded-2xl shadow-2xl border border-blue-100 p-5 w-[330px] max-w-[calc(100vw-2rem)] z-10"
              style={r && r.xPct > 50
                ? { right: `${100 - r.xPct + 1.5}%` }   // encosta à esquerda da região (Israel)
                : { right: '1rem' }}
            >
              <div className="flex items-center justify-between mb-2">
                {Dots}
                <button onClick={finish} className="text-gray-400 hover:text-gray-700 border-none bg-transparent cursor-pointer p-1" title="Fechar tour">
                  <X size={16} />
                </button>
              </div>
              <h3 className="text-[17px] font-black text-slate-800 m-0 mb-2 leading-tight">{step.title}</h3>
              <p className="text-[13px] text-slate-600 leading-relaxed m-0">{step.description}</p>
              {Nav}
            </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // =================== MODO A: spotlight na tela real ===================
  const PAD = 8;
  const TOOLTIP_W = 360;
  let top: number; let left: number;
  if (!rect) { top = 100; left = 100; }
  else {
    const espacoDireita = window.innerWidth - rect.right;
    const espacoEsquerda = rect.left;
    if (espacoDireita >= TOOLTIP_W + 24) { left = rect.right + 20; top = rect.top; }
    else if (espacoEsquerda >= TOOLTIP_W + 24) { left = rect.left - TOOLTIP_W - 20; top = rect.top; }
    else { left = (window.innerWidth - TOOLTIP_W) / 2; top = Math.min(rect.bottom + 16, window.innerHeight - 320); }
    left = Math.max(16, Math.min(window.innerWidth - TOOLTIP_W - 16, left));
    top = Math.max(16, Math.min(top, window.innerHeight - 320));
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300]"
      >
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

        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
          className="absolute z-[301] bg-white rounded-2xl shadow-2xl border border-blue-100"
          style={{ top, left, width: TOOLTIP_W }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              {Dots}
              <button onClick={finish} className="text-gray-400 hover:text-gray-700 border-none bg-transparent cursor-pointer p-1" title="Pular tour">
                <X size={16} />
              </button>
            </div>
            <h3 className="text-[17px] font-black text-slate-800 m-0 mb-2 leading-tight">{step.title}</h3>
            <p className="text-[13px] text-slate-600 leading-relaxed m-0">{step.description}</p>
            {Nav}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
