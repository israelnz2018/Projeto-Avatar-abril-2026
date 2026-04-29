import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Info,
  Table as TableIcon,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Settings,
  ShieldAlert,
  Activity,
  TrendingUp,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FMEARow {
  id: string;
  processStep: string;
  failureMode: string;
  failureEffect: string;
  severity: number;
  failureCause: string;
  occurrence: number;
  currentControls: string;
  detection: number;
  recommendedActions: string;
  responsible: string;
  deadline: string;
  status: 'green' | 'yellow' | 'red';
  newSeverity: number;
  newOccurrence: number;
  newDetection: number;
}

interface Thresholds {
  rpn: { green: number; yellow: number };
  severity: { green: number; yellow: number };
  criticality: { green: number; yellow: number };
}

interface ProcessFMEAProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const SEVERITY_TABLE = [
  { score: 10, title: "Perigoso s/ aviso", desc: "Falha de segurança ou descumprimento legal sem aviso." },
  { score: 9, title: "Perigoso c/ aviso", desc: "Falha de segurança ou descumprimento legal com aviso." },
  { score: 8, title: "Muito Alta", desc: "Item inoperável, perda de função primária." },
  { score: 7, title: "Alta", desc: "Item operável, mas com nível de performance reduzido." },
  { score: 6, title: "Moderada", desc: "Item operável, mas funções de conforto inoperáveis." },
  { score: 5, title: "Baixa", desc: "Item operável, mas funções de conforto com performance reduzida." },
  { score: 4, title: "Muito Baixa", desc: "Defeito notado pela maioria dos clientes (>75%)." },
  { score: 3, title: "Menor", desc: "Defeito notado por clientes exigentes (50%)." },
  { score: 2, title: "Muito Menor", desc: "Defeito notado por clientes muito exigentes (25%)." },
  { score: 1, title: "Nenhuma", desc: "Sem efeito perceptível." }
];

const OCCURRENCE_TABLE = [
  { score: 10, title: "Muito Alta", desc: "Falha inevitável. > 1 em 2." },
  { score: 9, title: "Muito Alta", desc: "1 em 3." },
  { score: 8, title: "Alta", desc: "1 em 8." },
  { score: 7, title: "Alta", desc: "1 em 20." },
  { score: 6, title: "Moderada", desc: "1 em 50." },
  { score: 5, title: "Moderada", desc: "1 em 100." },
  { score: 4, title: "Moderada", desc: "1 em 500." },
  { score: 3, title: "Baixa", desc: "1 em 2.000." },
  { score: 2, title: "Baixa", desc: "1 em 10.000." },
  { score: 1, title: "Remota", desc: "Falha improvável. < 1 em 1.000.000." }
];

const DETECTION_TABLE = [
  { score: 10, title: "Absolutamente Incerta", desc: "Controle não detecta ou não existe." },
  { score: 9, title: "Muito Remota", desc: "Remota chance de detecção." },
  { score: 8, title: "Remota", desc: "Baixa chance de detecção." },
  { score: 7, title: "Muito Baixa", desc: "Muito baixa chance de detecção." },
  { score: 6, title: "Baixa", desc: "Baixa chance de detecção." },
  { score: 5, title: "Moderada", desc: "Moderada chance de detecção." },
  { score: 4, title: "Moderadamente Alta", desc: "Moderadamente alta chance de detecção." },
  { score: 3, title: "Alta", desc: "Alta chance de detecção." },
  { score: 2, title: "Muito Alta", desc: "Muito alta chance de detecção." },
  { score: 1, title: "Quase Certa", desc: "Controle certamente detectará a falha." }
];

