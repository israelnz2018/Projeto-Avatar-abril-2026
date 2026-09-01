/**
 * Estilos da identidade visual das paginas de consultores.
 * Compartilhado entre a landing publica (/consultores) e a aba do aluno
 * (/seja-consultor), pra as duas terem exatamente o mesmo desenho.
 */
export const CSS_CONSULTORES = `
.consultores-lp{--navy:#0a1330;--navy2:#14295d;--blue:#1456e8;--cyan:#38bdf8;--ink:#0f1526;--muted:#5b6b85;--line:#e3e9f5;--soft:#f4f7fd;--white:#fff;background:#fff;color:var(--ink);font-family:Inter,'Segoe UI',system-ui,sans-serif;line-height:1.65;overflow-x:hidden}
.consultores-lp *{box-sizing:border-box}
.consultores-lp h1,.consultores-lp h2,.consultores-lp h3,.consultores-lp p{margin-top:0}
.consultores-lp h1,.consultores-lp h2,.consultores-lp h3{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.035em;line-height:1.08;text-wrap:balance}
.consultores-lp .container{width:min(1120px,calc(100% - 40px));margin:0 auto}
.consultores-lp .narrow{width:min(840px,100%);margin-inline:auto}
.consultores-lp section{padding:100px 0;position:relative}
.consultores-lp .soft{background:var(--soft);border-block:1px solid var(--line)}
.consultores-lp .dark{background:var(--navy);color:#fff}
.consultores-lp .section-title{font-size:clamp(30px,4.5vw,50px);margin-bottom:22px;text-align:center}
.consultores-lp .section-lead{font-size:clamp(17px,2vw,21px);color:var(--muted);max-width:810px;margin:0 auto 42px;text-align:center}
.consultores-lp .dark .section-lead{color:#c6d2eb}
.consultores-lp .body-copy{font-size:17px;color:var(--muted)}
.consultores-lp .body-copy p{margin-bottom:18px}
.consultores-lp .accent-line{width:68px;height:5px;border-radius:99px;background:linear-gradient(90deg,var(--blue),var(--cyan));margin:0 auto 24px}
.consultores-lp .cta{border:0;border-radius:14px;padding:17px 27px;background:linear-gradient(120deg,#1456e8,#2877ff);color:#fff;font-size:16px;font-weight:850;box-shadow:0 14px 32px rgba(20,86,232,.3);cursor:pointer;transition:.2s transform,.2s box-shadow;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.consultores-lp .cta:hover{transform:translateY(-2px);box-shadow:0 18px 38px rgba(20,86,232,.4)}
.consultores-lp .cta:disabled{opacity:.6;cursor:wait;transform:none}
.consultores-lp .topbar{position:sticky;top:0;z-index:50;background:rgba(8,15,38,.72);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.08)}
.consultores-lp .topbar-inner{min-height:68px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
.consultores-lp .topbar-brand{font-family:'Space Grotesk',Inter,sans-serif;font-weight:700;font-size:clamp(14px,2vw,16px);color:#fff;letter-spacing:-.01em}
.consultores-lp .topbar-brand span{color:#7dd3fc;font-weight:500}
.consultores-lp .topbar .cta{padding:10px 18px;border-radius:10px;font-size:13px;box-shadow:none}
.consultores-lp .hero{padding:100px 0 96px;background:linear-gradient(160deg,#050914,#0d1a3d 55%,#0a1330);color:#fff;text-align:center;overflow:hidden;position:relative}
.consultores-lp .hero::before,.consultores-lp .hero::after{content:'';position:absolute;border-radius:50%;filter:blur(10px);pointer-events:none}
.consultores-lp .hero::before{width:420px;height:420px;top:-140px;right:-100px;background:radial-gradient(circle,rgba(56,189,248,.28),transparent 70%);animation:lpFloat 14s ease-in-out infinite}
.consultores-lp .hero::after{width:380px;height:380px;bottom:-160px;left:-120px;background:radial-gradient(circle,rgba(20,86,232,.32),transparent 70%);animation:lpFloat2 16s ease-in-out infinite}
.consultores-lp .hero .container{position:relative;z-index:1}
.consultores-lp .eyebrow{display:inline-flex;padding:8px 14px;border:1px solid rgba(147,197,253,.35);background:rgba(59,130,246,.12);color:#bfdbfe;border-radius:99px;font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.consultores-lp .hero h1{font-size:clamp(42px,6vw,68px);max-width:900px;margin:28px auto 24px;font-weight:700}
.consultores-lp .hero .sub{max-width:780px;margin:0 auto 36px;color:#d5def0;font-size:clamp(18px,2vw,21px)}
.consultores-lp .proof{font-size:13px;letter-spacing:.035em;color:#aec0e2;margin:30px auto 0}
.consultores-lp .media-placeholder{width:min(780px,100%);min-height:390px;border:1px dashed rgba(147,197,253,.42);border-radius:22px;background:rgba(255,255,255,.045);display:grid;place-items:center;color:#c5d7f8;font-size:13px;font-weight:700;margin:40px auto 32px;box-shadow:inset 0 1px rgba(255,255,255,.08);position:relative;overflow:hidden}
.consultores-lp .media-placeholder::before{content:'▶';display:grid;place-items:center;color:#fff;width:76px;height:76px;border-radius:50%;border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.06);position:absolute;font-size:25px;padding-left:4px}
.consultores-lp .media-placeholder span{position:relative;top:50px;letter-spacing:0}
.consultores-lp .split{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:stretch}
.consultores-lp .panel{border:1px solid var(--line);border-radius:22px;background:#fff;padding:30px;box-shadow:0 16px 46px rgba(30,45,110,.07)}
.consultores-lp .panel h3{font-size:14px;letter-spacing:.12em;color:var(--blue);margin-bottom:20px}
.consultores-lp .clean-list{list-style:none;margin:0;padding:0;display:grid;gap:11px}
.consultores-lp .clean-list li{padding:11px 14px 11px 42px;border-radius:10px;background:var(--soft);color:#33415c;font-weight:650;position:relative}
.consultores-lp .clean-list li::before{content:'✓';position:absolute;left:15px;top:11px;color:#1aa57a;font-weight:900}
.consultores-lp .ecosystem{display:grid;grid-template-columns:230px 1fr;gap:42px;align-items:center;margin-top:45px}
.consultores-lp .consultancy-node{border-radius:24px;padding:34px 24px;background:linear-gradient(150deg,var(--blue),var(--navy2));color:#fff;text-align:center;font-weight:900;box-shadow:0 20px 46px rgba(20,86,232,.25)}
.consultores-lp .companies{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}
.consultores-lp .company{background:#fff;border:1px solid var(--line);border-radius:18px;padding:23px;box-shadow:0 12px 30px rgba(30,45,110,.07)}
.consultores-lp .company strong{display:block;color:var(--blue);margin-bottom:13px;font-size:15px}
.consultores-lp .company span{display:block;color:var(--muted);font-size:13px;padding:3px 0}
.consultores-lp .arrow{font-size:28px;text-align:center;color:var(--blue);font-weight:900;margin:16px 0}
.consultores-lp .note-stack{display:grid;gap:10px;margin:35px auto 0;max-width:840px;text-align:center;color:var(--muted);font-size:16px}
.consultores-lp .screens{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:38px 0 28px}
.consultores-lp .screen{aspect-ratio:16/10;border-radius:16px;border:1px solid var(--line);background:linear-gradient(145deg,#f7f9fd,#fff);display:grid;place-items:center;color:#6e7f9e;font-size:13px;font-weight:800;letter-spacing:.02em;box-shadow:0 18px 42px rgba(30,45,110,.08);position:relative;overflow:hidden;padding-top:34px}
.consultores-lp .screen::before{content:'';position:absolute;left:0;right:0;top:0;height:34px;background:#f0f3f9;border-bottom:1px solid var(--line)}
.consultores-lp .screen::after{content:'';position:absolute;left:16px;top:13px;width:42px;height:8px;background:radial-gradient(circle at 4px 4px,#ff6b6b 0 3px,transparent 3.5px),radial-gradient(circle at 20px 4px,#f4c34f 0 3px,transparent 3.5px),radial-gradient(circle at 36px 4px,#4fd1a1 0 3px,transparent 3.5px)}
.consultores-lp .brand-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}
.consultores-lp .brand-grid div{padding:18px;border:1px solid var(--line);border-radius:14px;background:#fff;text-align:center;font-weight:800;color:var(--navy2)}
.consultores-lp .statement{font-size:clamp(24px,3vw,34px);text-align:center;margin:42px auto 0;max-width:820px;color:var(--navy2)}
.consultores-lp .journey{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin:48px 0;counter-reset:journey}
.consultores-lp .journey-step{border:1px solid rgba(147,197,253,.24);background:rgba(255,255,255,.06);border-radius:18px;padding:22px 16px;min-height:190px;position:relative}
.consultores-lp .journey-step::before{counter-increment:journey;content:counter(journey,decimal-leading-zero);display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgba(56,189,248,.15);border:1px solid rgba(125,211,252,.4);color:#7dd3fc;font-weight:900;font-size:12px;margin-bottom:16px}
.consultores-lp .journey-step:not(:last-child)::after{display:none}
.consultores-lp .journey-step:not(:last-child)::after{content:'↓';position:absolute;right:-13px;top:50%;z-index:2;color:#7dd3fc;font-size:19px;font-weight:900}
.consultores-lp .journey-step h3{font-size:14px;color:#7dd3fc;letter-spacing:.08em;margin-bottom:14px}
.consultores-lp .journey-step p{font-size:13px;color:#cbd7ed;margin:0}
.consultores-lp .triple-screens{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:36px}
.consultores-lp .triple-screens .screen{background:rgba(255,255,255,.06);border-color:rgba(147,197,253,.25);color:#bfdbfe}.consultores-lp .triple-screens .screen::before{background:rgba(255,255,255,.07);border-color:rgba(147,197,253,.2)}
.consultores-lp .paragraph-stack{max-width:840px;margin:0 auto;text-align:center;color:var(--muted);font-size:17px}
.consultores-lp .paragraph-stack p{margin-bottom:13px}
.consultores-lp .compare{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:44px}
.consultores-lp .compare .panel:first-child{background:#fff8f8;border-color:#f1d4d4}
.consultores-lp .compare .panel:last-child{background:#f3fbf8;border-color:#c9eadf}
.consultores-lp .compare .panel:first-child h3{color:#b42318}.consultores-lp .compare .panel:last-child h3{color:#08775a}
.consultores-lp .compare .panel:first-child .clean-list li::before{content:'×';color:#df4638}.consultores-lp .compare .panel:last-child .clean-list li::before{content:'✓';color:#119b72}
.consultores-lp .proposal{display:grid;grid-template-columns:1fr auto 1fr;gap:22px;align-items:center;margin:42px 0}
.consultores-lp .quote{height:100%;border-radius:20px;padding:30px;border:1px solid var(--line);background:#fff;color:#34415b;font-size:19px;display:flex;align-items:center;box-shadow:0 14px 36px rgba(30,45,110,.07)}
.consultores-lp .quote:last-child{background:linear-gradient(145deg,#10234f,#173b85);color:#fff;border:0}
.consultores-lp .proposal-arrow{font-size:30px;color:var(--blue)}
.consultores-lp .steps{display:grid;grid-template-columns:repeat(5,1fr);gap:15px;margin-top:44px;counter-reset:steps}
.consultores-lp .step{position:relative;border:1px solid var(--line);border-radius:18px;padding:24px 18px;background:#fff}
.consultores-lp .step::before{counter-increment:steps;content:counter(steps);display:grid;place-items:center;width:35px;height:35px;border-radius:50%;background:#e8f0ff;color:var(--blue);font-weight:900;font-size:13px;margin-bottom:15px}.consultores-lp .step h3{font-size:17px;margin-bottom:11px;color:var(--blue)}.consultores-lp .step p{font-size:14px;color:var(--muted);margin:0}
.consultores-lp .audience{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:42px}
.consultores-lp .audience .panel:last-child{background:#f7f8fb}
.consultores-lp .audience .panel:first-child h3{color:#08775a}.consultores-lp .audience .panel:last-child h3{color:#667085}
.consultores-lp .founder{display:grid;grid-template-columns:360px 1fr;gap:54px;align-items:center}
.consultores-lp .founder img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:28px;border:1px solid rgba(147,197,253,.25);box-shadow:0 24px 60px rgba(0,0,0,.25)}
.consultores-lp .founder .kicker{font-size:13px;text-transform:uppercase;letter-spacing:.13em;color:#7dd3fc;font-weight:850}
.consultores-lp .founder h2{text-align:left;font-size:clamp(36px,5vw,58px);margin:8px 0 5px}
.consultores-lp .founder h3{font-size:25px;color:#bfdbfe;margin:0 0 22px}
.consultores-lp .founder p{color:#ccd7ea;margin-bottom:15px}
.consultores-lp .founder .idea{font-size:24px;color:#fff;border-left:4px solid var(--cyan);padding-left:20px;margin:26px 0}
.consultores-lp .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:30px}
.consultores-lp .stat{border:1px solid rgba(147,197,253,.2);background:rgba(255,255,255,.05);border-radius:15px;padding:16px}
.consultores-lp .stat strong{display:block;color:#7dd3fc;font-size:20px}.consultores-lp .stat span{color:#adbbd4;font-size:12px}
.consultores-lp .live-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px;counter-reset:live}
.consultores-lp .live-card{border:1px solid var(--line);border-radius:18px;background:#fff;padding:26px}
.consultores-lp .live-card::before{counter-increment:live;content:counter(live);display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#e8f0ff;color:var(--blue);font-weight:900;font-size:13px;margin-bottom:15px}.consultores-lp .live-card h3{font-size:18px;color:var(--blue);margin-bottom:12px}.consultores-lp .live-card p{color:var(--muted);font-size:15px;margin-bottom:11px}
.consultores-lp .next-date{max-width:760px;margin:30px auto 0;padding:20px;border-radius:15px;background:#e8f0ff;border:1px solid #c9d9ff;text-align:center;font-weight:850;color:var(--navy2)}
.consultores-lp .faq{display:grid;gap:12px;max-width:850px;margin:38px auto 0}
.consultores-lp .faq details{border:1px solid rgba(147,197,253,.2);border-radius:16px;background:rgba(255,255,255,.05);overflow:hidden}
.consultores-lp .faq summary{list-style:none;cursor:pointer;padding:21px 24px;font-weight:800;display:flex;justify-content:space-between;gap:15px}.consultores-lp .faq summary::-webkit-details-marker{display:none}.consultores-lp .faq summary::after{content:'+';font-size:22px;color:#7dd3fc}.consultores-lp .faq details[open] summary::after{content:'−'}
.consultores-lp .faq .answer{padding:0 24px 22px;color:#c7d3e8}.consultores-lp .faq .answer p{margin:0 0 9px}
.consultores-lp .form-section{background:linear-gradient(145deg,#eef4ff,#fff)}
.consultores-lp .form-shell{display:grid;grid-template-columns:1fr 480px;gap:54px;align-items:center}
.consultores-lp .form-copy h2{text-align:left}.consultores-lp .form-copy p{color:var(--muted);font-size:18px}.consultores-lp .form-card{background:#fff;border:1px solid var(--line);border-radius:24px;padding:30px;box-shadow:0 24px 65px rgba(30,45,110,.14)}
.consultores-lp .leadform{display:grid;gap:15px}.consultores-lp .leadform label{display:block;font-size:13px;font-weight:850;color:#34415b;margin-bottom:6px}.consultores-lp .field-ok{color:#07865e;margin-left:6px}.consultores-lp .leadform input,.consultores-lp .leadform select,.consultores-lp .leadform textarea{width:100%;border:1px solid #cbd5e1;background:#f8fafc;border-radius:11px;padding:13px 14px;font:inherit;color:var(--ink)}.consultores-lp .leadform textarea{min-height:92px;resize:vertical}.consultores-lp .leadform input:focus,.consultores-lp .leadform select:focus,.consultores-lp .leadform textarea:focus{outline:3px solid rgba(20,86,232,.12);border-color:var(--blue)}
.consultores-lp .domain-field{display:flex;align-items:stretch}.consultores-lp .domain-field input{border-radius:11px 0 0 11px;min-width:0}.consultores-lp .domain-suffix{display:flex;align-items:center;padding:0 12px;background:#e8f0ff;border:1px solid #cbd5e1;border-left:0;border-radius:0 11px 11px 0;color:#244682;font-size:12px;font-weight:800;white-space:nowrap}
.consultores-lp .qualification{margin-top:5px;padding-top:18px;border-top:1px solid var(--line);display:grid;gap:15px}.consultores-lp .qualification-title{font-size:18px;margin:0;color:var(--navy2)}.consultores-lp .qualification-note{font-size:13px;color:var(--muted);margin:-8px 0 0}.consultores-lp .booking-pending,.consultores-lp .not-qualified{padding:18px;border-radius:14px;margin-top:18px;font-size:14px}.consultores-lp .booking-pending{background:#fff8e7;border:1px solid #f1d590;color:#704d00}.consultores-lp .not-qualified{background:#f4f7fd;border:1px solid var(--line);color:#42526d}
.consultores-lp .leadform .cta{width:100%;margin-top:5px}.consultores-lp .micro{font-size:13px!important;text-align:center;color:#6b7890!important;margin:14px 0 0!important}.consultores-lp .error{color:#b42318;font-size:13px}.consultores-lp .success{text-align:center}.consultores-lp .success h3{font-size:28px}.consultores-lp .success p{color:var(--muted);margin-bottom:22px}
.consultores-lp .reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}.consultores-lp .reveal.visible{opacity:1;transform:none}
@keyframes lpFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(-18px,22px)}}
@keyframes lpFloat2{0%,100%{transform:translate(0,0)}50%{transform:translate(22px,-16px)}}
@media(max-width:900px){.consultores-lp section{padding:72px 0}.consultores-lp .ecosystem,.consultores-lp .founder,.consultores-lp .form-shell{grid-template-columns:1fr}.consultores-lp .consultancy-node{max-width:320px;margin:auto}.consultores-lp .journey{grid-template-columns:repeat(3,1fr)}.consultores-lp .journey-step:nth-child(3)::after{display:none}.consultores-lp .steps{grid-template-columns:repeat(2,1fr)}.consultores-lp .founder img{max-width:360px;margin:auto}.consultores-lp .form-shell{gap:34px}.consultores-lp .form-card{width:min(100%,560px);margin:auto}}
@media(max-width:680px){.consultores-lp .container{width:min(100% - 28px,1120px)}.consultores-lp .topbar-inner{min-height:60px}.consultores-lp .topbar-brand span{display:none}.consultores-lp .hero{padding:70px 0 66px}.consultores-lp .hero h1{font-size:clamp(38px,12vw,54px)}.consultores-lp .media-placeholder{min-height:220px}.consultores-lp .split,.consultores-lp .companies,.consultores-lp .screens,.consultores-lp .brand-grid,.consultores-lp .compare,.consultores-lp .proposal,.consultores-lp .audience,.consultores-lp .live-flow,.consultores-lp .triple-screens{grid-template-columns:1fr}.consultores-lp .proposal-arrow{transform:rotate(90deg);text-align:center}.consultores-lp .journey,.consultores-lp .steps{grid-template-columns:1fr}.consultores-lp .journey-step{min-height:0}.consultores-lp .stats{grid-template-columns:1fr 1fr}.consultores-lp .panel{padding:23px}.consultores-lp .form-card{padding:23px}}
@media(prefers-reduced-motion:reduce){.consultores-lp .reveal{opacity:1;transform:none;transition:none}}
`;
