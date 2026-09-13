const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'LBW - Learning by Working';
pptx.company = 'LBW';
pptx.subject = 'Modelos de parceria da Plataforma LBW para consultores';
pptx.title = 'Parceria LBW para Consultores';
pptx.lang = 'pt-BR';
pptx.theme = {
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  lang: 'pt-BR',
};
pptx.defineSlideMaster({
  title: 'LBW_LIGHT',
  background: { color: 'F5F7FB' },
  objects: [
    { rect: { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: '155CFF' }, line: { color: '155CFF' } } },
    { text: { text: 'LBW  |  Learning by Working', options: { x: 0.48, y: 7.12, w: 3.2, h: 0.18, fontFace: 'Arial', fontSize: 7.5, bold: true, color: '72809B', margin: 0 } } },
    { text: { text: 'PARCERIA PARA CONSULTORES', options: { x: 9.9, y: 7.12, w: 2.85, h: 0.18, fontFace: 'Arial', fontSize: 7.5, bold: true, color: '72809B', align: 'right', margin: 0 } } },
  ],
  slideNumber: { x: 12.78, y: 7.11, w: 0.22, h: 0.18, color: '72809B', fontFace: 'Arial', fontSize: 7.5, align: 'right', margin: 0 },
});

// Facilita a validação incremental com o PowerPoint sem alterar o arquivo final.
const maxSlides = Number(process.env.MAX_SLIDES || 99);
let requestedSlides = 0;
const addRealSlide = pptx.addSlide.bind(pptx);
const ignoredSlide = new Proxy({}, {
  get: () => () => undefined,
  set: () => true,
});
pptx.addSlide = (...args) => {
  requestedSlides += 1;
  return requestedSlides <= maxSlides ? addRealSlide(...args) : ignoredSlide;
};

const C = {
  navy: '07152F',
  navy2: '0C224A',
  blue: '155CFF',
  blue2: '2A6AF0',
  cyan: '18C7E8',
  green: '12B981',
  orange: 'FF8A3D',
  red: 'E94F64',
  white: 'FFFFFF',
  bg: 'F5F7FB',
  light: 'EAF0FA',
  line: 'D8E1F0',
  text: '0B1831',
  muted: '60708F',
  paleBlue: 'E8F0FF',
  paleGreen: 'E7F8F2',
  paleOrange: 'FFF0E5',
};

const workspace = path.resolve(__dirname, '../..');
const imgIsrael = path.join(workspace, 'github-temp', 'public', 'israel-foto.png');
const imgPlataforma = path.join(workspace, 'banner', 'Plataforma Profissional em Gestão de Projetos de Melhoria.png');
const imgSoftware = path.join(workspace, 'banner', 'Software Estatístico + Formação em Gestão de Projetos de Melhoria.png');
const outputDir = path.join(workspace, 'Apresentacoes LBW');
const outputFile = process.env.OUTPUT_FILE
  ? path.resolve(process.env.OUTPUT_FILE)
  : path.join(outputDir, 'Parceria_LBW_para_Consultores.pptx');

function addText(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: 'Arial',
    fontSize: 18,
    color: C.text,
    margin: 0,
    valign: 'mid',
    breakLine: false,
    fit: 'shrink',
    ...opts,
  });
}

function addTopTitle(slide, eyebrow, title, subtitle) {
  addText(slide, eyebrow.toUpperCase(), 0.58, 0.42, 5.9, 0.25, {
    fontSize: 9.5, bold: true, color: C.blue, charSpacing: 2.2,
  });
  addText(slide, title, 0.58, 0.75, 12.05, 0.55, {
    fontSize: 27, bold: true, color: C.navy, breakLine: false,
  });
  if (subtitle) {
    addText(slide, subtitle, 0.58, 1.36, 11.85, 0.38, {
      fontSize: 12.2, color: C.muted,
    });
  }
}

function addCard(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: opts.fill || C.white, transparency: opts.transparency || 0 },
    line: { color: opts.line || C.line, width: opts.lineWidth || 1 },
    shadow: opts.shadow === false ? undefined : { type: 'outer', color: '7A8CAB', opacity: 0.13, blur: 1.5, angle: 45, distance: 1 },
  });
}

function addPill(slide, text, x, y, w, color = C.blue, fill = C.paleBlue) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.34,
    fill: { color: fill },
    line: { color: fill },
    rectRadius: 0.08,
  });
  addText(slide, text.toUpperCase(), x + 0.08, y + 0.02, w - 0.16, 0.29, {
    fontSize: 8.5, bold: true, color, align: 'center', charSpacing: 1.1,
  });
}

