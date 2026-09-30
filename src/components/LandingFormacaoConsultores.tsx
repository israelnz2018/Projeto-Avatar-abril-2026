/**
 * LandingFormacaoConsultores — /consultoresLBW
 *
 * A oferta aqui é a FORMAÇÃO: cursos + 10 encontros ao vivo com o Israel +
 * certificados + a plataforma. O público é o profissional que tem experiência
 * em processos mas ainda não atua (ou está começando) como consultor.
 *
 * Não confundir com /consultores (LandingConsultoresNova), que vende a
 * PLATAFORMA para quem já é consultor e já tem curso gravado. São duas ofertas
 * e dois públicos; misturar as duas numa página só confunde quem chega pelo
 * anúncio.
 *
 * O preço aparece na página de propósito: filtra curioso e evita a sensação de
 * armadilha de descobrir o valor só no fim. O desconto de fundador é real e sai
 * na apresentação ao vivo, com prazo — é o que dá motivo para comparecer, que é
 * o gargalo deste tipo de funil.
 */
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Award, ArrowRight, BarChart3, Bot, Building2, CalendarDays, CheckCircle2,
  ChevronDown, FolderKanban, GraduationCap, MessageCircle, Play, ShieldCheck,
  Sparkles, Users, Wrench,
} from 'lucide-react';
import RodapeConsultores from './RodapeConsultores';
import { CSS_CONSULTORES_NOVA } from './consultores/estilosLandingNova';
import { CSS_FORMACAO_EXTRA } from './consultores/estilosFormacao';
import FormularioFormacao from './consultores/FormularioFormacao';

const VIDEO_ALUNO = 'https://iframe.mediadelivery.net/embed/718588/dbd34562-3136-4144-8f61-eb910dc7a9a1?preload=true';

/** O agendamento da apresentação. Vazio = o formulário só registra o contato. */
const URL_APRESENTACAO = String(import.meta.env.VITE_APRESENTACAO_URL || '').trim();

const PRECO_FUNDADOR = 'R$ 2.997';
const PRECO_CHEIO = 'R$ 4.997';
const PARCELA_FUNDADOR = '12x de R$ 299';

function irParaFormulario() {
  document.getElementById('formacao-inscricao')?.scrollIntoView({ behavior: 'smooth' });
}

/* ---------------------------------------------------------------- */

const paraQuem = [
  ['Trabalha com processos e quer sair do CLT', 'Você já conduz melhorias dentro da empresa. Falta estruturar isso como um serviço que se vende.', Building2],
  ['Já fez cursos, mas não sabe como começar', 'Conhecimento técnico você tem. O que falta é o caminho para transformar em entrega e em cliente.', GraduationCap],
  ['Já atua, mas de forma desorganizada', 'Cada projeto é do zero, em planilhas soltas. Falta um método e uma estrutura que se repita.', FolderKanban],
] as const;

const oQueRecebe = [
  ['Todos os cursos da LBW', 'White, Yellow e Green Belt, estatística aplicada, ferramentas da qualidade e gestão de projetos. A base técnica completa.', GraduationCap],
  ['10 encontros ao vivo comigo', 'Uma sessão por semana, cada uma sobre um tema independente. Você entra na próxima e vai completando o ciclo.', Users],
  ['A plataforma com a sua marca', 'O mesmo ambiente que você está vendo, para você atender seus clientes: cursos, projetos, ferramentas e relatórios.', Sparkles],
  ['10 certificados', 'Um para cada formação concluída, para comprovar sua qualificação com clientes e empresas.', Award],
  ['Ferramentas e templates prontos', 'Matriz GUT, SIPOC, FMEA, 5W2H, espinha de peixe, cronograma. Você não monta nada do zero.', Wrench],
  ['Produção de conteúdo automática', 'A plataforma transforma suas aulas em cortes para Reels e carrosséis, para você divulgar seu trabalho.', Bot],
] as const;

