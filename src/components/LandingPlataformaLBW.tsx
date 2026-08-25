import React, { useEffect, useState } from 'react';
import RodapeInstitucional from './RodapeInstitucional';

const CHECKOUT_FORMACAO = 'https://pay.hotmart.com/N102603781W?checkoutMode=2&bid=1781388122214';

type Plano = {
  id: string; tag: string; nome: string; resumo: string; ideal: string;
  itens: string[]; naoInclui: string; href: string; cta: string;
  preco?: string; detalhePreco?: string; destaque?: boolean;
};

const PLANOS: Plano[] = [
  {
    id: 'software', tag: 'ANALISAR E DECIDIR', nome: 'Software LBW Completo',
    resumo: 'Todo o ambiente de Data Analysis para transformar dados em análises, relatórios e apresentações profissionais.',
    ideal: 'Para quem já domina os métodos e precisa de uma plataforma completa para aplicar.',
    itens: ['Todos os módulos de Data Analysis', 'Vídeos de orientação das análises', 'IA digital para explicar uso e interpretação', 'Relatórios e apresentações PowerPoint', 'Projetos livres para organizar suas análises', 'Comunidade LBW e histórico de trabalhos'],
    naoInclui: 'Não inclui cursos, avaliações, certificados ou projetos guiados Belt.',
    href: '/contato?plano=software-lbw', cta: 'Quero conhecer o Software LBW',
  },
  {
    id: 'academy', tag: 'APRENDER E CERTIFICAR', nome: 'LBW Academy',
    resumo: 'Todos os cursos da LBW com aulas, exercícios, avaliações e certificados de conclusão.',
    ideal: 'Para quem quer construir conhecimento e comprovar sua formação curso a curso.',
    itens: ['Todos os cursos online da LBW', 'Videoaulas e exercícios práticos', 'Avaliações de aprendizagem', 'Certificados de conclusão dos cursos', 'IA digital para apoiar os estudos', 'Participação na comunidade LBW'],
    naoInclui: 'Não inclui o Software LBW completo nem projetos guiados Yellow, Green e Black Belt.',
    href: '/contato?plano=lbw-academy', cta: 'Quero conhecer a LBW Academy',
  },
  {
    id: 'formacao', tag: 'APRENDER, APLICAR E LIDERAR', nome: 'Formação Completa em Gestão de Projetos de Melhoria',
    resumo: 'A experiência completa da LBW para aprender, analisar dados e conduzir projetos reais de melhoria.',
    ideal: 'Para quem quer se desenvolver como especialista ou líder de melhoria contínua.',
    itens: ['Tudo do Software LBW Completo', 'Tudo da LBW Academy', 'Projetos guiados Yellow Belt', 'Projetos guiados Green Belt', 'Projetos guiados Black Belt', 'Método completo de gestão de projetos de melhoria'],
    naoInclui: 'A certificação do projeto é uma validação profissional separada, contratada quando você estiver pronto.',
    preco: '12x de R$ 83,08', detalhePreco: 'ou R$ 997 à vista', href: CHECKOUT_FORMACAO,
    cta: 'Quero a Formação Completa', destaque: true,
  },
];

const COMPARACAO: Array<[string, boolean, boolean, boolean]> = [
  ['Todos os cursos online', false, true, true],
  ['Avaliações e certificados dos cursos', false, true, true],
  ['Todos os módulos de Data Analysis', true, false, true],
  ['Relatórios e PowerPoint das análises', true, false, true],
  ['IA digital e comunidade', true, true, true],
  ['Projetos livres de análises estatísticas', true, false, true],
  ['Projetos guiados Yellow, Green e Black Belt', false, false, true],
];

