import React, { useEffect, useRef, useState } from 'react';
import RodapeInstitucional from './RodapeInstitucional';
import { PLANOS_LBW } from '../services/planosLBW';

// Escada de 3 degraus, cada um contendo o anterior:
//   1) só cursos  ->  2) cursos + Software LBW  ->  3) tudo + projetos guiados Belt
// Preço e link vêm de planosLBW: o popup de curso bloqueado mostra a mesma
// escada, e as duas cópias já tinham começado a divergir. Copy de marketing
// (tag, resumo, itens, CTA) continua aqui.
const [P_CURSOS, P_CURSOS_SOFTWARE, P_PLATAFORMA] = PLANOS_LBW;
const valorVista = (v: number) => `ou R$ ${v.toLocaleString('pt-BR')} à vista`;

type Plano = {
  id: string; tag: string; nome: string; resumo: string; ideal: string;
  // naoInclui é opcional: o último degrau não exclui nada, então não mostra rodapé.
  itens: string[]; naoInclui?: string; href: string; cta: string;
  preco?: string; detalhePreco?: string; destaque?: boolean;
  // Preço cheio riscado + selo da condição promocional.
  precoDe?: string; promo?: string;
};

const PLANOS: Plano[] = [
  {
    id: 'cursos', tag: 'APRENDER E CERTIFICAR', nome: 'Formação Profissional em Gestão de Projetos de Melhoria',
    resumo: 'Acesso a 100% dos cursos disponíveis na aba Educação, com aulas, exercícios, avaliações e certificados.',
    ideal: 'Para quem quer construir conhecimento e comprovar sua formação curso a curso.',
    itens: ['100% dos cursos disponíveis na aba Educação', 'Videoaulas e exercícios práticos', 'Avaliações de aprendizagem', 'Certificado de conclusão disponível em todos os cursos', 'IA digital para apoiar os estudos', 'Participação na comunidade LBW'],
    naoInclui: 'Não inclui o Software LBW nem projetos guiados Yellow, Green e Black Belt.',
    preco: P_CURSOS.parcela, detalhePreco: valorVista(P_CURSOS.vista),
    href: P_CURSOS.checkout, cta: 'Quero a Formação Profissional',
  },
  {
    id: 'cursos-software', tag: 'APRENDER E APLICAR', nome: 'Formação Profissional + Software LBW',
    resumo: 'Os cursos completos somados ao ambiente de Data Analysis para aplicar o que você aprende nos seus próprios dados.',
    ideal: 'Para quem quer aprender e já executar as análises no trabalho, sem depender de outra ferramenta.',
    itens: ['Tudo da Formação Profissional', 'Todos os módulos de Data Analysis', 'Relatórios e apresentações PowerPoint', 'Projetos livres para organizar suas análises', 'IA digital para explicar uso e interpretação', 'Histórico completo dos seus trabalhos'],
    naoInclui: 'Não inclui os projetos guiados Yellow, Green e Black Belt.',
    preco: P_CURSOS_SOFTWARE.parcela, detalhePreco: valorVista(P_CURSOS_SOFTWARE.vista),
    href: P_CURSOS_SOFTWARE.checkout, cta: 'Quero a Formação + Software completo',
  },
  {
    id: 'formacao', tag: 'APRENDER, APLICAR E LIDERAR', nome: 'Plataforma Profissional em Gestão de Projetos de Melhoria',
    resumo: 'A experiência completa da LBW para aprender, analisar dados e conduzir projetos reais de melhoria.',
    ideal: 'Para quem quer se desenvolver como especialista ou líder de melhoria contínua.',
    itens: ['Tudo da Formação Profissional', 'Todo o Software LBW', 'Projetos guiados Yellow Belt', 'Projetos guiados Green Belt', 'Projetos guiados Black Belt', 'Método completo de gestão de projetos de melhoria'],
    precoDe: P_PLATAFORMA.precoDe ? `R$ ${P_PLATAFORMA.precoDe.toLocaleString('pt-BR')}` : undefined,
    preco: P_PLATAFORMA.parcela, detalhePreco: valorVista(P_PLATAFORMA.vista), href: P_PLATAFORMA.checkout,
    promo: 'Condição promocional por tempo limitado',
    cta: 'Quero a Plataforma Profissional completa', destaque: true,
  },
];

// Ordem das colunas = ordem da escada: só cursos / cursos + software / tudo.
// Cada degrau contém o anterior, então nenhuma linha pode ter ✓ num degrau e
// — no degrau seguinte. `sub` marca uma linha de detalhe: mesma marcação da
// linha principal acima dela, só que indentada e com texto menor.
type LinhaComparacao = { recurso: string; valores: [boolean, boolean, boolean]; sub?: boolean };

