/**
 * LandingInstitucional — páginas institucionais públicas (rodapé das landings).
 * Uma página por rota: /quem-somos, /contato, /pacotes-corporativos,
 * /termos, /privacidade. Servidas SEM login (bypass no App.tsx).
 *
 * Visual escuro NAVY, alinhado às landings. Conteúdo é rascunho editável —
 * Termos e Privacidade trazem aviso de "minuta, revisar com um advogado".
 */
import React from 'react';

const CSS = `
.li{--ink:#070A18;--line:rgba(255,255,255,.10);--txt:rgba(255,255,255,.74);--txt2:rgba(255,255,255,.5)}
.li *{margin:0;padding:0;box-sizing:border-box}
.li{background:var(--ink);color:#fff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column}
.li h1,.li h2,.li h3{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em;line-height:1.1}
.li .top{border-bottom:1px solid var(--line);background:#05070F}
.li .topwrap{max-width:880px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between}
.li .logo{font-family:'Space Grotesk';font-weight:800;font-size:17px;color:#fff;text-decoration:none}
.li .back{font-size:13px;color:#9FC0FF;text-decoration:none;font-weight:600}
.li .hero{padding:54px 20px 26px;text-align:center;background:radial-gradient(ellipse 70% 60% at 50% 0%,rgba(0,51,204,.16),transparent 60%)}
.li .hero .eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#9FC0FF;background:rgba(159,192,255,.08);border:1px solid rgba(159,192,255,.22);padding:8px 16px;border-radius:999px;margin-bottom:16px}
.li .hero h1{font-size:36px;font-weight:800}
.li .body{flex:1;max-width:760px;margin:0 auto;padding:14px 20px 60px;width:100%}
.li .body h2{font-size:22px;font-weight:700;margin:30px 0 12px;color:#fff}
.li .body p,.li .body li{font-size:15.5px;color:var(--txt);line-height:1.7;margin-bottom:14px}
.li .body ul{padding-left:22px;margin-bottom:14px}
.li .body a{color:#9FC0FF}
.li .note{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:14px 18px;font-size:13.5px;color:#fcd9a0;margin-bottom:24px}
.li .card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:16px}
.li .btn{display:inline-block;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;cursor:pointer;border:none;background:linear-gradient(120deg,#0033CC,#2563EB);color:#fff;margin-top:8px}
.li .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.li .fld{display:flex;flex-direction:column}
.li .fld label{font-size:12.5px;font-weight:700;color:rgba(255,255,255,.85);margin-bottom:6px}
.li .fld input,.li .fld textarea{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.06);color:#fff;font-size:14px;outline:none;font-family:inherit;resize:vertical}
.li .fld input:focus,.li .fld textarea:focus{border-color:rgba(159,192,255,.6)}
.li .supgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.li .supopt{display:flex;gap:9px;align-items:flex-start;padding:11px 13px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.03);cursor:pointer;font-size:13px;color:var(--txt);transition:border-color .15s,background .15s}
.li .supopt.on{border-color:rgba(159,192,255,.6);background:rgba(0,51,204,.12)}
.li .supopt input{margin-top:2px;width:15px;height:15px;flex-shrink:0;accent-color:#2563EB;cursor:pointer}
.li .supopt strong{color:#fff;font-weight:600}
.li .supopt em{font-style:normal;color:var(--txt2)}
@media(max-width:560px){ .li .fgrid,.li .supgrid{grid-template-columns:1fr} }
.li .foot{background:#05070F;border-top:1px solid var(--line);padding:28px 20px;text-align:center;font-size:12px;color:var(--txt2);line-height:1.7}
.li .foot a{color:#9FC0FF;text-decoration:none}
@media(max-width:560px){ .li .hero h1{font-size:28px} }
`;

const HOJE = 'junho de 2026';

function Quem() {
  return (
    <>
      <p>A <strong>Learning by Working — Educação pelo Trabalho</strong> nasceu de uma constatação simples: ninguém aprende a resolver problema de verdade só assistindo aula. Aprende fazendo.</p>
      <p>Somos uma plataforma de educação corporativa aplicada que une vídeo-aulas, ferramentas que executam o trabalho com você e um mentor digital baseado na experiência real do nosso fundador, Israel Souza — mais de 20 anos resolvendo problemas em multinacionais de bebida, automotiva, petroquímica, equipamentos médicos e setor público.</p>
      <h2>Missão</h2>
      <p>Formar profissionais capazes de resolver problemas e entregar resultados tangíveis com rapidez — da adaptação a uma área nova até se tornarem especialistas em gerenciamento de projetos de melhoria, aprendendo na prática.</p>
      <h2>Visão</h2>
      <p>Ser a referência em educação aplicada para quem quer evoluir na carreira técnica e em gestão — formando, por uma jornada completa e prática, especialistas em gerenciamento de projetos de melhoria.</p>
      <h2>Valores</h2>
      <ul>
        <li><strong>Prática acima da teoria</strong> — ensinamos o que funciona no mundo real e já foi aplicado.</li>
        <li><strong>Resultado de verdade</strong> — o que importa é o que o profissional entrega, não o certificado na parede.</li>
        <li><strong>Simplicidade</strong> — método claro e ferramentas que executam com você, sem jargão.</li>
        <li><strong>Transparência</strong> — sem romantismo ou faz de conta no mundo corporativo.</li>
        <li><strong>Evolução contínua</strong> — cada trilha acrescenta uma camada, até o ápice de especialista em gerenciamento de projetos de melhoria.</li>
      </ul>
      <h2>Como fazemos</h2>
      <ul>
        <li>Trilhas práticas que se complementam — da adaptação a uma área nova até o nível de especialista em gerenciamento de projetos de melhoria.</li>
        <li>Ferramentas (SIPOC, RACI, Ishikawa, análise de dados e muito mais) que se preenchem com o seu projeto real.</li>
        <li>O Mentor Israel digital, que responde com base nos vídeos do próprio Israel.</li>
      </ul>
      <a className="btn" href="/trilhagratis">Comece grátis →</a>
    </>
  );
}

