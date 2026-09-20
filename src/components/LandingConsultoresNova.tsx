import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Award, ArrowRight, BarChart3, Bot, Building2, CheckCircle2, ChevronDown,
  FolderKanban, GraduationCap, MessageCircle, Play, ShieldCheck, Sparkles,
  Users, Wrench,
} from 'lucide-react';
import RodapeConsultores from './RodapeConsultores';
import { CSS_CONSULTORES_NOVA } from './consultores/estilosLandingNova';
import FormularioLead from './consultores/FormularioLead';

const VIDEO_ALUNO = 'https://iframe.mediadelivery.net/embed/718588/dbd34562-3136-4144-8f61-eb910dc7a9a1?preload=true';

function scrollToForm() {
  document.getElementById('consultores-formulario')?.scrollIntoView({ behavior: 'smooth' });
}

const beneficiosAluno = [
  ['Aprender', 'Cursos, trilhas e videoaulas organizados para acompanhar uma jornada clara.', GraduationCap],
  ['Aplicar', 'Ferramentas da qualidade e fluxos guiados para transformar conteúdo em prática.', Wrench],
  ['Analisar', 'Software estatístico e recursos para tomar decisões com base em dados.', BarChart3],
  ['Desenvolver', 'Projetos reais estruturados dentro do mesmo ambiente de aprendizagem.', FolderKanban],
  ['Evoluir', 'IA, comunidade, materiais de apoio e certificado acompanhando cada etapa.', Sparkles],
] as const;

const beneficiosEmpresa = [
  'Ambiente próprio para cada empresa cliente',
  'Controle de cursos, participantes e coordenadores',
  'Acompanhamento de participação, progresso e conclusão',
  'Projetos, ferramentas e resultados no mesmo lugar',
  'Comunidade exclusiva para a equipe',
  'Relatórios para acompanhar a aplicação do aprendizado',
];

const beneficiosConsultor = [
  ['Cursos com sua marca', 'Cadastre sua metodologia e entregue uma experiência com a identidade da sua consultoria.', GraduationCap],
  ['Projetos e ferramentas', 'Ofereça ferramentas da qualidade, projetos guiados e análise de dados sem montar tudo do zero.', Wrench],
  ['Clientes organizados', 'Crie ambientes separados e acompanhe várias empresas em um único painel.', Building2],
  ['IA como apoio', 'Ajude alunos e equipes com orientação contextual durante a aplicação prática.', Bot],
  ['Mais escala', 'Reduza controles paralelos e dedique mais tempo ao trabalho que exige sua experiência.', BarChart3],
  ['Entrega completa', 'Cursos, certificados, comunidade, materiais e resultados em uma experiência única.', Award],
] as const;

const passos = [
  ['01', 'Configure sua marca', 'Nome, cores, logo e a identidade que seus alunos e clientes vão reconhecer.'],
  ['02', 'Cadastre seus cursos', 'Organize videoaulas, avaliações, certificados e materiais de apoio.'],
  ['03', 'Escolha as ferramentas', 'Defina os projetos, análises e ferramentas que fazem parte da sua metodologia.'],
  ['04', 'Crie o ambiente do cliente', 'Cada empresa possui seu próprio espaço, participantes e informações.'],
  ['05', 'Acompanhe a aplicação', 'Veja participação, progresso, projetos e resultados ao longo do trabalho.'],
  ['06', 'Evolua sua entrega', 'Use os dados e a IA para melhorar continuamente a experiência oferecida.'],
];

const faqs = [
  ['Posso cadastrar meus próprios cursos?', 'Sim. Você pode cadastrar seus cursos, videoaulas, avaliações, materiais, certificados e a metodologia que utiliza com seus alunos e clientes.'],
  ['A plataforma pode usar a minha marca?', 'Sim. A proposta é que sua consultoria seja a referência para o aluno e para a empresa. A LBW fornece a tecnologia por trás da experiência.'],
  ['Posso atender várias empresas?', 'Sim. Cada empresa pode ter seu próprio ambiente, com coordenadores, alunos, cursos, projetos e informações separados.'],
  ['O que a empresa cliente consegue acompanhar?', 'A empresa pode acompanhar participantes, cursos, progresso, projetos, materiais, participação e resultados de aplicação.'],
  ['A plataforma serve apenas para hospedar vídeos?', 'Não. O vídeo é uma parte da jornada. A plataforma conecta aprendizagem, ferramentas, análise de dados, projetos, comunidades, certificados e acompanhamento.'],
  ['Preciso saber programar?', 'Não. A configuração é feita pelo próprio consultor dentro da plataforma.'],
];

