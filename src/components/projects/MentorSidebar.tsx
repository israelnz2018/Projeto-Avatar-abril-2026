import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Play, X, ExternalLink, Send, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../../lib/firebase';
import { askMentor, MentorResponse, VideoSource } from '../../services/contextualAIService';
import { savePendingQuestion } from '../../services/pendingQuestionsService';
import {
  saveMentorConversation,
  getConversationsByProject,
  clearProjectConversations,
  MentorConversation
} from '../../services/mentorConversationsService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  level?: 1 | 2 | 3;
  videoSources?: VideoSource[];
  conversationId?: string;     // id da conversa no Firestore
  pendingQuestionSaved?: boolean; // se já clicou em "solicitar resposta direta"
}

interface MentorSidebarProps {
  // Props originais (mantidas por compatibilidade)
  currentPhase: string | null;
  suggestions: string[];
  mentorMessage: string;

  // Props novas
  activeToolId: string | null;
  activeToolLabel: string | null;
  projectId: string | null;
  projectName: string | null;
}

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const MentorSidebar: React.FC<MentorSidebarProps> = ({
  currentPhase,
  suggestions,
  mentorMessage,
  activeToolId,
  activeToolLabel,
  projectId,
  projectName
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoSource | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega histórico ao mudar de projeto
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      return;
    }
    getConversationsByProject(projectId).then((convs: MentorConversation[]) => {
      const restored: Message[] = [];
      convs.forEach(c => {
        restored.push({ role: 'user', content: c.question });
        restored.push({
          role: 'assistant',
          content: c.answer,
          level: c.level,
          videoSources: c.videoSourceIds.map((id, idx) => ({
            id,
            title: c.videoSourceTitles[idx] || 'Vídeo',
            sourceUrl: '' // não armazenamos a URL no histórico — só os títulos
          })),
          conversationId: c.id
        });
      });
      setMessages(restored);
    }).catch(err => {
      console.error('Erro ao carregar histórico:', err);
    });
  }, [projectId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendMessage = async () => {
    const question = inputMessage.trim();
    if (!question || isThinking) return;

    setInputMessage('');
    setIsThinking(true);

    // Adiciona pergunta do usuário
    setMessages(prev => [...prev, { role: 'user', content: question }]);

    try {
      // Monta histórico para contexto (últimas 3 trocas)
      const history = messages
        .slice(-6)
        .reduce<{ question: string; answer: string }[]>((acc, m, idx, arr) => {
          if (m.role === 'user' && arr[idx + 1]?.role === 'assistant') {
            acc.push({ question: m.content, answer: arr[idx + 1].content });
          }
          return acc;
        }, []);

      // Chama IA contextual
      const response: MentorResponse = await askMentor(question, {
        type: activeToolId ? 'tool' : 'free',
        id: activeToolId || undefined,
        conversationHistory: history
      });

      // Adiciona resposta
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.answer,
        level: response.level,
        videoSources: response.videoSources
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Salva no histórico do projeto
      if (projectId && auth.currentUser) {
        const convId = await saveMentorConversation({
          projectId,
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || auth.currentUser.email || 'Usuário',
          toolId: activeToolId || undefined,
          toolLabel: activeToolLabel || undefined,
          question,
          answer: response.answer,
          level: response.level,
          confidence: response.confidence,
          videoSourceIds: response.videoSources.map(v => v.id),
          videoSourceTitles: response.videoSources.map(v => v.title)
        });

        // Atualiza o conversationId na mensagem
        if (convId) {
          setMessages(prev => prev.map((m, idx) =>
            idx === prev.length - 1 ? { ...m, conversationId: convId } : m
          ));
        }
      }
    } catch (error) {
      console.error('Erro ao consultar mentor:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente em instantes.',
        level: 3
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleRequestDirectAnswer = async (msgIndex: number) => {
    const userMsg = messages[msgIndex - 1];
    const aiMsg = messages[msgIndex];
    if (!userMsg || !aiMsg || !auth.currentUser) return;

    const saved = await savePendingQuestion({
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || auth.currentUser.email || 'Usuário',
      userEmail: auth.currentUser.email || '',
      projectId: projectId || undefined,
      projectName: projectName || undefined,
      question: userMsg.content,
      aiAnswer: aiMsg.content,
      contextType: activeToolId ? 'tool' : 'free',
      contextId: activeToolId || undefined,
      contextLabel: activeToolLabel || undefined
    });

    if (saved) {
      setMessages(prev => prev.map((m, idx) =>
        idx === msgIndex ? { ...m, pendingQuestionSaved: true } : m
      ));
    }
  };

  const handleClearHistory = async () => {
    if (!projectId) return;
    const ok = await clearProjectConversations(projectId);
    if (ok) {
      setMessages([]);
      setShowClearConfirm(false);
    }
  };

  const handleSuggestionClick = (s: string) => {
    setInputMessage(s);
  };

  return (
    <>
      <div className="w-[320px] bg-[#1a1a1a] text-white rounded-[8px] flex flex-col h-[calc(100vh-140px)] sticky top-[120px] shadow-2xl overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[15px]">Mentor LBW</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                    {activeToolLabel ? `Contexto: ${activeToolLabel}` : 'Online para ajudar'}
                  </span>
                </div>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer border-none bg-transparent"
                title="Limpar histórico deste projeto"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="bg-gray-800/40 p-4 rounded-[6px] border border-gray-700/50">
            <p className="text-[13px] leading-relaxed italic text-gray-300">
              "{mentorMessage}"
            </p>
          </div>
        </div>

        {/* Aviso LGPD compacto */}
        {messages.length === 0 && (
          <div className="px-6 py-2 bg-blue-500/5 border-b border-blue-500/20">
            <p className="text-[9px] text-gray-500 leading-relaxed">
              ℹ️ Suas conversas ficam salvas neste projeto. O Israel pode visualizá-las para fins pedagógicos.
            </p>
          </div>
        )}

        {/* Conversa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length > 0 ? (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex flex-col max-w-[95%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}>
                  <div className={cn(
                    "p-3 rounded-[8px] text-[12px] leading-relaxed whitespace-pre-wrap",
                    msg.role === 'user' ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
                  )}>
                    {msg.content}
                  </div>

                  {/* Fontes (vídeos usados) */}
                  {msg.role === 'assistant' && msg.videoSources && msg.videoSources.length > 0 && (
                    <div className="mt-2 w-full">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Play size={9} className="text-red-400" />
                        {msg.level === 1 ? 'Aulas desta ferramenta' : 'Aulas relacionadas'}
                      </p>
                      <div className="flex flex-col gap-1">
                        {msg.videoSources.map(vs => (
                          <button
                            key={vs.id}
                            onClick={() => vs.sourceUrl && setSelectedVideo(vs)}
                            disabled={!vs.sourceUrl}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-left transition-all border w-full",
                              vs.sourceUrl
                                ? "bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                                : "bg-gray-800/30 border-gray-800 text-gray-500 cursor-not-allowed"
                            )}
                          >
                            <Play size={8} className="text-red-400 flex-shrink-0" />
                            <span className="truncate">{vs.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão "Solicitar resposta direta" - só Nível 3 */}
                  {msg.role === 'assistant' && msg.level === 3 && (
                    <div className="mt-2 w-full">
                      {msg.pendingQuestionSaved ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400">
                          <CheckCircle2 size={12} />
                          Sua pergunta foi enviada ao Israel
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestDirectAnswer(i)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-[10px] text-blue-300 font-bold transition-all cursor-pointer"
                        >
                          <Send size={11} />
                          Solicitar resposta direta do Israel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-[8px] max-w-[60%]">
                  <Loader2 size={12} className="animate-spin text-blue-400" />
                  <span className="text-[11px] text-gray-400">Pensando...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="space-y-6">
              <h4 className="text-[11px] font-bold uppercase text-gray-500 tracking-widest">
                {currentPhase ? `Sugestões para ${currentPhase}` : 'Sugestões Gerais'}
              </h4>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-700 rounded-[6px] text-[12px] transition-all border border-gray-700/50 text-white cursor-pointer flex items-start gap-3 group"
                  >
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-125 transition-transform shrink-0" />
                    <span className="group-hover:text-blue-300 transition-colors">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-gray-900/50 border-t border-gray-800">
          <div className="relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isThinking && handleSendMessage()}
              disabled={isThinking}
              placeholder="Pergunte ao mentor..."
              className="w-full bg-gray-800 border border-gray-700 rounded-[6px] px-4 py-3 text-[13px] focus:outline-none focus:border-blue-500 text-white placeholder:text-gray-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={isThinking || !inputMessage.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-300 bg-transparent border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-3 text-center">
            {activeToolLabel
              ? `Respostas baseadas em: ${activeToolLabel}`
              : 'Pressione Enter para enviar'}
          </p>
        </div>
      </div>

      {/* Modal de Confirmar Limpar Histórico */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
                </div>
                <h4 className="text-center font-bold text-gray-800 mb-2">
                  Limpar histórico do Mentor?
                </h4>
                <p className="text-center text-sm text-gray-600 mb-6">
                  Todas as conversas com o Mentor LBW deste projeto serão apagadas. Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 cursor-pointer border-none"
                  >
                    Limpar tudo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Player de vídeo (modal flutuante) */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Play size={16} className="text-red-600" />
                  <span className="font-bold text-sm text-gray-800 truncate">{selectedVideo.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedVideo.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold border border-blue-200 rounded px-2 py-0.5"
                  >
                    <ExternalLink size={11} />
                    Abrir no YouTube
                  </a>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 cursor-pointer border-none bg-transparent"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${getYoutubeId(selectedVideo.sourceUrl)}?autoplay=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MentorSidebar;

