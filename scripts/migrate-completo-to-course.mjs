import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

const TARGET_COURSE = 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria';
const apply = process.argv.includes('--apply');
const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
if (!keyPath) throw new Error('FIREBASE_ADMIN_KEY_PATH não configurado.');
const resolvedKeyPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
const serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'senha-92ce1' });
const db = admin.firestore();

const normalize = (value) => String(value || '')
  .trim()
  .replace(/^\d+\s*[-–—.]\s*/, '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

const mergeTargetCourse = (rawCourses, fallbackExpiry) => {
  const courses = Array.isArray(rawCourses)
    ? rawCourses.filter((item) => item && String(item.curso || '').trim()).map((item) => ({ ...item }))
    : [];
  const existing = courses.find((item) => normalize(item.curso) === normalize(TARGET_COURSE));
  if (existing) {
    existing.curso = TARGET_COURSE;
    if (!existing.vencimento && fallbackExpiry) existing.vencimento = fallbackExpiry;
    if (typeof existing.valor !== 'number') existing.valor = 0;
    if (typeof existing.quantidade !== 'number') existing.quantidade = 1;
  } else {
    courses.push({ curso: TARGET_COURSE, vencimento: fallbackExpiry || null, valor: 0, quantidade: 1 });
  }
  return courses;
};

const users = await db.collection('users').get();
let affectedUsers = 0;
let topLevelComplete = 0;
let linkComplete = 0;
let skippedStaffComplete = 0;
const byConsultor = new Map();
const pending = [];

for (const snapshot of users.docs) {
  const data = snapshot.data();
  let changed = false;
  const patch = {};

  const topRole = String(data.tipoUsuario || 'aluno');
  if (data.plano === 'completo' && topRole !== 'consultor' && topRole !== 'admin') {
    topLevelComplete += 1;
    const consultorId = String(data.consultorId || 'israel');
    byConsultor.set(consultorId, (byConsultor.get(consultorId) || 0) + 1);
    const courses = mergeTargetCourse(data.cursosAcesso, data.acessoCompletoAte || null);
    patch.cursosAcesso = courses;
    patch.cursosLiberados = courses.map((course) => course.curso);
    patch.modeloAcesso = 'por_curso';
    patch.planoComercialLegado = 'completo';
    patch.plano = 'por_curso';
    patch.formacoes = admin.firestore.FieldValue.delete();
    patch.acessoCompletoAte = admin.firestore.FieldValue.delete();
    changed = true;
  } else if (data.plano === 'completo') {
    skippedStaffComplete += 1;
  }

  if (data.vinculos && typeof data.vinculos === 'object') {
    const links = { ...data.vinculos };
    let linksChanged = false;
    for (const [consultorId, rawLink] of Object.entries(links)) {
      const link = rawLink && typeof rawLink === 'object' ? { ...rawLink } : {};
      if (link.plano !== 'completo') continue;
      const linkRole = String(link.tipoUsuario || 'aluno');
      if (linkRole === 'consultor' || linkRole === 'admin') {
        skippedStaffComplete += 1;
        continue;
      }
      linkComplete += 1;
      byConsultor.set(consultorId, (byConsultor.get(consultorId) || 0) + 1);
      const courses = mergeTargetCourse(link.cursosAcesso, link.acessoCompletoAte || null);
      link.cursosAcesso = courses;
      link.cursosLiberados = courses.map((course) => course.curso);
      link.modeloAcesso = 'por_curso';
      link.planoComercialLegado = 'completo';
      link.plano = 'por_curso';
      delete link.formacoes;
      delete link.acessoCompletoAte;
      links[consultorId] = link;
      linksChanged = true;
    }
    if (linksChanged) {
      patch.vinculos = links;
      changed = true;
    }
  }

  if (changed) {
    affectedUsers += 1;
    pending.push({ ref: snapshot.ref, patch });
  }
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  targetCourse: TARGET_COURSE,
  usersScanned: users.size,
  affectedUsers,
  topLevelComplete,
  linkComplete,
  skippedStaffComplete,
  byConsultor: Object.fromEntries([...byConsultor.entries()].sort()),
}, null, 2));

if (apply) {
  for (let index = 0; index < pending.length; index += 400) {
    const batch = db.batch();
    for (const item of pending.slice(index, index + 400)) batch.set(item.ref, item.patch, { merge: true });
    await batch.commit();
  }
  console.log(`Migração concluída: ${affectedUsers} usuários atualizados.`);
}

await admin.app().delete();