const templatesPlataforma = [
  ['Ideias de projetos', '/landing-tools/ideias-projetos.png'],
  ['Matriz GUT', '/landing-tools/matriz-gut.png'],
  ['Contrato do projeto', '/landing-tools/contrato-projeto.png'],
  ['Cronograma', '/landing-tools/cronograma-projeto.png'],
  ['Ganhos do projeto', '/landing-tools/ganhos-projeto.png'],
  ['SIPOC', '/landing-tools/sipoc-mapa-processo.png'],
  ['Brainstorming', '/landing-tools/brainstorming.png'],
  ['Espinha de peixe', '/landing-tools/espinha-de-peixe.png'],
  ['FMEA', '/landing-tools/fmea.png'],
  ['Plano de ação 5W2H', '/landing-tools/plano-acao-5w2h.png'],
];

const recursosSoftware = [
  ['Estatística aplicada e ferramentas da qualidade', '/landing-courses/estatistica-aplicada-ferramentas-qualidade.png'],
  ['MSA, análise do sistema de medição', '/landing-courses/msa-analise-sistema-medicao.png'],
  ['Capabilidade de processo', '/landing-courses/capabilidade-processo-avancado.png'],
  ['CEP, controle estatístico de processo', '/landing-courses/cep-controle-estatistico-processo.png'],
  ['Análise inferencial e testes de hipóteses', '/landing-courses/analise-inferencial-testes-hipoteses.png'],
  ['Análise preditiva, regressões e correlações', '/landing-courses/analise-preditiva-regressoes-correlacoes.png'],
];

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} transition={reduced ? undefined : { duration: 0.65, delay, ease: [0.2, 0.7, 0.2, 1] }}>{children}</motion.div>;
}

function PillarIcon({ icon: Icon, color = 'blue' }: { icon: React.ElementType; color?: 'blue' | 'cyan' | 'green' }) {
  return <span className={`consultores-icon consultores-icon-${color}`}><Icon size={22} strokeWidth={2.1} /></span>;
}

