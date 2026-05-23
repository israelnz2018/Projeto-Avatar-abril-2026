// Acha os 4 vídeos educacionais que vão ficar fixos na aba Data Analysis
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const procurar = [
  'Relação de causa e efeito',
  'Mapa de Análise Estatística',
  'Mapa de análise Estatística',
  'Escolha da melhor ferramenta',
];

const snap = await db.collection('knowledge_base').get();
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

for (const termo of procurar) {
  const matches = items.filter(i => i.title?.toLowerCase().includes(termo.toLowerCase()));
  console.log(`\n🔍 "${termo}"`);
  if (matches.length === 0) {
    console.log('   ❌ NÃO ENCONTRADO');
  } else {
    matches.forEach(m => console.log(`   ✓ "${m.title}" → ${m.sourceUrl}`));
  }
}
process.exit(0);
