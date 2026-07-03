/**
 * OpinioesAdminView — aba "Opiniões dos Clientes" (só admin).
 *
 * Mostra ABSOLUTAMENTE TUDO: cada depoimento com nome, e-mail, trilha, notas 1-5
 * de cada item, média, comentário e se autorizou divulgação. No topo, um resumo
 * com médias por item (satisfação geral). Filtros por trilha e por "autorizou divulgar".
 */

import { useEffect, useMemo, useState } from 'react';
import { Star, MessageSquareQuote, Megaphone, Filter, Download } from 'lucide-react';
import { getTodasOpinioes, type Opiniao } from '../services/opiniaoService';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

export default function OpinioesAdminView() {
  const [opinioes, setOpinioes] = useState<Opiniao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTrilha, setFiltroTrilha] = useState<number | 'todas'>('todas');
  const [soAutorizados, setSoAutorizados] = useState(false);

  useEffect(() => {
    getTodasOpinioes()
      .then(setOpinioes)
      .catch((e) => console.error('[OpinioesAdmin]', e))
      .finally(() => setLoading(false));
  }, []);

  const filtradas = useMemo(() => {
    return opinioes.filter((o) => {
      if (filtroTrilha !== 'todas' && o.trilha !== filtroTrilha) return false;
      if (soAutorizados && !o.autorizaDivulgacao) return false;
      return true;
    });
  }, [opinioes, filtroTrilha, soAutorizados]);

  // Médias por item (do conjunto filtrado).
  const mediasPorItem = useMemo(() => {
    const acc: Record<string, { soma: number; n: number }> = {};
    for (const o of filtradas) {
      for (const nt of o.notas || []) {
        if (!acc[nt.item]) acc[nt.item] = { soma: 0, n: 0 };
        acc[nt.item].soma += nt.nota; acc[nt.item].n += 1;
      }
    }
    return Object.entries(acc).map(([item, { soma, n }]) => ({ item, media: n ? soma / n : 0, n }));
  }, [filtradas]);

  const mediaGeral = useMemo(() => {
    if (!filtradas.length) return 0;
    const s = filtradas.reduce((acc, o) => acc + (o.mediaNota || 0), 0);
    return s / filtradas.length;
  }, [filtradas]);

  const trilhasDisponiveis = useMemo(
    () => Array.from(new Set(opinioes.map((o) => o.trilha))).sort((a, b) => a - b),
    [opinioes]
  );

  const exportCSV = () => {
    const rows = [['Data', 'Nome', 'Email', 'Trilha', 'Média', 'Autoriza', 'Comentário',
      ...(filtradas[0]?.notas || []).map((n) => n.item)]];
    for (const o of filtradas) {
      rows.push([
        new Date(o.criadoEm).toLocaleDateString('pt-BR'),
        o.alunoNome, o.alunoEmail, String(o.trilha), String(o.mediaNota),
        o.autorizaDivulgacao ? 'Sim' : 'Não', (o.comentario || '').replace(/[\n;]/g, ' '),
        ...(o.notas || []).map((n) => String(n.nota)),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'opinioes-clientes.csv';
    a.click();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MessageSquareQuote size={28} style={{ color: LBW.blue }} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opiniões dos Clientes</h1>
            <p className="text-gray-500 text-sm">Todos os depoimentos e notas dos alunos.</p>
          </div>
        </div>
        <button onClick={exportCSV} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold flex items-center gap-2">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 text-center">Carregando…</div>
      ) : opinioes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-400">
          Nenhuma opinião registrada ainda. Elas aparecem aqui quando os alunos fazem as avaliações.
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
              <div className="text-4xl font-black" style={{ color: LBW.blue }}>{mediaGeral.toFixed(1)}</div>
              <div className="flex justify-center my-1"><Stars value={mediaGeral} /></div>
              <div className="text-xs text-gray-500 uppercase font-bold">Satisfação geral</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
              <div className="text-4xl font-black text-gray-800">{filtradas.length}</div>
              <div className="text-xs text-gray-500 uppercase font-bold mt-2">Depoimentos</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
              <div className="text-4xl font-black text-emerald-600">{filtradas.filter((o) => o.autorizaDivulgacao).length}</div>
              <div className="text-xs text-gray-500 uppercase font-bold mt-2">Autorizaram divulgar</div>
            </div>
          </div>

          {/* Médias por item */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
            <h2 className="font-bold text-gray-800 mb-3">Média por item avaliado</h2>
            <div className="space-y-2">
              {mediasPorItem.map((m) => (
                <div key={m.item} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 flex-1">{m.item}</span>
                  <div className="w-40 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(m.media / 5) * 100}%`, background: LBW.blue }} />
                  </div>
                  <span className="text-sm font-bold w-10 text-right" style={{ color: LBW.navy }}>{m.media.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Filter size={16} className="text-gray-400" />
            <select value={filtroTrilha} onChange={(e) => setFiltroTrilha(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="todas">Todas as trilhas</option>
              {trilhasDisponiveis.map((t) => <option key={t} value={t}>Trilha {t}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={soAutorizados} onChange={(e) => setSoAutorizados(e.target.checked)}
                className="w-4 h-4" style={{ accentColor: LBW.blue }} />
              <Megaphone size={14} /> Só quem autorizou divulgação
            </label>
          </div>

          {/* Lista de depoimentos */}
          <div className="space-y-3">
            {filtradas.map((o) => (
              <div key={o.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <p className="font-bold text-gray-900">{o.alunoNome}
                      <span className="text-xs font-normal text-gray-400 ml-2">{o.alunoEmail}</span>
                    </p>
                    <p className="text-xs text-gray-400">Trilha {o.trilha} · {o.trilhaTitulo} · {new Date(o.criadoEm).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={o.mediaNota} />
                    <span className="text-sm font-bold" style={{ color: LBW.navy }}>{o.mediaNota.toFixed(1)}</span>
                    {o.autorizaDivulgacao && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <Megaphone size={11} /> pode divulgar
                      </span>
                    )}
                  </div>
                </div>

                {/* Notas por item */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 my-3">
                  {(o.notas || []).map((nt) => (
                    <div key={nt.item} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 truncate">{nt.item}</span>
                      <Stars value={nt.nota} size={14} />
                    </div>
                  ))}
                </div>

                {o.comentario && (
                  <blockquote className="mt-3 pl-3 border-l-4 text-sm text-gray-700 italic" style={{ borderColor: LBW.blue }}>
                    "{o.comentario}"
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
      ))}
    </span>
  );
}
