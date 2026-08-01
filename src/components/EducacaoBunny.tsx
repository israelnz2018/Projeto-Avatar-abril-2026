/**
 * EducacaoBunny — aba de TESTE do Bunny (só admin). NÃO afeta a Educação real.
 * Serve pra você (1) configurar/ver quais vídeos já migraram, e (2) ver como o
 * cliente vai ver: vídeo migrado toca pelo player do Bunny; não migrado, pelo
 * YouTube (fallback). Quando validar aqui, a gente promove pra Educação real.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { PlayCircle, CheckCircle2 } from 'lucide-react';
import { getAllKnowledge, type KnowledgeEntry } from '../services/knowledgeService';
import { resolveConsultorId } from '../services/consultorService';

const ytId = (url: string) => {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
};
const bunnyEmbed = (v: KnowledgeEntry) =>
  `https://iframe.mediadelivery.net/embed/${v.bunnyLibraryId}/${v.bunnyVideoId}?autoplay=false&preload=true`;
const ytEmbed = (v: KnowledgeEntry) => `https://www.youtube.com/embed/${ytId(v.sourceUrl)}?rel=0`;

export default function EducacaoBunny() {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [sel, setSel] = useState<KnowledgeEntry | null>(null);
  const [curso, setCurso] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllKnowledge(resolveConsultorId())
      .then((d) => setItems(d))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const cursos = useMemo(() => Array.from(new Set(items.map((i) => i.course).filter(Boolean))).sort(), [items]);
  const filtrados = useMemo(() => (curso ? items.filter((i) => i.course === curso) : items), [items, curso]);
  const migrados = items.filter((i) => i.bunnyVideoId).length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Educação — Teste Bunny</h1>
      <p className="text-gray-500 text-sm mb-2">
        Aba de teste (só admin). <b>Não afeta a Educação real.</b> Vídeo migrado toca pelo <b>Bunny</b>;
        os outros continuam no <b>YouTube</b> (fallback).
      </p>
      <div className="inline-flex items-center gap-2 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full mb-5">
        <CheckCircle2 size={14} /> {migrados} de {items.length} vídeos migrados pro Bunny
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
              key={sel.id}
              src={sel.bunnyVideoId ? bunnyEmbed(sel) : ytEmbed(sel)}
              title={sel.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? <div className="text-gray-500">Carregando…</div> : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {filtrados.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum vídeo.</div>}
          {filtrados.map((v) => (
            <button
              key={v.id}
              onClick={() => setSel(v)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 ${sel?.id === v.id ? 'bg-blue-50' : ''}`}
            >
              <PlayCircle size={18} className="text-gray-400 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{v.title}</span>
              <span className="text-[10px] text-gray-400 truncate max-w-[160px] hidden sm:block">{v.course}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${v.bunnyVideoId ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {v.bunnyVideoId ? 'Bunny' : 'YouTube'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