export default function ProcessFMEA({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: ProcessFMEAProps) {
  const d = initialData?.toolData || initialData;
  const [activeTab, setActiveTab] = useState<'fmea' | 'reference' | 'config' | 'explanation'>('fmea');
  const [fontSize, setFontSize] = useState(d?.fontSize || 11);
  const [lineHeight, setLineHeight] = useState(d?.lineHeight || 40);
  
  const [thresholds, setThresholds] = useState<Thresholds>(d?.thresholds || {
    rpn: { green: 80, yellow: 150 },
    severity: { green: 6, yellow: 8 },
    criticality: { green: 20, yellow: 40 },
  });

  const [rows, setRows] = useState<FMEARow[]>(d?.rows || [
    {
      id: '1',
      processStep: '',
      failureMode: '',
      failureEffect: '',
      severity: 1,
      failureCause: '',
      occurrence: 1,
      currentControls: '',
      detection: 1,
      recommendedActions: '',
      responsible: '',
      deadline: '',
      status: 'yellow',
      newSeverity: 1,
      newOccurrence: 1,
      newDetection: 1
    }
  ]);
  const isToolEmpty = rows.length === 0 || (rows.length === 1 && !rows[0].processStep && !rows[0].failureMode);

  // Auto-resize textareas when rows or active tab change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [rows, activeTab]);

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.rows) {
        setRows(data.rows);
      }
      if (data.thresholds) {
        setThresholds(data.thresholds);
      }
      if (data.fontSize) {
        setFontSize(data.fontSize);
      }
      if (data.lineHeight) {
        setLineHeight(data.lineHeight);
      }
    } else {
      setRows([
        {
          id: '1',
          processStep: '',
          failureMode: '',
          failureEffect: '',
          severity: 1,
          failureCause: '',
          occurrence: 1,
          currentControls: '',
          detection: 1,
          recommendedActions: '',
          responsible: '',
          deadline: '',
          status: 'yellow',
          newSeverity: 1,
          newOccurrence: 1,
          newDetection: 1
        }
      ]);
      setThresholds({
        rpn: { green: 80, yellow: 150 },
        severity: { green: 6, yellow: 8 },
        criticality: { green: 20, yellow: 40 },
      });
      setFontSize(11);
      setLineHeight(40);
    }
  }, [initialData]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        processStep: '',
        failureMode: '',
        failureEffect: '',
        severity: 1,
        failureCause: '',
        occurrence: 1,
        currentControls: '',
        detection: 1,
        recommendedActions: '',
        responsible: '',
        deadline: '',
        status: 'yellow',
        newSeverity: 1,
        newOccurrence: 1,
        newDetection: 1
      }
    ]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, updates: Partial<FMEARow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const calculateAP = (s: number, o: number, d: number): 'Alta' | 'Média' | 'Baixa' => {
    // Simplified AIAG-VDA AP Logic
    // High Severity (9-10) is always at least Medium, and High if O or D are not 1
    if (s >= 9) {
      if (o >= 2 || d >= 2) return 'Alta';
      return 'Alta'; // Force Alta for S >= 9 as per "Severidade como fator crítico"
    }
    if (s >= 7) {
      if (o >= 4 || d >= 4) return 'Alta';
      if (o >= 2 || d >= 2) return 'Média';
      return 'Baixa';
    }
    if (s >= 4) {
      if (o >= 6 || d >= 6) return 'Alta';
      if (o >= 4 || d >= 4) return 'Média';
      return 'Baixa';
    }
    return 'Baixa';
  };

  const getStatusColor = (val: number, type: keyof Thresholds) => {
    const { green, yellow } = thresholds[type];
    if (val > yellow) return 'red';
    if (val > green) return 'yellow';
    return 'green';
  };

  const getAPColor = (ap: 'Alta' | 'Média' | 'Baixa') => {
    if (ap === 'Alta') return 'red';
    if (ap === 'Média') return 'yellow';
    return 'green';
  };

  const getRowRiskColor = (s: number, o: number, d: number) => {
    const rpn = s * o * d;
    const criticality = s * o;
    const ap = calculateAP(s, o, d);

    const rpnColor = getStatusColor(rpn, 'rpn');
    const sColor = getStatusColor(s, 'severity');
    const critColor = getStatusColor(criticality, 'criticality');
    const apColor = getAPColor(ap);

    if (rpnColor === 'red' || sColor === 'red' || critColor === 'red' || apColor === 'red') return 'red';
    if (rpnColor === 'yellow' || sColor === 'yellow' || critColor === 'yellow' || apColor === 'yellow') return 'yellow';
    return 'green';
  };

  const handleSave = () => {
    onSave({ rows, thresholds, fontSize, lineHeight });
  };

  return (
    <div className="space-y-8 w-full">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Process FMEA com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Mapa de Processo e Matriz Causa e Efeito" para gerar
                Process FMEA técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir
                uma identificação rigorosa de riscos.
              </p>
            </div>
            <button
              onClick={() => onGenerateAI?.()}
              disabled={isGeneratingAI}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none shrink-0",
                isGeneratingAI
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-lg shadow-blue-100"
              )}
            >
              {isGeneratingAI
                ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={16} /> Gerar com IA</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Indicador de IA */}
      {!isToolEmpty && onGenerateAI && initialData?.isGenerated && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600">Gerado com IA</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Deseja limpar os dados gerados pela IA?')) {
                onClearAIData?.();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          >
            <Trash2 size={13} />
            Limpar dados da IA
          </button>
        </div>
      )}

      <div className="bg-white border border-[#ccc] rounded-[4px] shadow-sm overflow-hidden w-full">
      {/* Header & Tabs */}
      <div className="bg-[#f8f9fa] border-b border-[#eee] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-[#8b5cf6]" size={24} />
          <div>
            <h2 className="text-[1.1rem] font-bold text-[#333]">FMEA Moderno (A4 Landscape)</h2>
            <p className="text-[11px] text-[#666] uppercase tracking-wider font-medium">Análise de Riscos e Prioridade de Ação</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Adjustments */}
          <div className="flex items-center gap-4 bg-white border border-[#ddd] rounded-[4px] px-3 py-1">
            <div className="flex items-center gap-2" title="Tamanho da Letra">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Fonte</span>
              <input 
                type="number" min="8" max="24" value={fontSize} 
                onChange={(e) => setFontSize(parseInt(e.target.value) || 8)}
                className="w-12 px-1 py-0.5 border border-[#ccc] rounded-[2px] text-[12px] font-bold text-center focus:ring-1 focus:ring-[#8b5cf6] outline-none"
              />
            </div>
            <div className="flex items-center gap-2" title="Altura da Linha">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Altura</span>
              <input 
                type="number" min="20" max="150" value={lineHeight} 
                onChange={(e) => setLineHeight(parseInt(e.target.value) || 20)}
                className="w-14 px-1 py-0.5 border border-[#ccc] rounded-[2px] text-[12px] font-bold text-center focus:ring-1 focus:ring-[#8b5cf6] outline-none"
              />
            </div>
          </div>

          <div className="flex bg-white border border-[#ddd] rounded-[4px] p-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('fmea')}
              className={cn(
                "px-4 py-1.5 text-[12px] font-bold rounded-[2px] transition-all border-none cursor-pointer whitespace-nowrap",
                activeTab === 'fmea' ? "bg-[#1f2937] text-white" : "text-[#666] hover:bg-gray-50"
              )}
            >
              Planilha FMEA
            </button>
            <button
              onClick={() => setActiveTab('reference')}
              className={cn(
                "px-4 py-1.5 text-[12px] font-bold rounded-[2px] transition-all border-none cursor-pointer ml-1 whitespace-nowrap",
                activeTab === 'reference' ? "bg-[#1f2937] text-white" : "text-[#666] hover:bg-gray-50"
              )}
            >
              Tabelas
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={cn(
                "px-4 py-1.5 text-[12px] font-bold rounded-[2px] transition-all border-none cursor-pointer ml-1 whitespace-nowrap flex items-center gap-1",
                activeTab === 'config' ? "bg-[#1f2937] text-white" : "text-[#666] hover:bg-gray-50"
              )}
            >
              <Settings size={14} /> Critérios
            </button>
            <button
              onClick={() => setActiveTab('explanation')}
              className={cn(
                "px-4 py-1.5 text-[12px] font-bold rounded-[2px] transition-all border-none cursor-pointer ml-1 whitespace-nowrap flex items-center gap-1",
                activeTab === 'explanation' ? "bg-[#1f2937] text-white" : "text-[#666] hover:bg-gray-50"
              )}
            >
              <Info size={14} /> Explicação
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'fmea' ? (
        <>
          <div className="p-0 overflow-x-auto">
            <table className="w-full border-collapse tool-table" style={{ fontSize: `${fontSize}px`, tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-[#1f2937] text-white">
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[90px] whitespace-normal break-words">Processo</th>
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[90px] whitespace-normal break-words">Falha</th>
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[90px] whitespace-normal break-words">Efeito</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-red-900/30 whitespace-normal break-words">S</th>
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[90px] whitespace-normal break-words">Causa</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-orange-900/30 whitespace-normal break-words">O</th>
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[90px] whitespace-normal break-words">Controles</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-blue-900/30 whitespace-normal break-words">D</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-gray-800 whitespace-normal break-words">RPN</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[35px] bg-gray-800 whitespace-normal break-words">AP</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-gray-800 whitespace-normal break-words">S×O</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[35px] bg-gray-800 whitespace-normal break-words">Risk</th>
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[110px] whitespace-normal break-words">Ações Recomendadas</th>
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[70px] whitespace-normal break-words">Resp.</th>
                  <th className="p-1 border border-gray-700 font-bold text-left min-w-[70px] whitespace-normal break-words">Prazo</th>
                  <th className="p-1 border border-gray-700 font-bold text-center min-w-[70px] whitespace-normal break-words">Status</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-green-900/30 whitespace-normal break-words">S'</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-green-900/30 whitespace-normal break-words">O'</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[45px] bg-green-900/30 whitespace-normal break-words">D'</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[50px] bg-gray-900 whitespace-normal break-words">RPN'</th>
                  <th className="p-1 border border-gray-700 font-bold text-center w-[25px] whitespace-normal break-words"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rpn = row.severity * row.occurrence * row.detection;
                  const criticality = row.severity * row.occurrence;
                  const ap = calculateAP(row.severity, row.occurrence, row.detection);
                  const riskColor = getRowRiskColor(row.severity, row.occurrence, row.detection);
                  
                  const rpnStatus = getStatusColor(rpn, 'rpn');
                  const sStatus = getStatusColor(row.severity, 'severity');
                  const critStatus = getStatusColor(criticality, 'criticality');
                  const apStatus = getAPColor(ap);

                  const newRPN = row.newSeverity * row.newOccurrence * row.newDetection;

                  return (
                    <tr key={row.id} className={cn(
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50", 
                      "hover:bg-blue-50/30 transition-all",
                      riskColor === 'red' && "bg-red-50/50"
                    )} style={{ minHeight: '52px' }}>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.processStep || ''}
                          onChange={(e) => {
                            updateRow(row.id, { processStep: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Etapa do processo..."
                        />
                      </td>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.failureMode || ''}
                          onChange={(e) => {
                            updateRow(row.id, { failureMode: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Modo de falha..."
                        />
                      </td>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.failureEffect || ''}
                          onChange={(e) => {
                            updateRow(row.id, { failureEffect: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Efeito da falha..."
                        />
                      </td>
                      <td className="p-0 border border-[#eee] text-center">
                        <select
                          value={row.severity}
                          onChange={(e) => updateRow(row.id, { severity: parseInt(e.target.value) })}
                          className={cn(
                            "w-full h-full p-0 border-none bg-transparent text-center font-bold cursor-pointer min-w-[40px] appearance-none",
                            sStatus === 'red' ? "text-red-600" : sStatus === 'yellow' ? "text-yellow-600" : "text-green-600"
                          )}
                          style={{ fontSize: 'inherit', textAlignLast: 'center' }}
                        >
                          {[...Array(10)].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.failureCause || ''}
                          onChange={(e) => {
                            updateRow(row.id, { failureCause: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Causa da falha..."
                        />
                      </td>
                      <td className="p-0 border border-[#eee] text-center">
                        <select
                          value={row.occurrence}
                          onChange={(e) => updateRow(row.id, { occurrence: parseInt(e.target.value) })}
                          className="w-full h-full p-0 border-none bg-transparent text-center font-bold cursor-pointer min-w-[40px] appearance-none"
                          style={{ fontSize: 'inherit', textAlignLast: 'center' }}
                        >
                          {[...Array(10)].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.currentControls || ''}
                          onChange={(e) => {
                            updateRow(row.id, { currentControls: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Controles atuais..."
                        />
                      </td>
                      <td className="p-0 border border-[#eee] text-center">
                        <select
                          value={row.detection}
                          onChange={(e) => updateRow(row.id, { detection: parseInt(e.target.value) })}
                          className="w-full h-full p-0 border-none bg-transparent text-center font-bold cursor-pointer min-w-[40px] appearance-none"
                          style={{ fontSize: 'inherit', textAlignLast: 'center' }}
                        >
                          {[...Array(10)].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </td>
                      <td className={cn(
                        "p-1 border border-[#eee] text-center font-bold bg-gray-50/50 whitespace-normal break-words align-top",
                        rpnStatus === 'red' ? "text-red-600" : rpnStatus === 'yellow' ? "text-yellow-600" : "text-green-600"
                      )}>
                        {rpn}
                      </td>
                      <td className={cn(
                        "p-1 border border-[#eee] text-center font-bold bg-gray-50/50 whitespace-normal break-words align-top",
                        apStatus === 'red' ? "text-red-600" : apStatus === 'yellow' ? "text-yellow-600" : "text-green-600"
                      )}>
                        {ap.charAt(0)}
                      </td>
                      <td className={cn(
                        "p-1 border border-[#eee] text-center font-bold bg-gray-50/50 whitespace-normal break-words align-top",
                        critStatus === 'red' ? "text-red-600" : critStatus === 'yellow' ? "text-yellow-600" : "text-green-600"
                      )}>
                        {criticality}
                      </td>
                      <td className="p-1 border border-[#eee] text-center whitespace-normal break-words align-top">
                        <div className={cn(
                          "w-3 h-3 rounded-full mx-auto shadow-sm",
                          riskColor === 'red' ? "bg-red-600 animate-pulse" : riskColor === 'yellow' ? "bg-yellow-500" : "bg-green-500"
                        )}></div>
                      </td>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.recommendedActions || ''}
                          onChange={(e) => {
                            updateRow(row.id, { recommendedActions: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className={cn(
                            "w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all",
                            riskColor === 'red' && "placeholder:text-red-400 placeholder:font-bold"
                          )}
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder={riskColor === 'red' ? "AÇÃO MANDATÓRIA REQUERIDA!" : "Ações recomendadas..."}
                        />
                      </td>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.responsible || ''}
                          onChange={(e) => {
                            updateRow(row.id, { responsible: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Responsável..."
                        />
                      </td>
                      <td className="p-0 border border-[#eee]">
                        <textarea
                          value={row.deadline || ''}
                          onChange={(e) => {
                            updateRow(row.id, { deadline: e.target.value });
                            // Auto resize
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                          style={{ 
                            minHeight: '36px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Prazo..."
                        />
                      </td>
                      <td className="p-0 border border-[#eee] text-center">
                        <select
                          value={row.status}
                          onChange={(e) => updateRow(row.id, { status: e.target.value as any })}
                          className={cn(
                            "w-full p-1 border-none bg-transparent text-center font-bold cursor-pointer",
                            row.status === 'red' ? "text-red-600" : row.status === 'yellow' ? "text-yellow-600" : "text-green-600"
                          )}
                          style={{ fontSize: 'inherit' }}
                        >
                          <option value="green">Verde</option>
                          <option value="yellow">Amarelo</option>
                          <option value="red">Vermelho</option>
                        </select>
                      </td>
                      <td className="p-0 border border-[#eee] text-center bg-green-50/30">
                        <select
                          value={row.newSeverity}
                          onChange={(e) => updateRow(row.id, { newSeverity: parseInt(e.target.value) })}
                          className="w-full h-full p-0 border-none bg-transparent text-center font-bold cursor-pointer min-w-[40px] appearance-none"
                          style={{ fontSize: 'inherit', textAlignLast: 'center' }}
                        >
                          {[...Array(10)].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-0 border border-[#eee] text-center bg-green-50/30">
                        <select
                          value={row.newOccurrence}
                          onChange={(e) => updateRow(row.id, { newOccurrence: parseInt(e.target.value) })}
                          className="w-full h-full p-0 border-none bg-transparent text-center font-bold cursor-pointer min-w-[40px] appearance-none"
                          style={{ fontSize: 'inherit', textAlignLast: 'center' }}
                        >
                          {[...Array(10)].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-0 border border-[#eee] text-center bg-green-50/30">
                        <select
                          value={row.newDetection}
                          onChange={(e) => updateRow(row.id, { newDetection: parseInt(e.target.value) })}
                          className="w-full h-full p-0 border-none bg-transparent text-center font-bold cursor-pointer min-w-[40px] appearance-none"
                          style={{ fontSize: 'inherit', textAlignLast: 'center' }}
                        >
                          {[...Array(10)].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </td>
                      <td className={cn(
                        "p-1 border border-[#eee] text-center font-bold bg-gray-900 text-white",
                        newRPN > thresholds.rpn.yellow ? "text-red-400" : newRPN > thresholds.rpn.green ? "text-yellow-400" : "text-green-400"
                      )}>
                        {newRPN}
                      </td>
                      <td className="p-0 border border-[#eee] text-center">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 bg-gray-50 border-t border-[#eee] flex flex-wrap justify-between items-center gap-4">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#ccc] rounded-[4px] text-[11px] font-bold text-[#666] hover:bg-gray-100 transition-all cursor-pointer shadow-sm"
            >
              <Plus size={14} /> Adicionar Linha
            </button>
            
            <div className="flex items-center gap-4 text-[10px] text-[#666] font-bold uppercase tracking-tight">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                <span>Risco Baixo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                <span>Atenção</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
                <span>Ação Obrigatória</span>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'reference' ? (
        <div className="p-8 space-y-10 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Severity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-red-500 pb-2">
                <h3 className="font-bold text-red-600 uppercase text-[13px]">Severidade (S)</h3>
                <HelpCircle size={14} className="text-red-400" />
              </div>
              <div className="border border-[#eee] rounded-[4px] overflow-hidden shadow-sm">
                {SEVERITY_TABLE.map((item) => (
                  <div key={item.score} className="flex border-b border-[#eee] last:border-0 text-[11px]">
                    <div className="w-8 bg-red-50 flex items-center justify-center font-bold text-red-700 border-r border-[#eee]">
                      {item.score}
                    </div>
                    <div className="flex-1 p-2">
                      <div className="font-bold text-[#333]">{item.title}</div>
                      <div className="text-[#666] leading-tight">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Occurrence */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-orange-500 pb-2">
                <h3 className="font-bold text-orange-600 uppercase text-[13px]">Ocorrência (O)</h3>
                <HelpCircle size={14} className="text-orange-400" />
              </div>
              <div className="border border-[#eee] rounded-[4px] overflow-hidden shadow-sm">
                {OCCURRENCE_TABLE.map((item) => (
                  <div key={item.score} className="flex border-b border-[#eee] last:border-0 text-[11px]">
                    <div className="w-8 bg-orange-50 flex items-center justify-center font-bold text-orange-700 border-r border-[#eee]">
                      {item.score}
                    </div>
                    <div className="flex-1 p-2">
                      <div className="font-bold text-[#333]">{item.title}</div>
                      <div className="text-[#666] leading-tight">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-blue-500 pb-2">
                <h3 className="font-bold text-blue-600 uppercase text-[13px]">Detecção (D)</h3>
                <HelpCircle size={14} className="text-blue-400" />
              </div>
              <div className="border border-[#eee] rounded-[4px] overflow-hidden shadow-sm">
                {DETECTION_TABLE.map((item) => (
                  <div key={item.score} className="flex border-b border-[#eee] last:border-0 text-[11px]">
                    <div className="w-8 bg-blue-50 flex items-center justify-center font-bold text-blue-700 border-r border-[#eee]">
                      {item.score}
                    </div>
                    <div className="flex-1 p-2">
                      <div className="font-bold text-[#333]">{item.title}</div>
                      <div className="text-[#666] leading-tight">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-[8px] border border-blue-100 flex gap-4 shadow-sm">
            <Info className="text-blue-500 shrink-0" size={24} />
            <div className="text-[13px] text-blue-900 leading-relaxed">
              <p className="font-bold mb-2 text-[14px]">Action Priority (AP) e Criticidade:</p>
              <p className="mb-2">O FMEA moderno prioriza ações com base na combinação de Severidade, Ocorrência e Detecção, não apenas no RPN. </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Severidade (S):</strong> Impacto da falha no cliente ou processo.</li>
                <li><strong>Ocorrência (O):</strong> Frequência com que a causa ocorre.</li>
                <li><strong>Detecção (D):</strong> Capacidade dos controles atuais de detectar a falha.</li>
                <li><strong>RPN:</strong> S × O × D (Referência clássica).</li>
                <li><strong>Criticidade:</strong> S × O (Foco na gravidade e frequência).</li>
              </ul>
            </div>
          </div>
        </div>
      ) : activeTab === 'config' ? (
        <div className="p-8 space-y-8 bg-white">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-[1.25rem] font-bold text-[#333]">Configuração de Critérios de Risco</h3>
              <p className="text-[14px] text-[#666]">Defina os limites para os indicadores visuais (Cores). Valores padrão sugeridos pelo padrão AIAG & VDA.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* RPN Config */}
              <div className="p-6 border border-[#eee] rounded-[8px] bg-gray-50 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-[#333] font-bold border-b border-[#ddd] pb-2">
                  <Activity size={16} /> RPN (S×O×D)
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#666] uppercase block mb-1">Verde até:</label>
                    <input 
                      type="number" 
                      value={thresholds.rpn.green}
                      onChange={(e) => setThresholds(prev => ({ ...prev, rpn: { ...prev.rpn, green: parseInt(e.target.value) } }))}
                      className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#666] uppercase block mb-1">Amarelo até:</label>
                    <input 
                      type="number" 
                      value={thresholds.rpn.yellow}
                      onChange={(e) => setThresholds(prev => ({ ...prev, rpn: { ...prev.rpn, yellow: parseInt(e.target.value) } }))}
                      className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#999] italic">Acima de {thresholds.rpn.yellow} será Vermelho.</p>
              </div>

              {/* Severity Config */}
              <div className="p-6 border border-[#eee] rounded-[8px] bg-gray-50 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-[#333] font-bold border-b border-[#ddd] pb-2">
                  <AlertTriangle size={16} className="text-yellow-500" /> Severidade (S)
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#666] uppercase block mb-1">Verde até:</label>
                    <input 
                      type="number" 
                      max="10"
                      value={thresholds.severity.green}
                      onChange={(e) => setThresholds(prev => ({ ...prev, severity: { ...prev.severity, green: parseInt(e.target.value) } }))}
                      className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#666] uppercase block mb-1">Amarelo até:</label>
                    <input 
                      type="number" 
                      max="10"
                      value={thresholds.severity.yellow}
                      onChange={(e) => setThresholds(prev => ({ ...prev, severity: { ...prev.severity, yellow: parseInt(e.target.value) } }))}
                      className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#999] italic">S ≥ 9 é sempre crítico (Vermelho).</p>
              </div>

              {/* Criticality Config */}
              <div className="p-6 border border-[#eee] rounded-[8px] bg-gray-50 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-[#333] font-bold border-b border-[#ddd] pb-2">
                  <TrendingUp size={16} /> Criticidade (S×O)
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#666] uppercase block mb-1">Verde até:</label>
                    <input 
                      type="number" 
                      value={thresholds.criticality.green}
                      onChange={(e) => setThresholds(prev => ({ ...prev, criticality: { ...prev.criticality, green: parseInt(e.target.value) } }))}
                      className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#666] uppercase block mb-1">Amarelo até:</label>
                    <input 
                      type="number" 
                      value={thresholds.criticality.yellow}
                      onChange={(e) => setThresholds(prev => ({ ...prev, criticality: { ...prev.criticality, yellow: parseInt(e.target.value) } }))}
                      className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-[14px]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#999] italic">Foco na gravidade e frequência.</p>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-[8px] border border-purple-100 space-y-3 shadow-sm">
              <h4 className="font-bold text-purple-900 flex items-center gap-2">
                <Info size={18} /> Como funcionam os Indicadores?
              </h4>
              <p className="text-[13px] text-purple-800 leading-relaxed">
                O sistema analisa 4 fatores simultaneamente: <strong>RPN, Severidade, Criticidade e Action Priority (AP)</strong>. 
                Se <strong>qualquer um</strong> desses fatores atingir o nível Vermelho, o item inteiro será marcado como <strong>Ação Obrigatória</strong>. 
                Isso garante que falhas graves (Alta Severidade) não passem despercebidas mesmo que tenham baixa ocorrência.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2 border-b border-[#eee] pb-6">
              <h3 className="text-[1.5rem] font-bold text-[#1f2937]">Guia de Preenchimento do FMEA</h3>
              <p className="text-[14px] text-[#666]">Entenda o que deve ser inserido em cada coluna da planilha.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#1f2937] text-white rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-[#1f2937] text-[14px] uppercase">Processo / Produto</h4>
                    <p className="text-[13px] text-[#666]">Descreva a Etapa do Processo, Produto ou Sistema que está sendo analisado.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#1f2937] text-white rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-[#1f2937] text-[14px] uppercase">Modo de Falha</h4>
                    <p className="text-[13px] text-[#666]">Descreva o defeito potencial. O que pode dar errado nesta etapa?</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#1f2937] text-white rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-[#1f2937] text-[14px] uppercase">Efeito da Falha</h4>
                    <p className="text-[13px] text-[#666]">O que acontece quando ocorre o modo de falha? Qual o impacto no cliente ou no processo seguinte?</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">S</div>
                  <div>
                    <h4 className="font-bold text-red-600 text-[14px] uppercase">Severidade</h4>
                    <p className="text-[13px] text-[#666]">Qual a gravidade do efeito com relação ao cliente? (Escala de 1 a 10).</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#1f2937] text-white rounded-full flex items-center justify-center shrink-0 font-bold">4</div>
                  <div>
                    <h4 className="font-bold text-[#1f2937] text-[14px] uppercase">Causa da Falha</h4>
                    <p className="text-[13px] text-[#666]">Por que ocorre o modo de falha? Use os 6Ms (Mão de obra, Máquina, Material, Método, Medida, Meio ambiente).</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">O</div>
                  <div>
                    <h4 className="font-bold text-orange-600 text-[14px] uppercase">Ocorrência</h4>
                    <p className="text-[13px] text-[#666]">Qual a frequência com que a causa ocorre? Considere os controles de prevenção atuais.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#1f2937] text-white rounded-full flex items-center justify-center shrink-0 font-bold">5</div>
                  <div>
                    <h4 className="font-bold text-[#1f2937] text-[14px] uppercase">Controles Atuais</h4>
                    <p className="text-[13px] text-[#666]">Descreva os controles atuais de detecção ou prevenção para este modo de falha ou causa.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">D</div>
                  <div>
                    <h4 className="font-bold text-blue-600 text-[14px] uppercase">Detecção</h4>
                    <p className="text-[13px] text-[#666]">Quão bem o controle atual consegue detectar a falha antes que ela chegue ao cliente?</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center shrink-0 font-bold">R</div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-[14px] uppercase">RPN / AP</h4>
                    <p className="text-[13px] text-[#666]">RPN (S×O×D) e Action Priority (AP) indicam a urgência de ação corretiva.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">!</div>
                  <div>
                    <h4 className="font-bold text-green-600 text-[14px] uppercase">Ações e Status</h4>
                    <p className="text-[13px] text-[#666]">Ações tomadas para evitar o problema, responsável, prazo e status visual do progresso.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-gray-50 border border-[#eee] rounded-[8px]">
              <h4 className="font-bold text-[#333] mb-4 flex items-center gap-2 uppercase text-[14px]">
                <ShieldAlert size={18} className="text-red-600" /> Regra de Ouro da Severidade
              </h4>
              <p className="text-[13px] text-[#666] leading-relaxed">
                No FMEA moderno, a <strong>Severidade</strong> é o fator mais importante. Se a Severidade for 9 ou 10, 
                uma ação é <strong>obrigatória</strong>, independentemente do valor do RPN ou da Ocorrência. 
                O sistema irá inserir automaticamente um lembrete de ação mandatória caso o risco seja detectado como crítico.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 bg-white border-t border-[#eee] flex justify-end">
        <button
          data-save-trigger
          onClick={handleSave}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-md"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar FMEA
        </button>
      </div>
    </div>
  </div>
);
}
