import { useState } from 'react';
import { ArrowLeft, Car, Gamepad2, Lock, Plane, Sparkles } from 'lucide-react';
import RiverMissionGame from './games/RiverMissionGame';

export default function LbwArcade() {
  const [activeGame, setActiveGame] = useState<'river' | null>(null);

  if (activeGame === 'river') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft size={17} /> Voltar para os jogos
          </button>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-800">
            Jogo executado dentro da LBW
          </span>
        </div>
        <RiverMissionGame />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#081a35] via-[#0c2d68] to-[#075b8c] px-7 py-9 sm:px-10 sm:py-11 text-white shadow-xl">
        <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-cyan-400/15 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 border border-blue-300/30 flex items-center justify-center shadow-2xl shadow-blue-950/40 shrink-0">
            <Gamepad2 size={34} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300 m-0">Aprenda, avance e divirta-se</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-2">LBW Arcade</h1>
            <p className="text-sm sm:text-base text-blue-100/85 max-w-2xl leading-relaxed m-0">
              Jogos retrô criados para a LBW. Jogue diretamente na plataforma pelo computador ou celular.
            </p>
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 mb-1">Primeira missão disponível</p>
            <h2 className="text-2xl font-black text-slate-900 m-0">Escolha seu jogo</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <button
            type="button"
            onClick={() => setActiveGame('river')}
            className="group relative overflow-hidden rounded-[28px] border-2 border-blue-500 bg-[#071528] text-left shadow-xl shadow-blue-950/10 hover:-translate-y-1 transition-transform cursor-pointer"
          >
            <div className="relative h-48 overflow-hidden bg-gradient-to-b from-[#0b8bc0] to-[#075b8c]">
              <div className="absolute inset-y-0 left-0 w-[27%] bg-[#153e2e] border-r-4 border-[#71d36b] skew-x-[-8deg] origin-bottom" />
              <div className="absolute inset-y-0 right-0 w-[27%] bg-[#153e2e] border-l-4 border-[#71d36b] skew-x-[8deg] origin-bottom" />
              <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] text-white drop-shadow-[0_0_14px_rgba(59,130,246,1)] group-hover:-translate-y-[60%] transition-transform" size={58} fill="white" />
              <span className="absolute top-4 left-4 rounded-full bg-emerald-400 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-950">Disponível</span>
            </div>
            <div className="p-6 text-white">
              <h3 className="text-xl font-black m-0">LBW River Mission</h3>
              <p className="text-sm text-blue-100/70 leading-relaxed mt-2 mb-5">Pilote, desvie dos obstáculos, administre sua energia e supere seu recorde.</p>
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                <Sparkles size={15} /> Jogar agora
              </span>
            </div>
          </button>

          <LockedGameCard icon={Car} title="LBW Endurance Race" description="Corrida, ultrapassagens e desafios em alta velocidade." />
          <LockedGameCard icon={Gamepad2} title="LBW Escape" description="Desvie dos obstáculos e sobreviva ao ritmo crescente." />
        </div>
      </section>
    </div>
  );
}

function LockedGameCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Gamepad2;
  title: string;
  description: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white opacity-75">
      <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
        <Icon size={55} className="text-slate-400" />
        <span className="absolute top-4 left-4 rounded-full bg-slate-800 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">Em desenvolvimento</span>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-black text-slate-700 m-0">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mt-2 mb-5">{description}</p>
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><Lock size={14} /> Em breve</span>
      </div>
    </article>
  );
}
