import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

const OLD_COURSE_NAME = 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria';
const OLD_PACKAGE_NAME = 'LBW Academy';
const NEW_NAME = 'Formação Profissional em Gestão de Projetos de Melhoria';
const apply = process.argv.includes('--apply');

const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
if (!keyPath) throw new Error('FIREBASE_ADMIN_KEY_PATH não configurado.');
const resolvedKeyPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
const serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'senha-92ce1',
});

const db = admin.firestore();
const targetCollections = [
  'initiatives',
  'initiative_configs',
  'knowledge_base',
  'users',
  'quizzes',
  'userProgress',
  'certificadosPublicos',
  'support_materials',
  'invites',
  'projects',
];
const replacements = [
  [OLD_COURSE_NAME, NEW_NAME],
  [OLD_PACKAGE_NAME, NEW_NAME],
];

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const replaceStrings = (value) => {
  if (typeof value === 'string') {
    const updated = replacements.reduce(
      (current, [oldValue, newValue]) => current.replaceAll(oldValue, newValue),
      value,
    );
    return { value: updated, changed: updated !== value };
  }
  if (Array.isArray(value)) {
    const children = value.map(replaceStrings);
    return {
      value: children.map((child) => child.value),
      changed: children.some((child) => child.changed),
    };
  }
  if (!isPlainObject(value)) return { value, changed: false };
  const children = Object.entries(value).map(([key, child]) => [key, replaceStrings(child)]);
  return {
    value: Object.fromEntries(children.map(([key, child]) => [key, child.value])),
    changed: children.some(([, child]) => child.changed),
  };
};

const changedPaths = [];
const pendingWrites = [];
const initiativeNames = [];
let documentsScanned = 0;

const scanCollection = async (collectionRef) => {
  const snapshot = await collectionRef.get();
  for (const documentSnapshot of snapshot.docs) {
    documentsScanned += 1;
    const current = documentSnapshot.data();
    if (collectionRef.id === 'initiatives') initiativeNames.push(String(current.name || ''));
    const result = replaceStrings(current);
    if (result.changed) {
      changedPaths.push(documentSnapshot.ref.path);
      pendingWrites.push({ ref: documentSnapshot.ref, data: result.value });
    }

  }
};

for (const collectionName of targetCollections) await scanCollection(db.collection(collectionName));

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  oldCourseName: OLD_COURSE_NAME,
  oldPackageName: OLD_PACKAGE_NAME,
  newName: NEW_NAME,
  targetCollections,
  documentsScanned,
  documentsToUpdate: pendingWrites.length,
  initiativeNames: initiativeNames.sort((a, b) => a.localeCompare(b, 'pt-BR')),
  changedPaths,
}, null, 2));

if (apply) {
  for (let index = 0; index < pendingWrites.length; index += 400) {
    const batch = db.batch();
    for (const write of pendingWrites.slice(index, index + 400)) {
      batch.set(write.ref, write.data);
    }
    await batch.commit();
  }
  console.log(`Migração concluída: ${pendingWrites.length} documentos atualizados.`);
}

await admin.app().delete();
