// Conta vídeos que precisam de índice usando MESMA lógica do bulk
// (1 por sourceUrl, ignorando se qualquer placement irmã já tem summary)
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('knowledge_base').get();
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

const total = items.length;
const semUrl = items.filter(it => !it.sourceUrl).length;
const semRaw = items.filter(it => !it.rawTranscript || !it.rawTranscript.trim()).length;

// Set de URLs onde QUALQUER placement já tem summary
const urlsComSummary = new Set();
for (const it of items) {
  if ((it.summary?.length || 0) > 0 && it.sourceUrl) urlsComSummary.add(it.sourceUrl);
}

// URLs únicas com transcript
const urlsComTranscript = new Set();
for (const it of items) {
  if (it.sourceUrl && it.rawTranscript && it.rawTranscript.trim()) {
    urlsComTranscript.add(it.sourceUrl);
  }
}

// Pendentes = sourceUrl tem rawTranscript mas nenhuma placement irmã tem summary
const pendentes = new Set();
for (const url of urlsComTranscript) {
  if (!urlsComSummary.has(url)) pendentes.add(url);
}

console.log('====== DIAGNÓSTICO KNOWLEDGE_BASE ======');
console.log(`Total de placements (docs no Firestore): ${total}`);
console.log(`URLs únicas (sourceUrl): ${urlsComTranscript.size + items.filter(it => it.sourceUrl && (!it.rawTranscript || !it.rawTranscript.trim())).length}`);
console.log(`Sem sourceUrl: ${semUrl}`);
console.log(`Sem rawTranscript: ${semRaw}`);
console.log(``);
console.log(`URLs com rawTranscript: ${urlsComTranscript.size}`);
console.log(`URLs onde ALGUMA placement já tem summary: ${urlsComSummary.size}`);
console.log(`URLs com transcript mas SEM summary em nenhuma irmã (pendentes): ${pendentes.size}`);
console.log(``);
console.log(`Primeiros 10 pendentes:`);
const sample = Array.from(pendentes).slice(0, 10);
for (const url of sample) {
  const item = items.find(it => it.sourceUrl === url);
  console.log(`  - "${item?.title || '(sem título)'}"  [${item?.course || '?'}]`);
}

// Investiga discrepância: URLs com tanto summary quanto sem summary entre as placements
const urlsInconsistentes = [];
for (const url of urlsComSummary) {
  const placements = items.filter(it => it.sourceUrl === url);
  const semSummary = placements.filter(it => (it.summary?.length || 0) === 0);
  if (semSummary.length > 0) {
    urlsInconsistentes.push({ url, total: placements.length, semSummary: semSummary.length, title: placements[0].title });
  }
}
console.log(``);
console.log(`====== INCONSISTÊNCIAS ======`);
console.log(`URLs onde SOME placements têm summary mas OUTRAS NÃO: ${urlsInconsistentes.length}`);
if (urlsInconsistentes.length > 0) {
  console.log(`(Estas seriam contadas como pendentes pela lógica antiga, mas não são pela lógica nova)`);
  console.log(`Primeiras 5:`);
  for (const it of urlsInconsistentes.slice(0, 5)) {
    console.log(`  - "${it.title}" (${it.semSummary}/${it.total} placements sem summary)`);
  }
}

process.exit(0);
