import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { resolveConsultorId } from './consultorService';

export interface SupportMaterial {
  id: string;
  consultorId: string;
  titulo: string;
  descricao: string;
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
    .map(item => ({ id: item.id, ...item.data() } as SupportMaterial))
    .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
}

export async function uploadSupportMaterial(input: {
  titulo: string;
  descricao: string;
  file: File;
  consultorId?: string;
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

export async function deleteSupportMaterial(material: SupportMaterial): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, material.id));
  if (material.storagePath) await deleteObject(ref(storage, material.storagePath)).catch(() => {});
}
