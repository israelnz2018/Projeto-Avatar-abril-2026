/**
 * AUDITORIA — SOMENTE LEITURA. Não escreve nada.
 *
 * Verifica se a mudança "ferramenta não tem fase" pode perder ou trocar dado:
 *  1. Colisão: a mesma ferramenta com conteúdo em `toolId` E em `${fase}_${toolId}`.
 *     Só nesse caso a leitura precisa escolher, e ela escolhe a chave simples.
 *  2. Duplicidade: a mesma ferramenta com conteúdo em duas chaves compostas
 *     diferentes (usada em duas fases com dados distintos) — aí há fusão real.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const svc = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const temConteudo = (raw) => {
  if (!raw) return false;
  const d = raw.toolData ?? raw;
  if (d == null) return false;
  if (Array.isArray(d)) return d.length > 0;
  if (typeof d === 'object') return Object.keys(d).length > 0;
  return true;
};

const projetos = await db.collection('projects').get();
let colisoes = 0, duplicidades = 0, docsTotal = 0;

for (const proj of projetos.docs) {
  const dados = await db.collection('projects').doc(proj.id).collection('data').get();
  docsTotal += dados.size;

  const chaves = new Map(); // toolId -> [chave]
  dados.forEach((d) => {
    if (!temConteudo(d.data())) return;
    const partes = d.id.split('_');
    const toolId = partes.length > 1 ? partes.slice(1).join('_') : d.id;
    if (!chaves.has(toolId)) chaves.set(toolId, []);
    chaves.get(toolId).push(d.id);
    if (partes.length > 1) {
      if (!chaves.has(d.id)) chaves.set(d.id, []);
    }
  });

  for (const [toolId, lista] of chaves) {
    const simples = lista.filter((k) => k === toolId);
    const compostas = lista.filter((k) => k !== toolId);
    if (simples.length && compostas.length) {
      colisoes++;
      console.log(`COLISAO  ${proj.data().name || proj.id} :: ${toolId} -> ${lista.join(', ')}`);
    } else if (compostas.length > 1) {
      duplicidades++;
      console.log(`DUPLICADO ${proj.data().name || proj.id} :: ${toolId} -> ${compostas.join(', ')}`);
    }
  }
}

console.log(`\nprojetos: ${projetos.size} | docs de dados: ${docsTotal}`);
console.log(`colisoes (simples + composta): ${colisoes}`);
console.log(`duplicidades (duas compostas):  ${duplicidades}`);
console.log(colisoes + duplicidades === 0
  ? '\nOK — nenhum projeto perde ou troca dado com a mudanca.'
  : '\nATENCAO — revisar os casos acima antes de considerar a mudanca segura.');
process.exit(0);
