/**
 * LandingComecar — página de VENDA do "Kit 90 Dias" (Trilha 1, R$67).
 * Servida em /kit90dias SEM exigir login (bypass no App.tsx).
 * Visual NAVY+BLUE (pago). CTAs levam ao checkout da Hotmart.
 */
import React, { useRef, useEffect } from 'react';
import RodapeInstitucional from './RodapeInstitucional';

// VSL VTurb do topo. O player é um web component carregado por um script externo.
const VTURB_PLAYER_ID = 'vid-6a52db61347916c9410e4050';
const VTURB_SCRIPT_SRC = 'https://scripts.converteai.net/21190591-631c-400a-94ca-b1400c31d918/players/6a52db61347916c9410e4050/v4/player.js';

// Checkout Hotmart do Kit 90 Dias (R$67).
const CHECKOUT_URL = 'https://pay.hotmart.com/Q106640860N';

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
.k9 .price b{color:#fff;font-size:18px}
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
/* MAPA (3 numeros) */
.k9 .mapa3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:620px;margin:10px auto 0}
.k9 .mapa3 .box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 16px;text-align:center}
.k9 .mapa3 .n{font-size:26px;font-weight:800;color:#9FC0FF;font-family:'Space Grotesk',sans-serif}
.k9 .mapa3 .l{font-size:13px;color:var(--txt);margin-top:4px}
/* PUBLICO */
.k9 .publico{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:640px;margin:0 auto}
.k9 .publico .col h3{font-size:16px;margin-bottom:12px}
.k9 .publico .col.sim h3{color:#6ee7b7}
.k9 .publico .col.nao h3{color:#fca5a5}
.k9 .publico .col ul{list-style:none;display:grid;gap:8px}
.k9 .publico .col li{font-size:13.5px;color:var(--txt);padding-left:20px;position:relative}
.k9 .publico .col.sim li::before{content:'✓';position:absolute;left:0;color:#10B981}
.k9 .publico .col.nao li::before{content:'✕';position:absolute;left:0;color:#ef4444}
@media(max-width:560px){.k9 .publico{grid-template-columns:1fr;gap:22px}.k9 .mapa3{grid-template-columns:1fr}}
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
.k9 .oferta .valor{font-size:40px;font-weight:800;font-family:'Space Grotesk',sans-serif;margin:6px 0}
.k9 .oferta .garantia{font-size:13px;color:var(--txt2);margin-top:16px}
`;

export default function LandingComecar() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Injeta o script do player VTurb uma única vez (o web component se auto-monta).
  useEffect(() => {
    if (document.querySelector(`script[src="${VTURB_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = VTURB_SCRIPT_SRC;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Meta Pixel: o pixel base (init + PageView) é global no index.html. Aqui só
  // disparamos o evento de conversão no clique de compra — é o que a campanha
  // de VENDAS do Kit 90 otimiza. Mesmo pixel da página /formacao.
  const trackCheckout = () => {
    try {
      const w = window as any;
      if (typeof w.fbq === 'function') {
        w.fbq('track', 'InitiateCheckout', { content_name: 'kit-90-dias', value: 67, currency: 'BRL' });
      }
    } catch { /* silencioso */ }
  };

  return (
    <div className="k9" ref={rootRef}>
      <style>{CSS}</style>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">LBW - Educação pelo Trabalho</span>
          <h1>Você não será valorizado por cumprir a sua obrigação.<br /><span className="grad">Será valorizado quando começar a resolver problemas.</span></h1>
          <p className="sub">Siga um plano de 90 dias para entender a área, encontrar o problema certo e entregar uma melhoria concreta.</p>
          {/* VSL — player VTurb abaixo do texto de apoio */}
          <div
            style={{ margin: '22px auto 26px', maxWidth: 400 }}
            dangerouslySetInnerHTML={{
              __html: `<vturb-smartplayer id="${VTURB_PLAYER_ID}" style="display:block;margin:0 auto;width:100%;max-width:400px"><div class="vturb-player-placeholder" style="position:relative;width:100%;padding:177.77777777777777% 0 0;z-index:0;background-color:black"></div></vturb-smartplayer>`,
            }}
          />
          <a className="cta" href={CHECKOUT_URL} onClick={trackCheckout}>Quero começar a gerar resultados →</a>
          <div className="price"><s style={{ opacity: .6 }}>de R$ 197</s> por <b>R$ 67</b> · acesso imediato · garantia de 7 dias</div>
        </div>
      </header>

      {/* DOR */}
      <section className="dor">
        <div className="wrap">
          <h2>Enquanto você espera o momento certo, outro profissional está resolvendo o problema que você também poderia ter resolvido.</h2>
          <p className="lead">Enquanto você espera o momento certo, os dias passam entre tarefas, reuniões e urgências, mas continua sem um resultado concreto para mostrar. E então surgem as perguntas:</p>
          <ul>
            <li>Se meu gestor perguntasse hoje qual resultado eu gerei, eu saberia responder?</li>
            <li>Como posso contribuir além da rotina?</li>
            <li>Qual problema realmente vale a pena resolver?</li>
            <li>Como transformar uma ideia de melhoria em algo concreto?</li>
          </ul>
          <p className="lead" style={{ marginTop: 24, marginBottom: 0 }}>Você não precisa saber tudo. Precisa parar de improvisar e seguir três movimentos: <b style={{ color: '#fff' }}>entender, escolher e entregar.</b></p>
        </div>
      </section>

      {/* O MAPA */}
      <section>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2>Chega de assistir aula, anotar tudo e continuar sem saber o que aplicar.</h2>
          <p className="lead" style={{ marginBottom: 8 }}><b style={{ color: '#fff' }}>Você não precisa criar um plano. Ele já está pronto.</b></p>
          <p className="lead">O Mapa dos 90 Dias já organiza <b style={{ color: '#fff' }}>60 ações práticas</b>, em ordem, para você seguir um dia de cada vez.</p>
          <div className="mapa3">
            <div className="box"><div className="n">60</div><div className="l">ações práticas</div></div>
            <div className="box"><div className="n">3</div><div className="l">fases claras</div></div>
            <div className="box"><div className="n">1</div><div className="l">primeira melhoria concreta</div></div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONAM OS 90 DIAS */}
      <section className="dor">
        <div className="wrap">
          <h2>Como funcionam os 90 dias</h2>
          <div className="fases">
            <div className="fase"><div className="tag">Dias 1 a 30</div><h3>Entenda antes de querer mudar</h3><p>Você para de depender de explicações soltas e começa a entender quem decide, como o trabalho flui, onde estão os gargalos e quais números realmente importam.</p></div>
            <div className="fase"><div className="tag">Dias 31 a 60</div><h3>Encontre o problema certo</h3><p>Você registra os problemas do dia a dia, compara as oportunidades e escolhe uma melhoria relevante, viável e dentro da sua capacidade de atuação.</p></div>
            <div className="fase"><div className="tag">Dias 61 a 90</div><h3>Resolva e mostre o resultado</h3><p>Você terá uma melhoria organizada, um antes e depois claro e uma apresentação pronta para mostrar o que mudou, por que mudou e qual resultado foi gerado.</p></div>
          </div>
        </div>
      </section>

      {/* O QUE RECEBE */}
      <section>
        <div className="wrap">
          <h2>O que você recebe</h2>
          <p className="lead">Um kit de execução, não uma pilha de vídeos.</p>
          <div className="kit">
            <div className="item"><span className="ck">✓</span> Saiba o que fazer todo dia, com o Mapa dos 90 Dias e suas 60 ações práticas</div>
            <div className="item"><span className="ck">✓</span> Entenda pessoas, processos, documentos e indicadores usando um roteiro pronto</div>
            <div className="item"><span className="ck">✓</span> Enxergue o processo e descubra a causa raiz com as ferramentas de análise</div>
            <div className="item"><span className="ck">✓</span> Apresente sua melhoria com um PowerPoint pronto, sem começar do zero</div>
            <div className="item"><span className="ck">✓</span> Aprenda a usar cada ferramenta com vídeos curtos e diretos</div>
            <div className="item"><span className="ck">✓</span> Receba o certificado de conclusão ao final</div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <a className="cta" href={CHECKOUT_URL} onClick={trackCheckout}>Quero acessar o Kit 90 Dias →</a>
          </div>
        </div>
      </section>

      {/* PRA QUEM É */}
      <section className="dor">
        <div className="wrap">
          <h2>Para quem é (e para quem não é)</h2>
          <p className="lead">O Kit 90 Dias não serve apenas para quem está começando em uma nova empresa.</p>
          <div className="publico">
            <div className="col sim">
              <h3>É para você que</h3>
              <ul>
                <li>Precisa entregar uma melhoria concreta nos próximos 90 dias</li>
                <li>Trabalha muito, mas ainda não consegue mostrar resultados</li>
                <li>Percebe problemas, mas não sabe qual deles resolver primeiro</li>
                <li>Tem boas ideias, mas não consegue transformá-las em um plano</li>
                <li>Quer parar de apenas executar tarefas e começar a gerar resultados</li>
              </ul>
            </div>
            <div className="col nao">
              <h3>Não é para você que</h3>
              <ul>
                <li>Quer baixar o material, assistir algumas aulas e nunca aplicar</li>
                <li>Espera ser reconhecido apenas por ser esforçado</li>
                <li>Quer resultado sem observar, conversar, analisar e agir</li>
                <li>Espera garantia de emprego ou promoção</li>
                <li>Procura uma fórmula mágica</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE MIM */}
      <section>
        <div className="wrap" style={{ textAlign: 'center', marginBottom: 22 }}>
          <span className="eyebrow">Quem criou o Kit 90 Dias?</span>
        </div>
        <div className="wrap">
          <div className="fundador">
            <div><img src="/israel-foto.png" alt="Israel Souza" loading="lazy" /></div>
            <div>
              <h2>Israel Souza</h2>
              <p>Há mais de 20 anos eu trabalho com melhoria de processos em <b>empresas multinacionais e no setor público</b>. Já treinei mais de <b>1.500 profissionais</b> e participei de projetos que geraram mais de <b>US$ 20 milhões</b> em ganhos.</p>
              <p>Ao longo desse tempo, percebi que a maioria dos profissionais não trava por falta de capacidade. Trava porque não sabe qual problema escolher, qual ferramenta usar e qual passo dar primeiro. <b>Gerar resultado não é dom. É método. E método pode ser seguido.</b> É isso que o Kit 90 Dias ensina.</p>
              <div className="stats">
                <div><div className="n">20+</div><div className="l">anos de experiência</div></div>
                <div><div className="n">4</div><div className="l">multinacionais</div></div>
                <div><div className="n">+1.500</div><div className="l">profissionais treinados</div></div>
                <div><div className="n">US$ 20MM</div><div className="l">em ganhos gerados</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="dor">
        <div className="wrap">
          <h2>Perguntas frequentes</h2>
          <div className="faq" style={{ marginTop: 20 }}>
            <details>
              <summary>Qual é o objetivo do Kit 90 Dias?</summary>
              <div className="ans">Fazer você entender a sua área rápido, escolher o problema certo e construir uma primeira melhoria estruturada. Algo concreto pra mostrar em 90 dias.</div>
            </details>
            <details>
              <summary>Preciso ter experiência com melhoria de processos?</summary>
              <div className="ans">Não. As ferramentas são apresentadas passo a passo e aplicadas a situações reais do trabalho.</div>
            </details>
            <details>
              <summary>Preciso saber estatística?</summary>
              <div className="ans">Não. Algumas análises podem usar dados e gráficos, mas o kit foi estruturado para começar de forma prática e acessível.</div>
            </details>
            <details>
              <summary>Como o conteúdo é entregue?</summary>
              <div className="ans">Você recebe acesso imediato ao Mapa dos 90 Dias, às ferramentas, aos modelos, aos vídeos e ao software LBW dentro da plataforma.</div>
            </details>
            <details>
              <summary>Quanto tempo por dia preciso dedicar?</summary>
              <div className="ans">A proposta é avançar com uma pequena ação por dia útil. Algumas ações são rápidas. Outras podem depender de informações, conversas ou aprovações dentro da empresa.</div>
            </details>
            <details>
              <summary>E se eu não gostar?</summary>
              <div className="ans">Você tem 7 dias para acessar o conteúdo. Se perceber que o Kit 90 Dias não é para você, pode solicitar o reembolso dentro desse prazo.</div>
            </details>
          </div>
        </div>
      </section>

      {/* OFERTA FINAL */}
      <section className="oferta" id="oferta">
        <div className="wrap">
          <div className="box">
            <span className="eyebrow">Comece hoje</span>
            <h3 style={{ fontSize: 20, margin: '16px 0 6px' }}>Kit 90 Dias: Como Gerar Resultados nos Próximos 90 Dias</h3>
            <p className="lead" style={{ margin: '0 0 18px' }}>Entenda rapidamente como a sua área funciona, encontre o problema certo e construa uma melhoria concreta.</p>
            <div style={{ fontSize: 18, color: 'var(--txt2)', marginTop: 10 }}>de <s>R$ 197</s> por</div>
            <div className="valor grad">R$ 67</div>
            <p className="lead" style={{ margin: '4px 0 22px', fontSize: 14 }}>Acesso imediato ao Kit 90 Dias completo.</p>
            <a className="cta" href={CHECKOUT_URL} onClick={trackCheckout}>Quero começar a gerar resultados →</a>
            <div className="garantia">Garantia de 7 dias. Não gostou, devolvemos o seu investimento.</div>
          </div>
        </div>
      </section>

      {/* FOOTER — componente único compartilhado (padrão do site) */}
      <RodapeInstitucional />
    </div>
  );
}
