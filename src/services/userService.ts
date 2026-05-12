import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

const USERS_COLLECTION = 'users';

const ADMIN_EMAILS = ['israelnz2018@hotmail.com'];

export interface UserData {
  uid: string;
  email: string;
  formacoes: string[];
  creditoIA: {
    limite: number;
    usado: number;
    resetEm: string; // ISO date
  };
  tipoUsuario: 'aluno' | 'coordenador' | 'admin';
  criadoEm: string; // ISO date
}

function calcularProximoReset(): string {
  const data = new Date();
  data.setDate(data.getDate() + 30);
  return data.toISOString();
}

function determinarTipoUsuario(email: string): UserData['tipoUsuario'] {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return 'admin';
  return 'aluno';
}

export async function ensureUserDocument(authUser: User): Promise<UserData> {
  const userRef = doc(db, USERS_COLLECTION, authUser.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data() as UserData;
  }

  const novoUsuario: UserData = {
    uid: authUser.uid,
    email: authUser.email || '',
    formacoes: ['projetos-melhoria-introdutoria'],
    creditoIA: {
      limite: 100,
      usado: 0,
      resetEm: calcularProximoReset(),
    },
    tipoUsuario: determinarTipoUsuario(authUser.email || ''),
    criadoEm: new Date().toISOString(),
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
