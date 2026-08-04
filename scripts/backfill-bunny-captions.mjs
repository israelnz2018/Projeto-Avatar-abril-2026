#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { YoutubeTranscript } from 'youtube-transcript';

const API_KEY = process.env.BUNNY_STREAM_API_KEY;
const LIBRARY_ID = String(process.env.BUNNY_LIBRARY_ID || '');
const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 0;
if (!API_KEY || !LIBRARY_ID) throw new Error('Bunny não configurado no .env');

const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();
const base = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`;
const headers = { AccessKey: API_KEY, Accept: 'application/json' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toSeconds = (stamp) => {
  const parts = stamp.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};
const fmt = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(milli).padStart(3, '0')}`;
};
const makeVtt = (segments) => `WEBVTT\n\n${segments.map((segment, index) => {
  const next = segments[index + 1];
  const end = Math.max(segment.start + 0.5, segment.end || (next ? next.start - 0.001 : segment.start + 5));
  return `${fmt(segment.start)} --> ${fmt(end)}\n${String(segment.text).replace(/-->/g, '→').trim()}`;
}).join('\n\n')}\n`;
const makeRaw = (segments) => segments.map((segment) => {
  const total = Math.floor(segment.start);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const stamp = h ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `[${stamp}] ${segment.text}`;
}).join('\n');
const parseTimedRaw = (raw) => {
  const result = [];
  for (const line of String(raw || '').split(/\r?\n/)) {
    const match = line.match(/^\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]\s*(.+)$/);
    if (match) result.push({ start: toSeconds(match[1]), text: match[2] });
  }
  return result;
};
async function youtubeSegments(url) {
  const candidates = ['pt', 'pt-BR', 'en', undefined];
  let lastError;
  for (const lang of candidates) {
    try {
      const values = await YoutubeTranscript.fetchTranscript(url, lang ? { lang } : undefined);
      if (!values?.length) continue;
      const durations = values.map((value) => Number(value.duration || 0)).sort((a, b) => a - b);
      const inMs = durations[Math.floor(durations.length / 2)] > 60;
      return values.map((value) => ({
        start: Number(value.offset || 0) / (inMs ? 1000 : 1),
        end: (Number(value.offset || 0) + Number(value.duration || 0)) / (inMs ? 1000 : 1),
        text: String(value.text || '').trim(),
      })).filter((value) => value.text);
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('YouTube sem legenda');
}
async function uploadCaption(guid, vtt) {
  const response = await fetch(`${base}/${guid}/captions/pt`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ srclang: 'pt', label: 'Português', captionsFile: Buffer.from(vtt, 'utf8').toString('base64') }),
  });
  if (!response.ok) throw new Error(`Bunny caption HTTP ${response.status}`);
}

const snap = await db.collection('knowledge_base').get();
const grouped = new Map();
for (const doc of snap.docs) {
  const value = doc.data();
  if (!value.bunnyVideoId || String(value.bunnyLibraryId || LIBRARY_ID) !== LIBRARY_ID) continue;
  const guid = String(value.bunnyVideoId);
  const group = grouped.get(guid) || { guid, docs: [], title: value.title || doc.id, sourceUrl: value.sourceUrl || '', rawTranscript: '' };
  group.docs.push(doc);
  if (!group.rawTranscript && value.rawTranscript?.trim()) group.rawTranscript = value.rawTranscript;
  if (!group.sourceUrl && value.sourceUrl) group.sourceUrl = value.sourceUrl;
  grouped.set(guid, group);
}

const videos = [];
for (let page = 1; ; page++) {
  const response = await fetch(`${base}?page=${page}&itemsPerPage=100`, { headers });
  if (!response.ok) throw new Error(`Bunny list HTTP ${response.status}`);
  const body = await response.json();
  videos.push(...(body.items || []));
  if (videos.length >= Number(body.totalItems || 0)) break;
}
const captioned = new Set(videos.filter((video) => video.captions?.some((caption) => caption.srclang === 'pt')).map((video) => String(video.guid)));
let queue = [...grouped.values()].filter((group) => !captioned.has(group.guid));
if (LIMIT) queue = queue.slice(0, LIMIT);
console.log(`Vídeos usados: ${grouped.size}; já com legenda pt: ${captioned.size}; fila: ${queue.length}; APPLY=${APPLY}`);

let ok = 0, fail = 0, fromStored = 0, fromYoutube = 0;
for (let index = 0; index < queue.length; index++) {
  const group = queue[index];
  try {
    let segments = parseTimedRaw(group.rawTranscript);
    let source = 'armazenado';
    if (segments.length < 2) {
      if (!/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(group.sourceUrl)) throw new Error('sem timestamps e sem URL original do YouTube');
      segments = await youtubeSegments(group.sourceUrl);
      source = 'youtube';
    }
    if (segments.length < 2) throw new Error('segmentos insuficientes');
    console.log(`[${index + 1}/${queue.length}] ${group.title} — ${source}, ${segments.length} segmentos`);
    if (APPLY) {
      await uploadCaption(group.guid, makeVtt(segments));
      if (source === 'youtube') {
        const rawTranscript = makeRaw(segments);
        const batch = db.batch();
        group.docs.forEach((doc) => batch.update(doc.ref, { rawTranscript }));
        await batch.commit();
      }
    }
    if (source === 'youtube') fromYoutube++; else fromStored++;
    ok++;
  } catch (error) {
    fail++;
    console.error(`FALHA\t${group.guid}\t${group.title}\t${error?.message || error}`);
  }
  if (index < queue.length - 1) await sleep(1500);
}
console.log(`Fim: ok=${ok}; armazenado=${fromStored}; youtube=${fromYoutube}; falha=${fail}; APPLY=${APPLY}`);
