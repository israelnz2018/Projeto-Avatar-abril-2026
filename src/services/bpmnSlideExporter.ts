import pptxgen from 'pptxgenjs';
import { Project } from '../types';
import { createSlide, THEME, TOOL_AREA } from './slideTemplate';
import { validarBpmn } from './bpmnValidator';

/**
 * Exporta o Mapa de Processo BPMN para PPT.
 *
 * O desafio aqui e a imagem: o pptxgenjs so aceita PNG em base64, e o bpmn-js produz
 * SVG. O caminho e renderizar o XML salvo num viewer invisivel, pegar o SVG e passar
 * por um canvas para virar PNG. Cada passo pode falhar (fonte que nao carrega, SVG
 * malformado, navegador que bloqueia o canvas), entao tudo esta dentro de try/catch:
 * se a imagem nao sair, o slide continua sendo gerado com a tabela de atividades e o
 * painel de validacao, e um aviso no lugar do desenho. Slide sem imagem e aceitavel;
 * exportacao que quebra no meio, nao.
 */

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

function unwrapToolData(input: any): any {
  if (!input || typeof input !== 'object') return {};
  if (input.toolData && typeof input.toolData === 'object') return input.toolData;
  return input;
}

const VERDE = '1E8449';
const VERDE_FUNDO = 'EAF6EE';
const VERMELHO = 'C0392B';
const VERMELHO_FUNDO = 'FCEDEC';
const CINZA_LINHA = 'D1D5DB';

const NS_BPMN = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

/** Renderiza o XML num container invisivel e devolve o SVG. */
async function xmlParaSvg(xml: string): Promise<string | null> {
  let container: HTMLDivElement | null = null;
  let viewer: any = null;
  try {
    // Import dinamico: o viewer so e baixado quando alguem exporta de fato.
    const { default: BpmnViewer } = await import('bpmn-js/lib/Viewer');

    container = document.createElement('div');
    // Fora da tela em vez de display:none — elemento sem layout renderiza com
    // dimensao zero e o SVG sai vazio.
    container.style.cssText = 'position:absolute;left:-10000px;top:0;width:1600px;height:900px;';
    document.body.appendChild(container);

    viewer = new BpmnViewer({ container });
    await viewer.importXML(xml);
    (viewer.get('canvas') as any).zoom('fit-viewport');

    const { svg } = await viewer.saveSVG();
    return svg || null;
  } catch (err) {
    console.error('BPMN: falha ao renderizar o diagrama para imagem.', err);
    return null;
  } finally {
    try { viewer?.destroy(); } catch { /* viewer ja pode ter caido */ }
    if (container?.parentNode) container.parentNode.removeChild(container);
  }
}

/** Converte o SVG em PNG base64 com o prefixo que o PPT exige. */
function svgParaPng(svg: string, larguraAlvo = 2200): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      const encerrar = (valor: string | null) => { URL.revokeObjectURL(url); resolve(valor); };

      img.onload = () => {
        try {
          const escala = img.width > 0 ? larguraAlvo / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));
          const ctx = canvas.getContext('2d');
          if (!ctx) return encerrar(null);
          // Fundo branco: PNG transparente fica cinza sobre o slide.
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          encerrar(dataUrl.startsWith('data:image/png;base64,') ? dataUrl : null);
        } catch (err) {
          console.error('BPMN: falha ao converter o SVG em PNG.', err);
          encerrar(null);
        }
      };
      img.onerror = () => encerrar(null);
      img.src = url;
    } catch (err) {
      console.error('BPMN: falha ao preparar a imagem.', err);
      resolve(null);
    }
  });
}

interface Elemento {
  nome: string;
  tipo: string;
  raia: string;
}

const TIPOS: Record<string, string> = {
  startEvent: 'Evento inicial',
  endEvent: 'Evento final',
  task: 'Atividade',
  userTask: 'Atividade (usuário)',
  serviceTask: 'Atividade (sistema)',
  manualTask: 'Atividade (manual)',
  exclusiveGateway: 'Decisão',
  parallelGateway: 'Paralelo',
  inclusiveGateway: 'Inclusivo',
  subProcess: 'Subprocesso',
  intermediateCatchEvent: 'Evento intermediário',
  intermediateThrowEvent: 'Evento intermediário',
};

