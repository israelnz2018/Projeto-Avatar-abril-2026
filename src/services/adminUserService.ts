/**
 * Cliente frontend pros endpoints /api/admin/users/* (server-side com Firebase Admin SDK).
 * Cada chamada anexa o idToken do admin logado no header Authorization.
 */

import { auth } from "../lib/firebase";

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Não autenticado.");
  return user.getIdToken();
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

export interface AdminCreateUserInput {
  email: string;
  nome?: string;
  plano?: "gratuito" | "completo" | "coordenador";
  formacoes?: string[];
  empresaId?: string;
  empresaNome?: string;
  maxAlunos?: number;
  tipoUsuario?: "aluno" | "coordenador";
}

export interface AdminCreateUserResult {
  uid: string;
  email: string;
  senhaProvisoria: string;
  emailEnviado: boolean;
}

export async function adminCreateUser(input: AdminCreateUserInput): Promise<AdminCreateUserResult> {
  const r = await authedFetch("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({ ...input, appUrl: window.location.origin }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  return body;
}

export async function adminUpdateUser(uid: string, updates: Record<string, any>): Promise<void> {
  const r = await authedFetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
}

export async function adminDeleteUser(uid: string): Promise<void> {
  const r = await authedFetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
    method: "DELETE",
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
}

/** Lista TODOS os usuários do Firebase Auth + merge com Firestore. */
export interface ListedUser {
  uid: string;
  email: string;
  nome?: string;
  tipoUsuario: 'admin' | 'coordenador' | 'aluno';
  plano?: 'gratuito' | 'completo' | 'coordenador';
  formacoes: string[];
  creditoIA: { limite: number; usado: number; resetEm: string };
  empresaId?: string;
  empresaNome?: string;
  maxAlunos?: number;
  criadoEm: string;
  primeiroAcessoEm?: string;
  acessoCompletoAte?: string;
  _hasDoc: boolean;
  _authCreatedAt?: string | null;
  _authDisabled?: boolean;
}

export async function adminListAllUsers(): Promise<ListedUser[]> {
  const r = await authedFetch('/api/admin/users/list', { method: 'GET' });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  return Array.isArray(body?.users) ? body.users : [];
}

export async function adminCompleteProfile(uid: string): Promise<void> {
  const r = await authedFetch(`/api/admin/users/${encodeURIComponent(uid)}/complete-profile`, {
    method: 'POST',
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
}

export async function adminResetPassword(uid: string): Promise<{ senhaProvisoria: string; emailEnviado: boolean }> {
  const r = await authedFetch(`/api/admin/users/${encodeURIComponent(uid)}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ appUrl: window.location.origin }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  return body;
}
