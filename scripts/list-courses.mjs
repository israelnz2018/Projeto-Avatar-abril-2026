import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();
const snap = await db.collection('knowledge_base').get();

const counts = {};
const bySource = new Map(); // sourceUrl -> { docs, guids:Set }
let comBunny = 0;
snap.forEach((d) => {
  const v = d.data();
  const c = v.course || '(sem curso)';
  counts[c] = (counts[c] || 0) + 1;
  if (v.bunnyVideoId) comBunny++;
  if (v.sourceUrl) {
    const e = bySource.get(v.sourceUrl) || { docs: 0, guids: new Set() };
    e.docs++;
    if (v.bunnyVideoId) e.guids.add(v.bunnyVideoId);
    bySource.set(v.sourceUrl, e);
  }
});

console.log('\nCURSOS (qtd docs | nome):');
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${String(n).padStart(4)}  ${c}`));

const uniques = bySource.size;
const multi = [...bySource.values()].filter((e) => e.docs > 1).length;
const dupGuids = [...bySource.values()].filter((e) => e.guids.size > 1).length; // mesmo vídeo com GUIDs diferentes (ruim)

console.log(`\nDocs totais: ${snap.size} | vídeos ÚNICOS (sourceUrl): ${uniques} | já ligados ao Bunny (docs): ${comBunny}`);
console.log(`Multi-placement (mesmo vídeo em >1 curso/doc): ${multi} vídeos`);
console.log(`⚠️ Vídeos com GUIDs DUPLICADOS (mesmo sourceUrl, GUIDs diferentes): ${dupGuids}`);
process.exit(0);
