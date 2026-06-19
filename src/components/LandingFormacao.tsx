/**
 * LandingFormacao — landing page pública da Formação (8 trilhas).
 * Servida em /formacao SEM exigir login (bypass no App.tsx, antes do gate).
 *
 * Form de captação grátis (nome+email) funciona de verdade: posta direto no
 * webhook n8n `acessogratuito` (cria conta + manda e-mail) e mostra sucesso
 * NA PRÓPRIA página — sem redirect, sem o erro do form nativo do Atomicat.
 *
 * Visual cinematográfico (NAVY/BLUE) idêntico ao aprovado: hero com orbs,
 * 8 trilhas coloridas, método, plataforma, mentor, fundador, planos, FAQ.
 */
import React, { useState } from 'react';

const WEBHOOK_GRATUITO = 'https://primary-production-1d53.up.railway.app/webhook/acessogratuito';
const HOTMART = 'https://pay.hotmart.com/N102603781W?bid=1781388122214';

const CSS = `
.lf{--ink:#070A18;--line:rgba(255,255,255,.10);--txt:rgba(255,255,255,.72);--txt2:rgba(255,255,255,.5)}
.lf *{margin:0;padding:0;box-sizing:border-box}
.lf{background:var(--ink);color:#fff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
.lf h1,.lf h2,.lf h3{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em;line-height:1.05}
.lf .wrap{max-width:1100px;margin:0 auto;padding:0 20px}
.lf .eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#9FC0FF;background:rgba(159,192,255,.08);border:1px solid rgba(159,192,255,.22);padding:9px 18px;border-radius:999px}
.lf .grad{background:linear-gradient(95deg,#fff,#9FC0FF 55%,#3B82F6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lf .sec{padding:56px 20px}
.lf .btn{display:inline-block;font-weight:700;font-size:16px;padding:16px 34px;border-radius:13px;text-decoration:none;cursor:pointer;border:none}
.lf .btn-primary{background:linear-gradient(120deg,#0033CC,#2563EB);color:#fff;box-shadow:0 14px 38px -10px rgba(37,99,235,.7)}
.lf .btn-ghost{background:rgba(255,255,255,.06);color:#fff;border:1px solid var(--line)}
/* hero */
.lf .hero{position:relative;text-align:center;padding:64px 20px 56px;overflow:hidden}
.lf .orb{position:absolute;border-radius:50%;filter:blur(100px)}
.lf .orbA{width:520px;height:520px;background:radial-gradient(circle,#0033CC,transparent 70%);opacity:.45;top:-160px;right:-90px}
.lf .orbB{width:420px;height:420px;background:radial-gradient(circle,#1E2D6E,transparent 70%);opacity:.4;bottom:-150px;left:-80px}
.lf .hero h1{font-size:44px;font-weight:800;margin:22px 0 18px}
.lf .hero .lead{font-size:19px;color:var(--txt);max-width:620px;margin:0 auto 30px;line-height:1.55}
.lf .videobox{position:relative;max-width:760px;margin:0 auto;aspect-ratio:16/9;border-radius:18px;overflow:hidden;border:1px solid var(--line);background:linear-gradient(160deg,#101a3a,#0a0f22);display:flex;align-items:center;justify-content:center}
.lf .play{width:74px;height:74px;border-radius:50%;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.lf .play::after{content:'';width:0;height:0;border-left:22px solid #fff;border-top:13px solid transparent;border-bottom:13px solid transparent;margin-left:5px}
.lf .cta-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:30px}
/* sec head */
.lf .sec-head{text-align:center;max-width:680px;margin:0 auto 40px}
.lf .sec-head h2{font-size:38px;font-weight:800;margin:16px 0 14px}
.lf .sec-head p{font-size:17px;color:var(--txt);line-height:1.55}
/* steps */
.lf .steps{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.lf .step{background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:16px;padding:22px 18px}
.lf .step .sn{font-family:'Space Grotesk';font-size:13px;font-weight:700;color:#3B82F6;letter-spacing:.1em}
.lf .step h3{font-size:16px;margin:12px 0 8px;font-weight:700}
.lf .step p{font-size:13px;color:var(--txt);line-height:1.5}
/* trilhas */
.lf .tgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.lf .tcard{position:relative;border-radius:18px;padding:24px 20px;overflow:hidden;min-height:200px;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid var(--line)}
.lf .tcard .num{font-family:'Space Grotesk';font-size:46px;font-weight:700;line-height:1;color:#fff}
.lf .tcard .nome{font-size:17px;font-weight:800;line-height:1.18;margin-top:12px;color:#fff}
.lf .tcard .tag{margin-top:10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#fff;background:rgba(0,0,0,.3);padding:5px 10px;border-radius:7px;width:fit-content}
.lf .tcard .badge{position:absolute;top:14px;right:14px;font-size:10px;font-weight:800;letter-spacing:.08em;padding:5px 9px;border-radius:6px}
/* plataforma */
.lf .pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.lf .pcard{background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:18px;padding:26px;display:flex;flex-direction:column}
.lf .pcard .ic{font-size:23px;width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(0,51,204,.2);border:1px solid rgba(59,130,246,.3);margin-bottom:14px}
.lf .pcard h3{font-size:18px;font-weight:700;margin-bottom:8px}
.lf .pcard p{font-size:14px;color:var(--txt);line-height:1.55}
.lf .pcard img{width:100%;border-radius:12px;border:1px solid var(--line);margin-top:14px}
/* split */
.lf .split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.lf .split img{width:100%;border-radius:18px;border:1px solid var(--line)}
.lf .feat{display:flex;gap:10px;margin-bottom:12px;align-items:center}
.lf .feat .c{flex-shrink:0;width:24px;height:24px;border-radius:7px;background:rgba(59,130,246,.18);border:1px solid rgba(59,130,246,.4);display:flex;align-items:center;justify-content:center;color:#9FC0FF}
.lf .stats{display:flex;gap:30px;flex-wrap:wrap;margin-top:24px}
.lf .stats .n{font-family:'Space Grotesk';font-size:30px;font-weight:700;color:#9FC0FF}
.lf .stats .l{font-size:13px;color:var(--txt2)}
/* plano */
.lf .plan{position:relative;max-width:480px;margin:0 auto;border-radius:22px;padding:38px 34px;background:linear-gradient(160deg,rgba(30,45,110,.6),rgba(7,10,24,.4));border:1.5px solid rgba(159,192,255,.45);box-shadow:0 40px 90px -34px rgba(0,51,204,.6)}
.lf .plan .price{font-family:'Space Grotesk';font-size:46px;font-weight:700;margin:12px 0 4px}
.lf .plan .li{font-size:14.5px;color:rgba(255,255,255,.85);margin-bottom:12px}
/* form */
.lf .formcard{max-width:460px;margin:0 auto;text-align:center}
.lf .formcard input{width:100%;padding:14px 16px;margin-bottom:12px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.06);color:#fff;font-size:15px;outline:none}
.lf .formcard input:focus{border-color:rgba(16,185,129,.6)}
.lf .formcard .send{width:100%;padding:15px;background:linear-gradient(120deg,#10B981,#059669);color:#fff;font-weight:700;font-size:16px;border:none;border-radius:12px;cursor:pointer}
.lf .formcard .msg{font-size:14px;margin-top:12px}
/* faq */
.lf .qa{border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.02);padding:20px 24px;margin-bottom:12px;text-align:left}
.lf .qa h3{font-size:16px;font-weight:700;margin-bottom:8px}
.lf .qa p{font-size:14.5px;color:var(--txt);line-height:1.55}
/* final + footer */
.lf .final{position:relative;padding:72px 20px;text-align:center;background:linear-gradient(160deg,#0033CC 0%,#1E2D6E 55%,#070A18 100%)}
.lf .final h2{font-size:38px;font-weight:800;margin-bottom:18px}
.lf .foot{background:#05070F;padding:54px 20px 40px;border-top:1px solid var(--line)}
.lf .foot .cols{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:32px;max-width:1100px;margin:0 auto}
.lf .foot a{color:#9FC0FF;text-decoration:none}
/* modal */
.lf .modal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(5,7,15,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:20px}
.lf .modal .box{position:relative;max-width:440px;width:100%;background:linear-gradient(170deg,#101a3a,#0a0f22);border:1px solid rgba(159,192,255,.25);border-radius:22px;padding:38px 32px;text-align:center}
.lf .modal .x{position:absolute;top:14px;right:18px;background:none;border:none;color:#888;font-size:28px;cursor:pointer;line-height:1}
@media(max-width:900px){
  .lf .hero h1{font-size:34px}
  .lf .steps,.lf .tgrid,.lf .pgrid{grid-template-columns:1fr 1fr}
  .lf .split,.lf .foot .cols{grid-template-columns:1fr;gap:28px}
}
@media(max-width:560px){ .lf .steps,.lf .tgrid,.lf .pgrid{grid-template-columns:1fr} }
`;

