/**
 * communityService — fórum da Comunidade LBW.
 *
 * Modelo Firestore:
 *   community/{postId}                      → o post (thread inicial)
 *   community/{postId}/replies/{replyId}    → respostas daquele post
 *   users/{uid}.communityNotifications[]    → notificações de @menção (array no doc do usuário)
 *
 * Um post pode vir de 3 origens, todas com o mesmo modelo: pergunta, sugestão
 * ou bug (o popup "Reportar / Sugerir / Perguntar" cria um post aqui).
 *
 * Tudo em tempo real via onSnapshot. Sem IA.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export type PostTipo = 'duvida' | 'sugestao' | 'bug';

export interface Autor {
  uid: string;
  nome: string;        // nome amigável; cai pro email se não tiver
  email: string;
  photoURL?: string | null;
  isAdmin?: boolean;
}

export interface CommunityPost {
  id?: string;
  tipo: PostTipo;
  titulo?: string | null;       // título curto opcional
  texto: string;
  autor: Autor;
  ferramenta?: string | null;   // nome amigável da ferramenta (se houver)
  projetoNome?: string | null;
  resolvido: boolean;           // só o autor do post marca
  replyCount: number;
  likes?: string[];             // uids de quem curtiu
  pinned?: boolean;             // fixado no topo (só admin)
  createdAt: any;
}

export interface CommunityReply {
  id?: string;
  texto: string;
  autor: Autor;
  mencoes?: string[];           // uids mencionados
  createdAt: any;
}

export interface CommunityNotification {
  id?: string;
  toUid: string;                // destinatário
  postId: string;
  fromNome: string;
  trecho: string;               // pedaço do texto que mencionou
  lida: boolean;
  createdAt: any;
}

const COL = 'community';
const NOTIF_COL = 'community_notifications';
const ADMIN_EMAILS = ['israelnz2018@hotmail.com', 'israel@learningbyworking.com'];

/** Monta o objeto Autor a partir do usuário logado. */
export async function autorAtual(): Promise<Autor> {
  const u = auth.currentUser;
  if (!u) throw new Error('Usuário não autenticado.');
  // Tenta pegar o nome do doc users/{uid}; cai pro displayName/email.
  let nome = u.displayName || '';
  try {
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (snap.exists()) {
      const d = snap.data() as any;
      if (d.nome) nome = d.nome;
    }
  } catch { /* silencioso */ }
  if (!nome) nome = u.email?.split('@')[0] || 'Aluno';
  const email = u.email || '';
  return {
    uid: u.uid,
    nome,
    email,
    photoURL: u.photoURL || null,
    isAdmin: ADMIN_EMAILS.includes(email.toLowerCase()),
  };
}

// ===== Posts =====

