import React, { useState, useEffect } from 'react';
import { FileCheck2, Plus, Trash2, Sparkles, Info, Printer } from 'lucide-react';

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

  const handlePrint = () => window.print();

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
            className="no-print opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 border-none bg-transparent cursor-pointer" title="Remover">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={() => set([...items, ''])}
        className="no-print flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 cursor-pointer bg-transparent">
        <Plus size={14} /> Adicionar
      </button>
    </div>
  );

  const secLabel = 'text-sm font-black text-[#1E2D6E] uppercase tracking-wide mb-2 flex items-center gap-2';
  const dataEncerramentoFormatada = dataEncerramento
    ? dataEncerramento.split('-').reverse().join('/')
    : 'Não informada';
  const statusFormatado = status === 'concluido'
    ? 'Concluído'
    : status === 'cancelado'
      ? 'Cancelado'
      : 'Em andamento';
  const causasPreenchidas = causasRaizes.filter((item) => item.trim());
  const solucoesPreenchidas = solucoes.filter((item) => item.trim());

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Barra de ações — não sai na impressão */}
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap no-print">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileCheck2 size={20} className="text-[#0033CC]" /> Termo de Encerramento do Projeto
        </h2>
        <div className="flex gap-2">
          <button onClick={puxarDoProjeto}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0">
            <Sparkles size={14} /> Puxar do projeto
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E2D6E] text-[#1E2D6E] hover:bg-[#F0F2FA] text-[11px] font-black uppercase tracking-widest transition cursor-pointer bg-white">
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Documento imprimível (A4) */}
      <div id="project-close-print" className="bg-white max-w-[210mm] mx-auto space-y-5">
      <div className="project-close-screen space-y-5">
        {/* Cabeçalho do documento */}
        <div className="flex items-center gap-3 border-b-2 border-[#1E2D6E] pb-3">
          <img src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" alt="LBW" className="h-9 w-auto" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0033CC]">Learning by Working</div>
            <div className="text-lg font-black text-[#1E2D6E] leading-tight">Termo de Encerramento do Projeto</div>
          </div>
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
      </div>

      {/* Versão estática e compacta usada exclusivamente na impressão/PDF. */}
      <article className="project-close-print-sheet" aria-label="Termo de Encerramento do Projeto">
        <header className="pcs-header">
          <div className="pcs-brand">
            <img src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" alt="LBW" />
            <div>
              <span>LEARNING BY WORKING</span>
              <h1>Termo de Encerramento do Projeto</h1>
            </div>
          </div>
          <div className={`pcs-status pcs-status-${status}`}>{statusFormatado}</div>
        </header>

        <section className="pcs-project-name">
          <span>PROJETO</span>
          <strong>{nomeProjeto || 'Projeto sem nome'}</strong>
        </section>

        <section className="pcs-meta">
          <div><span>Responsável</span><strong>{responsavel || 'Não informado'}</strong></div>
          <div><span>Data de encerramento</span><strong>{dataEncerramentoFormatada}</strong></div>
          <div><span>Status</span><strong>{statusFormatado}</strong></div>
        </section>

        <main className="pcs-content">
          <div className="pcs-column">
            <section className="pcs-card pcs-problem">
              <h2><b>1</b> O problema</h2>
              <p>{problema || 'Não informado.'}</p>
            </section>

            <section className="pcs-card">
              <h2><b>2</b> Causas-raízes identificadas</h2>
              {causasPreenchidas.length > 0 ? (
                <ol>{causasPreenchidas.map((item, index) => <li key={`causa-pdf-${index}`}>{item}</li>)}</ol>
              ) : <p>Não informadas.</p>}
            </section>
          </div>

          <div className="pcs-column">
            <section className="pcs-card">
              <h2><b>3</b> Soluções implementadas</h2>
              {solucoesPreenchidas.length > 0 ? (
                <ol>{solucoesPreenchidas.map((item, index) => <li key={`solucao-pdf-${index}`}>{item}</li>)}</ol>
              ) : <p>Não informadas.</p>}
            </section>

            <section className="pcs-card pcs-gains">
              <h2><b>4</b> Ganhos do projeto</h2>
              <p>{ganhos || 'Não informados.'}</p>
            </section>
          </div>
        </main>

        <footer className="pcs-footer">
          <span>LBW · Educação pelo Trabalho</span>
          <span>Documento de encerramento do projeto</span>
        </footer>
      </article>
      </div>{/* fim do documento imprimível */}

      <div className="no-print flex gap-2 items-start p-3 rounded-lg bg-[#F0F2FA] text-[12px] text-gray-600">
        <Info size={15} className="text-[#0033CC] shrink-0 mt-0.5" />
        <span>Este termo consolida o fechamento do projeto. <b>Salvar com status "Concluído"</b> marca o projeto como encerrado — a <b>data de encerramento</b> é o marco de conclusão usado nos indicadores de tempo.</span>
      </div>

      <button data-save-trigger onClick={save} className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        .project-close-print-sheet { display: none; }
        @media print {
          html, body { width: 210mm; height: 297mm; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          #project-close-print, #project-close-print * { visibility: visible; }
          #project-close-print {
            position: absolute; left: 0; top: 0; width: 210mm; height: 297mm;
            max-width: none; margin: 0; padding: 0; border: none; background: #fff;
            overflow: hidden;
          }
          .no-print { display: none !important; }
          .project-close-screen { display: none !important; }
          .project-close-print-sheet {
            display: flex !important; flex-direction: column; box-sizing: border-box;
            width: 210mm; height: 297mm; padding: 11mm 12mm 9mm;
            color: #172033; background: #fff; font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .pcs-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.2mm solid #1E2D6E; padding-bottom: 4mm; }
          .pcs-brand { display: flex; align-items: center; gap: 4mm; }
          .pcs-brand img { width: auto; height: 12mm; object-fit: contain; }
          .pcs-brand span { display: block; color: #0033CC; font-size: 7.5pt; font-weight: 800; letter-spacing: 1.4pt; margin-bottom: 1mm; }
          .pcs-brand h1 { margin: 0; color: #1E2D6E; font-size: 17pt; line-height: 1.05; font-weight: 800; }
          .pcs-status { min-width: 30mm; padding: 2.5mm 4mm; border-radius: 20mm; text-align: center; font-size: 8.5pt; font-weight: 800; text-transform: uppercase; }
          .pcs-status-concluido { color: #08754f; background: #DDF6EC; border: .35mm solid #7BD8B7; }
          .pcs-status-em_andamento { color: #8A5A00; background: #FFF4CF; border: .35mm solid #F0CE67; }
          .pcs-status-cancelado { color: #A52626; background: #FDE4E4; border: .35mm solid #EFA0A0; }
          .pcs-project-name { margin-top: 5mm; padding: 3.5mm 4mm; border-radius: 2.5mm; background: linear-gradient(120deg,#1E2D6E,#0033CC); color: #fff; }
          .pcs-project-name span { display: block; font-size: 6.8pt; letter-spacing: 1.2pt; font-weight: 700; color: #C7D2FF; margin-bottom: 1.2mm; }
          .pcs-project-name strong { display: block; font-size: 12.5pt; line-height: 1.2; }
          .pcs-meta { display: grid; grid-template-columns: 2fr 1fr .8fr; margin-top: 3mm; border: .3mm solid #D8DFEC; border-radius: 2mm; overflow: hidden; }
          .pcs-meta div { min-height: 13mm; padding: 2.5mm 3mm; border-right: .3mm solid #D8DFEC; background: #F7F9FD; }
          .pcs-meta div:last-child { border-right: 0; }
          .pcs-meta span { display: block; color: #6D7890; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .5pt; margin-bottom: 1.2mm; }
          .pcs-meta strong { display: block; color: #1E2D6E; font-size: 8.5pt; line-height: 1.25; }
          .pcs-content { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 4mm; flex: 1; min-height: 0; }
          .pcs-column { display: flex; flex-direction: column; gap: 4mm; min-height: 0; }
          .pcs-card { border: .3mm solid #D8DFEC; border-radius: 2.5mm; padding: 3.5mm; break-inside: avoid; background: #fff; }
          .pcs-card h2 { display: flex; align-items: center; gap: 2mm; margin: 0 0 2.5mm; color: #1E2D6E; font-size: 9pt; line-height: 1.15; text-transform: uppercase; letter-spacing: .25pt; }
          .pcs-card h2 b { display: inline-flex; align-items: center; justify-content: center; width: 6mm; height: 6mm; border-radius: 50%; background: #0033CC; color: #fff; font-size: 7.5pt; }
          .pcs-card p { margin: 0; color: #364157; font-size: 8.2pt; line-height: 1.42; text-align: left; white-space: pre-wrap; }
          .pcs-card ol { list-style: none; counter-reset: pcs-item; margin: 0; padding: 0; }
          .pcs-card li { counter-increment: pcs-item; position: relative; margin: 0 0 2.2mm; padding: 0 0 2.2mm 6mm; border-bottom: .25mm solid #E9EDF5; color: #364157; font-size: 7.8pt; line-height: 1.32; }
          .pcs-card li:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
          .pcs-card li::before { content: counter(pcs-item); position: absolute; left: 0; top: .1mm; display: flex; align-items: center; justify-content: center; width: 4mm; height: 4mm; border-radius: 1mm; background: #EAF0FF; color: #0033CC; font-size: 6.5pt; font-weight: 800; }
          .pcs-problem { background: #F7F9FD; }
          .pcs-gains { background: #EAF8F2; border-color: #9CDAC3; }
          .pcs-gains h2 { color: #08754f; }
          .pcs-gains h2 b { background: #12805C; }
          .pcs-gains p { color: #174D3B; font-weight: 600; }
          .pcs-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 4mm; padding-top: 2.5mm; border-top: .35mm solid #C9D1E2; color: #78839A; font-size: 6.8pt; font-weight: 700; letter-spacing: .25pt; text-transform: uppercase; }
          @page { size: A4 portrait; margin: 0; }
        }
      ` }} />
    </div>
  );
}
