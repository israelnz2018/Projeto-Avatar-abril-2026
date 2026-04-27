import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Save, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type Level = 'Baixo' | 'Médio' | 'Alto';
type EngagementLevel = 'Desconhece' | 'Resistente' | 'Neutro' | 'Apoiador' | 'Líder';

interface Stakeholder {
  id: string;
  name: string;
  area: string;
  role: string;
  customRole?: string;
  power: Level;
  interest: Level;
  currentEngagement: EngagementLevel;
  notes: string;
}

interface StakeholderAnalysisPMIProps {
  onSave: (data: any) => void;
  initialData?: any;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

const ROLE_DESIRED_ENGAGEMENT: Record<string, EngagementLevel> = {
  'Gerente de Projetos': 'Líder',
  'PMO (Project Management Office)': 'Apoiador',
  'Analista de Projetos': 'Líder',
  'Coordenador de Projetos': 'Líder',
  'Stakeholders (Partes Interessadas)': 'Apoiador',
  'Equipe do Projeto': 'Apoiador',
  'Patrocinador (Sponsor)': 'Apoiador',
  'Outros': 'Neutro'
};

const ROLES = Object.keys(ROLE_DESIRED_ENGAGEMENT);
const ENGAGEMENT_LEVELS: EngagementLevel[] = ['Desconhece', 'Resistente', 'Neutro', 'Apoiador', 'Líder'];
const LEVELS: Level[] = ['Baixo', 'Médio', 'Alto'];

export default function StakeholderAnalysisPMI({ onSave, initialData, onGenerateAI, isGeneratingAI, onClearAIData }: StakeholderAnalysisPMIProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialData?.stakeholders || []);
  const isToolEmpty = stakeholders.length === 0;

