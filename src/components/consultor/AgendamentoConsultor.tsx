/**
 * Agendamento (beta) — o Cal.diy hospedado no nosso Railway, dentro da plataforma.
 *
 * O Cal.diy é um sistema completo e independente: tem o próprio login e o próprio
 * banco. Esta aba mostra ele num quadro, então cada consultor entra com a conta
 * que criou lá — não é o mesmo login da plataforma.
 *
 * O endereço vem de VITE_AGENDAMENTO_URL. Sem essa variável a aba explica o que
 * falta, em vez de mostrar um quadro branco ou quebrar a tela.
 *
 * Ver INSTALAR-AGENDAMENTO-RAILWAY.md, na raiz do projeto "Empresa de Gestão LBW".
 */
import React, { useEffect, useState } from 'react';
import { CalendarClock, ExternalLink, AlertTriangle, RefreshCw, Clock3 } from 'lucide-react';

const URL_AGENDAMENTO = String(import.meta.env.VITE_AGENDAMENTO_URL || '').trim();

/**
 * As telas do sistema de agendamento que o consultor realmente usa.
 *
 * O menu de lá tem bem mais coisa (equipes, apps, admin); estes atalhos levam
 * direto ao que interessa, para ninguém se perder.
 */
type TelaId = 'eventos' | 'reservas' | 'horarios' | 'calendarios';
const TELAS: Record<TelaId, { nome: string; caminho: string; dica: string }> = {
  eventos: {
    nome: 'Meus eventos',
    caminho: '/event-types',
    dica: 'Cada evento é um tipo de encontro que as pessoas podem marcar com você. '
      + 'Para uma turma (várias pessoas no mesmo horário): abra o evento → aba Avançado → ligue "Oferecer vagas" e diga quantas.',
  },
  reservas: {
    nome: 'Agendamentos',
    caminho: '/bookings/upcoming',
    dica: 'Quem já marcou com você, e o que está por vir.',
  },
  horarios: {
    nome: 'Meus horários',
    caminho: '/availability',
    dica: 'Os dias e horas em que você aceita ser agendado.',
  },
  calendarios: {
    nome: 'Calendários',
    caminho: '/settings/my-account/calendars',
    dica: 'Conecte o Google Agenda aqui. Se a tela do Google não abrir, use "Abrir fora" — '
      + 'o Google recusa fazer login dentro de um quadro.',
  },
};

export default function AgendamentoConsultor() {
  // Recarregar o quadro sem recarregar a plataforma inteira: trocar a chave do
  // iframe faz o navegador montar de novo, e é o que resolve a maioria dos
  // "travou depois de conectar o Google Agenda".
  const [tentativa, setTentativa] = useState(0);
  const [tela, setTela] = useState<TelaId>('eventos');

  if (!URL_AGENDAMENTO) {
    return (
      <div className="p-6 max-w-3xl">
        <Cabecalho />
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-bold">Falta configurar o endereço do agendamento.</p>
            <p className="mt-1">
              O sistema ainda não foi instalado, ou falta a variável{' '}
              <code className="px-1 py-0.5 rounded bg-amber-100 font-mono text-xs">VITE_AGENDAMENTO_URL</code>{' '}
              na plataforma, no Railway.
            </p>
            <p className="mt-2">
              O passo a passo está no arquivo <strong>INSTALAR-AGENDAMENTO-RAILWAY.md</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const url = `${URL_AGENDAMENTO.replace(/\/$/, '')}${TELAS[tela].caminho}`;

  return (
    <div className="p-6">
      <Cabecalho />

      <RelogioFusos />

      {/* ATALHOS PARA AS TELAS QUE IMPORTAM.
          O menu do próprio sistema tem muita coisa que não usamos; estes botões
          levam direto ao que o consultor precisa, sem ele se perder lá dentro. */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {(Object.keys(TELAS) as TelaId[]).map((id) => (
          <button
            key={id}
            onClick={() => setTela(id)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
              tela === id
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {TELAS[id].nome}
          </button>
        ))}
        <span className="flex-1" />
        <button
          onClick={() => setTentativa((n) => n + 1)}
          title="Recarregar"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Recarregar
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir fora
        </a>
      </div>

      <p className="text-xs text-gray-500 mb-3">{TELAS[tela].dica}</p>

      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        <iframe
          key={`${tela}-${tentativa}`}
          src={url}
          title="Agendamento"
          className="w-full"
          style={{ height: 'calc(100vh - 300px)', minHeight: 520 }}
          allow="camera; microphone; clipboard-write"
        />
      </div>
    </div>
  );
}

type ZonaHorario = {
  id: 'auckland' | 'saoPaulo';
  nome: string;
  cidade: string;
  fuso: string;
  timeZone: string;
  cor: string;
};

const ZONAS_HORARIO: ZonaHorario[] = [
  {
    id: 'auckland',
    nome: 'Nova Zelândia',
    cidade: 'Auckland',
    fuso: 'Pacific/Auckland',
    timeZone: 'Pacific/Auckland',
    cor: 'border-blue-200 bg-blue-50',
  },
  {
    id: 'saoPaulo',
    nome: 'Brasil',
    cidade: 'São Paulo',
    fuso: 'America/Sao_Paulo',
    timeZone: 'America/Sao_Paulo',
    cor: 'border-emerald-200 bg-emerald-50',
  },
];

function RelogioFusos() {
  const [agora, setAgora] = useState(() => new Date());
  const [mostrarAmbos, setMostrarAmbos] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatarHora = (zona: string) => new Intl.DateTimeFormat('pt-BR', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(agora);

  const formatarData = (zona: string) => new Intl.DateTimeFormat('pt-BR', {
    timeZone: zona,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(agora);

  const formatarOffset = (zona: string) => {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
    }).formatToParts(agora);
    return partes.find((parte) => parte.type === 'timeZoneName')?.value || '';
  };

  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" aria-label="Horários de referência">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-gray-900">Horários de referência</h2>
            <p className="text-xs text-gray-500">Os horários acompanham automaticamente o horário de verão.</p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
          <span>Mostrar os dois horários</span>
          <button
            type="button"
            role="switch"
            aria-checked={mostrarAmbos}
            aria-label="Mostrar os horários da Nova Zelândia e do Brasil"
            onClick={() => setMostrarAmbos((valor) => !valor)}
            className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              mostrarAmbos ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              mostrarAmbos ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {ZONAS_HORARIO.filter((zona) => mostrarAmbos || zona.id === 'auckland').map((zona) => (
          <div key={zona.id} className={`rounded-lg border px-4 py-3 ${zona.cor}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{zona.nome}</p>
                <p className="text-sm font-medium text-gray-700">{zona.cidade}</p>
              </div>
              <span className="rounded bg-white/70 px-2 py-1 text-xs font-semibold text-gray-600">{formatarOffset(zona.fuso)}</span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{formatarHora(zona.timeZone)}</p>
            <p className="text-xs capitalize text-gray-500">{formatarData(zona.timeZone)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Cabecalho() {
  return (
    <header className="mb-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <CalendarClock className="w-6 h-6 text-blue-600" />
        Agendamento
        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold align-middle">beta</span>
      </h1>
      <p className="text-sm text-gray-600 mt-1">
Sua agenda de sessões e reuniões. Cada consultor tem a própria conta e os próprios horários.
      </p>
    </header>
  );
}
