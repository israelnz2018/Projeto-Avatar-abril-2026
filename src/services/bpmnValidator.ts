/**
 * Validador de BPMN 2.0 — porte fiel de `scripts/validar-bpmn.py` do Kit Mapeando na
 * Pratica, rodando no navegador via DOMParser em vez de ElementTree.
 *
 * Checa a estrutura minima E a camada grafica. A camada grafica importa tanto quanto a
 * logica: sem ela o modelador abre o arquivo com os elementos empilhados, sem desenho.
 */

const NS = {
  bpmn: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
  bpmndi: 'http://www.omg.org/spec/BPMN/20100524/DI',
  dc: 'http://www.omg.org/spec/DD/20100524/DC',
  di: 'http://www.omg.org/spec/DD/20100524/DI',
};

/** Tags que contam como no de fluxo — precisam de conexao e de BPMNShape. */
const FLOW_NODE_TAGS = [
  'startEvent', 'endEvent', 'task', 'userTask', 'serviceTask', 'manualTask',
  'exclusiveGateway', 'parallelGateway', 'inclusiveGateway',
  'intermediateCatchEvent', 'intermediateThrowEvent', 'subProcess',
];

export interface BpmnValidationResult {
  aprovado: boolean;
  erros: string[];
  avisos: string[];
  totalNos: number;
  totalFluxos: number;
}

const nome = (el: Element) => el.getAttribute('name') || '';
const id = (el: Element) => el.getAttribute('id') || '[sem ID]';

/** Rotulo amigavel de um elemento, pro consultor achar o problema no desenho. */
const rotulo = (el: Element | undefined | null, fallback: string) => {
  if (!el) return fallback;
  const n = nome(el);
  return n ? `"${n}"` : id(el);
};

