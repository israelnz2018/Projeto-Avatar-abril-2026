import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, Info } from 'lucide-react';

// ============================================================================
// Ganhos Tangíveis do Projeto (toolId: tangibleGains)
// Uma ferramenta, duas abas:
//   ANTES  — linha de base dos últimos 12 meses (valor direto OU coef × volume) → média
//   DEPOIS — novos meses pós-projeto; ganho físico + R$, mês a mês e acumulado
// Ganho ajustado por volume (modo coef): (coef_baseline − coef_mês) × volume × R$/un
// ============================================================================

type Mode = 'coef' | 'direct';
type Direction = 'lower' | 'higher';

interface MonthRow {
  id: string;
  label: string;
  mode: Mode;
  coef: string;
  volume: string;
  value: string;
}

interface TangibleGainsProps {
  onSave: (data: any) => void;
  initialData?: any;
}

// Aceita "5,05" (vírgula BR) ou "5.05" (ponto). Não assume separador de milhar.
const num = (s: any): number => {
  if (typeof s === 'number') return s;
  if (s == null || s === '') return 0;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const fmt = (n: number, dec = 0): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtBRL = (n: number): string => `R$ ${fmt(n, 0)}`;

// Rótulo de mês relativo (offset em meses a partir do mês atual).
const monthLabel = (offset: number): string => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
};

const mkRow = (label: string, id: string): MonthRow => ({ id, label, mode: 'coef', coef: '', volume: '', value: '' });

// Baseline: 12 meses terminando no mês passado. Depois: 6 meses a partir do mês atual.
const defaultBaseline = (): MonthRow[] =>
  Array.from({ length: 12 }, (_, i) => mkRow(monthLabel(i - 12), `b${i}`));
const defaultAfter = (): MonthRow[] =>
  Array.from({ length: 6 }, (_, i) => mkRow(monthLabel(i), `a${i}`));

