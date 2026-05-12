import { db } from '../lib/firebase';
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
    console.error('[mentorConversations] Erro ao salvar:', error);
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
    console.error('[mentorConversations] Erro ao buscar por projeto:', error);
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
    console.error('[mentorConversations] Erro ao buscar por usuário:', error);
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
    console.error('[mentorConversations] Erro ao buscar todas:', error);
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
    console.error('[mentorConversations] Erro ao limpar projeto:', error);
    return false;
  }
}
