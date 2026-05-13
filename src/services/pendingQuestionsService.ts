import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export const PENDING_QUESTIONS_COLLECTION = 'pending_questions';

export interface PendingQuestion {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  projectId?: string;
  projectName?: string;
  question: string;
  aiAnswer: string;          // resposta que a IA deu (Nível 3)
  contextType: 'tool' | 'analysis' | 'aiAssistant' | 'free';
  contextId?: string;
  contextLabel?: string;     // ex: "Project Charter" — pra você ver de onde veio
  timestamp: Date;
  status: 'pending' | 'answered' | 'ignored';
  israelAnswer?: string;
  answeredAt?: Date;
}

export async function savePendingQuestion(
  data: Omit<PendingQuestion, 'id' | 'timestamp' | 'status'>
): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, PENDING_QUESTIONS_COLLECTION), {
      ...data,
      timestamp: new Date(),
      status: 'pending' as const
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PENDING_QUESTIONS_COLLECTION);
    return null;
  }
}

export async function getPendingQuestions(): Promise<PendingQuestion[]> {
  try {
    const q = query(
      collection(db, PENDING_QUESTIONS_COLLECTION),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(),
        answeredAt: data.answeredAt?.toDate?.() || undefined
      } as PendingQuestion;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PENDING_QUESTIONS_COLLECTION);
    return [];
  }
}

export async function getPendingQuestionsByStatus(
  status: 'pending' | 'answered' | 'ignored'
): Promise<PendingQuestion[]> {
  try {
    const q = query(
      collection(db, PENDING_QUESTIONS_COLLECTION),
      where('status', '==', status),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(),
        answeredAt: data.answeredAt?.toDate?.() || undefined
      } as PendingQuestion;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PENDING_QUESTIONS_COLLECTION);
    return [];
  }
}

export async function answerPendingQuestion(
  questionId: string,
  israelAnswer: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, PENDING_QUESTIONS_COLLECTION, questionId), {
      israelAnswer,
      status: 'answered',
      answeredAt: new Date()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PENDING_QUESTIONS_COLLECTION);
    return false;
  }
}

export async function ignorePendingQuestion(questionId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, PENDING_QUESTIONS_COLLECTION, questionId), {
      status: 'ignored'
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PENDING_QUESTIONS_COLLECTION);
    return false;
  }
}

export async function deletePendingQuestion(questionId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, PENDING_QUESTIONS_COLLECTION, questionId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, PENDING_QUESTIONS_COLLECTION);
    return false;
  }
}