/** Le o XML e devolve os elementos na ordem do documento, com a raia de cada um. */
function lerElementos(xml: string): { elementos: Elemento[]; raias: string[]; totalFluxos: number } {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return { elementos: [], raias: [], totalFluxos: 0 };

    // Mapeia no -> raia, para a tabela mostrar o responsavel.
    const raiaDoNo = new Map<string, string>();
    const raias: string[] = [];
    for (const lane of Array.from(doc.getElementsByTagNameNS(NS_BPMN, 'lane'))) {
      const nomeRaia = lane.getAttribute('name') || 'Sem nome';
      raias.push(nomeRaia);
      for (const ref of Array.from(lane.getElementsByTagNameNS(NS_BPMN, 'flowNodeRef'))) {
        const alvo = (ref.textContent || '').trim();
        if (alvo) raiaDoNo.set(alvo, nomeRaia);
      }
    }

    const elementos: Elemento[] = [];
    for (const tag of Object.keys(TIPOS)) {
      for (const el of Array.from(doc.getElementsByTagNameNS(NS_BPMN, tag))) {
        const elId = el.getAttribute('id') || '';
        elementos.push({
          nome: el.getAttribute('name') || '(sem nome)',
          tipo: TIPOS[tag],
          raia: raiaDoNo.get(elId) || '—',
        });
      }
    }

    const totalFluxos = doc.getElementsByTagNameNS(NS_BPMN, 'sequenceFlow').length;
    return { elementos, raias, totalFluxos };
  } catch (err) {
    console.error('BPMN: falha ao ler os elementos do diagrama.', err);
    return { elementos: [], raias: [], totalFluxos: 0 };
  }
}

