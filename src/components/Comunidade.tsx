/**
 * Comunidade LBW — fórum simples (estilo Q&A) aberto a todos os usuários.
 *
 * - Posts vêm de duas origens, mesmo modelo: o popup "Reportar/Sugerir/Perguntar"
 *   e a criação direta aqui. Cada post é dúvida, sugestão ou bug.
 * - Respostas aninhadas (replies). Admin aparece com selo.
 * - Avatar (foto se houver, senão inicial), nome (ou email), ferramenta e tipo.
 * - @menção com autocomplete → gera notificação pro mencionado.
 * - O autor do post marca "resolvido".
 * - 3 modos de ver: por ferramenta, timeline (mais recentes) e por tipo.
 *
 * Sem IA.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users2, Bug, Lightbulb, HelpCircle, Send, CheckCircle2, Circle,
  Wrench, Clock, ListFilter, Plus, Trash2, MessageCircle, Shield, X, Bell,
  Search, ThumbsUp, Flame, Pin, Pencil, Check, Paperclip, FileText, Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useUserAccess } from '../hooks/useUserAccess';
import { resolveConsultorId, empresaIdDireto } from '../services/consultorService';
import { useConsultor } from '../contexts/ConsultorContext';
import UpgradeBanner from './UpgradeBanner';
import {
  ouvirPosts, ouvirReplies, criarPost, criarReply, marcarResolvido,
  deletarPost, deletarReply, extrairMencionaveis, curtirPost, fixarPost,
  editarPost, editarReply, uploadAnexo, bloquearPost, bloquearReply,
  ouvirNotificacoes, marcarNotificacoesLidas,
  CommunityPost, CommunityReply, PostTipo, Autor, CommunityNotification, Anexo,
  EscopoComunidade, EspacoComunidade,
} from '../services/communityService';

// ===== Config visual dos tipos =====
const TIPO_CFG: Record<PostTipo, { label: string; icon: any; cls: string; dot: string }> = {
  duvida:     { label: 'Pergunta',   icon: HelpCircle,    cls: 'text-blue-700 bg-blue-50 border-blue-200',     dot: 'bg-blue-500' },
  sugestao:   { label: 'Sugestão',   icon: Lightbulb,     cls: 'text-amber-700 bg-amber-50 border-amber-200',   dot: 'bg-amber-500' },
  bug:        { label: 'Bug',        icon: Bug,           cls: 'text-red-700 bg-red-50 border-red-200',         dot: 'bg-red-500' },
  comentario: { label: 'Comentário', icon: MessageCircle, cls: 'text-violet-700 bg-violet-50 border-violet-200', dot: 'bg-violet-500' },
};

type ViewMode = 'timeline' | 'curtidos' | 'ferramenta' | 'tipo';

// ===== Helpers =====
function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}
function corDoNome(nome: string): string {
  const cores = ['#0033CC', '#1E2D6E', '#7c3aed', '#0891b2', '#db2777', '#059669', '#ea580c'];
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h);
  return cores[Math.abs(h) % cores.length];
}
function tempoRelativo(ts: any): string {
  if (!ts) return 'agora';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('pt-BR');
}

// ===== Avatar =====
function Avatar({ autor, size = 38 }: { autor: Autor; size?: number }) {
  const nome = autor.nome || autor.email || 'Aluno';
  if (autor.photoURL) {
    return <img src={autor.photoURL} alt={nome} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, background: corDoNome(nome), fontSize: size * 0.38 }}
    >
      {iniciais(nome)}
    </div>
  );
}

// Renderiza texto com @menções destacadas e links clicáveis.
// Links pra /education?video=<id> (colados pelo admin) abrem o vídeo na aba Educação,
// sem sair da plataforma. Demais URLs abrem em nova aba.
function TextoComMencoes({ texto }: { texto: string }) {
  // Quebra por URL http(s) OU por @menção, preservando os separadores.
  const partes = texto.split(/(https?:\/\/[^\s]+|@[\wÀ-ÿ.]+(?:\s[\wÀ-ÿ.]+)?)/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {partes.map((p, i) => {
        if (/^https?:\/\//.test(p)) {
          // Link interno da plataforma (mesma origem) → navega dentro do app.
          const interno = p.includes('/education?video=') || p.startsWith(window.location.origin);
          if (interno) {
            const href = p.replace(/^https?:\/\/[^/]+/, ''); // caminho relativo
            if (href.includes('/education?video=')) {
              // Mini-telinha do vídeo: card interno + título (dados vêm no link).
              let titulo = '';
              try {
                const qs = new URLSearchParams(href.split('?')[1] || '');
                titulo = qs.get('t') || 'Assistir o vídeo';
              } catch { /* ignore */ }
              return (
                <a key={i} href={href} className="mt-2 flex items-center gap-3 max-w-sm bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-md transition no-underline">
                  <div className="relative w-28 h-16 bg-gray-900 shrink-0">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xs ml-0.5">▶</span>
                      </div>
                    </div>
                  </div>
                  <div className="py-2 pr-3 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Vídeo</div>
                    <div className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2">{titulo}</div>
                  </div>
                </a>
              );
            }
            return <a key={i} href={href} className="text-blue-600 underline break-all">{p}</a>;
          }
          return <a key={i} href={p} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{p}</a>;
        }
        if (p.startsWith('@')) return <span key={i} className="text-blue-600 font-bold">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

