/**
 * MeusAlunos — o consultor vê os usuários do MUNDO DELE (users com o consultorId dele).
 *
 * Read-only. Lista nome, e-mail, plano, papel e se já acessou. Escopo por consultorId
 * (Israel = admin, lê tudo; consultor real virá com regra própria na Fase 2).
 * Não toca no painel admin nem no app. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';

interface AlunoRow {
  uid: string;
  nome: string;
  email: string;
  plano: string;
  tipo: string;
  acessou: boolean;
}

export default function MeusAlunos() {
  const { consultor, consultorId } = useConsultor();
  const [rows, setRows] = useState<AlunoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro('');
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId)));
        const lista: AlunoRow[] = snap.docs
          .map((d) => {
            const u = d.data() as any;
            return {
              uid: d.id,
              nome: u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : '—'),
              email: u.email || '',
              plano: u.plano || 'gratuito',
              tipo: u.tipoUsuario || 'aluno',
              acessou: !!u.primeiroAcessoEm,
            };
          })
          .filter((u) => u.tipo !== 'admin') // não lista o super-admin
          .sort((a, b) => a.nome.localeCompare(b.nome));
        if (ativo) setRows(lista);
      } catch (e: any) {
        if (ativo) setErro(e?.message || 'Erro ao carregar alunos.');
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [consultorId]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.nome.toLowerCase().includes(t) || r.email.toLowerCase().includes(t));
  }, [rows, busca]);

  const badge = (txt: string, cls: string) => (
    <span className={`text-[10px] font-black uppercase tracking-wide rounded px-2 py-0.5 ${cls}`}>{txt}</span>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Meus Alunos</h1>
      <p className="text-gray-500 text-sm mb-5">
        Pessoas do seu site (<b>{consultor.branding.nome}</b>) — {rows.length} no total.
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
            <div>Plano / papel</div>
            <div className="text-right">Acesso</div>
          </div>
          {filtrados.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum aluno encontrado.</div>
          )}
          {filtrados.map((r) => (
            <div key={r.uid} className="grid grid-cols-[1.4fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <div className="font-bold text-gray-800 text-sm truncate">{r.nome}</div>
                <div className="text-xs text-gray-400 truncate">{r.email}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.plano === 'completo'
                  ? badge('completo', 'bg-blue-50 text-blue-700')
                  : badge('gratuito', 'bg-gray-100 text-gray-500')}
                {r.tipo === 'coordenador' && badge('coordenador', 'bg-amber-50 text-amber-700')}
              </div>
              <div className="text-right">
                {r.acessou
                  ? <span className="text-xs font-bold text-emerald-600">● ativo</span>
                  : <span className="text-xs text-gray-400">não acessou</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