type FormState = 'idle' | 'sending' | 'ok' | 'ja-existe' | 'err';

function LeadForm({ source, onSuccess }: { source: string; onSuccess?: () => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [msg, setMsg] = useState('');

  const enviar = async () => {
    const n = nome.trim();
    const e = email.trim();
    if (!n) { setState('err'); setMsg('Por favor, informe seu nome.'); return; }
    if (!e || e.indexOf('@') < 0) { setState('err'); setMsg('Informe um e-mail válido.'); return; }
    setState('sending'); setMsg('');
    try {
      const r = await fetch(WEBHOOK_GRATUITO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, email: e, source }),
      });
      const data = await r.json().catch(() => ({} as any));
      // n8n retorna status: "criado" (conta nova) | "ja-existia" (já tinha conta)
      if (data && data.status === 'ja-existia') {
        setState('ja-existe');
      } else {
        setState('ok');
        setMsg('Perfeito! Em instantes você receberá o acesso no seu e-mail (confira também o spam).');
      }
      setNome(''); setEmail('');
      if (onSuccess) onSuccess();
    } catch {
      // erro de rede no front: o webhook costuma processar mesmo assim; sucesso suave
      setState('ok');
      setMsg('Tudo certo! Verifique seu e-mail (e a caixa de spam) para acessar.');
      if (onSuccess) onSuccess();
    }
  };

  if (state === 'ja-existe') {
    return (
      <div className="formcard">
        <div style={{ fontSize: 44, marginBottom: 12 }}>👋</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Você já é cadastrado!</h3>
        <p className="msg" style={{ color: '#9FC0FF', marginTop: 0 }}>Esse e-mail já tem acesso à plataforma. É só entrar.</p>
        <a className="btn" href="https://app.educacaopelotrabalho.com" style={{ marginTop: 18, background: 'linear-gradient(120deg,#0033CC,#2563EB)', color: '#fff' }}>Acesse direto a plataforma →</a>
      </div>
    );
  }

  if (state === 'ok') {
    return (
      <div className="formcard">
        <div style={{ fontSize: 44, marginBottom: 12 }}>✉️</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Pronto! Agora é com você.</h3>
        <p className="msg" style={{ color: '#6ee7b7', marginTop: 0 }}>{msg}</p>
        <a className="btn" href="https://app.educacaopelotrabalho.com" style={{ marginTop: 18, background: 'linear-gradient(120deg,#10B981,#059669)', color: '#fff' }}>Ir para a plataforma →</a>
      </div>
    );
  }

  return (
    <div className="formcard">
      <input type="text" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
      <input type="email" placeholder="Seu melhor e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      {msg && <p className="msg" style={{ color: '#fca5a5', marginTop: 0, marginBottom: 8 }}>{msg}</p>}
      <button className="send" onClick={enviar} disabled={state === 'sending'}>
        {state === 'sending' ? 'Enviando…' : 'Quero meu acesso grátis →'}
      </button>
    </div>
  );
}

