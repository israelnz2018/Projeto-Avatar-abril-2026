/**
 * LandingConsultores — página de CAPTAÇÃO de consultores parceiros.
 * Servida em /consultores SEM exigir login (bypass no App.tsx).
 * Visual idêntico ao padrão das outras landings (k9): NAVY+BLUE, Space Grotesk,
 * reveal ao rolar. Captura WhatsApp/Nome/Empresa/Função e convida pra reunião
 * de terça/sexta. Ao enviar, mostra o link da Comunidade WhatsApp.
 */
import React, { useRef, useEffect, useState } from 'react';
import RodapeConsultores from './RodapeConsultores';

const WHATSAPP_COMUNIDADE_URL = 'https://chat.whatsapp.com/KpijG8eqP98CqKx2UD3enV';

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
.k9 .cta:disabled{opacity:.6;cursor:default;transform:none}
/* HERO */
.k9 .hero{position:relative;text-align:center;padding:56px 20px 44px;overflow:hidden;background:radial-gradient(120% 90% at 50% -10%,rgba(30,45,110,.55),transparent 60%)}
.k9 .hero h1{font-size:clamp(28px,7vw,50px);margin:20px 0 16px}
.k9 .hero p.sub{font-size:clamp(16px,2.4vw,20px);color:var(--txt);max-width:600px;margin:0 auto 26px}
/* SECTION */
.k9 section{padding:48px 20px}
.k9 section h2{font-size:clamp(23px,4.5vw,34px);margin-bottom:10px;text-align:center}
.k9 .lead{color:var(--txt);text-align:center;max-width:600px;margin:0 auto 30px;font-size:16px}
.k9 .dor{background:var(--card);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.k9 .dor ul{max-width:560px;margin:0 auto;list-style:none;display:grid;gap:12px}
.k9 .dor li{padding-left:30px;position:relative;color:var(--txt);font-size:15px}
.k9 .dor li::before{content:'—';position:absolute;left:0;color:#3B82F6;font-weight:800}
/* KIT (o que recebe) */
.k9 .kit{display:grid;gap:10px;max-width:560px;margin:0 auto}
.k9 .kit .item{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:14.5px}
.k9 .kit .item .ck{color:#3B82F6;font-weight:800;flex-shrink:0}
/* AGENDA (reunioes) */
.k9 .fases{display:grid;gap:16px;max-width:640px;margin:0 auto}
.k9 .fase{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px 24px}
.k9 .fase .tag{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9FC0FF}
.k9 .fase h3{font-size:19px;margin:6px 0 8px}
.k9 .fase p{color:var(--txt);font-size:14px}
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
/* OFERTA / FORM */
.k9 .oferta{text-align:center;background:radial-gradient(120% 100% at 50% 0%,rgba(30,45,110,.5),transparent 65%)}
.k9 .oferta .box{background:linear-gradient(160deg,rgba(0,51,204,.15),rgba(30,45,110,.08));border:1px solid rgba(0,51,204,.35);border-radius:22px;padding:38px 26px;max-width:480px;margin:0 auto}
.k9 form.leadform{display:grid;gap:12px;text-align:left;margin-top:20px}
.k9 form.leadform label{font-size:12px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.06em}
.k9 form.leadform input{width:100%;margin-top:5px;padding:13px 14px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:#fff;font-size:15px}
.k9 form.leadform input::placeholder{color:var(--txt2)}
.k9 form.leadform input:focus{outline:none;border-color:#3B82F6}
.k9 .erro{color:#fca5a5;font-size:13px;margin-top:4px}
.k9 .sucesso{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.4);border-radius:16px;padding:26px 22px;text-align:center}
.k9 .sucesso h3{font-size:20px;margin-bottom:8px}
.k9 .sucesso p{color:var(--txt);font-size:14.5px;margin-bottom:18px}
/* Reveal ao rolar */
.k9 .reveal{opacity:0;transform:translateY(42px);transition:opacity .8s cubic-bezier(.22,.61,.36,1),transform .8s cubic-bezier(.22,.61,.36,1)}
.k9 .reveal.is-visible{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){ .k9 .reveal{opacity:1;transform:none;transition:none} }
`;

function scrollToOferta() {
  document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth' });
}

export default function LandingConsultores() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [funcao, setFuncao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = Array.from(
      root.querySelectorAll('section h2, section .lead, .dor li, .fase, .kit .item, .publico .col, .fundador img, .stats > div, .faq details, .oferta .box')
    ) as HTMLElement[];
    targets.forEach((el) => {
      el.classList.add('reveal');
      const sibs = Array.from(el.parentElement?.children || []).filter((c) => (c as HTMLElement).classList.contains('reveal'));
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx * 80, 400) + 'ms';
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!nome.trim() || !empresa.trim() || !funcao.trim() || !whatsapp.trim()) {
      setErro('Preencha todos os campos.');
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch('/api/leads-consultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, empresa, funcao, whatsapp, origem: 'landing-consultores' }),
      });
      if (!r.ok) throw new Error();
      setEnviado(true);
    } catch {
      setErro('Não deu pra enviar agora. Tenta de novo em instantes.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="k9" ref={rootRef}>
      <style>{CSS}</style>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">LBW - Educação pelo Trabalho</span>
          <h1>Uma plataforma pronta pra você colocar<br /><span className="grad">os seus cursos e os seus clientes.</span></h1>
          <p className="sub">Suba o conteúdo que você já ensina, adicione quantas empresas-cliente quiser — cada uma com o próprio ecossistema, independente das outras — e acompanhe tudo de um único lugar. Com a sua marca.</p>
          <button className="cta" onClick={scrollToOferta}>Quero conhecer a plataforma →</button>
        </div>
      </header>

      {/* DOR */}
      <section className="dor">
        <div className="wrap">
          <h2>Enquanto você foca em atender clientes, o resto do trabalho consome seu tempo.</h2>
          <p className="lead">E aí vêm as perguntas de sempre:</p>
          <ul>
            <li>Você ainda monta a apresentação de cada projeto do zero, pra cada cliente?</li>
            <li>Controla quem já assistiu o quê numa planilha, cliente por cliente?</li>
            <li>Não tem como emitir certificado automaticamente pros seus alunos?</li>
            <li>Quando alguém pergunta "você tem uma plataforma?", você fica sem resposta?</li>
          </ul>
          <p className="lead" style={{ marginTop: 24, marginBottom: 0 }}>Você não precisa construir isso do zero. <b style={{ color: '#fff' }}>Já existe pronto — com a sua marca.</b></p>
        </div>
      </section>

      {/* MODELO MULTI-CLIENTE */}
      <section>
        <div className="wrap">
          <h2>Seu ecossistema, multiplicado pra cada cliente</h2>
          <p className="lead">Você sobe os seus cursos uma vez. Depois, adiciona quantas empresas-cliente quiser.</p>
          <div className="kit">
            <div className="item"><span className="ck">✓</span> Cada empresa é independente — turma própria, dados próprios, comunidade própria</div>
            <div className="item"><span className="ck">✓</span> Nenhum cliente vê o conteúdo ou os alunos de outro</div>
            <div className="item"><span className="ck">✓</span> Você acompanha tudo de um único painel — todos os clientes, um lugar só</div>
            <div className="item"><span className="ck">✓</span> Tudo com a sua marca: logo, cores e certificado, não a da LBW</div>
          </div>
        </div>
      </section>

      {/* O QUE CADA CLIENTE RECEBE */}
      <section className="dor">
        <div className="wrap">
          <h2>O que cada empresa-cliente recebe</h2>
          <p className="lead">Dentro do ecossistema dela, os funcionários têm acesso a:</p>
          <div className="kit">
            <div className="item"><span className="ck">1</span> O(s) curso(s) que você publicar — o seu conteúdo, do seu jeito</div>
            <div className="item"><span className="ck">2</span> Software estatístico LBW completo</div>
            <div className="item"><span className="ck">3</span> Ferramentas da qualidade já prontas pra preencher — sem montar do zero</div>
            <div className="item"><span className="ck">4</span> Gestão de projetos de melhoria com apoio de IA, e apresentações prontas pra eles usarem com os clientes deles</div>
            <div className="item"><span className="ck">5</span> Gestão do programa — visão de alunos e visão financeira, tudo dentro da plataforma</div>
          </div>
        </div>
      </section>

      {/* AGENDA */}
      <section className="dor">
        <div className="wrap">
          <h2>Como funciona a partir de agora</h2>
          <div className="fases">
            <div className="fase"><div className="tag">Hoje</div><h3>Você entra na Comunidade</h3><p>Preenche o formulário abaixo e recebe o link da nossa Comunidade no WhatsApp — é lá que os avisos e a agenda ficam.</p></div>
            <div className="fase"><div className="tag">Terças e sextas, 20h (Brasília)</div><h3>Reunião ao vivo pelo Zoom</h3><p>Eu mostro a plataforma funcionando de verdade, tiro suas dúvidas e apresento a condição de lançamento.</p></div>
            <div className="fase"><div className="tag">Depois</div><h3>Sua plataforma com sua marca</h3><p>Cadastro, ativação e você já pode levar aos seus clientes com o seu nome na frente.</p></div>
          </div>
        </div>
      </section>

      {/* PRA QUEM É */}
      <section>
        <div className="wrap">
          <h2>Para quem é (e para quem não é)</h2>
          <div className="publico">
            <div className="col sim">
              <h3>É para você que</h3>
              <ul>
                <li>Já treina ou consulta empresas em melhoria contínua</li>
                <li>Quer parecer (e ser) mais profissional sem virar programador</li>
                <li>Precisa de algo pronto pra usar essa semana, não em 6 meses</li>
                <li>Quer escalar sem contratar uma equipe pra gerenciar conteúdo</li>
              </ul>
            </div>
            <div className="col nao">
              <h3>Não é para você que</h3>
              <ul>
                <li>Está satisfeito controlando tudo em planilha e PDF solto</li>
                <li>Não pretende atender mais de um cliente por vez</li>
                <li>Não quer investir tempo numa reunião de 30-40 minutos pra ver a plataforma</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE MIM */}
      <section className="dor">
        <div className="wrap" style={{ textAlign: 'center', marginBottom: 22 }}>
          <span className="eyebrow">Quem está por trás da LBW?</span>
        </div>
        <div className="wrap">
          <div className="fundador">
            <div><img src="/israel-foto.png" alt="Israel Souza" loading="lazy" /></div>
            <div>
              <h2>Israel Souza</h2>
              <p>Há mais de 20 anos trabalho com melhoria de processos em <b>empresas multinacionais e no setor público</b>. Já treinei mais de <b>1.500 profissionais</b> e participei de projetos que geraram mais de <b>US$ 20 milhões</b> em ganhos.</p>
              <p>Construí a LBW porque cansei de ver bons consultores perdendo tempo com apresentação, planilha e controle manual — em vez de fazer o que sabem fazer de melhor: <b>ensinar e resolver problemas reais.</b></p>
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
      <section>
        <div className="wrap">
          <h2>Perguntas frequentes</h2>
          <div className="faq" style={{ marginTop: 20 }}>
            <details>
              <summary>Preciso saber programar ou mexer com tecnologia?</summary>
              <div className="ans">Não. A plataforma já vem pronta — você só personaliza sua marca e começa a usar.</div>
            </details>
            <details>
              <summary>Consigo usar com a minha marca, não a da LBW?</summary>
              <div className="ans">Sim. Logo, cores e certificado saem com a sua identidade — o aluno vê você, não a LBW.</div>
            </details>
            <details>
              <summary>Preciso ir na reunião de terça E de sexta?</summary>
              <div className="ans">Não, é a mesma apresentação nos dois dias — escolha o que couber na sua agenda.</div>
            </details>
            <details>
              <summary>Tem custo pra participar da reunião?</summary>
              <div className="ans">Não, é gratuita. A condição de lançamento só é apresentada durante a reunião.</div>
            </details>
          </div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section className="oferta" id="oferta">
        <div className="wrap">
          {enviado ? (
            <div className="sucesso">
              <h3>🎉 Recebemos seu contato!</h3>
              <p>Agora é só entrar na nossa Comunidade no WhatsApp — os avisos da reunião de terça/sexta (20h, Brasília) ficam por lá.</p>
              <a className="cta" href={WHATSAPP_COMUNIDADE_URL} target="_blank" rel="noopener noreferrer">Entrar na Comunidade →</a>
            </div>
          ) : (
            <div className="box">
              <span className="eyebrow">Vagas limitadas por turma</span>
              <h3 style={{ fontSize: 20, margin: '16px 0 6px' }}>Quero conhecer a plataforma LBW</h3>
              <p className="lead" style={{ margin: '0 0 4px' }}>Preencha e receba o link da Comunidade + a agenda das próximas reuniões.</p>
              <form className="leadform" onSubmit={enviar}>
                <div>
                  <label>Nome</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <label>Empresa / Consultoria</label>
                  <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ex.: Consultoria própria, autônomo, nome da empresa" />
                </div>
                <div>
                  <label>Função</label>
                  <input value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex.: Consultor, Black Belt, Instrutor" />
                </div>
                <div>
                  <label>WhatsApp</label>
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(DDD) 9XXXX-XXXX" />
                </div>
                {erro && <div className="erro">{erro}</div>}
                <button className="cta" type="submit" disabled={enviando} style={{ marginTop: 6 }}>
                  {enviando ? 'Enviando...' : 'Quero participar →'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <RodapeConsultores />
    </div>
  );
}
