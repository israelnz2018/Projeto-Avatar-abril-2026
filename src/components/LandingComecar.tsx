/**
 * LandingComecar — landing pública da oferta GRÁTIS (trilha 1).
 * Servida em /comecar SEM exigir login (bypass no App.tsx).
 *
 * Foco: captar nome+email pra trilha grátis. Form FIXO no corpo (hero),
 * posta no webhook n8n `acessogratuito`, mostra sucesso/"já cadastrado"
 * na própria página. As 8 trilhas e o plano completo entram como upsell.
 * Sem popup de saída (a página inteira já é a captura).
 *
 * Mesma linguagem visual da /formacao, com destaque VERDE (grátis).
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import RodapeInstitucional from './RodapeInstitucional';
import {
  Network, ListChecks, Users, BarChart3, GitBranch, Lightbulb, Fish, LineChart,
  Sparkles, Grid3x3, HelpCircle, Scale, ClipboardList, ArrowLeftRight,
} from 'lucide-react';

/** Revela o conteúdo com fade + slide-up quando entra na viewport (1x). */
function Reveal({ children, delay = 0, y = 26, className, style }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Parallax leve do site inteiro: escreve --mx/--my (-1..1) na raiz conforme o
 * mouse. Elementos usam essas vars no transform via CSS — sem re-render React.
 */
function useMouseParallax(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(hover: none)').matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mx = (e.clientX / window.innerWidth - 0.5) * 2;
        const my = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty('--mx', mx.toFixed(3));
        el.style.setProperty('--my', my.toFixed(3));
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, [ref]);
}

const WEBHOOK_GRATUITO = 'https://primary-production-1d53.up.railway.app/webhook/acessogratuito';

