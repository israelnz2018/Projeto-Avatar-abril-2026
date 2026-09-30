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
import React, { useState } from 'react';
import { CalendarClock, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';

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
