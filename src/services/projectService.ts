import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy,
  getDoc,
  setDoc,
  deleteDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

const ADMIN_EMAIL = 'israelnz2018@hotmail.com';

export interface Project {
  id: string;
  name: string;
  ownerUid: string;
  currentPhase: string;
  initiativeId?: string;
  createdAt: any;
  completedTools?: string[];
  ownerEmail?: string;
}

export const createProject = async (name: string, initiativeId?: string, currentPhase: string = 'Define') => {
  const user = auth.currentUser;
  if (!user) {
    console.error("Tentativa de criar projeto sem usuário autenticado");
    throw new Error("User not authenticated");
  }

  const projectData = {
    name,
    ownerUid: user.uid,
    ownerEmail: user.email,
    currentPhase: currentPhase,
    initiativeId: initiativeId || null,
    createdAt: serverTimestamp(),
    completedTools: [],
  };

  const path = 'projects';
  try {
    console.log("Salvando no Firestore:", projectData);
    const docRef = await addDoc(collection(db, path), projectData);
    console.log("Documento salvo com ID:", docRef.id);
    return { id: docRef.id, ...projectData };
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getUserProjects = async () => {
  const user = auth.currentUser;
  console.log("🔍 [getUserProjects] Buscando projetos para UID:", user?.uid);
  if (!user) return [];

  const path = 'projects';

  try {
    const q = query(
      collection(db, path), 
      where('ownerUid', '==', user.uid)
    );

    console.log("📡 [getUserProjects] Iniciando consulta ao Firestore...");
    
    // Adiciona um timeout para a busca
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout ao carregar projetos (15s). Verifique sua conexão ou se o Firestore está ativo.")), 15000)
    );

    const querySnapshot = await Promise.race([
      getDocs(q),
      timeoutPromise
    ]) as any;

    console.log("✅ [getUserProjects] Consulta finalizada. Documentos encontrados:", querySnapshot.size);
    
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
    
    // Sort manually by createdAt if available
    return projects.sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("❌ [getUserProjects] Erro fatal:", error);
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const updateProjectPhase = async (projectId: string, phase: string) => {
  const path = `projects/${projectId}`;
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, { currentPhase: phase });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const saveProjectToolData = async (projectId: string, toolType: string, content: any) => {
  const path = `projects/${projectId}/data/${toolType}`;
  try {
    const dataRef = doc(db, 'projects', projectId, 'data', toolType);
    await setDoc(dataRef, {
      toolType,
      content,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getProjectToolData = async (projectId: string, toolType: string) => {
  const path = `projects/${projectId}/data/${toolType}`;
  try {
    const dataRef = doc(db, 'projects', projectId, 'data', toolType);
    const docSnap = await getDoc(dataRef);
    if (docSnap.exists()) {
      return docSnap.data().content;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const getAllProjectToolData = async (projectId: string) => {
  const path = `projects/${projectId}/data`;
  try {
    const querySnapshot = await getDocs(collection(db, 'projects', projectId, 'data'));
    const data: Record<string, any> = {};
    querySnapshot.forEach((doc) => {
      data[doc.id] = doc.data().content;
    });
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return {};
  }
};

export const deleteProjectToolData = async (projectId: string, toolType: string) => {
  const path = `projects/${projectId}/data/${toolType}`;
  try {
    const dataRef = doc(db, 'projects', projectId, 'data', toolType);
    await deleteDoc(dataRef);
    
    // Also remove from completedTools if it exists
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      const completedTools = projectSnap.data().completedTools || [];
      if (completedTools.includes(toolType)) {
        await updateDoc(projectRef, {
          completedTools: completedTools.filter((id: string) => id !== toolType)
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteProject = async (projectId: string) => {
  const path = `projects/${projectId}`;
  try {
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const markToolAsCompleted = async (projectId: string, toolId: string) => {
  const path = `projects/${projectId}`;
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      completedTools: arrayUnion(toolId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};
