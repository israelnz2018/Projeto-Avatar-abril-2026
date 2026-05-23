import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const doc = await db.collection('app_config').doc('api_settings').get();
const settings = doc.data() || {};
const key = settings.gemini?.apiKey || '';
const model = settings.gemini?.model || '(default)';

if (!key) {
  console.log('❌ Nenhuma Gemini key configurada em app_config/api_settings');
} else {
  const masked = `${key.slice(0, 8)}...${key.slice(-4)}`;
  console.log('=== GEMINI KEY NO FIRESTORE ===');
  console.log(`Mascarada: ${masked}`);
  console.log(`Tamanho: ${key.length} caracteres`);
  console.log(`Modelo: ${model}`);
  console.log('');
  console.log('Use esses 8 primeiros + 4 últimos caracteres pra encontrar essa key em:');
  console.log('  → https://aistudio.google.com/apikey');
  console.log('  → https://console.cloud.google.com/apis/credentials');
}
process.exit(0);
