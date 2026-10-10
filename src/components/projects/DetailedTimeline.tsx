import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, AlertCircle, ChevronDown, ChevronRight,
  Sparkles, X, ListTodo, Info, BookOpen, BarChart3, CheckCircle2, CalendarDays, Wand2,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

/**
 * Atividades Detalhadas — as tarefas de cada fase do DMAIC, com datas.
 *
 * É um projeto de MELHORIA, não um projeto PMI. Por isso:
 *  - O caminho é um só: escolher quantos meses o projeto vai durar e apertar
 *    "Sugerir Atividades". As datas de cada atividade saem dessa duração.
 *  - Não há predecessora nem peso por atividade.
 *  - O acompanhamento fala português simples — quanto já foi feito, o que
 *    está atrasado e com quem — em vez de SPI, EV e PV.
 *
 * Dados antigos com `weight` e `predecessorId` continuam abrindo; esses campos
 * só deixaram de aparecer e de contar.
 */

interface Activity {
  id: string;
  text: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  plannedStart?: string;   // yyyy-mm-dd
  plannedFinish?: string;  // yyyy-mm-dd
  actualFinish?: string;
  owner?: string;
  notes?: string;
  weight?: number;         // legado — não é mais usado
  predecessorId?: string;  // legado — não é mais usado
}

interface PhaseActivities {
  id: string;
  name: string;
  activities: Activity[];
  isOpen: boolean;
  /** Fatia da duração do projeto que esta fase recebe (soma 100). */
  weight: number;
}

interface Duracao {
  meses: number;
  inicio: string; // yyyy-mm-dd
}

