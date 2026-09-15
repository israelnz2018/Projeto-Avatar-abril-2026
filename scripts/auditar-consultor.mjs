/**
 * Varredura do que um consultor QUE NÃO É O ADMIN consegue fazer de verdade.
 *
 * POR QUE ISTO EXISTE: as regras do Firestore têm uma exceção global que deixa o
 * admin fazer tudo. Testar com a conta do Israel não prova nada — ele passa por
 * cima de qualquer regra. Foi assim que "Meus Cursos" ficou quebrado para a
 * Mariana sem ninguém notar: para quem testava, salvava.
 *
 * Aqui entra-se COM A CONTA DO CONSULTOR, usando o SDK do navegador, e roda-se a
 * mesma consulta e a mesma escrita que a tela faz. O que o Firestore recusar aqui,
 * ele recusa na tela dele.
 *
 * Uso: FIREBASE_ADMIN_KEY_JSON=... node scripts/auditar-consultor.mjs [consultorId]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps as adminApps, initializeApp as initAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDocs, getFirestore, query, setDoc, updateDoc, where,
} from 'firebase/firestore';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(raiz, 'firebase-applet-config.json'), 'utf8'));
const alvo = process.argv[2] || 'mariana';

if (!adminApps().length) {
  initAdmin({ credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)) });
}

// Acha o usuário daquele consultorId.
const { getFirestore: adminDb } = await import('firebase-admin/firestore');
const users = await adminDb().collection('users').where('consultorId', '==', alvo).get();
const dono = users.docs.find((d) => d.data().tipoUsuario === 'consultor');
if (!dono) {
  console.error(`Nenhum usuário do tipo consultor com consultorId="${alvo}".`);
  process.exit(1);
}
console.log(`entrando como ${dono.data().email} (consultorId=${alvo})\n`);

const app = initializeApp(config);
const bd = getFirestore(app);
await signInWithCustomToken(getAuth(app), await adminAuth().createCustomToken(dono.id));

let falhas = 0;
const lixo = [];

/**
 * Roda uma operação e diz se as regras deixaram.
 * `esperado` é 'pode' ou 'nao-pode' — nem tudo deveria ser permitido.
 */
async function testar(nome, esperado, operacao) {
  let permitido = true;
  let detalhe = '';
  try {
    await operacao();
  } catch (e) {
    permitido = false;
    detalhe = String(e?.code || e?.message || e).slice(0, 120);
  }
  const ok = (esperado === 'pode') === permitido;
  if (!ok) falhas++;
  const marca = ok ? 'ok   ' : 'FALHA';
  console.log(`${marca} ${nome}${ok ? '' : `\n        esperava ${esperado}, ${permitido ? 'passou' : `foi recusado: ${detalhe}`}`}`);
}

console.log('=== MEUS CURSOS (knowledge_base) ===');

// A consulta que a tela faz ANTES de salvar, para descobrir a ordem do vídeo.
await testar('consultar curso+playlist SEM filtrar por consultorId', 'nao-pode', async () => {
  await getDocs(query(
    collection(bd, 'knowledge_base'),
    where('course', '==', 'Curso de teste'),
    where('playlist', '==', 'Aula 1'),
  ));
});

await testar('consultar curso+playlist COM o filtro do dono', 'pode', async () => {
  await getDocs(query(
    collection(bd, 'knowledge_base'),
    where('consultorId', '==', alvo),
    where('course', '==', 'Curso de teste'),
    where('playlist', '==', 'Aula 1'),
  ));
});

await testar('criar um vídeo COM consultorId', 'pode', async () => {
  const r = await addDoc(collection(bd, 'knowledge_base'), {
    title: 'AUDITORIA — pode apagar',
    content: '', sourceUrl: '', course: 'AUDITORIA', playlist: 'AUDITORIA',
    consultorId: alvo, order: 1, timestamp: new Date(),
  });
  lixo.push(['knowledge_base', r.id]);
});

await testar('criar um vídeo SEM consultorId', 'nao-pode', async () => {
  const r = await addDoc(collection(bd, 'knowledge_base'), {
    title: 'AUDITORIA SEM DONO — pode apagar',
    content: '', sourceUrl: '', course: 'AUDITORIA', playlist: 'AUDITORIA',
    order: 1, timestamp: new Date(),
  });
  lixo.push(['knowledge_base', r.id]);
});

await testar('listar os próprios vídeos', 'pode', async () => {
  await getDocs(query(collection(bd, 'knowledge_base'), where('consultorId', '==', alvo)));
});

await testar('listar os vídeos de OUTRO consultor', 'nao-pode', async () => {
  await getDocs(query(collection(bd, 'knowledge_base'), where('consultorId', '==', 'israel')));
});

console.log('\n=== CRIAR UM CURSO (initiatives) ===');

// Um curso É uma initiative. A tela cria e, logo depois, atualiza com ícone, cor e
// ordem — se qualquer um dos dois passos for recusado, o curso "não salva".
const idCurso = `auditoria-${Date.now()}`;
await testar('criar o curso', 'pode', async () => {
  await setDoc(doc(bd, 'initiatives', idCurso), {
    id: idCurso,
    name: 'AUDITORIA — pode apagar',
    createdAt: new Date().toISOString(),
    consultorId: alvo,
  });
  lixo.push(['initiatives', idCurso]);
});

await testar('completar o curso com ícone, cor e ordem', 'pode', async () => {
  await updateDoc(doc(bd, 'initiatives', idCurso), {
    iconId: 'book', corId: 'azul', ordem: 1, temProjeto: false,
  });
});

