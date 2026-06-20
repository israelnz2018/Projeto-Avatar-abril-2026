import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Printer, Save, Info, Users, Calendar, AlertTriangle, DollarSign, Briefcase, Sparkles, Loader2, Trash2, BookOpen, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ProjectCharterPMIProps {
  onSave: (data: any) => void;
  initialData?: any;
}

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Seções reais do charter PMI deste componente.
const CHARTER_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    projectName: 'Implementação de Portal de Autoatendimento de RH',
    description: 'Construção de um portal web onde colaboradores solicitam férias, holerites e atualizam dados sem acionar o RH.',
    department: 'Recursos Humanos / TI',
    startDate: '03/02/2026',
    projectManager: 'Mariana Lopes',
    sponsor: 'Diretor de Gente & Gestão',
    objective: 'Entregar um portal de autoatendimento integrado ao sistema de folha, acessível por web e mobile.',
    expectedResult: 'Reduzir em 50% o volume de chamados manuais ao RH e o tempo de resposta de 3 dias para 1 dia.',
    scopeIncluded: 'Solicitação de férias, consulta de holerite, atualização cadastral, integração com a folha de pagamento.',
    scopeExcluded: 'Módulo de recrutamento, avaliação de desempenho, integração com ponto eletrônico.',
    deliverables: ['Portal web responsivo no ar', 'Integração com sistema de folha', 'Treinamento dos colaboradores'],
    stakeholders: [
      { name: 'Diretor de Gente & Gestão', role: 'Sponsor' },
      { name: 'Analistas de RH', role: 'Usuários-chave' },
      { name: 'Equipe de TI', role: 'Desenvolvimento e suporte' },
    ],
    schedule: [
      { milestone: 'Levantamento de requisitos', date: 'Fev/2026' },
      { milestone: 'Desenvolvimento e testes', date: 'Abr/2026' },
      { milestone: 'Go-live do portal', date: 'Jul/2026' },
    ],
    resources: 'Equipe de TI (2 devs), analista de RH, licença de plataforma low-code, infraestrutura em nuvem.',
    risks: 'Resistência dos colaboradores ao autoatendimento; atraso na integração com a folha; dados cadastrais inconsistentes.',
    budget: 'R$ 180.000 (desenvolvimento + licenças + treinamento)',
    approvals: [
      { name: 'Mariana Lopes', role: 'Project Manager', date: '03/02/2026' },
      { name: 'Diretor de Gente & Gestão', role: 'Sponsor', date: '03/02/2026' },
      { name: 'Gerente de TI', role: 'Key Stakeholder', date: '04/02/2026' },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    projectName: 'Modernização da Linha de Injeção Plástica',
    description: 'Substituição de injetoras antigas e implantação de monitoramento em tempo real para reduzir refugo e parada.',
    department: 'Produção / Engenharia',
    startDate: '06/01/2026',
    projectManager: 'Carlos Andrade',
    sponsor: 'Diretor Industrial',
    objective: 'Modernizar a célula de injeção com 2 novas injetoras e sistema de coleta automática de dados de processo.',
    expectedResult: 'Reduzir o refugo de 8% para 3% e a parada não programada em 40%.',
    scopeIncluded: 'Compra e instalação de 2 injetoras, sensores IoT, dashboard de OEE, treinamento dos operadores.',
    scopeExcluded: 'Reforma do galpão, troca dos moldes existentes, expansão da capacidade de estoque.',
    deliverables: ['2 injetoras instaladas e validadas', 'Dashboard de OEE em operação', 'Operadores treinados no novo padrão'],
    stakeholders: [
      { name: 'Diretor Industrial', role: 'Sponsor' },
      { name: 'Supervisor de Produção', role: 'Usuário-chave' },
      { name: 'Engenharia da Qualidade', role: 'Validação técnica' },
    ],
    schedule: [
      { milestone: 'Aquisição dos equipamentos', date: 'Jan/2026' },
      { milestone: 'Instalação e comissionamento', date: 'Abr/2026' },
      { milestone: 'Validação e ramp-up', date: 'Jun/2026' },
    ],
    resources: 'Equipe de manutenção, engenheiro de processo, fornecedor das injetoras, integrador IoT.',
    risks: 'Atraso na entrega das injetoras (importadas); curva de aprendizado dos operadores; falha de integração dos sensores.',
    budget: 'R$ 1.200.000 (equipamentos + instalação + sensores)',
    approvals: [
      { name: 'Carlos Andrade', role: 'Project Manager', date: '06/01/2026' },
      { name: 'Diretor Industrial', role: 'Sponsor', date: '06/01/2026' },
      { name: 'Gerente de Produção', role: 'Key Stakeholder', date: '07/01/2026' },
    ],
  },
];

