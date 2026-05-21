import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

const USERS_COLLECTION = 'users';
const INVITES_COLLECTION = 'invites';

const ADMIN_EMAILS = ['israelnz2018@hotmail.com', 'israel@learningbyworking.com'];

export type TipoUsuario = 'aluno' | 'coordenador' | 'admin';
export type Plano = 'gratuito' | 'completo' | 'coordenador';

export interface UserData {
  uid: string;
  email: string;
  formacoes: string[];
  creditoIA: {
    limite: number;
    usado: number;
    resetEm: string;
  };
  tipoUsuario: TipoUsuario;
  criadoEm: string;
  /** Atualizado a cada login (ISO string). Usado pelo Dashboard do Coordenador
   *  pra detectar alunos inativos. Pode estar ausente em docs antigos. */
  lastLogin?: string;
  empresaId?: string;
  empresaNome?: string;
  nome?: string;
  plano?: Plano | 'completo';
  maxAlunos?: number;
}

export interface PendingInvite {
  email: string;
  nome?: string;
  formacoes: string[];
  tipoUsuario: TipoUsuario;
  empresaId?: string;
  empresaNome?: string;
  criadoEm: string;
  criadoPor: string;
}

function calcularProximoReset(): string {
  const data = new Date();
  data.setDate(data.getDate() + 30);
  return data.toISOString();
}

function determinarTipoUsuario(email: string): TipoUsuario {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return 'admin';
  return 'aluno';
}

function inviteKey(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

export async function ensureUserDocument(authUser: User): Promise<UserData> {
  const userRef = doc(db, USERS_COLLECTION, authUser.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    // Atualiza lastLogin a cada login (necessário pro Dashboard do Coordenador
    // detectar alunos inativos). Fire-and-forget — não bloqueia o login.
    updateDoc(userRef, { lastLogin: new Date().toISOString() }).catch(err => {
      if (import.meta.env.DEV) console.warn('[ensureUserDocument] falha ao atualizar lastLogin:', err);
    });
    return snapshot.data() as UserData;
  }

  const email = authUser.email || '';
  let formacoes = ['projetos-melhoria-introdutoria'];
  let tipoUsuario: TipoUsuario = determinarTipoUsuario(email);
  let empresaId: string | undefined;
  let empresaNome: string | undefined;

  let nomeFromInvite: string | undefined;
  if (email) {
    const inviteRef = doc(db, INVITES_COLLECTION, inviteKey(email));
    const inviteSnap = await getDoc(inviteRef);
    if (inviteSnap.exists()) {
      const invite = inviteSnap.data() as PendingInvite;
      if (Array.isArray(invite.formacoes) && invite.formacoes.length > 0) {
        formacoes = invite.formacoes;
      }
      // Invite SÓ pode pedir 'aluno' ou 'coordenador'. Admin é exclusivamente
      // determinado pela lista ADMIN_EMAILS — invite nunca eleva privilégio.
      if (invite.tipoUsuario === 'coordenador' && tipoUsuario !== 'admin') {
        tipoUsuario = 'coordenador';
      } else if (invite.tipoUsuario === 'aluno' && tipoUsuario !== 'admin') {
        tipoUsuario = 'aluno';
      }
      // Qualquer outro valor (incluindo 'admin') é IGNORADO.
      if (invite.empresaId) empresaId = invite.empresaId;
      if (invite.empresaNome) empresaNome = invite.empresaNome;
      if (invite.nome) nomeFromInvite = invite.nome;
      await deleteDoc(inviteRef);
    }
  }

  const agora = new Date().toISOString();
  const novoUsuario: UserData = {
    uid: authUser.uid,
    email,
    formacoes,
    creditoIA: {
      limite: 100,
      usado: 0,
      resetEm: calcularProximoReset(),
    },
    tipoUsuario,
    criadoEm: agora,
    lastLogin: agora,
    ...(nomeFromInvite ? { nome: nomeFromInvite } : (authUser.displayName ? { nome: authUser.displayName } : {})),
    ...(empresaId ? { empresaId } : {}),
    ...(empresaNome ? { empresaNome } : {}),
  };

  await setDoc(userRef, novoUsuario);
  return novoUsuario;
}

export async function getUserData(uid: string): Promise<UserData | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserData;
}

export async function getAllUsers(): Promise<UserData[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs.map(d => d.data() as UserData);
}

/**
 * Listener real-time: dispara `onChange` toda vez que qualquer documento de `users`
 * é criado/alterado/deletado. Use no useEffect e cancele a subscription no cleanup.
 *
 * Cobre tanto cadastros via landing page (n8n cria doc) quanto convites pelo app.
 */
export function subscribeUsersChanges(onChange: () => void): () => void {
  const unsub = onSnapshot(
    collection(db, USERS_COLLECTION),
    () => onChange(),
    err => console.error('[subscribeUsersChanges] erro:', err)
  );
  return unsub;
}

/**
 * Listener real-time pra coleção de convites pendentes.
 */
export function subscribeInvitesChanges(onChange: () => void): () => void {
  const unsub = onSnapshot(
    collection(db, INVITES_COLLECTION),
    () => onChange(),
    err => console.error('[subscribeInvitesChanges] erro:', err)
  );
  return unsub;
}

export async function getUsersByEmpresa(empresaId: string): Promise<UserData[]> {
  const q = query(collection(db, USERS_COLLECTION), where('empresaId', '==', empresaId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as UserData);
}

export async function updateUserFormacoes(uid: string, formacoes: string[]): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { formacoes });
}

export async function updateUserTipo(uid: string, tipoUsuario: TipoUsuario): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { tipoUsuario });
}

export async function updateUserEmpresa(
  uid: string,
  empresaId: string | null,
  empresaNome: string | null
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const payload: any = {};
  payload.empresaId = empresaId || null;
  payload.empresaNome = empresaNome || null;
  await updateDoc(userRef, payload);
}

export async function updateUserCreditoLimite(uid: string, limite: number): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { 'creditoIA.limite': limite });
}

export async function updateUserNome(uid: string, nome: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { nome });
}

export async function updateUserPlano(uid: string, plano: Plano): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { plano });
}

export async function updateUserMaxAlunos(uid: string, maxAlunos: number): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { maxAlunos });
}

export async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}

export async function getCoordenadores(): Promise<UserData[]> {
  const q = query(collection(db, USERS_COLLECTION), where('tipoUsuario', '==', 'coordenador'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as UserData);
}

export async function criarConvite(invite: Omit<PendingInvite, 'criadoEm'>): Promise<void> {
  const ref = doc(db, INVITES_COLLECTION, inviteKey(invite.email));
  await setDoc(ref, {
    ...invite,
    criadoEm: new Date().toISOString(),
  });
}

export async function listarConvites(): Promise<PendingInvite[]> {
  const snapshot = await getDocs(collection(db, INVITES_COLLECTION));
  return snapshot.docs.map(d => d.data() as PendingInvite);
}

export async function listarConvitesPorEmpresa(empresaId: string): Promise<PendingInvite[]> {
  const q = query(collection(db, INVITES_COLLECTION), where('empresaId', '==', empresaId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as PendingInvite);
}

export async function deletarConvite(email: string): Promise<void> {
  await deleteDoc(doc(db, INVITES_COLLECTION, inviteKey(email)));
}

export async function listarEmpresas(): Promise<{ id: string; nome: string }[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  const map = new Map<string, string>();
  snapshot.docs.forEach(d => {
    const u = d.data() as UserData;
    if (u.empresaId && !map.has(u.empresaId)) {
      map.set(u.empresaId, u.empresaNome || u.empresaId);
    }
  });
  return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
}
