import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const MENTOR_TOOL_CONTEXT_COLLECTION = 'mentor_tool_context';

export type ResponseMode = 'text' | 'audio' | 'none';

export interface MentorToolContext {
  toolId: string;
  question?: string;            // ex: "O que é a técnica dos 5 Porquês?"
  responseMode: ResponseMode;
  responseText?: string;        // se mode = text
  audioUrl?: string;            // se mode = audio (URL do Firebase Storage)
  audioPath?: string;           // path interno do Storage (pra deletar)
  updatedAt?: Date;
}

// ============================================================
// CRUD básico
// ============================================================

export async function getToolContext(toolId: string): Promise<MentorToolContext | null> {
  try {
    const snap = await getDoc(doc(db, MENTOR_TOOL_CONTEXT_COLLECTION, toolId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      toolId,
      question: data.question || '',
      responseMode: data.responseMode || 'none',
      responseText: data.responseText || '',
      audioUrl: data.audioUrl || '',
      audioPath: data.audioPath || '',
      updatedAt: data.updatedAt?.toDate?.() || undefined
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MENTOR_TOOL_CONTEXT_COLLECTION);
    return null;
  }
}

export async function getAllToolContexts(): Promise<Record<string, MentorToolContext>> {
  try {
    const snap = await getDocs(collection(db, MENTOR_TOOL_CONTEXT_COLLECTION));
    const result: Record<string, MentorToolContext> = {};
    snap.docs.forEach(d => {
      const data = d.data();
      result[d.id] = {
        toolId: d.id,
        question: data.question || '',
        responseMode: data.responseMode || 'none',
        responseText: data.responseText || '',
        audioUrl: data.audioUrl || '',
        audioPath: data.audioPath || '',
        updatedAt: data.updatedAt?.toDate?.() || undefined
      };
    });
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MENTOR_TOOL_CONTEXT_COLLECTION);
    return {};
  }
}

export async function saveToolContext(ctx: MentorToolContext): Promise<boolean> {
  try {
    await setDoc(doc(db, MENTOR_TOOL_CONTEXT_COLLECTION, ctx.toolId), {
      question: ctx.question || '',
      responseMode: ctx.responseMode,
      responseText: ctx.responseText || '',
      audioUrl: ctx.audioUrl || '',
      audioPath: ctx.audioPath || '',
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, MENTOR_TOOL_CONTEXT_COLLECTION);
    return false;
  }
}

export async function deleteToolContext(toolId: string): Promise<boolean> {
  try {
    // pega o contexto pra deletar áudio se existir
    const existing = await getToolContext(toolId);
    if (existing?.audioPath) {
      try {
        await deleteObject(ref(storage, existing.audioPath));
      } catch (e) {
        console.warn('[mentorContext] Áudio já removido ou não existia');
      }
    }
    await deleteDoc(doc(db, MENTOR_TOOL_CONTEXT_COLLECTION, toolId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, MENTOR_TOOL_CONTEXT_COLLECTION);
    return false;
  }
}

// ============================================================
// Upload de áudio
// ============================================================

/**
 * Faz upload de um Blob de áudio para o Firebase Storage.
 * Retorna { url, path } pra salvar no Firestore.
 */
export async function uploadToolAudio(
  toolId: string,
  audioBlob: Blob
): Promise<{ url: string; path: string } | null> {
  try {
    // Detecta extensão pelo MIME type
    const mime = audioBlob.type;
    let ext = 'webm';
    if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3';
    else if (mime.includes('wav')) ext = 'wav';
    else if (mime.includes('ogg')) ext = 'ogg';
    else if (mime.includes('m4a') || mime.includes('mp4')) ext = 'm4a';

    const timestamp = Date.now();
    const path = `mentor_audio/${toolId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, audioBlob, { contentType: mime });
    const url = await getDownloadURL(snapshot.ref);

    return { url, path };
  } catch (error) {
    console.error('[mentorContext] Erro ao fazer upload de áudio:', error);
    return null;
  }
}

/**
 * Deleta o áudio antigo (quando o admin substitui por um novo).
 */
export async function deleteToolAudio(audioPath: string): Promise<boolean> {
  try {
    await deleteObject(ref(storage, audioPath));
    return true;
  } catch (error) {
    console.error('[mentorContext] Erro ao deletar áudio:', error);
    return false;
  }
}
