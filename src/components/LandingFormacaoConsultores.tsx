import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Award, BookOpen, CalendarDays, Check, ChevronDown, Clock3, GraduationCap, Layers3, MessageCircle, MonitorPlay, Play, Scissors, Users, Wrench } from 'lucide-react';
import { CSS_FORMACAO_EXTRA } from './consultores/estilosFormacao';
import { CSS_CONSULTORES_NOVA } from './consultores/estilosLandingNova';
import { ShowcaseSection } from './LandingConsultoresNova';

const VIDEO_ALUNO = 'https://iframe.mediadelivery.net/embed/718588/dbd34562-3136-4144-8f61-eb910dc7a9a1?preload=false';
const URL_APRESENTACAO_PADRAO = 'https://cal-agendamento-production.up.railway.app/israel';
const URL_APRESENTACAO = String(import.meta.env.VITE_APRESENTACAO_URL || URL_APRESENTACAO_PADRAO).trim();
const entregas = [
  { icon: GraduationCap, title: 'Cursos para desenvolver sua base técnica', text: 'Acesso aos cursos da LBW: melhoria de processos, estatística aplicada, ferramentas da qualidade e gestão de projetos.', tag: 'Formação' },
  { icon: Users, title: '10 encontros em grupo com Israel', text: 'Encontros online sobre oferta, diagnóstico, precificação e atuação com empresas. Espaço para trabalhar dúvidas do seu contexto.', tag: 'Acompanhamento' },
  { icon: Layers3, title: 'Uma plataforma com a sua marca', text: 'Organize cursos, alunos, empresas e projetos em um ambiente que leva a identidade da sua consultoria.', tag: 'Sua operação' },
  { icon: Award, title: '10 certificados de formação', text: 'Certificados das formações concluídas, conforme os requisitos de cada curso. Você acompanha seu progresso na plataforma.', tag: 'Aprendizado' },
  { icon: Wrench, title: 'Ferramentas para aplicar com seus clientes', text: 'Templates de projetos, SIPOC, FMEA, 5W2H e análises estatísticas para apoiar o diagnóstico e a condução das melhorias.', tag: 'Aplicação' },
  { icon: Scissors, title: 'Criação de cortes para divulgação', text: 'Use seus vídeos como ponto de partida para produzir cortes e preparar conteúdo para as redes sociais.', tag: 'Conteúdo' },
  { icon: CalendarDays, title: 'Agendamento para seus atendimentos', text: 'Organize os horários disponíveis e compartilhe seu link para que interessados agendem uma conversa.', tag: 'Atendimento' },
  { icon: BookOpen, title: 'Estrutura para oferecer treinamentos', text: 'Prepare a experiência dos seus alunos e organize sua oferta de cursos para pessoas e empresas.', tag: 'Seus serviços' },
];
const encontros = ['Definir sua área de atuação e a primeira oferta', 'Precificar projetos e horas de trabalho', 'Encontrar e abordar empresas', 'Conduzir o diagnóstico inicial', 'Estruturar um projeto de melhoria', 'Apresentar resultados para a diretoria', 'Montar e oferecer treinamentos', 'Sustentar recomendações com dados', 'Organizar a operação da consultoria', 'Produzir conteúdo e gerar interesse'];
const faqs = [
  ['Preciso já trabalhar como consultor?', 'Não. O programa é voltado a profissionais com experiência em processos, qualidade, operações ou melhoria contínua que querem estruturar sua atuação como consultores. Quem já atende clientes também pode participar.'],
  ['Preciso sair do meu emprego para participar?', 'Não. Você pode estudar e preparar sua atuação enquanto continua trabalhando. Avalie o tempo disponível para os cursos, os encontros e a aplicação prática.'],
  ['Preciso ter um curso gravado?', 'Não é necessário ter um curso próprio para conhecer o programa. Você terá acesso aos cursos da LBW e poderá cadastrar seu próprio conteúdo. Na apresentação, veja como funciona a oferta de cursos aos seus clientes e quais condições se aplicam.'],
  ['Como funcionam os dez encontros?', 'São encontros online em grupo, com Israel, sobre temas independentes. A entrada é contínua e os temas se repetem em ciclos. Antes de contratar, confira o calendário e as condições de participação para completar os dez encontros.'],
  ['Vocês entregam clientes ou garantem uma renda?', 'A prospecção e a venda dos seus serviços são de sua responsabilidade. O programa oferece formação, acompanhamento e ferramentas. A contratação de clientes depende da sua atuação e do mercado; não há garantia de faturamento.'],
  ['Qual é o investimento?', 'A condição de fundador divulgada é de R$ 2.997 à vista ou 12 parcelas de R$ 299, totalizando R$ 3.588 no parcelamento. O valor regular informado é R$ 4.997. A condição de fundador é apresentada no encontro ao vivo, conforme disponibilidade, e tem validade de 48 horas após a apresentação.'],
  ['Por quanto tempo terei acesso?', 'Confira na apresentação e nas condições de contratação o período de acesso aos cursos e à plataforma, os limites de uso e as regras de renovação antes de decidir.'],
  ['A apresentação é gratuita? Preciso comprar para participar?', 'A apresentação é gratuita e sem compromisso de compra. Em 40 minutos você conhece o programa, vê a plataforma e entende as condições. Depois, pode ficar para tirar dúvidas. A formação e o acesso à estrutura fazem parte do programa pago.'],
];
function Convite({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <a className={`fl-button ${className}`} href="#formacao-inscricao">{children || 'Quero participar da apresentação'}<ArrowRight size={18} aria-hidden="true" /></a>;
}
function registrarCliqueAgendamento() {
  const pixel = (window as typeof window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof pixel === 'function') {
    pixel('track', 'Lead', { content_name: 'agendamento-apresentacao-consultores-lbw' });
  }
}

export default function LandingFormacaoConsultores() {
  const [videoAberto, setVideoAberto] = useState(false);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Formação de Consultores LBW | Cursos, acompanhamento e plataforma';
    return () => { document.title = previousTitle; };
  }, []);
  return (
    <div className="formation-landing">
      <style>{CSS_FORMACAO_EXTRA}</style>
      <a className="fl-skip" href="#conteudo-formacao">Pular para o conteúdo</a>
      <header className="fl-header"><nav className="fl-container fl-nav" aria-label="Navegação do programa">
        <a href="#inicio" className="fl-brand" aria-label="LBW, início"><span className="fl-brand-mark">LBW</span><span>Educação<br /><b>pelo Trabalho</b></span></a>
        <div className="fl-nav-links"><a href="#programa">O programa</a><a href="#encontros">Encontros</a><a href="#investimento">Investimento</a></div>
        <Convite className="fl-button-small">Apresentação gratuita</Convite>
      </nav></header>
      <main id="conteudo-formacao">
        <section id="inicio" className="fl-hero"><div className="fl-container fl-hero-grid">
          <div className="fl-hero-copy">
            <span className="fl-eyebrow"><span /> Programa de Consultores LBW</span>
            <h1>Sua experiência em processos.<br /><em>Uma nova etapa como consultor.</em></h1>
            <p className="fl-lead">Estruture sua atuação com os cursos da LBW, dez encontros em grupo com Israel e uma plataforma com a sua marca para oferecer treinamentos e atender clientes.</p>
            <div className="fl-hero-actions"><Convite /><a className="fl-secondary-link" href="#programa">Conhecer o programa <ArrowDown size={16} aria-hidden="true" /></a></div>
            <p className="fl-hero-note"><Clock3 size={16} aria-hidden="true" /> Apresentação de 40 min <span aria-hidden="true">·</span> Ao vivo e gratuita</p>
            <p className="fl-hero-context">Para profissionais com experiência em processos, qualidade, operações ou melhoria contínua.</p>
          </div>
          <div id="video" className="fl-demo"><div className="fl-demo-heading"><span className="fl-overline">Veja a plataforma por dentro</span><h2>A experiência que você pode oferecer aos seus alunos.</h2></div>
            <div className="fl-video">{videoAberto
              ? <iframe title="Demonstração da plataforma LBW pela visão do aluno" src={VIDEO_ALUNO} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
              : <button type="button" className="fl-video-poster" onClick={() => setVideoAberto(true)} aria-label="Assistir à demonstração da plataforma, 14 minutos"><img src="/tour-projetos.png" alt="Tela dos projetos de melhoria na plataforma LBW" width="1180" height="600" /><span><Play size={21} fill="currentColor" aria-hidden="true" /> Assistir demonstração</span></button>}</div>
            <p className="fl-video-caption"><MonitorPlay size={16} aria-hidden="true" /> Demonstração completa <span>14 min</span></p>
            <div className="fl-demo-tags"><span><Check size={14} /> Sua marca</span><span><Check size={14} /> Cursos e projetos</span><span><Check size={14} /> Alunos e empresas</span></div>
          </div>
        </div></section>
        <div className="fl-facts"><div className="fl-container fl-facts-grid"><div><strong>Cursos LBW</strong><span>Base técnica para sua atuação</span></div><div><strong>10 encontros</strong><span>Online, em grupo, com Israel</span></div><div><strong>10 certificados</strong><span>Conforme a conclusão dos cursos</span></div><div><strong>Sua plataforma</strong><span>Com a identidade da sua consultoria</span></div></div></div>
        <div className="consultores-lp-nova"><style>{CSS_CONSULTORES_NOVA}</style><ShowcaseSection /></div>

        <section className="fl-section fl-audience"><div className="fl-container">
          <div className="fl-section-heading"><span className="fl-overline">O seu próximo passo</span><h2>Você já conhece os processos.<br />Agora quer organizar sua própria oferta.</h2><p>O programa conecta sua experiência à preparação para prestar serviços e oferecer treinamentos.</p></div>
          <div className="fl-three-grid">
            <article className="fl-audience-card"><span className="fl-number">01</span><h3>Quer começar como consultor</h3><p>Você trabalha com processos e quer definir uma área de atuação, preparar sua oferta e aprender a apresentá-la.</p></article>
            <article className="fl-audience-card"><span className="fl-number">02</span><h3>Quer ensinar o que sabe</h3><p>Você tem experiência prática e precisa de apoio e estrutura para oferecer treinamentos a pessoas e empresas.</p></article>
            <article className="fl-audience-card"><span className="fl-number">03</span><h3>Já atende e quer se organizar</h3><p>Você busca reunir cursos, projetos e clientes em um sistema que possa usar em diferentes trabalhos.</p></article>
          </div><p className="fl-audience-note">Você pode se preparar enquanto continua no seu emprego. Não precisa chegar com uma consultoria montada.</p>
        </div></section>

        <section id="programa" className="fl-section fl-program"><div className="fl-container">
          <div className="fl-section-heading"><span className="fl-overline">O que está incluído</span><h2>Formação, acompanhamento<br />e estrutura para trabalhar.</h2><p>Conheça o papel de cada parte do programa na sua atuação.</p></div>
          <div className="fl-deliverables">{entregas.map(({ icon: Icon, title, text, tag }) => <article className="fl-deliverable" key={title}><div className="fl-card-top"><span className="fl-icon"><Icon size={22} aria-hidden="true" /></span><span>{tag}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
          <div className="fl-program-bottom"><p>Na apresentação, você vê como essas entregas funcionam juntas.</p><Convite /></div>
        </div></section>

        <section id="encontros" className="fl-section"><div className="fl-container fl-meetings-grid">
          <div className="fl-section-heading fl-left"><span className="fl-overline">Acompanhamento com Israel</span><h2>Dez encontros para trabalhar as decisões da sua consultoria.</h2><p>Os temas são independentes e se repetem em ciclos. Você entra no próximo encontro disponível e avança na preparação da sua atuação.</p><div className="fl-meeting-note"><CalendarDays size={22} aria-hidden="true" /><div><strong>Entrada contínua</strong><p>Confira o calendário e as condições de participação na apresentação.</p></div></div><p className="fl-small-note">Os encontros fazem parte do programa pago. A apresentação gratuita é uma sessão separada.</p></div>
          <ol className="fl-meeting-list">{encontros.map((tema, i) => <li key={tema}><span>{String(i + 1).padStart(2, '0')}</span>{tema}</li>)}</ol>
        </div></section>

        <section className="fl-section fl-tools"><div className="fl-container"><div className="fl-section-heading"><span className="fl-overline">Da aprendizagem à aplicação</span><h2>Ferramentas que entram no trabalho.</h2><p>Organize o processo, investigue causas e planeje ações com recursos da plataforma.</p></div><div className="fl-three-grid">{[['Mapeie o processo', 'SIPOC', '/landing-tools/sipoc-mapa-processo.png'], ['Analise os riscos', 'FMEA', '/landing-tools/fmea.png'], ['Organize a execução', 'Plano de ação 5W2H', '/landing-tools/plano-acao-5w2h.png']].map(([title, label, src]) => <figure className="fl-tool" key={label}><div><img src={src} alt={`Exemplo da ferramenta ${label} na LBW`} loading="lazy" width="600" height="450" /></div><figcaption><span>{label}</span><strong>{title}</strong></figcaption></figure>)}</div></div></section>

        <section className="fl-section fl-path"><div className="fl-container"><div className="fl-section-heading"><span className="fl-overline">Como começar</span><h2>Entenda a proposta antes de decidir.</h2></div><ol className="fl-path-grid"><li><span>01</span><h3>Conheça o programa</h3><p>Participe da apresentação gratuita, veja a demonstração e entenda as condições.</p></li><li><span>02</span><h3>Avalie seu momento</h3><p>Confira o investimento, o período de acesso e o tempo que pode dedicar. Traga suas dúvidas.</p></li><li><span>03</span><h3>Prepare sua atuação</h3><p>Ao entrar, acesse os cursos, participe dos encontros e configure sua estrutura de trabalho.</p></li></ol></div></section>

        <section className="fl-section fl-authority"><div className="fl-container fl-authority-grid"><img className="fl-portrait" src="/israel-foto.png" alt="Israel Souza, fundador da Learning by Working" loading="lazy" width="330" height="400" /><div><span className="fl-overline">Quem acompanha você</span><h2>Israel Souza</h2><p className="fl-author-role">Fundador da Learning by Working</p><p>Experiência com processos, projetos, treinamentos e desenvolvimento de pessoas em cinco multinacionais e dois países.</p><p>Nos encontros em grupo, você pode trazer dúvidas da sua preparação e discutir a aplicação das ferramentas no seu contexto.</p><div className="fl-author-facts"><span><strong>20+</strong> anos de experiência</span><span><strong>1.500+</strong> profissionais treinados</span></div></div></div></section>

        <section id="investimento" className="fl-section fl-investment"><div className="fl-container fl-price-grid">
          <div className="fl-section-heading fl-left"><span className="fl-overline">Investimento no programa</span><h2>Veja o que está incluído.<br />Converse antes de investir.</h2><p>A apresentação é gratuita. A formação, os encontros e o acesso à estrutura fazem parte do programa pago.</p><div className="fl-price-info"><MessageCircle size={22} aria-hidden="true" /><div><h3>Tem uma dúvida sobre o seu caso?</h3><p>Traga para a apresentação. Se precisar de uma avaliação individual, converse com Israel sobre o próximo passo.</p></div></div><div className="fl-responsibility"><strong>Sobre a conquista de clientes</strong><p>A prospecção é sua. A LBW oferece formação, acompanhamento e ferramentas; a venda dos seus serviços depende da sua atuação.</p></div></div>
          <div className="fl-price-card"><span className="fl-price-badge">Condição de fundador</span><p className="fl-regular-price">Valor regular informado: R$ 4.997</p><div className="fl-price"><strong>R$ 2.997</strong><span>à vista</span></div><p className="fl-installments">ou <strong>12x de R$ 299</strong><span>Total parcelado: R$ 3.588</span></p><ul>{['Cursos da LBW e 10 certificados de formação', '10 encontros online em grupo com Israel', 'Plataforma com a sua marca', 'Templates e ferramentas de análise', 'Criação de cortes e agendamento'].map(t => <li key={t}><Check size={18} aria-hidden="true" />{t}</li>)}</ul><Convite>Conhecer o programa ao vivo</Convite><p className="fl-price-terms">Condição apresentada ao vivo, conforme disponibilidade, válida por 48 horas após a apresentação. Confira período de acesso, limites de uso e renovação antes de contratar.</p></div>
        </div></section>

        <section className="fl-section fl-faq"><div className="fl-container fl-faq-grid"><div className="fl-section-heading fl-left"><span className="fl-overline">Antes de participar</span><h2>As informações para decidir seu próximo passo.</h2><p>A apresentação é o espaço para conhecer os detalhes e avaliar se o programa faz sentido para você.</p></div><div className="fl-faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={18} aria-hidden="true" /></summary><p>{a}</p></details>)}</div></div></section>

        <section id="formacao-inscricao" className="fl-section fl-registration"><div className="fl-container fl-registration-grid"><div className="fl-section-heading fl-left"><span className="fl-overline">Apresentação gratuita</span><h2>Escolha a sessão e conheça o programa.</h2><p>Escolha um horário no calendário. O Cal vai pedir seus dados para confirmar a participação e enviar o convite da reunião.</p><ul className="fl-session-list"><li><Clock3 size={19} /> 40 minutos de apresentação</li><li><MonitorPlay size={19} /> Demonstração da plataforma e do programa</li><li><MessageCircle size={19} /> Perguntas ao final, para quem quiser ficar</li></ul><p className="fl-registration-note">Apresentação gratuita e sem compromisso de compra.</p></div><div className="fl-form-card"><span className="fl-overline">Seu próximo passo</span><h3>Agende sua apresentação</h3><p className="fl-registration-note">Veja os horários disponíveis e reserve o que funciona melhor para você.</p><a className="fl-button" href={URL_APRESENTACAO} onClick={registrarCliqueAgendamento}><span>Escolher data e horário</span><ArrowRight size={18} aria-hidden="true" /></a><p className="fl-form-micro">O Cal pedirá seus dados e enviará a confirmação da reunião.</p></div></div></section>
      </main>
      <footer className="fl-footer"><div className="fl-container fl-footer-top"><a href="#inicio" className="fl-brand"><span className="fl-brand-mark">LBW</span><span>Educação<br /><b>pelo Trabalho</b></span></a><p>Formação e tecnologia para aplicar melhoria de processos.</p><a href="mailto:contact@learningbyworking.com">Fale com a LBW <ArrowRight size={15} /></a></div><div className="fl-container fl-footer-bottom"><span>Learning by Working · Auckland, Nova Zelândia<br />NZBN: 9429047241657 · © {new Date().getFullYear()}</span><div><a href="/quem-somos">Quem somos</a><a href="/termos">Termos de uso</a><a href="/privacidade">Privacidade</a></div></div></footer>
    </div>
  );
}