// ===== Anexos: exibição (imagens + documentos) logo depois do texto =====
function AnexosView({ anexos }: { anexos?: Anexo[] }) {
  if (!anexos || anexos.length === 0) return null;
  const imagens = anexos.filter(a => a.tipo === 'imagem');
  const docs = anexos.filter(a => a.tipo === 'documento');
  return (
    <div className="mt-2 space-y-2">
      {imagens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imagens.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block">
              <img src={a.url} alt={a.nome} className="max-h-48 rounded-lg border border-gray-200 object-cover hover:opacity-90 transition" />
            </a>
          ))}
        </div>
      )}
      {docs.map((a, i) => (
        <a key={i} href={a.url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[12px] font-bold text-gray-700 no-underline transition max-w-full">
          <FileText size={15} className="shrink-0 text-blue-600" />
          <span className="truncate">{a.nome}</span>
        </a>
      ))}
    </div>
  );
}

// ===== Anexos: input de seleção/upload (imagens + documentos, sem vídeo) =====
function AnexosInput({ anexos, setAnexos }: {
  anexos: Anexo[];
  setAnexos: (a: Anexo[]) => void;
}) {
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const escolher = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErro(null);
    const lista = Array.from(files);
    setSubindo(true);
    try {
      const novos: Anexo[] = [];
      for (const f of lista) {
        novos.push(await uploadAnexo(f));
      }
      setAnexos([...anexos, ...novos]);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao anexar.');
    } finally {
      setSubindo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subindo}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {subindo ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
          {subindo ? 'Enviando…' : 'Anexar imagem ou documento'}
        </button>
        <span className="text-[10px] text-gray-400">Sem vídeo</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          className="hidden"
          onChange={e => escolher(e.target.files)}
        />
      </div>
      {erro && <p className="text-[11px] text-red-600 m-0">{erro}</p>}
      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {anexos.map((a, i) => (
            <div key={i} className="relative">
              {a.tipo === 'imagem' ? (
                <img src={a.url} alt={a.nome} className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
              ) : (
                <div className="h-16 w-28 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center px-1">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-[9px] text-gray-500 truncate w-full text-center mt-0.5">{a.nome}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAnexos(anexos.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer border-none"
                title="Remover"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Composer de resposta com @menção =====
function ReplyComposer({ mencionaveis, onSubmit }: {
  mencionaveis: Autor[];
  onSubmit: (texto: string, mencoes: Autor[], anexos: Anexo[]) => void;
}) {
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Detecta "@palavra" no fim do que está digitando
  const matchAt = texto.match(/@([\wÀ-ÿ.]*)$/);
  const filtro = matchAt ? matchAt[1].toLowerCase() : '';
  const sugestoes = matchAt
    ? mencionaveis.filter(m => (m.nome || m.email).toLowerCase().includes(filtro)).slice(0, 5)
    : [];

  const escolherMencao = (a: Autor) => {
    const nome = (a.nome || a.email).split(' ')[0];
    setTexto(t => t.replace(/@[\wÀ-ÿ.]*$/, `@${nome} `));
    setShowMenu(false);
    taRef.current?.focus();
  };

  const enviar = () => {
    if (texto.trim().length < 2 && anexos.length === 0) return;
    // Resolve menções: para cada @nome no texto, casa com a lista
    const mencoes = mencionaveis.filter(m => {
      const primeiro = (m.nome || m.email).split(' ')[0].toLowerCase();
      return new RegExp(`@${primeiro}\\b`, 'i').test(texto);
    });
    onSubmit(texto.trim(), mencoes, anexos);
    setTexto('');
    setAnexos([]);
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          value={texto}
          onChange={e => { setTexto(e.target.value); setShowMenu(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(); } }}
          placeholder="Escreva uma resposta…  (use @ para marcar alguém)"
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={enviar}
          disabled={texto.trim().length < 2 && anexos.length === 0}
          className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none transition"
        >
          <Send size={13} /> Responder
        </button>
      </div>
      <div className="mt-2">
        <AnexosInput anexos={anexos} setAnexos={setAnexos} />
      </div>
      {/* Autocomplete de @menção */}
      {showMenu && matchAt && sugestoes.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-20 w-64">
          {sugestoes.map(a => (
            <button
              key={a.uid}
              onClick={() => escolherMencao(a)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer border-none bg-white text-left"
            >
              <Avatar autor={a} size={24} />
              <span className="text-sm font-bold text-gray-700 truncate">{a.nome || a.email}</span>
              {a.isAdmin && <Shield size={12} className="text-emerald-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Thread de um post =====
function PostCard({ post, meUid, meIsAdmin, mencionaveis, onRepliesLoaded }: {
  post: CommunityPost;
  meUid: string;
  meIsAdmin: boolean;
  mencionaveis: Autor[];
  onRepliesLoaded: (postId: string, replies: CommunityReply[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [editando, setEditando] = useState(false);
  const [editTipo, setEditTipo] = useState<PostTipo>(post.tipo);
  const [editTitulo, setEditTitulo] = useState(post.titulo || '');
  const [editTexto, setEditTexto] = useState(post.texto);
  const [editReplyId, setEditReplyId] = useState<string | null>(null);
  const [editReplyTexto, setEditReplyTexto] = useState('');
  const cfg = TIPO_CFG[post.tipo];
  const TipoIcon = cfg.icon;
  const souAutor = post.autor?.uid === meUid;
  const likes = post.likes || [];
  const jaCurti = likes.includes(meUid);

  const salvarEdicaoPost = async () => {
    if (editTexto.trim().length < 5) return;
    await editarPost(post.id!, editTipo, editTitulo, editTexto);
    setEditando(false);
  };

  useEffect(() => {
    // Carrega as respostas sempre (não só quando aberto) pra mostrar o preview
    // da 1ª resposta com o post fechado. Volume baixo — poucos posts na tela.
    const unsub = ouvirReplies(post.id!, reps => { setReplies(reps); onRepliesLoaded(post.id!, reps); });
    return () => unsub();
  }, [post.id]);

  return (
    <div className={cn(
      'bg-white border rounded-2xl overflow-hidden transition-all',
      post.pinned ? 'border-amber-300 ring-1 ring-amber-200' :
      post.resolvido ? 'border-emerald-200' : 'border-gray-200'
    )}>
      {/* Faixa de fixado */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-[10px] font-black uppercase tracking-widest text-amber-700">
          <Pin size={11} className="fill-amber-600 text-amber-600" /> Fixado pela LBW
        </div>
      )}
      {/* Cabeçalho do post */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar autor={post.autor} />
          <div className="flex-1 min-w-0">
            {/* Título (se houver) — escondido no modo edição */}
            {post.titulo && !editando && (
              <h3 className="text-[15px] font-black text-gray-900 m-0 mb-1 leading-snug">{post.titulo}</h3>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-gray-900">{post.autor?.nome || post.autor?.email}</span>
              {post.autor?.isAdmin && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                  <Shield size={9} /> Admin
                </span>
              )}
              <span className="text-[11px] text-gray-400">· {tempoRelativo(post.createdAt)}</span>
            </div>
            {/* Tags: tipo + ferramenta */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border', cfg.cls)}>
                <TipoIcon size={11} /> {cfg.label}
              </span>
              {post.ferramenta && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                  <Wrench size={10} /> {post.ferramenta}
                </span>
              )}
              {post.resolvido && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                  <CheckCircle2 size={10} /> Resolvido
                </span>
              )}
            </div>
            {/* Texto OU form de edição */}
            {editando ? (
              <div className="mt-2 space-y-2">
                {/* Trocar o tipo da conversa */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['duvida', 'sugestao', 'comentario', 'bug'] as PostTipo[]).map(t => {
                    const c = TIPO_CFG[t]; const Ic = c.icon; const sel = editTipo === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditTipo(t)}
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded px-2 py-1 border cursor-pointer transition',
                          sel ? `${c.cls} ring-1 ring-current` : 'text-gray-400 border-gray-200 bg-white hover:bg-gray-50'
                        )}
                      >
                        <Ic size={11} /> {c.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={editTitulo}
                  onChange={e => setEditTitulo(e.target.value)}
                  placeholder="Título"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editTexto}
                  onChange={e => setEditTexto(e.target.value)}
                  rows={3}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={salvarEdicaoPost}
                    disabled={editTexto.trim().length < 5}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-black hover:bg-blue-700 disabled:opacity-40 cursor-pointer border-none"
                  >
                    <Check size={13} /> Salvar
                  </button>
                  <button
                    onClick={() => { setEditando(false); setEditTipo(post.tipo); setEditTitulo(post.titulo || ''); setEditTexto(post.texto); }}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-gray-500 hover:bg-gray-100 cursor-pointer bg-transparent border-none"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : post.bloqueado ? (
              <div className="mt-2 text-[13px] text-gray-500 italic bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5">
                🚫 Este comentário não foi permitido pela moderação.
                {meIsAdmin && (
                  <button onClick={() => bloquearPost(post.id!, false)} className="ml-2 not-italic text-blue-600 font-semibold hover:underline">desbloquear</button>
                )}
              </div>
            ) : (
              <>
                <p className={cn(
                  "text-[14px] text-gray-700 leading-relaxed mt-2 m-0",
                  // Post fixado longo: mostra só 5 linhas até o "ver mais".
                  post.pinned && !expandido && "line-clamp-5"
                )}>
                  <TextoComMencoes texto={post.texto} />
                  {post.editado && <span className="text-[10px] text-gray-400 italic ml-1">(editado)</span>}
                </p>
                {post.pinned && post.texto.length > 280 && (
                  <button
                    onClick={() => setExpandido(e => !e)}
                    className="mt-1 text-[12px] font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    {expandido ? 'ver menos' : 'ver mais'}
                  </button>
                )}
                <AnexosView anexos={post.anexos} />
              </>
            )}

            {/* Ações */}
            <div className="flex items-center gap-3 mt-3">
              {/* Joinha (like) */}
              <button
                onClick={() => curtirPost(post.id!, jaCurti)}
                className={cn(
                  'inline-flex items-center gap-1.5 text-[12px] font-bold cursor-pointer bg-transparent border-none transition',
                  jaCurti ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                )}
                title={jaCurti ? 'Remover curtida' : 'Curtir'}
              >
                <ThumbsUp size={14} className={jaCurti ? 'fill-blue-600' : ''} /> {likes.length}
              </button>
              <button
                onClick={() => setAberto(a => !a)}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-blue-600 cursor-pointer bg-transparent border-none transition"
              >
                <MessageCircle size={14} /> {post.replyCount || 0} {post.replyCount === 1 ? 'resposta' : 'respostas'}
              </button>
              {/* Resolver — só o autor */}
              {souAutor && (
                <button
                  onClick={() => marcarResolvido(post.id!, !post.resolvido)}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[12px] font-bold cursor-pointer bg-transparent border-none transition',
                    post.resolvido ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-600'
                  )}
                >
                  {post.resolvido ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {post.resolvido ? 'Resolvido' : 'Marcar como resolvido'}
                </button>
              )}
              {/* Controles do autor/admin — agrupados à direita */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Editar — admin sempre; autor só se ninguém interagiu ainda */}
                {((meIsAdmin) || (souAutor && (post.replyCount || 0) === 0 && (post.likes?.length || 0) === 0)) && !editando && !post.bloqueado && (
                  <button
                    onClick={() => { setEditando(true); setEditTipo(post.tipo); setEditTitulo(post.titulo || ''); setEditTexto(post.texto); }}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-gray-300 hover:text-blue-600 cursor-pointer bg-transparent border-none transition"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {/* Bloquear (moderação) — só admin */}
                {meIsAdmin && !post.bloqueado && (
                  <button
                    onClick={() => { if (confirm('Bloquear este comentário? O texto some e aparece "não permitido".')) bloquearPost(post.id!, true); }}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-gray-300 hover:text-orange-500 cursor-pointer bg-transparent border-none transition"
                    title="Bloquear (moderação)"
                  >
                    <Shield size={13} />
                  </button>
                )}
                {/* Fixar — só admin */}
                {meIsAdmin && (
                  <button
                    onClick={() => fixarPost(post.id!, !post.pinned)}
                    className={cn(
                      'inline-flex items-center gap-1 text-[12px] font-bold cursor-pointer bg-transparent border-none transition',
                      post.pinned ? 'text-amber-600' : 'text-gray-300 hover:text-amber-600'
                    )}
                    title={post.pinned ? 'Desafixar do topo' : 'Fixar no topo'}
                  >
                    <Pin size={13} className={post.pinned ? 'fill-amber-600' : ''} />
                  </button>
                )}
                {(souAutor || meIsAdmin) && (
                  <button
                    onClick={() => { if (confirm('Excluir este post e suas respostas?')) deletarPost(post.id!); }}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-gray-300 hover:text-red-500 cursor-pointer bg-transparent border-none transition"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview da 1ª resposta (quando fechado e há respostas) */}
      {!aberto && replies.length > 0 && (
        <button
          onClick={() => setAberto(true)}
          className="w-full text-left border-t border-gray-100 bg-gray-50/60 px-4 py-3 hover:bg-gray-100 transition cursor-pointer border-x-0 border-b-0"
        >
          <div className="flex items-start gap-2.5">
            <Avatar autor={replies[0].autor} size={26} />
            <div className="min-w-0 flex-1">
              <span className="text-[12px] font-bold text-gray-700">{replies[0].autor?.nome}</span>
              <span className="text-[13px] text-gray-500 ml-1.5">
                {replies[0].bloqueado
                  ? '🚫 comentário não permitido'
                  : (replies[0].texto || '').split('\n')[0].slice(0, 120)}
                {(replies[0].texto || '').length > 120 ? '…' : ''}
              </span>
            </div>
          </div>
          <span className="text-[12px] font-bold text-blue-600 mt-1.5 inline-block ml-9">
            {replies.length === 1 ? 'Ver resposta completa →' : `Ver as ${replies.length} respostas →`}
          </span>
        </button>
      )}

      {/* Respostas + composer */}
      {aberto && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-3">
          {replies.map((r, ri) => (
            <div key={r.id} className="flex items-start gap-2.5">
              <Avatar autor={r.autor} size={30} />
              <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-black text-gray-800">{r.autor?.nome || r.autor?.email}</span>
                  {r.autor?.isAdmin && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5">
                      <Shield size={8} /> Admin
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">· {tempoRelativo(r.createdAt)}</span>
                  {(r.autor?.uid === meUid || meIsAdmin) && editReplyId !== r.id && !r.bloqueado && (
                    <div className="ml-auto flex items-center gap-1.5">
                      {/* Editar: admin sempre; autor só se for a última resposta (ninguém respondeu depois) */}
                      {(meIsAdmin || (r.autor?.uid === meUid && ri === replies.length - 1)) && (
                        <button
                          onClick={() => { setEditReplyId(r.id!); setEditReplyTexto(r.texto); }}
                          className="text-gray-300 hover:text-blue-600 cursor-pointer bg-transparent border-none"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      {/* Bloquear (moderação) — só admin */}
                      {meIsAdmin && (
                        <button
                          onClick={() => { if (confirm('Bloquear esta resposta? O texto some e aparece "não permitido".')) bloquearReply(post.id!, r.id!, true); }}
                          className="text-gray-300 hover:text-orange-500 cursor-pointer bg-transparent border-none"
                          title="Bloquear (moderação)"
                        >
                          <Shield size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('Excluir resposta?')) deletarReply(post.id!, r.id!); }}
                        className="text-gray-300 hover:text-red-500 cursor-pointer bg-transparent border-none"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {editReplyId === r.id ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      value={editReplyTexto}
                      onChange={e => setEditReplyTexto(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => { if (editReplyTexto.trim().length < 2) return; await editarReply(post.id!, r.id!, editReplyTexto); setEditReplyId(null); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-black hover:bg-blue-700 cursor-pointer border-none"
                      >
                        <Check size={12} /> Salvar
                      </button>
                      <button onClick={() => setEditReplyId(null)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100 cursor-pointer bg-transparent border-none">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : r.bloqueado ? (
                  <div className="mt-1 text-[12px] text-gray-500 italic bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-2">
                    🚫 Este comentário não foi permitido pela moderação.
                    {meIsAdmin && (
                      <button onClick={() => bloquearReply(post.id!, r.id!, false)} className="ml-2 not-italic text-blue-600 font-semibold hover:underline">desbloquear</button>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] text-gray-700 leading-relaxed mt-0.5 m-0">
                      <TextoComMencoes texto={r.texto} />
                      {r.editado && <span className="text-[10px] text-gray-400 italic ml-1">(editado)</span>}
                    </p>
                    <AnexosView anexos={r.anexos} />
                  </>
                )}
              </div>
            </div>
          ))}
          <ReplyComposer
            mencionaveis={mencionaveis}
            onSubmit={(texto, mencoes, anexos) => criarReply(post.id!, texto, mencoes, anexos)}
          />
        </div>
      )}
    </div>
  );
}

// ===== Modal "Nova pergunta" =====
function NovoPostModal({ onClose, espaco }: { onClose: () => void; espaco: EspacoComunidade }) {
  const [tipo, setTipo] = useState<PostTipo>('duvida');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [ferramenta, setFerramenta] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [enviando, setEnviando] = useState(false);

  const podeEnviar = titulo.trim().length >= 3 && texto.trim().length >= 5;

  const enviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    try {
      await criarPost({ tipo, titulo: titulo.trim(), texto, ferramenta: ferramenta.trim() || null, anexos, espaco });
      onClose();
    } finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800 m-0">Nova publicação</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer text-gray-500"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(['duvida', 'sugestao', 'comentario', 'bug'] as PostTipo[]).map(t => {
              const c = TIPO_CFG[t]; const Icon = c.icon; const sel = tipo === t;
              return (
                <button key={t} onClick={() => setTipo(t)}
                  className={cn('flex flex-col items-center gap-1.5 p-3 border rounded-xl cursor-pointer transition',
                    sel ? `${c.cls} ring-2 ring-current font-bold` : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600')}>
                  <Icon size={20} /><span className="text-[11px]">{c.label}</span>
                </button>
              );
            })}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Título <span className="text-red-500">*</span></label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Resuma em poucas palavras"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Sobre qual ferramenta / vídeo? (opcional)</label>
            <input value={ferramenta} onChange={e => setFerramenta(e.target.value)} placeholder="Ex: Espinha de Peixe, vídeo de SIPOC…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Sua mensagem <span className="text-red-500">*</span></label>
            <textarea rows={5} value={texto} onChange={e => setTexto(e.target.value)}
              placeholder="Escreva sua pergunta, sugestão, comentário ou o bug que encontrou. Quanto mais específico, melhor."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Anexos (opcional)</label>
            <AnexosInput anexos={anexos} setAnexos={setAnexos} />
          </div>
          <div className="flex items-start gap-2 text-[12px] bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 leading-relaxed">
            <Users2 size={15} className="shrink-0 mt-0.5" />
            <span>Será publicado na Comunidade, visível para todos os alunos, <strong>com o seu nome</strong>. Não inclua informações confidenciais.</span>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-300 cursor-pointer">Cancelar</button>
          <button onClick={enviar} disabled={enviando || !podeEnviar}
            className={cn('px-4 py-2 rounded-xl text-sm font-bold border-none cursor-pointer flex items-center gap-2',
              enviando || !podeEnviar ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')}>
            <Send size={14} /> Publicar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ===== Sino de notificações de @menção =====
function NotificationsBell() {
  const [notifs, setNotifs] = useState<CommunityNotification[]>([]);
  const [aberto, setAberto] = useState(false);
  const naoLidas = notifs.filter(n => !n.lida).length;

  useEffect(() => {
    const unsub = ouvirNotificacoes(setNotifs);
    return () => unsub();
  }, []);

  const abrir = () => {
    setAberto(a => !a);
    // Ao abrir, marca as não lidas como lidas.
    const pendentes = notifs.filter(n => !n.lida);
    if (pendentes.length > 0) marcarNotificacoesLidas(pendentes);
  };

  return (
    <div className="relative">
      <button
        onClick={abrir}
        className="relative w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center cursor-pointer transition"
        title="Notificações de menção"
      >
        <Bell size={18} className="text-gray-600" />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 text-[11px] font-black uppercase tracking-widest text-gray-500">
            Menções
          </div>
          {notifs.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">Nenhuma menção ainda.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifs.slice(0, 20).map(n => (
                <div key={n.id} className="px-4 py-2.5 border-b border-gray-50 last:border-0">
                  <p className="text-[12px] text-gray-700 m-0">
                    <strong>{n.fromNome}</strong> mencionou você
                  </p>
                  <p className="text-[11px] text-gray-400 m-0 mt-0.5 line-clamp-2">{n.trecho}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Página =====
export default function Comunidade({ escopo = 'consultor' }: { escopo?: EscopoComunidade }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('timeline');
  const [tipoFiltro, setTipoFiltro] = useState<PostTipo | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);
  const [repliesPorPost, setRepliesPorPost] = useState<Record<string, CommunityReply[]>>({});

  const meUid = auth.currentUser?.uid || '';
  const ADMIN_EMAILS = ['israelnz2018@hotmail.com', 'israel@learningbyworking.com'];
  const meIsAdmin = ADMIN_EMAILS.includes((auth.currentUser?.email || '').toLowerCase());

  // Escopo do time: admin/consultor escolhem a empresa; coordenador/aluno usam a própria.
  const { isAdmin, isConsultor, empresaId } = useUserAccess();
  const { consultor } = useConsultor();
  const cid = resolveConsultorId();
  const podeEscolherEmpresa = escopo === 'time' && (isAdmin || isConsultor);
  const [empresas, setEmpresas] = useState<{ empresaId: string; nome: string }[]>([]);
  const [empresaSel, setEmpresaSel] = useState<string>('');

  useEffect(() => {
    if (!podeEscolherEmpresa) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('consultorId', '==', cid)));
        const coordenadores = snap.docs
          .map(d => d.data() as any)
          .filter(u => u.tipoUsuario === 'coordenador' && u.empresaId)
          .map(u => ({ empresaId: u.empresaId as string, nome: (u.empresaNome || u.nome || u.empresaId) as string }));
        // "Alunos diretos" é mais um time isolado no seletor — nunca mistura com o de
        // nenhum coordenador (cada empresaId tem seu próprio feed, sem cruzamento).
        const list = [{ empresaId: empresaIdDireto(cid), nome: 'Alunos diretos (sem coordenador)' }, ...coordenadores];
        setEmpresas(list);
        if (list.length && !empresaSel) setEmpresaSel(list[0].empresaId);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line
  }, [podeEscolherEmpresa, cid]);

  const empresaAtiva = escopo === 'time' ? (podeEscolherEmpresa ? empresaSel : (empresaId || '')) : null;
  const espaco: EspacoComunidade = { escopo, empresaId: empresaAtiva };

  useEffect(() => {
    if (escopo === 'time' && !empresaAtiva) { setPosts([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ouvirPosts(espaco, p => { setPosts(p); setLoading(false); });
    return () => unsub();
    // eslint-disable-next-line
  }, [escopo, empresaAtiva]);

  const mencionaveis = useMemo(() => extrairMencionaveis(posts, repliesPorPost), [posts, repliesPorPost]);

  const onRepliesLoaded = (postId: string, reps: CommunityReply[]) =>
    setRepliesPorPost(prev => ({ ...prev, [postId]: reps }));

  // Aplica filtro por tipo + busca textual (texto, autor, ferramenta)
  const postsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return posts.filter(p => {
      if (tipoFiltro !== 'todos' && p.tipo !== tipoFiltro) return false;
      if (!termo) return true;
      const alvo = [
        p.texto,
        p.autor?.nome,
        p.autor?.email,
        p.ferramenta,
      ].filter(Boolean).join(' ').toLowerCase();
      return alvo.includes(termo);
    });
  }, [posts, tipoFiltro, busca]);

  // Posts fixados aparecem no topo, em qualquer modo. Os demais seguem o agrupamento.
  const pinned = useMemo(() => postsFiltrados.filter(p => p.pinned), [postsFiltrados]);
  const naoPinned = useMemo(() => postsFiltrados.filter(p => !p.pinned), [postsFiltrados]);

  // Agrupamento conforme o modo de visualização (sobre os NÃO fixados)
  const grupos = useMemo(() => {
    if (view === 'ferramenta') {
      const map: Record<string, CommunityPost[]> = {};
      naoPinned.forEach(p => {
        const k = p.ferramenta || 'Sem ferramenta / vídeo (geral)';
        (map[k] ||= []).push(p);
      });
      return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
    }
    if (view === 'tipo') {
      const ordem: PostTipo[] = ['duvida', 'sugestao', 'comentario', 'bug'];
      return ordem
        .map(t => [TIPO_CFG[t].label, naoPinned.filter(p => p.tipo === t)] as [string, CommunityPost[]])
        .filter(([, arr]) => arr.length > 0);
    }
    if (view === 'curtidos') {
      const ordenado = [...naoPinned].sort(
        (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)
      );
      return [['', ordenado]] as [string, CommunityPost[]][];
    }
    // timeline: um único grupo, MAIS NOVO no topo (padrão de fórum: Facebook Grupos,
    // Reddit "New", GitHub Discussions). Assim uma pergunta nova aparece em cima, onde
    // se vê — não "some" no fim. Os fixados (pinned) ficam acima, renderizados à parte.
    const cronologico = [...naoPinned].sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta; // decrescente (mais novo primeiro)
    });
    return [['', cronologico]] as [string, CommunityPost[]][];
  }, [view, naoPinned]);

  const VIEWS: { v: ViewMode; label: string; icon: any }[] = [
    { v: 'timeline', label: 'Recentes', icon: Clock },
    { v: 'curtidos', label: 'Mais curtidos', icon: Flame },
    { v: 'ferramenta', label: 'Por ferramenta / vídeo', icon: Wrench },
    { v: 'tipo', label: 'Por tipo', icon: ListFilter },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0033CC] to-[#1E2D6E] text-white flex items-center justify-center shrink-0">
            <Users2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 m-0 flex items-center gap-2">
              Comunidade LBW
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">Versão beta</span>
            </h1>
            <p className="text-xs text-gray-500 m-0 mt-0.5">Pergunte, ajude, sugira. Todos veem e podem responder.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NotificationsBell />
          <button
            onClick={() => setNovoAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest cursor-pointer border-none transition"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nova publicação</span>
          </button>
        </div>
      </div>

      <UpgradeBanner variant="compact" className="mb-5" mensagem="Plano introdutório: participe da comunidade e libere todas as ferramentas." />

      {/* Boas-vindas do consultor — só na Comunidade dos Meus Clientes (escopo 'time'),
          texto configurado em "Comece por Aqui". Texto simples, sem caixa/banner —
          como se fosse a primeira mensagem escrita ali mesmo. */}
      {escopo === 'time' && consultor.comunidadeBoasVindas && (
        <p className="mb-5 whitespace-pre-line text-sm text-gray-700">
          {consultor.comunidadeBoasVindas}
        </p>
      )}

      {/* Seletor de empresa — só admin/consultor no escopo do coordenador (cada empresa é isolada) */}
      {podeEscolherEmpresa && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-xs font-black uppercase tracking-wide text-amber-700">Empresa:</span>
          <select value={empresaSel} onChange={e => setEmpresaSel(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white">
            {empresas.length === 0 && <option value="">nenhuma empresa ainda</option>}
            {empresas.map(e => <option key={e.empresaId} value={e.empresaId}>{e.nome}</option>)}
          </select>
          <span className="text-xs text-amber-600">Cada empresa é uma bolha isolada.</span>
        </div>
      )}

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por texto, pessoa, ferramenta ou vídeo…"
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 bg-transparent border-none cursor-pointer"
            title="Limpar busca"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Barra de visualização + filtro por tipo */}
      <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {VIEWS.map(v => {
            const Icon = v.icon; const sel = view === v.v;
            return (
              <button key={v.v} onClick={() => setView(v.v)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider cursor-pointer border-none transition',
                  sel ? 'bg-white text-[#1E2D6E] shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700')}>
                <Icon size={13} /> {v.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          {(['todos', 'duvida', 'sugestao', 'comentario', 'bug'] as const).map(t => {
            const sel = tipoFiltro === t;
            const label = t === 'todos' ? 'Todos' : TIPO_CFG[t].label;
            return (
              <button key={t} onClick={() => setTipoFiltro(t)}
                className={cn('px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition',
                  sel ? 'bg-[#1E2D6E] text-white border-[#1E2D6E]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Carregando…</div>
      ) : postsFiltrados.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <Users2 size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">Nenhuma publicação ainda. Seja o primeiro a perguntar!</p>
          <button onClick={() => setNovoAberto(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest cursor-pointer border-none">
            <Plus size={14} /> Nova publicação
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fixados — sempre no topo */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              {pinned.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  meUid={meUid}
                  meIsAdmin={meIsAdmin}
                  mencionaveis={mencionaveis}
                  onRepliesLoaded={onRepliesLoaded}
                />
              ))}
            </div>
          )}
          {grupos.map(([titulo, lista]) => (
            <div key={titulo || 'all'} className="space-y-3">
              {titulo && (
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  {titulo} <span className="text-gray-300">({lista.length})</span>
                </h2>
              )}
              {lista.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  meUid={meUid}
                  meIsAdmin={meIsAdmin}
                  mencionaveis={mencionaveis}
                  onRepliesLoaded={onRepliesLoaded}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {novoAberto && <NovoPostModal onClose={() => setNovoAberto(false)} espaco={espaco} />}
      </AnimatePresence>
    </div>
  );
}
