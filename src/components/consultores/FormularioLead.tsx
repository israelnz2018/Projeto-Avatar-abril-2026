/**
 * FormularioLead — o formulário de solicitação do Programa de Consultores.
 *
 * Extraído da LandingConsultores para ser usado nos dois lugares sem duplicar
 * regra: a landing pública (/consultores) e a aba do aluno (/seja-consultor).
 * Os dois postam no MESMO endpoint (/api/leads-consultor) e caem na MESMA tela
 * de aprovação do admin. O que muda é o campo `origem`, que diz de onde veio o
 * lead — quem chega pela aba já está dentro da plataforma.
 *
 * As 7 perguntas de qualificação são as mesmas nos dois lugares: são elas que
 * alimentam a decisão do admin, então não variam por origem.
 */
import React, { useState } from 'react';

interface Props {
  /** De onde veio o lead. Aparece na tela de aprovação do admin. */
  origem: string;
  /** Pré-preenchimento — na aba do aluno já sabemos quem é quem. */
  nomeInicial?: string;
  emailInicial?: string;
  textoBotao?: string;
  /** Linha pequena embaixo do botão. */
  micro?: string;
  /** Texto do aviso quando o perfil ainda não é o do programa. */
  textoNaoQualificado?: string;
}

const NAO_QUALIFICADO_PADRAO =
  'Neste momento, o programa é voltado a quem já atua como consultor de excelência operacional, '
  + 'melhoria contínua, melhoria de processos ou áreas relacionadas, já possui curso online pronto '
  + 'e já atende ou está buscando empresas como clientes.';

