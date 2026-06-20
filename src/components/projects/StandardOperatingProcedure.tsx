import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Save, Info, Plus, Trash2, FileText, ChevronDown, ChevronRight, Sparkles, Loader2, BookOpen, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

// Exemplos prontos exibidos no modal "Ver exemplo" — read-only, NÃO tocam nos
// dados do aluno. Um de ESCRITÓRIO, outro de MANUFATURA. Servem só pra consulta:
// mostram como um POP completo fica preenchido de ponta a ponta.
const SOP_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    header: {
      title: 'Abertura de Solicitação de Compra',
      code: 'POP-SUP-014',
      version: '2.0',
      department: 'Suprimentos',
      author: 'Analista de Compras',
      approver: 'Gerente de Suprimentos',
    },
    objective: 'Padronizar a abertura de solicitações de compra para garantir que todo pedido tenha justificativa, orçamento aprovado e dados completos antes de seguir para cotação, reduzindo retrabalho e atrasos.',
    scope: 'Aplica-se a todas as áreas que solicitam compra de materiais ou serviços, exceto compras emergenciais (tratadas no POP-SUP-020).',
    definitions: [
      { term: 'SC', definition: 'Solicitação de Compra — documento que inicia o processo de aquisição.' },
      { term: 'Centro de Custo', definition: 'Código contábil que identifica a área que arcará com a despesa.' },
    ],
    responsibilities: [
      { role: 'Solicitante', responsibility: 'Preencher a SC com justificativa e centro de custo corretos.' },
      { role: 'Gestor da área', responsibility: 'Aprovar ou recusar a SC dentro de 2 dias úteis.' },
      { role: 'Comprador', responsibility: 'Conferir os dados e iniciar a cotação após aprovação.' },
    ],
    processSteps: [
      'Acessar o sistema e abrir uma nova Solicitação de Compra.',
      'Preencher item, quantidade, justificativa e centro de custo.',
      'Anexar especificação técnica ou referência do item.',
      'Enviar a SC para aprovação do gestor da área.',
      'Após aprovação, a SC segue automaticamente para o comprador.',
    ],
    controlPoints: [
      { step: 'Preenchimento da SC', criteria: 'Centro de custo válido e justificativa preenchida (campos obrigatórios).' },
      { step: 'Aprovação do gestor', criteria: 'Aprovar somente dentro da alçada orçamentária da área.' },
    ],
    risks: [
      { risk: 'SC sem orçamento disponível', control: 'Bloqueio automático do sistema se o centro de custo estiver sem saldo.' },
      { risk: 'Especificação incompleta gera compra errada', control: 'Campo de anexo obrigatório antes do envio.' },
    ],
    records: [
      { name: 'Solicitação de Compra aprovada', location: 'Sistema ERP — módulo Compras', retention: '5 anos' },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    header: {
      title: 'Setup de Troca de Ferramenta na Prensa',
      code: 'POP-PROD-031',
      version: '3.1',
      department: 'Produção',
      author: 'Líder de Produção',
      approver: 'Engenheiro de Processo',
    },
    objective: 'Padronizar a troca de ferramenta na prensa para reduzir o tempo de setup, garantir a segurança do operador e assegurar a conformidade dimensional da primeira peça produzida.',
    scope: 'Aplica-se às prensas P-01 a P-04 do setor de estamparia. Não cobre manutenção corretiva da prensa (ver POP-MAN-009).',
    definitions: [
      { term: 'Setup', definition: 'Conjunto de atividades para preparar a máquina para produzir um novo item.' },
      { term: 'Primeira peça', definition: 'Peça produzida logo após o setup, usada para validar o ajuste.' },
    ],
    responsibilities: [
      { role: 'Operador', responsibility: 'Executar o setup seguindo a sequência e usar os EPIs.' },
      { role: 'Inspetor da Qualidade', responsibility: 'Validar a primeira peça antes de liberar a produção.' },
      { role: 'Líder de Produção', responsibility: 'Garantir que a ferramenta correta esteja disponível.' },
    ],
    processSteps: [
      'Desligar a prensa e aplicar o bloqueio de segurança (LOTO).',
      'Remover a ferramenta atual e registrar o contador de golpes.',
      'Instalar a nova ferramenta conforme a ficha de setup.',
      'Ajustar altura e pressão conforme parâmetros do item.',
      'Produzir a primeira peça e enviar para inspeção.',
      'Liberar a produção somente após aprovação da primeira peça.',
    ],
    controlPoints: [
      { step: 'Bloqueio de segurança', criteria: 'LOTO aplicado e confirmado antes de qualquer intervenção.' },
      { step: 'Aprovação da primeira peça', criteria: 'Medidas críticas dentro da tolerância do desenho.' },
    ],
    risks: [
      { risk: 'Prensa acionada durante o setup', control: 'Bloqueio LOTO obrigatório — chave sob posse do operador.' },
      { risk: 'Produzir lote fora de especificação', control: 'Liberação condicionada à aprovação da primeira peça pela Qualidade.' },
    ],
    records: [
      { name: 'Ficha de setup preenchida', location: 'Pasta do setor — arquivo físico e digital', retention: '3 anos' },
      { name: 'Registro de aprovação da 1ª peça', location: 'Sistema da Qualidade', retention: '3 anos' },
    ],
  },
];