export async function criarPost(input: {
  tipo: PostTipo;
  titulo?: string | null;
  texto: string;
  ferramenta?: string | null;
  projetoNome?: string | null;
}): Promise<string> {
  const autor = await autorAtual();
  const ref = await addDoc(collection(db, COL), {
    tipo: input.tipo,
    titulo: input.titulo?.trim() || null,
    texto: input.texto.trim(),
    autor,
    ferramenta: input.ferramenta || null,
    projetoNome: input.projetoNome || null,
    resolvido: false,
    replyCount: 0,
    likes: [],
    pinned: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Fixar / desafixar um post no topo (apenas admin — a UI controla o acesso). */
export async function fixarPost(postId: string, pinned: boolean): Promise<void> {
  await updateDoc(doc(db, COL, postId), { pinned });
}

/** Curtir / descurtir um post (toggle do uid no array likes). */
export async function curtirPost(postId: string, jaCurtiu: boolean): Promise<void> {
  const u = auth.currentUser;
  if (!u) return;
  await updateDoc(doc(db, COL, postId), {
    likes: jaCurtiu ? arrayRemove(u.uid) : arrayUnion(u.uid),
  });
}

/** Tempo real: todos os posts, mais novos primeiro. */
export function ouvirPosts(onChange: (posts: CommunityPost[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
  }, err => console.error('[ouvirPosts]', err));
}

export async function marcarResolvido(postId: string, resolvido: boolean): Promise<void> {
  await updateDoc(doc(db, COL, postId), { resolvido });
}

export async function deletarPost(postId: string): Promise<void> {
  // Remove replies primeiro (Firestore não apaga subcoleção sozinho).
  const repliesSnap = await getDocs(collection(db, COL, postId, 'replies'));
  await Promise.all(repliesSnap.docs.map(r => deleteDoc(r.ref)));
  await deleteDoc(doc(db, COL, postId));
}

// ===== Replies =====

export function ouvirReplies(postId: string, onChange: (replies: CommunityReply[]) => void): () => void {
  const q = query(collection(db, COL, postId, 'replies'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
  }, err => console.error('[ouvirReplies]', err));
}

export async function criarReply(postId: string, texto: string, mencoes: Autor[] = []): Promise<void> {
  const autor = await autorAtual();
  await addDoc(collection(db, COL, postId, 'replies'), {
    texto: texto.trim(),
    autor,
    mencoes: mencoes.map(m => m.uid),
    createdAt: serverTimestamp(),
  });
  // Incrementa o contador no post (leitura + escrita simples; volume baixo).
  try {
    const postRef = doc(db, COL, postId);
    const postSnap = await getDoc(postRef);
    const atual = (postSnap.data() as any)?.replyCount || 0;
    await updateDoc(postRef, { replyCount: atual + 1 });
  } catch { /* não crítico */ }

  // Notifica os mencionados (menos o próprio autor).
  await Promise.all(
    mencoes
      .filter(m => m.uid !== autor.uid)
      .map(m => notificarMencao(m.uid, postId, autor.nome, texto))
  );
}

export async function deletarReply(postId: string, replyId: string): Promise<void> {
  await deleteDoc(doc(db, COL, postId, 'replies', replyId));
  try {
    const postRef = doc(db, COL, postId);
    const postSnap = await getDoc(postRef);
    const atual = (postSnap.data() as any)?.replyCount || 0;
    await updateDoc(postRef, { replyCount: Math.max(0, atual - 1) });
  } catch { /* não crítico */ }
}

// ===== Menções / Notificações =====
// Coleção própria community_notifications/{id} com toUid = destinatário.
// Evita escrever no doc de OUTRO usuário (que as regras bloqueiam).

async function notificarMencao(uid: string, postId: string, fromNome: string, texto: string): Promise<void> {
  try {
    await addDoc(collection(db, NOTIF_COL), {
      toUid: uid,
      postId,
      fromNome,
      trecho: texto.slice(0, 120),
      lida: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[notificarMencao]', e);
  }
}

/** Tempo real: notificações do usuário logado (mais novas primeiro). */
export function ouvirNotificacoes(onChange: (notifs: CommunityNotification[]) => void): () => void {
  const u = auth.currentUser;
  if (!u) { onChange([]); return () => {}; }
  const q = query(collection(db, NOTIF_COL), where('toUid', '==', u.uid));
  return onSnapshot(q, snap => {
    const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as CommunityNotification[];
    arr.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    onChange(arr);
  }, err => console.error('[ouvirNotificacoes]', err));
}

export async function marcarNotificacoesLidas(notifs: CommunityNotification[]): Promise<void> {
  await Promise.all(
    notifs.filter(n => n.id && !n.lida).map(n =>
      updateDoc(doc(db, NOTIF_COL, n.id!), { lida: true }).catch(() => {})
    )
  );
}

/**
 * Lista de pessoas mencionáveis (@): autores de posts/replies que já participaram.
 * Evita expor toda a base de usuários — só quem já apareceu na comunidade.
 */
export function extrairMencionaveis(posts: CommunityPost[], repliesPorPost: Record<string, CommunityReply[]>): Autor[] {
  const mapa = new Map<string, Autor>();
  posts.forEach(p => { if (p.autor) mapa.set(p.autor.uid, p.autor); });
  Object.values(repliesPorPost).forEach(reps => reps.forEach(r => { if (r.autor) mapa.set(r.autor.uid, r.autor); }));
  return Array.from(mapa.values());
}
