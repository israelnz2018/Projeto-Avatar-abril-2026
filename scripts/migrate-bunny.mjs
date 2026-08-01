#!/usr/bin/env node
/**
 * migrate-bunny.mjs — migra vídeos do YouTube para o Bunny Stream.
 *
 * SEGURO por padrão:
 *  - DRY-RUN ligado (só lista; não baixa, não sobe, não escreve) até você passar DRY_RUN=false.
 *  - Filtra por curso (piloto = Trilha 1) via MIGRATE_COURSE.
 *  - IDEMPOTENTE/RETOMÁVEL: pula quem já tem bunnyVideoId.
 *  - REVERSÍVEL: só ADICIONA bunnyVideoId/bunnyLibraryId; NUNCA apaga sourceUrl (YouTube fica de fallback).
 *
 * Pré-requisitos:
 *  - Node 18+ (tem fetch nativo)
 *  - yt-dlp instalado e no PATH  (https://github.com/yt-dlp/yt-dlp)
 *  - firebase-admin (já é dependência do projeto)
 *
 * Variáveis de ambiente:
 *  - BUNNY_STREAM_API_KEY   (secreta — a API Key da sua Video Library)
 *  - BUNNY_LIBRARY_ID       (id numérico da library)
 *  - FIREBASE_ADMIN_KEY_JSON  ou  FIREBASE_ADMIN_KEY_PATH  (credencial admin, igual ao server)
 *  - MIGRATE_COURSE         (nome EXATO do curso a migrar — piloto: o curso da Trilha 1)
 *  - DRY_RUN=false          (pra valer; sem isso é só simulação)
 *  - MIGRATE_LIMIT=1        (opcional — migra só N vídeos; ótimo pra testar 1 primeiro)
 *
 * Exemplo (testar 1 vídeo de verdade):
 *   BUNNY_STREAM_API_KEY=... BUNNY_LIBRARY_ID=... MIGRATE_COURSE="Como Resolver Problemas no Trabalho - Kit 90 dias" \
 *   DRY_RUN=false MIGRATE_LIMIT=1 node scripts/migrate-bunny.mjs
 */
import { readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import admin from 'firebase-admin';

const API_KEY = process.env.BUNNY_STREAM_API_KEY;
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const COURSE = process.env.MIGRATE_COURSE || '';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // default: simulação
const LIMIT = Number(process.env.MIGRATE_LIMIT || '0'); // 0 = sem limite

if (!API_KEY || !LIBRARY_ID) {
  console.error('❌ Faltam BUNNY_STREAM_API_KEY e/ou BUNNY_LIBRARY_ID.');
  process.exit(1);
}

// ---- Firebase Admin (mesma credencial do server) ----
const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

// ---- Bunny Stream API ----
async function bunnyCreateVideo(title) {
  const r = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: { AccessKey: API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title: title || 'Sem título' }),
  });
  if (!r.ok) throw new Error(`createVideo HTTP ${r.status}`);
  const j = await r.json();
  return j.guid;
}
async function bunnyUpload(guid, filePath) {
  const data = readFileSync(filePath);
  const r = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${guid}`, {
    method: 'PUT',
    headers: { AccessKey: API_KEY },
    body: data,
  });
  if (!r.ok) throw new Error(`upload HTTP ${r.status}`);
}

// ---- yt-dlp (baixa o vídeo do seu próprio canal a partir do link) ----
function ytdlp(url, out) {
  const r = spawnSync('yt-dlp', ['-f', 'mp4/bestvideo+bestaudio/best', '--no-playlist', '-o', out, url], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('yt-dlp falhou');
}

// ---- main ----
let ref = db.collection('knowledge_base');
if (COURSE) ref = ref.where('course', '==', COURSE);
const snap = await ref.get();
let docs = snap.docs.filter((d) => {
  const v = d.data();
  return !v.bunnyVideoId && v.sourceUrl; // só os que ainda não foram e têm link
});
if (LIMIT) docs = docs.slice(0, LIMIT);

console.log(`\nCurso: ${COURSE || '(TODOS)'} | a migrar: ${docs.length} | DRY_RUN=${DRY_RUN} | limite=${LIMIT || '∞'}\n`);

let ok = 0, fail = 0;
for (const d of docs) {
  const v = d.data();
  const nome = v.title || d.id;
  try {
    if (DRY_RUN) { console.log('  [simulação]', nome); ok++; continue; }
    const out = join(tmpdir(), `bunny-${d.id}.mp4`);
    console.log('  baixando…', nome);
    ytdlp(v.sourceUrl, out);
    const guid = await bunnyCreateVideo(nome);
    console.log('  subindo pro Bunny…', guid);
    await bunnyUpload(guid, out);
    // NÃO toca no sourceUrl — só adiciona os campos do Bunny (reversível).
    await d.ref.update({ bunnyVideoId: guid, bunnyLibraryId: String(LIBRARY_ID) });
    try { unlinkSync(out); } catch { /* limpa o temp */ }
    console.log('  ✅', nome, '→', guid);
    ok++;
  } catch (e) {
    console.error('  ❌ falha:', nome, '-', e.message);
    fail++;
  }
}

console.log(`\nFim. ok=${ok}  falha=${fail}  ${DRY_RUN ? '(SIMULAÇÃO — nada foi alterado)' : ''}\n`);
process.exit(0);
