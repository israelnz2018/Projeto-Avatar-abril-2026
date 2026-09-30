/**
 * Estilos exclusivos da /consultoresLBW.
 *
 * Só o que NÃO existe em estilosLandingNova.ts: preço, encontros e o formulário
 * curto. O resto (hero, seções, vitrine, FAQ, rodapé) reaproveita o CSS da outra
 * landing, que já está calibrado — duplicar aquilo aqui só criaria duas fontes
 * de verdade para o mesmo visual.
 */
export const CSS_FORMACAO_EXTRA = `
/* ---- lista dos 10 encontros ---- */
.formacao-encontros{display:grid;gap:10px}
.formacao-encontro{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;background:#fff;border:1px solid var(--line);border-radius:12px;transition:transform .2s,box-shadow .2s}
.formacao-encontro:hover{transform:translateX(4px);box-shadow:0 8px 22px rgba(16,26,51,.07)}
.formacao-encontro span{flex:0 0 auto;display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#1456e8,#2678ff);color:#fff;font-size:12px;font-weight:900}
.formacao-encontro p{margin:4px 0 0;font-size:14.5px;font-weight:650;color:var(--ink);line-height:1.45}

.formacao-destaque{display:flex;align-items:flex-start;gap:11px;margin-top:22px;padding:15px 17px;border-radius:12px;background:rgba(20,86,232,.07);border:1px solid rgba(20,86,232,.16);color:#14295d;font-size:14px;font-weight:600;line-height:1.5}
.formacao-destaque svg{flex:0 0 auto;margin-top:2px;color:var(--blue)}

.formacao-incluso h3{font-size:16.5px}

/* ---- preço ---- */
.formacao-preco-section{background:linear-gradient(170deg,#f4f7fd 0%,#eaf1ff 100%)}
.formacao-preco-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:28px;align-items:start;margin-top:40px}

.formacao-preco-card{position:relative;padding:38px 34px 32px;background:#fff;border:1px solid rgba(20,86,232,.2);border-radius:22px;box-shadow:0 26px 60px rgba(16,26,51,.11)}
.formacao-preco-selo{position:absolute;top:-13px;left:34px;padding:6px 15px;border-radius:99px;background:linear-gradient(125deg,#1456e8,#2678ff);color:#fff;font-size:11.5px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 8px 20px rgba(20,86,232,.32)}
.formacao-preco-de{margin:8px 0 2px;color:var(--muted);font-size:14px;font-weight:600}
.formacao-preco-de::after{content:'';display:inline-block;width:0}
.formacao-preco-valor{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;margin-bottom:24px}
.formacao-preco-valor strong{font-size:46px;font-weight:900;letter-spacing:-.03em;color:var(--ink);line-height:1}
.formacao-preco-valor span{font-size:15px;font-weight:700;color:var(--blue)}

.formacao-preco-lista{list-style:none;margin:0 0 26px;padding:0;display:grid;gap:11px}
.formacao-preco-lista li{display:flex;align-items:flex-start;gap:10px;font-size:14.5px;font-weight:600;color:#26324d;line-height:1.45}
.formacao-preco-lista svg{flex:0 0 auto;margin-top:2px;color:var(--green)}

.formacao-preco-cta{width:100%}
.formacao-preco-micro{margin:13px 0 0;text-align:center;font-size:12.5px;color:var(--muted);line-height:1.5}

.formacao-preco-lado{display:grid;gap:16px}
.formacao-lado-card{padding:24px 24px 22px;background:#fff;border:1px solid var(--line);border-radius:16px}
.formacao-lado-card svg{color:var(--blue);margin-bottom:10px}
.formacao-lado-card h3{margin:0 0 7px;font-size:16px;font-weight:800;color:var(--ink)}
.formacao-lado-card p{margin:0;font-size:14px;color:var(--muted);line-height:1.6}
.formacao-lado-destaque{background:linear-gradient(150deg,#07102b,#14295d);border-color:transparent}
.formacao-lado-destaque svg{color:var(--cyan)}
.formacao-lado-destaque h3{color:#fff}
.formacao-lado-destaque p{color:rgba(255,255,255,.76)}

/* ---- formulário curto ---- */
.formacao-form{display:grid;gap:15px}
.formacao-form label{display:flex;align-items:center;gap:7px;margin-bottom:6px;font-size:13px;font-weight:750;color:var(--ink)}
.formacao-form .field-ok{color:var(--green);font-size:12px;font-weight:800}
.formacao-form input,.formacao-form select{width:100%;height:46px;padding:0 13px;border:1px solid var(--line);border-radius:11px;background:#fff;font-size:15px;font-family:inherit;color:var(--ink);transition:border-color .2s,box-shadow .2s}
.formacao-form select{cursor:pointer}
.formacao-form input:focus,.formacao-form select:focus{outline:0;border-color:var(--blue);box-shadow:0 0 0 3px rgba(20,86,232,.13)}
.formacao-form input::placeholder{color:#9aa8bf}

.formacao-whats{display:grid;grid-template-columns:minmax(0,1.15fr) 82px minmax(0,1.6fr);gap:8px}
.formacao-ddi{text-align:center;font-weight:700}

.formacao-form .cta{width:100%;height:54px;margin-top:6px;border:0;border-radius:13px;background:linear-gradient(125deg,#1456e8,#2678ff);color:#fff;font-size:15.5px;font-weight:850;font-family:inherit;cursor:pointer;box-shadow:0 15px 32px rgba(20,86,232,.28);transition:transform .2s,box-shadow .2s,opacity .2s}
.formacao-form .cta:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 18px 38px rgba(20,86,232,.4)}
.formacao-form .cta:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.formacao-form-micro{margin:0;text-align:center;font-size:12.5px;color:var(--muted);line-height:1.5}
.formacao-form-erro{margin:0;padding:11px 13px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13.5px;font-weight:600}
.formacao-form-ok{padding:30px 24px;text-align:center}
.formacao-form-ok strong{display:block;margin-bottom:8px;font-size:18px;color:var(--ink)}
.formacao-form-ok p{margin:0;font-size:14.5px;color:var(--muted);line-height:1.6}

/* ---- celular: a maior parte do tráfego vem daqui ---- */
@media(max-width:900px){
  .formacao-preco-grid{grid-template-columns:1fr;gap:20px}
  .formacao-preco-card{padding:34px 22px 26px}
  .formacao-preco-valor strong{font-size:40px}
  .formacao-whats{grid-template-columns:1fr 76px;grid-template-areas:'pais ddi' 'num num';gap:8px}
  .formacao-whats select{grid-area:pais}
  .formacao-ddi{grid-area:ddi}
  .formacao-whats input:not(.formacao-ddi){grid-area:num}
}
`;
