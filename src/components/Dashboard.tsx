import { motion } from 'motion/react';
import { Activity, Users, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Active Projects', value: '12', icon: Activity, trend: '+2 this month' },
    { label: 'Team Members', value: '8', icon: Users, trend: '0 change' },
    { label: 'Completed Tasks', value: '145', icon: CheckCircle, trend: '+12% vs last week' },
    { label: 'Avg. Cycle Time', value: '4.2d', icon: Clock, trend: '-0.5d improvement' },
  ];

  return (
    <div className="space-y-6">
      <header className="bg-white p-[20px] border border-[#ccc] rounded-[4px]">
        <h1 className="text-[1.5rem] font-bold text-[#333] m-0">Dashboard</h1>
        <p className="text-[#666] mt-2">Bem-vindo ao LBW Copilot. Acompanhe o progresso dos seus projetos de melhoria.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-[20px] border border-[#ccc] rounded-[4px] shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-[#f0f2f5] rounded-[4px] text-[#333]">
                <stat.icon size={18} />
              </div>
              <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">{stat.trend}</span>
            </div>
            <p className="text-[1.5rem] font-bold text-[#333]">{stat.value}</p>
            <p className="text-[12px] font-bold text-[#666] uppercase">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-[20px] border border-[#ccc] rounded-[4px]">
          <div className="flex justify-between items-center mb-4 border-b border-[#eee] pb-2">
            <h2 className="text-[1.1rem] font-bold text-[#333]">Atividade Recente</h2>
            <button className="text-[12px] font-bold text-[#3b82f6] flex items-center hover:underline bg-transparent border-none cursor-pointer">
              Ver tudo <ArrowUpRight size={14} className="ml-1" />
            </button>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-[12px] hover:bg-[#f9f9f9] border-b border-[#eee] last:border-0 transition-colors cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-[40px] h-[40px] bg-[#3b82f6] text-white rounded-[4px] flex items-center justify-center font-bold">
                    D
                  </div>
                  <div>
                    <p className="font-bold text-[#333] text-[14px]">Projeto de Redução de Defeitos</p>
                    <p className="text-[12px] text-[#666]">Israel atualizou o escopo na fase Define</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#999]">2h atrás</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1f2937] text-white p-[20px] border border-[#ccc] rounded-[4px]">
          <div className="relative z-10">
            <h2 className="text-[1.1rem] font-bold mb-4 flex items-center gap-2">
              <Activity size={18} className="text-blue-400" /> Insight de IA
            </h2>
            <p className="text-gray-300 text-[13px] leading-relaxed mb-6 italic">
              "Com base na sua análise recente do conjunto de dados 'Linha de Produção A', há uma forte correlação (r=0,85) entre flutuações de temperatura e taxas de defeito. Recomendo avançar para a fase Improve para testar soluções de resfriamento."
            </p>
            <button className="w-full bg-blue-600 text-white px-4 py-3 rounded-[4px] font-bold hover:bg-blue-700 transition-colors border-none cursor-pointer">
              Falar com Assistente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