function addBulletList(slide, items, x, y, w, h, opts = {}) {
  const runs = [];
  items.forEach((item, idx) => {
    runs.push({
      text: `${item}${idx < items.length - 1 ? '\n' : ''}`,
      options: {
        bullet: { type: 'ul' },
        breakLine: idx < items.length - 1,
      },
    });
  });
  slide.addText(runs, {
    x, y, w, h,
    fontFace: 'Arial',
    fontSize: opts.fontSize || 15,
    color: opts.color || C.text,
    breakLine: false,
    valign: 'top',
    margin: opts.margin || 0.04,
    paraSpaceAfterPt: opts.paraSpaceAfterPt || 10,
    bullet: { indent: 15 },
    fit: 'shrink',
  });
}

function addIconCircle(slide, label, x, y, color = C.blue, size = 0.62, fontSize = 14) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y, w: size, h: size,
    fill: { color },
    line: { color },
  });
  addText(slide, label, x, y + 0.01, size, size - 0.01, {
    fontSize, bold: true, color: C.white, align: 'center', valign: 'mid',
  });
}

function addSectionCard(slide, number, title, body, x, y, w, h, color = C.blue) {
  addCard(slide, x, y, w, h, { fill: C.white, line: 'CED9EA' });
  addIconCircle(slide, String(number), x + 0.22, y + 0.22, color, 0.52, 13);
  addText(slide, title, x + 0.86, y + 0.18, w - 1.08, 0.4, {
    fontSize: 16, bold: true, color: C.navy,
  });
  addText(slide, body, x + 0.22, y + 0.79, w - 0.44, h - 0.98, {
    fontSize: 11.5, color: C.muted, valign: 'top', breakLine: true,
  });
}

function addChevron(slide, x, y, w = 0.35, h = 0.56, color = C.blue) {
  slide.addShape(pptx.ShapeType.chevron, {
    x, y, w, h,
    fill: { color },
    line: { color },
  });
}

function addImageFrame(slide, imagePath, x, y, w, h, opts = {}) {
  addCard(slide, x - 0.08, y - 0.08, w + 0.16, h + 0.16, {
    fill: opts.frameFill || C.white,
    line: opts.frameLine || C.cyan,
    lineWidth: opts.lineWidth || 1.4,
  });
  slide.addImage({ path: imagePath, x, y, w, h });
}

// Slide 1 — capa
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape(pptx.ShapeType.arc, { x: 8.0, y: -2.2, w: 6.7, h: 6.7, adjustPoint: 0.2, rotate: 25, fill: { color: C.blue, transparency: 35 }, line: { color: C.blue, transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 0.58, w: 0.08, h: 5.78, fill: { color: C.cyan }, line: { color: C.cyan } });
  addText(slide, 'LBW', 0.88, 0.55, 1.15, 0.4, { fontSize: 21, bold: true, color: C.white, charSpacing: 2.5 });
  addText(slide, 'LEARNING BY WORKING', 2.03, 0.63, 2.8, 0.25, { fontSize: 8.5, bold: true, color: '8FB7FF', charSpacing: 2.2 });
  addPill(slide, 'Apresentação para consultores', 0.9, 1.4, 2.75, C.cyan, '10345C');
  addText(slide, 'PARCERIA LBW\nPARA CONSULTORES', 0.88, 2.0, 6.2, 1.45, {
    fontSize: 34, bold: true, color: C.white, breakLine: true, valign: 'top',
  });
  addText(slide, 'Transforme conhecimento e relacionamento em receita, escala e impacto.', 0.9, 3.68, 5.65, 0.76, {
    fontSize: 18, color: 'C8D8FF', breakLine: true,
  });
  addText(slide, 'AFILIE  •  ENSINE  •  ATENDA EMPRESAS  •  LIDERE PROGRAMAS', 0.9, 5.15, 6.15, 0.3, {
    fontSize: 9.5, bold: true, color: C.cyan, charSpacing: 1.1,
  });
  addText(slide, 'Israel Cavalcanti de Souza  |  Plataforma LBW', 0.9, 6.42, 5.8, 0.28, {
    fontSize: 10.5, color: '8FB7FF',
  });
  addCard(slide, 8.22, 0.72, 3.82, 5.93, { fill: C.white, line: C.cyan, lineWidth: 1.6 });
  slide.addImage({ path: imgIsrael, x: 8.35, y: 0.85, w: 3.56, h: 4.75 });
  slide.addShape(pptx.ShapeType.rect, { x: 8.35, y: 5.58, w: 3.56, h: 0.94, fill: { color: C.blue }, line: { color: C.blue } });
  addText(slide, 'APRENDA  →  ANALISE  →  APLIQUE', 8.56, 5.76, 3.15, 0.28, { fontSize: 11.2, bold: true, color: C.white, align: 'center' });
  addText(slide, 'Uma plataforma para ensinar, analisar e conduzir melhorias reais.', 8.57, 6.08, 3.12, 0.3, { fontSize: 8.8, color: 'D7E6FF', align: 'center' });
}