function Contato() {
  return (
    <>
      <p>Tem uma dúvida, quer falar sobre a formação ou precisa de suporte? Fale com a gente.</p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>E-mail</h2>
        <p style={{ marginBottom: 0 }}><a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a></p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>LinkedIn</h2>
        <p style={{ marginBottom: 0 }}><a href="https://www.linkedin.com/in/israel-cavalcanti-de-souza-mbb-pmp-mba-9244a320/" target="_blank" rel="noopener noreferrer">Israel Cavalcanti de Souza</a></p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Empresa</h2>
        <p style={{ marginBottom: 0 }}>Learning by Working — Sole Trader · NZBN: 9429047241657<br/>Hillsborough — Auckland, Nova Zelândia</p>
      </div>
    </>
  );
}

const SUPORTE_OPCOES = [
  { id: 'videoaulas', label: 'Vídeo-aulas', hint: 'biblioteca de aulas práticas por ferramenta' },
  { id: 'agente-israel', label: 'Agente Israel Digital', hint: 'mentor que responde com base nos vídeos do próprio Israel' },
  { id: 'email', label: 'Suporte por e-mail', hint: '' },
  { id: 'whatsapp', label: 'Suporte por WhatsApp', hint: '' },
  { id: 'videoconferencia', label: 'Videoconferência', hint: 'encontros ao vivo online' },
  { id: 'presencial', label: 'Presencial', hint: 'treinamento na sua empresa' },
];

