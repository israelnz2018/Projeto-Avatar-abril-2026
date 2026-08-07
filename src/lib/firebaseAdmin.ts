/**
 * Inicialização do Firebase Admin SDK (uso server-side).
 *
 * Configuração: defina UMA das duas env vars no .env do servidor:
 *   - FIREBASE_ADMIN_KEY_JSON  → conteúdo JSON inteiro da chave de service account
 *   - FIREBASE_ADMIN_KEY_PATH  → caminho relativo pra um arquivo .json
 *
 * Como obter a chave:
 *   Firebase Console → Configurações do projeto → Contas de serviço →
 *   "Gerar nova chave privada" → baixa um .json.
 *
 * NUNCA committe a chave. Já está coberto pelo .gitignore (secrets/ e .env).
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const PROJECT_ID = "senha-92ce1";

function loadServiceAccount(): admin.ServiceAccount | null {
  const preferredFilePath = process.env.FIREBASE_ADMIN_KEY_PATH;
  if (preferredFilePath) {
    try {
      const resolved = path.isAbsolute(preferredFilePath) ? preferredFilePath : path.resolve(process.cwd(), preferredFilePath);
      if (fs.existsSync(resolved)) {
        const content = fs.readFileSync(resolved, "utf-8");
        return JSON.parse(content) as admin.ServiceAccount;
      }
    } catch (err) {
      console.error("[firebaseAdmin] erro ao ler FIREBASE_ADMIN_KEY_PATH:", err);
    }
  }

  // 1) Inline no .env (recomendado pra deploy)
  const inlineJson = process.env.FIREBASE_ADMIN_KEY_JSON;
  if (inlineJson) {
    try {
      return JSON.parse(inlineJson) as admin.ServiceAccount;
    } catch (err) {
      console.error("[firebaseAdmin] FIREBASE_ADMIN_KEY_JSON inválido:", err);
    }
  }
  return null;
}

let initialized = false;

export function initFirebaseAdmin(): boolean {
  if (initialized) return true;
  if (admin.apps.length > 0) {
    initialized = true;
    return true;
  }
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn(
      "[firebaseAdmin] Service account não configurado. Endpoints /api/admin/* vão retornar 503. " +
      "Defina FIREBASE_ADMIN_KEY_JSON ou FIREBASE_ADMIN_KEY_PATH no .env."
    );
    return false;
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
    });
    initialized = true;
    console.log("[firebaseAdmin] Inicializado com sucesso. projectId:", PROJECT_ID);
    return true;
  } catch (err) {
    console.error("[firebaseAdmin] Falha ao inicializar:", err);
    return false;
  }
}

export function isAdminReady(): boolean {
  return initialized && admin.apps.length > 0;
}

export function adminAuth() {
  if (!isAdminReady()) {
    throw new Error("Firebase Admin não inicializado. Configure FIREBASE_ADMIN_KEY_JSON no .env.");
  }
  return admin.auth();
}

export function adminFirestore() {
  if (!isAdminReady()) {
    throw new Error("Firebase Admin não inicializado. Configure FIREBASE_ADMIN_KEY_JSON no .env.");
  }
  return admin.firestore();
}

export { admin };