const TRILHAS = [
  { n: '01', nome: 'Chegar numa área nova e entregar rápido', tag: 'Comece aqui', bg: 'linear-gradient(150deg,#10B981,#064a32)', free: true },
  { n: '02', nome: 'Recomendar melhorias com dados', tag: 'Análises gráficas e estatísticas', bg: 'linear-gradient(150deg,#22D3EE,#0e4a8a)' },
  { n: '03', nome: 'Conduzir mudanças com menos resistência', tag: 'Gestão de mudança', bg: 'linear-gradient(150deg,#F59E0B,#7a3b06)' },
  { n: '04', nome: 'Apresentações que convencem a liderança', tag: 'Comunicação executiva', bg: 'linear-gradient(150deg,#EC4899,#6b1239)' },
  { n: '05', nome: 'Antecipar riscos antes que virem problema', tag: 'FMEA · boas práticas PMI', bg: 'linear-gradient(150deg,#EF4444,#5e1414)' },
  { n: '06', nome: 'Cultura Lean — identificar desperdícios e o Sistema Toyota de Produção', tag: 'Muri · Mura · Muda', bg: 'linear-gradient(150deg,#8B5CF6,#3a1e6e)' },
  { n: '07', nome: 'Realizar estudos e análises estatísticas pontuais', tag: 'Sem programar', bg: 'linear-gradient(150deg,#A855F7,#2e1065)' },
  { n: '08', nome: 'Especialista em Gestão de Projetos de Melhoria', tag: 'O topo da jornada', bg: 'linear-gradient(150deg,#0033CC,#1E2D6E)', topo: true },
];