// Slide 2 — quatro caminhos
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Visão geral', 'Uma plataforma. Quatro formas de crescer.', 'Comece pelo modelo mais simples e evolua sem trocar de tecnologia, método ou ambiente.');
  const cards = [
    { n: 1, title: 'Afiliado\ndo Israel', body: 'Indique soluções prontas e receba comissão pelas vendas.', y: 3.74, c: C.blue },
    { n: 2, title: 'Sua academia\nna LBW', body: 'Venda seus cursos e gerencie seus próprios alunos.', y: 3.15, c: '286CE8' },
    { n: 3, title: 'Consultoria\npara empresas', body: 'Crie ambientes separados e coordene cada cliente.', y: 2.56, c: '168DBB' },
    { n: 4, title: 'Parceiro\nestratégico', body: 'Implemente um programa de excelência operacional.', y: 1.97, c: C.green },
  ];
  cards.forEach((card, idx) => {
    const x = 0.65 + idx * 3.17;
    addCard(slide, x, card.y, 2.65, 2.35, { fill: C.white, line: card.c, lineWidth: 1.4 });
    addIconCircle(slide, String(card.n), x + 0.18, card.y + 0.18, card.c, 0.52, 13);
    addText(slide, card.title, x + 0.82, card.y + 0.16, 1.62, 0.65, { fontSize: 16.5, bold: true, color: C.navy, breakLine: true });
    addText(slide, card.body, x + 0.22, card.y + 1.03, 2.18, 0.82, { fontSize: 11.2, color: C.muted, valign: 'top', breakLine: true });
    addText(slide, idx === 0 ? 'ENTRADA RÁPIDA' : idx === 1 ? 'PRODUTO PRÓPRIO' : idx === 2 ? 'RECEITA RECORRENTE' : 'MAIOR IMPACTO', x + 0.22, card.y + 1.97, 2.16, 0.22, { fontSize: 8.4, bold: true, color: card.c, charSpacing: 1.0 });
    if (idx < cards.length - 1) addChevron(slide, x + 2.72, card.y + 0.7, 0.28, 0.48, card.c);
  });
  addText(slide, 'A evolução aumenta o controle sobre a oferta, a recorrência da receita e o valor entregue ao cliente.', 0.92, 6.46, 11.5, 0.35, { fontSize: 12, bold: true, color: C.navy, align: 'center' });
}

// Slide 3 — recursos
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'O que sustenta a parceria', 'Um ecossistema completo para entregar valor', 'Conteúdo, aplicação, tecnologia e gestão conectados no mesmo ambiente.');
  const resources = [
    ['▶', 'Videoaulas e conteúdo', 'Cursos, exercícios, avaliações e certificação.'],
    ['PJT', 'Projetos com templates', 'Modelos prontos para conduzir melhorias reais.'],
    ['Σ', 'Análises estatísticas', 'Gráficos, testes, capabilidade, CEP, MSA e predição.'],
    ['IA', 'IA contextual', 'Explica ferramentas e interpreta a última análise realizada.'],
    ['PPT', 'Relatórios e PowerPoint', 'Entregáveis profissionais gerados a partir do trabalho.'],
    ['EMP', 'Empresas independentes', 'Acessos, coordenadores, equipes e relatórios separados.'],
    ['COM', 'Comunidade flexível', 'Comunidade coletiva da LBW ou ambiente individual por cliente.'],
  ];
  resources.forEach((r, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.58 + col * 3.67;
    const y = 1.95 + row * 1.18;
    addCard(slide, x, y, 3.35, 0.98, { fill: C.white, line: 'D6E1F2', shadow: false });
    addIconCircle(slide, r[0], x + 0.17, y + 0.18, idx % 3 === 0 ? C.blue : idx % 3 === 1 ? '168DBB' : C.green, 0.6, r[0].length > 2 ? 8 : 14);
    addText(slide, r[1], x + 0.91, y + 0.14, 2.18, 0.3, { fontSize: 12.3, bold: true, color: C.navy });
    addText(slide, r[2], x + 0.91, y + 0.49, 2.23, 0.34, { fontSize: 8.9, color: C.muted, valign: 'top', breakLine: true });
  });
  addImageFrame(slide, imgSoftware, 8.42, 1.92, 4.22, 4.22, { frameLine: C.blue, lineWidth: 1.5 });
  addPill(slide, 'Tudo conectado ao aluno, projeto, empresa e consultor', 8.33, 6.38, 4.4, C.blue, C.paleBlue);
}

