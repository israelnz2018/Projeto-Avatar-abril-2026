/**
 * AUDITORIA — SOMENTE LEITURA. Não escreve nada.
 * Lista toda referência a curso, por NOME, que não resolve para nenhuma iniciativa.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const norm = (v) => String(v || '').trim().replace(/^\d+\s*[-–—.]\s*/, '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

const inis = await db.collection('initiatives').get();
const conhecidos = new Map();
inis.forEach((d) => {
  const v = d.data();
  conhecidos.set(d.id, d.id);
  if (v.name) conhecidos.set(norm(v.name), d.id);
  (v.nomesAnteriores || []).forEach((n) => { if (!conhecidos.has(norm(n))) conhecidos.set(norm(n), d.id); });
});
const resolve = (ref) => conhecidos.get(String(ref || '').trim()) || conhecidos.get(norm(ref)) || null;

const orfaos = new Map(); // ref -> {origens:Set, docs:number}
const marcar = (ref, origem) => {
  if (!ref || resolve(ref)) return;
  const chave = String(ref);
  if (!orfaos.has(chave)) orfaos.set(chave, { origens: new Set(), docs: 0 });
  const e = orfaos.get(chave); e.origens.add(origem); e.docs++;
};

const varrer = async (col, extrair) => {
  const snap = await db.collection(col).get();
  snap.forEach((d) => extrair(d.data()).forEach((r) => marcar(r, col)));
  return snap.size;
};

const n1 = await varrer('users', (v) => [
  ...(Array.isArray(v.cursosAcesso) ? v.cursosAcesso.map((c) => c?.curso) : []),
  ...(Array.isArray(v.cursosLiberados) ? v.cursosLiberados : []),
]);
const n2 = await varrer('knowledge_base', (v) => [v.course]);
const n3 = await varrer('support_materials', (v) => (Array.isArray(v.cursos) ? v.cursos : []));
const n4 = await varrer('quizzes', (v) => [v.titulo, v.curso].filter(Boolean));

console.log(`iniciativas: ${inis.size} | users: ${n1} | knowledge_base: ${n2} | support_materials: ${n3} | quizzes: ${n4}\n`);
console.log(`REFERENCIAS ORFAS DISTINTAS: ${orfaos.size}\n`);
[...orfaos.entries()].sort((a, b) => b[1].docs - a[1].docs).forEach(([ref, e]) => {
  console.log(`  ${String(e.docs).padStart(3)}x  [${[...e.origens].join(',')}]  "${ref}"`);
});
console.log('\nINICIATIVAS EXISTENTES (candidatas de destino):');
inis.docs.map((d) => d.data()).sort((a,b)=>String(a.name).localeCompare(String(b.name)))
  .forEach((v) => console.log(`  - ${v.name}${v.somenteProjeto ? '  [só projeto]' : ''}`));
process.exit(0);
