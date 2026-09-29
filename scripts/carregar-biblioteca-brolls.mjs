/**
 * Carrega a biblioteca-brolls/ (catalogo.json + imagens) para o Firestore + Storage.
 *
 * Roda uma vez (e de novo sempre que a pasta ganhar itens novos). Para cada ficha:
 *   1. sobe a imagem para marketing/_biblioteca/brolls/{id}.png
 *   2. calcula o embedding do texto "conceitos + exemplo" (gemini-embedding-001,
 *      RETRIEVAL_DOCUMENT — o mesmo par de modo usado na busca, senão os vetores
 *      não comparam bem: são espaços calculados de propósito para ficarem próximos
 *      só nesse par de tarefas)
 *   3. grava tudo em marketing_brolls/{id}, pronto para a busca por similaridade
 *
 * Idempotente: reescreve o doc inteiro a cada rodada, então rodar de novo sobre a
 * mesma ficha não duplica nada — só atualiza.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

const RAIZ = "C:/Users/Israelnz2018/Israel-Projetos/Empresa de Gestão LBW/biblioteca-brolls";
const BUCKET_MARKETING = "senha-92ce1.firebasestorage.app";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH, "utf8"))),
  storageBucket: BUCKET_MARKETING,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

const settings = (await db.collection("app_config").doc("api_settings").get()).data() || {};
const geminiKey = process.env.GEMINI_API_KEY || settings?.gemini?.apiKey;
if (!geminiKey) throw new Error("Falta a chave do Gemini (GEMINI_API_KEY ou app_config/api_settings.gemini.apiKey).");
const ai = new GoogleGenAI({ apiKey: geminiKey });

async function vetorDoTexto(texto) {
  const r = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: texto,
    config: { taskType: "RETRIEVAL_DOCUMENT" },
  });
  return r.embeddings[0].values;
}

const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, "catalogo.json"), "utf8"));
console.log(`${catalogo.length} fichas para carregar.`);

let ok = 0;
for (const ficha of catalogo) {
  try {
    const origemLocal = path.join(RAIZ, ficha.arquivo);
    if (!fs.existsSync(origemLocal)) { console.log("SEM ARQUIVO:", ficha.id); continue; }

    const destino = `marketing/_biblioteca/brolls/${ficha.id}.png`;
    await bucket.upload(origemLocal, {
      destination: destino,
      metadata: { contentType: "image/png", cacheControl: "public, max-age=31536000" },
    });

    // O texto que representa o item para a busca: conceitos + exemplo, a mesma
    // combinação que o teste de similaridade confirmou funcionar bem.
    const textoBusca = `${ficha.conceitos.join(", ")}. Exemplo: ${ficha.exemplo}`;
    const vetor = await vetorDoTexto(textoBusca);

    await db.collection("marketing_brolls").doc(ficha.id).set({
      id: ficha.id,
      categoria: ficha.categoria, // 'cena' | 'objeto'
      conceitos: ficha.conceitos,
      exemplo: ficha.exemplo,
      textoBusca,
      arquivo: destino,
      vetor,
      vezesUsado: 0,
      criadoEm: new Date().toISOString(),
    }, { merge: true });

    ok++;
    console.log("ok", ficha.id);
  } catch (e) {
    console.log("ERRO", ficha.id, String(e?.message || e).slice(0, 200));
  }
}
console.log(`\nCarregados ${ok} de ${catalogo.length}.`);
