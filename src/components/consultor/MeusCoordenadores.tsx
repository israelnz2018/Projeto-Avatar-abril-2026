/**
 * MeusCoordenadores — o consultor vê os coordenadores do MUNDO DELE e o tamanho
 * dos times de cada um. READ-ONLY por enquanto: criar/convidar coordenador é
 * provisionamento (será desenhado à parte). Escopo por consultorId.
 * Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';

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
  const [rows, setRows] = useState<CoordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
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
        if (ativo) setRows(lista);
      } catch (e: any) {
        if (ativo) setErro(e?.message || 'Erro ao carregar coordenadores.');
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [consultorId]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Meus Coordenadores</h1>
      <p className="text-gray-500 text-sm mb-6">
        Coordenadores do seu mundo (<b>{consultor.branding.nome}</b>) e o time de cada um.
      </p>

      {loading && <div className="text-gray-500">Carregando…</div>}
      {erro && <div className="text-red-600 font-bold">❌ {erro}</div>}

      {!loading && !erro && rows.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
          Você ainda não tem coordenadores. (Convidar coordenador chega quando desenharmos o provisionamento.)
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

      {!loading && rows.length > 0 && (
        <p className="text-xs text-gray-400 mt-6">
          Somente leitura por enquanto. Convidar/gerenciar coordenador entra depois de definirmos o provisionamento.
        </p>
      )}
    </div>
  );
}
