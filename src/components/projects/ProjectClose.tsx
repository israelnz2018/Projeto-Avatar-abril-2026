import React, { useState, useEffect } from 'react';
import { FileCheck2, Plus, Trash2, Sparkles, Info } from 'lucide-react';

// ============================================================================
// Termo de Encerramento do Projeto (toolId: projectClose)
// Sumário de fechamento: Problema · Causas Raízes · Soluções · Ganhos.
// Botão "Puxar do projeto" pré-preenche a partir das ferramentas já feitas
// (Ishikawa, 5 Porquês, Plano de Ação, Ganhos Tangíveis). Sem fase fixa.
// Salvar este termo = projeto concluído (dataEncerramento é o marco de conclusão).
// ============================================================================

type Status = 'concluido' | 'cancelado' | 'em_andamento';

interface ProjectCloseData {
  nomeProjeto: string;
  dataEncerramento: string;
  responsavel: string;
  status: Status;
  problema: string;
  causasRaizes: string[];
  solucoes: string[];
  ganhos: string;
}

interface ProjectCloseProps {
  onSave: (data: any) => void;
  initialData?: any;
  allProjectData?: any;
}

// Recalcula o ganho real acumulado da ferramenta Ganhos Tangíveis (mesma conta).
function computeGanhoReal(d: any): number {
  if (!d || typeof d !== 'object') return 0;
  const num = (s: any) => { if (typeof s === 'number') return s; if (s == null || s === '') return 0; const n = parseFloat(String(s).trim().replace(',', '.')); return isNaN(n) ? 0 : n; };
  const dir = d.direction === 'higher' ? -1 : 1;
  const padrao = num(d.custoPadrao ?? d.unitValue);
  const eff = (r: any) => (r?.custo !== '' && r?.custo != null ? num(r.custo) : padrao);
  const qty = (r: any) => (r?.mode === 'coef' ? num(r.coef) * num(r.volume) : r?.mode === 'direct' ? num(r?.value) : 0);
  const vm = (r: any) => (r?.mode === 'money' ? num(r?.valorRS) : qty(r) * eff(r));
  const has = (r: any) => (r?.mode === 'coef' ? r.coef !== '' && r.volume !== '' : r?.mode === 'direct' ? (r?.value !== '' && r?.value != null) : (r?.valorRS !== '' && r?.valorRS != null));
  const base: any[] = Array.isArray(d.baselineRows) ? d.baselineRows : [];
  const after: any[] = Array.isArray(d.afterRows) ? d.afterRows : [];
  const bQty: number[] = [], bCoef: number[] = [], bVal: number[] = [];
  base.forEach((r) => { if (!has(r)) return; if (r.mode !== 'money') bQty.push(qty(r)); if (r.mode === 'coef') bCoef.push(num(r.coef)); bVal.push(vm(r)); });
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const qtyAvg = avg(bQty), coefAvg = bCoef.length ? avg(bCoef) : null, valAvg = avg(bVal);
  let accReal = 0;
  after.forEach((r) => { if (!has(r)) return; const c = eff(r); if (r.mode === 'money') { accReal += dir * (valAvg - vm(r)); return; } let gFis = 0; if (r.mode === 'coef' && coefAvg != null) gFis = dir * (coefAvg - num(r.coef)) * num(r.volume); else gFis = dir * (qtyAvg - qty(r)); accReal += gFis * c; });
  return accReal;
}
const fmtBRL = (n: number) => `R$ ${Math.round(n).toLocaleString('pt-BR')}`;