function Pacotes() {
  const [form, setForm] = React.useState({ nome: '', funcao: '', empresa: '', site: '', qtdTreinandos: '', detalhes: '' });
  const [suporte, setSuporte] = React.useState<string[]>([]);
  const [estado, setEstado] = React.useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle');
  const [erro, setErro] = React.useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSuporte = (id: string) =>
    setSuporte((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const enviar = async () => {
    if (form.nome.trim().length < 2 || form.empresa.trim().length < 2) {
      setEstado('erro'); setErro('Informe pelo menos seu nome e a empresa.'); return;
    }
    setEstado('enviando'); setErro('');
    try {
      const labels = suporte.map((id) => SUPORTE_OPCOES.find((o) => o.id === id)?.label || id);
      const r = await fetch('/api/lead-corporativo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, suporte: labels }),
      });
      if (r.ok) setEstado('ok');
      else { const d = await r.json().catch(() => ({})); setEstado('erro'); setErro(d?.error || 'Erro ao enviar.'); }
    } catch { setEstado('erro'); setErro('Erro de conexão. Tente novamente.'); }
  };

  if (estado === 'ok') {
    return (
      <>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
          <h2 style={{ marginTop: 0 }}>Recebemos seu contato!</h2>
          <p style={{ marginBottom: 0 }}>Em breve a equipe LBW vai falar com você para montar uma proposta sob medida para a sua empresa.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <p>Quer levar a formação para a sua equipe? A LBW oferece condições especiais para empresas que querem capacitar times inteiros em projetos de melhoria, análise de dados e gestão.</p>
      <h2>O que está incluído</h2>
      <ul>
        <li>Acesso completo às trilhas para cada colaborador — da adaptação a uma área nova até o nível de especialista em gerenciamento de projetos de melhoria.</li>
        <li>Painel do coordenador para acompanhar o progresso da equipe.</li>
        <li>Gestão de quantos alunos quiser, conforme o pacote contratado.</li>
        <li>Mentor Israel digital e todas as ferramentas da plataforma.</li>
      </ul>
      <h2>Para quem é</h2>
      <p>Áreas de qualidade, melhoria contínua, operações, RH e qualquer time que precise resolver problemas e mostrar resultado com método.</p>

      <h2>Solicite uma proposta</h2>
      <p>Preencha os dados abaixo e a gente entra em contato para montar a melhor solução para a sua empresa.</p>
      <div className="card">
        <div className="fgrid">
          <div className="fld"><label>Seu nome</label><input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo" /></div>
          <div className="fld"><label>Sua função na empresa</label><input value={form.funcao} onChange={(e) => set('funcao', e.target.value)} placeholder="Ex: Gerente de Qualidade" /></div>
          <div className="fld"><label>Empresa</label><input value={form.empresa} onChange={(e) => set('empresa', e.target.value)} placeholder="Nome da empresa" /></div>
          <div className="fld"><label>Site da empresa</label><input value={form.site} onChange={(e) => set('site', e.target.value)} placeholder="www.suaempresa.com" /></div>
          <div className="fld" style={{ gridColumn: '1 / -1' }}><label>Quantos funcionários receberão o treinamento?</label><input value={form.qtdTreinandos} onChange={(e) => set('qtdTreinandos', e.target.value)} placeholder="Ex: 25" /></div>
        </div>

        <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#fff', margin: '20px 0 10px' }}>Que tipo de suporte você espera da LBW? <span style={{ fontWeight: 400, color: 'var(--txt2)' }}>(pode escolher mais de um)</span></label>
        <div className="supgrid">
          {SUPORTE_OPCOES.map((o) => {
            const on = suporte.includes(o.id);
            return (
              <label key={o.id} className={'supopt' + (on ? ' on' : '')}>
                <input type="checkbox" checked={on} onChange={() => toggleSuporte(o.id)} />
                <span><strong>{o.label}</strong>{o.hint ? <em> — {o.hint}</em> : null}</span>
              </label>
            );
          })}
        </div>

        <div className="fld" style={{ marginTop: 16 }}>
          <label>Conte mais (opcional)</label>
          <textarea value={form.detalhes} onChange={(e) => set('detalhes', e.target.value)} rows={3} placeholder="Conte um pouco sobre a necessidade da sua equipe." />
        </div>

        {erro && <p style={{ color: '#fca5a5', fontSize: 13.5, marginTop: 12 }}>{erro}</p>}
        <button className="btn" onClick={enviar} disabled={estado === 'enviando'} style={{ marginTop: 16, width: '100%' }}>
          {estado === 'enviando' ? 'Enviando…' : 'Solicitar proposta corporativa →'}
        </button>
      </div>
    </>
  );
}

function Termos() {
  return (
    <>
      <p>Última atualização: {HOJE}.</p>

      <h2>1. Definições</h2>
      <ul>
        <li><strong>Conteúdo:</strong> todo material disponibilizado na Plataforma, tais como videoaulas, materiais de apoio, textos, artigos, apostilas, avaliações, atividades, simulados, entre outros.</li>
        <li><strong>Contrato:</strong> o "Contrato de Prestação de Serviços Educacionais Learning by Working", que regula a prestação de serviços educacionais da Learning by Working ao Aluno, com vistas à realização do Curso escolhido.</li>
        <li><strong>Eventos:</strong> palestras, debates e diversos outros eventos educacionais, gravados ou ao vivo, disponibilizados na Plataforma.</li>
        <li><strong>Professores:</strong> profissionais contratados e/ou convidados pela Learning by Working para ministrar os Cursos e Eventos.</li>
        <li><strong>Termos de Uso:</strong> regras contidas neste instrumento que regulam os termos e condições de uso da Plataforma.</li>
        <li><strong>Aluno:</strong> Usuário que está realizando Curso(s) da Learning by Working.</li>
        <li><strong>Usuário(s):</strong> pessoas que acessam a plataforma Learning by Working, com o objetivo de adquirir ou não algum produto ou serviço.</li>
      </ul>

      <h2>2. Objeto</h2>
      <p>2.1. Estes Termos de Uso visam regular a utilização da Plataforma pelo Usuário, conforme estipulado nos itens a seguir.</p>

      <h2>3. Aceitação</h2>
      <p>3.1. A aceitação destes Termos de Uso e da Política de Privacidade pelo Usuário se dará no ato do seu clique no botão "Aceitar" ao se cadastrar ou quando faz a navegação e a utilização da Plataforma.</p>
      <p>3.2. Caso o Usuário não concorde com os presentes Termos de Uso, recomendamos que não prossiga com o cadastramento na Plataforma, bem como que se abstenha de acessá-la e utilizá-la.</p>
      <p>3.3. No acesso, navegação, cadastro e/ou utilização da Plataforma, aplicam-se as disposições constantes na Política de Privacidade e Política de Proteção aos Direitos Autorais, conjuntamente com estes Termos de Uso.</p>
      <p>3.4. Ao acessar e se cadastrar na Plataforma, o Usuário atesta ser civilmente capaz para compreender, aceitar e cumprir estes Termos de Uso, a Política de Privacidade, a Política de Proteção aos Direitos Autorais e o Contrato.</p>
      <p>3.5. Caso reste alguma dúvida, após a leitura destes Termos de Uso, entre em contato conosco através do site www.learningbyworking.com, aba "Fale Conosco", ou através do e-mail <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>.</p>

      <h2>4. Plataforma</h2>
      <p>4.1. O Usuário é o único responsável pelas informações por ele fornecidas quando de seu cadastro na Plataforma, estando ciente de que a Learning by Working não se responsabiliza por informações incorretas ou inverídicas apresentadas pelo Usuário, o qual será responsável, também, por manter atualizadas todas as informações pessoais e de contato fornecidas, especialmente seu correio eletrônico (e-mail) e telefone.</p>
      <p>4.2. O Usuário reconhece que, caso seja constatado que este forneceu informações incorretas ou inverídicas em seu cadastro, seu acesso à Plataforma poderá ser cancelado, independentemente de qualquer formalidade, sem que nada seja devido pela Learning by Working, em razão de tal cancelamento.</p>
      <p>4.3. O Usuário está ciente de que o mero cadastro na Plataforma não fornecerá acesso aos Cursos da Learning by Working, os quais só serão disponibilizados ao Aluno após comprovação de pagamento, conforme pormenorizado no Contrato.</p>
      <p>4.4. Com a aquisição do Curso, o Usuário receberá o status de Aluno e lhe será permitido acessar as videoaulas, ao vivo ou previamente gravadas, conforme cronograma disponibilizado pela Learning by Working, assim como terá acesso a outros Conteúdos do Curso disponibilizados na Plataforma, o que deve ser feito de acordo com as regras estipuladas nestes Termos de Uso e no Contrato.</p>
      <p>4.5. A transmissão do Curso ao Aluno ocorrerá, exclusivamente, na Plataforma ou em outra indicada pela Learning by Working, sendo proibido o armazenamento, download ou gravação das videoaulas.</p>
      <p>4.6. Você deverá se atentar às regras específicas para participação no(s) Evento(s) organizado(s) pela Learning by Working que seja(m) de seu interesse, observando assim informações e datas divulgadas na Plataforma.</p>
      <p>4.7. O serviço disponibilizado na Plataforma depende da funcionalidade simultânea de diversos fatores, alguns alheios ao controle da Learning by Working, tais como a interação de servidores e serviços de telecomunicações de terceiros, a adequação dos equipamentos do Usuário, competindo a este observar os requisitos mínimos para acesso ao serviço almejado.</p>
      <p>4.8. Os pagamentos e eventuais reembolsos são processados exclusivamente pela <strong>Hotmart</strong> (www.hotmart.com), que atua unicamente como plataforma de pagamento e reembolso. O Aluno poderá exercer, no prazo de 07 (sete) dias, a contar da disponibilização do acesso, seu direito de arrependimento, previsto no artigo 49 da Lei 8.078/1990 (Código de Defesa do Consumidor), requerendo o cancelamento e a devolução dos valores pagos diretamente pela Hotmart.</p>
      <h3>4.9. Plataforma LBW e Software LBW</h3>
      <p>Para fins destes Termos: a <strong>Plataforma LBW</strong> compreende todo o ambiente Learning by Working — as trilhas, os vídeos, as ferramentas, o mentor digital e os demais recursos; o <strong>Software LBW</strong> refere-se especificamente à área de <strong>análise de dados (aba "Data & Analysis")</strong>, voltada à realização de análises estatísticas e gráficas.</p>
      <p>A Learning by Working reserva-se o direito de criar, modificar, atualizar, suspender ou descontinuar trilhas, ferramentas, o Software LBW ou quaisquer recursos da Plataforma a qualquer momento, sem aviso prévio e sem gerar obrigações de ressarcimento. O acesso é pessoal, intransferível e restrito ao período de acesso contratado.</p>
      <p>A Learning by Working não acessa o conteúdo dos dados inseridos pelo Aluno nas análises e ferramentas, visualizando apenas informações cadastrais (nome, e-mail e recursos utilizados). Os resultados do Software LBW são gerados por modelos estatísticos e linguagem de programação — não utilizam inteligência artificial — podendo variar conforme os dados inseridos e conter imprecisões (inclusive arredondamentos e casas decimais).</p>
      <p>A responsabilidade pelo uso dos resultados é exclusiva do Aluno, que deverá validar qualquer insight ou recomendação por meio de testes controlados, antes de aplicá-los em ambiente profissional. A Learning by Working não se responsabiliza por quaisquer danos, perdas ou prejuízos decorrentes da adoção das análises geradas.</p>
      <p>O e-mail informado pelo Aluno poderá ser utilizado para comunicações promocionais e informativas relacionadas à Learning by Working, conforme a Política de Privacidade.</p>
      <h3>4.10. Comunidade de alunos</h3>
      <p>A Learning by Working poderá disponibilizar uma comunidade de alunos com objetivo educacional, colaborativo e de suporte. A participação é um benefício adicional e gratuito, sem caráter contratual.</p>
      <p>O Aluno compromete-se a manter uma conduta respeitosa e ética, sendo vedado: (i) o compartilhamento de conteúdos ofensivos, discriminatórios ou com fins comerciais (spam); (ii) a divulgação de dados de terceiros sem autorização; (iii) o uso indevido de informações compartilhadas no grupo.</p>
      <p>A comunidade é um <strong>ambiente aberto a todos os participantes — usuários pagantes e gratuitos</strong> — onde o que for publicado fica visível aos demais. Por isso, o Usuário <strong>não deve compartilhar nenhuma informação sensível, confidencial ou sigilosa</strong> — sua, de terceiros ou de sua empresa — sendo o único responsável pelo conteúdo que publicar.</p>
      <p>A Learning by Working poderá moderar, restringir ou remover participantes que descumprirem estas regras, sem aviso prévio e sem direito a reembolso. A empresa também se reserva o direito de encerrar ou suspender a comunidade a qualquer momento, conforme critérios internos.</p>
      <h3>4.11. Reuniões em grupo via Zoom (opcional)</h3>
      <p>Eventualmente, e a exclusivo critério da Learning by Working, poderão ser oferecidas reuniões online em grupo por meio da plataforma Zoom, com o objetivo de aprofundar o aprendizado, discutir casos práticos e tirar dúvidas. Trata-se de um recurso <strong>opcional e não obrigatório</strong>, oferecido pontualmente conforme decisão da Learning by Working, podendo não ocorrer.</p>
      <p>Caso ocorram, essas sessões poderão ser gravadas para fins educacionais, de controle de qualidade e para uso promocional, inclusive em redes sociais, vídeos institucionais e materiais de divulgação da Learning by Working. Ao participar das sessões, o Aluno autoriza o uso da sua imagem, voz, nome e comentários para tais finalidades.</p>
      <p>Caso o Aluno não deseje ter sua imagem, voz ou nome utilizados publicamente, deverá solicitar isso expressamente, antes da reunião, através do e-mail de contato oficial da Learning by Working.</p>
      <p>A participação nas reuniões é opcional, e os horários poderão ser alterados ou cancelados sem aviso prévio, a critério da equipe responsável.</p>

      <h3>4.12. Alterações no conteúdo e nas trilhas</h3>
      <p>A Learning by Working poderá, a qualquer momento e sem aviso prévio, criar, alterar, reorganizar, suspender ou remover trilhas, cursos, conteúdos e ferramentas da Plataforma, sem que nenhuma indenização seja devida ao Usuário em razão disso.</p>

      <h3>4.13. Agente Israel Digital</h3>
      <p>O "Agente Israel Digital" <strong>não é uma inteligência artificial</strong>: trata-se de um recurso baseado na experiência profissional pessoal do fundador, Israel Souza. Suas orientações refletem opiniões e vivências práticas que <strong>podem conter erros ou não se aplicar ao seu caso específico</strong>, devendo ser avaliadas com senso crítico antes de qualquer aplicação.</p>
      <p>Quando, eventualmente, o recurso recorrer a fontes ou raciocínios além dessa experiência pessoal, poderá utilizar inteligência artificial tradicional, a qual também <strong>está sujeita a erros e imprecisões</strong>. Em qualquer caso, a responsabilidade pelo uso das orientações é exclusiva do Usuário.</p>

      <h3>4.14. Ferramentas de análise de dados</h3>
      <p>As ferramentas de análise de dados da Plataforma <strong>não utilizam inteligência artificial</strong>: os resultados são gerados por meio de linguagem de programação e modelos estatísticos. Por essa natureza, podem ocorrer <strong>erros de arredondamento, casas decimais ou de cálculo</strong>. Tais ferramentas destinam-se <strong>exclusivamente ao apoio à resolução de problemas de negócios</strong> e não substituem a validação técnica do Usuário, que deve conferir e validar qualquer resultado antes de aplicá-lo em ambiente profissional.</p>

      <h3>4.15. Acesso gratuito</h3>
      <p>O acesso gratuito é uma cortesia da Learning by Working e <strong>poderá ser modificado, suspenso ou encerrado a qualquer momento, sem limite e sem aviso prévio</strong>, sem que nada seja devido ao Usuário.</p>
      <p>Como condição do acesso gratuito, <strong>todos os Usuários gratuitos</strong> ficam <strong>obrigados a fornecer um depoimento</strong> sobre sua experiência, por escrito ou em vídeo. A Learning by Working poderá, a seu exclusivo critério, divulgar ou não o depoimento fornecido, inclusive para fins de marketing.</p>

      <h3>4.16. Uso de conteúdos da Plataforma</h3>
      <p>Ao utilizar a Plataforma, todos os Usuários (gratuitos e pagos) autorizam a Learning by Working a utilizar os conteúdos, depoimentos, análises e demais interações geradas na Plataforma para fins de <strong>melhoria do sistema e de marketing/divulgação</strong>, respeitada a Política de Privacidade.</p>

      <h2>5. Normas de conduta e proteção à propriedade imaterial</h2>
      <p>5.1. Reconhecendo o alcance mundial da Internet, o Usuário concorda em cumprir qualquer legislação do local onde está situado, bem como as leis vigentes na sede da Learning by Working, no Brasil e, ainda, a respeitar o disposto nestes Termos de Uso, Política de Privacidade e Política de Proteção aos Direitos Autorais.</p>
      <p>5.2. O Usuário se compromete a não produzir, reproduzir, disponibilizar, divulgar ou transmitir qualquer conteúdo que: (i) seja contrário a qualquer norma da legislação brasileira, bem como à moral e aos bons costumes normalmente aceitos, ou que incentive qualquer forma de racismo, discriminação ou violência; (ii) seja protegido por quaisquer direitos de propriedade intelectual ou industrial pertencente a terceiros, sem autorização prévia dos seus titulares; (iii) incorpore códigos maliciosos ou outros elementos que possam gerar danos ou impedir o normal funcionamento da rede, do sistema ou de equipamentos informáticos da Learning by Working ou de terceiros; (iv) provoquem, por suas características, dificuldades no normal funcionamento do serviço.</p>
      <p>5.3. Você reconhece que, em qualquer hipótese, será o único responsável pelo uso que fizer da Plataforma, bem como por qualquer conteúdo ou comentário que nela inserir.</p>
      <p>5.4. Todo conteúdo disponibilizado na Plataforma, como marcas, logotipos, vídeos, arquivos, textos, ícones, desenhos, sons, layouts, materiais didáticos, algoritmos, incluindo-se os Cursos, são de propriedade exclusiva da Learning by Working, ou de terceiros que concederam autorização para tal utilização, e estão protegidos pelas leis e tratados internacionais, sendo vedada sua cópia, reprodução ou qualquer outro tipo de utilização, ficando os infratores sujeitos às sanções civis e criminais correspondentes, nos termos das Leis 9.279/96, 9.610/98 e 9.609/98, conforme detalhado na Política de Proteção aos Direitos Autorais.</p>
      <p>5.5. Você deverá utilizar a Plataforma e todo o Conteúdo nela disponibilizado, incluindo os Cursos, de acordo com o ordenamento jurídico brasileiro, com a moral e os bons costumes geralmente aceitos, com os presentes Termos de Uso, Política de Proteção aos Direitos Autorais e as demais instruções existentes na Plataforma, abstendo-se de usar, explorar, reproduzir ou divulgar, indevidamente, por qualquer meio, o conteúdo disponibilizado na Plataforma.</p>
      <p>5.6. Todas as marcas, nomes comerciais ou logotipos de qualquer espécie, disponibilizados na Plataforma, são de propriedade da Learning by Working, sem que a utilização da Plataforma possa ser entendida como autorização para que o Usuário possa citar as tais marcas, os nomes comerciais e logotipos.</p>
      <p>5.7. Os Professores autorizaram a Learning by Working a utilizar sua imagem nos Cursos e Eventos. Desse modo, qualquer reprodução indevida dos Cursos e Eventos disponibilizados na Plataforma constitui, além da violação de direitos de propriedade intelectual da Learning by Working, a violação dos direitos de imagem dos Professores. Caso você faça eventual uso indevido da imagem dos Professores terá responsabilidade exclusiva pela reparação civil, sem prejuízo da indenização por todos os danos e despesas da Learning by Working.</p>
      <p>5.8. Todos os Cursos e Conteúdos disponibilizados para o Usuário na Plataforma são apenas para o estado em que se encontram e tão somente para sua informação e uso pessoal na forma designada pela Learning by Working. Tais Cursos e Conteúdos não podem ser repassados, copiados, reproduzidos, distribuídos, transmitidos, difundidos, exibidos, vendidos, licenciados, adaptados ou, de outro modo, explorados para quaisquer fins, sem o consentimento prévio e por escrito da Learning by Working.</p>
      <p>5.9. Em caso de dúvidas sobre a comercialização ou disponibilização de Cursos em outros locais que não na Plataforma, entre em contato conosco através do e-mail <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>.</p>

      <h2>6. Procedimento em caso de constatação de abusos ou irregularidades</h2>
      <p>6.1. Caso o Usuário identifique qualquer material ofensivo, ilegal, ou atentatório à moral e aos bons costumes, disponibilizado por outro Usuário da Plataforma, poderá, imediatamente, comunicar à Learning by Working, através do e-mail contact@learningbyworking.com, para que possa apurar a denúncia, ficando a Learning by Working isenta de qualquer responsabilidade por tal conteúdo, por ter sido realizado por terceiros, sem qualquer intervenção ou controle da Learning by Working.</p>
      <p>6.2. Fica a critério da administração da Learning by Working a apuração das denúncias que lhe forem dirigidas.</p>
      <p>6.3. O comportamento ilícito poderá ser sancionado com a suspensão ou cancelamento do cadastro do Usuário na Plataforma, sem prejuízo da adoção das medidas judiciais cabíveis.</p>

      <h2>7. Duração e finalização do acesso à Plataforma</h2>
      <p>7.1. O <strong>acesso pago</strong> à Plataforma é concedido ao Aluno pelo prazo contratual de <strong>12 (doze) meses</strong>. À Learning by Working, no entanto, está assegurado o direito de terminar, suspender ou interromper, unilateralmente e a qualquer momento, o acesso à Plataforma, sem que qualquer indenização seja devida ao Usuário, caso o Usuário cometa alguma infração às normas previstas neste Termo de Uso e na Política de Privacidade. O acesso gratuito segue as regras específicas da cláusula 4.15.</p>
      <p>7.1.1. Os <strong>preços dos planos pagos e as condições de acesso aos créditos/tokens de inteligência artificial podem variar a qualquer momento</strong>, conforme ajustes na Plataforma e as demandas do mercado. Em qualquer caso, <strong>valem as regras vigentes no momento da compra</strong>: o valor pago e o limite de tokens contratado permanecem válidos durante a vigência de 12 (doze) meses, não sendo afetados por alterações posteriores.</p>
      <p>7.2. A Learning by Working, ainda, se reserva o direito de recusar ou retirar o acesso à Plataforma, a qualquer momento, e sem necessidade de prévio aviso, por iniciativa própria ou por exigência de um terceiro, se o Usuário descumprir, de qualquer forma, estes Termos de Uso, as Políticas de Privacidade e Proteção aos Direitos Autorais e/ou a legislação vigente.</p>
      <p>7.3. Você reconhece que a Learning by Working pode, a qualquer tempo, remover da Plataforma qualquer Curso ou Conteúdo disponibilizado, sem necessidade de aviso prévio e sem que nenhuma indenização seja devida ao Usuário em razão de tal remoção caso o Usuário descumpra qualquer das normas previstas neste Termo de Uso e na Política de Privacidade, com exceção das hipóteses expressamente previstas no Contrato.</p>

      <h2>8. Da Learning by Working</h2>
      <p>8.1. A Learning by Working não será, em hipótese alguma, responsável por quaisquer danos decorrentes da interrupção do acesso à Plataforma ou falhas no seu funcionamento.</p>
      <p>8.2. A Learning by Working utiliza as melhores práticas recomendadas de mercado para manter seguros todos os dados inseridos pelo Usuário na Plataforma; entretanto, se exime de responsabilidade por eventuais danos e prejuízos de toda natureza que decorram do conhecimento que terceiros não autorizados tenham de quaisquer informações passadas pelo Usuário em decorrência de falha exclusivamente atribuível ao Usuário ou a terceiros que fujam a qualquer controle razoável da Learning by Working.</p>
      <p>8.3. A Learning by Working não garante a ausência de softwares maliciosos quando da utilização de sua Plataforma, bem como outros elementos nocivos que possam produzir alterações nos sistemas informáticos dos Usuários ou nos documentos eletrônicos armazenados, eximindo-se de qualquer responsabilidade pelos danos e prejuízos que possam decorrer da presença de vírus ou de outros elementos nocivos na Plataforma.</p>
      <p>8.4. A Learning by Working poderá, sem anuência ou concordância do Usuário, realizar quaisquer alterações na Plataforma que julgar necessárias, sem que qualquer valor ou indenização seja devida a você em razão disso.</p>

      <h2>9. Disposições finais e atualização destes Termos de Uso</h2>
      <p>9.1. Mesmo que qualquer parte destes Termos de Uso seja considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito, sendo que o referido trecho deverá ser interpretado de forma consistente com a lei aplicável, para refletir, na medida do possível, a intenção original das partes.</p>
      <p>9.2. Eventual falha da Learning by Working em exigir quaisquer direitos ou disposições dos presentes Termos de Uso não constituirá renúncia, podendo exercer regularmente o seu direito, dentro dos prazos legais.</p>

      <h2>10. Legislação e foro</h2>
      <p>Os presentes Termos de Uso serão regidos, interpretados e executados de acordo com as leis da República Federativa do Brasil, independentemente dos conflitos dessas leis com leis de outros estados ou países.</p>
    </>
  );
}

function Privacidade() {
  return (
    <>
      <p>Última atualização: {HOJE}.</p>
      <p>A presente Política de Privacidade tem por finalidade demonstrar o compromisso da <strong>Learning by Working</strong>, pessoa jurídica de direito privado, inscrita no NZBN sob nº 9429047241657, com sede na cidade de Auckland – Nova Zelândia, com a privacidade e proteção dos dados pessoais dos usuários e alunos que acessam a plataforma, conforme previsto na Lei nº 13.709/2018 – Lei Geral de Proteção de Dados (LGPD).</p>

      <h2>1. Quais dados coletamos</h2>
      <p>A Learning by Working coleta os seguintes dados pessoais:</p>
      <ul>
        <li>Nome completo</li>
        <li>Endereço de e-mail</li>
        <li>Profissão ou área de atuação (se informado no cadastro)</li>
        <li>Dados de uso da plataforma (quais ferramentas do software LBW foram acessadas, frequência de uso)</li>
        <li>Participação em reuniões via Zoom (incluindo vídeo, áudio e chat, quando gravados)</li>
        <li>Comentários ou postagens dentro da comunidade</li>
        <li>Depoimentos (por escrito ou em vídeo) fornecidos sobre sua experiência</li>
      </ul>

      <h2>2. Como utilizamos os dados</h2>
      <p>Seus dados pessoais são utilizados para os seguintes fins:</p>
      <ul>
        <li>Gerenciar seu acesso ao curso online, certificações e conteúdos educacionais</li>
        <li>Liberar e monitorar o uso do software LBW</li>
        <li>Permitir sua participação na comunidade de alunos</li>
        <li>Convidar e organizar sua participação em reuniões ao vivo via Zoom</li>
        <li>Enviar comunicações promocionais, conteúdos gratuitos e ofertas da Learning by Working</li>
        <li>Melhoria do sistema e divulgação/marketing, incluindo o uso de conteúdos, depoimentos e interações geradas na Plataforma</li>
        <li>Cumprir obrigações legais e regulatórias</li>
      </ul>

      <h2>3. Sobre o uso do software LBW</h2>
      <p>Ao acessar o software LBW, a Learning by Working não coleta nem armazena os dados inseridos nas análises realizadas pelo usuário. A única coleta ocorre para:</p>
      <ul>
        <li>Identificação básica do aluno (nome e e-mail)</li>
        <li>Registro das ferramentas estatísticas utilizadas (para fins de suporte e melhoria do produto)</li>
      </ul>

      <h2>4. Compartilhamento de dados</h2>
      <p>Seus dados poderão ser compartilhados com:</p>
      <ul>
        <li>Hotmart, exclusivamente para processamento de pagamento e reembolso</li>
        <li>Plataformas de e-mail marketing, para envio de comunicações informativas e promocionais</li>
        <li>Plataforma Zoom, para realização de reuniões ao vivo</li>
        <li>Autoridades públicas, caso haja exigência legal ou judicial</li>
      </ul>
      <p>Jamais vendemos ou comercializamos seus dados pessoais.</p>

      <h2>5. Base legal para tratamento de dados</h2>
      <p>A coleta e o tratamento de seus dados pessoais se baseiam nas seguintes hipóteses legais:</p>
      <ul>
        <li>Execução do contrato (acesso ao curso e suporte)</li>
        <li>Legítimo interesse (melhoria da plataforma, envio de conteúdo e marketing)</li>
        <li>Consentimento expresso, quando aplicável (uso de imagem em reuniões, por exemplo)</li>
        <li>Cumprimento de obrigação legal</li>
      </ul>

      <h2>6. Uso de imagem nas reuniões via Zoom</h2>
      <p>As reuniões em grupo poderão ser gravadas. Ao participar, você autoriza o uso de sua imagem, voz e nome para fins de divulgação institucional da Learning by Working. Caso não deseje ser identificado, deverá enviar solicitação prévia ao e-mail: <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>.</p>

      <h2>7. Armazenamento e segurança dos dados</h2>
      <p>Adotamos medidas técnicas e administrativas para proteger seus dados, incluindo:</p>
      <ul>
        <li>Criptografia de dados sensíveis</li>
        <li>Acesso restrito às informações</li>
        <li>Monitoramento de segurança nos servidores</li>
        <li>Parcerias com plataformas que seguem padrões internacionais de proteção</li>
      </ul>

      <h2>8. Seus direitos como titular de dados</h2>
      <p>Nos termos da LGPD, você pode, a qualquer momento:</p>
      <ul>
        <li>Solicitar acesso aos dados que mantemos sobre você</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
        <li>Solicitar a exclusão dos seus dados (exceto quando a retenção for obrigatória)</li>
        <li>Solicitar a revogação do consentimento</li>
      </ul>
      <p>Para exercer seus direitos, entre em contato pelo e-mail: <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>.</p>

      <h2>9. Retenção e exclusão dos dados</h2>
      <p>Seus dados serão armazenados enquanto durar a relação educacional e, após esse período, pelo prazo necessário para: cumprir obrigações legais e contratuais; e fins legítimos da empresa (ex: emissão de certificados). Após este prazo, os dados serão anonimizados ou excluídos de forma segura.</p>

      <h2>10. Alterações nesta Política</h2>
      <p>Esta Política de Privacidade poderá ser atualizada a qualquer momento. A nova versão será publicada no site www.learningbyworking.com com data de revisão atualizada.</p>

      <h2>11. Dúvidas e contato</h2>
      <p>Em caso de dúvidas sobre esta Política ou sobre como tratamos seus dados, entre em contato conosco: <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>.</p>
    </>
  );
}

const PAGINAS: Record<string, { eyebrow: string; titulo: string; render: () => React.ReactNode }> = {
  '/quem-somos': { eyebrow: 'Institucional', titulo: 'Quem somos', render: Quem },
  '/contato': { eyebrow: 'Fale com a gente', titulo: 'Contato', render: Contato },
  '/pacotes-corporativos': { eyebrow: 'Para empresas', titulo: 'Pacotes corporativos', render: Pacotes },
  '/termos': { eyebrow: 'Legal', titulo: 'Termos de uso', render: Termos },
  '/privacidade': { eyebrow: 'Legal', titulo: 'Política de privacidade', render: Privacidade },
};

export default function LandingInstitucional() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '/quem-somos';
  const pg = PAGINAS[path] || PAGINAS['/quem-somos'];

  return (
    <div className="li">
      <style>{CSS}</style>
      <div className="top">
        <div className="topwrap">
          <a className="logo" href="/">Learning by Working</a>
          <a className="back" href="/">← Voltar ao site</a>
        </div>
      </div>

      <header className="hero">
        <span className="eyebrow">{pg.eyebrow}</span>
        <h1>{pg.titulo}</h1>
      </header>

      <main className="body">{pg.render()}</main>

      <footer className="foot">
        © 2026 Learning by Working – Educação pelo Trabalho · Todos os direitos reservados<br/>
        <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>
      </footer>
    </div>
  );
}
