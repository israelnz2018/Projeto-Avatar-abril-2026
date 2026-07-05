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
import RodapeInstitucional from './RodapeInstitucional';

// Player VTurb (smartplayer v4) da VSL da formação. ID e script são únicos deste vídeo.
const VTURB_PLAYER_ID = 'vid-6a476a65f6de1f8601713a37';
const VTURB_SCRIPT_SRC = 'https://scripts.converteai.net/21190591-631c-400a-94ca-b1400c31d918/players/6a476a65f6de1f8601713a37/v4/player.js';

const WEBHOOK_GRATUITO = 'https://primary-production-1d53.up.railway.app/webhook/acessogratuito';
const HOTMART = 'https://pay.hotmart.com/N102603781W?checkoutMode=2&bid=1781388122214';

const CSS = `
.lf{--ink:#070A18;--line:rgba(255,255,255,.10);--txt:rgba(255,255,255,.72);--txt2:rgba(255,255,255,.5)}
.lf *{margin:0;padding:0;box-sizing:border-box}
.lf{background:var(--ink);color:#fff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
.lf h1,.lf h2,.lf h3{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em;line-height:1.05}
.lf .wrap{max-width:1100px;margin:0 auto;padding:0 20px}
.lf .eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#9FC0FF;background:rgba(159,192,255,.08);border:1px solid rgba(159,192,255,.22);padding:9px 18px;border-radius:999px}
.lf .grad{background:linear-gradient(95deg,#fff,#9FC0FF 55%,#3B82F6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lf .sec{padding:56px 20px}
.lf .btn{display:inline-block;font-weight:700;font-size:16px;padding:16px 34px;border-radius:13px;text-decoration:none;cursor:pointer;border:none;transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s,filter .22s}
.lf .btn-primary{position:relative;overflow:hidden;background:linear-gradient(135deg,#2563EB 0%,#0033CC 55%,#1E2D6E 100%);color:#fff;
  box-shadow:0 1px 0 rgba(255,255,255,.25) inset, 0 -10px 24px -12px rgba(0,0,0,.5) inset, 0 18px 40px -12px rgba(37,99,235,.65), 0 4px 12px -4px rgba(0,51,204,.5);
  border:1px solid rgba(159,192,255,.35)}
.lf .btn-primary:hover{transform:translateY(-3px);filter:brightness(1.08);
  box-shadow:0 1px 0 rgba(255,255,255,.3) inset, 0 -10px 24px -12px rgba(0,0,0,.5) inset, 0 26px 56px -12px rgba(37,99,235,.8), 0 6px 16px -4px rgba(0,51,204,.6)}
.lf .btn-primary:active{transform:translateY(-1px)}
/* brilho que atravessa o botao no hover */
.lf .btn-primary::before{content:'';position:absolute;top:0;left:-140%;width:55%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-18deg);transition:left .6s ease}
.lf .btn-primary:hover::before{left:150%}
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
.lf .plan{position:relative;display:flex;flex-direction:column;max-width:480px;margin:0 auto;border-radius:22px;padding:38px 34px;background:linear-gradient(160deg,rgba(30,45,110,.6),rgba(7,10,24,.4));border:1.5px solid rgba(159,192,255,.45);box-shadow:0 40px 90px -34px rgba(0,51,204,.6)}
/* empurra o rodape (preço + botao + nota) pra base — alinha os 3 CTAs na mesma linha */
.lf .plan-foot{margin-top:auto}
/* nota de reforço abaixo do botao (preenche o vazio dos blocos 2 e 3) */
.lf .plan-note{font-size:12.5px;color:rgba(255,255,255,.55);text-align:center;margin-top:12px;line-height:1.5}
/* badge do titulo — padronizado: mesma altura (2 linhas) nos 3 blocos, centralizado */
.lf .plan-badge{display:flex;align-items:center;justify-content:center;text-align:center;min-height:64px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#BFD4FF;background:rgba(0,51,204,.22);border:1px solid rgba(159,192,255,.35);border-radius:16px;padding:10px 16px;margin-bottom:18px;line-height:1.3}
/* bloco 1 em destaque: borda brilhante que pulsa suavemente pra chamar atencao */
.lf .plan-featured{border:2px solid rgba(120,170,255,.85);box-shadow:0 0 0 1px rgba(120,170,255,.4), 0 0 34px -4px rgba(59,130,246,.65), 0 40px 90px -34px rgba(0,51,204,.6);animation:lf-glow 3.2s ease-in-out infinite}
@keyframes lf-glow{0%,100%{box-shadow:0 0 0 1px rgba(120,170,255,.35), 0 0 30px -6px rgba(59,130,246,.5), 0 40px 90px -34px rgba(0,51,204,.6)}50%{box-shadow:0 0 0 1px rgba(120,170,255,.6), 0 0 44px -2px rgba(59,130,246,.85), 0 40px 90px -34px rgba(0,51,204,.6)}}
@media(prefers-reduced-motion:reduce){ .lf .plan-featured{animation:none} }
.lf .plan .price{font-family:'Space Grotesk';font-size:32px;font-weight:700;margin:12px 0 4px;white-space:nowrap}
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
/* carrossel cinematográfico das trilhas (imagens circulando) */
.lf .netwrap{overflow:hidden;padding:6px 0 12px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent);mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)}
.lf .nettrack{display:flex;gap:16px;width:max-content;padding:0 8px;animation:lf-netscroll 60s linear infinite}
.lf .netwrap:hover .nettrack{animation-play-state:paused}
@keyframes lf-netscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lf .netcard{flex-shrink:0;width:288px;height:432px;border-radius:16px;overflow:hidden;position:relative;border:1px solid var(--line);background:#05070F;transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s}
.lf .netcard:hover{transform:translateY(-8px) scale(1.04);box-shadow:0 28px 56px -22px rgba(0,0,0,.8);z-index:2}
.lf .netcard .netimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
/* movimento / vida */
.lf{--mx:0;--my:0}
.lf .orb{transition:transform .5s cubic-bezier(.22,1,.36,1)}
.lf .orbA{transform:translate(calc(var(--mx)*26px),calc(var(--my)*26px))}
.lf .orbB{transform:translate(calc(var(--mx)*-30px),calc(var(--my)*-20px))}
.lf .step,.lf .pcard,.lf .qa{transition:transform .25s cubic-bezier(.22,1,.36,1),border-color .25s,box-shadow .25s}
.lf .step:hover,.lf .pcard:hover{transform:translateY(-5px);border-color:rgba(159,192,255,.4);box-shadow:0 22px 48px -26px rgba(0,0,0,.7)}
.lf .btn-primary{position:relative;overflow:hidden}
.lf .btn-primary::after{content:'';position:absolute;top:0;left:-120%;width:60%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-18deg);animation:lf-shine 4.5s ease-in-out infinite}
@keyframes lf-shine{0%,60%{left:-120%}80%,100%{left:130%}}
@media(prefers-reduced-motion:reduce){ .lf .nettrack,.lf .btn-primary::after{animation:none} .lf .orbA,.lf .orbB{transform:none} }
@media(max-width:900px){
  .lf .hero h1{font-size:34px}
  .lf .steps,.lf .tgrid,.lf .pgrid{grid-template-columns:1fr 1fr}
  .lf .split,.lf .foot .cols,.lf .plans-grid{grid-template-columns:1fr;gap:28px}
}
@media(max-width:560px){ .lf .steps,.lf .tgrid,.lf .pgrid{grid-template-columns:1fr} }
/* Corrige o visual dos botoes de checkout Hotmart: o CSS injetado da Hotmart
   (hotmart-fb) apagava o texto. Forca os nossos estilos de volta. */
.lf a.hotmart-fb.btn{color:#0033CC !important;text-shadow:none !important;filter:none !important;opacity:1 !important;text-decoration:none !important}
.lf a.hotmart-fb.btn-primary{color:#fff !important}
/* Remove só os pseudo-elementos que a Hotmart injeta (ela usa content com texto).
   Nosso brilho ::before usa content:'' — preservamos ele. */
.lf a.hotmart-fb::after{display:none !important}
/* CTA do hero (logo abaixo do VSL): maior e com pulso sutil pra chamar quem acabou de assistir */
.lf .btn-hero-cta{font-size:19px;padding:18px 44px;animation:lf-cta-pulse 2.6s ease-in-out infinite}
@keyframes lf-cta-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
@media(prefers-reduced-motion:reduce){ .lf .btn-hero-cta{animation:none} }
/* Reveal ao rolar: elementos entram com fade + leve deslize de baixo pra cima */
.lf .reveal{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.22,.61,.36,1),transform .7s cubic-bezier(.22,.61,.36,1)}
.lf .reveal.is-visible{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){ .lf .reveal{opacity:1;transform:none;transition:none} }
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
  { n: '01', nome: 'Chegar numa área nova e entregar rápido', tag: 'Comece aqui', img: '/trilhas/trilha-01.png', free: true },
  { n: '02', nome: 'Recomendar melhorias com dados', tag: 'Análises gráficas e estatísticas', img: '/trilhas/trilha-02.png' },
  { n: '03', nome: 'Conduzir mudanças com menos resistência', tag: 'Gestão de mudança', img: '/trilhas/trilha-03.png' },
  { n: '04', nome: 'Apresentações que convencem a liderança', tag: 'Comunicação executiva', img: '/trilhas/trilha-04.png' },
  { n: '05', nome: 'Antecipar riscos antes que virem problema', tag: 'FMEA · boas práticas PMI', img: '/trilhas/trilha-05.png' },
  { n: '06', nome: 'Cultura Lean — identificar desperdícios e o Sistema Toyota de Produção', tag: 'Muri · Mura · Muda', img: '/trilhas/trilha-06.png' },
  { n: '07', nome: 'Realizar estudos e análises estatísticas pontuais', tag: 'Sem programar', img: '/trilhas/trilha-07.png' },
  { n: '08', nome: 'Especialista em Gestão de Projetos de Melhoria', tag: 'O topo da jornada', img: '/trilhas/trilha-08.png', topo: true },
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
  ['🧰', 'Ferramentas que executam', 'SIPOC, RACI, Ishikawa, plano de ação, esforço × impacto, etc. Preenchidas com o seu projeto.'],
  ['📈', 'Análise de dados — do básico ao avançado', 'O software LBW faz todo o trabalho estatístico para você.'],
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
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Dispara "InitiateCheckout" quando o usuário clica para comprar (vai pro Hotmart).
  // É o evento que a campanha de VENDAS otimiza (separado do "Lead" do grátis).
  const trackCheckout = () => {
    try {
      const w = window as any;
      if (typeof w.fbq === 'function') {
        w.fbq('track', 'InitiateCheckout', { content_name: 'formacao-completa', value: 597, currency: 'BRL' });
      }
    } catch { /* silencioso */ }
  };

  // Dispara "ViewContent" quando o usuário clica no CTA do topo (rola até os planos).
  // Mede INTERESSE (foi ver o preço) — topo do funil, diferente da intenção de compra.
  const trackViewOffer = () => {
    try {
      const w = window as any;
      if (typeof w.fbq === 'function') {
        w.fbq('track', 'ViewContent', { content_name: 'formacao-planos' });
      }
    } catch { /* silencioso */ }
  };

  React.useEffect(() => {
    const onLeave = (e: MouseEvent) => {
      if (exitArmed && e.clientY <= 0) { setShowExit(true); setExitArmed(false); }
    };
    document.addEventListener('mouseout', onLeave);
    return () => document.removeEventListener('mouseout', onLeave);
  }, [exitArmed]);

  // Parallax leve do site inteiro (orbs seguem o mouse via --mx/--my).
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || window.matchMedia('(hover: none)').matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        el.style.setProperty('--my', ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  // Injeta o script do player VTurb uma única vez (evita duplicar em re-render).
  React.useEffect(() => {
    if (document.querySelector(`script[src="${VTURB_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = VTURB_SCRIPT_SRC;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Injeta o widget de checkout da Hotmart (popup) uma única vez.
  React.useEffect(() => {
    const SRC = 'https://static.hotmart.com/checkout/widget.min.js';
    if (!document.querySelector(`script[src="${SRC}"]`)) {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    const CSS = 'https://static.hotmart.com/css/hotmart-fb.min.css';
    if (!document.querySelector(`link[href="${CSS}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.type = 'text/css';
      l.href = CSS;
      document.head.appendChild(l);
    }
  }, []);

  // Reveal ao rolar: marca os blocos-alvo e revela quando entram na viewport.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Não anima o hero (topo) nem o carrossel de trilhas (.nettrack já se move).
    const targets = Array.from(
      root.querySelectorAll('.sec-head, .plan, .split > div, .step, .feat, .formcard, .pcard, .qa, .stats')
    ) as HTMLElement[];
    targets.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target); // anima uma vez só
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lf" ref={rootRef}>
      <style>{CSS}</style>

      {/* HERO */}
      <header className="hero">
        <div className="orb orbA" /><div className="orb orbB" />
        <div className="wrap" style={{ position: 'relative', zIndex: 2, maxWidth: 880 }}>
          <span className="eyebrow">Learning by Working – Educação pelo Trabalho</span>
          <h1>Pare de apenas estudar e <span className="grad">comece a entregar resultado fazendo!</span></h1>
          <p className="lead">Veja o vídeo abaixo e saiba quais são as maiores habilidades técnicas e gerenciais que você deve aprender para ser desejado pelas maiores e melhores empresas para se trabalhar, seja no Brasil ou no mundo.</p>
          <div className="videobox">
            <vturb-smartplayer
              id={VTURB_PLAYER_ID}
              style={{ display: 'block', margin: '0 auto', width: '100%' }}
            >
              <div
                className="vturb-player-placeholder"
                style={{ position: 'relative', width: '100%', padding: '56.25% 0 0', zIndex: 0, backgroundColor: 'black' }}
              />
            </vturb-smartplayer>
          </div>
          <div className="cta-row">
            <a className="btn btn-primary btn-hero-cta" href="#planos" onClick={trackViewOffer}>Quero a formação completa</a>
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
        </div>
        {/* Carrossel cinematográfico das trilhas (circulando) */}
        <div className="netwrap">
          <div className="nettrack">
            {[...TRILHAS, ...TRILHAS].map((t, i) => (
              <div className="netcard" key={i} style={{ borderColor: t.topo ? 'rgba(159,192,255,.45)' : undefined }}>
                <img className="netimg" src={t.img} alt={`Trilha ${t.n} — ${t.nome}`} loading="lazy" />
              </div>
            ))}
          </div>
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
          <div><img src="/ia-israel-digital.png" alt="Mentor Israel digital — chat" style={{ width: '100%', maxWidth: 360, aspectRatio: '432 / 662', display: 'block', margin: '0 auto', objectFit: 'contain', borderRadius: 12 }} /></div>
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
          <div><img src="/israel-foto.png" alt="Israel Souza" style={{ objectFit: 'cover', aspectRatio: '3/4' }} /></div>
          <div>
            <span className="eyebrow">Quem é seu consultor?</span>
            <h2 style={{ fontSize: 34, margin: '16px 0' }}>Mais de 20 anos resolvendo problemas de verdade</h2>
            <p style={{ color: 'var(--txt)', lineHeight: 1.65, marginBottom: 16 }}>Não sou professor de teoria. Ensino apenas o que aplico e já apliquei na prática. Trabalhar em empresas de <b style={{ color: '#fff' }}>equipamentos médicos, bebida, automotiva, petroquímica e governamental</b> me ajudou a adquirir vasta experiência tanto em chão de fábrica como em atividades de escritório, que geraram mais de <b style={{ color: '#fff' }}>US$ 20MM</b> em ganhos gerados pelos projetos dos meus alunos e pelos meus próprios projetos.</p>
            <p style={{ color: 'var(--txt)', lineHeight: 1.65, marginBottom: 8 }}>Treinei mais de <b style={{ color: '#fff' }}>1.500 profissionais</b> e percebi que o que falta não é certificado na parede. É saber chegar numa área, se adaptar rapidamente, entender como investigar um problema, entregar resultado com o mínimo de resistência, e saber apresentar os resultados. É isso que essa formação ensina.</p>
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
            <h2>Escolha o seu caminho</h2>
            <p>Da formação completa até se tornar consultor e representante da LBW.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28, alignItems: 'stretch', maxWidth: 1100, margin: '0 auto' }} className="plans-grid">
            <div className="plan plan-featured" style={{ margin: 0, maxWidth: 'none' }}>
              <h3 className="plan-badge">Formação Completa</h3>
              <div className="li">✓ Vídeo aula das 8 trilhas — da base ao topo da jornada</div>
              <div className="li">✓ Todas as ferramentas de gerenciamento de projetos de melhoria</div>
              <div className="li">✓ Software estatístico com análise de dados completa</div>
              <div className="li">✓ Dashboard, comunidade e slides em PPT de cada ferramenta preenchida</div>
              <div className="li">✓ Mentor Israel digital ilimitado</div>
              <div className="li" style={{ marginBottom: 24 }}>✓ Certificado de cada uma das 8 trilhas</div>
              <div className="plan-foot">
                <div style={{ fontSize: 15, color: 'var(--txt2)', marginBottom: 2 }}>de <s>R$ 1.500</s> por</div>
                <div className="price" style={{ margin: '0 0 2px' }}>
                  12x <span style={{ fontSize: 20 }}>de</span> R$ 61,74
                </div>
                <div style={{ fontSize: 15, color: 'var(--txt2)', marginBottom: 26 }}>ou R$ 597 à vista</div>
                <a className="btn btn-primary hotmart-fb hotmart__button-checkout" href={HOTMART} onClick={trackCheckout} style={{ display: 'block', textAlign: 'center', width: '100%' }}>Quero acesso completo</a>
                <p className="plan-note">🔒 Compra segura via Hotmart · Acesso imediato · 7 dias de garantia</p>
              </div>
            </div>
            <div className="plan" style={{ margin: 0, maxWidth: 'none' }}>
              <h3 className="plan-badge">Consultor em Melhoria de Processos</h3>
              <div className="li">✓ Tudo da Formação Completa</div>
              <div className="li">✓ Como implementar um programa de melhoria contínua em uma organização</div>
              <div className="li">✓ Training the Trainer — forme e conduza outros profissionais</div>
              <div className="li">✓ Como revisar projetos de melhoria dos alunos</div>
              <div className="li">✓ Acesso à plataforma LBW para usar na sua própria empresa</div>
              <div className="li" style={{ marginBottom: 26 }}>✓ Torne-se representante comercial da plataforma LBW</div>
              <div className="plan-foot">
                <div className="price" style={{ margin: '0 0 2px' }}>
                  12x <span style={{ fontSize: 20 }}>de</span> R$ 310,25
                </div>
                <div style={{ fontSize: 15, color: 'var(--txt2)', marginBottom: 26 }}>ou R$ 3.000 à vista</div>
                <span className="btn btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%', cursor: 'default' }}>Exclusivo para alunos</span>
                <p className="plan-note">Disponível para quem já concluiu a Formação Completa</p>
              </div>
            </div>
            <div className="plan" style={{ margin: 0, maxWidth: 'none' }}>
              <h3 className="plan-badge">Plataforma LBW Empresarial</h3>
              <div className="li">✓ Use a plataforma LBW para todos os seus funcionários</div>
              <div className="li">✓ Consultoria técnica e gerencial</div>
              <div className="li">✓ Adicione os seus próprios treinamentos na plataforma</div>
              <div className="li">✓ Ajuste a nossa plataforma às suas necessidades</div>
              <div className="li" style={{ marginBottom: 26 }}>✓ Gerencie todo o programa de excelência operacional da sua empresa pela plataforma LBW</div>
              <div className="plan-foot">
                <div className="price" style={{ margin: '0 0 2px' }}>SOB CONSULTA</div>
                <div style={{ fontSize: 15, color: 'var(--txt2)', marginBottom: 26 }}>valor sob medida para sua empresa</div>
                <a className="btn btn-primary" href="/pacotes-corporativos" style={{ display: 'block', textAlign: 'center', width: '100%' }}>Entrar em contato</a>
                <p className="plan-note">Planos sob medida para times e empresas · Fale com nosso time</p>
              </div>
            </div>
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
          <a className="btn hotmart-fb hotmart__button-checkout" href={HOTMART} onClick={trackCheckout} style={{ background: '#fff', color: '#0033CC', fontSize: 17, padding: '18px 42px' }}>Quero a formação completa →</a>
        </div>
      </section>

      {/* FOOTER — componente único compartilhado */}
      <RodapeInstitucional />

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
