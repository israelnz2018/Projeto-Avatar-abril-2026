#!/usr/bin/env node
/**
 * migrate-bunny.mjs — migra vídeos do YouTube para o Bunny Stream.
 *
 * 🔒 TRANSCRIPTS SEGUROS: só faz `.update({ bunnyVideoId, bunnyLibraryId })` — no Firestore
 *    isso mexe SÓ nesses 2 campos. rawTranscript / transcript / summary / sourceUrl / título
 *    ficam INTACTOS. NUNCA usa `.set()`. Nada de conteúdo é apagado.
 *
 * SEGURO por padrão:
 *  - DRY-RUN ligado (só lista) até passar DRY_RUN=false.
 *  - Filtra por curso (MIGRATE_COURSE). Pula quem já tem bunnyVideoId (retomável).
 *  - REVERSÍVEL: só ADICIONA campos do Bunny; o sourceUrl do YouTube nunca é tocado.
 *
 * Dois modos:
 *  - MIGRATE_MODE=fetch  (padrão) → o BUNNY baixa o vídeo direto do YouTube (leve na sua net).
 *                                   Usa `yt-dlp -g` só pra pegar a URL direta (720p). Poll de status.
 *  - MIGRATE_MODE=upload → baixa local (yt-dlp) e sobe pro Bunny (pesado, mas qualidade máxima).
 *
 * Variáveis (lê do .env local via dotenv):
 *  BUNNY_STREAM_API_KEY, BUNNY_LIBRARY_ID, FIREBASE_ADMIN_KEY_JSON (ou _PATH),
 *  MIGRATE_COURSE, DRY_RUN=false, MIGRATE_LIMIT=1, MIGRATE_MODE=fetch|upload
 *
 * Exemplo (testar 1 vídeo, modo leve):
 *   $env:MIGRATE_COURSE="Como Resolver Problemas no Trabalho - Kit 90 dias"; $env:DRY_RUN="false"; $env:MIGRATE_LIMIT="1"; node scripts/migrate-bunny.mjs
 */
