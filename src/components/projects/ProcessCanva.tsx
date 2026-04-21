import React, { useState, useEffect } from 'react';
import { 
  Truck, Package, Settings, PackageCheck, UserCheck, Plus, Trash2, 
  CheckCircle2, Info, Layout, ClipboardList, Eye, ArrowRight, 
  User, Users, Play, Square, GitBranch, Monitor, Target, Save, Edit3
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import SIPOC from './SIPOC';

interface ProcessCanvaProps {
  onSave: (data: any) => void;
  initialData?: any;
}

interface ProcessStep {
  id: string;
  name: string;
  role: string;
  type: 'step' | 'decision';
  yesTarget?: string;
  noTarget?: string;
}

export default function ProcessCanva({ onSave, initialData }: ProcessCanvaProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState(initialData || {
    sipoc: {
      suppliers: ['Fornecedor A'],
      inputs: ['Matéria Prima'],
      process: ['Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4', 'Etapa 5'],
      outputs: ['Produto Final'],
      customers: ['Cliente Final']
    },
    form: {
      processName: '',
      processObjective: '',
      startTrigger: '',
      endCondition: '',
      steps: [
        { id: '1', name: 'Primeira Etapa', role: 'Operador', type: 'step' }
      ],
      processOwner: '',
      participants: '',
      systems: ''
    },
    canvas: null
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleSaveSipoc = (sipocData: any) => {
    setData((prev: any) => ({ ...prev, sipoc: sipocData }));
    setCurrentStep(2);
  };

  const handleSaveForm = () => {
    // Generate initial canvas result from form data if not exists
    if (!data.canvas) {
      setData((prev: any) => ({
        ...prev,
        canvas: {
          steps: [...prev.form.steps],
          processName: prev.form.processName,
          processOwner: prev.form.processOwner,
          participants: prev.form.participants
        }
      }));
    }
    setCurrentStep(3);
  };

  const addStep = () => {
    const newStep: ProcessStep = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      role: '',
      type: 'step'
    };
    setData((prev: any) => ({
      ...prev,
      form: {
        ...prev.form,
        steps: [...prev.form.steps, newStep]
      }
    }));
  };

  const addDecision = () => {
    const newStep: ProcessStep = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Decisão?',
      role: '',
      type: 'decision'
    };
    setData((prev: any) => ({
      ...prev,
      form: {
        ...prev.form,
        steps: [...prev.form.steps, newStep]
      }
    }));
  };

  const removeStep = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      form: {
        ...prev.form,
        steps: prev.form.steps.filter((s: any) => s.id !== id)
      }
    }));
  };

  const updateStep = (id: string, field: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      form: {
        ...prev.form,
        steps: prev.form.steps.map((s: any) => s.id === id ? { ...s, [field]: value } : s)
      }
    }));
  };

  const updateCanvasStep = (id: string, field: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        steps: prev.canvas.steps.map((s: any) => s.id === id ? { ...s, [field]: value } : s)
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white p-4 border border-[#ccc] rounded-[4px] shadow-sm">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setCurrentStep(1)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-[4px] transition-all border-none cursor-pointer",
              currentStep === 1 ? "bg-blue-600 text-white font-bold" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Settings size={18} />
            <span className="text-[12px] uppercase">1. Novo SIPOC</span>
          </button>
          <ArrowRight size={16} className="text-gray-300" />
          <button 
            onClick={() => currentStep > 1 && setCurrentStep(2)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-[4px] transition-all border-none cursor-pointer",
              currentStep === 2 ? "bg-blue-600 text-white font-bold" : "text-gray-500 hover:bg-gray-50",
              currentStep < 2 && "opacity-50 cursor-not-allowed"
            )}
            disabled={currentStep < 2}
          >
            <ClipboardList size={18} />
            <span className="text-[12px] uppercase">2. Questionário</span>
          </button>
          <ArrowRight size={16} className="text-gray-300" />
          <button 
            onClick={() => currentStep > 2 && setCurrentStep(3)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-[4px] transition-all border-none cursor-pointer",
              currentStep === 3 ? "bg-blue-600 text-white font-bold" : "text-gray-500 hover:bg-gray-50",
              currentStep < 3 && "opacity-50 cursor-not-allowed"
            )}
            disabled={currentStep < 3}
          >
            <Layout size={18} />
            <span className="text-[12px] uppercase">3. Resultado Canva</span>
          </button>
        </div>
        
        {currentStep === 3 && (
          <button
            onClick={() => onSave(data)}
            className="bg-[#10b981] text-white px-6 py-2 rounded-[4px] font-bold flex items-center hover:bg-green-600 transition-all border-none cursor-pointer shadow-md"
          >
            <Save size={18} className="mr-2" />
            Finalizar Canva
          </button>
        )}
      </div>

      {/* Step 1: SIPOC */}
      {currentStep === 1 && (
        <div className="animate-in fade-in duration-500">
          <SIPOC 
            onSave={handleSaveSipoc} 
            initialData={data.sipoc} 
          />
        </div>
      )}

      {/* Step 2: Questionnaire Form */}
      {currentStep === 2 && (
        <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-3 border-b border-[#eee] pb-4">
            <ClipboardList className="text-[#3b82f6]" size={24} />
            <div>
              <h2 className="text-[1.25rem] font-bold text-[#333]">Questionário de Detalhamento</h2>
              <p className="text-[12px] text-[#666]">Complemente o SIPOC com os detalhes operacionais do processo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                <Target size={14} /> Nome do Processo
              </label>
              <input 
                type="text"
                value={data.form.processName}
                onChange={(e) => setData((prev: any) => ({ ...prev, form: { ...prev.form, processName: e.target.value } }))}
                placeholder="Ex: Faturamento de Pedidos"
                className="w-full p-3 text-[13px] border border-[#eee] rounded-[4px] focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                <Info size={14} /> Objetivo do Processo
              </label>
              <input 
                type="text"
                value={data.form.processObjective}
                onChange={(e) => setData((prev: any) => ({ ...prev, form: { ...prev.form, processObjective: e.target.value } }))}
                placeholder="Ex: Garantir a emissão correta de notas fiscais"
                className="w-full p-3 text-[13px] border border-[#eee] rounded-[4px] focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                <Play size={14} /> Início do Processo (Gatilho)
              </label>
              <input 
                type="text"
                value={data.form.startTrigger}
                onChange={(e) => setData((prev: any) => ({ ...prev, form: { ...prev.form, startTrigger: e.target.value } }))}
                placeholder="Ex: Recebimento do pedido aprovado"
                className="w-full p-3 text-[13px] border border-[#eee] rounded-[4px] focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                <Square size={14} /> Fim do Processo (Conclusão)
              </label>
              <input 
                type="text"
                value={data.form.endCondition}
                onChange={(e) => setData((prev: any) => ({ ...prev, form: { ...prev.form, endCondition: e.target.value } }))}
                placeholder="Ex: Nota fiscal enviada ao cliente"
                className="w-full p-3 text-[13px] border border-[#eee] rounded-[4px] focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee] pb-2">
              <h3 className="text-[14px] font-bold text-[#333] uppercase tracking-wider">Fluxo de Atividades</h3>
              <div className="flex gap-2">
                <button 
                  onClick={addStep}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-[4px] hover:bg-blue-100 flex items-center gap-1 border-none cursor-pointer"
                >
                  <Plus size={14} /> Adicionar Etapa
                </button>
                <button 
                  onClick={addDecision}
                  className="px-3 py-1.5 bg-amber-50 text-amber-600 text-[11px] font-bold rounded-[4px] hover:bg-amber-100 flex items-center gap-1 border-none cursor-pointer"
                >
                  <GitBranch size={14} /> Adicionar Decisão
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {data.form.steps.map((step: ProcessStep, index: number) => (
                <div key={step.id} className="flex items-center gap-4 bg-[#fcfcfc] p-4 border border-[#eee] rounded-[4px] group">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-bold text-gray-400">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {step.type === 'decision' ? 'Pergunta de Decisão' : 'Descrição da Atividade'}
                      </span>
                      <input 
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                        placeholder={step.type === 'decision' ? "Ex: Documentação OK?" : "Ex: Conferir dados do pedido"}
                        className={cn(
                          "w-full p-2 text-[12px] border border-[#eee] rounded-[2px] focus:outline-none focus:border-blue-400",
                          step.type === 'decision' && "bg-amber-50 border-amber-200"
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Responsável</span>
                      <input 
                        type="text"
                        value={step.role}
                        onChange={(e) => updateStep(step.id, 'role', e.target.value)}
                        placeholder="Ex: Analista Financeiro"
                        className="w-full p-2 text-[12px] border border-[#eee] rounded-[2px] focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => removeStep(step.id)}
                    className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#eee]">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                <User size={14} /> Dono do Processo (Owner)
              </label>
              <input 
                type="text"
                value={data.form.processOwner}
                onChange={(e) => setData((prev: any) => ({ ...prev, form: { ...prev.form, processOwner: e.target.value } }))}
                placeholder="Ex: Gerente de Operações"
                className="w-full p-3 text-[13px] border border-[#eee] rounded-[4px] focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                <Users size={14} /> Participantes Internos
              </label>
              <input 
                type="text"
                value={data.form.participants}
                onChange={(e) => setData((prev: any) => ({ ...prev, form: { ...prev.form, participants: e.target.value } }))}
                placeholder="Ex: Equipe de Vendas, Logística"
                className="w-full p-3 text-[13px] border border-[#eee] rounded-[4px] focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                <Monitor size={14} /> Sistemas / Ferramentas
              </label>
              <input 
                type="text"
                value={data.form.systems}
                onChange={(e) => setData((prev: any) => ({ ...prev, form: { ...prev.form, systems: e.target.value } }))}
                placeholder="Ex: SAP, Excel, CRM"
                className="w-full p-3 text-[13px] border border-[#eee] rounded-[4px] focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              onClick={handleSaveForm}
              className="bg-blue-600 text-white px-8 py-3 rounded-[4px] font-bold flex items-center hover:bg-blue-700 transition-all border-none cursor-pointer shadow-md"
            >
              Gerar Canva Result
              <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Canva Result */}
      {currentStep === 3 && data.canvas && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header Info */}
          <div className="bg-white p-6 border border-[#ccc] rounded-[4px] shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-[1.5rem] font-black text-[#333] uppercase tracking-tight">{data.canvas.processName || 'Processo Sem Nome'}</h1>
              <div className="flex gap-4 mt-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  <User size={14} className="text-blue-500" /> Owner: {data.canvas.processOwner || 'Não definido'}
                </span>
                <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  <Users size={14} className="text-blue-500" /> Stakeholders: {data.canvas.participants || 'Não definido'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                Process Mapping Canva
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar: SIPOC Context */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-50 p-4 border border-[#eee] rounded-[4px]">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Settings size={14} /> Contexto SIPOC
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase">Fornecedores</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.sipoc.suppliers.map((s: string, i: number) => (
                        <span key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-[2px] text-gray-600">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase">Entradas</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.sipoc.inputs.map((s: string, i: number) => (
                        <span key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-[2px] text-gray-600">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase">Saídas</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.sipoc.outputs.map((s: string, i: number) => (
                        <span key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-[2px] text-gray-600">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase">Clientes</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.sipoc.customers.map((s: string, i: number) => (
                        <span key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-[2px] text-gray-600">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 border border-blue-100 rounded-[4px]">
                <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-2">Objetivo</h3>
                <p className="text-[12px] text-blue-800 italic">"{data.form.processObjective || 'Não definido'}"</p>
              </div>
            </div>

            {/* Main Canvas: Visual Flow */}
            <div className="lg:col-span-3 bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm overflow-x-auto min-h-[500px] relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
              <div className="flex items-center gap-8 min-w-max py-10">
                {/* Start Trigger */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg">
                    <Play size={20} />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase">Início</span>
                  <div className="max-w-[120px] text-center text-[11px] font-bold text-gray-600 bg-white p-2 border border-green-100 rounded shadow-sm">
                    {data.form.startTrigger || 'Gatilho'}
                  </div>
                </div>

                <ArrowRight className="text-gray-300 shrink-0" size={24} />

                {/* Steps */}
                {data.canvas.steps.map((step: ProcessStep, index: number) => (
                  <React.Fragment key={step.id}>
                    <div className="relative group">
                      {step.type === 'step' ? (
                        <div className="w-48 bg-white border-2 border-blue-500 rounded-lg shadow-md overflow-hidden hover:scale-105 transition-transform">
                          <div className="bg-blue-500 p-2 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white uppercase">Etapa {index + 1}</span>
                            <Edit3 size={12} className="text-white opacity-50" />
                          </div>
                          <div className="p-4 space-y-3">
                            <textarea 
                              value={step.name}
                              onChange={(e) => updateCanvasStep(step.id, 'name', e.target.value)}
                              className="w-full text-[12px] font-bold text-gray-700 border-none focus:outline-none bg-transparent resize-none p-0"
                              rows={2}
                              placeholder="Nome da etapa..."
                            />
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <User size={12} className="text-blue-400" />
                              <input 
                                type="text"
                                value={step.role}
                                onChange={(e) => updateCanvasStep(step.id, 'role', e.target.value)}
                                className="w-full text-[10px] font-bold text-gray-400 border-none focus:outline-none bg-transparent p-0"
                                placeholder="Responsável..."
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center relative hover:scale-105 transition-transform">
                          <div className="absolute inset-0 border-2 border-amber-500 rotate-45 bg-white shadow-md rounded-sm"></div>
                          <div className="relative z-10 text-center p-4">
                            <textarea 
                              value={step.name}
                              onChange={(e) => updateCanvasStep(step.id, 'name', e.target.value)}
                              className="w-full text-[11px] font-black text-amber-700 border-none focus:outline-none bg-transparent text-center resize-none p-0"
                              rows={3}
                              placeholder="Pergunta?"
                            />
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <User size={10} className="text-amber-400" />
                              <input 
                                type="text"
                                value={step.role}
                                onChange={(e) => updateCanvasStep(step.id, 'role', e.target.value)}
                                className="w-20 text-[9px] font-bold text-amber-500 border-none focus:outline-none bg-transparent p-0 text-center"
                                placeholder="Quem decide?"
                              />
                            </div>
                          </div>
                          {/* Decision Labels */}
                          <div className="absolute -top-4 right-0 text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded">SIM</div>
                          <div className="absolute -bottom-4 right-0 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">NÃO</div>
                        </div>
                      )}
                    </div>
                    {index < data.canvas.steps.length - 1 && (
                      <ArrowRight className="text-gray-300 shrink-0" size={24} />
                    )}
                  </React.Fragment>
                ))}

                <ArrowRight className="text-gray-300 shrink-0" size={24} />

                {/* End Condition */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg">
                    <Square size={20} />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase">Fim</span>
                  <div className="max-w-[120px] text-center text-[11px] font-bold text-gray-600 bg-white p-2 border border-red-100 rounded shadow-sm">
                    {data.form.endCondition || 'Conclusão'}
                  </div>
                </div>
              </div>

              {/* Canvas Footer */}
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
                <div className="bg-white/80 backdrop-blur-sm p-3 border border-gray-200 rounded shadow-sm">
                  <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Sistemas Envolvidos</span>
                  <p className="text-[11px] font-bold text-gray-600">{data.form.systems || 'Nenhum sistema informado'}</p>
                </div>
                <div className="flex gap-2 pointer-events-auto">
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded border border-blue-100">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Atividade</span>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded border border-amber-100">
                    <div className="w-2 h-2 rounded-full bg-amber-500 rotate-45"></div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Decisão</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-4 border border-amber-100 rounded-[4px] flex gap-3 items-start">
            <Edit3 className="text-amber-500 shrink-0" size={20} />
            <p className="text-[12px] text-amber-800 leading-relaxed">
              <strong>Modo de Edição Ativo:</strong> Você pode clicar nos textos das etapas e decisões acima para ajustar o conteúdo diretamente no Canva. 
              As alterações feitas aqui são salvas como o resultado final do mapeamento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
