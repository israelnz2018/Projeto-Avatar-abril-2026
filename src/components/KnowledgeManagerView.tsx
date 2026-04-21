import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  Youtube, 
  Save, 
  X, 
  Video,
  Folder,
  Edit2,
  ListVideo,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { db } from '../lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { 
  saveKnowledge, 
  getRecentKnowledge, 
  getAllKnowledge,
  KnowledgeEntry,
  deleteKnowledge,
  updateKnowledge,
  deleteCourse,
  updateCourseName,
  deletePlaylist,
  updatePlaylistName,
  KNOWLEDGE_COLLECTION
} from '../services/knowledgeService';

const AVAILABLE_TOOLS = [
  { id: 'brief', name: 'Entendendo o Problema', phase: 'Define' },
  { id: 'charter', name: 'Project Charter', phase: 'Define' },
  { id: 'sipoc', name: 'SIPOC', phase: 'Define' },
  { id: 'timeline', name: 'Cronograma', phase: 'Define' },
  { id: 'detailedTimeline', name: 'Atividades do Projeto', phase: 'Define' },
  { id: 'stakeholders', name: 'Stakeholders', phase: 'Define' },
  { id: 'processMap', name: 'Mapeamento de Processo', phase: 'Measure' },
  { id: 'brainstorming', name: 'Brainstorming', phase: 'Measure' },
  { id: 'measureIshikawa', name: 'Espinha de Peixe (Ishikawa)', phase: 'Measure' },
  { id: 'measureMatrix', name: 'Matriz Causa e Efeito', phase: 'Measure' },
  { id: 'dataCollection', name: 'Plano de Coleta de Dados', phase: 'Measure' },
  { id: 'vsm', name: 'Mapeamento de Valor (VSM)', phase: 'Analyze' },
  { id: 'qualitativeAnalysis', name: 'Análise Qualitativa', phase: 'Analyze' },
  { id: 'statisticalAnalysis', name: 'Análise Estatística', phase: 'Analyze' },
  { id: 'dataNature', name: 'Natureza dos Dados (AI)', phase: 'Analyze' },
  { id: 'fmea', name: 'FMEA de Processo', phase: 'Improve' },
  { id: 'plan5w2h', name: 'Plano de Ação (5W2H)', phase: 'Improve' },
  { id: 'sop', name: 'Procedimento Operacional Padrão (POP)', phase: 'Improve' }
];

type ModalConfig = {
  isOpen: boolean;
  type: 'editCourse' | 'deleteCourse' | 'editPlaylist' | 'deletePlaylist' | 'editVideo' | 'deleteVideo' | 'importTranscript';
  targetId?: string;
  targetCourse?: string;
  targetPlaylist?: string;
  inputValue?: string;
};

