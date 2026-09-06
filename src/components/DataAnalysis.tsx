import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  AlertCircle,
  BarChart2,
  Search,
  Play,
  X,
  Clock,
  ChevronRight,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { auth } from '../lib/firebase';
import { useProject } from '../contexts/ProjectContext';
import { exportStatisticalAnalysisSlide } from '../services/statisticalAnalysisSlideExporter';
import Plot from 'react-plotly.js';
import PlotlyLib from 'plotly.js/dist/plotly';
import {
  salvarPlanilhaProjeto,
  obterPlanilhaProjeto,
  salvarAnalises,
  carregarAnalises,
  baixarPlanilhaProjeto,
  PlanilhaInfo,
  GraficoPersonalizacao,
} from '../services/analysisDataService';
import { getAllKnowledge, getInstitutionalKnowledge, KnowledgeEntry } from '../services/knowledgeService';
import { useUserAccess } from '../hooks/useUserAccess';
import { LockedToolPopup } from './LockedToolPopup';
import { CoursePurchasePopup } from './CoursePurchasePopup';
import SlimSelect from 'slim-select';
import 'slim-select/styles';
import { logAnalysisRun } from '../services/eventLogger';
import { ANALYTICS_MODULOS, acessoAnalyticsDoAluno } from '../services/analyticsModules';
import { getCourses } from '../services/configService';
import { getCourseNameForAnalyticsModule, getCourseOfferDefaults } from '../services/courseOfferService';
import { courseNamesMatch } from '../lib/courseAccess';
import { resolveConsultorId } from '../services/consultorService';
import DataAnalysisTour from './DataAnalysisTour';
import { HelpCircle, Sparkles, FileDown, Save } from 'lucide-react';
import { createProject, getUserProjects } from '../services/projectService';
import type { Initiative, Project } from '../types';

/**
 * Backend de análises (Python — repo israelnz2018/Analises no Railway), acessado SEMPRE
 * via PROXY do nosso servidor (/api/analises -> server.ts). Chamar direto o domínio do
 * serviço quebrava com "Failed to fetch" em todo subdomínio de consultor: a whitelist
 * de CORS de lá só conhece `app.educacaopelotrabalho.com`. Pelo proxy é mesma origem,
 * então funciona em israel.*, em qualquer consultor novo e no domínio raiz.
 *
 * Fixo de propósito (sem VITE_ANALISES_API_URL): aquela env estava setada com a URL
 * absoluta e reintroduziria o bug. Pra apontar noutro backend, use ANALISES_API_URL
 * no servidor — é lá que a escolha do upstream passa a viver.
 */
const ANALISES_API = '/api/analises';
const NOVO_PROJETO_ID = '__novo_projeto__';

// --- CONFIGURATIONS FROM entradadedados.js ---
const configuracoesFerramentas: Record<string, any[]> = {
  "Gráfico Sumario": ["Y"],
  "Análise de outliers": ["Ys"],
  "Correlação de person": ["Y", "Xs"],
  "Matrix de dispersão": ["Y", "Xs"],
  "Análise de estabilidade": ["Y"], 
  "Análise de limpeza dos dados": [],
  "Análise de cluster": ["Xs"],
  "Histograma": ["Y", "Subgrupo"],
  "Pareto": ["X", "Y", "Subgrupo"],
  "Setores (Pizza)": ["X", "Y", "Subgrupo"],
  "Barras": ["X", "Y", "Subgrupo"],
  "BoxPlot": ["Ys", "Subgrupo"],
  "Dispersão": ["Y", "X", "Subgrupo"],
  "Tendência": ["Y", "Data", "Subgrupo"],
  "Bolhas - 3D": ["Y", "X", "Z"],
  "Superfície - 3D": ["Y", "X", "Z"],
  "Dispersão 3D": ["Y", "X", "Z"],
  "Intervalo": ["Ys", "Subgrupo", "Field_conf"],
  "1 Sample T": ["Y", "Field", "Field_conf"],
  "2 Sample T": ["Ys", "Field_conf"],
  "2 Paired Test": ["Ys", "Field_conf"],
  "One way ANOVA": ["Ys", "Subgrupo", "Field_conf"],
  "1 Wilcoxon": ["Y", "Field", "Field_conf"],
  "2 Mann-Whitney": ["Ys", "Field_conf"],
  "2 Wilcoxon Paired": ["Ys", "Field_conf"],
  "Kruskal-Wallis": ["Ys", "Subgrupo", "Field_conf"],
  "Friedman Pareado": ["Ys", "Subgrupo", "Field_conf"],
  "1 Intervalo de Confianca": ["Y", "Field_conf"],
  "1 Intervalo Interquartilico": ["Y"],
  "2 Varianças": ["Ys", "Field_conf"],
  "2 Variancas Brown-Forsythe": ["Ys", "Field_conf"],
  "Bartlett": ["Ys", "Subgrupo", "Field_conf"],
  "Brown-Forsythe": ["Ys", "Subgrupo", "Field_conf"],
  "1 Intervalo de Confianca Variancia": ["Y", "Field_conf"],
  "1 Proporcao": ["X", "Field", "Field_conf"],
  "2 Proporções": ["X", "Y"],
  "K Proporcoes": ["Ys"],
  "Qui-quadrado de Associação": ["Y", "X"],
  "Qui-quadrado de Ajuste": ["Y", "X"],
  "Tipo de modelo de regressão": ["Y", "X"],
  "Regressão Linear": ["Y", "X"],
  "Regressão Quadrática": ["Y", "X"],
  "Regressão Cúbica": ["Y", "X"],
  "Regressão Linear Múltipla": ["Y", "Xs"],
  "Regressão Binária": ["Y", "Xs"],
  "Regressão Ordinal": ["Y", "Xs"],
  "Regressão Nominal": ["Y", "Xs"],
  "Árvore de Decisão - CART": ["Y", "Xs"],
  "Random Forest": ["Y", "Xs"],
  "Série Temporal": ["Y", "Data", "Field"],
  "Carta I-MR": ["Y"],
  "Carta X-BarraR": ["Y", "Subgrupo"],
  "Carta X-BarraS": ["Y", "Subgrupo"], 
  "Carta P": ["Y", "Subgrupo"],
  "Carta NP": ["Y", "Subgrupo"],
  "Carta C": ["Y"],
  "Carta U": ["Y", "Subgrupo"],
  "Carta EWMA": ["Y"],
  "Teste de normalidade": ["Y"],
  "Análise de distribuição estatística": ["Y"],
  "Capabilidade - dados normais": ["Y", "Subgrupo", "Field_LIE", "Field_LSE"],
  "Capabilidade - outras distribuições": ["Y", "Subgrupo", "Field_Dist", "Field_LIE", "Field_LSE"],
  "Capabilidade - com dados transformados": ["Y", "Subgrupo", "Field_LIE", "Field_LSE"],
  "Capabilidade - com dados discretizados": ["Y", "Field_LIE", "Field_LSE"],
  "Cálculo de probabilidade": ["Y", "Field"],
  "Gage R&R": [
    { tipo: "Y", label: "Medição" },
    { tipo: "X", label: "Peça" },
    { tipo: "Subgrupo", label: "Operador" },
    { tipo: "Field_LIE", label: "LIE (opcional)" },
    { tipo: "Field_LSE", label: "LSE (opcional)" }
  ],
  "Vício (Bias)": [
    { tipo: "Y", label: "Medições" },
    { tipo: "Field", label: "Valor de Referência" },
    { tipo: "Field_LSE", label: "LSE (opcional)" },
    { tipo: "Field_LIE", label: "LIE (opcional)" }
  ],
  "Linearidade": [
    { tipo: "Y", label: "Medições" },
    { tipo: "X", label: "Valor de Referência" },
    { tipo: "Field_LSE", label: "LSE (opcional)" },
    { tipo: "Field_LIE", label: "LIE (opcional)" }
  ],
  "Estabilidade": [
    { tipo: "Y", label: "Medições" },
    { tipo: "Subgrupo", label: "Subgrupo (data/dia/lote)" },
    { tipo: "Field", label: "Valor de Referência" },
    { tipo: "Field_LSE", label: "LSE (opcional)" },
    { tipo: "Field_LIE", label: "LIE (opcional)" }
  ],
  "Concordância de Atributos": [
    { tipo: "Y", label: "Resultado" },
    { tipo: "X", label: "Peça" },
    { tipo: "Subgrupo", label: "Avaliador" },
    { tipo: "Field", label: "Padrão (opcional)" },
    { tipo: "Ordinal", label: "Categorias ordinais" }
  ],
  "Método Analítico": [
    { tipo: "Y", label: "Aceitações por peça" },
    { tipo: "X", label: "Valor de Referência" },
    { tipo: "Field", label: "Número de trials por peça" },
    { tipo: "Field_LSE", label: "LSE (opcional se LIE informado)" },
    { tipo: "Field_LIE", label: "LIE (opcional se LSE informado)" }
  ],
};

// --- CONFIGURATIONS FROM menu.js ---
const configuracoesAnalises = {
  "Análise Exploratória": [
    { nome: "Análise de variabilidade ➡️ ", subitens: ["Gráfico Sumario", "Análise de outliers"] },
    { nome: "Análise de correlação ➡️ ", subitens: ["Correlação de person", "Matrix de dispersão"] },
    { nome: "Teste de normalidade" },
    { nome: "Análise de estabilidade" },
    { nome: "Análise de limpeza dos dados" },
    { nome: "Análise de cluster" },
  ],
  "Análise Descritiva (Gráficos)": [
    { nome: "Histograma" },
    { nome: "Pareto" },
    { nome: "Setores (Pizza)" },
    { nome: "Barras" },
    { nome: "BoxPlot" },
    { nome: "Dispersão" },
    { nome: "Tendência" },
    { nome: "Bolhas - 3D" },
    { nome: "Superfície - 3D" },
    { nome: "Dispersão 3D"},
    { nome: "Intervalo"}
  ],
  "Análise Inferencial": [
    { nome: "Análise de Médias ➡️ ", subitens: ["1 Sample T", "2 Sample T", "2 Paired Test", "One way ANOVA", "1 Intervalo de Confianca"] },
    { nome: "Análise de Medianas ➡️ ", subitens: ["1 Wilcoxon","2 Mann-Whitney", "2 Wilcoxon Paired", "Kruskal-Wallis", "Friedman Pareado", "1 Intervalo Interquartilico"] },
    { nome: "Análise de Varianças ➡️ ", subitens: ["2 Varianças", "2 Variancas Brown-Forsythe", "Bartlett", "Brown-Forsythe", "1 Intervalo de Confianca Variancia"] },
    { nome: "Análise de Proporção ➡️ ", subitens: ["1 Proporcao", "2 Proporções", "K Proporcoes"] },
    { nome: "Análise de Independência /Homogeneidade ➡️ ", subitens: ["Qui-quadrado de Associação", "Qui-quadrado de Ajuste"] }
  ],
  "Análise do Sistema de Medição (MSA)": [
    { nome: "Dados Contínuos ➡️ ", subitens: ["Gage R&R", "Vício (Bias)", "Linearidade", "Estabilidade"] },
    { nome: "Dados Discretos (Atributos) ➡️ ", subitens: ["Concordância de Atributos", "Método Analítico"] },
  ],
  "Análise Preditiva": [
    { nome: "Tipo de modelo de regressão" },
    { nome: "Regressão simples ➡️ ", subitens: ["Regressão Linear", "Regressão Quadrática", "Regressão Cúbica"] },
    { nome: "Regressão Linear Múltipla" },
    { nome: "Regressão logística ➡️ ", subitens: ["Regressão Binária", "Regressão Ordinal", "Regressão Nominal"] },
    { nome: "Árvore de Decisão - CART" },
    { nome: "Random Forest" },
    { nome: "Série Temporal" }
  ],
  "Análise de controle de processo": [
    { nome: "Carta I-MR" },
    { nome: "Carta X-BarraR" },
    { nome: "Carta X-BarraS" }, 
    { nome: "Carta P" },
    { nome: "Carta NP" },
    { nome: "Carta C" },
    { nome: "Carta U" },
    { nome: "Carta EWMA" }
  ],
  "Análises de Capabilidade": [
    { nome: "Teste de normalidade" },
    { nome: "Análise de estabilidade" },
    { nome: "Análise de distribuição estatística" },
    { nome: "Capabilidade - dados normais" },
    { nome: "Capabilidade - outras distribuições" },
    { nome: "Capabilidade - com dados transformados" },
    { nome: "Capabilidade - com dados discretizados" }
  ],
  "Análises Diversas": [
    { nome: "Teste de normalidade" },
    { nome: "Cálculo de probabilidade" },
    { nome: "Gráfico Sumario" },
    { nome: "Análise de estabilidade" },
  ],
};

// Garantia contra o mesmo erro que já aconteceu uma vez (renomear/reorganizar
// um grupo aqui sem atualizar ANALYTICS_MODULOS em services/analyticsModules.ts):
// se os dois ficarem fora de sincronia, o módulo inteiro passa a bloquear TODO
// MUNDO em silêncio (grupoLiberado não encontra o módulo e trata como restrito).
// Em vez de silêncio, isso aparece AGORA — no console assim que a tela carrega —
// em vez de virar reclamação de aluno dias depois.
if (import.meta.env.DEV) {
  const gruposReais = new Set(Object.keys(configuracoesAnalises));
  const gruposCatalogados = new Set(ANALYTICS_MODULOS.map((m) => m.grupo));
  for (const g of gruposReais) {
    if (!gruposCatalogados.has(g)) {
      console.error(`[DataAnalysis] Grupo "${g}" existe em configuracoesAnalises mas não em ANALYTICS_MODULOS (services/analyticsModules.ts) — esse módulo vai bloquear todo aluno, mesmo com acesso liberado. Adicione uma entrada com esse "grupo" lá.`);
    }
  }
  for (const g of gruposCatalogados) {
    if (!gruposReais.has(g)) {
      console.error(`[DataAnalysis] ANALYTICS_MODULOS referencia o grupo "${g}", que não existe (mais) em configuracoesAnalises — provavelmente foi renomeado aqui sem atualizar lá.`);
    }
  }
}

