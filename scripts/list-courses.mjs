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
let comBunny = 0;
snap.forEach((d) => {
  const v = d.data();
  const c = v.course || '(sem curso)';
  counts[c] = (counts[c] || 0) + 1;
  if (v.bunnyVideoId) comBunny++;
});
console.log('\nCURSOS (qtd vídeos | nome):');
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${String(n).padStart(4)}  ${c}`));
console.log(`\nTotal de vídeos: ${snap.size} | já ligados ao Bunny: ${comBunny}`);
process.exit(0);
