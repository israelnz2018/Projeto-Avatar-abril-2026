/**
 * LandingEmpresarial — landing page pública "LBW para Empresas".
 * Servida em /empresarial SEM exigir login (bypass no App.tsx, antes do gate).
 *
 * Foco B2B: coordenador da empresa capacita o time, cada pessoa entrega um
 * projeto de melhoria com ganho medível em R$, e o coordenador acompanha tudo
 * (progresso + retorno) num painel só. Vende contra consultoria tradicional.
 *
 * Visual NAVY/BLUE (mesma família das outras landings). Escopo de CSS em `.le`.
 * O formulário monta um mailto pra contact@learningbyworking.com (sem backend).
 */
import React, { useEffect } from 'react';
import RodapeInstitucional from './RodapeInstitucional';

const CONTATO_EMAIL = 'contact@learningbyworking.com';

// As 8 trilhas (nomes reais de trilhas.ts) + objetivo em linguagem de negócio.
const TRILHAS: { n: string; nome: string; obj: string; anchor?: boolean }[] = [
  { n: '1', nome: 'Como Resolver Problemas no Trabalho', obj: 'A base: em 90 dias o colaborador entende a área, acha o problema certo, resolve e mostra o resultado. Transforma gente ocupada em gente que entrega.' },
  { n: '2', nome: 'Como Recomendar Melhorias com Base em Análise de Dados', obj: 'O time para de decidir por achismo e passa a propor melhorias com base em dados. Menos opinião, mais fato.' },
  { n: '3', nome: 'Como Conduzir Mudanças com Menos Resistência', obj: 'Ensina a implantar mudanças que as pessoas abraçam — reduzindo a resistência que faz boa ideia morrer.' },
  { n: '4', nome: 'Como Criar Apresentações que Convencem', obj: 'O colaborador aprende a estruturar e defender uma proposta pra conseguir o "sim" da diretoria.' },
  { n: '5', nome: 'Como Antecipar Riscos Antes que Virem Problemas', obj: 'O time aprende a enxergar o risco antes do go-live, evitando paradas caras e retrabalho.' },
  { n: '6', nome: 'Cultura Lean na Prática', obj: 'Treina o olhar do time pra enxergar desperdício, retrabalho e gargalo na rotina — a base que faz a melhoria durar.' },
  { n: '7', nome: 'Como Fazer Análises Estatísticas Aplicadas a Negócios', obj: 'Capacita o time a atacar os problemas crônicos (os que voltam sempre) com método — causa-raiz real.' },
  { n: '8', nome: 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria', obj: 'Forma quem lidera os projetos grandes e estratégicos — escopo, prazo, custo, risco, stakeholders. O nível especialista.', anchor: true },
];

const CSS = `
.le{--ink:#070A18;--ink2:#0B1024;--navy:#1E2D6E;--blue:#0033CC;--sky:#9FC0FF;
  --gain:#3FD69A;--gainDeep:#12805C;
  --txt:rgba(255,255,255,.80);--txt2:rgba(255,255,255,.55);--txt3:rgba(255,255,255,.38);
  --line:rgba(255,255,255,.10);--card:rgba(255,255,255,.035);
  --sans:'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif}
.le *{margin:0;padding:0;box-sizing:border-box}
.le{background:var(--ink);color:#fff;font-family:var(--sans);line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
.le h1,.le h2,.le h3{letter-spacing:-.02em;line-height:1.1;text-wrap:balance;font-weight:800}
.le .num{font-variant-numeric:tabular-nums}
.le .wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.le .grad{background:linear-gradient(96deg,#fff,var(--sky) 55%,#3B82F6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.le .eyebrow{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--sky);background:rgba(0,51,204,.16);border:1px solid rgba(0,51,204,.4);padding:7px 14px;border-radius:999px}
.le .cta{display:inline-block;background:linear-gradient(120deg,var(--blue),#2563EB);color:#fff;font-weight:800;font-size:16px;text-decoration:none;padding:15px 30px;border-radius:13px;box-shadow:0 14px 38px -10px rgba(0,51,204,.6);border:none;cursor:pointer;transition:transform .15s}
.le .cta:hover{transform:translateY(-2px)}
.le .cta.ghost{background:transparent;border:1px solid var(--line);box-shadow:none;color:#fff}
.le .sec{padding:76px 0;border-top:1px solid var(--line)}
.le .lead{color:var(--txt);max-width:60ch}
.le .center{text-align:center}
.le .center .lead{margin-left:auto;margin-right:auto}
.le .seclabel{font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--sky);margin-bottom:14px}
.le .hero{position:relative;padding:88px 0 72px;overflow:hidden;background:radial-gradient(120% 80% at 50% -10%,rgba(30,45,110,.55),transparent 60%)}
.le .hero h1{font-size:clamp(32px,6.4vw,60px);margin:22px 0 18px}
.le .hero .lead{font-size:clamp(16px,2.2vw,20px)}
.le .hero .row{display:flex;gap:14px;flex-wrap:wrap;margin-top:30px}
.le .trust{margin-top:34px;display:flex;gap:26px;flex-wrap:wrap;color:var(--txt3);font-size:13px;align-items:center}
.le .trust b{color:#fff}
.le .band{background:linear-gradient(180deg,var(--ink2),var(--ink))}
.le .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.le .stat .n{font-size:clamp(28px,4vw,40px);font-weight:800;color:var(--sky)}
.le .stat .l{font-size:13px;color:var(--txt2);margin-top:4px}
@media(max-width:720px){.le .stats{grid-template-columns:repeat(2,1fr)}}
.le h2.big{font-size:clamp(26px,4.4vw,38px);margin-bottom:14px}
.le .dor ul{list-style:none;display:grid;gap:12px;max-width:640px}
.le .dor li{padding-left:28px;position:relative;color:var(--txt);font-size:15.5px}
.le .dor li::before{content:'—';position:absolute;left:0;color:#3B82F6;font-weight:800}
.le .split{display:grid;grid-template-columns:1fr 1.05fr;gap:44px;align-items:center}
@media(max-width:860px){.le .split{grid-template-columns:1fr;gap:32px}}
.le .steps{display:grid;gap:18px}
.le .step{display:flex;gap:14px}
.le .step .k{flex-shrink:0;width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--navy),var(--blue));display:grid;place-items:center;font-weight:800;font-size:14px}
.le .step h3{font-size:17px;margin-bottom:3px}
.le .step p{color:var(--txt2);font-size:14px}
.le .panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 30px 80px -40px rgba(0,51,204,.5)}
.le .panel .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.le .panel .head .t{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3)}
.le .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.le .kpi{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:12px;padding:12px}
.le .kpi .kl{font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3)}
.le .kpi .kv{font-size:19px;font-weight:800;margin-top:3px}
.le .kpi.g{background:linear-gradient(135deg,rgba(18,128,92,.35),rgba(18,128,92,.12));border-color:rgba(63,214,154,.3)}
.le .kpi.g .kv{color:var(--gain)}
.le .prow{display:grid;grid-template-columns:1.4fr 1fr .8fr;gap:8px;padding:9px 10px;border-radius:10px;font-size:12.5px;align-items:center}
.le .prow.h{color:var(--txt3);font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.le .prow:nth-child(even){background:rgba(255,255,255,.02)}
.le .prow .money{color:var(--gain);font-weight:800;text-align:right}
.le .trilhas{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:36px;text-align:left}
@media(max-width:760px){.le .trilhas{grid-template-columns:1fr}}
.le .tcard{border:1px solid var(--line);border-radius:16px;padding:20px 22px;background:var(--card);display:flex;gap:16px;align-items:flex-start}
.le .tcard .tn{flex-shrink:0;width:34px;height:34px;border-radius:10px;background:rgba(0,51,204,.18);border:1px solid rgba(0,51,204,.4);display:grid;place-items:center;font-weight:800;font-size:15px;color:var(--sky)}
.le .tcard h3{font-size:15.5px;margin-bottom:6px;line-height:1.25}
.le .tcard p{color:var(--txt2);font-size:13.5px}
.le .tcard.anchor{grid-column:1/-1;border-color:rgba(120,170,255,.55);background:linear-gradient(135deg,rgba(30,45,110,.5),rgba(0,51,204,.14));box-shadow:0 0 0 1px rgba(120,170,255,.28)}
.le .tcard.anchor .tn{background:linear-gradient(135deg,var(--navy),var(--blue));border-color:transparent;color:#fff}
.le .tcard .badge{display:inline-block;font-size:9.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--sky);margin-bottom:7px}
.le .cmp{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:820px;margin:0 auto}
@media(max-width:720px){.le .cmp{grid-template-columns:1fr}}
.le .cmp .col{border:1px solid var(--line);border-radius:16px;padding:22px;background:var(--card)}
.le .cmp .col.win{border-color:rgba(0,51,204,.5);box-shadow:0 0 0 1px rgba(0,51,204,.35)}
.le .cmp h3{font-size:16px;margin-bottom:12px}
.le .cmp ul{list-style:none;display:grid;gap:9px}
.le .cmp li{font-size:13.5px;color:var(--txt);padding-left:22px;position:relative}
.le .cmp .no li::before{content:'\\2715';position:absolute;left:0;color:#ef6a6a}
.le .cmp .yes li::before{content:'\\2713';position:absolute;left:0;color:var(--gain)}
.le .founder{display:grid;grid-template-columns:.8fr 1.3fr;gap:36px;align-items:center;max-width:900px;margin:0 auto}
@media(max-width:760px){.le .founder{grid-template-columns:1fr;gap:22px}}
.le .founder .ph{aspect-ratio:3/4;border-radius:16px;background:linear-gradient(160deg,#141c3a,#0c1226);border:1px solid var(--line);display:grid;place-items:center;color:var(--txt3);font-size:13px;overflow:hidden}
.le .founder .ph img{width:100%;height:100%;object-fit:cover}
.le .founder h2{text-align:left;font-size:clamp(22px,3.4vw,30px);margin-bottom:14px}
.le .founder p{color:var(--txt);margin-bottom:12px;font-size:15px}
.le .founder b{color:#fff}
.le .fstats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}
.le .fstats .n{font-size:clamp(18px,2.6vw,24px);font-weight:800;color:var(--sky)}
.le .fstats .l{font-size:10.5px;color:var(--txt3);margin-top:2px;line-height:1.3}
@media(max-width:560px){.le .fstats{grid-template-columns:repeat(2,1fr)}}
.le .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:900px;margin:0 auto}
@media(max-width:820px){.le .plans{grid-template-columns:1fr}}
.le .plan{border:1px solid var(--line);border-radius:18px;padding:26px 22px;background:var(--card);text-align:center;position:relative}
.le .plan.feat{border-color:rgba(120,170,255,.7);box-shadow:0 0 0 1px rgba(120,170,255,.4),0 30px 70px -34px rgba(0,51,204,.7)}
.le .plan .tag{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:linear-gradient(120deg,var(--blue),#2563EB);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:999px}
.le .plan .seats{font-size:14px;color:var(--txt2);font-weight:700}
.le .plan .price{font-size:34px;font-weight:800;margin:8px 0 2px}
.le .plan .per{font-size:12px;color:var(--txt3)}
.le .plan .off{display:inline-block;margin-top:8px;font-size:12px;font-weight:800;color:var(--gain);background:rgba(18,128,92,.16);border:1px solid rgba(63,214,154,.3);padding:3px 10px;border-radius:999px}
.le .plan ul{list-style:none;display:grid;gap:8px;margin:18px 0;text-align:left}
.le .plan li{font-size:13px;color:var(--txt);padding-left:20px;position:relative}
.le .plan li::before{content:'\\2713';position:absolute;left:0;color:var(--gain)}
.le .plan .cta{width:100%;font-size:14px;padding:12px}
.le .plansnote{text-align:center;color:var(--txt2);font-size:13.5px;margin-top:22px}
.le .cta-band{background:radial-gradient(120% 100% at 50% 0%,rgba(30,45,110,.5),transparent 65%)}
.le .formcard{max-width:560px;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px}
.le .field{margin-bottom:12px}
.le .field label{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--txt3);margin-bottom:5px;text-align:left}
.le .field input,.le .field select{width:100%;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:11px 13px;color:#fff;font-size:14px;font-family:inherit}
.le .field input::placeholder{color:var(--txt3)}
.le .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.le .faq{max-width:680px;margin:0 auto;display:grid;gap:12px}
.le details{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.le summary{list-style:none;cursor:pointer;padding:16px 20px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;gap:12px}
.le summary::-webkit-details-marker{display:none}
.le summary::after{content:'+';color:#3B82F6;font-size:20px;font-weight:800}
.le details[open] summary::after{content:'\\2013'}
.le .ans{padding:0 20px 18px;color:var(--txt2);font-size:14px;text-align:left}
.le .reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.22,.61,.36,1),transform .7s cubic-bezier(.22,.61,.36,1)}
.le .reveal.vis{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.le .reveal{opacity:1;transform:none;transition:none}}
`;

export default function LandingEmpresarial() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );
    document.querySelectorAll('.le .sec .wrap, .le .hero .wrap').forEach((el) => { el.classList.add('reveal'); io.observe(el); });
    return () => io.disconnect();
  }, []);

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const nome = (f.elements.namedItem('nome') as HTMLInputElement)?.value || '';
    const empresa = (f.elements.namedItem('empresa') as HTMLInputElement)?.value || '';
    const email = (f.elements.namedItem('email') as HTMLInputElement)?.value || '';
    const pessoas = (f.elements.namedItem('pessoas') as HTMLSelectElement)?.value || '';
    const corpo = `Nome: ${nome}%0AEmpresa: ${empresa}%0AE-mail: ${email}%0ANº de pessoas: ${pessoas}%0A%0AQuero levar a LBW para minha empresa.`;
    window.location.href = `mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent('LBW para Empresas — interesse')}&body=${corpo}`;
  };

  return (
    <div className="le">
      <style>{CSS}</style>

      {/* HERO */}
      <header className="hero">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <span className="eyebrow">LBW · para Empresas</span>
          <h1>Seu time entregando <span className="grad">resultado medível</span> — sem pagar consultoria cara.</h1>
          <p className="lead">A plataforma que capacita a sua equipe a resolver os problemas certos e <b style={{ color: '#fff' }}>provar o ganho em R$</b> de cada projeto. E você acompanha tudo — progresso e retorno — num painel só.</p>
          <div className="row">
            <a className="cta" href="#contato">Quero para minha empresa</a>
            <a className="cta ghost" href="#planos">Ver planos</a>
          </div>
          <div className="trust">
            <span>Criado por <b>Israel Souza</b></span><span>·</span>
            <span><b>+1.500</b> profissionais treinados</span><span>·</span>
            <span><b>US$ 20MM</b> em ganhos gerados</span>
          </div>
        </div>
      </header>

      {/* POR QUE AGORA */}
      <section className="sec band">
        <div className="wrap center">
          <div className="seclabel">Por que agora</div>
          <h2 className="big">Eficiência virou a prioridade nº 1 — e falta quem execute dentro da empresa.</h2>
          <p className="lead center">As empresas querem fazer mais com o que já têm. O problema não é vontade: é capacidade interna pra transformar isso em resultado.</p>
          <div className="stats" style={{ marginTop: 38 }}>
            <div className="stat"><div className="n num">67%</div><div className="l">dos executivos: eficiência é a prioridade nº 1</div></div>
            <div className="stat"><div className="n num">47%</div><div className="l">das empresas operam com processos informais</div></div>
            <div className="stat"><div className="n num">72%</div><div className="l">da indústria investiu em modernização no último ano</div></div>
            <div className="stat"><div className="n num">65,6%</div><div className="l">veem mais produtividade após capacitar o time</div></div>
          </div>
          <p style={{ color: 'var(--txt3)', fontSize: 12, marginTop: 16 }}>Fontes: Logicalis, Bain, CNI, pesquisa Educação Tech 2025/26.</p>
        </div>
      </section>

      {/* DOR */}
      <section className="sec dor">
        <div className="wrap">
          <div className="seclabel">O problema</div>
          <h2 className="big">Seu time trabalha muito. Mas cadê o resultado pra mostrar?</h2>
          <ul style={{ marginTop: 20 }}>
            <li>Todo mundo ocupado apagando incêndio — e no fim do mês, nenhum ganho medível.</li>
            <li>As pessoas percebem problemas, mas não sabem qual atacar nem que ferramenta usar.</li>
            <li>Contratar consultoria grande é caro — e o conhecimento vai embora quando ela sai.</li>
            <li>Você não tem tempo de acompanhar projeto por projeto, um a um.</li>
          </ul>
        </div>
      </section>

      {/* SOLUÇÃO + PAINEL */}
      <section className="sec">
        <div className="wrap">
          <div className="seclabel">A solução</div>
          <div className="split">
            <div>
              <h2 className="big">Uma célula de melhoria contínua <span className="grad">dentro da sua empresa</span>.</h2>
              <p className="lead" style={{ marginBottom: 26 }}>Por uma fração do custo de uma consultoria — e a capacidade fica no seu time, pra sempre.</p>
              <div className="steps">
                <div className="step"><div className="k">1</div><div><h3>Seu time acessa e aprende fazendo</h3><p>Vídeos curtos + ferramentas que se preenchem com os dados reais da empresa. Nada de teoria solta.</p></div></div>
                <div className="step"><div className="k">2</div><div><h3>Aplica num problema real da empresa</h3><p>Cada pessoa escolhe um problema, encontra a causa e entrega uma melhoria concreta em 90 dias.</p></div></div>
                <div className="step"><div className="k">3</div><div><h3>Você vê o progresso e o ganho em R$</h3><p>No painel do coordenador: quem está avançando, quem travou, e quanto cada projeto gerou de retorno.</p></div></div>
              </div>
            </div>
            <div className="panel" aria-label="Prévia do painel do coordenador">
              <div className="head"><div className="t">Minha Equipe · Painel</div><div style={{ fontSize: 11, color: 'var(--gain)', fontWeight: 700 }}>● ao vivo</div></div>
              <div className="kpis">
                <div className="kpi"><div className="kl">Pessoas</div><div className="kv num">7 / 10</div></div>
                <div className="kpi"><div className="kl">Projetos ativos</div><div className="kv num">9</div></div>
                <div className="kpi g"><div className="kl">Ganho do time</div><div className="kv num">R$ 214k</div></div>
              </div>
              <div className="prow h"><div>Membro</div><div>Projeto</div><div style={{ textAlign: 'right' }}>Ganho R$</div></div>
              <div className="prow"><div>Ana Ribeiro</div><div style={{ color: 'var(--txt2)' }}>Redução de refugo</div><div className="money">R$ 47,6k</div></div>
              <div className="prow"><div>Carlos Menezes</div><div style={{ color: 'var(--txt2)' }}>Setup de máquina</div><div className="money">R$ 63,2k</div></div>
              <div className="prow"><div>Bruna Alves</div><div style={{ color: 'var(--txt2)' }}>Consumo de energia</div><div className="money">R$ 38,9k</div></div>
              <div className="prow"><div>Diego Souza</div><div style={{ color: 'var(--txt2)' }}>Retrabalho NF</div><div className="money">R$ 64,7k</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* 8 TRILHAS */}
      <section className="sec band">
        <div className="wrap center">
          <div className="seclabel">O que seu time vai dominar</div>
          <h2 className="big">8 trilhas — do dia a dia ao nível especialista.</h2>
          <p className="lead center">Cada trilha é uma capacidade prática que fica instalada no seu time. Do primeiro resultado em 90 dias até liderar projetos estratégicos.</p>
          <div className="trilhas">
            {TRILHAS.map((t) => (
              <div key={t.n} className={`tcard${t.anchor ? ' anchor' : ''}`}>
                <div className="tn">{t.n}</div>
                <div>
                  {t.anchor && <span className="badge">🏆 Formação LBW · completa</span>}
                  <h3>{t.nome}</h3>
                  <p>{t.obj}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARATIVO */}
      <section className="sec">
        <div className="wrap center">
          <div className="seclabel">LBW × Consultoria</div>
          <h2 className="big">Mais barato. E o conhecimento fica com você.</h2>
          <p className="lead center">Consultoria resolve um problema pra você. A LBW desenvolve pessoas capazes de resolver vários.</p>
          <div className="cmp" style={{ marginTop: 30 }}>
            <div className="col">
              <h3>Consultoria tradicional</h3>
              <ul className="no">
                <li>Caro — projeto pontual de dezenas de milhares</li>
                <li>O conhecimento vai embora quando eles saem</li>
                <li>Depende da agenda de terceiros</li>
                <li>Seu time assiste, não aprende a fazer</li>
              </ul>
            </div>
            <div className="col win">
              <h3>LBW para Empresas</h3>
              <ul className="yes">
                <li>Fração do custo — plano por vaga, anual</li>
                <li>A capacidade fica no seu time, pra sempre</li>
                <li>Auto-serviço: roda no ritmo da empresa</li>
                <li>Seu time entrega resultado medível em R$</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FUNDADOR */}
      <section className="sec">
        <div className="wrap">
          <div className="founder">
            <div className="ph"><img src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" alt="Israel Souza" /></div>
            <div>
              <div className="seclabel">Quem está por trás</div>
              <h2>Israel Souza</h2>
              <p>Mais de <b>20 anos</b> aplicando melhoria de processos em <b>multinacionais e no setor público</b>. Treinei mais de <b>1.500 profissionais</b> e participei de projetos que geraram mais de <b>US$ 20 milhões</b> em ganhos.</p>
              <p>Percebi que o profissional não trava por falta de capacidade — trava por não saber qual problema escolher e qual passo dar. <b>Gerar resultado não é dom, é método.</b> É isso que a plataforma coloca no seu time.</p>
              <div className="fstats">
                <div><div className="n num">20+</div><div className="l">anos de experiência</div></div>
                <div><div className="n num">4</div><div className="l">multinacionais</div></div>
                <div><div className="n num">+1.500</div><div className="l">profissionais treinados</div></div>
                <div><div className="n num">US$ 20MM</div><div className="l">em ganhos gerados</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="sec band" id="planos">
        <div className="wrap center">
          <div className="seclabel">Planos</div>
          <h2 className="big">Escolha pelo tamanho do time.</h2>
          <p className="lead center">Quanto mais gente, maior o desconto. Acesso anual, todas as trilhas e o painel do coordenador incluídos. Um único projeto pode pagar o investimento.</p>
          <div className="plans" style={{ marginTop: 36 }}>
            <div className="plan">
              <div className="seats">Time pequeno</div>
              <div className="price num">3 vagas</div>
              <div className="per">acesso anual · por empresa</div>
              <div className="off">10% de desconto</div>
              <ul>
                <li>3 profissionais na plataforma</li>
                <li>Painel do coordenador (você)</li>
                <li>Ganho em R$ de cada projeto</li>
                <li>Certificado por trilha</li>
              </ul>
              <a className="cta ghost" href="#contato">Começar</a>
            </div>
            <div className="plan feat">
              <div className="tag">Mais escolhido</div>
              <div className="seats">Time em crescimento</div>
              <div className="price num">5 vagas</div>
              <div className="per">acesso anual · por empresa</div>
              <div className="off">20% de desconto</div>
              <ul>
                <li>5 profissionais na plataforma</li>
                <li>Painel do coordenador (você)</li>
                <li>Ganho em R$ + acompanhamento</li>
                <li>Certificado por trilha</li>
              </ul>
              <a className="cta" href="#contato">Começar</a>
            </div>
            <div className="plan">
              <div className="seats">Time grande</div>
              <div className="price num">10 vagas</div>
              <div className="per">acesso anual · por empresa</div>
              <div className="off">25% de desconto</div>
              <ul>
                <li>10 profissionais na plataforma</li>
                <li>Painel do coordenador (você)</li>
                <li>Ganho em R$ + acompanhamento</li>
                <li>Certificado por trilha</li>
              </ul>
              <a className="cta ghost" href="#contato">Começar</a>
            </div>
          </div>
          <p className="plansnote">Mais de 15 pessoas? <a href="#contato" style={{ color: 'var(--sky)', fontWeight: 700 }}>Fale com a gente</a> — o desconto vai até 35%.</p>
        </div>
      </section>

      {/* CTA + FORM */}
      <section className="sec cta-band" id="contato">
        <div className="wrap center">
          <div className="seclabel">Vamos conversar</div>
          <h2 className="big">Leve resultado medível pra dentro da sua empresa.</h2>
          <p className="lead center" style={{ marginBottom: 28 }}>Preencha e a gente te mostra o plano certo pro tamanho do seu time.</p>
          <form className="formcard" onSubmit={enviar}>
            <div className="grid2">
              <div className="field"><label>Seu nome</label><input name="nome" placeholder="Nome" /></div>
              <div className="field"><label>Empresa</label><input name="empresa" placeholder="Nome da empresa" /></div>
            </div>
            <div className="grid2">
              <div className="field"><label>E-mail</label><input name="email" type="email" placeholder="voce@empresa.com" /></div>
              <div className="field"><label>Nº de pessoas</label>
                <select name="pessoas"><option>1–3</option><option>4–5</option><option>6–10</option><option>11–15</option><option>16+</option></select>
              </div>
            </div>
            <button className="cta" style={{ width: '100%', marginTop: 6 }} type="submit">Falar com a LBW →</button>
            <p style={{ color: 'var(--txt3)', fontSize: 12, marginTop: 12 }}>Sem compromisso. Resposta em até 1 dia útil.</p>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec">
        <div className="wrap">
          <div className="seclabel center" style={{ textAlign: 'center' }}>Perguntas frequentes</div>
          <div className="faq" style={{ marginTop: 22 }}>
            <details><summary>Precisa instalar algo?</summary><div className="ans">Não. É 100% na nuvem. Seu time acessa pelo navegador; você acompanha pelo painel do coordenador.</div></details>
            <details><summary>Como vocês provam o resultado em R$?</summary><div className="ans">Cada projeto usa a ferramenta de Ganhos Tangíveis: compara o antes e o depois e calcula o ganho real em reais. Você vê o total do time consolidado no painel.</div></details>
            <details><summary>A LBW substitui uma consultoria?</summary><div className="ans">Ela faz mais: em vez de resolver um problema pontual e ir embora, forma pessoas capazes de resolver vários problemas ao longo do tempo. A capacidade fica na empresa.</div></details>
            <details><summary>E se eu precisar de mais vagas depois?</summary><div className="ans">É só ampliar o plano — o limite de pessoas do seu time é definido pelo pacote e pode crescer quando quiser.</div></details>
            <details><summary>Quanto tempo o time precisa dedicar?</summary><div className="ans">Uma pequena ação por dia útil. As ferramentas são passo a passo — não precisa ser especialista.</div></details>
          </div>
        </div>
      </section>

      <RodapeInstitucional />
    </div>
  );
}
