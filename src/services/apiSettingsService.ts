import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const APP_CONFIG_COLLECTION = 'app_config';
const API_SETTINGS_DOC = 'api_settings';

export interface GeminiSettings {
  apiKey: string;
  model: string;
}

export interface AnthropicSettings {
  apiKey: string;
  modelHaiku: string;
  modelSonnet: string;
  modelOpus: string;
}

export interface ApiSettings {
  gemini: GeminiSettings;
  anthropic: AnthropicSettings;
  updatedBy?: string;
  updatedAt?: any;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_ANTHROPIC_HAIKU = 'claude-haiku-4-5-20251001';
export const DEFAULT_ANTHROPIC_SONNET = 'claude-sonnet-5';
export const DEFAULT_ANTHROPIC_OPUS = 'claude-opus-4-7';

const EMPTY_SETTINGS: ApiSettings = {
  gemini: { apiKey: '', model: DEFAULT_GEMINI_MODEL },
  anthropic: {
    apiKey: '',
    modelHaiku: DEFAULT_ANTHROPIC_HAIKU,
    modelSonnet: DEFAULT_ANTHROPIC_SONNET,
    modelOpus: DEFAULT_ANTHROPIC_OPUS,
  },
};

let cached: ApiSettings | null = null;
let subscribed = false;

function ref() {
  return doc(db, APP_CONFIG_COLLECTION, API_SETTINGS_DOC);
}

function merge(raw: any): ApiSettings {
  // Migra automaticamente o modelo Sonnet padrão anterior para o Sonnet 5.
  // Um valor diferente de Sonnet 4.6 continua sendo respeitado caso tenha
  // sido escolhido explicitamente nas configurações.
  const configuredSonnet = raw?.anthropic?.modelSonnet;
  const modelSonnet = configuredSonnet === 'claude-sonnet-4-6'
    ? DEFAULT_ANTHROPIC_SONNET
    : (configuredSonnet || DEFAULT_ANTHROPIC_SONNET);

  return {
    gemini: {
      apiKey: raw?.gemini?.apiKey ?? '',
      model: raw?.gemini?.model || DEFAULT_GEMINI_MODEL,
    },
    anthropic: {
      apiKey: raw?.anthropic?.apiKey ?? '',
      modelHaiku: raw?.anthropic?.modelHaiku || DEFAULT_ANTHROPIC_HAIKU,
      modelSonnet,
      modelOpus: raw?.anthropic?.modelOpus || DEFAULT_ANTHROPIC_OPUS,
    },
    updatedBy: raw?.updatedBy,
    updatedAt: raw?.updatedAt,
  };
}

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  onSnapshot(ref(), snap => {
    cached = snap.exists() ? merge(snap.data()) : EMPTY_SETTINGS;
  }, err => {
    console.error('[apiSettings] onSnapshot:', err);
  });
}

export async function getApiSettings(): Promise<ApiSettings> {
  ensureSubscribed();
  if (cached) return cached;
  try {
    const snap = await getDoc(ref());
    cached = snap.exists() ? merge(snap.data()) : EMPTY_SETTINGS;
  } catch (err) {
    console.error('[apiSettings] getDoc:', err);
    cached = EMPTY_SETTINGS;
  }
  return cached;
}

export async function updateApiSettings(patch: Partial<ApiSettings>, updatedBy: string): Promise<void> {
  const current = await getApiSettings();
  const next: ApiSettings = {
    gemini: { ...current.gemini, ...(patch.gemini || {}) },
    anthropic: { ...current.anthropic, ...(patch.anthropic || {}) },
    updatedBy,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref(), next, { merge: true });
  cached = { ...next, updatedAt: new Date() };
}

export async function getGeminiApiKey(): Promise<string> {
  const s = await getApiSettings();
  return s.gemini.apiKey || process.env.GEMINI_API_KEY || '';
}

export async function getGeminiModel(): Promise<string> {
  const s = await getApiSettings();
  return s.gemini.model || DEFAULT_GEMINI_MODEL;
}

export async function getAnthropicModel(tier: 'haiku' | 'sonnet' | 'opus'): Promise<string> {
  const s = await getApiSettings();
  if (tier === 'haiku') return s.anthropic.modelHaiku || DEFAULT_ANTHROPIC_HAIKU;
  if (tier === 'sonnet') return s.anthropic.modelSonnet || DEFAULT_ANTHROPIC_SONNET;
  return s.anthropic.modelOpus || DEFAULT_ANTHROPIC_OPUS;
}

export function getCachedSettings(): ApiSettings | null {
  return cached;
}