interface DetailedTimelineProps {
  onSave: (data: any) => void;
  initialData?: any;
  macroTimeline?: any;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const OPCOES_MESES = [2, 3, 4, 5, 6, 8, 10, 12];

const SUGGESTED_ACTIVITIES: Record<string, string[]> = {
  define: [
    "Identificação do problema e impacto no negócio.",
    "Definição clara do escopo do projeto.",
    "Mapeamento dos stakeholders (partes interessadas).",
    "Desenvolvimento do Project Charter (termo de abertura).",
    "Criação do SIPOC (Supplier, Input, Process, Output, Customer).",
    "Alinhamento das metas e objetivos financeiros e operacionais.",
    "Definição da reunião inicial (kick off)",
    "Definir as ações de contenção (se necessário)",
    "Desenvolvimento do plano de comunicação",
    "Envio da primeira comunicação"
  ],
  measure: [
    "Mapeamento do processo atual com fluxogramas",
    "Identificação das variáveis críticas",
    "Priorização das variáveis críticas",
    "Coleta de dados relevantes para entender o problema.",
    "Avaliação da capacidade do processo (Cp/Cpk/DPMO, etc).",
    "Análise do sistema de medição (MSA).",
    "Elaboração de um plano de coleta de dados",
    "Organização dos documentos da fase medir",
    "Envio da segunda comunicação"
  ],
  analyze: [
    "Uso de ferramentas da qualidade",
    "Uso de ferramentas estatísticas",
    "Uso de ferramentas Lean",
    "Identificação das causas raízes",
    "Organização dos documentos da fase Analisar",
    "Envio da terceira comunicação"
  ],
  improve: [
    "Desenvolvimento de soluções",
    "Fazer plano de ação",
    "Desenvolver um plano de gestão de mudança - ADKAR",
    "A análise de risco das ações de melhoria - FMEA",
    "Desenvolver pilotos para as ações críticas para o negócio",
    "Implementação de ações corretivas",
    "Fazer reuniões de acompanhamento das ações",
    "Recalcular a capacidade do processo após melhorias.",
    "Organização dos documentos da fase Melhorar",
    "Enviar comunicações periódicas"
  ],
  control: [
    "Criação de um plano de controle para monitoramento contínuo.",
    "Desenvolvimento de gráficos de controle para as variáveis críticas.",
    "Desenvolvimento de pokayokes para as variáveis críticas",
    "Treinamento das equipes sobre os novos processos ou padrões.",
    "Criação ou atualização de procedimentos",
    "Documentação das lições aprendidas.",
    "Verificação de sustentabilidade das melhorias (auditorias periódicas).",
    "Encerramento oficial do projeto e compartilhamento dos resultados",
    "Lançamento do projeto no sistema (se existir)"
  ]
};

const DEFAULT_STRUCTURE: PhaseActivities[] = [
  { id: 'define', name: 'Definir', activities: [], isOpen: true, weight: 15 },
  { id: 'measure', name: 'Medir', activities: [], isOpen: false, weight: 20 },
  { id: 'analyze', name: 'Analisar', activities: [], isOpen: false, weight: 20 },
  { id: 'improve', name: 'Melhorar', activities: [], isOpen: false, weight: 30 },
  { id: 'control', name: 'Controlar', activities: [], isOpen: false, weight: 15 },
];

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Atividades detalhadas por fase, com início/fim, responsável e status realistas.
const DETALHADO_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    projeto: 'Redução do Tempo de Aprovação de Pedidos de Compra',
    fases: [
      {
        name: 'Definir',
        atividades: [
          { text: 'Desenvolver o Project Charter do projeto', inicio: '03/02/2026', fim: '07/02/2026', responsavel: 'Analista de Processos', status: 'Concluída' },
          { text: 'Mapear stakeholders e criar plano de comunicação', inicio: '08/02/2026', fim: '14/02/2026', responsavel: 'Gerente de Compras', status: 'Concluída' },
          { text: 'Definir escopo e metas do projeto', inicio: '15/02/2026', fim: '18/02/2026', responsavel: 'Sponsor', status: 'Em Andamento' },
        ],
      },
      {
        name: 'Medir',
        atividades: [
          { text: 'Coletar tempos de cada etapa da aprovação', inicio: '19/02/2026', fim: '05/03/2026', responsavel: 'Analista de Processos', status: 'Em Andamento' },
          { text: 'Elaborar plano de coleta de dados', inicio: '06/03/2026', fim: '12/03/2026', responsavel: 'Analista de Dados', status: 'Não Iniciada' },
          { text: 'Mapear o processo atual (As-Is)', inicio: '13/03/2026', fim: '20/03/2026', responsavel: 'Analista de Processos', status: 'Não Iniciada' },
        ],
      },
      {
        name: 'Analisar',
        atividades: [
          { text: 'Identificar gargalos com Pareto dos atrasos', inicio: '23/03/2026', fim: '10/04/2026', responsavel: 'Analista de Dados', status: 'Não Iniciada' },
          { text: 'Aplicar 5 Porquês nas causas críticas', inicio: '13/04/2026', fim: '07/05/2026', responsavel: 'Equipe do Projeto', status: 'Não Iniciada' },
        ],
      },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    projeto: 'Redução de Refugo na Linha de Injeção Plástica',
    fases: [
      {
        name: 'Definir',
        atividades: [
          { text: 'Definir o problema e impacto no refugo', inicio: '06/01/2026', fim: '10/01/2026', responsavel: 'Eng. de Processo', status: 'Concluída' },
          { text: 'Criar SIPOC da linha de injeção', inicio: '11/01/2026', fim: '16/01/2026', responsavel: 'Supervisor de Produção', status: 'Concluída' },
          { text: 'Reunião de kick off com a equipe de chão de fábrica', inicio: '17/01/2026', fim: '21/01/2026', responsavel: 'Líder de Célula', status: 'Em Andamento' },
        ],
      },
      {
        name: 'Medir',
        atividades: [
          { text: 'Coletar dados de refugo por turno e molde', inicio: '22/01/2026', fim: '07/02/2026', responsavel: 'Operador / Apontamento', status: 'Em Andamento' },
          { text: 'Realizar análise do sistema de medição (MSA)', inicio: '08/02/2026', fim: '15/02/2026', responsavel: 'Eng. da Qualidade', status: 'Não Iniciada' },
          { text: 'Calcular capacidade do processo (Cp/Cpk)', inicio: '16/02/2026', fim: '22/02/2026', responsavel: 'Eng. de Processo', status: 'Não Iniciada' },
        ],
      },
      {
        name: 'Analisar',
        atividades: [
          { text: 'Construir Ishikawa das causas de refugo', inicio: '23/02/2026', fim: '12/03/2026', responsavel: 'Equipe da Qualidade', status: 'Não Iniciada' },
          { text: 'Validar causas raízes com dados do processo', inicio: '13/03/2026', fim: '08/04/2026', responsavel: 'Eng. de Processo', status: 'Não Iniciada' },
        ],
      },
    ],
  },
];

