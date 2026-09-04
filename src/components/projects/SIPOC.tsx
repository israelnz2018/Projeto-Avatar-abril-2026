import React, { useState, useEffect, useLayoutEffect } from 'react';
import { listaDeTextos } from '@/src/lib/textoDeValor';
import { Truck, Package, Settings, PackageCheck, UserCheck, Plus, Trash2, CheckCircle2, Info, Sparkles, Loader2, BookOpen, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

// Exemplos prontos exibidos no modal "Ver exemplo" — read-only, não tocam
// nos dados do aluno. Um de ESCRITÓRIO, outro de MANUFATURA.
// LEMBRETE METODOLÓGICO: as colunas são listas INDEPENDENTES (não há
// correlação linha a linha). Só o Processo tem ordem (etapas 1→5).
const SIPOC_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    titulo: 'Pagamento a Fornecedores',
    suppliers: ['Fornecedor (emite a nota)', 'Área requisitante', 'Setor de Compras', 'Banco', 'Tesouraria'],
    inputs: ['Nota fiscal', 'Pedido de compra', 'Contrato / condições de pagamento', 'Dados bancários do fornecedor', 'Saldo / fluxo de caixa'],
    process: ['1. Receber e conferir a nota fiscal', '2. Validar contra o pedido de compra', '3. Aprovar o pagamento', '4. Agendar no sistema bancário', '5. Efetuar o pagamento'],
    outputs: ['Pagamento efetuado', 'Comprovante de pagamento', 'Lançamento contábil', 'Nota fiscal arquivada'],
    customers: ['Fornecedor', 'Contabilidade', 'Fisco / Auditoria', 'Tesouraria'],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    titulo: 'Inspeção de Qualidade de Produto Fabricado',
    suppliers: ['Linha de produção', 'Almoxarifado (amostras)', 'Engenharia da Qualidade', 'Fornecedor do instrumento de medição', 'Setor de Metrologia'],
    inputs: ['Produto/peça fabricada', 'Plano de inspeção', 'Especificação técnica / desenho', 'Instrumento de medição calibrado', 'Critérios de aceitação (tolerâncias)'],
    process: ['1. Coletar a amostra da produção', '2. Medir as características críticas', '3. Comparar com a especificação', '4. Aprovar ou reprovar o lote', '5. Registrar o resultado e liberar/segregar'],
    outputs: ['Produto aprovado (liberado)', 'Produto reprovado (segregado)', 'Relatório de inspeção', 'Registro de não-conformidade', 'Dados pra carta de controle'],
    customers: ['Cliente final', 'Linha de montagem / próxima etapa', 'Engenharia da Qualidade', 'PCP (Planejamento de Produção)'],
  },
];

interface SIPOCProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

