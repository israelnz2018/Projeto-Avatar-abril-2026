import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Play, X, Send, Loader2, CheckCircle2, Trash2, Volume2, FileText, ChevronDown, ChevronUp, MessageSquarePlus, ListVideo, Lock } from 'lucide-react';
import FeedbackModal from './FeedbackModal';
import { useUserAccess } from '../../hooks/useUserAccess';
import { LockedToolPopup } from '../LockedToolPopup';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { askMentor, MentorResponse, VideoSource } from '../../services/contextualAIService';
import { savePendingQuestion } from '../../services/pendingQuestionsService';
import { getToolContext, MentorToolContext } from '../../services/mentorContextService';
import {
  saveMentorConversation,
  getUserConversations,
  clearUserToolConversations,
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

function parseTimeToSeconds(t: string): number {
  if (!t) return 0;
  // Aceita "MM:SS", "H:MM:SS" ou "MM:SS:CS"
  const parts = t.split(':').map(p => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
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
  // Crédito de IA esgotado → mostra botão de solicitar mais.
  const [creditoEsgotado, setCreditoEsgotado] = useState(false);
  const [solicitouCredito, setSolicitouCredito] = useState(false);
  const { canUseTool } = useUserAccess();
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false);
  // Ferramenta ativa bloqueada pro aluno (gratuito) → Mentor sobre ela fica bloqueado.
  const ferramentaBloqueada = !!activeToolId && !canUseTool(activeToolId);
  const [selectedVideo, setSelectedVideo] = useState<VideoSource | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toolContext, setToolContext] = useState<MentorToolContext | null>(null);
  const [isContextExpanded, setIsContextExpanded] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [videoSummary, setVideoSummary] = useState<Array<{ time: string; topic: string }>>([]);
  const [seekToSec, setSeekToSec] = useState<number>(0);
  // Incrementa a cada clique no índice — garante que o player recarregue no tempo
  // certo MESMO se o aluno clicar no mesmo item de novo (key muda sempre).
  const [seekNonce, setSeekNonce] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega o índice clicável do vídeo selecionado.
  // Estratégia: tenta o doc específico primeiro; se não tem summary, busca
  // qualquer outro doc com a mesma sourceUrl que tenha summary (placements irmãos).
  useEffect(() => {
    if (!selectedVideo?.id) {
      setVideoSummary([]);
      setSeekToSec(0);
      return;
    }
    setSeekToSec(0);
    setVideoSummary([]);

    (async () => {
      console.log('[VideoIndex] Buscando índice pro vídeo:', { id: selectedVideo.id, sourceUrl: selectedVideo.sourceUrl, title: selectedVideo.title });
      try {
        // 1) Tenta o doc específico
        const snap = await getDoc(doc(db, 'knowledge_base', selectedVideo.id));
        if (!snap.exists()) {
          console.warn('[VideoIndex] Doc não existe no knowledge_base:', selectedVideo.id);
        } else {
          const data = snap.data();
          console.log('[VideoIndex] Doc específico encontrado:', {
            id: snap.id,
            sourceUrl: data.sourceUrl,
            hasSummary: Array.isArray(data.summary),
            summaryLength: Array.isArray(data.summary) ? data.summary.length : 0,
            hasRawTranscript: !!data.rawTranscript,
            hasTranscript: !!data.transcript,
            associatedTools: data.associatedTools,
          });
          if (Array.isArray(data.summary) && data.summary.length > 0) {
            console.log('[VideoIndex] ✅ usando summary do doc específico');
            setVideoSummary(data.summary);
            return;
          }
        }

        // 2) Busca docs irmãos com mesma sourceUrl
        const sourceUrl = (snap.exists() ? (snap.data() as any).sourceUrl : null) || selectedVideo.sourceUrl;
        if (!sourceUrl) {
          console.warn('[VideoIndex] Sem sourceUrl pra buscar irmãos.');
          return;
        }
        console.log('[VideoIndex] Buscando irmãos com sourceUrl:', sourceUrl);

        const snap2 = await getDocs(query(
          collection(db, 'knowledge_base'),
          where('sourceUrl', '==', sourceUrl),
          limit(10)
        ));
        console.log(`[VideoIndex] ${snap2.docs.length} docs irmãos encontrados.`);
        for (const d of snap2.docs) {
          const v = d.data();
          console.log(`[VideoIndex] Irmão ${d.id}: summary=${Array.isArray(v.summary) ? v.summary.length : 'N/A'}`);
          if (Array.isArray(v.summary) && v.summary.length > 0) {
            console.log('[VideoIndex] ✅ usando summary do doc irmão', d.id);
            setVideoSummary(v.summary);
            return;
          }
        }
        console.warn('[VideoIndex] ❌ Nenhum doc tem summary preenchido pra esta sourceUrl');
      } catch (err) {
        console.error('[VideoIndex] erro ao carregar índice:', err);
      }
    })();
  }, [selectedVideo]);

  // Carrega o contexto (pergunta + resposta) cadastrado para a ferramenta ativa
  useEffect(() => {
    if (!activeToolId) {
      setToolContext(null);
      return;
    }
    getToolContext(activeToolId).then(ctx => {
      // Só considera "tem conteúdo" se tiver pergunta OU resposta preenchida
      const hasContent = ctx && (
        ctx.question?.trim() ||
        (ctx.responseMode === 'text' && ctx.responseText?.trim()) ||
        (ctx.responseMode === 'audio' && ctx.audioUrl)
      );
      setToolContext(hasContent ? ctx : null);
      setIsContextExpanded(true); // sempre abre quando muda de ferramenta
    }).catch(err => {
      console.error('Erro ao carregar contexto da ferramenta:', err);
      setToolContext(null);
    });
  }, [activeToolId]);

  // Carrega histórico do ALUNO na ferramenta ativa (userId + projectId + toolId).
  // Só mostra as conversas DELE relacionadas à ferramenta que está aberta.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!projectId || !uid) {
      setMessages([]);
      return;
    }
    getUserConversations(uid, projectId, activeToolId || undefined).then((convs: MentorConversation[]) => {
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
  }, [projectId, activeToolId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendMessage = async () => {
    const question = inputMessage.trim();
    if (!question || isThinking) return;
    // Trava de segurança: não deixa conversar sobre ferramenta bloqueada.
    if (ferramentaBloqueada) { setLockedPopupOpen(true); return; }

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
        label: activeToolLabel || undefined,
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
    } catch (error: any) {
      const limite = error?.name === 'CreditExhaustedError';
      if (limite) setCreditoEsgotado(true);
      console.error('Erro ao consultar mentor:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: limite
          ? 'Seu limite mensal de conversa com a IA chegou ao fim. Ele se renova automaticamente no próximo mês. Você continua usando todas as ferramentas normalmente. Se realmente precisar de mais créditos agora, use o botão abaixo.'
          : 'Desculpe, ocorreu um erro. Tente novamente em instantes.',
        level: 3
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSolicitarCredito = async () => {
    const { solicitarMaisCredito } = await import('../../services/tokenCreditService');
    await solicitarMaisCredito();
    setSolicitouCredito(true);
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
    const uid = auth.currentUser?.uid;
    if (!projectId || !uid) return;
    // Apaga só as conversas do ALUNO na ferramenta ativa (nunca de outros usuários).
    const ok = await clearUserToolConversations(uid, projectId, activeToolId || undefined);
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
      <div className="w-[340px] bg-white text-gray-800 rounded-[8px] flex flex-col h-full shadow-lg overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[13px] tracking-wide flex-shrink-0">
              IS
            </div>
            <div className="leading-tight min-w-0">
              <h3 className="font-bold text-[14px] m-0 text-gray-900">Israel Souza</h3>
              <p className="text-[10px] text-gray-500 mt-0.5 m-0">Consultor Sênior</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-snug italic">
                As respostas vêm preferencialmente dos vídeos do próprio Israel.
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer border-none bg-transparent"
              title="Apagar minhas conversas desta ferramenta"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Banner de contexto da ferramenta — SEMPRE visível quando há ferramenta selecionada */}
        {activeToolLabel ? (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-700">
                Pronto pra falar sobre
              </span>
            </div>
            <p className="text-[14px] font-bold text-blue-900 leading-tight">
              {activeToolLabel}
            </p>
            <p className="text-[11px] text-blue-700/70 leading-snug mt-1">
              Pergunte sobre quando usar, como preencher, exemplos práticos, ou ligue à sua fase atual.
            </p>

            {/* Conteúdo explicativo do Israel (se cadastrado) */}
            {toolContext && (
              <div className="mt-3 border-t border-blue-200 pt-2">
                <button
                  onClick={() => setIsContextExpanded(!isContextExpanded)}
                  className="w-full flex items-center justify-between text-left bg-transparent border-none cursor-pointer p-0 mb-1"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1">
                    {toolContext.responseMode === 'audio' ? <Volume2 size={9} /> : <FileText size={9} />}
                    Israel explica
                  </span>
                  {isContextExpanded ? <ChevronUp size={12} className="text-blue-700" /> : <ChevronDown size={12} className="text-blue-700" />}
                </button>
                <AnimatePresence>
                  {isContextExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      {toolContext.question && (
                        <p className="text-[11px] font-bold text-blue-900 leading-snug mb-1">
                          ❓ {toolContext.question}
                        </p>
                      )}
                      {toolContext.responseMode === 'text' && toolContext.responseText && (
                        <p className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                          {toolContext.responseText}
                        </p>
                      )}
                      {toolContext.responseMode === 'audio' && toolContext.audioUrl && (
                        <audio
                          controls
                          controlsList="nodownload noplaybackrate"
                          src={toolContext.audioUrl}
                          className="w-full h-8"
                          onContextMenu={(e) => e.preventDefault()}
                          preload="none"
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <p className="text-[11px] text-gray-500 italic leading-snug">
              Selecione uma ferramenta acima para focar a conversa nela, ou faça perguntas gerais sobre seu projeto.
            </p>
          </div>
        )}

        {/* Conversa — área principal, fundo claro */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length > 0 ? (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex flex-col max-w-[92%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-3 py-2 rounded-[10px] text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm",
                    msg.role === 'user'
                      ? "bg-blue-600 text-white rounded-br-[4px]"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-[4px]"
                  )}>
                    {msg.content}
                  </div>

                  {/* Fontes (vídeos usados) */}
                  {msg.role === 'assistant' && msg.videoSources && msg.videoSources.length > 0 && (
                    <div className="mt-2 w-full">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Play size={9} className="text-red-500" />
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
                                ? "bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                                : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                          >
                            <Play size={8} className="text-red-500 flex-shrink-0" />
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
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-[10px] text-green-700">
                          <CheckCircle2 size={12} />
                          Sua pergunta foi enviada ao Israel
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestDirectAnswer(i)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-[10px] text-blue-700 font-bold transition-all cursor-pointer"
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
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-[10px] max-w-[60%] shadow-sm">
                  <Loader2 size={12} className="animate-spin text-blue-600" />
                  <span className="text-[12px] text-gray-500">Pensando...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center px-4">
              <p className="text-[12px] text-gray-500 leading-relaxed italic">
                {activeToolLabel
                  ? <>Pergunte qualquer coisa sobre <strong className="text-gray-700">{activeToolLabel}</strong>, seu projeto ou conceitos de melhoria.</>
                  : 'Pergunte sobre seu projeto, ferramentas ou conceitos de melhoria.'}
              </p>
            </div>
          )}
        </div>

        {/* Input — ou aviso de bloqueio quando a ferramenta ativa é bloqueada */}
        <div className="p-4 bg-white border-t border-gray-200">
          {ferramentaBloqueada ? (
            <button
              onClick={() => setLockedPopupOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-[8px] px-4 py-2.5 text-[13px] text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Disponível no plano completo"
            >
              <Lock size={14} className="text-gray-500" />
              Converse com o Israel sobre {activeToolLabel || 'esta ferramenta'} no plano completo
            </button>
          ) : (
            <div className="relative">
              {creditoEsgotado && (
                solicitouCredito ? (
                  <div className="mb-2 rounded-[8px] px-3 py-2.5 text-[12px] leading-relaxed"
                    style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.35)', color: '#065f46' }}>
                    ✅ Enviamos sua solicitação ao Israel. Ele vai avaliar em até <strong>2 dias úteis</strong>.
                  </div>
                ) : (
                  <button onClick={handleSolicitarCredito}
                    className="w-full mb-2 rounded-[8px] px-3 py-2.5 text-[12.5px] font-semibold text-white cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #0033CC, #1E2D6E)' }}>
                    Preciso de mais créditos →
                  </button>
                )
              )}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isThinking && handleSendMessage()}
                disabled={isThinking}
                placeholder={activeToolLabel ? `Pergunte sobre ${activeToolLabel}…` : 'Pergunte ao mentor…'}
                className="w-full bg-white border border-gray-300 rounded-[8px] px-4 py-2.5 pr-10 text-[13px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder:text-gray-400 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isThinking || !inputMessage.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Rodapé: botão de feedback (bug / sugestão / dúvida) */}
        <div className="px-4 pb-4 pt-1 bg-white border-t border-gray-100" data-tour-id="proj-reportar">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[6px] text-[11px] font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors border border-gray-200 bg-white cursor-pointer"
            title="Reportar bug, sugerir melhoria ou tirar dúvida"
          >
            <MessageSquarePlus size={14} />
            Reportar / Sugerir / Perguntar
          </button>
        </div>
      </div>

      {/* Modal de Feedback */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        projetoAtivoNome={projectName || undefined}
        ferramentaAtual={activeToolLabel || undefined}
      />

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
                  Limpar suas conversas{activeToolLabel ? ` de ${activeToolLabel}` : ''}?
                </h4>
                <p className="text-center text-sm text-gray-600 mb-6">
                  Suas conversas com o Mentor LBW{activeToolLabel ? ` relacionadas a ${activeToolLabel}` : ' deste projeto'} serão apagadas. Só as suas — as de outras pessoas não são afetadas. Esta ação não pode ser desfeita.
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

      {/* Player de vídeo (modal flutuante) — 2 colunas: player + índice clicável */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <Play size={16} className="text-red-600 flex-shrink-0" />
                  <span className="font-bold text-sm text-gray-800 truncate">{selectedVideo.title}</span>
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 cursor-pointer border-none bg-transparent flex-shrink-0"
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Conteúdo: índice à esquerda, player à direita */}
              <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                {/* Sumário clicável (à ESQUERDA) */}
                <div className="lg:w-[340px] lg:border-r border-gray-200 bg-gray-50 flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 bg-white">
                    <h4 className="font-bold text-[13px] text-gray-800 flex items-center gap-2 m-0">
                      <ListVideo size={16} className="text-blue-600" />
                      Índice do vídeo
                    </h4>
                  </div>
                  <div className="overflow-y-auto flex-1 p-3 space-y-1.5" style={{ maxHeight: 'calc(90vh - 110px)' }}>
                    {videoSummary.length === 0 ? (
                      <p className="text-[12px] text-gray-500 italic text-center px-4 py-6">
                        Este vídeo ainda não tem índice gerado.
                      </p>
                    ) : (
                      videoSummary.map((s, i) => {
                        const sec = parseTimeToSeconds(s.time);
                        const active = sec === seekToSec;
                        return (
                          <button
                            key={i}
                            onClick={() => { setSeekToSec(sec); setSeekNonce(n => n + 1); }}
                            className={cn(
                              'w-full text-left text-[12px] p-2 rounded transition-colors flex gap-2 items-start cursor-pointer border',
                              active
                                ? 'bg-blue-100 border-blue-300 text-blue-900'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200'
                            )}
                          >
                            <span className={cn(
                              'font-mono font-bold px-1.5 py-0.5 rounded text-[10px] flex-shrink-0',
                              active ? 'bg-blue-200 text-blue-900' : 'bg-gray-100 text-gray-600'
                            )}>
                              {s.time}
                            </span>
                            <span className="leading-snug">{s.topic}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Player (à DIREITA) */}
                <div className="lg:flex-1 bg-black flex items-center">
                  <div
                    className="relative w-full aspect-video"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <iframe
                      key={`${selectedVideo.id}-${seekToSec}-${seekNonce}`}
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${getYoutubeId(selectedVideo.sourceUrl)}?autoplay=1&start=${seekToSec}&rel=0&modestbranding=1&iv_load_policy=3`}
                      title={selectedVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    {/* Overlays: topo (título/compartilhar) e cantos inferiores (link 🔗 / logo YouTube) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70, zIndex: 20, pointerEvents: 'auto' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 70, height: 50, zIndex: 20, pointerEvents: 'auto' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 130, height: 50, zIndex: 20, pointerEvents: 'auto' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paywall — ferramenta (e Mentor sobre ela) bloqueada pro aluno gratuito */}
      <LockedToolPopup isOpen={lockedPopupOpen} onClose={() => setLockedPopupOpen(false)} />
    </>
  );
};

export default MentorSidebar;


