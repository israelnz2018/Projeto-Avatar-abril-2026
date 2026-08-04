/**
 * EducacaoBunny — aba de TESTE do Bunny (Israel-consultor). NÃO afeta a Educação real.
 * Serve pra (1) LIGAR um vídeo do curso a um vídeo já subido no Bunny (cola o GUID) e
 * (2) ver como o cliente vai ver: vídeo com GUID toca pelo player do Bunny; sem GUID,
 * pelo YouTube (fallback). Reversível — o sourceUrl do YouTube nunca é apagado.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { PlayCircle, CheckCircle2, Link2, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAllKnowledge, KNOWLEDGE_COLLECTION, type KnowledgeEntry } from '../services/knowledgeService';
import { resolveConsultorId } from '../services/consultorService';

const ytId = (url: string) => {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
};
const bunnyEmbed = (libId: string, guid: string) =>
  `https://iframe.mediadelivery.net/embed/${libId}/${guid}?autoplay=false&preload=true&captions=pt`;
const ytEmbed = (v: KnowledgeEntry) => `https://www.youtube.com/embed/${ytId(v.sourceUrl)}?rel=0`;

export default function EducacaoBunny() {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [sel, setSel] = useState<KnowledgeEntry | null>(null);
  const [curso, setCurso] = useState('');
  const [loading, setLoading] = useState(true);
  // Library ID do Bunny (default = a sua, 718588). Editável caso mude.
  const [libId, setLibId] = useState('718588');
  // input de GUID por vídeo + status de salvamento
  const [guidInput, setGuidInput] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = () => {
    setLoading(true);
    getAllKnowledge(resolveConsultorId())
      .then((d) => setItems(d))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); }, []);

  const cursos = useMemo(() => Array.from(new Set(items.map((i) => i.course).filter(Boolean))).sort(), [items]);
  const filtrados = useMemo(() => (curso ? items.filter((i) => i.course === curso) : items), [items, curso]);
  const migrados = items.filter((i) => i.bunnyVideoId).length;

  async function ligar(v: KnowledgeEntry) {
    const guid = (guidInput[v.id!] || '').trim();
    if (!guid || !v.id) return;
    setSalvando(v.id);
    try {
      await updateDoc(doc(db, KNOWLEDGE_COLLECTION, v.id), { bunnyVideoId: guid, bunnyLibraryId: libId.trim() });
      setItems((p) => p.map((x) => (x.id === v.id ? { ...x, bunnyVideoId: guid, bunnyLibraryId: libId.trim() } : x)));
      setGuidInput((p) => ({ ...p, [v.id!]: '' }));
    } catch (e) { console.error(e); }
    finally { setSalvando(null); }
  }
  async function desligar(v: KnowledgeEntry) {
    if (!v.id) return;
    setSalvando(v.id);
    try {
      // remove os campos do Bunny → volta pro YouTube. sourceUrl nunca foi tocado.
      await updateDoc(doc(db, KNOWLEDGE_COLLECTION, v.id), { bunnyVideoId: '', bunnyLibraryId: '' });
      setItems((p) => p.map((x) => (x.id === v.id ? { ...x, bunnyVideoId: '', bunnyLibraryId: '' } : x)));
    } catch (e) { console.error(e); }
    finally { setSalvando(null); }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Educação — Teste Bunny</h1>
      <p className="text-gray-500 text-sm mb-2">
        Aba de teste. <b>Não afeta a Educação real.</b> Cole o <b>GUID</b> de um vídeo já subido no Bunny
        pra ligar a um vídeo do curso — ele passa a tocar pelo <b>Bunny</b>. Sem GUID, continua no <b>YouTube</b>.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex items-center gap-2 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
          <CheckCircle2 size={14} /> {migrados} de {items.length} ligados ao Bunny
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Library ID:</span>
          <input value={libId} onChange={(e) => setLibId(e.target.value)} className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm" />
        </div>
      </div>

      {/* Filtro por curso */}
      <div className="mb-5">
        <select value={curso} onChange={(e) => setCurso(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os cursos</option>
          {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Player */}
      {sel && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${sel.bunnyVideoId ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {sel.bunnyVideoId ? 'Bunny' : 'YouTube'}
            </span>
            <span className="font-bold text-gray-800">{sel.title}</span>
          </div>
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-200 bg-black">
            <iframe
              key={(sel.bunnyVideoId || '') + sel.id}
              src={sel.bunnyVideoId ? bunnyEmbed(sel.bunnyLibraryId || libId, sel.bunnyVideoId) : ytEmbed(sel)}
              title={sel.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Lista + ligar/desligar */}
      {loading ? <div className="text-gray-500">Carregando…</div> : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {filtrados.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum vídeo.</div>}
          {filtrados.map((v) => (
            <div key={v.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${sel?.id === v.id ? 'bg-blue-50' : ''}`}>
              <button onClick={() => setSel(v)} className="flex items-center gap-3 flex-1 min-w-0 text-left" title="Tocar">
                <PlayCircle size={18} className="text-gray-400 shrink-0" />
                <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{v.title}</span>
              </button>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${v.bunnyVideoId ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {v.bunnyVideoId ? 'Bunny' : 'YouTube'}
              </span>
              {v.bunnyVideoId ? (
                <button onClick={() => desligar(v)} disabled={salvando === v.id} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 shrink-0 disabled:opacity-40" title="Desligar (volta pro YouTube)">
                  <X size={13} /> desligar
                </button>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    value={guidInput[v.id!] || ''}
                    onChange={(e) => setGuidInput((p) => ({ ...p, [v.id!]: e.target.value }))}
                    placeholder="colar GUID do Bunny"
                    className="w-44 border border-gray-300 rounded-lg px-2 py-1 text-xs"
                  />
                  <button onClick={() => ligar(v)} disabled={salvando === v.id || !(guidInput[v.id!] || '').trim()} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-40">
                    <Link2 size={13} /> ligar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
