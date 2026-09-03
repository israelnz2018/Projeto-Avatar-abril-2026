// Backup pontual das colecoes tocadas pela feature de ligacoes entre ferramentas.
// Read-only no Firestore: so le e grava JSON local. Dumps ficam fora do git.
import 'dotenv/config';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import admin from 'firebase-admin';

const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = `../backup-tool-links-${stamp}`;
mkdirSync(dir, { recursive: true });

for (const col of ['initiatives', 'initiative_configs']) {
  const snap = await db.collection(col).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  writeFileSync(`${dir}/${col}.json`, JSON.stringify(rows, null, 2), 'utf8');
  console.log(`${col}: ${rows.length} docs -> ${dir}/${col}.json`);
}
console.log('OK', dir);
process.exit(0);
