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
import { resolveConsultorId } from './consultorService';

const USERS_COLLECTION = 'users';
const INVITES_COLLECTION = 'invites';

const ADMIN_EMAILS = ['israelnz2018@hotmail.com', 'israel@learningbyworking.com'];

export type TipoUsuario = 'aluno' | 'coordenador' | 'admin' | 'consultor';
export type Plano = 'gratuito' | 'completo' | 'coordenador';

export interface UserData {
  uid: string;
  email: string;
  formacoes: string[];
  creditoIA: {
    limite: number;
    usado: number;
    resetEm: string;
    /** Aluno solicitou aumento de crédito (visível no painel /users). */
    solicitouMais?: boolean;
    solicitadoEm?: string;
  };
  tipoUsuario: TipoUsuario;
  criadoEm: string;
  /** Data em que o aluno foi incluido no time/coordenador atual. */
  incluidoNoTimeEm?: string;
  /** Atualizado a cada login (ISO string). Usado pelo Dashboard do Coordenador
   *  pra detectar alunos inativos. Pode estar ausente em docs antigos. */
  lastLogin?: string;
  /** Carimbado no 1º login (useUserAccess). Ausente = nunca acessou (lead). */
  primeiroAcessoEm?: string;
  /** Validade do acesso completo (ISO). Hotmart = compra +1 ano; Hostinger = 31/12/2026. */
  acessoCompletoAte?: string;
  /** Origem do acesso completo. "convite-reativacao" = convidado do Hostinger. */
  origemAcesso?: string;
  /** Origem da CRIAÇÃO/compra. "compra-trilha1" = pagou Kit 90; "compra-hotmart"
   *  = pagou completo; "gratuito-landing" = cadastro grátis antigo. */
  origem?: string;
  empresaId?: string;
  empresaNome?: string;
  nome?: string;
  plano?: Plano | 'completo';
  maxAlunos?: number;
  cursosAcesso?: Array<{ curso: string; vencimento?: string | null; valor?: number; quantidade?: number }>;
  cursosLiberados?: string[];
  /** Multi-tenant: consultor a que este usuário pertence (default 'israel'). */
  consultorId?: string;
  /** Todos os tenants aos quais esta identidade pertence. */
  consultorIds?: string[];
  /** Papel e acesso independentes em cada site de consultor. */
  vinculos?: Record<string, Partial<UserData>>;
  avisoBloqueio?: {
    tipo: 'acesso_bloqueado';
    titulo: string;
    mensagem: string;
    consultorId?: string;
    consultorNome?: string;
    criadoEm: string;
    expiraEm?: string;
    lida?: boolean;
  };
}

/** Projeta o perfil global no vínculo do site atual, mantendo os dados globais. */
export function userDataNoConsultor<T extends Record<string, any>>(data: T, consultorId = resolveConsultorId()): T {
  const vinculo = data?.vinculos?.[consultorId];
  if (!vinculo || typeof vinculo !== 'object') {
    if (data?.tipoUsuario === 'admin' || !data?.consultorId || data.consultorId === consultorId) return data;
    // Entrar em outro subdomínio não transporta privilégios do tenant principal.
    return { ...data, tipoUsuario: 'aluno', consultorId, plano: 'gratuito', cursosAcesso: [], cursosLiberados: [], empresaId: null, empresaNome: null };
  }
  return { ...data, ...vinculo, consultorId };
}

export interface PendingInvite {
  email: string;
  nome?: string;
  formacoes: string[];
  tipoUsuario: TipoUsuario;
  empresaId?: string;
  empresaNome?: string;
  consultorId?: string; // convite de consultor: tenant que ele vai administrar
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
  let consultorIdFromInvite: string | undefined;

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
      } else if (invite.tipoUsuario === 'consultor' && tipoUsuario !== 'admin') {
        tipoUsuario = 'consultor';
      } else if (invite.tipoUsuario === 'aluno' && tipoUsuario !== 'admin') {
        tipoUsuario = 'aluno';
      }
      // Qualquer outro valor (incluindo 'admin') é IGNORADO — invite nunca vira admin.
      if (invite.empresaId) empresaId = invite.empresaId;
      if (invite.empresaNome) empresaNome = invite.empresaNome;
      if (invite.consultorId) consultorIdFromInvite = invite.consultorId;
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
      limite: 200,
      usado: 0,
      resetEm: calcularProximoReset(),
    },
    tipoUsuario,
    criadoEm: agora,
    lastLogin: agora,
    ...(nomeFromInvite ? { nome: nomeFromInvite } : (authUser.displayName ? { nome: authUser.displayName } : {})),
    ...(empresaId ? { empresaId } : {}),
    ...(empresaNome ? { empresaNome } : {}),
    // Multi-tenant: consultor do usuário — do convite (consultor/time) ou, sem
    // convite, pelo subdomínio de onde ele se cadastrou. app./raiz → 'israel'.
    consultorId: consultorIdFromInvite || resolveConsultorId(),
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

/** Lista usuários de um tenant incluindo identidades cujo vínculo principal é outro. */
export async function getUserDocsByConsultor(consultorId: string): Promise<any[]> {
  const ref = collection(db, USERS_COLLECTION);
  const [principais, multiplos] = await Promise.all([
    getDocs(query(ref, where('consultorId', '==', consultorId))),
    getDocs(query(ref, where('consultorIds', 'array-contains', consultorId))).catch(() => null),
  ]);
  const unicos = new Map<string, any>();
  [...principais.docs, ...(multiplos?.docs || [])].forEach((item) => {
    const projetado = userDataNoConsultor(item.data(), consultorId);
    unicos.set(item.id, { id: item.id, data: () => projetado });
  });
  return [...unicos.values()];
}

/** Atualiza apenas o vínculo de um usuário dentro de um tenant. */
export async function updateUserNoConsultor(uid: string, consultorId: string, patch: Record<string, any>): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Usuário não encontrado.');
  const atual = snap.data() as any;
  const vinculo = { ...(atual.vinculos?.[consultorId] || {}), ...patch, consultorId };
  const payload: Record<string, any> = {
    consultorIds: Array.from(new Set([...(Array.isArray(atual.consultorIds) ? atual.consultorIds : []), atual.consultorId, consultorId].filter(Boolean))),
    vinculos: { ...(atual.vinculos || {}), [consultorId]: vinculo },
  };
  if (!atual.consultorId || atual.consultorId === consultorId) Object.assign(payload, patch, { consultorId });
  await setDoc(ref, payload, { merge: true });
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

/** Sigla do coordenador que aparece no cabeçalho dos PPTs dele (white-label). */
export async function updateUserSiglaPpt(uid: string, siglaPpt: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { siglaPpt });
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