export default function TangibleGainsTool({ onSave, initialData }: TangibleGainsProps) {
  const d = initialData?.toolData || initialData;

  const [indicator, setIndicator] = useState<string>(d?.indicator || '');
  const [unit, setUnit] = useState<string>(d?.unit || '');
  const [direction, setDirection] = useState<Direction>(d?.direction || 'lower');
  const [unitValue, setUnitValue] = useState<string>(d?.unitValue ?? '');
  const [baselineRows, setBaselineRows] = useState<MonthRow[]>(d?.baselineRows?.length ? d.baselineRows : defaultBaseline());
  const [afterRows, setAfterRows] = useState<MonthRow[]>(d?.afterRows?.length ? d.afterRows : defaultAfter());
  const [tab, setTab] = useState<'antes' | 'depois'>('antes');

  // Re-sincroniza quando o app troca o initialData (padrão do projeto)
  useEffect(() => {
    const nd = initialData?.toolData || initialData;
    if (!nd) return;
    if (typeof nd.indicator === 'string') setIndicator(nd.indicator);
    if (typeof nd.unit === 'string') setUnit(nd.unit);
    if (nd.direction) setDirection(nd.direction);
    if (nd.unitValue !== undefined) setUnitValue(String(nd.unitValue ?? ''));
    if (Array.isArray(nd.baselineRows) && nd.baselineRows.length) setBaselineRows(nd.baselineRows);
    if (Array.isArray(nd.afterRows) && nd.afterRows.length) setAfterRows(nd.afterRows);
  }, [initialData]);

  const dir = direction === 'lower' ? 1 : -1;
  const uv = num(unitValue);

  // ---- Baseline (média) ----
  const baseline = useMemo(() => {
    const monthVals: number[] = [];
    const coefVals: number[] = [];
    baselineRows.forEach((r) => {
      if (r.mode === 'coef') {
        if (r.coef !== '' && r.volume !== '') {
          monthVals.push(num(r.coef) * num(r.volume));
          coefVals.push(num(r.coef));
        }
      } else if (r.value !== '') {
        monthVals.push(num(r.value));
      }
    });
    const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    return {
      valueAvg: avg(monthVals),
      coefAvg: coefVals.length ? avg(coefVals) : null,
      filledCount: monthVals.length,
    };
  }, [baselineRows]);

  // ---- Depois (ganho mês a mês + acumulado) ----
  const after = useMemo(() => {
    let accFis = 0;
    let accRS = 0;
    const afterCoefs: number[] = [];
    const afterVals: number[] = [];
    const rows = afterRows.map((r) => {
      const hasData = r.mode === 'coef' ? r.coef !== '' && r.volume !== '' : r.value !== '';
      let gFis = 0;
      if (hasData) {
        if (r.mode === 'coef' && baseline.coefAvg != null) {
          gFis = dir * (baseline.coefAvg - num(r.coef)) * num(r.volume);
          afterCoefs.push(num(r.coef));
        } else {
          const v = r.mode === 'coef' ? num(r.coef) * num(r.volume) : num(r.value);
          gFis = dir * (baseline.valueAvg - v);
          afterVals.push(v);
        }
        accFis += gFis;
        if (uv) accRS += gFis * uv;
      }
      return { row: r, hasData, gFis, gRS: uv ? gFis * uv : null, accFis, accRS: uv ? accRS : null };
    });
    const filledCount = rows.filter((x) => x.hasData).length;
    const afterCoefAvg = afterCoefs.length ? afterCoefs.reduce((s, x) => s + x, 0) / afterCoefs.length : null;
    const afterValAvg = afterVals.length ? afterVals.reduce((s, x) => s + x, 0) / afterVals.length : null;
    let pct: number | null = null;
    if (baseline.coefAvg != null && afterCoefAvg != null && baseline.coefAvg !== 0)
      pct = (dir * (baseline.coefAvg - afterCoefAvg) / baseline.coefAvg) * 100;
    else if (afterValAvg != null && baseline.valueAvg !== 0)
      pct = (dir * (baseline.valueAvg - afterValAvg) / baseline.valueAvg) * 100;
    return { rows, filledCount, afterCoefAvg, afterValAvg, accFis, accRS: uv ? accRS : null, pct };
  }, [afterRows, baseline, dir, uv]);

  const save = () => onSave({ indicator, unit, direction, unitValue, baselineRows, afterRows });

  // ---- helpers de edição ----
  const updRow = (rows: MonthRow[], set: (r: MonthRow[]) => void, id: string, patch: Partial<MonthRow>) =>
    set(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = (rows: MonthRow[], set: (r: MonthRow[]) => void, prefix: string) =>
    set([...rows, mkRow('', `${prefix}${Date.now()}`)]);
  const delRow = (rows: MonthRow[], set: (r: MonthRow[]) => void, id: string) => set(rows.filter((r) => r.id !== id));

  const numInput =
    'w-full bg-transparent border-none outline-none text-sm font-medium text-gray-800 text-right focus:ring-2 focus:ring-blue-300 focus:bg-white rounded px-1 py-1';
  const txtInput =
    'w-full bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded px-1 py-1';

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Fase Controlar</p>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#0033CC]" /> Ganhos Tangíveis do Projeto
          </h2>
        </div>
      </div>

      {/* Config do indicador */}
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
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Valor unitário (R$/{unit || 'un'})</label>
          <input value={unitValue} onChange={(e) => setUnitValue(e.target.value)} inputMode="decimal" placeholder="Ex.: 0,80"
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
            <table className="border-collapse w-full" style={{ minWidth: 640 }}>
              <thead>
                <tr style={{ background: '#1E2D6E' }} className="text-[#C7D2FF]">
                  <th style={{ width: 30 }}></th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Mês (últimos 12)</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider" style={{ width: 120 }}>Modo</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Coef. ({unit || 'un'}/vol)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Volume</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Valor ({unit || 'un'})</th>
                </tr>
              </thead>
              <tbody>
                {baselineRows.map((r) => {
                  const computed = r.mode === 'coef' ? num(r.coef) * num(r.volume) : num(r.value);
                  const hasComputed = r.mode === 'coef' && r.coef !== '' && r.volume !== '';
                  return (
                    <tr key={r.id} className="group hover:bg-blue-50/30" style={{ borderBottom: '0.5px solid #e2e8f0' }}>
                      <td className="p-1 align-middle text-center">
                        <button onClick={() => delRow(baselineRows, setBaselineRows, r.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer" title="Excluir mês">
                          <Trash2 size={13} />
                        </button>
                      </td>
                      <td className="p-1 border border-[#eee]">
                        <input value={r.label} onChange={(e) => updRow(baselineRows, setBaselineRows, r.id, { label: e.target.value })} className={txtInput} />
                      </td>
                      <td className="p-1 border border-[#eee] text-center">
                        <select value={r.mode} onChange={(e) => updRow(baselineRows, setBaselineRows, r.id, { mode: e.target.value as Mode })}
                          className="bg-transparent border-none outline-none text-xs font-semibold text-[#0033CC] cursor-pointer">
                          <option value="coef">coef×vol</option>
                          <option value="direct">valor</option>
                        </select>
                      </td>
                      <td className="p-1 border border-[#eee]">
                        <input value={r.coef} disabled={r.mode !== 'coef'} inputMode="decimal"
                          onChange={(e) => updRow(baselineRows, setBaselineRows, r.id, { coef: e.target.value })}
                          className={`${numInput} ${r.mode !== 'coef' ? 'opacity-30' : ''}`} />
                      </td>
                      <td className="p-1 border border-[#eee]">
                        <input value={r.volume} disabled={r.mode !== 'coef'} inputMode="decimal"
                          onChange={(e) => updRow(baselineRows, setBaselineRows, r.id, { volume: e.target.value })}
                          className={`${numInput} ${r.mode !== 'coef' ? 'opacity-30' : ''}`} />
                      </td>
                      <td className="p-1 border border-[#eee]">
                        {r.mode === 'coef' ? (
                          <div className="text-right text-sm font-bold text-[#1E2D6E] px-1 py-1">{hasComputed ? fmt(computed, 0) : '—'}</div>
                        ) : (
                          <input value={r.value} inputMode="decimal"
                            onChange={(e) => updRow(baselineRows, setBaselineRows, r.id, { value: e.target.value })} className={numInput} />
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
                  <td className="px-3 py-2.5 text-right text-sm">{fmt(baseline.valueAvg, 0)} <span className="text-[10px] text-[#C7D2FF] font-medium">{unit}</span></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => addRow(baselineRows, setBaselineRows, 'b')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 cursor-pointer bg-transparent">
              <Plus size={15} /> Adicionar mês
            </button>
          </div>

          <div className="flex gap-2 items-start p-3 rounded-lg bg-[#F0F2FA] text-[12px] text-gray-600">
            <Info size={15} className="text-[#0033CC] shrink-0 mt-0.5" />
            <span>Cada mês aceita <b>valor direto</b> ou <b>coeficiente × volume</b> (o valor é calculado). A <b>baseline é a média dos meses preenchidos</b> — meses em branco são ignorados. O <b>coeficiente médio</b> é o que a aba Depois usa pra calcular ganho ajustado por volume.</span>
          </div>
        </div>
      )}

      {/* ===================== ABA DEPOIS ===================== */}
      {tab === 'depois' && (
        <div className="space-y-3">
          {/* Referência da baseline */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 p-3 rounded-lg bg-[#EEF0F8] border border-dashed border-[#c3cbe6]">
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Baseline · coef.</div><div className="text-base font-extrabold text-[#1E2D6E]">{baseline.coefAvg != null ? `${fmt(baseline.coefAvg, 2)} ${unit}/vol` : '—'}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Baseline · indicador</div><div className="text-base font-extrabold text-[#1E2D6E]">{fmt(baseline.valueAvg, 0)} {unit}/mês</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sentido</div><div className="text-base font-extrabold text-[#1E2D6E]">{direction === 'lower' ? 'menor é melhor ↓' : 'maior é melhor ↑'}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Valor unitário</div><div className="text-base font-extrabold text-[#1E2D6E]">{uv ? `R$ ${fmt(uv, 2)}/${unit || 'un'}` : '—'}</div></div>
          </div>

          {baseline.filledCount === 0 && (
            <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
              <Info size={15} className="shrink-0 mt-0.5" /> Preencha a aba <b>Antes</b> primeiro — sem a baseline, o ganho não pode ser calculado.
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="border-collapse w-full" style={{ minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#1E2D6E' }} className="text-[#C7D2FF]">
                  <th style={{ width: 30 }}></th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Mês (pós-projeto)</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider" style={{ width: 110 }}>Modo</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Coef.</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Volume</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Ganho ({unit || 'un'})</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Ganho (R$)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Acum. (R$)</th>
                </tr>
              </thead>
              <tbody>
                {after.rows.map(({ row: r, hasData, gFis, gRS, accRS }) => (
                  <tr key={r.id} className="group hover:bg-blue-50/30" style={{ borderBottom: '0.5px solid #e2e8f0' }}>
                    <td className="p-1 align-middle text-center">
                      <button onClick={() => delRow(afterRows, setAfterRows, r.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer" title="Excluir mês">
                        <Trash2 size={13} />
                      </button>
                    </td>
                    <td className="p-1 border border-[#eee]">
                      <input value={r.label} onChange={(e) => updRow(afterRows, setAfterRows, r.id, { label: e.target.value })} className={txtInput} />
                    </td>
                    <td className="p-1 border border-[#eee] text-center">
                      <select value={r.mode} onChange={(e) => updRow(afterRows, setAfterRows, r.id, { mode: e.target.value as Mode })}
                        className="bg-transparent border-none outline-none text-xs font-semibold text-[#0033CC] cursor-pointer">
                        <option value="coef">coef×vol</option>
                        <option value="direct">valor</option>
                      </select>
                    </td>
                    <td className="p-1 border border-[#eee]">
                      <input value={r.coef} disabled={r.mode !== 'coef'} inputMode="decimal"
                        onChange={(e) => updRow(afterRows, setAfterRows, r.id, { coef: e.target.value })}
                        className={`${numInput} ${r.mode !== 'coef' ? 'opacity-30' : ''}`} />
                    </td>
                    <td className="p-1 border border-[#eee]">
                      <input value={r.mode === 'coef' ? r.volume : r.value} disabled={false} inputMode="decimal"
                        onChange={(e) => updRow(afterRows, setAfterRows, r.id, r.mode === 'coef' ? { volume: e.target.value } : { value: e.target.value })}
                        className={numInput} placeholder={r.mode === 'coef' ? 'volume' : 'valor'} />
                    </td>
                    <td className="p-1 border border-[#eee] text-right text-sm font-bold text-emerald-600 px-2">{hasData ? fmt(gFis, 0) : '—'}</td>
                    <td className="p-1 border border-[#eee] text-right text-sm font-bold text-emerald-600 px-2">{hasData && gRS != null ? fmtBRL(gRS) : '—'}</td>
                    <td className="p-1 border border-[#eee] text-right text-sm font-extrabold text-emerald-700 px-2" style={{ background: '#E6F4EE' }}>{hasData && accRS != null ? fmtBRL(accRS) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => addRow(afterRows, setAfterRows, 'a')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 cursor-pointer bg-transparent">
              <Plus size={15} /> Adicionar mês
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-gray-200 rounded-lg p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Baseline → Pós</div>
              <div className="text-xl font-extrabold text-[#1E2D6E] mt-1">
                {baseline.coefAvg != null && after.afterCoefAvg != null ? `${fmt(baseline.coefAvg, 2)}→${fmt(after.afterCoefAvg, 2)}` : '—'}
              </div>
              <div className="text-[11px] text-gray-500">coef. médio</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Melhoria</div>
              <div className={`text-xl font-extrabold mt-1 ${after.pct != null && after.pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {after.pct != null ? `${fmt(after.pct, 1)}%` : '—'}
              </div>
              <div className="text-[11px] text-gray-500">no indicador</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ganho médio / mês</div>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">{after.accRS != null && after.filledCount ? fmtBRL(after.accRS / after.filledCount) : '—'}</div>
              <div className="text-[11px] text-gray-500">{after.filledCount} {after.filledCount === 1 ? 'mês' : 'meses'} pós</div>
            </div>
            <div className="rounded-lg p-3.5 text-white" style={{ background: 'linear-gradient(135deg,#1E2D6E,#2a3d8f)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#b9c4ef]">Ganho acumulado</div>
              <div className="text-xl font-extrabold mt-1">{after.accRS != null ? fmtBRL(after.accRS) : '—'}</div>
              <div className="text-[11px] text-[#c9d1f2]">≈ {fmt(after.accFis, 0)} {unit} {direction === 'lower' ? 'evitados' : 'a mais'}</div>
            </div>
          </div>

          <div className="flex gap-2 items-start p-3 rounded-lg bg-[#F0F2FA] text-[12px] text-gray-600">
            <Info size={15} className="text-[#0033CC] shrink-0 mt-0.5" />
            <span><b>Fórmula (modo coef.):</b> ganho do mês = (coef. baseline − coef. do mês) × volume real × R$/un — ajustado por volume, defensável na auditoria. <b>Modo valor direto:</b> ganho = (baseline − valor) × R$/un, respeitando o sentido do indicador.</span>
          </div>
        </div>
      )}

      {/* Save trigger disparado pelo ToolWrapper */}
      <button data-save-trigger onClick={save} className="hidden" />
    </div>
  );
}