export default function KnowledgeManagerView() {
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [importMode, setImportMode] = useState<'single' | 'playlist'>('single');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    sourceUrl: '',
    playlistUrl: '',
    course: '',
    playlist: '',
    associatedTools: [] as string[]
  });

  const [newCourse, setNewCourse] = useState('');
  const [newPlaylist, setNewPlaylist] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState<string | null>(null);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);

  const [editVideoData, setEditVideoData] = useState({
    id: '',
    title: '',
    course: '',
    playlist: '',
    associatedTools: [] as string[]
  });
  const [editNewCourse, setEditNewCourse] = useState('');
  const [editNewPlaylist, setEditNewPlaylist] = useState('');
  const [isEditToolsDropdownOpen, setIsEditToolsDropdownOpen] = useState(false);

  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, type: 'editCourse' });
  const [rawTranscriptText, setRawTranscriptText] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'raw'>('summary');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [seekTime, setSeekTime] = useState<number>(0);
  const [isMoving, setIsMoving] = useState<string | null>(null);
  const [activePlaylists, setActivePlaylists] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const data = await getAllKnowledge();
    setItems(data);
    
    // Set initial active playlists for each course
    const grouped = data.reduce((acc, item) => {
      const course = item.course || 'Sem Curso';
      const playlist = item.playlist || 'Sem Playlist';
      if (!acc[course]) acc[course] = new Set();
      acc[course].add(playlist);
      return acc;
    }, {} as Record<string, Set<string>>);

    setActivePlaylists(prev => {
      const next = { ...prev };
      Object.entries(grouped).forEach(([course, playlists]) => {
        if (!next[course]) {
          const firstPlaylist = Array.from(playlists)[0];
          if (firstPlaylist) {
            next[course] = firstPlaylist;
          }
        }
      });
      return next;
    });
    
    setLoading(false);
  };

  const fetchYoutubeTitle = async (url: string) => {
    try {
      const res = await fetch(`https://noembed.com/embed?url=${url}`);
      const data = await res.json();
      return data.title || 'Vídeo do YouTube';
    } catch (e) {
      return 'Vídeo do YouTube';
    }
  };

  const toggleTool = (toolId: string) => {
    setFormData(prev => ({
      ...prev,
      associatedTools: prev.associatedTools.includes(toolId)
        ? prev.associatedTools.filter(id => id !== toolId)
        : [...prev.associatedTools, toolId]
    }));
  };

  const toggleEditTool = (toolId: string) => {
    setEditVideoData(prev => ({
      ...prev,
      associatedTools: prev.associatedTools.includes(toolId)
        ? prev.associatedTools.filter(id => id !== toolId)
        : [...prev.associatedTools, toolId]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalCourse = formData.course === 'NEW' ? newCourse : formData.course;
      const finalPlaylist = formData.playlist === 'NEW' ? newPlaylist : formData.playlist;
      
      if (importMode === 'playlist') {
        const { extractPlaylistVideos } = await import('../lib/gemini');
        try {
          const videos = await extractPlaylistVideos(formData.playlistUrl);
          
          if (videos && videos.length > 0) {
            // Fetch last order once
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            const q = query(
              collection(db, KNOWLEDGE_COLLECTION), 
              where('course', '==', finalCourse),
              where('playlist', '==', finalPlaylist)
            );
            const snapshot = await getDocs(q);
            let lastOrder = 0;
            snapshot.docs.forEach(doc => {
              const docOrder = doc.data().order || 0;
              if (docOrder > lastOrder) lastOrder = docOrder;
            });

            // Trigger save in background (fire-and-forget)
            Promise.all(videos.map((video, index) => 
              saveKnowledge({
                title: video.title,
                content: '',
                sourceUrl: video.url,
                course: finalCourse,
                playlist: finalPlaylist,
                summary: [],
                transcript: '',
                associatedTools: formData.associatedTools
              }, lastOrder + index + 1)
            )).then(() => {
              fetchItems();
            }).catch(err => {
              console.error("Erro na importação em segundo plano:", err);
            });
            
            alert("Importação iniciada em segundo plano! Você pode continuar usando o app.");
          } else {
            alert("Não foi possível extrair vídeos desta fase. Verifique a URL.");
          }
        } catch (error: any) {
          alert(error.message || "Erro ao extrair fase.");
        } finally {
          setFormData({ sourceUrl: '', playlistUrl: '', course: '', playlist: '', associatedTools: [] });
          setNewCourse('');
          setNewPlaylist('');
          setIsAdding(false);
          setIsToolsDropdownOpen(false);
          setIsSaving(false);
        }
      } else {
        const title = await fetchYoutubeTitle(formData.sourceUrl);
        
        // Generate summary using Gemini AI
        const { generateVideoSummary } = await import('../lib/gemini');
        const { summary, transcript } = await generateVideoSummary(formData.sourceUrl);

        await saveKnowledge({
          title,
          content: '',
          sourceUrl: formData.sourceUrl,
          course: finalCourse,
          playlist: finalPlaylist,
          summary: summary || [],
          transcript: transcript || '',
          associatedTools: formData.associatedTools
        });
      }
      
      setFormData({ sourceUrl: '', playlistUrl: '', course: '', playlist: '', associatedTools: [] });
      setNewCourse('');
      setNewPlaylist('');
      setIsAdding(false);
      setIsToolsDropdownOpen(false);
      fetchItems();
    } catch (error) {
      alert("Erro ao salvar item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReprocess = async (item: KnowledgeEntry) => {
    setIsReprocessing(item.id!);
    try {
      const { generateVideoSummary } = await import('../lib/gemini');
      const { summary, transcript } = await generateVideoSummary(item.sourceUrl);
      await updateKnowledge(item.id!, {
        summary: summary || [],
        transcript: transcript || ''
      });
      fetchItems();
    } catch (error) {
      alert("Erro ao reprocessar vídeo.");
    } finally {
      setIsReprocessing(null);
    }
  };

  const handleImportTranscript = async () => {
    if (!modalConfig.targetId || !rawTranscriptText.trim()) return;
    
    setIsReprocessing(modalConfig.targetId);
    setModalConfig({ isOpen: false, type: 'importTranscript' });
    
    try {
      const item = items.find(i => i.id === modalConfig.targetId);
      if (!item) return;

      const { generateSummaryFromRawTranscript } = await import('../lib/gemini');
      const { summary, transcript } = await generateSummaryFromRawTranscript(item.sourceUrl, rawTranscriptText);
      
      await updateKnowledge(item.id!, {
        rawTranscript: rawTranscriptText,
        summary: summary || [],
        transcript: transcript || ''
      });
      fetchItems();
      setRawTranscriptText('');
    } catch (error) {
      alert("Erro ao processar transcrição completa.");
    } finally {
      setIsReprocessing(null);
    }
  };

  const handleMove = async (item: KnowledgeEntry, direction: 'up' | 'down', playlistItems: KnowledgeEntry[]) => {
    const currentIndex = playlistItems.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= playlistItems.length) return;

    const targetItem = playlistItems[targetIndex];
    if (!item.id || !targetItem.id) return;

    setIsMoving(item.id);
    try {
      // If order is missing, we need to assign it based on the current position in the list
      // The list is already sorted by order (asc) and timestamp (desc)
      let currentOrder = item.order;
      let targetOrder = targetItem.order;

      // If both are missing or equal, we need to re-order the whole playlist to be safe
      // or at least these two.
      if (currentOrder === undefined || targetOrder === undefined || currentOrder === targetOrder) {
        // Assign orders to all items in this playlist based on their current visual position
        // but we only need to swap these two.
        // Let's just use the index as a base for order if missing.
        currentOrder = currentIndex;
        targetOrder = targetIndex;
        
        // To avoid collisions with other playlists, we could use a large offset or just accept it's per-collection
        // Actually, let's just update these two with swapped indices as orders
        await updateKnowledge(item.id, { order: targetOrder });
        await updateKnowledge(targetItem.id, { order: currentOrder });
      } else {
        await updateKnowledge(item.id, { order: targetOrder });
        await updateKnowledge(targetItem.id, { order: currentOrder });
      }
      
      fetchItems();
    } catch (error) {
      console.error("Erro ao mover item:", error);
    } finally {
      setIsMoving(null);
    }
  };

  const handleMovePlaylist = async (courseName: string, playlistName: string, direction: 'left' | 'right', allPlaylists: string[]) => {
    const currentIndex = allPlaylists.indexOf(playlistName);
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= allPlaylists.length) return;

    const targetPlaylistName = allPlaylists[targetIndex];
    
    setIsMoving(`playlist-${playlistName}`);
    try {
      // Get all items for both playlists in this course
      const currentPlaylistItems = items.filter(i => i.course === courseName && i.playlist === playlistName);
      const targetPlaylistItems = items.filter(i => i.course === courseName && i.playlist === targetPlaylistName);

      // We need to swap their playlistOrder
      // Use the indices directly to ensure a stable order
      const currentPOrder = currentIndex;
      const targetPOrder = targetIndex;

      const batch = writeBatch(db);
      
      currentPlaylistItems.forEach(item => {
        if (item.id) {
          batch.update(doc(db, KNOWLEDGE_COLLECTION, item.id), { playlistOrder: targetPOrder });
        }
      });

      targetPlaylistItems.forEach(item => {
        if (item.id) {
          batch.update(doc(db, KNOWLEDGE_COLLECTION, item.id), { playlistOrder: currentPOrder });
        }
      });

      await batch.commit();
      fetchItems();
    } catch (error) {
      console.error("Erro ao mover playlist:", error);
    } finally {
      setIsMoving(null);
    }
  };

  const handleModalConfirm = async () => {
    try {
      if (modalConfig.type === 'deleteVideo' && modalConfig.targetId) {
        await deleteKnowledge(modalConfig.targetId);
      } else if (modalConfig.type === 'editVideo' && editVideoData.id) {
        const finalCourse = editVideoData.course === 'NEW' ? editNewCourse : editVideoData.course;
        const finalPlaylist = editVideoData.playlist === 'NEW' ? editNewPlaylist : editVideoData.playlist;
        await updateKnowledge(editVideoData.id, { 
          title: editVideoData.title,
          course: finalCourse,
          playlist: finalPlaylist,
          associatedTools: editVideoData.associatedTools
        });
      } else if (modalConfig.type === 'deleteCourse' && modalConfig.targetCourse) {
        await deleteCourse(modalConfig.targetCourse);
      } else if (modalConfig.type === 'editCourse' && modalConfig.targetCourse && modalConfig.inputValue) {
        await updateCourseName(modalConfig.targetCourse, modalConfig.inputValue);
      } else if (modalConfig.type === 'deletePlaylist' && modalConfig.targetCourse && modalConfig.targetPlaylist) {
        await deletePlaylist(modalConfig.targetCourse, modalConfig.targetPlaylist);
      } else if (modalConfig.type === 'editPlaylist' && modalConfig.targetCourse && modalConfig.targetPlaylist && modalConfig.inputValue) {
        await updatePlaylistName(modalConfig.targetCourse, modalConfig.targetPlaylist, modalConfig.inputValue);
      }
      
      setModalConfig({ isOpen: false, type: 'editCourse' });
      fetchItems();
    } catch (error) {
      console.error("Erro na operação:", error);
      alert("Ocorreu um erro ao realizar a operação.");
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const parseTimeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.playlist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueCourses = Array.from(new Set(items.map(item => item.course).filter(Boolean)));
  
  // Filter playlists based on selected course
  const availablePlaylists = formData.course && formData.course !== 'NEW'
    ? Array.from(new Set(items.filter(i => i.course === formData.course).map(i => i.playlist).filter(Boolean)))
    : [];

  // Group by Course -> Playlist -> Videos
  const groupedItemsMap = filteredItems.reduce((acc, item) => {
    const course = item.course || 'Sem Curso';
    const playlist = item.playlist || 'Sem Playlist';
    
    if (!acc[course]) acc[course] = {};
    if (!acc[course][playlist]) acc[course][playlist] = [];
    
    acc[course][playlist].push(item);
    return acc;
  }, {} as Record<string, Record<string, KnowledgeEntry[]>>);

  // Convert to sorted arrays
  const groupedItems = Object.entries(groupedItemsMap).map(([courseName, playlistsMap]) => {
    const sortedPlaylists = Object.entries(playlistsMap)
      .map(([playlistName, videos]) => ({
        name: playlistName,
        videos,
        // Use the playlistOrder of the first video as the order for the whole playlist
        order: videos[0]?.playlistOrder ?? Number.MAX_SAFE_INTEGER
      }))
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });

    return {
      name: courseName,
      playlists: sortedPlaylists
    };
  });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center bg-white p-6 border border-[#ccc] rounded-[4px]">
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#333] m-0">Base de Conhecimento</h1>
          <p className="text-[#666] mt-1 text-sm">Gerencie seus vídeos e recursos educacionais.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-[4px] font-bold hover:bg-blue-700 transition-all border-none cursor-pointer"
        >
          <Plus size={18} /> Adicionar Vídeo
        </button>
      </header>

      <div className="flex items-center gap-4 bg-white p-4 border border-[#ccc] rounded-[4px]">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Pesquisar por título, curso ou playlist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#f9f9f9] border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 border border-[#ccc] rounded-[4px] shadow-lg"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Youtube className="text-red-600" size={24} />
              Adicionar Novo Vídeo
            </h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setImportMode('single')}
                className={cn("px-4 py-2 rounded-md text-sm font-bold transition-colors border-none cursor-pointer", importMode === 'single' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
              >
                Vídeo Único
              </button>
              <button
                type="button"
                onClick={() => setImportMode('playlist')}
                className={cn("px-4 py-2 rounded-md text-sm font-bold transition-colors border-none cursor-pointer", importMode === 'playlist' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
              >
                Importar Fase
              </button>
            </div>

            {importMode === 'single' ? (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL do YouTube</label>
                <div className="relative">
                  <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600" />
                  <input
                    required
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({...formData, sourceUrl: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL da Fase do YouTube</label>
                <div className="relative">
                  <ListVideo size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600" />
                  <input
                    required
                    type="url"
                    value={formData.playlistUrl}
                    onChange={(e) => setFormData({...formData, playlistUrl: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="https://www.youtube.com/playlist?list=..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  A importação irá cadastrar todos os vídeos da playlist sequencialmente. O processamento da IA (resumo e legenda) não será feito automaticamente para evitar sobrecarga. Você poderá reprocessar cada vídeo individualmente depois.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Curso</label>
                <select
                  required
                  value={formData.course}
                  onChange={(e) => {
                    setFormData({...formData, course: e.target.value, playlist: ''});
                  }}
                  className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-white"
                >
                  <option value="" disabled>Selecione um curso...</option>
                  {uniqueCourses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="NEW">+ Cadastrar novo curso</option>
                </select>
                
                {formData.course === 'NEW' && (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    required
                    type="text"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="w-full p-2 border border-blue-300 rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-blue-50"
                    placeholder="Nome do novo curso"
                  />
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Playlist</label>
                <select
                  required
                  value={formData.playlist}
                  onChange={(e) => setFormData({...formData, playlist: e.target.value})}
                  className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-white"
                >
                  <option value="" disabled>Selecione uma playlist...</option>
                  {availablePlaylists.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="NEW">+ Cadastrar nova playlist</option>
                </select>

                {formData.playlist === 'NEW' && (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    required
                    type="text"
                    value={newPlaylist}
                    onChange={(e) => setNewPlaylist(e.target.value)}
                    className="w-full p-2 border border-blue-300 rounded-[4px] focus:outline-none focus:border-blue-500 text-sm bg-blue-50"
                    placeholder="Nome da nova playlist"
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ferramentas Associadas (Opcional)</label>
              <div className="relative">
                <div 
                  className="w-full p-2 border border-[#ccc] rounded-[4px] bg-white cursor-pointer flex justify-between items-center text-sm min-h-[38px]"
                  onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                >
                  <span className="text-gray-700 truncate">
                    {formData.associatedTools.length === 0 
                      ? "Selecione as ferramentas..." 
                      : `${formData.associatedTools.length} ferramenta(s) selecionada(s)`}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
                
                {isToolsDropdownOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#ccc] rounded-[4px] shadow-lg max-h-60 overflow-y-auto">
                    {['Define', 'Measure', 'Analyze', 'Improve'].map(phase => (
                      <div key={phase}>
                        <div className="bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500 uppercase sticky top-0 border-y border-[#eee]">{phase}</div>
                        {AVAILABLE_TOOLS.filter(t => t.phase === phase).map(tool => (
                          <label key={tool.id} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                            <input 
                              type="checkbox" 
                              checked={formData.associatedTools.includes(tool.id)}
                              onChange={() => toggleTool(tool.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {tool.name}
                          </label>
                        ))}
                      </div>
                    ))}
                    <div className="sticky bottom-0 bg-white border-t border-[#eee] p-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsToolsDropdownOpen(false); }}
                        className="w-full bg-blue-50 text-blue-600 font-bold py-2 rounded hover:bg-blue-100 transition-colors text-sm cursor-pointer border-none"
                      >
                        Confirmar Seleção
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#eee]">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 border border-[#ccc] rounded-[4px] font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-[4px] font-bold hover:bg-blue-700 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Gerando Resumo com IA e Salvando...' : <><Save size={18} /> Salvar Vídeo</>}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="text-center py-12 bg-white border border-[#ccc] rounded-[4px]">
            <p className="text-gray-500">Carregando recursos...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#ccc] rounded-[4px]">
            <Video size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">Nenhum vídeo encontrado.</p>
            <p className="text-gray-400 text-sm">Adicione seu primeiro vídeo para começar.</p>
          </div>
        ) : (
          groupedItems.map((course) => (
            <div key={course.name} className="bg-white border border-[#ccc] rounded-[4px] overflow-hidden">
              {/* Course Header */}
              <div className="bg-gray-50 p-4 border-b border-[#ccc] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="text-blue-600" size={20} />
                  <h2 className="font-bold text-lg text-gray-800 m-0">{course.name}</h2>
                  <span className="ml-2 bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                    {course.playlists.reduce((sum, p) => sum + p.videos.length, 0)} vídeos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setModalConfig({ isOpen: true, type: 'editCourse', targetCourse: course.name, inputValue: course.name })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer" 
                    title="Editar nome do curso"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setModalConfig({ isOpen: true, type: 'deleteCourse', targetCourse: course.name })}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer" 
                    title="Excluir curso e todos os seus vídeos"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Playlists Tabs */}
              <div className="bg-white border-b border-[#eee] px-4 pt-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  {course.playlists.map((playlist, pIdx, allPlaylists) => (
                    <div key={playlist.name} className="flex items-center group/playlist">
                      <button
                        onClick={() => setActivePlaylists(prev => ({ ...prev, [course.name]: playlist.name }))}
                        className={cn(
                          "px-4 py-2 rounded-[4px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-2",
                          activePlaylists[course.name] === playlist.name
                            ? "bg-[#1f2937] text-white border-[#1f2937]"
                            : "bg-white border-[#ccc] text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <ListVideo size={14} className={activePlaylists[course.name] === playlist.name ? "text-purple-400" : "text-purple-500"} />
                        {playlist.name}
                        <span className={cn(
                          "text-[10px] ml-1",
                          activePlaylists[course.name] === playlist.name ? "text-gray-400" : "text-gray-400"
                        )}>
                          ({playlist.videos.length})
                        </span>
                      </button>
                      
                      <div className="flex items-center ml-1 opacity-0 group-hover/playlist:opacity-100 transition-opacity">
                        <button
                          disabled={pIdx === 0 || isMoving !== null}
                          onClick={() => handleMovePlaylist(course.name, playlist.name, 'left', allPlaylists.map(p => p.name))}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 border-none bg-transparent cursor-pointer"
                          title="Mover fase para esquerda"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          disabled={pIdx === allPlaylists.length - 1 || isMoving !== null}
                          onClick={() => handleMovePlaylist(course.name, playlist.name, 'right', allPlaylists.map(p => p.name))}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 border-none bg-transparent cursor-pointer"
                          title="Mover fase para direita"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <button 
                          onClick={() => setModalConfig({ isOpen: true, type: 'editPlaylist', targetCourse: course.name, targetPlaylist: playlist.name, inputValue: playlist.name })}
                          className="p-1 text-gray-300 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer" 
                          title="Editar nome da fase"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setModalConfig({ isOpen: true, type: 'deletePlaylist', targetCourse: course.name, targetPlaylist: playlist.name })}
                          className="p-1 text-gray-300 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer" 
                          title="Excluir fase e seus vídeos"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Playlist Content */}
              {activePlaylists[course.name] && course.playlists.find(p => p.name === activePlaylists[course.name]) && (
                <div className="border-b border-[#eee] last:border-0">
                  <table className="w-full border-collapse">
                    <tbody>
                      {course.playlists.find(p => p.name === activePlaylists[course.name])!.videos.map((item, idx, courseItems) => {
                        const videoId = getYoutubeId(item.sourceUrl);
                        return (
                          <React.Fragment key={item.id || idx}>
                            <tr className="border-b border-[#eee] last:border-0 hover:bg-gray-50 transition-colors">
                              <td className="p-4 pl-10">
                                <div className="flex items-center gap-3">
                                  <div className="w-24 aspect-video rounded overflow-hidden flex-shrink-0 border border-[#eee] relative group">
                                    {videoId ? (
                                      <>
                                        <img 
                                          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                                          alt={item.title}
                                          className="w-full h-full object-cover transition-transform duration-500"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-all flex items-center justify-center">
                                          <Youtube className="text-white opacity-0 group-hover:opacity-100" size={24} />
                                        </div>
                                      </>
                                    ) : (
                                      <Video className="w-full h-full p-2 text-gray-300" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm m-0 text-gray-800 line-clamp-2">{item.title}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <a 
                                        href={item.sourceUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline inline-block"
                                      >
                                        Acessar no YouTube
                                      </a>
                                      <button 
                                        onClick={() => handleReprocess(item)}
                                        disabled={isReprocessing === item.id}
                                        className={`text-xs flex items-center gap-1 disabled:opacity-50 border-none bg-transparent cursor-pointer font-bold ${
                                          (item.summary && item.summary.length > 0) || (item.transcript && item.transcript.length > 0)
                                            ? "text-purple-600 hover:text-purple-800"
                                            : "text-green-600 hover:text-green-800"
                                        }`}
                                      >
                                        <Sparkles size={12} />
                                        {isReprocessing === item.id 
                                          ? 'Processando...' 
                                          : ((item.summary && item.summary.length > 0) || (item.transcript && item.transcript.length > 0)
                                              ? 'Reprocessar IA'
                                              : 'Processar IA')
                                        }
                                      </button>
                                      <button 
                                        onClick={() => setModalConfig({ isOpen: true, type: 'importTranscript', targetId: item.id })}
                                        disabled={isReprocessing === item.id}
                                        className="text-xs flex items-center gap-1 disabled:opacity-50 border-none bg-transparent cursor-pointer font-bold text-teal-600 hover:text-teal-800"
                                        title="Colar a transcrição completa do YouTube para gerar o resumo"
                                      >
                                        <ListVideo size={12} />
                                        Transcrição Completa
                                      </button>
                                    </div>
                                    {item.associatedTools && item.associatedTools.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {item.associatedTools.map(toolId => {
                                          const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
                                          return tool ? (
                                            <span key={toolId} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                                              {tool.name}
                                            </span>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-xs text-gray-500 w-32 text-right">
                                {item.timestamp.toLocaleDateString()}
                              </td>
                              <td className="p-4 w-32">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="flex items-center border border-gray-200 rounded mr-2 overflow-hidden">
                                    <button
                                      disabled={idx === 0 || isMoving !== null}
                                      onClick={() => handleMove(item, 'up', courseItems)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-30 border-none bg-transparent cursor-pointer transition-colors"
                                      title="Mover para cima"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <div className="w-px h-4 bg-gray-200" />
                                    <button
                                      disabled={idx === courseItems.length - 1 || isMoving !== null}
                                      onClick={() => handleMove(item, 'down', courseItems)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-30 border-none bg-transparent cursor-pointer transition-colors"
                                      title="Mover para baixo"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      if (expandedId === item.id) {
                                        setExpandedId(null);
                                      } else {
                                        setExpandedId(item.id!);
                                        setSeekTime(0);
                                      }
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors border-none bg-transparent cursor-pointer flex items-center gap-1 text-xs font-bold" 
                                    title="Ver Detalhes"
                                  >
                                    Detalhes {expandedId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditVideoData({
                                        id: item.id!,
                                        title: item.title,
                                        course: item.course,
                                        playlist: item.playlist,
                                        associatedTools: item.associatedTools || []
                                      });
                                      setEditNewCourse('');
                                      setEditNewPlaylist('');
                                      setModalConfig({ isOpen: true, type: 'editVideo', targetId: item.id });
                                    }}
                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors border-none bg-transparent cursor-pointer" 
                                    title="Editar vídeo"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => setModalConfig({ isOpen: true, type: 'deleteVideo', targetId: item.id })}
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors border-none bg-transparent cursor-pointer" 
                                    title="Remover vídeo"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedId === item.id && (
                              <tr>
                                <td colSpan={3} className="p-0 border-b border-[#eee] bg-[#f8fafc]">
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    className="overflow-hidden"
                                  >
                                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                      {/* Col 1: Summary */}
                                      <div className="bg-white p-4 rounded-lg border border-gray-200 h-[400px] flex flex-col shadow-sm">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                          <ListVideo size={18} className="text-blue-600" />
                                          Índice do Vídeo
                                        </h4>
                                        <div className="overflow-y-auto flex-1 pr-2 space-y-2">
                                          {item.summary && item.summary.length > 0 ? (
                                            item.summary.map((s, i) => (
                                              <button 
                                                key={i}
                                                onClick={() => setSeekTime(parseTimeToSeconds(s.time))} 
                                                className="text-left text-sm hover:bg-blue-50 p-2 rounded w-full flex gap-3 transition-colors border border-transparent hover:border-blue-100 group cursor-pointer"
                                              >
                                                <span className="text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded group-hover:bg-blue-100 transition-colors">{s.time}</span>
                                                <span className="text-gray-700 leading-tight">{s.topic}</span>
                                              </button>
                                            ))
                                          ) : (
                                            <p className="text-sm text-gray-500 italic">Nenhum índice gerado para este vídeo.</p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Col 2: Video Player */}
                                      <div className="bg-black rounded-lg overflow-hidden h-[400px] flex items-center justify-center shadow-sm">
                                        {videoId ? (
                                          <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${videoId}?start=${seekTime}&autoplay=${seekTime > 0 ? 1 : 0}`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                          ></iframe>
                                        ) : (
                                          <p className="text-white">Vídeo indisponível</p>
                                        )}
                                      </div>

                                      {/* Col 3: Transcript */}
                                      <div className="bg-white p-4 rounded-lg border border-gray-200 h-[400px] flex flex-col shadow-sm">
                                        <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-2">
                                          <button 
                                            onClick={() => setActiveTab('summary')}
                                            className={`font-bold flex items-center gap-2 pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'summary' ? 'text-purple-600 border-purple-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                                          >
                                            <Sparkles size={16} />
                                            Resumo IA
                                          </button>
                                          {item.rawTranscript && (
                                            <button 
                                              onClick={() => setActiveTab('raw')}
                                              className={`font-bold flex items-center gap-2 pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'raw' ? 'text-teal-600 border-teal-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                                            >
                                              <ListVideo size={16} />
                                              Transcrição Original
                                            </button>
                                          )}
                                        </div>
                                        <div className="overflow-y-auto flex-1 pr-2">
                                          {activeTab === 'summary' ? (
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                              {item.transcript || "O resumo detalhado não está disponível para este vídeo. Clique em 'Reprocessar IA' para tentar gerá-lo."}
                                            </p>
                                          ) : (
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-mono text-xs">
                                              {item.rawTranscript}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Custom Modal */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {modalConfig.type === 'deleteCourse' && `Excluir Curso`}
                {modalConfig.type === 'editCourse' && `Editar Nome do Curso`}
                {modalConfig.type === 'deletePlaylist' && `Excluir Playlist`}
                {modalConfig.type === 'editPlaylist' && `Editar Nome da Playlist`}
                {modalConfig.type === 'deleteVideo' && `Excluir Vídeo`}
                {modalConfig.type === 'editVideo' && `Editar Vídeo`}
                {modalConfig.type === 'importTranscript' && `Importar Transcrição Completa`}
              </h3>
              
              <div className="mb-6 text-sm text-gray-600">
                {modalConfig.type === 'deleteCourse' && (
                  <p>Tem certeza que deseja excluir o curso <strong>{modalConfig.targetCourse}</strong>? Isso excluirá <strong>todos os vídeos</strong> associados a ele. Esta ação não pode ser desfeita.</p>
                )}
                {modalConfig.type === 'deletePlaylist' && (
                  <p>Tem certeza que deseja excluir a playlist <strong>{modalConfig.targetPlaylist}</strong>? Isso excluirá <strong>todos os vídeos</strong> desta playlist. Esta ação não pode ser desfeita.</p>
                )}
                {modalConfig.type === 'deleteVideo' && (
                  <p>Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.</p>
                )}
                
                {modalConfig.type === 'importTranscript' && (
                  <div className="space-y-4">
                    <p>Cole abaixo a <strong>transcrição completa</strong> do YouTube (com os tempos). A IA vai ler 100% do texto para gerar um índice clicável e um resumo detalhado, e o texto original ficará salvo para você ler.</p>
                    <textarea
                      value={rawTranscriptText}
                      onChange={(e) => setRawTranscriptText(e.target.value)}
                      placeholder="Exemplo:&#10;00:00 Olá pessoal, bem-vindos a mais um vídeo...&#10;00:05 Hoje vamos falar sobre Lean Six Sigma...&#10;00:10 E como aplicar na sua empresa..."
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-48 font-mono text-xs"
                    />
                  </div>
                )}
                
                {modalConfig.type === 'editVideo' && (
                  <div className="space-y-4">
                    <div>
                      <label className="font-bold text-xs uppercase text-gray-500 block mb-1">Título do Vídeo</label>
                      <input 
                        type="text" 
                        value={editVideoData.title} 
                        onChange={(e) => setEditVideoData({...editVideoData, title: e.target.value})}
                        className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-xs uppercase text-gray-500 block mb-1">Curso</label>
                        <select
                          value={editVideoData.course}
                          onChange={(e) => setEditVideoData({...editVideoData, course: e.target.value, playlist: ''})}
                          className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="" disabled>Selecione...</option>
                          {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="NEW">+ Novo curso</option>
                        </select>
                        {editVideoData.course === 'NEW' && (
                          <input
                            type="text"
                            value={editNewCourse}
                            onChange={(e) => setEditNewCourse(e.target.value)}
                            className="w-full mt-2 p-2 border border-blue-300 rounded-[4px] focus:outline-none focus:border-blue-500 bg-blue-50"
                            placeholder="Novo curso"
                          />
                        )}
                      </div>
                      <div>
                        <label className="font-bold text-xs uppercase text-gray-500 block mb-1">Playlist</label>
                        <select
                          value={editVideoData.playlist}
                          onChange={(e) => setEditVideoData({...editVideoData, playlist: e.target.value})}
                          className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="" disabled>Selecione...</option>
                          {editVideoData.course && editVideoData.course !== 'NEW' && 
                            Array.from(new Set(items.filter(i => i.course === editVideoData.course).map(i => i.playlist).filter(Boolean))).map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))
                          }
                          <option value="NEW">+ Nova playlist</option>
                        </select>
                        {editVideoData.playlist === 'NEW' && (
                          <input
                            type="text"
                            value={editNewPlaylist}
                            onChange={(e) => setEditNewPlaylist(e.target.value)}
                            className="w-full mt-2 p-2 border border-blue-300 rounded-[4px] focus:outline-none focus:border-blue-500 bg-blue-50"
                            placeholder="Nova playlist"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-xs uppercase text-gray-500 block mb-1">Ferramentas Associadas</label>
                      <div className="relative">
                        <div 
                          className="w-full p-2 border border-[#ccc] rounded-[4px] bg-white cursor-pointer flex justify-between items-center min-h-[38px]"
                          onClick={() => setIsEditToolsDropdownOpen(!isEditToolsDropdownOpen)}
                        >
                          <span className="text-gray-700 truncate">
                            {editVideoData.associatedTools.length === 0 
                              ? "Selecione..." 
                              : `${editVideoData.associatedTools.length} selecionada(s)`}
                          </span>
                          <ChevronDown size={16} className="text-gray-400" />
                        </div>
                        
                        {isEditToolsDropdownOpen && (
                          <div className="absolute z-10 bottom-full mb-1 left-0 right-0 bg-white border border-[#ccc] rounded-[4px] shadow-lg max-h-48 overflow-y-auto">
                            {['Define', 'Measure', 'Analyze', 'Improve'].map(phase => (
                              <div key={phase}>
                                <div className="bg-gray-50 px-3 py-1 text-[10px] font-bold text-gray-500 uppercase sticky top-0 border-y border-[#eee]">{phase}</div>
                                {AVAILABLE_TOOLS.filter(t => t.phase === phase).map(tool => (
                                  <label key={tool.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={editVideoData.associatedTools.includes(tool.id)}
                                      onChange={() => toggleEditTool(tool.id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    {tool.name}
                                  </label>
                                ))}
                              </div>
                            ))}
                            <div className="sticky bottom-0 bg-white border-t border-[#eee] p-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsEditToolsDropdownOpen(false); }}
                                className="w-full bg-blue-50 text-blue-600 font-bold py-1.5 rounded hover:bg-blue-100 transition-colors cursor-pointer border-none"
                              >
                                Confirmar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {modalConfig.type.startsWith('edit') && modalConfig.type !== 'editVideo' && (
                  <div className="space-y-2">
                    <label className="font-bold text-xs uppercase text-gray-500">Novo Nome</label>
                    <input 
                      type="text" 
                      value={modalConfig.inputValue || ''} 
                      onChange={(e) => setModalConfig({...modalConfig, inputValue: e.target.value})}
                      className="w-full p-2 border border-[#ccc] rounded-[4px] focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setModalConfig({ isOpen: false, type: 'editCourse' })}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-[4px] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={
                    modalConfig.type === 'importTranscript' ? handleImportTranscript : 
                    handleModalConfirm
                  }
                  disabled={
                    (modalConfig.type === 'importTranscript' && !rawTranscriptText.trim())
                  }
                  className={cn(
                    "px-4 py-2 text-white font-bold rounded-[4px] transition-colors disabled:opacity-50",
                    modalConfig.type.startsWith('delete') ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {modalConfig.type === 'importTranscript' ? 'Processar Transcrição' : 
                   'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
