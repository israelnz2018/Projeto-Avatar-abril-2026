#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const API_KEY = process.env.BUNNY_STREAM_API_KEY;
const LIBRARY_ID = String(process.env.BUNNY_LIBRARY_ID || '');
const APPLY = process.argv.includes('--apply');

if (!API_KEY || !LIBRARY_ID) {
  console.error('Faltam BUNNY_STREAM_API_KEY e/ou BUNNY_LIBRARY_ID no .env');
  process.exit(1);
}

const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();
const base = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`;
const headers = { AccessKey: API_KEY, Accept: 'application/json' };

async function referencedGuids() {
  const snap = await db.collection('knowledge_base').get();
  const guids = new Set();
  let linkedDocs = 0;
  for (const doc of snap.docs) {
    const value = doc.data();
    if (!value.bunnyVideoId) continue;
    linkedDocs++;
    guids.add(String(value.bunnyVideoId));
  }
  return { guids, docs: snap.size, linkedDocs };
}

async function listBunnyVideos() {
  const videos = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`${base}?page=${page}&itemsPerPage=100` , { headers });
    if (!response.ok) throw new Error(`Bunny list HTTP ${response.status}`);
    const body = await response.json();
    const items = Array.isArray(body.items) ? body.items : [];
    videos.push(...items);
    if (!items.length || videos.length >= Number(body.totalItems || 0)) break;
  }
  return videos;
}

const refs = await referencedGuids();
const videos = await listBunnyVideos();
const bunnyGuids = new Set(videos.map((video) => String(video.guid)));
const missing = [...refs.guids].filter((guid) => !bunnyGuids.has(guid));
const orphans = videos.filter((video) => !refs.guids.has(String(video.guid)));

console.log(`Firestore: ${refs.linkedDocs}/${refs.docs} docs ligados; ${refs.guids.size} GUIDs unicos.`);
console.log(`Bunny: ${videos.length} videos; em uso: ${videos.length - orphans.length}; orfaos: ${orphans.length}.`);
console.log(`GUIDs usados no Firestore mas ausentes no Bunny: ${missing.length}.`);
if (missing.length) {
  for (const guid of missing) {
    const docs = await db.collection('knowledge_base').where('bunnyVideoId', '==', guid).get();
    for (const doc of docs.docs) {
      const value = doc.data();
      console.log(`AUSENTE\t${guid}\t${value.title || doc.id}\t${value.sourceUrl || ''}`);
    }
  }
}
for (const video of orphans) console.log(`ORFAO\t${video.guid}\t${video.title || '(sem titulo)'}`);

if (missing.length) {
  console.error('ABORTADO: ha GUIDs usados pela plataforma que nao existem no Bunny.');
  process.exit(2);
}
if (!APPLY) {
  console.log('AUDITORIA SOMENTE LEITURA. Use --apply para excluir os orfaos listados.');
  process.exit(0);
}

let deleted = 0;
for (const video of orphans) {
  // Revalida somente este GUID imediatamente antes de apagar (no maximo 1 leitura).
  const fresh = await db.collection('knowledge_base')
    .where('bunnyVideoId', '==', String(video.guid))
    .limit(1)
    .get();
  if (!fresh.empty) {
    console.log(`PRESERVADO\t${video.guid}\tpassou a estar em uso`);
    continue;
  }
  const response = await fetch(`${base}/${video.guid}`, { method: 'DELETE', headers });
  if (!response.ok) throw new Error(`Bunny delete ${video.guid} HTTP ${response.status}`);
  deleted++;
  console.log(`EXCLUIDO\t${video.guid}\t${video.title || '(sem titulo)'}`);
}
console.log(`Fim da limpeza: ${deleted} excluidos; ${orphans.length - deleted} preservados.`);
