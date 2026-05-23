// Lê o log do bulk e atualiza api_usage/{hoje} com a soma de tokens.
// Roda no fim pra refletir o gasto real no painel /api-settings.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const log = readFileSync('./bulk-generate-indexes.log', 'utf8');

// Parseia linhas "✅ N capítulos · sincronizado em X placements · INPUT+OUTPUT tokens"
const okRegex = /✅\s+\d+\s+capítulos.*?·\s+(\d+)\+(\d+)\s+tokens/g;
let okCount = 0;
let inTokens = 0;
let outTokens = 0;
let m;
while ((m = okRegex.exec(log)) !== null) {
  okCount++;
  inTokens += parseInt(m[1]);
  outTokens += parseInt(m[2]);
}

// Conta falhas
const failCount = (log.match(/❌ FALHA DEFINITIVA/g) || []).length;

// Total de chamadas = sucessos + falhas (cada falha consumiu ~1 chamada também)
const totalCalls = okCount + failCount;

console.log('==== BACKFILL api_usage ====');
console.log(`✅ Sucessos: ${okCount}`);
console.log(`❌ Falhas: ${failCount}`);
console.log(`📊 Chamadas: ${totalCalls}`);
console.log(`🔹 Tokens entrada: ${inTokens.toLocaleString()}`);
console.log(`🔸 Tokens saída: ${outTokens.toLocaleString()}`);
const cost = (inTokens * 0.075 + outTokens * 0.30) / 1_000_000;
console.log(`💰 Custo estimado: $${cost.toFixed(4)}`);

// Escreve no api_usage/{YYYY-MM-DD}
const today = new Date().toISOString().slice(0, 10);
const ref = db.collection('api_usage').doc(today);

await ref.set({
  date: today,
  geminiCalls: FieldValue.increment(okCount),
  geminiPromptTokens: FieldValue.increment(inTokens),
  geminiCandidatesTokens: FieldValue.increment(outTokens),
  geminiTotalTokens: FieldValue.increment(inTokens + outTokens),
  geminiFailures: FieldValue.increment(failCount),
  lastUpdatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log(`\n✅ api_usage/${today} atualizado.`);
console.log(`Atualize a página /api-settings pra ver os novos números.`);
process.exit(0);
