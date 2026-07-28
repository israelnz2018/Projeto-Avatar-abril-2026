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
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { resolveConsultorId } from './consultorService';

export type PostTipo = 'duvida' | 'sugestao' | 'bug' | 'comentario';

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
  editado?: boolean;
  bloqueado?: boolean;          // moderação: admin oculta o texto (mostra "não permitido")
  anexos?: Anexo[];             // imagens e documentos (nunca vídeo)
  createdAt: any;
}

export interface Anexo {
  url: string;
  nome: string;
  tipo: 'imagem' | 'documento';
  mime?: string;
}

export interface CommunityReply {
  id?: string;
  texto: string;
  autor: Autor;
  mencoes?: string[];           // uids mencionados
  editado?: boolean;
  bloqueado?: boolean;          // moderação: admin oculta o texto (mostra "não permitido")
  anexos?: Anexo[];
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

// ===== Anexos (imagens + documentos; NUNCA vídeo) =====

const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB pra documentos

// Comprime/redimensiona uma imagem no navegador (canvas → JPEG ~0.8, máx 1600px).
function comprimirImagem(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const r = Math.min(MAX / width, MAX / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponível'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao comprimir')), 'image/jpeg', 0.8);
      };
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de um anexo pro Storage e devolve o Anexo (url, nome, tipo).
 * Aceita IMAGEM ou DOCUMENTO. Rejeita vídeo (pesado) e tipos não suportados.
 */
export async function uploadAnexo(file: File): Promise<Anexo> {
  const u = auth.currentUser;
  if (!u) throw new Error('Usuário não autenticado.');

  const mime = file.type || '';
  if (mime.startsWith('video/')) {
    throw new Error('Vídeos não são permitidos. Anexe imagens ou documentos.');
  }

  const ehImagem = mime.startsWith('image/');
  if (!ehImagem) {
    // Documento: valida tamanho
    if (file.size > MAX_DOC_BYTES) {
      throw new Error('Documento muito grande (máx. 10 MB).');
    }
  }

  // Stamp único sem Date.now()/Math.random direto no nome (mantém legível).
  const stamp = `${file.size}-${file.name.replace(/[^\w.\-]/g, '_')}`;
  const caminho = `community_uploads/${u.uid}/${stamp}`;
  const sref = storageRef(storage, caminho);

  if (ehImagem) {
    const blob = await comprimirImagem(file);
    await uploadBytes(sref, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(sref);
    return { url, nome: file.name, tipo: 'imagem', mime: 'image/jpeg' };
  } else {
    await uploadBytes(sref, file, { contentType: mime || 'application/octet-stream' });
    const url = await getDownloadURL(sref);
    return { url, nome: file.name, tipo: 'documento', mime };
  }
}

// ===== Posts =====

export async function criarPost(input: {
  tipo: PostTipo;
  titulo?: string | null;
  texto: string;
  ferramenta?: string | null;
  projetoNome?: string | null;
  anexos?: Anexo[];
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
    anexos: input.anexos || [],
    consultorId: resolveConsultorId(), // comunidade isolada por consultor
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Fixar / desafixar um post no topo (apenas admin — a UI controla o acesso). */
export async function fixarPost(postId: string, pinned: boolean): Promise<void> {
  await updateDoc(doc(db, COL, postId), { pinned });
}

/** Bloquear / desbloquear um post (moderação — só admin). Oculta o texto sem apagar. */
export async function bloquearPost(postId: string, bloqueado: boolean): Promise<void> {
  await updateDoc(doc(db, COL, postId), { bloqueado });
}

/** Bloquear / desbloquear uma resposta (moderação — só admin). Oculta sem apagar. */
export async function bloquearReply(postId: string, replyId: string, bloqueado: boolean): Promise<void> {
  await updateDoc(doc(db, COL, postId, 'replies', replyId), { bloqueado });
}

/** Editar tipo, título e texto de um post (autor ou admin — a UI controla). */
export async function editarPost(postId: string, tipo: PostTipo, titulo: string, texto: string): Promise<void> {
  await updateDoc(doc(db, COL, postId), {
    tipo,
    titulo: titulo.trim() || null,
    texto: texto.trim(),
    editado: true,
  });
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
  // Filtra pela comunidade do consultor atual (posts antigos sem consultorId = 'israel').
  const cid = resolveConsultorId();
  return onSnapshot(q, snap => {
    onChange(
      snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter((p: any) => (p.consultorId || 'israel') === cid)
    );
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

export async function criarReply(postId: string, texto: string, mencoes: Autor[] = [], anexos: Anexo[] = []): Promise<void> {
  const autor = await autorAtual();
  await addDoc(collection(db, COL, postId, 'replies'), {
    texto: texto.trim(),
    autor,
    mencoes: mencoes.map(m => m.uid),
    anexos,
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

/** Editar o texto de uma resposta (autor ou admin — a UI controla). */
export async function editarReply(postId: string, replyId: string, texto: string): Promise<void> {
  await updateDoc(doc(db, COL, postId, 'replies', replyId), { texto: texto.trim(), editado: true });
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
