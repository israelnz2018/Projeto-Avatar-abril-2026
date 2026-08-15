import React, { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useUserAccess } from '../hooks/useUserAccess';

type Lead = {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  funcao: string;
  whatsapp: string;
  atuaMelhoria: string;
  cursoOnline: string;
  cursoPretendido: string;
  clientesEmpresariais: string;
  empresasAtuacao: string;
  prazoConfiguracao: string;
  status: string;
  criadoEm?: string;
  consultorId?: string;
};

async function authedFetch(url: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 30);
const prazoLabel: Record<string, string> = { ate_7: 'Em até 7 dias', '8_15': 'De 8 a 15 dias', '16_30': 'De 16 a 30 dias', mais_30: 'Mais de 30 dias' };

export default function SolicitacoesConsultores() {
  const { isAdmin, loading } = useUserAccess();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [processando, setProcessando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await authedFetch('/api/leads-consultor');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as solicitações.');
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (error: any) {
      setMensagem(`❌ ${error?.message || 'Erro ao carregar as solicitações.'}`);
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { if (isAdmin) carregar(); }, [isAdmin, carregar]);
  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-bold">Acesso restrito ao administrador.</div>;

  const recusar = async (lead: Lead) => {
    if (!window.confirm(`Recusar a solicitação de ${lead.nome}?`)) return;
    setProcessando(lead.id); setMensagem('');
    try {
      const response = await authedFetch(`/api/leads-consultor/${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'recusado' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMensagem(`Solicitação de ${lead.nome} recusada.`); await carregar();
    } catch (error: any) { setMensagem(`❌ ${error?.message || 'Erro ao recusar.'}`); }
    finally { setProcessando(null); }
  };

  const aprovarECriar = async (lead: Lead) => {
    const consultorId = slugify(slug);
    if (!consultorId) { setMensagem('Informe o subdomínio antes de aprovar.'); return; }
    setProcessando(lead.id); setMensagem('');
    try {
      const ref = doc(db, 'consultores', consultorId);
      if ((await getDoc(ref)).exists()) throw new Error('Esse subdomínio já está em uso. Escolha outro.');
      const marca = lead.empresa || lead.nome;
      const partes = marca.trim().split(/\s+/).filter(Boolean);
      const sigla = (partes.length > 1 ? partes.slice(0, 3).map((p) => p[0]).join('') : (partes[0] || 'CON').slice(0, 3)).toUpperCase();
      await setDoc(ref, {
        id: consultorId, nome: marca, subdominio: consultorId, email: lead.email, ativo: true,
        criadoEm: new Date().toISOString(), programaConsultoresLBW: true,
        branding: { nome: marca, sigla, logoUrl: '', cores: { navy: '#334155', blue: '#64748B', light: '#F8FAFC', ink: '#1F2937', muted: '#94A3B8' } },
      });
      const convite = await authedFetch('/api/consultor/convidar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: lead.email, nome: lead.nome, consultorId }) });
      const conviteData = await convite.json();
      if (!convite.ok) throw new Error(conviteData.error || 'A plataforma foi criada, mas o convite falhou.');
      const aprovacao = await authedFetch(`/api/leads-consultor/${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'aprovado', consultorId, conviteEnviado: Boolean(conviteData.emailEnviado) }) });
      const aprovacaoData = await aprovacao.json();
      if (!aprovacao.ok) throw new Error(aprovacaoData.error || 'O convite foi enviado, mas não foi possível registrar a aprovação.');
      setAbrindo(null); setMensagem(`✅ ${lead.nome} foi aprovado. Plataforma ${consultorId}.educacaopelotrabalho.com criada${conviteData.emailEnviado ? ' e convite enviado.' : ', mas confirme o envio do e-mail.'}`); await carregar();
    } catch (error: any) { setMensagem(`❌ ${error?.message || 'Erro ao aprovar.'}`); }
    finally { setProcessando(null); }
  };

  const pendentes = leads.filter((lead) => lead.status === 'aguardando_aprovacao');
  const historico = leads.filter((lead) => lead.status !== 'aguardando_aprovacao');
  const Card = ({ lead }: { lead: Lead }) => <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
    <div className="flex flex-wrap items-start gap-3 justify-between"><div><h2 className="font-black text-gray-900 m-0">{lead.nome}</h2><p className="text-sm text-gray-500 m-0">{lead.email} · {lead.whatsapp}</p><p className="text-sm text-gray-500 m-0">{lead.empresa} · {lead.funcao}</p></div><span className="text-xs font-black uppercase rounded-full px-3 py-1 bg-amber-50 text-amber-700">{lead.status.replaceAll('_', ' ')}</span></div>
    <div className="grid md:grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><b>Curso pretendido</b><br />{lead.cursoPretendido}</div><div className="rounded-xl bg-slate-50 p-3"><b>Prazo de configuração</b><br />{prazoLabel[lead.prazoConfiguracao] || lead.prazoConfiguracao}</div><div className="rounded-xl bg-slate-50 p-3 md:col-span-2"><b>Empresas e áreas</b><br />{lead.empresasAtuacao}</div></div>
    {lead.status === 'aguardando_aprovacao' && <>{abrindo === lead.id ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><label className="block text-xs font-black uppercase text-blue-800 mb-1">Subdomínio da plataforma</label><div className="flex flex-wrap items-center gap-2"><input value={slug} onChange={(e) => setSlug(e.target.value)} className="border border-blue-300 rounded-lg px-3 py-2 text-sm" placeholder="nome-do-consultor" /><span className="text-sm text-blue-800">.educacaopelotrabalho.com</span><button onClick={() => aprovarECriar(lead)} disabled={processando === lead.id} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">{processando === lead.id ? 'Criando…' : 'Aprovar e criar acesso'}</button><button onClick={() => setAbrindo(null)} className="px-3 py-2 text-sm font-bold text-gray-600">Cancelar</button></div></div> : <div className="flex flex-wrap gap-3"><button onClick={() => { setAbrindo(lead.id); setSlug(slugify(lead.empresa || lead.nome)); }} disabled={processando === lead.id} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">Aprovar</button><button onClick={() => recusar(lead)} disabled={processando === lead.id} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-sm disabled:opacity-50">Recusar</button></div>}</>}
  </div>;

  return <div className="max-w-5xl mx-auto"><h1 className="text-2xl font-black text-gray-900 mb-1">Solicitações de Consultores</h1><p className="text-gray-500 mb-6">Avalie as respostas, defina o subdomínio e aprove apenas quem fará parte do Programa de Consultores LBW — Educação pelo Trabalho.</p>{mensagem && <div className="mb-5 rounded-xl bg-slate-100 border border-slate-200 p-3 text-sm">{mensagem}</div>}<h2 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-3">Aguardando aprovação ({pendentes.length})</h2>{carregando ? <div className="text-gray-500">Carregando…</div> : <div className="space-y-4">{pendentes.length ? pendentes.map((lead) => <Card key={lead.id} lead={lead} />) : <div className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500">Nenhuma solicitação aguardando aprovação.</div>}</div>}{historico.length > 0 && <><h2 className="text-sm font-black uppercase tracking-wide text-gray-400 mt-8 mb-3">Histórico ({historico.length})</h2><div className="space-y-3">{historico.map((lead) => <Card key={lead.id} lead={lead} />)}</div></>}</div>;
}
