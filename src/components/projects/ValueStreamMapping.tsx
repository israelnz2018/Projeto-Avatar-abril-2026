import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, BarChart2, BookOpen, X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

/**
 * VSM — Mapa do Fluxo de Valor.
 *
 * Reescrito a partir do Kit Mapeando na Pratica. A versao anterior somava tempo de
 * ciclo com tempo de espera e chamava aquilo de lead time, o que esta errado: fila e
 * estoque entre etapas costumam responder pela maior parte do lead time e nao entravam
 * na conta. Tambem nao havia demanda do cliente, entao nao existia takt — e sem takt
 * nao existe a analise que da sentido ao VSM.
 *
 * O que a ferramenta calcula agora:
 *  - Takt = tempo disponivel / demanda do cliente.
 *  - Tempo em fila por etapa pela Lei de Little: quantidade em fila / taxa de saida.
 *  - Lead time = processo + espera declarada + tempo em fila.
 *  - %VA a partir da classificacao de cada etapa (VA / NVA necessario / desperdicio).
 *  - Operadores necessarios = soma dos tempos de ciclo / takt.
 *  - Gargalo = etapa cujo tempo de ciclo passa do takt.
 *
 * Regra do kit que atravessa tudo: separar o que foi CALCULADO do que foi ESTIMADO.
 * Por isso cada etapa carrega a fonte do dado, e etapa sem fonte aparece na secao de
 * dados ausentes em vez de virar numero confiavel silenciosamente.
 */

type Classificacao = 'VA' | 'NVA' | 'DESPERDICIO';

interface VSMStep {
  id: string;
  name: string;
  cycleTime: number;      // minutos por unidade
  waitingTime: number;    // minutos de espera declarada
  queueQty: number;       // pecas/pedidos parados ANTES desta etapa
  reworkRate: number;     // %
  availability: number;   // % de disponibilidade (uptime)
  peopleCount: number;
  classificacao: Classificacao;
  fonte: string;          // vazio = PENDENTE DE VALIDACAO
}

interface VSMHeader {
  processo: string;
  unidade: string;            // peca, pedido, atendimento...
  demanda: number;            // quantidade por periodo
  periodo: 'dia' | 'semana' | 'mes';
  tempoDisponivel: number;    // minutos disponiveis no mesmo periodo
  versao: string;
  status: 'RASCUNHO' | 'VALIDADO';
}

interface ValueStreamMappingProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const CLASSIFICACOES: { id: Classificacao; label: string; ajuda: string; cor: string }[] = [
  { id: 'VA', label: 'Agrega valor', ajuda: 'O cliente pagaria por esta etapa.', cor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'NVA', label: 'Necessário', ajuda: 'Não agrega valor, mas hoje não dá para eliminar (lei, norma, tecnologia).', cor: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: 'DESPERDICIO', label: 'Desperdício', ajuda: 'Não agrega valor e pode ser eliminado.', cor: 'bg-red-100 text-red-700 border-red-300' },
];

const HEADER_PADRAO: VSMHeader = {
  processo: '',
  unidade: 'pedido',
  demanda: 0,
  periodo: 'dia',
  tempoDisponivel: 480,
  versao: 'v01',
  status: 'RASCUNHO',
};

const novaEtapa = (): VSMStep => ({
  id: crypto.randomUUID(),
  name: '',
  cycleTime: 0,
  waitingTime: 0,
  queueQty: 0,
  reworkRate: 0,
  availability: 100,
  peopleCount: 1,
  classificacao: 'VA',
  fonte: '',
});

const fmt = (n: number, casas = 1) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: casas }) : '—';