const CSS = `
.lc{--ink:#070A18;--line:rgba(255,255,255,.10);--txt:rgba(255,255,255,.72);--txt2:rgba(255,255,255,.5)}
.lc *{margin:0;padding:0;box-sizing:border-box}
.lc{background:var(--ink);color:#fff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
.lc h1,.lc h2,.lc h3{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em;line-height:1.05}
.lc .wrap{max-width:1100px;margin:0 auto;padding:0 20px}
.lc .eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#6ee7b7;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);padding:9px 18px;border-radius:999px}
.lc .grad{background:linear-gradient(95deg,#fff,#6ee7b7 55%,#10B981);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lc .gradblue{background:linear-gradient(95deg,#fff,#9FC0FF,#3B82F6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lc .sec{padding:56px 20px}
.lc .btn{display:inline-block;font-weight:700;font-size:16px;padding:16px 34px;border-radius:13px;text-decoration:none;cursor:pointer;border:none}
.lc .btn-green{background:linear-gradient(120deg,#10B981,#059669);color:#fff;box-shadow:0 14px 38px -10px rgba(16,185,129,.7)}
.lc .btn-blue{background:linear-gradient(120deg,#0033CC,#2563EB);color:#fff;box-shadow:0 14px 38px -10px rgba(37,99,235,.7)}
/* hero c/ form */
.lc .hero{position:relative;padding:64px 20px 56px;overflow:hidden}
.lc .orb{position:absolute;border-radius:50%;filter:blur(100px)}
.lc .orbA{width:520px;height:520px;background:radial-gradient(circle,#10B981,transparent 70%);opacity:.35;top:-160px;left:-90px}
.lc .orbB{width:420px;height:420px;background:radial-gradient(circle,#0033CC,transparent 70%);opacity:.4;bottom:-150px;right:-80px}
.lc .herogrid{position:relative;z-index:2;max-width:1040px;margin:0 auto;display:grid;grid-template-columns:1.1fr .9fr;gap:44px;align-items:center}
.lc .hero h1{font-size:42px;font-weight:800;margin:18px 0 16px}
.lc .hero .lead{font-size:18px;color:var(--txt);line-height:1.55;margin-bottom:18px}
.lc .checklist{list-style:none;margin-top:12px}
.lc .checklist li{display:flex;gap:10px;align-items:flex-start;font-size:15px;color:rgba(255,255,255,.85);margin-bottom:10px}
.lc .checklist .c{flex-shrink:0;color:#6ee7b7;font-weight:800}
/* form card */
.lc .formcard{background:linear-gradient(170deg,#101a3a,#0a0f22);border:1px solid rgba(16,185,129,.3);border-radius:20px;padding:32px 28px;text-align:center}
.lc .formcard .ftit{font-size:22px;font-weight:800;margin-bottom:6px}
.lc .formcard .fsub{font-size:14px;color:var(--txt);margin-bottom:20px;line-height:1.5}
.lc .formcard input{width:100%;padding:14px 16px;margin-bottom:12px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.06);color:#fff;font-size:15px;outline:none}
.lc .formcard input:focus{border-color:rgba(16,185,129,.6)}
.lc .formcard .send{width:100%;padding:15px;background:linear-gradient(120deg,#10B981,#059669);color:#fff;font-weight:700;font-size:16px;border:none;border-radius:12px;cursor:pointer}
.lc .formcard .msg{font-size:14px;margin-top:12px}
.lc .formcard .hint{font-size:12px;color:var(--txt2);margin-top:12px}
/* sec head */
.lc .sec-head{text-align:center;max-width:680px;margin:0 auto 40px}
.lc .sec-head h2{font-size:36px;font-weight:800;margin:16px 0 14px}
.lc .sec-head p{font-size:17px;color:var(--txt);line-height:1.55}
/* trilha1 ferramentas em 2 grupos */
.lc .grupo{margin-bottom:22px}
.lc .grupotit{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;color:#fff;margin-bottom:12px}
.lc .grupotit .gn{flex-shrink:0;width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#10B981,#059669);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff}
.lc .chips{display:flex;flex-wrap:wrap;gap:8px}
.lc .chip{font-size:13px;font-weight:600;color:rgba(255,255,255,.9);background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);padding:8px 14px;border-radius:9px}
.lc .duo{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px}
.lc .duocard{background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:16px;padding:24px}
.lc .duocard .e{font-size:22px;margin-bottom:10px}
.lc .duocard h3{font-size:17px;font-weight:700;margin-bottom:8px}
.lc .duocard p{font-size:14px;color:var(--txt);line-height:1.55}
/* upsell trilhas */
.lc .tgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
.lc .tcard{position:relative;border-radius:14px;padding:16px;min-height:120px;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid var(--line)}
.lc .tcard .num{font-family:'Space Grotesk';font-size:30px;font-weight:700;color:#fff}
.lc .tcard .nm{font-size:12px;font-weight:700;color:#fff;margin-top:6px}
/* final */
.lc .final{position:relative;padding:64px 20px;text-align:center;background:linear-gradient(160deg,#10B981 0%,#065f46 55%,#070A18 100%)}
.lc .final h2{font-size:36px;font-weight:800;margin-bottom:16px}
.lc .foot{background:#05070F;padding:54px 20px 40px;border-top:1px solid var(--line)}
.lc .foot .cols{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:32px;max-width:1100px;margin:0 auto}
.lc .foot a{color:#6ee7b7;text-decoration:none}
/* catálogo horizontal de ferramentas (carrossel auto) */
.lc .catwrap{overflow:hidden;position:relative;padding:8px 0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.lc .cattrack{display:flex;gap:14px;width:max-content;animation:lc-scroll 48s linear infinite}
.lc .catwrap:hover .cattrack{animation-play-state:paused}
@keyframes lc-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lc .toolcard{flex-shrink:0;display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.04);border:1px solid rgba(16,185,129,.25);border-radius:13px;padding:13px 18px}
.lc .toolcard .ti{flex-shrink:0;width:34px;height:34px;border-radius:9px;background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.3);display:flex;align-items:center;justify-content:center;color:#6ee7b7}
.lc .toolcard .tn{font-size:14px;font-weight:600;color:rgba(255,255,255,.92);white-space:nowrap}
/* 3 blocos (vídeos/mentor/certificado) com imagem no topo */
.lc .trio{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.lc .triocard{background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column}
.lc .triocard .imgph{aspect-ratio:16/9;background:linear-gradient(150deg,#101a3a,#0a0f22);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--txt2);font-size:13px}
.lc .triocard .body{padding:22px}
.lc .triocard .e{font-size:24px;margin-bottom:10px}
.lc .triocard h3{font-size:17px;font-weight:700;margin-bottom:8px}
.lc .triocard p{font-size:14px;color:var(--txt);line-height:1.55}
/* trilhas estilo Netflix (carrossel horizontal) */
.lc .netwrap{overflow-x:auto;padding:6px 0 18px;scrollbar-width:thin;scroll-snap-type:x mandatory}
.lc .netwrap::-webkit-scrollbar{height:8px}
.lc .netwrap::-webkit-scrollbar-thumb{background:rgba(159,192,255,.3);border-radius:4px}
.lc .nettrack{display:flex;gap:16px;width:max-content;padding:0 2px}
.lc .netcard{scroll-snap-align:start;flex-shrink:0;width:288px;height:432px;border-radius:16px;overflow:hidden;position:relative;border:1px solid var(--line);transition:transform .25s,box-shadow .25s;cursor:default;background:#05070F}
.lc .netcard:hover{transform:translateY(-6px) scale(1.02);box-shadow:0 24px 50px -20px rgba(0,0,0,.7)}
.lc .netcard .netimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
/* sobre você (enxuto) */
.lc .about{display:grid;grid-template-columns:.5fr 1fr;gap:32px;align-items:center;max-width:900px;margin:0 auto}
.lc .about .photo{aspect-ratio:1;border-radius:18px;background:linear-gradient(150deg,#1E2D6E,#0a0f22);border:1px solid rgba(159,192,255,.25);display:flex;align-items:center;justify-content:center;color:var(--txt2);font-size:13px;text-align:center;padding:12px}
.lc .about .badges{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}
.lc .about .bdg{background:rgba(159,192,255,.08);border:1px solid rgba(159,192,255,.22);border-radius:11px;padding:10px 14px}
.lc .about .bdg .n{font-family:'Space Grotesk';font-size:20px;font-weight:700;color:#9FC0FF}
.lc .about .bdg .l{font-size:11px;color:var(--txt2)}
@media(max-width:900px){
  .lc .herogrid{grid-template-columns:1fr;gap:28px}
  .lc .hero h1{font-size:32px}
  .lc .duo,.lc .tgrid,.lc .trio{grid-template-columns:1fr 1fr}
  .lc .foot .cols{grid-template-columns:1fr;gap:28px}
  .lc .about{grid-template-columns:1fr;gap:20px}
}
@media(max-width:560px){ .lc .tgrid{grid-template-columns:1fr 1fr} .lc .duo,.lc .trio{grid-template-columns:1fr} }
/* ====== MOVIMENTO / VIDA ====== */
.lc{--mx:0;--my:0}
/* orbs do hero seguem o mouse (parallax suave) + respiram */
.lc .orb{transition:transform .5s cubic-bezier(.22,1,.36,1)}
.lc .orbA{transform:translate(calc(var(--mx)*26px),calc(var(--my)*26px))}
.lc .orbB{transform:translate(calc(var(--mx)*-32px),calc(var(--my)*-22px))}
/* form card flutua de leve seguindo o mouse */
.lc .formcard{transition:transform .5s cubic-bezier(.22,1,.36,1)}
.lc .herogrid:hover .formcard{transform:translate(calc(var(--mx)*-8px),calc(var(--my)*-8px))}
/* hover nos cards do catálogo e dos 3 blocos */
.lc .toolcard{transition:transform .25s cubic-bezier(.22,1,.36,1),border-color .25s,background .25s}
.lc .toolcard:hover{transform:translateY(-4px);border-color:rgba(16,185,129,.6);background:rgba(16,185,129,.08)}
.lc .triocard{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s}
.lc .triocard:hover{transform:translateY(-6px);box-shadow:0 26px 54px -24px rgba(0,0,0,.7);border-color:rgba(16,185,129,.4)}
/* badges do "sobre" reagem ao mouse */
.lc .about .bdg{transition:transform .25s cubic-bezier(.22,1,.36,1),border-color .25s}
.lc .about .bdg:hover{transform:translateY(-3px) scale(1.03);border-color:rgba(159,192,255,.5)}
/* foto e photo placeholder seguem o mouse de leve */
.lc .about .photo{transition:transform .5s cubic-bezier(.22,1,.36,1)}
.lc .about:hover .photo{transform:translate(calc(var(--mx)*6px),calc(var(--my)*6px)) scale(1.01)}
/* botões com brilho que percorre */
.lc .btn-green,.lc .btn-blue{position:relative;overflow:hidden}
.lc .btn-green::after,.lc .btn-blue::after{content:'';position:absolute;top:0;left:-120%;width:60%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-18deg);animation:lc-shine 4.5s ease-in-out infinite}
@keyframes lc-shine{0%,60%{left:-120%}80%,100%{left:130%}}
/* trilhas Netflix correndo sozinhas pra esquerda (pausa no hover) */
.lc .netwrap{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent);mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)}
.lc .nettrack{animation:lc-netscroll 60s linear infinite}
.lc .netwrap:hover .nettrack{animation-play-state:paused}
@keyframes lc-netscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lc .netcard{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s}
.lc .netcard:hover{transform:translateY(-8px) scale(1.04);box-shadow:0 28px 56px -22px rgba(0,0,0,.8);z-index:2}
@media(prefers-reduced-motion:reduce){
  .lc .cattrack,.lc .nettrack,.lc .btn-green::after,.lc .btn-blue::after{animation:none}
  .lc .orbA,.lc .orbB,.lc .formcard,.lc .about .photo{transform:none}
}
`;