export const validarBpmn = (xml: string): BpmnValidationResult => {
  const erros: string[] = [];
  const avisos: string[] = [];

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const falhaParse = doc.querySelector('parsererror');
  if (falhaParse) {
    return {
      aprovado: false,
      erros: ['Nao foi possivel ler o XML do diagrama.'],
      avisos: [],
      totalNos: 0,
      totalFluxos: 0,
    };
  }

  const root = doc.documentElement;
  if (root.localName !== 'definitions' || root.namespaceURI !== NS.bpmn) {
    erros.push('O elemento raiz deve ser bpmn:definitions.');
  }

  const todos = Array.from(doc.getElementsByTagName('*'));

  // IDs duplicados quebram a importacao em qualquer modelador.
  const vistos = new Set<string>();
  const duplicados = new Set<string>();
  for (const el of todos) {
    const elId = el.getAttribute('id');
    if (!elId) continue;
    if (vistos.has(elId)) duplicados.add(elId);
    vistos.add(elId);
  }
  if (duplicados.size > 0) {
    erros.push(`IDs duplicados: ${[...duplicados].sort().join(', ')}.`);
  }

  const porTag = (tag: string) => Array.from(doc.getElementsByTagNameNS(NS.bpmn, tag));

  if (porTag('process').length === 0) erros.push('Nenhum processo encontrado no diagrama.');
  if (porTag('startEvent').length === 0) erros.push('O processo nao tem evento inicial — todo fluxo precisa de um comeco.');
  if (porTag('endEvent').length === 0) erros.push('O processo nao tem evento final — todo fluxo precisa de um fim.');

  const nosDeFluxo = new Map<string, Element>();
  for (const tag of FLOW_NODE_TAGS) {
    for (const el of porTag(tag)) {
      const elId = el.getAttribute('id');
      if (elId) nosDeFluxo.set(elId, el);
    }
  }

  const fluxos = porTag('sequenceFlow');
  const conectados = new Set<string>();
  for (const fluxo of fluxos) {
    const origem = fluxo.getAttribute('sourceRef');
    const destino = fluxo.getAttribute('targetRef');
    if (!origem || !nosDeFluxo.has(origem)) {
      erros.push(`Seta ${id(fluxo)} sai de um elemento que nao existe.`);
    } else {
      conectados.add(origem);
    }
    if (!destino || !nosDeFluxo.has(destino)) {
      erros.push(`Seta ${id(fluxo)} aponta para um elemento que nao existe.`);
    } else {
      conectados.add(destino);
    }
  }

  // Quem esta ligado apenas por linha TRACEJADA (fluxo de mensagem ou associacao).
  //
  // Isso separa dois problemas que antes viravam a mesma mensagem confusa: o
  // elemento realmente esquecido no canto e o elemento que TEM linha na tela, mas
  // uma linha que nao define ordem de execucao. O segundo caso acontece quando o
  // aluno cria duas PISCINAS e liga uma na outra: o bpmn-js gera messageFlow, nao
  // sequenceFlow. Dizer "sem nenhuma conexao" ali contradiz o que ele esta vendo.
  const ligadosPorTracejada = new Set<string>();
  for (const tag of ['messageFlow', 'association']) {
    for (const conexao of porTag(tag)) {
      for (const attr of ['sourceRef', 'targetRef']) {
        const ref = conexao.getAttribute(attr);
        if (ref) ligadosPorTracejada.add(ref);
      }
    }
  }

  for (const noId of [...nosDeFluxo.keys()].sort()) {
    if (conectados.has(noId)) continue;
    const nome = rotulo(nosDeFluxo.get(noId), noId);
    if (ligadosPorTracejada.has(noId)) {
      erros.push(
        `${nome} esta ligado so por linha TRACEJADA (fluxo de mensagem), que nao define a ordem do processo. ` +
        'Linha tracejada e so pra conversa entre piscinas diferentes. Se as areas sao da mesma empresa, ' +
        'use RAIAS dentro da MESMA piscina — assim as setas saem solidas e o fluxo passa a existir.'
      );
    } else {
      erros.push(`Elemento solto, sem nenhuma conexao: ${nome}.`);
    }
  }

  // Duas piscinas com fluxo de mensagem entre elas e valido em BPMN, mas quase
  // sempre e engano de quem queria duas AREAS da mesma empresa. Aviso, nao erro.
  const piscinas = porTag('participant');
  if (piscinas.length > 1 && porTag('messageFlow').length > 0) {
    avisos.push(
      `O diagrama tem ${piscinas.length} piscinas conversando por fluxo de mensagem. ` +
      'Isso so se justifica entre participantes independentes (ex.: sua empresa e o cliente). ' +
      'Areas internas da mesma empresa devem ser RAIAS dentro de uma piscina so.'
    );
  }

  // Camada grafica (BPMN DI) — e o que faz o arquivo abrir ja desenhado.
  const planes = Array.from(doc.getElementsByTagNameNS(NS.bpmndi, 'BPMNPlane'));
  const shapeIds = new Set<string>();
  const edgeIds = new Set<string>();

  if (planes.length === 0) {
    erros.push('Camada grafica ausente — o arquivo abriria sem desenho no modelador.');
  } else {
    const plane = planes[0];
    for (const shape of Array.from(plane.getElementsByTagNameNS(NS.bpmndi, 'BPMNShape'))) {
      const ref = shape.getAttribute('bpmnElement');
      if (ref) shapeIds.add(ref);
      if (shape.getElementsByTagNameNS(NS.dc, 'Bounds').length === 0) {
        erros.push(`Elemento sem posicao no desenho: ${id(shape)}.`);
      }
    }
    for (const edge of Array.from(plane.getElementsByTagNameNS(NS.bpmndi, 'BPMNEdge'))) {
      const ref = edge.getAttribute('bpmnElement');
      if (ref) edgeIds.add(ref);
      if (edge.getElementsByTagNameNS(NS.di, 'waypoint').length < 2) {
        erros.push(`Seta com menos de dois pontos no desenho: ${id(edge)}.`);
      }
    }

    for (const noId of [...nosDeFluxo.keys()].sort()) {
      if (!shapeIds.has(noId)) {
        erros.push(`Elemento existe na logica mas nao no desenho: ${rotulo(nosDeFluxo.get(noId), noId)}.`);
      }
    }
    for (const fluxo of fluxos) {
      const fluxoId = fluxo.getAttribute('id');
      if (fluxoId && !edgeIds.has(fluxoId)) {
        erros.push(`Seta existe na logica mas nao no desenho: ${fluxoId}.`);
      }
    }
  }

  // Regras de modelagem do kit para decisoes.
  for (const gateway of porTag('exclusiveGateway')) {
    const gwId = gateway.getAttribute('id');
    const saidas = fluxos.filter((f) => f.getAttribute('sourceRef') === gwId);
    if (saidas.length < 2) {
      erros.push(`Decisao ${rotulo(gateway, gwId || '')} tem menos de duas saidas — decisao precisa de pelo menos dois caminhos.`);
    }
    for (const saida of saidas) {
      if (!nome(saida)) {
        avisos.push(`Saida de decisao sem nome em ${rotulo(gateway, gwId || '')} — nomeie com "Sim", "Nao", "Aprovado" etc.`);
      }
    }
    if (!nome(gateway)) {
      avisos.push(`Decisao ${gwId} sem pergunta — nomeie como uma pergunta objetiva.`);
    }
  }

  // Nomenclatura: atividade e "verbo no infinitivo + objeto".
  for (const tag of ['task', 'userTask', 'serviceTask', 'manualTask', 'subProcess']) {
    for (const atividade of porTag(tag)) {
      if (!nome(atividade)) {
        avisos.push(`Atividade ${id(atividade)} sem nome — use "verbo no infinitivo + objeto".`);
      }
    }
  }

  return {
    aprovado: erros.length === 0,
    erros,
    avisos,
    totalNos: nosDeFluxo.size,
    totalFluxos: fluxos.length,
  };
};
