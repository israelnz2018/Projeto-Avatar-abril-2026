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
  const [email, setEmail] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState<Record<string, 'checando' | 'live' | 'pendente'>>({});

  // Checa se o subdomínio já está no ar (DNS + SSL). Cross-origin → usa no-cors:
  // resolve = o servidor respondeu (validado); rejeita = ainda não configurado.
  const checarSubdominio = async (sub: string) => {
    setStatus((s) => ({ ...s, [sub]: 'checando' }));
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      await fetch(`https://${sub}.educacaopelotrabalho.com/api/health`, { mode: 'no-cors', signal: ctrl.signal });
      clearTimeout(t);
      setStatus((s) => ({ ...s, [sub]: 'live' }));
    } catch {
      setStatus((s) => ({ ...s, [sub]: 'pendente' }));
    }
  };

  const carregar = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, 'consultores'));
      const l = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Consultor[];
      setLista(l);
      l.forEach((c) => checarSubdominio(c.subdominio || c.id));
    } catch { /* ignora */ }
    finally { setCarregando(false); }
  };
  useEffect(() => { carregar(); }, []);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-bold">Acesso restrito ao administrador.</div>;

  const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

  async function criar() {
    const cid = slug(id);
    const mail = email.trim().toLowerCase();
    if (!cid) { setMsg('Informe o subdomínio (ex.: joao).'); return; }
    if (!mail) { setMsg('Informe o e-mail do consultor.'); return; }
    setSalvando(true);
    setMsg('');
    try {
      await setDoc(doc(db, 'consultores', cid), {
        id: cid,
        nome: nome.trim() || cid,
        subdominio: cid,
        email: mail,
        ativo: true,
        criadoEm: new Date().toISOString(),
        branding: {
          nome: nome.trim() || cid,
          // Logo o próprio consultor põe em "Minha Marca". Placeholder até lá.
          logoUrl: CONSULTOR_PADRAO.branding.logoUrl,
          cores: CONSULTOR_PADRAO.branding.cores,
        },
      }, { merge: true });
      setMsg(`✅ Cadastro criado. Falta o subdomínio (Railway + Hostinger) — a lista abaixo mostra "Validado" quando ficar no ar.`);
      setId(''); setNome(''); setEmail('');
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
        <div className="mb-4">
          <label className={label}>E-mail do consultor</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="consultor@email.com" className={campo} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Nome / marca do site</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva Consultoria" className={campo} />
          </div>
          <div>
            <label className={label}>Subdomínio (id)</label>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="joao" className={campo} />
            <div className="text-xs text-gray-400 mt-1">{slug(id) || '…'}.educacaopelotrabalho.com</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">O logo e as cores o próprio consultor coloca em "Minha Marca", no site dele.</p>
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
          {lista.map((c) => {
            const sub = c.subdominio || c.id;
            const st = status[sub] || 'checando';
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-800 truncate">{c.nome}</div>
                    <a href={`https://${sub}.educacaopelotrabalho.com`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate block">
                      {sub}.educacaopelotrabalho.com
                    </a>
                    {(c as any).email && <div className="text-xs text-gray-400 truncate">{(c as any).email}</div>}
                  </div>
                  {st === 'live' ? (
                    <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 shrink-0">✓ Validado</span>
                  ) : st === 'checando' ? (
                    <span className="text-[11px] font-black uppercase text-gray-400 shrink-0">checando…</span>
                  ) : (
                    <span className="text-[11px] font-black uppercase text-amber-700 bg-amber-50 rounded-full px-3 py-1 shrink-0">⏳ Pendente</span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-emerald-700"><span>✓</span> Cadastro criado (e-mail, nome, subdomínio)</div>
                  {st === 'live' ? (
                    <div className="flex items-center gap-2 text-emerald-700"><span>✓</span> Subdomínio no ar (DNS + SSL)</div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700"><span>⏳</span> Subdomínio — falta criar o CNAME no Railway + Hostinger</div>
                  )}
                </div>
                <button onClick={() => checarSubdominio(sub)} className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800">
                  Revalidar subdomínio
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
