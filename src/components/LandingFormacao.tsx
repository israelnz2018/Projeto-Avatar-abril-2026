import React from 'react';
import LandingPlataformaLBW from './LandingPlataformaLBW';

// Player VTurb (smartplayer v4) da VSL da formação. ID e script são únicos deste vídeo.
// A tag não é escrita em JSX (vai como HTML), então não precisa de declaração de tipo.
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
/* O script do VTurb faz, ao montar:
     verticalVideo ? style.maxWidth = "400px" : style.maxWidth = null
   Ou seja: para vídeo HORIZONTAL (o nosso) ele APAGA o limite de largura e
   ainda aplica width:100% — por isso o player se espalha. Na /kit90dias o
   vídeo é vertical e o próprio script prende em 400px, e por isso aquele
   nunca deu problema.
   Como ele zera o valor inline, uma regra externa passa a valer: é o que
   prende a largura aqui. Só largura — nunca altura, que atravessaria o
   Shadow DOM e deformaria o vídeo. */
.lfv .videowrap{margin:0 auto;max-width:760px}
.lfv .videowrap vturb-smartplayer{display:block;margin:0 auto;max-width:760px}
.lfv .cta-row{display:flex;justify-content:center;margin-top:28px}
.lfv .cta{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:14px 30px;border-radius:12px;font-weight:800;font-size:15px;color:#fff;text-decoration:none;background:linear-gradient(120deg,#2866f4,#0aaacb);box-shadow:0 18px 42px -18px rgba(37,99,235,.9);transition:transform .2s ease}
.lfv .cta:hover{transform:translateY(-2px)}
@media(max-width:620px){.lfv .wrap{width:min(100% - 28px,1140px)}.lfv .cta{width:100%}}
`;

export default function LandingFormacao() {
  const playerRef = React.useRef<HTMLDivElement>(null);

  // Injeta o script do player VTurb uma única vez (evita duplicar em re-render).
  React.useEffect(() => {
    if (document.querySelector(`script[src="${VTURB_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = VTURB_SCRIPT_SRC;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Monta o player uma única vez, imperativamente. O guard de childElementCount
  // evita duplicar se o efeito rodar de novo (StrictMode roda duas vezes em dev).
  // O padding de 56.25% é o 16/9 do vídeo horizontal — na /kit90dias é 177.77%,
  // porque lá o vídeo é vertical.
  React.useEffect(() => {
    const alvo = playerRef.current;
    if (!alvo || alvo.childElementCount > 0) return;
    alvo.innerHTML = `<vturb-smartplayer id="${VTURB_PLAYER_ID}" style="display:block;margin:0 auto;width:100%;max-width:760px"><div class="vturb-player-placeholder" style="position:relative;width:100%;padding:56.25% 0 0;z-index:0;background-color:black"></div></vturb-smartplayer>`;
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
        {/* Div VAZIA para o React: o player é montado uma vez por efeito, no
            ref. Assim nenhum re-render da página encosta neste pedaço do DOM.
            Isso importa porque hover nos carrosséis de ferramentas/cursos muda
            estado e re-renderiza a página inteira — se o React reescrevesse
            este HTML, o player que o VTurb montou aqui dentro seria destruído
            e o vídeo sumiria. */}
        <div ref={playerRef} className="videowrap" />
        <div className="cta-row">
          <a className="cta" href="#planos">Quero a formação completa</a>
        </div>
      </div></div>
    </header>
  );

  return <LandingPlataformaLBW hero={hero} />;
}
