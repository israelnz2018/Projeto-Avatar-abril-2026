/**
 * MeusAlunos — gestão completa dos alunos do consultor.
 * Lista + coluna de cursos + editar (cada curso com vencimento e valor próprios,
 * add/remove) + adicionar aluno (nome, email, e por curso: vencimento default 1 ano
 * e valor pago). Tudo no Firebase. Ver PLANO-WHITELABEL.md.
 *
 * Acesso: 'completo' = todos os cursos; sem cursosAcesso e não-completo = grupo grátis
 * (Trilha 1, os cursos isFree); com cursosAcesso = pacote por-curso escolhido aqui.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { getInitiatives } from '../../services/configService';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}

interface CursoAcesso { curso: string; vencimento: string | null; valor: number; }
interface Aluno {
  uid: string; nome: string; email: string; tipo: string; acessou: boolean;
  cursosAcesso: CursoAcesso[]; completo: boolean;
}

const emUmAno = () => new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const venceu = (v: string | null) => !!v && new Date(v).getTime() < Date.now();
const parseValor = (s: string) => { const n = Number(String(s).replace(',', '.')); return isNaN(n) ? 0 : n; };
// Sem separador de milhar (evita o ponto ser lido como decimal ao reparsear). Vírgula = decimal.
const fmtValor = (v: number) => (v ? String(v).replace('.', ',') : '');

export default function MeusAlunos() {
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAcesso } = useUserAccess();
  const [rows, setRows] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<string[]>([]);
  const [freeCursos, setFreeCursos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // adicionar — cada curso do pacote com vencimento + valor próprios
  const [addAberto, setAddAberto] = useState(false);
  const [aNome, setANome] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aItens, setAItens] = useState<{ curso: string; vencimento: string; valor: string }[]>([]);
  const [addEnviando, setAddEnviando] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // editar
  const [editUid, setEditUid] = useState<string | null>(null);
  const [eCursos, setECursos] = useState<CursoAcesso[]>([]);
  const [eAddCurso, setEAddCurso] = useState('');
  const [editSalvando, setEditSalvando] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const [usersSnap, kbSnap, inits] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId))),
        getDocs(query(collection(db, 'knowledge_base'), where('consultorId', '==', consultorId))),
        getInitiatives(),
      ]);
      const lista: Aluno[] = usersSnap.docs
        .map((d) => {
          const u = d.data() as any;
          let ca: CursoAcesso[] = Array.isArray(u.cursosAcesso)
            ? u.cursosAcesso.map((c: any) => ({ curso: c?.curso, vencimento: c?.vencimento ?? null, valor: typeof c?.valor === 'number' ? c.valor : 0 })).filter((c: CursoAcesso) => c.curso)
            : [];
          if (ca.length === 0 && Array.isArray(u.cursosLiberados)) ca = u.cursosLiberados.map((c: string) => ({ curso: c, vencimento: null, valor: 0 }));
          // Acesso Completo (mundo Israel/legado): plano 'completo' válido OU formação avançada.
          const completoValido = (() => {
            const ate = u.acessoCompletoAte;
            if (!ate) return true;
            const dt = new Date(ate);
            return isNaN(dt.getTime()) ? true : dt.getTime() > Date.now();
          })();
          const completo = (u.plano === 'completo' && completoValido)
            || (Array.isArray(u.formacoes) && u.formacoes.some((f: string) => !String(f).includes('introdutoria') && !String(f).includes('gratuito')));
          return {
            uid: d.id,
            nome: u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : '—'),
            email: u.email || '',
            tipo: u.tipoUsuario || 'aluno',
            acessou: !!u.primeiroAcessoEm,
            cursosAcesso: ca,
            completo,
          };
        })
        .filter((u) => u.tipo !== 'admin' && u.tipo !== 'coordenador' && u.tipo !== 'consultor')
        .sort((a, b) => a.nome.localeCompare(b.nome));
      const nomesCursos = Array.from(new Set(kbSnap.docs.map((d) => ((d.data() as any).course || '').trim()).filter(Boolean))).sort();
      const gratis = inits.filter((i) => i.isFree === true).map((i) => i.name).filter(Boolean);
      setRows(lista);
      setCursos(nomesCursos);
      setFreeCursos(gratis);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [consultorId]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.nome.toLowerCase().includes(t) || r.email.toLowerCase().includes(t));
  }, [rows, busca]);

  if (loadingAcesso) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor gerencia alunos.</div>;

  // ----- adicionar -----
  const toggleCursoAdd = (curso: string) =>
    setAItens((p) => p.some((i) => i.curso === curso)
      ? p.filter((i) => i.curso !== curso)
      : [...p, { curso, vencimento: emUmAno(), valor: '' }]);
  const setItemVenc = (curso: string, v: string) => setAItens((p) => p.map((i) => (i.curso === curso ? { ...i, vencimento: v } : i)));
  const setItemValor = (curso: string, v: string) => setAItens((p) => p.map((i) => (i.curso === curso ? { ...i, valor: v.replace(/[^\d.,]/g, '') } : i)));

  async function adicionar() {
    const mail = aEmail.trim().toLowerCase();
    if (!mail || mail.indexOf('@') < 0) { setAddMsg('Informe um e-mail válido.'); return; }
    if (aItens.length === 0) { setAddMsg('Escolha ao menos um curso.'); return; }
    setAddEnviando(true); setAddMsg('');
    try {
      const cursosAcesso = aItens.map((i) => ({ curso: i.curso, vencimento: i.vencimento || null, valor: parseValor(i.valor) }));
      const valorPago = cursosAcesso.reduce((s, c) => s + c.valor, 0);
      const r = await authedFetch('/api/aluno/convidar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, nome: aNome.trim(), cursosAcesso, valorPago }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (r.ok) {
        setAddMsg(`✅ Aluno ${j.status}${j.emailEnviado ? '' : ' (e-mail falhou)'}`);
        setANome(''); setAEmail(''); setAItens([]);
        setAddAberto(false);
        carregar();
      } else setAddMsg('❌ ' + (j.error || 'erro'));
    } catch (e: any) { setAddMsg('❌ ' + (e?.message || e)); }
    finally { setAddEnviando(false); }
  }

  // ----- editar -----
  function abrirEdit(a: Aluno) {
    setEditUid(a.uid);
    setECursos(a.cursosAcesso.map((c) => ({ ...c })));
    setEAddCurso('');
    setEditMsg('');
  }
  const setVenc = (curso: string, v: string) => setECursos((p) => p.map((c) => (c.curso === curso ? { ...c, vencimento: v || null } : c)));
  const setValorCurso = (curso: string, v: string) => setECursos((p) => p.map((c) => (c.curso === curso ? { ...c, valor: parseValor(v.replace(/[^\d.,]/g, '')) } : c)));
  const removerCurso = (curso: string) => setECursos((p) => p.filter((c) => c.curso !== curso));
  const addCursoEdit = () => {
    if (!eAddCurso || eCursos.some((c) => c.curso === eAddCurso)) return;
    setECursos((p) => [...p, { curso: eAddCurso, vencimento: emUmAno(), valor: 0 }]);
    setEAddCurso('');
  };

  async function salvarEdit(uid: string) {
    setEditSalvando(true); setEditMsg('');
    try {
      const valorPago = eCursos.reduce((s, c) => s + (c.valor || 0), 0);
      await setDoc(doc(db, 'users', uid), { cursosAcesso: eCursos, valorPago }, { merge: true });
      setRows((p) => p.map((r) => (r.uid === uid ? { ...r, cursosAcesso: eCursos } : r)));
      setEditMsg('✅ Salvo.');
    } catch (e: any) { setEditMsg('❌ ' + (e?.message || e)); }
    finally { setEditSalvando(false); }
  }

  const campo = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const cursosDisponiveis = cursos.filter((c) => !eCursos.some((x) => x.curso === c));

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Meus Alunos</h1>
      <p className="text-gray-500 text-sm mb-5">Gerencie os alunos de <b>{consultor.branding.nome}</b> — cursos, vencimento e valor por curso.</p>

      {/* ADICIONAR ALUNO */}
      <div className="bg-white border border-gray-200 rounded-2xl mb-6">
        <button onClick={() => setAddAberto((v) => !v)} className="w-full flex items-center justify-between px-5 py-3.5 font-black text-gray-800">
          <span className="flex items-center gap-2"><Plus size={18} className="text-blue-600" /> Adicionar aluno</span>
          <ChevronDown size={18} className={`transition-transform ${addAberto ? 'rotate-180' : ''}`} />
        </button>
        {addAberto && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={aNome} onChange={(e) => setANome(e.target.value)} placeholder="Nome completo" className={campo} />
              <input value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="E-mail" className={campo} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-1">Cursos que ele vai acessar</div>
              <div className="flex flex-wrap gap-2">
                {cursos.length === 0 && <span className="text-xs text-gray-400">Nenhum curso ainda.</span>}
                {cursos.map((c) => {
                  const on = aItens.some((i) => i.curso === c);
                  return (
                    <button key={c} onClick={() => toggleCursoAdd(c)}
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Por curso escolhido: vencimento + valor */}
            {aItens.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wide text-gray-400">Vencimento e valor de cada curso</div>
                {aItens.map((i) => (
                  <div key={i.curso} className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{i.curso}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">vence</span>
                      <input type="date" value={i.vencimento} onChange={(e) => setItemVenc(i.curso, e.target.value)} className={campo} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">R$</span>
                      <input value={i.valor} onChange={(e) => setItemValor(i.curso, e.target.value)} placeholder="0,00" className={campo + ' w-24'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={adicionar} disabled={addEnviando} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
                {addEnviando ? 'Adicionando…' : 'Adicionar aluno'}
              </button>
              {addMsg && <span className="text-sm text-gray-600">{addMsg}</span>}
            </div>
          </div>
        )}
      </div>

      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail…" className={campo + ' w-full max-w-sm mb-4'} />

      {loading ? <div className="text-gray-500">Carregando…</div> : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1.3fr_1.4fr_auto] gap-3 px-4 py-2.5 bg-gray-50 text-[10px] font-black uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <div>Aluno</div><div>Cursos com acesso</div><div className="text-right">Editar</div>
          </div>
          {filtrados.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum aluno.</div>}
          {filtrados.map((a) => (
            <div key={a.uid} className="border-b border-gray-50 last:border-0">
              <div className="grid grid-cols-[1.3fr_1.4fr_auto] gap-3 px-4 py-3 items-center">
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 text-sm truncate">{a.nome}</div>
                  <div className="text-xs text-gray-400 truncate">{a.email}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.completo ? (
                    <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-emerald-50 text-emerald-700">✓ Completo · todos os cursos</span>
                  ) : a.cursosAcesso.length > 0 ? (
                    a.cursosAcesso.map((c) => (
                      <span key={c.curso} className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${venceu(c.vencimento) ? 'bg-red-50 text-red-600 line-through' : 'bg-blue-50 text-blue-700'}`}>{c.curso}</span>
                    ))
                  ) : freeCursos.length > 0 ? (
                    freeCursos.map((c) => (
                      <span key={c} className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-amber-50 text-amber-700">{c} · grátis</span>
                    ))
                  ) : (
                    <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-amber-50 text-amber-700">Trilha 1 · grátis</span>
                  )}
                </div>
                <div className="text-right">
                  <button onClick={() => (editUid === a.uid ? setEditUid(null) : abrirEdit(a))} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                    {editUid === a.uid ? 'fechar' : 'editar'}
                  </button>
                </div>
              </div>
              {editUid === a.uid && (
                <div className="px-4 pb-4 bg-gray-50/60">
                  {a.completo && (
                    <div className="mt-3 mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      Este aluno tem <b>acesso Completo</b> (todos os cursos). Você só precisa mexer aqui embaixo se quiser trocá-lo para <b>acesso por curso</b>.
                    </div>
                  )}
                  <div className="text-xs font-black uppercase text-gray-500 mb-2">Cursos · vencimento e valor</div>
                  <div className="space-y-2 mb-3">
                    {eCursos.length === 0 && <div className="text-xs text-gray-400">Nenhum curso liberado.</div>}
                    {eCursos.map((c) => (
                      <div key={c.curso} className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{c.curso}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-400">vence</span>
                          <input type="date" value={c.vencimento || ''} onChange={(e) => setVenc(c.curso, e.target.value)} className={campo} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-400">R$</span>
                          <input value={fmtValor(c.valor)} onChange={(e) => setValorCurso(c.curso, e.target.value)} placeholder="0,00" className={campo + ' w-24'} />
                        </div>
                        <button onClick={() => removerCurso(c.curso)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remover curso"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                  {cursosDisponiveis.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <select value={eAddCurso} onChange={(e) => setEAddCurso(e.target.value)} className={campo}>
                        <option value="">+ adicionar curso…</option>
                        {cursosDisponiveis.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={addCursoEdit} disabled={!eAddCurso} className="text-xs font-bold text-blue-600 disabled:opacity-40">adicionar</button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => salvarEdit(a.uid)} disabled={editSalvando} className="px-5 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                      {editSalvando ? 'Salvando…' : 'Salvar'}
                    </button>
                    {editMsg && <span className="text-sm text-gray-600">{editMsg}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
