/**
 * LandingComecar — landing pública da oferta GRÁTIS (trilha 1).
 * Servida em /trilhagratis SEM exigir login (bypass no App.tsx).
 *
 * VERSÃO ENXUTA (captura de tráfego frio):
 *  - A VSL de entrada (2-3 min) fica NO TOPO e faz o convencimento.
 *  - O formulário vem LOGO ABAIXO do vídeo, no pico do interesse.
 *  - Uma única decisão na página: criar a conta grátis.
 *  - SEM preço, SEM nenhum botão/link que leve para fora (nada de /formacao).
 *  - Todos os CTAs reconduzem para o formulário.
 *  - Dispara o evento "Lead" do Pixel do Meta no cadastro com sucesso.
 *
 * Linguagem visual VERDE (grátis) consistente com a /formacao.
 */
import React, { useState, useEffect, useRef } from 'react';
import RodapeInstitucional from './RodapeInstitucional';

const WEBHOOK_GRATUITO = 'https://primary-production-1d53.up.railway.app/webhook/acessogratuito';

/**
 * URL do player da VSL de entrada (2-3 min).
 * Troque pelo embed do seu player (Panda/Kinescope recomendado; YouTube funciona).
 * Deixe vazio ('') para exibir o placeholder de "vídeo em breve".
 */
const VSL_EMBED_URL = '';