// Slide 4 — afiliado
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Modelo 1', 'Afiliado do Israel Consultor', 'A forma mais rápida de começar: você recomenda soluções prontas e monetiza sua rede.');
  addPill(slide, 'Baixo esforço de entrada', 0.62, 1.88, 2.45, C.green, C.paleGreen);
  const flow = [
    ['1', 'Sua rede', 'Profissionais e empresas que confiam em você'],
    ['2', 'Recomendação', 'Conteúdo, curso ou pacote adequado à necessidade'],
    ['3', 'Compra', 'Checkout, acesso e entrega pela estrutura LBW'],
    ['4', 'Comissão', 'Remuneração conforme as regras do programa'],
  ];
  flow.forEach((f, idx) => {
    const x = 0.62 + idx * 3.12;
    addCard(slide, x, 2.48, 2.62, 1.62, { fill: idx === 3 ? C.paleGreen : C.white, line: idx === 3 ? C.green : C.line });
    addIconCircle(slide, f[0], x + 0.18, 2.68, idx === 3 ? C.green : C.blue, 0.52, 13);
    addText(slide, f[1], x + 0.82, 2.65, 1.5, 0.34, { fontSize: 15, bold: true, color: C.navy });
    addText(slide, f[2], x + 0.2, 3.2, 2.18, 0.58, { fontSize: 9.4, color: C.muted, align: 'center', breakLine: true });
    if (idx < flow.length - 1) addChevron(slide, x + 2.72, 2.99, 0.28, 0.44, C.blue);
  });
  addCard(slide, 0.62, 4.58, 5.93, 1.48, { fill: C.navy, line: C.navy });
  addText(slide, 'O que você ganha', 0.88, 4.82, 2.2, 0.32, { fontSize: 16, bold: true, color: C.white });
  addText(slide, '• Receita sem criar curso ou software\n• Entrada rápida e risco operacional reduzido\n• Aprendizado sobre as demandas do mercado', 0.88, 5.2, 5.0, 0.7, { fontSize: 11.1, color: 'D6E4FF', breakLine: true, valign: 'top' });
  addCard(slide, 6.8, 4.58, 5.9, 1.48, { fill: C.white, line: C.blue });
  addText(slide, 'Ideal para', 7.08, 4.82, 1.45, 0.32, { fontSize: 16, bold: true, color: C.navy });
  addText(slide, 'Quem tem relacionamento, audiência ou acesso a empresas e quer começar a gerar receita imediatamente.', 7.08, 5.2, 5.15, 0.62, { fontSize: 11.5, color: C.muted, breakLine: true, valign: 'top' });
}

// Slide 5 — academia própria
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Modelo 2', 'Seus cursos. Seus alunos. Sua operação na LBW.', 'O consultor transforma conhecimento próprio em uma oferta digital pronta para vender e acompanhar.');
  addImageFrame(slide, imgPlataforma, 0.62, 1.9, 4.52, 4.52, { frameLine: C.blue, lineWidth: 1.5 });
  addCard(slide, 5.55, 1.9, 3.25, 4.52, { fill: C.white, line: C.line });
  addPill(slide, 'O que você controla', 5.82, 2.15, 2.68, C.blue, C.paleBlue);
  addBulletList(slide, [
    'Cursos, vídeos e materiais próprios',
    'Preço, oferta, acesso e expiração',
    'Captação e relacionamento com alunos',
    'Marca e posicionamento profissional',
    'Acompanhamento da evolução do aluno',
  ], 5.82, 2.73, 2.62, 2.85, { fontSize: 12.1, paraSpaceAfterPt: 12 });
  addCard(slide, 9.15, 1.9, 3.55, 4.52, { fill: C.navy, line: C.navy });
  addPill(slide, 'Principais benefícios', 9.43, 2.15, 2.98, C.cyan, '10345C');
  addText(slide, 'PRODUTO PRÓPRIO', 9.45, 2.89, 2.92, 0.32, { fontSize: 14.2, bold: true, color: C.white, align: 'center' });
  addText(slide, 'Sem precisar desenvolver uma plataforma do zero.', 9.48, 3.26, 2.85, 0.48, { fontSize: 10.5, color: 'C8D8FF', align: 'center', breakLine: true });
  slide.addShape(pptx.ShapeType.line, { x: 9.55, y: 3.91, w: 2.65, h: 0, line: { color: '36578D', width: 1 } });
  addText(slide, 'RECEITA DIRETA', 9.45, 4.18, 2.92, 0.32, { fontSize: 14.2, bold: true, color: C.white, align: 'center' });
  addText(slide, 'Venda seus cursos e crie novas ofertas para a mesma base.', 9.48, 4.55, 2.85, 0.5, { fontSize: 10.5, color: 'C8D8FF', align: 'center', breakLine: true });
  slide.addShape(pptx.ShapeType.line, { x: 9.55, y: 5.22, w: 2.65, h: 0, line: { color: '36578D', width: 1 } });
  addText(slide, 'ESCALA', 9.45, 5.46, 2.92, 0.32, { fontSize: 14.2, bold: true, color: C.white, align: 'center' });
  addText(slide, 'Atenda mais alunos com uma operação organizada.', 9.48, 5.82, 2.85, 0.4, { fontSize: 10.5, color: 'C8D8FF', align: 'center', breakLine: true });
}