export default function ProjectClose({ onSave, initialData, allProjectData }: ProjectCloseProps) {
  const d = initialData?.toolData || initialData;

  const [nomeProjeto, setNomeProjeto] = useState<string>(d?.nomeProjeto || '');
  const [dataEncerramento, setDataEncerramento] = useState<string>(d?.dataEncerramento || '');
  const [responsavel, setResponsavel] = useState<string>(d?.responsavel || '');
  const [status, setStatus] = useState<Status>(d?.status || 'concluido');
  const [problema, setProblema] = useState<string>(d?.problema || '');
  const [causasRaizes, setCausasRaizes] = useState<string[]>(d?.causasRaizes?.length ? d.causasRaizes : ['']);
  const [solucoes, setSolucoes] = useState<string[]>(d?.solucoes?.length ? d.solucoes : ['']);
  const [ganhos, setGanhos] = useState<string>(d?.ganhos || '');

  useEffect(() => {
    const nd = initialData?.toolData || initialData;
    if (!nd) return;
    if (typeof nd.nomeProjeto === 'string') setNomeProjeto(nd.nomeProjeto);
    if (typeof nd.dataEncerramento === 'string') setDataEncerramento(nd.dataEncerramento);
    if (typeof nd.responsavel === 'string') setResponsavel(nd.responsavel);
    if (nd.status) setStatus(nd.status);
    if (typeof nd.problema === 'string') setProblema(nd.problema);
    if (Array.isArray(nd.causasRaizes) && nd.causasRaizes.length) setCausasRaizes(nd.causasRaizes);
    if (Array.isArray(nd.solucoes) && nd.solucoes.length) setSolucoes(nd.solucoes);
    if (typeof nd.ganhos === 'string') setGanhos(nd.ganhos);
  }, [initialData]);

  const save = () => onSave({ nomeProjeto, dataEncerramento, responsavel, status, problema, causasRaizes: causasRaizes.filter(c => c.trim()), solucoes: solucoes.filter(s => s.trim()), ganhos });

  // "Puxar do projeto": lê as ferramentas já preenchidas (defensivo — tool ausente = nada).
  const puxarDoProjeto = () => {
    const all = allProjectData || {};
    const get = (id: string) => {
      let e = all[id];
      if (!e) { const k = Object.keys(all).find(k => k.endsWith('_' + id)); if (k) e = all[k]; }
      return e?.toolData || e || null;
    };

    const ish = get('measureIshikawa');
    const novoProblema = ish?.problem || get('charter')?.problem || get('brief')?.problema || '';
    if (novoProblema && !problema.trim()) setProblema(novoProblema);

    const causas: string[] = [];
    if (ish?.causes && typeof ish.causes === 'object') {
      Object.values(ish.causes).forEach((arr: any) => {
        if (Array.isArray(arr)) arr.forEach((c: any) => { const t = typeof c === 'string' ? c : (c?.text || c?.name || ''); if (t) causas.push(t); });
      });
    }
    const fw = get('fiveWhys');
    if (Array.isArray(fw?.chains)) fw.chains.forEach((c: any) => { if (c?.rootCause) causas.push(c.rootCause); });
    if (causas.length) setCausasRaizes(prev => { const base = prev.filter(x => x.trim()); return [...base, ...causas]; });

    const sols: string[] = [];
    const p5 = get('plan5w2h');
    if (Array.isArray(p5?.actions)) p5.actions.forEach((a: any) => { if (a?.what) sols.push(a.what); });
    const ap = get('actionPlan');
    if (Array.isArray(ap?.actions)) ap.actions.forEach((a: any) => { const t = a?.what || a?.acao || a?.descricao || a?.text; if (t) sols.push(t); });
    if (sols.length) setSolucoes(prev => { const base = prev.filter(x => x.trim()); return [...base, ...sols]; });

    const tg = get('tangibleGains');
    const accReal = computeGanhoReal(tg);
    if (accReal !== 0) {
      const linha = `Ganho real acumulado: ${fmtBRL(accReal)}${tg?.indicator ? ` (indicador: ${tg.indicator})` : ''}.`;
      setGanhos(prev => (prev.trim() ? prev : linha));
    }
  };

  const listField = (
    items: string[], set: (v: string[]) => void, placeholder: string,
  ) => (
    <div className="space-y-2">
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <span className="text-[11px] font-bold text-[#0033CC] w-5 text-right">{i + 1}.</span>
          <input value={val} placeholder={placeholder}
            onChange={(e) => set(items.map((x, j) => (j === i ? e.target.value : x)))}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-300 outline-none" />
          <button onClick={() => set(items.length > 1 ? items.filter((_, j) => j !== i) : [''])}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer" title="Remover">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={() => set([...items, ''])}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 cursor-pointer bg-transparent">
        <Plus size={14} /> Adicionar
      </button>
    </div>
  );

  const secLabel = 'text-sm font-black text-[#1E2D6E] uppercase tracking-wide mb-2 flex items-center gap-2';

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileCheck2 size={20} className="text-[#0033CC]" /> Termo de Encerramento do Projeto
        </h2>
        <button onClick={puxarDoProjeto}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0">
          <Sparkles size={14} /> Puxar do projeto
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Nome do projeto</label>
          <input value={nomeProjeto} onChange={(e) => setNomeProjeto(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Data de encerramento</label>
          <input type="date" value={dataEncerramento} onChange={(e) => setDataEncerramento(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Responsável</label>
          <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-[#F0F2FA] focus:ring-2 focus:ring-blue-300 outline-none cursor-pointer">
            <option value="concluido">Concluído</option>
            <option value="em_andamento">Em andamento</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Problema */}
      <div>
        <div className={secLabel}>1 · O problema</div>
        <textarea value={problema} onChange={(e) => setProblema(e.target.value)} rows={3} placeholder="Qual era o problema que o projeto atacou?"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-300 outline-none resize-y" />
      </div>

      {/* Causas raízes */}
      <div>
        <div className={secLabel}>2 · Causas raízes identificadas</div>
        {listField(causasRaizes, setCausasRaizes, 'Causa raiz identificada…')}
      </div>

      {/* Soluções */}
      <div>
        <div className={secLabel}>3 · Soluções implementadas</div>
        {listField(solucoes, setSolucoes, 'Solução implementada…')}
      </div>

      {/* Ganhos */}
      <div>
        <div className={secLabel}>4 · Ganhos do projeto</div>
        <textarea value={ganhos} onChange={(e) => setGanhos(e.target.value)} rows={3} placeholder="Resultados e ganhos obtidos (o botão 'Puxar do projeto' traz o ganho em R$ da ferramenta Ganhos Tangíveis)."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-300 outline-none resize-y" />
      </div>

      <div className="flex gap-2 items-start p-3 rounded-lg bg-[#F0F2FA] text-[12px] text-gray-600">
        <Info size={15} className="text-[#0033CC] shrink-0 mt-0.5" />
        <span>Este termo consolida o fechamento do projeto. <b>Salvar com status "Concluído"</b> marca o projeto como encerrado — a <b>data de encerramento</b> é o marco de conclusão usado nos indicadores de tempo.</span>
      </div>

      <button data-save-trigger onClick={save} className="hidden" />
    </div>
  );
}
