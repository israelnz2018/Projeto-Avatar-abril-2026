/**
 * initiativeVisual — catálogo de ícones/cores pro "desenho" de cada tipo de
 * projeto (initiative), compartilhado entre a tela de configuração (o
 * consultor escolhe) e a aba Projetos (onde o card é exibido). Ver
 * ProjectToolsConfig.tsx (picker) e ProjectManagement.tsx (card).
 *
 * Prioridade de resolução (resolveInitiativeVisual):
 *   1. iconUrl  — o consultor subiu a própria imagem.
 *   2. iconId+corId — o consultor escolheu no catálogo.
 *   3. nome cita uma faixa ("... Yellow Belt", "Faixa Verde ...") — automático.
 *   4. ordem (ou posição na lista) — visual numerado padrão, o fallback de sempre.
 */
import React from 'react';
import {
  Footprints, Target, BarChart3, ShieldAlert, Users, LineChart, Mic, Recycle, Trophy, Folder,
  Rocket, BookOpen, GraduationCap, Lightbulb, Wrench, TrendingUp, Award, Compass, Layers, PieChart,
  Flag, Package, Star, Puzzle, Presentation as PresentationIcon,
} from 'lucide-react';

export type IconComp = React.ComponentType<{ size?: number; className?: string }>;

export interface VisualResult {
  Icon: IconComp;
  gradient: string;
  borderColor: string;
}

/** Ícone de faixa (belt) — silhueta cheia (faixa enrolada + nó + duas pontas caindo),
 * parecido com a faixa de artes marciais dobrada. Usado quando o nome do projeto/
 * curso cita uma cor de faixa. */
export function BeltIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* faixa enrolada, passando por trás do nó */}
      <rect x="1.5" y="8.25" width="21" height="4" rx="1.5" />
      {/* nó central */}
      <rect x="8.75" y="6.25" width="6.5" height="8" rx="1.4" />
      {/* pontas caindo, um pouco abertas */}
      <path d="M10.2 13.6 L8.1 14.1 L5.6 21.2 L9.4 19.6 Z" />
      <path d="M13.8 13.6 L15.9 14.1 L18.4 21.2 L14.6 19.6 Z" />
    </svg>
  );
}

export interface IconOption { id: string; label: string; Icon: IconComp; }

export const ICON_CATALOG: IconOption[] = [
  { id: 'footprints', label: 'Passos', Icon: Footprints },
  { id: 'target', label: 'Alvo', Icon: Target },
  { id: 'chart', label: 'Gráfico', Icon: BarChart3 },
  { id: 'shield', label: 'Risco', Icon: ShieldAlert },
  { id: 'users', label: 'Pessoas', Icon: Users },
  { id: 'line', label: 'Tendência', Icon: LineChart },
  { id: 'mic', label: 'Apresentação', Icon: Mic },
  { id: 'recycle', label: 'Melhoria contínua', Icon: Recycle },
  { id: 'trophy', label: 'Troféu', Icon: Trophy },
  { id: 'folder', label: 'Pasta', Icon: Folder },
  { id: 'rocket', label: 'Foguete', Icon: Rocket },
  { id: 'book', label: 'Livro', Icon: BookOpen },
  { id: 'graduation', label: 'Formação', Icon: GraduationCap },
  { id: 'bulb', label: 'Ideia', Icon: Lightbulb },
  { id: 'wrench', label: 'Ferramenta', Icon: Wrench },
  { id: 'trending', label: 'Crescimento', Icon: TrendingUp },
  { id: 'award', label: 'Prêmio', Icon: Award },
  { id: 'compass', label: 'Direção', Icon: Compass },
  { id: 'layers', label: 'Camadas', Icon: Layers },
  { id: 'pie', label: 'Gráfico de pizza', Icon: PieChart },
  { id: 'flag', label: 'Meta', Icon: Flag },
  { id: 'package', label: 'Pacote', Icon: Package },
  { id: 'star', label: 'Estrela', Icon: Star },
  { id: 'puzzle', label: 'Peça', Icon: Puzzle },
  { id: 'presentation', label: 'Slide', Icon: PresentationIcon },
  { id: 'belt', label: 'Faixa', Icon: BeltIcon },
];

export interface ColorOption { id: string; label: string; gradient: string; borderColor: string; }

export const COLOR_CATALOG: ColorOption[] = [
  { id: 'blue',   label: 'Azul',    gradient: 'from-sky-500 to-indigo-700',   borderColor: '#0EA5E9' },
  { id: 'green',  label: 'Verde',   gradient: 'from-emerald-500 to-teal-700', borderColor: '#10B981' },
  { id: 'cyan',   label: 'Ciano',   gradient: 'from-cyan-500 to-blue-700',    borderColor: '#06B6D4' },
  { id: 'red',    label: 'Vermelho', gradient: 'from-rose-500 to-red-700',    borderColor: '#F43F5E' },
  { id: 'amber',  label: 'Âmbar',   gradient: 'from-amber-500 to-orange-700', borderColor: '#F59E0B' },
  { id: 'purple', label: 'Roxo',    gradient: 'from-violet-500 to-purple-700', borderColor: '#8B5CF6' },
  { id: 'orange', label: 'Laranja', gradient: 'from-orange-500 to-rose-700', borderColor: '#F97316' },
  { id: 'navy',   label: 'Azul-marinho', gradient: 'from-[#1E2D6E] to-[#0033CC]', borderColor: '#0033CC' },
  { id: 'yellow', label: 'Amarelo', gradient: 'from-yellow-400 to-yellow-600', borderColor: '#CA8A04' },
  { id: 'black',  label: 'Preto',   gradient: 'from-gray-700 to-gray-900',    borderColor: '#111827' },
  { id: 'white',  label: 'Branco',  gradient: 'from-gray-200 to-gray-400',    borderColor: '#9CA3AF' },
  { id: 'gray',   label: 'Cinza',   gradient: 'from-slate-500 to-slate-700',  borderColor: '#64748B' },
];

