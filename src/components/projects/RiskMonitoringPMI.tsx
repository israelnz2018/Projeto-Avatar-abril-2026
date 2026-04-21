import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  BarChart3, 
  List, 
  Plus, 
  Trash2, 
  Save, 
  Info, 
  CheckCircle2, 
  LayoutGrid, 
  Target, 
  Users, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  RefreshCw,
  Search,
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line
} from 'recharts';

type RiskStatus = 'Ativo' | 'Mitigado' | 'Crítico' | 'Encerrado';
type RiskTrend = 'Aumentando' | 'Estável' | 'Reduzindo';
type RiskLevel = 'Baixo' | 'Médio' | 'Alto' | 'Crítico';

interface RiskMonitoring {
  id: string;
  description: string;
  status: RiskStatus;
  trend: RiskTrend;
  probability: number; // 1-5
  impact: number; // 1-5
  effectiveness: 'Eficaz' | 'Parcial' | 'Ineficaz';
  lastReview: string;
  actionTaken: string;
  owner: string;
}

interface ChangeRequest {
  id: string;
  description: string;
  impact: string;
  justification: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
}

interface RiskAudit {
  point: string;
  status: 'Conforme' | 'Não Conforme';
  observation: string;
}

interface RiskMonitoringPMIProps {
  onSave: (data: any) => void;
  initialData?: any;
}

const STATUS_COLORS: Record<RiskStatus, string> = {
  'Ativo': 'bg-blue-500',
  'Mitigado': 'bg-green-500',
  'Crítico': 'bg-red-600',
  'Encerrado': 'bg-gray-400'
};

const TREND_ICONS: Record<RiskTrend, React.ReactNode> = {
  'Aumentando': <TrendingUp size={14} className="text-red-500" />,
  'Estável': <Minus size={14} className="text-yellow-500" />,
  'Reduzindo': <TrendingDown size={14} className="text-green-500" />
};

const INITIAL_RISKS: RiskMonitoring[] = [
  {
    id: 'R01',
    description: 'Atraso na entrega de equipamentos críticos',
    status: 'Mitigado',
    trend: 'Reduzindo',
    probability: 2,
    impact: 4,
    effectiveness: 'Eficaz',
    lastReview: '2026-04-01',
    actionTaken: 'Fornecedor reserva ativado e cronograma ajustado.',
    owner: 'Gerente de Suprimentos'
  },
  {
    id: 'R02',
    description: 'Indisponibilidade de especialistas técnicos',
    status: 'Crítico',
    trend: 'Aumentando',
    probability: 5,
    impact: 3,
    effectiveness: 'Parcial',
    lastReview: '2026-04-05',
    actionTaken: 'Escalado para o Sponsor para liberação de recursos.',
    owner: 'PMO'
  },
  {
    id: 'R03',
    description: 'Falha na integração de sistemas legados',
    status: 'Ativo',
    trend: 'Estável',
    probability: 2,
    impact: 5,
    effectiveness: 'Eficaz',
    lastReview: '2026-03-28',
    actionTaken: 'Testes de integração em ambiente de homologação iniciados.',
    owner: 'Arquiteto de Soluções'
  }
];

const INITIAL_AUDIT: RiskAudit[] = [
  { point: 'Identificação regular de novos riscos', status: 'Conforme', observation: 'Processo seguido nas reuniões semanais.' },
  { point: 'Atualização do registro de riscos', status: 'Conforme', observation: 'Registro atualizado após cada revisão.' },
  { point: 'Efetividade dos planos de resposta', status: 'Não Conforme', observation: 'Plano R02 não foi suficiente para conter o impacto.' }
];

