#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const apiKey = process.env.BUNNY_STREAM_API_KEY;
const libraryId = String(process.env.BUNNY_LIBRARY_ID || '');
const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const snap = await admin.firestore().collection('knowledge_base').get();

const byGuid = new Map();
for (const doc of snap.docs) {
  const value = doc.data();
  if (!value.bunnyVideoId) continue;
  const guid = String(value.bunnyVideoId);
  const current = byGuid.get(guid) || { hasTranscript: false, hasRawTranscript: false, hasTimedRawTranscript: false, hasIndex: false, placements: 0 };
  current.hasTranscript ||= Boolean(value.rawTranscript?.trim() || value.transcript?.trim());
  current.hasRawTranscript ||= Boolean(value.rawTranscript?.trim());
  current.hasTimedRawTranscript ||= /\[(?:\d{1,2}:)?\d{1,2}:\d{2}\]/.test(String(value.rawTranscript || ''));
  current.hasIndex ||= Array.isArray(value.summary) && value.summary.length > 0;
  current.placements++;
  byGuid.set(guid, current);
}

const videos = [];
const base = `https://video.bunnycdn.com/library/${libraryId}/videos`;
for (let page = 1; ; page++) {
  const response = await fetch(`${base}?page=${page}&itemsPerPage=100`, { headers: { AccessKey: apiKey } });
  if (!response.ok) throw new Error(`Bunny list HTTP ${response.status}`);
  const body = await response.json();
  videos.push(...(body.items || []));
  if (videos.length >= Number(body.totalItems || 0)) break;
}

const lengthByGuid = new Map(videos.map((video) => [String(video.guid), Number(video.length || 0)]));
const used = [...byGuid.entries()];
const pendingTranscript = used.filter(([, value]) => !value.hasTranscript);
const pendingIndex = used.filter(([, value]) => value.hasTranscript && !value.hasIndex);
const seconds = (entries) => entries.reduce((sum, [guid]) => sum + (lengthByGuid.get(guid) || 0), 0);
const result = {
  uniqueVideos: used.length,
  totalMinutes: Math.ceil(seconds(used) / 60),
  withTranscript: used.filter(([, value]) => value.hasTranscript).length,
  withRawTranscript: used.filter(([, value]) => value.hasRawTranscript).length,
  withTimedRawTranscript: used.filter(([, value]) => value.hasTimedRawTranscript).length,
  withoutTimedRawTranscript: used.filter(([, value]) => !value.hasTimedRawTranscript).length,
  withoutTimedRawMinutes: Math.ceil(seconds(used.filter(([, value]) => !value.hasTimedRawTranscript)) / 60),
  missingTranscript: pendingTranscript.length,
  missingTranscriptMinutes: Math.ceil(seconds(pendingTranscript) / 60),
  withIndex: used.filter(([, value]) => value.hasIndex).length,
  missingIndexWithTranscript: pendingIndex.length,
};
console.log(JSON.stringify(result, null, 2));