const encontros = [
  'Como definir seu nicho e sua primeira oferta',
  'Precificação: quanto cobrar por projeto e por hora',
  'Como encontrar e abordar as primeiras empresas',
  'Conduzindo o diagnóstico inicial do cliente',
  'Estruturando um projeto de melhoria do começo ao fim',
  'Apresentando resultados que a diretoria entende',
  'Montando e vendendo treinamentos internos',
  'Usando dados para sustentar suas recomendações',
  'Escalando: de consultor solo a operação',
  'Construindo autoridade e gerando demanda',
];

const passos = [
  ['01', 'Participe da apresentação', 'São 40 minutos ao vivo. Você conhece o programa, vê a plataforma por dentro e tira suas dúvidas.'],
  ['02', 'Entre com a condição de fundador', 'Quem participa ao vivo recebe o valor especial, válido por 48 horas.'],
  ['03', 'Comece no próximo encontro', 'Não há turma para esperar. Você entra na sessão da semana seguinte.'],
  ['04', 'Configure sua plataforma', 'Sua marca, seus cursos, seus certificados. Acompanhado por mim.'],
  ['05', 'Feche seu primeiro cliente', 'Com método, material e estrutura prontos para apresentar.'],
];

const faqs = [
  ['Preciso já ser consultor para participar?',
    'Não. O programa foi feito para quem tem experiência em processos, qualidade ou melhoria contínua e quer começar a atuar como consultor. Se você já atua, o programa ajuda a organizar e ampliar a sua entrega.'],
  ['Quanto custa?',
    `O valor é ${PRECO_CHEIO}, que pode ser parcelado. Quem participa da apresentação ao vivo recebe a condição de fundador: ${PRECO_FUNDADOR}, ou ${PARCELA_FUNDADOR}. Essa condição é limitada às primeiras vagas e vale por 48 horas depois da apresentação.`],
  ['Vocês entregam clientes para mim?',
    'Não. A prospecção é sua. O que o programa entrega é a formação, o método, o material e a estrutura para você conduzir o trabalho — e três dos dez encontros tratam justamente de como encontrar e abordar empresas.'],
  ['Quanto tempo por semana eu preciso ter?',
    'Os encontros ao vivo são de cerca de uma hora por semana. Os cursos você faz no seu ritmo. A configuração inicial da plataforma leva algumas horas, uma vez só.'],
  ['Os encontros têm data de início? E se eu perder um?',
    'Não há turma com data de início. Cada encontro trata de um tema independente e o ciclo se repete, então você entra na próxima sessão e vai completando os dez no seu ritmo. Se perder um, ele volta no próximo ciclo.'],
  ['Preciso ter curso gravado ou material pronto?',
    'Não. Você recebe todos os cursos da LBW para usar com seus clientes. Se quiser cadastrar material próprio depois, a plataforma permite.'],
  ['Preciso saber de tecnologia?',
    'Não. A configuração é feita dentro da própria plataforma, apontando e clicando, e é acompanhada por mim.'],
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

/* ---------------------------------------------------------------- */

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={reduced ? undefined : { duration: 0.65, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function PillarIcon({ icon: Icon, color = 'blue' }: { icon: React.ElementType; color?: 'blue' | 'cyan' | 'green' }) {
  return <span className={`consultores-icon consultores-icon-${color}`}><Icon size={22} strokeWidth={2.1} /></span>;
}

function Vitrine() {
  return (
    <section className="consultores-section platform-showcase-section">
      <div className="consultores-container section-heading-centered">
        <span className="section-kicker">O que você vai usar com seus clientes</span>
        <h2>Templates e análises prontas, desde o primeiro projeto.</h2>
        <p>Você não precisa montar material do zero. Os modelos e as análises já vêm prontos dentro da plataforma.</p>
      </div>
      <div className="consultores-container platform-showcase">
        <Reveal className="showcase-block">
          <div className="showcase-head">
            <h3>Templates de gerenciamento de projetos</h3>
            <p>Para conduzir o projeto do cliente, da ideia inicial ao encerramento.</p>
          </div>
          <div className="showcase-marquee">
            <div className="showcase-track">
              {[...templatesPlataforma, ...templatesPlataforma].map(([title, image], index) => (
                <article className="showcase-card" key={`${title}-${index}`}>
                  <div className="showcase-card-image"><img src={image} alt={index < templatesPlataforma.length ? title : ''} loading="lazy" /></div>
                  <h4>{title}</h4>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal className="showcase-block" delay={0.1}>
          <div className="showcase-head">
            <h3>Recursos de análise do software LBW</h3>
            <p>Capabilidade, CEP, MSA e estatística para sustentar suas recomendações com dados.</p>
          </div>
          <div className="showcase-marquee showcase-marquee-reverse">
            <div className="showcase-track">
              {[...recursosSoftware, ...recursosSoftware].map(([title, image], index) => (
                <article className="showcase-card" key={`${title}-${index}`}>
                  <div className="showcase-card-image"><img src={image} alt={index < recursosSoftware.length ? title : ''} loading="lazy" /></div>
                  <h4>{title}</h4>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

export default function LandingFormacaoConsultores() {
  return (
    <div className="consultores-lp consultores-lp-nova formacao-lp">
      <style>{CSS_CONSULTORES_NOVA}</style>
      <style>{CSS_FORMACAO_EXTRA}</style>

      <nav className="consultores-nav" aria-label="Navegação principal">
        <div className="consultores-container consultores-nav-inner">
          <a href="#inicio" className="consultores-brand">
            <span className="brand-mark">LBW</span><span>Educação pelo Trabalho</span>
          </a>
          <div className="consultores-nav-links">
            <a href="#programa">O programa</a>
            <a href="#encontros">Encontros</a>
            <a href="#investimento">Investimento</a>
          </div>
          <button className="consultores-button consultores-button-small" onClick={irParaFormulario}>
            Reservar vaga <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section id="inicio" className="consultores-hero">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="consultores-container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> Formação de Consultores LBW</div>
              <h1>Transforme sua experiência em processos em uma consultoria que se sustenta.</h1>
              <p className="hero-lead">
                Formação completa, dez encontros ao vivo comigo e a plataforma pronta para você
                atender seus primeiros clientes. Para quem tem a experiência técnica e quer o
                caminho para atuar como consultor.
              </p>
              <div className="hero-actions">
                <button className="consultores-button" onClick={irParaFormulario}>
                  Reservar vaga na apresentação <ArrowRight size={18} />
                </button>
                <a className="consultores-button-ghost" href="#video">
                  <Play size={17} fill="currentColor" /> Ver a plataforma
                </a>
              </div>
              <div className="hero-proof">
                <span><CheckCircle2 size={16} /> Apresentação ao vivo e gratuita</span>
                <span><CheckCircle2 size={16} /> 40 minutos</span>
              </div>
            </div>

            <div id="video" className="hero-video-shell">
              <div className="video-window-bar"><span /><span /><span /><b>Visão do aluno</b></div>
              <div className="hero-video-intro">Veja a plataforma que vai ser sua, do jeito que seu cliente vai ver.</div>
              <div className="hero-video">
                <iframe
                  title="Conheça a plataforma"
                  src={VIDEO_ALUNO}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="video-caption">
                <span className="video-live-dot" /> A plataforma por dentro <span>Experiência real da LBW</span>
              </div>
            </div>
          </div>
          <div className="hero-scroll-hint">Role para conhecer o programa <span>↓</span></div>
        </section>

        {/* PARA QUEM É */}
        <section className="consultores-section consultores-light-section">
          <div className="consultores-container section-heading-centered">
            <span className="section-kicker">Para quem é</span>
            <h2>Você tem o conhecimento. Falta a estrutura.</h2>
            <p>A maior parte de quem trabalha com melhoria de processos já sabe fazer. O que trava é transformar isso em um serviço, com método, material e clientes.</p>
          </div>
          <div className="consultores-container benefits-grid benefits-grid-student">
            {paraQuem.map(([title, text, Icon], index) => (
              <Reveal key={title} delay={index * 0.06}>
                <div className="benefit-card">
                  <PillarIcon icon={Icon} color={index % 2 ? 'cyan' : 'blue'} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* O QUE RECEBE */}
        <section id="programa" className="consultores-section consultores-dark-section">
          <div className="consultores-container section-heading-centered section-heading-white">
            <span className="section-kicker">O que está incluso</span>
            <h2>Tudo que você precisa para começar a atuar.</h2>
            <p>Formação técnica, acompanhamento ao vivo e a estrutura para entregar. Não é um curso gravado: é o sistema completo.</p>
          </div>
          <div className="consultores-container consultant-benefits-grid">
            {oQueRecebe.map(([title, text, Icon], index) => (
              <Reveal key={title} delay={index * 0.05}>
                <div className="consultant-benefit formacao-incluso">
                  <PillarIcon icon={Icon} color={index % 3 === 0 ? 'blue' : index % 3 === 1 ? 'green' : 'cyan'} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* OS 10 ENCONTROS */}
        <section id="encontros" className="consultores-section consultores-light-section">
          <div className="consultores-container two-column-section">
            <Reveal className="section-copy">
              <span className="section-kicker">Os dez encontros</span>
              <h2>Uma sessão por semana, ao vivo, comigo.</h2>
              <p>
                Cada encontro trata de um tema independente, então <strong>não há turma para esperar</strong>:
                você entra na próxima sessão e vai completando o ciclo no seu ritmo.
              </p>
              <p>
                São os assuntos que ninguém ensina em curso técnico — como precificar, como abordar
                empresas, como apresentar resultado para a diretoria.
              </p>
              <div className="formacao-destaque">
                <CalendarDays size={18} />
                <span>Toda semana, no mesmo dia e horário. Se perder um, ele volta no próximo ciclo.</span>
              </div>
            </Reveal>
            <Reveal className="formacao-encontros" delay={0.1}>
              {encontros.map((tema, index) => (
                <div className="formacao-encontro" key={tema}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{tema}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <Vitrine />

        {/* COMO FUNCIONA */}
        <section className="consultores-section workflow-section">
          <div className="consultores-container section-heading-centered section-heading-white">
            <span className="section-kicker">Como funciona</span>
            <h2>Do primeiro contato ao primeiro cliente.</h2>
          </div>
          <div className="consultores-container workflow-grid">
            {passos.map(([number, title, text], index) => (
              <Reveal key={number} delay={index * 0.05}>
                <div className="workflow-step">
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* AUTORIDADE */}
        <section className="consultores-section authority-section">
          <div className="consultores-container authority-grid">
            <Reveal className="authority-photo"><img src="/israel-foto.png" alt="Israel Souza" /></Reveal>
            <Reveal className="authority-copy" delay={0.1}>
              <span className="section-kicker">Quem conduz</span>
              <h2>Quem vai te acompanhar nos dez encontros.</h2>
              <p>
                Experiência em 5 multinacionais e 2 países, trabalhando com processos, projetos,
                treinamentos e desenvolvimento de pessoas. Os encontros são comigo, ao vivo, e é ali
                que você traz o seu caso concreto.
              </p>
              <div className="authority-numbers">
                <div><strong>5</strong><span>multinacionais</span></div>
                <div><strong>2</strong><span>países</span></div>
                <div><strong>20+</strong><span>anos de experiência</span></div>
                <div><strong>1.500+</strong><span>profissionais treinados</span></div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* INVESTIMENTO */}
        <section id="investimento" className="consultores-section formacao-preco-section">
          <div className="consultores-container section-heading-centered">
            <span className="section-kicker">Investimento</span>
            <h2>Um projeto de consultoria paga a formação inteira.</h2>
            <p>Um consultor independente cobra entre R$ 2.000 e R$ 10.000 por projeto numa pequena ou média empresa. O primeiro cliente cobre o investimento.</p>
          </div>

          <Reveal className="consultores-container formacao-preco-grid">
            <div className="formacao-preco-card">
              <div className="formacao-preco-selo">Condição de fundador</div>
              <p className="formacao-preco-de">De {PRECO_CHEIO} por</p>
              <div className="formacao-preco-valor">
                <strong>{PRECO_FUNDADOR}</strong>
                <span>ou {PARCELA_FUNDADOR}</span>
              </div>
              <ul className="formacao-preco-lista">
                <li><CheckCircle2 size={17} /> Todos os cursos da LBW</li>
                <li><CheckCircle2 size={17} /> Os 10 encontros ao vivo comigo</li>
                <li><CheckCircle2 size={17} /> A plataforma com a sua marca</li>
                <li><CheckCircle2 size={17} /> 10 certificados</li>
                <li><CheckCircle2 size={17} /> Templates e ferramentas prontos</li>
                <li><CheckCircle2 size={17} /> Produção de conteúdo automática</li>
              </ul>
              <button className="consultores-button formacao-preco-cta" onClick={irParaFormulario}>
                Quero a condição de fundador <ArrowRight size={18} />
              </button>
              <p className="formacao-preco-micro">
                A condição de fundador é liberada na apresentação ao vivo, para as primeiras vagas.
              </p>
            </div>

            <div className="formacao-preco-lado">
              <Reveal>
                <div className="formacao-lado-card">
                  <ShieldCheck size={22} />
                  <h3>Por que existe a apresentação</h3>
                  <p>
                    Antes de investir, você precisa ver a plataforma funcionando e entender o método.
                    São 40 minutos ao vivo, sem compromisso, e é ali que tiro suas dúvidas diretamente.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="formacao-lado-card">
                  <MessageCircle size={22} />
                  <h3>Prefere conversar antes?</h3>
                  <p>
                    Se o seu caso for específico e você quiser avaliar comigo individualmente, dá para
                    marcar uma conversa depois da apresentação. A condição de fundador continua valendo.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.16}>
                <div className="formacao-lado-card formacao-lado-destaque">
                  <BarChart3 size={22} />
                  <h3>A conta que importa</h3>
                  <p>
                    Um único projeto de melhoria numa empresa média paga a formação. A partir do
                    segundo, é margem.
                  </p>
                </div>
              </Reveal>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="consultores-section faq-section">
          <div className="consultores-container section-heading-centered">
            <span className="section-kicker">Perguntas frequentes</span>
            <h2>As dúvidas que todo mundo tem.</h2>
          </div>
          <div className="consultores-container faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<ChevronDown size={18} /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* INSCRIÇÃO */}
        <section id="formacao-inscricao" className="consultores-form-section">
          <div className="consultores-container form-layout">
            <Reveal className="form-intro">
              <span className="section-kicker">Próximo passo</span>
              <h2>Reserve sua vaga na apresentação ao vivo.</h2>
              <p>
                São 40 minutos: você conhece o programa, vê a plataforma por dentro e tira suas
                dúvidas comigo. Quem participa recebe a condição de fundador.
              </p>
              <div className="form-after">
                <span><CalendarDays size={18} /> Ao vivo, toda semana</span>
                <span><ShieldCheck size={18} /> Gratuita e sem compromisso</span>
                <span><Users size={18} /> Vagas limitadas por sessão</span>
              </div>
            </Reveal>
            <Reveal className="consultores-form-card" delay={0.12}>
              <FormularioFormacao origem="landing-formacao-consultores" urlAgendamento={URL_APRESENTACAO} />
            </Reveal>
          </div>
        </section>
      </main>

      <RodapeConsultores />
    </div>
  );
}
