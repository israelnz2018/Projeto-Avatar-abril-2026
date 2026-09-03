/**
 * Converte o SIPOC nos dois mapas de processo — o simples e o BPMN.
 *
 * Segue a tabela "Do SIPOC para o fluxograma" do Kit Mapeando na Pratica:
 *   entrada que dispara o processo  -> evento inicial
 *   etapas do processo              -> atividades, verbo no infinitivo + objeto
 *   saida aceita pelo cliente       -> evento final
 *
 * O kit e explicito em dizer que o SIPOC e a visao de alto nivel e o fluxograma exige
 * detalhamento adicional: decisoes, retornos e excecoes NAO sao inventados aqui. O que
 * sai e o esqueleto do caminho normal, na ordem do SIPOC, para o aluno detalhar em cima.
 */

interface SipocData {
  suppliers?: string[];
  inputs?: string[];
  process?: string[];
  outputs?: string[];
  customers?: string[];
}

const limpar = (v: any): string[] =>
  Array.isArray(v) ? v.map((s) => (s ?? '').toString().trim()).filter(Boolean) : [];

/** Escapa texto para caber dentro de um atributo XML. */
const xmlAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface EsqueletoSipoc {
  inicio: string;
  atividades: string[];
  fim: string;
}

/**
 * Extrai do SIPOC o que vira fluxo. Devolve null quando nao ha etapa de processo —
 * sem etapas nao existe fluxograma, e um mapa so com inicio e fim nao ajuda ninguem.
 */
export function esqueletoDoSipoc(raw: any): EsqueletoSipoc | null {
  const data: SipocData = raw?.toolData || raw || {};
  const atividades = limpar(data.process);
  if (atividades.length === 0) return null;

  const entradas = limpar(data.inputs);
  const saidas = limpar(data.outputs);

  return {
    inicio: entradas[0] || 'Processo iniciado',
    atividades,
    fim: saidas[0] || 'Processo concluído',
  };
}

/** Mapa de Processo simples (ReactFlow): inicio -> atividades em cadeia -> fim. */
export function sipocParaProcessMap(raw: any): { nodes: any[]; edges: any[] } | null {
  const esqueleto = esqueletoDoSipoc(raw);
  if (!esqueleto) return null;

  const LARGURA = 150;
  const ALTURA = 80;
  const PASSO_X = 210;
  const POR_LINHA = 5;   // quebra em linhas para nao sair uma fita infinita
  const PASSO_Y = 150;
  const X0 = 80;
  const Y0 = 80;

  const nodes: any[] = [];
  const edges: any[] = [];

  const posicao = (i: number) => ({
    x: X0 + (i % POR_LINHA) * PASSO_X,
    y: Y0 + Math.floor(i / POR_LINHA) * PASSO_Y,
  });

  const sequencia = [
    { tipo: 'start', texto: esqueleto.inicio },
    ...esqueleto.atividades.map((t) => ({ tipo: 'step', texto: t })),
    { tipo: 'end', texto: esqueleto.fim },
  ];

  sequencia.forEach((item, i) => {
    const id = crypto.randomUUID();
    nodes.push({
      id,
      type: item.tipo,
      position: posicao(i),
      data: { label: item.texto, isEnd: item.tipo === 'end', fontSize: 13 },
      style: { width: LARGURA, height: ALTURA },
    });
    if (i > 0) {
      edges.push({
        id: crypto.randomUUID(),
        source: nodes[i - 1].id,
        target: id,
        type: 'smoothstep',
      });
    }
  });

  return { nodes, edges };
}

/**
 * Mapa de Processo BPMN: gera BPMN 2.0 XML COM a camada grafica (BPMN DI).
 * Sem a camada grafica o arquivo abre sem desenho no Bizagi, que e justamente o que a
 * ferramenta existe para evitar — por isso cada no ganha BPMNShape com dc:Bounds e cada
 * seta ganha BPMNEdge com dois di:waypoint.
 */
export function sipocParaBpmn(raw: any, nomeProcesso = ''): string | null {
  const esqueleto = esqueletoDoSipoc(raw);
  if (!esqueleto) return null;

  const EVENTO = 36;
  const TAREFA_W = 120;
  const TAREFA_H = 80;
  const PASSO_X = 180;
  const Y_CENTRO = 180;
  const X0 = 160;

  // Cada no carrega id, rotulo e a geometria do desenho.
  type No = { id: string; tag: 'startEvent' | 'task' | 'endEvent'; nome: string; x: number; y: number; w: number; h: number };

  const nos: No[] = [];
  let x = X0;

  const empurrar = (tag: No['tag'], nome: string, w: number, h: number) => {
    nos.push({ id: `${tag}_${nos.length + 1}`, tag, nome, x, y: Y_CENTRO - h / 2, w, h });
    x += (tag === 'task' ? TAREFA_W : EVENTO) + (PASSO_X - (tag === 'task' ? TAREFA_W : EVENTO));
  };

  empurrar('startEvent', esqueleto.inicio, EVENTO, EVENTO);
  esqueleto.atividades.forEach((a) => empurrar('task', a, TAREFA_W, TAREFA_H));
  empurrar('endEvent', esqueleto.fim, EVENTO, EVENTO);

  const fluxos = nos.slice(0, -1).map((no, i) => ({
    id: `Flow_${i + 1}`,
    de: no,
    para: nos[i + 1],
  }));

  const largura = x + 120;
  const titulo = nomeProcesso.trim() || 'Processo';

  const elementos = nos
    .map((n) => `    <bpmn:${n.tag} id="${n.id}" name="${xmlAttr(n.nome)}" />`)
    .join('\n');

  const conexoes = fluxos
    .map((f) => `    <bpmn:sequenceFlow id="${f.id}" sourceRef="${f.de.id}" targetRef="${f.para.id}" />`)
    .join('\n');

  const shapes = nos
    .map(
      (n) => `      <bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}">
        <dc:Bounds x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" />
      </bpmndi:BPMNShape>`
    )
    .join('\n');

  const edges = fluxos
    .map((f) => {
      const x1 = f.de.x + f.de.w;
      const y1 = f.de.y + f.de.h / 2;
      const x2 = f.para.x;
      const y2 = f.para.y + f.para.h / 2;
      return `      <bpmndi:BPMNEdge id="${f.id}_di" bpmnElement="${f.id}">
        <di:waypoint x="${x1}" y="${y1}" />
        <di:waypoint x="${x2}" y="${y2}" />
      </bpmndi:BPMNEdge>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_SIPOC" targetNamespace="https://learningbyworking.com/bpmn" exporter="LBW — a partir do SIPOC" exporterVersion="1.0">
  <bpmn:process id="Process_SIPOC" name="${xmlAttr(titulo)}" isExecutable="false">
    <bpmn:documentation>Esqueleto gerado a partir do SIPOC. Detalhe decisões, retornos e exceções com base na observação do processo real.</bpmn:documentation>
${elementos}
${conexoes}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_SIPOC">
    <bpmndi:BPMNPlane id="BPMNPlane_SIPOC" bpmnElement="Process_SIPOC">
${shapes}
${edges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}
