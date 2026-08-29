import React from 'react';
import LandingPlataformaLBW from './LandingPlataformaLBW';

// Custom element do player VTurb (smartplayer v4). Declarado para o TSX aceitar a tag.
// React 19 + jsx:react-jsx → o namespace JSX vive no módulo 'react' (não no global).
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'vturb-smartplayer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { id?: string };
    }
  }
}

// Player VTurb (smartplayer v4) da VSL da formação. ID e script são únicos deste vídeo.
const VTURB_PLAYER_ID = 'vid-6a5340027e3b42281f6a52cd';
const VTURB_SCRIPT_SRC = 'https://scripts.converteai.net/21190591-631c-400a-94ca-b1400c31d918/players/6a5340027e3b42281f6a52cd/v4/player.js';

/**
 * A /formacao é a MESMA página da /plataformalbw — planos, comparativo,
 * ferramentas, cursos e FAQ vêm todos de lá, então não há como as duas
 * divergirem. O que muda é só o topo: aqui entra a VSL, com o título e o texto
 * que a acompanham.
 */
const CSS = `
.lfv{background:#060a18;color:#f7f9ff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.lfv .wrap{width:min(1140px,calc(100% - 40px));margin:0 auto}
.lfv .hero{position:relative;text-align:center;padding:clamp(48px,7vw,76px) 0 60px;background:radial-gradient(circle at 78% 6%,rgba(33,100,243,.26),transparent 42%),radial-gradient(circle at 8% 62%,rgba(16,184,220,.13),transparent 44%)}
.lfv h1{font-size:clamp(30px,5vw,46px);font-weight:800;line-height:1.1;letter-spacing:-.02em;margin:0 auto 16px;max-width:860px;text-wrap:balance}
.lfv .grad{background:linear-gradient(100deg,#fff 10%,#92b7ff 55%,#13c4df);-webkit-background-clip:text;background-clip:text;color:transparent}
.lfv .lead{font-size:clamp(15px,2vw,18px);line-height:1.55;color:#aab6d2;max-width:680px;margin:0 auto 28px;text-wrap:pretty}
/* NÃO forçar altura no vturb-smartplayer. Ele é um Web Component com Shadow
   DOM: um height:100% no host chega lá dentro e faz o player esticar o vídeo
   pra preencher, cortando as bordas — e o object-fit:contain que corrigiria
   isso NÃO atravessa o shadow DOM. O player já se dimensiona em 16/9 sozinho;
   aqui só limitamos a largura e arredondamos a borda. */
.lfv .videobox{position:relative;max-width:760px;margin:0 auto;border-radius:18px;overflow:hidden;border:1px solid rgba(164,188,244,.18);background:#000;line-height:0}
.lfv .cta-row{display:flex;justify-content:center;margin-top:28px}
.lfv .cta{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:14px 30px;border-radius:12px;font-weight:800;font-size:15px;color:#fff;text-decoration:none;background:linear-gradient(120deg,#2866f4,#0aaacb);box-shadow:0 18px 42px -18px rgba(37,99,235,.9);transition:transform .2s ease}
.lfv .cta:hover{transform:translateY(-2px)}
@media(max-width:620px){.lfv .wrap{width:min(100% - 28px,1140px)}.lfv .cta{width:100%}}
`;

export default function LandingFormacao() {
  // Injeta o script do player VTurb uma única vez (evita duplicar em re-render).
  React.useEffect(() => {
    if (document.querySelector(`script[src="${VTURB_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = VTURB_SCRIPT_SRC;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const hero = (
    <header className="lfv" id="top">
      <style>{CSS}</style>
      <div className="hero"><div className="wrap">
        <h1>Pare de apenas estudar e <span className="grad">comece a entregar resultado fazendo!</span></h1>
        <p className="lead">
          Veja o vídeo abaixo e saiba quais são as maiores habilidades técnicas e gerenciais
          que você deve aprender para ser desejado pelas maiores e melhores empresas para se
          trabalhar, seja no Brasil ou no mundo.
        </p>
        <div className="videobox">
          <vturb-smartplayer id={VTURB_PLAYER_ID} style={{ display: 'block', margin: '0 auto', width: '100%' }}>
            {/* Reserva o espaço 16/9 (padding-top 56.25%) enquanto o player
                carrega, pra página não dar um salto quando ele aparece. É o
                próprio player que define a altura final. */}
            <div style={{ position: 'relative', width: '100%', padding: '56.25% 0 0', zIndex: 0, backgroundColor: 'black' }} />
          </vturb-smartplayer>
        </div>
        <div className="cta-row">
          <a className="cta" href="#planos">Quero a formação completa</a>
        </div>
      </div></div>
    </header>
  );

  return <LandingPlataformaLBW hero={hero} />;
}
