import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, Info } from 'lucide-react';

// ============================================================================
// Ganhos Tangíveis do Projeto (toolId: tangibleGains)
// Uma ferramenta, duas abas. 3 modos por linha:
//   coef×vol   — coef × volume = quantidade → × custo/unid = valor mensal (R$)
//   quantidade — digita a quantidade → × custo/unid = valor mensal (R$)
//   R$ direto  — digita o valor mensal em R$ direto (cliente calculou por fora)
// ANTES = média (baseline). DEPOIS = ganho em R$, mês a mês e acumulado.
// Ganho (modo coef): (coef_baseline − coef_mês) × volume × custo → ajustado por volume.
// ============================================================================

type Mode = 'coef' | 'direct' | 'money';
type Direction = 'lower' | 'higher';

interface MonthRow {
  id: string;
  label: string;
  mode: Mode;
  coef: string;
  volume: string;
  value: string;   // quantidade (modo 'direct')
  custo: string;   // custo por unidade do mês (R$)
  valorRS: string; // valor mensal em R$ digitado direto (modo 'money')
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
  const [baselineRows, setBaselineRows] = useState<MonthRow[]>(d?.baselineRows?.length ? d.baselineRows : defaultBaseline());
  const [afterRows, setAfterRows] = useState<MonthRow[]>(d?.afterRows?.length ? d.afterRows : defaultAfter());
  const [tab, setTab] = useState<'antes' | 'depois'>('antes');

  useEffect(() => {
    const nd = initialData?.toolData || initialData;
    if (!nd) return;
    if (typeof nd.indicator === 'string') setIndicator(nd.indicator);
    if (typeof nd.unit === 'string') setUnit(nd.unit);
    if (nd.direction) setDirection(nd.direction);
    if (nd.custoPadrao !== undefined || nd.unitValue !== undefined) setCustoPadrao(String(nd.custoPadrao ?? nd.unitValue ?? ''));
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
    baselineRows.forEach((r) => {
      if (!hasData(r)) return;
      if (r.mode !== 'money') qtys.push(qtyOf(r));
      if (r.mode === 'coef') coefs.push(num(r.coef));
      valores.push(valorMensal(r));
    });
    const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    return {
      qtyAvg: avg(qtys),
      coefAvg: coefs.length ? avg(coefs) : null,
      valorAvg: avg(valores),
      filledCount: valores.length,
    };
  }, [baselineRows, custoPadrao]);

  // ---- Depois ----
  const after = useMemo(() => {
    let accRS = 0;
    let accFis = 0;
    const afterCoefs: number[] = [];
    const afterValores: number[] = [];
    const rows = afterRows.map((r) => {
      const ok = hasData(r);
      const vm = valorMensal(r);
      const c = effCusto(r);
      let gFis = 0;
      let gRS = 0;
      if (ok) {
        if (r.mode === 'coef' && baseline.coefAvg != null) {
          gFis = dir * (baseline.coefAvg - num(r.coef)) * num(r.volume);
          gRS = gFis * c;
          afterCoefs.push(num(r.coef));
        } else if (r.mode === 'direct') {
          gFis = dir * (baseline.qtyAvg - qtyOf(r));
          gRS = gFis * c;
        } else {
          // 'money' (ou coef sem baseline): diferença simples em R$
          gRS = dir * (baseline.valorAvg - vm);
        }
        accFis += gFis;
        accRS += gRS;
        afterValores.push(vm);
      }
      return { row: r, ok, vm, gRS, accRS, accFis };
    });
    const filled = rows.filter((x) => x.ok).length;
    const afterCoefAvg = afterCoefs.length ? afterCoefs.reduce((s, x) => s + x, 0) / afterCoefs.length : null;
    const afterValorAvg = afterValores.length ? afterValores.reduce((s, x) => s + x, 0) / afterValores.length : null;
    let pct: number | null = null;
    if (baseline.coefAvg != null && afterCoefAvg != null && baseline.coefAvg !== 0)
      pct = (dir * (baseline.coefAvg - afterCoefAvg) / baseline.coefAvg) * 100;
    else if (afterValorAvg != null && baseline.valorAvg !== 0)
      pct = (dir * (baseline.valorAvg - afterValorAvg) / baseline.valorAvg) * 100;
    return { rows, filled, afterCoefAvg, accRS, accFis, pct };
  }, [afterRows, baseline, dir, custoPadrao]);

  const save = () => onSave({ indicator, unit, direction, custoPadrao, baselineRows, afterRows });

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
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Fase Controlar</p>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#0033CC]" /> Ganhos Tangíveis do Projeto
          </h2>
        </div>
      </div>