export default function LandingConsultoresNova() {
  return (
    <div className="consultores-lp consultores-lp-nova">
      <style>{CSS_CONSULTORES_NOVA}</style>
      <nav className="consultores-nav" aria-label="Navegação principal"><div className="consultores-container consultores-nav-inner"><a href="#inicio" className="consultores-brand"><span className="brand-mark">LBW</span><span>Educação pelo Trabalho</span></a><div className="consultores-nav-links"><a href="#alunos">Alunos</a><a href="#empresas">Empresas</a><a href="#consultor">Consultor</a></div><button className="consultores-button consultores-button-small" onClick={scrollToForm}>Quero conhecer <ArrowRight size={16} /></button></div></nav>

      <main>
        <section id="inicio" className="consultores-hero"><div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" /><div className="consultores-container hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> Programa de Consultores LBW</div><h1>Uma plataforma completa para transformar seu conhecimento em uma entrega inesquecível para os seus clientes.</h1><p className="hero-lead">Cursos, projetos, ferramentas da qualidade, análise de dados, comunidades, certificados e inteligência artificial reunidos em um único ambiente com a sua marca.</p><div className="hero-actions"><button className="consultores-button" onClick={scrollToForm}>Quero conhecer a plataforma <ArrowRight size={18} /></button><a className="consultores-button-ghost" href="#video"><Play size={17} fill="currentColor" /> Ver a experiência do aluno</a></div><div className="hero-proof"><span><CheckCircle2 size={16} /> Para consultores de melhoria contínua</span><span><CheckCircle2 size={16} /> Sua metodologia, sua marca</span></div></div><div id="video" className="hero-video-shell"><div className="video-window-bar"><span /><span /><span /><b>Visão do aluno</b></div><div className="hero-video-intro">Veja abaixo como seus clientes vão conhecer e usar a nossa plataforma.</div><div className="hero-video"><iframe title="Conheça a plataforma como o aluno vê" src={VIDEO_ALUNO} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen /></div><div className="video-caption"><span className="video-live-dot" /> Conheça a plataforma como o aluno vê <span>Experiência real da LBW</span></div></div></div><div className="hero-scroll-hint">Role para conhecer a estrutura <span>↓</span></div></section>

        <section className="consultores-audience-strip"><div className="consultores-container audience-grid"><Reveal><div className="audience-card audience-student"><PillarIcon icon={GraduationCap} /><div><small>PARA SEUS</small><h3>Alunos</h3><p>Uma jornada que continua depois da videoaula.</p></div></div></Reveal><Reveal delay={0.08}><div className="audience-card audience-company"><PillarIcon icon={Building2} color="green" /><div><small>PARA SUAS</small><h3>Empresas clientes</h3><p>Gestão de participação, aplicação e resultados.</p></div></div></Reveal><Reveal delay={0.16}><div className="audience-card audience-consultant"><PillarIcon icon={Sparkles} color="cyan" /><div><small>PARA VOCÊ,</small><h3>Consultor</h3><p>Uma estrutura única para entregar e crescer.</p></div></div></Reveal></div></section>

        <section id="alunos" className="consultores-section consultores-light-section"><div className="consultores-container two-column-section"><Reveal className="section-copy"><span className="section-kicker">A experiência que você entrega</span><h2>Seu aluno aprende, aplica e mostra resultado.</h2><p>O aluno não precisa ficar pulando entre vídeos, planilhas e arquivos. A plataforma organiza a jornada e dá contexto para cada próxima ação.</p><a className="text-link" href="#como-funciona">Veja como funciona <ArrowRight size={16} /></a></Reveal><Reveal className="student-board" delay={0.1}><div className="board-top"><span><span className="board-status" /> Seu progresso neste curso</span><strong>68%</strong></div><div className="board-progress"><span /></div><div className="board-flow"><div className="board-flow-step done"><span>✓</span><b>Aprender</b><small>Conteúdo organizado</small></div><div className="board-flow-line" /><div className="board-flow-step active"><span>2</span><b>Aplicar</b><small>Ferramenta em andamento</small></div><div className="board-flow-line" /><div className="board-flow-step"><span>3</span><b>Apresentar</b><small>Próxima etapa</small></div></div><div className="board-bottom"><div><BarChart3 size={18} /><span>Análise de dados sugerida</span></div><div><Bot size={18} /><span>Mentor IA disponível</span></div></div></Reveal></div><div className="consultores-container benefits-grid benefits-grid-student">{beneficiosAluno.map(([title, text, Icon], index) => <Reveal key={title} delay={index * 0.05}><div className="benefit-card"><PillarIcon icon={Icon} color={index % 2 ? 'cyan' : 'blue'} /><h3>{title}</h3><p>{text}</p></div></Reveal>)}</div></section>

        <section id="empresas" className="consultores-section consultores-dark-section"><div className="consultores-container two-column-section company-section-grid"><Reveal className="company-network" delay={0.1}><div className="network-consultor"><Sparkles size={18} /> Sua consultoria</div><div className="network-line vertical" /><div className="network-companies"><div><Building2 size={18} /><b>Empresa A</b><span>32 participantes</span></div><div><Building2 size={18} /><b>Empresa B</b><span>3 projetos ativos</span></div><div><Building2 size={18} /><b>Empresa C</b><span>78% de progresso</span></div></div></Reveal><Reveal className="section-copy section-copy-dark" delay={0.12}><span className="section-kicker">Uma estrutura para cada cliente</span><h2>Mais clareza para a empresa. Mais valor para o seu trabalho.</h2><p>Cada cliente possui um ambiente próprio, com seus participantes, cursos, projetos e informações organizados. Você acompanha tudo sem misturar os dados.</p><div className="check-list">{beneficiosEmpresa.map(item => <div key={item}><CheckCircle2 size={17} /> <span>{item}</span></div>)}</div></Reveal></div></section>

        <section id="consultor" className="consultores-section consultores-light-section consultant-section"><div className="consultores-container section-heading-centered"><span className="section-kicker">O seu sistema de entrega</span><h2>O que antes estava espalhado agora trabalha junto.</h2><p>Você continua sendo o especialista. A LBW organiza a estrutura para que sua metodologia chegue mais longe.</p></div><div className="consultores-container consultant-benefits-grid">{beneficiosConsultor.map(([title, text, Icon], index) => <Reveal key={title} delay={index * 0.06}><div className="consultant-benefit"><PillarIcon icon={Icon} color={index % 3 === 0 ? 'blue' : index % 3 === 1 ? 'green' : 'cyan'} /><h3>{title}</h3><p>{text}</p></div></Reveal>)}</div><Reveal className="consultores-container system-map-wrap"><div className="system-map"><div className="system-map-center"><Sparkles size={27} /><b>LBW</b><small>com a sua marca</small></div>{['Cursos', 'Projetos', 'Ferramentas', 'IA', 'Comunidade', 'Resultados'].map((item, index) => <div key={item} className={`system-map-node system-node-${index}`}><span>{item}</span></div>)}</div></Reveal></section>

        <section id="como-funciona" className="consultores-section workflow-section"><div className="consultores-container section-heading-centered section-heading-white"><span className="section-kicker">Comece de forma simples</span><h2>Da sua metodologia a uma experiência completa.</h2><p>Você configura a estrutura uma vez e pode replicá-la para cada novo cliente.</p></div><div className="consultores-container workflow-grid">{passos.map(([number, title, text], index) => <Reveal key={number} delay={index * 0.05}><div className="workflow-step"><span>{number}</span><h3>{title}</h3><p>{text}</p></div></Reveal>)}</div></section>

        <section className="consultores-section ai-section"><div className="consultores-container ai-card"><div className="ai-glow" /><Reveal className="ai-copy"><span className="section-kicker">Suporte inteligente</span><h2>A IA ajuda a transformar conhecimento em ação.</h2><p>O aluno recebe orientação no contexto do que está fazendo. Você ganha uma estrutura que apoia a aplicação, sem perder a experiência e o olhar do consultor.</p><div className="ai-tags"><span><Bot size={15} /> Orientação</span><span><BarChart3 size={15} /> Análise</span><span><FolderKanban size={15} /> Projetos</span><span><MessageCircle size={15} /> Conversas</span></div></Reveal><Reveal className="ai-visual" delay={0.12}><div className="ai-message ai-message-user">Como começo a analisar este problema?</div><div className="ai-message ai-message-bot"><Bot size={18} /><span>Vamos começar definindo o resultado que você precisa melhorar e quais dados já estão disponíveis.</span></div><div className="ai-cursor" /></Reveal></div></section>

        <section className="consultores-section authority-section"><div className="consultores-container authority-grid"><Reveal className="authority-photo"><img src="/israel-foto.png" alt="Israel Souza" /></Reveal><Reveal className="authority-copy" delay={0.1}><span className="section-kicker">Experiência prática</span><h2>Uma estrutura criada por quem viveu a melhoria na prática.</h2><p>Experiência em 5 multinacionais e 2 países, trabalhando com processos, projetos, treinamentos e desenvolvimento de pessoas em diferentes contextos. A LBW reúne essa experiência em uma plataforma para outros consultores entregarem melhor.</p><div className="authority-numbers"><div><strong>5</strong><span>multinacionais</span></div><div><strong>2</strong><span>países</span></div><div><strong>20+</strong><span>anos de experiência</span></div></div></Reveal></div></section>

        <section className="consultores-section faq-section"><div className="consultores-container section-heading-centered"><span className="section-kicker">Perguntas frequentes</span><h2>Antes de começar, algumas respostas.</h2></div><div className="consultores-container faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>

        <section id="consultores-formulario" className="consultores-form-section"><div className="consultores-container form-layout"><Reveal className="form-intro"><span className="section-kicker">Próximo passo</span><h2>Estruture uma experiência maior para seus alunos e clientes.</h2><p>Conte um pouco sobre sua consultoria. Vou analisar suas respostas pessoalmente e explicar como a LBW pode fazer sentido para o seu trabalho.</p><div className="form-after"><span><ShieldCheck size={18} /> Solicitação analisada pessoalmente</span><span><Users size={18} /> Retorno em até 48 horas</span><span><ArrowRight size={18} /> Configuração acompanhada</span></div></Reveal><Reveal className="consultores-form-card" delay={0.12}><FormularioLead origem="landing-consultores" micro="Sem mensalidade inicial. As vagas iniciais são analisadas pessoalmente." /></Reveal></div></section>
        <section className="consultores-section platform-showcase-section"><div className="consultores-container section-heading-centered"><span className="section-kicker">Dentro da plataforma profissional</span><h2>Templates e análises prontas para você conduzir projetos reais.</h2><p>Modelos profissionais para organizar o projeto da ideia inicial ao encerramento, com recursos estatísticos e ferramentas da qualidade no mesmo ambiente.</p></div><div className="consultores-container platform-showcase"><Reveal className="showcase-block"><div className="showcase-head"><h3>Templates de gerenciamento de projetos prontos para usar</h3><p>Modelos profissionais para conduzir o projeto, da ideia inicial ao encerramento.</p></div><div className="showcase-marquee"><div className="showcase-track">{[...templatesPlataforma, ...templatesPlataforma].map(([title, image], index) => <article className="showcase-card" key={`${title}-${index}`}><div className="showcase-card-image"><img src={image} alt={index < templatesPlataforma.length ? title : ''} loading="lazy" /></div><h4>{title}</h4></article>)}</div></div></Reveal><Reveal className="showcase-block" delay={0.1}><div className="showcase-head"><h3>Recursos do software LBW para análise e melhoria</h3><p>Capabilidade, CEP, MSA, estatística e ferramentas da qualidade para transformar dados em decisões melhores.</p></div><div className="showcase-marquee showcase-marquee-reverse"><div className="showcase-track">{[...recursosSoftware, ...recursosSoftware].map(([title, image], index) => <article className="showcase-card" key={`${title}-${index}`}><div className="showcase-card-image"><img src={image} alt={index < recursosSoftware.length ? title : ''} loading="lazy" /></div><h4>{title}</h4></article>)}</div></div></Reveal></div></section>
      </main>
      <RodapeConsultores />
    </div>
  );
}
