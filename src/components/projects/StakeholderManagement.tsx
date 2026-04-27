import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Save, Info, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

type Level = 'Baixo' | 'Médio' | 'Alto';
type EngagementLevel = 'Desconhece' | 'Resistente' | 'Neutro' | 'Apoiador' | 'Líder';

interface Stakeholder {
  id: string;
  name: string;
  area: string;
  role: string;
  power: Level;
  interest: Level;
  currentEngagement: EngagementLevel;
  notes: string;
}

interface StakeholderManagementProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const ROLE_DESIRED_ENGAGEMENT: Record<string, EngagementLevel> = {
  'Champion Executive': 'Líder',
  'Champion': 'Líder',
  'MBB': 'Líder',
  'Money Belt': 'Apoiador',
  'Black Belt': 'Líder',
  'Green Belt': 'Líder',
  'Yellow Belt': 'Apoiador',
  'White Belt': 'Apoiador',
  'Team Member': 'Apoiador',
  'Process Owner': 'Líder',
  'Sponsor': 'Apoiador',
  'Focal Point': 'Apoiador',
  'Customers': 'Neutro',
  'Outro': 'Apoiador'
};

const ROLES = Object.keys(ROLE_DESIRED_ENGAGEMENT);
const ENGAGEMENT_LEVELS: EngagementLevel[] = ['Desconhece', 'Resistente', 'Neutro', 'Apoiador', 'Líder'];
const LEVELS: Level[] = ['Baixo', 'Médio', 'Alto'];

