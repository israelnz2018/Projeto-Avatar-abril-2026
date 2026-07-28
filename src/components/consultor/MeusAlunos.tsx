/**
 * MeusAlunos — o consultor vê os usuários do mundo dele e LIBERA cursos por aluno.
 * Fora do mundo Israel não há grátis/pago: o aluno vê só os cursos que o consultor
 * liberou (users/{uid}.cursosLiberados). Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { X } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';

interface AlunoRow {
  uid: string;
  nome: string;
  email: string;
  plano: string;
  tipo: string;
  acessou: boolean;
  cursosLiberados: string[];
}

export default function MeusAlunos() {
  const { consultor, consultorId } = useConsultor();
  const [rows, setRows] = useState<AlunoRow[]>([]);
  const [cursos, setCursos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  // modal de liberar cursos
  const [alunoAberto, setAlunoAberto] = useState<AlunoRow | null>(null);
  const [selCursos, setSelCursos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const [usersSnap, kbSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId))),
        getDocs(query(collection(db, 'knowledge_base'), where('consultorId', '==', consultorId))),
      ]);
      const lista: AlunoRow[] = usersSnap.docs
        .map((d) => {
          const u = d.data() as any;
          return {
            uid: d.id,
            nome: u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : '—'),
            email: u.email || '',
            plano: u.plano || 'gratuito',
            tipo: u.tipoUsuario || 'aluno',
            acessou: !!u.primeiroAcessoEm,
            cursosLiberados: Array.isArray(u.cursosLiberados) ? u.cursosLiberados : [],
          };
        })
        .filter((u) => u.tipo !== 'admin')
        .sort((a, b) => a.nome.localeCompare(b.nome));
      const nomesCursos = Array.from(new Set(kbSnap.docs.map((d) => ((d.data() as any).course || '').trim()).filter(Boolean))).sort();
      setRows(lista);
      setCursos(nomesCursos);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar alunos.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [consultorId]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.nome.toLowerCase().includes(t) || r.email.toLowerCase().includes(t));
  }, [rows, busca]);

  const abrirCursos = (a: AlunoRow) => {
    setAlunoAberto(a);
    setSelCursos(a.cursosLiberados);
  };
  const toggleCurso = (nome: string) =>
    setSelCursos((prev) => (prev.includes(nome) ? prev.filter((c) => c !== nome) : [...prev, nome]));

  async function salvarCursos() {
    if (!alunoAberto) return;
    setSalvando(true);
    try {
      await setDoc(doc(db, 'users', alunoAberto.uid), { cursosLiberados: selCursos }, { merge: true });
      setRows((prev) => prev.map((r) => (r.uid === alunoAberto.uid ? { ...r, cursosLiberados: selCursos } : r)));
      setAlunoAberto(null);
    } catch (e: any) {
      alert('Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Meus Alunos</h1>
      <p className="text-gray-500 text-sm mb-5">
        Pessoas do seu site (<b>{consultor.branding.nome}</b>) — {rows.length} no total. Libere os cursos que cada um acessa.
      </p>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou e-mail…"
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading && <div className="text-gray-500">Carregando…</div>}
      {erro && <div className="text-red-600 font-bold">❌ {erro}</div>}

      {!loading && !erro && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_auto] gap-3 px-4 py-2.5 bg-gray-50 text-[10px] font-black uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <div>Nome / e-mail</div>
            <div>Cursos liberados</div>
            <div className="text-right">Acesso</div>
          </div>
          {filtrados.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum aluno.</div>}
          {filtrados.map((r) => (
            <div key={r.uid} className="grid grid-cols-[1.4fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <div className="font-bold text-gray-800 text-sm truncate">{r.nome}</div>
                <div className="text-xs text-gray-400 truncate">{r.email}</div>
              </div>
              <div>
                <button
                  onClick={() => abrirCursos(r)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5"
                >
                  {r.cursosLiberados.length > 0 ? `${r.cursosLiberados.length} curso${r.cursosLiberados.length > 1 ? 's' : ''} · editar` : 'liberar cursos'}
                </button>
              </div>
              <div className="text-right">
                {r.acessou ? <span className="text-xs font-bold text-emerald-600">● ativo</span> : <span className="text-xs text-gray-400">não acessou</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL liberar cursos */}
      {alunoAberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAlunoAberto(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="min-w-0">
                <div className="font-black text-gray-800 truncate">{alunoAberto.nome}</div>
                <div className="text-xs text-gray-400 truncate">Marque os cursos que ele pode acessar</div>
              </div>
              <button onClick={() => setAlunoAberto(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {cursos.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center">Você ainda não tem cursos. Adicione em "Meus Cursos".</div>
              ) : (
                <div className="space-y-1">
                  {cursos.map((c) => (
                    <label key={c} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selCursos.includes(c)} onChange={() => toggleCurso(c)} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm text-gray-800">{c}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{selCursos.length} de {cursos.length} liberados</span>
              <button onClick={salvarCursos} disabled={salvando} className="px-5 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