export default function RiskMonitoringPMI({ onSave, initialData }: RiskMonitoringPMIProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'register' | 'audit'>('dashboard');
  const [risks, setRisks] = useState<RiskMonitoring[]>(initialData?.risks || INITIAL_RISKS);
  const [audit, setAudit] = useState<RiskAudit[]>(initialData?.audit || INITIAL_AUDIT);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(initialData?.changeRequests || []);
  const [executiveSummary, setExecutiveSummary] = useState(initialData?.executiveSummary || 'O projeto apresenta um perfil de risco moderado, com atenção especial à disponibilidade de recursos técnicos (R02), que se tornou crítico. As ações de mitigação para riscos externos foram eficazes.');

  const getRiskLevel = (prob: number, imp: number): RiskLevel => {
    const score = prob * imp;
    if (score >= 15) return 'Crítico';
    if (score >= 10) return 'Alto';
    if (score >= 5) return 'Médio';
    return 'Baixo';
  };

  const dashboardData = useMemo(() => {
    const statusCounts = risks.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const levelCounts = risks.reduce((acc, r) => {
      const level = getRiskLevel(r.probability, r.impact);
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const barData = Object.entries(levelCounts).map(([name, value]) => ({ name, value }));

    return { pieData, barData };
  }, [risks]);

  const handleSave = () => {
    onSave({ risks, audit, changeRequests, executiveSummary });
  };

  const addRisk = () => {
    const newRisk: RiskMonitoring = {
      id: `R${String(risks.length + 1).padStart(2, '0')}`,
      description: '',
      status: 'Ativo',
      trend: 'Estável',
      probability: 3,
      impact: 3,
      effectiveness: 'Parcial',
      lastReview: new Date().toISOString().split('T')[0],
      actionTaken: '',
      owner: ''
    };
    setRisks([...risks, newRisk]);
  };

  const updateRisk = (id: string, updates: Partial<RiskMonitoring>) => {
    setRisks(risks.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const addChangeRequest = () => {
    const newCR: ChangeRequest = {
      id: `CR${String(changeRequests.length + 1).padStart(2, '0')}`,
      description: '',
      impact: '',
      justification: '',
      status: 'Pendente'
    };
    setChangeRequests([...changeRequests, newCR]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <RefreshCw size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Monitoramento & Controle de Riscos</h2>
            <p className="text-sm text-gray-500 font-medium">Gestão contínua e governança de incertezas (PMI).</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 shadow-lg shadow-orange-100 flex items-center gap-2 transition-all"
        >
          <Save size={18} /> Salvar Monitoramento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'dashboard' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <BarChart3 size={16} /> Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'report' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <FileText size={16} /> Relatório de Desempenho
        </button>
        <button 
          onClick={() => setActiveTab('register')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'register' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <List size={16} /> Registro Atualizado
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={cn(
            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'audit' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Search size={16} /> Auditoria & Mudanças
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Ativos</p>
                  <p className="text-xl font-black text-gray-900">{risks.filter(r => r.status === 'Ativo' || r.status === 'Crítico').length}</p>
                </div>
              </div>
              <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Mitigados</p>
                  <p className="text-xl font-black text-gray-900">{risks.filter(r => r.status === 'Mitigado').length}</p>
                </div>
              </div>
              <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Críticos</p>
                  <p className="text-xl font-black text-gray-900">{risks.filter(r => r.status === 'Crítico').length}</p>
                </div>
              </div>
              <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">% Mitigação</p>
                  <p className="text-xl font-black text-gray-900">
                    {risks.length > 0 ? Math.round((risks.filter(r => r.status === 'Mitigado' || r.status === 'Encerrado').length / risks.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 text-center">Distribuição por Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dashboardData.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as RiskStatus] || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 text-center">Riscos por Nível</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.barData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Relatório de Desempenho */}
        {activeTab === 'report' && (
          <motion.div 
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={18} className="text-orange-600" /> Resumo Executivo
                </h3>
                <textarea 
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  rows={4}
                  className="w-full p-4 text-sm bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none leading-relaxed"
                  placeholder="Descreva o status geral dos riscos no projeto..."
                />
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Riscos Críticos sob Atenção</h3>
                <div className="space-y-3">
                  {risks.filter(r => r.status === 'Crítico').map(risk => (
                    <div key={risk.id} className="p-4 border border-red-100 bg-red-50/50 rounded-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center font-black text-xs">
                          {risk.id}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{risk.description}</p>
                          <p className="text-[10px] text-gray-500">Dono: {risk.owner}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-red-600 uppercase">Tendência:</span>
                        {TREND_ICONS[risk.trend]}
                      </div>
                    </div>
                  ))}
                  {risks.filter(r => r.status === 'Crítico').length === 0 && (
                    <div className="text-center py-8 text-gray-400 italic text-xs">
                      Nenhum risco crítico no momento.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Efetividade das Respostas</h3>
                <div className="space-y-4">
                  {['Eficaz', 'Parcial', 'Ineficaz'].map(eff => {
                    const count = risks.filter(r => r.effectiveness === eff).length;
                    const percentage = risks.length > 0 ? Math.round((count / risks.length) * 100) : 0;
                    return (
                      <div key={eff} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className={cn(
                            eff === 'Eficaz' ? 'text-green-600' : eff === 'Parcial' ? 'text-yellow-600' : 'text-red-600'
                          )}>{eff}</span>
                          <span className="text-gray-400">{count} Riscos ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              eff === 'Eficaz' ? 'bg-green-500' : eff === 'Parcial' ? 'bg-yellow-400' : 'bg-red-500'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 p-6 rounded-xl space-y-3">
                <h4 className="text-xs font-black text-orange-900 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} /> Tendência Geral
                </h4>
                <p className="text-[11px] text-orange-800 leading-relaxed">
                  A exposição total ao risco teve uma <strong>redução de 15%</strong> no último período devido ao encerramento de marcos técnicos críticos. No entanto, a tendência organizacional é de <strong>alerta</strong> devido à rotatividade de pessoal.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Registro Atualizado */}
        {activeTab === 'register' && (
          <motion.div 
            key="register"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Reavaliação e Atualização de Riscos</h3>
              <button 
                onClick={addRisk}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus size={14} /> Novo Risco Identificado
              </button>
            </div>

            <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="p-4 w-16">ID</th>
                    <th className="p-4 w-64">Descrição do Risco</th>
                    <th className="p-4 w-32">Status</th>
                    <th className="p-4 w-32">Tendência</th>
                    <th className="p-4 w-32">Prob / Imp</th>
                    <th className="p-4 w-32">Efetividade</th>
                    <th className="p-4 w-64">Ação Tomada / Próximos Passos</th>
                    <th className="p-4 w-32">Dono</th>
                    <th className="p-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {risks.map((risk) => (
                    <tr key={risk.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-xs font-black text-gray-400">{risk.id}</td>
                      <td className="p-4">
                        <textarea 
                          value={risk.description}
                          onChange={(e) => updateRisk(risk.id, { description: e.target.value })}
                          rows={2}
                          className="w-full p-2 text-xs bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none font-bold"
                        />
                      </td>
                      <td className="p-4">
                        <select 
                          value={risk.status}
                          onChange={(e) => updateRisk(risk.id, { status: e.target.value as any })}
                          className={cn(
                            "w-full p-2 text-[10px] font-black uppercase rounded border-none focus:ring-1 focus:ring-orange-500 outline-none",
                            risk.status === 'Crítico' ? 'bg-red-50 text-red-600' : 
                            risk.status === 'Mitigado' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
                          )}
                        >
                          {['Ativo', 'Mitigado', 'Crítico', 'Encerrado'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <select 
                          value={risk.trend}
                          onChange={(e) => updateRisk(risk.id, { trend: e.target.value as any })}
                          className="w-full p-2 text-[10px] font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none"
                        >
                          {['Aumentando', 'Estável', 'Reduzindo'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <select 
                            value={risk.probability}
                            onChange={(e) => updateRisk(risk.id, { probability: parseInt(e.target.value) })}
                            className="w-full p-1.5 text-xs font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none"
                          >
                            {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                          <select 
                            value={risk.impact}
                            onChange={(e) => updateRisk(risk.id, { impact: parseInt(e.target.value) })}
                            className="w-full p-1.5 text-xs font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none"
                          >
                            {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="p-4">
                        <select 
                          value={risk.effectiveness}
                          onChange={(e) => updateRisk(risk.id, { effectiveness: e.target.value as any })}
                          className="w-full p-2 text-[10px] font-bold bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none"
                        >
                          {['Eficaz', 'Parcial', 'Ineficaz'].map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <textarea 
                          value={risk.actionTaken}
                          onChange={(e) => updateRisk(risk.id, { actionTaken: e.target.value })}
                          rows={2}
                          className="w-full p-2 text-xs bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          value={risk.owner}
                          onChange={(e) => updateRisk(risk.id, { owner: e.target.value })}
                          className="w-full p-2 text-[10px] bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none font-bold"
                        />
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => setRisks(risks.filter(r => r.id !== risk.id))}
                          className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Auditoria & Mudanças */}
        {activeTab === 'audit' && (
          <motion.div 
            key="audit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Auditoria de Riscos */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Search size={18} className="text-orange-600" /> Auditoria de Processo de Riscos
              </h3>
              <div className="space-y-4">
                {audit.map((item, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-800">{item.point}</span>
                      <select 
                        value={item.status}
                        onChange={(e) => {
                          const newAudit = [...audit];
                          newAudit[idx].status = e.target.value as any;
                          setAudit(newAudit);
                        }}
                        className={cn(
                          "text-[10px] font-black uppercase p-1 rounded border-none focus:ring-1 focus:ring-orange-500 outline-none",
                          item.status === 'Conforme' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        )}
                      >
                        <option value="Conforme">Conforme</option>
                        <option value="Não Conforme">Não Conforme</option>
                      </select>
                    </div>
                    <textarea 
                      value={item.observation}
                      onChange={(e) => {
                        const newAudit = [...audit];
                        newAudit[idx].observation = e.target.value;
                        setAudit(newAudit);
                      }}
                      placeholder="Observações da auditoria..."
                      rows={2}
                      className="w-full p-2 text-[11px] bg-gray-50 border-none rounded focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Solicitações de Mudança */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <PlusCircle size={18} className="text-orange-600" /> Solicitações de Mudança (CR)
                </h3>
                <button 
                  onClick={addChangeRequest}
                  className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {changeRequests.map((cr, idx) => (
                  <div key={cr.id} className="p-4 border border-orange-100 bg-orange-50/30 rounded-xl space-y-3 relative group">
                    <button 
                      onClick={() => setChangeRequests(changeRequests.filter(c => c.id !== cr.id))}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{cr.id}</span>
                      <select 
                        value={cr.status}
                        onChange={(e) => {
                          const newCRs = [...changeRequests];
                          newCRs[idx].status = e.target.value as any;
                          setChangeRequests(newCRs);
                        }}
                        className="text-[10px] font-black uppercase p-1 bg-white rounded border border-orange-100 focus:ring-1 focus:ring-orange-500 outline-none"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Rejeitado">Rejeitado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <input 
                        value={cr.description}
                        onChange={(e) => {
                          const newCRs = [...changeRequests];
                          newCRs[idx].description = e.target.value;
                          setChangeRequests(newCRs);
                        }}
                        placeholder="Descrição da Mudança"
                        className="w-full p-2 text-xs bg-white border border-gray-100 rounded focus:ring-1 focus:ring-orange-500 outline-none font-bold"
                      />
                      <input 
                        value={cr.impact}
                        onChange={(e) => {
                          const newCRs = [...changeRequests];
                          newCRs[idx].impact = e.target.value;
                          setChangeRequests(newCRs);
                        }}
                        placeholder="Impacto (Prazo, Custo, Escopo)"
                        className="w-full p-2 text-[10px] bg-white border border-gray-100 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                      <textarea 
                        value={cr.justification}
                        onChange={(e) => {
                          const newCRs = [...changeRequests];
                          newCRs[idx].justification = e.target.value;
                          setChangeRequests(newCRs);
                        }}
                        placeholder="Justificativa da Mudança"
                        rows={2}
                        className="w-full p-2 text-[10px] bg-white border border-gray-100 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
                {changeRequests.length === 0 && (
                  <div className="text-center py-12 text-gray-400 italic text-xs">
                    Nenhuma solicitação de mudança registrada.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Best Practices Footer */}
      <div className="bg-gray-900 p-6 rounded-2xl text-white flex gap-6 items-start shadow-xl">
        <div className="p-3 bg-orange-600 rounded-xl">
          <RefreshCw size={24} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-black uppercase tracking-widest text-orange-500">Monitoramento & Controle - Governança PMI</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            O monitoramento de riscos não é uma atividade pontual, mas um <strong>ciclo contínuo</strong>. Reavalie os riscos existentes, identifique novos riscos e audite a eficácia das respostas. Se um risco se concretizar ou exigir mudanças estruturais, formalize via <strong>Solicitação de Mudança (CR)</strong> para manter a integridade do plano do projeto.
          </p>
        </div>
      </div>
    </div>
  );
}
