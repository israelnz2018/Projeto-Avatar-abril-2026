/**
 * FormularioFormacao — a inscrição da apresentação ao vivo da Formação LBW.
 *
 * Curto de propósito: 4 campos. O tráfego vem do celular, e cada campo a mais
 * derruba a conversão. As perguntas de qualificação ficam para DEPOIS, antes da
 * conversa individual — aqui o objetivo é só reservar a vaga na apresentação.
 *
 * Não confundir com FormularioLead (13 campos), que é de outra oferta: a
 * plataforma para quem JÁ é consultor e JÁ tem curso gravado. Este aqui fala
 * com quem ainda vai se tornar consultor, então não pode ter a mesma trava de
 * "só entra quem já atua".
 */
import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const PAISES = [
  ['brasil', '🇧🇷 Brasil', '+55'],
  ['portugal', '🇵🇹 Portugal', '+351'],
  ['eua', '🇺🇸 EUA', '+1'],
  ['outro', '🌎 Outro', ''],
] as const;

interface Props {
  /** De onde veio a inscrição. Aparece na tela de aprovação do admin. */
  origem: string;
  /** Link da apresentação no nosso agendamento. Vazio = só registra o contato. */
  urlAgendamento?: string;
}

export default function FormularioFormacao({ origem, urlAgendamento = '' }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [ddi, setDdi] = useState('+55');
  const [pais, setPais] = useState('brasil');
  const [whatsapp, setWhatsapp] = useState('');
  const [momento, setMomento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const whatsappCompleto = `${ddi.trim()} ${whatsapp.trim()}`.trim();
  const whatsappDigits = whatsappCompleto.replace(/\D/g, '').length;
  const whatsappValido = !whatsapp.trim() || (
    /^\+\d{1,4}$/.test(ddi.trim()) && whatsappDigits >= 10 && whatsappDigits <= 15
  );
  const completo = Boolean(nome.trim() && emailValido && whatsappValido && momento);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (!completo || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const resposta = await fetch('/api/leads-formacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim() ? whatsappCompleto : '',
          momento,
          origem,
        }),
      });
      if (!resposta.ok) throw new Error('Não consegui registrar sua inscrição.');
      setEnviado(true);
      const pixel = (window as typeof window & { fbq?: (...args: unknown[]) => void }).fbq;
      if (typeof pixel === 'function') pixel('track', 'Lead', { content_name: 'formacao-consultores-lbw' });
    } catch (e: any) {
      setErro(e?.message || 'Não consegui enviar agora. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="formacao-form-ok" role="status">
        <CheckCircle2 size={30} aria-hidden="true" />
        <strong>{urlAgendamento ? 'Contato registrado. Escolha sua sessão.' : 'Recebemos seu interesse.'}</strong>
        <p>{urlAgendamento
          ? 'Seu lugar na apresentação será confirmado após você escolher um horário no calendário.'
          : 'Ainda não há uma data aberta para agendamento. A LBW usará o contato informado para avisar sobre a próxima apresentação.'}</p>
        {urlAgendamento && <a className="formacao-agenda-link" href={urlAgendamento} rel="noopener noreferrer">Escolher data e horário →</a>}
      </div>
    );
  }

  return (
    <form className="formacao-form" onSubmit={enviar}>
      <div>
        <label htmlFor="ff-nome">Nome completo</label>
        <input id="ff-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="name" required />
      </div>

      <div>
        <label htmlFor="ff-email">
          E-mail{emailValido && <span className="field-ok">✓</span>}
        </label>
        <input id="ff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" required />
      </div>

      <div>
        <label htmlFor="ff-whats">
          WhatsApp <span className="formacao-optional">(opcional)</span>
        </label>
        <div className="formacao-whats">
          <select
            aria-label="País"
            value={pais}
            onChange={(e) => {
              const escolhido = PAISES.find((p) => p[0] === e.target.value);
              setPais(e.target.value);
              if (escolhido && escolhido[2]) setDdi(escolhido[2]);
            }}
          >
            {PAISES.map(([id, nomePais]) => <option key={id} value={id}>{nomePais}</option>)}
          </select>
          <input aria-label="DDI" className="formacao-ddi" value={ddi} onChange={(e) => setDdi(e.target.value)} placeholder="+55" />
          <input id="ff-whats" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Número com DDD" autoComplete="tel" />
        </div>
        {!whatsappValido && <p className="formacao-form-erro">Confira o DDI e o número informado.</p>}
      </div>

      <div>
        <label htmlFor="ff-momento">Onde você está hoje?</label>
        <select id="ff-momento" value={momento} onChange={(e) => setMomento(e.target.value)} required>
          <option value="">Selecione…</option>
          <option value="clt_quer_comecar">Trabalho numa empresa e quero começar a atuar como consultor</option>
          <option value="ja_consultor">Já atuo como consultor e quero estruturar melhor</option>
          <option value="area_processos">Trabalho com processos, qualidade ou melhoria contínua</option>
          <option value="outra_area">Venho de outra área e quero migrar</option>
        </select>
      </div>

      {erro && <p className="formacao-form-erro">{erro}</p>}

      <button className="cta" type="submit" disabled={!completo || enviando}>
        {enviando ? 'Enviando…' : urlAgendamento ? 'Continuar para escolher a sessão →' : 'Quero receber a próxima data →'}
      </button>
      <p className="formacao-form-micro">
        Usaremos seus dados para falar sobre a apresentação. Leia a <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.
      </p>
    </form>
  );
}