interface SOPHeader {
  title: string;
  code: string;
  version: string;
  issueDate: string;
  revisionDate: string;
  author: string;
  approver: string;
  department: string;
}

interface SOPRevision {
  id: string;
  version: string;
  date: string;
  description: string;
  responsible: string;
}

interface SOPDefinition {
  id: string;
  term: string;
  definition: string;
}

interface SOPResponsibility {
  id: string;
  role: string;
  responsibility: string;
}

interface SOPStep {
  id: string;
  description: string;
}

interface SOPFlowchartNode {
  id: string;
  type: 'Início' | 'Etapa' | 'Decisão' | 'Fim';
  text: string;
}

interface SOPControlPoint {
  id: string;
  step: string;
  criteria: string;
}

interface SOPRisk {
  id: string;
  risk: string;
  control: string;
}

interface SOPRecord {
  id: string;
  name: string;
  location: string;
  retention: string;
}

interface SOPData {
  header: SOPHeader;
  revisions: SOPRevision[];
  objective: string;
  scope: string;
  definitions: SOPDefinition[];
  responsibilities: SOPResponsibility[];
  processSteps: SOPStep[];
  flowchart: SOPFlowchartNode[];
  controlPoints: SOPControlPoint[];
  risks: SOPRisk[];
  records: SOPRecord[];
  reviewFrequency: string;
  attachments: string;
}

interface SOPProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const DEFAULT_DATA: SOPData = {
  header: {
    title: '', code: '', version: '1.0', issueDate: '', revisionDate: '', author: '', approver: '', department: ''
  },
  revisions: [{ id: '1', version: '1.0', date: '', description: 'Emissão inicial', responsible: '' }],
  objective: '',
  scope: '',
  definitions: [],
  responsibilities: [
    { id: '1', role: 'Executor', responsibility: '' },
    { id: '2', role: 'Revisor', responsibility: '' },
    { id: '3', role: 'Aprovador', responsibility: '' }
  ],
  processSteps: [{ id: '1', description: '' }],
  flowchart: [
    { id: '1', type: 'Início', text: 'Início do processo' },
    { id: '2', type: 'Etapa', text: '' },
    { id: '3', type: 'Fim', text: 'Fim do processo' }
  ],
  controlPoints: [],
  risks: [],
  records: [],
  reviewFrequency: 'Anual',
  attachments: ''
};

