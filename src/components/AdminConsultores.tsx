/**
 * AdminConsultores — console do super-admin (LBW) pra CRIAR/listar consultores (tenants).
 * Só admin, no hub (app.). Cria o doc consultores/{id} com a marca dele.
 * Não cria usuário (isso é do n8n) — só o tenant/marca. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserAccess } from '../hooks/useUserAccess';
import { CONSULTOR_PADRAO } from '../services/consultorService';
import { Consultor } from '../types';

export default function AdminConsultores() {
  const { isAdmin, loading } = useUserAccess();
  const [lista, setLista] = useState<Consultor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [id, setId] = useState('');
  const [nome, setNome] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  const carregar = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, 'consultores'));
      setLista(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch { /* ignora */ }
    finally { setCarregando(false); }
  };
  useEffect(() => { carregar(); }, []);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-bold">Acesso restrito ao administrador.</div>;

  const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

  async function criar() {
    const cid = slug(id);
    if (!cid) { setMsg('Informe o subdomínio (ex.: joao).'); return; }
    setSalvando(true);
    setMsg('');
    try {
      await setDoc(doc(db, 'consultores', cid), {
        id: cid,
        nome: nome.trim() || cid,
        subdominio: cid,
        ativo: true,
        criadoEm: new Date().toISOString(),
        branding: {
          nome: nome.trim() || cid,
          logoUrl: logoUrl.trim() || CONSULTOR_PADRAO.branding.logoUrl,
          cores: CONSULTOR_PADRAO.branding.cores,
        },
      }, { merge: true });
      setMsg(`✅ Consultor "${cid}" criado → ${cid}.educacaopelotrabalho.com`);
      setId(''); setNome(''); setLogoUrl('');
      carregar();
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-xs font-black uppercase tracking-wide text-gray-500 mb-1';

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Consultores (admin)</h1>
      <p className="text-gray-500 text-sm mb-6">Crie e liste os consultores da plataforma. Cria só o tenant/marca — não cria usuário.</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <h2 className="font-black text-gray-800 mb-4">Novo consultor</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Subdomínio (id)</label>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="joao" className={campo} />
            <div className="text-xs text-gray-400 mt-1">{slug(id) || '…'}.educacaopelotrabalho.com</div>
          </div>
          <div>
            <label className={label}>Nome / marca</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva Consultoria" className={campo} />
          </div>
        </div>
        <div className="mt-4">
          <label className={label}>URL do logo</label>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo-joao.png (vazio = logo LBW)" className={campo} />
        </div>
        <div className="flex items-center gap-4 mt-5">
          <button onClick={criar} disabled={salvando} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
            {salvando ? 'Criando…' : 'Criar consultor'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>

      <h2 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-3">Consultores ({lista.length})</h2>
      {carregando ? (
        <div className="text-gray-400">Carregando…</div>
      ) : (
        <div className="grid gap-3">
          {lista.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              {c.branding?.logoUrl && <img src={c.branding.logoUrl} alt={c.nome} className="h-9 w-9 object-contain rounded bg-gray-50 p-1 border border-gray-100" />}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-800 truncate">{c.nome}</div>
                <a href={`https://${c.subdominio || c.id}.educacaopelotrabalho.com`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate">
                  {c.subdominio || c.id}.educacaopelotrabalho.com
                </a>
              </div>
              {c.ativo === false && <span className="text-[10px] font-black uppercase text-gray-400">inativo</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