export default function FormularioLead({
  origem,
  nomeInicial = '',
  emailInicial = '',
  textoBotao = 'Enviar solicitação →',
  micro = 'Sem mensalidade inicial.',
  textoNaoQualificado = NAO_QUALIFICADO_PADRAO,
}: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [cidadeEstado, setCidadeEstado] = useState('');
  const [email, setEmail] = useState(emailInicial);
  const [empresa, setEmpresa] = useState('');
  const [funcao, setFuncao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paisWhatsapp, setPaisWhatsapp] = useState('brasil');
  const [ddiWhatsapp, setDdiWhatsapp] = useState('+55');
  const [atuaMelhoria, setAtuaMelhoria] = useState('');
  const [clientesEmpresariais, setClientesEmpresariais] = useState('');
  const [cursoOnline, setCursoOnline] = useState('');
  const [cursoPretendido, setCursoPretendido] = useState('');
  const [empresasAtuacao, setEmpresasAtuacao] = useState('');
  const [prazoConfiguracao, setPrazoConfiguracao] = useState('');
  const [subdominioPretendido, setSubdominioPretendido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [qualificado, setQualificado] = useState(false);
  const [erro, setErro] = useState('');

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const whatsappCompleto = `${ddiWhatsapp.trim()} ${whatsapp.trim()}`.trim();
  const whatsappValido = /^\+\d{1,4}$/.test(ddiWhatsapp.trim()) && (() => {
    const digitos = whatsappCompleto.replace(/\D/g, '').length;
    return digitos >= 8 && digitos <= 15;
  })();
  const formularioCompleto = Boolean(
    nome.trim() && cidadeEstado.trim() && emailValido && empresa.trim() && funcao.trim() && whatsappValido
    && atuaMelhoria && cursoOnline && cursoPretendido.trim() && clientesEmpresariais && empresasAtuacao.trim() && prazoConfiguracao
    && /^[a-z0-9][a-z0-9-]{2,30}$/.test(subdominioPretendido),
  );

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro('');
    if (!formularioCompleto) {
      setErro('Preencha todos os campos.');
      return;
    }
    setEnviando(true);
    try {
      const response = await fetch('/api/leads-consultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, cidadeEstado, email, empresa, funcao, whatsapp: whatsappCompleto,
          atuaMelhoria, clientesEmpresariais, cursoOnline, cursoPretendido,
          empresasAtuacao, prazoConfiguracao, subdominioPretendido, origem,
        }),
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setQualificado(Boolean(result.qualificado));
      setEnviado(true);
    } catch {
      setErro('Não consegui enviar agora. Tente novamente em instantes.');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="success">
        {qualificado ? (
          <>
            <h3>Sua solicitação foi recebida.</h3>
            <p>Vou analisar suas respostas pessoalmente e você receberá um retorno por e-mail em até 48 horas.</p>
          </>
        ) : (
          <>
            <h3>Obrigado pelo interesse.</h3>
            <div className="not-qualified">{textoNaoQualificado}</div>
          </>
        )}
      </div>
    );
  }

  return (
    <form className="leadform" onSubmit={enviar}>
      <div><label>Nome completo</label><input value={nome} onChange={event => setNome(event.target.value)} placeholder="[Seu nome completo]" /></div>
      <div><label>Cidade / Estado</label><input value={cidadeEstado} onChange={event => setCidadeEstado(event.target.value)} placeholder="Ex.: São Paulo, SP" /></div>
      <div><label>E-mail{emailValido && <span className="field-ok">✓ válido</span>}</label><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@empresa.com" /></div>
      <div><label>Empresa / Consultoria</label><input value={empresa} onChange={event => setEmpresa(event.target.value)} placeholder="[Nome da sua empresa ou consultoria]" /></div>
      <div><label>Função</label><input value={funcao} onChange={event => setFuncao(event.target.value)} placeholder="[Sua função]" /></div>
      <div>
        <label>WhatsApp{whatsappValido && <span className="field-ok">✓ válido</span>}</label>
        <div className="grid grid-cols-[150px_1fr] gap-2">
          <select
            value={paisWhatsapp}
            onChange={event => {
              const valor = event.target.value;
              setPaisWhatsapp(valor);
              setDdiWhatsapp(valor === 'brasil' ? '+55' : valor === 'nova_zelandia' ? '+64' : '+351');
            }}
          >
            <option value="brasil">Brasil (+55)</option>
            <option value="nova_zelandia">Nova Zelândia (+64)</option>
            <option value="portugal">Portugal (+351)</option>
          </select>
          <input inputMode="tel" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} placeholder="Número do WhatsApp" />
        </div>
      </div>

      <div className="qualification">
        <h3 className="qualification-title">Sua solicitação</h3>
        <p className="qualification-note">As respostas ajudam a avaliar se o programa faz sentido para o seu momento profissional.</p>
        <div><label>1. Você atua como consultor de excelência operacional, melhoria contínua, melhoria de processos ou área relacionada?</label><select value={atuaMelhoria} onChange={event => setAtuaMelhoria(event.target.value)}><option value="">Selecione...</option><option value="ja_atuo">Sim, atuo em uma dessas áreas</option><option value="nao">Não</option></select></div>
        <div><label>2. Você já possui as videoaulas do seu curso gravadas e prontas para publicar?</label><select value={cursoOnline} onChange={event => setCursoOnline(event.target.value)}><option value="">Selecione...</option><option value="ja_tenho">Sim, estão prontas para publicar</option><option value="desenvolvendo">Ainda estou desenvolvendo</option><option value="nao_tenho">Não tenho</option></select></div>
        <div><label>3. Qual é o nome do curso que você pretende cadastrar e qual é a carga horária aproximada?</label><input value={cursoPretendido} onChange={event => setCursoPretendido(event.target.value)} placeholder="Ex.: Gestão de processos — aproximadamente 12 horas" /></div>
        <div><label>4. Você já atende empresas ou está buscando empresas clientes neste momento?</label><select value={clientesEmpresariais} onChange={event => setClientesEmpresariais(event.target.value)}><option value="">Selecione...</option><option value="ja_atendo">Já atendo empresas</option><option value="estou_buscando">Estou buscando empresas clientes</option><option value="nao">Não</option></select></div>
        <div><label>5. Quais empresas você atende ou pretende atender e qual é a área de atuação delas?</label><textarea value={empresasAtuacao} onChange={event => setEmpresasAtuacao(event.target.value)} placeholder="Se houver confidencialidade, informe apenas os segmentos." /></div>
        <div><label>6. Em quanto tempo você pretende concluir a configuração inicial: marca, curso com vídeos, certificado e, se necessário, teste de avaliação?</label><select value={prazoConfiguracao} onChange={event => setPrazoConfiguracao(event.target.value)}><option value="">Selecione...</option><option value="ate_7">Em até 7 dias</option><option value="8_15">De 8 a 15 dias</option><option value="16_30">De 16 a 30 dias</option><option value="mais_30">Mais de 30 dias</option></select></div>
        <div>
          <label>7. Que nome você gostaria de colocar no endereço da sua plataforma?</label>
          <p className="qualification-note">Por exemplo: Israel escolheu <b>israel.educacaopelotrabalho.com</b>. Você pode usar seu nome ou o nome da sua empresa.</p>
          <div className="domain-field">
            <input
              value={subdominioPretendido}
              onChange={event => setSubdominioPretendido(event.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '').slice(0, 31))}
              placeholder="seu-nome-ou-empresa"
              aria-label="Nome desejado para o endereço da plataforma"
            />
            <span className="domain-suffix">.educacaopelotrabalho.com</span>
          </div>
          {subdominioPretendido && !/^[a-z0-9][a-z0-9-]{2,30}$/.test(subdominioPretendido) && <p className="qualification-note">Use de 3 a 31 letras, números ou hífen.</p>}
        </div>
      </div>

      {erro && <div className="error">{erro}</div>}
      <button className="cta" type="submit" disabled={enviando || !formularioCompleto}>{enviando ? 'Enviando...' : textoBotao}</button>
      <p className="micro">{micro}</p>
    </form>
  );
}