await testar('listar os próprios cursos', 'pode', async () => {
  await getDocs(query(collection(bd, 'initiatives'), where('consultorId', '==', alvo)));
});

await testar('consultar a config do curso COM o dono no filtro', 'pode', async () => {
  await getDocs(query(
    collection(bd, 'initiative_configs'),
    where('consultorId', '==', alvo),
    where('initiativeId', '==', idCurso),
  ));
});

await testar('consultar a lista de cursos COM o dono no filtro', 'pode', async () => {
  await getDocs(query(collection(bd, 'initiatives'), where('consultorId', '==', alvo)));
});

await testar('gravar a configuração do curso', 'pode', async () => {
  await setDoc(doc(bd, 'initiative_configs', idCurso), {
    consultorId: alvo, initiativeId: idCurso, auditoria: true,
  }, { merge: true });
  lixo.push(['initiative_configs', idCurso]);
});

await testar('renomear o curso', 'pode', async () => {
  await updateDoc(doc(bd, 'initiatives', idCurso), { name: 'AUDITORIA renomeada' });
});

await testar('apagar o curso', 'pode', async () => {
  await deleteDoc(doc(bd, 'initiatives', idCurso));
});

console.log('\n=== MINHA MARCA E VITRINE (consultores) ===');
await testar('gravar a própria vitrine', 'pode', async () => {
  await setDoc(doc(bd, 'consultores', alvo), { vitrine: { auditoria: true } }, { merge: true });
});
await testar('gravar na ficha de OUTRO consultor', 'nao-pode', async () => {
  await setDoc(doc(bd, 'consultores', 'israel'), { auditoria: true }, { merge: true });
});

console.log('\n=== MATERIAIS DE APOIO (support_materials) ===');
await testar('criar material próprio', 'pode', async () => {
  const r = await addDoc(collection(bd, 'support_materials'), {
    nome: 'AUDITORIA — pode apagar', consultorId: alvo, criadoEm: new Date().toISOString(),
  });
  lixo.push(['support_materials', r.id]);
});
await testar('listar os próprios materiais', 'pode', async () => {
  await getDocs(query(collection(bd, 'support_materials'), where('consultorId', '==', alvo)));
});

console.log('\n=== MARKETING ===');
for (const colecao of ['marketing_videos', 'marketing_criativos', 'marketing_campanhas', 'marketing_tarefas', 'marketing_pecas']) {
  await testar(`listar ${colecao}`, 'pode', async () => {
    await getDocs(query(collection(bd, colecao), where('consultorId', '==', alvo)));
  });
  await testar(`criar em ${colecao}`, 'pode', async () => {
    const r = await addDoc(collection(bd, colecao), { consultorId: alvo, auditoria: true });
    lixo.push([colecao, r.id]);
  });
}

console.log('\n=== LEITURAS DE COLEÇÃO INTEIRA QUE O CÓDIGO FAZ ===');
// Ler a coleção toda e filtrar no navegador é o erro que quebrou "Meus Cursos": as
// regras são por documento, e o Firestore RECUSA a consulta inteira quando não
// consegue provar que todos os documentos podem ser lidos. Para o admin passa —
// ele tem exceção global —, para o consultor não. Cada linha aqui é uma leitura
// que existe no código de verdade.
const leiturasInteiras = [
  ['initiatives', 'services/configService.ts:25 — a lista de cursos'],
  ['knowledge_base', 'services/dashboardDataService.ts:108'],
  ['users', 'services/userService.ts:199 e 348'],
  ['invites', 'services/userService.ts:333'],
  ['projects', 'services/dashboardDataService.ts:739'],
  ['user_progress', 'services/videoProgressService.ts:124'],
  ['initiative_configs', 'configuração dos cursos'],
  ['opinioes', 'services/opiniaoService.ts:139'],
  ['mentor_tool_context', 'services/mentorContextService.ts:45'],
  ['support_materials', 'materiais de apoio'],
];
const quebradas = [];
for (const [colecao, onde] of leiturasInteiras) {
  let permitido = true;
  try {
    await getDocs(collection(bd, colecao));
  } catch { permitido = false; }
  if (!permitido) quebradas.push([colecao, onde]);
  console.log(`${permitido ? 'ok   ' : 'QUEBRA'} ler ${colecao} inteira — ${onde}`);
}
if (quebradas.length) {
  falhas += quebradas.length;
  console.log(`\n  ${quebradas.length} leitura(s) que o consultor não consegue fazer:`);
  for (const [c, onde] of quebradas) console.log(`    ${c} — ${onde}`);
}

console.log('\n=== MEUS ALUNOS (users) ===');
await testar('listar os próprios alunos', 'pode', async () => {
  await getDocs(query(collection(bd, 'users'), where('consultorId', '==', alvo)));
});

// Limpeza — o que a auditoria criou não pode ficar no tenant de ninguém.
console.log('\nlimpando o que a auditoria criou…');
for (const [colecao, id] of lixo) {
  await deleteDoc(doc(bd, colecao, id)).catch(() => {});
}
await setDoc(doc(bd, 'consultores', alvo), { vitrine: { auditoria: null } }, { merge: true }).catch(() => {});

console.log(`\n${falhas === 0 ? 'O CONSULTOR CONSEGUE FAZER TUDO O QUE A TELA OFERECE.' : `${falhas} OPERAÇÃO(ÕES) FORA DO ESPERADO`}`);
process.exit(falhas === 0 ? 0 : 1);