// Slide 6 — empresas
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Modelo 3', 'Consultoria para uma carteira de empresas', 'Cada empresa possui seu ambiente, coordenador, equipe, acessos e indicadores — sem misturar dados.');
  addCard(slide, 0.65, 2.08, 2.42, 3.72, { fill: C.navy, line: C.navy });
  addIconCircle(slide, 'C', 1.49, 2.4, C.blue, 0.72, 20);
  addText(slide, 'CONSULTOR', 0.91, 3.35, 1.9, 0.35, { fontSize: 17, bold: true, color: C.white, align: 'center' });
  addText(slide, 'Prospecta, estrutura a oferta, acompanha os coordenadores e entrega consultoria.', 0.94, 3.9, 1.83, 1.08, { fontSize: 10.5, color: 'C8D8FF', align: 'center', breakLine: true, valign: 'top' });
  addText(slide, 'PAINEL ÚNICO', 0.94, 5.28, 1.83, 0.25, { fontSize: 9, bold: true, color: C.cyan, align: 'center', charSpacing: 1.1 });
  addChevron(slide, 3.22, 3.65, 0.42, 0.7, C.blue);
  const companies = [
    { x: 3.92, y: 1.95, name: 'EMPRESA A', coord: 'Coordenador A', color: C.blue },
    { x: 7.02, y: 1.95, name: 'EMPRESA B', coord: 'Coordenador B', color: '168DBB' },
    { x: 10.12, y: 1.95, name: 'EMPRESA C', coord: 'Coordenador C', color: C.green },
  ];
  companies.forEach((co) => {
    addCard(slide, co.x, co.y, 2.57, 3.98, { fill: C.white, line: co.color, lineWidth: 1.4 });
    addPill(slide, co.name, co.x + 0.22, co.y + 0.22, 2.13, co.color, co.color === C.green ? C.paleGreen : C.paleBlue);
    addText(slide, co.coord, co.x + 0.24, co.y + 0.8, 2.08, 0.32, { fontSize: 13.2, bold: true, color: C.navy, align: 'center' });
    const rows = ['Equipe e acessos', 'Cursos e projetos', 'Análises e IA', 'Relatórios', 'Comunidade privada'];
    rows.forEach((row, idx) => {
      addIconCircle(slide, '✓', co.x + 0.28, co.y + 1.35 + idx * 0.48, co.color, 0.28, 9);
      addText(slide, row, co.x + 0.68, co.y + 1.31 + idx * 0.48, 1.5, 0.32, { fontSize: 9.8, color: C.muted });
    });
    addText(slide, 'DADOS SEPARADOS', co.x + 0.35, co.y + 3.55, 1.86, 0.22, { fontSize: 8.2, bold: true, color: co.color, align: 'center', charSpacing: 1.0 });
  });
  addText(slide, 'Resultado: contratos recorrentes, visão consolidada da carteira e operação escalável.', 0.85, 6.4, 11.75, 0.35, { fontSize: 12.2, bold: true, color: C.navy, align: 'center' });
}

// Slide 7 — parceria estratégica
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Modelo 4', 'Parceria estratégica para Excelência Operacional', 'Consultor, LBW e Israel atuam juntos para implantar e sustentar um programa corporativo de melhoria contínua.');
  const roleY = 2.05;
  const roles = [
    { x: 0.65, title: 'CONSULTOR', body: 'Relacionamento local\nFacilitação\nGovernança com o cliente', c: C.blue },
    { x: 4.0, title: 'PLATAFORMA LBW', body: 'Tecnologia e método\nDados e relatórios\nEscala operacional', c: '168DBB' },
    { x: 7.35, title: 'ISRAEL', body: 'Suporte técnico\nArquitetura do programa\nMentoria gerencial', c: C.green },
  ];
  roles.forEach((r, idx) => {
    addCard(slide, r.x, roleY, 2.8, 2.15, { fill: C.white, line: r.c, lineWidth: 1.4 });
    addIconCircle(slide, idx === 0 ? 'C' : idx === 1 ? 'LBW' : 'I', r.x + 1.05, roleY + 0.22, r.c, 0.7, idx === 1 ? 8 : 17);
    addText(slide, r.title, r.x + 0.24, roleY + 1.0, 2.32, 0.3, { fontSize: 13.5, bold: true, color: C.navy, align: 'center' });
    addText(slide, r.body, r.x + 0.28, roleY + 1.35, 2.24, 0.62, { fontSize: 9.8, color: C.muted, align: 'center', breakLine: true, valign: 'top' });
    if (idx < roles.length - 1) addChevron(slide, r.x + 2.94, roleY + 0.82, 0.32, 0.5, r.c);
  });
  addCard(slide, 10.7, 2.05, 1.95, 2.15, { fill: C.navy, line: C.navy });
  addText(slide, 'EMPRESA', 10.93, 2.39, 1.5, 0.36, { fontSize: 16, bold: true, color: C.white, align: 'center' });
  addText(slide, 'Programa de\nExcelência\nOperacional', 10.95, 2.96, 1.45, 0.88, { fontSize: 13.2, bold: true, color: C.cyan, align: 'center', breakLine: true });
  addPill(slide, 'Jornada de implantação', 0.65, 4.67, 2.55, C.blue, C.paleBlue);
  const journey = ['Diagnosticar', 'Priorizar', 'Capacitar', 'Executar', 'Governar', 'Escalar'];
  journey.forEach((j, idx) => {
    const x = 0.65 + idx * 2.03;
    addCard(slide, x, 5.25, 1.65, 0.82, { fill: idx === 5 ? C.paleGreen : C.white, line: idx === 5 ? C.green : C.line, shadow: false });
    addText(slide, `${idx + 1}`, x + 0.12, 5.45, 0.28, 0.28, { fontSize: 11, bold: true, color: idx === 5 ? C.green : C.blue, align: 'center' });
    addText(slide, j, x + 0.43, 5.4, 1.05, 0.34, { fontSize: 10.5, bold: true, color: C.navy, align: 'center' });
    if (idx < journey.length - 1) addChevron(slide, x + 1.72, 5.44, 0.22, 0.34, C.blue);
  });
  addText(slide, 'Maior ticket, maior impacto e suporte compartilhado para reduzir o risco de implantação.', 0.92, 6.43, 11.5, 0.34, { fontSize: 12.2, bold: true, color: C.navy, align: 'center' });
}

