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
import { CheckCircle2, MessageCircle } from 'lucide-react';

const PAISES = [
  ['brasil', '🇧🇷 Brasil', '+55'],
  ['portugal', '🇵🇹 Portugal', '+351'],
  ['eua', '🇺🇸 EUA', '+1'],
  ['outro', '🌎 Outro', ''],
] as const;

// Só dígitos, com código do país (ex.: 55119XXXXXXXX). wa.me não precisa de
// conta de API nem aprovação da Meta: é um link comum que abre o WhatsApp do
// visitante com uma mensagem pronta para ELE te mandar — diferente de um envio
// automático partindo de nós, que aí sim exigiria a API paga.
const WHATSAPP_ISRAEL = String(import.meta.env.VITE_WHATSAPP_ISRAEL || '').replace(/\D/g, '');

function linkWhatsapp(nome: string) {
  const primeiroNome = nome.trim().split(/\s+/)[0] || '';
  const mensagem = primeiroNome
    ? `Olá Israel! Sou ${primeiroNome} e acabei de reservar minha vaga na apresentação da Formação de Consultores LBW.`
    : 'Olá Israel! Acabei de reservar minha vaga na apresentação da Formação de Consultores LBW.';
  return `https://wa.me/${WHATSAPP_ISRAEL}?text=${encodeURIComponent(mensagem)}`;
}

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
    if (!urlAgendamento) {
      return (
        <div className="formacao-form-ok" role="status">
          <CheckCircle2 size={30} aria-hidden="true" />
          <strong>Recebemos seu interesse.</strong>
          <p>Ainda não há uma data aberta para agendamento. A LBW usará o contato informado para avisar sobre a próxima apresentação.</p>
          {Boolean(WHATSAPP_ISRAEL) && (
            <a className="formacao-whatsapp-cta" href={linkWhatsapp(nome)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} aria-hidden="true" /> Falar com Israel no WhatsApp
            </a>
          )}
        </div>
      );
    }
    // O calendário ENTRA NA PÁGINA, não manda o visitante embora: é o pedido —
    // escolher a data vendo os horários livres sem sair da landing.
    //
    // O Cal.diy esconde o próprio cabeçalho só numa ROTA própria, .../embed
    // (confirmado no código: apps/web/app/(booking-page-wrapper)/[user]/[type]/
    // embed/page.tsx — é essa rota, e não um parâmetro numa página comum, que
    // devolve a tela com isEmbed=true). urlAgendamento chega como o link
    // público do evento (".../israel/apresentacao"); aqui só entra o "/embed".
    const [base, queryExistente] = urlAgendamento.split('?');
    const urlEmbed = `${base.replace(/\/$/, '')}/embed`;
    const parametros = new URLSearchParams(queryExistente || '');
    parametros.set('embed', 'true');
    parametros.set('layout', 'month_view');
    if (nome.trim()) parametros.set('name', nome.trim());
    if (email.trim()) parametros.set('email', email.trim());
    const urlEmbutida = `${urlEmbed}?${parametros.toString()}`;
    return (
      <div className="formacao-form-ok formacao-form-ok-agenda" role="status">
        <strong>Escolha o dia e o horário da sua sessão.</strong>
        <p>Seu lugar na apresentação é confirmado ao escolher um horário abaixo.</p>
        {/* ALTURA: o quadro tem 820px (960 no celular) de propósito. O passo 2 do
            Cal — nome, e-mail, telefone, notas e o botão Confirmar — é alto. Com
            520px, como estava, o botão e a MENSAGEM DE ERRO ficavam fora da área
            visível: a pessoa clicava Confirmar, a validação reprovava um campo
            que ela não conseguia ver, e parecia que o sistema tinha travado.
            Diminuir esta altura traz o problema de volta. */}
        <div className="formacao-agenda-embed">
          <iframe
            key={urlEmbutida}
            src={urlEmbutida}
            title="Escolher data e horário da apresentação"
            loading="lazy"
          />
        </div>
        {/* Reserva: navegador com cookies/terceiros bloqueados não mostra o
            quadro acima. O link sempre funciona, então fica sempre visível,
            não só quando o quadro falha — não dá para detectar isso de fora. */}
        <a className="formacao-agenda-fallback" href={urlAgendamento} target="_blank" rel="noopener noreferrer">
          O calendário não carregou? Abra em uma nova aba →
        </a>
        {Boolean(WHATSAPP_ISRAEL) && (
          <a className="formacao-whatsapp-cta" href={linkWhatsapp(nome)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} aria-hidden="true" /> Prefere falar antes? Chame no WhatsApp
          </a>
        )}
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
