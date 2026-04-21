import { useState } from 'react';
import { motion } from 'motion/react';
import { PlayCircle, Search, Filter, Bookmark, Share2, Clock, ArrowRight, GraduationCap, Star } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function LearningCenter() {
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Define', 'Measure', 'Analyze', 'Improve', 'Control', 'Statistics', 'Lean'];

  const videos = [
    {
      id: '1',
      title: 'Introduction to DMAIC Methodology',
      duration: '12:45',
      author: 'Lean Academy',
      phase: 'Define',
      thumbnail: 'https://picsum.photos/seed/lean/800/450',
      rating: 4.8,
      views: '12k',
    },
    {
      id: '2',
      title: 'Understanding P-values and Hypothesis Testing',
      duration: '18:20',
      author: 'Stats Master',
      phase: 'Analyze',
      thumbnail: 'https://picsum.photos/seed/stats/800/450',
      rating: 4.9,
      views: '45k',
    },
    {
      id: '3',
      title: 'Control Charts: SPC in Practice',
      duration: '15:10',
      author: 'Quality Hub',
      phase: 'Control',
      thumbnail: 'https://picsum.photos/seed/quality/800/450',
      rating: 4.7,
      views: '8k',
    },
    {
      id: '4',
      title: 'Root Cause Analysis: 5 Whys & Fishbone',
      duration: '10:30',
      author: 'Improvement Pro',
      phase: 'Analyze',
      thumbnail: 'https://picsum.photos/seed/root/800/450',
      rating: 4.6,
      views: '22k',
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end bg-white p-[20px] border border-[#ccc] rounded-[4px]">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#333] m-0">Learning Center</h1>
          <p className="text-[#666] mt-2">Domine a Melhoria Contínua com lições em vídeo curadas e recomendações de IA.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              placeholder="Pesquisar tópicos, fases, ferramentas..."
              className="pl-10 pr-4 py-2 bg-[#f9f9f9] border border-[#ccc] rounded-[4px] w-80 focus:outline-none focus:border-[#3b82f6] text-[13px]"
            />
          </div>
          <button className="p-2 bg-white border border-[#ccc] rounded-[4px] hover:bg-[#f0f2f5] transition-colors cursor-pointer">
            <Filter size={18} />
          </button>
        </div>
      </header>

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
              activeCategory === cat
                ? "bg-[#1f2937] text-white"
                : "bg-white border border-[#ccc] text-[#666] hover:bg-[#f0f2f5]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map((video, i) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[4px] border border-[#ccc] overflow-hidden group hover:shadow-md transition-all"
          >
            <div className="relative aspect-video overflow-hidden">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-transform duration-300">
                  <PlayCircle size={32} />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-[10px] font-bold rounded-[2px]">
                {video.duration}
              </div>
              <div className="absolute top-2 left-2 px-2 py-1 bg-white text-[#333] text-[10px] font-bold rounded-[2px] border border-[#ccc] shadow-sm">
                {video.phase}
              </div>
            </div>

            <div className="p-[20px]">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[16px] font-bold leading-tight group-hover:text-[#3b82f6] cursor-pointer m-0">
                  {video.title}
                </h3>
                <div className="flex space-x-1">
                  <button className="p-1.5 hover:bg-[#f0f2f5] rounded-[4px] border-none bg-transparent cursor-pointer">
                    <Bookmark size={16} />
                  </button>
                  <button className="p-1.5 hover:bg-[#f0f2f5] rounded-[4px] border-none bg-transparent cursor-pointer">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f0f2f5] rounded-[4px] flex items-center justify-center">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold m-0">{video.author}</p>
                    <p className="text-[10px] text-[#999] m-0">{video.views} visualizações</p>
                  </div>
                </div>
                <div className="flex items-center text-[12px] font-bold">
                  <Star size={14} className="text-yellow-500 fill-yellow-500 mr-1" />
                  {video.rating}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#1f2937] text-white p-[40px] rounded-[4px] relative overflow-hidden border border-[#ccc]">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-[2rem] font-bold mb-4">Trilha de Aprendizado Personalizada</h2>
          <p className="text-gray-300 text-[15px] leading-relaxed mb-8">
            Nossa IA analisa sua fase atual do projeto e os resultados dos dados para recomendar as lições exatas que você precisa agora. Chega de pesquisar, apenas aprenda.
          </p>
          <button className="bg-blue-600 text-white px-8 py-4 rounded-[4px] font-bold flex items-center hover:bg-blue-700 transition-all border-none cursor-pointer">
            Iniciar Trilha de IA <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
        <div className="absolute bottom-10 right-10 opacity-10">
          <GraduationCap size={150} />
        </div>
      </div>
    </div>
  );
}
