/**
 * TODA ferramenta tem de caber no modelo do consultor, seja ele qual for.
 *
 * O consultor envia o próprio PPTX. Ele pode ter saído do PowerPoint (13,33 × 7,5),
 * do Google Slides (10 × 5,625) ou de um arquivo antigo em 4:3 (10 × 7,5) — e nada
 * garante que seja um desses três. Os exportadores desenham em polegadas do slide
 * da casa; quem encaixa no modelo é o slideEncaixado, aplicado pelo servidor.
 *
 * Este teste desenha TODAS as ferramentas em cada formato, medindo cada forma pelo
 * MESMO caminho da produção. É a rede que impede uma ferramenta nova de nascer
 * presa ao tamanho da casa.
 */
import test from 'node:test';
import assert from 'node:assert';
import { TOOL_HANDLERS } from '../pptToolHandlers.ts';
import { addCoverSlide } from '../coverSlide.ts';
import { SLIDE_DA_CASA, TOOL_AREA, setPptTemplateMode } from '../slideTemplate.ts';
import { calcularEncaixe, slideEncaixado } from '../slideEscalado.ts';

/** Os formatos que chegam na prática. */
const MODELOS = [
  { nome: 'Google Slides 16:9 (10 x 5,625)', largura: 10, altura: 5.625 },
  { nome: 'PowerPoint 16:9 (13,33 x 7,5)', largura: 13.33, altura: 7.5 },
  { nome: '4:3 antigo (10 x 7,5)', largura: 10, altura: 7.5 },
];

/** Meio milímetro de tolerância: arredondamento não conta como vazamento. */
const FOLGA = 0.02;

/** Um `pres` de mentira que só anota onde cada coisa foi desenhada. */
function espiao() {
  const formas: { tipo: string; x: number; y: number; w: number; h: number }[] = [];
  const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const anotar = (tipo: string) => (...args: any[]) => {
    const o = args[args.length - 1] || {};
    formas.push({ tipo, x: num(o.x), y: num(o.y), w: num(o.w), h: num(o.h) });
  };
  const slide: any = {
    addText: anotar('texto'),
    addShape: anotar('forma'),
    addImage: anotar('imagem'),
    addTable: anotar('tabela'),
    addChart: anotar('grafico'),
    addNotes: () => {},
    background: {},
  };
  return { formas, slide };
}

/** O MESMO encaixe que o servidor calcula ao montar no modelo do consultor. */
function encaixes(largura: number, altura: number) {
  const margem = 0.4;
  const topo = altura * 0.12;
  return {
    ferramenta: calcularEncaixe(TOOL_AREA, {
      x: margem,
      y: topo,
      w: Math.max(1, largura - margem * 2),
      h: Math.max(1, altura - topo - 0.35),
    }),
    capa: calcularEncaixe(
      { x: 0, y: 0, w: SLIDE_DA_CASA.w, h: SLIDE_DA_CASA.h },
      { x: 0, y: 0, w: largura, h: altura },
    ),
  };
}

function vazamentos(
  desenhar: (pres: any) => void,
  encaixe: any,
  modelo: { largura: number; altura: number },
) {
  const { formas, slide } = espiao();
  const encaixado = slideEncaixado(slide, encaixe);
  desenhar({ addSlide: () => encaixado, layout: '', defineLayout: () => {} });
  return formas.filter((f) => (
    f.x < -FOLGA
    || f.y < -FOLGA
    || f.x + f.w > modelo.largura + FOLGA
    || f.y + f.h > modelo.altura + FOLGA
  ));
}

/** Dados de exemplo para as ferramentas cujo desenho cresce com o conteúdo. */
const DADOS_DE_TESTE: Record<string, any> = {
  improvementIdea: {
    generatedProjects: [
      { title: 'Reduzir retrabalho na linha 2', nivel_projeto: 'Green Belt', priority_score: 92,
        what: 'Retrabalho de 12% das peças', howMuch: 'R$ 180 mil por ano',
        why: 'Custo alto e atraso na entrega', y_indicator: '% de retrabalho' },
      { title: 'Padronizar o atendimento', nivel_projeto: 'Yellow Belt', priority_score: 70 },
    ],
  },
};

for (const modelo of MODELOS) {
  test(`a capa cabe no modelo ${modelo.nome}`, () => {
    setPptTemplateMode(true);
    try {
      const fora = vazamentos(
        (pres) => addCoverSlide(pres, { name: 'Projeto de teste' } as any, 'Fulana de Tal'),
        encaixes(modelo.largura, modelo.altura).capa,
        modelo,
      );
      assert.deepEqual(fora, [], `a capa desenhou fora do slide: ${JSON.stringify(fora)}`);
    } finally {
      setPptTemplateMode(false);
    }
  });

  test(`as ${Object.keys(TOOL_HANDLERS).length} ferramentas cabem no modelo ${modelo.nome}`, () => {
    setPptTemplateMode(true);
    const encaixe = encaixes(modelo.largura, modelo.altura).ferramenta;
    const problemas: string[] = [];
    try {
      for (const toolId of Object.keys(TOOL_HANDLERS)) {
        const handler: any = (TOOL_HANDLERS as any)[toolId];
        const fora = vazamentos((pres) => {
          void handler.exporter(
            { name: 'Projeto de teste', id: 'p1' } as any,
            DADOS_DE_TESTE[toolId] || {},
            '',
            { ...(handler.exporterOptions || {}), pres },
          );
        }, encaixe, modelo);
        if (fora.length) problemas.push(`${toolId} (${fora.length} formas, ex.: ${JSON.stringify(fora[0])})`);
      }
    } finally {
      setPptTemplateMode(false);
    }
    assert.deepEqual(problemas, [], `desenharam fora do slide: ${problemas.join(' | ')}`);
  });
}