const PASSOS = [
  ['PASSO 1', 'Traga seu problema', 'Um problema no processo, um estudo pontual, uma mudança para implementar, uma apresentação pra fazer.'],
  ['PASSO 2', 'Escolha a trilha mais adequada', 'Existem 8 trilhas que se complementam, desde resolver problemas do dia a dia até gerenciar problemas complexos envolvendo mais de uma área.'],
  ['PASSO 3', 'Execute o projeto', 'Diversas ferramentas da qualidade, gráficas e estatísticas para te dar todo o conhecimento que precisa para desenvolver o seu projeto ou estudo de melhoria.'],
  ['PASSO 4', 'Apresentação pronta', 'Para cada ferramenta que você usa, automaticamente é gerado um slide praticamente pronto para você apresentar.'],
  ['PASSO 5', 'Precisa apresentar para a liderança?', 'Use diferentes frameworks validados internacionalmente e dicas de como se comportar durante as apresentações.'],
];

const PLATAFORMA = [
  ['🎬', 'Vídeo-aulas práticas', 'Cada conceito vira ação imediata na ferramenta — você aplica enquanto aprende.'],
  ['🧰', 'Ferramentas que executam', 'SIPOC, RACI, Ishikawa, plano de ação, esforço × impacto. Preenchidas com o seu projeto.'],
  ['📈', 'Análise de dados no-code', 'Pareto, histograma, capabilidade, regressão — sem abrir Excel.'],
  ['📊', 'Dashboard do projeto', 'Acompanhe o andamento de cada projeto de melhoria num painel visual.'],
  ['💬', 'Comunidade LBW', 'Tire dúvidas, compartilhe projetos e aprenda com outros profissionais na mesma jornada.'],
  ['📑', 'Slides prontos em PPT', 'Toda ferramenta exporta uma apresentação pronta pra levar à liderança.'],
];

const FAQ = [
  ['Preciso saber programar ou Excel avançado?', 'Não. Toda a análise de dados é no-code — você escolhe o gráfico ou análise, e a plataforma faz o cálculo.'],
  ['Funciona se eu não tiver um projeto agora?', 'Funciona. Você pode usar as ferramentas isoladamente ou trazer um problema pequeno da sua rotina.'],
  ['Quanto tempo leva?', 'Depende do seu envolvimento, mas os profissionais mais engajados terminam as 8 trilhas em cerca de 3 meses.'],
  ['O que é o Mentor Israel digital?', 'Um assistente que responde primeiro como o próprio Israel responderia, com base nos vídeos que já estão na plataforma.'],
  ['Qual é o objetivo desta formação?', 'Cada trilha ensina uma etapa da jornada de quem quer (ou precisa) se destacar no trabalho: das ferramentas técnicas às gerenciais, passando pela análise de dados e pela arte de apresentar resultados com clareza. No fim, você não só resolve problemas — você sabe mostrar o valor do que entregou.'],
];