// ── Datas ──────────────────────────────────────────────────────────────────
// Tudo em data LOCAL (yyyy-mm-dd). toISOString() converteria para UTC e, no
// Brasil à noite, a data sairia um dia adiantada.

function paraISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function deISO(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, (m || 1) - 1, d || 1);
}
function somarDias(d: Date, dias: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + dias);
  return n;
}
export function hojeISO(): string {
  return paraISO(new Date());
}
function dataBR(s?: string): string {
  if (!s) return '—';
  const [a, m, d] = s.split('-');
  return a && m && d ? `${d}/${m}/${a}` : s;
}

/**
 * Distribui as datas pela duração escolhida.
 *
 * Cada fase do DMAIC recebe uma fatia proporcional ao seu `weight` (Definir
 * 15%, Medir 20%, Analisar 20%, Melhorar 30%, Controlar 15%), as fases vêm uma
 * depois da outra, e dentro de cada fase as atividades dividem o tempo em
 * partes iguais, em sequência. É uma sugestão de partida — o aluno ajusta.
 */
export function distribuirDatas(fases: PhaseActivities[], duracao: Duracao): PhaseActivities[] {
  const inicio = deISO(duracao.inicio);
  const fimProjeto = new Date(inicio);
  fimProjeto.setMonth(fimProjeto.getMonth() + duracao.meses);
  const totalDias = Math.max(fases.length, Math.round((fimProjeto.getTime() - inicio.getTime()) / 86_400_000));
  const totalPeso = fases.reduce((s, f) => s + (f.weight || 1), 0) || 1;

  let cursor = 0;
  return fases.map((fase, i) => {
    const ultima = i === fases.length - 1;
    const dias = ultima
      ? totalDias - cursor
      : Math.max(1, Math.round((totalDias * (fase.weight || 1)) / totalPeso));
    const inicioFase = cursor;
    cursor += dias;

    const n = fase.activities.length;
    return {
      ...fase,
      activities: fase.activities.map((a, k) => {
        const de = inicioFase + Math.floor((k * dias) / n);
        const ate = Math.max(de, inicioFase + Math.floor(((k + 1) * dias) / n) - 1);
        return { ...a, plannedStart: paraISO(somarDias(inicio, de)), plannedFinish: paraISO(somarDias(inicio, ate)) };
      }),
    };
  });
}

/** Atrasada = o prazo já passou e ela não foi concluída. */
function estaAtrasada(a: Activity, hoje: string): boolean {
  return a.status !== 'Completed' && Boolean(a.plannedFinish) && (a.plannedFinish as string) < hoje;
}

