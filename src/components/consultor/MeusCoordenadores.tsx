/**
 * MeusCoordenadores — o consultor CONVIDA coordenadores (mesmo padrão do convite
 * de consultor) e vê os coordenadores do mundo dele + o time de cada um.
 * O convite passa pelo /api/coordenador/convidar (server, admin SDK) — conta nova
 * = LBW2026 + troca no 1º login; existente = mantém a senha e só promove.
 * Escopo por consultorId. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Users2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}

interface CoordRow {
  uid: string;
  nome: string;
  email: string;
  empresa: string;
  time: number;
  timeAtivo: number;
  limite: number | null;
}

export default function MeusCoordenadores() {
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAcesso } = useUserAccess();
  const [rows, setRows] = useState<CoordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  // form de convite
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [maxAlunos, setMaxAlunos] = useState('5');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId)));
      const users = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
      const coords = users.filter((u) => u.tipoUsuario === 'coordenador');
      const alunos = users.filter((u) => u.tipoUsuario !== 'coordenador' && u.tipoUsuario !== 'admin');
      const lista: CoordRow[] = coords
        .map((c) => {
          const time = alunos.filter((a) => a.empresaId && a.empresaId === c.empresaId);
          return {
            uid: c.uid,
            nome: c.nome || c.displayName || (c.email ? String(c.email).split('@')[0] : '—'),
            email: c.email || '',
            empresa: c.empresaNome || c.empresaId || '—',
            time: time.length,
            timeAtivo: time.filter((a) => a.primeiroAcessoEm).length,
            limite: typeof c.maxAlunos === 'number' ? c.maxAlunos : null,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setRows(lista);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar coordenadores.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [consultorId]);

  if (loadingAcesso) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor gerencia coordenadores.</div>;

  async function convidar() {
    const mail = email.trim().toLowerCase();
    if (!mail || mail.indexOf('@') < 0) { setMsg('Informe um e-mail válido.'); return; }
    setEnviando(true);
    setMsg('');
    try {
      const r = await authedFetch('/api/coordenador/convidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, nome: nome.trim(), empresa: empresa.trim(), maxAlunos: Number(maxAlunos) || 5 }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (r.ok) {
        setMsg(`✅ Convite enviado (${j.status})${j.emailEnviado ? '' : ' — mas o e-mail falhou, cheque o Resend'}`);
        setEmail(''); setNome(''); setEmpresa('');
        carregar();
      } else {
        setMsg('❌ ' + (j.error || 'erro'));
      }
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || e));
    } finally {
      setEnviando(false);
    }
  }

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-xs font-black uppercase tracking-wide text-gray-500 mb-1';

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Meus Coordenadores</h1>
      <p className="text-gray-500 text-sm mb-6">
        Convide coordenadores pro seu mundo (<b>{consultor.branding.nome}</b>). Cada um gerencia o próprio time.
      </p>

      {/* CONVIDAR */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <h2 className="font-black text-gray-800 mb-4">Convidar coordenador</h2>
        <div className="mb-4">
          <label className={label}>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coordenador@email.com" className={campo} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className={campo} />
          </div>
          <div>
            <label className={label}>Time / empresa</label>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex.: Time Fábrica A" className={campo} />
          </div>
          <div>
            <label className={label}>Limite de alunos</label>
            <input value={maxAlunos} onChange={(e) => setMaxAlunos(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="5" className={campo} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-5">
          <button onClick={convidar} disabled={enviando} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40">
            {enviando ? 'Enviando…' : 'Convidar coordenador'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-3">Conta nova recebe senha provisória por e-mail. Se já for seu aluno, mantém a senha e vira coordenador — sem perder os cursos.</p>
      </div>

      {/* LISTA */}
      <h2 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-3">Coordenadores ({rows.length})</h2>
      {loading && <div className="text-gray-500">Carregando…</div>}
      {erro && <div className="text-red-600 font-bold">❌ {erro}</div>}
      {!loading && !erro && rows.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
          Nenhum coordenador ainda. Convide o primeiro acima.
        </div>
      )}
      <div className="grid gap-4">
        {rows.map((c) => (
          <div key={c.uid} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0">
              <Users2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-gray-800 truncate">{c.nome}</div>
              <div className="text-xs text-gray-400 truncate">{c.email} · {c.empresa}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-black text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {c.time}{c.limite != null ? ` / ${c.limite}` : ''}
              </div>
              <div className="text-[11px] text-gray-400">{c.timeAtivo} ativos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