export default function StakeholderManagement({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: StakeholderManagementProps) {
  const d = initialData?.toolData || initialData;
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(d?.stakeholders || []);
  const isToolEmpty = stakeholders.length === 0;

  // Auto-resize textareas when stakeholders change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [stakeholders]);

  useEffect(() => {
    if (initialData) {
      const data = initialData.toolData || initialData;
      if (data.stakeholders) {
        // Migrate old data if necessary (influence -> power, etc)
        const migrated = data.stakeholders.map((s: any) => ({
          ...s,
          power: s.power || s.influence || 'Médio',
          currentEngagement: s.currentEngagement || 'Neutro',
          role: ROLES.includes(s.role) ? s.role : 'Outro'
        }));
        setStakeholders(migrated);
      }
    }
  }, [initialData]);

  const handleSave = () => {
    onSave({ stakeholders });
  };

  const addStakeholder = () => {
    const newStakeholder: Stakeholder = {
      id: Date.now().toString(),
      name: '',
      area: '',
      role: 'Team Member',
      power: 'Médio',
      interest: 'Médio',
      currentEngagement: 'Neutro',
      notes: ''
    };
    setStakeholders([...stakeholders, newStakeholder]);
  };

  const removeStakeholder = (id: string) => {
    setStakeholders(stakeholders.filter(s => s.id !== id));
  };

  const updateStakeholder = (id: string, field: keyof Stakeholder, value: string) => {
    setStakeholders(stakeholders.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const getClassification = (power: Level, interest: Level) => {
    const isHighPower = power === 'Alto' || power === 'Médio';
    const isHighInterest = interest === 'Alto' || interest === 'Médio';

    if (isHighPower && isHighInterest) return 'Gerenciar de Perto';
    if (isHighPower && !isHighInterest) return 'Manter Satisfeito';
    if (!isHighPower && isHighInterest) return 'Manter Informado';
    return 'Monitorar';
  };

  const getStrategyText = (classification: string, name: string) => {
    switch (classification) {
      case 'Gerenciar de Perto':
        return `Envolver ${name || 'este stakeholder'} nas decisões críticas do projeto. Reuniões semanais de alinhamento, antecipar preocupações e comunicar riscos antes que se tornem problemas.`;
      case 'Manter Satisfeito':
        return `Manter ${name || 'este stakeholder'} informado sobre marcos importantes sem sobrecarregar com detalhes operacionais. Foco em resultados financeiros e estratégicos.`;
      case 'Manter Informado':
        return `Enviar atualizações quinzenais de status para ${name || 'este stakeholder'}. Destacar como o projeto beneficia diretamente sua área de atuação.`;
      case 'Monitorar':
        return `Acompanhamento mínimo de ${name || 'este stakeholder'}. Observar mudanças de postura ao longo do projeto e acionar se houver sinais de resistência.`;
      default: return '';
    }
  };

  const getActionPlan = (current: EngagementLevel, desired: EngagementLevel, name: string, role: string) => {
    const currentIdx = ENGAGEMENT_LEVELS.indexOf(current);
    const desiredIdx = ENGAGEMENT_LEVELS.indexOf(desired);
    const gap = desiredIdx - currentIdx;

    if (gap === 0) return `${name || 'Stakeholder'} já está no nível ideal (${desired}). Mantenha a estratégia atual para sustentar este engajamento.`;
    if (gap < 0) return `${name || 'Stakeholder'} está mais engajado do que o necessário para ${role}. Aproveite este engajamento — envolva em decisões relevantes para não perder o entusiasmo.`;

    const actions: Record<EngagementLevel, string> = {
      'Desconhece': `Apresentar o projeto para ${name || 'este stakeholder'} com foco nos benefícios para sua área. Incluir no kick-off oficial e nas comunicações de início.`,
      'Resistente': `Agendar conversa individual com ${name || 'este stakeholder'} para entender as preocupações reais. Escuta ativa antes de qualquer tentativa de persuasão. Mostrar como o projeto reduz — não aumenta — a carga de trabalho.`,
      'Neutro': `Identificar o que motiva ${name || 'este stakeholder'} pessoalmente. Mostrar ganhos concretos para sua área. Convidar para participar de uma entrega específica para criar senso de pertencimento.`,
      'Apoiador': `Dar protagonismo a ${name || 'este stakeholder'} em apresentações ou decisões importantes. Reconhecer publicamente sua contribuição para movê-lo a Líder.`,
      'Líder': `${name || 'Stakeholder'} já é Líder. Mantenha o engajamento com responsabilidades claras e reconhecimento contínuo.`,
    };

    return actions[current] || 'Desenvolver plano de comunicação personalizado.';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Bloco de IA — aparece quando a ferramenta está vazia */}
      {isToolEmpty && onGenerateAI && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                  Gerar Stakeholders com IA
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                A IA analisará os dados da ferramenta "Project Charter e Entendendo o Problema" para gerar
                Stakeholders técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA vai mapear os prováveis stakeholders envolvidos no processo e sugerir estratégias de engajamento.
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

      {/* Tabela de Entrada de Dados */}
      <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#eee] bg-gray-50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-[#1f2937] text-[1.1rem]">Cadastro de Stakeholders</h3>
              <p className="text-xs text-[#666]">Insira os dados para gerar a análise automaticamente.</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px] tool-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[20%] whitespace-normal break-words">Nome / Área</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[20%] whitespace-normal break-words">Função no Projeto</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[15%] whitespace-normal break-words">Poder</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[15%] whitespace-normal break-words">Interesse</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[15%] whitespace-normal break-words">Engajamento Atual</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[5%] text-center whitespace-normal break-words">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 whitespace-normal break-words align-top">
                    Nenhum stakeholder cadastrado. Clique no botão abaixo para adicionar.
                  </td>
                </tr>
              ) : (
                stakeholders.map((stakeholder) => (
                  <tr key={stakeholder.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors" style={{ minHeight: '52px' }}>
                    <td className="p-3 align-top whitespace-normal break-words">
                      <textarea
                        placeholder="Nome do Stakeholder"
                        value={stakeholder.name || ''}
                        onChange={(e) => {
                          updateStakeholder(stakeholder.id, 'name', e.target.value);
                          // Auto resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        rows={1}
                        className="w-full resize-none bg-transparent border-none outline-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all mb-2"
                        style={{ 
                          minHeight: '36px',
                          lineHeight: '1.5',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      />
                      <textarea
                        placeholder="Departamento / Área"
                        value={stakeholder.area || ''}
                        onChange={(e) => {
                          updateStakeholder(stakeholder.id, 'area', e.target.value);
                          // Auto resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        rows={1}
                        className="w-full resize-none bg-transparent border-none outline-none text-xs text-gray-600 focus:ring-2 focus:ring-blue-300 focus:bg-white rounded-lg px-1 py-1 transition-all"
                        style={{ 
                          minHeight: '24px',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      />
                    </td>
                    <td className="p-3 align-top whitespace-normal break-words">
                      <select
                        value={stakeholder.role}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'role', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <div className="mt-2 text-[10px] text-gray-500">
                        Engajamento Desejado: <strong className="text-blue-600">{ROLE_DESIRED_ENGAGEMENT[stakeholder.role]}</strong>
                      </div>
                    </td>
                    <td className="p-3 align-top whitespace-normal break-words">
                      <select
                        value={stakeholder.power}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'power', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-3 align-top whitespace-normal break-words">
                      <select
                        value={stakeholder.interest}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'interest', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-3 align-top whitespace-normal break-words">
                      <select
                        value={stakeholder.currentEngagement}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'currentEngagement', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {ENGAGEMENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-3 align-top text-center whitespace-normal break-words">
                      <button
                        onClick={() => removeStakeholder(stakeholder.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-1"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <button
            onClick={addStakeholder}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-[4px] text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-200 border-dashed w-full justify-center"
          >
            <Plus size={16} /> Adicionar Stakeholder
          </button>
        </div>

        <div className="p-6 bg-[#f8f9fa] border-t border-[#eee] flex justify-end">
          <button
            data-save-trigger
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-[4px] text-sm font-bold hover:bg-green-700 transition-all shadow-md active:scale-95"
          >
            <Save size={14} /> Salvar Análise de Stakeholders
          </button>
        </div>
      </div>

      {/* Gráficos e Análises */}
      {stakeholders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Matriz de Poder e Interesse */}
          <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm p-6">
            <h3 className="font-bold text-[#1f2937] text-lg mb-6 text-center">Matriz de Poder x Interesse</h3>
            
            <div className="relative w-full max-w-sm mx-auto aspect-square border-l-2 border-b-2 border-gray-800 p-1">
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 font-bold text-xs text-gray-600 tracking-widest">PODER</div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-bold text-xs text-gray-600 tracking-widest">INTERESSE</div>
              
              <div className="absolute -left-6 top-0 text-[10px] text-gray-500">ALTO</div>
              <div className="absolute -left-8 bottom-0 text-[10px] text-gray-500">BAIXO</div>
              <div className="absolute -bottom-5 left-0 text-[10px] text-gray-500">BAIXO</div>
              <div className="absolute -bottom-5 right-0 text-[10px] text-gray-500">ALTO</div>

              <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-1">
                {/* Top Left: Manter Satisfeito */}
                <div className="bg-[#5b9bd5] rounded shadow-inner p-2 flex flex-col items-center justify-start overflow-y-auto">
                  <span className="text-white font-bold text-xs text-center mb-2 drop-shadow-md">Manter Satisfeito</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {stakeholders.filter(s => (s.power === 'Alto' || s.power === 'Médio') && s.interest === 'Baixo').map(s => (
                      <span key={s.id} className="bg-white/90 text-[#5b9bd5] text-[10px] px-1.5 py-0.5 rounded font-bold break-words whitespace-normal max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
                    ))}
                  </div>
                </div>
                {/* Top Right: Gerenciar de Perto */}
                <div className="bg-[#ff0000] rounded shadow-inner p-2 flex flex-col items-center justify-start overflow-y-auto">
                  <span className="text-white font-bold text-xs text-center mb-2 drop-shadow-md">Gerenciar de Perto</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {stakeholders.filter(s => (s.power === 'Alto' || s.power === 'Médio') && (s.interest === 'Alto' || s.interest === 'Médio')).map(s => (
                      <span key={s.id} className="bg-white/90 text-[#ff0000] text-[10px] px-1.5 py-0.5 rounded font-bold break-words whitespace-normal max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
                    ))}
                  </div>
                </div>
                {/* Bottom Left: Monitorar */}
                <div className="bg-[#7030a0] rounded shadow-inner p-2 flex flex-col items-center justify-start overflow-y-auto">
                  <span className="text-white font-bold text-xs text-center mb-2 drop-shadow-md">Monitorar</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {stakeholders.filter(s => s.power === 'Baixo' && s.interest === 'Baixo').map(s => (
                      <span key={s.id} className="bg-white/90 text-[#7030a0] text-[10px] px-1.5 py-0.5 rounded font-bold break-words whitespace-normal max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
                    ))}
                  </div>
                </div>
                {/* Bottom Right: Manter Informado */}
                <div className="bg-[#92d050] rounded shadow-inner p-2 flex flex-col items-center justify-start overflow-y-auto">
                  <span className="text-white font-bold text-xs text-center mb-2 drop-shadow-md">Manter Informado</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {stakeholders.filter(s => s.power === 'Baixo' && (s.interest === 'Alto' || s.interest === 'Médio')).map(s => (
                      <span key={s.id} className="bg-white/90 text-[#4d7525] text-[10px] px-1.5 py-0.5 rounded font-bold break-words whitespace-normal max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 2: Matriz de Engajamento */}
          <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm p-6 overflow-x-auto">
            <h3 className="font-bold text-[#1f2937] text-lg mb-2 text-center">Matriz de Engajamento</h3>
            
            <div className="flex items-center justify-center gap-6 mb-6 text-xs font-medium text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">C</div> 
                Atual (Current)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">D</div> 
                Desejável (Desired)
              </div>
            </div>

            <table className="w-full text-sm border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-left text-xs text-gray-600 w-1/4 whitespace-normal break-words">Stakeholder</th>
                  {ENGAGEMENT_LEVELS.map(l => <th key={l} className="border p-2 text-center text-[10px] uppercase text-gray-500 w-[15%] whitespace-normal break-words">{l}</th>)}
                </tr>
              </thead>
              <tbody>
                {stakeholders.map(s => {
                  const desired = ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro';
                  const currentIdx = ENGAGEMENT_LEVELS.indexOf(s.currentEngagement);
                  const desiredIdx = ENGAGEMENT_LEVELS.indexOf(desired);
                  
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="border p-2 font-bold text-gray-700 text-xs break-words whitespace-normal max-w-[120px] align-top" title={s.name}>
                        {s.name || 'Sem nome'}
                      </td>
                      {ENGAGEMENT_LEVELS.map((level, idx) => {
                        const isCurrent = idx === currentIdx;
                        const isDesired = idx === desiredIdx;
                        const isPath = (currentIdx < desiredIdx && idx >= currentIdx && idx <= desiredIdx) || 
                                       (currentIdx > desiredIdx && idx <= currentIdx && idx >= desiredIdx);
                        
                        return (
                      <td key={level} className="border p-1 text-center relative h-10 whitespace-normal break-words align-top">
                            <div className="flex items-center justify-center w-full h-full relative">
                              {/* Linha de conexão */}
                              {currentIdx !== desiredIdx && isPath && (
                                <div className={cn(
                                  "absolute top-1/2 h-1 bg-red-200 -translate-y-1/2 z-0",
                                  currentIdx < desiredIdx ? 
                                    (idx === currentIdx ? "left-1/2 right-0" : idx === desiredIdx ? "left-0 right-1/2" : "left-0 right-0") :
                                    (idx === currentIdx ? "left-0 right-1/2" : idx === desiredIdx ? "left-1/2 right-0" : "left-0 right-0")
                                )}></div>
                              )}
                              
                              {/* Seta na linha de conexão (apontando para o Desired) */}
                              {currentIdx !== desiredIdx && currentIdx < desiredIdx && idx === desiredIdx - 1 && (
                                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-0 text-red-400">
                                  <ArrowRight size={14} />
                                </div>
                              )}
                              
                              {/* Marcadores */}
                              {isCurrent && isDesired && (
                                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold z-10 relative shadow-sm">C/D</div>
                              )}
                              {isCurrent && !isDesired && (
                                <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold z-10 relative shadow-sm">C</div>
                              )}
                              {!isCurrent && isDesired && (
                                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold z-10 relative shadow-sm">D</div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mapa Visual Poder × Interesse */}
      {stakeholders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={16} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800">Mapa de Stakeholders — Poder × Interesse</h3>
          </div>

          <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden" style={{ height: '320px' }}>
            {/* Quadrantes */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className="border-r border-b border-gray-200 bg-yellow-50 flex items-end justify-start p-2">
                <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Manter Satisfeito</span>
              </div>
              <div className="border-b border-gray-200 bg-green-50 flex items-end justify-end p-2">
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Gerenciar de Perto</span>
              </div>
              <div className="border-r border-gray-200 bg-gray-50 flex items-start justify-start p-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monitorar</span>
              </div>
              <div className="bg-blue-50 flex items-start justify-end p-2">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Manter Informado</span>
              </div>
            </div>

            {/* Eixos */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ transformOrigin: 'center', marginLeft: '-28px' }}>
              PODER
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              INTERESSE →
            </div>

            {/* Stakeholders plotados */}
            {stakeholders.map((s) => {
              const x = s.interest === 'Alto' ? 75 : s.interest === 'Médio' ? 50 : 25;
              const y = s.power === 'Alto' ? 25 : s.power === 'Médio' ? 50 : 75;
              const colors: Record<string, string> = {
                'Gerenciar de Perto': 'bg-green-500',
                'Manter Satisfeito': 'bg-yellow-500',
                'Manter Informado': 'bg-blue-500',
                'Monitorar': 'bg-gray-400',
              };
              const classification = getClassification(s.power, s.interest);
              return (
                <div
                  key={s.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className={`w-8 h-8 rounded-full ${colors[classification]} flex items-center justify-center text-white text-[9px] font-black shadow-md border-2 border-white`}>
                    {(s.name || '?').substring(0, 2).toUpperCase()}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                    {s.name || 'Sem nome'} — {classification}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { label: 'Gerenciar de Perto', color: 'bg-green-500' },
              { label: 'Manter Satisfeito', color: 'bg-yellow-500' },
              { label: 'Manter Informado', color: 'bg-blue-500' },
              { label: 'Monitorar', color: 'bg-gray-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-[10px] text-gray-600 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plano de Engajamento (Report) */}
      {stakeholders.length > 0 && (
        <div className="bg-white border border-[#ccc] rounded-[8px] shadow-sm p-6">
          <h3 className="font-bold text-[#1f2937] text-lg mb-6 flex items-center gap-2">
            Plano de Engajamento por Stakeholder
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stakeholders.map(s => {
              const classification = getClassification(s.power, s.interest);
              const desired = ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro';
              
              return (
                <div key={s.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-white transition-colors shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{s.name || 'Stakeholder sem nome'}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.role} • {s.area}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded font-bold border", 
                      classification === 'Gerenciar de Perto' ? 'bg-red-50 text-red-700 border-red-200' :
                      classification === 'Manter Satisfeito' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      classification === 'Manter Informado' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-purple-50 text-purple-700 border-purple-200'
                    )}>
                      {classification}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-white border border-gray-100 p-2 rounded text-xs">
                      <span className="text-gray-500 font-medium">Situação:</span>
                      <span className="font-bold text-red-600">{s.currentEngagement}</span>
                      <ArrowRight size={14} className="text-gray-400" />
                      <span className="font-bold text-blue-600">{desired}</span>
                    </div>
                    
                    <div className="text-xs text-gray-700 space-y-2">
                      <p>
                        <strong className="text-gray-900">Estratégia Macro:</strong><br/>
                        <span className="text-gray-600">{getStrategyText(classification, s.name)}</span>
                      </p>
                      <p>
                        <strong className="text-gray-900">Ação Recomendada (Gap):</strong><br/>
                        <span className="text-gray-600">{getActionPlan(s.currentEngagement, desired, s.name, s.role)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
