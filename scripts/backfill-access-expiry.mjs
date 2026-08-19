import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

/**
 * Copia a validade dos cursos para os projetos associados e Analytics liberado.
 * Execute primeiro sem --apply para revisar o resumo; use --apply para gravar.
 */
const apply = process.argv.includes('--apply');
const consultorId = 'israel';
const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
const inlineKey = process.env.FIREBASE_ADMIN_KEY_JSON;
if (!keyPath && !inlineKey) throw new Error('FIREBASE_ADMIN_KEY_PATH ou FIREBASE_ADMIN_KEY_JSON não configurado.');

const serviceAccount = inlineKey
  ? JSON.parse(inlineKey)
  : JSON.parse(fs.readFileSync(path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'senha-92ce1' });
const db = admin.firestore();

const ANALYTICS_IDS = ['graficos', 'exploratoria', 'inferencial', 'msa', 'preditiva', 'cep', 'capabilidade', 'diversas'];
const normalize = (value) => String(value || '').trim().replace(/^\d+\s*[-–—.]\s*/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const dateValue = (value) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : String(value).slice(0, 10);
};
const latestDate = (dates) => dates.filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const initiativesSnap = await db.collection('initiatives').get();
const initiatives = initiativesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
const byId = new Map(initiatives.map((item) => [item.id, item]));
const courseByName = new Map(initiatives.filter((item) => !item.somenteProjeto).map((item) => [normalize(item.name), item]));

function coursesFrom(scope) {
  if (Array.isArray(scope.cursosAcesso) && scope.cursosAcesso.length > 0) {
    return scope.cursosAcesso.map((item) => ({ ...item, curso: String(item?.curso || '').trim(), vencimento: dateValue(item?.vencimento) })).filter((item) => item.curso);
  }
  if (Array.isArray(scope.cursosLiberados)) return scope.cursosLiberados.map((curso) => ({ curso: String(curso).trim(), vencimento: null, valor: 0 }));
  return [];
}

function courseExpiry(scope, courseName) {
  const courses = coursesFrom(scope);
  const course = courses.find((item) => normalize(item.curso) === normalize(courseName));
  return course?.vencimento || dateValue(scope.acessoCompletoAte);
}

function projectCourseName(project) {
  if (project.cursoAssociadoId && byId.has(project.cursoAssociadoId)) return byId.get(project.cursoAssociadoId).name;
  return courseByName.has(normalize(project.name)) ? project.name : null;
}

function migrateScope(scope) {
  const patch = {};
  const courses = coursesFrom(scope);
  const courseDates = courses.map((item) => dateValue(item.vencimento) || dateValue(scope.acessoCompletoAte)).filter(Boolean);
  const generalExpiry = latestDate(courseDates);
  let projectsChanged = false;
  let analyticsChanged = false;

  const rawProjects = Array.isArray(scope.projetosAcesso) ? scope.projetosAcesso : null;
  const projectItems = rawProjects
    ? rawProjects.map((item) => {
        const projectId = typeof item === 'string' ? item : item?.projeto || item?.projetoId;
        const project = byId.get(projectId) || initiatives.find((candidate) => normalize(candidate.name) === normalize(projectId));
        const linkedCourse = project ? projectCourseName(project) : null;
        const expiry = linkedCourse ? courseExpiry(scope, linkedCourse) : dateValue(typeof item === 'object' ? item?.vencimento : null);
        const next = {
          projeto: project?.id || String(projectId || ''),
          vencimento: expiry || null,
          valor: typeof item === 'object' && typeof item.valor === 'number' ? item.valor : 0,
        };
        if (typeof item === 'string' || !same(item, next)) projectsChanged = true;
        return next;
      })
    : initiatives.filter((project) => project.temProjeto !== false).map((project) => {
        const linkedCourse = projectCourseName(project);
        const expiry = linkedCourse ? courseExpiry(scope, linkedCourse) : null;
        if (!expiry) return null;
        projectsChanged = true;
        return { projeto: project.id, vencimento: expiry, valor: 0 };
      }).filter(Boolean);
  if (rawProjects === null && projectItems.length > 0) projectsChanged = true;
  if (projectsChanged) patch.projetosAcesso = projectItems;

  const rawAnalytics = scope.acessoProdutos?.analytics;
  const analyticsItems = !Array.isArray(rawAnalytics) || rawAnalytics.length === 0
    ? (Array.isArray(rawAnalytics) ? [] : ANALYTICS_IDS).map((modulo) => ({ modulo, vencimento: generalExpiry, valor: 0 }))
    : rawAnalytics.map((item) => {
        const modulo = typeof item === 'string' ? item : item?.modulo;
        return { modulo: String(modulo || ''), vencimento: generalExpiry || dateValue(typeof item === 'object' ? item?.vencimento : null), valor: typeof item === 'object' && typeof item.valor === 'number' ? item.valor : 0 };
      }).filter((item) => item.modulo);
  if (generalExpiry && !same(rawAnalytics, analyticsItems)) analyticsChanged = true;
  if (analyticsChanged) patch.acessoProdutos = { ...(scope.acessoProdutos || {}), analytics: analyticsItems };

  return patch;
}

const usersSnap = await db.collection('users').get();
const pending = [];
let studentsScanned = 0;
let scopesChanged = 0;
let projectsUpdated = 0;
let analyticsUpdated = 0;

for (const snapshot of usersSnap.docs) {
  const data = snapshot.data();
  const role = String(data.tipoUsuario || 'aluno');
  const scopes = [];
  if (role === 'aluno' && (String(data.consultorId || 'israel') === consultorId || (Array.isArray(data.consultorIds) && data.consultorIds.includes(consultorId)))) {
    scopes.push({ kind: 'root', data });
  }
  if (data.vinculos?.[consultorId] && !['admin', 'consultor', 'coordenador'].includes(String(data.vinculos[consultorId].tipoUsuario || 'aluno'))) {
    scopes.push({ kind: 'link', data: data.vinculos[consultorId] });
  }
  if (scopes.length === 0) continue;
  studentsScanned += 1;
  const patch = {};
  for (const scope of scopes) {
    const scopePatch = migrateScope(scope.data);
    if (scopePatch.projetosAcesso) projectsUpdated += scopePatch.projetosAcesso.length;
    if (scopePatch.acessoProdutos?.analytics) analyticsUpdated += scopePatch.acessoProdutos.analytics.length;
    if (scope.kind === 'root') Object.assign(patch, scopePatch);
    else if (Object.keys(scopePatch).length > 0) patch.vinculos = { ...(data.vinculos || {}), [consultorId]: { ...scope.data, ...scopePatch } };
  }
  if (Object.keys(patch).length > 0) {
    scopesChanged += 1;
    pending.push({ ref: snapshot.ref, patch });
  }
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', consultorId, usersScanned: usersSnap.size, studentsScanned, usersChanged: scopesChanged, projectEntriesUpdated: projectsUpdated, analyticsEntriesUpdated: analyticsUpdated }, null, 2));

if (apply) {
  for (let index = 0; index < pending.length; index += 400) {
    const batch = db.batch();
    for (const item of pending.slice(index, index + 400)) batch.set(item.ref, item.patch, { merge: true });
    await batch.commit();
  }
  console.log(`Migração concluída: ${scopesChanged} alunos atualizados.`);
}

await admin.app().delete();
