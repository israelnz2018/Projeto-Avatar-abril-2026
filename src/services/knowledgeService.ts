import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, writeBatch, where } from 'firebase/firestore';

export interface KnowledgeEntry {
  id?: string;
  title: string;
  content: string;
  sourceUrl: string;
  course: string;
  playlist: string;
  timestamp: Date;
  summary?: { time: string; topic: string }[];
  transcript?: string;
  rawTranscript?: string;
  associatedTools?: string[];
  order?: number;
  playlistOrder?: number;
}

export const KNOWLEDGE_COLLECTION = 'knowledge_base';

export async function saveKnowledge(entry: Omit<KnowledgeEntry, 'timestamp' | 'id'>, providedOrder?: number) {
  try {
    let order = providedOrder;
    if (order === undefined) {
      // Find the last order in the same course and playlist
      const q = query(
        collection(db, KNOWLEDGE_COLLECTION), 
        where('course', '==', entry.course),
        where('playlist', '==', entry.playlist)
      );
      const snapshot = await getDocs(q);
      
      let lastOrder = 0;
      snapshot.docs.forEach(doc => {
        const docOrder = doc.data().order || 0;
        if (docOrder > lastOrder) lastOrder = docOrder;
      });
      order = lastOrder + 1;
    }

    const docRef = await addDoc(collection(db, KNOWLEDGE_COLLECTION), {
      ...entry,
      timestamp: new Date(),
      order: order
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving knowledge:", error);
    throw error;
  }
}

export async function getRecentKnowledge(limitCount = 100): Promise<KnowledgeEntry[]> {
  try {
    const q = query(
      collection(db, KNOWLEDGE_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as KnowledgeEntry;
    });

    // Sort in memory: playlistOrder first, then order, then timestamp
    return items.sort((a, b) => {
      // Playlist order first
      if (a.playlistOrder !== undefined && b.playlistOrder !== undefined) {
        if (a.playlistOrder !== b.playlistOrder) return a.playlistOrder - b.playlistOrder;
      } else if (a.playlistOrder !== undefined) return -1;
      else if (b.playlistOrder !== undefined) return 1;

      // Then item order
      if (a.order !== undefined && b.order !== undefined) {
        if (a.order !== b.order) return a.order - b.order;
      } else if (a.order !== undefined) return -1;
      else if (b.order !== undefined) return 1;

      // Finally timestamp
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  } catch (error) {
    console.error("Error getting knowledge:", error);
    return [];
  }
}

export async function getAllKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    const q = query(
      collection(db, KNOWLEDGE_COLLECTION),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as KnowledgeEntry;
    });

    // Sort in memory: playlistOrder first, then order, then timestamp
    return items.sort((a, b) => {
      // Playlist order first
      if (a.playlistOrder !== undefined && b.playlistOrder !== undefined) {
        if (a.playlistOrder !== b.playlistOrder) return a.playlistOrder - b.playlistOrder;
      } else if (a.playlistOrder !== undefined) return -1;
      else if (b.playlistOrder !== undefined) return 1;

      // Then item order
      if (a.order !== undefined && b.order !== undefined) {
        if (a.order !== b.order) return a.order - b.order;
      } else if (a.order !== undefined) return -1;
      else if (b.order !== undefined) return 1;

      // Finally timestamp
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  } catch (error) {
    console.error("Error getting all knowledge:", error);
    return [];
  }
}

export async function deleteKnowledge(id: string) {
  await deleteDoc(doc(db, KNOWLEDGE_COLLECTION, id));
}

export async function updateKnowledge(id: string, data: Partial<KnowledgeEntry>) {
  await updateDoc(doc(db, KNOWLEDGE_COLLECTION, id), data);
}

export async function deleteCourse(courseName: string) {
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', courseName));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function updateCourseName(oldName: string, newName: string) {
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', oldName));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.update(d.ref, { course: newName }));
  await batch.commit();
}

export async function deletePlaylist(courseName: string, playlistName: string) {
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', courseName), where('playlist', '==', playlistName));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function updatePlaylistName(courseName: string, oldName: string, newName: string) {
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', courseName), where('playlist', '==', oldName));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.update(d.ref, { playlist: newName }));
  await batch.commit();
}