const FAQ = [
  ['Os projetos Yellow, Green e Black Belt estão em todos os planos?', 'Não. Eles fazem parte exclusivamente da Formação Completa em Gestão de Projetos de Melhoria.'],
  ['Certificado de curso e certificação de projeto são a mesma coisa?', 'Não. O certificado de curso confirma a conclusão do conteúdo. A certificação de projeto valida uma aplicação real e exige análise técnica separada.'],
  ['Posso começar por um plano e evoluir depois?', 'Sim. Você pode começar pelo software ou pela Academy e depois avançar para a Formação Completa.'],
  ['O Master Black Belt está incluído?', 'Não. O Master Black Belt é uma etapa avançada posterior, indicada para profissionais que já dominam projetos Black Belt.'],
  ['Existe uma solução para consultores e empresas?', 'Sim. Consultores possuem uma trilha própria e empresas podem solicitar pacotes corporativos para equipes.'],
];

const CSS = `
.plbw{--bg:#060a18;--card:#0e1730;--blue:#2164f3;--cyan:#10b8dc;--text:#f7f9ff;--muted:#aab6d2;--line:rgba(164,188,244,.18);background:var(--bg);color:var(--text);font-family:'Segoe UI',Inter,system-ui,sans-serif;min-height:100vh;overflow-x:hidden}
.plbw *{box-sizing:border-box}.plbw h1,.plbw h2,.plbw h3,.plbw p{margin:0}.plbw a{text-decoration:none}.plbw .wrap{width:min(1140px,calc(100% - 40px));margin:0 auto}.plbw .section{padding:82px 0}.plbw .section-soft{background:linear-gradient(180deg,rgba(20,47,111,.16),rgba(6,10,24,0))}
.plbw .hero{position:relative;padding:92px 0 78px;text-align:center;background:radial-gradient(circle at 80% 10%,rgba(33,100,243,.34),transparent 33%),radial-gradient(circle at 10% 65%,rgba(16,184,220,.17),transparent 34%)}
.plbw .brand{font-size:12px;letter-spacing:.24em;font-weight:900;color:#8fb3ff;margin-bottom:20px}.plbw .pill{display:inline-flex;padding:9px 16px;border:1px solid rgba(96,165,250,.34);border-radius:999px;background:rgba(37,99,235,.1);color:#b9d1ff;font-size:12px;font-weight:800;letter-spacing:.08em}
.plbw h1{font-size:clamp(38px,6vw,68px);line-height:1.02;letter-spacing:-.045em;max-width:930px;margin:22px auto 20px}.plbw .gradient{background:linear-gradient(100deg,#fff 10%,#92b7ff 55%,#13c4df);-webkit-background-clip:text;background-clip:text;color:transparent}.plbw .hero-lead{max-width:790px;margin:0 auto;color:var(--muted);font-size:20px;line-height:1.6}.plbw .hero-actions{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:32px}
.plbw .btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 27px;border-radius:12px;font-weight:800;color:#fff;border:1px solid transparent;transition:.2s ease;cursor:pointer}.plbw .btn:hover{transform:translateY(-2px)}.plbw .btn-primary{background:linear-gradient(120deg,#2866f4,#0aaacb);box-shadow:0 18px 42px -18px rgba(37,99,235,.9)}.plbw .btn-secondary{border-color:var(--line);background:rgba(255,255,255,.045)}
.plbw .hero-proof{display:grid;grid-template-columns:repeat(3,1fr);max-width:780px;margin:52px auto 0;border:1px solid var(--line);border-radius:18px;background:rgba(13,23,48,.74);overflow:hidden}.plbw .proof{padding:21px 16px}.plbw .proof+.proof{border-left:1px solid var(--line)}.plbw .proof strong{display:block;font-size:18px}.plbw .proof span{display:block;color:var(--muted);font-size:13px;margin-top:5px}
.plbw .head{text-align:center;max-width:780px;margin:0 auto 42px}.plbw .head small{font-weight:900;color:#74a2ff;letter-spacing:.18em}.plbw .head h2{font-size:clamp(30px,4.2vw,46px);letter-spacing:-.035em;margin:14px 0}.plbw .head p{color:var(--muted);line-height:1.65;font-size:17px}
.plbw .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}.plbw .plan{position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:22px;padding:28px;background:linear-gradient(160deg,rgba(17,31,66,.95),rgba(8,14,31,.96));box-shadow:0 24px 70px -42px #000}.plbw .plan.featured{border-color:#4381ff;box-shadow:0 0 0 1px rgba(67,129,255,.22),0 30px 80px -35px rgba(33,100,243,.75)}.plbw .recommended{position:absolute;top:-13px;right:20px;background:linear-gradient(120deg,#2866f4,#10b8dc);padding:7px 13px;border-radius:999px;font-size:11px;font-weight:900}.plbw .plan-tag{font-size:11px;color:#84adff;font-weight:900;letter-spacing:.12em;min-height:28px}.plbw .plan h3{font-size:27px;line-height:1.15;margin:10px 0 13px}.plbw .summary{color:#c7d1e8;line-height:1.55;min-height:100px}.plbw .ideal{margin:19px 0;padding:13px 14px;border-radius:11px;background:rgba(72,117,218,.09);color:#aebde0;font-size:13px;line-height:1.5}.plbw .items{list-style:none;padding:0;margin:0 0 18px}.plbw .items li{position:relative;padding:0 0 12px 25px;color:#e7ecf8;font-size:14px;line-height:1.45}.plbw .items li:before{content:'✓';position:absolute;left:0;color:#22d3a1;font-weight:900}.plbw .exclude{color:#93a2c3;font-size:12.5px;line-height:1.5;border-top:1px solid var(--line);padding-top:15px;margin-top:auto}.plbw .price{text-align:center;font-size:27px;font-weight:900;margin:22px 0 3px}.plbw .price-note{text-align:center;color:#aab6d2;font-size:13px;margin-bottom:14px}.plbw .soon{text-align:center;color:#bfd1fa;font-size:14px;font-weight:700;margin:22px 0 16px}.plbw .plan .btn{width:100%;text-align:center}
.plbw .table-shell{overflow-x:auto;border:1px solid var(--line);border-radius:18px;background:#0b1329}.plbw table{width:100%;border-collapse:collapse;min-width:720px}.plbw th,.plbw td{padding:17px 18px;border-bottom:1px solid var(--line);text-align:center}.plbw th:first-child,.plbw td:first-child{text-align:left}.plbw th{color:#a9c3ff;font-size:13px}.plbw td{font-size:14px;color:#dbe3f6}.plbw tr:last-child td{border-bottom:0}.plbw .yes{color:#23d6a3;font-size:19px}.plbw .no{color:#55627f;font-size:19px}
.plbw .distinction{display:grid;grid-template-columns:1fr auto 1fr;gap:28px;align-items:center}.plbw .info-card{height:100%;padding:30px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,#101c3a,#0a1125)}.plbw .info-icon{font-size:30px;margin-bottom:13px}.plbw .info-card h3{font-size:24px;margin-bottom:10px}.plbw .info-card p{color:var(--muted);line-height:1.6}.plbw .versus{font-weight:900;color:#6394ff}
.plbw .paths{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:18px}.plbw .path{border:1px solid var(--line);border-radius:20px;padding:28px;background:rgba(255,255,255,.025)}.plbw .path.main{background:linear-gradient(140deg,rgba(33,100,243,.2),rgba(16,184,220,.07));border-color:rgba(75,132,255,.55)}.plbw .path h3{font-size:23px;margin:13px 0 10px}.plbw .path p{color:var(--muted);line-height:1.6;margin-bottom:20px}.plbw .path-label{font-size:11px;letter-spacing:.12em;font-weight:900;color:#89afff}
.plbw .faq{max-width:860px;margin:0 auto}.plbw .faq-item{border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025);margin-bottom:12px;overflow:hidden}.plbw .faq-q{width:100%;padding:20px 22px;display:flex;justify-content:space-between;gap:15px;border:0;background:none;color:#fff;text-align:left;font:inherit;font-weight:800;cursor:pointer}.plbw .faq-a{padding:0 22px 20px;color:var(--muted);line-height:1.6}.plbw .final{text-align:center;padding:80px 0;background:linear-gradient(140deg,#10265e,#071127 55%,#08374c)}.plbw .final h2{font-size:clamp(32px,4vw,48px);max-width:760px;margin:0 auto 16px}.plbw .final p{color:#bac7e3;max-width:670px;margin:0 auto 28px;line-height:1.6}
@media(max-width:950px){.plbw .plans,.plbw .paths{grid-template-columns:1fr}.plbw .summary{min-height:0}.plbw .distinction{grid-template-columns:1fr}.plbw .versus{text-align:center}.plbw .plan{max-width:620px;width:100%;margin:0 auto}}
@media(max-width:620px){.plbw .wrap{width:min(100% - 28px,1140px)}.plbw .hero{padding:60px 0}.plbw .hero-lead{font-size:17px}.plbw .hero-proof{grid-template-columns:1fr}.plbw .proof+.proof{border-left:0;border-top:1px solid var(--line)}.plbw .section{padding:60px 0}.plbw .plan{padding:24px 20px}.plbw .hero-actions .btn{width:100%}}
`;