  useEffect(() => {
    if (initialData?.stakeholders) {
      const migrated = initialData.stakeholders.map((s: any) => ({
        ...s,
        power: s.power || s.influence || 'Médio',
        currentEngagement: s.currentEngagement || 'Neutro',
        role: ROLES.includes(s.role) ? s.role : 'Outros',
        customRole: s.customRole || (ROLES.includes(s.role) ? '' : s.role)
      }));
      setStakeholders(migrated);
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
      role: 'Equipe do Projeto',
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

  const getStrategyText = (classification: string) => {
    switch (classification) {
      case 'Gerenciar de Perto': return 'Reuniões frequentes, envolvimento direto nas decisões chave e comunicação proativa.';
      case 'Manter Satisfeito': return 'Consultas periódicas, garantir que suas necessidades sejam atendidas sem sobrecarregar com detalhes.';
      case 'Manter Informado': return 'Atualizações regulares de status, manter o interesse ativo através de comunicações claras.';
      case 'Monitorar': return 'Acompanhamento mínimo, observar mudanças de atitude ou nível de poder ao longo do tempo.';
      default: return '';
    }
  };

  const getActionPlan = (current: EngagementLevel, desired: EngagementLevel) => {
    const currentIdx = ENGAGEMENT_LEVELS.indexOf(current);
    const desiredIdx = ENGAGEMENT_LEVELS.indexOf(desired);

    if (currentIdx === desiredIdx) {
      return 'O stakeholder já está no nível de engajamento ideal. Mantenha a estratégia de comunicação atual para sustentar este nível.';
    }
    
    if (currentIdx > desiredIdx) {
      return 'O stakeholder está mais engajado do que o estritamente necessário para sua função. Aproveite este engajamento positivo.';
    }

    if (current === 'Desconhece') {
      return 'Apresentar o projeto, seus objetivos e os benefícios esperados. Incluir em comunicações gerais de kick-off e alinhamento.';
    }
    if (current === 'Resistente') {
      return 'Agendar reunião 1:1 para escuta ativa. Entender as raízes da resistência (medo de perda, falta de tempo, etc). Demonstrar como o projeto mitiga esses riscos.';
    }
    if (current === 'Neutro') {
      return 'Identificar o que motiva este stakeholder (WIIFM - What is in it for me?). Mostrar os ganhos diretos para a área dele para movê-lo para Apoiador.';
    }
    if (current === 'Apoiador' && desired === 'Líder') {
      return 'Dar protagonismo em entregas específicas. Convidar para co-liderar apresentações ou decisões importantes do projeto.';
    }

    return 'Desenvolver plano de comunicação focado em demonstrar valor e construir confiança.';
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
                A IA analisará os dados da ferramenta "Project Charter" para gerar
                Análise de Stakeholders técnico e específico para este projeto.
              </p>
              <p className="text-xs text-blue-500 font-bold mt-2 italic">
                * A IA utiliza os fatos e dados coletados na fase anterior para garantir
                um mapeamento rigoroso e técnico.
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
              <h3 className="font-bold text-[#1f2937] text-[1.1rem]">Análise de Stakeholders - PMI</h3>
              <p className="text-xs text-[#666]">Identifique e analise as partes interessadas do projeto tradicional.</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-[4px] text-xs font-bold hover:bg-green-700 transition-all"
          >
            <Save size={14} /> Salvar Análise
          </button>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[20%]">Nome / Área</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[20%]">Função no Projeto</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[15%]">Poder</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[15%]">Interesse</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[15%]">Engajamento Atual</th>
                <th className="p-3 text-xs font-bold text-gray-600 uppercase w-[5%] text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhum stakeholder cadastrado. Clique no botão abaixo para adicionar.
                  </td>
                </tr>
              ) : (
                stakeholders.map((stakeholder) => (
                  <tr key={stakeholder.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 align-top">
                      <input
                        type="text"
                        placeholder="Nome do Stakeholder"
                        value={stakeholder.name}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Departamento / Área"
                        value={stakeholder.area}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'area', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-600 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3 align-top">
                      <select
                        value={stakeholder.role}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'role', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none mb-2"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {stakeholder.role === 'Outros' && (
                        <input
                          type="text"
                          placeholder="Especifique a função..."
                          value={stakeholder.customRole || ''}
                          onChange={(e) => updateStakeholder(stakeholder.id, 'customRole', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      )}
                      <div className="mt-2 text-[10px] text-gray-500">
                        Engajamento Desejado: <strong className="text-blue-600">{ROLE_DESIRED_ENGAGEMENT[stakeholder.role]}</strong>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <select
                        value={stakeholder.power}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'power', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-3 align-top">
                      <select
                        value={stakeholder.interest}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'interest', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-3 align-top">
                      <select
                        value={stakeholder.currentEngagement}
                        onChange={(e) => updateStakeholder(stakeholder.id, 'currentEngagement', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {ENGAGEMENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-3 align-top text-center">
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
                      <span key={s.id} className="bg-white/90 text-[#5b9bd5] text-[10px] px-1.5 py-0.5 rounded font-bold truncate max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
                    ))}
                  </div>
                </div>
                {/* Top Right: Gerenciar de Perto */}
                <div className="bg-[#ff0000] rounded shadow-inner p-2 flex flex-col items-center justify-start overflow-y-auto">
                  <span className="text-white font-bold text-xs text-center mb-2 drop-shadow-md">Gerenciar de Perto</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {stakeholders.filter(s => (s.power === 'Alto' || s.power === 'Médio') && (s.interest === 'Alto' || s.interest === 'Médio')).map(s => (
                      <span key={s.id} className="bg-white/90 text-[#ff0000] text-[10px] px-1.5 py-0.5 rounded font-bold truncate max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
                    ))}
                  </div>
                </div>
                {/* Bottom Left: Monitorar */}
                <div className="bg-[#7030a0] rounded shadow-inner p-2 flex flex-col items-center justify-start overflow-y-auto">
                  <span className="text-white font-bold text-xs text-center mb-2 drop-shadow-md">Monitorar</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {stakeholders.filter(s => s.power === 'Baixo' && s.interest === 'Baixo').map(s => (
                      <span key={s.id} className="bg-white/90 text-[#7030a0] text-[10px] px-1.5 py-0.5 rounded font-bold truncate max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
                    ))}
                  </div>
                </div>
                {/* Bottom Right: Manter Informado */}
                <div className="bg-[#92d050] rounded shadow-inner p-2 flex flex-col items-center justify-start overflow-y-auto">
                  <span className="text-white font-bold text-xs text-center mb-2 drop-shadow-md">Manter Informado</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full">
                    {stakeholders.filter(s => s.power === 'Baixo' && (s.interest === 'Alto' || s.interest === 'Médio')).map(s => (
                      <span key={s.id} className="bg-white/90 text-[#4d7525] text-[10px] px-1.5 py-0.5 rounded font-bold truncate max-w-full" title={s.name}>{s.name || 'Sem nome'}</span>
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
                  <th className="border p-2 text-left text-xs text-gray-600 w-1/4">Stakeholder</th>
                  {ENGAGEMENT_LEVELS.map(l => <th key={l} className="border p-2 text-center text-[10px] uppercase text-gray-500 w-[15%]">{l}</th>)}
                </tr>
              </thead>
              <tbody>
                {stakeholders.map(s => {
                  const desired = ROLE_DESIRED_ENGAGEMENT[s.role] || 'Neutro';
                  const currentIdx = ENGAGEMENT_LEVELS.indexOf(s.currentEngagement);
                  const desiredIdx = ENGAGEMENT_LEVELS.indexOf(desired);
                  
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="border p-2 font-bold text-gray-700 text-xs truncate max-w-[120px]" title={s.name}>
                        {s.name || 'Sem nome'}
                      </td>
                      {ENGAGEMENT_LEVELS.map((level, idx) => {
                        const isCurrent = idx === currentIdx;
                        const isDesired = idx === desiredIdx;
                        const isPath = (currentIdx < desiredIdx && idx >= currentIdx && idx <= desiredIdx) || 
                                       (currentIdx > desiredIdx && idx <= currentIdx && idx >= desiredIdx);
                        
                        return (
                          <td key={level} className="border p-1 text-center relative h-10">
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
              const displayRole = s.role === 'Outros' ? (s.customRole || 'Outros') : s.role;
              
              return (
                <div key={s.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-white transition-colors shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{s.name || 'Stakeholder sem nome'}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{displayRole} • {s.area}</p>
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
                        <span className="text-gray-600">{getStrategyText(classification)}</span>
                      </p>
                      <p>
                        <strong className="text-gray-900">Ação Recomendada (Gap):</strong><br/>
                        <span className="text-gray-600">{getActionPlan(s.currentEngagement, desired)}</span>
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
