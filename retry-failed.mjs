// Retry dos 13 vídeos que falharam por JSON parse no bulk anterior.
// Estratégia: pedir índice SEM o transcript longo (só capítulos) — saída menor = menos chance de truncar.
// Se sucesso, propaga pras placements irmãs via batch.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const LOG = './retry-failed.log';
function log(m) {
  const line = `[${new Date().toISOString()}] ${m}`;
  console.log(line);
  appendFileSync(LOG, line + '\n');
}
writeFileSync(LOG, '');

const failedTitles = [
  'Processo Certo Gera o Resultado Certo',
  'Regressão Múltipla - Parte 1',
  'Carta IMR - Individual e Amplitude',
  'Filosofia de Longo Prazo',
  'Sistema Toyota de Produção - Parte 1',
  'Qual é o Nível Sigma Desejado',
  'Medidas de Posiçao - Média, Mediana e Moda',
  'Fase Analisar - Estudo de caso',
  'Contrato do Projeto - Ganhos do projeto',
  'O que Você Deve Fazer Depois da Apresentação',
  'Cp e Cpk – Parte 2',
  'Testes de Hipótesis - Conceitos Parte 1',
  'Desperdícios - MURA',
];

const settingsDoc = await db.collection('app_config').doc('api_settings').get();
const GEMINI_KEY = settingsDoc.data()?.gemini?.apiKey;
const GEMINI_MODEL = settingsDoc.data()?.gemini?.model || 'gemini-2.5-flash';
if (!GEMINI_KEY) { log('❌ Sem Gemini key'); process.exit(1); }

const snap = await db.collection('knowledge_base').get();
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

// Acha 1 placement por titlo (com transcript)
const pending = [];
const seenUrls = new Set();
for (const t of failedTitles) {
  const m = items.find(i => i.title?.includes(t) && i.rawTranscript && !seenUrls.has(i.sourceUrl));
  if (m) { pending.push(m); seenUrls.add(m.sourceUrl); }
  else log(`⚠️ não achei: "${t}"`);
}
log(`🎯 ${pending.length} vídeos pra reprocessar`);

// Chama Gemini com prompt MAIS CONCISO (resumo menor → JSON menor → menos chance de truncar)
async function callGemini(rawTranscript, url) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const userPrompt = `Vídeo: ${url}\n\nTRANSCRIÇÃO:\n${rawTranscript}\n\nGere um índice com 5 a 8 capítulos do vídeo. Para cada capítulo, escreva UMA frase de resumo curta (máximo 25 palavras).\n\nFormato JSON ESTRITO, sem markdown:\n{\n  "summary": [{"time": "MM:SS", "topic": "frase curta"}],\n  "transcript": "resumo do vídeo em 3 parágrafos curtos"\n}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.3, responseMimeType: 'application/json' },
  };
  const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${json?.error?.message}`);
  const text = (json?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Tenta recuperar JSON parcial (se truncado, tenta achar último } válido)
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0) {
      try { parsed = JSON.parse(cleaned.slice(0, lastBrace + 1)); } catch {}
    }
    if (!parsed) throw e;
  }
  return {
    summary: Array.isArray(parsed.summary) ? parsed.summary : [],
    transcript: parsed.transcript || '',
    inputTokens: json?.usageMetadata?.promptTokenCount || 0,
    outputTokens: json?.usageMetadata?.candidatesTokenCount || 0,
  };
}

async function syncSiblings(url, fields) {
  const q = await db.collection('knowledge_base').where('sourceUrl', '==', url).get();
  if (q.empty) return 0;
  const batch = db.batch();
  q.docs.forEach(d => batch.update(d.ref, fields));
  await batch.commit();
  return q.size;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let done = 0, failed = 0, inTok = 0, outTok = 0;

for (let i = 0; i < pending.length; i++) {
  const item = pending[i];
  log(`[${i + 1}/${pending.length}] "${item.title}"`);
  try {
    const { summary, transcript, inputTokens, outputTokens } = await callGemini(item.rawTranscript, item.sourceUrl);
    if (!summary.length) throw new Error('summary vazio');
    const n = await syncSiblings(item.sourceUrl, { summary, transcript });
    done++;
    inTok += inputTokens;
    outTok += outputTokens;
    log(`   ✅ ${summary.length} caps · ${n} placements · ${inputTokens}+${outputTokens} tokens`);
  } catch (err) {
    failed++;
    log(`   ❌ ${err.message}`);
  }
  if (i < pending.length - 1) await sleep(2000);
}

const cost = (inTok * 0.075 + outTok * 0.30) / 1_000_000;
log(`\n====== RESUMO RETRY ======`);
log(`✅ ${done}/${pending.length}  ❌ ${failed}/${pending.length}`);
log(`💰 $${cost.toFixed(4)} · tokens ${inTok}+${outTok}`);

// Backfill api_usage
if (done > 0) {
  const today = new Date().toISOString().slice(0, 10);
  await db.collection('api_usage').doc(today).set({
    date: today,
    geminiCalls: FieldValue.increment(done),
    geminiPromptTokens: FieldValue.increment(inTok),
    geminiCandidatesTokens: FieldValue.increment(outTok),
    geminiTotalTokens: FieldValue.increment(inTok + outTok),
    geminiFailures: FieldValue.increment(failed),
    lastUpdatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  log(`✓ api_usage/${today} atualizado`);
}
process.exit(0);
