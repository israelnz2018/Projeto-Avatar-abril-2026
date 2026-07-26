/**
 * MinhaVitrine — o consultor escolhe QUAIS dos seus cursos aparecem na vitrine
 * (vista por outros consultores e empresas externas). Também define publicar,
 * especialidade, descrição e contato. Salva em consultores/{id}.vitrine (público).
 * Nunca guarda dado de cliente/aluno. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { ConsultorVitrine } from '../../types';

interface CursoResumo { nome: string; videos: number; }

export default function MinhaVitrine() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, loading } = useUserAccess();
  const [v, setV] = useState<ConsultorVitrine>({});
  const [cursos, setCursos] = useState<CursoResumo[]>([]);
  const [carregandoCursos, setCarregandoCursos] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { setV(consultor.vitrine || {}); }, [consultor.vitrine]);

  // Carrega TODOS os cursos do consultor (do knowledge_base dele).
  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregandoCursos(true);
      try {
        const snap = await getDocs(query(collection(db, 'knowledge_base'), where('consultorId', '==', consultorId)));
        const mapa: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const nome = ((d.data() as any).course || 'Sem curso').trim() || 'Sem curso';
          mapa[nome] = (mapa[nome] || 0) + 1;
        });
        const lista = Object.entries(mapa).map(([nome, videos]) => ({ nome, videos })).sort((a, b) => b.videos - a.videos);
        if (ativo) setCursos(lista);
      } catch { /* ignora */ }
      finally { if (ativo) setCarregandoCursos(false); }
    })();
    return () => { ativo = false; };
  }, [consultorId]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-bold">Só o consultor edita a vitrine.</div>;

  const set = (patch: Partial<ConsultorVitrine>) => setV((prev) => ({ ...prev, ...patch }));
  const visiveis = v.cursosVisiveis || [];
  const toggleCurso = (nome: string) => {
    set({ cursosVisiveis: visiveis.includes(nome) ? visiveis.filter((c) => c !== nome) : [...visiveis, nome] });
  };

  async function salvar() {
    setSalvando(true);
    setMsg('');
    try {
      await setDoc(doc(db, 'consultores', consultorId), { vitrine: v }, { merge: true });
      await refresh();
      setMsg('✅ Vitrine salva.');
    } catch (e: any) {
      setMsg('❌ Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-xs font-black uppercase tracking-wide text-gray-500 mb-1';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Minha Vitrine</h1>
      <p className="text-gray-500 text-sm mb-6">
        Marque quais dos seus cursos ficam visíveis pra outros consultores e empresas. Não coloque dados de clientes aqui.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={!!v.publicada} onChange={(e) => set({ publicada: e.target.checked })} className="w-5 h-5 accent-blue-600" />
          <span className="text-sm font-bold text-gray-800">Publicar na vitrine</span>
          <span className="text-xs text-gray-400">(se desligado, ninguém te vê)</span>
        </label>

        {/* CURSOS — o centro da vitrine */}
        <div>
          <label className={label}>Seus cursos — marque os que aparecem na vitrine</label>
          {carregandoCursos ? (
            <div className="text-sm text-gray-400 py-2">Carregando cursos…</div>
          ) : cursos.length === 0 ? (
            <div className="text-sm text-gray-400 py-2">Você ainda não tem cursos. Adicione em "Meus Cursos".</div>
          ) : (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
              {cursos.map((c) => (
                <label key={c.nome} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={visiveis.includes(c.nome)} onChange={() => toggleCurso(c.nome)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm font-bold text-gray-800 flex-1 min-w-0 truncate">{c.nome}</span>
                  <span className="text-xs text-gray-400 shrink-0">{c.videos} vídeos</span>
                </label>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-2">{visiveis.length} de {cursos.length} cursos na vitrine</div>
        </div>

        <div>
          <label className={label}>Especialidade / área</label>
          <input value={v.especialidade || ''} onChange={(e) => set({ especialidade: e.target.value })} placeholder="Ex.: Lean e melhoria de processos na indústria" className={campo} />
        </div>

        <div>
          <label className={label}>Descrição (o que você oferece)</label>
          <textarea value={v.descricao || ''} onChange={(e) => set({ descricao: e.target.value })} rows={3} placeholder="Uma apresentação curta do seu trabalho." className={campo} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>E-mail de contato</label>
            <input value={v.contatoEmail || ''} onChange={(e) => set({ contatoEmail: e.target.value })} placeholder="voce@dominio.com" className={campo} />
          </div>
          <div>
            <label className={label}>WhatsApp</label>
            <input value={v.contatoWhatsapp || ''} onChange={(e) => set({ contatoWhatsapp: e.target.value })} placeholder="+55 …" className={campo} />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button onClick={salvar} disabled={salvando} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
            {salvando ? 'Salvando…' : 'Salvar vitrine'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