const COMPARACAO: LinhaComparacao[] = [
  { recurso: '100% dos cursos disponíveis na aba Educação', valores: [true, true, true] },
  { recurso: 'Avaliações e certificados dos cursos', valores: [true, true, true] },
  { recurso: 'IA digital e comunidade', valores: [true, true, true] },
  { recurso: 'Todos os módulos de Data Analysis', valores: [false, true, true] },
  { recurso: 'Relatórios e PowerPoint das análises', valores: [false, true, true] },
  { recurso: 'Projetos livres de análises estatísticas', valores: [false, true, true] },
  { recurso: 'Projetos de melhoria guiados passo a passo', valores: [false, false, true] },
  { recurso: 'Certificado de curso para os projetos Yellow, Green e Black', valores: [false, false, true], sub: true },
  { recurso: 'IA digital para explicar cada ferramenta da qualidade', valores: [false, false, true], sub: true },
  { recurso: 'IA digital para explicar cada ferramenta estatística', valores: [false, false, true], sub: true },
  { recurso: 'Mais de 30 templates e ferramentas prontas para a condução guiada —\nContrato do Projeto, Matriz GUT, RAB,\nCronograma, Ganhos do Projeto e outros', valores: [false, false, true], sub: true },
];

// Vitrine de ferramentas, logo após o comparativo. Cor por fase do projeto —
// mesma cor = mesma fase — pra virar uma leitura a mais sem precisar de texto
// extra: quem rola o carrossel sente que as 5 fases estão todas cobertas.
const FASE_COR: Record<string, string> = {
  'DEFINIR': '#d9a441',
  'MEDIR': '#10b8dc',
  'ANALISAR': '#d946a8',
  'MELHORAR': '#22d3a1',
  'CONTROLAR': '#2164f3',
  'GESTÃO DE MUDANÇA': '#8b5cf6',
};

const FERRAMENTAS: Array<{ nome: string; fase: keyof typeof FASE_COR }> = [
  { nome: 'Ideias de Projetos de Melhoria', fase: 'DEFINIR' },
  { nome: 'Matriz de Priorização - GUT', fase: 'MEDIR' },
  { nome: 'Contrato do Projeto', fase: 'DEFINIR' },
  { nome: 'Cronograma do Projeto', fase: 'DEFINIR' },
  { nome: 'Ganhos Financeiros do Projeto', fase: 'CONTROLAR' },
  { nome: 'SIPOC e Mapa do Processo', fase: 'DEFINIR' },
  { nome: 'Brainstorming', fase: 'MEDIR' },
  { nome: 'Espinha de Peixe', fase: 'MEDIR' },
  { nome: 'Matriz de Esforço e Impacto', fase: 'MEDIR' },
  { nome: 'Plano de Coleta de Dados', fase: 'MEDIR' },
  { nome: '70 Análises Gráficas e Estatísticas', fase: 'ANALISAR' },
  { nome: 'FMEA', fase: 'MELHORAR' },
  { nome: 'Plano de Ação 5W2H', fase: 'MELHORAR' },
  { nome: 'Plano de Controle', fase: 'CONTROLAR' },
  { nome: 'ADKAR - em Todas as Etapas do Projeto', fase: 'GESTÃO DE MUDANÇA' },
];

const FERRAMENTA_IMAGENS: string[][] = [
  ['/landing-tools/ideias-projetos.png'],
  ['/landing-tools/matriz-gut.png'],
  ['/landing-tools/contrato-projeto.png'],
  ['/landing-tools/cronograma-projeto.png'],
  ['/landing-tools/ganhos-projeto.png'],
  ['/landing-tools/sipoc-mapa-processo.png'],
  ['/landing-tools/brainstorming.png'],
  ['/landing-tools/espinha-de-peixe.png'],
  ['/landing-tools/matriz-esforco-impacto.png'],
  ['/landing-tools/plano-coleta-dados.png'],
  ['/landing-tools/histograma.png', '/landing-tools/regressao-simples.png'],
  ['/landing-tools/fmea.png'],
  ['/landing-tools/plano-acao-5w2h.png'],
  ['/landing-tools/plano-controle.png'],
  ['/landing-tools/adkar.png'],
];

const FAQ = [
  ['Os projetos Yellow, Green e Black Belt estão em todos os planos?', 'Não. Eles fazem parte exclusivamente da Plataforma Profissional em Gestão de Projetos de Melhoria.'],
  ['Certificado de curso e certificação de projeto são a mesma coisa?', 'Não. O certificado de curso confirma a conclusão do conteúdo. A certificação de projeto valida uma aplicação real e exige análise técnica separada.'],
  ['Posso começar por um plano e evoluir depois?', 'Sim. Os planos são cumulativos: cada um contém o anterior. Você pode começar pela Formação Profissional, acrescentar o Software LBW e depois avançar para a Plataforma Profissional.'],
  ['Qual a diferença entre os três planos?', 'A Formação Profissional entrega todos os cursos e certificados. O plano com Software acrescenta todos os módulos de Data Analysis para você aplicar nos seus próprios dados. A Plataforma Profissional acrescenta os projetos guiados Yellow, Green e Black Belt.'],
  ['O Master Black Belt está incluído?', 'Não. O Master Black Belt é uma etapa avançada posterior, indicada para profissionais que já dominam projetos Black Belt.'],
  ['Existe uma solução para consultores e empresas?', 'Sim. Consultores possuem uma trilha própria e empresas podem solicitar pacotes corporativos para equipes.'],
];