// Slide 8 — monetização
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Modelo de negócio', 'Como o consultor pode ganhar dinheiro com a LBW', 'As receitas podem ser pontuais, recorrentes ou combinadas — conforme o modelo de atuação.');
  const rev = [
    { n: '01', title: 'Comissões', body: 'Indicação e venda de produtos do Israel Consultor.', tag: 'AFILIADO', c: C.blue },
    { n: '02', title: 'Cursos próprios', body: 'Venda direta de treinamentos para sua audiência.', tag: 'ACADEMIA', c: '286CE8' },
    { n: '03', title: 'Contratos empresariais', body: 'Licença, gestão da plataforma, treinamento e consultoria.', tag: 'RECORRÊNCIA', c: '168DBB' },
    { n: '04', title: 'Programa de excelência', body: 'Implantação, governança, mentoria e evolução do programa.', tag: 'PARCERIA', c: C.green },
  ];
  rev.forEach((r, idx) => {
    const x = 0.62 + idx * 3.15;
    addCard(slide, x, 2.0, 2.7, 3.58, { fill: idx === 3 ? C.navy : C.white, line: r.c, lineWidth: 1.4 });
    addText(slide, r.n, x + 0.22, 2.22, 0.75, 0.45, { fontSize: 25, bold: true, color: idx === 3 ? C.cyan : r.c });
    addText(slide, r.title, x + 0.22, 2.98, 2.22, 0.48, { fontSize: 17, bold: true, color: idx === 3 ? C.white : C.navy, breakLine: true });
    addText(slide, r.body, x + 0.22, 3.66, 2.22, 1.15, { fontSize: 11.4, color: idx === 3 ? 'C8D8FF' : C.muted, valign: 'top', breakLine: true });
    addPill(slide, r.tag, x + 0.22, 5.0, 2.22, idx === 3 ? C.cyan : r.c, idx === 3 ? '10345C' : C.paleBlue);
  });
  addCard(slide, 1.15, 6.05, 11.02, 0.68, { fill: C.paleGreen, line: 'B8E8D8', shadow: false });
  addText(slide, 'Estratégia recomendada: combinar receita de entrada + serviços recorrentes + projetos de maior valor.', 1.45, 6.2, 10.42, 0.34, { fontSize: 12.2, bold: true, color: '087A55', align: 'center' });
}