type FormState = 'idle' | 'sending' | 'ok' | 'ja-existe' | 'err';

function LeadForm() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [aceito, setAceito] = useState(false);
  const [state, setState] = useState<FormState>('idle');
  const [msg, setMsg] = useState('');

  const enviar = async () => {
    const n = nome.trim();
    const e = email.trim();
    if (n.length < 2) { setState('err'); setMsg('Por favor, informe seu nome.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setState('err'); setMsg('Informe um e-mail válido.'); return; }
    if (!aceito) { setState('err'); setMsg('Você precisa aceitar os termos e condições para continuar.'); return; }
    setState('sending'); setMsg('');
    try {
      const r = await fetch(WEBHOOK_GRATUITO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, email: e, source: 'lc-comecar' }),
      });
      const data = await r.json().catch(() => ({} as any));
      if (data && data.status === 'ja-existia') setState('ja-existe');
      else { setState('ok'); setMsg('Perfeito! Em instantes você receberá o acesso no seu e-mail (confira também o spam).'); }
      setNome(''); setEmail('');
    } catch {
      setState('ok'); setMsg('Tudo certo! Verifique seu e-mail (e a caixa de spam) para acessar.');
    }
  };

  if (state === 'ja-existe') {
    return (
      <div className="formcard">
        <div style={{ fontSize: 44, marginBottom: 12 }}>👋</div>
        <div className="ftit">Você já é cadastrado!</div>
        <p className="msg" style={{ color: '#9FC0FF', marginTop: 0 }}>Esse e-mail já tem acesso à plataforma. É só entrar.</p>
        <a className="btn btn-blue" href="https://app.educacaopelotrabalho.com" style={{ display: 'block', marginTop: 18 }}>Acessar a plataforma →</a>
      </div>
    );
  }
  if (state === 'ok') {
    return (
      <div className="formcard">
        <div style={{ fontSize: 44, marginBottom: 12 }}>✉️</div>
        <div className="ftit">Pronto! Agora é com você.</div>
        <p className="msg" style={{ color: '#6ee7b7', marginTop: 0 }}>{msg}</p>
        <a className="btn btn-green" href="https://app.educacaopelotrabalho.com" style={{ display: 'block', marginTop: 18 }}>Ir para a plataforma →</a>
      </div>
    );
  }
  return (
    <div className="formcard">
      <div className="ftit">Crie sua conta gratuita</div>
      <p className="fsub">Receba o acesso à primeira trilha no seu e-mail. Sem cartão.</p>
      <input type="text" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
      <input type="email" placeholder="Seu melhor e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left', margin: '4px 0 14px', fontSize: 13, color: 'var(--txt)', cursor: 'pointer' }}>
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, accentColor: '#10B981', cursor: 'pointer' }} />
        <span>Li e concordo com os <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: '#6ee7b7', textDecoration: 'underline' }}>termos e condições</a> do acesso gratuito.</span>
      </label>
      {msg && <p className="msg" style={{ color: '#fca5a5', marginTop: 0, marginBottom: 8 }}>{msg}</p>}
      <button className="send" onClick={enviar} disabled={state === 'sending'}>
        {state === 'sending' ? 'Enviando…' : 'Quero meu acesso grátis →'}
      </button>
      <p className="hint">Não pedimos cartão.</p>
    </div>
  );
}