const CSS = `
.plbw{--bg:#060a18;--card:#0e1730;--blue:#2164f3;--cyan:#10b8dc;--text:#f7f9ff;--muted:#aab6d2;--line:rgba(164,188,244,.18);--fd:'Space Grotesk',system-ui,sans-serif;--fb:'Instrument Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-family:var(--fb);min-height:100vh;position:relative;overflow-x:hidden}
/* overflow-x:hidden vira um scroll container e quebra o position:sticky do nav
   (o nav passaria a grudar dentro do .plbw, não da janela). overflow-x:clip
   corta o transbordo horizontal SEM criar scroll container, então o nav gruda.
   O hidden acima fica de reserva pra navegador sem suporte a clip. */
@supports (overflow-x:clip){.plbw{overflow-x:clip}}
.plbw *{box-sizing:border-box}.plbw h1,.plbw h2,.plbw h3,.plbw p{margin:0}.plbw a{text-decoration:none}.plbw .wrap{width:min(1140px,calc(100% - 40px));margin:0 auto}.plbw .section{padding:82px 0;scroll-margin-top:70px}.plbw .section-soft{background:linear-gradient(180deg,rgba(20,47,111,.16),rgba(6,10,24,0))}
.plbw h1,.plbw h2,.plbw h3,.plbw .brand,.plbw .price,.plbw .recommended,.plbw .plan-tag,.plbw .head small,.plbw .hero-proof-title,.plbw .proof strong,.plbw .tool-card-title,.plbw th,.plbw .row-preco td:first-child{font-family:var(--fd)}
/* Space Grotesk vai só até 700: pesos 800/900 viravam negrito sintético
   (borrado). Tudo que era 800+ passa a 700, que é o mais forte real da fonte. */
.plbw .brand,.plbw .head small,.plbw .hero-proof-title,.plbw .proof strong,.plbw .proof::before,.plbw .recommended,.plbw .plan-tag,.plbw .price,.plbw .items li:before,.plbw .saving-badge,.plbw .faq-q,.plbw .btn,.plbw .tool-card-title,.plbw .proof-stage{font-weight:700}
/* Nav fixo no topo */
.plbw .nav{position:sticky;top:0;z-index:60;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px clamp(16px,4vw,40px);background:rgba(6,10,24,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.plbw .nav-marca{display:flex;align-items:center;gap:10px;color:#fff}.plbw .nav-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2866f4,#10b8dc);display:grid;place-items:center;font-family:var(--fd);font-weight:700;font-size:15px}.plbw .nav-nome{font-family:var(--fd);font-weight:700;font-size:15px}
.plbw .nav-dir{display:flex;align-items:center;gap:26px}.plbw .nav-links{display:flex;align-items:center;gap:26px}.plbw .nav-links a{color:var(--muted);font-size:14px;font-weight:500}.plbw .nav-links a:hover{color:#fff}
.plbw .nav-cta{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 16px;border-radius:9px;font-weight:700;font-size:13px;color:#fff;background:linear-gradient(120deg,#2866f4,#0aaacb);box-shadow:0 12px 28px -14px rgba(37,99,235,.9);transition:transform .2s ease}.plbw .nav-cta:hover{transform:translateY(-2px)}
@media(max-width:820px){.plbw .nav-links{display:none}}
/* Seção do autor */
.plbw .autor{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:44px;align-items:center}
.plbw .autor-foto-col{display:flex;justify-content:center}.plbw .autor-foto{width:220px;height:220px;border-radius:50%;object-fit:cover;box-shadow:0 24px 60px -20px rgba(33,100,243,.5);border:1px solid var(--line)}
.plbw .autor h2{font-size:clamp(28px,3.6vw,38px);letter-spacing:-.03em;margin:14px 0 6px}.plbw .autor-cargo{color:#84adff;font-size:15px;font-weight:600;margin-bottom:16px}.plbw .autor-bio{color:var(--muted);line-height:1.65;font-size:17px}
.plbw .hero{position:relative;padding:92px 0 78px;text-align:center;background:radial-gradient(circle at 80% 10%,rgba(33,100,243,.34),transparent 33%),radial-gradient(circle at 10% 65%,rgba(16,184,220,.17),transparent 34%)}
.plbw .brand{font-size:12px;letter-spacing:.24em;font-weight:900;color:#8fb3ff;margin-bottom:20px}.plbw .pill{display:inline-flex;padding:9px 16px;border:1px solid rgba(96,165,250,.34);border-radius:999px;background:rgba(37,99,235,.1);color:#b9d1ff;font-size:12px;font-weight:800;letter-spacing:.08em}
.plbw h1{font-size:clamp(38px,6vw,68px);line-height:1.02;letter-spacing:-.045em;max-width:930px;margin:22px auto 20px}.plbw .gradient{background:linear-gradient(100deg,#fff 10%,#92b7ff 55%,#13c4df);-webkit-background-clip:text;background-clip:text;color:transparent}.plbw .hero-lead{max-width:790px;margin:0 auto;color:var(--muted);font-size:20px;line-height:1.6}.plbw .hero-actions{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:32px}
.plbw .btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 27px;border-radius:12px;font-weight:800;color:#fff;border:1px solid transparent;transition:.2s ease;cursor:pointer}.plbw .btn:hover{transform:translateY(-2px)}.plbw .btn-primary{background:linear-gradient(120deg,#2866f4,#0aaacb);box-shadow:0 18px 42px -18px rgba(37,99,235,.9)}.plbw .btn-secondary{border-color:var(--line);background:rgba(255,255,255,.045)}
.plbw .hero-proof-wrap{max-width:920px;margin:58px auto 0;padding:0 8px 72px}.plbw .hero-proof-title{text-align:center;color:#fff;font-size:15px;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.plbw .hero-proof-subtitle{text-align:center;color:#7fa6f7;font-size:13px;font-weight:650;margin:7px 0 30px}.plbw .hero-proof{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:32px;align-items:start;border:0;background:transparent;overflow:visible}.plbw .hero-proof::before{content:'';position:absolute;z-index:0;left:9%;right:9%;top:73px;height:3px;border-radius:999px;background:linear-gradient(90deg,rgba(72,111,186,.1),#2b63d4 52%,#12b8d6);transform:rotate(-5deg);box-shadow:0 0 18px rgba(37,99,235,.35)}.plbw .proof{position:relative;z-index:1;min-height:142px;padding:38px 22px 24px;border:1px solid rgba(75,109,174,.5);border-radius:20px;background:linear-gradient(145deg,#0d1933,#101f40);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;box-shadow:0 24px 55px -30px rgba(0,0,0,.9);transition:box-shadow .2s ease,border-color .2s ease}.plbw .proof:hover{box-shadow:0 28px 65px -28px rgba(37,99,235,.58)}.plbw .proof:nth-child(1){transform:translateY(64px)}.plbw .proof:nth-child(2){transform:translateY(32px);border-color:rgba(65,120,229,.72);background:linear-gradient(145deg,#132d5d,#174082)}.plbw .proof:nth-child(3){border-color:rgba(16,184,220,.78);background:linear-gradient(145deg,#12395a,#0b6278);box-shadow:0 26px 65px -30px rgba(16,184,220,.72)}.plbw .proof::before{content:attr(data-step);position:absolute;left:20px;top:-22px;width:46px;height:46px;border-radius:15px;background:#17376f;border:1px solid #477adb;color:#fff;display:grid;place-items:center;font-size:14px;font-weight:950;letter-spacing:.04em;box-shadow:0 10px 26px rgba(0,0,0,.35)}.plbw .proof:nth-child(2)::before{background:#2164f3;border-color:#73a0ff}.plbw .proof:nth-child(3)::before{background:#09a5c3;border-color:#62dff2}.plbw .proof:not(:last-child)::after{content:'↗';position:absolute;right:-39px;top:24px;z-index:4;width:44px;height:44px;border-radius:50%;background:#102857;border:1px solid #3e75df;color:#8fb3ff;font-size:24px;font-weight:950;line-height:42px;text-align:center;box-shadow:0 10px 24px rgba(0,0,0,.35)}.plbw .proof-stage{color:#79a2f9!important;font-size:10px!important;font-weight:950!important;letter-spacing:.16em!important;text-transform:uppercase;margin:0 0 7px!important}.plbw .proof:nth-child(3) .proof-stage{color:#69e2f2!important}.plbw .proof strong{display:block;font-size:23px;line-height:1.1}.plbw .proof-copy{display:block;color:#b8c6e4!important;font-size:14px!important;line-height:1.45;margin-top:10px!important}
.plbw .head{text-align:center;max-width:780px;margin:0 auto 42px}.plbw .head small{font-weight:900;color:#74a2ff;letter-spacing:.18em}.plbw .head h2{font-size:clamp(30px,4.2vw,46px);letter-spacing:-.035em;margin:14px 0}.plbw .head p{color:var(--muted);line-height:1.65;font-size:17px}
.plbw .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}.plbw .plan{position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:22px;padding:28px;background:linear-gradient(160deg,rgba(17,31,66,.95),rgba(8,14,31,.96));box-shadow:0 24px 70px -42px #000}.plbw .plan.featured{border-color:#4381ff;box-shadow:0 0 0 1px rgba(67,129,255,.22),0 30px 80px -35px rgba(33,100,243,.75)}.plbw .recommended{position:absolute;top:-13px;right:20px;background:linear-gradient(120deg,#2866f4,#10b8dc);padding:7px 13px;border-radius:999px;font-size:11px;font-weight:900}.plbw .plan-tag{font-size:11px;color:#84adff;font-weight:900;letter-spacing:.12em;min-height:28px}.plbw .plan h3{font-size:27px;line-height:1.15;margin:10px 0 13px}.plbw .summary{color:#c7d1e8;line-height:1.55;min-height:100px}.plbw .ideal{margin:19px 0;padding:13px 14px;border-radius:11px;background:rgba(72,117,218,.09);color:#aebde0;font-size:13px;line-height:1.5}.plbw .items{list-style:none;padding:0;margin:0 0 18px}.plbw .items li{position:relative;padding:0 0 12px 25px;color:#e7ecf8;font-size:14px;line-height:1.45}.plbw .items li:before{content:'✓';position:absolute;left:0;color:#22d3a1;font-weight:900}.plbw .exclude{color:#93a2c3;font-size:12.5px;line-height:1.5;border-top:1px solid var(--line);padding-top:15px;margin-top:auto}.plbw .exclude-vazio{margin-top:auto}.plbw .price{text-align:center;font-size:27px;font-weight:900;margin:22px 0 3px}.plbw .price-note{text-align:center;color:#aab6d2;font-size:13px;margin-bottom:14px}.plbw .soon{text-align:center;color:#bfd1fa;font-size:14px;font-weight:700;margin:22px 0 16px}.plbw .plan .btn{width:100%;text-align:center}
.plbw .price-de{text-align:center;color:#8fa0c4;font-size:13px;margin:22px 0 0}.plbw .price-de s{color:#7b8bb0}.plbw .price-de+.price{margin-top:2px}
.plbw .saving{display:flex;justify-content:center;margin:0 0 14px}.plbw .saving-badge{display:inline-flex;text-align:center;padding:6px 13px;border-radius:999px;background:rgba(34,211,161,.12);border:1px solid rgba(34,211,161,.42);color:#3ee0b0;font-size:12px;font-weight:900;line-height:1.35;max-width:100%}
/* Os CTAs têm textos longos ("Quero a Plataforma Profissional completa"). O .btn
   base tem padding vertical zero e min-height fixo — se o texto quebrar em duas
   linhas, encosta nas bordas. Dentro do card o botão pode crescer. */
.plbw .plan .btn{padding:14px 20px;min-height:56px;line-height:1.3}
.plbw .table-shell{overflow-x:auto;border:1px solid var(--line);border-radius:18px;background:#0b1329}.plbw table{width:100%;border-collapse:collapse;min-width:760px}.plbw th,.plbw td{padding:17px 18px;border-bottom:1px solid var(--line);text-align:center}.plbw th:first-child,.plbw td:first-child{text-align:left}.plbw th{color:#a9c3ff;font-size:15px}.plbw td{font-size:15px;color:#dbe3f6}.plbw tr:last-child td{border-bottom:0}.plbw .yes{color:#23d6a3;font-size:20px}.plbw .no{color:#55627f;font-size:20px}
/* Sublinhas de detalhe (ex.: os itens dentro de "Projetos de melhoria guiados
   passo a passo"): texto menor, recuado e mais apagado que a linha principal
   acima, pra ficar claro que são detalhe dela e não um recurso à parte. */
.plbw tr.row-sub td{padding-top:11px;padding-bottom:11px;color:var(--muted);font-size:14px;white-space:pre-line}.plbw tr.row-sub td:first-child{padding-left:34px}.plbw tr.row-sub .yes,.plbw tr.row-sub .no{font-size:16px}
.plbw .row-preco td{background:rgba(33,100,243,.08);border-top:1px solid var(--line)}.plbw .row-preco strong{display:block;font-size:16px;color:#fff}.plbw .row-preco span{display:block;font-size:12px;color:var(--muted);margin-top:3px}
/* Vitrine de ferramentas: carrossel horizontal, um cartão por ferramenta. Cada
   um recebe a cor da fase via --glow (custom property inline) e usa essa
   variável tanto no brilho de fundo quanto no rótulo da fase — uma só fonte
   de cor por cartão, sem repetir o hex em vários lugares do CSS. */
/* Rola no toque/arraste normalmente, mas sem a barra de rolagem visível —
   scrollbar-width cobre Firefox, ::-webkit-scrollbar cobre Chrome/Safari/Edge. */
.plbw .tools-carousel{position:relative}.plbw .tools-scroll{overflow-x:auto;margin:0 -4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:12px 4px 20px;mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 94%,transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 94%,transparent 100%)}
.plbw .tools-scroll::-webkit-scrollbar{display:none}
.plbw .tools-track{display:flex;gap:16px;width:max-content;padding:4px}
.plbw .tools-next{position:absolute;right:10px;top:50%;z-index:5;width:44px;height:44px;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(6,10,24,.82);color:#fff;font-size:28px;line-height:1;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:.2s ease}.plbw .tools-next:hover{background:#2164f3;transform:translateX(2px)}.plbw .tools-next:focus-visible{outline:2px solid #67e8f9;outline-offset:3px}
.plbw .tool-card{position:relative;overflow:hidden;flex:0 0 auto;width:420px;height:286px;border-radius:20px;border:1px solid var(--line);background:#f4f7fb;display:flex;flex-direction:column;transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease;will-change:transform}
.plbw .tool-card:hover{z-index:3;transform:translateY(-5px) scale(1.012);border-color:rgba(96,165,250,.9);box-shadow:0 18px 42px rgba(33,100,243,.3)}
/* A cor da fase (--glow) vira a faixa lateral do título — é o único lugar em
   que ela aparece de verdade no card, já que a área da imagem é opaca. */
.plbw .tool-card-title{position:relative;z-index:2;min-height:64px;padding:14px 18px 12px;background:linear-gradient(120deg,#10295a,#2164f3);color:#fff;font-size:18px;line-height:1.2;display:flex;align-items:center;border-left:4px solid var(--glow)}
.plbw .tool-card-media{position:relative;z-index:1;flex:1;min-height:0;padding:9px;background:#f4f7fb;display:flex;align-items:center;justify-content:center}
.plbw .tool-card-media.multi{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.plbw .tool-card-image{width:100%;height:100%;object-fit:contain;display:block;border-radius:7px;transition:transform .35s ease}.plbw .tool-card:hover .tool-card-image{transform:scale(1.025)}
.plbw .faq{max-width:860px;margin:0 auto}.plbw .faq-item{border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025);margin-bottom:12px;overflow:hidden}.plbw .faq-q{width:100%;padding:20px 22px;display:flex;justify-content:space-between;gap:15px;border:0;background:none;color:#fff;text-align:left;font:inherit;font-weight:800;cursor:pointer}.plbw .faq-a{padding:0 22px 20px;color:var(--muted);line-height:1.6}.plbw .final{text-align:center;padding:80px 0;background:linear-gradient(140deg,#10265e,#071127 55%,#08374c)}.plbw .final h2{font-size:clamp(32px,4vw,48px);max-width:760px;margin:0 auto 16px}.plbw .final p{color:#bac7e3;max-width:670px;margin:0 auto 28px;line-height:1.6}
@media(max-width:950px){.plbw .plans{grid-template-columns:1fr}.plbw .summary{min-height:0}.plbw .plan{max-width:620px;width:100%;margin:0 auto}}
@media(max-width:620px){.plbw .wrap{width:min(100% - 28px,1140px)}.plbw .hero{padding:60px 0}.plbw .hero-lead{font-size:17px}.plbw .hero-proof-wrap{margin-top:42px;padding:0 4px 12px}.plbw .hero-proof-subtitle{margin-bottom:34px}.plbw .hero-proof{grid-template-columns:1fr;gap:34px;padding:0 10px}.plbw .hero-proof::before{display:none}.plbw .proof,.plbw .proof:nth-child(1),.plbw .proof:nth-child(2),.plbw .proof:nth-child(3),.plbw .proof:hover{transform:none!important;min-height:124px}.plbw .proof:not(:last-child)::after{content:'↓';right:50%;top:auto;bottom:-29px;transform:translateX(50%);width:36px;height:36px;line-height:34px;font-size:20px}.plbw .proof+.proof{border-left:1px solid var(--line)}.plbw .section{padding:60px 0}.plbw .plan{padding:24px 20px}.plbw .hero-actions .btn{width:100%}
/* Nomes de plano são longos ("Plataforma Profissional em Gestão de Projetos de
   Melhoria"): 27px estoura em tela estreita. Tabela também aperta o padding —
   ela já rola na horizontal, mas com menos folga cabe mais coluna na tela. */
.plbw .plan h3{font-size:22px}.plbw .price{font-size:24px}.plbw th,.plbw td{padding:14px 12px}.plbw .faq-q{padding:17px 18px}.plbw .faq-a{padding:0 18px 18px}}
`;

