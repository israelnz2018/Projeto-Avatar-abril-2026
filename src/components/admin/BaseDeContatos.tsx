/**
 * BaseDeContatos — quem agendou uma reunião, com e-mail e telefone.
 *
 * POR QUE EXISTE: o relatório do Typebot (Submissions) mostra a CONVERSA — até
 * onde cada pessoa foi, o que respondeu. Mas as colunas de e-mail e telefone
 * ficam vazias, e isso não é defeito: a pessoa digita esses dados na tela de
 * agendamento, que é do Cal, não do bot. O bot entrega o calendário num quadro
 * e não enxerga o que acontece lá dentro.
 *
 * Esta tela mostra o outro lado — o do Cal — que chega até nós pelo webhook.
 * Juntas, as duas contam a história inteira: em cima quem agendou e como
 * falar com a pessoa; embaixo, no relatório do Typebot, o caminho que ela fez.
 *
 * O botão de baixar entrega um CSV pronto para Excel, porque esta base existe
 * para ser usada em WhatsApp e e-mail depois.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Users, Mail, Phone, Copy, Check, AlertTriangle } from 'lucide-react';
import { auth } from '../../lib/firebase';

type Contato = {
  uid: string;
  nome: string;
  email: string;
  telefone: string;
  titulo: string;
  inicio: string;
  status: string;
  criadoEm: string;
  enviados: string[];
};

function quando(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function BaseDeContatos() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [resumo, setResumo] = useState({ total: 0, comEmail: 0, comTelefone: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState('');

  const comToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Faça login novamente.');
    return { Authorization: `Bearer ${token}` };
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch('/api/agenda/contatos', { headers: await comToken() });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não consegui ler a base.');
      setContatos(j.contatos || []);
      setResumo({ total: j.total || 0, comEmail: j.comEmail || 0, comTelefone: j.comTelefone || 0 });
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar.');
    } finally {
      setCarregando(false);
    }
  }, [comToken]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function baixarCsv() {
    try {
      const r = await fetch('/api/agenda/contatos?formato=csv', { headers: await comToken() });
      if (!r.ok) throw new Error('Não consegui gerar o arquivo.');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contatos-agendamento.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao baixar.');
    }
  }

  /** Copia a coluna inteira: é o formato que se cola numa ferramenta de envio. */
  async function copiarColuna(campo: 'email' | 'telefone') {
    const valores = contatos.map((c) => c[campo]).filter(Boolean);
    if (!valores.length) { setErro(`Nenhum ${campo} na base ainda.`); return; }
    try {
      await navigator.clipboard.writeText(valores.join('\n'));
      setCopiado(campo);
      setTimeout(() => setCopiado(''), 1800);
    } catch {
      setErro('Não consegui copiar. Use o botão de baixar.');
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Quem agendou uma reunião</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            O e-mail e o telefone são digitados na tela de agendamento, que é do Cal —
            por isso não aparecem no relatório do chatbot, abaixo. Esta é a base para WhatsApp e e-mail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void carregar()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          <button
            onClick={() => void baixarCsv()}
            disabled={!contatos.length}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
          >
            <Download className="h-4 w-4" /> Baixar para Excel
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Cartao icone={<Users className="h-4 w-4" />} rotulo="Agendaram" valor={resumo.total} />
        <Cartao icone={<Mail className="h-4 w-4" />} rotulo="Com e-mail" valor={resumo.comEmail}
          acao={<BotaoCopiar ativo={copiado === 'email'} aoClicar={() => void copiarColuna('email')} />} />
        <Cartao icone={<Phone className="h-4 w-4" />} rotulo="Com telefone" valor={resumo.comTelefone}
          acao={<BotaoCopiar ativo={copiado === 'telefone'} aoClicar={() => void copiarColuna('telefone')} />} />
      </div>

      {erro && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}

      {carregando ? (
        <p className="mt-5 text-sm text-slate-500">Carregando…</p>
      ) : contatos.length === 0 ? (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-bold">Nenhum agendamento chegou aqui ainda.</p>
            <p className="mt-1">
              As reuniões existem no Cal, mas ele só avisa a plataforma se o webhook estiver ligado.
              No Cal: <strong>Settings → Developer → Webhooks → New</strong>, endereço{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">/api/agenda/webhook</code>,
              com os eventos de reserva criada, cancelada e reagendada.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-semibold">Nome</th>
                <th className="px-2 py-2 font-semibold">E-mail</th>
                <th className="px-2 py-2 font-semibold">Telefone</th>
                <th className="px-2 py-2 font-semibold">Reunião</th>
                <th className="px-2 py-2 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {contatos.map((c) => (
                <tr key={c.uid} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2 font-semibold text-slate-800">{c.nome || '—'}</td>
                  <td className="px-2 py-2 text-slate-700">
                    {c.email ? <a href={`mailto:${c.email}`} className="text-blue-700 hover:underline">{c.email}</a> : '—'}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {c.telefone
                      ? <a href={`https://wa.me/${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">{c.telefone}</a>
                      : '—'}
                  </td>
                  <td className="px-2 py-2 text-slate-600">{quando(c.inicio)}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                      c.status === 'cancelado' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {c.status === 'cancelado' ? 'cancelado' : 'confirmado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cartao({ icone, rotulo, valor, acao }: { icone: React.ReactNode; rotulo: string; valor: number; acao?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
      <span className="text-slate-500">{icone}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{rotulo}</p>
        <p className="text-xl font-bold text-slate-900">{valor}</p>
      </div>
      {acao}
    </div>
  );
}

function BotaoCopiar({ ativo, aoClicar }: { ativo: boolean; aoClicar: () => void }) {
  return (
    <button
      onClick={aoClicar}
      title="Copiar a coluna inteira"
      className="ml-1 rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
    >
      {ativo ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