// Slide 9 — jornada do cliente
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Experiência do cliente', 'Da aprendizagem ao resultado — dentro da mesma plataforma', 'A LBW conecta o desenvolvimento das pessoas à execução e à governança das melhorias.');
  const steps = [
    ['APRENDA', 'Vídeos, exercícios, avaliações e certificados'],
    ['ANALISE', 'Dados, gráficos, estatística e IA'],
    ['APLIQUE', 'Projetos guiados com templates prontos'],
    ['COMUNIQUE', 'Relatórios e apresentações PowerPoint'],
    ['GOVERNE', 'Coordenadores, acessos, empresas e indicadores'],
    ['ESCALE', 'Comunidade, portfólio e excelência operacional'],
  ];
  steps.forEach((s, idx) => {
    const x = 0.52 + idx * 2.13;
    const y = 2.14 + (idx % 2) * 0.34;
    addCard(slide, x, y, 1.82, 3.22, { fill: idx === 5 ? C.navy : C.white, line: idx === 5 ? C.green : C.line, lineWidth: idx === 5 ? 1.5 : 1 });
    addIconCircle(slide, String(idx + 1), x + 0.58, y + 0.28, idx === 5 ? C.green : C.blue, 0.66, 16);
    addText(slide, s[0], x + 0.15, y + 1.12, 1.52, 0.38, { fontSize: 12.4, bold: true, color: idx === 5 ? C.white : C.navy, align: 'center' });
    addText(slide, s[1], x + 0.17, y + 1.7, 1.48, 1.05, { fontSize: 9.6, color: idx === 5 ? 'C8D8FF' : C.muted, align: 'center', valign: 'top', breakLine: true });
    if (idx < steps.length - 1) addChevron(slide, x + 1.87, y + 1.28, 0.2, 0.38, idx === 4 ? C.green : C.blue);
  });
  addText(slide, 'O consultor deixa de vender apenas horas e passa a entregar uma experiência profissional completa.', 0.85, 6.32, 11.62, 0.4, { fontSize: 13, bold: true, color: C.navy, align: 'center' });
}

// Slide 10 — benefícios por público
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Proposta de valor', 'Benefícios para o consultor, o aluno e a empresa', 'A parceria funciona porque cada participante percebe valor de forma clara e mensurável.');
  const audiences = [
    { x: 0.62, title: 'PARA O CONSULTOR', icon: 'C', c: C.blue, items: ['Oferta profissional pronta', 'Mais escala e recorrência', 'Dados para acompanhar clientes', 'Novas fontes de receita', 'Suporte técnico e gerencial'] },
    { x: 4.47, title: 'PARA O ALUNO', icon: 'A', c: '168DBB', items: ['Aprender fazendo', 'IA para apoiar a aplicação', 'Projetos e análises reais', 'Entregáveis profissionais', 'Comunidade e certificação'] },
    { x: 8.32, title: 'PARA A EMPRESA', icon: 'E', c: C.green, items: ['Ambiente e dados separados', 'Coordenador responsável', 'Portfólio de melhorias', 'Relatórios e governança', 'Cultura de excelência operacional'] },
  ];
  audiences.forEach((a) => {
    addCard(slide, a.x, 1.95, 3.45, 4.63, { fill: C.white, line: a.c, lineWidth: 1.4 });
    addIconCircle(slide, a.icon, a.x + 1.35, 2.22, a.c, 0.76, 19);
    addText(slide, a.title, a.x + 0.3, 3.15, 2.85, 0.36, { fontSize: 14, bold: true, color: C.navy, align: 'center' });
    a.items.forEach((item, idx) => {
      addIconCircle(slide, '✓', a.x + 0.38, 3.84 + idx * 0.48, a.c, 0.28, 9);
      addText(slide, item, a.x + 0.8, 3.79 + idx * 0.48, 2.22, 0.34, { fontSize: 10.6, color: C.muted });
    });
  });
}

// Slide 11 — comparação
{
  const slide = pptx.addSlide('LBW_LIGHT');
  addTopTitle(slide, 'Escolha do modelo', 'Qual parceria combina com o seu momento?', 'Os modelos podem coexistir e a evolução pode acontecer gradualmente.');
  const headers = ['CRITÉRIO', 'AFILIADO', 'SUA ACADEMIA', 'EMPRESAS', 'PARCEIRO ESTRATÉGICO'];
  const headerColors = [C.navy, C.blue, '286CE8', '168DBB', C.green];
  const bodyRows = [
    ['Oferta principal', 'Produtos do Israel', 'Seus cursos', 'Plataforma + consultoria', 'Programa de Excelência Operacional'],
    ['Fonte de receita', 'Comissão', 'Venda de cursos', 'Contrato e recorrência', 'Implantação + governança + parceria'],
    ['Esforço inicial', 'Baixo', 'Médio', 'Alto', 'Compartilhado'],
    ['Potencial recorrente', 'Médio', 'Alto', 'Alto', 'Muito alto'],
    ['Ideal para', 'Começar rapidamente', 'Quem já ensina', 'Quem atende empresas', 'Quem quer liderar transformação'],
  ];
  const x0 = 0.55;
  const y0 = 1.95;
  const widths = [2.05, 2.18, 2.25, 2.35, 3.4];
  const rowHeights = [0.65, 0.72, 0.84, 0.62, 0.62, 0.78];
  let xCursor = x0;
  headers.forEach((header, col) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: xCursor, y: y0, w: widths[col], h: rowHeights[0],
      fill: { color: headerColors[col] },
      line: { color: C.white, width: 1 },
    });
    addText(slide, header, xCursor + 0.08, y0 + 0.08, widths[col] - 0.16, rowHeights[0] - 0.16, {
      fontSize: col === 4 ? 9.2 : 10.2, bold: true, color: C.white, align: col === 0 ? 'left' : 'center', breakLine: true,
    });
    xCursor += widths[col];
  });
  let yCursor = y0 + rowHeights[0];
  bodyRows.forEach((row, rowIdx) => {
    xCursor = x0;
    const rowH = rowHeights[rowIdx + 1];
    row.forEach((cell, col) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: xCursor, y: yCursor, w: widths[col], h: rowH,
        fill: { color: rowIdx % 2 === 0 ? C.white : 'F0F4FA' },
        line: { color: C.line, width: 0.8 },
      });
      addText(slide, cell, xCursor + 0.09, yCursor + 0.07, widths[col] - 0.18, rowH - 0.14, {
        fontSize: col === 4 ? 9.6 : 10.1,
        bold: col === 0,
        color: col === 0 ? C.navy : C.text,
        align: col === 0 ? 'left' : 'center',
        breakLine: true,
      });
      xCursor += widths[col];
    });
    yCursor += rowH;
  });
  addText(slide, 'As condições comerciais, responsabilidades e remuneração são definidas conforme o modelo escolhido.', 0.8, 6.55, 11.7, 0.28, { fontSize: 9.7, color: C.muted, italic: true, align: 'center' });
}