import 'dotenv/config';
import { readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import admin from 'firebase-admin';

const API_KEY = process.env.BUNNY_STREAM_API_KEY;
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const COURSE = process.env.MIGRATE_COURSE || '';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const LIMIT = Number(process.env.MIGRATE_LIMIT || '0');
const MODE = (process.env.MIGRATE_MODE || 'fetch').toLowerCase();

if (!API_KEY || !LIBRARY_ID) { console.error('❌ Faltam BUNNY_STREAM_API_KEY e/ou BUNNY_LIBRARY_ID no .env'); process.exit(1); }

// ---- Firebase Admin (mesma credencial do server) ----
const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const H = { AccessKey: API_KEY, Accept: 'application/json' };
const base = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`;

async function createVideo(title) {
  const r = await fetch(base, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title || 'Sem título' }) });
  if (!r.ok) throw new Error(`createVideo HTTP ${r.status}`);
  return (await r.json()).guid;
}
async function fetchFromUrl(guid, url) {
  const r = await fetch(`${base}/${guid}/fetch`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  if (!r.ok) throw new Error(`fetch HTTP ${r.status}`);
}
async function uploadFile(guid, filePath) {
  const r = await fetch(`${base}/${guid}`, { method: 'PUT', headers: { AccessKey: API_KEY }, body: readFileSync(filePath) });
  if (!r.ok) throw new Error(`upload HTTP ${r.status}`);
}
async function status(guid) {
  const r = await fetch(`${base}/${guid}`, { headers: H });
  if (!r.ok) return -1;
  return (await r.json()).status; // 4 = Finished, >=5 = erro
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// yt-dlp: -g pega a URL direta (progressive 720p/360p, com áudio) sem baixar.
function directUrl(ytUrl) {
  const r = spawnSync('yt-dlp', ['-f', '22/18/best[ext=mp4]', '-g', '--no-playlist', ytUrl], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('yt-dlp -g falhou');
  const lines = String(r.stdout || '').trim().split('\n').filter(Boolean);
  if (!lines.length) throw new Error('yt-dlp não retornou URL');
  return lines[lines.length - 1];
}
function download(ytUrl, out) {
  // Até 1080p, mesclado em mp4 (precisa de ffmpeg + um JS runtime, ex.: deno, no PATH).
  const r = spawnSync('yt-dlp', [
    '-f', 'bv*[height<=1080]+ba/b[height<=1080]/best',
    '--merge-output-format', 'mp4', '--no-playlist', '-o', out, ytUrl,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('yt-dlp download falhou');
}

// ---- main ----
// DEDUP por sourceUrl: o MESMO vídeo aparece em vários cursos (multi-placement), cada
// ocorrência é um doc, mas todos têm o MESMO sourceUrl. Sobe o vídeo pro Bunny UMA vez
// e aponta TODOS os docs daquele sourceUrl pro mesmo GUID (economiza banda + storage).
const allSnap = await db.collection('knowledge_base').get();
const all = allSnap.docs;

// Semente: sourceUrl -> {guid, lib} dos que JÁ têm bunnyVideoId (qualquer curso).
const guidBySource = new Map();
for (const d of all) {
  const v = d.data();
  if (v.bunnyVideoId && v.sourceUrl && !guidBySource.has(v.sourceUrl)) {
    guidBySource.set(v.sourceUrl, { guid: v.bunnyVideoId, lib: String(v.bunnyLibraryId || LIBRARY_ID) });
  }
}

let docs = all.filter((d) => { const v = d.data(); return v.sourceUrl && !v.bunnyVideoId && (!COURSE || v.course === COURSE); });
if (LIMIT) docs = docs.slice(0, LIMIT);

console.log(`\nCurso: ${COURSE || '(TODOS)'} | modo: ${MODE} | docs a ligar: ${docs.length} | vídeos únicos já no Bunny: ${guidBySource.size} | DRY_RUN=${DRY_RUN}\n`);

let ok = 0, fail = 0, reusados = 0;
for (const d of docs) {
  const v = d.data();
  const nome = v.title || d.id;
  const src = v.sourceUrl;
  try {
    if (DRY_RUN) { console.log('  [simulação]', nome, guidBySource.has(src) ? '(reusa — já subiu)' : ''); ok++; continue; }

    let entry = guidBySource.get(src);
    if (!entry) {
      // Primeira vez que vemos este vídeo → sobe UMA vez.
      const guid = await createVideo(nome);
      if (MODE === 'upload') {
        const out = join(tmpdir(), `bunny-${d.id}.mp4`);
        console.log('  baixando…', nome);
        download(src, out);
        console.log('  subindo…', guid);
        await uploadFile(guid, out);
        try { unlinkSync(out); } catch { /* limpa temp */ }
      } else {
        console.log('  resolvendo URL…', nome);
        const url = directUrl(src);
        await fetchFromUrl(guid, url);
        let st = -1, t = 0;
        while (t++ < 60) { await sleep(5000); st = await status(guid); if (st === 4) break; if (st >= 5) throw new Error(`Bunny status ${st}`); }
        if (st !== 4) throw new Error('timeout no processamento do Bunny');
      }
      entry = { guid, lib: String(LIBRARY_ID) };
      guidBySource.set(src, entry);
      console.log('  ✅', nome, '→', guid);
    } else {
      // Mesmo vídeo já no Bunny (outro curso/placement) → só aponta pro mesmo GUID.
      console.log('  ↻ reusa (mesmo vídeo, outro curso):', nome);
      reusados++;
    }
    // 🔒 SÓ estes 2 campos. Transcripts e o resto ficam intactos.
    await d.ref.update({ bunnyVideoId: entry.guid, bunnyLibraryId: entry.lib });
    ok++;
  } catch (e) {
    console.error('  ❌ falha:', nome, '-', e.message);
    fail++;
  }
}

console.log(`\nFim. ok=${ok} (reusados=${reusados})  falha=${fail}  ${DRY_RUN ? '(SIMULAÇÃO — nada alterado)' : ''}\n`);
process.exit(0);
