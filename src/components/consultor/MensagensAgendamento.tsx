/**
 * MensagensAgendamento — a régua de e-mails de quem agendou, editável.
 *
 * O servidor tem uma régua PADRÃO embutida, que é a recomendada. Quando o
 * consultor salva aqui, a régua dele passa a valer no lugar. "Voltar ao
 * recomendado" apaga a personalização e o padrão volta — por isso o padrão
 * pode melhorar com o tempo sem atropelar quem já escreveu o próprio texto.
 *
 * O horário é guardado em MINUTOS em relação ao início da reunião: negativo é
 * antes, positivo é depois, e "ao-agendar" sai na hora em que a pessoa marca.
 * Na tela isso vira "2 dias antes", "10 minutos antes" — ninguém precisa
 * pensar em números negativos.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Mail, Plus, Trash2, Save, RotateCcw, Send, ChevronUp, ChevronDown,
  AlertTriangle, Check, Clock,
} from 'lucide-react';
import { auth } from '../../lib/firebase';

type Mensagem = {
  chave: string;
  quando: 'ao-agendar' | number;
  assunto: string;
  corpo: string;
  ativo: boolean;
};

/** As opções de horário, da mais cedo para a mais tarde. */
const QUANDOS: Array<{ valor: 'ao-agendar' | number; nome: string }> = [
  { valor: 'ao-agendar', nome: 'Assim que a pessoa agendar' },
  { valor: -7 * 24 * 60, nome: '7 dias antes' },
  { valor: -3 * 24 * 60, nome: '3 dias antes' },
  { valor: -2 * 24 * 60, nome: '2 dias antes' },
  { valor: -24 * 60, nome: '1 dia antes' },
  { valor: -8 * 60, nome: 'Na manhã do dia (8h antes)' },
  { valor: -3 * 60, nome: '3 horas antes' },
  { valor: -60, nome: '1 hora antes' },
  { valor: -30, nome: '30 minutos antes' },
  { valor: -10, nome: '10 minutos antes' },
  { valor: 2 * 60, nome: '2 horas depois' },
  { valor: 24 * 60, nome: '1 dia depois' },
  { valor: 3 * 24 * 60, nome: '3 dias depois' },
  { valor: 7 * 24 * 60, nome: '7 dias depois' },
];

function nomeDoQuando(q: Mensagem['quando']) {
  const achado = QUANDOS.find((x) => x.valor === q);
  if (achado) return achado.nome;
  const min = Number(q);
  if (!Number.isFinite(min)) return 'Horário personalizado';
  const abs = Math.abs(min);
  const texto = abs >= 1440 ? `${Math.round(abs / 1440)} dia(s)` : abs >= 60 ? `${Math.round(abs / 60)} hora(s)` : `${abs} minuto(s)`;
  return min < 0 ? `${texto} antes` : `${texto} depois`;
}

const MARCAS = [
  ['{nome}', 'primeiro nome'],
  ['{nome_completo}', 'nome completo'],
  ['{quando}', 'data e hora da reunião'],
  ['{titulo}', 'nome da reunião'],
  ['{link}', 'link do Google Meet'],
  ['{link_planos}', 'página dos planos'],
];

