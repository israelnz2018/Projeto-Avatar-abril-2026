import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Search, 
  Filter, 
  Bookmark, 
  Share2, 
  Clock, 
  ArrowRight, 
  GraduationCap, 
  Star,
  ChevronRight,
  PlayCircle,
  BookOpen,
  Layout,
  Layers,
  X,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  ListVideo
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getAllKnowledge, KnowledgeEntry } from '../services/knowledgeService';

export default function LearningView() {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activePlaylist, setActivePlaylist] = useState('Todas');
  const [selectedVideo, setSelectedVideo] = useState<KnowledgeEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const data = await getAllKnowledge();
    setItems(data);
    setLoading(false);
  };

  const categories = ['Todos', ...Array.from(new Set(items.map(item => item.course)))];
  
  const playlists = activeCategory === 'Todos' 
    ? [] 
    : ['Todas', ...Array.from(new Set(items.filter(item => item.course === activeCategory).map(item => item.playlist)))
        .sort((a, b) => {
          const orderA = items.find(i => i.course === activeCategory && i.playlist === a)?.playlistOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = items.find(i => i.course === activeCategory && i.playlist === b)?.playlistOrder ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return a.localeCompare(b);
        })
      ];

  const filteredItems = items.filter(item => {
    const categoryMatch = activeCategory === 'Todos' || item.course === activeCategory;
    const playlistMatch = activePlaylist === 'Todas' || item.playlist === activePlaylist;
    const searchMatch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       item.content.toLowerCase().includes(searchTerm.toLowerCase());
    return categoryMatch && playlistMatch && searchMatch;
  });

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end bg-white p-6 border border-[#ccc] rounded-[4px]">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#333] m-0">Educação</h1>
          <p className="text-[#666] mt-2">Domine a Melhoria Contínua com sua base de conhecimento personalizada.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-[#f0f2f5] p-1 rounded-[4px] border border-[#ccc]">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-[2px] border-none cursor-pointer transition-all",
                viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
              title="Visualização em Grade"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-[2px] border-none cursor-pointer transition-all",
                viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              placeholder="Pesquisar lições..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#f9f9f9] border border-[#ccc] rounded-[4px] w-64 focus:outline-none focus:border-[#3b82f6] text-[13px]"
            />
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setActivePlaylist('Todas');
              }}
              className={cn(
                "px-4 py-2 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                activeCategory === cat
                  ? "bg-[#1f2937] text-white"
                  : "bg-white border border-[#ccc] text-[#666] hover:bg-[#f0f2f5]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {activeCategory !== 'Todos' && playlists.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide"
          >
            {playlists.map((play) => (
              <button
                key={play}
                onClick={() => setActivePlaylist(play)}
                className={cn(
                  "px-4 py-2 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                  activePlaylist === play
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border border-[#ccc] text-[#666] hover:bg-blue-50"
                )}
              >
                {play}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[4px] border border-[#ccc] h-64 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#ccc] rounded-[4px]">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold">Nenhum curso disponível.</p>
          <p className="text-gray-400 text-sm">Adicione vídeos na Base de Conhecimento para vê-los aqui.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {filteredItems.map((item, i) => {
            const videoId = getYoutubeId(item.sourceUrl);
            const isSelected = selectedVideo?.id === item.id;
            
            return (
              <React.Fragment key={item.id || i}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "bg-white rounded-[4px] border overflow-hidden group hover:shadow-md transition-all cursor-pointer flex",
                    viewMode === 'grid' ? "flex-col" : "flex-row h-32",
                    isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-[#ccc]"
                  )}
                  onClick={() => setSelectedVideo(isSelected ? null : item)}
                >
                  <div className={cn(
                    "relative overflow-hidden",
                    viewMode === 'grid' ? "aspect-video" : "w-56 h-full"
                  )}>
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-transform duration-300">
                        <PlayCircle size={24} />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className={cn(
                        "font-bold leading-tight group-hover:text-[#3b82f6] transition-colors m-0 mb-2",
                        viewMode === 'grid' ? "text-[14px]" : "text-[16px]"
                      )}>
                        {item.title}
                      </h3>
                      {viewMode === 'list' && (
                        <p className="text-gray-500 text-xs line-clamp-2 mb-2">{item.content}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Layers size={12} />
                          {item.playlist}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {item.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                      {isSelected ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </motion.div>

                {/* Inline Player */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "overflow-hidden bg-gray-50 border-x border-b border-[#ccc] rounded-b-[4px] -mt-6 mb-4",
                        viewMode === 'grid' ? "col-span-1 md:col-span-2 lg:col-span-3" : ""
                      )}
                    >
                      <div className="p-6 flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 aspect-video bg-black rounded-[4px] overflow-hidden shadow-lg">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                            title={item.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                        <div className="w-full lg:w-80 flex flex-col">
                          <div className="bg-white border border-[#ccc] rounded-[4px] flex-1 flex flex-col overflow-hidden">
                            <div className="bg-gray-100 p-3 border-b border-[#ccc] flex items-center justify-between">
                              <h4 className="text-xs font-bold m-0 flex items-center gap-2">
                                <ListVideo size={14} className="text-blue-600" />
                                Sumário do Vídeo
                              </h4>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                              {item.summary && item.summary.length > 0 ? (
                                item.summary.map((point, idx) => (
                                  <div key={idx} className="flex gap-3 group/point">
                                    <span className="text-blue-600 font-mono text-xs font-bold bg-blue-50 px-2 py-0.5 rounded h-fit">
                                      {point.time}
                                    </span>
                                    <p className="text-xs text-gray-700 m-0 leading-relaxed group-hover/point:text-blue-600 transition-colors">
                                      {point.topic}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-400 italic text-center py-8">Nenhum sumário disponível para este vídeo.</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 p-4 bg-white border border-[#ccc] rounded-[4px]">
                            <h4 className="text-xs font-bold mb-2">Descrição</h4>
                            <p className="text-xs text-gray-600 leading-relaxed m-0 line-clamp-4">{item.content}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="bg-[#1f2937] text-white p-10 rounded-[4px] relative overflow-hidden border border-[#ccc]">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-[1.5rem] font-bold mb-4">Trilha de Aprendizado Personalizada</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            Nossa IA analisa sua fase atual do projeto e os resultados dos dados para recomendar as lições exatas que você precisa agora. Chega de pesquisar, apenas aprenda.
          </p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-[4px] font-bold flex items-center hover:bg-blue-700 transition-all border-none cursor-pointer text-sm">
            Iniciar Trilha de IA <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
        <div className="absolute bottom-5 right-5 opacity-10">
          <GraduationCap size={120} />
        </div>
      </div>
    </div>
  );
}