// Mapeamento nome da análise → ID usado em associatedAnalyses
const ANALISE_NOME_PARA_ID: Record<string, string> = {
  'Gráfico Sumario': 'graficoSumario',
  'Análise de outliers': 'analiseOutliers',
  'Correlação de person': 'correlacaoPearson',
  'Matrix de dispersão': 'matrixDispersao',
  'Análise de estabilidade': 'analiseEstabilidade',
  'Análise de limpeza dos dados': 'analiseLimpezaDados',
  'Análise de cluster': 'analiseCluster',
  'Histograma': 'histograma',
  'Pareto': 'pareto',
  'Setores (Pizza)': 'pizza',
  'Barras': 'barras',
  'BoxPlot': 'boxplot',
  'Dispersão': 'dispersao',
  'Tendência': 'tendencia',
  'Bolhas - 3D': 'bolhas3D',
  'Superfície - 3D': 'superficie3D',
  'Dispersão 3D': 'dispersao3D',
  'Intervalo': 'intervalo',
  '1 Sample T': 't1Sample',
  '2 Sample T': 't2Sample',
  '2 Paired Test': 't2Paired',
  'One way ANOVA': 'anova1way',
  '1 Intervalo de Confianca': 'intervaloConfianca1',
  '1 Wilcoxon': 'wilcoxon1',
  '2 Mann-Whitney': 'mannWhitney',
  '2 Wilcoxon Paired': 'wilcoxonPaired',
  'Kruskal-Wallis': 'kruskalWallis',
  'Friedman Pareado': 'friedmanPareado',
  '1 Intervalo Interquartilico': 'intervaloInterquartilico',
  '2 Varianças': 'variancas2',
  '2 Variancas Brown-Forsythe': 'variancasBF',
  'Bartlett': 'bartlett',
  'Brown-Forsythe': 'brownForsythe',
  '1 Intervalo de Confianca Variancia': 'intervaloConfiancaVar',
  '1 Proporcao': 'proporcao1',
  '2 Proporções': 'proporcoes2',
  'K Proporcoes': 'proporcoesK',
  'Qui-quadrado de Associação': 'quiQuadradoAssociacao',
  'Qui-quadrado de Ajuste': 'quiQuadradoAjuste',
  'Gage R&R': 'gageRR',
  'Vício (Bias)': 'bias',
  'Linearidade': 'linearidade',
  'Estabilidade': 'msaEstabilidade',
  'Concordância de Atributos': 'concordanciaAtributos',
  'Método Analítico': 'metodoAnalitico',
  'Regressão Linear': 'regressaoLinear',
  'Regressão Quadrática': 'regressaoQuadratica',
  'Regressão Cúbica': 'regressaoCubica',
  'Regressão Linear Múltipla': 'regressaoLinearMultipla',
  'Regressão Binária': 'regressaoBinaria',
  'Regressão Ordinal': 'regressaoOrdinal',
  'Regressão Nominal': 'regressaoNominal',
  'Árvore de Decisão - CART': 'arvoreDecisao',
  'Random Forest': 'randomForest',
  'Série Temporal': 'serieTemporal',
  'Carta I-MR': 'cartaIMR',
  'Carta X-BarraR': 'cartaXBarraR',
  'Carta X-BarraS': 'cartaXBarraS',
  'Carta P': 'cartaP',
  'Carta NP': 'cartaNP',
  'Carta C': 'cartaC',
  'Carta U': 'cartaU',
  'Carta EWMA': 'cartaEWMA',
  'Teste de normalidade': 'testeNormalidade',
  'Análise de distribuição estatística': 'analiseDistribuicao',
  'Capabilidade - dados normais': 'capabilidadeNormal',
  'Capabilidade - outras distribuições': 'capabilidadeOutras',
  'Capabilidade - com dados transformados': 'capabilidadeTransformados',
  'Capabilidade - com dados discretizados': 'capabilidadeDiscretizados',
  'Cálculo de probabilidade': 'calculoProbabilidade',
};

const GRAFICOS_LIST = [
  "Histograma", "Pareto", "Setores (Pizza)", "Barras", "BoxPlot", "Dispersão",
  "Tendência", "Bolhas - 3D", "Superfície - 3D", "Dispersão 3D", "Intervalo"
];

const mapaCampos: Record<string, string> = {
  "Y": "coluna_y",
  "X": "coluna_x",
  "Z": "coluna_z",
  "Ys": "lista_y",
  "Xs": "lista_x",
  "Zs": "lista_z",
  "Data": "Data",
  "Subgrupo": "subgrupo",
  "Field": "field",
  "Field_conf": "field_conf",
  "Field_LSE": "field_LSE",
  "Field_LIE": "field_LIE",
  "Field_Dist": "field_dist",
  "Ordinal": "ordinal"
};

interface AnalysisResult {
  id: string;
  analise?: string;
  grafico_base64?: string;
  grafico_isolado_base64?: string | string[];
  graficoPptBase64?: string;
  configGrafico?: GraficoPersonalizacao;
  interpretacao?: string;
  timestamp: Date;
  tool: string;
  qa: { question: string; answer: string }[];
  toolParams?: Record<string, any>;        // ← NOVO
  selectedSheet?: string;                  // ← NOVO
  graficoInterativo?: any;
}

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** "MM:SS" ou "HH:MM:SS" → segundos totais. */
function tempoParaSegundos(tempo: string): number {
  const partes = String(tempo || '').split(':').map(Number);
  if (partes.some(isNaN)) return 0;
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  if (partes.length === 2) return partes[0] * 60 + partes[1];
  return partes[0] || 0;
}

/** Pula pra um tempo do vídeo DENTRO do player do Bunny (protocolo player.js) — nunca
 *  navega pro YouTube, já que todos os vídeos da plataforma tocam pelo Bunny. */
function seekBunnyVideo(iframe: HTMLIFrameElement | null, seconds: number) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({ context: 'player.js', method: 'setCurrentTime', value: seconds }), '*');
}