export default function MensagensAgendamento() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [original, setOriginal] = useState('');
  const [personalizada, setPersonalizada] = useState(false);
  const [temResend, setTemResend] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);

  const mudou = JSON.stringify(mensagens) !== original;

  const comToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Faça login novamente.');
    return { Authorization: `Bearer ${token}` };
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch('/api/agenda/mensagens', { headers: await comToken() });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não consegui ler as mensagens.');
      setMensagens(j.mensagens || []);
      setOriginal(JSON.stringify(j.mensagens || []));
      setPersonalizada(Boolean(j.personalizada));
      setTemResend(j.resend !== false);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar.');
    } finally {
      setCarregando(false);
    }
  }, [comToken]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar() {
    setSalvando(true);
    setErro('');
    setAviso('');
    try {
      const r = await fetch('/api/agenda/mensagens', {
        method: 'PUT',
        headers: { ...(await comToken()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não consegui salvar.');
      setOriginal(JSON.stringify(mensagens));
      setPersonalizada(true);
      setAviso('Salvo. Os próximos agendamentos já usam estas mensagens.');
      setTimeout(() => setAviso(''), 4000);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function voltarAoPadrao() {
    if (!confirm('Isto apaga as suas mensagens e volta às recomendadas. Continuar?')) return;
    try {
      const r = await fetch('/api/agenda/mensagens', { method: 'DELETE', headers: await comToken() });
      if (!r.ok) throw new Error('Não consegui restaurar.');
      await carregar();
      setAviso('Voltou às mensagens recomendadas.');
      setTimeout(() => setAviso(''), 4000);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao restaurar.');
    }
  }

  async function enviarTeste(m: Mensagem) {
    setErro('');
    try {
      const r = await fetch('/api/agenda/mensagens/testar', {
        method: 'POST',
        headers: { ...(await comToken()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ assunto: m.assunto, corpo: m.corpo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não consegui enviar.');
      setAviso(`E-mail de teste enviado para ${j.enviadoPara}.`);
      setTimeout(() => setAviso(''), 5000);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao enviar o teste.');
    }
  }

  function alterar(i: number, campo: keyof Mensagem, valor: any) {
    setMensagens((lista) => lista.map((m, k) => (k === i ? { ...m, [campo]: valor } : m)));
  }

  function mover(i: number, direcao: -1 | 1) {
    const j = i + direcao;
    if (j < 0 || j >= mensagens.length) return;
    setMensagens((lista) => {
      const nova = [...lista];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });
  }

  function acrescentar() {
    const nova: Mensagem = {
      chave: `msg-${Date.now().toString(36)}`,
      quando: -24 * 60,
      assunto: 'Novo e-mail',
      corpo: '<p>Olá {nome},</p>\n<p>Escreva aqui a sua mensagem.</p>',
      ativo: true,
    };
    setMensagens((lista) => [...lista, nova]);
    setAberta(nova.chave);
  }

  function remover(i: number) {
    if (!confirm('Apagar esta mensagem?')) return;
    setMensagens((lista) => lista.filter((_, k) => k !== i));
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Mail className="h-6 w-6 text-blue-700" /> Mensagens do agendamento
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Os e-mails que saem sozinhos para quem marcou uma reunião com você. Edite o texto,
            mude a hora, acrescente ou apague — o que estiver aqui é o que será enviado.
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {personalizada ? 'Você está usando mensagens próprias.' : 'Você está usando as mensagens recomendadas.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={acrescentar}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Novo e-mail
          </button>
          {personalizada && (
            <button
              onClick={() => void voltarAoPadrao()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" /> Voltar ao recomendado
            </button>
          )}
          <button
            onClick={() => void salvar()}
            disabled={!mudou || salvando}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" /> {salvando ? 'Salvando…' : mudou ? 'Salvar' : 'Tudo salvo'}
          </button>
        </div>
      </div>

      {!temResend && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          O envio de e-mail não está configurado no servidor, então nada sai por enquanto.
          Você pode escrever as mensagens mesmo assim.
        </p>
      )}
      {erro && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{erro}</p>}
      {aviso && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Check className="h-4 w-4" /> {aviso}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <ul className="list-none space-y-3 p-0">
          {mensagens.map((m, i) => (
            <li key={m.chave} className={`rounded-xl border bg-white ${m.ativo ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">
                  <Clock className="h-3.5 w-3.5" /> {nomeDoQuando(m.quando)}
                </span>
                <button
                  onClick={() => setAberta(aberta === m.chave ? null : m.chave)}
                  className="flex-1 truncate text-left text-sm font-bold text-slate-800 hover:underline"
                >
                  {m.assunto || '(sem assunto)'}
                </button>

                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={m.ativo}
                    onChange={(e) => alterar(i, 'ativo', e.target.checked)}
                    className="h-4 w-4"
                  />
                  {m.ativo ? 'Ligado' : 'Desligado'}
                </label>

                <div className="flex gap-1">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} title="Subir"
                    className="rounded border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={i === mensagens.length - 1} title="Descer"
                    className="rounded border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remover(i)} title="Apagar"
                    className="rounded border border-slate-300 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {aberta === m.chave && (
                <div className="space-y-3 border-t border-slate-200 px-4 py-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Quando sai</label>
                    <select
                      value={String(m.quando)}
                      onChange={(e) => alterar(i, 'quando', e.target.value === 'ao-agendar' ? 'ao-agendar' : Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {QUANDOS.map((q) => <option key={String(q.valor)} value={String(q.valor)}>{q.nome}</option>)}
                      {!QUANDOS.some((q) => q.valor === m.quando) && (
                        <option value={String(m.quando)}>{nomeDoQuando(m.quando)}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Assunto</label>
                    <input
                      value={m.assunto}
                      onChange={(e) => alterar(i, 'assunto', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Texto do e-mail</label>
                    <textarea
                      value={m.corpo}
                      onChange={(e) => alterar(i, 'corpo', e.target.value)}
                      rows={11}
                      spellCheck
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Use <code className="rounded bg-slate-100 px-1">&lt;p&gt;…&lt;/p&gt;</code> para cada parágrafo.
                      As marcas abaixo são trocadas pelos dados de quem vai receber:
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {MARCAS.map(([marca, oque]) => (
                        <button
                          key={marca}
                          onClick={() => alterar(i, 'corpo', `${m.corpo}${marca}`)}
                          title={`Inserir — ${oque}`}
                          className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 hover:bg-slate-100"
                        >
                          {marca}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => void enviarTeste(m)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Send className="h-4 w-4" /> Enviar teste para mim
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
