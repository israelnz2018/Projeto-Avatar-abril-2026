import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, Info } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';

// ============================================================================
// Ganhos Tangíveis do Projeto (toolId: tangibleGains)
// Duas abas. 3 modos por linha:
//   coef×vol   — coef × volume = quantidade → × custo/unid = valor mensal (R$)
//   quantidade — digita a quantidade → × custo/unid = valor mensal (R$)
//   R$ direto  — digita o valor mensal em R$ (cliente calculou por fora)
//
// ANÁLISE DE VARIAÇÃO (o time controla quantidade, não preço):
//   Ganho TEÓRICO = variação de eficiência × PREÇO CONGELADO (média da baseline)
//   Ganho REAL    = variação de eficiência × preço do mês
//   Efeito preço  = real − teórico  (movimento de mercado, não mérito do time)
// ============================================================================

type Mode = 'coef' | 'direct' | 'money';
type Direction = 'lower' | 'higher';

interface MonthRow {
  id: string;
  label: string;
  mode: Mode;
  coef: string;
  volume: string;
  value: string;
  custo: string;
  valorRS: string;
}

interface TangibleGainsProps {
  onSave: (data: any) => void;
  initialData?: any;
}

const num = (s: any): number => {
  if (typeof s === 'number') return s;
  if (s == null || s === '') return 0;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const fmt = (n: number, dec = 0): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtBRL = (n: number): string => `R$ ${fmt(n, 0)}`;

const monthLabel = (offset: number): string => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
};

const mkRow = (label: string, id: string): MonthRow => ({ id, label, mode: 'coef', coef: '', volume: '', value: '', custo: '', valorRS: '' });
const defaultBaseline = (): MonthRow[] => Array.from({ length: 12 }, (_, i) => mkRow(monthLabel(i - 12), `b${i}`));
const defaultAfter = (): MonthRow[] => Array.from({ length: 6 }, (_, i) => mkRow(monthLabel(i), `a${i}`));