export default function DetailedTimeline({ onSave, initialData }: DetailedTimelineProps) {
  const [aba, setAba] = useState<'atividades' | 'acompanhamento'>('atividades');
  const [phases, setPhases] = useState<PhaseActivities[]>(initialData?.phases || DEFAULT_STRUCTURE);
  const [duracao, setDuracao] = useState<Duracao>(initialData?.duracao || { meses: 6, inicio: hojeISO() });
  const [notasAbertas, setNotasAbertas] = useState<string | null>(null);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0);

  useEffect(() => {
    if (initialData?.phases) setPhases(initialData.phases);
    if (initialData?.duracao) setDuracao(initialData.duracao);
  }, [initialData]);

  const salvar = (novasFases: PhaseActivities[] = phases, novaDuracao: Duracao = duracao) =>
    onSave({ phases: novasFases, duracao: novaDuracao });

  const temAtividades = phases.some((p) => p.activities.length > 0);

  const sugerirAtividades = () => {
    if (temAtividades && !window.confirm(
      'Isto substitui as atividades atuais pelas sugeridas, com datas novas. Continuar?',
    )) return;

    const base = phases.map((fase) => ({
      ...fase,
      isOpen: fase.id === 'define',
      activities: (SUGGESTED_ACTIVITIES[fase.id] || []).map((text) => ({
        id: crypto.randomUUID(),
        text,
        status: 'Not Started' as const,
        owner: '',
        notes: '',
      })),
    }));
    const comDatas = distribuirDatas(base, duracao);
    setPhases(comDatas);
    salvar(comDatas, duracao);
    toast.success(`Atividades sugeridas para ${duracao.meses} meses.`);
  };

  /**
   * Mudou a duração ou o início com atividades já na tela: redistribui as
   * datas, mas mantém o texto, o responsável e o status que o aluno já pôs.
   */
  const mudarDuracao = (nova: Duracao) => {
    setDuracao(nova);
    if (!temAtividades) { salvar(phases, nova); return; }
    const redistribuidas = distribuirDatas(phases, nova);
    setPhases(redistribuidas);
    salvar(redistribuidas, nova);
  };

  const updateActivity = (phaseId: string, activityId: string, updates: Partial<Activity>) => {
    setPhases((prev) => prev.map((phase) => phase.id !== phaseId ? phase : {
      ...phase,
      activities: phase.activities.map((act) => {
        if (act.id !== activityId) return act;
        const novo = { ...act, ...updates };
        if (updates.status === 'Completed' && act.status !== 'Completed') novo.actualFinish = hojeISO();
        else if (updates.status && updates.status !== 'Completed') novo.actualFinish = undefined;
        return novo;
      }),
    }));
  };

  const addActivity = (phaseId: string) => {
    const fase = phases.find((p) => p.id === phaseId);
    const ultima = fase?.activities[fase.activities.length - 1];
    const nova: Activity = {
      id: crypto.randomUUID(),
      text: 'Nova atividade',
      status: 'Not Started',
      plannedStart: ultima?.plannedFinish || '',
      plannedFinish: ultima?.plannedFinish || '',
    };
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, activities: [...p.activities, nova] } : p)));
  };

  const removerActivity = (phaseId: string, activityId: string) =>
    setPhases((prev) => prev.map((p) => (p.id === phaseId
      ? { ...p, activities: p.activities.filter((a) => a.id !== activityId) }
      : p)));

  const togglePhase = (id: string) =>
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, isOpen: !p.isOpen } : p)));

  // ── Acompanhamento, em português simples ──
  const resumo = useMemo(() => {
    const hoje = hojeISO();
    const todas = phases.flatMap((p) => p.activities.map((a) => ({ ...a, fase: p.name })));
    const total = todas.length;
    const concluidas = todas.filter((a) => a.status === 'Completed').length;
    const atrasadas = todas.filter((a) => estaAtrasada(a, hoje));
    const deveriamEstarProntas = todas.filter((a) => a.plannedFinish && a.plannedFinish < hoje).length;

    const fases = phases.map((p) => {
      const n = p.activities.length;
      const feitas = p.activities.filter((a) => a.status === 'Completed').length;
      const atrasadasFase = p.activities.filter((a) => estaAtrasada(a, hoje)).length;
      const comecou = p.activities.some((a) => a.status !== 'Not Started');
      const situacao = n === 0 ? 'Sem atividades'
        : feitas === n ? 'Concluída'
        : atrasadasFase > 0 ? 'Com atraso'
        : comecou ? 'Em andamento'
        : 'Não começou';
      return { id: p.id, nome: p.name, n, feitas, atrasadas: atrasadasFase, pct: n ? Math.round((feitas / n) * 100) : 0, situacao };
    });

    const datas = todas.map((a) => a.plannedFinish).filter(Boolean).sort() as string[];
    return {
      total,
      concluidas,
      pct: total ? Math.round((concluidas / total) * 100) : 0,
      esperado: total ? Math.round((deveriamEstarProntas / total) * 100) : 0,
      atrasadas,
      fases,
      fimPrevisto: datas[datas.length - 1],
    };
  }, [phases]);

  const progressoFase = (id: string) => resumo.fases.find((f) => f.id === id);

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
      {/* Abas e ações */}
      <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row">
        <div className="flex w-fit rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setAba('atividades')}
            className={cn('flex items-center gap-2 rounded-md px-6 py-2 text-sm font-bold transition-all',
              aba === 'atividades' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <ListTodo size={16} /> Atividades
          </button>
          <button
            onClick={() => setAba('acompanhamento')}
            className={cn('flex items-center gap-2 rounded-md px-6 py-2 text-sm font-bold transition-all',
              aba === 'acompanhamento' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <BarChart3 size={16} /> Acompanhamento
          </button>
        </div>
        <button
          onClick={() => setShowExemplo(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[#1E2D6E] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-[#0033CC]"
        >
          <BookOpen size={14} /> Ver exemplo
        </button>
      </div>

      {aba === 'atividades' && (
        <div className="space-y-6">
          {/* SUGERIR ATIVIDADES — no padrão dos cartões da plataforma:
              VERDE = cria conteúdo ("Gerar …", AIPromptCard do ToolWrapper);
              AZUL  = traz da ferramenta anterior ("Sincronizar com …").
              Sugerir cria, então é verde. A duração fica DENTRO do cartão,
              antes do botão, como a data de início no "Gerar Cronograma".
              Vazia: cartão grande. Preenchida: barra fina, para ajustar a
              duração sem o cartão ocupar a tela — como o "Sincronizar"
              compacto. */}
          {!temAtividades ? (
            <div className="group relative mb-2 overflow-hidden rounded-2xl border border-emerald-100 bg-[#f0fdf4] p-8 shadow-sm">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-100/50 blur-3xl transition-colors group-hover:bg-emerald-200/50" />
              <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                    <Wand2 size={20} className="text-emerald-500" />
                    <p className="mb-2 text-xs font-black uppercase tracking-widest text-emerald-700">Sugerir Atividades</p>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    Escolha quanto tempo o projeto vai durar. As atividades de cada fase do DMAIC vêm com as datas
                    já distribuídas — depois é só ajustar.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SeletorDuracao duracao={duracao} aoMudar={mudarDuracao} />
                  </div>
                </div>
                <button
                  onClick={sugerirAtividades}
                  className="flex h-16 w-full min-w-[240px] cursor-pointer items-center justify-center gap-3 rounded-xl border-none bg-emerald-600 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-emerald-700 hover:shadow-emerald-200 active:scale-95 md:w-auto"
                >
                  <Sparkles size={20} />
                  <span>Sugerir Atividades</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-emerald-100 bg-[#f0fdf4] px-5 py-4">
              <div className="flex flex-wrap items-end gap-4">
                <SeletorDuracao duracao={duracao} aoMudar={mudarDuracao} />
                <p className="m-0 max-w-xs pb-2 text-[11px] text-emerald-900/80">
                  Mudar a duração ou o início refaz as datas e mantém o que você já escreveu.
                </p>
              </div>
              <button
                onClick={sugerirAtividades}
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-none bg-emerald-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-700 active:scale-95"
              >
                <Sparkles size={14} /> Sugerir de novo
              </button>
            </div>
          )}

          <div className="flex items-center justify-between rounded-[8px] border border-[#ccc] bg-white p-5 shadow-sm">
            <div>
              <h2 className="m-0 text-xl font-bold text-gray-800">Execução do Projeto</h2>
              <p className="m-0 text-sm text-gray-500">
                {resumo.total
                  ? `${resumo.concluidas} de ${resumo.total} atividades concluídas${resumo.fimPrevisto ? ` · término previsto em ${dataBR(resumo.fimPrevisto)}` : ''}`
                  : 'Escolha a duração e clique em Sugerir Atividades.'}
              </p>
            </div>
            <button
              data-save-trigger
              onClick={() => salvar()}
              className="rounded-[4px] bg-[#10b981] px-6 py-2 text-sm font-bold text-white hover:bg-green-600"
            >
              Salvar Progresso
            </button>
          </div>

          <div className="space-y-4">
            {phases.map((phase) => {
              const pf = progressoFase(phase.id);
              return (
                <div key={phase.id} className="overflow-hidden rounded-[8px] border border-[#eee] bg-white shadow-sm">
                  <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50" onClick={() => togglePhase(phase.id)}>
                    <div className="flex items-center gap-3">
                      {phase.isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                      <h3 className="m-0 font-bold text-gray-800">{phase.name}</h3>
                      {pf && pf.atrasadas > 0 && (
                        <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          {pf.atrasadas} atrasada{pf.atrasadas > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-gray-400">Concluído</div>
                        <div className="text-sm font-bold text-gray-700">{pf?.pct ?? 0}%</div>
                      </div>
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full bg-blue-500" style={{ width: `${pf?.pct ?? 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {phase.isOpen && (
                    <div className="space-y-2 border-t border-[#eee] bg-gray-50/30 p-4">
                      {phase.activities.length > 0 && (
                        <div className="mb-1 grid grid-cols-[110px_1fr_118px_118px_130px_44px] gap-2 px-2 text-[9px] font-bold uppercase text-gray-400">
                          <span>Status</span><span>Atividade</span><span>Início</span><span>Fim</span><span>Responsável</span><span />
                        </div>
                      )}
                      {phase.activities.map((a) => {
                        const atrasada = estaAtrasada(a, hojeISO());
                        return (
                          <div
                            key={a.id}
                            className={cn('group grid grid-cols-[110px_1fr_118px_118px_130px_44px] items-center gap-2 rounded border bg-white p-2 transition-all hover:border-blue-200',
                              atrasada ? 'border-red-200' : 'border-gray-100')}
                          >
                            <select
                              value={a.status}
                              onChange={(e) => updateActivity(phase.id, a.id, { status: e.target.value as Activity['status'] })}
                              className={cn('rounded border-none px-1.5 py-1 text-[10px] font-bold focus:ring-0',
                                a.status === 'Completed' ? 'bg-green-100 text-green-700'
                                  : a.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}
                            >
                              <option value="Not Started">Não Iniciada</option>
                              <option value="In Progress">Em Andamento</option>
                              <option value="Completed">Concluída</option>
                            </select>

                            <div className="flex min-w-0 flex-col">
                              <input
                                value={a.text}
                                onChange={(e) => updateActivity(phase.id, a.id, { text: e.target.value })}
                                className="w-full border-none bg-transparent py-0 text-[12px] font-medium text-gray-700 focus:ring-0"
                              />
                              {a.status === 'Completed' && a.actualFinish && (
                                <span className="text-[9px] text-green-600">Concluída em {dataBR(a.actualFinish)}</span>
                              )}
                              {atrasada && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-red-600">
                                  <AlertCircle size={9} /> Atrasada — o prazo era {dataBR(a.plannedFinish)}
                                </span>
                              )}
                            </div>

                            <input
                              type="date"
                              value={a.plannedStart || ''}
                              onChange={(e) => updateActivity(phase.id, a.id, { plannedStart: e.target.value })}
                              className="rounded border-gray-100 bg-gray-50/50 p-1 text-[11px] outline-none focus:border-blue-300"
                            />
                            <input
                              type="date"
                              value={a.plannedFinish || ''}
                              onChange={(e) => updateActivity(phase.id, a.id, { plannedFinish: e.target.value })}
                              className="rounded border-gray-100 bg-gray-50/50 p-1 text-[11px] outline-none focus:border-blue-300"
                            />
                            <input
                              placeholder="Responsável"
                              value={a.owner || ''}
                              onChange={(e) => updateActivity(phase.id, a.id, { owner: e.target.value })}
                              className="rounded border-gray-100 bg-gray-50/50 p-1 text-[11px] outline-none focus:border-blue-300"
                            />

                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => setNotasAbertas(notasAbertas === a.id ? null : a.id)}
                                className={cn('rounded p-1 transition-colors hover:bg-gray-100', notasAbertas === a.id || a.notes ? 'text-blue-600' : 'text-gray-400')}
                                title="Notas"
                              >
                                <Info size={13} />
                              </button>
                              <button
                                onClick={() => removerActivity(phase.id, a.id)}
                                className="p-1 text-gray-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                                title="Apagar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {notasAbertas === a.id && (
                              <div className="col-span-full mt-1 rounded-lg border border-blue-100 bg-blue-50 p-2">
                                <textarea
                                  value={a.notes || ''}
                                  onChange={(e) => updateActivity(phase.id, a.id, { notes: e.target.value })}
                                  placeholder="Observações sobre esta atividade…"
                                  className="min-h-[50px] w-full rounded border border-blue-200 bg-white p-2 text-[11px] outline-none focus:ring-1 focus:ring-blue-400"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        onClick={() => addActivity(phase.id)}
                        className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-blue-200 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                      >
                        <Plus size={14} /> Adicionar Atividade
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {aba === 'acompanhamento' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {resumo.total === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              Ainda não há atividades. Vá em <strong>Atividades</strong>, escolha a duração e clique em Sugerir Atividades.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase text-gray-400">Já foi feito</span>
                  <div className="text-3xl font-black text-gray-800">{resumo.pct}%</div>
                  <p className="m-0 text-[12px] text-gray-500">{resumo.concluidas} de {resumo.total} atividades concluídas</p>
                </div>
                <div className="space-y-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase text-gray-400">Pelo cronograma, hoje deveria estar em</span>
                  <div className="text-3xl font-black text-gray-800">{resumo.esperado}%</div>
                  <p className={cn('m-0 text-[12px] font-bold', resumo.pct >= resumo.esperado ? 'text-green-600' : 'text-red-600')}>
                    {resumo.pct >= resumo.esperado ? 'Em dia' : `${resumo.esperado - resumo.pct} pontos atrás do planejado`}
                  </p>
                </div>
                <div className="space-y-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase text-gray-400">Atrasadas</span>
                  <div className={cn('text-3xl font-black', resumo.atrasadas.length ? 'text-red-600' : 'text-green-600')}>
                    {resumo.atrasadas.length}
                  </div>
                  <p className="m-0 text-[12px] text-gray-500">
                    {resumo.fimPrevisto ? `Término previsto: ${dataBR(resumo.fimPrevisto)}` : 'Sem datas definidas'}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <h3 className="m-0 font-bold text-gray-800">Como está cada fase</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {resumo.fases.map((f) => (
                    <div key={f.id} className="grid grid-cols-[120px_1fr_130px] items-center gap-4 px-4 py-3 text-sm">
                      <span className="font-bold text-gray-700">{f.nome}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className={cn('h-full', f.atrasadas ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${f.pct}%` }} />
                        </div>
                        <span className="w-24 text-right text-[12px] text-gray-500">{f.feitas} de {f.n}</span>
                      </div>
                      <span className={cn('w-fit rounded-full px-2.5 py-1 text-[11px] font-bold',
                        f.situacao === 'Com atraso' ? 'bg-red-100 text-red-700'
                          : f.situacao === 'Concluída' ? 'bg-green-100 text-green-700'
                          : f.situacao === 'Em andamento' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600')}
                      >
                        {f.situacao}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <CalendarDays size={16} className="text-red-500" />
                  <h3 className="m-0 font-bold text-gray-800">O que está atrasado</h3>
                </div>
                {resumo.atrasadas.length === 0 ? (
                  <p className="m-0 flex items-center gap-2 px-4 py-5 text-sm font-semibold text-green-700">
                    <CheckCircle2 size={16} /> Nenhuma atividade atrasada.
                  </p>
                ) : (
                  <>
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-bold uppercase text-gray-400">
                          <th className="p-3">Atividade</th>
                          <th className="p-3">Fase</th>
                          <th className="p-3">Prazo era</th>
                          <th className="p-3">Responsável</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {resumo.atrasadas.map((a) => (
                          <tr key={a.id}>
                            <td className="p-3 text-gray-800">{a.text}</td>
                            <td className="p-3 text-gray-600">{a.fase}</td>
                            <td className="p-3 font-mono text-red-600">{dataBR(a.plannedFinish)}</td>
                            <td className="p-3 text-gray-600">{a.owner || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="m-0 border-t border-gray-100 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
                      Para cada atrasada: converse com o responsável, entenda o que travou e combine uma nova data.
                      Se uma fase inteira atrasou, avalie se a próxima pode começar em paralelo.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Atividades Detalhadas</h3>
                  <p className="text-xs text-gray-500 m-0">{DETALHADO_EXEMPLOS[exemploIdx].projeto}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemplo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Abas — Escritório / Manufatura */}
            <div className="flex gap-2 px-6 pt-4">
              {DETALHADO_EXEMPLOS.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setExemploIdx(i)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                    exemploIdx === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">
              {DETALHADO_EXEMPLOS[exemploIdx].fases.map((fase, fi) => (
                <div key={fi} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-bold text-gray-800 text-sm m-0">{fase.name}</h4>
                  </div>
                  <table className="w-full text-[12px]">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="text-left p-2 font-black uppercase tracking-wider text-[9px] text-gray-500">Atividade</th>
                        <th className="text-left p-2 font-black uppercase tracking-wider text-[9px] text-gray-500">Início</th>
                        <th className="text-left p-2 font-black uppercase tracking-wider text-[9px] text-gray-500">Fim</th>
                        <th className="text-left p-2 font-black uppercase tracking-wider text-[9px] text-gray-500">Responsável</th>
                        <th className="text-left p-2 font-black uppercase tracking-wider text-[9px] text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fase.atividades.map((a, ai) => (
                        <tr key={ai} className="border-t border-gray-100">
                          <td className="p-2 text-gray-800">{a.text}</td>
                          <td className="p-2 font-mono text-gray-600 whitespace-nowrap">{a.inicio}</td>
                          <td className="p-2 font-mono text-gray-600 whitespace-nowrap">{a.fim}</td>
                          <td className="p-2 text-gray-600 whitespace-nowrap">{a.responsavel}</td>
                          <td className="p-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap',
                              a.status === 'Concluída' ? 'bg-green-100 text-green-700' :
                              a.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            )}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Este exemplo é só pra consulta — não altera os seus dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Duração e início, no estilo dos campos dos cartões verdes de "Gerar". */
function SeletorDuracao({ duracao, aoMudar }: { duracao: Duracao; aoMudar: (d: Duracao) => void }) {
  const rotulo = "mb-1 block text-[10px] font-black uppercase tracking-widest text-emerald-600";
  const campo = "rounded-xl border border-emerald-200 bg-white p-3 text-sm font-bold text-emerald-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  return (
    <>
      <label className="block">
        <span className={rotulo}>Quantos meses vai durar o projeto?</span>
        <select
          value={duracao.meses}
          onChange={(e) => aoMudar({ ...duracao, meses: Number(e.target.value) })}
          className={campo}
        >
          {OPCOES_MESES.map((m) => <option key={m} value={m}>{m} meses</option>)}
        </select>
      </label>
      <label className="block">
        <span className={rotulo}>Começa em</span>
        <input
          type="date"
          value={duracao.inicio}
          onChange={(e) => e.target.value && aoMudar({ ...duracao, inicio: e.target.value })}
          className={campo}
        />
      </label>
    </>
  );
}