export default function ValueStreamMapping({ onSave, initialData, onClearAIData }: ValueStreamMappingProps) {
  const [header, setHeader] = useState<VSMHeader>({ ...HEADER_PADRAO, ...(initialData?.header || {}) });
  const [steps, setSteps] = useState<VSMStep[]>(initialData?.steps || []);
  const [showExemplo, setShowExemplo] = useState(false);
  const [view, setView] = useState<'edit' | 'analysis'>('edit');

  useEffect(() => {
    if (initialData?.header) setHeader({ ...HEADER_PADRAO, ...initialData.header });
    if (Array.isArray(initialData?.steps)) setSteps(initialData.steps);
  }, [initialData]);

  const analise = useMemo(() => {
    const tempoProcesso = steps.reduce((s, e) => s + (e.cycleTime || 0), 0);
    const esperaDeclarada = steps.reduce((s, e) => s + (e.waitingTime || 0), 0);

    // Takt: ritmo que o cliente exige. Sem demanda declarada nao existe takt —
    // preferimos devolver null a inventar um numero.
    const takt = header.demanda > 0 ? header.tempoDisponivel / header.demanda : null;

    // Lei de Little: quanto tempo uma peca fica parada numa fila de N pecas,
    // dado o ritmo de saida. Sem takt nao da pra converter fila em tempo.
    const tempoEmFila = takt === null
      ? null
      : steps.reduce((s, e) => s + (e.queueQty || 0) * takt, 0);

    const leadTime = tempoEmFila === null ? null : tempoProcesso + esperaDeclarada + tempoEmFila;

    const tempoVA = steps.filter((e) => e.classificacao === 'VA').reduce((s, e) => s + (e.cycleTime || 0), 0);
    const percentualVA = leadTime && leadTime > 0 ? (tempoVA / leadTime) * 100 : null;

    // Operadores necessarios pelo ritmo do cliente.
    const operadoresNecessarios = takt && takt > 0 ? tempoProcesso / takt : null;
    const operadoresAtuais = steps.reduce((s, e) => s + (e.peopleCount || 0), 0);

    // Gargalo: a etapa mais lenta. Se ela passa do takt, o cliente nao e atendido.
    const gargalo = steps.length
      ? steps.reduce((pior, e) => ((e.cycleTime || 0) > (pior.cycleTime || 0) ? e : pior), steps[0])
      : null;
    const gargaloAcimaDoTakt = !!(takt && gargalo && gargalo.cycleTime > takt);

    const semFonte = steps.filter((e) => !e.fonte.trim() && e.name.trim());
    const semDisponibilidade = steps.filter((e) => e.name.trim() && (e.availability ?? 100) === 100);

    const pendencias: string[] = [];
    if (header.demanda <= 0) pendencias.push('Demanda do cliente não informada — sem ela não há takt, lead time real nem %VA.');
    if (!header.processo.trim()) pendencias.push('Nome do processo/família não informado.');
    if (semFonte.length) pendencias.push(`${semFonte.length} etapa(s) sem fonte do dado — tratar como PENDENTE DE VALIDAÇÃO.`);
    if (semDisponibilidade.length === steps.length && steps.length > 0) pendencias.push('Todas as etapas com disponibilidade 100% — confirme se foi medido ou se é suposição.');

    return {
      tempoProcesso, esperaDeclarada, takt, tempoEmFila, leadTime,
      tempoVA, percentualVA, operadoresNecessarios, operadoresAtuais,
      gargalo, gargaloAcimaDoTakt, pendencias,
    };
  }, [steps, header]);

  const atualizarEtapa = (id: string, campo: keyof VSMStep, valor: any) =>
    setSteps((prev) => prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e)));

  const numero = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0));
  const isToolEmpty = steps.length === 0;

  const Metrica = ({ titulo, valor, unidade, ajuda, alerta }: any) => (
    <div className={cn('p-4 rounded-xl border', alerta ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {titulo}
        {ajuda && <span title={ajuda}><Info size={11} className="text-gray-300" /></span>}
      </p>
      <p className={cn('text-2xl font-black mt-1', alerta ? 'text-red-700' : 'text-blue-900')}>
        {valor} {unidade && <span className="text-xs font-bold text-gray-400">{unidade}</span>}
      </p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {!isToolEmpty && initialData?.isGenerated && onClearAIData && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600">Gerado com IA</span>
          </div>
          <button onClick={() => window.confirm('Limpar os dados gerados pela IA?') && onClearAIData()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg border-none bg-transparent cursor-pointer">
            <Trash2 size={13} /> Limpar dados da IA
          </button>
        </div>
      )}

      <div className="bg-white p-6 border border-[#ccc] rounded-lg shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
          <BarChart2 className="text-purple-500" size={24} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#333]">VSM — Mapa do Fluxo de Valor</h2>
            <p className="text-xs text-[#666]">Onde o tempo é consumido e quanto disso é valor para o cliente.</p>
          </div>
          <button onClick={() => setShowExemplo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0">
            <BookOpen size={14} /> Ver exemplo
          </button>
        </div>

        {/* Cabecalho: e daqui que sai o takt */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Processo / família</label>
            <input value={header.processo} onChange={(e) => setHeader({ ...header, processo: e.target.value })}
              placeholder="Ex: Atendimento de pedidos do e-commerce"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Unidade de análise</label>
            <input value={header.unidade} onChange={(e) => setHeader({ ...header, unidade: e.target.value })}
              placeholder="peça, pedido, atendimento"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block">Demanda do cliente *</label>
            <input type="number" min={0} value={header.demanda || ''} onChange={(e) => setHeader({ ...header, demanda: numero(e.target.value) })}
              placeholder="Ex: 120"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-[10px] text-gray-400 mt-1">Quantas unidades o cliente pede por período. Sem isso não há takt.</p>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Período</label>
            <select value={header.periodo} onChange={(e) => setHeader({ ...header, periodo: e.target.value as VSMHeader['periodo'] })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="dia">por dia</option>
              <option value="semana">por semana</option>
              <option value="mes">por mês</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Tempo disponível (min)</label>
            <input type="number" min={0} value={header.tempoDisponivel || ''} onChange={(e) => setHeader({ ...header, tempoDisponivel: numero(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-[10px] text-gray-400 mt-1">No mesmo período da demanda.</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-100 pt-1">
          {(['edit', 'analysis'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-4 py-2 text-[11px] font-black uppercase tracking-widest border-0 bg-transparent cursor-pointer border-b-2',
                view === v ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600')}>
              {v === 'edit' ? 'Etapas' : 'Análise'}
            </button>
          ))}
        </div>

        {view === 'edit' ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-sm" style={{ minWidth: 1100 }}>
                <thead>
                  <tr className="bg-slate-100">
                    {[
                      ['Etapa', 'Nome da etapa do fluxo'],
                      ['Tempo de ciclo (min)', 'Intervalo entre duas saídas consecutivas desta etapa'],
                      ['Espera (min)', 'Espera declarada depois desta etapa'],
                      ['Fila / estoque', `Quantas unidades ficam paradas ANTES desta etapa`],
                      ['Retrabalho %', 'Percentual que volta para refação'],
                      ['Disponib. %', 'Quanto do tempo o recurso está realmente disponível'],
                      ['Pessoas', 'Operadores alocados'],
                      ['Classificação', 'O cliente pagaria por esta etapa?'],
                      ['Fonte do dado', 'De onde veio o número. Vazio = PENDENTE DE VALIDAÇÃO'],
                      ['', ''],
                    ].map(([t, ajuda], i) => (
                      <th key={i} title={ajuda} className="px-3 py-3 border border-slate-300 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {steps.map((etapa) => (
                    <tr key={etapa.id}>
                      <td className="border border-slate-300 p-1">
                        <input value={etapa.name} onChange={(e) => atualizarEtapa(etapa.id, 'name', e.target.value)}
                          placeholder="Ex: Separar material" className="w-full px-2 py-1.5 border-0 focus:outline-none text-sm" style={{ minWidth: 180 }} />
                      </td>
                      {(['cycleTime', 'waitingTime', 'queueQty', 'reworkRate', 'availability', 'peopleCount'] as const).map((campo) => (
                        <td key={campo} className="border border-slate-300 p-1">
                          <input type="number" min={0} value={etapa[campo] || ''} onChange={(e) => atualizarEtapa(etapa.id, campo, numero(e.target.value))}
                            className="w-full px-2 py-1.5 border-0 focus:outline-none text-sm text-right" style={{ minWidth: 70 }} />
                        </td>
                      ))}
                      <td className="border border-slate-300 p-1">
                        <select value={etapa.classificacao} onChange={(e) => atualizarEtapa(etapa.id, 'classificacao', e.target.value)}
                          className={cn('w-full px-2 py-1.5 rounded border text-[11px] font-bold cursor-pointer',
                            CLASSIFICACOES.find((c) => c.id === etapa.classificacao)?.cor)}>
                          {CLASSIFICACOES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="border border-slate-300 p-1">
                        <input value={etapa.fonte} onChange={(e) => atualizarEtapa(etapa.id, 'fonte', e.target.value)}
                          placeholder="Ex: cronometragem 12/03"
                          className={cn('w-full px-2 py-1.5 border-0 focus:outline-none text-sm', !etapa.fonte.trim() && 'bg-amber-50')}
                          style={{ minWidth: 150 }} />
                      </td>
                      <td className="border border-slate-300 p-1 text-center">
                        <button onClick={() => setSteps((p) => p.filter((s) => s.id !== etapa.id))}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded border-0 bg-transparent cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {steps.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                      Nenhuma etapa ainda. Comece pela primeira atividade do fluxo.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={() => setSteps((p) => [...p, novaEtapa()])}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer">
              <Plus size={14} /> Adicionar etapa
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Metricas calculadas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metrica titulo="Takt time" valor={analise.takt === null ? '—' : fmt(analise.takt)} unidade={analise.takt === null ? '' : `min/${header.unidade || 'un'}`}
                ajuda="Tempo disponível ÷ demanda do cliente. É o ritmo que o cliente exige." />
              <Metrica titulo="Tempo de processo" valor={fmt(analise.tempoProcesso)} unidade="min"
                ajuda="Soma dos tempos de ciclo." />
              <Metrica titulo="Lead time" valor={analise.leadTime === null ? '—' : fmt(analise.leadTime)} unidade={analise.leadTime === null ? '' : 'min'}
                ajuda="Processo + espera + tempo em fila (Lei de Little)." />
              <Metrica titulo="% Valor agregado" valor={analise.percentualVA === null ? '—' : fmt(analise.percentualVA)} unidade={analise.percentualVA === null ? '' : '%'}
                ajuda="Tempo que agrega valor ÷ lead time." />
            </div>

            {analise.takt === null && (
              <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>Informe a <strong>demanda do cliente</strong> no cabeçalho. Sem ela não é possível calcular takt, lead time real nem %VA — e o VSM vira só uma soma de tempos.</span>
              </div>
            )}

            {/* Ciclo x Takt: a barra que passa da linha e o gargalo */}
            {analise.takt !== null && steps.length > 0 && (
              <div className="p-5 bg-white border border-gray-200 rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                  Tempo de ciclo × Takt — barra acima da linha não atende o cliente
                </p>
                <div className="space-y-2">
                  {steps.filter((e) => e.name.trim()).map((etapa) => {
                    const maxRef = Math.max(analise.takt!, ...steps.map((s) => s.cycleTime || 0)) || 1;
                    const acima = etapa.cycleTime > analise.takt!;
                    return (
                      <div key={etapa.id} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 text-xs font-bold text-gray-600 truncate" title={etapa.name}>{etapa.name}</span>
                        <div className="flex-1 relative h-7 bg-gray-50 rounded">
                          <div className={cn('h-full rounded transition-all', acima ? 'bg-red-500' : 'bg-emerald-500')}
                            style={{ width: `${Math.min(100, ((etapa.cycleTime || 0) / maxRef) * 100)}%` }} />
                          <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-700"
                            style={{ left: `${Math.min(100, (analise.takt! / maxRef) * 100)}%` }} title={`Takt: ${fmt(analise.takt!)} min`} />
                        </div>
                        <span className={cn('w-20 text-right text-xs font-black', acima ? 'text-red-600' : 'text-gray-500')}>
                          {fmt(etapa.cycleTime)} min
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-3">Linha tracejada = takt ({fmt(analise.takt)} min).</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Gargalo provável</p>
                {analise.gargalo && analise.gargalo.name.trim() ? (
                  <>
                    <p className="text-sm font-black text-gray-800">{analise.gargalo.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Maior tempo de ciclo: {fmt(analise.gargalo.cycleTime)} min
                      {analise.gargaloAcimaDoTakt && <strong className="text-red-600"> — acima do takt, não atende a demanda.</strong>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">Evidência: {analise.gargalo.fonte.trim() || 'PENDENTE DE VALIDAÇÃO'}</p>
                  </>
                ) : <p className="text-sm text-gray-400">Sem etapas suficientes.</p>}
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Operadores</p>
                <p className="text-sm text-gray-700">
                  Necessários pelo takt: <strong>{analise.operadoresNecessarios === null ? '—' : fmt(analise.operadoresNecessarios)}</strong>
                </p>
                <p className="text-sm text-gray-700">Alocados hoje: <strong>{analise.operadoresAtuais}</strong></p>
                <p className="text-[11px] text-gray-400 mt-1">Soma dos tempos de ciclo ÷ takt.</p>
              </div>
            </div>

            {/* O kit exige separar calculado de estimado */}
            {analise.pendencias.length > 0 && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Hipóteses e dados ausentes</p>
                <ul className="space-y-1.5">
                  {analise.pendencias.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-amber-900">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {showExemplo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExemplo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 sticky top-0 bg-white">
              <h3 className="text-base font-black text-gray-800">Como preencher</h3>
              <button onClick={() => setShowExemplo(false)} className="p-1.5 hover:bg-gray-100 rounded-lg border-0 bg-transparent cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-gray-600">
              <p><strong className="text-gray-800">Takt time</strong> — se o cliente pede 120 pedidos por dia e você tem 480 minutos, o takt é 4 min/pedido. Toda etapa mais lenta que isso atrasa o cliente.</p>
              <p><strong className="text-gray-800">Fila / estoque</strong> — quantas unidades ficam paradas antes da etapa. É aqui que o lead time se esconde: 30 pedidos parados num takt de 4 min são 120 minutos de espera.</p>
              <p><strong className="text-gray-800">Classificação</strong> — pergunte se o cliente pagaria por aquela etapa. Conferir documento pela terceira vez não é valor; é desperdício.</p>
              <p><strong className="text-gray-800">Fonte do dado</strong> — escreva de onde veio o número (cronometragem, sistema, entrevista). Etapa sem fonte entra em "dados ausentes" e não vira conclusão.</p>
              {CLASSIFICACOES.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className={cn('px-2 py-0.5 rounded border text-[10px] font-black shrink-0', c.cor)}>{c.label}</span>
                  <span className="text-[13px]">{c.ajuda}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button data-save-trigger onClick={() => onSave({ header, steps })} className="hidden" />
    </div>
  );
}
