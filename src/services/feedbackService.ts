import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const FEEDBACK_COLLECTION = 'feedback';

export type FeedbackTipo = 'bug' | 'sugestao' | 'duvida';
export type FeedbackStatus = 'novo' | 'lido' | 'tratado' | 'ignorado';

export interface Feedback {
  id?: string;
  tipo: FeedbackTipo;
  descricao: string;
  userId: string;
  userEmail: string;
  userName?: string;
  projetoAtivoId?: string;
  projetoAtivoNome?: string;
  contexto?: string; // ex: nome da ferramenta ativa no momento do envio
  status: FeedbackStatus;
  resposta?: string; // resposta do admin (opcional)
  respondidoEm?: any;
  createdAt: any;
}

export async function saveFeedback(input: {
  tipo: FeedbackTipo;
  descricao: string;
  projetoAtivoId?: string;
  projetoAtivoNome?: string;
  contexto?: string;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  const ref = await addDoc(collection(db, FEEDBACK_COLLECTION), {
    tipo: input.tipo,
    descricao: input.descricao.trim(),
    userId: user.uid,
    userEmail: user.email || '',
    userName: user.displayName || (user.email?.split('@')[0]) || '',
    projetoAtivoId: input.projetoAtivoId || null,
    projetoAtivoNome: input.projetoAtivoNome || null,
    contexto: input.contexto || null,
    status: 'novo' as FeedbackStatus,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

// Admin: listar todos (ou filtrar por tipo)
export async function listarFeedbacks(tipo?: FeedbackTipo): Promise<Feedback[]> {
  const col = collection(db, FEEDBACK_COLLECTION);
  const q = tipo
    ? query(col, where('tipo', '==', tipo), orderBy('createdAt', 'desc'))
    : query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function atualizarStatusFeedback(id: string, status: FeedbackStatus): Promise<void> {
  await updateDoc(doc(db, FEEDBACK_COLLECTION, id), { status });
}

export async function responderFeedback(id: string, resposta: string): Promise<void> {
  await updateDoc(doc(db, FEEDBACK_COLLECTION, id), {
    resposta: resposta.trim(),
    status: 'tratado' as FeedbackStatus,
    respondidoEm: serverTimestamp(),
  });
}

export async function deletarFeedback(id: string): Promise<void> {
  await deleteDoc(doc(db, FEEDBACK_COLLECTION, id));
}
