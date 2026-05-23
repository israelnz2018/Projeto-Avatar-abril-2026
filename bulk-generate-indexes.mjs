/**
 * Geração em lote de índices/resumos de vídeo via Gemini 2.5 Flash.
 * Roda direto pelo Node usando service account — não depende do browser.
 *
 * Estratégia:
 *   1. Lê knowledge_base
 *   2. Identifica URLs únicas que têm rawTranscript mas nenhuma placement irmã tem summary
 *   3. Pra cada uma: chama Gemini, gera summary + transcript, escreve em TODAS as placements irmãs (batch)
 *   4. Log de tudo + retry 1× em falhas transientes
 *   5. Resumo final
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const LOG_FILE = './bulk-generate-indexes.log';
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
}

writeFileSync(LOG_FILE, ''); // limpa log anterior

// Pega a API key do Gemini do Firestore (mesma usada pelo app)
log('Buscando Gemini API key do Firestore...');
const settingsDoc = await db.collection('app_config').doc('api_settings').get();
const settings = settingsDoc.data() || {};
const GEMINI_KEY = settings.gemini?.apiKey;
const GEMINI_MODEL = settings.gemini?.model || 'gemini-2.5-flash';

if (!GEMINI_KEY) {
  log('❌ ERRO: Gemini API key não encontrada em app_config/api_settings');
  process.exit(1);
}
log(`✓ Key obtida. Modelo: ${GEMINI_MODEL}`);

// Carrega todos os items
log('Lendo knowledge_base...');
const snap = await db.collection('knowledge_base').get();
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
log(`✓ ${items.length} placements carregadas`);

// Identifica URLs únicas pendentes
const urlsComSummary = new Set();
for (const it of items) {
  if ((it.summary?.length || 0) > 0 && it.sourceUrl) urlsComSummary.add(it.sourceUrl);
}
const pending = [];
const seenUrls = new Set();
for (const it of items) {
  if (!it.sourceUrl) continue;
  if (urlsComSummary.has(it.sourceUrl)) continue;
  if (!it.rawTranscript || !it.rawTranscript.trim()) continue;
  if (seenUrls.has(it.sourceUrl)) continue;
  seenUrls.add(it.sourceUrl);
  pending.push(it);
}
log(`✓ ${pending.length} vídeos pendentes pra processar`);

// Função: chama Gemini
async function callGemini(rawTranscript, url) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const userPrompt = `Vídeo: ${url}\n\nTRANSCRIÇÃO COMPLETA (com tempos):\n${rawTranscript}\n\nSua tarefa:\n\nPASSO 1 — ÍNDICE: divida o vídeo em capítulos/tópicos principais. Extraia o tempo exato em que cada tópico começa (formato MM:SS).\n\nPASSO 2 — RESUMO DETALHADO: para CADA item do índice, escreva um parágrafo detalhado dos principais aprendizados daquele trecho, usando apenas a transcrição fornecida.\n\nRetorne APENAS um objeto JSON neste formato exato:\n{\n  "summary": [{"time": "MM:SS", "topic": "descrição"}, ...],\n  "transcript": "texto longo do resumo detalhado, com tempos e parágrafos"\n}`;

  const body = {
    system_instruction: { parts: [{ text: 'Você gera índices clicáveis e resumos detalhados a partir de transcrições de vídeos do YouTube. Sempre responde com JSON puro.' }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${json?.error?.message || 'unknown'}`);
  }
  const text = (json?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    summary: Array.isArray(parsed.summary) ? parsed.summary : [],
    transcript: parsed.transcript || '',
    inputTokens: json?.usageMetadata?.promptTokenCount || 0,
    outputTokens: json?.usageMetadata?.candidatesTokenCount || 0,
  };
}

// Sync nas placements irmãs (todas com mesmo sourceUrl)
async function syncSiblings(sourceUrl, fields) {
  const q = await db.collection('knowledge_base').where('sourceUrl', '==', sourceUrl).get();
  if (q.empty) return 0;
  const batch = db.batch();
  q.docs.forEach(d => batch.update(d.ref, fields));
  await batch.commit();
  return q.size;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const THROTTLE_MS = 2000; // 2s entre chamadas — Gemini paid tier suporta 2000 RPM com folga

let done = 0;
let failed = 0;
let totalInputTokens = 0;
let totalOutputTokens = 0;
const failures = [];

const startedAt = Date.now();

for (let i = 0; i < pending.length; i++) {
  const item = pending[i];
  log(`[${i + 1}/${pending.length}] "${item.title?.slice(0, 60) || item.sourceUrl}"`);

  let attempt = 0;
  let success = false;
  let lastError = null;

  while (attempt < 2 && !success) {
    attempt++;
    try {
      const { summary, transcript, inputTokens, outputTokens } = await callGemini(item.rawTranscript, item.sourceUrl);
      if (!Array.isArray(summary) || summary.length === 0) {
        throw new Error('Gemini retornou índice vazio');
      }
      const synced = await syncSiblings(item.sourceUrl, { summary, transcript });
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      done++;
      success = true;
      log(`   ✅ ${summary.length} capítulos · sincronizado em ${synced} placements · ${inputTokens}+${outputTokens} tokens`);
    } catch (err) {
      lastError = err;
      log(`   ⚠️ tentativa ${attempt}: ${err.message}`);
      if (attempt < 2) await sleep(8000); // backoff antes do retry
    }
  }

  if (!success) {
    failed++;
    failures.push({ title: item.title, url: item.sourceUrl, error: lastError?.message });
    log(`   ❌ FALHA DEFINITIVA: ${lastError?.message}`);
  }

  // throttle entre chamadas
  if (i < pending.length - 1) {
    await sleep(THROTTLE_MS);
  }
}

const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
log('');
log('====== RESUMO FINAL ======');
log(`✅ Sucesso: ${done}/${pending.length}`);
log(`❌ Falhas: ${failed}/${pending.length}`);
log(`⏱  Tempo total: ${elapsedMin} min`);
log(`📊 Tokens — entrada: ${totalInputTokens.toLocaleString()} · saída: ${totalOutputTokens.toLocaleString()}`);
const costUsd = (totalInputTokens * 0.075 + totalOutputTokens * 0.30) / 1_000_000;
log(`💰 Custo estimado: $${costUsd.toFixed(4)} USD`);

if (failures.length > 0) {
  log('');
  log('Falhas (revisar manualmente):');
  failures.forEach(f => log(`  • ${f.title}: ${f.error}`));
}

process.exit(failed > 0 ? 1 : 0);
