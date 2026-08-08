import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { resolveConsultorId } from './consultorService';

export type CategoriaMaterial = 'Material' | 'Checklist' | 'Mapa' | 'PPT' | 'Planilha';

export interface SupportMaterial {
  id: string;
  consultorId: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaMaterial;
  /** Cursos (nomes das trilhas) liberados pra ver este material. Vazio = todos os cursos. */
  cursos: string[];
  arquivoNome: string;
  arquivoUrl: string;
  storagePath: string;
  contentType: string;
  criadoEm?: unknown;
}

const COLLECTION = 'support_materials';

export async function listSupportMaterials(consultorId = resolveConsultorId()): Promise<SupportMaterial[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), where('consultorId', '==', consultorId)));
  return snap.docs
    .map(item => ({ categoria: 'Material', cursos: [], ...item.data(), id: item.id } as SupportMaterial))
    .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
}

export async function uploadSupportMaterial(input: {
  titulo: string;
  descricao: string;
  file: File;
  consultorId?: string;
  categoria?: CategoriaMaterial;
  cursos?: string[];
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Entre novamente.');
  const consultorId = input.consultorId || resolveConsultorId();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const storagePath = `support_materials/${consultorId}/${user.uid}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, input.file, { contentType: input.file.type || 'application/octet-stream' });
  const arquivoUrl = await getDownloadURL(fileRef);
  try {
    await addDoc(collection(db, COLLECTION), {
      consultorId,
      titulo: input.titulo.trim(),
      descricao: input.descricao.trim(),
      categoria: input.categoria || 'Material',
      cursos: input.cursos || [],
      arquivoNome: input.file.name,
      arquivoUrl,
      storagePath,
      contentType: input.file.type || 'application/octet-stream',
      criadoPor: user.uid,
      criadoEm: serverTimestamp(),
    });
  } catch (error) {
    await deleteObject(fileRef).catch(() => {});
    throw error;
  }
}

/** Edita título/descrição/categoria/cursos — e, opcionalmente, troca o arquivo (apaga o antigo do Storage). */
export async function updateSupportMaterial(
  material: SupportMaterial,
  patch: { titulo: string; descricao: string; categoria: CategoriaMaterial; cursos: string[] },
  newFile?: File,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Entre novamente.');
  const updates: Record<string, unknown> = {
    titulo: patch.titulo.trim(),
    descricao: patch.descricao.trim(),
    categoria: patch.categoria,
    cursos: patch.cursos,
  };
  if (newFile) {
    const consultorId = material.consultorId || resolveConsultorId();
    const safeName = newFile.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const storagePath = `support_materials/${consultorId}/${user.uid}/${Date.now()}-${safeName}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, newFile, { contentType: newFile.type || 'application/octet-stream' });
    updates.arquivoUrl = await getDownloadURL(fileRef);
    updates.arquivoNome = newFile.name;
    updates.storagePath = storagePath;
    updates.contentType = newFile.type || 'application/octet-stream';
    if (material.storagePath) await deleteObject(ref(storage, material.storagePath)).catch(() => {});
  }
  await updateDoc(doc(db, COLLECTION, material.id), updates);
}

export async function deleteSupportMaterial(material: SupportMaterial): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, material.id));
  if (material.storagePath) await deleteObject(ref(storage, material.storagePath)).catch(() => {});
}
