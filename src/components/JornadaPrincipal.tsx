/**
 * JornadaPrincipal — A NOVA página principal do app (formato Netflix).
 *
 * Esta página foi desenhada pra ser a primeira coisa que o aluno vê.
 * Foco em TRILHAS DE GESTÃO (não em ferramentas técnicas isoladas).
 * Tom: Israel Souza, consultor sênior, falando em 1ª pessoa.
 *
 * Estrutura:
 *   1. Hero "trailer" da trilha em destaque (auto-rotaciona a cada 12s)
 *   2. Row "Em destaque pra você" (carrossel Netflix)
 *   3. Banner do Mentor (CTA pro /chat)
 *   4. Row "Comece por aqui"
 *   5. Row "Faça acontecer na sua área"
 *   6. Row "Top 10 mais transformadoras" (ranqueada, estilo Top 10 Netflix)
 *   7. Row "Liderança e pessoas"
 *   8. Row "Próximo passo na carreira"
 *   9. Rodapé com manifesto + assinatura do Israel
 *
 * Quando o aluno clica numa trilha → abre TrilhaModal com:
 *   - trailer animado
 *   - carta do Israel
 *   - episódios listados (estilo Netflix)
 *   - chips clicáveis pras outras abas técnicas (/projects, /analysis, /chat)
 *
 * RESTRIÇÃO: este componente NÃO modifica nenhum outro arquivo do projeto.
 * Toda navegação é via react-router, todas as rotas já existem.
 *
 * COMO ATIVAR: substituir, em App.tsx, a rota "/" pra apontar pra cá:
 *     <Route path="/" element={<JornadaPrincipal />} />
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Quote, ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import {
  TRILHAS,
  type Trilha,
} from './jornadaPrincipal/trilhas';
import {
  TrailerHero,
  TrilhaRow,
  TrilhaModal,
  MentorBanner,
} from './jornadaPrincipal/components';

// =============================================================================
// CONSTANTES VISUAIS
// =============================================================================

const BG = '#080a14';

/**
 * Trilhas no rodízio do Hero — 8 trilhas, na ordem do funil pedagógico.
 *
 * IMPORTANTE: a antiga Trilha 2 ("Investigar Problemas") foi fundida com a
 * Trilha 1 em jun/2026 — o ciclo DMAIC qualitativo (definir, causa-raiz,
 * implementar, sustentar) virou 4 das 10 situações da Trilha 1 grátis.
 *
 * A última trilha (Especialista) é a FORMAÇÃO ÂNCORA da LBW, com paleta
 * NAVY/BLUE (definida no próprio trilhas.ts via gradient/accent/glow LBW).
 */
const HERO_TRILHAS_IDS = [
  'ferramentas-dia-a-dia',           // 01 — Kit grátis (adaptação + 1ª entrega) ← FUNIL DE TOPO
  'dados-do-dia-a-dia',              // 02 — Recomendar com Dados (1ª venda + provável pós-grátis)
  'mudanca-com-menos-resistencia',   // 03 — Conduzir Mudanças (2ª venda + provável)
  'apresentar-recomendacao',         // 04 — Apresentações que Convencem (3ª venda + provável)
  'analise-risco-mudanca',           // 05 — Antecipar Riscos (refinamento técnico)
  'perfil-gestor-lean',              // 06 — Cultura Lean na Prática (mindset)
  'problema-cronico',                // 07 — Análises Estatísticas (profundidade técnica)
  'especialista-projetos-complexos', // 08 — FORMAÇÃO LBW (âncora — paleta NAVY/BLUE)
];