      {/* Config */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Indicador</label>
          <input value={indicator} onChange={(e) => setIndicator(e.target.value)} placeholder="Ex.: Consumo de energia"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Unidade</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kWh, h, %, un…"
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
          <input value={custoPadrao} onChange={(e) => setCustoPadrao(e.target.value)} inputMode="decimal" placeholder="Opcional — preenche os meses"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none text-right" />
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['antes', '1 · Antes (linha de base)'], ['depois', '2 · Depois (verificação de ganhos)']] as const).map(([k, lbl]) => (
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
                  const vm = valorMensal(r);
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
                          <div className="text-right text-sm font-extrabold text-[#0033CC] px-2 py-1">{showQty && effCusto(r) > 0 ? fmtBRL(vm) : '—'}</div>
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
                  <td></td>
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
            <span><b>3 modos por mês:</b> <b>coef×vol</b> (coef × volume × custo), <b>quantidade</b> (qtd × custo) ou <b>R$ direto</b> (você digita o valor mensal em R$, se já calculou por fora). A <b>baseline é a média</b> dos meses preenchidos.</span>
          </div>
        </div>
      )}

      {/* ===================== ABA DEPOIS ===================== */}
      {tab === 'depois' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-8 gap-y-2 p-3 rounded-lg bg-[#EEF0F8] border border-dashed border-[#c3cbe6]">
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Baseline · coef.</div><div className="text-base font-extrabold text-[#1E2D6E]">{baseline.coefAvg != null ? `${fmt(baseline.coefAvg, 2)} ${unit}/vol` : '—'}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Baseline · valor mensal</div><div className="text-base font-extrabold text-[#1E2D6E]">{fmtBRL(baseline.valorAvg)}/mês</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sentido</div><div className="text-base font-extrabold text-[#1E2D6E]">{direction === 'lower' ? 'menor é melhor ↓' : 'maior é melhor ↑'}</div></div>
          </div>

          {baseline.filledCount === 0 && (
            <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
              <Info size={15} className="shrink-0 mt-0.5" /> Preencha a aba <b>Antes</b> primeiro — sem a baseline, o ganho não pode ser calculado.
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="border-collapse w-full" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#1E2D6E' }} className="text-[#C7D2FF]">
                  <th style={{ width: 30 }}></th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Mês (pós-projeto)</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider" style={{ width: 116 }}>Modo</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Coef.</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Volume/Qtd</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Custo (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Valor mensal (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider bg-emerald-600">Ganho (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider bg-emerald-700">Acum. (R$)</th>
                </tr>
              </thead>
              <tbody>
                {after.rows.map(({ row: r, ok, vm, gRS, accRS }) => {
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
                        {isMoney ? (
                          <div className="text-right text-sm text-gray-300 px-1 py-1">—</div>
                        ) : (
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
                      <td className="p-1 border border-[#eee] text-right text-sm font-bold text-emerald-600 px-2">{ok ? fmtBRL(gRS) : '—'}</td>
                      <td className="p-1 border border-[#eee] text-right text-sm font-extrabold text-emerald-700 px-2" style={{ background: '#E6F4EE' }}>{ok ? fmtBRL(accRS) : '—'}</td>
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Coef. Baseline → Pós</div>
              <div className="text-xl font-extrabold text-[#1E2D6E] mt-1">{baseline.coefAvg != null && after.afterCoefAvg != null ? `${fmt(baseline.coefAvg, 2)}→${fmt(after.afterCoefAvg, 2)}` : '—'}</div>
              <div className="text-[11px] text-gray-500">eficiência técnica</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Melhoria</div>
              <div className={`text-xl font-extrabold mt-1 ${after.pct != null && after.pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{after.pct != null ? `${fmt(after.pct, 1)}%` : '—'}</div>
              <div className="text-[11px] text-gray-500">no indicador</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ganho médio / mês</div>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">{after.filled ? fmtBRL(after.accRS / after.filled) : '—'}</div>
              <div className="text-[11px] text-gray-500">{after.filled} {after.filled === 1 ? 'mês' : 'meses'} pós</div>
            </div>
            <div className="rounded-lg p-3.5 text-white" style={{ background: 'linear-gradient(135deg,#1E2D6E,#2a3d8f)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#b9c4ef]">Ganho acumulado</div>
              <div className="text-xl font-extrabold mt-1">{fmtBRL(after.accRS)}</div>
              <div className="text-[11px] text-[#c9d1f2]">resultado do projeto</div>
            </div>
          </div>

          <div className="flex gap-2 items-start p-3 rounded-lg bg-[#F0F2FA] text-[12px] text-gray-600">
            <Info size={15} className="text-[#0033CC] shrink-0 mt-0.5" />
            <span><b>Ganho (R$):</b> no modo coef, (coef baseline − coef do mês) × volume × custo (ajustado por volume). No modo quantidade, (qtd baseline − qtd do mês) × custo. No modo <b>R$ direto</b>, valor mensal médio (baseline) − valor do mês.</span>
          </div>
        </div>
      )}

      <button data-save-trigger onClick={save} className="hidden" />
    </div>
  );
}
