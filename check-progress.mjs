// Diagnóstico em tempo real: quantos vídeos JÁ TÊM summary depois das chamadas
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('knowledge_base').get();
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

const urlsComSummary = new Set();
const urlsComTranscript = new Set();
for (const it of items) {
  if ((it.summary?.length || 0) > 0 && it.sourceUrl) urlsComSummary.add(it.sourceUrl);
  if (it.rawTranscript && it.rawTranscript.trim() && it.sourceUrl) urlsComTranscript.add(it.sourceUrl);
}

const pendentes = [...urlsComTranscript].filter(u => !urlsComSummary.has(u));

console.log('==== STATUS REAL DO FIRESTORE AGORA ====\n');
console.log(`✅ Vídeos COM summary (índice gerado): ${urlsComSummary.size}`);
console.log(`⏳ Vídeos PENDENTES (com transcript mas sem summary): ${pendentes.length}`);
console.log(`📦 Total de placements no Firestore: ${items.length}`);
console.log(`🔗 URLs únicas: ${urlsComTranscript.size + items.filter(it => it.sourceUrl && (!it.rawTranscript || !it.rawTranscript.trim())).length}`);

// Últimos 5 indexados (pra confirmar que a sincronia está OK)
const recentes = items
  .filter(it => (it.summary?.length || 0) > 0)
  .slice(-5);
console.log('\nÚltimos 5 vídeos COM índice (amostra):');
recentes.forEach(it => {
  console.log(`  - "${it.title?.slice(0, 50)}..." → ${it.summary?.length} capítulos`);
});

process.exit(0);