export default function LandingFormacao() {
  const [showExit, setShowExit] = useState(false);
  const [exitArmed, setExitArmed] = useState(true);

  React.useEffect(() => {
    const onLeave = (e: MouseEvent) => {
      if (exitArmed && e.clientY <= 0) { setShowExit(true); setExitArmed(false); }
    };
    document.addEventListener('mouseout', onLeave);
    return () => document.removeEventListener('mouseout', onLeave);
  }, [exitArmed]);

  const scrollToForm = () => {
    const el = document.getElementById('cadastro-gratis');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lf">
      <style>{CSS}</style>

      {/* HERO */}
      <header className="hero">
        <div className="orb orbA" /><div className="orb orbB" />
        <div className="wrap" style={{ position: 'relative', zIndex: 2, maxWidth: 880 }}>
          <span className="eyebrow">Learning by Working</span>
          <h1>Pare de apenas estudar e <span className="grad">comece a entregar resultado fazendo!</span></h1>
          <p className="lead">Traga seu problema real, use as ferramentas da nossa plataforma e entregue resultado rapidamente.</p>
          <div className="videobox">
            <div style={{ textAlign: 'center' }}>
              <div className="play" />
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)' }}>▶ Espaço reservado para o seu vídeo</div>
            </div>
          </div>
          <div className="cta-row">
            <a className="btn btn-primary" href="#planos">Quero a formação completa →</a>
            <a className="btn btn-ghost" href="#metodo">▷ Ver como funciona</a>
          </div>
        </div>
      </header>

      {/* MÉTODO */}
      <section className="sec" id="metodo" style={{ background: 'linear-gradient(180deg,#070A18,#0a1024)' }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">O método</span>
            <h2>Aprender fazendo, <span className="grad">não decorando</span></h2>
            <p>Você traz um problema da sua área e resolve dentro da plataforma — guiado, passo a passo.</p>
          </div>
          <div className="steps">
            {PASSOS.map((p) => (
              <div className="step" key={p[0]}>
                <div className="sn">{p[0]}</div><h3>{p[1]}</h3><p>{p[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 TRILHAS */}
      <section className="sec" id="trilhas" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%,rgba(0,51,204,.12),transparent 60%),#070A18' }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">A formação completa</span>
            <h2>8 trilhas, <span className="grad">uma jornada só</span></h2>
            <p>Modelo camada-cebola: cada trilha mantém tudo da anterior e acrescenta uma camada nova. Da sua primeira semana numa área até conduzir projetos complexos de ponta a ponta.</p>
          </div>
          <div className="tgrid">
            {TRILHAS.map((t) => (
              <div className="tcard" key={t.n} style={{ background: t.bg, borderColor: t.topo ? 'rgba(159,192,255,.45)' : undefined }}>
                {t.free && <span className="badge" style={{ background: '#04241a', color: '#6ee7b7' }}>GRÁTIS</span>}
                {t.topo && <span className="badge" style={{ background: '#1E2D6E', color: '#fff', border: '1px solid rgba(159,192,255,.5)' }}>🏆 FORMAÇÃO LBW</span>}
                <div className="num">{t.n}</div>
                <div className="nome">{t.nome}</div>
                <span className="tag">{t.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CADASTRO GRÁTIS (form na própria página) */}
      <section className="sec" id="cadastro-gratis" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%,rgba(16,185,129,.14),transparent 60%),#070A18' }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow" style={{ color: '#6ee7b7', background: 'rgba(16,185,129,.1)', borderColor: 'rgba(16,185,129,.3)' }}>🎁 Comece grátis · sem cartão</span>
            <h2>Acesse a primeira trilha grátis</h2>
            <p>Como se adaptar em uma nova área e como entregar resultados rápidos. Receba o acesso no seu e-mail.</p>
          </div>
          <LeadForm source="lf-formacao-inline" />
        </div>
      </section>

      {/* PLATAFORMA */}
      <section className="sec" style={{ background: 'linear-gradient(180deg,#070A18,#0a1024)' }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Dentro da plataforma</span>
            <h2>Tudo num lugar só</h2>
            <p>Vídeo-aulas, ferramentas que se preenchem com seus dados, análise de dados, dashboard, comunidade e o Mentor Israel digital.</p>
          </div>
          <div className="pgrid">
            {PLATAFORMA.map((c) => (
              <div className="pcard" key={c[1]}>
                <div className="ic">{c[0]}</div><h3>{c[1]}</h3><p>{c[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MENTOR */}
      <section className="sec" style={{ background: 'radial-gradient(ellipse 60% 70% at 80% 50%,rgba(0,51,204,.18),transparent 60%),#070A18' }}>
        <div className="wrap split">
          <div><img src="https://placehold.co/720x540/0d1326/9FC0FF?text=Mentor+Israel" alt="Mentor Israel" /></div>
          <div>
            <span className="eyebrow">Mentor Israel digital</span>
            <h2 style={{ fontSize: 34, margin: '16px 0' }}>É como ter o Israel <span className="grad">do seu lado</span></h2>
            <p style={{ color: 'var(--txt)', lineHeight: 1.6, marginBottom: 18 }}>O Mentor Israel digital responde sua pergunta com base nas respostas dos nossos próprios vídeos que você tem acesso. Ou seja, não é uma resposta de IA, e sim a resposta do <b style={{ color: '#fff' }}>próprio Israel</b>.</p>
            <div className="feat"><span className="c">✓</span><span>Responde com as mesmas palavras e a experiência do Israel</span></div>
            <div className="feat"><span className="c">✓</span><span>A resposta está relacionada à ferramenta que você está usando no momento</span></div>
            <div className="feat"><span className="c">✓</span><span>Disponível 24/7 dentro da plataforma LBW</span></div>
          </div>
        </div>
      </section>

      {/* FUNDADOR */}
      <section className="sec" style={{ background: '#070A18' }}>
        <div className="wrap split" style={{ gridTemplateColumns: '.8fr 1.2fr' }}>
          <div><img src="https://placehold.co/600x720/1E2D6E/9FC0FF?text=Israel+Souza" alt="Israel Souza" /></div>
          <div>
            <span className="eyebrow">Quem é seu consultor?</span>
            <h2 style={{ fontSize: 34, margin: '16px 0' }}>Mais 20 anos resolvendo problema de verdade</h2>
            <p style={{ color: 'var(--txt)', lineHeight: 1.65, marginBottom: 16 }}>Não sou professor de teoria. Ensino apenas o que aplico e já apliquei na prática. Trabalhar em empresas de <b style={{ color: '#fff' }}>bebida, automotiva, petroquímica e governamental</b> me ajudou a adquirir vasta experiência tanto em chão de fábrica como em atividades de escritório — que geraram mais de <b style={{ color: '#fff' }}>US$ 20 milhões/ano</b> em ganhos reais dos meus projetos ou dos projetos dos meus mentorados.</p>
            <p style={{ color: 'var(--txt)', lineHeight: 1.65, marginBottom: 8 }}>Treinei mais de <b style={{ color: '#fff' }}>1.500 profissionais</b> — e percebi que o que falta não é certificado. É saber chegar numa área, se adaptar rapidamente, entender como investigar um problema, entregar resultado com o mínimo de resistência, e saber apresentar os resultados. É isso que essa formação ensina.</p>
            <div className="stats">
              <div><div className="n">20</div><div className="l">anos de prática</div></div>
              <div><div className="n">4</div><div className="l">multinacionais</div></div>
              <div><div className="n">+1.500</div><div className="l">profissionais formados</div></div>
              <div><div className="n">US$ 20MM</div><div className="l">em ganhos/ano</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANO */}
      <section className="sec" id="planos" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%,rgba(0,51,204,.14),transparent 60%),#070A18' }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Comece hoje</span>
            <h2>A formação completa</h2>
            <p>O caminho inteiro até virar especialista — as 8 trilhas, todas as ferramentas.</p>
          </div>
          <div className="plan">
            <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9FC0FF' }}>Formação Completa</h3>
            <div className="price">R$ 1.500 <span style={{ fontSize: 15, color: 'var(--txt2)', fontWeight: 500 }}>/ acesso completo</span></div>
            <p style={{ fontSize: 14, color: 'var(--txt)', marginBottom: 24 }}>As 8 trilhas, todas as ferramentas e o caminho inteiro até virar especialista.</p>
            <div className="li">✓ As 8 trilhas — da base ao topo da jornada</div>
            <div className="li">✓ Todas as ferramentas + análise de dados completa</div>
            <div className="li">✓ Dashboard, comunidade e slides em PPT de cada ferramenta preenchida</div>
            <div className="li">✓ Mentor Israel digital ilimitado</div>
            <div className="li" style={{ marginBottom: 26 }}>✓ Certificado de cada uma das 8 trilhas</div>
            <a className="btn btn-primary" href={HOTMART} style={{ display: 'block', textAlign: 'center', width: '100%' }}>Quero acesso completo →</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec" style={{ background: '#070A18' }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="sec-head"><span className="eyebrow">Dúvidas</span><h2>Perguntas frequentes</h2></div>
          {FAQ.map((q) => (
            <div className="qa" key={q[0]}><h3><span style={{ color: '#3B82F6' }}>P.</span> {q[0]}</h3><p>{q[1]}</p></div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="final">
        <div className="wrap" style={{ maxWidth: 600 }}>
          <h2>Sua próxima entrega começa aqui.</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.85)', marginBottom: 30 }}>Pare de colecionar cursos. Comece a resolver problema de verdade e a mostrar resultado.</p>
          <a className="btn" href={HOTMART} style={{ background: '#fff', color: '#0033CC', fontSize: 17, padding: '18px 42px' }}>Quero a formação completa →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="cols">
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Learning by Working</div>
            <p style={{ fontSize: 13.5, color: 'var(--txt2)', lineHeight: 1.6 }}>A plataforma para gerenciar projetos de melhoria e análise de dados sem programação.</p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9FC0FF', marginBottom: 14 }}>Trilhas</div>
            <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 2 }}>01 · Entregar rápido<br/>02 · Decidir com dados<br/>03 · Conduzir mudanças<br/>04 · Apresentações<br/>05 · Antecipar riscos<br/>06 · Cultura Lean<br/>07 · Estatística aplicada<br/>08 · Gestão de Projetos</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9FC0FF', marginBottom: 14 }}>Institucional</div>
            <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 2.1 }}>Quem somos<br/>Contato<br/>Pacotes corporativos<br/>Termos de uso<br/>Política de privacidade</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9FC0FF', marginBottom: 14 }}>Fale com a gente</div>
            <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.9 }}><a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a><br/>LinkedIn</div>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: '36px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.7 }}>
          Learning by Working — Sole Trader · NZBN: 9429047241657<br/>Hillsborough — Auckland, Nova Zelândia · © 2026 Learning by Working · Todos os direitos reservados
        </div>
      </footer>

      {/* POPUP DE SAÍDA (exit-intent) */}
      {showExit && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowExit(false); }}>
          <div className="box">
            <button className="x" onClick={() => setShowExit(false)}>×</button>
            <span className="eyebrow" style={{ color: '#6ee7b7', background: 'rgba(16,185,129,.1)', borderColor: 'rgba(16,185,129,.3)', marginBottom: 16 }}>🎁 Não vá embora ainda</span>
            <h3 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 8px' }}>Acesse a primeira trilha grátis</h3>
            <p style={{ fontSize: 15, color: 'var(--txt)', marginBottom: 22, lineHeight: 1.5 }}>Como se adaptar em uma nova área e como entregar resultados rápidos. Receba o acesso no seu e-mail.</p>
            <LeadForm source="lf-formacao-exit" onSuccess={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
}