export default function LandingPlataformaLBW() {
  const [faqAberta, setFaqAberta] = useState(0);
  const [pausarFerramentas, setPausarFerramentas] = useState(false);
  const ferramentasRef = useRef<HTMLDivElement>(null);

  const avancarFerramentas = () => {
    const area = ferramentasRef.current;
    if (!area) return;
    const card = area.querySelector<HTMLElement>('.tool-card');
    const passo = (card?.offsetWidth || 420) + 16;
    area.scrollBy({ left: passo, behavior: 'smooth' });
  };

  useEffect(() => {
    if (pausarFerramentas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let instanteAnterior = performance.now();

    const moverContinuamente = (agora: number) => {
      const area = ferramentasRef.current;
      if (area) {
        const delta = Math.min(agora - instanteAnterior, 50);
        area.scrollLeft += delta * 0.035;

        const primeiro = area.querySelector<HTMLElement>('[data-tool-copy="original"]');
        const inicioCopia = area.querySelector<HTMLElement>('[data-tool-copy="duplicate"]');
        const larguraCiclo = primeiro && inicioCopia ? inicioCopia.offsetLeft - primeiro.offsetLeft : 0;
        if (larguraCiclo > 0 && area.scrollLeft >= larguraCiclo) area.scrollLeft -= larguraCiclo;
      }
      instanteAnterior = agora;
      frame = window.requestAnimationFrame(moverContinuamente);
    };

    frame = window.requestAnimationFrame(moverContinuamente);
    return () => window.cancelAnimationFrame(frame);
  }, [pausarFerramentas]);

  // Fontes injetadas aqui, e não no index.html, porque só esta landing usa
  // Space Grotesk/Instrument Sans — no index.html toda página do app pagaria o
  // download. O guard evita duplicar a tag ao remontar o componente.
  useEffect(() => {
    if (document.querySelector('link[data-lbw-fontes]')) return;
    const preconexoes: HTMLLinkElement[] = [];
    ([['preconnect', 'https://fonts.googleapis.com', false], ['preconnect', 'https://fonts.gstatic.com', true]] as const).forEach(([rel, href, cors]) => {
      const tag = document.createElement('link');
      tag.rel = rel;
      tag.href = href;
      if (cors) tag.crossOrigin = 'anonymous';
      tag.dataset.lbwFontes = 'true';
      document.head.appendChild(tag);
      preconexoes.push(tag);
    });
    const fontes = document.createElement('link');
    fontes.rel = 'stylesheet';
    fontes.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Instrument+Sans:wght@400;500;600;700&display=swap';
    fontes.dataset.lbwFontes = 'true';
    document.head.appendChild(fontes);
    preconexoes.push(fontes);
    return () => preconexoes.forEach((tag) => tag.remove());
  }, []);

  useEffect(() => {
    if (document.querySelector('script[data-lbw-hotmart]')) return;
    const script = document.createElement('script');
    script.src = 'https://static.hotmart.com/checkout/widget.min.js';
    script.async = true;
    script.dataset.lbwHotmart = 'true';
    document.head.appendChild(script);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://static.hotmart.com/css/hotmart-fb.min.css';
    link.dataset.lbwHotmart = 'true';
    document.head.appendChild(link);
  }, []);

  return (
    <div className="plbw">
      <style>{CSS}</style>
      <nav className="nav">
        <a className="nav-marca" href="#top">
          <span className="nav-logo">L</span>
          <span className="nav-nome">Learning by Working</span>
        </a>
        <div className="nav-dir">
          <div className="nav-links">
            <a href="#planos">Planos</a>
            <a href="#como-escolher">Comparar</a>
            <a href="#ferramentas">Ferramentas</a>
            <a href="#faq">Dúvidas</a>
          </div>
          <a className="nav-cta" href="#planos">Ver planos</a>
        </div>
      </nav>
      <header className="hero" id="top"><div className="wrap">
        <div className="brand">LBW · EDUCAÇÃO PELO TRABALHO</div>
        <span className="pill">UMA PLATAFORMA · TRÊS FORMAS DE EVOLUIR</span>
        <h1>Escolha como você quer <span className="gradient">aprender, analisar e liderar melhorias</span></h1>
        <p className="hero-lead">Cursos, software estatístico, inteligência artificial e projetos de melhoria reunidos em uma única plataforma — com um plano adequado ao seu objetivo profissional.</p>
        <div className="hero-actions"><a className="btn btn-primary" href="#planos">Comparar os planos</a><a className="btn btn-secondary" href="#como-escolher">Entender as diferenças</a></div>
        <div className="hero-proof-wrap"><div className="hero-proof-title">Sua evolução na LBW</div><div className="hero-proof-subtitle">Do conhecimento à liderança de projetos</div><div className="hero-proof"><div className="proof" data-step="01"><span className="proof-stage">Primeiro degrau</span><strong>Aprenda</strong><span className="proof-copy">Cursos, exercícios e avaliações</span></div><div className="proof" data-step="02"><span className="proof-stage">Segundo degrau</span><strong>Aplique</strong><span className="proof-copy">Análises, IA, relatórios e PPT</span></div><div className="proof" data-step="03"><span className="proof-stage">Terceiro degrau</span><strong>Lidere</strong><span className="proof-copy">Projetos reais de melhoria</span></div></div></div>
      </div></header>

      <main>
        <section className="section" id="planos"><div className="wrap">
          <div className="head"><small>ESCOLHA SEU CAMINHO</small><h2>Três produtos claros. Uma única plataforma.</h2><p>Você não precisa contratar tudo para começar. Escolha o nível de acesso que resolve sua necessidade agora e evolua quando fizer sentido.</p></div>
          <div className="plans">{PLANOS.map((plano) => <article className={`plan${plano.destaque ? ' featured' : ''}`} key={plano.id}>
            {plano.destaque && <span className="recommended">MAIS COMPLETO</span>}<div className="plan-tag">{plano.tag}</div><h3>{plano.nome}</h3><p className="summary">{plano.resumo}</p><p className="ideal"><strong>Ideal para:</strong> {plano.ideal}</p>
            <ul className="items">{plano.itens.map((item) => <li key={item}>{item}</li>)}</ul>
            {/* Sem texto de exclusão, entra um espaçador: é o margin-top:auto do
                .exclude que empurra o preço pra base e alinha os três cards. */}
            {plano.naoInclui ? <p className="exclude">{plano.naoInclui}</p> : <div className="exclude-vazio" />}
            {plano.preco ? <>
              {plano.precoDe && <div className="price-de">de <s>{plano.precoDe}</s> por</div>}
              <div className="price">{plano.preco}</div>
              {plano.detalhePreco && <div className="price-note">{plano.detalhePreco}</div>}
            </> : <div className="soon">Condição comercial sob consulta</div>}
            {plano.promo && <div className="saving"><span className="saving-badge">{plano.promo}</span></div>}
            {/* As classes do widget da Hotmart seguem o LINK, não o destaque visual.
                Antes estavam presas a `destaque`: a Formação Profissional tinha
                checkout real e abria sem o popup, e a Completa (href de /contato)
                recebia o widget e tentava abrir um checkout que não existe. */}
            <a
              className={`btn ${plano.destaque ? 'btn-primary' : 'btn-secondary'}${plano.href.includes('pay.hotmart.com') ? ' hotmart-fb hotmart__button-checkout' : ''}`}
              href={plano.href}
            >{plano.cta}</a>
          </article>)}</div>
        </div></section>

        <section className="section section-soft" id="como-escolher"><div className="wrap">
          <div className="head"><small>COMPARAÇÃO DIRETA</small><h2>Veja exatamente o que muda</h2><p>Os projetos guiados Yellow, Green e Black Belt pertencem somente à Plataforma Profissional.</p></div>
          <div className="table-shell"><table><thead><tr><th>Recurso</th><th>Formação Profissional</th><th>Profissional + Software</th><th>Plataforma Profissional</th></tr></thead><tbody>{COMPARACAO.map(({ recurso, valores, sub }) => <tr key={recurso} className={sub ? 'row-sub' : undefined}><td>{recurso}</td>{valores.map((valor, i) => <td key={i} className={valor ? 'yes' : 'no'}>{valor ? '✓' : '—'}</td>)}</tr>)}</tbody>
            {/* Preço na própria tabela: quem compara linha a linha decide aqui,
                sem precisar rolar de volta pros cards. */}
            <tfoot><tr className="row-preco"><td>Investimento</td>{PLANOS.map((plano) => <td key={plano.id}><strong>{plano.preco}</strong><span>{plano.detalhePreco}</span></td>)}</tr></tfoot>
            </table></div>
        </div></section>

        <section className="section" id="ferramentas"><div className="wrap">
          <div className="head"><small>DENTRO DA PLATAFORMA PROFISSIONAL</small><h2>Templates de gerenciamento de projetos prontos para usar</h2><p>Modelos profissionais para conduzir o projeto, da ideia inicial ao encerramento.</p></div>
          <div className="tools-carousel" onMouseEnter={() => setPausarFerramentas(true)} onMouseLeave={() => setPausarFerramentas(false)}>
            <div className="tools-scroll" ref={ferramentasRef}><div className="tools-track">{[...FERRAMENTAS, ...FERRAMENTAS].map((ferramenta, index) => {
            const indiceOriginal = index % FERRAMENTAS.length;
            const imagens = FERRAMENTA_IMAGENS[indiceOriginal] || [];
            const duplicado = index >= FERRAMENTAS.length;
            return <article className="tool-card" key={`${ferramenta.nome}-${duplicado ? 'copia' : 'original'}`} data-tool-copy={duplicado ? 'duplicate' : 'original'} aria-hidden={duplicado || undefined} style={{ '--glow': FASE_COR[ferramenta.fase] } as React.CSSProperties}>
              <h3 className="tool-card-title">{ferramenta.nome}</h3>
              <div className={`tool-card-media${imagens.length > 1 ? ' multi' : ''}`}>
                {imagens.map((imagem) => <img className="tool-card-image" key={imagem} src={imagem} alt="" loading="lazy" />)}
              </div>
            </article>;
            })}</div></div>
            <button type="button" className="tools-next" onClick={avancarFerramentas} aria-label="Avançar cards de ferramentas" title="Avançar ferramentas">→</button>
          </div>
        </div></section>

        <section className="section section-soft"><div className="wrap">
          <div className="autor">
            <div className="autor-foto-col"><img className="autor-foto" src="/israel-foto.png" alt="Israel Cavalcanti de Souza" loading="lazy" /></div>
            <div>
              <small className="head-small-autor" style={{ fontFamily: 'var(--fd)', fontWeight: 700, color: '#74a2ff', letterSpacing: '.18em', fontSize: 13 }}>QUEM ENSINA</small>
              <h2>Israel Cavalcanti de Souza</h2>
              <p className="autor-cargo">CEO da Learning by Working · MBB · PMP · MBA</p>
              <p className="autor-bio">Acredito em aprender fazendo: conhecimento só vira competência quando é aplicado em projetos reais. É esse princípio que estrutura a LBW, do primeiro curso à excelência operacional.</p>
            </div>
          </div>
        </div></section>

        <section className="section" id="faq"><div className="wrap"><div className="head"><small>DÚVIDAS FREQUENTES</small><h2>Ainda tem alguma dúvida?</h2></div><div className="faq">{FAQ.map(([pergunta, resposta], index) => <div className="faq-item" key={pergunta}><button className="faq-q" type="button" onClick={() => setFaqAberta(faqAberta === index ? -1 : index)} aria-expanded={faqAberta === index}><span>{pergunta}</span><span>{faqAberta === index ? '−' : '+'}</span></button>{faqAberta === index && <div className="faq-a">{resposta}</div>}</div>)}</div></div></section>

        <section className="final"><div className="wrap"><h2>Comece pelo que você precisa. Evolua até onde quiser.</h2><p>A LBW conecta aprendizagem, aplicação e resultado sem obrigar você a contratar recursos que ainda não precisa.</p><a className="btn btn-primary" href="#planos">Escolher meu plano</a></div></section>
      </main>
      <RodapeInstitucional />
    </div>
  );
}
