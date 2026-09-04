/**
 * Religa referências órfãs gravando o nome antigo em `nomesAnteriores` da
 * iniciativa sucessora. NÃO reescreve material, usuário ou vídeo nenhum —
 * escreve um único campo em `initiatives`, e é revertido apagando o campo.
 *
 * Decisões aprovadas pelo Israel em 2026-09-04.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const svc = JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const MAPA = {
  'Como Recomendar Melhorias com Base em Dados - GATE': ['Como Recomendar Melhorias com Base em Análise de Dados'],
  'Capabilidade de Processo Avançado': ['Capabilidade de Processo'],
  'Análise Preditiva - Regressões, Correlações e Séries Temporais': ['Regressões e Correlações', 'Análise Preditiva - Regressões e Correlações'],
  'Análise Inferencial - Testes de Hipóteses': ['Testes de Hipótese'],
  'Estatística aplicada e ferramentas da qualidade': ['Introdução a Análises Estatísticas Aplicadas a Negócios'],
  // Nome do curso unico antes de ser dividido em niveis. As descricoes dos materiais
  // apontam para a Trilha 8 (prefixo "8 - " e "(Trilha 8)"); o Israel confirmou que
  // hoje isso e o Black Belt.
  'Formação Profissional em Gestão de Projetos de Melhoria - Nível Black Belt': [
    'Formação Profissional em Gestão de Projetos de Melhoria',
    '8 - Formação Profissional em Gestão de Projetos de Melhoria',
  ],
};

const snap = await db.collection('initiatives').get();
for (const [destino, antigos] of Object.entries(MAPA)) {
  const doc = snap.docs.find((d) => d.data().name === destino);
  if (!doc) { console.log(`NAO ENCONTRADO: ${destino}`); continue; }
  await doc.ref.update({ nomesAnteriores: admin.firestore.FieldValue.arrayUnion(...antigos) });
  console.log(`ok  ${destino}\n    + ${antigos.join('\n    + ')}`);
}
process.exit(0);
