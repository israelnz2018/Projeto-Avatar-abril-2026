/**
 * MinhaVitrine — o consultor edita a própria "prateleira" pública.
 * Salva em consultores/{consultorId}.vitrine (doc público). Aparece na Vitrine
 * (pra consultores e empresas externas). Nunca guarda dado sensível.
 * Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { ConsultorVitrine } from '../../types';

export default function MinhaVitrine() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, loading } = useUserAccess();
  const [v, setV] = useState<ConsultorVitrine>({});
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setV(consultor.vitrine || {});
  }, [consultor.vitrine]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-bold">Só o consultor edita a vitrine.</div>;

  const set = (patch: Partial<ConsultorVitrine>) => setV((prev) => ({ ...prev, ...patch }));

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
        Sua prateleira pública — vista por outros consultores e por empresas que procuram um especialista.
        Não coloque dados de clientes aqui.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={!!v.publicada} onChange={(e) => set({ publicada: e.target.checked })} className="w-5 h-5 accent-blue-600" />
          <span className="text-sm font-bold text-gray-800">Publicar na vitrine</span>
          <span className="text-xs text-gray-400">(se desligado, ninguém te vê na vitrine)</span>
        </label>

        <div>
          <label className={label}>Especialidade / área</label>
          <input value={v.especialidade || ''} onChange={(e) => set({ especialidade: e.target.value })} placeholder="Ex.: Lean e melhoria de processos na indústria" className={campo} />
        </div>

        <div>
          <label className={label}>Descrição (o que você oferece)</label>
          <textarea value={v.descricao || ''} onChange={(e) => set({ descricao: e.target.value })} rows={4} placeholder="Uma apresentação curta do seu trabalho e dos seus cursos." className={campo} />
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

        <div>
          <label className={label}>Site</label>
          <input value={v.site || ''} onChange={(e) => set({ site: e.target.value })} placeholder="https://…" className={campo} />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button onClick={salvar} disabled={salvando} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
            {salvando ? 'Salvando…' : 'Salvar vitrine'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