const DEFAULT_NUMBERED: VisualResult[] = [
  { Icon: Footprints,  gradient: 'from-sky-500 to-indigo-700',    borderColor: '#0EA5E9' },
  { Icon: Target,      gradient: 'from-emerald-500 to-teal-700',  borderColor: '#10B981' },
  { Icon: BarChart3,   gradient: 'from-cyan-500 to-blue-700',     borderColor: '#06B6D4' },
  { Icon: ShieldAlert, gradient: 'from-rose-500 to-red-700',      borderColor: '#F43F5E' },
  { Icon: Users,       gradient: 'from-amber-500 to-orange-700',  borderColor: '#F59E0B' },
  { Icon: LineChart,   gradient: 'from-violet-500 to-purple-700', borderColor: '#8B5CF6' },
  { Icon: Mic,         gradient: 'from-orange-500 to-rose-700',   borderColor: '#F97316' },
  { Icon: Recycle,     gradient: 'from-emerald-400 to-teal-800',  borderColor: '#10B981' },
  { Icon: Trophy,      gradient: 'from-[#1E2D6E] to-[#0033CC]',   borderColor: '#0033CC' },
];
const DEFAULT_FALLBACK: VisualResult = { Icon: Folder, gradient: 'from-slate-500 to-slate-700', borderColor: '#64748B' };

const CORES_FAIXA: Record<string, ColorOption> = {
  amarela: COLOR_CATALOG[8], yellow: COLOR_CATALOG[8],
  verde: COLOR_CATALOG[1],   green: COLOR_CATALOG[1],
  preta: COLOR_CATALOG[9],   black: COLOR_CATALOG[9],
  branca: COLOR_CATALOG[10], white: COLOR_CATALOG[10],
  laranja: COLOR_CATALOG[6], orange: COLOR_CATALOG[6],
  azul: COLOR_CATALOG[0],    blue: COLOR_CATALOG[0],
  vermelha: COLOR_CATALOG[3], red: COLOR_CATALOG[3],
  roxa: COLOR_CATALOG[5],    purple: COLOR_CATALOG[5],
};

function getFaixaVisual(nome: string): VisualResult | null {
  const m = nome.match(/\b(amarela|verde|preta|branca|laranja|azul|vermelha|roxa|yellow|green|black|white|orange|blue|red|purple)\b\s*belt\b|\bfaixa\s*\b(amarela|verde|preta|branca|laranja|azul|vermelha|roxa)\b/i);
  if (!m) return null;
  const cor = (m[1] || m[2] || '').toLowerCase();
  const paleta = CORES_FAIXA[cor];
  if (!paleta) return null;
  return { Icon: BeltIcon, gradient: paleta.gradient, borderColor: paleta.borderColor };
}

/** Visual numerado padrão (o fallback de sempre, quando nada foi escolhido). */
export function getNumberedVisual(numero: number | undefined): VisualResult {
  if (numero === undefined || numero < 1 || numero > DEFAULT_NUMBERED.length) return DEFAULT_FALLBACK;
  return DEFAULT_NUMBERED[numero - 1];
}

/**
 * Resolve o visual final de uma initiative, seguindo a prioridade do topo do
 * arquivo. `numero` é o mesmo `ordem ?? índice+1` já usado pra ordenar a lista.
 */
export function resolveInitiativeVisual(
  initiative: { name: string; iconId?: string; corId?: string; iconUrl?: string },
  numero: number | undefined
): VisualResult & { imageUrl?: string } {
  if (initiative.iconUrl) {
    // Imagem própria: Icon vira um componente que renderiza a imagem no lugar do SVG.
    const ImgIcon: IconComp = ({ size = 22, className }) => (
      <img src={initiative.iconUrl} alt="" width={size} height={size} className={className} style={{ objectFit: 'contain' }} />
    );
    const cor = initiative.corId ? COLOR_CATALOG.find(c => c.id === initiative.corId) : undefined;
    return { Icon: ImgIcon, gradient: cor?.gradient || 'from-slate-500 to-slate-700', borderColor: cor?.borderColor || '#64748B', imageUrl: initiative.iconUrl };
  }
  if (initiative.iconId) {
    const icone = ICON_CATALOG.find(i => i.id === initiative.iconId);
    const cor = initiative.corId ? COLOR_CATALOG.find(c => c.id === initiative.corId) : undefined;
    if (icone) return { Icon: icone.Icon, gradient: cor?.gradient || 'from-slate-500 to-slate-700', borderColor: cor?.borderColor || '#64748B' };
  }
  return getFaixaVisual(initiative.name) || getNumberedVisual(numero);
}
