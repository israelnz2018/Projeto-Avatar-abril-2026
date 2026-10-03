#!/usr/bin/env node
/** Preenche apenas bunnyThumbnailUrl dos vídeos já migrados. Simulação por padrão. */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const consultorId = process.env.CONSULTOR_ID || 'israel';
const aplicar = process.env.APPLY === 'true';
const libraryId = String(process.env.BUNNY_LIBRARY_ID || '');
const apiKey = process.env.BUNNY_STREAM_API_KEY;
if (!libraryId || !apiKey) throw new Error('BUNNY_LIBRARY_ID e BUNNY_STREAM_API_KEY são obrigatórios.');

const credencial = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(credencial) });
const db = admin.firestore();

const snap = await db.collection('knowledge_base').where('consultorId', '==', consultorId).get();
const semCapa = snap.docs.filter((doc) => {
  const item = doc.data();
  return item.bunnyVideoId && !String(item.bunnyThumbnailUrl || '').trim()
    && String(item.bunnyLibraryId || libraryId) === libraryId;
});
const ids = [...new Set(semCapa.map((doc) => String(doc.data().bunnyVideoId)))];
console.log(JSON.stringify({ consultorId, documentosSemCapa: semCapa.length, videosUnicos: ids.length, modo: aplicar ? 'aplicar' : 'simular' }));
if (!aplicar || !ids.length) process.exit(0);

const capas = new Map();
const falhas = [];
let proximo = 0;
async function buscarCapa(videoId) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/play`, {
        headers: { AccessKey: apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const play = await response.json();
      const capa = String(play?.video?.thumbnailUrl || play?.thumbnailUrl || '').trim();
      if (capa) { capas.set(videoId, capa); return; }
      throw new Error('Bunny ainda não devolveu a capa');
    } catch (erro) {
      if (tentativa === 3) falhas.push({ videoId, motivo: String(erro?.message || erro) });
      else await new Promise((resolve) => setTimeout(resolve, tentativa * 1000));
    }
  }
}
await Promise.all(Array.from({ length: Math.min(8, ids.length) }, async () => {
  while (proximo < ids.length) {
    const videoId = ids[proximo++];
    await buscarCapa(videoId);
  }
}));

const atualizacoes = semCapa.flatMap((doc) => {
  const capa = capas.get(String(doc.data().bunnyVideoId));
  return capa ? [{ ref: doc.ref, capa }] : [];
});
for (let inicio = 0; inicio < atualizacoes.length; inicio += 400) {
  const batch = db.batch();
  for (const { ref, capa } of atualizacoes.slice(inicio, inicio + 400)) {
    batch.update(ref, { bunnyThumbnailUrl: capa });
  }
  await batch.commit();
}
console.log(JSON.stringify({ documentosAtualizados: atualizacoes.length, videosComCapa: capas.size, falhas }, null, 2));
if (falhas.length) process.exitCode = 1;
