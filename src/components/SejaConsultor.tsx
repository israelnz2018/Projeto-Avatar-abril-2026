/**
 * SejaConsultor — a aba "Tenha sua própria plataforma como consultor", dentro
 * da Área do Aluno.
 *
 * O público aqui NÃO é o aluno que virou consultor: é o consultor que já é
 * consultor e entrou na plataforma como aluno pra conhecê-la por dentro. Por
 * isso o texto fala com quem já tem método, curso e cliente.
 *
 * Usa o mesmo desenho da landing pública (CSS_CONSULTORES) e o mesmo
 * formulário (FormularioLead), que posta no mesmo /api/leads-consultor e cai na
 * mesma tela de aprovação do admin. Só o campo `origem` muda, pra separar quem
 * veio de dentro da plataforma de quem veio da landing.
 */
import React, { useEffect, useRef } from 'react';
import { auth } from '../lib/firebase';
import { CSS_CONSULTORES } from './consultores/estilosLanding';
import FormularioLead from './consultores/FormularioLead';

/**
 * Ajuste só desta aba: na landing o formulário fica ao lado do texto (duas
 * colunas). Aqui o texto vem em cima e o formulário embaixo, centralizados.
 */
const CSS_NA_ABA = `
.consultores-lp .form-empilhado{display:block}
.consultores-lp .form-empilhado .form-copy{max-width:780px;margin:0 auto 36px;text-align:center}
.consultores-lp .form-empilhado .form-copy h2{text-align:center}
.consultores-lp .form-empilhado .form-card{width:min(100%,620px);margin:0 auto}
`;

const AMBIENTE_CLIENTE = [
  'Seus treinamentos',
  'Suas ferramentas',
  'Seus materiais',
  'Os projetos da equipe',
  'Os participantes',
  'Os certificados',
  'A comunidade interna',
];

function irParaFormulario() {
  document.getElementById('consultor-formulario')?.scrollIntoView({ behavior: 'smooth' });
}