const HERO_INTERVALO_MS = 8_000;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function JornadaPrincipal() {
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);
  const [trilhaSelecionada, setTrilhaSelecionada] = useState<Trilha | null>(null);
  const [usuarioPausou, setUsuarioPausou] = useState(false);
  // Tick aumenta a cada HERO_INTERVALO_MS — usado pra animar barra de progresso
  const [progressKey, setProgressKey] = useState(0);

  const heroTrilhas = HERO_TRILHAS_IDS
    .map(id => TRILHAS.find(t => t.id === id))
    .filter((t): t is Trilha => t !== undefined);

  const rodizioAtivo = !usuarioPausou && !trilhaSelecionada;

  // Rodízio automático do hero
  useEffect(() => {
    if (!rodizioAtivo) return;
    const tick = setInterval(() => {
      setHeroIndex(i => (i + 1) % heroTrilhas.length);
      setProgressKey(k => k + 1);
    }, HERO_INTERVALO_MS);
    return () => clearInterval(tick);
  }, [rodizioAtivo, heroTrilhas.length]);

  // Quando usuário troca manualmente, reseta a contagem da barra de progresso
  const irPara = useCallback((novoIndex: number) => {
    setHeroIndex(((novoIndex % heroTrilhas.length) + heroTrilhas.length) % heroTrilhas.length);
    setProgressKey(k => k + 1);
  }, [heroTrilhas.length]);

  const heroAtual = heroTrilhas[heroIndex];

  const onPlay = useCallback((trilha: Trilha) => {
    navigate(trilha.ctaPrimario.rota);
  }, [navigate]);

  const onInfo = useCallback((trilha: Trilha) => {
    setTrilhaSelecionada(trilha);
  }, []);

  return (
    // Estoura o padding do Layout (que adiciona p-8 ao redor de children) — Netflix precisa full-bleed
    <div className="-m-8 min-h-screen" style={{ background: BG, color: 'white' }}>
      {/* Sutil "noise" texture decorativa */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* HERO ROTATIVO */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={heroAtual.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              <TrailerHero
                trilha={heroAtual}
                onPlay={onPlay}
                onMoreInfo={onInfo}
              />
            </motion.div>
          </AnimatePresence>

          {/* Setas Prev/Next nas laterais do hero */}
          <button
            onClick={() => irPara(heroIndex - 1)}
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110"
            style={{ border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
            aria-label="Banner anterior"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            onClick={() => irPara(heroIndex + 1)}
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110"
            style={{ border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
            aria-label="Próximo banner"
          >
            <ChevronRight size={26} />
          </button>
        </div>

        {/* Barra de paginação Netflix-style: thumbnails + barra de progresso */}
        <div className="relative -mt-16 md:-mt-20 mb-10 z-30 px-6 md:px-16 lg:px-24">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 text-[10px] md:text-[11px] font-black tracking-[0.3em] text-white/85 uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Trilhas em destaque
              <span className="text-white/40">·</span>
              <span className="text-white/60">{heroIndex + 1} de {heroTrilhas.length}</span>
            </div>
            <button
              onClick={() => setUsuarioPausou(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-bold tracking-wider text-white/80 uppercase transition"
              style={{ cursor: 'pointer' }}
              title={usuarioPausou ? 'Retomar rotação' : 'Pausar rotação'}
            >
              {usuarioPausou ? <Play size={11} fill="currentColor" /> : <Pause size={11} fill="currentColor" />}
              {usuarioPausou ? 'Retomar' : 'Pausar'}
            </button>
          </div>

          {/* Fileira de thumbnails das 9 trilhas em destaque */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 md:gap-2">
            {heroTrilhas.map((t, i) => {
              const Icon = t.icone;
              const ativo = i === heroIndex;
              return (
                <button
                  key={t.id}
                  onClick={() => irPara(i)}
                  className="group/thumb relative text-left rounded-md md:rounded-lg overflow-hidden aspect-[16/9] transition-all hover:scale-[1.03]"
                  style={{
                    border: ativo ? '2px solid white' : '2px solid rgba(255,255,255,0.12)',
                    boxShadow: ativo ? `0 8px 24px -6px ${t.glow}` : 'none',
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                  title={t.titulo}
                >
                  {/* Gradient + overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient}`}
                       style={{ opacity: ativo ? 1 : 0.55 }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  {/* Ícone */}
                  <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2">
                    <Icon size={14} className="text-white/80" />
                  </div>

                  {/* Número no canto */}
                  <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 text-[9px] md:text-[10px] font-black tracking-widest text-white/75">
                    {t.numero}
                  </div>

                  {/* Título embaixo */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-2">
                    <p className="text-white text-[9px] md:text-[11px] font-black leading-tight m-0 line-clamp-2"
                       style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                      {t.titulo}
                    </p>
                  </div>

                  {/* Barra de progresso (só no ativo) */}
                  {ativo && rodizioAtivo && (
                    <motion.div
                      key={progressKey}
                      className="absolute bottom-0 left-0 h-[3px] bg-white"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: HERO_INTERVALO_MS / 1000, ease: 'linear' }}
                    />
                  )}
                  {ativo && !rodizioAtivo && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* BANNER DO MENTOR */}
        <MentorBanner onCTA={() => navigate('/chat')} />

        {/* SEÇÃO — Arsenal de ferramentas (informativo, não clicável).
            Todas as rows de trilhas foram removidas — as trilhas aparecem no
            Hero rotativo (topo). Aqui fica só o arsenal informativo + manifesto. */}
        <ArsenalFerramentas />

        {/* MANIFESTO RODAPÉ */}
        <ManifestoRodape />
      </div>

      {/* MODAL */}
      <TrilhaModal trilha={trilhaSelecionada} onClose={() => setTrilhaSelecionada(null)} />
    </div>
  );
}

// =============================================================================
// ARSENAL DE FERRAMENTAS — seção informativa (não clicável).
// Mostra o "tamanho do arsenal" da plataforma agrupado por categoria, pra
// comunicar profundidade técnica. Substitui a antiga row "Aprofundamento".
// =============================================================================

const ARSENAL: {
  numero: string;
  titulo: string;
  accent: string;
  grupos: { sub: string; itens: string[] }[];
}[] = [
  {
    numero: '1',
    titulo: 'Ferramentas de Gestão',
    accent: '#3B82F6',
    grupos: [
      { sub: '', itens: ['Gestão de Projetos', 'Gestão de Mudanças', 'Gestão de Riscos', 'Técnicas de Apresentação', 'Gerenciamento Lean'] },
    ],
  },
  {
    numero: '2',
    titulo: 'Ferramentas Estatísticas',
    accent: '#A855F7',
    grupos: [
      { sub: '', itens: ['MSA (Análise do Sistema de Medição)', 'SPC (Controle Estatístico de Processo)', 'Capabilidade', 'Testes de Hipóteses', 'Teste de Normalidade', 'Análise Preditiva', 'Cálculo de Probabilidade', 'Análise Descritiva', 'Mapa de Análise Estatística'] },
    ],
  },
  {
    numero: '3',
    titulo: 'Ferramentas Gráficas',
    accent: '#22D3EE',
    grupos: [
      { sub: '', itens: ['Box Plot', 'Pareto', 'Dispersão', 'Pizza', 'Barra', 'Séries Temporais', 'Bolhas', 'Intervalo', '3D', 'Histograma', 'Tendência'] },
    ],
  },
  {
    numero: '4',
    titulo: 'Ferramentas da Qualidade',
    accent: '#10B981',
    grupos: [
      { sub: '', itens: ['Matriz de Prioridade', 'Espinha de Peixe', 'Brainstorming', 'Análise de Stakeholders', 'FMEA', 'Plano de Ação', 'Plano de Coleta de Dados', 'Plano de Controle', 'RAB', 'GUT', 'Contrato do Projeto', 'RACI'] },
    ],
  },
];

function ArsenalFerramentas() {
  return (
    <section className="relative px-6 md:px-16 lg:px-24 mt-10 mb-4">
      <div className="mb-1">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight m-0">
          O arsenal por dentro das trilhas
        </h2>
        <p className="text-base text-white/60 mt-1 m-0">
          As ferramentas que você domina ao longo do caminho — agrupadas por tipo
        </p>
      </div>

      {/* 2 boxes por linha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
        {ARSENAL.map((cat) => (
          <motion.div
            key={cat.numero}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 md:p-7 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {/* Cabeçalho da categoria */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xl shrink-0"
                   style={{ background: `linear-gradient(135deg, ${cat.accent}, ${cat.accent}99)` }}>
                {cat.numero}
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white m-0 leading-tight">
                {cat.titulo}
              </h3>
            </div>

            {/* Itens do bloco */}
            <div className="space-y-4">
              {cat.grupos.map((g, gi) => (
                <div key={gi}>
                  {/* Rótulo do subgrupo só aparece se existir (alguns blocos não têm) */}
                  {g.sub && (
                    <p className="text-sm font-black uppercase tracking-wider m-0 mb-2"
                       style={{ color: cat.accent }}>
                      {g.sub}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {g.itens.map((item) => (
                      <span key={item}
                            className="text-sm font-medium text-white/85 px-3 py-1.5 rounded-md border border-white/10"
                            style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// MANIFESTO RODAPÉ — fechamento emocional, assinatura do Israel
// =============================================================================

function ManifestoRodape() {
  const navigate = useNavigate();
  return (
    <section className="relative px-6 md:px-16 lg:px-24 py-20 mt-10 border-t border-white/5">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
        >
          <Quote size={48} className="mx-auto text-white/15 mb-6" />
          <p className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight m-0 mb-6">
            Cada trilha aqui é<br/>
            <span style={{
              background: 'linear-gradient(90deg, #FFD27A, #FFFFFF, #94B5FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              o que aprendi ao longo
            </span><br/>
            de mais de 20 anos de carreira.
          </p>
          <p className="text-base md:text-lg text-white/65 leading-relaxed max-w-2xl mx-auto m-0 mb-10">
            Passei por 5 multinacionais no Brasil e na Nova Zelândia — Petroquímica, Automotivo,
            Bebidas, Dispositivos Médicos e Setor Público — e também como empresário e professor
            de graduação e pós-graduação. Aqui está o que funciona na prática, e não em livros de
            teoria. Comece pela trilha que te chamou atenção. Não precisa fazer todas.
            Faça <strong className="text-white">uma</strong> bem feita.
          </p>

          <div className="inline-flex items-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-blue-100 flex items-center justify-center text-[#1E2D6E] font-black text-xl shadow-lg">
              IS
            </div>
            <div className="text-left">
              <p className="text-white font-black m-0">Israel Souza</p>
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider m-0">Consultor Sênior · 27 anos</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-white text-black font-black text-sm hover:bg-white/90 transition"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Abrir meu primeiro projeto <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition border border-white/15"
              style={{ cursor: 'pointer' }}
            >
              <Sparkles size={14} /> Falar com o Mentor
            </button>
          </div>
        </motion.div>
      </div>

      <div className="text-center text-white/30 text-[11px] uppercase tracking-[0.3em] font-bold mt-16">
        LBW · Learning by Working
      </div>
    </section>
  );
}
