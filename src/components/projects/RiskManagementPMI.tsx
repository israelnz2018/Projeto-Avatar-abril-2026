import React, { useState, useMemo } from 'react';
import { AlertTriangle, Shield, BarChart3, List, Plus, Trash2, Save, Info, CheckCircle2, LayoutGrid, Target, Users, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type RiskCategory = 'Técnico' | 'Externo' | 'Organizacional' | 'Gerencial';
type RiskStrategy = 'Evitar' | 'Mitigar' | 'Transferir' | 'Aceitar';

interface Risk {
  id: string;
  description: string;
  cause: string;
  impact: string;
  category: RiskCategory;
  probability: number; // 1-5
  impactLevel: number; // 1-5
  quantitativeImpact: string;
  strategy: RiskStrategy;
  actionPlan: string;
  owner: string;
}

interface RiskManagementPMIProps {
  onSave: (data: any) => void;
  initialData?: any;
}

const CATEGORIES: RiskCategory[] = ['Técnico', 'Externo', 'Organizacional', 'Gerencial'];
const STRATEGIES: RiskStrategy[] = ['Evitar', 'Mitigar', 'Transferir', 'Aceitar'];

const INITIAL_RISKS: Risk[] = [
  {
    id: 'R01',
    description: 'Atraso na entrega de equipamentos críticos',
    cause: 'Problemas logísticos do fornecedor internacional',
    impact: 'Paralisação da fase de montagem e atraso no cronograma',
    category: 'Externo',
    probability: 3,
    impactLevel: 4,
    quantitativeImpact: 'Atraso de 15 dias / Multa de R$ 10.000',
    strategy: 'Mitigar',
    actionPlan: 'Homologar fornecedor reserva e antecipar pedido em 30 dias.',
    owner: 'Gerente de Suprimentos'
  },
  {
    id: 'R02',
    description: 'Indisponibilidade de especialistas técnicos',
    cause: 'Conflito de agenda com outros projetos prioritários',
    impact: 'Redução da qualidade técnica e retrabalho',
    category: 'Organizacional',
    probability: 4,
    impactLevel: 3,
    quantitativeImpact: 'Aumento de 20% no custo de HH',
    strategy: 'Evitar',
    actionPlan: 'Bloquear agenda dos especialistas com 2 meses de antecedência.',
    owner: 'PMO'
  },
  {
    id: 'R03',
    description: 'Falha na integração de sistemas legados',
    cause: 'Documentação técnica incompleta ou obsoleta',
    impact: 'Incompatibilidade de dados e erro no processamento',
    category: 'Técnico',
    probability: 2,
    impactLevel: 5,
    quantitativeImpact: 'Risco de perda total de dados da migração',
    strategy: 'Mitigar',
    actionPlan: 'Realizar prova de conceito (PoC) antes da execução total.',
    owner: 'Arquiteto de Soluções'
  }
];

export default function RiskManagementPMI({ onSave, initialData }: RiskManagementPMIProps) {
  const [activeTab, setActiveTab] = useState<'plan' | 'register' | 'analysis'>('plan');
  const [planData, setPlanData] = useState(initialData?.plan || {
    methodology: 'Análise qualitativa e quantitativa mensal com reuniões de status.',
    roles: 'GP: Identifica e Monitora; Equipe: Executa respostas; Sponsor: Aprova contingência.',
    frequency: 'Revisão semanal nas reuniões de controle.',
    tools: 'Matriz de Riscos, Heatmap, Simulação de Monte Carlo simplificada.'
  });
  const [risks, setRisks] = useState<Risk[]>(initialData?.risks || INITIAL_RISKS);

  const getRiskLevel = (prob: number, imp: number) => {
    const score = prob * imp;
    if (score >= 15) return { label: 'Crítico', color: 'bg-red-600', text: 'text-white' };
    if (score >= 10) return { label: 'Alto', color: 'bg-orange-500', text: 'text-white' };
    if (score >= 5) return { label: 'Médio', color: 'bg-yellow-400', text: 'text-gray-900' };
    return { label: 'Baixo', color: 'bg-green-500', text: 'text-white' };
  };

  const addRisk = () => {
    const newRisk: Risk = {
      id: `R${String(risks.length + 1).padStart(2, '0')}`,
      description: '',
      cause: '',
      impact: '',
      category: 'Técnico',
      probability: 3,
      impactLevel: 3,
      quantitativeImpact: '',
      strategy: 'Mitigar',
      actionPlan: '',
      owner: ''
    };
    setRisks([...risks, newRisk]);
  };

  const removeRisk = (id: string) => {
    setRisks(risks.filter(r => r.id !== id));
  };

  const updateRisk = (id: string, updates: Partial<Risk>) => {
    setRisks(risks.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleSave = () => {
    onSave({ plan: planData, risks });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Plano de Riscos PMI</h2>
            <p className="text-sm text-gray-500 font-medium">Gerenciamento de incertezas na fase de Planejamento.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-100 flex items-center gap-2 transition-all"
        >
          <Save size={18} /> Salvar Plano de Riscos
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('plan')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'plan' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Shield size={16} /> 1. Planejar
        </button>
        <button 
          onClick={() => setActiveTab('register')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'register' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <List size={16} /> 2. Registro & Respostas
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'analysis' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <BarChart3 size={16} /> 3. Análise & Heatmap
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* Tab 1: Planejar Gerenciamento de Riscos */}
        {activeTab === 'plan' && (
          <motion.div 
            key="plan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Target size={18} className="text-red-600" /> Metodologia e Governança
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Metodologia de Riscos</label>
                  <textarea 
                    value={planData.methodology}
                    onChange={(e) => setPlanData({...planData, methodology: e.target.value})}
                    rows={3}
                    className="w-full p-3 text-sm bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Papéis e Responsabilidades</label>
                  <textarea 
                    value={planData.roles}
                    onChange={(e) => setPlanData({...planData, roles: e.target.value})}
                    rows={3}
                    className="w-full p-3 text-sm bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Clock size={18} className="text-red-600" /> Frequência e Ferramentas
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Frequência de Revisão</label>
                  <textarea 
                    value={planData.frequency}
                    onChange={(e) => setPlanData({...planData, frequency: e.target.value})}
                    rows={3}
                    className="w-full p-3 text-sm bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Ferramentas Utilizadas</label>
                  <textarea 
                    value={planData.tools}
                    onChange={(e) => setPlanData({...planData, tools: e.target.value})}
                    rows={3}
                    className="w-full p-3 text-sm bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-red-50 border border-red-100 p-6 rounded-xl space-y-4">
              <h3 className="text-sm font-black text-red-900 uppercase tracking-widest flex items-center gap-2">
                <Info size={18} /> Critérios de Avaliação (Escala 1-5)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-red-800">Probabilidade:</p>
                  <ul className="text-[11px] text-red-700 space-y-1">
                    <li><strong>1 - Muito Baixa:</strong> {"<"} 10% de chance</li>
                    <li><strong>3 - Média:</strong> 40% a 60% de chance</li>
                    <li><strong>5 - Muito Alta:</strong> {">"} 90% de chance</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-red-800">Impacto:</p>
                  <ul className="text-[11px] text-red-700 space-y-1">
                    <li><strong>1 - Muito Baixo:</strong> Impacto insignificante em custo/prazo</li>
                    <li><strong>3 - Médio:</strong> Impacto moderado (ex: 5% a 10% do orçamento)</li>
                    <li><strong>5 - Muito Alto:</strong> Impacto crítico (ex: {">"} 20% do orçamento ou inviabiliza o projeto)</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Registro de Riscos e Respostas */}
        {activeTab === 'register' && (
          <motion.div 
            key="register"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Registro de Riscos (Identificação & Qualitativa)</h3>
              <button 
                onClick={addRisk}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus size={14} /> Novo Risco
              </button>
            </div>

            <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="p-4 w-16">ID</th>
                    <th className="p-4 w-64">Risco & Causa</th>
                    <th className="p-4 w-32">Categoria</th>
                    <th className="p-4 w-32">Prob / Imp</th>
                    <th className="p-4 w-24">Nível</th>
                    <th className="p-4 w-40">Estratégia</th>
                    <th className="p-4 w-64">Plano de Resposta</th>
                    <th className="p-4 w-32">Responsável</th>
                    <th className="p-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {risks.map((risk) => {
                    const level = getRiskLevel(risk.probability, risk.impactLevel);
                    return (
                      <tr key={risk.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-xs font-black text-gray-400">{risk.id}</td>
                        <td className="p-4 space-y-2">
                          <textarea 
                            value={risk.description}
                            onChange={(e) => updateRisk(risk.id, { description: e.target.value })}
                            placeholder="Descrição do Risco"
                            rows={2}
                            className="w-full p-2 text-xs bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none font-bold"
                          />
                          <input 
                            value={risk.cause}
                            onChange={(e) => updateRisk(risk.id, { cause: e.target.value })}
                            placeholder="Causa Raiz"
                            className="w-full p-2 text-[10px] bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none italic"
                          />
                        </td>
                        <td className="p-4">
                          <select 
                            value={risk.category}
                            onChange={(e) => updateRisk(risk.id, { category: e.target.value as any })}
                            className="w-full p-2 text-[10px] font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Prob</label>
                              <select 
                                value={risk.probability}
                                onChange={(e) => updateRisk(risk.id, { probability: parseInt(e.target.value) })}
                                className="w-full p-1.5 text-xs font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none"
                              >
                                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Imp</label>
                              <select 
                                value={risk.impactLevel}
                                onChange={(e) => updateRisk(risk.id, { impactLevel: parseInt(e.target.value) })}
                                className="w-full p-1.5 text-xs font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none"
                              >
                                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-1 rounded text-[9px] font-black uppercase", level.color, level.text)}>
                            {level.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <select 
                            value={risk.strategy}
                            onChange={(e) => updateRisk(risk.id, { strategy: e.target.value as any })}
                            className="w-full p-2 text-[10px] font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none"
                          >
                            {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="p-4">
                          <textarea 
                            value={risk.actionPlan}
                            onChange={(e) => updateRisk(risk.id, { actionPlan: e.target.value })}
                            placeholder="Plano de Ação Detalhado"
                            rows={2}
                            className="w-full p-2 text-xs bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            value={risk.owner}
                            onChange={(e) => updateRisk(risk.id, { owner: e.target.value })}
                            placeholder="Dono do Risco"
                            className="w-full p-2 text-[10px] bg-gray-50 border-none rounded focus:ring-1 focus:ring-red-500 outline-none font-bold"
                          />
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => removeRisk(risk.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Análise Quantitativa e Heatmap */}
        {activeTab === 'analysis' && (
          <motion.div 
            key="analysis"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Heatmap */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest text-center">Matriz de Probabilidade x Impacto (Heatmap)</h3>
              
              <div className="relative w-full max-w-md mx-auto aspect-square">
                {/* Labels */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black text-gray-400 uppercase tracking-widest">Probabilidade</div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Impacto</div>

                <div className="grid grid-cols-5 grid-rows-5 w-full h-full gap-1">
                  {[5, 4, 3, 2, 1].map((row) => (
                    [1, 2, 3, 4, 5].map((col) => {
                      const score = row * col;
                      const risksInCell = risks.filter(r => r.probability === row && r.impactLevel === col);
                      
                      let bgColor = 'bg-green-100';
                      if (score >= 15) bgColor = 'bg-red-500';
                      else if (score >= 10) bgColor = 'bg-orange-400';
                      else if (score >= 5) bgColor = 'bg-yellow-300';

                      return (
                        <div 
                          key={`${row}-${col}`}
                          className={cn(
                            "relative rounded-sm flex flex-wrap items-center justify-center gap-1 p-1 transition-all",
                            bgColor
                          )}
                        >
                          {risksInCell.map(r => (
                            <div 
                              key={r.id}
                              className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm cursor-help"
                              title={`${r.id}: ${r.description}`}
                            >
                              {r.id}
                            </div>
                          ))}
                          <span className="absolute bottom-0.5 right-0.5 text-[6px] font-black text-black/20">{row}x{col}</span>
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-8">
                <div className="flex items-center gap-2 text-[8px] font-black uppercase text-gray-500">
                  <div className="w-3 h-3 bg-green-100 rounded" /> Baixo
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black uppercase text-gray-500">
                  <div className="w-3 h-3 bg-yellow-300 rounded" /> Médio
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black uppercase text-gray-500">
                  <div className="w-3 h-3 bg-orange-400 rounded" /> Alto
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black uppercase text-gray-500">
                  <div className="w-3 h-3 bg-red-500 rounded" /> Crítico
                </div>
              </div>
            </div>

            {/* Quantitative Analysis */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={18} className="text-red-600" /> Análise Quantitativa de Impacto
              </h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Estime o impacto financeiro ou de prazo para os riscos prioritários.</p>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {risks.filter(r => r.probability * r.impactLevel >= 10).map(risk => (
                  <div key={risk.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{risk.id}</span>
                        <h4 className="text-xs font-bold text-gray-800">{risk.description}</h4>
                      </div>
                      <span className="text-[10px] font-black text-gray-400">Score: {risk.probability * risk.impactLevel}</span>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Estimativa de Impacto (R$ ou Dias)</label>
                      <input 
                        value={risk.quantitativeImpact}
                        onChange={(e) => updateRisk(risk.id, { quantitativeImpact: e.target.value })}
                        placeholder="Ex: R$ 25.000 ou 10 dias de atraso"
                        className="w-full p-2 text-xs bg-white border border-gray-200 rounded focus:ring-1 focus:ring-red-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                ))}
                {risks.filter(r => r.probability * r.impactLevel >= 10).length === 0 && (
                  <div className="text-center py-12 text-gray-400 italic text-xs">
                    Nenhum risco de alto impacto identificado para análise quantitativa.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Best Practices */}
      <div className="bg-gray-900 p-6 rounded-2xl text-white flex gap-6 items-start shadow-xl">
        <div className="p-3 bg-red-600 rounded-xl">
          <Shield size={24} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-black uppercase tracking-widest text-red-500">Diretriz PMI - Planejamento de Riscos</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            No planejamento, o foco é <strong>proatividade</strong>. Identifique riscos antes que se tornem problemas. A análise qualitativa prioriza os riscos, enquanto a quantitativa (para projetos complexos) fornece dados numéricos para reservas de contingência. Lembre-se: todo risco deve ter um <strong>Dono</strong> e um <strong>Plano de Resposta</strong> claro.
          </p>
        </div>
      </div>
    </div>
  );
}
