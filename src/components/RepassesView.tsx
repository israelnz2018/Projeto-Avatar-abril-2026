/**
 * RepassesView — painel de repasse B2B (admin/consultor).
 * Por EMPRESA (coordenador): valor do negócio (NF) + 10% que o consultor deve,
 * cronograma de parcelas (espelha o do consultor), anexo da NF (lastro) e a TRAVA
 * do certificado. O certificado dos alunos da empresa só sai com "Certificado liberado".
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Building2, Upload, FileText, Plus, Trash2, Lock, Unlock } from 'lucide-react';
import { useUserAccess } from '../hooks/useUserAccess';
import { getTodosRepasses, salvarRepasse, REPASSE_PCT, type Repasse, type RepasseParcela } from '../services/repasseService';
import { resolveConsultorId } from '../services/consultorService';

interface Empresa {
  empresaId: string;
  empresaNome: string;
  consultorId: string;
  alunos: number;
}

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const parseNum = (s: string) => { const n = Number(String(s).replace(/[^\d.,]/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const emUmMes = () => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

export default function RepassesView() {
  const { isAdmin, isConsultor, loading: loadingAcesso } = useUserAccess();
  const consultorIdAtual = resolveConsultorId();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [repasses, setRepasses] = useState<Record<string, Repasse>>({});
  const [loading, setLoading] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [msgId, setMsgId] = useState<{ id: string; txt: string } | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const usersQuery = isAdmin ? usersRef : query(usersRef, where('consultorId', '==', consultorIdAtual));
      const [usersSnap, reps] = await Promise.all([getDocs(usersQuery), getTodosRepasses(isAdmin ? undefined : consultorIdAtual)]);
      const users = usersSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
      const coords = users.filter((u) => u.tipoUsuario === 'coordenador' && u.empresaId);
      const lista: Empresa[] = coords.map((c) => ({
        empresaId: String(c.empresaId),
        empresaNome: c.empresaNome || c.empresaId,
        consultorId: c.consultorId || 'israel',
        alunos: users.filter((a) => a.empresaId === c.empresaId && a.tipoUsuario === 'aluno').length,
      })).sort((a, b) => a.empresaNome.localeCompare(b.empresaNome));
      setEmpresas(lista);
      setRepasses(reps);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  const porConsultor = useMemo(() => {
    const m = new Map<string, Empresa[]>();
    empresas.forEach((e) => { const arr = m.get(e.consultorId) || []; arr.push(e); m.set(e.consultorId, arr); });
    return Array.from(m.entries());
  }, [empresas]);

  if (loadingAcesso) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o admin/consultor vê os repasses.</div>;

  // Repasse "de trabalho" (mesclado com o default) por empresa
  const rp = (e: Empresa): Repasse => repasses[e.empresaId] || {
    empresaId: e.empresaId, consultorId: e.consultorId, empresaNome: e.empresaNome,
    valorNota: 0, notaFiscalUrl: '', parcelas: [], certificadoLiberado: false,
  };
  const patch = (empresaId: string, p: Partial<Repasse>) =>
    setRepasses((prev) => ({ ...prev, [empresaId]: { ...rp({ empresaId } as Empresa), ...prev[empresaId], ...p } as Repasse }));

  async function salvar(e: Empresa) {
    setSalvandoId(e.empresaId); setMsgId(null);
    try {
      const r = rp(e);
      await salvarRepasse({ ...r, empresaId: e.empresaId, consultorId: e.consultorId, empresaNome: e.empresaNome });
      setMsgId({ id: e.empresaId, txt: '✅ Salvo.' });
    } catch (err: any) { setMsgId({ id: e.empresaId, txt: '❌ ' + (err?.message || err) }); }
    finally { setSalvandoId(null); }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Repasses</h1>
      <p className="text-gray-500 text-sm mb-6">
        Por empresa: valor do negócio, os <b>{Math.round(REPASSE_PCT * 100)}%</b> a receber, a nota fiscal (lastro) e a
        <b> trava do certificado</b> — o certificado dos alunos só sai quando você libera.
      </p>

      {loading ? <div className="text-gray-500">Carregando…</div> : porConsultor.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
          Nenhuma empresa (coordenador) cadastrada ainda.
        </div>
      ) : (
        <div className="space-y-8">
          {porConsultor.map(([consultorId, emps]) => (
            <div key={consultorId}>
              <h2 className="text-xs font-black uppercase tracking-wide text-gray-400 mb-3">Consultor: {consultorId}</h2>
              <div className="space-y-4">
                {emps.map((e) => {
                  const r = rp(e);
                  const dezPct = (r.valorNota || 0) * REPASSE_PCT;
                  return (
                    <div key={e.empresaId} className="bg-white border border-gray-200 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0"><Building2 size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-800 truncate">{e.empresaNome}</div>
                          <div className="text-xs text-gray-400">{e.alunos} aluno{e.alunos !== 1 ? 's' : ''}</div>
                        </div>
                        {/* Trava do certificado */}
                        <button
                          onClick={() => patch(e.empresaId, { certificadoLiberado: !r.certificadoLiberado })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${r.certificadoLiberado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                          title="Libera/segura o certificado dos alunos desta empresa"
                        >
                          {r.certificadoLiberado ? <Unlock size={14} /> : <Lock size={14} />}
                          {r.certificadoLiberado ? 'Certificado liberado' : 'Certificado travado'}
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3 mb-4">
                        <div>
                          <div className="text-[11px] font-bold text-gray-500 mb-1">Valor do negócio (NF)</div>
                          <input value={r.valorNota ? String(r.valorNota).replace('.', ',') : ''} onChange={(ev) => patch(e.empresaId, { valorNota: parseNum(ev.target.value) })} placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-gray-500 mb-1">Seus {Math.round(REPASSE_PCT * 100)}%</div>
                          <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-black text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(dezPct)}</div>
                        </div>
                        <NfUpload repasse={{ ...r, empresaId: e.empresaId, consultorId: e.consultorId, empresaNome: e.empresaNome }} onUrl={(url) => patch(e.empresaId, { notaFiscalUrl: url })} />
                      </div>

                      {/* Parcelas (espelha o cronograma do consultor) */}
                      <Parcelas parcelas={r.parcelas || []} onChange={(ps) => patch(e.empresaId, { parcelas: ps })} />

                      <div className="flex items-center gap-3 mt-4">
                        <button onClick={() => salvar(e)} disabled={salvandoId === e.empresaId} className="px-5 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                          {salvandoId === e.empresaId ? 'Salvando…' : 'Salvar'}
                        </button>
                        {msgId?.id === e.empresaId && <span className="text-sm text-gray-600">{msgId.txt}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- sub-componentes ---------- */

function NfUpload({ repasse, onUrl }: { repasse: Repasse; onUrl: (u: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar(file?: File) {
    if (!file) return;
    setEnviando(true);
    try {
      await salvarRepasse(repasse);
      const sref = storageRef(storage, `repasses/${repasse.empresaId}/nf-${file.name.replace(/[^\w.\-]/g, '_')}`);
      await uploadBytes(sref, file, { contentType: file.type || 'application/pdf' });
      onUrl(await getDownloadURL(sref));
    } catch { /* ignore */ }
    finally { setEnviando(false); }
  }
  return (
    <div>
      <div className="text-[11px] font-bold text-gray-500 mb-1">Nota fiscal (lastro)</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => ref.current?.click()} disabled={enviando} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          <Upload size={14} /> {enviando ? 'Enviando…' : repasse.notaFiscalUrl ? 'Trocar' : 'Anexar'}
        </button>
        {repasse.notaFiscalUrl && <a href={repasse.notaFiscalUrl} target="_blank" rel="noreferrer" className="text-blue-600" title="Ver NF"><FileText size={16} /></a>}
      </div>
      <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={(ev) => { enviar(ev.target.files?.[0]); ev.target.value = ''; }} />
    </div>
  );
}

function Parcelas({ parcelas, onChange }: { parcelas: RepasseParcela[]; onChange: (p: RepasseParcela[]) => void }) {
  const add = () => onChange([...parcelas, { vencimento: emUmMes(), valor: 0, recebido: false }]);
  const set = (i: number, p: Partial<RepasseParcela>) => onChange(parcelas.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const del = (i: number) => onChange(parcelas.filter((_, j) => j !== i));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-black uppercase tracking-wide text-gray-400">Parcelas (mesmo ritmo do consultor)</div>
        <button onClick={add} className="flex items-center gap-1 text-xs font-bold text-blue-600"><Plus size={13} /> parcela</button>
      </div>
      {parcelas.length === 0 && <div className="text-xs text-gray-400">Sem parcelas — pagamento único.</div>}
      <div className="space-y-2">
        {parcelas.map((p, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <input type="date" value={p.vencimento || ''} onChange={(e) => set(i, { vencimento: e.target.value || null })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">R$</span>
              <input value={p.valor ? String(p.valor).replace('.', ',') : ''} onChange={(e) => set(i, { valor: parseNum(e.target.value) })} placeholder="0,00" className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" /></div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-600">
              <input type="checkbox" checked={p.recebido} onChange={(e) => set(i, { recebido: e.target.checked })} /> recebido
            </label>
            <button onClick={() => del(i)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
