// Pega 3 vídeos técnicos pra teste de auto-translate
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('knowledge_base').get();
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

// Pega 3 com jargão técnico forte: regressão, capability, ADKAR, etc.
const candidatos = ['Carta de Controle IMR no Minitab', 'Análise de Capabil', 'Regressão Múltipla'];
const found = [];
for (const term of candidatos) {
  const match = items.find(i => i.title?.includes(term));
  if (match) found.push(match);
}

console.log('=== 3 vídeos pra teste de auto-translate ===\n');
found.forEach((v, i) => {
  console.log(`${i + 1}. ${v.title}`);
  console.log(`   URL: ${v.sourceUrl}\n`);
});
process.exit(0);
