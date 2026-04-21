import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown,
  AlertCircle,
  BarChart2,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { auth } from '../lib/firebase';
import SlimSelect from 'slim-select';

// --- CONFIGURATIONS FROM entradadedados.js ---
const configuracoesFerramentas: Record<string, string[]> = {
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
};

// --- CONFIGURATIONS FROM menu.js ---
const configuracoesAnalises = {
  "Análise Exploratória": [
    { nome: "Análise de variabilidade ➡️ ", subitens: ["Gráfico Sumario", "Análise de outliers"] },
    { nome: "Análise de correlação ➡️ ", subitens: ["Correlação de person", "Matrix de dispersão"] },
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
    { nome: "Cálculo de probabilidade" },
  ]
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
  "Field_Dist": "field_dist"
};

interface AnalysisResult {
  id: string;
  analise?: string;
  grafico_base64?: string;
  grafico_isolado_base64?: string | string[];
  interpretacao?: string;
  timestamp: Date;
  tool: string;
  qa: { question: string; answer: string }[];
}

export default function DataAnalysis() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [ferramentaAtual, setFerramentaAtual] = useState("");
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [personalization, setPersonalization] = useState({
    cor_principal: "#3b82f6",
    tamanho_fonte: 12,
    rotacao_x: 0,
    rotacao_y: 0,
    titulo: "",
    titulo_x: "",
    titulo_y: "",
    cor_linhas_limite: "#ef4444",
    espessura_linhas_limite: 1.5,
  });
  const [pergunta, setPergunta] = useState("");
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [activeNestedMenu, setActiveNestedMenu] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const selectRefs = useRef<Record<string, SlimSelect | null>>({});

  useEffect(() => {
    // Initialize SlimSelect for multi-selects
    if (ferramentaAtual) {
      requiredFields.forEach(campo => {
        const internalKey = mapaCampos[campo] || campo;
        const isMulti = internalKey.startsWith('lista_');
        if (isMulti) {
          const el = document.getElementById(`select-${internalKey}`) as HTMLSelectElement;
          if (el) {
            if (selectRefs.current[internalKey]) {
              selectRefs.current[internalKey]?.destroy();
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
        }
      });
    }
    return () => {
      Object.values(selectRefs.current).forEach((ss: any) => ss?.destroy());
      selectRefs.current = {};
    };
  }, [ferramentaAtual, columns]);

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

  const handleRunAnalysis = async () => {
    if (!file) {
      alert('⚠️ Por favor, envie um arquivo antes de continuar.');
      return;
    }
    if (!ferramentaAtual) {
      alert('⚠️ Você deve escolher pelo menos uma ferramenta estatística ou um gráfico.');
      return;
    }

    const config = configuracoesFerramentas[ferramentaAtual] || [];
    const missingFields = config.filter(campo => {
      const internalKey = mapaCampos[campo] || campo;
      const val = toolParams[internalKey];
      return !val || (Array.isArray(val) && val.length === 0);
    });

    if (missingFields.length > 0) {
      alert(`⚠️ Preencha todos os campos obrigatórios: ${missingFields.join(", ")}`);
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
      const response = await fetch('https://analises-production.up.railway.app/analise', {
        method: 'POST',
        body: formData
      });

      const json = await response.json();
      
      const newResult: AnalysisResult = {
        id: Math.random().toString(36).substr(2, 9),
        analise: json.analise,
        grafico_base64: json.grafico_base64,
        grafico_isolado_base64: json.grafico_isolado_base64,
        timestamp: new Date(),
        tool: ferramentaAtual,
        qa: []
      };

      setResults([newResult, ...results]);
    } catch (error) {
      console.error("Analysis error:", error);
      alert("❌ Erro ao processar a análise.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAskAI = async () => {
    if (!pergunta.trim() || results.length === 0) return;

    const result = results[0];
    const formData = new FormData();
    formData.append("pergunta", pergunta);
    formData.append("tipo", result.analise ? "analise" : "grafico");

    try {
      const response = await fetch('https://analises-production.up.railway.app/pergunta', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.resposta) {
        setResults(prev => prev.map((r, i) => 
          i === 0 
            ? { ...r, qa: [...r.qa, { question: pergunta, answer: data.resposta }] }
            : r
        ));
        setPergunta("");
      }
    } catch (error) {
      console.error("AI Question error:", error);
    }
  };

  const handleUpdatePersonalization = async () => {
    if (results.length === 0) return;
    setIsProcessing(true);
    
    const result = results[0];
    const formData = new FormData();
    formData.append("grafico", `${result.tool} Personalizado`);
    
    Object.entries(toolParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else {
        formData.append(key, String(value));
      }
    });

    formData.append("cor", personalization.cor_principal);
    formData.append("titulo_x", personalization.titulo_x);
    formData.append("titulo_y", personalization.titulo_y);
    formData.append("titulo_grafico", personalization.titulo);
    formData.append("tamanho_fonte", personalization.tamanho_fonte.toString());
    formData.append("inclinacao_x", personalization.rotacao_x.toString());

    try {
      const response = await fetch('https://analises-production.up.railway.app/personalizar-grafico', {
        method: 'POST',
        body: formData
      });

      const json = await response.json();
      if (json.grafico_isolado_base64) {
        setResults(prev => prev.map((r, i) => 
          i === 0 
            ? { ...r, grafico_isolado_base64: json.grafico_isolado_base64 }
            : r
        ));
      }
    } catch (error) {
      console.error("Personalization error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const requiredFields = ferramentaAtual ? configuracoesFerramentas[ferramentaAtual] : [];

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#000] font-sans" style={{ fontFamily: '"Segoe UI", Tahoma, sans-serif', fontSize: '13px' }}>
      {/* Header & Navigation Combined (Internal Workspace Header) */}
      <header className="bg-[#1f2937] text-white px-[20px] py-[10px] flex justify-between items-center border-b border-[#ccc] -mx-8 -mt-8 mb-8">
        <div className="flex items-center gap-[20px]">
          <div className="flex items-center gap-[10px]">
            <img src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" alt="Logo" className="h-[35px] w-auto" />
          </div>
          
          <nav>
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
                  <button className="text-white bg-transparent border-none text-[0.85rem] cursor-pointer hover:text-blue-300 transition-colors flex items-center gap-1 font-sans font-bold">
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
                              {item.subitens.map((sub: string) => (
                                <li key={sub}>
                                  <button
                                    onClick={() => {
                                      setFerramentaAtual(sub);
                                      setActiveSubmenu(null);
                                      setActiveNestedMenu(null);
                                    }}
                                    className="w-full text-left px-[12px] py-[4px] text-[0.80rem] bg-[#f9f9f9] text-[#000] hover:bg-gray-200 transition-colors border-none cursor-pointer no-underline font-sans"
                                  >
                                    {sub}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setFerramentaAtual(item.nome);
                              setActiveSubmenu(null);
                            }}
                            className="w-full text-left px-[12px] py-[4px] text-[0.80rem] bg-[#f9f9f9] text-[#000] hover:bg-gray-200 transition-colors border-none cursor-pointer no-underline font-sans"
                          >
                            {item.nome}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div id="usuario-info" className="flex items-center gap-[15px]">
          <span className="font-bold text-[0.85rem]">Olá, {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Usuário'}</span>
          <button 
            onClick={() => {
              if (confirm("⚠️ Já vai nos deixar? So aperte OK depois de ter salvo suas análises e gráficos.")) {
                auth.signOut();
              }
            }}
            className="px-[12px] py-[6px] bg-white text-[#1f2937] border-none rounded-[4px] cursor-pointer hover:bg-gray-200 transition-colors font-sans text-[11px] font-bold"
          >
            Deslogar
          </button>
        </div>
      </header>

      <div className="p-[20px] space-y-6">
        {/* File Upload & Sheet Selection */}
        <div className="flex flex-col md:flex-row gap-[40px] items-end mb-6">
          <div className="flex-1">
            <label className="block mb-1 font-bold text-gray-700">Escolha seu arquivo (.xlsx):</label>
            <input 
              type="file" 
              accept=".xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 border border-[#ccc] rounded-[4px] cursor-pointer bg-white p-[5px] h-[38px]" 
            />
          </div>
          <div className="w-full md:w-[45%]">
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
          </div>

          {/* Tool Selection Box */}
          <div className="lg:col-span-1">
            <div id="boxAnalise" className="border border-[#ccc] bg-white p-[15px] shadow-sm h-[300px] overflow-y-auto">
              <p className="text-[12px] text-gray-500 mb-3">Análise selecionada: <span className="font-bold text-gray-700">{ferramentaAtual || 'Nenhuma'}</span></p>
              
              {ferramentaAtual && (
                <div className="space-y-4">
                  {requiredFields.map(campo => {
                    const internalKey = mapaCampos[campo] || campo;
                    const isMulti = internalKey.startsWith('lista_');
                    const isNumeric = ["field", "field_conf", "field_LSE", "field_LIE"].includes(internalKey);
                    const isDist = internalKey === "field_dist";

                    return (
                      <div key={campo} className="space-y-1">
                        <label className="block font-bold text-[12px]">Variável {campo}</label>
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
                            id={`select-${internalKey}`}
                            multiple={isMulti}
                            className={cn("w-full border border-[#ccc] rounded p-2 text-[12px] bg-white", isMulti && "h-10")}
                            value={toolParams[internalKey] || (isMulti ? [] : "")}
                            onChange={(e) => {
                              if (!isMulti) {
                                setToolParams(prev => ({ ...prev, [internalKey]: e.target.value }));
                              }
                            }}
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
              {!ferramentaAtual && (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-gray-400 italic text-center">Selecione uma ferramenta no menu superior</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center py-2">
          <button 
            onClick={handleRunAnalysis}
            disabled={isProcessing}
            className={cn(
              "bg-[#2563eb] text-white rounded-[4px] px-[40px] py-[10px] hover:bg-blue-700 transition-all font-bold text-[13px]",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessing ? <span className="pontinhos">Processando</span> : "Enviar Análise"}
          </button>
        </div>

        {/* Question Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-0 border border-[#ccc] rounded-[4px] overflow-hidden bg-white">
          <label className="font-bold whitespace-nowrap px-4 py-2 bg-gray-50 border-r border-[#ccc]">Pergunta (apenas estatística):</label>
          <input 
            type="text" 
            className="flex-1 p-[10px] bg-white outline-none" 
            placeholder="Digite sua pergunta..." 
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
          />
          <button 
            onClick={handleAskAI}
            className="bg-[#10b981] text-white px-[25px] py-[10px] hover:bg-[#059669] transition-all font-bold border-l border-[#ccc]"
          >
            Perguntar
          </button>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
          {/* Analysis Column */}
          <div className="flex flex-col">
            <h2 className="font-bold text-[1.2rem] mb-3 text-center">Análise Estatística</h2>
            <div id="conteudoAnalise" className="flex-1 border border-[#ccc] bg-white p-[20px] min-h-[400px] shadow-sm rounded-[4px]">
              {results.length > 0 ? (
                <div className="space-y-4">
                  {results[0].analise && (
                    <div 
                      className="whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: results[0].analise
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/📊/g, "<span class='inline-block mr-2'>📊</span>")
                          .replace(/🔹/g, "<span class='inline-block mr-2 text-blue-500'>🔹</span>")
                          .replace(/🔎/g, "<span class='inline-block mr-2 text-blue-500'>🔎</span>")
                          .replace(/\n/g, "<br>") 
                      }}
                    />
                  )}
                  {results[0].qa.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                      {results[0].qa.map((qa, i) => (
                        <div key={i} className="space-y-2">
                          <p className="font-bold text-blue-600 flex items-center gap-2">
                            <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">PERGUNTA</span> {qa.question}
                          </p>
                          <div className="text-gray-700 bg-gray-50 p-3 border-l-4 border-blue-400 rounded-r" dangerouslySetInnerHTML={{ __html: qa.answer.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>") }} />
                        </div>
                      ))}
                    </div>
                  )}
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
            <h2 className="font-bold text-[1.2rem] mb-3 text-center">Gráfico</h2>
            <div id="conteudoGrafico" className="flex-1 border border-[#ccc] bg-white p-[20px] min-h-[400px] shadow-sm rounded-[4px] relative">
              {results.length > 0 && (results[0].grafico_base64 || results[0].grafico_isolado_base64) ? (
                <div className="flex flex-col items-center">
                  <div className="w-full border border-gray-100 p-2 rounded bg-white mb-4">
                    <img 
                      src={`data:image/png;base64,${Array.isArray(results[0].grafico_isolado_base64) ? results[0].grafico_isolado_base64[0] : (results[0].grafico_isolado_base64 || results[0].grafico_base64)}`} 
                      alt="Resultado Gráfico" 
                      className="max-w-full h-auto mx-auto"
                    />
                  </div>
                  
                  {/* Personalization Panel */}
                  <div id="painelPersonalizacao" className="w-full border border-[#ccc] p-[15px] bg-[#f9f9f9] rounded">
                    <button 
                      onClick={() => setShowPersonalization(!showPersonalization)}
                      className="w-full text-left font-bold text-[0.9rem] flex justify-between items-center"
                    >
                      Painel Personalização Gráfico <span>{showPersonalization ? '▲' : '▼'}</span>
                    </button>

                    <AnimatePresence>
                      {showPersonalization && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div id="opcoesPersonalizacao" className="grid grid-cols-1 sm:grid-cols-2 gap-[15px] w-full mt-4">
                            <div className="col-span-full">
                              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Título do Gráfico</label>
                              <input 
                                type="text" 
                                className="w-full border border-[#ccc] rounded-[4px] p-[8px] text-[12px]" 
                                placeholder="Título do gráfico"
                                value={personalization.titulo}
                                onChange={(e) => setPersonalization(prev => ({ ...prev, titulo: e.target.value }))}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Título Eixo Y</label>
                              <input 
                                type="text" 
                                className="w-full border border-[#ccc] rounded-[4px] p-[8px] text-[12px]" 
                                placeholder="Eixo Y"
                                value={personalization.titulo_y}
                                onChange={(e) => setPersonalization(prev => ({ ...prev, titulo_y: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Título Eixo X</label>
                              <input 
                                type="text" 
                                className="w-full border border-[#ccc] rounded-[4px] p-[8px] text-[12px]" 
                                placeholder="Eixo X"
                                value={personalization.titulo_x}
                                onChange={(e) => setPersonalization(prev => ({ ...prev, titulo_x: e.target.value }))}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Cor do Gráfico</label>
                              <input 
                                type="color" 
                                className="w-full h-[35px] border border-[#ccc] rounded-[4px] cursor-pointer bg-white"
                                value={personalization.cor_principal}
                                onChange={(e) => setPersonalization(prev => ({ ...prev, cor_principal: e.target.value }))}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Tamanho Fonte</label>
                              <input 
                                type="number" 
                                className="w-full border border-[#ccc] rounded-[4px] p-[8px] text-[12px]"
                                value={personalization.tamanho_fonte}
                                onChange={(e) => setToolParams(prev => ({ ...prev, tamanho_fonte: parseInt(e.target.value) }))}
                              />
                            </div>

                            <div className="col-span-full">
                              <button 
                                onClick={handleUpdatePersonalization}
                                disabled={isProcessing}
                                className="w-full bg-[#10b981] text-white py-2 rounded-[4px] text-[12px] hover:bg-[#059669] transition-all font-bold"
                              >
                                {isProcessing ? "Aplicando..." : "Aplicar Alterações"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
    </div>
  );
}