// Slide 12 — CTA
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape(pptx.ShapeType.arc, { x: 8.5, y: -1.3, w: 6, h: 6, adjustPoint: 0.2, rotate: 25, fill: { color: C.blue, transparency: 50 }, line: { color: C.blue, transparency: 100 } });
  addText(slide, 'PRÓXIMO PASSO', 0.72, 0.58, 2.6, 0.25, { fontSize: 9.5, bold: true, color: C.cyan, charSpacing: 2.5 });
  addText(slide, 'Qual parceria combina\ncom o seu momento?', 0.72, 1.02, 8.6, 1.18, { fontSize: 32, bold: true, color: C.white, breakLine: true, valign: 'top' });
  const choices = [
    ['1', 'Começar como afiliado'],
    ['2', 'Vender meus cursos'],
    ['3', 'Atender minhas empresas'],
    ['4', 'Construir uma parceria estratégica'],
  ];
  choices.forEach((choice, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.72 + col * 4.72;
    const y = 2.68 + row * 1.05;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 4.35, h: 0.78, fill: { color: idx === 3 ? '0A4C49' : C.navy2 }, line: { color: idx === 3 ? C.green : '36578D', width: 1.2 } });
    addIconCircle(slide, choice[0], x + 0.16, y + 0.13, idx === 3 ? C.green : C.blue, 0.52, 13);
    addText(slide, choice[1], x + 0.84, y + 0.13, 3.2, 0.5, { fontSize: 12.5, bold: true, color: C.white });
  });
  addCard(slide, 9.8, 1.12, 2.72, 4.78, { fill: C.white, line: C.cyan, lineWidth: 1.5 });
  addText(slide, 'DEMONSTRAÇÃO\nDA PLATAFORMA', 9.96, 1.52, 2.4, 0.8, { fontSize: 15.5, bold: true, color: C.navy, align: 'center', breakLine: true });
  addText(slide, 'Diagnóstico da oportunidade\n+\nEscolha do modelo\n+\nPróximos passos', 10.08, 2.65, 2.16, 1.85, { fontSize: 13.2, color: C.muted, align: 'center', breakLine: true, valign: 'top' });
  slide.addShape(pptx.ShapeType.roundRect, { x: 10.14, y: 4.93, w: 2.02, h: 0.62, fill: { color: C.blue }, line: { color: C.blue }, hyperlink: { url: 'https://israel.educacaopelotrabalho.com/plataformalbw' } });
  addText(slide, 'CONHECER A LBW', 10.28, 5.06, 1.74, 0.3, { fontSize: 10.2, bold: true, color: C.white, align: 'center', hyperlink: { url: 'https://israel.educacaopelotrabalho.com/plataformalbw' } });
  addText(slide, 'Israel Cavalcanti de Souza', 0.72, 5.45, 4.5, 0.36, { fontSize: 18, bold: true, color: C.white });
  addText(slide, 'LBW — Learning by Working', 0.72, 5.89, 4.5, 0.28, { fontSize: 11, color: 'AFC6F3' });
  addText(slide, 'israel.educacaopelotrabalho.com/plataformalbw', 0.72, 6.48, 6.55, 0.28, { fontSize: 10.5, color: C.cyan, hyperlink: { url: 'https://israel.educacaopelotrabalho.com/plataformalbw' } });
  addText(slide, 'Aprender. Analisar. Aplicar. Escalar.', 7.0, 6.43, 5.48, 0.38, { fontSize: 14, bold: true, color: C.white, align: 'right' });
}

fs.mkdirSync(outputDir, { recursive: true });
pptx.writeFile({ fileName: outputFile })
  .then(() => console.log(outputFile))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