export default function StandardOperatingProcedure({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: SOPProps) {
  const d = initialData?.toolData || initialData;
  const [data, setData] = useState<SOPData>(d?.header ? d : DEFAULT_DATA);
  const isToolEmpty = !data.header.title && !data.objective && (data.processSteps.length <= 1 && !data.processSteps[0]?.description);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    header: true, revisions: false, objective: false, scope: false, definitions: false,
    responsibilities: false, processSteps: true, flowchart: false, controlPoints: false,
    risks: false, records: false, review: false, attachments: false
  });
  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  useEffect(() => {
    if (initialData) {
      const toolData = initialData.toolData || initialData;
      if (toolData?.header) {
        setData(toolData);
      }
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
  }, [data, expandedSections]);

  const handleSave = () => {
    onSave(data);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateHeader = (field: keyof SOPHeader, value: string) => {
    setData(prev => ({ ...prev, header: { ...prev.header, [field]: value } }));
  };

  const updateField = (field: keyof SOPData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Generic array updaters
  const addArrayItem = (field: keyof SOPData, defaultItem: any) => {
    setData(prev => ({ ...prev, [field]: [...(prev[field] as any[]), { ...defaultItem, id: Date.now().toString() }] }));
  };

  const removeArrayItem = (field: keyof SOPData, id: string) => {
    setData(prev => ({ ...prev, [field]: (prev[field] as any[]).filter(item => item.id !== id) }));
  };

  const updateArrayItem = (field: keyof SOPData, id: string, itemField: string, value: string) => {
    setData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).map(item => item.id === id ? { ...item, [itemField]: value } : item)
    }));
  };

  const SectionHeader = ({ id, title, index }: { id: string, title: string, index: number }) => (
    <div 
      className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
          {index}
        </span>
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      {expandedSections[id] ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
    </div>
  );

  return (
    <div className="space-y-6">

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

      <div className="animate-in fade-in duration-500 flex items-start gap-6">
      
      {/* Sidebar Index */}
      <div className="w-64 shrink-0 sticky top-6 hidden lg:block">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            Índice do POP
          </h4>
          <nav className="space-y-1">
            {[
              { id: 'header', label: '1. Cabeçalho' },
              { id: 'revisions', label: '2. Controle de Versão' },
              { id: 'objective', label: '3. Objetivo' },
              { id: 'scope', label: '4. Escopo' },
              { id: 'definitions', label: '5. Definições' },
              { id: 'responsibilities', label: '6. Responsabilidades' },
              { id: 'processSteps', label: '7. Descrição do Processo' },
              { id: 'flowchart', label: '8. Fluxograma' },
              { id: 'controlPoints', label: '9. Pontos de Controle' },
              { id: 'risks', label: '10. Riscos e Controles' },
              { id: 'records', label: '11. Registros' },
              { id: 'review', label: '12. Revisão e Aprovação' },
              { id: 'attachments', label: '13. Anexos' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setExpandedSections(prev => ({ ...prev, [item.id]: true }));
                  document.getElementById(`section-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs rounded transition-colors",
                  expandedSections[item.id] ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm overflow-hidden min-h-[297mm] print:border-none print:shadow-none">
          <div className="p-6 border-b border-[#eee] bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-bold text-[#1f2937] text-[1.1rem]">Procedimento Operacional Padrão (POP)</h3>
                <p className="text-xs text-[#666]">Documente o processo melhorado para garantir a padronização.</p>
              </div>
            </div>
            <button
              onClick={() => setShowExemplo(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 bg-white cursor-pointer shrink-0"
            >
              <BookOpen size={14} />
              Ver exemplo
            </button>
            <button data-save-trigger onClick={handleSave} className="hidden" />
          </div>

          <div className="divide-y divide-gray-200">
            
            {/* 1. Cabeçalho */}
            <div id="section-header">
              <SectionHeader id="header" title="Cabeçalho do Documento" index={1} />
              {expandedSections.header && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="col-span-1 md:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Procedimento</label>
                    <input type="text" value={data.header.title} onChange={e => updateHeader('title', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ex: Procedimento de Setup de Máquina" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Código</label>
                    <input type="text" value={data.header.code} onChange={e => updateHeader('code', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="POP-PROD-001" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Versão</label>
                    <input type="text" value={data.header.version} onChange={e => updateHeader('version', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Data de Emissão</label>
                    <input type="date" value={data.header.issueDate} onChange={e => updateHeader('issueDate', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Data de Revisão</label>
                    <input type="date" value={data.header.revisionDate} onChange={e => updateHeader('revisionDate', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Autor</label>
                    <input type="text" value={data.header.author} onChange={e => updateHeader('author', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Aprovador</label>
                    <input type="text" value={data.header.approver} onChange={e => updateHeader('approver', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Área / Departamento</label>
                    <input type="text" value={data.header.department} onChange={e => updateHeader('department', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Controle de Versão */}
            <div id="section-revisions">
              <SectionHeader id="revisions" title="Controle de Versão" index={2} />
              {expandedSections.revisions && (
                <div className="p-6">
                  <table className="w-full text-left border-collapse mb-4 border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-24">Versão</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-32">Data</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600">Descrição da Mudança</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-40">Responsável</th>
                        <th className="p-2 border border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.revisions.map((rev) => (
                        <tr key={rev.id} className="border-b border-gray-100">
                          <td className="p-2 border border-gray-200">
                            <input type="text" value={rev.version} onChange={e => updateArrayItem('revisions', rev.id, 'version', e.target.value)} className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent" />
                          </td>
                          <td className="p-2 border border-gray-200">
                             <input type="date" value={rev.date} onChange={e => updateArrayItem('revisions', rev.id, 'date', e.target.value)} className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent" />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={rev.description} 
                              onChange={e => updateArrayItem('revisions', rev.id, 'description', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent resize-none leading-tight overflow-hidden"
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                              rows={1}
                            />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <input type="text" value={rev.responsible} onChange={e => updateArrayItem('revisions', rev.id, 'responsible', e.target.value)} className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent" />
                          </td>
                          <td className="p-2 text-center border border-gray-200">
                            <button onClick={() => removeArrayItem('revisions', rev.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addArrayItem('revisions', { version: '', date: '', description: '', responsible: '' })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={14} /> Adicionar Revisão
                  </button>
                </div>
              )}
            </div>

            {/* 3. Objetivo */}
            <div id="section-objective">
              <SectionHeader id="objective" title="Objetivo" index={3} />
              {expandedSections.objective && (
                <div className="p-6">
                  <p className="text-xs text-gray-500 mb-2">Descreva para que serve este procedimento e qual problema ele resolve.</p>
                  <textarea 
                    value={data.objective} 
                    onChange={e => updateField('objective', e.target.value)} 
                    className="w-full border border-gray-300 rounded p-2 text-sm resize-none"
                    placeholder="Este procedimento tem como objetivo padronizar a execução de..."
                    rows={1}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = t.scrollHeight + 'px';
                    }}
                  />
                </div>
              )}
            </div>

            {/* 4. Escopo */}
            <div id="section-scope">
              <SectionHeader id="scope" title="Escopo" index={4} />
              {expandedSections.scope && (
                <div className="p-6">
                  <p className="text-xs text-gray-500 mb-2">Onde se aplica, quem deve usar e quais os limites do procedimento.</p>
                  <textarea 
                    value={data.scope} 
                    onChange={e => updateField('scope', e.target.value)} 
                    className="w-full border border-gray-300 rounded p-2 text-sm resize-none"
                    placeholder="Aplica-se a todos os operadores da linha de montagem X..."
                    rows={1}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = t.scrollHeight + 'px';
                    }}
                  />
                </div>
              )}
            </div>

            {/* 5. Definições */}
            <div id="section-definitions">
              <SectionHeader id="definitions" title="Definições e Siglas" index={5} />
              {expandedSections.definitions && (
                <div className="p-6">
                  <table className="w-full text-left border-collapse mb-4 border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-1/3">Termo / Sigla</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600">Definição</th>
                        <th className="p-2 border border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.definitions.map((def) => (
                        <tr key={def.id} className="border-b border-gray-100">
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={def.term} 
                              onChange={e => updateArrayItem('definitions', def.id, 'term', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent resize-none"
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={def.definition} 
                              onChange={e => updateArrayItem('definitions', def.id, 'definition', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent resize-none"
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 text-center border border-gray-200">
                            <button onClick={() => removeArrayItem('definitions', def.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addArrayItem('definitions', { term: '', definition: '' })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={14} /> Adicionar Definição
                  </button>
                </div>
              )}
            </div>

            {/* 6. Responsabilidades */}
            <div id="section-responsibilities">
              <SectionHeader id="responsibilities" title="Responsabilidades" index={6} />
              {expandedSections.responsibilities && (
                <div className="p-6">
                  <table className="w-full text-left border-collapse mb-4 border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-1/3">Papel</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600">Responsabilidade</th>
                        <th className="p-2 border border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.responsibilities.map((resp) => (
                        <tr key={resp.id} className="border-b border-gray-100">
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={resp.role} 
                              onChange={e => updateArrayItem('responsibilities', resp.id, 'role', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent font-medium resize-none overflow-hidden"
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={resp.responsibility} 
                              onChange={e => updateArrayItem('responsibilities', resp.id, 'responsibility', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-xs bg-transparent resize-none"
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 text-center border border-gray-200">
                            <button onClick={() => removeArrayItem('responsibilities', resp.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addArrayItem('responsibilities', { role: '', responsibility: '' })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={14} /> Adicionar Responsabilidade
                  </button>
                </div>
              )}
            </div>

            {/* 7. Descrição do Processo */}
            <div id="section-processSteps">
              <SectionHeader id="processSteps" title="Descrição do Processo (Passo a Passo)" index={7} />
              {expandedSections.processSteps && (
                <div className="p-6">
                  <p className="text-xs text-gray-500 mb-4">Descreva as etapas do processo em sequência lógica e linguagem clara.</p>
                  <div className="space-y-3 mb-4">
                    {data.processSteps.map((step, index) => (
                      <div key={step.id} className="flex gap-3 items-start bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="w-8 h-8 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <textarea 
                          value={step.description} 
                          onChange={e => updateArrayItem('processSteps', step.id, 'description', e.target.value)} 
                          placeholder="Descreva a ação a ser executada..." 
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm min-h-[60px] focus:ring-1 focus:ring-blue-500 outline-none resize-none overflow-hidden" 
                        />
                        <button onClick={() => removeArrayItem('processSteps', step.id)} className="mt-2 text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addArrayItem('processSteps', { description: '' })} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded">
                    <Plus size={16} /> Adicionar Etapa
                  </button>
                </div>
              )}
            </div>

            {/* 8. Fluxograma Textual */}
            <div id="section-flowchart">
              <SectionHeader id="flowchart" title="Fluxograma (Textual)" index={8} />
              {expandedSections.flowchart && (
                <div className="p-6">
                  <p className="text-xs text-gray-500 mb-4">Representação estruturada do fluxo de trabalho.</p>
                  <div className="space-y-2 mb-4 relative">
                    {data.flowchart.map((node, index) => (
                      <div key={node.id} className="flex gap-3 items-center relative z-10">
                        <select 
                          value={node.type} 
                          onChange={e => updateArrayItem('flowchart', node.id, 'type', e.target.value)}
                          className={cn(
                            "w-28 border border-gray-300 rounded px-2 py-1.5 text-xs font-bold text-center",
                            node.type === 'Início' || node.type === 'Fim' ? "bg-gray-800 text-white rounded-full" :
                            node.type === 'Decisão' ? "bg-yellow-100 text-yellow-800" : "bg-blue-50 text-blue-800"
                          )}
                        >
                          <option value="Início">Início</option>
                          <option value="Etapa">Etapa</option>
                          <option value="Decisão">Decisão</option>
                          <option value="Fim">Fim</option>
                        </select>
                        <input 
                          type="text" 
                          value={node.text} 
                          onChange={e => updateArrayItem('flowchart', node.id, 'text', e.target.value)} 
                          placeholder="Descrição do nó..." 
                          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm" 
                        />
                        <button onClick={() => removeArrayItem('flowchart', node.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    {/* Linha conectora vertical */}
                    <div className="absolute left-14 top-4 bottom-4 w-0.5 bg-gray-300 -z-10"></div>
                  </div>
                  <button onClick={() => addArrayItem('flowchart', { type: 'Etapa', text: '' })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={14} /> Adicionar Nó ao Fluxo
                  </button>
                </div>
              )}
            </div>

            {/* 9. Pontos de Controle */}
            <div id="section-controlPoints">
              <SectionHeader id="controlPoints" title="Pontos de Controle" index={9} />
              {expandedSections.controlPoints && (
                <div className="p-6">
                  <table className="w-full text-left border-collapse mb-4 border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-1/3">Onde Validar (Etapa)</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600">Critérios de Aceitação / Checkpoint</th>
                        <th className="p-2 border border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.controlPoints.map((cp) => (
                        <tr key={cp.id} className="border-b border-gray-100">
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={cp.step} 
                              onChange={e => updateArrayItem('controlPoints', cp.id, 'step', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent resize-none"
                              placeholder="Ex: Após etapa 3" 
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={cp.criteria} 
                              onChange={e => updateArrayItem('controlPoints', cp.id, 'criteria', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent resize-none"
                              placeholder="Ex: Temperatura deve estar entre 80-85°C" 
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 text-center border border-gray-200">
                            <button onClick={() => removeArrayItem('controlPoints', cp.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addArrayItem('controlPoints', { step: '', criteria: '' })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={14} /> Adicionar Ponto de Controle
                  </button>
                </div>
              )}
            </div>

            {/* 10. Riscos e Controles */}
            <div id="section-risks">
              <SectionHeader id="risks" title="Riscos e Controles Preventivos" index={10} />
              {expandedSections.risks && (
                <div className="p-6">
                  <table className="w-full text-left border-collapse mb-4 border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-[45%]">Risco / Possível Falha</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600">Controle Preventivo / Mitigação</th>
                        <th className="p-2 border border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.risks.map((risk) => (
                        <tr key={risk.id} className="border-b border-gray-100">
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={risk.risk} 
                              onChange={e => updateArrayItem('risks', risk.id, 'risk', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent resize-none"
                              placeholder="Ex: Esquecer de calibrar a balança" 
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={risk.control} 
                              onChange={e => updateArrayItem('risks', risk.id, 'control', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent resize-none"
                              placeholder="Ex: Checklist obrigatório no início do turno" 
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 text-center border border-gray-200">
                            <button onClick={() => removeArrayItem('risks', risk.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addArrayItem('risks', { risk: '', control: '' })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={14} /> Adicionar Risco
                  </button>
                </div>
              )}
            </div>

            {/* 11. Registros */}
            <div id="section-records">
              <SectionHeader id="records" title="Registros e Documentos Gerados" index={11} />
              {expandedSections.records && (
                <div className="p-6">
                  <table className="w-full text-left border-collapse mb-4 border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-1/3">Nome do Registro</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600 w-1/3">Local de Armazenamento</th>
                        <th className="p-2 border border-gray-200 text-xs font-bold text-gray-600">Tempo de Retenção</th>
                        <th className="p-2 border border-gray-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((rec) => (
                        <tr key={rec.id} className="border-b border-gray-100">
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={rec.name} 
                              onChange={e => updateArrayItem('records', rec.id, 'name', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent resize-none"
                              placeholder="Ex: Formulário de Inspeção" 
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={rec.location} 
                              onChange={e => updateArrayItem('records', rec.id, 'location', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent resize-none"
                              placeholder="Ex: Pasta Compartilhada / ERP" 
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 border border-gray-200">
                            <textarea 
                              value={rec.retention} 
                              onChange={e => updateArrayItem('records', rec.id, 'retention', e.target.value)} 
                              className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent resize-none"
                              placeholder="Ex: 5 anos" 
                              rows={1}
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement;
                                t.style.height = 'auto';
                                t.style.height = t.scrollHeight + 'px';
                              }}
                            />
                          </td>
                          <td className="p-2 text-center border border-gray-200">
                            <button onClick={() => removeArrayItem('records', rec.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => addArrayItem('records', { name: '', location: '', retention: '' })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={14} /> Adicionar Registro
                  </button>
                </div>
              )}
            </div>

            {/* 12. Revisão e Aprovação */}
            <div id="section-review">
              <SectionHeader id="review" title="Revisão e Aprovação" index={12} />
              {expandedSections.review && (
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Frequência de Revisão</label>
                    <select 
                      value={data.reviewFrequency} 
                      onChange={e => updateField('reviewFrequency', e.target.value)}
                      className="w-full md:w-1/3 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="A cada 2 anos">A cada 2 anos</option>
                      <option value="Sob demanda">Sob demanda (apenas quando houver mudança)</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">
                    O fluxo de aprovação segue a hierarquia definida no cabeçalho (Autor → Revisor → Aprovador).
                    Qualquer alteração neste documento requer nova aprovação e atualização do Controle de Versão (Seção 2).
                  </p>
                </div>
              )}
            </div>

            {/* 13. Anexos */}
            <div id="section-attachments">
              <SectionHeader id="attachments" title="Anexos (Opcional)" index={13} />
              {expandedSections.attachments && (
                <div className="p-6">
                  <p className="text-xs text-gray-500 mb-2">Liste templates, exemplos ou formulários anexos a este procedimento.</p>
                  <textarea 
                    value={data.attachments} 
                    onChange={e => updateField('attachments', e.target.value)} 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[100px] focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                    placeholder="Anexo A - Template de Checklist Diário&#10;Anexo B - Tabela de Tolerâncias"
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (() => {
        const ex = SOP_EXEMPLOS[exemploIdx];
        return (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowExemplo(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-blue-600" />
                  <div>
                    <h3 className="text-base font-black text-gray-800 m-0">Exemplo de POP</h3>
                    <p className="text-xs text-gray-500 m-0">{ex.header.title}</p>
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
                {SOP_EXEMPLOS.map((e, i) => (
                  <button
                    key={e.id}
                    onClick={() => setExemploIdx(i)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                      exemploIdx === i
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {e.rotulo}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-5">
                {/* Cabeçalho */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['Título', ex.header.title], ['Código', ex.header.code], ['Versão', ex.header.version],
                    ['Departamento', ex.header.department], ['Autor', ex.header.author], ['Aprovador', ex.header.approver],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{rotulo}</div>
                      <div className="text-[13px] text-gray-700 leading-snug">{valor}</div>
                    </div>
                  ))}
                </div>

                <ExemploBloco titulo="Objetivo"><p className="text-[13px] text-gray-700 leading-relaxed m-0">{ex.objective}</p></ExemploBloco>
                <ExemploBloco titulo="Escopo"><p className="text-[13px] text-gray-700 leading-relaxed m-0">{ex.scope}</p></ExemploBloco>

                <ExemploBloco titulo="Definições">
                  <ul className="space-y-1 m-0 pl-0 list-none">
                    {ex.definitions.map((d, i) => (
                      <li key={i} className="text-[13px] text-gray-700"><strong>{d.term}:</strong> {d.definition}</li>
                    ))}
                  </ul>
                </ExemploBloco>

                <ExemploBloco titulo="Responsabilidades">
                  <ul className="space-y-1 m-0 pl-0 list-none">
                    {ex.responsibilities.map((r, i) => (
                      <li key={i} className="text-[13px] text-gray-700"><strong>{r.role}:</strong> {r.responsibility}</li>
                    ))}
                  </ul>
                </ExemploBloco>

                <ExemploBloco titulo="Etapas do Processo">
                  <ol className="space-y-1 m-0 pl-5">
                    {ex.processSteps.map((s, i) => (
                      <li key={i} className="text-[13px] text-gray-700 leading-snug">{s}</li>
                    ))}
                  </ol>
                </ExemploBloco>

                <ExemploBloco titulo="Pontos de Controle">
                  <ul className="space-y-1 m-0 pl-0 list-none">
                    {ex.controlPoints.map((c, i) => (
                      <li key={i} className="text-[13px] text-gray-700"><strong>{c.step}:</strong> {c.criteria}</li>
                    ))}
                  </ul>
                </ExemploBloco>

                <ExemploBloco titulo="Riscos e Controles">
                  <ul className="space-y-1 m-0 pl-0 list-none">
                    {ex.risks.map((r, i) => (
                      <li key={i} className="text-[13px] text-gray-700"><strong>Risco:</strong> {r.risk} — <strong>Controle:</strong> {r.control}</li>
                    ))}
                  </ul>
                </ExemploBloco>

                <ExemploBloco titulo="Registros">
                  <ul className="space-y-1 m-0 pl-0 list-none">
                    {ex.records.map((r, i) => (
                      <li key={i} className="text-[13px] text-gray-700">{r.name} · <span className="text-gray-500">{r.location} · retenção {r.retention}</span></li>
                    ))}
                  </ul>
                </ExemploBloco>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                  <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-amber-800 leading-relaxed m-0">
                    Este é um exemplo só pra <strong>consulta</strong> — ele <strong>não altera</strong> o seu POP.
                    Use como referência de como preencher cada seção.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Bloco de seção dentro do modal de exemplo do POP (título + conteúdo).
function ExemploBloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-black uppercase tracking-wider text-blue-700 mb-1.5 m-0">{titulo}</h4>
      <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">{children}</div>
    </div>
  );
}