/**
 * Parallax leve dos orbs do hero: escreve --mx/--my (-1..1) na raiz conforme o
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

/** Rola suavemente até o formulário (usado pelos CTAs). */
function scrollToForm() {
  const el = document.getElementById('form-gratis');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const CSS = `
.lc{--ink:#070A18;--line:rgba(255,255,255,.10);--txt:rgba(255,255,255,.72);--txt2:rgba(255,255,255,.5)}
.lc *{margin:0;padding:0;box-sizing:border-box}
.lc{background:var(--ink);color:#fff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
.lc h1,.lc h2{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em;line-height:1.1}
.lc .wrap{max-width:1100px;margin:0 auto;padding:0 20px}
.lc .eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#6ee7b7;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);padding:8px 16px;border-radius:999px}
.lc .grad{background:linear-gradient(95deg,#fff,#6ee7b7 55%,#10B981);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lc .gradblue{background:linear-gradient(95deg,#fff,#9FC0FF,#3B82F6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
/* hero (VSL no topo) */
.lc .hero{position:relative;padding:54px 20px 30px;overflow:hidden;text-align:center}
.lc .orb{position:absolute;border-radius:50%;filter:blur(100px)}
.lc .orbA{width:480px;height:480px;background:radial-gradient(circle,#10B981,transparent 70%);opacity:.3;top:-170px;left:-70px}
.lc .orbB{width:380px;height:380px;background:radial-gradient(circle,#0033CC,transparent 70%);opacity:.34;top:-110px;right:-70px}
.lc .hero .in{position:relative;z-index:2;max-width:1040px;margin:0 auto}
.lc .hero h1{font-size:42px;font-weight:800;margin:18px auto 14px;max-width:760px}
.lc .hero .sub{font-size:18px;color:var(--txt);line-height:1.55;max-width:600px;margin:0 auto 30px}
.lc .vsl{position:relative;max-width:860px;margin:0 auto;aspect-ratio:16/9;border-radius:18px;overflow:hidden;border:1px solid rgba(16,185,129,.35);background:linear-gradient(160deg,#101a3a,#0a0f22);box-shadow:0 34px 80px -34px rgba(16,185,129,.45)}
.lc .vsl iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.lc .vsl .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.lc .play{width:70px;height:70px;border-radius:50%;background:rgba(16,185,129,.18);border:1px solid rgba(110,231,183,.5);display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.lc .play::after{content:'';width:0;height:0;border-left:20px solid #6ee7b7;border-top:13px solid transparent;border-bottom:13px solid transparent;margin-left:5px}
.lc .arrow{text-align:center;color:#6ee7b7;font-size:26px;padding:20px 0 2px}
/* form */
.lc .formsec{padding:14px 20px 52px;background:linear-gradient(180deg,#070A18,#0a1024)}
.lc .formhead{text-align:center;max-width:560px;margin:0 auto 24px}
.lc .formhead h2{font-size:30px;font-weight:800;margin-bottom:8px}
.lc .formhead p{font-size:16px;color:var(--txt);line-height:1.5}
.lc .formcard{max-width:480px;margin:0 auto;background:linear-gradient(170deg,#101a3a,#0a0f22);border:1px solid rgba(16,185,129,.35);border-radius:20px;padding:30px 26px;text-align:center;box-shadow:0 28px 70px -34px rgba(16,185,129,.5)}
.lc .formcard .ft{font-size:20px;font-weight:800;margin-bottom:6px}
.lc .formcard .fs{font-size:13px;color:var(--txt);margin-bottom:18px;line-height:1.45}
.lc .formcard input{width:100%;padding:14px 16px;margin-bottom:12px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.06);color:#fff;font-size:15px;outline:none}
.lc .formcard input:focus{border-color:rgba(16,185,129,.6)}
.lc .formcard .send{width:100%;padding:15px;background:linear-gradient(120deg,#10B981,#059669);color:#fff;font-weight:700;font-size:16px;border:none;border-radius:12px;cursor:pointer}
.lc .formcard .msg{font-size:14px;margin-top:12px}
.lc .formcard .hint{font-size:12px;color:var(--txt2);margin-top:12px}
.lc .leva{max-width:480px;margin:16px auto 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.lc .leva span{font-size:12px;color:rgba(255,255,255,.82);background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);padding:6px 11px;border-radius:9px}
.lc .cred{display:flex;align-items:center;gap:12px;justify-content:center;max-width:480px;margin:20px auto 0;border-top:1px solid var(--line);padding-top:18px}
.lc .cred .av{width:46px;height:46px;border-radius:50%;overflow:hidden;background:linear-gradient(150deg,#1E2D6E,#0a0f22);border:1px solid rgba(159,192,255,.3);flex-shrink:0}
.lc .cred .av img{width:100%;height:100%;object-fit:cover;object-position:top}
.lc .cred .t{font-size:12.5px;color:var(--txt);line-height:1.45;text-align:left}
.lc .cred .t b{color:#fff}
/* final */
.lc .final{position:relative;padding:54px 20px;text-align:center;background:linear-gradient(160deg,#10B981 0%,#065f46 55%,#070A18 100%)}
.lc .final h2{font-size:30px;font-weight:800;margin-bottom:14px}
.lc .btn-w{display:inline-block;background:#fff;color:#059669;font-size:16px;font-weight:700;padding:16px 36px;border-radius:13px;border:none;cursor:pointer}
/* movimento */
.lc{--mx:0;--my:0}
.lc .orb{transition:transform .5s cubic-bezier(.22,1,.36,1)}
.lc .orbA{transform:translate(calc(var(--mx)*24px),calc(var(--my)*24px))}
.lc .orbB{transform:translate(calc(var(--mx)*-28px),calc(var(--my)*-20px))}
.lc .send,.lc .btn-w{position:relative;overflow:hidden}
.lc .send::after,.lc .btn-w::after{content:'';position:absolute;top:0;left:-120%;width:60%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-18deg);animation:lc-shine 4.5s ease-in-out infinite}
@keyframes lc-shine{0%,60%{left:-120%}80%,100%{left:130%}}
@media(prefers-reduced-motion:reduce){ .lc .orbA,.lc .orbB{transform:none} .lc .send::after,.lc .btn-w::after{animation:none} }
@media(max-width:760px){ .lc .hero h1{font-size:30px} .lc .hero .sub{font-size:15px} }
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

    // Dispara o evento "Lead" do Pixel do Meta (se o Pixel estiver carregado na página).
    const trackLead = () => {
      try {
        const w = window as any;
        if (typeof w !== 'undefined' && typeof w.fbq === 'function') {
          w.fbq('track', 'Lead', { content_name: 'trilha-gratis' });
        }
      } catch { /* silencioso */ }
    };

    try {
      const r = await fetch(WEBHOOK_GRATUITO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, email: e, source: 'lc-trilhagratis' }),
      });
      const data = await r.json().catch(() => ({} as any));
      if (data && data.status === 'ja-existia') {
        setState('ja-existe');
      } else {
        trackLead();
        setState('ok');
        setMsg('Perfeito! Em instantes você receberá o acesso no seu e-mail (confira também o spam).');
      }
      setNome(''); setEmail('');
    } catch {
      trackLead();
      setState('ok');
      setMsg('Tudo certo! Verifique seu e-mail (e a caixa de spam) para acessar.');
    }
  };

  if (state === 'ja-existe') {
    return (
      <div className="formcard">
        <div style={{ fontSize: 44, marginBottom: 12 }}>👋</div>
        <div className="ft">Você já é cadastrado!</div>
        <p className="msg" style={{ color: '#9FC0FF', marginTop: 0 }}>Esse e-mail já tem acesso à plataforma. É só entrar.</p>
        <a className="btn-w" href="https://app.educacaopelotrabalho.com" style={{ display: 'inline-block', marginTop: 18, background: 'linear-gradient(120deg,#0033CC,#2563EB)', color: '#fff' }}>Acessar a plataforma →</a>
      </div>
    );
  }
  if (state === 'ok') {
    return (
      <div className="formcard">
        <div style={{ fontSize: 44, marginBottom: 12 }}>✉️</div>
        <div className="ft">Pronto! Agora é com você.</div>
        <p className="msg" style={{ color: '#6ee7b7', marginTop: 0 }}>{msg}</p>
        <a className="btn-w" href="https://app.educacaopelotrabalho.com" style={{ display: 'inline-block', marginTop: 18, background: 'linear-gradient(120deg,#10B981,#059669)', color: '#fff' }}>Ir para a plataforma →</a>
      </div>
    );
  }
  return (
    <div className="formcard">
      <div className="ft">Crie sua conta gratuita</div>
      <p className="fs">Receba o acesso à primeira trilha no seu e-mail. Sem cartão.</p>
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

export default function LandingComecar() {
  const rootRef = useRef<HTMLDivElement>(null);
  useMouseParallax(rootRef);

  return (
    <div className="lc" ref={rootRef}>
      <style>{CSS}</style>

      {/* HERO — a VSL faz o convencimento, em destaque no topo */}
      <header className="hero">
        <div className="orb orbA" /><div className="orb orbB" />
        <div className="in">
          <span className="eyebrow">🎁 100% grátis · sem cartão</span>
          <h1>Sua primeira entrega de verdade <span className="grad">nos primeiros 30 dias.</span></h1>
          <p className="sub">Aperte o play. Em poucos minutos você entende como sair da teoria e começar a entregar resultado de verdade — já na primeira trilha, de graça.</p>
          <div className="vsl">
            {VSL_EMBED_URL ? (
              <iframe src={VSL_EMBED_URL} title="VSL de entrada" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            ) : (
              <div className="ph">
                <div style={{ textAlign: 'center' }}>
                  <div className="play" />
                  <div style={{ fontSize: 13, color: 'var(--txt2)' }}>▶ Seu vídeo de apresentação (2-3 min)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="arrow">↓</div>

      {/* FORMULÁRIO — logo abaixo do vídeo, no pico do interesse */}
      <section className="formsec" id="form-gratis">
        <div className="formhead">
          <h2>Gostou? Comece agora — de graça.</h2>
          <p>Crie sua conta e receba o acesso à primeira trilha no seu e-mail.</p>
        </div>
        <LeadForm />
        <div className="leva">
          <span>✓ Trilha 1 completa</span>
          <span>✓ Software LBW</span>
          <span>✓ Mentor Israel digital</span>
          <span>✓ Certificado</span>
        </div>
        <div className="cred">
          <div className="av"><img src="/israel-foto.png" alt="Israel Souza" loading="lazy" /></div>
          <div className="t">Criado por <b>Israel Souza</b> — 20+ anos em multinacionais, <b>+1.500 profissionais formados</b>.</div>
        </div>
      </section>

      {/* CTA FINAL — reconduz ao formulário (sem nenhuma saída para fora) */}
      <section className="final">
        <div className="wrap" style={{ maxWidth: 520 }}>
          <h2>Ainda dá tempo de começar hoje.</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.9)', marginBottom: 22 }}>Sua primeira entrega de verdade está a um clique. Sem cartão, sem enrolação.</p>
          <button className="btn-w" onClick={scrollToForm}>Criar minha conta grátis →</button>
        </div>
      </section>

      {/* FOOTER — componente único compartilhado */}
      <RodapeInstitucional />
    </div>
  );
}
