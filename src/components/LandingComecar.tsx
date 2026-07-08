/**
 * LandingComecar — página de VENDA do "Kit 90 Dias" (Trilha 1, R$67).
 * Servida em /kit90dias SEM exigir login (bypass no App.tsx).
 *
 * Antes era a landing grátis (formulário → webhook acessogratuito). Agora é
 * página de venda: os CTAs levam ao checkout da Hotmart. Visual NAVY+BLUE (pago).
 * Baseada no plano vsl/PLANO-LOW-TICKET-REV3.txt (ângulo da imagem, 3 fases).
 */
import React, { useRef } from 'react';
import RodapeInstitucional from './RodapeInstitucional';

// Checkout Hotmart do Kit 90 Dias (R$67).
const CHECKOUT_URL = 'https://pay.hotmart.com/Q106640860N';

/** Rola suavemente até a oferta final (usado pelos CTAs de texto). */
function scrollToOferta() {
  const el = document.getElementById('oferta');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const CSS = `
.k9{--ink:#0A0F24;--navy:#1E2D6E;--blue:#0033CC;--line:rgba(255,255,255,.10);--txt:rgba(255,255,255,.74);--txt2:rgba(255,255,255,.5);--card:rgba(255,255,255,.04)}
.k9 *{margin:0;padding:0;box-sizing:border-box}
.k9{background:var(--ink);color:#fff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh;line-height:1.55}
.k9 h1,.k9 h2,.k9 h3{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em;line-height:1.12;text-wrap:balance}
.k9 .wrap{max-width:760px;margin:0 auto;padding:0 20px}
.k9 .grad{background:linear-gradient(95deg,#fff,#9FC0FF 55%,#3B82F6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.k9 .eyebrow{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#9FC0FF;background:rgba(0,51,204,.16);border:1px solid rgba(0,51,204,.4);padding:8px 15px;border-radius:999px}
.k9 .cta{display:inline-block;background:linear-gradient(120deg,var(--blue),#2563EB);color:#fff;font-weight:800;font-size:17px;text-decoration:none;padding:17px 34px;border-radius:14px;box-shadow:0 12px 34px rgba(0,51,204,.4);transition:transform .15s;border:none;cursor:pointer}
.k9 .cta:hover{transform:translateY(-2px)}
/* HERO */
.k9 .hero{position:relative;text-align:center;padding:56px 20px 44px;overflow:hidden;background:radial-gradient(120% 90% at 50% -10%,rgba(30,45,110,.55),transparent 60%)}
.k9 .hero h1{font-size:clamp(28px,7vw,50px);margin:20px 0 16px}
.k9 .hero p.sub{font-size:clamp(16px,2.4vw,20px);color:var(--txt);max-width:600px;margin:0 auto 26px}
.k9 .price{margin-top:14px;font-size:14px;color:var(--txt2)}
.k9 .price b{color:#fff;font-size:20px}
/* SECTION */
.k9 section{padding:48px 20px}
.k9 section h2{font-size:clamp(23px,4.5vw,34px);margin-bottom:10px;text-align:center}
.k9 .lead{color:var(--txt);text-align:center;max-width:600px;margin:0 auto 30px;font-size:16px}
.k9 .dor{background:var(--card);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.k9 .dor ul{max-width:560px;margin:0 auto;list-style:none;display:grid;gap:12px}
.k9 .dor li{padding-left:30px;position:relative;color:var(--txt);font-size:15px}
.k9 .dor li::before{content:'—';position:absolute;left:0;color:#3B82F6;font-weight:800}
/* 3 FASES */
.k9 .fases{display:grid;gap:16px;max-width:640px;margin:0 auto}
.k9 .fase{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px 24px}
.k9 .fase .tag{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9FC0FF}
.k9 .fase h3{font-size:19px;margin:6px 0 8px}
.k9 .fase p{color:var(--txt);font-size:14px}
/* KIT */
.k9 .kit{display:grid;gap:10px;max-width:560px;margin:0 auto}
.k9 .kit .item{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:14.5px}
.k9 .kit .item .ck{color:#3B82F6;font-weight:800;flex-shrink:0}
/* PUBLICO */
.k9 .publico{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:640px;margin:0 auto}
.k9 .publico .col h3{font-size:16px;margin-bottom:12px}
.k9 .publico .col.sim h3{color:#6ee7b7}
.k9 .publico .col.nao h3{color:#fca5a5}
.k9 .publico .col ul{list-style:none;display:grid;gap:8px}
.k9 .publico .col li{font-size:13.5px;color:var(--txt);padding-left:20px;position:relative}
.k9 .publico .col.sim li::before{content:'✓';position:absolute;left:0;color:#10B981}
.k9 .publico .col.nao li::before{content:'✕';position:absolute;left:0;color:#ef4444}
@media(max-width:560px){.k9 .publico{grid-template-columns:1fr;gap:22px}}
/* SOBRE MIM */
.k9 .fundador{display:grid;grid-template-columns:.8fr 1.2fr;gap:32px;align-items:center;max-width:820px;margin:0 auto}
.k9 .fundador img{width:100%;border-radius:16px;object-fit:cover;aspect-ratio:3/4;border:1px solid var(--line)}
.k9 .fundador h2{text-align:left;font-size:clamp(22px,3.6vw,30px);margin-bottom:16px}
.k9 .fundador p{color:var(--txt);line-height:1.65;margin-bottom:14px;font-size:15px}
.k9 .fundador b{color:#fff}
.k9 .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
.k9 .stats .n{font-size:clamp(20px,3vw,26px);font-weight:800;font-family:'Space Grotesk',sans-serif;color:#9FC0FF}
.k9 .stats .l{font-size:11px;color:var(--txt2);margin-top:3px;line-height:1.3}
@media(max-width:640px){.k9 .fundador{grid-template-columns:1fr;gap:22px}.k9 .fundador img{max-width:260px;margin:0 auto}.k9 .fundador h2{text-align:center}.k9 .stats{grid-template-columns:repeat(2,1fr)}}
/* FAQ */
.k9 .faq{display:grid;gap:12px;max-width:640px;margin:0 auto}
.k9 .faq details{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.k9 .faq summary{list-style:none;cursor:pointer;padding:18px 22px;font-weight:700;font-size:15.5px;display:flex;justify-content:space-between;align-items:center;gap:14px}
.k9 .faq summary::-webkit-details-marker{display:none}
.k9 .faq summary::after{content:'+';color:#3B82F6;font-size:22px;font-weight:800;flex-shrink:0;transition:transform .2s}
.k9 .faq details[open] summary::after{transform:rotate(45deg)}
.k9 .faq details[open] summary{color:#9FC0FF}
.k9 .faq .ans{padding:0 22px 20px;color:var(--txt);font-size:14.5px}
/* OFERTA */
.k9 .oferta{text-align:center;background:radial-gradient(120% 100% at 50% 0%,rgba(30,45,110,.5),transparent 65%)}
.k9 .oferta .box{background:linear-gradient(160deg,rgba(0,51,204,.15),rgba(30,45,110,.08));border:1px solid rgba(0,51,204,.35);border-radius:22px;padding:38px 26px;max-width:520px;margin:0 auto}
.k9 .oferta .valor{font-size:46px;font-weight:800;font-family:'Space Grotesk',sans-serif;margin:6px 0}
.k9 .oferta .garantia{font-size:13px;color:var(--txt2);margin-top:16px}
.k9 .linktext{background:none;border:none;color:#9FC0FF;text-decoration:underline;cursor:pointer;font-size:inherit;font-family:inherit}
`;

export default function LandingComecar() {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div className="k9" ref={rootRef}>
      <style>{CSS}</style>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">LBW - Educação pelo Trabalho</span>
          <h1>Nos primeiros 90 dias, ou você constrói sua imagem,<br /><span className="grad">ou a empresa constrói por você.</span></h1>
          <p className="sub">Um plano prático pra entender uma área nova, escolher um problema relevante e construir sua primeira entrega — sem passar meses esperando alguém explicar tudo.</p>
          <a className="cta" href={CHECKOUT_URL}>Quero organizar meus primeiros 90 dias →</a>
          <div className="price"><s style={{ opacity: .6 }}>de R$ 197</s> por <b>R$ 67</b> · acesso imediato · garantia de 7 dias</div>
        </div>
      </header>

      {/* DOR */}
      <section className="dor">
        <div className="wrap">
          <h2>Você entrou numa área nova. E já está sendo observado.</h2>
          <p className="lead">Todo mundo ocupado, reuniões rápidas, sistemas rodando, problemas que já existem. E, mesmo sem entender tudo, as pessoas já estão formando uma opinião sobre você.</p>
          <ul>
            <li>Será que estou demorando demais pra aprender?</li>
            <li>Será que já perceberam que estou perdido?</li>
            <li>Como mostro que sou útil se ninguém explica nada?</li>
            <li>O que eu entrego além da rotina?</li>
          </ul>
        </div>
      </section>

      {/* MECANISMO / 3 FASES */}
      <section>
        <div className="wrap">
          <h2>Você não precisa conhecer tudo. Precisa de três movimentos.</h2>
          <p className="lead">O Kit organiza seus 90 dias em três fases — entender, escolher e entregar.</p>
          <div className="fases">
            <div className="fase"><div className="tag">Dias 1 a 30</div><h3>Entenda antes de querer mudar</h3><p>Mapa da área, pessoas-chave, processos, roteiro de perguntas. Você para de agir no escuro e passa a explicar como a área funciona.</p></div>
            <div className="fase"><div className="tag">Dias 31 a 60</div><h3>Encontre o problema certo</h3><p>Lista de problemas, matriz de priorização, Ishikawa, mapa de processo. Você escolhe uma melhoria pequena o bastante pra avançar e importante o bastante pra ser percebida.</p></div>
            <div className="fase"><div className="tag">Dias 61 a 90</div><h3>Entregue e mostre o resultado</h3><p>Matriz esforço × impacto, plano de ação, antes/depois, estrutura pra apresentar. Você termina com uma primeira entrega que pode ser mostrada.</p></div>
          </div>
        </div>
      </section>

      {/* O QUE RECEBE */}
      <section className="dor">
        <div className="wrap">
          <h2>O que você recebe</h2>
          <p className="lead">Um kit de execução — não uma pilha de vídeos. Os vídeos ensinam a usar as ferramentas.</p>
          <div className="kit">
            <div className="item"><span className="ck">✓</span> Plano visual dos 90 dias + checklist semanal</div>
            <div className="item"><span className="ck">✓</span> Ferramentas para conhecer o processo atual — RACI, Indicadores, POP</div>
            <div className="item"><span className="ck">✓</span> Matriz pra escolher o problema certo</div>
            <div className="item"><span className="ck">✓</span> Ferramentas de análise (Ishikawa, mapa de processo)</div>
            <div className="item"><span className="ck">✓</span> Matriz esforço × impacto + plano de ação</div>
            <div className="item"><span className="ck">✓</span> Acesso ao software LBW pras análises</div>
          </div>
        </div>
      </section>

      {/* PRA QUEM É */}
      <section>
        <div className="wrap">
          <h2>Pra quem é (e pra quem não é)</h2>
          <p className="lead">Serve pra qualquer transição — não só primeiro emprego.</p>
          <div className="publico">
            <div className="col sim">
              <h3>É pra você que</h3>
              <ul>
                <li>Entrou recentemente numa empresa</li>
                <li>Mudou de área internamente</li>
                <li>Foi promovido ou assumiu novo projeto</li>
                <li>Mudou de empresa</li>
                <li>Está migrando de carreira</li>
                <li>Quer mostrar valor sem depender de cargo</li>
              </ul>
            </div>
            <div className="col nao">
              <h3>Não é pra você que</h3>
              <ul>
                <li>Só quer assistir aula</li>
                <li>Não vai aplicar as ferramentas</li>
                <li>Espera garantia de emprego</li>
                <li>Procura fórmula mágica</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE MIM (mesmo bloco da página paga: foto + texto + stats) */}
      <section className="dor">
        <div className="wrap" style={{ textAlign: 'center', marginBottom: 22 }}>
          <span className="eyebrow">Quem é seu consultor?</span>
        </div>
        <div className="wrap">
          <div className="fundador">
            <div><img src="/israel-foto.png" alt="Israel Souza" loading="lazy" /></div>
            <div>
              <h2>Mais de 20 anos resolvendo problemas de verdade</h2>
              <p>Não sou professor de teoria. Ensino apenas o que aplico e já apliquei na prática. Trabalhar em empresas de <b>equipamentos médicos, bebida, automotiva, petroquímica e governamental</b> me ajudou a adquirir vasta experiência tanto em chão de fábrica como em atividades de escritório, que geraram mais de <b>US$ 20MM</b> em ganhos pelos projetos dos meus alunos e pelos meus próprios projetos.</p>
              <p>Treinei mais de <b>1.500 profissionais</b> e percebi que o que falta não é certificado na parede. É saber chegar numa área, se adaptar rápido, entender como investigar um problema, entregar resultado com o mínimo de resistência e saber apresentar os resultados. É isso que este kit ensina.</p>
              <div className="stats">
                <div><div className="n">20</div><div className="l">anos de prática</div></div>
                <div><div className="n">4</div><div className="l">multinacionais</div></div>
                <div><div className="n">+1.500</div><div className="l">profissionais formados</div></div>
                <div><div className="n">US$ 20MM</div><div className="l">em ganhos</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="wrap">
          <h2>Perguntas frequentes</h2>
          <p className="lead">O que costuma travar antes de começar.</p>
          <div className="faq">
            <details>
              <summary>Qual é o objetivo do Kit 90 Dias?</summary>
              <div className="ans">Te dar um plano prático para os seus primeiros 90 dias em uma área nova: entender como o trabalho funciona, escolher um problema que vale a pena resolver e construir uma primeira entrega concreta. No fim, você não só se adapta — você mostra que consegue gerar resultado.</div>
            </details>
            <details>
              <summary>Preciso já estar num emprego novo para usar?</summary>
              <div className="ans">Não. O Kit serve para qualquer transição: mudou de área internamente, foi promovido, mudou de empresa, assumiu um projeto novo ou está migrando de carreira. Sempre que o contexto muda, a régua recomeça — e o plano se aplica.</div>
            </details>
            <details>
              <summary>Isso garante meu emprego ou uma promoção?</summary>
              <div className="ans">Não. Seria desonesto prometer algo que depende da empresa. O que o Kit faz é te dar estrutura para entender a área, escolher uma melhoria certa e construir uma entrega concreta — você troca improviso por direção e passa a mostrar evolução.</div>
            </details>
            <details>
              <summary>Preciso saber programar ou Excel avançado?</summary>
              <div className="ans">Não. Toda a análise é sem código: você escolhe a ferramenta, preenche com o seu caso e a plataforma LBW faz o cálculo e entrega o resultado pronto, já explicado.</div>
            </details>
            <details>
              <summary>Funciona se eu não tiver um projeto agora?</summary>
              <div className="ans">Funciona. Você pode aplicar as ferramentas em um item da sua própria rotina — o plano mostra como escolher onde começar, mesmo que ninguém tenha te passado um projeto formal.</div>
            </details>
            <details>
              <summary>Como o conteúdo é entregue? Só vídeos ou tem material prático?</summary>
              <div className="ans">Os dois. Você tem os vídeos que te ensinam cada passo, mais o kit de execução: o plano dos 90 dias, os checklists e as ferramentas prontas para aplicar no seu trabalho real. Não é só assistir — é assistir e fazer.</div>
            </details>
            <details>
              <summary>E se eu não gostar?</summary>
              <div className="ans">Você tem 7 dias de garantia. Se não for para você, devolvemos o valor — sem burocracia.</div>
            </details>
          </div>
        </div>
      </section>

      {/* OFERTA FINAL */}
      <section className="oferta" id="oferta">
        <div className="wrap">
          <div className="box">
            <span className="eyebrow">Comece hoje</span>
            <div style={{ fontSize: 18, color: 'var(--txt2)', marginTop: 10 }}>de <s>R$ 197</s> por</div>
            <div className="valor grad">R$ 67</div>
            <p className="lead" style={{ margin: '4px 0 22px' }}>Acesso imediato ao Kit 90 Dias completo.</p>
            <a className="cta" href={CHECKOUT_URL}>Quero organizar meus primeiros 90 dias →</a>
            <div className="garantia">Garantia de 7 dias. Não gostou, devolvemos.</div>
          </div>
        </div>
      </section>

      {/* FOOTER — componente único compartilhado (padrão do site) */}
      <RodapeInstitucional />
    </div>
  );
}