export default function TangibleGainsTool({ onSave, initialData }: TangibleGainsProps) {
  const d = initialData?.toolData || initialData;

  const [indicator, setIndicator] = useState<string>(d?.indicator || '');
  const [unit, setUnit] = useState<string>(d?.unit || '');
  const [direction, setDirection] = useState<Direction>(d?.direction || 'lower');
  const [custoPadrao, setCustoPadrao] = useState<string>(d?.custoPadrao ?? d?.unitValue ?? '');
  const [precoCongeladoManual, setPrecoCongeladoManual] = useState<string>(d?.precoCongelado ?? '');
  const [baselineRows, setBaselineRows] = useState<MonthRow[]>(d?.baselineRows?.length ? d.baselineRows : defaultBaseline());
  const [afterRows, setAfterRows] = useState<MonthRow[]>(d?.afterRows?.length ? d.afterRows : defaultAfter());
  const [tab, setTab] = useState<'antes' | 'depois' | 'resultado'>('antes');
  const [barMetric, setBarMetric] = useState<'coef' | 'qty'>('coef');

  useEffect(() => {
    const nd = initialData?.toolData || initialData;
    if (!nd) return;
    if (typeof nd.indicator === 'string') setIndicator(nd.indicator);
    if (typeof nd.unit === 'string') setUnit(nd.unit);
    if (nd.direction) setDirection(nd.direction);
    if (nd.custoPadrao !== undefined || nd.unitValue !== undefined) setCustoPadrao(String(nd.custoPadrao ?? nd.unitValue ?? ''));
    if (nd.precoCongelado !== undefined) setPrecoCongeladoManual(String(nd.precoCongelado ?? ''));
    if (Array.isArray(nd.baselineRows) && nd.baselineRows.length) setBaselineRows(nd.baselineRows);
    if (Array.isArray(nd.afterRows) && nd.afterRows.length) setAfterRows(nd.afterRows);
  }, [initialData]);

  const dir = direction === 'lower' ? 1 : -1;
  const padrao = num(custoPadrao);
  const effCusto = (r: MonthRow): number => (r.custo !== '' ? num(r.custo) : padrao);
  const qtyOf = (r: MonthRow): number => (r.mode === 'coef' ? num(r.coef) * num(r.volume) : r.mode === 'direct' ? num(r.value) : 0);
  const valorMensal = (r: MonthRow): number => (r.mode === 'money' ? num(r.valorRS) : qtyOf(r) * effCusto(r));
  const hasData = (r: MonthRow): boolean =>
    r.mode === 'coef' ? r.coef !== '' && r.volume !== '' : r.mode === 'direct' ? r.value !== '' : r.valorRS !== '';

  // ---- Baseline ----
  const baseline = useMemo(() => {
    const qtys: number[] = [];
    const coefs: number[] = [];
    const valores: number[] = [];
    const custos: number[] = [];
    baselineRows.forEach((r) => {
      if (!hasData(r)) return;
      if (r.mode !== 'money') {
        qtys.push(qtyOf(r));
        custos.push(effCusto(r));
      }
      if (r.mode === 'coef') coefs.push(num(r.coef));
      valores.push(valorMensal(r));
    });
    const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    return {
      qtyAvg: avg(qtys),
      coefAvg: coefs.length ? avg(coefs) : null,
      valorAvg: avg(valores),
      custoAvg: custos.length ? avg(custos) : padrao,
      filledCount: valores.length,
    };
  }, [baselineRows, custoPadrao]);

  // Preço congelado: o informado manualmente, senão a média de custo da baseline.
  const precoCongelado = precoCongeladoManual !== '' ? num(precoCongeladoManual) : baseline.custoAvg;

  // ---- Depois ----
  const after = useMemo(() => {
    let accTeo = 0;
    let accReal = 0;
    let accFis = 0;
    const afterCoefs: number[] = [];
    const afterValores: number[] = [];
    const rows = afterRows.map((r) => {
      const ok = hasData(r);
      const vm = valorMensal(r);
      const c = effCusto(r);
      let gFis = 0;
      let gTeo = 0;
      let gReal = 0;
      if (ok) {
        if (r.mode === 'money') {
          // R$ direto: não dá pra separar quantidade de preço — teórico = real.
          gReal = dir * (baseline.valorAvg - vm);
          gTeo = gReal;
        } else {
          if (r.mode === 'coef' && baseline.coefAvg != null) {
            gFis = dir * (baseline.coefAvg - num(r.coef)) * num(r.volume);
            afterCoefs.push(num(r.coef));
          } else {
            gFis = dir * (baseline.qtyAvg - qtyOf(r));
          }
          gTeo = gFis * precoCongelado; // preço congelado → mérito do time
          gReal = gFis * c;             // preço do mês → caixa
        }
        accFis += gFis;
        accTeo += gTeo;
        accReal += gReal;
        afterValores.push(vm);
      }
      return { row: r, ok, vm, gFis, gTeo, gReal, accTeo, accReal };
    });
    const filled = rows.filter((x) => x.ok).length;
    const afterCoefAvg = afterCoefs.length ? afterCoefs.reduce((s, x) => s + x, 0) / afterCoefs.length : null;
    const afterValorAvg = afterValores.length ? afterValores.reduce((s, x) => s + x, 0) / afterValores.length : null;
    let pct: number | null = null;
    if (baseline.coefAvg != null && afterCoefAvg != null && baseline.coefAvg !== 0)
      pct = (dir * (baseline.coefAvg - afterCoefAvg) / baseline.coefAvg) * 100;
    else if (afterValorAvg != null && baseline.valorAvg !== 0)
      pct = (dir * (baseline.valorAvg - afterValorAvg) / baseline.valorAvg) * 100;
    return { rows, filled, afterCoefAvg, accTeo, accReal, accFis, efeitoPreco: accReal - accTeo, pct };
  }, [afterRows, baseline, dir, custoPadrao, precoCongelado]);

  // ---- Dados do gráfico (aba Resultado) ----
  // Linha do tempo contínua: meses do Antes seguidos dos meses do Depois.
  // Barras = coeficiente ou quantidade (antes x depois em cores distintas).
  // Linhas = ganho real e ganho teórico (só existem no período pós-projeto).
  const hasAnyCoef = useMemo(
    () => baselineRows.some((r) => r.mode === 'coef' && r.coef !== '') || afterRows.some((r) => r.mode === 'coef' && r.coef !== ''),
    [baselineRows, afterRows]
  );
  const metric: 'coef' | 'qty' = barMetric === 'coef' && !hasAnyCoef ? 'qty' : barMetric;

  const chartData = useMemo(() => {
    const rows: any[] = [];
    baselineRows.forEach((r, i) => {
      if (!hasData(r)) return;
      rows.push({
        label: r.label || `A${i + 1}`,
        coefAntes: r.mode === 'coef' ? num(r.coef) : null,
        qtyAntes: r.mode !== 'money' ? qtyOf(r) : null,
        coefDepois: null, qtyDepois: null, ganhoReal: null, ganhoTeo: null,
      });
    });
    after.rows.forEach((x, i) => {
      if (!x.ok) return;
      const r = x.row;
      rows.push({
        label: r.label || `D${i + 1}`,
        coefAntes: null, qtyAntes: null,
        coefDepois: r.mode === 'coef' ? num(r.coef) : null,
        qtyDepois: r.mode !== 'money' ? qtyOf(r) : null,
        ganhoReal: x.gReal,
        ganhoTeo: x.gTeo,
      });
    });
    return rows;
  }, [baselineRows, after, custoPadrao]);

  const firstDepoisLabel = useMemo(() => {
    const f = after.rows.find((x) => x.ok);
    return f ? f.row.label || null : null;
  }, [after]);

  const save = () =>
    onSave({ indicator, unit, direction, custoPadrao, precoCongelado: precoCongeladoManual, baselineRows, afterRows });

  const updRow = (rows: MonthRow[], set: (r: MonthRow[]) => void, id: string, patch: Partial<MonthRow>) =>
    set(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = (rows: MonthRow[], set: (r: MonthRow[]) => void, prefix: string) =>
    set([...rows, mkRow('', `${prefix}${Date.now()}`)]);
  const delRow = (rows: MonthRow[], set: (r: MonthRow[]) => void, id: string) => set(rows.filter((r) => r.id !== id));

  const inp = 'w-full bg-transparent border-none outline-none text-sm font-medium text-gray-800 text-right focus:ring-2 focus:ring-blue-300 focus:bg-white rounded px-1 py-1';
  const inpTxt = 'w-full bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded px-1 py-1';
  const modeSel = 'bg-transparent border-none outline-none text-xs font-semibold text-[#0033CC] cursor-pointer';
  const off = 'opacity-25';

  const modeOptions = (
    <>
      <option value="coef">coef×vol</option>
      <option value="direct">quantidade</option>
      <option value="money">R$ direto</option>
    </>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#0033CC]" /> Ganhos Tangíveis do Projeto
          </h2>
        </div>
      </div>

      {/* Config */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Indicador</label>
          <input value={indicator} onChange={(e) => setIndicator(e.target.value)} placeholder="Ex.: Consumo de energia"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Unidade</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kWh, h, un…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Sentido</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none cursor-pointer">
            <option value="lower">Menor é melhor ↓</option>
            <option value="higher">Maior é melhor ↑</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Custo padrão (R$/{unit || 'un'})</label>
          <input value={custoPadrao} onChange={(e) => setCustoPadrao(e.target.value)} inputMode="decimal" placeholder="Opcional"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none text-right" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#0033CC] mb-1">Preço congelado</label>
          <input value={precoCongeladoManual} onChange={(e) => setPrecoCongeladoManual(e.target.value)} inputMode="decimal"
            placeholder={baseline.custoAvg ? fmt(baseline.custoAvg, 2) : 'média baseline'}
            className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#EAF0FF] focus:ring-2 focus:ring-blue-300 outline-none text-right" />
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['antes', '1 · Antes (linha de base)'], ['depois', '2 · Depois (verificação de ganhos)'], ['resultado', '3 · Resultado (gráfico)']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer bg-transparent ${
              tab === k ? 'text-[#0033CC] border-[#0033CC]' : 'text-gray-400 border-transparent hover:text-[#1E2D6E]'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ===================== ABA ANTES ===================== */}
      {tab === 'antes' && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="border-collapse w-full" style={{ minWidth: 840 }}>
              <thead>
                <tr style={{ background: '#1E2D6E' }} className="text-[#C7D2FF]">
                  <th style={{ width: 30 }}></th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Mês (últimos 12)</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider" style={{ width: 116 }}>Modo</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Coef.</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Volume</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Qtd ({unit || 'un'})</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Custo (R$/{unit || 'un'})</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider bg-[#0033CC]">Valor mensal (R$)</th>
                </tr>
              </thead>
              <tbody>
                {baselineRows.map((r) => {
                  const isCoef = r.mode === 'coef';
                  const isMoney = r.mode === 'money';
                  const showQty = hasData(r) && !isMoney;
                  const set = (patch: Partial<MonthRow>) => updRow(baselineRows, setBaselineRows, r.id, patch);
                  return (
                    <tr key={r.id} className="group hover:bg-blue-50/30" style={{ borderBottom: '0.5px solid #e2e8f0' }}>
                      <td className="p-1 align-middle text-center">
                        <button onClick={() => delRow(baselineRows, setBaselineRows, r.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer" title="Excluir mês"><Trash2 size={13} /></button>
                      </td>
                      <td className="p-1 border border-[#eee]"><input value={r.label} onChange={(e) => set({ label: e.target.value })} className={inpTxt} /></td>
                      <td className="p-1 border border-[#eee] text-center"><select value={r.mode} onChange={(e) => set({ mode: e.target.value as Mode })} className={modeSel}>{modeOptions}</select></td>
                      <td className="p-1 border border-[#eee]"><input value={r.coef} disabled={!isCoef} inputMode="decimal" onChange={(e) => set({ coef: e.target.value })} className={`${inp} ${!isCoef ? off : ''}`} /></td>
                      <td className="p-1 border border-[#eee]"><input value={r.volume} disabled={!isCoef} inputMode="decimal" onChange={(e) => set({ volume: e.target.value })} className={`${inp} ${!isCoef ? off : ''}`} /></td>
                      <td className="p-1 border border-[#eee]">
                        {isCoef ? (
                          <div className="text-right text-sm font-bold text-[#1E2D6E] px-1 py-1">{showQty ? fmt(qtyOf(r), 0) : '—'}</div>
                        ) : isMoney ? (
                          <div className="text-right text-sm text-gray-300 px-1 py-1">—</div>
                        ) : (
                          <input value={r.value} inputMode="decimal" onChange={(e) => set({ value: e.target.value })} className={inp} />
                        )}
                      </td>
                      <td className="p-1 border border-[#eee]"><input value={r.custo} disabled={isMoney} inputMode="decimal" onChange={(e) => set({ custo: e.target.value })} className={`${inp} ${isMoney ? off : ''}`} placeholder={padrao ? fmt(padrao, 2) : ''} /></td>
                      <td className="p-1 border border-[#eee] bg-[#F5F8FF]">
                        {isMoney ? (
                          <input value={r.valorRS} inputMode="decimal" onChange={(e) => set({ valorRS: e.target.value })} className={`${inp} font-extrabold text-[#0033CC]`} placeholder="R$" />
                        ) : (
                          <div className="text-right text-sm font-extrabold text-[#0033CC] px-2 py-1">{showQty && effCusto(r) > 0 ? fmtBRL(valorMensal(r)) : '—'}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1E2D6E' }} className="text-white font-bold">
                  <td></td>
                  <td className="px-3 py-2.5 text-left text-xs">Baseline (média {baseline.filledCount}m)</td>
                  <td></td>
                  <td className="px-3 py-2.5 text-right text-sm">{baseline.coefAvg != null ? fmt(baseline.coefAvg, 2) : '—'}</td>
                  <td></td>
                  <td className="px-3 py-2.5 text-right text-sm">{baseline.qtyAvg ? fmt(baseline.qtyAvg, 0) : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-sm">{baseline.custoAvg ? fmt(baseline.custoAvg, 2) : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-sm bg-[#0033CC]">{fmtBRL(baseline.valorAvg)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => addRow(baselineRows, setBaselineRows, 'b')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 cursor-pointer bg-transparent"><Plus size={15} /> Adicionar mês</button>
          </div>

          <div className="flex gap-2 items-start p-3 rounded-lg bg-[#F0F2FA] text-[12px] text-gray-600">
            <Info size={15} className="text-[#0033CC] shrink-0 mt-0.5" />
            <span><b>3 modos por mês:</b> <b>coef×vol</b>, <b>quantidade</b> (× custo) ou <b>R$ direto</b>. A média de <b>custo</b> desta aba vira o <b>preço congelado</b> usado no ganho teórico (você pode sobrescrever no campo azul acima).</span>
          </div>
        </div>
      )}

      {/* ===================== ABA DEPOIS ===================== */}
      {tab === 'depois' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-8 gap-y-2 p-3 rounded-lg bg-[#EEF0F8] border border-dashed border-[#c3cbe6]">
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Baseline · coef.</div><div className="text-base font-extrabold text-[#1E2D6E]">{baseline.coefAvg != null ? `${fmt(baseline.coefAvg, 2)} ${unit}/vol` : '—'}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Baseline · valor mensal</div><div className="text-base font-extrabold text-[#1E2D6E]">{fmtBRL(baseline.valorAvg)}/mês</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-[#0033CC]">Preço congelado</div><div className="text-base font-extrabold text-[#0033CC]">R$ {fmt(precoCongelado, 2)}/{unit || 'un'}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sentido</div><div className="text-base font-extrabold text-[#1E2D6E]">{direction === 'lower' ? 'menor é melhor ↓' : 'maior é melhor ↑'}</div></div>
          </div>

          {baseline.filledCount === 0 && (
            <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
              <Info size={15} className="shrink-0 mt-0.5" /> Preencha a aba <b>Antes</b> primeiro — sem a baseline, o ganho não pode ser calculado.
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="border-collapse w-full" style={{ minWidth: 1040 }}>
              <thead>
                <tr style={{ background: '#1E2D6E' }} className="text-[#C7D2FF]">
                  <th style={{ width: 30 }}></th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Mês (pós-projeto)</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider" style={{ width: 116 }}>Modo</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Coef.</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Volume/Qtd</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Custo real (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Valor mensal (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider bg-[#0033CC]">Ganho teórico (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider bg-emerald-600">Ganho real (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider bg-emerald-700">Acum. real (R$)</th>
                </tr>
              </thead>
              <tbody>
                {after.rows.map(({ row: r, ok, vm, gTeo, gReal, accReal }) => {
                  const isCoef = r.mode === 'coef';
                  const isMoney = r.mode === 'money';
                  const set = (patch: Partial<MonthRow>) => updRow(afterRows, setAfterRows, r.id, patch);
                  return (
                    <tr key={r.id} className="group hover:bg-blue-50/30" style={{ borderBottom: '0.5px solid #e2e8f0' }}>
                      <td className="p-1 align-middle text-center">
                        <button onClick={() => delRow(afterRows, setAfterRows, r.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer" title="Excluir mês"><Trash2 size={13} /></button>
                      </td>
                      <td className="p-1 border border-[#eee]"><input value={r.label} onChange={(e) => set({ label: e.target.value })} className={inpTxt} /></td>
                      <td className="p-1 border border-[#eee] text-center"><select value={r.mode} onChange={(e) => set({ mode: e.target.value as Mode })} className={modeSel}>{modeOptions}</select></td>
                      <td className="p-1 border border-[#eee]"><input value={r.coef} disabled={!isCoef} inputMode="decimal" onChange={(e) => set({ coef: e.target.value })} className={`${inp} ${!isCoef ? off : ''}`} /></td>
                      <td className="p-1 border border-[#eee]">
                        {isMoney ? (<div className="text-right text-sm text-gray-300 px-1 py-1">—</div>) : (
                          <input value={isCoef ? r.volume : r.value} inputMode="decimal" onChange={(e) => set(isCoef ? { volume: e.target.value } : { value: e.target.value })} className={inp} placeholder={isCoef ? 'volume' : 'qtd'} />
                        )}
                      </td>
                      <td className="p-1 border border-[#eee]"><input value={r.custo} disabled={isMoney} inputMode="decimal" onChange={(e) => set({ custo: e.target.value })} className={`${inp} ${isMoney ? off : ''}`} placeholder={padrao ? fmt(padrao, 2) : ''} /></td>
                      <td className="p-1 border border-[#eee]">
                        {isMoney ? (
                          <input value={r.valorRS} inputMode="decimal" onChange={(e) => set({ valorRS: e.target.value })} className={`${inp} font-semibold text-[#1E2D6E]`} placeholder="R$" />
                        ) : (
                          <div className="text-right text-sm font-semibold text-[#1E2D6E] px-2 py-1">{ok && effCusto(r) > 0 ? fmtBRL(vm) : '—'}</div>
                        )}
                      </td>
                      <td className="p-1 border border-[#eee] text-right text-sm font-bold text-[#0033CC] px-2" style={{ background: '#F5F8FF' }}>{ok ? fmtBRL(gTeo) : '—'}</td>
                      <td className="p-1 border border-[#eee] text-right text-sm font-bold text-emerald-600 px-2">{ok ? fmtBRL(gReal) : '—'}</td>
                      <td className="p-1 border border-[#eee] text-right text-sm font-extrabold text-emerald-700 px-2" style={{ background: '#E6F4EE' }}>{ok ? fmtBRL(accReal) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => addRow(afterRows, setAfterRows, 'a')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 cursor-pointer bg-transparent"><Plus size={15} /> Adicionar mês</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-gray-200 rounded-lg p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Melhoria de eficiência</div>
              <div className={`text-xl font-extrabold mt-1 ${after.pct != null && after.pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{after.pct != null ? `${fmt(after.pct, 1)}%` : '—'}</div>
              <div className="text-[11px] text-gray-500">{baseline.coefAvg != null && after.afterCoefAvg != null ? `${fmt(baseline.coefAvg, 2)}→${fmt(after.afterCoefAvg, 2)}` : 'no indicador'}</div>
            </div>
            <div className="rounded-lg p-3.5 text-white" style={{ background: 'linear-gradient(135deg,#1E2D6E,#2a3d8f)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#b9c4ef]">Ganho teórico acum.</div>
              <div className="text-xl font-extrabold mt-1">{fmtBRL(after.accTeo)}</div>
              <div className="text-[11px] text-[#c9d1f2]">mérito do projeto</div>
            </div>
            <div className="rounded-lg p-3.5 text-white" style={{ background: 'linear-gradient(135deg,#12805C,#16a06f)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Ganho real acum.</div>
              <div className="text-xl font-extrabold mt-1">{fmtBRL(after.accReal)}</div>
              <div className="text-[11px] text-emerald-100">o que entrou no caixa</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Efeito preço</div>
              <div className={`text-xl font-extrabold mt-1 ${after.efeitoPreco >= 0 ? 'text-gray-700' : 'text-red-500'}`}>{after.efeitoPreco >= 0 ? '+' : ''}{fmtBRL(after.efeitoPreco)}</div>
              <div className="text-[11px] text-gray-500">mercado, não o time</div>
            </div>
          </div>

          <div className="flex gap-2 items-start p-3 rounded-lg bg-[#F0F2FA] text-[12px] text-gray-600">
            <Info size={15} className="text-[#0033CC] shrink-0 mt-0.5" />
            <span><b>Teórico</b> = variação de eficiência × <b>preço congelado</b> — isola o que o time entregou, sem ruído de preço. <b>Real</b> = variação × <b>custo do mês</b> — o que de fato entrou no caixa. <b>Efeito preço</b> = real − teórico, movimento de mercado que não é mérito (nem culpa) do projeto. No modo <b>R$ direto</b> não dá pra separar preço de quantidade, então teórico = real.</span>
          </div>
        </div>
      )}

      {/* ===================== ABA RESULTADO ===================== */}
      {tab === 'resultado' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 p-1 rounded-lg bg-[#F0F2FA]">
              {([['coef', 'Coeficiente'], ['qty', 'Quantidade']] as const).map(([k, lbl]) => {
                const disabled = k === 'coef' && !hasAnyCoef;
                return (
                  <button key={k} onClick={() => setBarMetric(k)} disabled={disabled}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors border-none cursor-pointer ${
                      metric === k ? 'bg-[#1E2D6E] text-white' : disabled ? 'bg-transparent text-gray-300 cursor-not-allowed' : 'bg-transparent text-gray-500 hover:text-[#1E2D6E]'
                    }`}>
                    {lbl}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-gray-500">
              Barras = {metric === 'coef' ? 'coeficiente' : `quantidade (${unit || 'un'})`} · Linhas = ganho em R$
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              Preencha a aba <b>Antes</b> para ver o gráfico.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3 bg-white">
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E6F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#E2E6F0' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={62} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#12805C' }} tickLine={false} axisLine={false} width={72}
                    tickFormatter={(v: any) => `R$${fmt(Number(v) / 1000, 0)}k`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E6F0' }}
                    formatter={(value: any, name: any) => {
                      if (value == null) return ['—', name];
                      const isMoney = String(name).includes('R$');
                      return [isMoney ? fmtBRL(Number(value)) : fmt(Number(value), metric === 'coef' ? 2 : 0), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {firstDepoisLabel && (
                    <ReferenceLine yAxisId="left" x={firstDepoisLabel} stroke="#9CA3AF" strokeDasharray="4 4"
                      label={{ value: 'início do projeto', position: 'insideTopRight', fontSize: 10, fill: '#9CA3AF' }} />
                  )}
                  <Bar yAxisId="left" dataKey={metric === 'coef' ? 'coefAntes' : 'qtyAntes'}
                    name={metric === 'coef' ? 'Coef. antes' : 'Qtd antes'} fill="#1E2D6E" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey={metric === 'coef' ? 'coefDepois' : 'qtyDepois'}
                    name={metric === 'coef' ? 'Coef. depois' : 'Qtd depois'} fill="#0033CC" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="ganhoTeo" name="Ganho teórico (R$)"
                    stroke="#0033CC" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line yAxisId="right" type="monotone" dataKey="ganhoReal" name="Ganho real (R$)"
                    stroke="#12805C" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length > 0 && !firstDepoisLabel && (
            <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
              <Info size={15} className="shrink-0 mt-0.5" /> Ainda não há dados na aba <b>Depois</b> — o gráfico mostra só a linha de base. Assim que você preencher os meses pós-projeto, as barras "depois" e as duas linhas de ganho aparecem.
            </div>
          )}

          {firstDepoisLabel && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border border-gray-200 rounded-lg p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{metric === 'coef' ? 'Coef.' : 'Qtd'} Baseline → Pós</div>
                <div className="text-xl font-extrabold text-[#1E2D6E] mt-1">
                  {metric === 'coef'
                    ? (baseline.coefAvg != null && after.afterCoefAvg != null ? `${fmt(baseline.coefAvg, 2)}→${fmt(after.afterCoefAvg, 2)}` : '—')
                    : (baseline.qtyAvg ? fmt(baseline.qtyAvg, 0) : '—')}
                </div>
                <div className="text-[11px] text-gray-500">média</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Melhoria</div>
                <div className={`text-xl font-extrabold mt-1 ${after.pct != null && after.pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{after.pct != null ? `${fmt(after.pct, 1)}%` : '—'}</div>
                <div className="text-[11px] text-gray-500">eficiência</div>
              </div>
              <div className="rounded-lg p-3.5 text-white" style={{ background: 'linear-gradient(135deg,#1E2D6E,#2a3d8f)' }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b9c4ef]">Ganho teórico acum.</div>
                <div className="text-xl font-extrabold mt-1">{fmtBRL(after.accTeo)}</div>
                <div className="text-[11px] text-[#c9d1f2]">preço congelado</div>
              </div>
              <div className="rounded-lg p-3.5 text-white" style={{ background: 'linear-gradient(135deg,#12805C,#16a06f)' }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Ganho real acum.</div>
                <div className="text-xl font-extrabold mt-1">{fmtBRL(after.accReal)}</div>
                <div className="text-[11px] text-emerald-100">preço do mês</div>
              </div>
            </div>
          )}
        </div>
      )}

      <button data-save-trigger onClick={save} className="hidden" />
    </div>
  );
}
