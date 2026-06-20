import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';

export const MENTOR_CONVERSATIONS_COLLECTION = 'mentor_conversations';

export interface MentorConversation {
  id?: string;
  projectId: string;
  userId: string;
  userName?: string;
  toolId?: string;
  toolLabel?: string;
  question: string;
  answer: string;
  level: 1 | 2 | 3;
  confidence: number;
  videoSourceIds: string[];
  videoSourceTitles: string[];
  timestamp: Date;
}

export async function saveMentorConversation(
  data: Omit<MentorConversation, 'id' | 'timestamp'>
): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, MENTOR_CONVERSATIONS_COLLECTION), {
      ...data,
      timestamp: new Date()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, MENTOR_CONVERSATIONS_COLLECTION);
    return null;
  }
}

export async function getConversationsByProject(projectId: string): Promise<MentorConversation[]> {
  try {
    const q = query(
      collection(db, MENTOR_CONVERSATIONS_COLLECTION),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date()
      } as MentorConversation;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MENTOR_CONVERSATIONS_COLLECTION);
    return [];
  }
}

export async function getConversationsByUser(userId: string): Promise<MentorConversation[]> {
  try {
    const q = query(
      collection(db, MENTOR_CONVERSATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date()
      } as MentorConversation;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MENTOR_CONVERSATIONS_COLLECTION);
    return [];
  }
}

export async function getAllConversations(): Promise<MentorConversation[]> {
  try {
    const q = query(
      collection(db, MENTOR_CONVERSATIONS_COLLECTION),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date()
      } as MentorConversation;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MENTOR_CONVERSATIONS_COLLECTION);
    return [];
  }
}

/**
 * Limpa todas as conversas de um projeto (LGPD - direito do usuário).
 */
export async function clearProjectConversations(projectId: string): Promise<boolean> {
  try {
    const conversations = await getConversationsByProject(projectId);
    await Promise.all(
      conversations.map(c =>
        c.id ? deleteDoc(doc(db, MENTOR_CONVERSATIONS_COLLECTION, c.id)) : Promise.resolve()
      )
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, MENTOR_CONVERSATIONS_COLLECTION);
    return false;
  }
}

/**
 * Conversas do ALUNO (userId) em um projeto, opcionalmente de UMA ferramenta (toolId).
 * Usado pelo Israel IA da aba Projetos pra exibir só o que é do aluno + ferramenta ativa.
 */
export async function getUserConversations(
  userId: string,
  projectId: string,
  toolId?: string
): Promise<MentorConversation[]> {
  try {
    const filtros = [
      where('userId', '==', userId),
      where('projectId', '==', projectId),
      ...(toolId ? [where('toolId', '==', toolId)] : []),
    ];
    const q = query(collection(db, MENTOR_CONVERSATIONS_COLLECTION), ...filtros);
    const snap = await getDocs(q);
    const convs = snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data, timestamp: data.timestamp?.toDate?.() || new Date() } as MentorConversation;
    });
    // ordena por tempo no cliente (evita exigir índice composto no Firestore)
    return convs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MENTOR_CONVERSATIONS_COLLECTION);
    return [];
  }
}

/**
 * Apaga as conversas do ALUNO (userId) em um projeto e ferramenta específicos.
 * O aluno só apaga o que é dele e da ferramenta que está vendo — nunca de outros.
 */
export async function clearUserToolConversations(
  userId: string,
  projectId: string,
  toolId?: string
): Promise<boolean> {
  try {
    const conversations = await getUserConversations(userId, projectId, toolId);
    await Promise.all(
      conversations.map(c =>
        c.id ? deleteDoc(doc(db, MENTOR_CONVERSATIONS_COLLECTION, c.id)) : Promise.resolve()
      )
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, MENTOR_CONVERSATIONS_COLLECTION);
    return false;
  }
}