export default function ProjectCharterPMI({ 
  onSave, 
  initialData,
  onGenerateAI,
  isGeneratingAI,
  onClearAIData
}: ProjectCharterPMIProps & { onGenerateAI?: () => void; isGeneratingAI?: boolean; onClearAIData?: () => void }) {
  const [data, setData] = useState(initialData || {
    projectName: '',
    description: '',
    department: '',
    projectManager: '',
    sponsor: '',
    startDate: '',
    objective: '',
    expectedResult: '',
    scopeIncluded: '',
    scopeExcluded: '',
    deliverables: ['', '', ''],
    stakeholders: [
      { name: '', role: '' },
      { name: '', role: '' },
      { name: '', role: '' }
    ],
    schedule: [
      { milestone: '', date: '' },
      { milestone: '', date: '' },
      { milestone: '', date: '' }
    ],
    resources: '',
    risks: '',
    budget: '',
    approvals: [
      { name: '', role: 'Project Manager', date: '' },
      { name: '', role: 'Sponsor', date: '' },
      { name: '', role: 'Key Stakeholder', date: '' }
    ]
  });

  const isToolEmpty = !data.projectName && !data.description && !data.projectManager;

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura
  const ex = CHARTER_EXEMPLOS[exemploIdx];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleListItemChange = (listName: 'deliverables' | 'stakeholders' | 'schedule' | 'approvals', index: number, field: string | null, value: string) => {
    const newList = [...data[listName]];
    if (field) {
      newList[index] = { ...newList[index], [field]: value };
    } else {
      newList[index] = value;
    }
    setData((prev: any) => ({ ...prev, [listName]: newList }));
  };

  const addItem = (listName: 'deliverables' | 'stakeholders' | 'schedule') => {
    const newItem = listName === 'deliverables' ? '' : (listName === 'stakeholders' ? { name: '', role: '' } : { milestone: '', date: '' });
    setData((prev: any) => ({ ...prev, [listName]: [...prev[listName], newItem] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[210mm] mx-auto pb-20 animate-in fade-in duration-500">
      {/* Indicador de IA */}
      {!isToolEmpty && onGenerateAI && initialData?.isGenerated && (
        <div className="flex items-center justify-between mb-4 px-1 no-print">
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

      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 border border-gray-200 rounded-xl shadow-sm no-print">
        <div className="flex items-center gap-2">
          <Briefcase className="text-blue-600" size={20} />
          <span className="font-bold text-gray-700">Project Charter - PMI</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExemplo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer border-none"
          >
            <Printer size={16} /> IMPRIMIR / PDF
          </button>
          <button
            onClick={() => onSave(data)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer border-none shadow-lg shadow-blue-100"
          >
            <Save size={16} /> SALVAR CHARTER
          </button>
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="pmi-container bg-white border border-gray-300 shadow-2xl p-[15mm] min-h-[297mm] w-full print:p-0 print:shadow-none print:border-none font-sans text-black overflow-hidden">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Project Charter</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Termo de Abertura do Projeto (PMI)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase">Documento Oficial</p>
            <p className="text-xs font-bold text-gray-600">Ref: PMI-PC-001</p>
          </div>
        </div>

        {/* 1. Informações do Projeto */}
        <section className="mb-6">
          <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
            <Info size={14} />
            <h2 className="text-[10px] font-black uppercase tracking-widest">1. Informações do Projeto</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Nome do Projeto</label>
              <input 
                name="projectName"
                value={data.projectName}
                onChange={handleChange}
                placeholder="Ex: Implementação do Novo Sistema de Gestão"
                className="w-full text-sm font-bold border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Descrição Breve (O que será implementado/construído)</label>
              <textarea 
                name="description"
                value={data.description}
                onChange={handleChange}
                rows={1}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none resize-none whitespace-normal break-words"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                style={{ minHeight: '40px' }}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Área / Departamento</label>
              <input 
                name="department"
                value={data.department}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Data de Início</label>
              <input 
                type="date"
                name="startDate"
                value={data.startDate}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Project Manager</label>
              <input 
                name="projectManager"
                value={data.projectManager}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Sponsor (Patrocinador)</label>
              <input 
                name="sponsor"
                value={data.sponsor}
                onChange={handleChange}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-600 focus:ring-0 p-1 outline-none"
              />
            </div>
          </div>
        </section>

        {/* 2. Objetivo do Projeto */}
        <section className="mb-6">
          <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
            <Target size={14} />
            <h2 className="text-[10px] font-black uppercase tracking-widest">2. Objetivo do Projeto</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">O que será entregue (produto, sistema, construção, etc.)</label>
              <textarea 
                name="objective"
                value={data.objective}
                onChange={handleChange}
                rows={1}
                className="w-full text-sm border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded resize-none whitespace-normal break-words"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                style={{ minHeight: '60px' }}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Resultado esperado do projeto</label>
              <textarea 
                name="expectedResult"
                value={data.expectedResult}
                onChange={handleChange}
                rows={1}
                className="w-full text-sm border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded resize-none whitespace-normal break-words"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                style={{ minHeight: '60px' }}
              />
            </div>
          </div>
        </section>

        {/* 3. Escopo do Projeto */}
        <section className="mb-6">
          <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
            <Briefcase size={14} />
            <h2 className="text-[10px] font-black uppercase tracking-widest">3. Escopo do Projeto</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-green-100 bg-green-50/20 p-3 rounded-lg">
              <label className="block text-[9px] font-black text-green-700 uppercase mb-1">Incluído (Principais Entregas)</label>
              <textarea 
                name="scopeIncluded"
                value={data.scopeIncluded}
                onChange={handleChange}
                rows={1}
                className="w-full text-xs bg-transparent border-none focus:ring-0 p-0 outline-none resize-none whitespace-normal break-words"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                style={{ minHeight: '80px' }}
                placeholder="Liste o que faz parte do projeto..."
              />
            </div>
            <div className="border border-red-100 bg-red-50/20 p-3 rounded-lg">
              <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Fora do Escopo (Exclusões)</label>
              <textarea 
                name="scopeExcluded"
                value={data.scopeExcluded}
                onChange={handleChange}
                rows={1}
                className="w-full text-xs bg-transparent border-none focus:ring-0 p-0 outline-none resize-none whitespace-normal break-words"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                style={{ minHeight: '80px' }}
                placeholder="Liste o que NÃO faz parte do projeto..."
              />
            </div>
          </div>
        </section>

        {/* 4. Principais Entregas & 5. Stakeholders */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">4. Principais Entregas</h2>
            </div>
            <div className="space-y-2">
              {data.deliverables.map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 border-b border-gray-100 pb-1">
                  <span className="text-[10px] font-black text-gray-300">{idx + 1}</span>
                  <input 
                    value={item}
                    onChange={(e) => handleListItemChange('deliverables', idx, null, e.target.value)}
                    className="w-full text-xs border-none focus:ring-0 p-0 outline-none"
                    placeholder="Entregável..."
                  />
                </div>
              ))}
              <button onClick={() => addItem('deliverables')} className="text-[9px] font-bold text-blue-600 uppercase no-print">+ Adicionar Entrega</button>
            </div>
          </section>

          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <Users size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">5. Stakeholders Principais</h2>
            </div>
            <div className="space-y-2">
              {data.stakeholders.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-1">
                  <textarea 
                    value={item.name}
                    onChange={(e) => handleListItemChange('stakeholders', idx, 'name', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none font-bold bg-transparent resize-none whitespace-normal break-words"
                    placeholder="Nome"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                  <textarea 
                    value={item.role}
                    onChange={(e) => handleListItemChange('stakeholders', idx, 'role', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none text-gray-500 bg-transparent resize-none whitespace-normal break-words"
                    placeholder="Função"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                </div>
              ))}
              <button onClick={() => addItem('stakeholders')} className="text-[9px] font-bold text-blue-600 uppercase no-print">+ Adicionar Stakeholder</button>
            </div>
          </section>
        </div>

        {/* 6. Cronograma & 7. Recursos */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <Calendar size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">6. Cronograma (Alto Nível)</h2>
            </div>
            <div className="space-y-2">
              {data.schedule.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-[1fr_80px] gap-2 border-b border-gray-100 pb-1">
                  <textarea 
                    value={item.milestone}
                    onChange={(e) => handleListItemChange('schedule', idx, 'milestone', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none bg-transparent resize-none whitespace-normal break-words"
                    placeholder="Fase / Marco"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                  <input 
                    value={item.date}
                    onChange={(e) => handleListItemChange('schedule', idx, 'date', e.target.value)}
                    className="text-xs border-none focus:ring-0 p-0 outline-none text-right font-mono"
                    placeholder="Data"
                  />
                </div>
              ))}
              <button onClick={() => addItem('schedule')} className="text-[9px] font-bold text-blue-600 uppercase no-print">+ Adicionar Marco</button>
            </div>
          </section>

          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <Users size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">7. Recursos Principais</h2>
            </div>
            <textarea 
              name="resources"
              value={data.resources}
              onChange={handleChange}
              rows={1}
              className="w-full text-xs border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded resize-none whitespace-normal break-words"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
              style={{ minHeight: '100px' }}
              placeholder="Equipes, fornecedores, tecnologia, infraestrutura..."
            />
          </section>
        </div>

        {/* 8. Riscos & 9. Orçamento */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">8. Riscos Iniciais</h2>
            </div>
            <textarea 
              name="risks"
              value={data.risks}
              onChange={handleChange}
              rows={1}
              className="w-full text-xs border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded resize-none whitespace-normal break-words"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
              style={{ minHeight: '80px' }}
              placeholder="Riscos de prazo, fornecedor, integração, orçamento..."
            />
          </section>

          <section>
            <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
              <DollarSign size={14} />
              <h2 className="text-[10px] font-black uppercase tracking-widest">9. Orçamento (Alto Nível)</h2>
            </div>
            <textarea 
              name="budget"
              value={data.budget}
              onChange={handleChange}
              rows={1}
              className="w-full text-xs border border-gray-100 bg-gray-50/30 p-2 focus:border-blue-600 focus:ring-0 outline-none rounded resize-none whitespace-normal break-words"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
              style={{ minHeight: '80px' }}
              placeholder="Estimativa inicial de custo..."
            />
          </section>
        </div>

        {/* Seção de Aprovação */}
        <section className="mt-auto pt-6 border-t-2 border-gray-200">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 text-center">Seção de Aprovação Formal</h3>
          <div className="grid grid-cols-3 gap-8">
            {data.approvals.map((app: any, idx: number) => (
              <div key={idx} className="space-y-4">
                <div className="border-b border-gray-900 pb-1">
                  <input 
                    value={app.name}
                    onChange={(e) => handleListItemChange('approvals', idx, 'name', e.target.value)}
                    className="w-full text-xs font-bold text-center border-none focus:ring-0 p-0 outline-none"
                    placeholder="Nome do Aprovador"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[9px] font-black uppercase text-gray-900">{app.role}</p>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[8px] text-gray-400 uppercase">Data:</span>
                    <input 
                      type="text"
                      value={app.date}
                      onChange={(e) => handleListItemChange('approvals', idx, 'date', e.target.value)}
                      className="w-20 text-[9px] border-none focus:ring-0 p-0 outline-none text-right font-mono"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                </div>
                <div className="h-10 border border-dashed border-gray-200 rounded flex items-center justify-center">
                  <span className="text-[8px] text-gray-300 uppercase italic">Assinatura</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 flex justify-between items-end text-[8px] text-gray-400 font-bold uppercase border-t border-gray-100 pt-2">
          <div>LBW Copilot - Gestão de Projetos PMI</div>
          <div>Página 1 de 1</div>
        </div>
      </div>
      
      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
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
                  <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Project Charter PMI</h3>
                  <p className="text-xs text-gray-500 m-0">{ex.projectName}</p>
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
              {CHARTER_EXEMPLOS.map((e, i) => (
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

            <div className="p-6 space-y-5 text-black">
              {/* 1. Informações */}
              <section>
                <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                  <Info size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">1. Informações do Projeto</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="col-span-2"><span className="font-black text-gray-400 uppercase text-[9px] block">Nome do Projeto</span>{ex.projectName}</div>
                  <div className="col-span-2"><span className="font-black text-gray-400 uppercase text-[9px] block">Descrição</span>{ex.description}</div>
                  <div><span className="font-black text-gray-400 uppercase text-[9px] block">Área / Departamento</span>{ex.department}</div>
                  <div><span className="font-black text-gray-400 uppercase text-[9px] block">Data de Início</span>{ex.startDate}</div>
                  <div><span className="font-black text-gray-400 uppercase text-[9px] block">Project Manager</span>{ex.projectManager}</div>
                  <div><span className="font-black text-gray-400 uppercase text-[9px] block">Sponsor</span>{ex.sponsor}</div>
                </div>
              </section>

              {/* 2. Objetivo */}
              <section>
                <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                  <Target size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">2. Objetivo do Projeto</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div><span className="font-black text-gray-400 uppercase text-[9px] block">O que será entregue</span>{ex.objective}</div>
                  <div><span className="font-black text-gray-400 uppercase text-[9px] block">Resultado esperado</span>{ex.expectedResult}</div>
                </div>
              </section>

              {/* 3. Escopo */}
              <section>
                <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                  <Briefcase size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">3. Escopo do Projeto</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border border-green-100 bg-green-50/30 p-3 rounded-lg"><span className="font-black text-green-700 uppercase text-[9px] block mb-1">Incluído</span>{ex.scopeIncluded}</div>
                  <div className="border border-red-100 bg-red-50/30 p-3 rounded-lg"><span className="font-black text-red-700 uppercase text-[9px] block mb-1">Fora do Escopo</span>{ex.scopeExcluded}</div>
                </div>
              </section>

              {/* 4 & 5 */}
              <div className="grid grid-cols-2 gap-6">
                <section>
                  <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">4. Principais Entregas</h4>
                  </div>
                  <ol className="text-xs space-y-1 pl-5 list-decimal text-gray-700">
                    {ex.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                  </ol>
                </section>
                <section>
                  <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                    <Users size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">5. Stakeholders</h4>
                  </div>
                  <div className="text-xs space-y-1">
                    {ex.stakeholders.map((s, i) => (
                      <div key={i}><span className="font-bold">{s.name}</span> <span className="text-gray-500">— {s.role}</span></div>
                    ))}
                  </div>
                </section>
              </div>

              {/* 6 & 7 */}
              <div className="grid grid-cols-2 gap-6">
                <section>
                  <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                    <Calendar size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">6. Cronograma</h4>
                  </div>
                  <div className="text-xs space-y-1">
                    {ex.schedule.map((s, i) => (
                      <div key={i} className="flex justify-between border-b border-gray-100 pb-0.5"><span>{s.milestone}</span><span className="font-mono text-gray-500">{s.date}</span></div>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                    <Users size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">7. Recursos</h4>
                  </div>
                  <p className="text-xs text-gray-700 m-0">{ex.resources}</p>
                </section>
              </div>

              {/* 8 & 9 */}
              <div className="grid grid-cols-2 gap-6">
                <section>
                  <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">8. Riscos Iniciais</h4>
                  </div>
                  <p className="text-xs text-gray-700 m-0">{ex.risks}</p>
                </section>
                <section>
                  <div className="bg-gray-900 text-white px-3 py-1 mb-3 flex items-center gap-2">
                    <DollarSign size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest m-0">9. Orçamento</h4>
                  </div>
                  <p className="text-xs text-gray-700 m-0">{ex.budget}</p>
                </section>
              </div>

              {/* Aprovações */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 text-center">Seção de Aprovação Formal</h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  {ex.approvals.map((a, i) => (
                    <div key={i} className="text-center border-t-2 border-gray-900 pt-1">
                      <p className="font-bold m-0">{a.name}</p>
                      <p className="text-[9px] font-black uppercase text-gray-900 m-0">{a.role}</p>
                      <p className="text-[9px] font-mono text-gray-500 m-0">{a.date}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Este exemplo é só pra consulta — não altera os seus dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