export default function LandingPlataformaLBW() {
  const [faqAberta, setFaqAberta] = useState(0);

  useEffect(() => {
    if (document.querySelector('script[data-lbw-hotmart]')) return;
    const script = document.createElement('script');
    script.src = 'https://static.hotmart.com/checkout/widget.min.js';
    script.async = true;
    script.dataset.lbwHotmart = 'true';
    document.head.appendChild(script);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://static.hotmart.com/css/hotmart-fb.min.css';
    link.dataset.lbwHotmart = 'true';
    document.head.appendChild(link);
  }, []);

  return (
    <div className="plbw">
      <style>{CSS}</style>
      <header className="hero"><div className="wrap">
        <div className="brand">LBW · EDUCAÇÃO PELO TRABALHO</div>
        <span className="pill">UMA PLATAFORMA · TRÊS FORMAS DE EVOLUIR</span>
        <h1>Escolha como você quer <span className="gradient">aprender, analisar e liderar melhorias</span></h1>
        <p className="hero-lead">Cursos, software estatístico, inteligência artificial e projetos de melhoria reunidos em uma única plataforma — com um plano adequado ao seu objetivo profissional.</p>
        <div className="hero-actions"><a className="btn btn-primary" href="#planos">Comparar os planos</a><a className="btn btn-secondary" href="#como-escolher">Entender as diferenças</a></div>
        <div className="hero-proof"><div className="proof"><strong>Aprenda</strong><span>Cursos, exercícios e avaliações</span></div><div className="proof"><strong>Aplique</strong><span>Análises, IA, relatórios e PPT</span></div><div className="proof"><strong>Lidere</strong><span>Projetos reais de melhoria</span></div></div>
      </div></header>

      <main>
        <section className="section" id="planos"><div className="wrap">
          <div className="head"><small>ESCOLHA SEU CAMINHO</small><h2>Três produtos claros. Uma única plataforma.</h2><p>Você não precisa contratar tudo para começar. Escolha o nível de acesso que resolve sua necessidade agora e evolua quando fizer sentido.</p></div>
          <div className="plans">{PLANOS.map((plano) => <article className={`plan${plano.destaque ? ' featured' : ''}`} key={plano.id}>
            {plano.destaque && <span className="recommended">MAIS COMPLETO</span>}<div className="plan-tag">{plano.tag}</div><h3>{plano.nome}</h3><p className="summary">{plano.resumo}</p><p className="ideal"><strong>Ideal para:</strong> {plano.ideal}</p>
            <ul className="items">{plano.itens.map((item) => <li key={item}>{item}</li>)}</ul><p className="exclude">{plano.naoInclui}</p>
            {plano.preco ? <><div className="price">{plano.preco}</div><div className="price-note">{plano.detalhePreco}</div></> : <div className="soon">Condição comercial sob consulta</div>}
            <a className={`btn ${plano.destaque ? 'btn-primary hotmart-fb hotmart__button-checkout' : 'btn-secondary'}`} href={plano.href}>{plano.cta}</a>
          </article>)}</div>
        </div></section>

        <section className="section section-soft" id="como-escolher"><div className="wrap">
          <div className="head"><small>COMPARAÇÃO DIRETA</small><h2>Veja exatamente o que muda</h2><p>Os projetos guiados Yellow, Green e Black Belt pertencem somente à Formação Completa.</p></div>
          <div className="table-shell"><table><thead><tr><th>Recurso</th><th>Software LBW</th><th>LBW Academy</th><th>Formação Completa</th></tr></thead><tbody>{COMPARACAO.map(([recurso, software, academy, formacao]) => <tr key={recurso}><td>{recurso}</td>{[software, academy, formacao].map((valor, i) => <td key={i} className={valor ? 'yes' : 'no'}>{valor ? '✓' : '—'}</td>)}</tr>)}</tbody></table></div>
        </div></section>

        <section className="section"><div className="wrap"><div className="head"><small>UMA DIFERENÇA IMPORTANTE</small><h2>Certificado do curso não é certificação do projeto</h2></div>
          <div className="distinction"><article className="info-card"><div className="info-icon">🎓</div><h3>Certificado de curso</h3><p>Comprova que você cumpriu os critérios de aprendizagem, assistiu ao conteúdo e foi aprovado na avaliação do curso.</p></article><div className="versus">SÃO ETAPAS DIFERENTES</div><article className="info-card"><div className="info-icon">🏅</div><h3>Certificação de projeto</h3><p>Valida um projeto real, seus resultados e a aplicação do método. É um serviço profissional separado, contratado quando o projeto estiver pronto.</p></article></div>
        </div></section>

        <section className="section section-soft"><div className="wrap"><div className="head"><small>PRÓXIMOS PASSOS</small><h2>A plataforma acompanha sua evolução</h2><p>Depois da Formação Completa, existem caminhos específicos para liderança técnica, consultoria e implantação em empresas.</p></div>
          <div className="paths"><article className="path main"><div className="path-label">TRILHA AVANÇADA</div><h3>Master Black Belt</h3><p>Uma evolução posterior para quem já domina projetos Black Belt e quer liderar portfólios, orientar especialistas e estruturar sistemas de melhoria.</p><a className="btn btn-secondary" href="/contato?interesse=master-black-belt">Tenho interesse no MBB</a></article><article className="path"><div className="path-label">PARA PROFISSIONAIS</div><h3>Seja consultor LBW</h3><p>Conheça a estrutura destinada a quem deseja aplicar e comercializar sua própria operação de consultoria e treinamento.</p><a className="btn btn-secondary" href="/consultores">Área de consultores</a></article><article className="path"><div className="path-label">PARA EQUIPES</div><h3>LBW para empresas</h3><p>Pacotes corporativos, gestão de acessos e desenvolvimento aplicado às necessidades da organização.</p><a className="btn btn-secondary" href="/pacotes-corporativos">Solução corporativa</a></article></div>
        </div></section>

        <section className="section"><div className="wrap"><div className="head"><small>DÚVIDAS FREQUENTES</small><h2>Antes de escolher</h2></div><div className="faq">{FAQ.map(([pergunta, resposta], index) => <div className="faq-item" key={pergunta}><button className="faq-q" type="button" onClick={() => setFaqAberta(faqAberta === index ? -1 : index)} aria-expanded={faqAberta === index}><span>{pergunta}</span><span>{faqAberta === index ? '−' : '+'}</span></button>{faqAberta === index && <div className="faq-a">{resposta}</div>}</div>)}</div></div></section>

        <section className="final"><div className="wrap"><h2>Comece pelo que você precisa. Evolua até onde quiser.</h2><p>A LBW conecta aprendizagem, aplicação e resultado sem obrigar você a contratar recursos que ainda não precisa.</p><a className="btn btn-primary" href="#planos">Escolher meu plano</a></div></section>
      </main>
      <RodapeInstitucional />
    </div>
  );
}