export async function exportBpmnSlide(
  project: Project,
  toolData: any,
  aiAnalysis: string = '',
  options: { pres?: pptxgen } = {}
): Promise<void> {
  const today = new Date().toLocaleDateString('pt-BR');
  const data = unwrapToolData(toolData);

  const xml = typeof data.xml === 'string' ? data.xml : '';
  const nomeProcesso = (data.nomeProcesso || '').toString().trim();

  const pres = options.pres || new pptxgen();
  if (!options.pres) pres.layout = 'LAYOUT_WIDE';

  const TX = TOOL_AREA.x;
  const TY = TOOL_AREA.y;
  const TW = TOOL_AREA.w;
  const TH = TOOL_AREA.h;

  const slide = createSlide(pres, project, 'Mapa de Processo BPMN', 'Measure', aiAnalysis);

  if (!xml.trim()) {
    slide.addText('Nenhum diagrama BPMN registrado.', {
      x: TX, y: TY + TH / 2 - 0.20, w: TW, h: 0.40,
      fontFace: 'Calibri', fontSize: 11, color: THEME.MUTED, italic: true,
      align: 'center', valign: 'middle',
    });
    const vazio = `Mapa_BPMN_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
    if (!options.pres) await pres.writeFile({ fileName: vazio });
    return;
  }

  const { elementos, raias, totalFluxos } = lerElementos(xml);
  const validacao = validarBpmn(xml);
  const atividades = elementos.filter((e) => e.tipo.startsWith('Atividade') || e.tipo === 'Subprocesso');
  const decisoes = elementos.filter((e) => e.tipo === 'Decisão');

  // ---------- faixa de contexto ----------
  slide.addShape('rect', { x: TX, y: TY, w: TW, h: 0.44, fill: { color: THEME.LIGHT } });
  const contexto = [
    { rotulo: 'PROCESSO', valor: nomeProcesso || 'Não informado', x: TX + 0.12, w: TW * 0.45 },
    {
      rotulo: 'ELEMENTOS',
      valor: `${atividades.length} atividade(s) · ${decisoes.length} decisão(ões) · ${raias.length} raia(s) · ${totalFluxos} fluxo(s)`,
      x: TX + TW * 0.47, w: TW * 0.35,
    },
    { rotulo: 'VALIDAÇÃO', valor: validacao.aprovado ? 'APROVADO' : `${validacao.erros.length} problema(s)`, x: TX + TW * 0.84, w: TW * 0.15 },
  ];
  contexto.forEach((c, i) => {
    slide.addText(c.rotulo, {
      x: c.x, y: TY + 0.04, w: c.w, h: 0.16,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: THEME.MUTED, charSpacing: 1,
    });
    slide.addText(c.valor, {
      x: c.x, y: TY + 0.20, w: c.w, h: 0.20,
      fontFace: 'Calibri', fontSize: 10, bold: true, shrinkText: true,
      color: i === 2 ? (validacao.aprovado ? VERDE : VERMELHO) : THEME.INK,
    });
  });

  // ---------- diagrama ----------
  const yDiagrama = TY + 0.56;
  const hDiagrama = 2.70;
  slide.addText('DIAGRAMA DO PROCESSO', {
    x: TX, y: yDiagrama, w: TW, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED, charSpacing: 1,
  });

  const yImg = yDiagrama + 0.20;
  const hImg = hDiagrama - 0.20;
  slide.addShape('rect', { x: TX, y: yImg, w: TW, h: hImg, fill: { color: 'FFFFFF' }, line: { color: CINZA_LINHA, width: 0.5 } });

  const svg = await xmlParaSvg(xml);
  const png = svg ? await svgParaPng(svg) : null;

  if (png) {
    try {
      slide.addImage({ data: png, x: TX + 0.06, y: yImg + 0.06, w: TW - 0.12, h: hImg - 0.12, sizing: { type: 'contain', w: TW - 0.12, h: hImg - 0.12 } });
    } catch (err) {
      console.error('BPMN: falha ao inserir a imagem no slide.', err);
      slide.addText('Não foi possível inserir a imagem do diagrama.', {
        x: TX, y: yImg + hImg / 2 - 0.15, w: TW, h: 0.30,
        fontFace: 'Calibri', fontSize: 10, color: THEME.MUTED, italic: true, align: 'center',
      });
    }
  } else {
    // Fallback: sem imagem o slide segue valendo pela tabela e pela validação.
    slide.addText('Diagrama não pôde ser convertido em imagem. Use "Baixar imagem (SVG)" na ferramenta.', {
      x: TX + 0.2, y: yImg + hImg / 2 - 0.15, w: TW - 0.4, h: 0.30,
      fontFace: 'Calibri', fontSize: 10, color: THEME.MUTED, italic: true, align: 'center', valign: 'middle',
    });
  }

  // ---------- tabela de atividades ----------
  const yTabela = yImg + hImg + 0.14;
  const wTabela = TW * 0.62;
  slide.addText('ATIVIDADES E RESPONSÁVEIS', {
    x: TX, y: yTabela, w: wTabela, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, color: THEME.MUTED, charSpacing: 1,
  });

  const linhaH = 0.24;
  const cols = [0.06, 0.44, 0.22, 0.28];
  const cabecalhos = ['#', 'ELEMENTO', 'TIPO', 'RAIA / RESPONSÁVEL'];
  let ly = yTabela + 0.20;

  slide.addShape('rect', { x: TX, y: ly, w: wTabela, h: linhaH, fill: { color: THEME.NAVY } });
  let cx = TX;
  cabecalhos.forEach((h, i) => {
    slide.addText(h, {
      x: cx + 0.06, y: ly, w: wTabela * cols[i] - 0.08, h: linhaH,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: 'FFFFFF', valign: 'middle',
    });
    cx += wTabela * cols[i];
  });
  ly += linhaH;

  // Espaço restante manda quantas linhas cabem — resto vai no rodapé como contagem.
  const espaco = TY + TH - ly - 0.06;
  const cabem = Math.max(0, Math.floor(espaco / linhaH));
  const visiveis = elementos.slice(0, cabem);

  visiveis.forEach((el, idx) => {
    slide.addShape('rect', {
      x: TX, y: ly, w: wTabela, h: linhaH,
      fill: { color: idx % 2 === 0 ? 'FFFFFF' : 'F7F8FC' },
      line: { color: CINZA_LINHA, width: 0.5 },
    });
    const ehDecisao = el.tipo === 'Decisão';
    const valores = [String(idx + 1), el.nome, el.tipo, el.raia];
    cx = TX;
    valores.forEach((v, i) => {
      slide.addText(v, {
        x: cx + 0.06, y: ly, w: wTabela * cols[i] - 0.08, h: linhaH,
        fontFace: 'Calibri', fontSize: 8, valign: 'middle', shrinkText: true,
        bold: ehDecisao && i > 0,
        color: i === 0 ? THEME.MUTED : (ehDecisao ? THEME.BLUE : THEME.INK),
      });
      cx += wTabela * cols[i];
    });
    ly += linhaH;
  });

  if (elementos.length > visiveis.length) {
    slide.addText(`+ ${elementos.length - visiveis.length} elemento(s) não exibido(s) — ver o arquivo .bpmn completo.`, {
      x: TX, y: ly + 0.02, w: wTabela, h: 0.18,
      fontFace: 'Calibri', fontSize: 7.5, color: THEME.MUTED, italic: true,
    });
  }

  // ---------- painel de validação ----------
  const xPainel = TX + wTabela + 0.16;
  const wPainel = TW - wTabela - 0.16;
  const hPainel = TY + TH - yTabela - 0.06;
  slide.addShape('rect', {
    x: xPainel, y: yTabela, w: wPainel, h: hPainel,
    fill: { color: validacao.aprovado ? VERDE_FUNDO : VERMELHO_FUNDO },
    line: { color: validacao.aprovado ? VERDE : VERMELHO, width: 0.5 },
  });
  slide.addText(validacao.aprovado ? 'VALIDAÇÃO DO DIAGRAMA' : 'PROBLEMAS ENCONTRADOS', {
    x: xPainel + 0.12, y: yTabela + 0.06, w: wPainel - 0.24, h: 0.18,
    fontFace: 'Calibri', fontSize: 7.5, bold: true, charSpacing: 1,
    color: validacao.aprovado ? VERDE : VERMELHO,
  });

  const linhas = validacao.aprovado
    ? [
        'Início e fim presentes.',
        'Nenhum elemento solto no fluxo.',
        'Camada gráfica completa — abre desenhado no Bizagi.',
        'Decisões com pergunta e saídas nomeadas.',
        ...validacao.avisos.slice(0, 2),
      ]
    : [...validacao.erros.slice(0, 5), ...validacao.avisos.slice(0, 2)];

  let py = yTabela + 0.28;
  linhas.filter(Boolean).forEach((t) => {
    if (py + 0.22 > yTabela + hPainel - 0.24) return;
    slide.addText(`• ${t}`, {
      x: xPainel + 0.12, y: py, w: wPainel - 0.24, h: 0.22,
      fontFace: 'Calibri', fontSize: 8, color: THEME.INK, shrinkText: true,
    });
    py += 0.22;
  });

  slide.addText(
    `${validacao.totalNos} elemento(s), ${validacao.totalFluxos} seta(s) · arquivo .bpmn ${validacao.aprovado ? 'válido' : 'com pendências'}`,
    {
      x: xPainel + 0.12, y: yTabela + hPainel - 0.24, w: wPainel - 0.24, h: 0.20,
      fontFace: 'Calibri', fontSize: 7.5, color: THEME.MUTED, shrinkText: true,
    }
  );

  const fileName = `Mapa_BPMN_${sanitize(project.name || 'Projeto')}_${today.replace(/\//g, '')}.pptx`;
  if (!options.pres) await pres.writeFile({ fileName });
}
