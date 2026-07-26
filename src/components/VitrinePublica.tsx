/**
 * VitrinePublica — a "prateleira" pública de consultores.
 * Lista os consultores com vitrine.publicada = true. Vista por empresas externas
 * (rota pública) e por consultores (aba no app). Só mostra a vitrine — nunca
 * dado de cliente/aluno. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Consultor } from '../types';

export default function VitrinePublica() {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'consultores'), where('vitrine.publicada', '==', true)));
        const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Consultor[];
        if (ativo) setConsultores(lista.filter((c) => c.ativo !== false));
      } catch {
        // Regras ainda não publicadas ou sem permissão → vitrine vazia (sem erro pro visitante).
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Vitrine de Consultores</div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">Encontre o especialista certo</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Consultores de melhoria de processos que usam a plataforma para desenvolver equipes e gerar resultado medível.
          </p>
        </div>

        {loading && <div className="text-center text-gray-400">Carregando…</div>}

        {!loading && consultores.length === 0 && (
          <div className="text-center text-gray-400 bg-white border border-gray-200 rounded-2xl p-10">
            Nenhum consultor publicado ainda.
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {consultores.map((c) => {
            const v = c.vitrine || {};
            const site = `https://${c.subdominio || c.id}.educacaopelotrabalho.com`;
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  {c.branding?.logoUrl && (
                    <img src={c.branding.logoUrl} alt={c.nome} className="h-10 w-10 object-contain rounded bg-gray-50 p-1 border border-gray-100" />
                  )}
                  <div className="min-w-0">
                    <div className="font-black text-gray-800 truncate">{c.branding?.nome || c.nome}</div>
                    {v.especialidade && <div className="text-xs text-blue-600 font-bold truncate">{v.especialidade}</div>}
                  </div>
                </div>
                {v.descricao && <p className="text-sm text-gray-600 mb-3">{v.descricao}</p>}
                {Array.isArray(v.cursosVisiveis) && v.cursosVisiveis.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4 flex-1 content-start">
                    {v.cursosVisiveis.map((curso) => (
                      <span key={curso} className="text-[11px] font-bold text-blue-700 bg-blue-50 rounded px-2 py-1">{curso}</span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <a href={site} target="_blank" rel="noopener noreferrer" className="font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 no-underline">
                    Visitar site →
                  </a>
                  {v.contatoEmail && <a href={`mailto:${v.contatoEmail}`} className="text-gray-500 hover:text-gray-800">E-mail</a>}
                  {v.contatoWhatsapp && <a href={`https://wa.me/${v.contatoWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800">WhatsApp</a>}
                  {v.site && <a href={v.site} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800">Site próprio</a>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
