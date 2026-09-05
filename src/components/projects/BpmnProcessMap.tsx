import { useEffect, useRef, useState, useCallback } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { Download, Upload, CheckCircle2, AlertTriangle, XCircle, BookOpen, X, Loader2, Maximize2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { BPMN_TEMPLATE_AS_IS } from '@/src/services/bpmnTemplate';
import { validarBpmn, type BpmnValidationResult } from '@/src/services/bpmnValidator';
import { traducaoPtBr } from '@/src/services/bpmnTraducao';

/**
 * Mapa de Processo BPMN — editor BPMN 2.0 real.
 *
 * Difere do Mapeamento de Processo simples porque o que sai daqui e um arquivo .bpmn
 * de verdade: com a logica (eventos, atividades, decisoes, raias, piscinas) E a camada
 * grafica (BPMN DI). O aluno leva esse arquivo pro Bizagi Modeler ou BPMN.io da empresa
 * dele e ele abre ja desenhado — nao vira imagem morta.
 *
 * Implementa o que o Kit Mapeando na Pratica define: template AS IS como ponto de
 * partida, as regras de modelagem e o validador (porte de `scripts/validar-bpmn.py`).
 *
 * A marca d'agua do bpmn.io fica visivel de proposito: a licenca da biblioteca exige
 * que ela nao seja removida nem encoberta, inclusive em uso comercial.
 */

interface BpmnProcessMapProps {
  onSave?: (data: any) => void;
  initialData?: any;
  onClearAIData?: () => void;
}

/** Largura da paleta do bpmn-js (2 colunas) + folga, em pixels. */
const PALETA_PX = 140;

/**
 * Cores oferecidas ao aluno. Preenchimento claro com borda mais forte da mesma
 * familia — o texto preto do BPMN continua legivel por cima, coisa que fundo
 * saturado estraga. Sao as cores que o Bizagi tambem entende ao abrir o arquivo.
 */
const CORES = [
  { nome: 'Azul', fill: '#DBEAFE', stroke: '#1E40AF' },
  { nome: 'Verde', fill: '#DCFCE7', stroke: '#166534' },
  { nome: 'Amarelo', fill: '#FEF9C3', stroke: '#854D0E' },
  { nome: 'Vermelho', fill: '#FEE2E2', stroke: '#991B1B' },
  { nome: 'Roxo', fill: '#EDE9FE', stroke: '#5B21B6' },
  { nome: 'Cinza', fill: '#E5E7EB', stroke: '#374151' },
];

/**
 * Remove o menu redondo que aparecia grudado no elemento ao clicar nele.
 *
 * Ele trazia ~9 icones espremidos por cima do desenho e confundia mais do que
 * ajudava. Substituimos o provedor de entradas do bpmn-js por um que nao devolve
 * nada — o que MANTEM intactos os modulos de que ele depende: edicao de texto por
 * duplo clique, selecao, conexao e criacao continuam funcionando normalmente.
 *
 * O que era feito por ali agora se faz assim:
 *   excluir  -> tecla Delete ou Backspace (ja vem ligada ao canvas pelo bpmn-js)
 *   ligar    -> ferramenta "Conectar elementos" na paleta
 *   criar    -> arrastar da paleta
 */
class ProviderSemMenu {
  static $inject = ['contextPad'];
  constructor(contextPad: any) {
    contextPad.registerProvider(this);
  }
  getContextPadEntries() {
    return {};
  }
  getMultiElementContextPadEntries() {
    return {};
  }
}

const semMenuDeContexto = {
  __init__: ['contextPadProvider'],
  contextPadProvider: ['type', ProviderSemMenu],
};

/** Regras de modelagem do kit, mostradas no modal "Ver regras". */
const REGRAS = [
  ['Atividade', 'Verbo no infinitivo + objeto. Ex: "Registrar solicitacao".'],
  ['Decisao', 'Nome e uma pergunta objetiva, e cada saida tem nome ("Sim", "Nao", "Aprovado").'],
  ['Raia', 'Representa responsabilidade — quem executa. Nao e um processo.'],
  ['Piscina', 'So para participante independente. Area interna da mesma empresa usa raia.'],
  ['Fluxo de sequencia', 'So dentro da mesma piscina.'],
  ['Fluxo de mensagem', 'So entre piscinas diferentes.'],
  ['Retrabalho', 'Retorno e devolucao reais precisam aparecer no desenho.'],
  ['Subprocesso', 'Use quando o detalhe atrapalhar a leitura do fluxo principal.'],
  ['Sentido', 'Fluxo principal da esquerda para a direita, sempre que possivel.'],
  ['AS IS', 'Represente o processo como ele ACONTECE, nao como deveria acontecer.'],
];

export default function BpmnProcessMap({ onSave, initialData, onClearAIData }: BpmnProcessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);

  /**
   * Enquadra o diagrama SEM deixar nada embaixo da paleta.
   *
   * `fit-viewport` sozinho encosta o desenho na borda esquerda — e a paleta do
   * bpmn-js flutua exatamente ali, escondendo o inicio do fluxo e os nomes das
   * raias. Aqui o desenho e reduzido pra caber na largura que sobra e depois
   * empurrado pra direita da paleta, entao nada fica coberto nem sai da tela.
   *
   * bpmn-js tipa `get()` como unknown; o cast fica concentrado neste lugar so.
   */
  const ajustarZoom = () => {
    const canvas: any = modelerRef.current?.get('canvas');
    if (!canvas) return;
    canvas.zoom('fit-viewport');
    const vb = canvas.viewbox();
    const largura = vb?.outer?.width || 0;
    // Guarda: em container muito estreito, encolher mais atrapalharia em vez de ajudar.
    if (largura > PALETA_PX * 2) {
      canvas.zoom(vb.scale * ((largura - PALETA_PX) / largura));
      canvas.scroll({ dx: PALETA_PX, dy: 0 });
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Elemento selecionado agora (1 só) e o que estava selecionado quando o arraste começou. */
  const selecaoRef = useRef<any>(null);
  const origemRef = useRef<any>(null);

  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [validacao, setValidacao] = useState<BpmnValidationResult | null>(null);
  const [validando, setValidando] = useState(false);
  const [showRegras, setShowRegras] = useState(false);
  const [nomeProcesso, setNomeProcesso] = useState<string>(initialData?.nomeProcesso || '');
  const [selecionados, setSelecionados] = useState<any[]>([]);

  // Monta o modelador uma vez. O XML salvo vence; sem nada salvo, entra o template do kit.
  useEffect(() => {
    if (!containerRef.current) return;

    // `additionalModules` com o módulo `translate` substitui o padrão da biblioteca,
    // então toda a interface (paleta, menu de contexto, menu de troca) sai em português.
    const modeler = new BpmnModeler({
      container: containerRef.current,
      additionalModules: [traducaoPtBr, semMenuDeContexto],
    });
    modelerRef.current = modeler;

    // Guarda o que está selecionado — serve pra aplicar cor e pra saber de onde
    // sai a seta na ligação automática logo abaixo.
    modeler.on('selection.changed', (e: any) => {
      const sel = e?.newSelection || [];
      setSelecionados(sel);
      selecaoRef.current = sel.length === 1 ? sel[0] : null;
    });

    // ---- Ligação automática ao arrastar da paleta ----
    // Fluxo que o consultor pediu: clicar numa caixa, pegar o tipo na paleta,
    // soltar onde quiser e JÁ SAIR LIGADO. O bpmn-js sozinho cria solto; aqui a
    // seta é criada depois, da caixa que estava selecionada para a nova.
    const eventBus: any = modeler.get('eventBus');
    const modeling: any = modeler.get('modeling');
    const rules: any = modeler.get('rules');

    // Congela a origem no instante em que o arraste começa: ao soltar, o bpmn-js
    // já selecionou o elemento novo, e aí a origem original estaria perdida.
    eventBus.on('create.init', () => {
      origemRef.current = selecaoRef.current;
    });

    eventBus.on('commandStack.shape.create.postExecuted', (e: any) => {
      const novo = e?.context?.shape;
      const origem = origemRef.current;
      origemRef.current = null;
      if (!novo || !origem || novo === origem) return;
      // Já tem seta: acontece ao soltar em cima de um fluxo, que insere o
      // elemento no meio dele. Nesse caso o bpmn-js já ligou — não duplicar.
      if ((novo.incoming || []).length || (novo.outgoing || []).length) return;
      // Só liga o que o BPMN permite: evita seta saindo de raia, de piscina ou
      // chegando num evento inicial. A própria regra da biblioteca decide.
      if (!rules.allowed('connection.create', { source: origem, target: novo })) return;
      try {
        modeling.connect(origem, novo);
      } catch (err) {
        // Ligação recusada em runtime não pode derrubar o desenho do aluno.
        console.error('Nao foi possivel ligar automaticamente os elementos:', err);
      }
    });

    eventBus.on('create.cancel', () => {
      origemRef.current = null;
    });

    const xmlInicial = initialData?.xml || BPMN_TEMPLATE_AS_IS;
    modeler
      .importXML(xmlInicial)
      .then(() => {
        ajustarZoom();
        setCarregando(false);
      })
      .catch((err: any) => {
        console.error('Erro ao abrir o diagrama BPMN:', err);
        setErroCarga('Nao foi possivel abrir o diagrama salvo. O arquivo pode estar corrompido.');
        setCarregando(false);
      });

    return () => modeler.destroy();
    // Monta uma vez só: recriar o modelador a cada mudança de initialData
    // descartaria o que o aluno está desenhando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** XML atual do canvas, ja formatado. */
  const obterXml = useCallback(async (): Promise<string> => {
    const { xml } = await modelerRef.current.saveXML({ format: true });
    return xml;
  }, []);

  const handleSave = useCallback(async () => {
    if (!modelerRef.current) return;
    try {
      const xml = await obterXml();
      onSave?.({ xml, nomeProcesso });
    } catch (err) {
      console.error('Erro ao salvar o diagrama BPMN:', err);
    }
  }, [obterXml, onSave, nomeProcesso]);

  const handleValidar = async () => {
    setValidando(true);
    try {
      setValidacao(validarBpmn(await obterXml()));
    } catch {
      setValidacao({
        aprovado: false,
        erros: ['Nao foi possivel ler o diagrama para validar.'],
        avisos: [],
        totalNos: 0,
        totalFluxos: 0,
      });
    } finally {
      setValidando(false);
    }
  };

  /**
   * Pinta os elementos selecionados.
   *
   * `modeling.setColor` grava a cor no PRÓPRIO arquivo .bpmn (como background-color e
   * border-color na camada gráfica), então a cor sobrevive ao salvar, ao baixar e
   * reabrir, e viaja junto pro Bizagi — não é enfeite só de tela.
   */
  const aplicarCor = (cor: { fill: string; stroke: string } | null) => {
    if (!modelerRef.current || selecionados.length === 0) return;
    const modeling: any = modelerRef.current.get('modeling');
    // null = "sem cor": volta ao padrão do BPMN em vez de pintar de branco.
    modeling.setColor(selecionados, cor ? { fill: cor.fill, stroke: cor.stroke } : { fill: undefined, stroke: undefined });
  };

  /** Baixa o .bpmn — o arquivo que abre no Bizagi e no BPMN.io. */
  const handleExportar = async () => {
    const xml = await obterXml();
    const nome = (nomeProcesso || 'processo').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    a.download = `fluxo-${nome || 'processo'}-v01.bpmn`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExportarSvg = async () => {
    const { svg } = await modelerRef.current.saveSVG();
    const nome = (nomeProcesso || 'processo').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    a.download = `fluxo-${nome || 'processo'}-v01.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /** Abre um .bpmn vindo do Bizagi/BPMN.io — o ciclo de volta. */
  const handleImportar = async (file: File) => {
    try {
      await modelerRef.current.importXML(await file.text());
      ajustarZoom();
      setValidacao(null);
      setErroCarga(null);
    } catch (err) {
      console.error('Erro ao importar BPMN:', err);
      setErroCarga('Esse arquivo nao e um BPMN 2.0 valido.');
    }
  };

  const btn = "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors border cursor-pointer";

  return (
    <div className="space-y-4">
      {/* Cabecalho */}
      <div className="bg-white p-6 border border-[#ccc] rounded-lg shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eee] pb-4">
          <div className="flex-1 min-w-[220px]">
            <h2 className="text-lg font-bold text-[#333]">Mapa de Processo BPMN</h2>
            <p className="text-xs text-[#666]">
              Desenhe o processo como ele acontece e exporte um arquivo <strong>.bpmn</strong> que abre no Bizagi e no BPMN.io.
            </p>
          </div>
          <button onClick={() => setShowRegras(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0">
            <BookOpen size={14} /> Ver regras
          </button>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
            Nome do processo
          </label>
          <input
            value={nomeProcesso}
            onChange={(e) => setNomeProcesso(e.target.value)}
            placeholder="Ex: Reembolso de despesas"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Barra de acoes */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleValidar} disabled={validando} className={cn(btn, "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 disabled:opacity-50")}>
            {validando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Validar diagrama
          </button>
          <button onClick={handleExportar} className={cn(btn, "bg-white border-gray-200 text-gray-700 hover:border-blue-300")}>
            <Download size={14} /> Baixar .bpmn
          </button>
          <button onClick={handleExportarSvg} className={cn(btn, "bg-white border-gray-200 text-gray-700 hover:border-blue-300")}>
            <Download size={14} /> Baixar imagem (SVG)
          </button>
          <button onClick={() => fileInputRef.current?.click()} className={cn(btn, "bg-white border-gray-200 text-gray-700 hover:border-blue-300")}>
            <Upload size={14} /> Abrir .bpmn
          </button>
          <button
            onClick={ajustarZoom}
            title="Encaixa o diagrama inteiro na tela"
            className={cn(btn, "bg-white border-gray-200 text-gray-700 hover:border-blue-300")}
          >
            <Maximize2 size={14} /> Centralizar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".bpmn,.xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportar(f); e.target.value = ''; }}
          />
        </div>

        {/* Cores — só aparece com algo selecionado, senão não haveria onde aplicar. */}
        {selecionados.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-[#F0F2FA] border border-blue-100 rounded-lg">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Cor {selecionados.length > 1 ? `(${selecionados.length} selecionados)` : 'do selecionado'}
            </span>
            {CORES.map((c) => (
              <button
                key={c.nome}
                onClick={() => aplicarCor(c)}
                title={c.nome}
                className="w-6 h-6 rounded border-2 cursor-pointer transition-transform hover:scale-110"
                style={{ background: c.fill, borderColor: c.stroke }}
              />
            ))}
            <button
              onClick={() => aplicarCor(null)}
              title="Voltar à cor padrão do BPMN"
              className="px-2.5 py-1 text-[11px] font-bold text-gray-500 bg-white border border-gray-200 rounded hover:border-blue-300 cursor-pointer"
            >
              Sem cor
            </button>
          </div>
        )}

        {erroCarga && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <XCircle size={16} /> {erroCarga}
          </div>
        )}
      </div>

      {/* O provedor vazio já não gera ícone nenhum, mas o bpmn-js ainda cria o
          contêiner do menu e marca como aberto — sem isto sobraria uma caixinha
          vazia grudada no elemento. */}
      <style>{`.djs-context-pad { display: none !important; }`}</style>

      {/* Canvas — a marca d'agua do bpmn.io fica visivel por exigencia da licenca */}
      <div className="relative border border-[#ccc] rounded-lg overflow-hidden bg-white" style={{ height: 560 }}>
        {carregando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Loader2 size={22} className="animate-spin text-blue-600" />
          </div>
        )}
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Resultado da validacao */}
      {validacao && (
        <div className={cn(
          "p-5 rounded-lg border",
          validacao.aprovado ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        )}>
          <div className="flex items-center gap-2 mb-3">
            {validacao.aprovado
              ? <CheckCircle2 size={18} className="text-emerald-600" />
              : <XCircle size={18} className="text-red-600" />}
            <span className={cn("text-sm font-black uppercase tracking-wider", validacao.aprovado ? "text-emerald-700" : "text-red-700")}>
              {validacao.aprovado ? 'Diagrama aprovado' : `${validacao.erros.length} problema(s) a corrigir`}
            </span>
            <span className="text-[11px] text-gray-500 ml-auto">
              {validacao.totalNos} elemento(s), {validacao.totalFluxos} seta(s)
            </span>
          </div>

          {validacao.erros.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {validacao.erros.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-red-800">
                  <XCircle size={14} className="mt-0.5 shrink-0" /> {e}
                </li>
              ))}
            </ul>
          )}

          {validacao.avisos.length > 0 && (
            <ul className="space-y-1.5">
              {validacao.avisos.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modal das regras do kit */}
      {showRegras && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRegras(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 sticky top-0 bg-white">
              <h3 className="text-base font-black text-gray-800">Regras de modelagem BPMN</h3>
              <button onClick={() => setShowRegras(false)} className="p-1.5 hover:bg-gray-100 rounded-lg border-0 bg-transparent cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {REGRAS.map(([titulo, texto]) => (
                <div key={titulo}>
                  <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest">{titulo}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button data-save-trigger onClick={handleSave} className="hidden" />
    </div>
  );
}