export default function SejaConsultor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const usuario = auth.currentUser;

  // Mesma animação de entrada da landing.
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
    // A Layout envolve as páginas num `p-8`. As faixas desta página são
    // full-bleed (hero escuro, seções `soft`/`dark`), então a margem negativa
    // cancela exatamente esse padding e as faixas encostam nas bordas.
    <div className="consultores-lp" ref={rootRef} style={{ margin: '-2rem' }}>
      <style>{CSS_CONSULTORES}{CSS_NA_ABA}</style>

      <header className="hero">
        <div className="container">
          <span className="eyebrow">Programa de Consultores LBW</span>
          <h1>Sua consultoria pode ter uma plataforma própria.</h1>
          <p className="sub">
            Você já conhece a LBW por dentro. Agora imagine a mesma estrutura com os seus vídeos,
            a sua metodologia, a sua marca e os seus clientes.
          </p>
          <p className="sub">
            Em vez de entregar apenas treinamento, PowerPoint, planilhas e acompanhamento por WhatsApp,
            você passa a entregar uma plataforma completa para cada empresa que atende. E essa plataforma
            aparece para o cliente como parte da sua consultoria.
          </p>
          <button className="cta" onClick={irParaFormulario}>Quero ter minha própria plataforma →</button>
        </div>
      </header>

      <section className="soft">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Coloque seus cursos aqui.</h2>
          <p className="section-lead">
            Você grava uma vez. Depois pode usar o mesmo treinamento com diferentes clientes,
            sem precisar montar toda a estrutura novamente.
          </p>
          <div className="narrow">
            <div className="panel">
              <ul className="clean-list">
                <li>Seus vídeos ficam organizados dentro da sua plataforma</li>
                <li>Seus materiais ficam juntos</li>
                <li>Seus certificados saem com a sua identidade</li>
                <li>Seus clientes acessam pelo seu endereço</li>
              </ul>
            </div>
          </div>
          <div className="next-date">suaconsultoria.educacaopelotrabalho.com</div>
          <h3 className="statement">Para o cliente, aquilo é parte da sua empresa.</h3>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Cada novo cliente pode receber uma plataforma própria.</h2>
          <p className="section-lead">
            Imagine fechar um contrato com uma empresa. Em vez de enviar links de vídeos, PDFs, planilhas,
            arquivos por e-mail e apresentações separadas, você simplesmente cria o ambiente daquele cliente.
          </p>
          <div className="ecosystem">
            <div>
              <div className="consultancy-node">SUA CONSULTORIA</div>
              <div className="arrow">↓</div>
            </div>
            <div className="companies">
              {['EMPRESA A', 'EMPRESA B', 'EMPRESA C'].map(empresa => (
                <div className="company" key={empresa}>
                  <strong>{empresa}</strong>
                  {AMBIENTE_CLIENTE.map(item => <span key={item}>{item}</span>)}
                </div>
              ))}
            </div>
          </div>
          <div className="note-stack">
            <p>E tudo fica separado dos seus outros clientes.</p>
            <p>Você administra todos em um único lugar.</p>
          </div>
        </div>
      </section>

      <section className="dark">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Isso muda o que você consegue vender.</h2>
          <p className="section-lead">Você deixa de vender somente:</p>
          <div className="proposal">
            <div className="quote"><strong>“Treinamento Lean Six Sigma.”</strong></div>
            <div className="proposal-arrow">→</div>
            <div className="quote">
              <strong>
                “Sua empresa terá acesso à minha metodologia dentro de uma plataforma exclusiva
                para desenvolver pessoas e acompanhar projetos.”
              </strong>
            </div>
          </div>
          <div className="paragraph-stack" style={{ color: '#c6d2eb' }}>
            <p>A percepção de valor muda. Sua consultoria parece mais estruturada e sua entrega fica mais profissional.</p>
            <p>E você passa a ter algo que continua dentro do cliente depois que a aula termina.</p>
            <p>
              Hoje, grande parte do conhecimento de um consultor está na cabeça, em apresentações, arquivos,
              vídeos, planilhas e templates. Aqui, isso vira uma estrutura que pode ser reutilizada com vários clientes.
            </p>
          </div>
          <h3 className="statement" style={{ color: '#fff' }}>Você cria uma vez. Depois replica.</h3>
        </div>
      </section>

      <section className="soft">
        <div className="container">
          <div className="accent-line" />
          <h2 className="section-title">Para quem isso faz mais sentido?</h2>
          <p className="section-lead">
            Para consultores que já pensam: “eu quero atender mais empresas sem precisar reconstruir
            tudo a cada novo contrato”.
          </p>
          <div className="narrow">
            <div className="panel">
              <h3>SE VOCÊ JÁ TEM</h3>
              <ul className="clean-list">
                <li>Cursos próprios</li>
                <li>Metodologia própria</li>
                <li>Clientes empresariais</li>
                <li>Ou uma consultoria que quer escalar</li>
              </ul>
            </div>
          </div>
          <div className="note-stack">
            <p>
              Imagine daqui a um ano: você atende 8 empresas, cada uma com o próprio ambiente, com 4 treinamentos
              cadastrados e centenas de participantes que já passaram pelos seus cursos. Os projetos continuam
              registrados e os materiais continuam disponíveis.
            </p>
            <p>Quando você fecha um novo cliente, não começa do zero: cria o ambiente, escolhe os conteúdos e adiciona os participantes.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="container narrow">
          <div className="accent-line" />
          <h2 className="section-title">Você não será apenas um usuário da LBW.</h2>
          <p className="section-lead">
            Sua marca. Seus cursos. Seus clientes. Sua operação. A LBW fornece a tecnologia —
            você constrói o negócio em cima dela.
          </p>
          <div className="paragraph-stack">
            <p>
              Consultores desta área têm contato direto comigo para ajudar a definir como ela deve evoluir.
              Se você precisar de uma funcionalidade para atender melhor um cliente, eu quero entender essa necessidade.
            </p>
            <p>Porque esta parte da LBW está sendo construída justamente para consultores como você.</p>
          </div>
        </div>
      </section>

      <section className="form-section" id="consultor-formulario">
        <div className="container form-empilhado">
          <div className="form-copy">
            <div className="accent-line" />
            <h2 className="section-title">Quer ter a sua própria plataforma?</h2>
            <p>Preencha o formulário abaixo.</p>
            <p>
              Vou analisar pessoalmente quem já possui estrutura, conteúdo e potencial para utilizar
              a plataforma com empresas. Se fizer sentido, eu entro em contato para conversarmos.
            </p>
          </div>
          <div className="form-card">
            <FormularioLead
              origem="aba-consultor"
              nomeInicial={usuario?.displayName || ''}
              emailInicial={usuario?.email || ''}
              textoBotao="QUERO TER MINHA PRÓPRIA PLATAFORMA"
              micro="Sem mensalidade inicial. Quem responde é o Israel, pessoalmente."
              textoNaoQualificado={
                'O programa hoje está focado em quem já atende empresas e já tem o curso gravado. '
                + 'Continue usando a plataforma como aluno — e quando o seu curso estiver pronto, '
                + 'me procure que a conversa continua de onde parou.'
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}
