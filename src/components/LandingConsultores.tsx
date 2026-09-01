import React, { useEffect, useRef } from 'react';
import RodapeConsultores from './RodapeConsultores';
import { CSS_CONSULTORES } from './consultores/estilosLanding';
import FormularioLead from './consultores/FormularioLead';


function scrollToForm() {
  document.getElementById('consultores-formulario')?.scrollIntoView({ behavior: 'smooth' });
}

const LISTA_EMPRESA = ['Participantes', 'Treinamentos', 'Projetos', 'Ferramentas', 'Dados', 'Comunidade'];

export default function LandingConsultores() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll('section > .container, .hero .container')) as HTMLElement[];
    elements.forEach(element => element.classList.add('reveal'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.08 });
    elements.forEach(element => observer.observe(element));
    const fallback = window.setTimeout(() => elements.forEach(element => element.classList.add('visible')), 1500);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);


  return (
    <div className="consultores-lp" ref={rootRef}>
      <style>{CSS_CONSULTORES}</style>

      <nav className="topbar" aria-label="Navegação principal">
        <div className="container topbar-inner">
          <div className="topbar-brand">LBW <span>— Educação pelo Trabalho</span></div>
          <button className="cta" onClick={scrollToForm}>Quero conhecer →</button>
        </div>
      </nav>

      <header className="hero">
        <div className="container">
          <span className="eyebrow">LBW — Educação pelo Trabalho</span>
          <h1>Imagine apresentar sua próxima proposta de consultoria assim.</h1>
          <p className="sub">Em vez de entregar treinamentos, ferramentas e acompanhamento separados, ofereça ao cliente um ambiente completo, com a sua marca, que continua com a equipe depois que você sai.</p>
          <div className="media-placeholder"><span>[ VÍDEO DE APRESENTAÇÃO ]</span></div>
          <button className="cta" onClick={scrollToForm}>Quero conhecer a plataforma →</button>
          <p className="proof">20+ anos de experiência · 1.500+ profissionais treinados · US$ 20MM+ em ganhos com projetos</p>
        </div>
      </header>

      <section>
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Você já tem o conhecimento. A estrutura já está pronta.</h2>
          <p className="section-lead">Você traz a sua metodologia, os seus cursos e os seus clientes.</p>
          <p className="section-lead">A LBW fornece a estrutura para transformar tudo isso em uma experiência completa de aprendizagem, aplicação e acompanhamento.</p>
          <div className="split">
            <div className="panel"><h3>VOCÊ TRAZ</h3><ul className="clean-list"><li>Sua metodologia</li><li>Seus cursos e conteúdos</li><li>Sua experiência</li><li>Seus clientes</li></ul></div>
            <div className="panel"><h3>A LBW ENTREGA</h3><ul className="clean-list"><li>A plataforma</li><li>As ferramentas</li><li>A tecnologia</li><li>A estrutura para organizar a entrega</li></ul></div>
          </div>
        </div>
      </section>

      <section className="soft">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Um ambiente próprio para cada empresa que você atende</h2>
          <p className="section-lead">Você configura sua estrutura uma vez e cria um ambiente independente para cada novo cliente.</p>
          <div className="ecosystem">
            <div><div className="consultancy-node">SUA CONSULTORIA</div><div className="arrow">↓</div></div>
            <div className="companies">{['EMPRESA A', 'EMPRESA B', 'EMPRESA C'].map(company => <div className="company" key={company}><strong>{company}</strong>{LISTA_EMPRESA.map(item => <span key={item}>{item}</span>)}</div>)}</div>
          </div>
          <div className="note-stack"><p>Cada empresa acessa apenas o próprio ambiente.</p><p>Os participantes, projetos e informações de um cliente ficam separados dos demais.</p><p>E você acompanha todos os seus clientes em um único lugar.</p></div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">E quem aparece para o cliente é você.</h2>
          <p className="section-lead">A LBW fornece a tecnologia para que você possa entregar a experiência com a identidade da sua própria consultoria.</p>
          <div className="screens"><div className="screen">[ SCREENSHOT — CONSULTORIA A ]</div><div className="screen">[ SCREENSHOT — CONSULTORIA B ]</div></div>
          <div className="brand-grid"><div>Sua logo</div><div>Suas cores</div><div>Seus certificados</div><div>Suas apresentações</div></div>
          <h3 className="statement">A tecnologia é da LBW. A experiência do seu cliente é sua.</h3>
        </div>
      </section>

      <section className="dark">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">O treinamento é só o começo.</h2>
          <p className="section-lead">Uma plataforma tradicional ajuda você a entregar conteúdo.</p>
          <p className="section-lead">A LBW foi criada para ajudar a transformar esse conteúdo em aplicação prática dentro da empresa.</p>
          <div className="journey">
            <div className="journey-step"><h3>APRENDER</h3><p>Cursos e treinamentos organizados dentro da plataforma.</p></div>
            <div className="journey-step"><h3>APLICAR</h3><p>Ferramentas de qualidade e melhoria prontas para serem utilizadas.</p></div>
            <div className="journey-step"><h3>ANALISAR</h3><p>Software estatístico LBW para apoiar análises e decisões com dados.</p></div>
            <div className="journey-step"><h3>DESENVOLVER</h3><p>Projetos de melhoria estruturados dentro da plataforma, com apoio de IA durante o desenvolvimento.</p></div>
            <div className="journey-step"><h3>APRESENTAR</h3><p>Informações e resultados organizados para apoiar a apresentação dos projetos.</p></div>
            <div className="journey-step"><h3>ACOMPANHAR</h3><p>Visão dos participantes, treinamentos e projetos em um único ambiente.</p></div>
          </div>
          <div className="triple-screens"><div className="screen">[ SCREENSHOT — FERRAMENTA DE MELHORIA ]</div><div className="screen">[ SCREENSHOT — ANÁLISE ESTATÍSTICA ]</div><div className="screen">[ SCREENSHOT — PROJETO / APRESENTAÇÃO ]</div></div>
          <h3 className="statement" style={{ color: '#fff' }}>O aprendizado não termina quando o aluno termina o vídeo.</h3>
          <div style={{ textAlign: 'center', marginTop: 30 }}><button className="cta" onClick={scrollToForm}>Quero ver a LBW funcionando →</button></div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Sua entrega não precisa depender apenas das horas que você está com o cliente.</h2>
          <div className="paragraph-stack"><p>Hoje, parte importante do trabalho de uma consultoria ainda acontece de forma separada.</p><p>O treinamento fica em um lugar.</p><p>Os materiais em outro.</p><p>Os projetos em planilhas.</p><p>As ferramentas em arquivos diferentes.</p><p>E o acompanhamento muitas vezes depende diretamente do consultor.</p><p>Com a LBW, você passa a ter uma estrutura que continua disponível para o cliente entre uma interação e outra.</p></div>
          <div className="compare">
            <div className="panel"><h3>SEM UMA ESTRUTURA ÚNICA</h3><ul className="clean-list"><li>Treinamentos separados</li><li>Materiais enviados manualmente</li><li>Planilhas por cliente</li><li>Projetos espalhados</li><li>Controles paralelos</li><li>Acompanhamento descentralizado</li></ul></div>
            <div className="panel"><h3>COM A LBW</h3><ul className="clean-list"><li>Conteúdo organizado</li><li>Ferramentas disponíveis</li><li>Projetos no mesmo ambiente</li><li>Participantes acompanhados</li><li>Informações centralizadas</li><li>Estrutura replicável para novos clientes</li></ul></div>
          </div>
          <p className="section-lead" style={{ marginTop: 38, marginBottom: 0 }}>E, na prática, isso também significa menos tempo gasto criando apresentações do zero, procurando arquivos, atualizando controles paralelos e organizando materiais para cada cliente.</p>
        </div>
      </section>

      <section className="soft">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Uma entrega mais completa muda a conversa com o cliente.</h2>
          <p className="section-lead">Hoje, uma proposta pode terminar assim:</p>
          <div className="proposal"><div className="quote"><strong>“Vamos realizar o treinamento e depois eu envio os materiais para a equipe.”</strong></div><div className="proposal-arrow">→</div><div className="quote"><strong>“Além do treinamento, sua equipe terá um ambiente próprio para acessar os conteúdos, utilizar as ferramentas, desenvolver os projetos e acompanhar a aplicação.”</strong></div></div>
          <div className="paragraph-stack"><p>Você não está apenas adicionando tecnologia à sua consultoria.</p><h3 className="statement">Está criando uma forma mais estruturada de entregar a sua metodologia.</h3><p>E essa estrutura continua disponível para o cliente mesmo quando você não está presente.</p></div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Como funciona na prática</h2>
          <p className="section-lead">Você não precisa desenvolver software nem montar uma estrutura diferente para cada nova empresa.</p>
          <div className="steps">
            <div className="step"><h3>Configure sua consultoria</h3><p>Adicione sua identidade e prepare o ambiente com a sua marca.</p></div>
            <div className="step"><h3>Adicione seus conteúdos</h3><p>Publique os treinamentos, materiais e conteúdos que fazem parte da sua metodologia.</p></div>
            <div className="step"><h3>Crie o ambiente do seu cliente</h3><p>Cadastre uma nova empresa e escolha o que estará disponível para ela.</p></div>
            <div className="step"><h3>Adicione os participantes</h3><p>A equipe do cliente recebe acesso ao próprio ambiente.</p></div>
            <div className="step"><h3>Acompanhe tudo</h3><p>Treinamentos, participantes, ferramentas e projetos ficam organizados dentro da plataforma.</p></div>
          </div>
          <h3 className="statement">Você configura a estrutura. Depois, replica para cada novo cliente.</h3>
        </div>
      </section>

      <section className="soft">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">A LBW faz sentido para você se...</h2>
          <div className="audience">
            <div className="panel"><ul className="clean-list"><li>Você presta consultoria ou treinamento para empresas.</li><li>Trabalha com melhoria contínua, qualidade, processos, projetos ou áreas relacionadas.</li><li>Já possui conhecimento, metodologia ou treinamentos próprios.</li><li>Quer estruturar melhor a experiência que entrega aos seus clientes.</li><li>Atende ou pretende atender diferentes empresas.</li><li>Quer oferecer algo além de treinamento, apresentações e arquivos separados.</li></ul></div>
            <div className="panel"><h3>Talvez ainda não faça sentido para você se...</h3><ul className="clean-list"><li>Você procura apenas um lugar para hospedar vídeos.</li><li>Trabalha exclusivamente com cursos vendidos diretamente para pessoas físicas.</li><li>Não pretende utilizar a plataforma com empresas.</li><li>Procura apenas uma ferramenta isolada para uma atividade específica.</li></ul></div>
          </div>
        </div>
      </section>

      <section className="dark">
        <div className="container founder">
          <img src="/israel-foto.png" alt="Israel Souza" loading="lazy" />
          <div>
            <div className="kicker">Quem está por trás da LBW</div>
            <h2>Israel Souza</h2>
            <h3>Por que eu criei a LBW</h3>
            <p>Depois de mais de 20 anos trabalhando com melhoria de processos, projetos e treinamentos, uma situação sempre me chamou atenção.</p>
            <p>Profissionais muito bons no que fazem ainda dependem de uma combinação de apresentações, planilhas, arquivos, ferramentas separadas e controles manuais para conseguir entregar e acompanhar o trabalho com seus clientes.</p>
            <p>E quanto mais clientes entram, mais difícil fica manter tudo organizado sem aumentar também o trabalho administrativo.</p>
            <p>Foi a partir desse problema que comecei a construir a LBW.</p>
            <p>A ideia era simples:</p>
            <h3 className="idea">Criar a estrutura que eu gostaria de ter tido durante todos esses anos trabalhando com melhoria e desenvolvimento de projetos.</h3>
            <p>Um lugar onde conhecimento, ferramentas, análise e projetos pudessem fazer parte da mesma experiência.</p>
            <p>Hoje, essa mesma estrutura pode ser utilizada por outros consultores com os próprios clientes e com a própria marca.</p>
            <div className="stats"><div className="stat"><strong>20+ ANOS</strong><span>de experiência profissional</span></div><div className="stat"><strong>1.500+</strong><span>profissionais treinados</span></div><div className="stat"><strong>US$ 20MM+</strong><span>em ganhos gerados por projetos</span></div><div className="stat"><strong>EXPERIÊNCIA PRÁTICA</strong><span>em multinacionais e no setor público</span></div></div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Conheça a LBW e solicite sua participação.</h2>
          <p className="section-lead">As primeiras vagas do Programa de Consultores LBW — Educação pelo Trabalho serão avaliadas pessoalmente.</p>
          <div className="live-flow">
            <div className="live-card"><h3>Envie sua solicitação</h3><p>Preencha seus dados e conte brevemente sobre seu curso e sua atuação.</p></div>
            <div className="live-card"><h3>Receba a aprovação</h3><p>As solicitações são avaliadas para garantir que as vagas iniciais sejam ocupadas por consultores com perfil e intenção de ativação.</p></div>
            <div className="live-card"><h3>Configure sua plataforma</h3><p>Após a aprovação, você recebe o acesso, conhece a plataforma como aluno e começa a estruturar sua própria solução.</p></div>
          </div>
          <div className="next-date">Não há mensalidade inicial. As regras de participação comercial são explicadas com transparência dentro da plataforma.</div>
        </div>
      </section>

      <section className="dark">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Perguntas frequentes</h2>
          <div className="faq">
            <details open><summary>Posso colocar meus próprios cursos e materiais?</summary><div className="answer"><p>Sim. Você pode cadastrar seus próprios treinamentos e conteúdos e disponibilizá-los para as empresas que atende.</p></div></details>
            <details><summary>Posso usar a minha própria marca?</summary><div className="answer"><p>Sim. A proposta da LBW é permitir que você apresente a experiência com a identidade da sua consultoria.</p></div></details>
            <details><summary>Meu cliente verá a marca LBW?</summary><div className="answer"><p>A LBW fica por trás da tecnologia. O objetivo é que a experiência entregue ao cliente seja apresentada com a identidade da sua consultoria.</p></div></details>
            <details><summary>Cada empresa fica separada das outras?</summary><div className="answer"><p>Sim. Cada empresa possui seu próprio ambiente, com seus participantes, treinamentos, projetos e informações.</p><p>Um cliente não acessa os dados de outro.</p></div></details>
            <details><summary>Posso atender várias empresas ao mesmo tempo?</summary><div className="answer"><p>Sim. Você pode criar ambientes para diferentes empresas e acompanhar seus clientes de forma centralizada.</p></div></details>
            <details><summary>Preciso saber programar?</summary><div className="answer"><p>Não.</p><p>A plataforma foi desenvolvida para que você consiga cadastrar conteúdos, empresas e participantes sem precisar desenvolver software.</p></div></details>
            <details><summary>Como funciona a conversa individual?</summary><div className="answer"><p>A conversa individual é opcional e será liberada após você concluir a fase Consultor Comece por aqui, incluindo o cadastro de seu primeiro curso com vídeo.</p></div></details>
            <details><summary>Existe mensalidade inicial?</summary><div className="answer"><p>Não existe mensalidade inicial para participar do programa.</p><p>Após a aprovação, você conhecerá as regras de participação comercial com transparência dentro da plataforma.</p></div></details>
          </div>
        </div>
      </section>

      <section className="form-section" id="consultores-formulario">
        <div className="container form-shell">
          <div className="form-copy">
            <div className="accent-line" style={{ marginLeft: 0 }} />
            <h2 className="section-title">Quer estruturar uma solução completa para seus próximos clientes?</h2>
            <p>Envie sua solicitação para participar do Programa de Consultores LBW — Educação pelo Trabalho.</p>
            <p>Se for aprovado, você receberá acesso à sua área de consultor e ao curso demonstrativo gratuito para conhecer a experiência do aluno.</p>
            <p><strong>As vagas iniciais são analisadas pessoalmente.</strong></p>
          </div>
          <div className="form-card">
            <FormularioLead
              origem="landing-consultores"
              micro="Sem mensalidade inicial. As vagas iniciais são limitadas e analisadas pessoalmente."
            />
          </div>
        </div>
      </section>

      <RodapeConsultores />
    </div>
  );
}