// Catálogo de ferramentas da Trilha 1 (ícone + nome) — exibido em carrossel.
const FERRAMENTAS = [
  { nome: 'SIPOC', Icon: Network },
  { nome: 'Matriz RACI', Icon: ListChecks },
  { nome: 'Organograma', Icon: Users },
  { nome: 'Indicadores', Icon: BarChart3 },
  { nome: 'Mapeamento de Processo', Icon: GitBranch },
  { nome: 'Brainstorming', Icon: Lightbulb },
  { nome: 'Espinha de Peixe', Icon: Fish },
  { nome: 'Análise Gráfica e Estatística', Icon: LineChart },
  { nome: 'Ideia de Projeto de Melhoria', Icon: Sparkles },
  { nome: 'Matriz GUT', Icon: Grid3x3 },
  { nome: 'Matriz RAB', Icon: Grid3x3 },
  { nome: 'Entendendo o Problema', Icon: HelpCircle },
  { nome: 'Esforço × Impacto', Icon: Scale },
  { nome: 'Plano de Ação', Icon: ClipboardList },
  { nome: 'Antes × Depois', Icon: ArrowLeftRight },
];

// 8 trilhas com NOMES REAIS (do trilhas.ts), casadas pelo número 01-08.
const TRILHAS_NET = [
  { n: '01', nome: 'Como Chegar em uma Área Nova e Entregar Resultado Rapidamente', img: '/trilhas/trilha-01.png' },
  { n: '02', nome: 'Como Recomendar Melhorias com Base em Análise de Dados', img: '/trilhas/trilha-02.png' },
  { n: '03', nome: 'Como Conduzir Mudanças com Menos Resistência', img: '/trilhas/trilha-03.png' },
  { n: '04', nome: 'Como Criar Apresentações que Convencem', img: '/trilhas/trilha-04.png' },
  { n: '05', nome: 'Como Antecipar Riscos Antes que Virem Problemas', img: '/trilhas/trilha-05.png' },
  { n: '06', nome: 'Cultura Lean na Prática', img: '/trilhas/trilha-06.png' },
  { n: '07', nome: 'Como Fazer Análises Estatísticas Aplicadas a Negócios', img: '/trilhas/trilha-07.png' },
  { n: '08', nome: 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria', img: '/trilhas/trilha-08.png', topo: true },
];

export default function LandingComecar() {
  const rootRef = useRef<HTMLDivElement>(null);
  useMouseParallax(rootRef);
  return (
    <div className="lc" ref={rootRef}>
      <style>{CSS}</style>

      {/* HERO com form fixo */}
      <header className="hero">
        <div className="orb orbA" /><div className="orb orbB" />
        <div className="herogrid">
          <div>
            <span className="eyebrow">🎁 100% grátis · sem cartão</span>
            <h1>Sua primeira entrega <span className="grad">nos primeiros 30 dias.</span></h1>
            <p className="lead">Em vez de estudar dezenas e dezenas de horas de teoria, você <b style={{ color: '#fff' }}>aprende fazendo</b>. A primeira trilha resolve dois problemas reais de quem está começando:</p>
            <ul className="checklist">
              <li><span className="c">①</span> <span><b style={{ color: '#fff' }}>Chegar numa área (ou empresa) nova</b> e se adaptar rápido, sem se perder.</span></li>
              <li><span className="c">②</span> <span><b style={{ color: '#fff' }}>Resolver os problemas do dia a dia</b> de forma estruturada — e mostrar resultado.</span></li>
            </ul>
            <p className="lead" style={{ marginTop: 18, marginBottom: 8, fontSize: 15, color: 'var(--txt2)' }}>O que você leva, de graça:</p>
            <ul className="checklist">
              <li><span className="c">✓</span> A primeira trilha completa, liberada na hora</li>
              <li><span className="c">✓</span> Acesso ao software LBW para gerar seus gráficos e análises</li>
              <li><span className="c">✓</span> Mentor Israel digital + comunidade pra tirar dúvidas</li>
              <li><span className="c">✓</span> Certificado da Trilha 1 ao concluir</li>
            </ul>
          </div>
          <LeadForm />
        </div>
      </header>

      {/* TRILHA 1 — catálogo de ferramentas (carrossel) */}
      <section className="sec" style={{ background: 'linear-gradient(180deg,#070A18,#0a1024)' }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <span className="eyebrow">Trilha 1 · acesse agora mesmo!</span>
            <h2>As ferramentas que você <span className="grad">já usa de graça</span></h2>
            <p>Tudo isso liberado na primeira trilha — você aplica no seu próprio trabalho enquanto aprende.</p>
          </Reveal>
        </div>
        {/* Carrossel infinito: a lista é duplicada pra o loop ser contínuo */}
        <div className="catwrap">
          <div className="cattrack">
            {[...FERRAMENTAS, ...FERRAMENTAS].map((f, i) => (
              <div className="toolcard" key={i}>
                <span className="ti"><f.Icon size={18} /></span>
                <span className="tn">{f.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 blocos: vídeos · mentor · certificado (imagem no topo) */}
        <div className="wrap" style={{ marginTop: 36 }}>
          <div className="trio">
            <Reveal className="triocard" delay={0}>
              <div className="imgph">imagem</div>
              <div className="body"><div className="e">🎬</div><h3>Vídeo-aulas de cada ferramenta</h3><p>Para cada ferramenta há vídeos do Israel ensinando quando usar e como preencher — é só clicar e assistir no ponto que interessa.</p></div>
            </Reveal>
            <Reveal className="triocard" delay={0.1}>
              <div className="imgph">imagem</div>
              <div className="body"><div className="e">🤖</div><h3>Mentor Israel digital incluído</h3><p>Responde como o próprio Israel responderia, com base nos nossos vídeos e no método LBW. Te ajuda a destravar o seu projeto.</p></div>
            </Reveal>
            <Reveal className="triocard" delay={0.2}>
              <div className="imgph">imagem</div>
              <div className="body"><div className="e">🏅</div><h3>Certificado da Trilha 1</h3><p>Conclua no seu próprio tempo e leve o certificado da sua primeira trilha — de graça.</p></div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SOBRE O ISRAEL (enxuto) */}
      <section className="sec" style={{ background: '#070A18' }}>
        <Reveal className="about">
          <div className="photo">foto do Israel</div>
          <div>
            <span className="eyebrow" style={{ color: '#9FC0FF', background: 'rgba(159,192,255,.08)', borderColor: 'rgba(159,192,255,.22)' }}>Seu consultor</span>
            <h2 style={{ fontSize: 28, margin: '14px 0 12px' }}>Olá, sou o <span className="gradblue">Israel Souza</span></h2>
            <p style={{ color: 'var(--txt)', lineHeight: 1.6 }}>Mais de 20 anos resolvendo problema de verdade em multinacionais de bebida, automotiva, petroquímica, equipamentos médicos e setor público. Não ensino teoria — ensino o que apliquei na prática e que gerou resultado real.</p>
            <div className="badges">
              <div className="bdg"><div className="n">20+</div><div className="l">anos de prática</div></div>
              <div className="bdg"><div className="n">4</div><div className="l">multinacionais</div></div>
              <div className="bdg"><div className="n">+1.500</div><div className="l">profissionais formados</div></div>
              <div className="bdg" style={{ flexBasis: '100%' }}><div className="n">+US$ 20MM</div><div className="l">em ganhos nos meus projetos ou dos meus mentorados</div></div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* UPSELL — 8 trilhas estilo Netflix (carrossel) */}
      <section className="sec" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%,rgba(0,51,204,.14),transparent 60%),#070A18' }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <span className="eyebrow" style={{ color: '#9FC0FF', background: 'rgba(159,192,255,.08)', borderColor: 'rgba(159,192,255,.22)' }}>Depois da trilha 1…</span>
            <h2>A trilha 1 é só o começo da <span className="gradblue">jornada</span></h2>
            <p>Quando quiser ir além, a formação completa abre mais 7 trilhas — cada uma acrescenta uma camada nova até você virar especialista em gerenciamento de projetos de melhoria.</p>
          </Reveal>
        </div>
        <div className="netwrap">
          <div className="nettrack" style={{ display: 'flex', gap: 16, width: 'max-content', padding: '0 2px' }}>
            {[...TRILHAS_NET, ...TRILHAS_NET].map((t, i) => (
              <div className="netcard" key={i} style={{ borderColor: t.topo ? 'rgba(159,192,255,.45)' : undefined }}>
                <img className="netimg" src={t.img} alt={`Trilha ${t.n} — ${t.nome}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
        <div className="wrap" style={{ textAlign: 'center', marginTop: 14 }}>
          <a className="btn btn-blue" href="/formacao" target="_blank" rel="noopener noreferrer">Conhecer a formação completa →</a>
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--txt2)' }}>Comece grátis hoje. Quando quiser, libere as 8 trilhas e mantenha todo o seu progresso.</p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="final">
        <Reveal className="wrap" style={{ maxWidth: 600 }}>
          <h2>Comece ainda hoje.</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.9)', marginBottom: 28 }}>Sua primeira entrega de verdade tá a um passo de um clique. Sem cartão, sem enrolação.</p>
          <a className="btn" href="#topo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: '#fff', color: '#059669', fontSize: 17, padding: '18px 42px' }}>Criar minha conta grátis →</a>
          <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,.8)' }}>🎁 Trilha 1 completa + vídeo-aulas para cada ferramenta + software LBW + Mentor Israel digital + certificado</p>
        </Reveal>
      </section>

      {/* FOOTER — componente único compartilhado */}
      <RodapeInstitucional />
    </div>
  );
}