interface ColumnProps {
  title: string;
  icon: any;
  column: string;
  color: string;
  placeholder: string;
  items: string[];
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

const Column = ({ title, icon: Icon, color, placeholder, items = [], onUpdate, onRemove, onAdd }: ColumnProps) => (
  <div className="flex-1 min-w-[200px] flex flex-col bg-white border border-[#ccc] rounded-[4px] overflow-hidden shadow-sm">
    <div className={cn("p-4 flex items-center gap-2 border-b border-[#eee]", color)}>
      <Icon size={20} className="text-white" />
      <h3 className="text-white font-bold text-[14px] uppercase tracking-wider">{title}</h3>
    </div>
    <div className="px-2 py-4 flex-1 space-y-2 bg-[#fcfcfc]">
      {(items || []).map((item: string, idx: number) => (
        <div key={idx} className="flex items-center gap-1 group relative">
          <textarea
            value={item || ''}
            onChange={(e) => {
              onUpdate(idx, e.target.value);
              // Auto resize
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onFocus={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-white border border-[#eee] focus:ring-2 focus:ring-blue-300 rounded-[2px] px-2 py-2 text-[12px] transition-all outline-none whitespace-normal break-words overflow-hidden"
            style={{ 
              minHeight: '40px',
              lineHeight: '1.5',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          />
          <button 
            onClick={() => onRemove(idx)}
            className="absolute right-1 top-1 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer z-10"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button 
        onClick={onAdd}
        className="w-full py-2 flex items-center justify-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-dashed border-[#ddd] rounded-[2px] transition-all cursor-pointer"
      >
        <Plus size={14} /> Adicionar
      </button>
    </div>
  </div>
);

export default function SIPOC({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: SIPOCProps) {
  const defaultData = {
    suppliers: [],
    inputs: [],
    process: [],
    outputs: [],
    customers: []
  };

  // As 5 colunas são listas de TEXTO. Dado já salvo por uma geração antiga pode ter
  // objeto no lugar do texto — sem converter, a célula imprime "[object Object]".
  const comoLista = listaDeTextos;

  const [data, setData] = useState(() => {
    if (!initialData) return defaultData;
    const d = initialData.toolData || initialData;
    return {
      suppliers: comoLista(d.suppliers),
      inputs: comoLista(d.inputs),
      process: comoLista(d.process),
      outputs: comoLista(d.outputs),
      customers: comoLista(d.customers),
    };
  });

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  const isToolEmpty = data.suppliers.length === 0 && 
                     data.inputs.length === 0 && 
                     data.process.length === 0 && 
                     data.outputs.length === 0 && 
                     data.customers.length === 0;

  useEffect(() => {
    if (initialData) {
      const d = initialData.toolData || initialData;
      setData({
        suppliers: comoLista(d.suppliers),
        inputs: comoLista(d.inputs),
        process: comoLista(d.process),
        outputs: comoLista(d.outputs),
        customers: comoLista(d.customers),
      });
    } else {
      setData(defaultData);
    }
  }, [initialData]);

  useLayoutEffect(() => {
    // Automatically adjust height of all textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((t) => {
      const el = t as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }, [data]);

  const addItem = (column: keyof typeof data) => {
    setData((prev: any) => ({
      ...prev,
      [column]: [...prev[column], '']
    }));
  };

  const removeItem = (column: keyof typeof data, index: number) => {
    setData((prev: any) => ({
      ...prev,
      [column]: prev[column].filter((_: any, i: number) => i !== index)
    }));
  };

  const updateItem = (column: keyof typeof data, index: number, value: string) => {
    setData((prev: any) => {
      const newList = [...prev[column]];
      newList[index] = value;
      return { ...prev, [column]: newList };
    });
  };

  return (
    <div className="space-y-8">
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

      <div className="bg-white p-6 border border-[#ccc] rounded-[4px] shadow-sm w-full overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#eee] pb-4 mb-6">
          <Settings className="text-[#3b82f6]" size={24} />
          <div className="flex-1">
            <h2 className="text-[1.25rem] font-bold text-[#333]">SIPOC</h2>
            <p className="text-[12px] text-[#666]">Visão macro do processo: Fornecedores, Entradas, Processo, Saídas e Clientes.</p>
          </div>
          <button
            onClick={() => setShowExemplo(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 bg-white cursor-pointer shrink-0"
          >
            <BookOpen size={14} />
            Ver exemplo
          </button>
        </div>

        <div className="flex flex-nowrap gap-4 items-stretch overflow-x-auto pb-4">
          <Column
            title="Fornecedores (Suppliers)"
            icon={Truck}
            column="suppliers"
            color="bg-[#1f2937]" 
            placeholder="Quem fornece?"
            items={data.suppliers}
            onUpdate={(idx, val) => updateItem('suppliers', idx, val)}
            onRemove={(idx) => removeItem('suppliers', idx)}
            onAdd={() => addItem('suppliers')}
          />
          <Column
            title="Entradas (Inputs)"
            icon={Package}
            column="inputs"
            color="bg-[#374151]" 
            placeholder="O que é fornecido?"
            items={data.inputs}
            onUpdate={(idx, val) => updateItem('inputs', idx, val)}
            onRemove={(idx) => removeItem('inputs', idx)}
            onAdd={() => addItem('inputs')}
          />
          <Column
            title="Processo (Process)"
            icon={Settings}
            column="process"
            color="bg-[#4b5563]" 
            placeholder="Etapa do processo..."
            items={data.process}
            onUpdate={(idx, val) => updateItem('process', idx, val)}
            onRemove={(idx) => removeItem('process', idx)}
            onAdd={() => addItem('process')}
          />
          <Column
            title="Saídas (Outputs)"
            icon={PackageCheck}
            column="outputs"
            color="bg-[#6b7280]" 
            placeholder="O que é entregue?"
            items={data.outputs}
            onUpdate={(idx, val) => updateItem('outputs', idx, val)}
            onRemove={(idx) => removeItem('outputs', idx)}
            onAdd={() => addItem('outputs')}
          />
          <Column
            title="Clientes (Customers)"
            icon={UserCheck}
            column="customers"
            color="bg-[#9ca3af]" 
            placeholder="Quem recebe?"
            items={data.customers}
            onUpdate={(idx, val) => updateItem('customers', idx, val)}
            onRemove={(idx) => removeItem('customers', idx)}
            onAdd={() => addItem('customers')}
          />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-[4px] flex gap-3 items-start border border-blue-100">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-[12px] text-blue-800 leading-relaxed">
            <strong>Dica:</strong> Comece pelo <strong>Processo</strong> (5 a 7 etapas macro), depois identifique as <strong>Saídas</strong> e os <strong>Clientes</strong>. 
            Por fim, determine as <strong>Entradas</strong> necessárias e seus respectivos <strong>Fornecedores</strong>.
          </p>
        </div>

      <div className="flex justify-end pt-6 border-t border-[#eee]">
        <button
          data-save-trigger
          onClick={() => onSave(data)}
          className="bg-[#10b981] text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-lg"
        >
          <CheckCircle2 size={18} className="mr-2" />
          Salvar SIPOC
        </button>
      </div>
      </div>

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExemplo(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de SIPOC</h3>
                  <p className="text-xs text-gray-500 m-0">{SIPOC_EXEMPLOS[exemploIdx].titulo}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemplo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Abas — Escritório / Manufatura */}
            <div className="flex gap-2 px-6 pt-4">
              {SIPOC_EXEMPLOS.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setExemploIdx(i)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                    exemploIdx === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { titulo: 'Fornecedores (Suppliers)', cor: 'bg-[#1f2937]', itens: SIPOC_EXEMPLOS[exemploIdx].suppliers },
                  { titulo: 'Entradas (Inputs)', cor: 'bg-[#374151]', itens: SIPOC_EXEMPLOS[exemploIdx].inputs },
                  { titulo: 'Processo (Process)', cor: 'bg-[#4b5563]', itens: SIPOC_EXEMPLOS[exemploIdx].process },
                  { titulo: 'Saídas (Outputs)', cor: 'bg-[#6b7280]', itens: SIPOC_EXEMPLOS[exemploIdx].outputs },
                  { titulo: 'Clientes (Customers)', cor: 'bg-[#9ca3af]', itens: SIPOC_EXEMPLOS[exemploIdx].customers },
                ].map((col) => (
                  <div key={col.titulo} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                    <div className={cn('px-3 py-2', col.cor)}>
                      <h4 className="text-white font-bold text-[11px] uppercase tracking-wider m-0 leading-tight">{col.titulo}</h4>
                    </div>
                    <div className="p-2 space-y-1.5 bg-gray-50 flex-1">
                      {col.itens.map((item, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded px-2 py-1.5 text-[12px] text-gray-700 leading-snug">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  <strong>Como ler:</strong> cada coluna é uma lista <strong>independente</strong> — não há
                  relação linha a linha entre elas. Só o <strong>Processo</strong> tem ordem (etapas 1 → 5).
                  Este exemplo é só pra ilustrar — ele <strong>não altera</strong> o seu SIPOC.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