export default function DataAnalysis() {
  const { projetoAtivo, setProjetoAtivo } = useProject();
  const {
    plano,
    isAdmin,
    isConsultor,
    isCoordenador,
    cursosLiberados,
    acessoPorCurso,
    acessoProdutos,
  } = useUserAccess();
  const [lockedAnalisePopupOpen, setLockedAnalisePopupOpen] = useState(false);
  const [lockedAnaliseNome, setLockedAnaliseNome] = useState('');
  const [cursoParaCompra, setCursoParaCompra] = useState<Initiative | null>(null);
  const [cursosOferta, setCursosOferta] = useState<Initiative[]>([]);
  // Trabalho ainda não gravado no projeto. Sem isso, sair da tela (ou fechar o app)
  // descartava as análises em silêncio — elas só vivem em memória até o "Salvar".
  // Âncora do botão "Enviar Análise". Ao gerar, a página rola até aqui: o botão fica
  // no topo da tela e o resultado aparece logo abaixo, sem o aluno procurar onde saiu.
  const ancoraAnaliseRef = useRef<HTMLDivElement>(null);
  // Precisa rodar DUAS vezes: no clique a página ainda é curta (o resultado não
  // existe), e o navegador só consegue rolar até onde há conteúdo — por isso o
  // botão não chegava ao topo. Ao chegar o resultado a página cresce, e aí sim a
  // segunda chamada consegue posicioná-lo. O rAF duplo espera o DOM pintar.
  const rolarParaAnalise = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ancoraAnaliseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  };
  const [temTrabalhoNaoSalvo, setTemTrabalhoNaoSalvo] = useState(false);
  const [modalSairSemSalvar, setModalSairSemSalvar] = useState(false);
  const destinoNavegacao = useRef<string | null>(null);
  const [planilhaProjeto, setPlanilhaProjeto] = useState<PlanilhaInfo | null>(null);
  const [salvandoTudo, setSalvandoTudo] = useState(false);
  const [modalSubstituirPlanilha, setModalSubstituirPlanilha] = useState(false);
  const [modalSucessoSalvar, setModalSucessoSalvar] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [projetosDisponiveis, setProjetosDisponiveis] = useState<Project[]>([]);
  const [modalSelecionarProjeto, setModalSelecionarProjeto] = useState(false);
  const [projetoDestinoId, setProjetoDestinoId] = useState('');
  const [novoProjetoTitulo, setNovoProjetoTitulo] = useState('');
  const [projetoDestinoSalvar, setProjetoDestinoSalvar] = useState<Project | null>(null);
  const [planilhaDestinoSalvar, setPlanilhaDestinoSalvar] = useState<PlanilhaInfo | null>(null);
  const [recomendacaoNatureza, setRecomendacaoNatureza] = useState<any>(() => {
    try {
      const salva = sessionStorage.getItem('lbw-data-nature-recommendation');
      return salva ? JSON.parse(salva) : null;
    } catch {
      return null;
    }
  });

  const fecharRecomendacaoNatureza = () => {
    sessionStorage.removeItem('lbw-data-nature-recommendation');
    setRecomendacaoNatureza(null);
  };

  useEffect(() => {
    getCourses().then(setCursosOferta).catch(() => setCursosOferta([]));
  }, []);

  useEffect(() => {
    // Vídeos institucionais (ex.: os 4 fixos de "como usar a plataforma") ficam disponíveis
    // pra qualquer consultor, além dos vídeos do tenant do consultor logado.
    Promise.all([getAllKnowledge(), getInstitutionalKnowledge()])
      .then(([tenantItems, institucionais]) => {
        const porId = new Map(tenantItems.map(item => [item.id, item]));
        for (const item of institucionais) porId.set(item.id, item);
        setKnowledgeItems(Array.from(porId.values()));
      })
      .catch(console.error);
  }, []);

  // Tour da aba: só abre pelo botão "Iniciar tour" — não abre mais automaticamente.

  useEffect(() => {
    const carregar = async () => {
      // Limpa o estado do projeto anterior
      setFile(null);
      setWorkbook(null);
      setSheets([]);
      setColumns([]);
      setPreviewData([]);
      setSelectedSheet('');
      setResults([]);
      setPlotlyConfigs({});
      plotlyGraphRefs.current = {};
      setGraficoPersonalizandoId(null);
      setPlanilhaProjeto(null);

      if (!projetoAtivo) return;

      try {
        const info = await obterPlanilhaProjeto(projetoAtivo.id);
        setPlanilhaProjeto(info);

        if (info) {
          await carregarPlanilhaDoProjeto(info);
        }

        const dados = await carregarAnalises(projetoAtivo.id);
        if (dados && dados.analises.length > 0) {
          const reconstruidas = dados.analises.map(a => ({
            ...a,
            timestamp: new Date(a.timestamp),
          }));
          setResults(reconstruidas as any);
          setPlotlyConfigs(Object.fromEntries(
            reconstruidas
              .filter((analise) => analise.configGrafico)
              .map((analise) => [analise.id, analise.configGrafico as GraficoPersonalizacao]),
          ));
        }
        // Acabou de vir do banco: nada pendente de gravar.
        setTemTrabalhoNaoSalvo(false);
      } catch (err) {
        console.error('Erro ao carregar dados do projeto:', err);
      }
    };
    carregar();
  }, [projetoAtivo]);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [ferramentaAtual, setFerramentaAtual] = useState("");
  // Grupo/módulo do menu de onde a análise foi selecionada. Precisa acompanhar
  // ferramentaAtual porque o mesmo nome de análise pode existir em mais de um
  // módulo (ex: "Teste de normalidade" aparece em Análises Diversas E em
  // Análises de Capabilidade) — sem saber QUAL módulo o aluno abriu, não dá
  // pra decidir corretamente se está liberado.
  const [grupoAtual, setGrupoAtual] = useState("");
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeEntry[]>([]);
  const [selectedAnalysisVideo, setSelectedAnalysisVideo] = useState<KnowledgeEntry | null>(null);
  const supportVideoIframeRef = useRef<HTMLIFrameElement>(null);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [showEduVideos, setShowEduVideos] = useState(false);

  // FIX TEMPORÁRIO (pedido do Israel, 2026-08-17): liberado geral pra qualquer
  // aluno, de qualquer consultor/coordenador — o gate antigo comparava contra
  // CURSOS_DATA_ANALYSIS_COMPLETO, uma lista de 4 nomes de curso do Israel, então
  // nenhum aluno de outro consultor nunca batia e ficava com tudo bloqueado.
  // Isso volta a ser configurável por consultor no sistema de "análises visíveis"
  // (ver memória plano-videos-analises-por-consultor.md) — até lá, fica aberto.
  // Permissão POR MÓDULO (grupo do menu), definida pelo consultor em cada aluno
  // (acessoProdutos.analytics). Ausente = aluno legado, de antes desse controle:
  // continua com tudo liberado, pra não tirar acesso de ninguém em silêncio.
  // Admin e consultor sempre veem tudo (administram o catálogo).
  const modulosLiberados = acessoProdutos?.analytics;
  const grupoLiberado = (grupo: string) => {
    if (isAdmin || isConsultor) return true;
    if (!Array.isArray(modulosLiberados)) return true; // legado
    const modulo = ANALYTICS_MODULOS.find((m) => m.grupo === grupo);
    // Grupo novo, ainda não classificado: trata como restrito pra não vazar sem querer.
    if (!modulo) return false;
    return acessoAnalyticsDoAluno(modulosLiberados, modulo).liberado;
  };

  // Trava por GRUPO, não por nome de análise. Um mesmo nome pode existir em mais
  // de um módulo (ex: "Teste de normalidade" está em Análises Diversas E em
  // Análises de Capabilidade) — com a versão antiga, bastava UM desses módulos
  // estar liberado pra destravar o nome em TODO lugar, inclusive dentro do menu
  // de um módulo que o aluno não comprou. Resultado visível: abrir "Estatística
  // Básica" sem tê-la liberada e ver alguns itens destravados (os que também
  // pertencem a outro módulo liberado) e outros travados — parecia aleatório.
  // Agora cada item obedece só o módulo do menu em que está sendo mostrado.
  const isAnalysisLocked = (grupo: string) => !grupoLiberado(grupo);

  const abrirAnaliseBloqueada = (grupo: string) => {
    const modulo = ANALYTICS_MODULOS.find((item) => item.grupo === grupo);
    const recursoNome = modulo?.nome || grupo;
    const courseName = modulo ? getCourseNameForAnalyticsModule(modulo.id) : undefined;
    const course = courseName
      ? cursosOferta.find((item) => courseNamesMatch(item.name, courseName))
      : undefined;

    const usarPadraoIsrael = resolveConsultorId() === 'israel';

    if (course && courseName) {
      const padrao = getCourseOfferDefaults(courseName);
      const precoVenda = Number(course.precoVenda ?? (usarPadraoIsrael ? padrao.precoSugerido : 0) ?? 0);
      const hotmartCheckoutUrl = String(course.hotmartCheckoutUrl || (usarPadraoIsrael ? padrao.checkoutSugerido : '') || '');
      const vendaAtiva = course.vendaAtiva ?? Boolean(usarPadraoIsrael && padrao.checkoutSugerido);
      if (vendaAtiva && precoVenda > 0 && hotmartCheckoutUrl.startsWith('https://pay.hotmart.com/')) {
        setCursoParaCompra({ ...course, precoVenda, hotmartCheckoutUrl });
        return;
      }
    }

    // Módulo sem curso avulso — hoje só 'exploratoria', que não está em
    // COURSE_NAME_BY_ANALYTICS_MODULE. No tenant da LBW ele abre o popup
    // comercial com os três planos em vez de pedir acesso ao consultor.
    if (usarPadraoIsrael) {
      setCursoParaCompra({ name: recursoNome, precoVenda: 0, hotmartCheckoutUrl: '' } as Initiative);
      return;
    }

    setLockedAnaliseNome(recursoNome);
    setLockedAnalisePopupOpen(true);
  };

  // Vídeos educacionais FIXOS sobre como usar variáveis X e Y na aba Data Analysis.
  // Aparecem sempre, independente da análise selecionada. Click → toca no player inline.
  const EDU_VIDEO_URLS = [
    'https://youtu.be/zFhaxlzzeiI',  // Relação de causa e efeito
    'https://youtu.be/37Lkea50zOY',  // Mapa de Análise Estatística Parte 1
    'https://youtu.be/alx-f4QOO9E',  // Mapa de análise Estatística - Parte 2
    'https://youtu.be/WKxwkFZ8isg',  // Escolha da melhor ferramenta
  ];
  const [modoGageRR, setModoGageRR] = useState<"gerar" | "analisar" | null>(null);
  const [gageRRConfig, setGageRRConfig] = useState({
    n_pecas: 10,
    n_operadores: 3,
    n_replicas: 3,
    ordem: "aleatorio"
  });
  const [isGerandoPlanilha, setIsGerandoPlanilha] = useState(false);
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [results, setResults] = useState<AnalysisResult[]>([]);
  // Estados SEPARADOS por ação. Antes os dois botões ("Enviar Análise" e
  // "Perguntar") liam a mesma flag, então rodar um deixava o outro travado em
  // "processando" — parecia que os dois estavam trabalhando ao mesmo tempo.
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPerguntando, setIsPerguntando] = useState(false);
  const defaultPlotlyConfig = (dados?: any): GraficoPersonalizacao => ({
    titulo: dados?.labels?.titulo || '',
    tituloX: dados?.labels?.x || '',
    tituloY: dados?.labels?.y || 'Frequência',
    corBarras: '#3b82f6',
    tamanhoFonte: 12,
    rotacaoX: 0,
    coresPizza: [],
    mostrarTendencia: true,
    mostrarMedia: false,
  });

  const [plotlyConfigs, setPlotlyConfigs] = useState<Record<string, GraficoPersonalizacao>>({});
  const plotlyGraphRefs = useRef<Record<string, any>>({});
  const [graficoPersonalizandoId, setGraficoPersonalizandoId] = useState<string | null>(null);

  const obterPlotlyConfig = (result: AnalysisResult): GraficoPersonalizacao =>
    plotlyConfigs[result.id] || result.configGrafico || defaultPlotlyConfig(result.graficoInterativo);

  const atualizarPlotlyConfig = (
    result: AnalysisResult,
    updater: GraficoPersonalizacao | ((atual: GraficoPersonalizacao) => GraficoPersonalizacao),
  ) => {
    setPlotlyConfigs(prev => {
      const current = prev[result.id] || result.configGrafico || defaultPlotlyConfig(result.graficoInterativo);
      const updated = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [result.id]: updated };
    });
    setTemTrabalhoNaoSalvo(true);
  };
  const [pergunta, setPergunta] = useState("");
  const [modalErro, setModalErro] = useState<string | null>(null);
  const exibirModalErro = (msg: string) => setModalErro(msg);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [activeNestedMenu, setActiveNestedMenu] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const selectRefs = useRef<Record<string, SlimSelect | null>>({});

  useEffect(() => {
    // Initialize SlimSelect for multi-selects
    if (ferramentaAtual) {
      if (ferramentaAtual !== "Gage R&R") {
        setModoGageRR(null);
      }
      setTimeout(() => {
        requiredFields.forEach(campo => {
          const tipo = typeof campo === 'string' ? campo : campo.tipo;
          const internalKey = mapaCampos[tipo] || tipo;
          const isMulti = internalKey.startsWith('lista_');
          if (isMulti) {
            const el = document.getElementById(`select-${internalKey}`) as HTMLSelectElement;
            if (!el) return;
            if (selectRefs.current[internalKey]) {
              selectRefs.current[internalKey]?.destroy();
              selectRefs.current[internalKey] = null;
            }
            selectRefs.current[internalKey] = new SlimSelect({
              select: el,
              settings: {
                placeholderText: 'Selecione...',
                allowDeselect: true,
              },
              events: {
                afterChange: (newVal) => {
                  const values = newVal.map(v => v.value);
                  setToolParams(prev => ({ ...prev, [internalKey]: values }));
                }
              }
            });
          }
        });
      }, 0);
    }
    return () => {
      Object.keys(selectRefs.current).forEach(k => {
        try { selectRefs.current[k]?.destroy(); } catch(e) {}
        selectRefs.current[k] = null;
      });
    };
  }, [ferramentaAtual, columns]);

  useEffect(() => {
    if (ferramentaAtual) {
      const campos = configuracoesFerramentas[ferramentaAtual] || [];
      if (campos.includes("Field_conf")) {
        setToolParams(prev => ({ ...prev, field_conf: prev.field_conf || "95" }));
      }
      if (ferramentaAtual === "Concordância de Atributos") {
        setToolParams(prev => ({ ...prev, ordinal: prev.ordinal || "false" }));
      }
    }
  }, [ferramentaAtual]);

  // ===== Guarda de saída =====
  // Duas frentes, porque o navegador só deixa personalizar uma delas:
  //  1) FECHAR o app / recarregar → só dá pra pedir o aviso genérico do navegador.
  //  2) TROCAR DE ABA dentro da plataforma → intercepta o clique no link ANTES da
  //     navegação (fase de captura) e abre o nosso modal, que oferece salvar.
  // A frente (2) também protege a troca de projeto: para chegar na aba Projetos e
  // trocar o projeto vigente, o aluno precisa passar por aqui primeiro.
  useEffect(() => {
    if (!temTrabalhoNaoSalvo) return;

    const aoFechar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };

    const aoClicar = (evento: MouseEvent) => {
      if (evento.defaultPrevented || evento.button !== 0) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const alvo = evento.target as HTMLElement | null;
      const link = alvo?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute('href') || '';
      // Só interessa navegação interna da plataforma.
      if (!href.startsWith('/') || href.startsWith('//')) return;
      if (link.target === '_blank') return;
      if (href === window.location.pathname) return;

      evento.preventDefault();
      evento.stopPropagation();
      destinoNavegacao.current = href;
      setModalSairSemSalvar(true);
    };

    // Válvula de escape. O interceptor acima engole o clique (capture +
    // stopPropagation); se por qualquer motivo o modal não aparecer, a tela fica
    // sem responder a clique nenhum e parece travada. Esc sempre devolve o
    // controle: fecha o modal e desarma a guarda.
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      destinoNavegacao.current = null;
      setModalSairSemSalvar(false);
    };

    window.addEventListener('beforeunload', aoFechar);
    document.addEventListener('click', aoClicar, true);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('beforeunload', aoFechar);
      document.removeEventListener('click', aoClicar, true);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [temTrabalhoNaoSalvo]);

  const seguirNavegacao = () => {
    const destino = destinoNavegacao.current;
    destinoNavegacao.current = null;
    setModalSairSemSalvar(false);
    setTemTrabalhoNaoSalvo(false); // libera a guarda antes de navegar
    if (destino) window.location.assign(destino);
  };

  const carregarPlanilhaDoProjeto = async (info: PlanilhaInfo) => {
    try {
      const planilhaFile = await baixarPlanilhaProjeto(projetoAtivo!.id, info);
      setFile(planilhaFile);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          updateInterface(wb, firstSheet);
        }
      };
      reader.readAsArrayBuffer(planilhaFile);
    } catch (err: any) {
      console.error('Erro ao carregar planilha do projeto:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      if (wb.SheetNames.length > 0) {
        const firstSheet = wb.SheetNames[0];
        setSelectedSheet(firstSheet);
        updateInterface(wb, firstSheet);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const updateInterface = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) return;

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const cols = jsonData[0] || [];
    setColumns(cols);
    setPreviewData(jsonData.slice(1, 101)); // First 100 rows
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      updateInterface(workbook, sheetName);
    }
  };

  const handleGerarPlanilhaGageRR = async () => {
    // Validações
    if (gageRRConfig.n_pecas < 2 || gageRRConfig.n_pecas > 100) {
      exibirModalErro("⚠ Número de peças deve estar entre 2 e 100.");
      return;
    }
    if (gageRRConfig.n_operadores < 2 || gageRRConfig.n_operadores > 50) {
      exibirModalErro("⚠ Número de operadores deve estar entre 2 e 50.");
      return;
    }
    if (gageRRConfig.n_replicas < 2 || gageRRConfig.n_replicas > 50) {
      exibirModalErro("⚠ Número de réplicas deve estar entre 2 e 50.");
      return;
    }

    setIsGerandoPlanilha(true);
    try {
      const formData = new FormData();
      formData.append("n_pecas", String(gageRRConfig.n_pecas));
      formData.append("n_operadores", String(gageRRConfig.n_operadores));
      formData.append("n_replicas", String(gageRRConfig.n_replicas));
      formData.append("ordem", gageRRConfig.ordem);

      const response = await fetch(`${ANALISES_API}/v2/gerar-planilha-gage-rr`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const erro = await response.json();
        exibirModalErro(`❌ Erro ao gerar planilha: ${erro.erro || response.statusText}`);
        return;
      }

      // Recebe o blob e força download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gage_rr_${gageRRConfig.n_pecas}p_${gageRRConfig.n_operadores}op_${gageRRConfig.n_replicas}r.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      exibirModalErro(`❌ Erro ao gerar planilha: ${error.message}`);
    } finally {
      setIsGerandoPlanilha(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (grupoAtual && isAnalysisLocked(grupoAtual)) {
      setLockedAnalisePopupOpen(true);
      return;
    }

    if (ferramentaAtual === "Gage R&R" && modoGageRR === "gerar") {
      exibirModalErro("⚠ Para gerar a planilha, use o botão 'Gerar Planilha'. Para analisar, escolha o modo 'Analisar Planilha Preenchida'.");
      return;
    }

    if (ferramentaAtual === "Gage R&R" && modoGageRR === null) {
      exibirModalErro("⚠ Escolha um modo: 'Gerar Planilha' ou 'Analisar Planilha Preenchida'.");
      return;
    }

    if (!file) {
      exibirModalErro('⚠ Você precisa enviar um arquivo.');
      return;
    }
    if (!selectedSheet) {
      exibirModalErro('⚠ Você precisa escolher uma aba da planilha.');
      return;
    }
    if (!ferramentaAtual) {
      exibirModalErro('⚠ Você deve selecionar uma análise ou um gráfico.');
      return;
    }

    const ferramentasEmDesenvolvimento: string[] = [];
    if (ferramentasEmDesenvolvimento.includes(ferramentaAtual)) {
      exibirModalErro('⚠️ Esta análise está em desenvolvimento e estará disponível em breve.');
      return;
    }

    logAnalysisRun(ferramentaAtual, projetoAtivo?.id);

    // Só rola DEPOIS de passar por todas as validações — rolar antes levaria o aluno
    // pra baixo bem na hora em que o aviso de erro aparece na parte de cima.
    rolarParaAnalise();

    const config = configuracoesFerramentas[ferramentaAtual] || [];
    const camposSempreOpcionais = ["Subgrupo", "Data", "Z", "Zs"];
    
    const camposOpcionaisPorFerramenta: Record<string, string[]> = {
      "Pareto": ["Y"],
      "Setores (Pizza)": ["Y"],
      "Barras": ["Y"],
      "Intervalo": ["Field_conf"],
      "Tendência": ["Data"],
      "Gage R&R": ["Field_LIE", "Field_LSE"],
      "Concordância de Atributos": ["Field", "Ordinal"],
      "Vício (Bias)": ["Field_LSE", "Field_LIE"],
      "Linearidade": ["Field_LSE", "Field_LIE"],
      "Estabilidade": ["Field_LSE", "Field_LIE"],
      "Método Analítico": ["Field_LSE", "Field_LIE"],
    };

    const missingFields = config.filter(campo => {
      const tipo = typeof campo === 'string' ? campo : campo.tipo;
      if (camposSempreOpcionais.includes(tipo)) return false;
      const opcionaisDaFerramenta = camposOpcionaisPorFerramenta[ferramentaAtual] || [];
      if (opcionaisDaFerramenta.includes(tipo)) return false;
      const internalKey = mapaCampos[tipo] || tipo;
      const val = toolParams[internalKey];
      return !val || (Array.isArray(val) && val.length === 0);
    }).map(campo => typeof campo === 'string' ? campo : campo.label);

    if (missingFields.length > 0) {
      exibirModalErro(`⚠ Preencha todos os campos obrigatórios: ${missingFields.join(", ")}`);
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("arquivo", file);
    formData.append("aba", selectedSheet);
    
    const isGrafico = GRAFICOS_LIST.includes(ferramentaAtual);
    formData.append("ferramenta", isGrafico ? "" : ferramentaAtual);
    formData.append("grafico", isGrafico ? ferramentaAtual : "");

    Object.entries(toolParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else {
        formData.append(key, String(value));
      }
    });

    try {
      let json: any = {};
      const ferramentasApenasInterativas = ["Superfície - 3D", "Dispersão 3D", "Bolhas - 3D", "Intervalo"];
      const isApenasInterativa = ferramentasApenasInterativas.includes(ferramentaAtual);

      if (!isApenasInterativa) {
        const response = await fetch(`${ANALISES_API}/v2/analise`, {
          method: 'POST',
          body: formData
        });

        json = await response.json();
        
        if (!json.analise && !json.grafico_base64 && !json.grafico_isolado_base64) {
          exibirModalErro("⚠️ Nenhuma informação foi retornada. Verifique se escolheu corretamente as opções de análise e seus respectivos campos de preenchimento.");
          return;
        }
      }
      
      let dadosInterativos = null;
      if (FERRAMENTAS_INTERATIVAS.includes(ferramentaAtual)) {
        try {
          const formDataInterativo = new FormData();
          formDataInterativo.append("arquivo", file);
          formDataInterativo.append("aba", selectedSheet);
          formDataInterativo.append("grafico", ferramentaAtual);
          Object.entries(toolParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              formDataInterativo.append(key, value.join(","));
            } else if (value !== undefined && value !== null && value !== "") {
              formDataInterativo.append(key, String(value));
            }
          });

          const responseInterativo = await fetch(
            `${ANALISES_API}/v2/grafico-interativo`,
            { method: 'POST', body: formDataInterativo }
          );
          const resultInterativo = await responseInterativo.json();
          if (!resultInterativo.erro) {
            dadosInterativos = resultInterativo;
          }
        } catch (err) {
          console.error('Erro ao buscar gráfico interativo:', err);
        }
      }

      const novoResultadoId = crypto.randomUUID();
      const newResult: AnalysisResult = {
        id: novoResultadoId,
        analise: json.analise,
        grafico_base64: json.grafico_base64,
        grafico_isolado_base64: json.grafico_isolado_base64,
        timestamp: new Date(),
        tool: ferramentaAtual,
        qa: [],
        toolParams: { ...toolParams },          // ← NOVO
        selectedSheet: selectedSheet,           // ← NOVO
        graficoInterativo: dadosInterativos,
        configGrafico: dadosInterativos ? defaultPlotlyConfig(dadosInterativos) : undefined,
      };

      setResults([newResult, ...results]);
      if (newResult.configGrafico) {
        setPlotlyConfigs((atuais) => ({ ...atuais, [novoResultadoId]: newResult.configGrafico! }));
      }
      setTemTrabalhoNaoSalvo(true);
      // Agora a página tem altura suficiente (o resultado existe): é ESTA rolagem
      // que de fato deixa o botão no topo com a análise logo abaixo.
      rolarParaAnalise();
    } catch (error) {
      console.error("Analysis error:", error);
      exibirModalErro(`❌ Erro ao enviar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const listarProjetosDoAluno = async (): Promise<Project[]> => {
    const lista = (await getUserProjects()) || [];
    const unicos = Array.from(new Map(lista.map((projeto) => [projeto.id, projeto])).values());
    setProjetosDisponiveis(unicos);
    return unicos;
  };

  const prepararSalvamento = async (projeto: Project) => {
    try {
      const planilhaDoDestino = await obterPlanilhaProjeto(projeto.id);
      setProjetoDestinoSalvar(projeto);
      setPlanilhaDestinoSalvar(planilhaDoDestino);

      // Ao trocar de projeto, qualquer planilha existente no destino precisa de
      // confirmação antes de ser substituída, mesmo que o nome do arquivo coincida.
      const trocandoProjeto = projeto.id !== projetoAtivo?.id;
      const arquivoDiferente = !!file && !!planilhaDoDestino && (trocandoProjeto || file.name !== planilhaDoDestino.nome);
      if (arquivoDiferente) {
        setModalSubstituirPlanilha(true);
        return;
      }

      await executarSalvamento(projeto, planilhaDoDestino);
    } catch (err: any) {
      exibirModalErro(`❌ Erro ao preparar o salvamento: ${err.message}`);
    }
  };

  // Mesma condição que o handler valida logo abaixo — extraída para o botão
  // poder ficar desabilitado em vez de deixar clicar e devolver erro.
  const temAlgoParaSalvar = Boolean(file) || results.length > 0;

  const handleSalvarTudo = async () => {
    if (!temAlgoParaSalvar) {
      exibirModalErro('⚠️ Não há nada para salvar. Faça upload de uma planilha ou realize uma análise primeiro.');
      return;
    }

    setSalvandoTudo(true);
    try {
      const projetos = await listarProjetosDoAluno();

      if (projetos.length === 0) {
        setProjetoDestinoId(NOVO_PROJETO_ID);
        setNovoProjetoTitulo('');
        setModalSelecionarProjeto(true);
        return;
      }

      if (projetos.length === 1) {
        await prepararSalvamento(projetos[0]);
        return;
      }

      // Já existe um projeto vigente entre os disponíveis: salva direto nele,
      // sem perguntar onde — a pergunta só faz sentido quando não há projeto
      // selecionado (aluno teria que escolher um dos dele, ou criar um novo).
      const vigenteNaLista = projetoAtivo && projetos.some((projeto) => projeto.id === projetoAtivo.id);
      if (vigenteNaLista) {
        await prepararSalvamento(projetoAtivo!);
        return;
      }

      setProjetoDestinoId(projetos[0].id);
      setNovoProjetoTitulo('');
      setModalSelecionarProjeto(true);
    } catch (err: any) {
      exibirModalErro(`❌ Erro ao carregar seus projetos: ${err.message}`);
    } finally {
      setSalvandoTudo(false);
    }
  };

  const confirmarProjetoDestino = async () => {
    if (salvandoTudo) return;
    setSalvandoTudo(true);
    try {
      let destino: Project | undefined;

      if (projetoDestinoId === NOVO_PROJETO_ID) {
        const titulo = novoProjetoTitulo.trim();
        if (!titulo) {
          exibirModalErro('Informe o título do projeto.');
          return;
        }
        const criado = await createProject(titulo);
        if (!criado?.id) throw new Error('O projeto não pôde ser criado.');
        destino = criado as Project;
        setProjetosDisponiveis((atuais) => [destino!, ...atuais]);
      } else {
        destino = projetosDisponiveis.find((projeto) => projeto.id === projetoDestinoId);
      }

      if (!destino) throw new Error('Selecione um projeto válido.');
      setModalSelecionarProjeto(false);
      await prepararSalvamento(destino);
    } catch (err: any) {
      exibirModalErro(`❌ Erro ao selecionar o projeto: ${err.message}`);
    } finally {
      setSalvandoTudo(false);
    }
  };

  const executarSalvamento = async (
    destino: Project | null = projetoDestinoSalvar,
    planilhaDoDestino: PlanilhaInfo | null = planilhaDestinoSalvar,
  ) => {
    if (!destino) return;
    setSalvandoTudo(true);
    setModalSubstituirPlanilha(false);

    const resumo: string[] = [];

    try {
      let planilhaTimestamp: number | null = planilhaDoDestino?.atualizadaEm?.toMillis?.() || null;
      const mesmoProjeto = destino.id === projetoAtivo?.id;
      const arquivoJaSalvoNesteProjeto = !!file && !!planilhaDoDestino && mesmoProjeto && file.name === planilhaDoDestino.nome;

      if (file && !arquivoJaSalvoNesteProjeto) {
        const info = await salvarPlanilhaProjeto(destino.id, file);
        planilhaTimestamp = Date.now();
        resumo.push(`📁 Planilha: ${info.nome}`);
      }

      if (results.length > 0) {
        const resultadosPreparados = await prepararResultadosComGraficosAtuais();
        const dadosExistentes = await carregarAnalises(destino.id);
        const analisesAtuais = resultadosPreparados.map(r => ({
          id: r.id,
          tool: r.tool,
          toolParams: r.toolParams || {},
          selectedSheet: r.selectedSheet || '',
          analise: r.analise,
          grafico_base64: r.grafico_base64,
          grafico_isolado_base64: r.grafico_isolado_base64,
          graficoPptBase64: r.graficoPptBase64,
          configGrafico: r.configGrafico,
          interpretacao: r.interpretacao,
          qa: r.qa || [],
          timestamp: r.timestamp instanceof Date ? r.timestamp.getTime() : (r.timestamp as any),
          planilhaVersao: planilhaTimestamp,
          graficoInterativo: r.graficoInterativo || null,
        }));
        const porId = new Map((dadosExistentes?.analises || []).map((analise) => [analise.id, analise]));
        analisesAtuais.forEach((analise) => porId.set(analise.id, analise));
        await salvarAnalises(destino.id, Array.from(porId.values()), planilhaTimestamp);
        setResults(resultadosPreparados);
        resumo.push(`📊 ${analisesAtuais.length} análise(s)`);
      }

      if (resumo.length === 0) {
        exibirModalErro('⚠️ Não há nada novo para salvar.');
        return;
      }

      // O projeto só muda globalmente depois que todos os dados foram confirmados.
      setProjetoAtivo(destino);
      setProjetoDestinoSalvar(null);
      setPlanilhaDestinoSalvar(null);
      setTemTrabalhoNaoSalvo(false);

      // Veio do "Salvar e sair": agora que gravou, segue pro destino pretendido.
      if (destinoNavegacao.current) {
        seguirNavegacao();
        return;
      }
      setModalSucessoSalvar(`Salvo em "${destino.name}":\n${resumo.join('\n')}\n\nEste agora é o projeto vigente em toda a plataforma.`);
    } catch (err: any) {
      exibirModalErro(`❌ Erro ao salvar: ${err.message}`);
    } finally {
      setSalvandoTudo(false);
    }
  };

  const handleAskAI = async () => {
    // Feedback claro em vez de falhar em silêncio.
    if (!pergunta.trim()) {
      exibirModalErro("Digite uma pergunta antes de clicar em Perguntar.");
      return;
    }
    if (results.length === 0) {
      exibirModalErro("Gere uma análise ou gráfico primeiro. A pergunta é sobre o resultado já gerado — escolha um gráfico/análise, clique em Executar e depois pergunte aqui.");
      return;
    }

    const result = results[0];
    const formData = new FormData();
    formData.append("pergunta", pergunta);
    formData.append("tipo", result.analise ? "analise" : "grafico");

    setIsPerguntando(true);
    try {
      const response = await fetch(`${ANALISES_API}/v2/pergunta`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Servidor respondeu ${response.status}. ${txt.slice(0, 160)}`);
      }

      const data = await response.json();
      if (data.resposta) {
        setResults(prev => prev.map((r, i) =>
          i === 0
            ? { ...r, qa: [{ question: pergunta, answer: data.resposta }, ...r.qa] }
            : r
        ));
        setPergunta("");
      } else {
        exibirModalErro("A IA não retornou uma resposta. Tente reformular a pergunta.");
      }
    } catch (error) {
      console.error("AI Question error:", error);
      exibirModalErro(`❌ Erro ao enviar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPerguntando(false);
    }
  };

  const capturarGraficoParaPpt = async (result: AnalysisResult): Promise<string | null> => {
    if (!result.graficoInterativo) return null;
    const graphDiv = plotlyGraphRefs.current[result.id];
    if (!graphDiv) return result.graficoPptBase64 || null;

    try {
      // Aguarda o React/Plotly concluir a última alteração visual antes da captura.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return await (PlotlyLib as any).toImage(graphDiv, {
        format: 'png',
        width: 1400,
        height: 800,
        scale: 1,
      });
    } catch (error) {
      console.warn(`[DataAnalysis] Não foi possível capturar o gráfico ${result.id}:`, error);
      return result.graficoPptBase64 || null;
    }
  };

  const prepararResultadosComGraficosAtuais = async (
    fonte: AnalysisResult[] = results,
  ): Promise<AnalysisResult[]> => Promise.all(fonte.map(async (result) => {
    if (!result.graficoInterativo) return result;
    const configGrafico = obterPlotlyConfig(result);
    const graficoPptBase64 = await capturarGraficoParaPpt(result);
    return {
      ...result,
      configGrafico,
      ...(graficoPptBase64
        ? { graficoPptBase64, grafico_isolado_base64: undefined }
        : {}),
    };
  }));

  const requiredFields = ferramentaAtual ? configuracoesFerramentas[ferramentaAtual] : [];

  const FERRAMENTAS_INTERATIVAS = ["Histograma", "Pareto", "Setores (Pizza)", "Barras", "BoxPlot", "Dispersão", "Tendência", "Bolhas - 3D", "Superfície - 3D", "Dispersão 3D", "Intervalo"];

  const construirPlotlyHistograma = (dados: any, corUnica?: string) => {
    if (!dados || !dados.series) return [];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const temVarios = dados.series.length > 1;
    return dados.series.map((serie: any, idx: number) => ({
      x: serie.valores,
      type: 'histogram',
      name: serie.nome,
      opacity: temVarios ? 0.6 : 0.85,
      autobinx: true,
      marker: {
        color: temVarios ? paleta[idx % paleta.length] : (corUnica || paleta[0]),
      },
    }));
  };

  const construirPlotlyPareto = (dados: any, corUnica?: string) => {
    if (!dados || !dados.series) return [];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    return dados.series.map((serie: any, idx: number) => {
      if (serie.tipo_serie === 'cumulativa') {
        return {
          x: serie.categorias,
          y: serie.valores,
          type: 'scatter',
          mode: 'lines+markers',
          name: serie.nome,
          yaxis: 'y2',
          line: { color: '#dc2626', width: 2 },
          marker: { color: '#dc2626', size: 8 },
          hovertemplate: '%{y:.1f}%<extra></extra>',
        };
      }
      return {
        x: serie.categorias,
        y: serie.valores,
        type: 'bar',
        name: serie.nome,
        marker: { color: corUnica || paleta[idx % paleta.length] },
      };
    });
  };

  const construirPlotlyPizza = (dados: any, cores?: string[], tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6', '#f43f5e'];
    const serie = dados.series[0];
    const coresFinais = (cores && cores.length >= serie.labels.length) ? cores : paleta;
    return [{
      labels: serie.labels,
      values: serie.valores,
      type: 'pie',
      textposition: 'inside',
      textinfo: 'label+percent',
      hovertemplate: '%{label}<br>Valor: %{value}<br>%{percent}<extra></extra>',
      marker: { colors: coresFinais },
      textfont: { size: tamanhoFonte || 12 },
      sort: false,
    }];
  };

  const construirPlotlyBarras = (dados: any, corUnica?: string, tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6', '#f43f5e'];
    const temVarios = dados.series.length > 1;
    return dados.series.map((serie: any, idx: number) => ({
      x: serie.categorias,
      y: serie.valores,
      type: 'bar',
      name: serie.nome,
      marker: {
        color: temVarios ? paleta[idx % paleta.length] : (corUnica || paleta[0]),
      },
      textposition: 'outside',
      texttemplate: '%{y}',
      textfont: { size: (tamanhoFonte || 12) - 2 },
    }));
  };

  const construirPlotlyBoxplot = (dados: any, tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6', '#f43f5e'];
    return dados.series.map((serie: any, idx: number) => ({
      y: serie.valores,
      type: 'box',
      name: serie.nome,
      boxmean: false,
      boxpoints: 'outliers',
      marker: {
        color: paleta[idx % paleta.length],
        size: 5,
        symbol: 'circle',
        opacity: 0.7,
      },
      line: { color: paleta[idx % paleta.length], width: 1.5 },
      fillcolor: paleta[idx % paleta.length] + '40',
      whiskerwidth: 0.5,
      showlegend: false,
      hoverinfo: 'y+name',
      hoveron: 'points+boxes',
      hovertemplate: '<b>%{fullData.name}</b><br>Valor: %{y}<extra></extra>',
    }));
  };

  const construirPlotlyDispersao = (dados: any, corUnica?: string, mostrarTendencia: boolean = true, tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6', '#f43f5e'];
    const temVarios = dados.series.length > 1;
    const traces: any[] = [];

    dados.series.forEach((serie: any, idx: number) => {
      const cor = temVarios ? paleta[idx % paleta.length] : (corUnica || paleta[0]);
      // markers
      traces.push({
        x: serie.x,
        y: serie.y,
        type: 'scatter',
        mode: 'markers',
        name: serie.nome,
        legendgroup: serie.nome,
        marker: {
          color: cor,
          size: 9,
          opacity: 0.75,
          line: { color: '#ffffff', width: 1.2 },
        },
        hovertemplate: '<b>%{fullData.name}</b><br>x: %{x}<br>y: %{y}<extra></extra>',
      });
      // linha de tendencia
      if (mostrarTendencia && serie.tendencia) {
        const t = serie.tendencia;
        const sinal = t.intercept >= 0 ? '+' : '−';
        const intAbs = Math.abs(t.intercept).toFixed(3);
        traces.push({
          x: t.x,
          y: t.y,
          type: 'scatter',
          mode: 'lines',
          name: serie.nome + ' (tendência)',
          legendgroup: serie.nome,
          showlegend: false,
          line: { color: cor, width: 2 },
          opacity: 0.85,
          hovertemplate: `y = ${t.slope.toFixed(4)}·x ${sinal} ${intAbs}<br>R² = ${t.r2.toFixed(4)}<extra></extra>`,
        });
      }
    });

    return traces;
  };

  const construirPlotlyTendencia = (dados: any, corUnica?: string, mostrarMedia: boolean = false, tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6', '#f43f5e'];
    const temVarios = dados.series.length > 1;
    const traces: any[] = [];

    dados.series.forEach((serie: any, idx: number) => {
      const cor = temVarios ? paleta[idx % paleta.length] : (corUnica || paleta[0]);
      traces.push({
        x: serie.x,
        y: serie.valores,
        type: 'scatter',
        mode: 'lines+markers',
        name: serie.nome,
        legendgroup: serie.nome,
        line: { color: cor, width: 2, shape: 'linear' },
        marker: {
          color: cor,
          size: 7,
          line: { color: '#ffffff', width: 1 },
        },
        hovertemplate: '<b>%{fullData.name}</b><br>%{x}<br>Valor: %{y}<extra></extra>',
      });
      if (mostrarMedia && serie.x?.length >= 2 && typeof serie.media === 'number') {
        traces.push({
          x: [serie.x[0], serie.x[serie.x.length - 1]],
          y: [serie.media, serie.media],
          type: 'scatter',
          mode: 'lines',
          name: serie.nome + ' (média)',
          legendgroup: serie.nome,
          showlegend: false,
          line: { color: cor, width: 1.2, dash: 'dash' },
          opacity: 0.7,
          hovertemplate: `Média: ${serie.media.toFixed(3)}<extra></extra>`,
        });
      }
    });

    return traces;
  };

  const construirPlotlyBolhas = (dados: any, tamanhoFonte?: number, corUnica?: string) => {
    if (!dados?.series?.length) return [];
    const serie = dados.series[0];
    const temZ = dados.config?.tem_z && serie.z?.length > 0;
    const nomeZ = dados.config?.coluna_z || 'Z';

    return [{
      x: serie.x,
      y: serie.y,
      type: 'scatter',
      mode: 'markers',
      name: serie.nome,
      marker: {
        size: serie.tamanhos,
        sizemode: 'diameter',
        color: temZ ? serie.z : (corUnica || '#3b82f6'),
        colorscale: temZ ? 'Viridis' : undefined,
        showscale: temZ,
        colorbar: temZ ? {
          title: { text: nomeZ, font: { size: (tamanhoFonte || 12) - 1 } },
          thickness: 14,
          len: 0.7,
        } : undefined,
        opacity: 0.75,
        line: { color: '#ffffff', width: 1 },
      },
      hovertemplate: temZ
        ? `<b>${dados.labels?.x || 'X'}: </b>%{x}<br><b>${dados.labels?.y || 'Y'}: </b>%{y}<br><b>${nomeZ}: </b>%{marker.color:.3f}<extra></extra>`
        : `<b>${dados.labels?.x || 'X'}: </b>%{x}<br><b>${dados.labels?.y || 'Y'}: </b>%{y}<extra></extra>`,
    }];
  };

  const construirPlotlyDispersao3D = (dados: any, corUnica?: string, tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const serie = dados.series[0];
    return [{
      x: serie.x,
      y: serie.y,
      z: serie.z,
      type: 'scatter3d',
      mode: 'markers',
      name: serie.nome,
      marker: {
        size: 5,
        color: serie.z,
        colorscale: 'Viridis',
        showscale: true,
        colorbar: {
          title: { text: dados.labels?.z || 'Z', font: { size: (tamanhoFonte || 12) - 1 } },
          thickness: 14,
          len: 0.7,
        },
        opacity: 0.85,
        line: { color: '#ffffff', width: 0.5 },
      },
      hovertemplate: `<b>${dados.labels?.x || 'X'}: </b>%{x}<br><b>${dados.labels?.y || 'Y'}: </b>%{y}<br><b>${dados.labels?.z || 'Z'}: </b>%{z}<extra></extra>`,
    }];
  };

  const construirPlotlySuperficie3D = (dados: any, tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const serie = dados.series[0];
    const traces: any[] = [];
    // superficie interpolada
    traces.push({
      x: serie.x,
      y: serie.y,
      z: serie.z,
      type: 'surface',
      name: serie.nome,
      colorscale: 'Viridis',
      showscale: true,
      colorbar: {
        title: { text: dados.labels?.z || 'Z', font: { size: (tamanhoFonte || 12) - 1 } },
        thickness: 14,
        len: 0.7,
      },
      opacity: 0.92,
      contours: {
        z: { show: true, usecolormap: true, highlightcolor: '#ffffff', project: { z: true } },
      },
      hovertemplate: `<b>${dados.labels?.x || 'X'}: </b>%{x:.3f}<br><b>${dados.labels?.y || 'Y'}: </b>%{y:.3f}<br><b>${dados.labels?.z || 'Z'}: </b>%{z:.3f}<extra></extra>`,
    });
    // pontos originais sobrepostos (referencia visual)
    if (serie.pontos_x?.length) {
      traces.push({
        x: serie.pontos_x,
        y: serie.pontos_y,
        z: serie.pontos_z,
        type: 'scatter3d',
        mode: 'markers',
        name: 'Pontos originais',
        marker: {
          size: 4,
          color: '#ef4444',
          opacity: 0.85,
          line: { color: '#ffffff', width: 0.5 },
        },
        hovertemplate: `<b>${dados.labels?.x || 'X'}: </b>%{x}<br><b>${dados.labels?.y || 'Y'}: </b>%{y}<br><b>${dados.labels?.z || 'Z'}: </b>%{z}<extra></extra>`,
        showlegend: false,
      });
    }
    return traces;
  };

  const construirPlotlyIntervalo = (dados: any, corUnica?: string, tamanhoFonte?: number) => {
    if (!dados?.series?.length) return [];
    const serie = dados.series[0];
    const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6', '#f43f5e'];
    const cats = serie.categorias || [];
    const temVarios = cats.length > 1;
    const cores = cats.map((_: any, i: number) => temVarios ? paleta[i % paleta.length] : (corUnica || paleta[0]));
    const margens = serie.medias.map((m: number, i: number) => serie.ic_superior[i] - m);
    const customdata = cats.map((_: any, i: number) => [
      serie.ns[i],
      serie.dps[i],
      serie.ses[i],
      serie.ic_inferior[i],
      serie.ic_superior[i],
    ]);

    return [{
      x: cats,
      y: serie.medias,
      type: 'scatter',
      mode: 'markers',
      name: serie.nome,
      showlegend: false,
      error_y: {
        type: 'data',
        array: margens,
        visible: true,
        thickness: 2,
        width: 10,
        color: '#374151',
      },
      marker: {
        color: cores,
        size: 14,
        symbol: 'diamond',
        line: { color: '#ffffff', width: 1.5 },
      },
      customdata,
      hovertemplate: '<b>%{x}</b><br>n: %{customdata[0]}<br>Média: %{y:.4f}<br>DP: %{customdata[1]:.4f}<br>SE: %{customdata[2]:.4f}<br>IC inferior: %{customdata[3]:.4f}<br>IC superior: %{customdata[4]:.4f}<extra></extra>',
    }];
  };

  const obterGraficoEstatico = (result: AnalysisResult): string => {
    if (result.graficoPptBase64 && result.graficoPptBase64.length > 50) return result.graficoPptBase64;
    const antigo = Array.isArray(result.grafico_isolado_base64)
      ? result.grafico_isolado_base64.find((item) => typeof item === 'string' && item.length > 50)
      : result.grafico_isolado_base64;
    return typeof antigo === 'string' ? antigo : '';
  };

  const srcGraficoEstatico = (result: AnalysisResult): string => {
    const grafico = obterGraficoEstatico(result);
    return grafico.startsWith('data:image') ? grafico : `data:image/png;base64,${grafico}`;
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#000] font-sans" style={{ fontFamily: '"Segoe UI", Tahoma, sans-serif', fontSize: '13px' }}>
      <LockedToolPopup
        isOpen={lockedAnalisePopupOpen}
        onClose={() => setLockedAnalisePopupOpen(false)}
        recursoNome={lockedAnaliseNome}
      />
      <CoursePurchasePopup
        course={cursoParaCompra}
        onClose={() => setCursoParaCompra(null)}
      />
      {/* Header & Navigation Combined (Internal Workspace Header) */}
      <header className="bg-[#1f2937] text-white px-[20px] py-[10px] flex justify-between items-center border-b border-[#ccc] -mx-8 -mt-8 mb-8">
        <div className="flex items-center gap-[20px]">
          <nav data-tour-id="menu">
            <ul className="list-none m-0 p-0 flex gap-[15px]">
              {Object.keys(configuracoesAnalises).map((grupo) => (
                <li 
                  key={grupo} 
                  className="relative group"
                  onMouseEnter={() => setActiveSubmenu(grupo)}
                  onMouseLeave={() => {
                    setActiveSubmenu(null);
                    setActiveNestedMenu(null);
                  }}
                >
                  {/* Grupo NUNCA fica bloqueado: o aluno abre e vê o que existe.
                      O cadeado aparece só no último nível (a análise em si). */}
                  <button className={cn(
                    "bg-transparent border-none text-[0.85rem] cursor-pointer transition-colors flex items-center gap-1 font-sans font-bold",
                    grupoLiberado(grupo) ? "text-white hover:text-blue-300" : "text-gray-400 hover:text-gray-300"
                  )}>
                    {grupo} <ChevronDown size={12} />
                  </button>
                  
                  <ul className={cn(
                    "absolute left-0 top-full bg-[#f9f9f9] border border-[#ccc] rounded-none shadow-lg z-[60] min-w-[195px]",
                    activeSubmenu === grupo ? "block" : "hidden"
                  )}>
                    {configuracoesAnalises[grupo as keyof typeof configuracoesAnalises].map((item: any) => (
                      <li 
                        key={item.nome} 
                        className="relative group/nested"
                        onMouseEnter={() => item.subitens && setActiveNestedMenu(item.nome)}
                      >
                        {item.subitens ? (
                          <>
                            <div className="flex justify-between items-center px-[12px] py-[4px] text-[0.80rem] bg-[#f9f9f9] text-[#000] hover:bg-gray-200 cursor-pointer transition-colors border-none">
                              {item.nome}
                            </div>
                            <ul className={cn(
                              "absolute left-full top-0 bg-[#f9f9f9] border border-[#ccc] rounded-none shadow-lg min-w-[195px]",
                              activeNestedMenu === item.nome ? "block" : "hidden"
                            )}>
                              {item.subitens.map((sub: string) => {
                                const subLocked = isAnalysisLocked(grupo);
                                return (
                                  <li key={sub}>
                                    <button
                                      onClick={() => {
                                        if (subLocked) { abrirAnaliseBloqueada(grupo); setActiveSubmenu(null); setActiveNestedMenu(null); return; }
                                        setFerramentaAtual(sub);
                                        setGrupoAtual(grupo);
                                        setToolParams({});
                                        setActiveSubmenu(null);
                                        setActiveNestedMenu(null);
                                        setSelectedAnalysisVideo(null);
                                        setShowAllVideos(false);
                                      }}
                                      className="w-full text-left px-[12px] py-[4px] text-[0.80rem] bg-[#f9f9f9] text-[#000] hover:bg-gray-200 transition-colors border-none cursor-pointer no-underline font-sans flex items-center justify-between"
                                    >
                                      <span>{sub}</span>
                                      {subLocked && <Lock size={10} className="text-gray-400 ml-1 flex-shrink-0" />}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        ) : (() => {
                          const itemLocked = isAnalysisLocked(grupo);
                          return (
                            <button
                              onClick={() => {
                                if (itemLocked) { abrirAnaliseBloqueada(grupo); setActiveSubmenu(null); return; }
                                setFerramentaAtual(item.nome);
                                setGrupoAtual(grupo);
                                setToolParams({});
                                setActiveSubmenu(null);
                                setSelectedAnalysisVideo(null);
                                setShowAllVideos(false);
                              }}
                              className="w-full text-left px-[12px] py-[4px] text-[0.80rem] bg-[#f9f9f9] text-[#000] hover:bg-gray-200 transition-colors border-none cursor-pointer no-underline font-sans flex items-center justify-between"
                            >
                              <span>{item.nome}</span>
                              {itemLocked && <Lock size={10} className="text-gray-400 ml-1 flex-shrink-0" />}
                            </button>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {/* Um botão só. Criar e trocar de projeto agora vive apenas na aba
                  Projetos — aqui a única ação é salvar. A criação continua
                  existindo DENTRO do modal de destino, mas só como alternativa a
                  perder o trabalho: quem ainda não tem projeto nenhum precisa de
                  um destino sem sair da tela (sair daqui descarta a análise, é o
                  que o aviso de "salvar antes de sair" protege). */}
              <div className="flex items-center gap-2 pl-3">
                <button
                  data-tour-id="salvar"
                  onClick={handleSalvarTudo}
                  disabled={salvandoTudo || !temAlgoParaSalvar}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033CC] hover:bg-[#1E2D6E] text-white text-[11px] font-black uppercase tracking-widest rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer whitespace-nowrap transition-colors"
                  title={
                    !temAlgoParaSalvar
                      ? 'Faça upload de uma planilha ou gere uma análise para poder salvar'
                      : projetoAtivo
                        ? `Salvar análises no projeto vigente: ${projetoAtivo.name}`
                        : 'Escolher um projeto para salvar as análises'
                  }
                >
                  <Save size={13} />
                  {salvandoTudo ? 'Salvando...' : 'Salvar Projeto'}
                </button>
              </div>
            </ul>
          </nav>
        </div>
      </header>

      {/* So aparece no projeto que gerou a recomendacao: sem esta checagem, o
          aluno troca de projeto aqui dentro e continua vendo a dica do anterior. */}
      {recomendacaoNatureza && recomendacaoNatureza.projectId === projetoAtivo?.id && (
        <div className="mx-[20px] mb-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-black uppercase tracking-widest text-blue-600">Recomendação da Natureza dos Dados</p>
              {recomendacaoNatureza.question && (
                <p className="m-0 mt-1 text-sm font-bold text-slate-900">{recomendacaoNatureza.question}</p>
              )}
              <p className="m-0 mt-2 text-xs text-slate-700">
                <strong>X:</strong> {recomendacaoNatureza.variableX?.name || 'Não informado'}
                <span className="mx-2 text-slate-300">•</span>
                <strong>Y:</strong> {recomendacaoNatureza.variableY?.name || 'Não informado'}
              </p>
              <p className="m-0 mt-1 text-xs text-blue-800">
                <strong>Comece por:</strong> {recomendacaoNatureza.recommendations?.[0]?.tool || recomendacaoNatureza.recommendedTools?.[0] || 'Consulte o menu de análises'}
                {(recomendacaoNatureza.recommendations?.[1]?.tool || recomendacaoNatureza.recommendedTools?.[1]) && (
                  <> · <strong>Segunda opção:</strong> {recomendacaoNatureza.recommendations?.[1]?.tool || recomendacaoNatureza.recommendedTools?.[1]}</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={fecharRecomendacaoNatureza}
              className="rounded-full border-none bg-white p-2 text-slate-500 shadow-sm hover:text-slate-900 cursor-pointer"
              aria-label="Fechar recomendação"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* pt reduzido e space-y menor: o objetivo desta tela é chegar rápido ao botão
          de gerar a análise — cada folga vertical aqui empurra o botão pra fora da
          primeira dobra. */}
      <div className="px-[20px] pb-[20px] pt-[10px] space-y-4">
        {/* File Upload & Sheet Selection
            items-start (não items-end): a coluna da esquerda ganha uma linha extra
            quando há arquivo anexado, e com items-end isso desalinhava o rótulo
            "Aba da Planilha" pra baixo. Alinhando pelo topo, os dois rótulos ficam
            na mesma linha horizontal, com ou sem arquivo. */}
        <div className="flex flex-col md:flex-row gap-x-[24px] gap-y-3 items-start mb-3">
          <div className="flex-1 w-full" data-tour-id="upload">
            <label className="block mb-1 font-bold text-gray-700">Escolha seu arquivo (.xlsx):</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 border border-[#ccc] rounded-[4px] cursor-pointer bg-white p-[5px] h-[38px]"
            />
            {file && (
              <p className="text-[11px] text-green-700 mt-1 font-medium">
                📎 {file.name}
              </p>
            )}
          </div>
          <div className="w-full md:w-[38%]" data-tour-id="sheet">
            <label className="block mb-1 font-bold text-gray-700">Aba da Planilha</label>
            <select
              className="w-full border border-[#ccc] rounded-[4px] p-[8px] bg-white h-[38px] outline-none"
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
            >
              <option value="">Selecione a aba...</option>
              {sheets.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Linha dupla: tour (esquerda) + X/Y educacionais (direita, alinhado com box de análise) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px] mb-4">
          {/* Tour banner — coluna esquerda (mesma largura do preview da tabela abaixo) */}
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-100">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1E2D6E] to-[#0033CC] flex items-center justify-center shrink-0">
                <HelpCircle size={13} className="text-white" />
              </div>
              <p className="text-[11px] font-bold text-[#1E2D6E] m-0">Não sabe por onde começar?</p>
              <button
                onClick={() => setTourOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#1E2D6E] to-[#0033CC] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all border-none cursor-pointer whitespace-nowrap"
              >
                <Sparkles size={11} />
                Iniciar tour
              </button>
            </div>
          </div>

          {/* X/Y Fundamentos — coluna direita (alinhado com box de Análise selecionada) */}
          <div className="lg:col-span-1">
            <div data-tour-id="edu-videos" className="border border-blue-100 rounded-lg overflow-hidden bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setShowEduVideos(s => !s)}
                className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors border-none cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Play size={11} className="text-red-500 shrink-0" />
                  <span className="text-[10px] font-black text-[#1E2D6E] uppercase tracking-widest truncate">
                    Variáveis X e Y · Fundamentos
                  </span>
                  <span className="text-[9px] text-gray-500 shrink-0">· 4 vídeos</span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn("text-[#1E2D6E] transition-transform shrink-0", showEduVideos && "rotate-180")}
                />
              </button>
              {showEduVideos && (
                <div className="p-2 flex flex-col gap-1 border-t border-blue-100">
                  {EDU_VIDEO_URLS.map(url => {
                    const video = knowledgeItems.find(v => v.sourceUrl === url);
                    if (!video) return null;
                    const isActive = selectedAnalysisVideo?.id === video.id;
                    return (
                      <button
                        key={url}
                        onClick={() => setSelectedAnalysisVideo(isActive ? null : video)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded border text-[10px] font-bold text-left transition-all cursor-pointer w-full",
                          isActive
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                        )}
                      >
                        <Play size={9} className={isActive ? "text-white flex-shrink-0" : "text-red-500 flex-shrink-0"} />
                        <span className="truncate">{video.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Player inline — aparece DENTRO desse painel quando um vídeo EDU está selecionado */}
              <AnimatePresence>
                {selectedAnalysisVideo && EDU_VIDEO_URLS.includes(selectedAnalysisVideo.sourceUrl) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-blue-100 p-3 bg-white"
                  >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                          <Play size={10} className="text-red-600" />
                        </div>
                        <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight truncate">
                          {selectedAnalysisVideo.title}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedAnalysisVideo(null)}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all cursor-pointer border-none bg-transparent shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div
                      className="relative aspect-video bg-black rounded overflow-hidden"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://iframe.mediadelivery.net/embed/${selectedAnalysisVideo.bunnyLibraryId}/${selectedAnalysisVideo.bunnyVideoId}?autoplay=true&preload=true`}
                        title={selectedAnalysisVideo.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                      {/* Overlays: topo (título/compartilhar) e cantos inferiores (link 🔗 / logo YouTube) */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70, zIndex: 20, pointerEvents: 'auto' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 95, zIndex: 20, pointerEvents: 'auto' }} />
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 320, height: 95, zIndex: 20, pointerEvents: 'auto' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Table Preview and Tool Selection Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]">
          {/* Table Preview */}
          <div className="lg:col-span-2">
            <div id="previewColunas" className="border border-[#ccc] bg-[#f9f9f9] p-[0px] h-[300px] overflow-auto shadow-sm">
              {columns.length > 0 ? (
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#e9ecef]">
                      <th className="border border-[#ccc] px-2 py-2 text-gray-600 text-center w-10">#</th>
                      {columns.map((col, i) => (
                        <th key={i} className="border border-[#ccc] px-2 py-2 min-w-[120px] text-center font-bold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}>
                        <td className="border border-[#ccc] px-2 py-1 text-center text-gray-500">{idx + 1}</td>
                        {columns.map((_, i) => (
                          <td key={i} className="border border-[#ccc] px-2 py-1 min-w-[120px]">
                            {row[i] !== undefined ? String(row[i]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#666] italic">As colunas aparecerão aqui após o upload.</p>
                </div>
              )}
            </div>

            {/* Action Button — Enviar Análise (primary)
                Fica DENTRO da coluna da tabela, logo abaixo dela: assim nasce na mesma
                altura dos vídeos de apoio da coluna da direita. Quando estava após a
                grade inteira, ele era empurrado pra baixo da coluna mais alta (box de
                análise + lista de vídeos) e sumia da primeira dobra.
                Também é a âncora do scroll automático (ver rolarParaAnalise). */}
            <div ref={ancoraAnaliseRef} className="text-center mt-4 scroll-mt-4">
              <button
                data-tour-id="enviar"
                onClick={handleRunAnalysis}
                disabled={isProcessing}
                className={cn(
                  "inline-flex items-center gap-2 px-10 py-3 rounded-lg font-black text-[13px] uppercase tracking-widest text-white",
                  "bg-gradient-to-r from-[#1E2D6E] to-[#0033CC] hover:from-[#0033CC] hover:to-[#1E2D6E]",
                  "shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02]",
                  "transition-all border-none cursor-pointer",
                  isProcessing && "opacity-50 cursor-not-allowed hover:scale-100"
                )}
              >
                {isProcessing ? (
                  <span className="pontinhos">Processando</span>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Enviar Análise
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tool Selection Box */}
          <div className="lg:col-span-1">
            <div id="boxAnalise" data-tour-id="variables" className="border border-[#ccc] bg-white p-[15px] shadow-sm h-[300px] overflow-y-auto">
              <p className="text-[12px] text-gray-500 mb-3">Análise selecionada: <span className="font-bold text-gray-700">{ferramentaAtual || 'Nenhuma'}</span></p>
              
              {ferramentaAtual && (
                <div className="space-y-4">
                  {[].includes(ferramentaAtual) ? (
                    <div className="text-center text-gray-500 italic text-[12px] p-4">
                      ⚠️ Esta análise está em desenvolvimento e estará disponível em breve.
                    </div>
                  ) : ferramentaAtual === "Gage R&R" ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModoGageRR("gerar")}
                          className={cn(
                            "flex-1 py-2 px-3 rounded text-[11px] font-bold border transition-all",
                            modoGageRR === "gerar"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          Gerar Planilha de Coleta
                        </button>
                        <button
                          onClick={() => setModoGageRR("analisar")}
                          className={cn(
                            "flex-1 py-2 px-3 rounded text-[11px] font-bold border transition-all",
                            modoGageRR === "analisar"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          Analisar Planilha Preenchida
                        </button>
                      </div>

                      {modoGageRR === null && (
                        <div className="text-center text-gray-500 italic text-[11px] p-4">
                          Escolha um dos dois modos acima para continuar.
                        </div>
                      )}

                      {modoGageRR === "gerar" && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="block font-bold text-[12px]">Número de peças</label>
                            <input
                              type="number"
                              min={2} max={100}
                              value={gageRRConfig.n_pecas}
                              onChange={(e) => setGageRRConfig(prev => ({ ...prev, n_pecas: parseInt(e.target.value) || 0 }))}
                              className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block font-bold text-[12px]">Número de operadores</label>
                            <input
                              type="number"
                              min={2} max={50}
                              value={gageRRConfig.n_operadores}
                              onChange={(e) => setGageRRConfig(prev => ({ ...prev, n_operadores: parseInt(e.target.value) || 0 }))}
                              className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block font-bold text-[12px]">Número de réplicas</label>
                            <input
                              type="number"
                              min={2} max={50}
                              value={gageRRConfig.n_replicas}
                              onChange={(e) => setGageRRConfig(prev => ({ ...prev, n_replicas: parseInt(e.target.value) || 0 }))}
                              className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block font-bold text-[12px]">Ordem das medições</label>
                            <select
                              value={gageRRConfig.ordem}
                              onChange={(e) => setGageRRConfig(prev => ({ ...prev, ordem: e.target.value }))}
                              className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                            >
                              <option value="aleatorio">Aleatória</option>
                              <option value="sequencial">Sequencial</option>
                            </select>
                          </div>
                          <button
                            onClick={handleGerarPlanilhaGageRR}
                            disabled={isGerandoPlanilha}
                            className={cn(
                              "w-full bg-[#10b981] text-white py-2 rounded text-[12px] font-bold hover:bg-[#059669] transition-all",
                              isGerandoPlanilha && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {isGerandoPlanilha ? "Gerando..." : "Gerar Planilha"}
                          </button>
                        </div>
                      )}

                      {modoGageRR === "analisar" && (
                        <div className="space-y-4">
                          {requiredFields.map((campo: any) => {
                            const tipo = typeof campo === 'string' ? campo : campo.tipo;
                            const labelTexto = typeof campo === 'string' ? `Variável ${campo}` : `Variável ${campo.label}`;
                            const internalKey = mapaCampos[tipo] || tipo;
                            const isMulti = internalKey.startsWith('lista_');
                            const isNumeric = ["field", "field_conf", "field_LSE", "field_LIE"].includes(internalKey);
                            const isDist = internalKey === "field_dist";

                            return (
                              <div key={tipo} className="space-y-1">
                                <label className="block font-bold text-[12px]">{labelTexto}</label>
                                {isDist ? (
                                  <select 
                                    className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                                    value={toolParams[internalKey] || ""}
                                    onChange={(e) => setToolParams(prev => ({ ...prev, [internalKey]: e.target.value }))}
                                  >
                                    <option value="">Selecione...</option>
                                    {["Lognormal", "Exponencial", "Weibull", "Gamma", "Logistica"].map(d => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                ) : isNumeric ? (
                                  <input 
                                    type="number"
                                    className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                                    value={toolParams[internalKey] || ""}
                                    onChange={(e) => setToolParams(prev => ({ ...prev, [internalKey]: e.target.value }))}
                                  />
                                ) : (
                                  <select 
                                    key={ferramentaAtual}
                                    id={`select-${internalKey}`}
                                    multiple={isMulti}
                                    className={cn("w-full border border-[#ccc] rounded p-2 text-[12px] bg-white", isMulti && "h-10")}
                                    {...(isMulti ? {} : {
                                      value: toolParams[internalKey] || "",
                                      onChange: (e) => setToolParams(prev => ({ ...prev, [internalKey]: e.target.value }))
                                    })}
                                  >
                                    {!isMulti && <option value="">(Nenhum)</option>}
                                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : requiredFields.map(campo => {
                    const tipo = typeof campo === 'string' ? campo : campo.tipo;
                    const labelTexto = typeof campo === 'string' ? `Variável ${campo}` : `Variável ${campo.label}`;
                    const internalKey = mapaCampos[tipo] || tipo;
                    const isMulti = internalKey.startsWith('lista_');
                    const isNumeric = ["field", "field_conf", "field_LSE", "field_LIE"].includes(internalKey)
                                      && !(ferramentaAtual === "Concordância de Atributos" && internalKey === "field");
                    const isDist = internalKey === "field_dist";
                    const isCheckbox = internalKey === "ordinal";

                    return (
                      <div key={tipo} className="space-y-1">
                        {isCheckbox ? (
                          <label className="flex items-center gap-2 cursor-pointer text-[12px]">
                            <input
                              type="checkbox"
                              checked={toolParams[internalKey] === "true"}
                              onChange={(e) => setToolParams(prev => ({ ...prev, [internalKey]: e.target.checked ? "true" : "false" }))}
                              className="w-4 h-4"
                            />
                            <span>{labelTexto.replace("Variável ", "")}</span>
                          </label>
                        ) : (
                          <label className="block font-bold text-[12px]">{labelTexto}</label>
                        )}
                        {!isCheckbox && (isDist ? (
                          <select 
                            className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                            value={toolParams[internalKey] || ""}
                            onChange={(e) => setToolParams(prev => ({ ...prev, [internalKey]: e.target.value }))}
                          >
                            <option value="">Selecione...</option>
                            {["Lognormal", "Exponencial", "Weibull", "Gamma", "Logistica"].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        ) : isNumeric ? (
                          <input 
                            type="number"
                            className="w-full border border-[#ccc] rounded p-2 text-[12px]"
                            value={toolParams[internalKey] || ""}
                            onChange={(e) => setToolParams(prev => ({ ...prev, [internalKey]: e.target.value }))}
                          />
                        ) : (
                          <select 
                            key={ferramentaAtual}
                            id={`select-${internalKey}`}
                            multiple={isMulti}
                            className={cn("w-full border border-[#ccc] rounded p-2 text-[12px] bg-white", isMulti && "h-10")}
                            {...(isMulti ? {} : {
                              value: toolParams[internalKey] || "",
                              onChange: (e) => setToolParams(prev => ({ ...prev, [internalKey]: e.target.value }))
                            })}
                          >
                            {!isMulti && <option value="">(Nenhum)</option>}
                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              {!ferramentaAtual && (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-gray-400 italic text-center">Selecione uma ferramenta no menu superior</p>
                </div>
              )}
            </div>

            {/* Vídeos de apoio (botões compactos abaixo do box) */}
            {ferramentaAtual && (() => {
              const analiseId = ANALISE_NOME_PARA_ID[ferramentaAtual];
              // Filtra vídeos vinculados à análise e DEDUPLICA por sourceUrl —
              // o mesmo vídeo pode estar replicado em várias trilhas (cada placement
              // é um doc separado no Firestore, mesmo URL). Sem dedup, aparece duplicado.
              const videosTodos = analiseId
                ? knowledgeItems.filter(v => v.associatedAnalyses?.includes(analiseId))
                : [];
              const vistosUrl = new Set<string>();
              const videos = videosTodos.filter(v => {
                if (!v.sourceUrl || vistosUrl.has(v.sourceUrl)) return false;
                vistosUrl.add(v.sourceUrl);
                return true;
              });
              if (videos.length === 0) return null;
              const visibleVideos = showAllVideos ? videos : videos.slice(0, 3);
              return (
                <div className="mt-2" data-tour-id="videos">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-[1px] flex-1 bg-gray-200"></div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Play size={9} className="text-red-500" /> Vídeos de Apoio
                    </span>
                    <div className="h-[1px] flex-1 bg-gray-200"></div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {visibleVideos.map(video => (
                      <button
                        key={video.id}
                        onClick={() => setSelectedAnalysisVideo(
                          selectedAnalysisVideo?.id === video.id ? null : video
                        )}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded border text-[10px] font-bold text-left transition-all cursor-pointer w-full",
                          selectedAnalysisVideo?.id === video.id
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                        )}
                      >
                        <Play size={9} className={selectedAnalysisVideo?.id === video.id ? "text-white flex-shrink-0" : "text-red-500 flex-shrink-0"} />
                        <span className="truncate">{video.title}</span>
                      </button>
                    ))}
                    {videos.length > 3 && (
                      <button
                        onClick={() => setShowAllVideos(!showAllVideos)}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-700 text-left px-1 mt-0.5 flex items-center gap-1 cursor-pointer border-none bg-transparent"
                      >
                        <ChevronRight size={10} className={showAllVideos ? "rotate-90 transition-transform" : "transition-transform"} />
                        {showAllVideos ? "Ver menos" : `Ver mais ${videos.length - 3} vídeo(s)`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Player de vídeo inline — só pra vídeos de apoio (não os 4 educacionais que tocam acima) */}
            <AnimatePresence>
              {selectedAnalysisVideo && !EDU_VIDEO_URLS.includes(selectedAnalysisVideo.sourceUrl) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="border border-blue-100 bg-white rounded-[6px] p-3 shadow-md mt-2"
                >
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-50 rounded-full flex items-center justify-center">
                        <Play size={12} className="text-red-600" />
                      </div>
                      <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight truncate max-w-[200px]">
                        {selectedAnalysisVideo.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => supportVideoIframeRef.current?.requestFullscreen?.()}
                        className="text-[10px] text-blue-500 hover:text-blue-700 font-bold border border-blue-200 rounded px-2 py-0.5 bg-transparent cursor-pointer"
                      >
                        ⛶ Tela cheia
                      </button>
                      <button
                        onClick={() => setSelectedAnalysisVideo(null)}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all cursor-pointer border-none bg-transparent"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div
                    className="relative aspect-video bg-black rounded overflow-hidden"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <iframe
                      ref={supportVideoIframeRef}
                      width="100%"
                      height="100%"
                      src={`https://iframe.mediadelivery.net/embed/${selectedAnalysisVideo.bunnyLibraryId}/${selectedAnalysisVideo.bunnyVideoId}?autoplay=true&preload=true`}
                      title={selectedAnalysisVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    />
                    {/* Overlays: topo (título/compartilhar) e cantos inferiores (link 🔗 / logo YouTube) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70, zIndex: 20, pointerEvents: 'auto' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 95, zIndex: 20, pointerEvents: 'auto' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 320, height: 95, zIndex: 20, pointerEvents: 'auto' }} />
                  </div>
                  {selectedAnalysisVideo.summary && selectedAnalysisVideo.summary.length > 0 && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Clock size={9} className="text-blue-500" /> Índice
                      </p>
                      <div className="flex flex-col gap-0.5 max-h-[100px] overflow-y-auto">
                        {selectedAnalysisVideo.summary.map((ch, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => seekBunnyVideo(supportVideoIframeRef.current, tempoParaSegundos(ch.time))}
                            className="flex items-center gap-2 text-[10px] hover:bg-blue-50 rounded px-1 py-0.5 transition-colors text-left bg-transparent border-none cursor-pointer w-full"
                          >
                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[9px] flex-shrink-0">
                              {ch.time}
                            </span>
                            <span className="text-gray-600 truncate">{ch.topic}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Question Section — Perguntar (secondary) */}
        <div data-tour-id="perguntar" className="flex flex-col md:flex-row md:items-center gap-0 border border-blue-100 rounded-lg overflow-hidden bg-white shadow-sm">
          <label className="font-bold px-4 py-2.5 bg-blue-50 border-r border-blue-100 text-[12px] text-[#1E2D6E] md:whitespace-nowrap">
            Faça sua pergunta (baseada na última análise/gráfico que você realizou):
          </label>
          <input
            type="text"
            className="flex-1 px-3 py-2.5 bg-white outline-none text-[13px]"
            placeholder="Digite sua pergunta..."
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
          />
          <button
            onClick={handleAskAI}
            disabled={isPerguntando}
            className="inline-flex items-center gap-2 bg-[#0033CC] hover:bg-[#1E2D6E] text-white px-6 py-2.5 transition-colors font-black text-[12px] uppercase tracking-widest border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles size={13} className={isPerguntando ? 'animate-spin' : ''} />
            {isPerguntando ? 'Perguntando…' : 'Perguntar'}
          </button>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
          {/* Analysis Column */}
          <div className="flex flex-col">
            <h2 className="font-bold text-[1.2rem] mb-3 text-center">Análise Estatística</h2>
            <div id="conteudoAnalise" className="flex-1 border border-[#ccc] bg-white p-[20px] min-h-[400px] shadow-sm rounded-[4px]">
              {results.length > 0 && results.some(r => r.analise || r.grafico_base64 || (r.qa.length > 0 && r.analise)) ? (
                <div className="space-y-4">
                  {results.filter(r => r.analise || r.grafico_base64 || (r.qa.length > 0 && r.analise)).map((result, idx) => (
                    <div key={result.id} className={cn("space-y-4", idx > 0 && "mt-8 pt-8 border-t border-gray-200")}>
                      <h3 className="font-bold text-[1rem] text-gray-700 bg-gray-50 p-2 rounded mb-4">📊 {result.tool || 'Análise'}</h3>
                      {result.analise && result.qa.length > 0 && (
                        <div className="space-y-4 mb-6">
                          {result.qa.map((qa, i) => (
                            <div key={i} style={{ border: '1px solid #007bff', padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>
                              <p><strong>Pergunta: {qa.question}</strong></p>
                              <br />
                              <p><strong>Resposta: </strong><span dangerouslySetInnerHTML={{ __html: qa.answer.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>") }} /></p>
                            </div>
                          ))}
                        </div>
                      )}
                      {result.analise && (
                        <div 
                          className="whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: result.analise
                              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                              .replace(/📊/g, "<span class='inline-block mr-2'>📊</span>")
                              .replace(/🔹/g, "<span class='inline-block mr-2 text-blue-500'>🔹</span>")
                              .replace(/🔎/g, "<span class='inline-block mr-2 text-blue-500'>🔎</span>")
                              .replace(/\n/g, "<br>") 
                          }}
                        />
                      )}
                      {result.grafico_base64 && (
                        <div className="mt-6 border border-gray-100 p-2 rounded bg-white">
                          <img 
                            src={`data:image/png;base64,${result.grafico_base64}`} 
                            alt="Resultado Gráfico Base" 
                            className="max-w-full h-auto mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <AlertCircle size={40} strokeWidth={1} />
                  <p className="italic">Os resultados da análise aparecerão aqui.</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart Column */}
          <div className="flex flex-col">
            <div className="flex items-center justify-center mb-3 relative">
              <h2 className="font-bold text-[1.2rem] text-center">Gráfico</h2>
              <button
                onClick={async () => {
                  if (!projetoAtivo) {
                    alert('Selecione um projeto primeiro');
                    return;
                  }
                  if (results.length === 0) {
                    alert('Nenhuma análise para exportar');
                    return;
                  }
                  try {
                    const resultadosPreparados = await prepararResultadosComGraficosAtuais();
                    await exportStatisticalAnalysisSlide(
                      projetoAtivo as any,
                      { analyses: resultadosPreparados },
                      ''
                    );
                  } catch (e) {
                    console.error(e);
                    alert('Erro ao gerar slide. Tente novamente.');
                  }
                }}
                data-tour-id="ppt"
                className="absolute right-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-[#1E2D6E] text-[#1E2D6E] hover:text-white rounded-md font-black text-[11px] uppercase tracking-widest transition-all border border-[#1E2D6E] cursor-pointer"
                title="Gerar apresentação PPT das análises"
              >
                <FileDown size={12} />
                PPT
              </button>
            </div>
            <div id="conteudoGrafico" className="flex-1 border border-[#ccc] bg-white p-[20px] min-h-[400px] shadow-sm rounded-[4px] relative">
              {results.length > 0 && results.some(r => (!r.analise && r.qa.length > 0) || r.graficoInterativo || obterGraficoEstatico(r)) ? (
                <div className="flex flex-col items-center">
                  {results.filter(r => (!r.analise && r.qa.length > 0) || r.graficoInterativo || obterGraficoEstatico(r)).map((result, idx) => (
                    <div key={result.id} className={cn("w-full flex flex-col items-center", idx > 0 && "mt-8 pt-8 border-t border-gray-200")}>
                      <h3 className="font-bold text-[1rem] text-gray-700 bg-gray-50 p-2 rounded mb-4 w-full text-left">📊 {result.tool || 'Gráfico'}</h3>
                      {!result.analise && result.qa.length > 0 && (
                        <div className="w-full space-y-4 mb-6">
                          {result.qa.map((qa, i) => (
                            <div key={i} style={{ border: '1px solid #007bff', padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>
                              <p><strong>Pergunta: {qa.question}</strong></p>
                              <br />
                              <p><strong>Resposta: </strong><span dangerouslySetInnerHTML={{ __html: qa.answer.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>") }} /></p>
                            </div>
                          ))}
                        </div>
                      )}
                      {(result.graficoInterativo || obterGraficoEstatico(result)) && (
                        <>
                          {result.graficoInterativo ? (
                            <div className="w-full bg-white rounded">
                              <div className="flex gap-3">
                                {/* Gráfico à esquerda */}
                                <div className="flex-1 min-w-0">
                                  <Plot
                                    key={`${result.id}-${JSON.stringify(obterPlotlyConfig(result))}`}
                                    data={(() => {
                                      const cfg = obterPlotlyConfig(result);
                                      if (result.graficoInterativo?.tipo === 'pareto') return construirPlotlyPareto(result.graficoInterativo, cfg.corBarras);
                                      if (result.graficoInterativo?.tipo === 'pizza') return construirPlotlyPizza(result.graficoInterativo, cfg.coresPizza?.length ? cfg.coresPizza : undefined, cfg.tamanhoFonte);
                                      if (result.graficoInterativo?.tipo === 'barras') return construirPlotlyBarras(result.graficoInterativo, cfg.corBarras, cfg.tamanhoFonte);
                                      if (result.graficoInterativo?.tipo === 'boxplot') return construirPlotlyBoxplot(result.graficoInterativo, cfg.tamanhoFonte);
                                      if (result.graficoInterativo?.tipo === 'dispersao') return construirPlotlyDispersao(result.graficoInterativo, cfg.corBarras, cfg.mostrarTendencia ?? true, cfg.tamanhoFonte);
                                      if (result.graficoInterativo?.tipo === 'tendencia') return construirPlotlyTendencia(result.graficoInterativo, cfg.corBarras, cfg.mostrarMedia ?? false, cfg.tamanhoFonte);
                                      if (result.graficoInterativo?.tipo === 'bolhas') return construirPlotlyBolhas(result.graficoInterativo, cfg.tamanhoFonte, cfg.corBarras);
                                      if (result.graficoInterativo?.tipo === 'dispersao3d') return construirPlotlyDispersao3D(result.graficoInterativo, cfg.corBarras, cfg.tamanhoFonte);
                                      if (result.graficoInterativo?.tipo === 'superficie3d') return construirPlotlySuperficie3D(result.graficoInterativo, cfg.tamanhoFonte);
                                      if (result.graficoInterativo?.tipo === 'intervalo') return construirPlotlyIntervalo(result.graficoInterativo, cfg.corBarras, cfg.tamanhoFonte);
                                      return construirPlotlyHistograma(result.graficoInterativo, cfg.corBarras);
                                    })()}
                                    layout={{
                                      title: {
                                        text: obterPlotlyConfig(result).titulo || result.graficoInterativo.labels?.titulo || (result.graficoInterativo?.tipo === 'pareto' ? 'Pareto' : 'Histograma'),
                                        font: { size: obterPlotlyConfig(result).tamanhoFonte + 4 },
                                        x: 0.5,
                                        xanchor: 'center',
                                        y: 0.92,
                                        yanchor: 'top',
                                      },
                                      xaxis: {
                                        title: {
                                          text: obterPlotlyConfig(result).tituloX || result.graficoInterativo.labels?.x || '',
                                          font: { size: obterPlotlyConfig(result).tamanhoFonte },
                                          standoff: Math.abs(obterPlotlyConfig(result).rotacaoX || 0) > 0 ? 60 : 20,
                                        },
                                        tickfont: { size: obterPlotlyConfig(result).tamanhoFonte - 2 },
                                        tickangle: obterPlotlyConfig(result).rotacaoX || 0,
                                        automargin: true,
                                        visible: result.graficoInterativo?.tipo !== 'pizza',
                                      },
                                      yaxis: {
                                        title: { text: obterPlotlyConfig(result).tituloY || result.graficoInterativo.labels?.y || 'Frequência', font: { size: obterPlotlyConfig(result).tamanhoFonte } },
                                        tickfont: { size: obterPlotlyConfig(result).tamanhoFonte - 2 },
                                        visible: result.graficoInterativo?.tipo !== 'pizza',
                                        ...(result.graficoInterativo?.tipo === 'pareto' && (() => {
                                          const total = result.graficoInterativo.config?.total || 1;
                                          const max = total * 1.05;
                                          const step = max / 5;
                                          const vals = [0, step, step * 2, step * 3, step * 4, step * 5];
                                          return {
                                            range: [0, max],
                                            tickmode: 'array',
                                            tickvals: vals,
                                            ticktext: vals.map((v) => (v <= 100 ? Math.round(v).toString() : '')),
                                          };
                                        })()),
                                      },
                                      barmode: result.graficoInterativo?.tipo === 'pareto' || result.graficoInterativo?.tipo === 'barras'
                                        ? (result.graficoInterativo.config?.barmode || 'group')
                                        : result.graficoInterativo?.tipo === 'boxplot'
                                        ? 'group'
                                        : 'overlay',
                                      bargap: 0.05,
                                      autosize: true,
                                      margin: (() => {
                                        const tipo = result.graficoInterativo?.tipo;
                                        const isTresD = tipo === 'dispersao3d' || tipo === 'superficie3d';
                                        return {
                                          l: isTresD ? 0 : 60,
                                          r: tipo === 'bolhas' && result.graficoInterativo?.config?.tem_z ? 110 : (isTresD ? 0 : 70),
                                          t: 100,
                                          b: isTresD ? 0 : (Math.abs(obterPlotlyConfig(result).rotacaoX || 0) > 0 ? 160 : 100),
                                        };
                                      })(),
                                      ...((result.graficoInterativo?.tipo === 'dispersao3d' || result.graficoInterativo?.tipo === 'superficie3d') && {
                                        scene: {
                                          xaxis: { title: { text: obterPlotlyConfig(result).tituloX || result.graficoInterativo.labels?.x || 'X', font: { size: obterPlotlyConfig(result).tamanhoFonte } } },
                                          yaxis: { title: { text: obterPlotlyConfig(result).tituloY || result.graficoInterativo.labels?.y || 'Y', font: { size: obterPlotlyConfig(result).tamanhoFonte } } },
                                          zaxis: { title: { text: result.graficoInterativo.labels?.z || 'Z', font: { size: obterPlotlyConfig(result).tamanhoFonte } } },
                                          camera: { eye: { x: 1.6, y: 1.6, z: 1.0 } },
                                          aspectmode: 'cube',
                                        },
                                      }),
                                      showlegend: result.graficoInterativo.series?.length > 1 && result.graficoInterativo?.tipo !== 'pareto',
                                      legend: {
                                        orientation: 'h',
                                        y: Math.abs(obterPlotlyConfig(result).rotacaoX || 0) > 0 ? -0.50 : -0.30,
                                        yanchor: 'top',
                                      },
                                      ...(result.graficoInterativo?.tipo === 'pareto' && {
                                        yaxis2: {
                                          title: { text: '% Cumulativa', font: { size: obterPlotlyConfig(result).tamanhoFonte }, standoff: 15 },
                                          overlaying: 'y',
                                          side: 'right',
                                          range: [0, 105],
                                          ticksuffix: '%',
                                          tickfont: { size: obterPlotlyConfig(result).tamanhoFonte - 2 },
                                          nticks: 6,
                                          showgrid: false,
                                          automargin: true,
                                        },
                                      }),
                                    }}
                                    style={{ width: '100%', height: '450px' }}
                                    config={{
                                      responsive: true,
                                      displaylogo: false,
                                      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
                                      toImageButtonOptions: { format: 'png', filename: 'histograma' },
                                    }}
                                    useResizeHandler={true}
                                    onInitialized={(_figure: any, graphDiv: any) => { plotlyGraphRefs.current[result.id] = graphDiv; }}
                                    onUpdate={(_figure: any, graphDiv: any) => { plotlyGraphRefs.current[result.id] = graphDiv; }}
                                  />

                                  {/* Estatísticas embaixo do gráfico (compatível com formato antigo e novo) */}
                                  {(() => {
                                    const est = result.graficoInterativo.estatisticas;
                                    const g = est?.global || est;
                                    if (!g || g.n === undefined) return null;
                                    return (
                                      <div className="mt-2 text-[11px] text-gray-600 grid grid-cols-3 gap-2 px-3 pb-2">
                                        <div><strong>n:</strong> {g.n}</div>
                                        <div><strong>Média:</strong> {g.media?.toFixed(2)}</div>
                                        <div><strong>DP:</strong> {g.desvio_padrao?.toFixed(2)}</div>
                                        <div><strong>Mín:</strong> {g.minimo?.toFixed(2)}</div>
                                        <div><strong>Mediana:</strong> {g.mediana?.toFixed(2)}</div>
                                        <div><strong>Máx:</strong> {g.maximo?.toFixed(2)}</div>
                                      </div>
                                    );
                                  })()}

                                  {result.graficoInterativo?.tipo === 'dispersao' && result.graficoInterativo?.config?.tendencia_global && (() => {
                                    const t = result.graficoInterativo.config.tendencia_global;
                                    const sinal = t.intercept >= 0 ? '+' : '−';
                                    const intAbs = Math.abs(t.intercept).toFixed(4);
                                    return (
                                      <div className="mt-2 mx-3 p-2 text-[11px] bg-blue-50 border border-blue-200 rounded">
                                        <div className="font-bold text-gray-700 mb-1">Regressão Linear (global)</div>
                                        <div className="grid grid-cols-3 gap-2 text-gray-700">
                                          <div><strong>n:</strong> {t.n}</div>
                                          <div><strong>R (Pearson):</strong> {t.r?.toFixed(4)}</div>
                                          <div><strong>R²:</strong> {t.r2?.toFixed(4)}</div>
                                          <div className="col-span-3"><strong>Equação:</strong> y = {t.slope?.toFixed(4)} · x {sinal} {intAbs}</div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {result.graficoInterativo?.tipo === 'intervalo' && result.graficoInterativo?.series?.[0] && (() => {
                                    const s = result.graficoInterativo.series[0];
                                    const nivel = result.graficoInterativo.config?.nivel_confianca || 95;
                                    return (
                                      <div className="mt-2 mx-3 p-2 text-[11px] bg-blue-50 border border-blue-200 rounded">
                                        <div className="font-bold text-gray-700 mb-1">Intervalos de Confiança ({nivel}%)</div>
                                        <div className="overflow-x-auto">
                                          <table className="text-[11px] border-collapse w-full">
                                            <thead>
                                              <tr className="bg-blue-100">
                                                <th className="border border-gray-200 px-2 py-1 text-left">Grupo</th>
                                                <th className="border border-gray-200 px-2 py-1">n</th>
                                                <th className="border border-gray-200 px-2 py-1">Média</th>
                                                <th className="border border-gray-200 px-2 py-1">DP</th>
                                                <th className="border border-gray-200 px-2 py-1">SE</th>
                                                <th className="border border-gray-200 px-2 py-1">IC inferior</th>
                                                <th className="border border-gray-200 px-2 py-1">IC superior</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {s.categorias.map((cat: string, i: number) => (
                                                <tr key={i}>
                                                  <td className="border border-gray-200 px-2 py-1 font-medium">{cat}</td>
                                                  <td className="border border-gray-200 px-2 py-1 text-right">{s.ns[i]}</td>
                                                  <td className="border border-gray-200 px-2 py-1 text-right">{s.medias[i]?.toFixed(4)}</td>
                                                  <td className="border border-gray-200 px-2 py-1 text-right">{s.dps[i]?.toFixed(4)}</td>
                                                  <td className="border border-gray-200 px-2 py-1 text-right">{s.ses[i]?.toFixed(4)}</td>
                                                  <td className="border border-gray-200 px-2 py-1 text-right">{s.ic_inferior[i]?.toFixed(4)}</td>
                                                  <td className="border border-gray-200 px-2 py-1 text-right">{s.ic_superior[i]?.toFixed(4)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Painel de personalização à direita */}
                                {(
                                  <div className={cn(
                                    "shrink-0 bg-gray-50 border border-gray-200 rounded transition-all overflow-hidden",
                                    graficoPersonalizandoId === result.id ? "w-[220px] p-3" : "w-auto"
                                  )}>
                                    {/* Botão de toggle */}
                                    <button
                                      onClick={() => setGraficoPersonalizandoId((atual) => atual === result.id ? null : result.id)}
                                      className={cn(
                                        "w-full flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase border-none cursor-pointer bg-transparent",
                                        graficoPersonalizandoId === result.id ? "border-b border-gray-200 pb-2 mb-2" : "px-3 py-2 hover:bg-gray-100 rounded"
                                      )}
                                      title="Personalizar gráfico"
                                    >
                                      {graficoPersonalizandoId === result.id ? (
                                        <>
                                          <span>⚙️ Personalizar</span>
                                          <span className="ml-auto">▼</span>
                                        </>
                                      ) : (
                                        <span>⚙️</span>
                                      )}
                                    </button>

                                    {graficoPersonalizandoId === result.id && (() => {
                                      const tipo = result.graficoInterativo?.tipo || '';
                                      const configAtual = obterPlotlyConfig(result);
                                      const isPizza = tipo === 'pizza';
                                      const temEixos = !isPizza;
                                      const temCorBarras = ['histograma', 'pareto', 'barras', 'dispersao', 'tendencia', 'intervalo'].includes(tipo)
                                        || (tipo === 'bolhas' && !result.graficoInterativo?.config?.tem_z);
                                      const temInclinacao = !isPizza;
                                      const seriesPizza = isPizza ? (result.graficoInterativo?.series?.[0]?.labels || []) : [];
                                      const paleta = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6', '#f43f5e'];
                                      const coresPizza = configAtual.coresPizza?.length ? configAtual.coresPizza : seriesPizza.map((_: any, i: number) => paleta[i % paleta.length]);

                                      return (
                                        <div className="space-y-3">

                                          {/* Título — sempre visível */}
                                          <div>
                                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Título</label>
                                            <input
                                              type="text"
                                              value={configAtual.titulo}
                                              onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, titulo: e.target.value }))}
                                              className="w-full border border-gray-300 rounded px-2 py-1 text-[11px]"
                                            />
                                          </div>

                                          {/* Eixo X — oculto na Pizza */}
                                          {temEixos && (
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Eixo X</label>
                                              <input
                                                type="text"
                                                value={configAtual.tituloX}
                                                onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, tituloX: e.target.value }))}
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-[11px]"
                                              />
                                            </div>
                                          )}

                                          {/* Eixo Y — oculto na Pizza */}
                                          {temEixos && (
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Eixo Y</label>
                                              <input
                                                type="text"
                                                value={configAtual.tituloY}
                                                onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, tituloY: e.target.value }))}
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-[11px]"
                                              />
                                            </div>
                                          )}

                                          {/* Cor das Barras — oculto na Pizza */}
                                          {temCorBarras && (
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Cor principal</label>
                                              <input
                                                type="color"
                                                value={configAtual.corBarras}
                                                onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, corBarras: e.target.value }))}
                                                className="w-full h-8 border border-gray-300 rounded cursor-pointer bg-white"
                                              />
                                            </div>
                                          )}

                                          {/* Cores das fatias — só na Pizza */}
                                          {isPizza && seriesPizza.length > 0 && (
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Cores das Fatias</label>
                                              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                                                {seriesPizza.map((label: string, i: number) => (
                                                  <div key={i} className="flex items-center gap-2">
                                                    <input
                                                      type="color"
                                                      value={coresPizza[i] || paleta[i % paleta.length]}
                                                      onChange={(e) => {
                                                        const novasCores = [...coresPizza];
                                                        novasCores[i] = e.target.value;
                                                        atualizarPlotlyConfig(result, (prev) => ({ ...prev, coresPizza: novasCores }));
                                                      }}
                                                      className="w-7 h-7 border border-gray-300 rounded cursor-pointer bg-white shrink-0"
                                                    />
                                                    <span className="text-[10px] text-gray-700 truncate">{label}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Tamanho Fonte — sempre visível */}
                                          <div>
                                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                              Tamanho Fonte: {configAtual.tamanhoFonte}px
                                            </label>
                                            <input
                                              type="range"
                                              min={8}
                                              max={20}
                                              value={configAtual.tamanhoFonte}
                                              onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, tamanhoFonte: parseInt(e.target.value) }))}
                                              className="w-full"
                                            />
                                          </div>

                                          {/* Linha de tendência — só na Dispersão */}
                                          {tipo === 'dispersao' && (
                                            <div>
                                              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={configAtual.mostrarTendencia ?? true}
                                                  onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, mostrarTendencia: e.target.checked }))}
                                                  className="cursor-pointer"
                                                />
                                                Linha de Tendência
                                              </label>
                                            </div>
                                          )}

                                          {/* Linha da Média — só na Tendência */}
                                          {tipo === 'tendencia' && (
                                            <div>
                                              <label className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={configAtual.mostrarMedia ?? false}
                                                  onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, mostrarMedia: e.target.checked }))}
                                                  className="cursor-pointer"
                                                />
                                                Linha da Média
                                              </label>
                                            </div>
                                          )}

                                          {/* Inclinação Eixo X — oculto na Pizza */}
                                          {temInclinacao && (
                                            <div>
                                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                                Inclinação Eixo X: {configAtual.rotacaoX || 0}°
                                              </label>
                                              <input
                                                type="range"
                                                min={-90}
                                                max={90}
                                                step={15}
                                                value={configAtual.rotacaoX || 0}
                                                onChange={(e) => atualizarPlotlyConfig(result, (prev) => ({ ...prev, rotacaoX: parseInt(e.target.value) }))}
                                                className="w-full"
                                              />
                                              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                                                <span>-90°</span><span>0°</span><span>90°</span>
                                              </div>
                                            </div>
                                          )}

                                          {/* Resetar */}
                                          <button
                                            onClick={() => {
                                              atualizarPlotlyConfig(result, defaultPlotlyConfig(result.graficoInterativo));
                                            }}
                                            className="w-full text-[10px] text-gray-500 hover:text-gray-700 border-t border-gray-200 pt-2 mt-2 cursor-pointer bg-transparent"
                                          >
                                            Resetar padrão
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full border border-gray-100 p-2 rounded bg-white mb-4">
                              <img 
                                src={srcGraficoEstatico(result)}
                                alt="Resultado Gráfico" 
                                className="max-w-full h-auto mx-auto"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <AlertCircle size={40} strokeWidth={1} />
                  <p className="italic">O gráfico aparecerá aqui.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Sair da tela com análise não salva */}
      {modalSairSemSalvar && (
        // Clique no fundo escuro fecha. Sem isso, se o card não renderizar por
        // qualquer motivo, a tela fica escurecida e sem saída.
        <div
          className="fixed inset-0 bg-black/55 z-[1000] flex items-center justify-center p-4"
          onClick={() => { destinoNavegacao.current = null; setModalSairSemSalvar(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-black text-gray-900 m-0">Salvar antes de sair?</h3>
              <p className="text-sm text-gray-500 mt-1 mb-0">
                Você tem análises nesta tela que ainda não foram gravadas em nenhum projeto.
                Se sair agora, elas serão perdidas.
              </p>
            </div>
            <div className="px-6 py-4 flex flex-col gap-2">
              <button
                onClick={() => { setModalSairSemSalvar(false); void handleSalvarTudo(); }}
                disabled={salvandoTudo}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0033CC] hover:bg-[#1E2D6E] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50 transition-colors"
              >
                Salvar e sair
              </button>
              <button
                onClick={seguirNavegacao}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-600 text-sm font-bold border border-red-200 cursor-pointer transition-colors"
              >
                Sair sem salvar
              </button>
              <button
                onClick={() => { destinoNavegacao.current = null; setModalSairSemSalvar(false); }}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 text-sm font-bold border border-gray-200 cursor-pointer transition-colors"
              >
                Continuar nesta tela
              </button>
            </div>
          </div>
        </div>
      )}


      {modalSelecionarProjeto && (
        <div
          className="fixed inset-0 bg-black/55 z-[999] flex items-center justify-center p-4"
          onClick={() => setModalSelecionarProjeto(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-lg font-black text-gray-900 m-0">Salvar projeto</h3>
                <p className="text-sm text-gray-500 mt-1 mb-0">
                  {projetosDisponiveis.length > 0
                    ? 'Escolha onde deseja salvar as análises realizadas.'
                    : 'Informe somente o título para criar seu primeiro projeto.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalSelecionarProjeto(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 border-none bg-transparent cursor-pointer"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3 max-h-[55vh] overflow-y-auto">
              {projetosDisponiveis.map((projeto) => {
                const selecionado = projetoDestinoId === projeto.id;
                const vigente = projetoAtivo?.id === projeto.id;
                return (
                  <button
                    key={projeto.id}
                    type="button"
                    onClick={() => setProjetoDestinoId(projeto.id)}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left cursor-pointer transition-all flex items-center gap-3',
                      selecionado ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 bg-white hover:border-blue-300',
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                      selecionado ? 'border-blue-600' : 'border-gray-300',
                    )}>
                      {selecionado && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-gray-900 truncate">{projeto.name}</span>
                      {vigente && <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Projeto vigente</span>}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setProjetoDestinoId(NOVO_PROJETO_ID)}
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-left cursor-pointer transition-all flex items-center gap-3',
                  projetoDestinoId === NOVO_PROJETO_ID ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-300',
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                  projetoDestinoId === NOVO_PROJETO_ID ? 'border-blue-600' : 'border-gray-300',
                )}>
                  {projetoDestinoId === NOVO_PROJETO_ID && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                </span>
                <span className="text-sm font-bold text-blue-700">+ Criar novo projeto</span>
              </button>

              {projetoDestinoId === NOVO_PROJETO_ID && (
                <div className="pt-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-2">Título do projeto</label>
                  <input
                    autoFocus
                    value={novoProjetoTitulo}
                    onChange={(event) => setNovoProjetoTitulo(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') confirmarProjetoDestino(); }}
                    placeholder="Ex.: Análise de perdas da produção"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                type="button"
                onClick={() => setModalSelecionarProjeto(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarProjetoDestino}
                disabled={salvandoTudo || !projetoDestinoId || (projetoDestinoId === NOVO_PROJETO_ID && !novoProjetoTitulo.trim())}
                className="px-5 py-2.5 rounded-lg border-none bg-blue-600 text-white text-sm font-black cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvandoTudo ? 'Salvando...' : projetoDestinoId === NOVO_PROJETO_ID ? 'Criar e salvar' : 'Salvar neste projeto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {modalErro && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] z-[1000] flex justify-center items-center">
          <div className="bg-white p-[20px] rounded-[8px] max-w-[400px] text-center w-full mx-4 shadow-xl">
            <p className="text-gray-800 text-sm font-bold">{modalErro}</p>
            <button onClick={() => setModalErro(null)} className="mt-4 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-[4px] text-sm font-bold min-w-[100px]">OK</button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalSubstituirPlanilha && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">⚠️ Substituir planilha?</h3>
            <p className="text-sm text-gray-700 mb-2">
              Este projeto já tem uma planilha salva (<strong>{planilhaDestinoSalvar?.nome}</strong>).
            </p>
            <p className="text-sm text-gray-700 mb-5">
              Ao substituir, as análises antigas ficarão marcadas como desatualizadas (🟡).
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setModalSubstituirPlanilha(false);
                  setProjetoDestinoSalvar(null);
                  setPlanilhaDestinoSalvar(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold rounded border-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => executarSalvamento()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded border-none cursor-pointer"
              >
                Substituir
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSucessoSalvar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1002]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-green-700 mb-3">✅ Salvo com sucesso!</h3>
            <pre className="text-sm text-gray-700 mb-5 whitespace-pre-wrap font-sans">
              {modalSucessoSalvar}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setModalSucessoSalvar(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded border-none cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <DataAnalysisTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
