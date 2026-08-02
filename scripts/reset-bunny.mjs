// Limpa bunnyVideoId/bunnyLibraryId de docs por GUID (pra re-migrar). Uso:
//   RESET_GUIDS="guid1,guid2" node scripts/reset-bunny.mjs
// 🔒 Só remove esses 2 campos (update). Transcripts e o resto ficam intactos.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();
const guids = (process.env.RESET_GUIDS || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!guids.length) { console.error('Passe RESET_GUIDS="g1,g2"'); process.exit(1); }
const snap = await db.collection('knowledge_base').get();
let n = 0;
for (const d of snap.docs) {
  if (guids.includes(d.data().bunnyVideoId)) {
    await d.ref.update({ bunnyVideoId: '', bunnyLibraryId: '' });
    console.log('limpo:', d.data().title);
    n++;
  }
}
console.log(`Pronto. ${n} doc(s) resetado(s).`);
process.exit(0);
